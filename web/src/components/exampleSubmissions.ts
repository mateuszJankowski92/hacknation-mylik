import { DEFAULT_ROLE, type Role } from '../roles/config';

export type ExampleKind = 'redakcja' | 'urzad' | 'biala_plama' | 'link';

export interface ExampleQuery {
	id: string;
	label: string;
	text: string;
	kind: ExampleKind;
	role: Role;
}

const LINK_SCHEME = ['https:', '', ''].join('/');

export const EXAMPLES_LABEL = 'Na przykład:';
export const EXAMPLES_REGION_LABEL = 'Przykładowe zgłoszenia';
export const EXAMPLES_SHUFFLE_LABEL = 'Inne przykłady';
export const EXAMPLES_SHOWN = 4;
export const REQUIRED_EXAMPLE_KINDS: readonly ExampleKind[] = ['biala_plama', 'redakcja', 'urzad'];

function claim(id: string, kind: ExampleKind, role: Role, text: string): ExampleQuery {
	return { id, kind, role, label: text, text };
}

function link(id: string, label: string, address: string): ExampleQuery {
	return { id, kind: 'link', role: DEFAULT_ROLE, label, text: `${LINK_SCHEME}${address}` };
}

export const EXAMPLE_POOL: readonly ExampleQuery[] = [
	claim('redakcja-alarm-warszawa', 'redakcja', 'pogodynka', 'Czy w Warszawie policja ogłosiła najwyższy stopień alarmowy?'),
	claim('redakcja-ceny-paliw', 'redakcja', 'kasjer', 'Czy ceny paliw w Polsce są najwyższe w Europie?'),
	claim('redakcja-inflacja-ue', 'redakcja', 'kasjer', 'Czy Polska ma najwyższą inflację w Unii Europejskiej?'),
	claim('urzad-allegro-uokik', 'urzad', 'pogodynka', 'Czy UOKiK nałożył karę na Allegro za greenwashing?'),
	claim('urzad-mandat-bilet', 'urzad', 'pogodynka', 'Czy od nowego roku mandat za jazdę bez biletu wzrośnie do 2000 zł?'),
	claim('urzad-woda-z-kranu', 'urzad', 'pogodynka', 'Czy woda z kranu w Polsce nie nadaje się do picia?'),
	claim('urzad-falszywy-wnuczek', 'urzad', 'pogodynka', 'Czy policja ostrzega przed oszustwem na fałszywego wnuczka?'),
	claim('urzad-czujniki-czadu', 'urzad', 'pogodynka', 'Czy Straż Pożarna zaleca czujniki czadu w domach?'),
	claim('urzad-alkohol-za-kierownica', 'urzad', 'pogodynka', 'Czy w Polsce można prowadzić samochód po jednym piwie?'),
	claim('urzad-dowod-online', 'urzad', 'bibliotekarka', 'Czy wniosek o dowód osobisty można złożyć przez internet?'),
	claim('plama-prawo-jazdy', 'biala_plama', 'bibliotekarka', 'Czy prawo jazdy kategorii B można wymienić w dowolnym urzędzie?'),
	claim('plama-zus-nadplata', 'biala_plama', 'bibliotekarka', 'Czy ZUS wysyła e-maile z prośbą o podanie danych do zwrotu nadpłaty?'),
	claim('plama-igrzyska-la', 'biala_plama', 'sport', 'Czy kolejne igrzyska olimpijskie odbędą się w Los Angeles w 2028 roku?'),
	claim('plama-eurowizja', 'biala_plama', 'sport', 'Czy Polska wystąpi w tegorocznej Eurowizji?'),
	claim('plama-mecz-eliminacji', 'biala_plama', 'pilkarz', 'Czy reprezentacja Polski w piłce nożnej wygrała ostatni mecz eliminacji?'),
	claim('plama-gol-z-rozny', 'biala_plama', 'pilkarz', 'Czy gol zdobyty bezpośrednio z rzutu rożnego w piłce nożnej jest uznawany?'),
	claim('plama-tramwaj-krakow', 'biala_plama', 'konduktor', 'Czy od przyszłego tygodnia w Krakowie bilety na tramwaj będą darmowe dla wszystkich?'),
	claim('plama-bagaz-intercity', 'biala_plama', 'konduktor', 'Czy PKP Intercity wprowadziło opłatę za bagaż podręczny w pociągach?'),
	claim('plama-inpost-oplata', 'biala_plama', 'listonosz', 'Czy InPost podniósł opłaty za odbiór paczki z Paczkomatu?'),
	claim('plama-listy-polecone', 'biala_plama', 'listonosz', 'Czy Poczta Polska doręcza listy polecone także w soboty?'),
	claim('plama-haslo-cert', 'biala_plama', 'slusarz', 'Czy CERT Polska zaleca używanie osobnego hasła do każdego konta?'),
	claim('plama-weryfikacja-dwuetapowa', 'biala_plama', 'slusarz', 'Czy weryfikacja dwuetapowa pomaga zabezpieczyć konto e-mail?'),
	claim('plama-teleskop-webb', 'biala_plama', 'naukowiec', 'Czy teleskop Jamesa Webba odkrył planety poza Układem Słonecznym?'),
	claim('plama-nasa-ksiezyc', 'biala_plama', 'naukowiec', 'Czy NASA planuje powrót ludzi na Księżyc w tym dziesięcioleciu?'),
	claim('plama-grzyby-rezerwat', 'biala_plama', 'lesnik', 'Czy w Polsce wolno zbierać grzyby w rezerwatach przyrody?'),
	claim('plama-zubry-puszcza', 'biala_plama', 'lesnik', 'Czy żubry w Puszczy Białowieskiej są pod ochroną?'),
	claim('plama-matura-matematyka', 'biala_plama', 'nauczyciel', 'Czy matura z matematyki w tym roku jest obowiązkowa?'),
	claim('plama-ferie-zimowe', 'biala_plama', 'nauczyciel', 'Czy ferie zimowe w przyszłym roku zaczną się o tej samej porze we wszystkich województwach?'),
	claim('plama-chleb', 'biala_plama', 'kucharz', 'Czy od jutra w całej Polsce obowiązuje zakaz sprzedaży chleba po godzinie 20?'),
	claim('plama-chleb-lodowka', 'biala_plama', 'kucharz', 'Czy przechowywanie chleba w lodówce sprawia, że szybciej czerstwieje?'),
	claim('plama-oc-kara', 'biala_plama', 'kasjer', 'Czy za brak OC w Polsce grozi kara powyżej 10 tys. zł?'),
	claim('plama-loteria-link', 'biala_plama', 'pogodynka', 'Czy wiadomość o wygranej w loterii z linkiem do odbioru nagrody jest prawdziwa?'),
	link('link-epuap', 'Komunikat o ePUAP (gov.pl)', 'www.gov.pl/web/cyfryzacja/epuap-ponownie-dziala-w-pelnym-zakresie'),
	link('link-uokik', 'Strona UOKiK (gov.pl)', 'www.gov.pl/web/uokik'),
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

const PICK_ATTEMPTS = 120;
const SCORE_WHITE_SPOT = 1000;
const SCORE_ROLE = 100;
const SCORE_FRESH_ROLE = 20;
const SCORE_KIND = 10;
const SCORE_FRESH_ID = 1;
const PENALTY_EXTRA_DEFAULT_ROLE = 10_000;

export function examplesRoleSummary(examples: readonly ExampleQuery[]): { distinct: number; defaults: number } {
	return {
		distinct: new Set(examples.map((example) => example.role)).size,
		defaults: examples.filter((example) => example.role === DEFAULT_ROLE).length,
	};
}

function scoreSelection(chosen: readonly ExampleQuery[], avoidIds: ReadonlySet<string>, avoidRoles: ReadonlySet<Role>): number {
	const { distinct, defaults } = examplesRoleSummary(chosen);
	let score = distinct * SCORE_ROLE;
	if (defaults > 1) score -= (defaults - 1) * PENALTY_EXTRA_DEFAULT_ROLE;
	if (chosen.some((example) => example.kind === 'biala_plama')) score += SCORE_WHITE_SPOT;
	for (const kind of REQUIRED_EXAMPLE_KINDS) {
		if (kind !== 'biala_plama' && chosen.some((example) => example.kind === kind)) score += SCORE_KIND;
	}
	for (const role of new Set(chosen.map((example) => example.role))) {
		if (!avoidRoles.has(role)) score += SCORE_FRESH_ROLE;
	}
	for (const example of chosen) {
		if (!avoidIds.has(example.id)) score += SCORE_FRESH_ID;
	}
	return score;
}

function drawAttempt(pool: readonly ExampleQuery[], random: Random, avoidRoles: ReadonlySet<Role>): ExampleQuery[] {
	const chosen: ExampleQuery[] = [];
	const keepSourceKinds = random() < 0.5;
	function candidates(filter: (example: ExampleQuery) => boolean): ExampleQuery[] {
		const roles = new Set(chosen.map((example) => example.role));
		const open = pool.filter((example) => !chosen.includes(example) && !roles.has(example.role) && filter(example));
		const fresh = open.filter((example) => !avoidRoles.has(example.role));
		return fresh.length > 0 ? fresh : open;
	}
	for (const kind of REQUIRED_EXAMPLE_KINDS) {
		if (kind !== 'biala_plama' && !keepSourceKinds) continue;
		const pick = takeRandom(candidates((example) => example.kind === kind), random);
		if (pick) chosen.push(pick);
	}
	while (chosen.length < EXAMPLES_SHOWN) {
		const pick = takeRandom(candidates(() => true), random) ?? takeRandom(pool.filter((example) => !chosen.includes(example)), random);
		if (!pick) break;
		chosen.push(pick);
	}
	return chosen;
}

export function pickExamples(
	pool: readonly ExampleQuery[] = EXAMPLE_POOL,
	random: Random = Math.random,
	avoidIds: readonly string[] = [],
): ExampleQuery[] {
	const avoidIdSet = new Set(avoidIds);
	const avoidRoles = new Set<Role>(pool.filter((example) => avoidIdSet.has(example.id)).map((example) => example.role));
	let best: ExampleQuery[] = [];
	let bestScore = -Infinity;
	for (let attempt = 0; attempt < PICK_ATTEMPTS; attempt++) {
		const chosen = drawAttempt(shuffled(pool, random), random, avoidRoles);
		const score = scoreSelection(chosen, avoidIdSet, avoidRoles);
		if (score > bestScore) {
			best = chosen;
			bestScore = score;
		}
	}
	return shuffled(best, random);
}
