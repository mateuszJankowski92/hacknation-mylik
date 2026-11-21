import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { anchorsOf, findSimilarKnownOps, loadKnownOpsDir, matchKnownOps, parseEuvsdisinfoCases, toIsoDate } from '../../../src/corpus/incidents';
import { NoticeSchema } from '../../../src/contracts/record';
import { averageSentenceLength, findForbiddenForms, splitSentences } from '../../../src/render/metrics';

// DANE TESTOWE: fikcyjne przypadki w kształcie odpowiedzi narzędzia "cases" (bez sieci).
const RESPONSE = {
	result: {
		content: [{ type: 'text', text: 'Returning 3 cases (offset 0)' }],
		structuredContent: {
			total: 3,
			offset: 0,
			limit: 100,
			cases: [
				{
					id: 'fake-1',
					title: 'Poland will close the Schengen border with Lithuania',
					claim: '<p>Warsaw plans to close the border with Lithuania for 90 days.</p>',
					fact: 'No such decision exists.',
					date: 1767225600,
					keywords: [{ _id: 'k1', title: 'Schengen' }, { _id: 'k2', title: 'Migration' }],
					countries: [{ _id: 'c1', title: 'Poland' }, { _id: 'c2', title: 'Lithuania' }],
					linksToDisinformation: [
						{ archiveUrl: 'http://web.archive.org/web/1/https://example.invalid/a', headLine: 'Fake headline', language: { id: 'rus', name: 'Russian' }, url: 'https://example.invalid/a' },
						{ url: 'javascript:alert(1)', language: 'German' },
					],
					url: 'https://euvsdisinfo.eu/report/test-fake-1/',
				},
				{ id: 'fake-2', title: 'Poland is a failed state', claim: 'Poland in 2026 collapses.', date: '2026-02-01 10:00:00', countries: [{ title: 'Poland' }] },
				{ id: 'fake-3' },
			],
		},
	},
};

describe('parseEuvsdisinfoCases (dane testowe)', () => {
	it('mapuje twierdzenie, obalenie, datę, kraje, języki i odsyłacze', () => {
		const { records, skipped } = parseEuvsdisinfoCases(JSON.stringify(RESPONSE));
		expect(skipped).toBe(1);
		expect(records).toHaveLength(2);
		const [first, second] = records;
		expect(first).toMatchObject({
			id: 'fake-1',
			source: 'euvsdisinfo',
			claim: 'Warsaw plans to close the border with Lithuania for 90 days.',
			debunk: 'No such decision exists.',
			date: '2026-01-01',
			countries: ['Poland', 'Lithuania'],
			languages: ['Russian', 'German'],
			keywords: ['Schengen', 'Migration'],
			url: 'https://euvsdisinfo.eu/report/test-fake-1/',
		});
		expect(first.links[1].url).toBeNull();
		expect(second.date).toBe('2026-02-01');
		expect(second.debunk).toBeNull();
	});

	it('przyjmuje samo structuredContent, tablicę i odrzuca zły JSON', () => {
		expect(parseEuvsdisinfoCases(RESPONSE.result.structuredContent).records).toHaveLength(2);
		expect(parseEuvsdisinfoCases(RESPONSE.result.structuredContent.cases).records).toHaveLength(2);
		expect(parseEuvsdisinfoCases('{zly')).toEqual({ records: [], skipped: 0 });
		expect(toIsoDate(1626220800000)).toBe('2021-07-14');
		expect(toIsoDate('brak')).toBeNull();
	});
});

describe('dopasowanie do polskich twierdzeń (dane testowe)', () => {
	const { records } = parseEuvsdisinfoCases(RESPONSE);
	const now = new Date('2026-11-21T10:00:00Z');

	it('kotwice łączą polskie odmiany z angielskimi nazwami', () => {
		const anchors = anchorsOf('Polska zamknie granicę z Litwą na 90 dni, mówi rząd w Warszawie.');
		expect(anchors.has('polan')).toBe(true);
		expect(anchors.has('lithu')).toBe(true);
		expect(anchors.has('#90')).toBe(true);
	});

	it('daje neutralną informację z datą, odsyłaczem i bez cytatu dowodowego', () => {
		const notices = matchKnownOps({ text: 'Polska zamknie granicę z Litwą na 90 dni. Koniec strefy Schengen.' }, records, { now });
		expect(notices).toHaveLength(1);
		const [notice] = notices;
		expect(NoticeSchema.safeParse(notice).success).toBe(true);
		expect(notice.type).toBe('dopasowanie_incydentu');
		expect(notice).not.toHaveProperty('passageId');
		expect(notice.text).toContain('Stan na 2026-11-21');
		expect(notice.text).toContain('https://euvsdisinfo.eu/report/test-fake-1/');
		expect(notice.text).toContain('nie mówi, czy Twoja wiadomość to prawda');
	});

	it('tekst prosty: krótkie zdania, bez słów zakazanych i form "być"', () => {
		const [notice] = matchKnownOps({ text: 'Polska zamknie granicę z Litwą na 90 dni.' }, records, { now });
		const banned = /korpus|werdykt|weryfikacj|fragment|rekord|dowód źródłowy|siła podstawy|stanowisk|wstrzyman|prompt|model|kanał|incydent|artefakt/i;
		const outsideQuotes = notice.text.replace(/„[^”]*”/g, '');
		expect(outsideQuotes).not.toMatch(banned);
		expect(findForbiddenForms(notice.text)).toEqual([]);
		for (const sentence of splitSentences(notice.text)) expect(sentence.split(/\s+/).length).toBeLessThanOrEqual(20);
		expect(averageSentenceLength([notice.text])).toBeLessThanOrEqual(12);
	});

	it('nie dopasowuje po samym państwie i roku ani bez związku', () => {
		expect(findSimilarKnownOps({ text: 'W 2026 roku Polska ma nowy budżet.' }, records)).toEqual([]);
		expect(matchKnownOps({ text: 'Jutro będzie słonecznie.' }, records, { now })).toEqual([]);
		expect(matchKnownOps({ text: 'Polska i Litwa.' }, records, { now })).toEqual([]);
	});
});

describe('loadKnownOpsDir (dane testowe)', () => {
	it('czyta pliki stron, pomija _terms.json i duplikaty', () => {
		const dir = mkdtempSync(join(tmpdir(), 'mylik-known-ops-'));
		writeFileSync(join(dir, 'cases-000000.json'), JSON.stringify(RESPONSE.result.structuredContent));
		writeFileSync(join(dir, 'cases-000100.json'), JSON.stringify({ cases: [RESPONSE.result.structuredContent.cases[0]] }));
		writeFileSync(join(dir, '_terms.json'), JSON.stringify({ cases: [{ id: 'x', title: 'nie wczytywać' }] }));
		const { records, skipped } = loadKnownOpsDir(dir);
		expect(records.map((r) => r.id)).toEqual(['fake-1', 'fake-2']);
		expect(skipped).toBe(1);
		expect(loadKnownOpsDir('/nie/istnieje/mylik')).toEqual({ records: [], skipped: 0 });
	});
});
