import { ROLES, ROLE_SPECS, type Role } from '../roles/config';
import { assetUrl, entriesFor, ASSET_DIRECTORY, type ManifestEntry } from '../roles/manifest';

export interface SceneSpec {
	id: string;
	file: string | null;
	poster: string | null;
	durationSec: number;
	alt: string;
	loop?: boolean;
}

export const SCENE_BASE_PATH = '/postacie';
export const SCENE_START_TIMEOUT_MS = 3000;

export const SCENE_TEXTS = {
	skip: 'Pomiń animację',
	replay: 'Odtwórz animację',
	marksLabel: 'Tyle źródeł znalazłem do tej pory',
} as const;

export function sceneFilePath(role: Role, name: string, extension: 'mp4' | 'webm' | 'webp' | 'png'): string {
	return `${SCENE_BASE_PATH}/${role}/sceny/${name}.${extension}`;
}

const PLACEHOLDER_ALTS: Partial<Record<Role, string[]>> = {
	pogodynka: [
		'Pogodynek przesuwa palec po mapie i sprawdza, co mówią źródła.',
		'Pogodynek przegląda kartki z notatkami przy mapie.',
		'Pogodynek porównuje dwie mapy.',
	],
	bibliotekarka: [
		'Bibliotekarz przegląda książki na regale.',
		'Bibliotekarz kartkuje grubą księgę.',
		'Bibliotekarz niesie stos książek do stołu.',
	],
	sport: [
		'Komentator sportowy przegląda wyniki meczów.',
		'Komentator sportowy sprawdza tabelę wyników.',
		'Komentator sportowy sprawdza notatki przy mikrofonie.',
	],
};

const PLACEHOLDER_DURATIONS = [6, 7, 8];

function placeholderScenes(role: Role): SceneSpec[] {
	const alts = PLACEHOLDER_ALTS[role] ?? [`${ROLE_SPECS[role].name} sprawdza źródła.`];
	return alts.map((alt, index) => ({
		id: `${role}-${index + 1}`,
		file: null,
		poster: null,
		durationSec: PLACEHOLDER_DURATIONS[index] ?? 6,
		alt,
	}));
}

export function sceneFromEntry(entry: ManifestEntry): SceneSpec {
	return {
		id: `${entry.rola}-${entry.stan}`,
		file: assetUrl(entry.plik),
		poster: entry.plakat ? assetUrl(entry.plakat) : null,
		durationSec: entry.dlugosc_s ?? 6,
		alt: entry.alt,
		loop: entry.petla === true,
	};
}

function manifestScenes(role: Role): SceneSpec[] {
	const scenes = entriesFor(ASSET_DIRECTORY[role], 'scena_czekania').map(sceneFromEntry);
	return scenes.length > 0 ? scenes : placeholderScenes(role);
}

export const SCENES = Object.fromEntries(ROLES.map((role) => [role, manifestScenes(role)])) as Record<Role, SceneSpec[]>;

export function pickScene(role: Role, random: () => number = Math.random): SceneSpec {
	const variants = SCENES[role];
	const index = Math.min(variants.length - 1, Math.floor(random() * variants.length));
	return variants[index]!;
}

export function heroSequence(scenes: SceneSpec[]): SceneSpec[] {
	const loopingScene = scenes.find((scene) => scene.loop);
	const playedOnce = scenes.filter((scene) => !scene.loop);
	return loopingScene ? [...playedOnce, loopingScene] : playedOnce;
}

export function heroScenesFor(entries: ManifestEntry[]): SceneSpec[] {
	return heroSequence(entries.map(sceneFromEntry));
}

export function heroEntries(): ManifestEntry[] {
	const opening = entriesFor(ASSET_DIRECTORY.start, 'scena_otwierajaca');
	return opening.length > 0 ? opening : entriesFor(ASSET_DIRECTORY.start, 'scena_czekania');
}

export const HERO_SCENES: SceneSpec[] = heroScenesFor(heroEntries());
