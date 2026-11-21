import { existsSync, mkdirSync, readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '../../src/corpus/catalog';
import { ingestCatalog } from '../../src/corpus/ingest';
import { createSearcher } from '../../src/corpus/search';
import { openDb } from '../../src/db/open';

const ROOT = resolve(__dirname, '../..');

describe('katalog źródeł (data/sources.json)', () => {
	const catalog = loadCatalog(join(ROOT, 'data/sources.json'));
	const documents = catalog.sources.flatMap((source) => source.documents.map((doc) => ({ source, doc })));

	it('spełnia progi: >= 100 dokumentów, >= 10 domen, >= 2 typy źródeł', () => {
		expect(documents.length).toBeGreaterThanOrEqual(100);
		expect(new Set(catalog.sources.filter((s) => s.documents.length > 0).map((s) => s.domain)).size).toBeGreaterThanOrEqual(10);
		expect(new Set(catalog.sources.filter((s) => s.documents.length > 0).map((s) => s.sourceType)).size).toBeGreaterThanOrEqual(2);
	});

	it('każde źródło ma licencję oraz zasady kwalifikacji, aktualizacji i wykluczania', () => {
		for (const source of catalog.sources) {
			expect(source.license.length, source.id).toBeGreaterThan(20);
			expect(source.policy?.qualification, source.id).toBeTruthy();
			expect(source.policy?.update, source.id).toBeTruthy();
			expect(source.policy?.exclusion, source.id).toBeTruthy();
		}
	});

	it('identyfikatory i adresy dokumentów są unikalne, pliki istnieją, adresy to https', () => {
		const ids = documents.map(({ doc }) => doc.id);
		const urls = documents.map(({ doc }) => doc.url);
		expect(new Set(ids).size).toBe(ids.length);
		expect(new Set(urls).size).toBe(urls.length);
		for (const { doc } of documents) {
			expect(doc.url.startsWith('https://'), doc.id).toBe(true);
			expect(existsSync(join(ROOT, doc.file)), doc.id).toBe(true);
		}
	});

	it('valid_until nie jest wcześniejsze niż data publikacji', () => {
		for (const { doc } of documents) {
			if (doc.validUntil && doc.publishedAt) expect(doc.validUntil >= doc.publishedAt, doc.id).toBe(true);
		}
	});

	it('źródła z ograniczoną licencją mają limit fragmentu', () => {
		for (const source of catalog.sources) {
			if (source.sourceType === 'factcheck') expect(source.discovery?.excerptChars, source.id).toBeLessThanOrEqual(1000);
		}
	});
});

describe('ingest: valid_until, asOf i opis zasad', () => {
	function fixture() {
		const root = mkdtempSync(join(tmpdir(), 'mylik-catalog-'));
		mkdirSync(join(root, 'data/raw'), { recursive: true });
		writeFileSync(join(root, 'data/raw/d-1.txt'), 'Ograniczenie ruchu na przejściu granicznym obowiązuje do 15.12.2026 r.');
		writeFileSync(
			join(root, 'data/raw/_fetched.json'),
			JSON.stringify({ 'd-1': '2026-11-20T10:00:00.000Z' }),
		);
		const catalogPath = join(root, 'sources.json');
		writeFileSync(
			catalogPath,
			JSON.stringify({
				version: 1,
				sources: [
					{
						id: 'd',
						publisher: 'Wydawca',
						domain: 'd.example',
						sourceType: 'urzedowe',
						license: 'licencja testowa dla źródła',
						policy: { qualification: 'kw', update: 'akt', exclusion: 'wyk' },
						documents: [{ id: 'd-1', title: 'Ograniczenie', url: 'https://d.example/1', publishedAt: '2026-11-19', validUntil: '2026-12-15', file: 'data/raw/d-1.txt' }],
					},
				],
			}),
		);
		return { root, catalogPath };
	}

	it('zapisuje valid_until i udostępnia je we fragmentach oraz asOf z daty pobrania', async () => {
		const { root, catalogPath } = fixture();
		const db = openDb(':memory:');
		ingestCatalog(db, catalogPath, root);
		const searcher = createSearcher(db);
		const results = await searcher.search('ograniczenie ruchu na przejściu granicznym');
		expect(results[0]?.meta.validUntil).toBe('2026-12-15');
		expect(results[0]?.meta.fetchedAt).toBe('2026-11-20T10:00:00.000Z');
		expect(searcher.asOf?.()).toBe('2026-11-20T10:00:00.000Z');
		const asOf = db.prepare("SELECT value FROM corpus_meta WHERE key = 'as_of'").get() as { value: string };
		expect(asOf.value).toBe('2026-11-20T10:00:00.000Z');
		const notes = db.prepare("SELECT notes FROM sources WHERE id = 'd'").get() as { notes: string };
		expect(notes.notes).toContain('Kwalifikacja: kw');
		expect(notes.notes).toContain('Wykluczanie: wyk');
	});

	it('zmiana valid_until zmienia wersję korpusu', () => {
		const { root, catalogPath } = fixture();
		const before = ingestCatalog(openDb(':memory:'), catalogPath, root).version;
		const raw = JSON.parse(readFileSync(catalogPath, 'utf8'));
		raw.sources[0].documents[0].validUntil = '2026-12-31';
		writeFileSync(catalogPath, JSON.stringify(raw));
		expect(ingestCatalog(openDb(':memory:'), catalogPath, root).version).not.toBe(before);
	});
});
