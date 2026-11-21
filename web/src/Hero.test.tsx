// @vitest-environment jsdom
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BRAND_HEADLINE, BRAND_SUBHEAD, BRAND_TAGLINE } from '../../src/render/warning';
import {
	HERO_HEADLINE,
	HERO_KICKER,
	HERO_PAGE_TITLE,
	HERO_STRUCK_WORD,
	HERO_SUBHEAD,
} from './components/heroCopy';
import { nb, plain } from './typography';
import { App } from './App';
import { readUnscaled } from './testing/css';
import { Hero, HeroIllustration } from './components/Hero';
import { HeroStage } from './components/HeroStage';
import { HOME_TEXTS } from './components/HomeSections';
import { HISTORY_KEY } from './history';
import { entriesFor, type ManifestEntry } from './roles/manifest';
import { HERO_SCENES, SCENE_TEXTS, heroEntries, heroScenesFor, heroSequence, type SceneSpec } from './scenes/config';
import { LEGACY_SCENE_STORAGE_KEY, clearLegacySceneChoice } from './scenes/preferences';

const HERE = dirname(fileURLToPath(import.meta.url));

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	window.history.replaceState(null, '', '/');
	window.localStorage.clear();
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
	it('ma nagłówek dosłownie, jedno pole, jeden przycisk i do 35 słów', () => {
		stubLatest(0);
		const { container } = render(<App />);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(nb(HERO_HEADLINE));
		expect(container.querySelector('.hero__kicker')?.textContent).toBe(nb(HERO_KICKER));
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
		expect(container.querySelector('.hero__subtitle .visually-hidden')?.textContent).toBe(nb(HERO_SUBHEAD));
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
				clone.querySelectorAll('.visually-hidden, [hidden], [aria-hidden="true"]:not(.hero__subtitle-visual)').forEach((item) => item.remove());
				return clone.textContent ?? '';
			})
			.join(' ');
		expect(countWords(visible)).toBeLessThanOrEqual(35);
	});

	it('rezerwuje miejsce na ilustrację: obraz zastępczy z kodu albo plik z tekstem alternatywnym', () => {
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

describe('nagłówek strony głównej', () => {
	it('mała linia nad h1 to zwykły tekst, a hasło marki w karcie i zgłoszeniu zostaje bez zmian', () => {
		stubLatest(0);
		const { container } = render(<App />);
		const kicker = container.querySelector('.hero__kicker') as HTMLElement;
		expect(kicker.tagName).toBe('P');
		expect(plain(kicker.textContent ?? '')).toBe('Mapa to nie terytorium.');
		expect(kicker.compareDocumentPosition(screen.getByRole('heading', { level: 1 })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(plain(screen.getByRole('heading', { level: 1 }).textContent ?? '')).toBe('Informacja to nie fakt.');
		expect(BRAND_HEADLINE).toBe('Mapa to nie terytorium.');
		expect(BRAND_SUBHEAD).toBe('Mylik sprawdza mapę, zanim w nią uwierzysz.');
		expect(BRAND_TAGLINE).toBe(`${BRAND_HEADLINE} ${BRAND_SUBHEAD}`);
	});

	it('czytnik ekranu dostaje czyste zdanie, a przekreślone słowo jest ozdobą ukrytą przed czytnikiem', () => {
		stubLatest(0);
		const { container } = render(<App />);
		const subtitle = container.querySelector('.hero__subtitle') as HTMLElement;
		const readable = subtitle.cloneNode(true) as HTMLElement;
		readable.querySelectorAll('[aria-hidden="true"]').forEach((node) => node.remove());
		expect(plain(readable.textContent ?? '').trim()).toBe('Mylik sprawdza informację w źródłach, zanim w nią uwierzysz.');
		expect(plain(readable.textContent ?? '')).not.toMatch(/mapę/u);
		const struck = subtitle.querySelector('.hero__struck') as HTMLElement;
		expect(struck.textContent).toBe(HERO_STRUCK_WORD);
		expect(struck.closest('[aria-hidden="true"]')).not.toBeNull();
		expect(subtitle.querySelector('del, s, strike')).toBeNull();
	});

	it('widoczny podtytuł czyta się "mapę informację", z nierozdzielną parą słów i bez jednoliterowych końcówek wierszy', () => {
		stubLatest(0);
		const { container } = render(<App />);
		const visual = container.querySelector('.hero__subtitle-visual') as HTMLElement;
		expect(plain(visual.textContent ?? '')).toBe('Mylik sprawdza mapę informację w źródłach, zanim w nią uwierzysz.');
		const pair = container.querySelector('.hero__nowrap') as HTMLElement;
		expect(pair.textContent).toBe(`${HERO_STRUCK_WORD}\u00a0informację`);
		const lines = Array.from(container.querySelectorAll('.hero__subtitle-line')).map((line) => line.textContent ?? '');
		expect(lines).toHaveLength(2);
		expect(lines[1]).toMatch(/^w\u00a0źródłach,/u);
		for (const line of lines) expect(line).not.toMatch(/\s[aiouwz]$/iu);
		expect(lines[1]).toMatch(/w\u00a0nią/u);
	});

	it('przekreślenie to ołówkowa kreska w CSS, pod kątem, słowo szare z kontrastem AA', () => {
		const css = readUnscaled(join(HERE, 'components', 'hero.css'), 'utf8');
		expect(css).toMatch(/\.hero__struck::after \{[^}]*height: 2px;[^}]*background: var\(--graphite\);[^}]*transform: rotate\(-[\d.]+deg\);/);
		expect(css).toMatch(/\.hero__struck \{[^}]*color: var\(--struck\);/);
		expect(css).toMatch(/@media \(min-width: 640px\) \{[\s\S]*?\.hero__subtitle-line \{\s*display: block;/);
		expect(css).not.toMatch(/animation|transition: [^;]*hero__struck/);
	});

	it('mała linia ma 18 px na telefonie i 20-22 px na większych ekranach', () => {
		const css = readUnscaled(join(HERE, 'components', 'hero.css'), 'utf8');
		const sizes = [...css.matchAll(/\.hero__kicker \{[^}]*font-size: (\d+)px;/g)].map((match) => Number(match[1]));
		expect(sizes).toEqual([18, 20, 22]);
	});

	it('tytuł karty i opis w pliku HTML: "Mylik: informacja to nie fakt" i czyste zdanie bez przekreślenia', () => {
		const html = readFileSync(join(HERE, '..', 'index.html'), 'utf8');
		expect(HERO_PAGE_TITLE).toBe('Mylik: informacja to nie fakt');
		expect(html).toContain(`<title>${HERO_PAGE_TITLE}</title>`);
		expect(html).toContain(`<meta name="description" content="${HERO_SUBHEAD}" />`);
		stubLatest(0);
		render(<App />);
		expect(document.title).toBe(HERO_PAGE_TITLE);
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
			expect(item.poster).toMatch(/^\/postacie\/start\/.+\.webp$/);
		}
		const extra: ManifestEntry = { ...fromManifest[0], stan: 'nowy_klip', plik: 'postacie/start/nowy.mp4', plakat: 'postacie/start/nowy.png', petla: false };
		const extended = heroScenesFor([...fromManifest, extra]);
		expect(extended.map((item) => item.id)).toContain('start-nowy_klip');
		expect(extended[extended.length - 1]?.loop).toBe(true);
	});

	it('pierwszy ekran to sam plakat, a wideo dochodzi dopiero po nim', async () => {
		stubLatest(0);
		const { container } = render(<App />);
		const stage = container.querySelector('.hero__stage') as HTMLElement;
		expect(stage.getAttribute('data-mode')).toBe('poster');
		expect(container.querySelector('.hero video')).toBeNull();
		expect(container.querySelector('.hero img')?.getAttribute('src')).toBe(HERO_SCENES[0]?.poster);
		expect(screen.getByRole('button', { name: SCENE_TEXTS.skip })).toBeTruthy();
		await waitFor(() => expect(stage.getAttribute('data-mode')).toBe('video'));
		expect(container.querySelector('.hero video')).not.toBeNull();
	});

	it('scena otwierająca z manifestu jest domyślną sceną hero, a bez niej działają dotychczasowe klipy startowe', () => {
		const opening: ManifestEntry = {
			...entriesFor('start', 'scena_czekania')[0],
			rodzaj: 'scena_otwierajaca',
			stan: 'otwarcie',
			plik: 'postacie/start/scena__otwarcie_v5.mp4',
			plakat: 'postacie/start/scena__otwarcie_v5__plakat.png',
			petla: false,
		};
		const withOpening = heroScenesFor([opening]);
		expect(withOpening.map((item) => item.id)).toEqual(['start-otwarcie']);
		expect(withOpening[0]?.file).toBe('/postacie/start/scena__otwarcie_v5.mp4');
		expect(heroEntries().length).toBeGreaterThan(0);
		for (const entry of heroEntries()) expect(['scena_otwierajaca', 'scena_czekania']).toContain(entry.rodzaj);
	});

	it('domyślna scena hero to klip startowy "rozglada" z oceną 9 bez błędu pinezki, a sceny ról w niej nie grają', () => {
		expect(entriesFor('start', 'scena_otwierajaca')).toHaveLength(0);
		expect(HERO_SCENES.map((item) => item.id)).toEqual(['start-rozglada']);
		expect(HERO_SCENES[0]?.file).toBe('/postacie/start/scena__rozglada__petla.mp4');
		expect(HERO_SCENES[0]?.poster).toBe('/postacie/start/scena__rozglada__petla__plakat.webp');
		expect(HERO_SCENES[0]?.loop).toBe(true);
		for (const item of HERO_SCENES) expect(item.file).toMatch(/^\/postacie\/start\//);
	});

	it('odtwarza się po wejściu: wideo z plakatem, bez dźwięku, bez kontrolek', async () => {
		stubLatest(0);
		const { container } = render(<App />);
		await waitFor(() => expect(container.querySelector('.hero video')).not.toBeNull());
		const video = container.querySelector('.hero video') as HTMLVideoElement;
		expect(video.muted).toBe(true);
		expect(video.hasAttribute('playsinline')).toBe(true);
		expect(video.hasAttribute('controls')).toBe(false);
		expect(video.getAttribute('poster')).toMatch(/\.webp$/);
		expect(video.getAttribute('src')).toMatch(/\.mp4$/);
		expect(screen.getByRole('button', { name: SCENE_TEXTS.skip })).toBeTruthy();
		expect(container.querySelector('.hero [role="img"]')?.getAttribute('aria-label')).toBeTruthy();
	});

	it('po końcu klipu wchodzi następny, ostatni zostaje na ekranie', async () => {
		const scenes = [scene('pierwszy'), scene('drugi', { loop: true })];
		const { container } = render(<HeroStage scenes={scenes} />);
		await waitFor(() => expect(container.querySelector('video')).not.toBeNull());
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
		await waitFor(() => expect(container.querySelector('video')).not.toBeNull());
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

	it('"Pomiń animację" zatrzymuje tylko to odtwarzanie, a w tym samym miejscu jest "Odtwórz animację"', async () => {
		stubLatest(0);
		const { container } = render(<App />);
		await waitFor(() => expect(container.querySelector('.hero video')).not.toBeNull());
		const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
		const skip = screen.getByRole('button', { name: SCENE_TEXTS.skip });
		fireEvent.click(skip);
		await waitFor(() => expect(pause).toHaveBeenCalled());
		expect(container.querySelector('.hero video')).not.toBeNull();
		expect(screen.queryByRole('button', { name: SCENE_TEXTS.skip })).toBeNull();
		const replay = screen.getByRole('button', { name: SCENE_TEXTS.replay });
		expect(replay.parentElement).toBe(skip.parentElement);
		expect(window.localStorage.length).toBe(0);
		pause.mockRestore();
	});

	it('"Odtwórz animację" wznawia to samo odtwarzanie, bez zaczynania od nowa', async () => {
		const scenes = [scene('pierwszy'), scene('drugi')];
		const { container } = render(<HeroStage scenes={scenes} />);
		await waitFor(() => expect(container.querySelector('video')).not.toBeNull());
		fireEvent.ended(container.querySelector('video') as HTMLVideoElement);
		const video = container.querySelector('video') as HTMLVideoElement;
		expect(video.getAttribute('src')).toBe('/postacie/start/drugi.mp4');
		fireEvent.click(screen.getByRole('button', { name: SCENE_TEXTS.skip }));
		fireEvent.click(screen.getByRole('button', { name: SCENE_TEXTS.replay }));
		expect(container.querySelector('video')).toBe(video);
		expect(video.getAttribute('src')).toBe('/postacie/start/drugi.mp4');
		expect(screen.getByRole('button', { name: SCENE_TEXTS.skip })).toBeTruthy();
	});

	it('po naturalnym końcu ostatniej sceny "Odtwórz animację" uruchamia sekwencję od początku', async () => {
		const scenes = [scene('pierwszy'), scene('drugi')];
		const { container } = render(<HeroStage scenes={scenes} />);
		await waitFor(() => expect(container.querySelector('video')).not.toBeNull());
		fireEvent.ended(container.querySelector('video') as HTMLVideoElement);
		fireEvent.ended(container.querySelector('video') as HTMLVideoElement);
		fireEvent.click(screen.getByRole('button', { name: SCENE_TEXTS.replay }));
		expect(container.querySelector('video')?.getAttribute('src')).toBe('/postacie/start/pierwszy.mp4');
		expect(screen.getByRole('button', { name: SCENE_TEXTS.skip })).toBeTruthy();
	});

	it('domyślnie hero gra w pętli bez końca: zapętlony klip, brak przejścia do następnej sceny i przycisku "Odtwórz animację"', async () => {
		stubLatest(0);
		const { container } = render(<App />);
		await waitFor(() => expect(container.querySelector('.hero video')).not.toBeNull());
		const video = container.querySelector('.hero video') as HTMLVideoElement;
		expect(video.loop).toBe(true);
		expect(video.hasAttribute('loop')).toBe(true);
		const source = video.getAttribute('src');
		fireEvent.ended(video);
		expect(container.querySelector('.hero video')?.getAttribute('src')).toBe(source);
		expect(screen.queryByRole('button', { name: SCENE_TEXTS.replay })).toBeNull();
		expect(screen.getByRole('button', { name: SCENE_TEXTS.skip })).toBeTruthy();
	});

	it('klip pętli jest przygotowany bez skoku: manifest opisuje przenikanie końca w początek, a plik i plakat istnieją', () => {
		const entry = entriesFor('start', 'scena_czekania').find((item) => item.stan === 'rozglada') as ManifestEntry & { petla_bez_skoku?: string };
		expect(entry.petla).toBe(true);
		expect(entry.petla_bez_skoku).toMatch(/przenikają/);
		expect(entry.plik).toMatch(/__petla\.mp4$/);
		expect(statSync(join(HERE, '..', 'public', entry.plik)).size).toBeLessThan(1.5 * 1024 * 1024);
		expect(existsSync(join(HERE, '..', 'public', entry.plakat as string))).toBe(true);
	});

	it('"Pomiń animację" zatrzymuje pętlę na bieżącej klatce, a "Odtwórz animację" wznawia ten sam film bez przeładowania', async () => {
		stubLatest(0);
		const { container } = render(<App />);
		await waitFor(() => expect(container.querySelector('.hero video')).not.toBeNull());
		const video = container.querySelector('.hero video') as HTMLVideoElement;
		const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
		const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
		fireEvent.click(screen.getByRole('button', { name: SCENE_TEXTS.skip }));
		await waitFor(() => expect(pause).toHaveBeenCalledTimes(1));
		expect(container.querySelector('.hero video')).toBe(video);
		play.mockClear();
		fireEvent.click(screen.getByRole('button', { name: SCENE_TEXTS.replay }));
		await waitFor(() => expect(play).toHaveBeenCalled());
		expect(container.querySelector('.hero video')).toBe(video);
		expect(video.loop).toBe(true);
		expect(screen.getByRole('button', { name: SCENE_TEXTS.skip })).toBeTruthy();
		pause.mockRestore();
		play.mockRestore();
	});

	it('po naturalnym końcu sceny zostaje ostatnia klatka i "Odtwórz animację"', async () => {
		const { container } = render(<HeroStage scenes={[scene('jedyny')]} />);
		await waitFor(() => expect(container.querySelector('video')).not.toBeNull());
		fireEvent.ended(container.querySelector('video') as HTMLVideoElement);
		expect(container.querySelector('video')).not.toBeNull();
		expect(screen.getByRole('button', { name: SCENE_TEXTS.replay })).toBeTruthy();
	});

	it('pominięcie nie przechodzi na następne wejście na stronę główną: scena startuje od nowa', async () => {
		stubLatest(0);
		const first = render(<App />);
		await waitFor(() => expect(first.container.querySelector('.hero video')).not.toBeNull());
		fireEvent.click(screen.getByRole('button', { name: SCENE_TEXTS.skip }));
		first.unmount();
		const second = render(<App />);
		await waitFor(() => expect(second.container.querySelector('.hero video')).not.toBeNull());
		expect(screen.getByRole('button', { name: SCENE_TEXTS.skip })).toBeTruthy();
		expect(window.localStorage.getItem(LEGACY_SCENE_STORAGE_KEY)).toBeNull();
	});

	it('stary zapis wyboru z pamięci przeglądarki jest czyszczony przy starcie i nic nie wyłącza', async () => {
		window.localStorage.setItem(LEGACY_SCENE_STORAGE_KEY, '1');
		clearLegacySceneChoice();
		expect(window.localStorage.getItem(LEGACY_SCENE_STORAGE_KEY)).toBeNull();
		window.localStorage.setItem(LEGACY_SCENE_STORAGE_KEY, '1');
		stubLatest(0);
		const { container } = render(<App />);
		await waitFor(() => expect(container.querySelector('.hero video')).not.toBeNull());
	});

	it('ograniczenie ruchu: nieruchomy plakat z widocznym "Odtwórz animację", kliknięcie uruchamia scenę', async () => {
		stubReducedMotion(true);
		stubLatest(0);
		const { container } = render(<App />);
		expect(container.querySelector('.hero video')).toBeNull();
		const poster = container.querySelector('.hero img') as HTMLImageElement;
		expect(poster.getAttribute('src')).toBe((HERO_SCENES.find((item) => item.loop) ?? HERO_SCENES[0])?.poster);
		expect(poster.getAttribute('alt')).toBeTruthy();
		expect(screen.queryByRole('button', { name: SCENE_TEXTS.skip })).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: SCENE_TEXTS.replay }));
		await waitFor(() => expect(container.querySelector('.hero video')).not.toBeNull());
		expect(screen.getByRole('button', { name: SCENE_TEXTS.skip })).toBeTruthy();
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
		expect(container.querySelector('.hero .stage-slot--foreground')).not.toBeNull();
		const stage = container.querySelector('.character-stage') as HTMLElement;
		expect(stage.getAttribute('data-mode')).toBe('foreground');
		const video = stage.querySelector('video');
		if (video) {
			await act(async () => {
				fireEvent.playing(video);
			});
			expect(screen.getByRole('button', { name: SCENE_TEXTS.skip })).toBeTruthy();
		}
	});

	it('obraz wyniku ma 240-320 px na dużym ekranie i ok. 160 px na telefonie', () => {
		const css = readUnscaled(join(HERE, 'roles', 'roles.css'), 'utf8');
		const phone = css.match(/\n\.result-image \{[^}]*?\n\twidth:\s*(\d+)px/);
		expect(Number(phone?.[1])).toBe(160);
		const widths = [...css.matchAll(/\.record-claim > \.result-image \{[^}]*?\n\t\twidth:\s*(\d+)px/g)].map((match) => Number(match[1]));
		expect(widths.length).toBeGreaterThan(0);
		for (const width of widths) {
			expect(width).toBeGreaterThanOrEqual(240);
			expect(width).toBeLessThanOrEqual(320);
		}
		expect(css).toMatch(/\.stage \{[^}]*background:\s*#ffffff;/);
	});
});
