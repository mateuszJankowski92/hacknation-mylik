// @vitest-environment jsdom
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HERO_SCENES, SCENES, SCENE_TEXTS, sceneFromEntry } from '../scenes/config';
import { stubReducedMotion } from '../testing/motion';
import { RESULT_KEYS, ROLES, type ResultKey, type Role } from './config';
import {
	ASSET_DIRECTORY,
	MANIFEST_BACKGROUND,
	MANIFEST_ENTRIES,
	assetUrl,
	entriesFor,
	imageUrlFor,
	resultSceneFor,
	type ManifestEntry,
} from './manifest';
import { ResultImage } from './ResultImage';

const PUBLIC_DIRECTORY = resolve(__dirname, '../../public');
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const MIN_LIVE_RATING = 8;
const ROLES_WITHOUT_CLIP: readonly Role[] = ['naukowiec', 'slusarz'];

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

function publicFile(path: string): string {
	return resolve(PUBLIC_DIRECTORY, path);
}

describe('manifest ilustracji', () => {
	it('tło jest białe, a każdy użyty plik istnieje w web/public', () => {
		expect(MANIFEST_BACKGROUND).toBe('#FFFFFF');
		let total = 0;
		for (const entry of MANIFEST_ENTRIES) {
			expect(entry.tlo).toBe('#FFFFFF');
			expect(entry.alt.length).toBeGreaterThan(5);
			const files = entry.rodzaj.startsWith('scena') ? [entry.plik, entry.plakat] : [entry.plik_lekki];
			for (const file of files) {
				expect(file, entry.stan).toBeTruthy();
				const path = publicFile(file!);
				expect(existsSync(path), file!).toBe(true);
				total += statSync(path).size;
			}
		}
		expect(total).toBeLessThan(MAX_TOTAL_BYTES);
	});

	it('klipy mają do 1,5 MB, a obrazy to lekkie pliki webp', () => {
		for (const entry of MANIFEST_ENTRIES) {
			if (entry.rodzaj.startsWith('scena')) {
				expect(statSync(publicFile(entry.plik)).size).toBeLessThan(1.5 * 1024 * 1024);
				expect(entry.plik.endsWith('.mp4')).toBe(true);
			} else {
				expect(entry.plik_lekki?.endsWith('.webp')).toBe(true);
			}
		}
	});

	it('pogodynka ma pięć obrazów wyniku z oceną co najmniej 8, a zakłócenia (ocena 6) nie ma obrazu', () => {
		const expected: Partial<Record<ResultKey, string>> = {
			potwierdzone: 'slonce',
			wprowadzajace_w_blad: 'slonce_za_chmura',
			falszywe: 'deszcz',
			brak_wystarczajacych_dowodow: 'mgla',
			nie_podlega_weryfikacji: 'pusta_mapa',
		};
		expect(entriesFor('pogodynka', 'obraz_wyniku')).toHaveLength(5);
		for (const [key, state] of Object.entries(expected)) {
			expect(imageUrlFor('pogodynka', key as ResultKey)).toBe(`/postacie/pogodynka/wynik__${state}.webp`);
		}
		for (const key of ['awaria_techniczna', 'brak_mozliwosci_sprawdzenia', 'potrzeba_doprecyzowania'] as const) {
			expect(imageUrlFor('pogodynka', key)).toBeNull();
		}
	});

	it('bibliotekarka i sport nie mają obrazów wyniku, a start ma dwa obrazy postaci', () => {
		for (const role of ['bibliotekarka', 'sport'] as const) {
			for (const key of RESULT_KEYS) expect(imageUrlFor(role, key)).toBeNull();
			expect(imageUrlFor(role, 'praca')).toBe(`/postacie/${ASSET_DIRECTORY[role]}/praca__praca.webp`);
		}
		expect(imageUrlFor('start', 'postac')).toBe('/postacie/start/praca__spoczynek.webp');
		expect(imageUrlFor('start', 'praca')).toBe('/postacie/start/praca__slucha.webp');
	});

	it('obie role sportowe mają własne katalogi: komentator w sport, piłkarz w sport_pilkarz', () => {
		expect(ASSET_DIRECTORY.sport).toBe('sport');
		expect(ASSET_DIRECTORY.pilkarz).toBe('sport_pilkarz');
		expect(entriesFor('sport_pilkarz', 'scena_czekania').length).toBeGreaterThan(0);
		expect(entriesFor('sport_pilkarz', 'obraz_praca')).toHaveLength(1);
		expect(imageUrlFor('pilkarz', 'praca')).toBe('/postacie/sport_pilkarz/praca__praca.webp');
	});

	it('każda rola na żywo ma obraz pracy, a sceny czekania z plikami w web/public mają wszystkie role poza naukowcem i strażnikiem zamków', () => {
		expect(ROLES).toHaveLength(12);
		for (const role of ROLES) {
			const directory = ASSET_DIRECTORY[role];
			expect(imageUrlFor(role, 'praca'), role).toBe(`/postacie/${directory}/praca__praca.webp`);
			const scenes = entriesFor(directory, 'scena_czekania');
			if (ROLES_WITHOUT_CLIP.includes(role)) {
				expect(scenes, role).toHaveLength(0);
				continue;
			}
			expect(scenes.length, role).toBeGreaterThanOrEqual(1);
			for (const scene of scenes) {
				expect(existsSync(publicFile(scene.plik)), scene.plik).toBe(true);
				expect(existsSync(publicFile(scene.plakat!)), scene.plakat!).toBe(true);
			}
		}
	});

	it('role ze scenami czekania mają plik, plakat, długość i opis z manifestu, a role bez klipu same nieruchome sceny bez pliku', () => {
		for (const role of ROLES) {
			expect(SCENES[role].length).toBeGreaterThanOrEqual(1);
			if (ROLES_WITHOUT_CLIP.includes(role)) {
				for (const scene of SCENES[role]) {
					expect(scene.file, role).toBeNull();
					expect(scene.poster, role).toBeNull();
				}
				continue;
			}
			for (const scene of SCENES[role]) {
				expect(scene.file).toMatch(/^\/postacie\/.+\.mp4$/);
				expect(scene.poster).toMatch(/^\/postacie\/.+\.webp$/);
				expect(scene.durationSec).toBeGreaterThan(3);
				expect(scene.alt.length).toBeGreaterThan(5);
			}
		}
		const entry = entriesFor('start', 'scena_czekania')[0]!;
		expect(sceneFromEntry(entry).file).toBe(assetUrl(entry.plik));
	});

	it('sceny wyniku ma pogodynka tylko dla deszczu, przejaśnień i mgły, a inne role ich nie mają', () => {
		const withScene = RESULT_KEYS.filter((key) => resultSceneFor('pogodynka', key));
		expect(withScene.sort()).toEqual(['brak_wystarczajacych_dowodow', 'falszywe', 'wprowadzajace_w_blad'].sort());
		expect(entriesFor('pogodynka', 'scena_wyniku').map((entry) => entry.stan).sort()).toEqual(['deszcz', 'mgla', 'slonce_za_chmura']);
		for (const key of ['potwierdzone', 'nie_podlega_weryfikacji', 'awaria_techniczna', 'brak_mozliwosci_sprawdzenia', 'potrzeba_doprecyzowania'] as const) {
			expect(resultSceneFor('pogodynka', key), key).toBeNull();
		}
		expect(resultSceneFor('sport', 'potwierdzone')).toBeNull();
	});

	it('hero nie ma sceny otwierającej: gra klip startowy "rozglada" w pętli, a "kiwa" jest drugim z oceną 9', () => {
		expect(entriesFor('start', 'scena_otwierajaca')).toHaveLength(0);
		expect(entriesFor('start', 'scena_czekania').map((entry) => entry.stan).sort()).toEqual(['kiwa', 'rozglada']);
		expect(HERO_SCENES.map((scene) => scene.id)).toEqual(['start-rozglada']);
		expect(HERO_SCENES[0]?.loop).toBe(true);
	});
});

describe('dobór zasobów według ocen właściciela', () => {
	const RETIRED_CLIPS = [
		'pogodynka/scena_wyniku/slonce',
		'pogodynka/scena_wyniku/zaklocenia',
		'pogodynka/scena_wyniku/pusta_mapa',
		'pogodynka/scena_czekania/notuje',
		'start/scena_otwierajaca/otwarcie',
		'start/scena_czekania/slucha',
		'bibliotekarka/scena_czekania/sowy',
		'bibliotekarka/scena_czekania/sowy2',
		'bibliotekarka/scena_czekania/stos',
		'slusarz/scena_czekania/klucz',
		'slusarz/scena_czekania/kciuk',
		'lesnik/scena_czekania/drzewo',
	];

	function keyOf(entry: ManifestEntry): string {
		return `${entry.rola}/${entry.rodzaj}/${entry.stan}`;
	}

	it('na żywo tylko oceny od 8, a pozycje bez oceny mają znacznik "bez oceny właściciela"', () => {
		for (const entry of MANIFEST_ENTRIES) {
			if (entry.bez_oceny_wlasciciela) {
				expect(entry.ocena, keyOf(entry)).toBeNull();
				continue;
			}
			expect(entry.ocena, keyOf(entry)).toBeGreaterThanOrEqual(MIN_LIVE_RATING);
		}
	});

	it('bez oceny zostają tylko obrazy ról, które nie mają obrazu z oceną, i żaden klip', () => {
		const unrated = MANIFEST_ENTRIES.filter((entry) => entry.bez_oceny_wlasciciela).map(keyOf).sort();
		expect(unrated).toEqual(
			[
				'bibliotekarka/obraz_praca/praca',
				'kasjer/obraz_praca/praca',
				'sport/obraz_praca/praca',
				'sport/obraz_praca/wskazuje',
				'sport_pilkarz/obraz_praca/praca',
				'start/obraz_praca/slucha',
				'start/obraz_praca/spoczynek',
			].sort(),
		);
		for (const entry of MANIFEST_ENTRIES) {
			if (entry.rodzaj.startsWith('scena')) expect(entry.bez_oceny_wlasciciela, keyOf(entry)).toBeUndefined();
		}
	});

	it('wycofane klipy i obrazy z oceną do 6 nie trafiają do manifestu ani do web/public', () => {
		const keys = new Set(MANIFEST_ENTRIES.map(keyOf));
		for (const retired of RETIRED_CLIPS) expect(keys.has(retired), retired).toBe(false);
		expect(keys.has('pogodynka/obraz_wyniku/zaklocenia')).toBe(false);
		for (const file of [
			'postacie/pogodynka/scena_wyniku__slonce.mp4',
			'postacie/pogodynka/scena_wyniku__zaklocenia.mp4',
			'postacie/pogodynka/wynik__zaklocenia.webp',
			'postacie/start/scena__otwarcie_v5.mp4',
			'postacie/start/scena__slucha.mp4',
			'postacie/bibliotekarka/scena__sowy2.mp4',
			'postacie/slusarz/scena__klucz.mp4',
			'postacie/lesnik/scena__drzewo.mp4',
		]) {
			expect(existsSync(publicFile(file)), file).toBe(false);
		}
	});

	it('strażnik zamków i naukowiec nie mają klipu, tylko nieruchomy obraz roli', () => {
		for (const role of ROLES_WITHOUT_CLIP) {
			expect(entriesFor(ASSET_DIRECTORY[role], 'scena_czekania')).toHaveLength(0);
			expect(imageUrlFor(role, 'praca')).toBe(`/postacie/${ASSET_DIRECTORY[role]}/praca__praca.webp`);
		}
	});

	it('pogodynek ma pięć klipów czekania, a pozostałe role po 1-2 klipy z listy właściciela', () => {
		const states = (directory: string) => entriesFor(directory, 'scena_czekania').map((entry) => entry.stan).sort();
		expect(states('pogodynka')).toEqual(['patrzy', 'prezentuje', 'przesuwa', 'wskaznik', 'wskazuje']);
		expect(states('bibliotekarka')).toEqual(['niesie']);
		expect(states('sport')).toEqual(['mowi', 'notatki']);
		expect(states('sport_pilkarz')).toEqual(['sznurowka']);
		expect(states('konduktor')).toEqual(['macha', 'sygnal']);
		expect(states('listonosz')).toEqual(['spaceruje']);
		expect(states('lesnik')).toEqual(['jez']);
		expect(states('nauczyciel')).toEqual(['ksiazka', 'pisze']);
		expect(states('kasjer')).toEqual(['liczy', 'skarbonka']);
		expect(states('kucharz')).toEqual(['pokrywka', 'probuje']);
	});
});

describe('obraz wyniku z klipem', () => {
	it('po pierwszym ekranie dokłada wyciszony klip nad nieruchomym obrazem', async () => {
		const { container } = render(<ResultImage role="pogodynka" resultKey="falszywe" />);
		await waitFor(() => expect(container.querySelector('video')).not.toBeNull());
		const video = container.querySelector('video')!;
		expect(video.muted).toBe(true);
		expect(video.getAttribute('src')).toBe('/postacie/pogodynka/scena_wyniku__deszcz.mp4');
		expect(video.getAttribute('aria-hidden')).toBe('true');
		expect(container.querySelector('figcaption')?.textContent).toBe('Źródła mówią co innego.');
		expect(container.querySelector('.result-image__art')).not.toBeNull();
	});

	it('klip mają tylko deszcz, przejaśnienia i mgła, pozostałe obrazy wyniku zostają nieruchome, a stan bez obrazu nie rysuje nic', async () => {
		const withClip = ['brak_wystarczajacych_dowodow', 'falszywe', 'wprowadzajace_w_blad'];
		for (const key of RESULT_KEYS) {
			const { container, unmount } = render(<ResultImage role="pogodynka" resultKey={key} />);
			if (key === 'potrzeba_doprecyzowania') {
				expect(container.querySelector('figure')).toBeNull();
			} else if (withClip.includes(key)) {
				await waitFor(() => expect(container.querySelector('video')).not.toBeNull());
				expect(container.querySelector('.result-image__art')).not.toBeNull();
			} else {
				await new Promise((done) => setTimeout(done, 20));
				expect(container.querySelector('video'), key).toBeNull();
				expect(container.querySelector('.result-image__control'), key).toBeNull();
				expect(container.querySelector('.result-image__art'), key).not.toBeNull();
				expect(container.querySelector('figcaption')?.textContent?.length, key).toBeGreaterThan(5);
			}
			unmount();
		}
	});

	it('wynik bez dobrego obrazu i klipu (zakłócenia) pokazuje nieruchomy obraz roli bez błędu', async () => {
		vi.stubGlobal(
			'Image',
			class {
				onload: (() => void) | null = null;
				set src(_value: string) {
					queueMicrotask(() => this.onload?.());
				}
			},
		);
		for (const key of ['awaria_techniczna', 'brak_mozliwosci_sprawdzenia'] as const) {
			const { container, unmount } = render(<ResultImage role="pogodynka" resultKey={key} />);
			await waitFor(() => expect(container.querySelector('img.result-image__art')).not.toBeNull());
			expect(container.querySelector('img.result-image__art')?.getAttribute('src')).toBe('/postacie/pogodynka/praca__praca.webp');
			expect(container.querySelector('video')).toBeNull();
			expect(container.querySelector('figcaption')?.textContent).toBe('Spróbuj ponownie.');
			unmount();
		}
	});

	it('ograniczenie ruchu zostawia nieruchomy obraz z "Odtwórz animację", a kliknięcie ją uruchamia', async () => {
		stubReducedMotion(true);
		const { container } = render(<ResultImage role="pogodynka" resultKey="falszywe" />);
		await new Promise((done) => setTimeout(done, 20));
		expect(container.querySelector('video')).toBeNull();
		expect(container.querySelector('.result-image__art')).not.toBeNull();
		fireEvent.click(screen.getByRole('button', { name: `${SCENE_TEXTS.replay} obrazu wyniku` }));
		await waitFor(() => expect(container.querySelector('video')).not.toBeNull());
		expect(screen.getByRole('button', { name: `${SCENE_TEXTS.skip} obrazu wyniku` })).toBeTruthy();
	});

	it('"Pomiń animację" zatrzymuje klip w miejscu, a "Odtwórz animację" uruchamia go od nowa bez zapisu wyboru', async () => {
		const { container } = render(<ResultImage role="pogodynka" resultKey="falszywe" />);
		await waitFor(() => expect(container.querySelector('video')).not.toBeNull());
		const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
		fireEvent.click(screen.getByRole('button', { name: `${SCENE_TEXTS.skip} obrazu wyniku` }));
		await waitFor(() => expect(pause).toHaveBeenCalled());
		expect(container.querySelector('video')).not.toBeNull();
		expect(window.localStorage.length).toBe(0);
		const before = container.querySelector('video');
		fireEvent.click(screen.getByRole('button', { name: `${SCENE_TEXTS.replay} obrazu wyniku` }));
		await waitFor(() => expect(container.querySelector('video')).not.toBe(before));
		expect(screen.getByRole('button', { name: `${SCENE_TEXTS.skip} obrazu wyniku` })).toBeTruthy();
		pause.mockRestore();
	});

	it('błąd klipu chowa go i zostaje obraz', async () => {
		const { container } = render(<ResultImage role="pogodynka" resultKey="falszywe" />);
		await waitFor(() => expect(container.querySelector('video')).not.toBeNull());
		container.querySelector('video')!.dispatchEvent(new Event('error'));
		await waitFor(() => expect(container.querySelector('video')).toBeNull());
		expect(container.querySelector('.result-image__art')).not.toBeNull();
	});
});
