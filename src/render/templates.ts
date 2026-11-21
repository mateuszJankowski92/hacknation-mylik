import type { StrengthLevel, StrengthReasonCode, Verdict } from '../contracts/index';
import { REASON_PLAIN_PL, STRENGTH_PLAIN_PL, STRENGTH_TITLE_PL } from './plain';

export const REASON_PHRASES: Record<StrengthReasonCode, string> = REASON_PLAIN_PL;

export function formatDate(iso: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
	if (!m) return iso;
	return `${m[3]}.${m[2]}.${m[1]}`;
}

export function pluralPl(n: number, one: string, few: string, many: string): string {
	if (n === 1) return one;
	const d = n % 10;
	const t = n % 100;
	if (d >= 2 && d <= 4 && !(t >= 12 && t <= 14)) return few;
	return many;
}

export function nSources(n: number): string {
	return `${n} ${pluralPl(n, 'źródło', 'źródła', 'źródeł')}`;
}

export function strengthSentence(level: StrengthLevel, reasons: StrengthReasonCode[]): string {
	const why = reasons.map((r) => REASON_PHRASES[r]).join(', ');
	const head = `${STRENGTH_TITLE_PL}: ${STRENGTH_PLAIN_PL[level]}.`;
	return why ? `${head} Powody: ${why}.` : head;
}

export function asOfSentence(asOf: string): string {
	return `Stan na ${formatDate(asOf)}.`;
}

export const VERDICT_SENTENCES: Record<Verdict, (source: string, date: string) => string> = {
	potwierdzone: (source, date) => `${source} podaje ${date} informację zgodną z twierdzeniem.`,
	falszywe: (source, date) => `${source} podaje ${date} informację przeczącą twierdzeniu.`,
	wprowadzajace_w_blad: (source, date) =>
		`${source} podaje ${date} kontekst, który zmienia wymowę twierdzenia.`,
	brak_wystarczajacych_dowodow: () => 'Nie znalazłem w źródłach ani potwierdzenia, ani zaprzeczenia.',
	nie_podlega_weryfikacji: () =>
		'To opinia albo przewidywanie, więc nie sprawdzam tego w źródłach.',
};
