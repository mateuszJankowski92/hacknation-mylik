export type SentenceLevel = 'lead' | 'assessment' | 'plain' | 'caveat' | 'needed';

export interface AnswerSentence {
	level: SentenceLevel;
	text: string;
}

const NEEDED_PREFIX = 'Do sprawdzenia potrzebuję:';
export const CAVEAT_SENTENCE = 'Brak wyniku w moich źródłach nie oznacza, że to nieprawda.';

const ABBREVIATIONS = new Set([
	'np',
	'tzw',
	'tj',
	'tzn',
	'ok',
	'godz',
	'ul',
	'al',
	'im',
	'nr',
	'art',
	'ust',
	'pkt',
	'poz',
	'prof',
	'dr',
	'hab',
	'inż',
	'mgr',
	'ks',
	'św',
	'gen',
	'płk',
	'mjr',
	'ppłk',
	'wg',
	'itd',
	'itp',
	'tys',
	'mln',
	'mld',
	'ww',
	'm.in',
	'r',
	'dz',
	'ur',
	'zm',
	'maks',
	'sygn',
	'tel',
	'woj',
	'pow',
	'gm',
	'rozdz',
]);

const OPENING_QUOTES = new Set(['„', '«', '‘']);
const CLOSING_QUOTES = new Set(['”', '»', '’']);
const TERMINATORS = new Set(['.', '!', '?', '…']);

function startsLikeSentence(rest: string): boolean {
	const next = rest.trimStart().charAt(0);
	if (!next) return true;
	return /[\p{Lu}\p{N}„"«]/u.test(next);
}

function wordBefore(text: string, index: number): string {
	const match = /([\p{L}.]+)$/u.exec(text.slice(0, index));
	return match ? match[1]! : '';
}

function isProtectedPeriod(text: string, index: number): boolean {
	const word = wordBefore(text, index);
	if (!word) return false;
	const bare = word.replace(/\.$/u, '');
	if (/^\p{Lu}$/u.test(bare)) return true;
	return ABBREVIATIONS.has(bare.toLowerCase());
}

export function splitSentences(text: string): string[] {
	const clean = text.replace(/\s+/gu, ' ').trim();
	if (!clean) return [];
	const sentences: string[] = [];
	let start = 0;
	let quoteDepth = 0;
	let parenDepth = 0;
	let straightOpen = false;
	for (let index = 0; index < clean.length; index++) {
		const char = clean.charAt(index);
		if (OPENING_QUOTES.has(char)) quoteDepth++;
		else if (CLOSING_QUOTES.has(char)) quoteDepth = Math.max(0, quoteDepth - 1);
		else if (char === '"') straightOpen = !straightOpen;
		else if (char === '(') parenDepth++;
		else if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
		const inside = quoteDepth > 0 || straightOpen || parenDepth > 0;
		if (inside) continue;
		const closesAfterTerminator = CLOSING_QUOTES.has(char) && TERMINATORS.has(clean.charAt(index - 1));
		if (!TERMINATORS.has(char) && !closesAfterTerminator) continue;
		if (char === '.' && isProtectedPeriod(clean, index)) continue;
		let end = index + 1;
		while (end < clean.length && (CLOSING_QUOTES.has(clean.charAt(end)) || clean.charAt(end) === ')')) end++;
		if (clean.charAt(end) !== ' ' && end < clean.length) continue;
		if (!startsLikeSentence(clean.slice(end))) continue;
		sentences.push(clean.slice(start, end).trim());
		start = end;
		index = end - 1;
	}
	const tail = clean.slice(start).trim();
	if (tail) sentences.push(tail);
	return sentences;
}

export function classifyAnswer(headline: string, directAnswer?: string): AnswerSentence[] {
	const direct = directAnswer?.trim();
	let lead: string | null = null;
	let rest = headline;
	if (direct && headline.trim().startsWith(direct)) {
		lead = direct;
		rest = headline.trim().slice(direct.length);
	}
	const sentences = splitSentences(rest);
	if (lead === null) lead = sentences.shift() ?? null;
	const assessment: AnswerSentence[] = [];
	const plain: AnswerSentence[] = [];
	const needed: AnswerSentence[] = [];
	const caveat: AnswerSentence[] = [];
	for (const sentence of sentences) {
		if (sentence.startsWith(NEEDED_PREFIX)) needed.push({ level: 'needed', text: sentence });
		else if (sentence === CAVEAT_SENTENCE) caveat.push({ level: 'caveat', text: sentence });
		else if (assessment.length === 0) assessment.push({ level: 'assessment', text: sentence });
		else plain.push({ level: 'plain', text: sentence });
	}
	const leadPart: AnswerSentence[] = lead ? [{ level: 'lead', text: lead }] : [];
	return [...leadPart, ...assessment, ...plain, ...needed, ...caveat];
}

export function splitNeeded(text: string): { label: string; body: string } {
	return { label: NEEDED_PREFIX, body: text.slice(NEEDED_PREFIX.length).trim() };
}
