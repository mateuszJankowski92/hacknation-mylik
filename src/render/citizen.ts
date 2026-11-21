const STATS_SENTENCE = /\s*Sprawdzono\s+(\d+)\s+[^;.]+;\s*bramka cytatów odrzuciła\s+(\d+)\s+[^.]+\./u;
const CORPUS_VERSION = /\s*\(wersja korpusu [^,)]*,\s*[^)]*\)/u;

const WORD_SWAPS: Array<[RegExp, string]> = [
	[/Wstrzymujemy się od oceny\./gu, 'Nie oceniam tego.'],
	[/System wstrzymał się od oceny, więc/gu, 'Nie oceniłem tego, więc'],
	[/siłę podstawy/gu, 'pewność'],
	[/fragmentów/gu, 'tekstów'],
	[/fragmentu/gu, 'tekstu'],
	[/fragmenty/gu, 'teksty'],
	[/fragment/gu, 'tekst'],
	[/korpusu/gu, 'zbioru źródeł'],
	[/korpus/gu, 'zbiór źródeł'],
];

export interface CheckStats {
	checked: number;
	rejected: number;
}

export function extractCheckStats(text: string): CheckStats | null {
	const match = STATS_SENTENCE.exec(text);
	if (!match) return null;
	return { checked: Number(match[1]), rejected: Number(match[2]) };
}

export function citizenText(text: string): string {
	let result = text.replace(STATS_SENTENCE, '').replace(CORPUS_VERSION, '');
	for (const [pattern, replacement] of WORD_SWAPS) result = result.replace(pattern, replacement);
	return result.replace(/\s{2,}/gu, ' ').trim();
}

export const FORBIDDEN_CITIZEN_WORDS = [
	'korpus',
	'werdykt',
	'weryfikacj',
	'fragment',
	'rekord',
	'dowód źródłowy',
	'siła podstawy',
	'stanowisko',
	'wstrzymani',
	'prompt',
	'model',
	'kanał',
	'incydent',
	'artefakt',
	'bramk',
];
