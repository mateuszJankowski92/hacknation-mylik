import type { EvidenceItem } from '../../../src/contracts/record';

export const PUBLICATION_LINK_LABEL = 'Zobacz publikację';

const MAX_THESIS_CHARS = 300;
const THESIS_OPEN = ': „';
const RATED_MARKER = ' i oceniła je jako „';
const DATE_AFTER_RATING = /”, (\d{2}\.\d{2}\.\d{4})/u;
const VERB = ' sprawdziła ';
const CLAIMANT = /”\s*\(autor wypowiedzi: ([^)]+)\)\s*$/u;
const URL_IN_TEXT = /https?:\/\/[^\s]+/giu;

export interface ReviewAssessment {
	attribution: string;
	thesis: string;
	claimant: string | null;
	link: PublicationLink | null;
}

export interface PublicationLink {
	href: string;
	label: string;
}

export interface TextPiece {
	kind: 'text' | 'link';
	text: string;
	href?: string;
}

export function domainOf(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./iu, '');
	} catch {
		return url;
	}
}

function cutThesis(text: string): string {
	return text.length > MAX_THESIS_CHARS ? `${text.slice(0, MAX_THESIS_CHARS - 1).trimEnd()}…` : text;
}

function trimTrailingPunctuation(url: string): { url: string; rest: string } {
	const match = /[.,;:!?)”]+$/u.exec(url);
	if (!match) return { url, rest: '' };
	return { url: url.slice(0, match.index), rest: match[0] };
}

export function linkifyAddresses(text: string): TextPiece[] {
	const pieces: TextPiece[] = [];
	let cursor = 0;
	for (const match of text.matchAll(URL_IN_TEXT)) {
		const index = match.index ?? 0;
		const { url, rest } = trimTrailingPunctuation(match[0]);
		if (index > cursor) pieces.push({ kind: 'text', text: text.slice(cursor, index) });
		pieces.push({ kind: 'link', text: `${PUBLICATION_LINK_LABEL}: ${domainOf(url)}`, href: url });
		if (rest) pieces.push({ kind: 'text', text: rest });
		cursor = index + match[0].length;
	}
	if (cursor < text.length) pieces.push({ kind: 'text', text: text.slice(cursor) });
	return pieces;
}

function findReviewItem(sentence: string, evidence: EvidenceItem[], name: string): EvidenceItem | null {
	const candidates = evidence.filter((item) => item.source.review && sentence.startsWith(`${name}${VERB}`));
	if (candidates.length <= 1) return candidates[0] ?? null;
	return candidates.find((item) => sentence.includes(item.source.review!.claimReviewed.slice(0, 24))) ?? candidates[0] ?? null;
}

export function parseReviewAssessment(sentence: string, evidence: EvidenceItem[]): ReviewAssessment | null {
	const verbAt = sentence.indexOf(VERB);
	const open = sentence.indexOf(THESIS_OPEN);
	const rated = sentence.lastIndexOf(RATED_MARKER);
	if (verbAt <= 0 || open < verbAt || rated < open) return null;
	const name = sentence.slice(0, verbAt);
	const item = findReviewItem(sentence, evidence, name);
	if (!item) return null;
	const review = item.source.review!;
	const what = sentence.slice(verbAt + VERB.length, open).trim();
	const middle = sentence.slice(open + THESIS_OPEN.length, rated);
	const claimant = CLAIMANT.exec(middle)?.[1] ?? null;
	const thesisFromSentence = middle.replace(CLAIMANT, '').replace(/”\s*$/u, '').trim();
	const reviewed = review.claimReviewed.trim();
	const thesis = reviewed ? cutThesis(reviewed) : thesisFromSentence;
	const dateMatch = DATE_AFTER_RATING.exec(sentence.slice(rated));
	const dateText = dateMatch ? `, ${dateMatch[1]}` : '';
	const attribution = `${name}${VERB}${what} i oceniła je jako „${review.rating}”${dateText}.`;
	const link: PublicationLink | null = containsAddress(sentence)
		? { href: item.source.url, label: `${PUBLICATION_LINK_LABEL}: ${domainOf(item.source.url)}` }
		: null;
	return { attribution, thesis, claimant, link };
}

function containsAddress(text: string): boolean {
	return /https?:\/\/\S/iu.test(text);
}
