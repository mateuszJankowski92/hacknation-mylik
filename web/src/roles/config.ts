import type { State, Verdict } from '../../../src/contracts/verdict';
import { STATES, VERDICTS } from '../../../src/contracts/verdict';

export const ROLES = ['pogodynka', 'bibliotekarka', 'sport'] as const;
export type Role = (typeof ROLES)[number];
export const DEFAULT_ROLE: Role = 'pogodynka';

export type ArtOwner = Role | 'start';
export type CharacterName = 'postac' | 'praca';
export type ResultKey = Verdict | State;
export type ArtName = CharacterName | ResultKey;

export const RESULT_KEYS: readonly ResultKey[] = [...VERDICTS, ...STATES];

export const ART_BASE_PATH = '/postacie';
export const ART_EXTENSIONS = ['webp', 'png', 'svg'] as const;

export interface ResultImageSpec {
	caption: string;
}

export interface RoleSpec {
	name: string;
	topic: string;
	character: Record<CharacterName, string>;
	results: Record<ResultKey, ResultImageSpec | null>;
}

const NO_RESULT_IMAGES: Record<ResultKey, null> = {
	potwierdzone: null,
	falszywe: null,
	wprowadzajace_w_blad: null,
	brak_wystarczajacych_dowodow: null,
	nie_podlega_weryfikacji: null,
	awaria_techniczna: null,
	brak_mozliwosci_sprawdzenia: null,
	potrzeba_doprecyzowania: null,
};

export const START_CHARACTER_ALT = 'Postać z papieru ze złożoną mapą czeka na wiadomość.';

export const ROLE_SPECS: Record<Role, RoleSpec> = {
	pogodynka: {
		name: 'Pogodynek',
		topic: 'różne tematy',
		character: {
			postac: 'Pogodynek stoi przy mapie z chmurką i słońcem.',
			praca: 'Pogodynek sprawdza mapę i notatki.',
		},
		results: {
			potwierdzone: { caption: 'Źródła mówią to samo.' },
			wprowadzajace_w_blad: { caption: 'Zgadza się tylko część.' },
			falszywe: { caption: 'Źródła mówią co innego.' },
			brak_wystarczajacych_dowodow: { caption: 'Nie widać. Nie wiem.' },
			nie_podlega_weryfikacji: { caption: 'Tego nie da się sprawdzić w źródłach.' },
			awaria_techniczna: { caption: 'Spróbuj ponownie.' },
			brak_mozliwosci_sprawdzenia: { caption: 'Spróbuj ponownie.' },
			potrzeba_doprecyzowania: null,
		},
	},
	bibliotekarka: {
		name: 'Bibliotekarz',
		topic: 'przepisy i prawa obywatela',
		character: {
			postac: 'Bibliotekarz trzyma otwartą książkę.',
			praca: 'Bibliotekarz szuka w książkach na regale.',
		},
		results: NO_RESULT_IMAGES,
	},
	sport: {
		name: 'Komentator sportowy',
		topic: 'sport i rozrywka',
		character: {
			postac: 'Komentator sportowy mówi do mikrofonu.',
			praca: 'Komentator sportowy przegląda wyniki meczów.',
		},
		results: NO_RESULT_IMAGES,
	},
};

export function isRole(value: unknown): value is Role {
	return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function resultImageFor(role: Role, key: ResultKey): ResultImageSpec | null {
	return ROLE_SPECS[role].results[key];
}

export function artAlt(owner: ArtOwner, name: CharacterName): string {
	return owner === 'start' ? START_CHARACTER_ALT : ROLE_SPECS[owner].character[name];
}

export function artCandidates(owner: ArtOwner, name: ArtName): string[] {
	return ART_EXTENSIONS.map((extension) => `${ART_BASE_PATH}/${owner}/${name}.${extension}`);
}

export const TOPIC_VIEW_TEXT = 'Widok dopasowany do tematu';

export function topicNote(role: Role): string | null {
	return role === DEFAULT_ROLE ? null : `${TOPIC_VIEW_TEXT}: ${ROLE_SPECS[role].topic}.`;
}
