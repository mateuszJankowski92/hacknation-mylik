export interface ExampleQuery {
	id: string;
	label: string;
	text: string;
}

const LINK_SCHEME = ['https:', '', ''].join('/');

export const EXAMPLES_LABEL = 'Na przykład:';
export const EXAMPLES_REGION_LABEL = 'Przykładowe zgłoszenia';

export const EXAMPLE_QUERIES: readonly ExampleQuery[] = [
	{
		id: 'ocena-redakcji',
		label: 'Czy w Warszawie policja ogłosiła najwyższy stopień alarmowy?',
		text: 'Czy w Warszawie policja ogłosiła najwyższy stopień alarmowy?',
	},
	{
		id: 'zrodlo-urzedowe',
		label: 'Czy UOKiK nałożył karę na Allegro za greenwashing?',
		text: 'Czy UOKiK nałożył karę na Allegro za greenwashing?',
	},
	{
		id: 'biala-plama',
		label: 'Czy od jutra w całej Polsce obowiązuje zakaz sprzedaży chleba po godzinie 20?',
		text: 'Czy od jutra w całej Polsce obowiązuje zakaz sprzedaży chleba po godzinie 20?',
	},
	{
		id: 'link',
		label: 'Link do komunikatu o ePUAP',
		text: `${LINK_SCHEME}www.gov.pl/web/cyfryzacja/epuap-ponownie-dziala-w-pelnym-zakresie`,
	},
];
