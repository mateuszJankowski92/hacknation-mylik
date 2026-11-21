import type { State, Verdict } from '../../../src/contracts/verdict';
import { STATES, VERDICTS } from '../../../src/contracts/verdict';
import { LIVE_ROLES } from '../../../src/roles/live-words';

export const ROLES = LIVE_ROLES;
export type Role = (typeof ROLES)[number];
export const DEFAULT_ROLE: Role = 'pogodynka';

export type ArtOwner = Role | 'start';
export type CharacterName = 'postac' | 'praca';
export type ResultKey = Verdict | State;
export type ArtName = CharacterName | ResultKey | 'wskazuje';

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

export const GESTURE_CAPTION = 'Wskazuję cytat ze źródła i jego datę.';

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
			brak_wystarczajacych_dowodow: { caption: 'Nie widać tego w źródłach.' },
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
	pilkarz: {
		name: 'Piłkarz',
		topic: 'piłka nożna',
		character: {
			postac: 'Piłkarz w grafitowym stroju stoi z piłką pod pachą.',
			praca: 'Piłkarz żongluje piłką i sprawdza wyniki.',
		},
		results: NO_RESULT_IMAGES,
	},
	konduktor: {
		name: 'Konduktor',
		topic: 'kolej i transport',
		character: {
			postac: 'Konduktor stoi na peronie z zegarkiem.',
			praca: 'Konduktor sprawdza rozkład jazdy.',
		},
		results: NO_RESULT_IMAGES,
	},
	listonosz: {
		name: 'Listonosz',
		topic: 'poczta i przesyłki',
		character: {
			postac: 'Listonosz niesie torbę z listami.',
			praca: 'Listonosz sortuje przesyłki przy skrzynce.',
		},
		results: NO_RESULT_IMAGES,
	},
	slusarz: {
		name: 'Strażnik zamków',
		topic: 'bezpieczeństwo i hasła',
		character: {
			postac: 'Strażnik zamków trzyma duży klucz.',
			praca: 'Strażnik zamków sprawdza zamek.',
		},
		results: NO_RESULT_IMAGES,
	},
	naukowiec: {
		name: 'Naukowiec',
		topic: 'nauka i badania',
		character: {
			postac: 'Naukowiec w fartuchu trzyma kolbę.',
			praca: 'Naukowiec zagląda do mikroskopu.',
		},
		results: NO_RESULT_IMAGES,
	},
	lesnik: {
		name: 'Leśnik',
		topic: 'las i przyroda',
		character: {
			postac: 'Leśnik stoi pod drzewem.',
			praca: 'Leśnik ogląda liść i grzyba.',
		},
		results: NO_RESULT_IMAGES,
	},
	nauczyciel: {
		name: 'Nauczyciel',
		topic: 'szkoła i edukacja',
		character: {
			postac: 'Nauczyciel trzyma książkę.',
			praca: 'Nauczyciel pisze na tablicy.',
		},
		results: NO_RESULT_IMAGES,
	},
	kucharz: {
		name: 'Kucharz',
		topic: 'jedzenie i gotowanie',
		character: {
			postac: 'Kucharz w czapce trzyma pokrywkę.',
			praca: 'Kucharz próbuje zupy.',
		},
		results: NO_RESULT_IMAGES,
	},
	kasjer: {
		name: 'Kasjer',
		topic: 'ceny i pieniądze',
		character: {
			postac: 'Kasjer stoi przy kasie.',
			praca: 'Kasjer liczy pieniądze.',
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

export function hasResultDictionary(role: Role): boolean {
	return RESULT_KEYS.some((key) => ROLE_SPECS[role].results[key] !== null);
}

export function usesGesture(role: Role, key: ResultKey, serious: boolean): boolean {
	if (!(VERDICTS as readonly string[]).includes(key)) return false;
	return serious || !hasResultDictionary(role);
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
