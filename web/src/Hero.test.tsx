// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BRAND_TAGLINE } from '../../src/render/warning';
import { App } from './App';
import { Hero, HeroIllustration } from './components/Hero';
import { HeroStage } from './components/HeroStage';
import { HOME_TEXTS } from './components/HomeSections';
import { HISTORY_KEY } from './history';
import { entriesFor, type ManifestEntry } from './roles/manifest';
import { HERO_SCENES, SCENE_TEXTS, heroScenesFor, heroSequence, type SceneSpec } from './scenes/config';
import { readSceneSkipped, writeSceneSkipped } from './scenes/preferences';

const HERE = dirname(fileURLToPath(import.meta.url));

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	window.history.replaceState(null, '', '/');
	window.localStorage.clear();
	writeSceneSkipped(false);
});

function stubReducedMotion(matches: boolean) {
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: matches && query.includes('reduce'),
		media: query,
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
	}));
}

function scene(id: string, overrides: Partial<SceneSpec> = {}): SceneSpec {
	return { id, file: `/postacie/start/${id}.mp4`, poster: `/postacie/start/${id}.png`, durationSec: 6, alt: `Opis ${id}`, loop: false, ...overrides };
}

function countWords(text: string): number {
	return text.split(/\s+/u).filter(Boolean).length;
}

function stubLatest(count: number) {
	const documents = Array.from({ length: count }, (_, index) => ({
		documentId: `d${index}`,
		title: `Dokument ${index}`,
		url: `https://przyklad.example/${index}`,
		publisher: 'Urząd',
		publishedAt: '2026-11-01',
		fetchedAt: '2026-11-02T10:00:00Z',
		sourceType: 'urzedowy',
		domain: 'przyklad.example',
	}));
	vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ corpusVersion: 'x', documents }), { status: 200 })));
}

describe('pierwszy ekran strony głównej', () => {
	it('ma hasło dosłownie, jedno pole, jeden przycisk i do 35 słów', () => {
		stubLatest(0);
		const { container } = render(<App />);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(BRAND_TAGLINE);
		expect(container.querySelectorAll('textarea')).toHaveLength(1);
		const hero = container.querySelector('.hero') as HTMLElement;
		const controls = within(hero).getAllByRole('button');
		expect(controls.filter((button) => button.getAttribute('type') === 'submit')).toHaveLength(1);
		expect(controls.filter((button) => button.getAttribute('type') !== 'submit').map((button) => button.textContent)).toEqual([
			SCENE_TEXTS.skip,
		]);
		const header = container.querySelector('.site-header') as HTMLElement;
		const visible = [header, hero]
			.map((node) => {
				const clone = node.cloneNode(true) as HTMLElement;
				clone.querySelectorAll('.visually-hidden, [aria-hidden="true"]').forEach((item) => item.remove());
				return clone.textContent ?? '';
			})
			.join(' ');
		expect(countWords(visible)).toBeLessThanOrEqual(35);
	});

	it('rezerwuje miejsce na ilustrację: zaślepka z kodu albo plik z tekstem alternatywnym', () => {
		const placeholder = render(<HeroIllustration />);
		const still = placeholder.container.querySelector('img');
		expect(still?.getAttribute('src')).toMatch(/\/postacie\/start\/praca__spoczynek\.webp$/);
		expect(still?.getAttribute('alt')).toBeTruthy();
		fireEvent.error(still as HTMLImageElement);
		expect(placeholder.container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
		expect(placeholder.container.querySelector('img')).toBeNull();
		cleanup();
		const custom = render(<HeroIllustration src="/postac.webp" alt="Postać z mapą i lupą" />);
		expect(custom.container.querySelector('img')?.getAttribute('alt')).toBe('Postać z mapą i lupą');
		cleanup();
		render(<Hero illustration={{ src: '/a.png', alt: 'Opis' }}><p>Pole</p></Hero>);
		expect(screen.getByAltText('Opis')).toBeTruthy();
	});

	it('licznik znaków pojawia się dopiero blisko limitu', () => {
		stubLatest(0);
		render(<App />);
		const field = screen.getByLabelText(/Wklej informację lub link/);
		fireEvent.change(field, { target: { value: 'a'.repeat(100) } });
		expect(screen.queryByText(/Znaków:/)).toBeNull();
		fireEvent.change(field, { target: { value: 'a'.repeat(1700) } });
		expect(screen.getByText('Znaków: 1700 z 2000')).toBeTruthy();
	});
});

describe('sekcje pod polem', () => {
	it('pokazują po 3 pozycje, reszta pod "Pokaż więcej"', async () => {
		stubLatest(5);
		window.localStorage.setItem(
			HISTORY_KEY,
			JSON.stringify(
				Array.from({ length: 5 }, (_, index) => ({
					id: `${index}`.repeat(64),
					text: `Sprawdzenie ${index}`,
					label: 'potwierdzone',
					checkedAt: '2026-11-20T10:00:00Z',
				})),
			),
		);
		const { container } = render(<App />);
		await screen.findByRole('link', { name: /Dokument 0/ });
		const sections = container.querySelectorAll('.home-section');
		expect(sections).toHaveLength(2);
		for (const section of sections) {
			expect(section.querySelectorAll('.home-list__item')).toHaveLength(3);
			fireEvent.click(within(section as HTMLElement).getByRole('button', { name: HOME_TEXTS.showMore }));
			expect(section.querySelectorAll('.home-list__item')).toHaveLength(5);
		}
		expect(container.querySelector('.home-section__note')).toBeNull();
	});
});

describe('scena przy pracy w hero', () => {
	it('kolejność z manifestu: klipy odtwarzane raz, potem jeden zapętlony', () => {
		const sequence = heroSequence([
			scene('a', { loop: true }),
			scene('b'),
			scene('c', { loop: true }),
			scene('d'),
		]);
		expect(sequence.map((item) => item.id)).toEqual(['b', 'd', 'a']);
		expect(heroSequence([scene('x')]).map((item) => item.id)).toEqual(['x']);
		expect(heroSequence([])).toEqual([]);
	});

	it('klipy roli startowej pochodzą z manifestu, a nowy wpis wystarczy dopisać', () => {
		const fromManifest = entriesFor('start', 'scena_czekania');
		expect(fromManifest.length).toBeGreaterThan(0);
		expect(HERO_SCENES.length).toBeGreaterThan(0);
		for (const item of HERO_SCENES) {
			expect(item.file).toMatch(/^\/postacie\/start\/.+\.mp4$/);
			expect(item.poster).toMatch(/^\/postacie\/start\/.+\.png$/);
		}
		const extra: ManifestEntry = { ...fromManifest[0], stan: 'nowy_klip', plik: 'postacie/start/nowy.mp4', plakat: 'postacie/start/nowy.png', petla: false };
		const extended = heroScenesFor([...fromManifest, extra]);
		expect(extended.map((item) => item.id)).toContain('start-nowy_klip');
		expect(extended[extended.length - 1]?.loop).toBe(true);
	});

	it('odtwarza się po wejściu: wideo z plakatem, bez dźwięku, bez kontrolek', () => {
		stubLatest(0);
		const { container } = render(<App />);
		const video = container.querySelector('.hero video') as HTMLVideoElement;
		expect(video).not.toBeNull();
		expect(video.muted).toBe(true);
		expect(video.hasAttribute('playsinline')).toBe(true);
		expect(video.hasAttribute('controls')).toBe(false);
		expect(video.getAttribute('poster')).toMatch(/\.png$/);
		expect(video.getAttribute('src')).toMatch(/\.mp4$/);
		expect(screen.getByRole('button', { name: SCENE_TEXTS.skip })).toBeTruthy();
		expect(container.querySelector('.hero [role="img"]')?.getAttribute('aria-label')).toBeTruthy();
	});

	it('po końcu klipu wchodzi następny, ostatni zostaje na ekranie', () => {
		const scenes = [scene('pierwszy'), scene('drugi', { loop: true })];
		const { container } = render(<HeroStage scenes={scenes} />);
		const source = () => container.querySelector('video')?.getAttribute('src');
		expect(source()).toBe('/postacie/start/pierwszy.mp4');
		fireEvent.ended(container.querySelector('video') as HTMLVideoElement);
		expect(source()).toBe('/postacie/start/drugi.mp4');
		expect(container.querySelector('video')?.hasAttribute('loop')).toBe(true);
		fireEvent.ended(container.querySelector('video') as HTMLVideoElement);
		expect(source()).toBe('/postacie/start/drugi.mp4');
	});

	it('błąd klipu: przeskakuje do następnego, a po ostatnim zostaje nieruchomy obraz', async () => {
		const scenes = [scene('pierwszy'), scene('drugi', { loop: true })];
		const { container } = render(<HeroStage scenes={scenes} />);
		await act(async () => {
			fireEvent.error(container.querySelector('video') as HTMLVideoElement);
		});
		expect(container.querySelector('video')?.getAttribute('src')).toBe('/postacie/start/drugi.mp4');
		await act(async () => {
			fireEvent.error(container.querySelector('video') as HTMLVideoElement);
		});
		expect(container.querySelector('video')).toBeNull();
		expect(container.querySelector('img')?.getAttribute('src')).toMatch(/praca__spoczynek\.webp$/);
	});

	it('"Pomiń animację" zostawia nieruchomą postać i zapamiętuje wybór', () => {
		stubLatest(0);
		const { container } = render(<App />);
		fireEvent.click(screen.getByRole('button', { name: SCENE_TEXTS.skip }));
		expect(readSceneSkipped()).toBe(true);
		expect(container.querySelector('.hero video')).toBeNull();
		expect(container.querySelector('.hero img')?.getAttribute('src')).toMatch(/praca__spoczynek\.webp$/);
		expect(screen.queryByRole('button', { name: SCENE_TEXTS.skip })).toBeNull();
	});

	it('ograniczenie ruchu: sam plakat, bez wideo i bez przycisku pomijania', () => {
		stubReducedMotion(true);
		stubLatest(0);
		const { container } = render(<App />);
		expect(container.querySelector('.hero video')).toBeNull();
		const poster = container.querySelector('.hero img') as HTMLImageElement;
		expect(poster.getAttribute('src')).toBe(HERO_SCENES.find((item) => item.loop)?.poster);
		expect(poster.getAttribute('alt')).toBeTruthy();
		expect(screen.queryByRole('button', { name: SCENE_TEXTS.skip })).toBeNull();
	});
});

describe('duża scena roli', () => {
	it('w czasie czekania scena roli zajmuje miejsce postaci startowej w hero', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (path: string) => {
				if (path === '/api/verify/key') return new Response(JSON.stringify({ recordId: null }), { status: 200 });
				if (path.startsWith('/api/sources/latest')) return new Response(JSON.stringify({ corpusVersion: 'x', documents: [] }), { status: 200 });
				if (path === '/api/verify/eta') return new Response(JSON.stringify({ medianMs: 7000, samples: 4, defaulted: false }), { status: 200 });
				return new Promise<Response>(() => undefined);
			}),
		);
		const { container } = render(<App />);
		expect(container.querySelector('.hero__stage')).not.toBeNull();
		fireEvent.change(screen.getByLabelText(/Wklej informację lub link/), { target: { value: 'Biblioteka jest czynna od 9 do 17.' } });
		fireEvent.click(screen.getByRole('button', { name: 'Sprawdź' }));
		await waitFor(() => expect(container.querySelector('.hero .waiting-steps--hero')).not.toBeNull());
		expect(container.querySelector('.hero__stage')).toBeNull();
		expect(container.querySelectorAll('.hero textarea')).toHaveLength(1);
		expect(screen.getByRole('button', { name: SCENE_TEXTS.skip })).toBeTruthy();
	});

	it('obraz wyniku stoi obok nagłówka i oceny, a nie jako miniatura', () => {
		const css = readFileSync(join(HERE, 'roles', 'roles.css'), 'utf8');
		const widths = [...css.matchAll(/\.result-image\s*\{[^}]*?\n\twidth:\s*(\d+)px/g)].map((match) => Number(match[1]));
		expect(widths.length).toBeGreaterThan(0);
		for (const width of widths) expect(width).toBeGreaterThanOrEqual(240);
		expect(css).toMatch(/\.stage \{[^}]*background:\s*#ffffff;/);
		const wide = css.match(/\.record-claim__lead \.result-image \{[^}]*?width:\s*(\d+)px/);
		expect(Number(wide?.[1])).toBeGreaterThanOrEqual(320);
	});
});
