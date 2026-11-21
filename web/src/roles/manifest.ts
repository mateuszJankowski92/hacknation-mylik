import type { ArtName, ArtOwner, ResultKey } from './config';
import manifestData from './manifest.json';

export type ManifestKind = 'obraz_praca' | 'obraz_wyniku' | 'scena_czekania' | 'scena_wyniku';

export interface ManifestEntry {
	rola: string;
	rodzaj: ManifestKind;
	stan: string;
	plik: string;
	plik_lekki?: string;
	plakat: string | null;
	dlugosc_s: number | null;
	petla?: boolean;
	alt: string;
	tlo: string;
}

export const MANIFEST_BACKGROUND: string = manifestData.tlo;
export const MANIFEST_ENTRIES: readonly ManifestEntry[] = manifestData.pozycje as ManifestEntry[];

export const ASSET_DIRECTORY: Record<ArtOwner, string> = {
	start: 'start',
	pogodynka: 'pogodynka',
	bibliotekarka: 'bibliotekarka',
	sport: 'sport',
};

const START_STATE: Record<'postac' | 'praca', string> = {
	postac: 'spoczynek',
	praca: 'slucha',
};

const ROLE_WORK_STATE = 'praca';

const RESULT_STATE: Record<ResultKey, string> = {
	potwierdzone: 'slonce',
	wprowadzajace_w_blad: 'slonce_za_chmura',
	falszywe: 'deszcz',
	brak_wystarczajacych_dowodow: 'mgla',
	nie_podlega_weryfikacji: 'pusta_mapa',
	awaria_techniczna: 'zaklocenia',
	brak_mozliwosci_sprawdzenia: 'zaklocenia',
	potrzeba_doprecyzowania: '',
};

export function assetUrl(path: string): string {
	return `/${path.replace(/^\/+/, '')}`;
}

function findEntry(directory: string, kind: ManifestKind, state: string): ManifestEntry | null {
	if (!state) return null;
	return MANIFEST_ENTRIES.find((entry) => entry.rola === directory && entry.rodzaj === kind && entry.stan === state) ?? null;
}

export function entriesFor(directory: string, kind: ManifestKind): ManifestEntry[] {
	return MANIFEST_ENTRIES.filter((entry) => entry.rola === directory && entry.rodzaj === kind);
}

export function imageEntryFor(owner: ArtOwner, name: ArtName): ManifestEntry | null {
	const directory = ASSET_DIRECTORY[owner];
	if (name === 'postac' || name === 'praca') {
		const state = owner === 'start' ? START_STATE[name] : ROLE_WORK_STATE;
		return findEntry(directory, 'obraz_praca', state);
	}
	return findEntry(directory, 'obraz_wyniku', RESULT_STATE[name]);
}

export function imageUrlFor(owner: ArtOwner, name: ArtName): string | null {
	const entry = imageEntryFor(owner, name);
	if (!entry) return null;
	return assetUrl(entry.plik_lekki ?? entry.plik);
}

export function resultSceneFor(owner: ArtOwner, key: ResultKey): ManifestEntry | null {
	return findEntry(ASSET_DIRECTORY[owner], 'scena_wyniku', RESULT_STATE[key]);
}
