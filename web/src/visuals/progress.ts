import { z } from 'zod';
import type { ProgressStance, VerifyProgressEvent } from '../../../src/contracts/api';

export const ExtraProgressEventSchema = z.object({
	type: z.literal('druga_kontrola'),
	agreed: z.number().int().nonnegative().optional(),
	total: z.number().int().nonnegative().optional(),
	checked: z.number().int().nonnegative().optional(),
});
export type ExtraProgressEvent = z.infer<typeof ExtraProgressEventSchema>;
export type WaitingEvent = VerifyProgressEvent | ExtraProgressEvent;

export interface Pebble {
	id: number;
	publisher: string;
	stance: ProgressStance;
}

export interface SecondCheck {
	agreed: number | null;
	total: number | null;
}

export interface ProgressState {
	claims: number | null;
	pebbles: Pebble[];
	forDone: number[];
	againstStarted: number[];
	againstDone: number[];
	foundForCount: number;
	candidates: Record<number, number>;
	judgedClaims: number[];
	secondCheck: SecondCheck | null;
	finished: boolean;
}

export const INITIAL_PROGRESS: ProgressState = {
	claims: null,
	pebbles: [],
	forDone: [],
	againstStarted: [],
	againstDone: [],
	foundForCount: 0,
	candidates: {},
	judgedClaims: [],
	secondCheck: null,
	finished: false,
};

function addUnique(list: number[], value: number): number[] {
	return list.includes(value) ? list : [...list, value];
}

function addCandidates(state: ProgressState, claim: number, count: number): Record<number, number> {
	return { ...state.candidates, [claim]: (state.candidates[claim] ?? 0) + count };
}

export function reduceProgress(state: ProgressState, event: WaitingEvent): ProgressState {
	switch (event.type) {
		case 'zgloszenie_przeczytane':
			return { ...state, claims: event.claims };
		case 'fragmenty_za':
			return {
				...state,
				forDone: addUnique(state.forDone, event.claim),
				foundForCount: state.foundForCount + event.count,
				candidates: addCandidates(state, event.claim, event.count),
			};
		case 'szukanie_przeciw_start':
			return { ...state, againstStarted: addUnique(state.againstStarted, event.claim) };
		case 'szukanie_przeciw_koniec':
			return {
				...state,
				againstDone: addUnique(state.againstDone, event.claim),
				candidates: addCandidates(state, event.claim, event.count),
			};
		case 'fragment_oceniony':
			return {
				...state,
				judgedClaims: addUnique(state.judgedClaims, event.claim),
				pebbles: [
					...state.pebbles,
					{ id: state.pebbles.length, publisher: event.publisher, stance: event.stance },
				],
			};
		case 'druga_kontrola':
			return { ...state, secondCheck: { agreed: event.agreed ?? null, total: event.total ?? event.checked ?? null } };
		case 'gotowe':
			return { ...state, finished: true };
	}
}

export function pebblesFor(state: ProgressState, stance: ProgressStance): Pebble[] {
	return state.pebbles.filter((pebble) => pebble.stance === stance);
}

export function candidateTotal(state: ProgressState): number {
	return Object.values(state.candidates).reduce((sum, count) => sum + count, 0);
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
