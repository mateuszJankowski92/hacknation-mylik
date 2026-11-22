import type { ClaimResult, EvidenceItem } from '../contracts/record';
import { VERDICT_LABELS_PL, type Verdict } from '../contracts/verdict';
import { ABSTAIN_LINK_TEXT, EVIDENCE_LINK_TEXT, STRENGTH_PLAIN_PL, STRENGTH_TITLE_PL, VERDICT_EXPLANATIONS_PL } from './plain';
import { asOfStamp, formatDate } from './templates';
import { isPageEvidence, missingEvidenceText, NOT_FOUND_SENTENCE, pageSaysSentence, reviewSentence, similarReview, similarSentence } from './answer';

export { ABSTAIN_LINK_TEXT, EVIDENCE_LINK_TEXT } from './plain';

export interface ResultLayout {
	headline: string;
	label: string;
	certainty: string | null;
	uncertaintyNote: string | null;
	asOf: string;
	evidenceLink: string;
}

export interface LayoutLimits {
	publisher?: number;
	quote?: number;
}

const DEFAULT_PUBLISHER_CHARS = 60;
const DEFAULT_QUOTE_CHARS = 220;

const RELATIONS: Partial<Record<Verdict, string>> = {
	potwierdzone: 'to samo',
	falszywe: 'co innego',
	wprowadzajace_w_blad: 'ważny kontekst',
};

const WANTED_STANCE: Partial<Record<Verdict, EvidenceItem['stance']>> = {
	potwierdzone: 'potwierdza',
	falszywe: 'obala',
	wprowadzajace_w_blad: 'rozbieznosc_kontekstu',
};

function shorten(text: string, limit: number): string {
	const clean = text.replace(/\s+/gu, ' ').trim();
	return clean.length <= limit ? clean : `${clean.slice(0, Math.max(limit - 1, 1)).trimEnd()}…`;
}

function publisherName(item: EvidenceItem, limit: number): string {
	return shorten(item.source.publisher || item.source.domain || 'Źródło', limit);
}

export function pickLayoutEvidence(claim: ClaimResult): EvidenceItem | undefined {
	const wanted = WANTED_STANCE[claim.verdict];
	if (!wanted) return undefined;
	return (
		claim.evidence.find((item) => item.stance === wanted) ??
		(claim.verdict === 'wprowadzajace_w_blad' ? claim.evidence.find((item) => item.stance === 'kontekst') : undefined)
	);
}

/**
 * Zdanie główne. Pytanie rozstrzygające: najpierw bezpośrednia odpowiedź (`directAnswer`), potem zdanie
 * relacjonujące źródło z datą. Ocena redakcji jest zawsze przypisana redakcji (reviewSentence).
 */
export function buildHeadline(claim: ClaimResult, limits: LayoutLimits = {}): string {
	const body = headlineBody(claim, limits);
	return claim.directAnswer ? `${claim.directAnswer} ${body}`.trim() : body;
}

function headlineBody(claim: ClaimResult, limits: LayoutLimits): string {
	const publisherLimit = limits.publisher ?? DEFAULT_PUBLISHER_CHARS;
	const quoteLimit = limits.quote ?? DEFAULT_QUOTE_CHARS;
	const { verdict } = claim;

	if (verdict === 'brak_wystarczajacych_dowodow') {
		const confirming = claim.evidence.find((item) => item.stance === 'potwierdza');
		const refuting = claim.evidence.find((item) => item.stance === 'obala');
		if (confirming && refuting) {
			return `${publisherName(confirming, publisherLimit)} i ${publisherName(refuting, publisherLimit)} podają sprzeczne informacje. Nie wiem, czy to prawda.`;
		}
		if (claim.neededDocument) {
			// Podobna sprawa z oceną redakcji (bez odpowiedzi wprost) idzie na koniec.
			const sim = similarReview(claim);
			const tailSim = sim ? ` ${similarSentence(sim, { maxThesis: quoteLimit })}` : '';
			// Bez powtórzenia "nie udało się potwierdzić", gdy mówi to już bezpośrednia odpowiedź.
			if (claim.directAnswer?.startsWith('Nie udało mi się'))
				return `Do sprawdzenia potrzebuję: ${claim.neededDocument}. ${NOT_FOUND_SENTENCE}${tailSim}`;
			return `${missingEvidenceText(claim)}${tailSim}`;
		}
		return VERDICT_EXPLANATIONS_PL[verdict];
	}
	if (verdict === 'nie_podlega_weryfikacji') return VERDICT_EXPLANATIONS_PL[verdict];

	const relation = RELATIONS[verdict];
	const item = pickLayoutEvidence(claim);
	if (!relation || !item) return VERDICT_EXPLANATIONS_PL[verdict];
	if (item.source.review) return reviewSentence(item, { maxThesis: quoteLimit });
	if (isPageEvidence(item)) return pageSaysSentence(item, { maxQuote: quoteLimit, maxPublisher: publisherLimit });

	const date = item.source.publishedAt ? formatDate(item.source.publishedAt) : 'dokument bez daty';
	const quote = shorten(item.quote, quoteLimit);
	const lead = `Źródło: ${publisherName(item, publisherLimit)}, ${date}. ${relation.charAt(0).toUpperCase()}${relation.slice(1)}`;
	return quote ? `${lead}: „${quote}”` : `${lead}.`;
}

export function isUnmeasurable(claim: ClaimResult): boolean {
	return claim.verdict === 'brak_wystarczajacych_dowodow' || (claim.verdict !== 'nie_podlega_weryfikacji' && claim.strength.level === 'brak');
}

export function buildUncertaintyNote(claim: ClaimResult): string | null {
	if (!isUnmeasurable(claim)) return null;
	const confirming = claim.evidence.some((item) => item.stance === 'potwierdza');
	const refuting = claim.evidence.some((item) => item.stance === 'obala');
	if (confirming && refuting) return 'Źródła mówią co innego, więc zajrzyj na stronę właściwego urzędu.';
	return 'Nie znalazłem tego w sprawdzonych źródłach, więc zajrzyj na stronę właściwego urzędu.';
}

export function evidenceLinkText(claim: ClaimResult): string {
	return claim.verdict === 'brak_wystarczajacych_dowodow' ? ABSTAIN_LINK_TEXT : EVIDENCE_LINK_TEXT;
}

export function buildResultLayout(claim: ClaimResult, asOf: string, limits: LayoutLimits = {}, checkedAt?: string): ResultLayout {
	return {
		headline: buildHeadline(claim, limits),
		label: VERDICT_LABELS_PL[claim.verdict],
		certainty:
			claim.verdict === 'nie_podlega_weryfikacji' || isUnmeasurable(claim)
				? null
				: `${STRENGTH_TITLE_PL}: ${STRENGTH_PLAIN_PL[claim.strength.level]}`,
		uncertaintyNote: buildUncertaintyNote(claim),
		asOf: asOfStamp(asOf, checkedAt),
		evidenceLink: evidenceLinkText(claim),
	};
}
