import { MAX_STEP_LINES, STEP_TEXTS } from './waitingConfig';
import {
	againstSearchFinished,
	candidateTotal,
	documentsTotal,
	editorialTotals,
	forSearchFinished,
	judgedTotals,
	type ProgressState,
} from './progress';

export interface WaitingLine {
	id: 'read' | 'documents' | 'editors' | 'search' | 'quotes' | 'second' | 'official' | 'cached';
	text: string;
	status: 'done' | 'current';
}

export interface WaitingFinal {
	passedQuotes?: number;
}

function quotesChecked(state: ProgressState, final: WaitingFinal): boolean {
	if (state.finished || state.secondCheck || final.passedQuotes !== undefined) return true;
	const claimsWithCandidates = Object.keys(state.candidates)
		.map(Number)
		.filter((claim) => (state.candidates[claim] ?? 0) > 0);
	return claimsWithCandidates.length > 0 && claimsWithCandidates.every((claim) => state.judgedClaims.includes(claim));
}

function preludeLines(state: ProgressState): WaitingLine[] {
	const lines: WaitingLine[] = [];
	const documents = documentsTotal(state);
	if (documents > 0) lines.push({ id: 'documents', text: STEP_TEXTS.searchedDocuments(documents), status: 'done' });
	const editors = editorialTotals(state);
	if (editors) lines.push({ id: 'editors', text: STEP_TEXTS.askedEditors(editors.queries, editors.candidates), status: 'done' });
	else if (state.editorialFailed) lines.push({ id: 'editors', text: STEP_TEXTS.editorsDown(), status: 'done' });
	return lines;
}

function officialLine(state: ProgressState): WaitingLine[] {
	if (!state.officialPublisher) return [];
	return [{ id: 'official', text: STEP_TEXTS.readingOfficialPage(state.officialPublisher), status: state.finished ? 'done' : 'current' }];
}

export function waitingLines(state: ProgressState, final: WaitingFinal = {}): WaitingLine[] {
	if (state.claims === null) return [];
	const lines: WaitingLine[] = [{ id: 'read', text: STEP_TEXTS.read(), status: 'done' }];
	if (state.claims === 0) return lines;
	lines.push(...preludeLines(state));
	lines.push(...officialLine(state));

	const searched = forSearchFinished(state) && againstSearchFinished(state);
	const judged = judgedTotals(state);
	if (judged) {
		lines.push({ id: 'search', text: STEP_TEXTS.foundAndPassed(judged.candidates, judged.passed), status: 'done' });
		if (judged.candidates === 0) return lines.slice(-MAX_STEP_LINES);
	} else if (!searched) {
		lines.push({ id: 'search', text: STEP_TEXTS.searching(), status: 'current' });
		return lines.slice(-MAX_STEP_LINES);
	} else {
		const total = candidateTotal(state);
		lines.push({ id: 'search', text: STEP_TEXTS.found(total), status: 'done' });
		if (total === 0) return lines.slice(-MAX_STEP_LINES);
		if (quotesChecked(state, final)) {
			const passed = final.passedQuotes ?? state.pebbles.length;
			lines.push({ id: 'quotes', text: STEP_TEXTS.checkedQuotes(passed), status: 'done' });
		} else {
			lines.push({ id: 'quotes', text: STEP_TEXTS.checkingQuotes(), status: 'current' });
		}
	}
	if (state.secondCheck) {
		lines.push({ id: 'second', text: STEP_TEXTS.secondCheck(state.secondCheck.agreed, state.secondCheck.total), status: 'done' });
	}
	return lines.slice(-MAX_STEP_LINES);
}

export function cachedLines(createdAt: string, checkedAt?: string | null): WaitingLine[] {
	return [{ id: 'cached', text: STEP_TEXTS.cached(createdAt, checkedAt), status: 'done' }];
}
