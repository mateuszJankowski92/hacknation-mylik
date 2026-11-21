export function pluralForm(count: number, one: string, few: string, many: string): string {
	const n = Math.abs(Math.trunc(count));
	if (n === 1) return one;
	const lastTwo = n % 100;
	const last = n % 10;
	if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return few;
	return many;
}

export const NOUN_FORMS_PL = {
	twierdzenie: ['twierdzenie', 'twierdzenia', 'twierdzeń'],
	zrodlo: ['źródło', 'źródła', 'źródeł'],
	zdanie: ['zdanie', 'zdania', 'zdań'],
	dokument: ['dokument', 'dokumenty', 'dokumentów'],
	tekst: ['tekst', 'teksty', 'tekstów'],
} as const;

export type NounPl = keyof typeof NOUN_FORMS_PL;

export function countNoun(count: number, noun: NounPl): string {
	const [one, few, many] = NOUN_FORMS_PL[noun];
	return `${count} ${pluralForm(count, one, few, many)}`;
}
