const QUOTED = /„[^”]*”|"[^"]*"|«[^»]*»/gu;

const FORBIDDEN =
	/(?<![\p{L}\p{N}])(jest|są|jestem|jesteś|jesteśmy|jesteście|był|była|było|byli|były|będzie|będą|być)(?![\p{L}\p{N}])/giu;

export function stripQuotes(text: string): string {
	return text.replace(QUOTED, ' ');
}

export function findForbiddenForms(text: string): string[] {
	return Array.from(stripQuotes(text).matchAll(FORBIDDEN), (m) => m[0].toLowerCase());
}

export function countForbiddenForms(texts: string[]): number {
	return texts.reduce((sum, text) => sum + findForbiddenForms(text).length, 0);
}

export function splitSentences(text: string): string[] {
	return stripQuotes(text)
		.split(/(?<=[.!?])\s+/u)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

export function averageSentenceLength(texts: string[]): number {
	const sentences = texts.flatMap(splitSentences);
	if (sentences.length === 0) return 0;
	const words = sentences.reduce((sum, s) => sum + s.split(/\s+/u).filter(Boolean).length, 0);
	return words / sentences.length;
}

export interface LanguageMetrics {
	forbiddenForms: number;
	averageSentenceWords: number;
	sentences: number;
}

export function measureLanguage(texts: string[]): LanguageMetrics {
	return {
		forbiddenForms: countForbiddenForms(texts),
		averageSentenceWords: averageSentenceLength(texts),
		sentences: texts.flatMap(splitSentences).length,
	};
}
