import { formatDateTime } from '../format';

export const WAITING_TIMING = {
	homeFadeMs: 300,
	stepsFadeMs: 300,
	readyHoldMs: 450,
	travelMs: 1400,
	cachedLineMs: 650,
} as const;

export const MAX_STEP_LINES = 5;

export const WAITING_TEXTS = {
	working: 'Sprawdzam…',
	ready: 'Wynik gotowy.',
	cancel: 'Anuluj',
	region: 'Postęp sprawdzania',
} as const;

function pluralForm(count: number, one: string, few: string, many: string): string {
	if (count === 1) return one;
	const lastTwo = count % 100;
	const last = count % 10;
	if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return few;
	return many;
}

export function fragmentsPhrase(count: number): string {
	return `${count} ${pluralForm(count, 'fragment', 'fragmenty', 'fragmentów')}`;
}

function passedPhrase(count: number): string {
	return `${count} ${pluralForm(count, 'przeszedł', 'przeszły', 'przeszło')} kontrolę`;
}

function agreedWord(count: number): string {
	return pluralForm(count, 'zgodny', 'zgodne', 'zgodnych');
}

function documentsPhrase(count: number): string {
	return `${count} ${pluralForm(count, 'dokument', 'dokumenty', 'dokumentów')}`;
}

function queriesPhrase(count: number): string {
	return `${count} ${pluralForm(count, 'zapytanie', 'zapytania', 'zapytań')}`;
}

function similarPhrase(count: number): string {
	return `${count} ${pluralForm(count, 'podobna teza', 'podobne tezy', 'podobnych tez')}`;
}

function passedQuoteClause(passed: number): string {
	return passed === 0 ? 'żaden nie przeszedł kontroli cytatu' : `${passedPhrase(passed)} cytatu`;
}

export function formatCheckedAt(value: string, now: Date = new Date()): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	const day = (input: Date) => new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).format(input);
	if (day(date) !== day(now)) return formatDateTime(value);
	return new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
}

export const STEP_TEXTS = {
	searchedDocuments: (count: number) => `Przeszukałem ${documentsPhrase(count)}.`,
	askedEditors: (queries: number, candidates: number) => `Zapytałem redakcje: ${queriesPhrase(queries)}, ${similarPhrase(candidates)}.`,
	editorsDown: () => 'Indeks redakcji nie odpowiada.',
	foundAndPassed: (candidates: number, passed: number) =>
		candidates === 0 ? 'Nie znalazłem fragmentów do sprawdzenia.' : `Znalazłem ${fragmentsPhrase(candidates)}, ${passedQuoteClause(passed)}.`,
	readingOfficialPage: (publisher: string) => `Czytam stronę urzędu: ${publisher}.`,
	read: () => 'Przeczytałem zgłoszenie.',
	searching: () => 'Szukam w źródłach…',
	found: (count: number) => (count === 0 ? 'Nie znalazłem fragmentów do sprawdzenia.' : `Znalazłem ${fragmentsPhrase(count)} do sprawdzenia.`),
	checkingQuotes: () => 'Sprawdzam cytaty…',
	checkedQuotes: (passed: number) => (passed === 0 ? 'Sprawdziłem cytaty: żaden nie przeszedł kontroli.' : `Sprawdziłem cytaty: ${passedPhrase(passed)}.`),
	secondCheck: (agreed: number | null, total: number | null) =>
		agreed === null || total === null ? 'Drugi model sprawdził cytaty.' : `Drugi model sprawdził cytaty: ${agreed} z ${total} ${agreedWord(agreed)}.`,
	cached: (createdAt: string, checkedAt?: string | null) =>
		`To pytanie sprawdziłem wcześniej, ${checkedAt ? formatCheckedAt(checkedAt) : formatDateTime(createdAt)}.`,
} as const;
