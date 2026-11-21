import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findIncidentsFile, loadIncidentsFile, matchIncidents, parseIncidents } from '../../../src/corpus/incidents';
import { NoticeSchema } from '../../../src/contracts/record';

// DANE TESTOWE: wszystkie próbki są fikcyjne, nie pochodzą z bazy MSZ.
const TEST_JSON = JSON.stringify({
	Incydenty: [
		{ ID: 'T1', Tytuł: 'Fikcyjna kampania o zamknięciu konsulatu w Ruritanii', Opis: 'Testowy wpis o fałszywym komunikacie dotyczącym konsulatu.', Data: '2026-03-01', Kraj: 'Ruritania', 'Słowa kluczowe': 'konsulat, komunikat' },
		{ id: 'T2', title: 'Test incident about fake visa fees', description: 'Fictional sample', keywords: ['visa'] },
		{ id: 'T3' },
		'zepsuty',
	],
});
const TEST_CSV = 'id;tytuł;opis;kraj\nC1;Fikcyjny incydent z paszportami;Testowy opis;Utopia\nC2;;;\n"C3";"Wpis, z przecinkiem";"Linia ""cytat""";Narnia\n';

describe('parseIncidents (dane testowe)', () => {
	it('mapuje pola PL/EN i liczy pominięte wiersze', () => {
		const { records, skipped } = parseIncidents(TEST_JSON, 'json');
		expect(records).toHaveLength(2);
		expect(skipped).toBe(2);
		expect(records[0]).toMatchObject({ id: 'T1', country: 'Ruritania', date: '2026-03-01', keywords: ['konsulat', 'komunikat'] });
		expect(records[1]).toMatchObject({ title: 'Test incident about fake visa fees', keywords: ['visa'], date: null });
	});

	it('czyta CSV z separatorem ; i cudzysłowami', () => {
		const { records, skipped } = parseIncidents(TEST_CSV, 'csv');
		expect(records.map((r) => r.id)).toEqual(['C1', 'C3']);
		expect(skipped).toBe(1);
		expect(records[1].description).toBe('Linia "cytat"');
	});

	it('niepoprawny JSON daje pusty wynik', () => {
		expect(parseIncidents('{nie json', 'json')).toEqual({ records: [], skipped: 0 });
	});
});

describe('matchIncidents (dane testowe)', () => {
	const { records } = parseIncidents(TEST_JSON, 'json');
	const now = new Date('2026-11-21T10:00:00Z');

	it('zwraca tylko neutralne notices z datą stanu', () => {
		const notices = matchIncidents({ text: 'Konsulat w Ruritanii zostanie zamknięty, głosi komunikat.' }, records, { now });
		expect(notices).toHaveLength(1);
		expect(notices[0].type).toBe('dopasowanie_incydentu');
		expect(notices[0].text).toContain('Stan na 2026-11-21');
		expect(notices[0].text).toContain('nie ocena prawdziwości');
		expect(NoticeSchema.safeParse(notices[0]).success).toBe(true);
		expect(notices[0]).not.toHaveProperty('passageId');
	});

	it('nie dopasowuje przy jednym wspólnym słowie ani bez związku', () => {
		expect(matchIncidents({ text: 'Konsulat przyjmuje wnioski.' }, records, { now })).toEqual([]);
		expect(matchIncidents({ text: 'Pogoda jutro będzie słoneczna.' }, records, { now })).toEqual([]);
	});

	it('używa searchTerms', () => {
		const notices = matchIncidents({ text: 'Opłaty', searchTerms: ['visa', 'fake'] }, records, { now });
		expect(notices).toHaveLength(1);
	});
});

describe('findIncidentsFile (dane testowe)', () => {
	it('znajduje plik po wzorcu nazwy i wczytuje go', () => {
		const dir = mkdtempSync(join(tmpdir(), 'mylik-inc-'));
		expect(findIncidentsFile(dir)).toBeNull();
		writeFileSync(join(dir, 'inne.json'), '[]');
		writeFileSync(join(dir, 'Baza_Incydentow_MSZ.csv'), TEST_CSV);
		const path = findIncidentsFile(dir);
		expect(path).toContain('Baza_Incydentow_MSZ.csv');
		expect(loadIncidentsFile(path as string).records).toHaveLength(2);
	});

	it('brak katalogu daje null', () => {
		expect(findIncidentsFile('/nie/istnieje/mylik')).toBeNull();
	});
});
