import { z } from 'zod';
import type { ProgressStance, VerifyProgressEvent } from '../../../src/contracts/api';

const count = z.number().int().nonnegative();
const optionalClaim = count.optional();

export const ExtraProgressEventSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('druga_kontrola'),
		claim: optionalClaim,
		agreed: count.optional(),
		total: count.optional(),
		checked: count.optional(),
		ok: z.boolean().optional(),
	}),
	z.object({ type: z.literal('przeszukano'), claim: optionalClaim, documents: count }),
	z.object({ type: z.literal('indeks_redakcji'), claim: optionalClaim, queries: count, candidates: count }),
	z.object({ type: z.literal('indeks_redakcji_blad'), claim: optionalClaim, reason: z.string().max(40).optional() }),
	z.object({
		type: z.literal('twierdzenie_ocenione'),
		claim: optionalClaim,
		candidates: count,
		passed: count,
		decisive: count.optional(),
		sources: count.optional(),
	}),
	z.object({ type: z.literal('strona_urzedu'), publisher: z.string().max(60), quotes: count.optional(), confirmedClaims: count.optional(), claims: count.optional() }),
]);
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

export interface JudgedCounts {
	candidates: number;
	passed: number;
	sources: number;
}

export interface EditorialIndex {
	queries: number;
	candidates: number;
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
	secondByClaim: Record<number, SecondCheck>;
	documents: Record<number, number>;
	editorial: Record<number, EditorialIndex>;
	editorialFailed: boolean;
	judgedCounts: Record<number, JudgedCounts>;
	officialPublisher: string | null;
	checkedAt: string | null;
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
	secondByClaim: {},
	documents: {},
	editorial: {},
	editorialFailed: false,
	judgedCounts: {},
	officialPublisher: null,
	checkedAt: null,
	finished: false,
};

const UNKNOWN_CLAIM = -1;

function addUnique(list: number[], value: number): number[] {
	return list.includes(value) ? list : [...list, value];
}

function addCandidates(state: ProgressState, claim: number, count: number): Record<number, number> {
	return { ...state.candidates, [claim]: (state.candidates[claim] ?? 0) + count };
}

function sumSecondChecks(items: SecondCheck[]): SecondCheck {
	if (items.some((item) => item.agreed === null || item.total === null)) return { agreed: null, total: null };
	return {
		agreed: items.reduce((sum, item) => sum + (item.agreed ?? 0), 0),
		total: items.reduce((sum, item) => sum + (item.total ?? 0), 0),
	};
}

export function documentsTotal(state: ProgressState): number {
	return Object.values(state.documents).reduce((sum, value) => Math.max(sum, value), 0);
}

export function editorialTotals(state: ProgressState): EditorialIndex | null {
	const items = Object.values(state.editorial);
	if (items.length === 0) return null;
	return {
		queries: items.reduce((sum, item) => sum + item.queries, 0),
		candidates: items.reduce((sum, item) => sum + item.candidates, 0),
	};
}

export function judgedTotals(state: ProgressState): JudgedCounts | null {
	const items = Object.values(state.judgedCounts);
	if (state.claims === null || state.claims === 0 || items.length < state.claims) return null;
	return {
		candidates: items.reduce((sum, item) => sum + item.candidates, 0),
		passed: items.reduce((sum, item) => sum + item.passed, 0),
		sources: items.reduce((sum, item) => sum + item.sources, 0),
	};
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
		case 'druga_kontrola': {
			if (event.ok === false) return state;
			const single: SecondCheck = { agreed: event.agreed ?? null, total: event.total ?? event.checked ?? null };
			const secondByClaim = { ...state.secondByClaim, [event.claim ?? UNKNOWN_CLAIM]: single };
			return { ...state, secondByClaim, secondCheck: sumSecondChecks(Object.values(secondByClaim)) };
		}
		case 'przeszukano':
			return { ...state, documents: { ...state.documents, [event.claim ?? UNKNOWN_CLAIM]: event.documents } };
		case 'indeks_redakcji':
			return {
				...state,
				editorial: { ...state.editorial, [event.claim ?? UNKNOWN_CLAIM]: { queries: event.queries, candidates: event.candidates } },
			};
		case 'indeks_redakcji_blad':
			return { ...state, editorialFailed: true };
		case 'twierdzenie_ocenione':
			return {
				...state,
				judgedCounts: {
					...state.judgedCounts,
					[event.claim ?? UNKNOWN_CLAIM]: { candidates: event.candidates, passed: event.passed, sources: event.sources ?? 0 },
				},
			};
		case 'strona_urzedu':
			return { ...state, officialPublisher: event.publisher };
		case 'gotowe':
			return { ...state, finished: true, checkedAt: event.checkedAt ?? state.checkedAt };
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
