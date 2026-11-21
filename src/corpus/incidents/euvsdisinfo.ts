/*
 * Znane operacje informacyjne: przypadki z bazy EUvsDisinfo (EEAS East StratCom Task Force).
 *
 * Źródło danych: serwer MCP EUvsDisinfo (narzędzie "cases", stronicowanie offset/limit, limit <= 100),
 * opis: https://euvsdisinfo.eu/public-docs/How_to_grab_all_Articles_and_Cases_from_disinfo.pdf.
 * Dostęp wymaga klucza wydawanego na prośbę (e-mail/formularz), patrz data/known-ops/_terms.json.
 *
 * Zasady użycia (scenariusz I):
 * - wynik dopasowania to WYŁĄCZNIE neutralna informacja w notices (typ dopasowanie_incydentu);
 *   nigdy podstawa werdyktu, nigdy cytat dowodowy (brak passageId);
 * - pola claim/fact to treść zewnętrzna: dane, nie instrukcje.
 *
 * Migawka (scripts/fetch-euvsdisinfo.ts) przechowuje tylko tytuł, skrót twierdzenia (do 200 znaków),
 * datę, słowa kluczowe, kraje i odsyłacz; bez sprostowań (fact). Treść przypadków nigdy nie trafia do modelu.
 *
 * Ograniczenie językowe: przypadki są po angielsku, twierdzenia użytkowników po polsku. Nie tłumaczymy
 * treści. Główna ścieżka: angielskie słowa kluczowe `englishTerms` z kroku wyodrębniania twierdzeń,
 * porównywane w kodzie z tytułem, skrótem, słowami kluczowymi i krajami przypadku (EN_MATCH_RULES).
 * Zapasowo (brak englishTerms) dopasowanie opiera się na "kotwicach": nazwach własnych (słowa z wielkiej litery, skróty),
 * liczbach (co najmniej 2 cyfry) i krótkim słowniku nazw państw/organizacji PL->EN.
 * Wymagamy co najmniej dwóch wspólnych kotwic, w tym jednej, która nie jest nazwą państwa ani rokiem
 * (same państwa i lata występują w tysiącach przypadków). To celowo ostrożne i niekompletne.
 */
import type { ExtractedClaim } from '../../contracts/claim';
import type { Notice } from '../../contracts/record';
import { normalizeKey } from './parse';

export interface KnownOpLink {
	url: string | null;
	archiveUrl: string | null;
	headline: string | null;
	language: string | null;
}

export interface KnownOpRecord {
	id: string;
	source: 'euvsdisinfo';
	title: string;
	/** Twierdzenie (narracja) w ujęciu EUvsDisinfo. */
	claim: string;
	/** Obalenie (pole "fact"/"disproof"), jeśli jest. */
	debunk: string | null;
	/** Data w formacie RRRR-MM-DD albo null. */
	date: string | null;
	countries: string[];
	languages: string[];
	keywords: string[];
	/** Odsyłacz do opisu przypadku na euvsdisinfo.eu. */
	url: string | null;
	/** Odsyłacze do materiałów źródłowych (z archiwum). */
	links: KnownOpLink[];
}

export interface KnownOpsParseResult {
	records: KnownOpRecord[];
	skipped: number;
}

function text(value: unknown): string {
	if (typeof value === 'string') return value.trim();
	if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	return '';
}

function titles(value: unknown): string[] {
	if (!Array.isArray(value)) return text(value) ? [text(value)] : [];
	const out: string[] = [];
	for (const item of value) {
		const name = typeof item === 'object' && item !== null ? text((item as Record<string, unknown>).title ?? (item as Record<string, unknown>).name) : text(item);
		if (name && !out.includes(name)) out.push(name);
	}
	return out;
}

/** Unix (sekundy lub milisekundy) albo tekst daty -> RRRR-MM-DD. */
export function toIsoDate(value: unknown): string | null {
	if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
		const ms = value < 1e11 ? value * 1000 : value;
		const date = new Date(ms);
		return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
	}
	const raw = text(value);
	if (/^\d{9,13}$/.test(raw)) return toIsoDate(Number(raw));
	const match = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
	return match ? match[1] : null;
}

function plainText(value: unknown): string {
	return text(value)
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;|&rsquo;|&lsquo;/g, "'")
		.replace(/\s+/g, ' ')
		.trim();
}

function safeUrl(value: unknown): string | null {
	const raw = text(value);
	return /^https?:\/\//i.test(raw) ? raw : null;
}

export function normalizeCase(row: unknown, index: number): KnownOpRecord | null {
	if (typeof row !== 'object' || row === null || Array.isArray(row)) return null;
	const r = row as Record<string, unknown>;
	const title = plainText(r.title);
	const claim = plainText(r.claim ?? r.summary);
	if (!title && !claim) return null;
	const links: KnownOpLink[] = [];
	const languages: string[] = [];
	if (Array.isArray(r.linksToDisinformation)) {
		for (const item of r.linksToDisinformation) {
			if (typeof item !== 'object' || item === null) continue;
			const l = item as Record<string, unknown>;
			const lang = typeof l.language === 'object' && l.language !== null ? text((l.language as Record<string, unknown>).name) : text(l.language);
			if (lang && !languages.includes(lang)) languages.push(lang);
			links.push({ url: safeUrl(l.url), archiveUrl: safeUrl(l.archiveUrl ?? l.snapShotURL), headline: plainText(l.headLine) || null, language: lang || null });
		}
	}
	return {
		id: text(r.id) || `euvsdisinfo-${index + 1}`,
		source: 'euvsdisinfo',
		title,
		claim,
		debunk: plainText(r.fact ?? r.disproof) || null,
		date: toIsoDate(r.date),
		countries: titles(r.countries),
		languages,
		keywords: titles(r.keywords),
		url: safeUrl(r.url),
		links,
	};
}

/** Najdłuższy skrót twierdzenia przechowywany w migawce (licencja niepotwierdzona). */
export const KNOWN_OP_CLAIM_MAX = 200;

/** Zapis przypadku w migawce: bez sprostowania (fact) i bez odsyłaczy do materiałów źródłowych. */
export interface CompactKnownOpCase {
	id: string;
	title: string;
	claim: string;
	date: string | null;
	keywords: string[];
	countries: string[];
	url: string | null;
}

function shorten(value: string, max: number): string {
	if (value.length <= max) return value;
	const cut = value.slice(0, max - 1);
	const space = cut.lastIndexOf(' ');
	return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Przypadek z serwera -> zwięzły zapis migawki (null, gdy brak id, tytułu i twierdzenia). */
export function compactKnownOpCase(row: unknown, index = 0): CompactKnownOpCase | null {
	const record = normalizeCase(row, index);
	if (!record || !text((row as Record<string, unknown>).id)) return null;
	const url = record.url && /^https:\/\/(www\.)?euvsdisinfo\.eu\//i.test(record.url) ? record.url : null;
	return {
		id: record.id.slice(0, 64),
		title: shorten(record.title, 300),
		claim: shorten(record.claim, KNOWN_OP_CLAIM_MAX),
		date: record.date,
		keywords: record.keywords.slice(0, 30).map((k) => k.slice(0, 80)),
		countries: record.countries.slice(0, 30).map((c) => c.slice(0, 80)),
		url,
	};
}

/**
 * Wejście: odpowiedź narzędzia "cases" (obiekt z structuredContent.cases albo samo structuredContent
 * z polem cases), tablica przypadków albo plik zapisany przez scripts/fetch-euvsdisinfo.ts.
 */
export function parseEuvsdisinfoCases(content: string | unknown): KnownOpsParseResult {
	let root: unknown = content;
	if (typeof content === 'string') {
		try {
			root = JSON.parse(content);
		} catch {
			return { records: [], skipped: 0 };
		}
	}
	const rows = collectCases(root);
	const records: KnownOpRecord[] = [];
	let skipped = 0;
	rows.forEach((row, index) => {
		const record = normalizeCase(row, index);
		if (record) records.push(record);
		else skipped += 1;
	});
	return { records, skipped };
}

function collectCases(root: unknown): unknown[] {
	if (Array.isArray(root)) return root;
	if (typeof root !== 'object' || root === null) return [];
	const r = root as Record<string, unknown>;
	if (Array.isArray(r.cases)) return r.cases;
	for (const key of ['structuredContent', 'result']) if (r[key]) return collectCases(r[key]);
	return [];
}

// ---------------------------------------------------------------- dopasowanie

/** Polskie nazwy (po normalizeKey, rdzeń 5 znaków) -> angielska kotwica. Państwa oznaczone. */
const PL_ALIASES: Array<[string, string, boolean]> = [
	['polsk', 'poland', true], ['polac', 'poland', true], ['ukrai', 'ukraine', true], ['rosja', 'russia', true],
	['rosji', 'russia', true], ['rosyj', 'russia', true], ['niemc', 'germany', true], ['niemi', 'germany', true],
	['bialo', 'belarus', true], ['litwa', 'lithuania', true], ['litwi', 'lithuania', true], ['litew', 'lithuania', true],
	['lotwa', 'latvia', true], ['lotwi', 'latvia', true], ['estoni', 'estonia', true], ['moldaw', 'moldova', true],
	['gruzj', 'georgia', true], ['franc', 'france', true], ['ameryk', 'usa', true], ['stany', 'usa', true],
	['czech', 'czech', true], ['slowa', 'slovakia', true], ['wegry', 'hungary', true], ['wegie', 'hungary', true],
	['rumun', 'romania', true], ['szwec', 'sweden', true], ['finla', 'finland', true], ['izrae', 'israel', true],
	['chiny', 'china', true], ['chin', 'china', true], ['nato', 'nato', false], ['unia', 'eu', false], ['unii', 'eu', false],
	['ue', 'eu', false], ['eu', 'eu', false], ['zelen', 'zelensky', false], ['putin', 'putin', false], ['tusk', 'tusk', false],
	['duda', 'duda', false], ['nawro', 'nawrocki', false], ['covid', 'covid', false], ['koron', 'coronavirus', false],
	['szczep', 'vaccine', false], ['wizy', 'visa', false], ['wiza', 'visa', false], ['schen', 'schengen', false],
	['uchod', 'refugee', false], ['migra', 'migrant', false], ['imigr', 'migrant', false], ['amba', 'embassy', false],
	['konsu', 'consulate', false], ['wybor', 'elections', false], ['wojsk', 'military', false], ['gaz', 'gas', false],
];
const EN_COUNTRIES = new Set(PL_ALIASES.filter(([, , c]) => c).map(([, en]) => en).concat(['us', 'uk', 'russian', 'ukrainian', 'polish', 'european']));
const IGNORED_CAPS = new Set(['the', 'this', 'that', 'and', 'but', 'stan', 'czy', 'jak', 'ten', 'ta', 'to', 'w', 'we', 'na', 'od', 'do', 'po', 'za', 'nie', 'tak', 'kto', 'co', 'pan', 'pani']);

const STEM = 5;
const EN_TERMS = new Set(PL_ALIASES.map(([, en]) => (en.length > STEM ? en.slice(0, STEM) : en)));

function anchorKey(word: string): string {
	const key = normalizeKey(word);
	return key.length > STEM ? key.slice(0, STEM) : key;
}

/** Zamienia słowo (już po normalizeKey) na kotwicę angielską, jeśli jest w słowniku. */
function aliasOf(key: string): string | null {
	for (const [pl, en] of PL_ALIASES) {
		if (pl.length <= 3 ? key === pl : key.startsWith(pl)) return en;
	}
	return null;
}

/**
 * Kotwice tekstu: nazwy własne (wielka litera, nie na początku zdania), skróty (2+ wielkie litery),
 * liczby z co najmniej 2 cyframi oraz słowa ze słownika PL->EN. Kotwice słownikowe i nazwy
 * w zapisie łacińskim porównujemy po 5-znakowym rdzeniu.
 */
export function anchorsOf(input: string): Set<string> {
	const anchors = new Set<string>();
	const words = input.split(/(?<=[.!?])\s+|\s+/u);
	let sentenceStart = true;
	for (const raw of words) {
		const word = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
		const endsSentence = /[.!?]$/.test(raw);
		if (word) {
			const key = normalizeKey(word);
			if (/^\d[\d.,]*$/.test(word)) {
				const digits = word.replace(/\D/g, '');
				if (digits.length >= 2) anchors.add(`#${digits}`);
			} else if (key.length >= 2) {
				const alias = aliasOf(key);
				if (alias) anchors.add(anchorKey(alias));
				else if (key.length >= 3 && EN_TERMS.has(anchorKey(key))) anchors.add(anchorKey(key));
				else {
					const isAcronym = /^\p{Lu}{2,}$/u.test(word);
					const isProper = /^\p{Lu}/u.test(word) && !sentenceStart;
					if ((isAcronym || isProper) && !IGNORED_CAPS.has(key) && key.length >= 3) anchors.add(anchorKey(key));
				}
			}
		}
		sentenceStart = endsSentence || (sentenceStart && !word);
	}
	return anchors;
}

/** Słaba kotwica: nazwa państwa albo rok. Samymi słabymi kotwicami nie dopasowujemy. */
function isWeakAnchor(anchor: string): boolean {
	if (/^#(19|20)\d\d$/.test(anchor)) return true;
	for (const c of EN_COUNTRIES) if (anchorKey(c) === anchor) return true;
	return false;
}

function caseAnchors(record: KnownOpRecord): Set<string> {
	const anchors = anchorsOf([record.title, record.claim].join('. '));
	for (const extra of [...record.countries, ...record.keywords]) {
		for (const part of extra.split(/[\s/,-]+/)) {
			const key = normalizeKey(part);
			if (key.length >= 2 && !IGNORED_CAPS.has(key)) anchors.add(anchorKey(key));
		}
	}
	return anchors;
}

export type KnownOpNotice = Notice & { type: 'dopasowanie_incydentu' };

export interface KnownOpMatch {
	record: KnownOpRecord;
	shared: string[];
}

export interface KnownOpMatchOptions {
	now?: Date;
	limit?: number;
	minSharedAnchors?: number;
}

type MatchClaim = Pick<ExtractedClaim, 'text' | 'searchTerms'> & { englishTerms?: string[] };

// ------------------------------------------------ dopasowanie po angielskich słowach (englishTerms)

const EN_STOPWORDS = new Set(
	('the and for with from that this these those are was were has have had not but its into about over under after before than then they them their there what which who will would could should can may might also more most very such only other some any all one two new says said claim claims').split(' '),
);

/** Lekki rdzeń angielski: małe litery, bez znaków diakrytycznych, bez typowych końcówek. */
export function englishStem(word: string): string {
	let w = word
		.normalize('NFKD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/'s$/, '');
	if (/^\d+$/.test(w)) return `#${w}`;
	if (w.length > 5 && w.endsWith('ies')) w = `${w.slice(0, -3)}y`;
	else if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
	else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
	else if (w.length > 4 && w.endsWith('es') && !w.endsWith('ses')) w = w.slice(0, -2);
	else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
	if (w.length > 4 && w.endsWith('e')) w = w.slice(0, -1);
	return w;
}

export function englishTokens(input: string): Set<string> {
	const out = new Set<string>();
	for (const raw of input.split(/[^\p{L}\p{N}']+/u)) {
		const word = raw.replace(/^'+|'+$/g, '');
		if (!word) continue;
		if (/^\d+$/.test(word)) {
			if (word.length >= 2) out.add(`#${word}`);
			continue;
		}
		if (word.length < 3 && !/^\p{Lu}{2}$/u.test(word)) continue;
		const lower = word.toLowerCase();
		if (EN_STOPWORDS.has(lower)) continue;
		out.add(englishStem(word));
	}
	return out;
}

const EN_WEAK = new Set(
	[...EN_COUNTRIES, 'russia', 'ukraine', 'west', 'western', 'europe', 'eu', 'nato', 'usa', 'us', 'uk', 'america', 'american', 'government', 'country', 'people', 'war', 'state', 'world', 'kremlin', 'moscow', 'kyiv', 'kiev', 'washington', 'brussels', 'warsaw']
		.map(englishStem),
);

interface KnownOpsIndex {
	docs: Array<{ title: Set<string>; all: Set<string> }>;
	df: Map<string, number>;
	size: number;
}

const INDEX_CACHE = new WeakMap<KnownOpRecord[], KnownOpsIndex>();

/** Indeks budowany raz dla tablicy przypadków (19 tys. przypadków: kilkaset ms). */
function knownOpsIndex(records: KnownOpRecord[]): KnownOpsIndex {
	const cached = INDEX_CACHE.get(records);
	if (cached && cached.size === records.length) return cached;
	const df = new Map<string, number>();
	const docs = records.map((r) => {
		const title = englishTokens(r.title);
		const all = englishTokens([r.title, r.claim, ...r.keywords, ...r.countries].join(' '));
		for (const t of all) df.set(t, (df.get(t) ?? 0) + 1);
		return { title, all };
	});
	const index = { docs, df, size: records.length };
	INDEX_CACHE.set(records, index);
	return index;
}

/** Progi celowo ostrożne: lepiej nie pokazać ostrzeżenia niż pokazać nietrafione. */
export const EN_MATCH_RULES = {
	/** Co najmniej tyle wspólnych słów (rdzeni). */
	minShared: 3,
	/** Co najmniej tyle wspólnych słów "mocnych" (nie państwo, nie rok, nie słowo z > 3% przypadków). */
	minStrong: 2,
	/** Udział mocnych słów twierdzenia obecnych w przypadku. */
	minStrongCoverage: 0.8,
	/** Każda mocna nazwa własna z twierdzenia (np. miasto, firma) musi wystąpić w przypadku. */
	requireAllProperNames: true,
	/** Słowo częstsze niż ten udział przypadków (przy co najmniej 200 przypadkach) liczy się jako słabe. */
	commonShare: 0.03,
};

function isWeakEnglish(token: string, index: KnownOpsIndex): boolean {
	if (EN_WEAK.has(token) || /^#(19|20)\d\d$/.test(token) || /^#\d{1,2}$/.test(token)) return true;
	return index.size >= 200 && (index.df.get(token) ?? 0) / index.size > EN_MATCH_RULES.commonShare;
}

function findByEnglishTerms(terms: string[], records: KnownOpRecord[], limit: number): KnownOpMatch[] {
	const index = knownOpsIndex(records);
	const claimTokens = englishTokens(terms.join(' '));
	const strong = [...claimTokens].filter((t) => !isWeakEnglish(t, index));
	if (claimTokens.size < EN_MATCH_RULES.minShared || strong.length < EN_MATCH_RULES.minStrong) return [];
	const properNames = new Set(
		terms
			.flatMap((t) => t.split(/[^\p{L}\p{N}']+/u))
			.filter((w) => /^\p{Lu}/u.test(w))
			.map(englishStem)
			.filter((t) => strong.includes(t)),
	);
	const scored: Array<KnownOpMatch & { coverage: number }> = [];
	index.docs.forEach((doc, i) => {
		const strongShared = strong.filter((t) => doc.all.has(t));
		if (strongShared.length < EN_MATCH_RULES.minStrong) return;
		const coverage = strongShared.length / strong.length;
		if (coverage < EN_MATCH_RULES.minStrongCoverage) return;
		if (EN_MATCH_RULES.requireAllProperNames && [...properNames].some((t) => !doc.all.has(t))) return;
		if (!strongShared.some((t) => doc.title.has(t))) return;
		const shared = [...claimTokens].filter((t) => doc.all.has(t));
		if (shared.length < EN_MATCH_RULES.minShared) return;
		scored.push({ record: records[i]!, shared, coverage });
	});
	return scored
		.sort((a, b) => b.coverage - a.coverage || b.shared.length - a.shared.length || (b.record.date ?? '').localeCompare(a.record.date ?? '') || a.record.id.localeCompare(b.record.id))
		.slice(0, limit)
		.map(({ record, shared }) => ({ record, shared }));
}

/**
 * Podobne przypadki. Gdy twierdzenie ma `englishTerms` (krok wyodrębniania twierdzeń), dopasowanie
 * idzie po angielskich słowach z ostrożnymi progami (EN_MATCH_RULES). Bez nich: kotwice z polskiego
 * tekstu (nazwy własne, liczby, słownik PL->EN).
 */
export function findSimilarKnownOps(claim: MatchClaim, records: KnownOpRecord[], options: KnownOpMatchOptions = {}): KnownOpMatch[] {
	const { limit = 2, minSharedAnchors = 2 } = options;
	const english = (claim.englishTerms ?? []).map((t) => t.trim()).filter(Boolean);
	if (english.length > 0) return findByEnglishTerms(english, records, limit);
	const claimAnchors = anchorsOf([claim.text, ...(claim.searchTerms ?? [])].join('. '));
	if (claimAnchors.size < minSharedAnchors) return [];
	return records
		.map((record) => {
			const recordAnchors = caseAnchors(record);
			const shared = [...claimAnchors].filter((a) => recordAnchors.has(a));
			return { record, shared };
		})
		.filter(({ shared }) => shared.length >= minSharedAnchors && shared.some((a) => !isWeakAnchor(a)))
		.sort((a, b) => b.shared.length - a.shared.length || (b.record.date ?? '').localeCompare(a.record.date ?? '') || a.record.id.localeCompare(b.record.id))
		.slice(0, limit);
}

/**
 * Tekst dla obywatela: krótkie zdania, bez słów zakazanych i bez form "być".
 * Tytuł przypadku w oryginale (po angielsku), bez tłumaczenia; data i odsyłacz do opisu.
 */
export function knownOpNoticeText(record: KnownOpRecord, asOf: string): string {
	const title = shorten((record.title || record.claim).replace(/[„”"«»]/g, "'").replace(/\s+/g, ' ').trim(), 140);
	const parts = [
		`Stan na ${asOf}.`,
		'Podobne twierdzenie pojawiało się w znanych operacjach informacyjnych.',
		'Opisała je strona EUvsDisinfo, prowadzona przy Unii Europejskiej.',
		`Tytuł opisu po angielsku: „${title}”${record.date ? ` (${record.date})` : ''}.`,
	];
	if (record.url) parts.push(`Opis: ${record.url}`);
	parts.push('To tylko informacja, nie ocena.', 'Nie mówi, czy Twoja wiadomość to prawda.');
	return parts.join(' ');
}

export function matchKnownOps(claim: MatchClaim, records: KnownOpRecord[], options: KnownOpMatchOptions = {}): KnownOpNotice[] {
	const asOf = (options.now ?? new Date()).toISOString().slice(0, 10);
	return findSimilarKnownOps(claim, records, options).map(({ record }) => ({ type: 'dopasowanie_incydentu' as const, text: knownOpNoticeText(record, asOf) }));
}
