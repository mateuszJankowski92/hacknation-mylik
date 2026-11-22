// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STATE_LABELS_PL } from '../../../src/contracts/verdict';
import { findForbiddenForms } from '../../../src/render/metrics';
import { App } from '../App';
import { FIXTURE_OUTCOMES } from '../fixtures/outcomes';
import { INITIAL_PROGRESS, reduceProgress } from '../visuals/progress';
import { SCENES, SCENE_TEXTS, pickScene, type SceneSpec } from './config';
import { SceneMarks } from './SceneStage';

const STATE_KEY = 'brak_mozliwosci_sprawdzenia';
const STATE_LABEL = STATE_LABELS_PL[STATE_KEY];
const ORIGINAL_SCENES = SCENES.pogodynka;
const SCENE_MS = 600;

function testScene(overrides: Partial<SceneSpec> = {}): SceneSpec {
	return { id: 'test-1', file: null, poster: null, durationSec: SCENE_MS / 1000, alt: 'Pogodynek sprawdza mapę.', ...overrides };
}

function stubApi(streamDelayMs: number) {
	const fetchMock = vi.fn(async (path: string) => {
		if (path === '/api/verify/key') return new Response(JSON.stringify({ recordId: null }), { status: 200 });
		if (path.startsWith('/api/sources/latest')) return new Response(JSON.stringify({ corpusVersion: 'x', documents: [] }), { status: 200 });
		if (path === '/api/verify/eta') return new Response(JSON.stringify({ medianMs: 7000, samples: 4, defaulted: false }), { status: 200 });
		if (path === '/api/verify/stream') {
			await new Promise((resolve) => setTimeout(resolve, streamDelayMs));
			return new Response(JSON.stringify(FIXTURE_OUTCOMES[STATE_KEY]), { status: 200 });
		}
		return new Response('{}', { status: 404 });
	});
	vi.stubGlobal('fetch', fetchMock);
}

function submit() {
	render(<App />);
	fireEvent.change(screen.getByLabelText(/Wklej informację lub link/), { target: { value: 'Biblioteka jest czynna od 9 do 17.' } });
	fireEvent.click(screen.getByRole('button', { name: 'Sprawdź' }));
}

function stubReducedMotion(matches: boolean) {
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: matches && query.includes('reduce'),
		media: query,
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
	}));
}

beforeEach(() => {
	SCENES.pogodynka = [testScene()];
	vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
	cleanup();
	SCENES.pogodynka = ORIGINAL_SCENES;
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	window.history.replaceState(null, '', '/');
	window.localStorage.clear();
});

describe('sceny czekania', () => {
	it('losuje wariant sceny z listy roli', () => {
		SCENES.pogodynka = ORIGINAL_SCENES;
		const variants = ORIGINAL_SCENES;
		expect(variants.length).toBeGreaterThanOrEqual(3);
		expect(pickScene('pogodynka', () => 0)).toBe(variants[0]);
		expect(pickScene('pogodynka', () => 0.999)).toBe(variants[variants.length - 1]);
		expect(SCENES.bibliotekarka.length).toBeGreaterThanOrEqual(1);
		for (const spec of Object.values({ ...SCENES, pogodynka: ORIGINAL_SCENES }).flat()) {
			expect(spec.alt.length).toBeGreaterThan(10);
			expect(spec.durationSec).toBeGreaterThanOrEqual(6);
			expect(spec.durationSec).toBeLessThanOrEqual(20);
		}
	});

	it('odpowiedź w trakcie sceny: wynik od razu na pierwszym planie, scena w rogu dogrywa do końca', async () => {
		SCENES.pogodynka = [testScene({ file: '/postacie/pogodynka/sceny/a.mp4', poster: '/postacie/pogodynka/sceny/a.webp' })];
		stubApi(150);
		submit();
		await screen.findByLabelText('Postęp sprawdzania');
		const stage = () => document.querySelector('.character-stage') as HTMLElement;
		expect(stage().getAttribute('data-mode')).toBe('foreground');
		const video = stage().querySelector('video') as HTMLVideoElement;
		await act(async () => {
			fireEvent.playing(video);
		});
		expect(screen.getByRole('button', { name: SCENE_TEXTS.skip })).toBeTruthy();
		const startedAt = Date.now();
		await screen.findByText(STATE_LABEL, undefined, { timeout: 3000 });
		expect(Date.now() - startedAt).toBeLessThan(900);
		expect(screen.queryByLabelText('Postęp sprawdzania')).toBeNull();
		await waitFor(() => expect(stage().getAttribute('data-mode')).toBe('corner'));
		expect(stage().querySelector('video')).toBe(video);
		expect(stage().getAttribute('data-clip')).toBe('playing');
		expect(video.loop).toBe(false);
		expect(screen.getByRole('button', { name: SCENE_TEXTS.skip })).toBeTruthy();
		await act(async () => {
			fireEvent.ended(video);
		});
		expect(stage().getAttribute('data-clip')).toBe('none');
		expect(stage().querySelector('.character-stage__clip--done')).not.toBeNull();
		expect(stage().querySelector('img, svg')).not.toBeNull();
		expect(screen.queryByRole('button', { name: SCENE_TEXTS.skip })).toBeNull();
	});

	it('czas pokazania wyniku jest czasem silnika, a nie czasem sceny', async () => {
		SCENES.pogodynka = [testScene({ file: '/postacie/pogodynka/sceny/a.mp4', poster: null, durationSec: 7 })];
		stubApi(120);
		submit();
		await screen.findByText(STATE_LABEL, undefined, { timeout: 3000 });
		await waitFor(() => expect(document.querySelector('.result')?.getAttribute('data-shown-ms')).not.toBeNull());
		const result = document.querySelector('.result');
		const engineMs = Number(result?.getAttribute('data-engine-ms'));
		const shownMs = Number(result?.getAttribute('data-shown-ms'));
		expect(engineMs).toBeGreaterThanOrEqual(100);
		expect(shownMs).toBeGreaterThanOrEqual(engineMs);
		expect(shownMs - engineMs).toBeLessThan(100);
	});

	it('podczas szukania klip się zapętla, a po wyniku dogrywa do końca tylko raz', async () => {
		SCENES.pogodynka = [testScene({ file: '/postacie/pogodynka/sceny/a.mp4', poster: null, durationSec: 7 })];
		stubApi(400);
		submit();
		const waiting = await screen.findByLabelText('Postęp sprawdzania');
		void waiting;
		const video = document.querySelector('.character-stage video') as HTMLVideoElement;
		await act(async () => {
			fireEvent.playing(video);
			fireEvent.ended(video);
		});
		expect(document.querySelector('.character-stage video')).toBe(video);
		expect(document.querySelector('.character-stage')?.getAttribute('data-clip')).toBe('playing');
		await screen.findByText(STATE_LABEL, undefined, { timeout: 3000 });
		await act(async () => {
			fireEvent.ended(video);
		});
		expect(document.querySelector('.character-stage')?.getAttribute('data-clip')).toBe('none');
	});

	it('"Pomiń animację" zatrzymuje scenę od razu (nieruchoma klatka) tylko dla tego sprawdzenia, bez zapisu wyboru', async () => {
		SCENES.pogodynka = [testScene({ file: '/postacie/pogodynka/sceny/a.mp4', poster: null, durationSec: 7 })];
		const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
		stubApi(100);
		submit();
		await screen.findByLabelText('Postęp sprawdzania');
		const video = document.querySelector('.character-stage video') as HTMLVideoElement;
		await act(async () => {
			fireEvent.playing(video);
		});
		fireEvent.click(screen.getByRole('button', { name: SCENE_TEXTS.skip }));
		expect(pause).toHaveBeenCalled();
		expect(document.querySelector('.character-stage video')).toBe(video);
		expect(screen.queryByRole('button', { name: SCENE_TEXTS.skip })).toBeNull();
		expect(screen.getByRole('button', { name: SCENE_TEXTS.replay })).toBeTruthy();
		expect(window.localStorage.length).toBe(0);
		await screen.findByText(STATE_LABEL, undefined, { timeout: 600 });
		fireEvent.click(screen.getByRole('link', { name: 'Mylik, strona główna' }));
		fireEvent.change(await screen.findByLabelText(/Wklej informację lub link/), { target: { value: 'Biblioteka jest czynna od 9 do 17.' } });
		fireEvent.click(screen.getByRole('button', { name: 'Sprawdź' }));
		await screen.findByLabelText('Postęp sprawdzania');
		const next = document.querySelector('.character-stage video') as HTMLVideoElement;
		expect(next).not.toBeNull();
		await act(async () => {
			fireEvent.playing(next);
		});
		expect(screen.getByRole('button', { name: SCENE_TEXTS.skip })).toBeTruthy();
	});

	it('"Odtwórz animację" w widoku czekania wznawia scenę od początku', async () => {
		SCENES.pogodynka = [testScene({ file: '/postacie/pogodynka/sceny/a.mp4', poster: null, durationSec: 7 })];
		stubApi(600);
		submit();
		await screen.findByLabelText('Postęp sprawdzania');
		const video = document.querySelector('.character-stage video') as HTMLVideoElement;
		await act(async () => {
			fireEvent.playing(video);
		});
		fireEvent.click(screen.getByRole('button', { name: SCENE_TEXTS.skip }));
		fireEvent.click(screen.getByRole('button', { name: SCENE_TEXTS.replay }));
		const replayed = document.querySelector('.character-stage video') as HTMLVideoElement;
		expect(replayed).not.toBe(video);
		await act(async () => {
			fireEvent.playing(replayed);
		});
		expect(screen.getByRole('button', { name: SCENE_TEXTS.skip })).toBeTruthy();
	});

	it('pominięcie działa, gdy localStorage rzuca błędem', async () => {
		SCENES.pogodynka = [testScene({ file: '/postacie/pogodynka/sceny/a.mp4', poster: null, durationSec: 7 })];
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('zablokowane');
		});
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('zablokowane');
		});
		stubApi(100);
		submit();
		await screen.findByLabelText('Postęp sprawdzania');
		await act(async () => {
			fireEvent.playing(document.querySelector('.character-stage video') as HTMLVideoElement);
		});
		fireEvent.click(screen.getByRole('button', { name: SCENE_TEXTS.skip }));
		await screen.findByText(STATE_LABEL, undefined, { timeout: 600 });
		expect(screen.getByRole('button', { name: SCENE_TEXTS.replay })).toBeTruthy();
	});

	it('ograniczenie ruchu: nieruchoma postać z "Odtwórz animację", wynik bez czekania', async () => {
		SCENES.pogodynka = [testScene({ file: '/postacie/pogodynka/sceny/a.mp4', poster: null, durationSec: 7 })];
		stubReducedMotion(true);
		stubApi(100);
		submit();
		await screen.findByLabelText('Postęp sprawdzania');
		expect(document.querySelector('.character-stage video')).toBeNull();
		expect(document.querySelector('.character-stage img, .character-stage svg')).not.toBeNull();
		expect(screen.queryByRole('button', { name: SCENE_TEXTS.skip })).toBeNull();
		expect(screen.getByRole('button', { name: SCENE_TEXTS.replay })).toBeTruthy();
		await screen.findByText(STATE_LABEL, undefined, { timeout: 400 });
	});

	it('scena bez klipu: nieruchoma postać, wynik bez czekania', async () => {
		SCENES.pogodynka = [testScene({ file: null })];
		stubApi(0);
		submit();
		await screen.findByText(STATE_LABEL, undefined, { timeout: 400 });
		expect(document.querySelector('.character-stage video')).toBeNull();
		expect(document.querySelector('.character-stage img, .character-stage svg')).not.toBeNull();
	});

	it('błąd ładowania klipu nie opóźnia wyniku i zostawia nieruchomą postać', async () => {
		SCENES.pogodynka = [testScene({ file: '/postacie/pogodynka/sceny/brak.mp4', poster: null, durationSec: 7 })];
		stubApi(0);
		submit();
		const waiting = await screen.findByLabelText('Postęp sprawdzania');
		void waiting;
		const video = document.querySelector('.character-stage video') as HTMLVideoElement | null;
		if (video) {
			expect(video.muted).toBe(true);
			expect(video.hasAttribute('playsinline')).toBe(true);
			expect(video.hasAttribute('controls')).toBe(false);
			await act(async () => {
				fireEvent.error(video);
			});
		}
		await screen.findByText(STATE_LABEL, undefined, { timeout: 500 });
		expect(document.querySelector('.character-stage video')).toBeNull();
		expect(document.querySelector('.character-stage img, .character-stage svg')).not.toBeNull();
	});

	it('wynik z rekordem: adres rekordu, bez ponownego pobierania, scena w rogu strony wyniku', async () => {
		SCENES.pogodynka = [testScene({ file: '/postacie/pogodynka/sceny/a.mp4', poster: null, durationSec: 7 })];
		const record = FIXTURE_OUTCOMES.potwierdzone;
		const fetchMock = vi.fn(async (path: string) => {
			if (path === '/api/verify/key') return new Response(JSON.stringify({ recordId: null }), { status: 200 });
			if (path.startsWith('/api/sources/latest')) return new Response(JSON.stringify({ corpusVersion: 'x', documents: [] }), { status: 200 });
			if (path === '/api/verify/eta') return new Response(JSON.stringify({ medianMs: 7000, samples: 4, defaulted: false }), { status: 200 });
			if (path === '/api/verify/stream') {
				await new Promise((resolve) => setTimeout(resolve, 100));
				return new Response(JSON.stringify(record), { status: 200 });
			}
			return new Response('{}', { status: 404 });
		});
		vi.stubGlobal('fetch', fetchMock);
		submit();
		await screen.findByLabelText('Postęp sprawdzania');
		const video = document.querySelector('.character-stage video');
		await waitFor(() => expect(window.location.pathname).toMatch(/^\/r\/[0-9a-f]{64}$/), { timeout: 3000 });
		await waitFor(() => expect(document.querySelector('.record')).not.toBeNull());
		expect(fetchMock.mock.calls.some((call) => String(call[0]).startsWith('/api/records/') && !String(call[0]).endsWith('/obieg'))).toBe(false);
		expect(document.querySelector('.character-stage')?.getAttribute('data-mode')).toBe('corner');
		expect(document.querySelector('.character-stage video')).toBe(video);
		expect(document.querySelector('.record .stage-slot--corner')).not.toBeNull();
	});

	it('znaczniki na klipie odpowiadają znalezionym źródłom, a tekst stanu jest w aria-live', () => {
		let progress = reduceProgress(INITIAL_PROGRESS, { type: 'zgloszenie_przeczytane', claims: 1 });
		for (const publisher of ['GIS', 'Urząd', 'Gmina']) {
			progress = reduceProgress(progress, {
				type: 'fragment_oceniony',
				claim: 0,
				publisher,
				publishedAt: '2026-01-02',
				stance: 'to_samo',
			});
		}
		const { container } = render(<SceneMarks progress={progress} />);
		expect(container.querySelectorAll('.scene__mark')).toHaveLength(3);
		expect(container.querySelector('.scene__marks')?.getAttribute('aria-hidden')).toBe('true');
	});

	it('teksty scen są proste i bez zakazanych słów', () => {
		const texts = [...Object.values(SCENE_TEXTS), ...Object.values({ ...SCENES, pogodynka: ORIGINAL_SCENES }).flat().map((spec) => spec.alt)];
		for (const text of texts) expect(findForbiddenForms(text)).toEqual([]);
	});
});
