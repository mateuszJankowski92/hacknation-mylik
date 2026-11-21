import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '../../src/corpus/catalog';

const ROOT = resolve(__dirname, '../..');

describe('katalog źródeł urzędowych z ostrzeżeniami dla obywateli', () => {
	const catalog = loadCatalog(join(ROOT, 'data/sources.json'));

	it('zawiera źródła ostrzeżeń: UOKiK, NASK, CERT Polska, sanepid, policja, finanse', () => {
		const ids = new Set(catalog.sources.map((source) => source.id));
		for (const id of ['uokik', 'nask', 'cert', 'gov-sanepid', 'policja', 'gov-finanse', 'gov-kas', 'gov-gis', 'gov-rcb']) {
			expect(ids.has(id), id).toBe(true);
		}
	});

	it('źródła urzędowe z wyszukiwaniem mają zakres po https i limit nowych dokumentów', () => {
		for (const source of catalog.sources) {
			for (const seed of source.discovery?.seeds ?? []) expect(seed.url.startsWith('https://'), source.id).toBe(true);
			if (source.discovery) expect(source.discovery.maxNew, source.id).toBeGreaterThan(0);
		}
	});

	it('lista źródeł pominiętych ma powód i datę sprawdzenia', () => {
		const skipped = JSON.parse(readFileSync(join(ROOT, 'data/skipped-sources.json'), 'utf8')) as { publisher: string; reason: string; checkedAt: string }[];
		expect(skipped.length).toBeGreaterThan(0);
		for (const entry of skipped) {
			expect(entry.publisher.length).toBeGreaterThan(3);
			expect(entry.reason.length).toBeGreaterThan(20);
			expect(entry.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		}
	});
});
