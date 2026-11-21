// @vitest-environment jsdom
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SCENES, sceneFromEntry } from '../scenes/config';
import { writeSceneSkipped } from '../scenes/preferences';
import { RESULT_KEYS, ROLES, type ResultKey } from './config';
import {
	ASSET_DIRECTORY,
	MANIFEST_BACKGROUND,
	MANIFEST_ENTRIES,
	assetUrl,
	entriesFor,
	imageUrlFor,
	resultSceneFor,
} from './manifest';
import { ResultImage } from './ResultImage';

const PUBLIC_DIRECTORY = resolve(__dirname, '../../public');
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

afterEach(() => {
	cleanup();
	writeSceneSkipped(false);
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

	it('pogodynka ma sześć obrazów wyniku wg zatwierdzonej tabeli', () => {
		const expected: Partial<Record<ResultKey, string>> = {
			potwierdzone: 'slonce',
			wprowadzajace_w_blad: 'slonce_za_chmura',
			falszywe: 'deszcz',
			brak_wystarczajacych_dowodow: 'mgla',
			nie_podlega_weryfikacji: 'pusta_mapa',
			awaria_techniczna: 'zaklocenia',
			brak_mozliwosci_sprawdzenia: 'zaklocenia',
		};
		expect(entriesFor('pogodynka', 'obraz_wyniku')).toHaveLength(6);
		for (const [key, state] of Object.entries(expected)) {
			expect(imageUrlFor('pogodynka', key as ResultKey)).toBe(`/postacie/pogodynka/wynik__${state}.webp`);
		}
		expect(imageUrlFor('pogodynka', 'potrzeba_doprecyzowania')).toBeNull();
	});

	it('bibliotekarka i sport nie mają obrazów wyniku, a start ma dwa obrazy postaci', () => {
		for (const role of ['bibliotekarka', 'sport'] as const) {
			for (const key of RESULT_KEYS) expect(imageUrlFor(role, key)).toBeNull();
			expect(imageUrlFor(role, 'praca')).toBe(`/postacie/${ASSET_DIRECTORY[role]}/praca__praca.webp`);
		}
		expect(imageUrlFor('start', 'postac')).toBe('/postacie/start/praca__spoczynek.webp');
		expect(imageUrlFor('start', 'praca')).toBe('/postacie/start/praca__slucha.webp');
	});

	it('podmiana roli sportowej na piłkarza to zmiana jednej wartości, a katalog piłkarza jest w paczce', () => {
		expect(ASSET_DIRECTORY.sport).toBe('sport');
		expect(entriesFor('sport_pilkarz', 'scena_czekania').length).toBeGreaterThan(0);
		expect(entriesFor('sport_pilkarz', 'obraz_praca')).toHaveLength(1);
	});

	it('każda rola ma sceny czekania z pliku, plakatu, długości i opisu z manifestu', () => {
		for (const role of ROLES) {
			expect(SCENES[role].length).toBeGreaterThanOrEqual(1);
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

	it('sceny wyniku ma każdy obraz wyniku pogodynki, a inne role ich nie mają', () => {
		const withScene = RESULT_KEYS.filter((key) => resultSceneFor('pogodynka', key));
		expect(withScene.sort()).toEqual(
			[
				'awaria_techniczna',
				'brak_mozliwosci_sprawdzenia',
				'brak_wystarczajacych_dowodow',
				'falszywe',
				'nie_podlega_weryfikacji',
				'potwierdzone',
				'wprowadzajace_w_blad',
			].sort(),
		);
		expect(entriesFor('pogodynka', 'scena_wyniku')).toHaveLength(6);
		expect(resultSceneFor('pogodynka', 'potrzeba_doprecyzowania')).toBeNull();
		expect(resultSceneFor('sport', 'potwierdzone')).toBeNull();
	});

	it('scena otwierająca roli startowej to jeden klip bez pętli, z plakatem webp', () => {
		const opening = entriesFor('start', 'scena_otwierajaca');
		expect(opening).toHaveLength(1);
		expect(opening[0]?.plik).toBe('postacie/start/scena__otwarcie.mp4');
		expect(opening[0]?.plakat).toBe('postacie/start/scena__otwarcie__plakat.webp');
		expect(opening[0]?.petla).toBe(false);
		expect(opening[0]?.dlugosc_s).toBeGreaterThanOrEqual(8);
		expect(opening[0]?.dlugosc_s).toBeLessThanOrEqual(12);
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

	it('każdy obraz wyniku pogodynki ma klip, a stan bez obrazu nie rysuje nic', async () => {
		for (const key of RESULT_KEYS) {
			const { container, unmount } = render(<ResultImage role="pogodynka" resultKey={key} />);
			if (key === 'potrzeba_doprecyzowania') {
				expect(container.querySelector('figure')).toBeNull();
			} else {
				await waitFor(() => expect(container.querySelector('video')).not.toBeNull());
				expect(container.querySelector('.result-image__art')).not.toBeNull();
			}
			unmount();
		}
	});

	it('pominięcie animacji zostawia sam nieruchomy obraz', async () => {
		writeSceneSkipped(true);
		const { container } = render(<ResultImage role="pogodynka" resultKey="falszywe" />);
		await new Promise((done) => setTimeout(done, 20));
		expect(container.querySelector('video')).toBeNull();
		expect(container.querySelector('.result-image__art')).not.toBeNull();
	});

	it('błąd klipu chowa go i zostaje obraz', async () => {
		const { container } = render(<ResultImage role="pogodynka" resultKey="potwierdzone" />);
		await waitFor(() => expect(container.querySelector('video')).not.toBeNull());
		container.querySelector('video')!.dispatchEvent(new Event('error'));
		await waitFor(() => expect(container.querySelector('video')).toBeNull());
		expect(container.querySelector('.result-image__art')).not.toBeNull();
	});
});
