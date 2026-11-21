/*
 * Loader bazy incydentów MSZ (tolerancyjny).
 *
 * Wejście: plik JSON (tablica obiektów albo obiekt z tablicą pod kluczem
 * incidents/incydenty/items/data/rows/records/wpisy) lub CSV (separator , ; albo tabulator,
 * cudzysłowy RFC 4180, pierwszy wiersz to nagłówek).
 *
 * Mapowanie nazw pól (wielkość liter, ogonki, spacje i _ są ignorowane):
 *   id          <- id, identyfikator, numer, lp
 *   title       <- title, tytul, nazwa, temat, name
 *   description <- description, opis, tresc, streszczenie, summary, content
 *   date        <- date, data, data_zdarzenia, data_publikacji
 *   country     <- country, kraj, panstwo
 *   keywords    <- keywords, slowa_kluczowe, tagi, tags (tablica albo tekst rozdzielony , ; |)
 *   url         <- url, link, adres
 *
 * Brakujące pola są dozwolone. Wiersz bez title i bez description jest pomijany i liczony
 * w skipped. Rekordy służą wyłącznie do generowania ostrzeżeń (notices); nigdy jako werdykt
 * ani cytat dowodowy.
 */

export interface IncidentRecord {
	id: string;
	title: string;
	description: string;
	date: string | null;
	country: string | null;
	keywords: string[];
	url: string | null;
}

export interface ParseResult {
	records: IncidentRecord[];
	skipped: number;
}

const FIELD_ALIASES: Record<keyof IncidentRecord, string[]> = {
	id: ['id', 'identyfikator', 'numer', 'lp'],
	title: ['title', 'tytul', 'nazwa', 'temat', 'name'],
	description: ['description', 'opis', 'tresc', 'streszczenie', 'summary', 'content'],
	date: ['date', 'data', 'datazdarzenia', 'datapublikacji'],
	country: ['country', 'kraj', 'panstwo'],
	keywords: ['keywords', 'slowakluczowe', 'tagi', 'tags'],
	url: ['url', 'link', 'adres'],
};

const CONTAINER_KEYS = ['incidents', 'incydenty', 'items', 'data', 'rows', 'records', 'wpisy'];

export function normalizeKey(key: string): string {
	return key
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/ł/g, 'l')
		.replace(/Ł/g, 'L')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

function toText(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'string') return value.trim();
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return '';
}

function toKeywords(value: unknown): string[] {
	const parts = Array.isArray(value) ? value.map(toText) : toText(value).split(/[,;|]/);
	return parts.map((part) => part.trim()).filter((part) => part.length > 0);
}

export function normalizeRow(row: unknown, index: number): IncidentRecord | null {
	if (typeof row !== 'object' || row === null || Array.isArray(row)) return null;
	const byKey = new Map<string, unknown>();
	for (const [key, value] of Object.entries(row)) byKey.set(normalizeKey(key), value);
	const pick = (field: keyof IncidentRecord): unknown => {
		for (const alias of FIELD_ALIASES[field]) {
			const value = byKey.get(alias);
			if (Array.isArray(value) ? value.length > 0 : toText(value) !== '') return value;
		}
		return undefined;
	};
	const title = toText(pick('title'));
	const description = toText(pick('description'));
	if (!title && !description) return null;
	return {
		id: toText(pick('id')) || `incident-${index + 1}`,
		title,
		description,
		date: toText(pick('date')) || null,
		country: toText(pick('country')) || null,
		keywords: toKeywords(pick('keywords')),
		url: toText(pick('url')) || null,
	};
}

function collectRows(root: unknown): unknown[] {
	if (Array.isArray(root)) return root;
	if (typeof root !== 'object' || root === null) return [];
	const byKey = new Map(Object.entries(root).map(([key, value]) => [normalizeKey(key), value]));
	for (const key of CONTAINER_KEYS) {
		const value = byKey.get(key);
		if (Array.isArray(value)) return value;
	}
	return [];
}

export function parseCsv(text: string): Record<string, string>[] {
	const source = text.replace(/^\uFEFF/, '');
	const firstLine = source.split(/\r?\n/, 1)[0] ?? '';
	const delimiter = [';', '\t', ','].reduce((best, candidate) => (firstLine.split(candidate).length > firstLine.split(best).length ? candidate : best), ',');
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let quoted = false;
	for (let i = 0; i < source.length; i += 1) {
		const char = source[i];
		if (quoted) {
			if (char === '"' && source[i + 1] === '"') {
				cell += '"';
				i += 1;
			} else if (char === '"') quoted = false;
			else cell += char;
		} else if (char === '"') quoted = true;
		else if (char === delimiter) {
			row.push(cell);
			cell = '';
		} else if (char === '\n' || char === '\r') {
			if (char === '\r' && source[i + 1] === '\n') i += 1;
			row.push(cell);
			cell = '';
			rows.push(row);
			row = [];
		} else cell += char;
	}
	if (cell !== '' || row.length > 0) {
		row.push(cell);
		rows.push(row);
	}
	const [header, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ''));
	if (!header) return [];
	return body.map((values) => Object.fromEntries(header.map((name, i) => [name, values[i] ?? ''])));
}

export function parseIncidents(content: string, format: 'json' | 'csv'): ParseResult {
	let rows: unknown[];
	if (format === 'csv') rows = parseCsv(content);
	else {
		try {
			rows = collectRows(JSON.parse(content));
		} catch {
			return { records: [], skipped: 0 };
		}
	}
	const records: IncidentRecord[] = [];
	let skipped = 0;
	rows.forEach((row, index) => {
		const record = normalizeRow(row, index);
		if (record) records.push(record);
		else skipped += 1;
	});
	return { records, skipped };
}
