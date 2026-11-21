import { STRENGTH_LABELS_PL, type StrengthReasonCode, type Verdict } from '../contracts/index';

export const REASON_PHRASES: Record<StrengthReasonCode, string> = {
	zrodlo_urzedowe: 'źródło urzędowe',
	kilka_niezaleznych_zrodel: 'kilka niezależnych źródeł',
	jedno_zrodlo: 'tylko jedno źródło',
	zrodlo_archiwalne: 'źródło archiwalne',
	sprzeczne_zrodla: 'źródła podają sprzeczne informacje',
	slabe_dopasowanie: 'słabe dopasowanie źródeł do twierdzenia',
	brak_dowodow: 'brak dowodów w korpusie',
};

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

export function strengthSentence(level: keyof typeof STRENGTH_LABELS_PL, reasons: StrengthReasonCode[]): string {
	const why = reasons.map((r) => REASON_PHRASES[r]).join(', ');
	return why
		? `Siła podstawy: ${STRENGTH_LABELS_PL[level]}. Powód: ${why}.`
		: `Siła podstawy: ${STRENGTH_LABELS_PL[level]}.`;
}

export function asOfSentence(asOf: string): string {
	return `Stan na ${formatDate(asOf)}.`;
}

export const VERDICT_SENTENCES: Record<Verdict, (source: string, date: string) => string> = {
	potwierdzone: (source, date) => `${source} podaje ${date} informację zgodną z twierdzeniem.`,
	falszywe: (source, date) => `${source} podaje ${date} informację przeczącą twierdzeniu.`,
	wprowadzajace_w_blad: (source, date) =>
		`${source} podaje ${date} kontekst, który twierdzenie pomija i który zmienia jego wymowę.`,
	brak_wystarczajacych_dowodow: () => 'Nie znalazłem w zbiorze źródeł potwierdzenia ani zaprzeczenia.',
	nie_podlega_weryfikacji: () =>
		'Twierdzenie wyraża opinię lub prognozę, więc Mylik nie sprawdza go w źródłach.',
};
