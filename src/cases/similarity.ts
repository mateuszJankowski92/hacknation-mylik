export const MIN_JACCARD = 0.7;
export const MIN_SHARED = 3;
export const MAX_DIFFERENT = 2;
export const STEM_LENGTH = 5;
export const MIN_WORD_LENGTH = 4;

const STOPWORDS = new Set([
	'czyli', 'czyz', 'ktory', 'ktora', 'ktore', 'ktorzy', 'ktorych', 'ktorym', 'oraz', 'albo', 'ale', 'ani',
	'jest', 'sa', 'byl', 'byla', 'bylo', 'beda', 'bedzie', 'jako', 'jego', 'jej', 'ich', 'tego', 'tej', 'tym',
	'ten', 'ta', 'to', 'te', 'tych', 'sie', 'tez', 'tylko', 'juz', 'jeszcze', 'przez', 'przed', 'nad', 'pod',
	'dla', 'bez', 'jak', 'jaki', 'czy', 'prawda', 'prawde', 'podobno', 'ponoc', 'slyszalem', 'slyszalam',
	'slyszeli', 'mowia', 'powiedzieli', 'zgodnie', 'wedlug', 'wlasnie', 'bardzo', 'moze', 'mozna', 'trzeba',
	'ktos', 'cos', 'wszyscy', 'wszystkie', 'wszystko', 'kazdy', 'kazda', 'kazde', 'ponad', 'okolo', 'cala',
	'caly', 'cale', 'wiec', 'dlatego', 'poniewaz', 'zeby', 'aby', 'gdyz', 'maja', 'ma', 'mial',
]);

const NEGATION = new Set(['nie', 'bez', 'brak', 'braku', 'nigdy', 'wcale', 'zadne', 'zaden', 'zadna', 'zadnych']);

export function foldText(text: string): string {
	return text
		.toLowerCase()
		.replace(/ł/g, 'l')
		.normalize('NFD')
		.replace(/\p{M}+/gu, '')
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim()
		.replace(/\s+/g, ' ');
}

export function normalizeClaimText(text: string): string {
	return foldText(text);
}

export interface ClaimSignature {
	normalized: string;
	stems: string[];
	numbers: string[];
	proper: string[];
	negated: boolean;
}

function stemOf(word: string): string {
	return word.length > STEM_LENGTH ? word.slice(0, STEM_LENGTH) : word;
}

function rawWords(text: string): string[] {
	return text.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 0);
}

export function claimSignature(text: string): ClaimSignature {
	const normalized = normalizeClaimText(text);
	const words = normalized.split(' ').filter((w) => w.length > 0);
	const stems = new Set<string>();
	const numbers = new Set<string>();
	let negated = false;
	for (const w of words) {
		if (NEGATION.has(w)) negated = true;
		if (/^\d+$/.test(w)) {
			numbers.add(w);
			continue;
		}
		if (w.length < MIN_WORD_LENGTH || STOPWORDS.has(w) || NEGATION.has(w)) continue;
		stems.add(stemOf(w));
	}
	const proper = new Set<string>();
	rawWords(text).forEach((original, index) => {
		if (index === 0) return;
		const first = original[0] ?? '';
		if (first === first.toUpperCase() && first !== first.toLowerCase() && !/^\d/.test(original)) {
			const folded = foldText(original);
			if (folded.length >= MIN_WORD_LENGTH - 1 && !STOPWORDS.has(folded)) proper.add(stemOf(folded));
		}
	});
	return {
		normalized,
		stems: [...stems].sort(),
		numbers: [...numbers].sort(),
		proper: [...proper].sort(),
		negated,
	};
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function stemOverlap(a: readonly string[], b: readonly string[]): { jaccard: number; shared: number; different: number } {
	const setB = new Set(b);
	const shared = a.filter((s) => setB.has(s)).length;
	const union = a.length + b.length - shared;
	return { jaccard: union === 0 ? 0 : shared / union, shared, different: union - shared };
}

export function sameCase(a: ClaimSignature, b: ClaimSignature): boolean {
	if (a.normalized.length > 0 && a.normalized === b.normalized) return true;
	if (a.negated !== b.negated) return false;
	if (!sameList(a.numbers, b.numbers)) return false;
	const stemsA = new Set(a.stems);
	const stemsB = new Set(b.stems);
	if (a.proper.some((p) => !stemsB.has(p)) || b.proper.some((p) => !stemsA.has(p))) return false;
	const { jaccard, shared, different } = stemOverlap(a.stems, b.stems);
	return shared >= MIN_SHARED && different <= MAX_DIFFERENT && jaccard >= MIN_JACCARD;
}
