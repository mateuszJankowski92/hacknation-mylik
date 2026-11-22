export type ExampleKind = 'redakcja' | 'urzad' | 'biala_plama' | 'link';

export interface ExampleQuery {
	id: string;
	label: string;
	text: string;
	kind: ExampleKind;
}

const LINK_SCHEME = ['https:', '', ''].join('/');

export const EXAMPLES_LABEL = 'Na przykład:';
export const EXAMPLES_REGION_LABEL = 'Przykładowe zgłoszenia';
export const EXAMPLES_SHUFFLE_LABEL = 'Inne przykłady';
export const EXAMPLES_SHOWN = 4;
export const REQUIRED_EXAMPLE_KINDS: readonly ExampleKind[] = ['biala_plama', 'redakcja', 'urzad'];

function claim(id: string, kind: ExampleKind, text: string): ExampleQuery {
	return { id, kind, label: text, text };
}

function link(id: string, label: string, address: string): ExampleQuery {
	return { id, kind: 'link', label, text: `${LINK_SCHEME}${address}` };
}

export const EXAMPLE_POOL: readonly ExampleQuery[] = [
	claim('redakcja-alarm-warszawa', 'redakcja', 'Czy w Warszawie policja ogłosiła najwyższy stopień alarmowy?'),
	claim('redakcja-ceny-paliw', 'redakcja', 'Czy ceny paliw w Polsce są najwyższe w Europie?'),
	claim('redakcja-inflacja-ue', 'redakcja', 'Czy Polska ma najwyższą inflację w Unii Europejskiej?'),
	claim('urzad-allegro-uokik', 'urzad', 'Czy UOKiK nałożył karę na Allegro za greenwashing?'),
	claim('urzad-mandat-bilet', 'urzad', 'Czy od nowego roku mandat za jazdę bez biletu wzrośnie do 2000 zł?'),
	claim('urzad-woda-z-kranu', 'urzad', 'Czy woda z kranu w Polsce nie nadaje się do picia?'),
	claim('urzad-falszywy-wnuczek', 'urzad', 'Czy policja ostrzega przed oszustwem na fałszywego wnuczka?'),
	claim('urzad-czujniki-czadu', 'urzad', 'Czy Straż Pożarna zaleca czujniki czadu w domach?'),
	claim('urzad-alkohol-za-kierownica', 'urzad', 'Czy w Polsce można prowadzić samochód po jednym piwie?'),
	claim('plama-chleb', 'biala_plama', 'Czy od jutra w całej Polsce obowiązuje zakaz sprzedaży chleba po godzinie 20?'),
	claim('plama-tramwaj-krakow', 'biala_plama', 'Czy od przyszłego tygodnia w Krakowie bilety na tramwaj będą darmowe dla wszystkich?'),
	claim('plama-parkowanie-gdansk', 'biala_plama', 'Czy w Gdańsku od poniedziałku parkowanie w centrum jest bezpłatne?'),
	claim('plama-bagaz-intercity', 'biala_plama', 'Czy PKP Intercity wprowadziło opłatę za bagaż podręczny w pociągach?'),
	claim('plama-maseczki-apteki', 'biala_plama', 'Czy do Polski wraca obowiązek noszenia maseczek w aptekach?'),
	claim('plama-bon-turystyczny', 'biala_plama', 'Czy bon turystyczny można wymienić na gotówkę?'),
	claim('plama-zus-nadplata', 'biala_plama', 'Czy ZUS wysyła e-maile z prośbą o podanie danych do zwrotu nadpłaty?'),
	claim('plama-loteria-link', 'biala_plama', 'Czy wiadomość o wygranej w loterii z linkiem do odbioru nagrody jest prawdziwa?'),
	claim('plama-oc-kara', 'biala_plama', 'Czy za brak OC w Polsce grozi kara powyżej 10 tys. zł?'),
	claim('plama-leki-seniorzy', 'biala_plama', 'Czy darmowe leki dla seniorów po 65. roku życia zostaną zlikwidowane?'),
	link('link-epuap', 'Komunikat o ePUAP (gov.pl)', 'www.gov.pl/web/cyfryzacja/epuap-ponownie-dziala-w-pelnym-zakresie'),
	link('link-uokik', 'Strona UOKiK (gov.pl)', 'www.gov.pl/web/uokik'),
	link('link-gis', 'Strona Głównego Inspektora Sanitarnego (gov.pl)', 'www.gov.pl/web/gis'),
];

type Random = () => number;

function takeRandom<T>(items: readonly T[], random: Random): T | undefined {
	if (items.length === 0) return undefined;
	return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

function shuffled<T>(items: readonly T[], random: Random): T[] {
	const copy = [...items];
	for (let index = copy.length - 1; index > 0; index--) {
		const other = Math.min(index, Math.floor(random() * (index + 1)));
		[copy[index], copy[other]] = [copy[other]!, copy[index]!];
	}
	return copy;
}

export function pickExamples(
	pool: readonly ExampleQuery[] = EXAMPLE_POOL,
	random: Random = Math.random,
	avoidIds: readonly string[] = [],
): ExampleQuery[] {
	const chosen: ExampleQuery[] = [];
	function candidates(filter: (example: ExampleQuery) => boolean): ExampleQuery[] {
		const open = pool.filter((example) => filter(example) && !chosen.includes(example));
		const fresh = open.filter((example) => !avoidIds.includes(example.id));
		return fresh.length > 0 ? fresh : open;
	}
	for (const kind of REQUIRED_EXAMPLE_KINDS) {
		const pick = takeRandom(candidates((example) => example.kind === kind), random);
		if (pick) chosen.push(pick);
	}
	while (chosen.length < EXAMPLES_SHOWN) {
		const pick = takeRandom(candidates(() => true), random);
		if (!pick) break;
		chosen.push(pick);
	}
	return shuffled(chosen, random);
}
