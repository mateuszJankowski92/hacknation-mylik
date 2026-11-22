import type { CasePublicStatus } from './types';

export const CASE_SAVED_SENTENCE_PL =
	'Zapisałem to pytanie na liście białych plam dla administratorów serwisu. To dla nich sygnał, że potrzebny jest oficjalny komunikat.';

export function caseForwardedSentencePl(date: string): string {
	return `Przekazano do sprawdzenia ${date}.`;
}

export function casePublicSentencePl(status: CasePublicStatus, formattedDate?: string): string | null {
	if (status === 'zapisano') return CASE_SAVED_SENTENCE_PL;
	if (status === 'przekazano' && formattedDate) return caseForwardedSentencePl(formattedDate);
	return null;
}
