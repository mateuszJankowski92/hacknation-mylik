// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STATE_LABELS_PL } from '../../../src/contracts/verdict';
import { findForbiddenForms } from '../../../src/render/metrics';
import { App } from '../App';
import { FIXTURE_OUTCOMES } from '../fixtures/outcomes';
import { INITIAL_PROGRESS, reduceProgress } from '../visuals/progress';
import { SCENES, SCENE_TEXTS, pickScene, type SceneSpec } from './config';
import { readSceneSkipped, writeSceneSkipped } from './preferences';
import { SceneMarks } from './SceneStage';

const STATE_KEY = 'brak_mozliwosci_sprawdzenia';
const STATE_LABEL = STATE_LABELS_PL[STATE_KEY];
const ORIGINAL_SCENES = SCENES.pogodynka;
const SCENE_MS = 600;

function testScene(overrides: Partial<SceneSpec> = {}): SceneSpec {
	return { id: 'test-1', file: null, poster: null, durationSec: SCENE_MS / 1000, alt: 'Pogodynka sprawdza mapę.', ...overrides };
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
	writeSceneSkipped(false);
});

describe('sceny czekania', () => {
	it('losuje wariant sceny z listy roli', () => {
		const variants = SCENES.bibliotekarka;
		expect(variants.length).toBeGreaterThanOrEqual(3);
		expect(pickScene('bibliotekarka', () => 0)).toBe(variants[0]);
		expect(pickScene('bibliotekarka', () => 0.999)).toBe(variants[variants.length - 1]);
		for (const spec of Object.values({ ...SCENES, pogodynka: ORIGINAL_SCENES }).flat()) {
			expect(spec.alt.length).toBeGreaterThan(10);
			expect(spec.durationSec).toBeGreaterThanOrEqual(6);
			expect(spec.durationSec).toBeLessThanOrEqual(8);
		}
	});

	it('odpowiedź przed końcem sceny: wynik czeka do końca sceny', async () => {
		stubApi(0);
		submit();
		await screen.findByLabelText('Postęp sprawdzania');
		await new Promise((resolve) => setTimeout(resolve, SCENE_MS / 3));
		expect(screen.queryByText(STATE_LABEL)).toBeNull();
		expect(screen.getByRole('button', { name: SCENE_TEXTS.skip })).toBeTruthy();
		await screen.findByText(STATE_LABEL, undefined, { timeout: 3000 });
		expect(screen.queryByLabelText('Postęp sprawdzania')).toBeNull();
		await waitFor(() => expect(document.querySelector('.result')?.getAttribute('data-shown-ms')).not.toBeNull());
		const result = document.querySelector('.result');
		const engineMs = Number(result?.getAttribute('data-engine-ms'));
		const shownMs = Number(result?.getAttribute('data-shown-ms'));
		expect(engineMs).toBeLessThan(SCENE_MS);
		expect(shownMs).toBeGreaterThanOrEqual(SCENE_MS - 50);
		expect(shownMs).toBeGreaterThan(engineMs);
	});

	it('odpowiedź po końcu sceny: scena zapętla się, wynik pojawia się od razu po odpowiedzi', async () => {
		stubApi(SCENE_MS + 500);
		submit();
		await screen.findByLabelText('Postęp sprawdzania');
		await new Promise((resolve) => setTimeout(resolve, SCENE_MS + 250));
		expect(screen.getByLabelText('Postęp sprawdzania')).toBeTruthy();
		expect(screen.queryByText(STATE_LABEL)).toBeNull();
		const startedAt = Date.now();
		await screen.findByText(STATE_LABEL, undefined, { timeout: 3000 });
		expect(Date.now() - startedAt).toBeLessThan(1200);
		await waitFor(() => expect(document.querySelector('.result')?.getAttribute('data-shown-ms')).not.toBeNull());
		const result = document.querySelector('.result');
		expect(Number(result?.getAttribute('data-shown-ms')) - Number(result?.getAttribute('data-engine-ms'))).toBeLessThan(150);
	});

	it('"Pomiń animację" pokazuje wynik od razu i zapamiętuje wybór', async () => {
		stubApi(100);
		submit();
		fireEvent.click(await screen.findByRole('button', { name: SCENE_TEXTS.skip }));
		expect(readSceneSkipped()).toBe(true);
		expect(window.localStorage.getItem('mylik.pomin-animacje')).toBe('1');
		await screen.findByText(STATE_LABEL, undefined, { timeout: 400 });
		fireEvent.click(screen.getByRole('button', { name: 'Sprawdź' }));
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(screen.queryByRole('button', { name: SCENE_TEXTS.skip })).toBeNull();
		await screen.findByText(STATE_LABEL, undefined, { timeout: 400 });
	});

	it('wybór można przywrócić w ustawieniach strony', async () => {
		writeSceneSkipped(true);
		stubApi(0);
		render(<App />);
		const setting = screen.getByRole('checkbox', { name: SCENE_TEXTS.setting }) as HTMLInputElement;
		expect(setting.checked).toBe(false);
		fireEvent.click(setting);
		expect(setting.checked).toBe(true);
		expect(readSceneSkipped()).toBe(false);
		fireEvent.change(screen.getByLabelText(/Wklej informację lub link/), { target: { value: 'Coś do sprawdzenia.' } });
		fireEvent.click(screen.getByRole('button', { name: 'Sprawdź' }));
		expect(await screen.findByRole('button', { name: SCENE_TEXTS.skip })).toBeTruthy();
	});

	it('pominięcie działa, gdy localStorage rzuca błędem', async () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('zablokowane');
		});
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('zablokowane');
		});
		stubApi(100);
		submit();
		fireEvent.click(await screen.findByRole('button', { name: SCENE_TEXTS.skip }));
		await screen.findByText(STATE_LABEL, undefined, { timeout: 400 });
		expect(readSceneSkipped()).toBe(true);
	});

	it('ograniczenie ruchu: nieruchomy plakat i wynik bez czekania na scenę', async () => {
		stubReducedMotion(true);
		stubApi(100);
		submit();
		const waiting = await screen.findByLabelText('Postęp sprawdzania');
		expect(waiting.querySelector('video')).toBeNull();
		expect(screen.queryByRole('button', { name: SCENE_TEXTS.skip })).toBeNull();
		await screen.findByText(STATE_LABEL, undefined, { timeout: 400 });
	});

	it('brak pliku wideo nie blokuje wyniku', async () => {
		SCENES.pogodynka = [testScene({ file: '/postacie/pogodynka/sceny/brak.mp4', poster: null, durationSec: 7 })];
		stubApi(0);
		submit();
		const waiting = await screen.findByLabelText('Postęp sprawdzania');
		const video = waiting.querySelector('video');
		expect(video).not.toBeNull();
		expect(video?.muted).toBe(true);
		expect(video?.hasAttribute('playsinline')).toBe(true);
		expect(video?.hasAttribute('controls')).toBe(false);
		await act(async () => {
			fireEvent.error(video as HTMLVideoElement);
		});
		await screen.findByText(STATE_LABEL, undefined, { timeout: 500 });
	});

	it('koniec klipu wideo odblokowuje wynik', async () => {
		SCENES.pogodynka = [testScene({ file: '/postacie/pogodynka/sceny/a.mp4', poster: '/postacie/pogodynka/sceny/a.webp', durationSec: 7 })];
		stubApi(0);
		submit();
		const waiting = await screen.findByLabelText('Postęp sprawdzania');
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(screen.queryByText(STATE_LABEL)).toBeNull();
		const video = waiting.querySelector('video') as HTMLVideoElement;
		expect(video.getAttribute('poster')).toBe('/postacie/pogodynka/sceny/a.webp');
		await act(async () => {
			fireEvent.ended(video);
		});
		await waitFor(() => expect(screen.getByText(STATE_LABEL)).toBeTruthy());
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
