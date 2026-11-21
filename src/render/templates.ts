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
	if (level === 'brak') return 'Nie znalazłem w sprawdzonych źródłach podstawy do oceny.';
	const why = reasons.map((r) => REASON_PHRASES[r]).join(', ');
	const head = `${STRENGTH_TITLE_PL}: ${STRENGTH_PLAIN_PL[level]}.`;
	return why ? `${head} Powody: ${why}.` : head;
}

const WARSAW_TIME = new Intl.DateTimeFormat('pl-PL', {
	timeZone: 'Europe/Warsaw',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
});

export function asOfStamp(asOf: string): string {
	if (!asOf.includes('T')) return `Stan na ${formatDate(asOf)}.`;
	const date = new Date(asOf);
	if (Number.isNaN(date.getTime())) return `Stan na ${formatDate(asOf)}.`;
	const parts = Object.fromEntries(WARSAW_TIME.formatToParts(date).map((part) => [part.type, part.value]));
	return `Stan na ${parts.day}.${parts.month}.${parts.year}, ${parts.hour}:${parts.minute}.`;
}

const WARSAW_DAY = new Intl.DateTimeFormat('pl-PL', {
	timeZone: 'Europe/Warsaw',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
});

export function asOfSentence(asOf: string): string {
	const date = asOf.includes('T') ? new Date(asOf) : null;
	if (!date || Number.isNaN(date.getTime())) return `Stan na ${formatDate(asOf)}.`;
	const parts = Object.fromEntries(WARSAW_DAY.formatToParts(date).map((part) => [part.type, part.value]));
	return `Stan na ${parts.day}.${parts.month}.${parts.year}.`;
}

export const VERDICT_SENTENCES: Record<Verdict, (source: string, date: string) => string> = {
	potwierdzone: (source, date) => `${source} podaje ${date} informację zgodną z twierdzeniem.`,
	falszywe: (source, date) => `${source} podaje ${date} informację przeczącą twierdzeniu.`,
	wprowadzajace_w_blad: (source, date) =>
		`${source} podaje ${date} inne okoliczności tej samej sprawy.`,
	brak_wystarczajacych_dowodow: () => 'Nie znalazłem w źródłach ani potwierdzenia, ani zaprzeczenia.',
	nie_podlega_weryfikacji: () =>
		'To opinia albo przewidywanie, więc nie sprawdzam tego w źródłach.',
};
