import type { ProgressStance, VerifyProgressEvent } from '../../../src/contracts/api';

export interface Pebble {
	id: number;
	publisher: string;
	stance: ProgressStance;
}

export interface ProgressState {
	claims: number | null;
	pebbles: Pebble[];
	forDone: number[];
	againstStarted: number[];
	againstDone: number[];
	foundForCount: number;
}

export const INITIAL_PROGRESS: ProgressState = {
	claims: null,
	pebbles: [],
	forDone: [],
	againstStarted: [],
	againstDone: [],
	foundForCount: 0,
};

function addUnique(list: number[], value: number): number[] {
	return list.includes(value) ? list : [...list, value];
}

export function reduceProgress(state: ProgressState, event: VerifyProgressEvent): ProgressState {
	switch (event.type) {
		case 'zgloszenie_przeczytane':
			return { ...state, claims: event.claims };
		case 'fragmenty_za':
			return {
				...state,
				forDone: addUnique(state.forDone, event.claim),
				foundForCount: state.foundForCount + event.count,
			};
		case 'szukanie_przeciw_start':
			return { ...state, againstStarted: addUnique(state.againstStarted, event.claim) };
		case 'szukanie_przeciw_koniec':
			return { ...state, againstDone: addUnique(state.againstDone, event.claim) };
		case 'fragment_oceniony':
			return {
				...state,
				pebbles: [
					...state.pebbles,
					{ id: state.pebbles.length, publisher: event.publisher, stance: event.stance },
				],
			};
		case 'gotowe':
			return state;
	}
}

export function pebblesFor(state: ProgressState, stance: ProgressStance): Pebble[] {
	return state.pebbles.filter((pebble) => pebble.stance === stance);
}

function allClaimsIn(done: number[], claims: number | null): boolean {
	return claims !== null && claims > 0 && done.length >= claims;
}

export function forSearchFinished(state: ProgressState): boolean {
	return allClaimsIn(state.forDone, state.claims);
}

export function againstSearchFinished(state: ProgressState): boolean {
	return allClaimsIn(state.againstDone, state.claims);
}

export function sourcesWord(count: number): string {
	if (count === 1) return '1 źródło';
	const lastTwo = count % 100;
	const last = count % 10;
	if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return `${count} źródła`;
	return `${count} źródeł`;
}

export function describeProgress(state: ProgressState): string {
	if (state.claims === null) return 'Czytam Twoje zgłoszenie.';
	if (state.claims === 0) return 'Nie widzę w zgłoszeniu nic do sprawdzenia.';
	const same = pebblesFor(state, 'to_samo').length;
	const other = pebblesFor(state, 'co_innego').length;
	const looksElsewhere = pebblesFor(state, 'inna_data_lub_miejsce').length;
	const background = pebblesFor(state, 'tlo').length;
	const judged = state.pebbles.length;

	if (!forSearchFinished(state)) return 'Przeczytałem zgłoszenie. Szukam źródeł, które mówią to samo.';

	const found = judged === 0 ? 'Na razie nic nie znalazłem.' : `Znalazłem ${sourcesWord(judged)}.`;
	if (!againstSearchFinished(state)) {
		if (judged === 0) return 'Na razie nic nie znalazłem. Szukam jeszcze takich, które mówią co innego.';
		return `${found} Szukam jeszcze takich, które mówią co innego.`;
	}

	if (judged === 0) return 'Nic nie znalazłem. Składam odpowiedź.';
	const extras: string[] = [];
	if (looksElsewhere > 0) extras.push(`Inna data lub miejsce: ${looksElsewhere}.`);
	if (background > 0) extras.push(`Tylko tło: ${background}.`);
	const tail = extras.length > 0 ? ` ${extras.join(' ')}` : '';
	return `${found} Mówią to samo: ${same}. Mówią co innego: ${other}.${tail} Składam odpowiedź.`;
}
