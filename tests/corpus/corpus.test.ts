import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { chunkText } from '../../src/corpus/chunk';
import { ingestCatalog } from '../../src/corpus/ingest';
import { buildFtsQuery } from '../../src/corpus/query';
import { createSearcher } from '../../src/corpus/search';
import { openDb } from '../../src/db/open';

function makeFixture(overrides: Record<string, string> = {}) {
	const root = mkdtempSync(join(tmpdir(), 'mylik-corpus-'));
	mkdirSync(join(root, 'data/raw'), { recursive: true });
	const files: Record<string, string> = {
		'a-1': 'Ambasada Rzeczypospolitej Polskiej udziela pomocy konsularnej obywatelom polskim za granicą.\n\nW razie utraty paszportu należy zgłosić się do konsulatu.',
		'b-1': 'Wiza krótkoterminowa uprawnia do pobytu w strefie Schengen przez 90 dni w okresie 180 dni.',
		'c-1': 'Dezinformacja o polityce zagranicznej bywa rozpowszechniana w mediach społecznościowych.',
		...overrides,
	};
	for (const [id, text] of Object.entries(files)) writeFileSync(join(root, `data/raw/${id}.txt`), text);
	const catalog = {
		version: 1,
		sources: [
			{ id: 'a', publisher: 'Wydawca A', domain: 'a.example', sourceType: 'urzedowe', license: 'test', documents: [{ id: 'a-1', title: 'Pomoc konsularna', url: 'https://a.example/1', publishedAt: '2026-01-15', file: 'data/raw/a-1.txt' }] },
			{ id: 'b', publisher: 'Wydawca B', domain: 'b.example', sourceType: 'prawo', license: 'test', documents: [{ id: 'b-1', title: 'Wizy', url: 'https://b.example/1', publishedAt: null, file: 'data/raw/b-1.txt' }] },
			{ id: 'c', publisher: 'Wydawca C', domain: 'c.example', sourceType: 'factcheck', license: 'test', documents: [{ id: 'c-1', title: 'Dezinformacja', url: 'https://c.example/1', publishedAt: '2026-02-01', file: 'data/raw/c-1.txt' }] },
		],
	};
	const catalogPath = join(root, 'sources.json');
	writeFileSync(catalogPath, JSON.stringify(catalog));
	return { root, catalogPath };
}

describe('chunkText', () => {
	it('nie zwraca pustych fragmentów i respektuje maksimum', () => {
		const sentence = 'To jest przykładowe zdanie o długości kilkudziesięciu znaków. ';
		const text = `${sentence.repeat(40)}\n\n\n\n${sentence.repeat(5)}\n\n   \n`;
		const chunks = chunkText(text);
		expect(chunks.length).toBeGreaterThan(1);
		for (const chunk of chunks) {
			expect(chunk.trim().length).toBeGreaterThan(0);
			expect(chunk.length).toBeLessThanOrEqual(900);
		}
	});

	it('zwraca jeden fragment dla krótkiego tekstu i pustą listę dla pustego', () => {
		expect(chunkText('Krótki tekst.')).toEqual(['Krótki tekst.']);
		expect(chunkText('  \n\n ')).toEqual([]);
	});

	it('tnie bardzo długie słowa bez spacji', () => {
		const chunks = chunkText('x'.repeat(2000));
		expect(chunks.every((chunk) => chunk.length <= 900)).toBe(true);
	});
});

describe('ingest', () => {
	it('zlicza dokumenty i fragmenty, wersja jest stabilna, zmiana treści zmienia wersję', () => {
		const fixture = makeFixture();
		const db = openDb(':memory:');
		const first = ingestCatalog(db, fixture.catalogPath, fixture.root);
		const second = ingestCatalog(db, fixture.catalogPath, fixture.root);
		expect(first.documents).toBe(3);
		expect(first.passages).toBeGreaterThanOrEqual(3);
		expect(second).toEqual(first);
		expect(first.version).toMatch(/^[0-9a-f]{12}$/);
		expect(createSearcher(db).corpusVersion()).toBe(first.version);

		const changed = makeFixture({ 'b-1': 'Wiza krótkoterminowa uprawnia do pobytu przez 60 dni.' });
		const third = ingestCatalog(openDb(':memory:'), changed.catalogPath, changed.root);
		expect(third.version).not.toBe(first.version);
	});

	it('pusty korpus ma wersję "empty"', () => {
		expect(createSearcher(openDb(':memory:')).corpusVersion()).toBe('empty');
	});
});

describe('search', () => {
	let searcher: ReturnType<typeof createSearcher>;
	beforeEach(() => {
		const fixture = makeFixture();
		const db = openDb(':memory:');
		ingestCatalog(db, fixture.catalogPath, fixture.root);
		searcher = createSearcher(db);
	});

	it('znajduje fragment mimo fleksji (ambasadzie -> ambasada)', async () => {
		const results = await searcher.search('Co robić w ambasadzie?');
		expect(results[0]?.documentId).toBe('a-1');
	});

	it('obsługuje diakrytyki i zwraca kompletne meta oraz dodatni score', async () => {
		const results = await searcher.search('pomoc konsularna za granicą');
		expect(results.length).toBeGreaterThan(0);
		const top = results[0];
		expect(top.id).toBe('a-1#0');
		expect(top.score).toBeGreaterThan(0);
		expect(top.meta).toMatchObject({
			documentId: 'a-1',
			sourceId: 'a',
			title: 'Pomoc konsularna',
			publisher: 'Wydawca A',
			domain: 'a.example',
			url: 'https://a.example/1',
			publishedAt: '2026-01-15',
			sourceType: 'urzedowe',
			license: 'test',
		});
		expect(top.meta.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it('zapytania ze znakami specjalnymi FTS nie rzucają wyjątku', async () => {
		for (const query of ['"', 'wiza*', 'NEAR(', 'a AND OR NOT "x', '(((', 'wiza" OR "', '', '   ', 'a b']) {
			await expect(searcher.search(query)).resolves.toBeInstanceOf(Array);
		}
		expect(buildFtsQuery('wiza" NEAR( x*')).toBe('"wiza" OR "near"');
	});

	it('respektuje limit i zwraca [] bez wyników', async () => {
		expect((await searcher.search('wiza pomoc dezinformacja', { limit: 1 })).length).toBe(1);
		expect(await searcher.search('zzzzqqqq')).toEqual([]);
	});

	it('getPassage i stats działają', () => {
		expect(searcher.getPassage('b-1#0')?.meta.title).toBe('Wizy');
		expect(searcher.getPassage('nie-ma#0')).toBeNull();
		expect(searcher.stats()).toEqual({ documents: 3, domains: 3, sourceTypes: 3 });
	});
});
