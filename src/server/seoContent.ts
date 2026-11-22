// Treści opisowe serwisu dla wyszukiwarek, asystentów AI i widocznej sekcji pytań na stronie Źródła.
// Bez importów: używa go i serwer (robots, llms.txt, JSON-LD), i interfejs (widoczne FAQ), więc jedno źródło prawdy.
export const SITE_NAME = 'Mylik';
export const SITE_TAGLINE = 'Informacja to nie fakt.';
export const SITE_DESCRIPTION = 'Mylik sprawdza informację w źródłach, zanim w nią uwierzysz.';
export const SITE_UPDATED_ISO = '2026-11-22';
export const REPOSITORY_NOTE = 'Kontakt i zgłoszenia: przez repozytorium projektu (zgłoszenia w repozytorium kodu).';

export interface SitePage {
	path: string;
	title: string;
	description: string;
}

export const SITE_PAGES: readonly SitePage[] = [
	{ path: '/', title: 'Mylik: informacja to nie fakt', description: SITE_DESCRIPTION },
	{
		path: '/zrodla',
		title: 'Źródła - Mylik',
		description: 'Lista dokumentów, z których korzysta Mylik, pogrupowana według wydawcy, z zasadami użycia i zaufanymi redakcjami weryfikującymi fakty.',
	},
	{
		path: '/dostepnosc',
		title: 'Dostępność - Mylik',
		description: 'Co zrobiliśmy, żeby Mylik był dostępny, i czego jeszcze nie sprawdziliśmy: klawiatura, kontrast, powiększanie, ruch.',
	},
	{
		path: '/prywatnosc',
		title: 'Prywatność - Mylik',
		description: 'Co się dzieje z tym, co wpiszesz w Mylika: co trafia na serwer, do dostawców modeli i co zostaje w przeglądarce.',
	},
];

export interface FaqItem {
	question: string;
	answer: string;
}

export const FAQ_ITEMS: readonly FaqItem[] = [
	{
		question: 'Czym jest Mylik?',
		answer:
			'Mylik to prototyp, który sprawdza informację w źródłach i pokazuje, co z nich wynika, razem z cytatem i datą. Sam nie orzeka o prawdzie: wskazuje, co mówią źródła.',
	},
	{
		question: 'Skąd Mylik bierze źródła?',
		answer:
			'Ze zbioru publicznych dokumentów wymienionych na tej stronie oraz z ocen zaufanych redakcji weryfikujących fakty, które Mylik odczytuje z publicznego indeksu Google Fact Check Tools. Ocena zawsze jest przypisana redakcji, która ją wydała.',
	},
	{
		question: 'Co robi Mylik, gdy nie wie?',
		answer: 'Wstrzymuje się. Pisze, że nie znalazł wystarczających dowodów, i niczego nie zgaduje ani nie zmyśla źródeł.',
	},
	{
		question: 'Czy to usługa urzędu?',
		answer: 'Nie. To prototyp z hackathonu HackNation 2026, a nie oficjalna usługa administracji publicznej.',
	},
];
