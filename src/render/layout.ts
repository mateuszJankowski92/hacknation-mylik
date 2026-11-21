import {
	VERDICT_LABELS_PL,
	type ClaimResult,
	type EvidenceItem,
	type Verdict,
} from '../contracts/index';
import { EVIDENCE_LINK_TEXT, STRENGTH_PLAIN_PL, STRENGTH_TITLE_PL, VERDICT_EXPLANATIONS_PL } from './plain';
import { asOfStamp, formatDate } from './templates';

export { EVIDENCE_LINK_TEXT } from './plain';

export interface ResultLayout {
	headline: string;
	label: string;
	certainty: string | null;
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

export function buildHeadline(claim: ClaimResult, limits: LayoutLimits = {}): string {
	const publisherLimit = limits.publisher ?? DEFAULT_PUBLISHER_CHARS;
	const quoteLimit = limits.quote ?? DEFAULT_QUOTE_CHARS;
	const { verdict } = claim;

	if (verdict === 'brak_wystarczajacych_dowodow') {
		const confirming = claim.evidence.find((item) => item.stance === 'potwierdza');
		const refuting = claim.evidence.find((item) => item.stance === 'obala');
		if (confirming && refuting) {
			return `${publisherName(confirming, publisherLimit)} i ${publisherName(refuting, publisherLimit)} podają sprzeczne informacje. Nie wiem, czy to prawda.`;
		}
		return VERDICT_EXPLANATIONS_PL[verdict];
	}

	const relation = RELATIONS[verdict];
	const item = pickLayoutEvidence(claim);
	if (!relation || !item) return VERDICT_EXPLANATIONS_PL[verdict];

	const date = item.source.publishedAt ? formatDate(item.source.publishedAt) : 'w dokumencie bez daty';
	const quote = shorten(item.quote, quoteLimit);
	const lead = `${publisherName(item, publisherLimit)} podał ${date} ${relation}`;
	return quote ? `${lead}: „${quote}”` : `${lead}.`;
}

export function buildResultLayout(claim: ClaimResult, asOf: string, limits: LayoutLimits = {}): ResultLayout {
	return {
		headline: buildHeadline(claim, limits),
		label: VERDICT_LABELS_PL[claim.verdict],
		certainty:
			claim.verdict === 'nie_podlega_weryfikacji'
				? null
				: `${STRENGTH_TITLE_PL}: ${STRENGTH_PLAIN_PL[claim.strength.level]}`,
		asOf: asOfStamp(asOf),
		evidenceLink: EVIDENCE_LINK_TEXT,
	};
}
