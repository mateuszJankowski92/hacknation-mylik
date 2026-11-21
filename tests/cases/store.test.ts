import { describe, expect, it } from 'vitest';
import { casesToCsv, casesToJson, csvCell } from '../../src/cases/export';
import { createCaseStore, type CaseStore } from '../../src/cases/store';
import { CASE_SAVED_SENTENCE_PL, casePublicSentencePl } from '../../src/cases/texts';
import { safeText, trackRecord, withCaseTracking } from '../../src/cases/track';
import type { CaseSearchInfo } from '../../src/cases/types';
import {
	VerificationRecordSchema,
	VerifyOutcomeSchema,
	type ClaimResult,
	type Engine,
	type VerificationRecord,
	type VerifyInput,
	type VerifyOutcome,
} from '../../src/contracts/index';
import { openDb } from '../../src/db/open';

const INFO: CaseSearchInfo = {
	claimKind: 'faktograficzna',
	searchTerms: ['kometa'],
	counterTerms: [],
	refutationPerformed: true,
	refutationQueries: ['kometa nie'],
	refutationFound: 0,
	abstainReason: 'Brak źródeł.',
	strengthReasons: ['brak dowodów w korpusie'],
	limitations: [],
	evidenceCount: 0,
};

function id64(n: number): string {
	return n.toString(16).padStart(64, '0');
}

function store(startIso = '2026-11-21T10:00:00.000Z'): { store: CaseStore; tick: (minutes: number) => void } {
	let t = new Date(startIso).getTime();
	const db = openDb(':memory:');
	return { store: createCaseStore(db, () => new Date(t)), tick: (m) => (t += m * 60_000) };
}

function claim(text: string, verdict: ClaimResult['verdict'], idNumber = 1): ClaimResult {
	return {
		claim: { id: `c${idNumber}`, text, kind: 'faktograficzna', searchTerms: ['kometa', 'Zakopane'], counterTerms: ['brak'] },
		verdict,
		strength: { level: 'brak', reasons: ['brak_dowodow'] },
		explanation: 'Nie wiem.',
		explanationSource: 'szablon',
		evidence: [],
		limitations: [],
		abstainReason: verdict === 'brak_wystarczajacych_dowodow' ? 'Źródła nie dotykają tej sprawy.' : undefined,
		refutation: { performed: true, queries: ['kometa zakopane'], found: 0 },
	};
}

function record(n: number, claims: ClaimResult[]): VerificationRecord {
	return VerificationRecordSchema.parse({
		id: id64(n),
		inputHash: id64(n + 1000),
		corpusVersion: 'test',
		inputKind: 'tekst',
		maskedInput: 'tekst',
		piiMasked: [],
		claims,
		notices: [],
		injectionSignals: [],
		createdAt: '2026-11-21T10:00:00.000Z',
		asOf: '2026-11-21T10:00:00.000Z',
		shortAnswer: 'Nie wiem. Stan na 21.11.2026.',
		provider: 'mock',
		usage: { llmCalls: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, latencyMs: 1 },
		schemaVersion: 2,
	});
}

describe('sprawy urzędnika: zapis i deduplikacja', () => {
	it('pierwsze zgłoszenie tworzy sprawę ze stanem "nowa" i licznikiem 1', () => {
		const { store: s } = store();
		const r = s.recordReport({ claimText: 'Kometa przeleciała nad Zakopanem.', searchInfo: INFO, recordId: id64(1), channel: 'www' });
		expect(r).toMatchObject({ created: true, reportCount: 1, reopened: false });
		const item = s.get(r.caseId)!;
		expect(item).toMatchObject({ state: 'nowa', reportCount: 1, channels: { www: 1 }, note: '', forwardedAt: null });
		expect(item.records.map((x) => x.recordId)).toEqual([id64(1)]);
		expect(s.pendingCount()).toBe(1);
	});

	it('podobne zgłoszenie: jedna sprawa, licznik 2, kanały, pierwsze i ostatnie zgłoszenie', () => {
		const { store: s, tick } = store();
		const a = s.recordReport({ claimText: 'Kometa Halleya przeleciała nisko nad Zakopanem w nocy.', searchInfo: INFO, recordId: id64(1), channel: 'www' });
		tick(30);
		const b = s.recordReport({ claimText: 'Podobno kometa Halleya przeleciała nisko nad Zakopanem w nocy!', searchInfo: INFO, recordId: id64(2), channel: 'sms' });
		expect(b.caseId).toBe(a.caseId);
		expect(b).toMatchObject({ created: false, reportCount: 2 });
		const item = s.get(a.caseId)!;
		expect(item.reportCount).toBe(2);
		expect(item.channels).toEqual({ www: 1, sms: 1 });
		expect(item.firstSeen).toBe('2026-11-21T10:00:00.000Z');
		expect(item.lastSeen).toBe('2026-11-21T10:30:00.000Z');
		expect(item.records.map((x) => x.recordId).sort()).toEqual([id64(1), id64(2)]);
		expect(s.list()).toHaveLength(1);
	});

	it('ten sam rekord zgłoszony ponownie liczy powtórzenie, ale nie dubluje odsyłacza', () => {
		const { store: s } = store();
		const a = s.recordReport({ claimText: 'Kometa Halleya przeleciała nisko nad Zakopanem.', searchInfo: INFO, recordId: id64(1), channel: 'www' });
		s.recordReport({ claimText: 'Kometa Halleya przeleciała nisko nad Zakopanem.', searchInfo: INFO, recordId: id64(1), channel: 'www' });
		const item = s.get(a.caseId)!;
		expect(item.reportCount).toBe(2);
		expect(item.records).toHaveLength(1);
	});

	it('różne twierdzenia to różne sprawy; lista wg liczby powtórzeń', () => {
		const { store: s } = store();
		s.recordReport({ claimText: 'Kometa Halleya przeleciała nisko nad Zakopanem.', searchInfo: INFO, recordId: id64(1), channel: 'www' });
		s.recordReport({ claimText: 'Rząd planuje wprowadzenie nowego podatku od zwierząt domowych.', searchInfo: INFO, recordId: id64(2), channel: 'www' });
		s.recordReport({ claimText: 'Rząd planuje wprowadzić nowy podatek od zwierząt domowych.', searchInfo: INFO, recordId: id64(3), channel: 'www' });
		const list = s.list();
		expect(list).toHaveLength(2);
		expect(list[0]!.reportCount).toBe(2);
		expect(list[0]!.claimText).toContain('Rząd');
	});

	it('zamknięta sprawa wraca do stanu "nowa" po nowym zgłoszeniu', () => {
		const { store: s } = store();
		const a = s.recordReport({ claimText: 'Kometa Halleya przeleciała nisko nad Zakopanem.', searchInfo: INFO, recordId: id64(1), channel: 'www' });
		s.setState(a.caseId, 'zamknieta');
		expect(s.pendingCount()).toBe(0);
		const b = s.recordReport({ claimText: 'Kometa Halleya przeleciała nisko nad Zakopanem.', searchInfo: INFO, recordId: id64(2), channel: 'www' });
		expect(b.reopened).toBe(true);
		expect(s.get(a.caseId)!.state).toBe('nowa');
	});

	it('stan i notatka; przekazanie ustawia osobę, datę i przesuwa "nowa" do "w toku"', () => {
		const { store: s, tick } = store();
		const a = s.recordReport({ claimText: 'Kometa Halleya przeleciała nisko nad Zakopanem.', searchInfo: INFO, recordId: id64(1), channel: 'www' });
		expect(s.setNote(a.caseId, 'Zapytać w obserwatorium.')).toBe(true);
		tick(5);
		expect(s.markForwarded(a.caseId, 'Anna Test')).toBe(true);
		const item = s.get(a.caseId)!;
		expect(item).toMatchObject({ note: 'Zapytać w obserwatorium.', forwardedTo: 'Anna Test', forwardedReportCount: 1, state: 'w_toku' });
		expect(item.forwardedAt).toBe('2026-11-21T10:05:00.000Z');
		expect(s.setState(999, 'zamknieta')).toBe(false);
		expect(s.markForwarded(999, 'x')).toBe(false);
		expect(s.counts()).toEqual({ nowa: 0, w_toku: 1, zamknieta: 0 });
	});

	it('retencja usuwa tylko stare sprawy (z odsyłaczami)', () => {
		const { store: s, tick } = store();
		s.recordReport({ claimText: 'Kometa Halleya przeleciała nisko nad Zakopanem.', searchInfo: INFO, recordId: id64(1), channel: 'www' });
		tick(60 * 24 * 40);
		const fresh = s.recordReport({ claimText: 'Rząd planuje wprowadzenie nowego podatku od zwierząt domowych.', searchInfo: INFO, recordId: id64(2), channel: 'www' });
		expect(s.purgeOlderThan(30)).toBe(1);
		expect(s.list().map((c) => c.id)).toEqual([fresh.caseId]);
		expect(s.publicStatusForRecord(id64(1)).status).toBe('brak');
		expect(s.purgeAll()).toBe(1);
	});
});

describe('stan sprawy dla obywatela: zapisano a przekazano', () => {
	it('brak sprawy, zapisano, przekazano (dopiero po oznaczeniu przez urzędnika)', () => {
		const { store: s, tick } = store();
		expect(s.publicStatusForRecord(id64(1))).toEqual({ status: 'brak' });
		const a = s.recordReport({ claimText: 'Kometa Halleya przeleciała nisko nad Zakopanem.', searchInfo: INFO, recordId: id64(1), channel: 'www' });
		expect(s.publicStatusForRecord(id64(1))).toEqual({ status: 'zapisano' });
		s.setState(a.caseId, 'w_toku');
		s.setNote(a.caseId, 'x');
		expect(s.publicStatusForRecord(id64(1))).toEqual({ status: 'zapisano' });
		tick(10);
		s.markForwarded(a.caseId, 'Anna Test');
		expect(s.publicStatusForRecord(id64(1))).toEqual({ status: 'przekazano', forwardedAt: '2026-11-21T10:10:00.000Z' });
	});

	it('zdania dla obywatela: zapisano nie mówi o przekazaniu, przekazano ma datę, brak nic nie mówi', () => {
		expect(casePublicSentencePl('zapisano')).toBe(CASE_SAVED_SENTENCE_PL);
		expect(CASE_SAVED_SENTENCE_PL).toContain('Jeszcze nikomu go nie przekazałem');
		expect(CASE_SAVED_SENTENCE_PL).not.toMatch(/dziękuj|odpowiem|odpowiedź|skontaktuj/i);
		expect(casePublicSentencePl('przekazano', '21.11.2026')).toBe('Przekazano do sprawdzenia 21.11.2026.');
		expect(casePublicSentencePl('przekazano')).toBeNull();
		expect(casePublicSentencePl('brak')).toBeNull();
	});
});

describe('opakowanie silnika: zapis spraw po rekordzie', () => {
	function fakeEngine(outcome: (input: VerifyInput) => VerifyOutcome): Engine {
		return { verify: async (input) => outcome(input), getRecord: () => null };
	}

	it('tylko twierdzenia "brak wystarczających dowodów" tworzą sprawy; wynik silnika bez zmian', async () => {
		const { store: s } = store();
		const rec = record(1, [
			claim('Kometa Halleya przeleciała nisko nad Zakopanem.', 'brak_wystarczajacych_dowodow', 1),
			claim('Warszawa jest stolicą Polski od wielu wieków.', 'potwierdzone', 2),
			claim('Ten film jest najlepszy w historii kina.', 'nie_podlega_weryfikacji', 3),
		]);
		const outcome = VerifyOutcomeSchema.parse({ kind: 'record', record: rec, cached: false });
		const engine = withCaseTracking(fakeEngine(() => outcome), s);
		const result = await engine.verify({ text: 'x', channel: 'sms' });
		expect(result).toBe(outcome);
		const list = s.list();
		expect(list).toHaveLength(1);
		expect(list[0]!.claimText).toContain('Kometa');
		expect(list[0]!.channels).toEqual({ sms: 1 });
		expect(list[0]!.searchInfo.searchTerms).toEqual(['kometa', 'Zakopane']);
		expect(list[0]!.searchInfo.abstainReason).toBe('Źródła nie dotykają tej sprawy.');
		expect(list[0]!.searchInfo.strengthReasons).toEqual(['brak dowodów w korpusie']);
	});

	it('stany techniczne i rekordy z werdyktem nie tworzą spraw', async () => {
		const { store: s } = store();
		const state: VerifyOutcome = { kind: 'state', state: 'awaria_techniczna', message: 'x' };
		await withCaseTracking(fakeEngine(() => state), s).verify({ text: 'x', channel: 'www' });
		const ok = VerifyOutcomeSchema.parse({ kind: 'record', record: record(2, [claim('Warszawa jest stolicą Polski od wielu wieków.', 'potwierdzone')]), cached: false });
		await withCaseTracking(fakeEngine(() => ok), s).verify({ text: 'x', channel: 'www' });
		expect(s.list()).toHaveLength(0);
	});

	it('błąd zapisu sprawy nigdy nie psuje odpowiedzi silnika i trafia do logu', async () => {
		const { store: s } = store();
		const broken: CaseStore = { ...s, recordReport: () => { throw new Error('boom'); } };
		const outcome = VerifyOutcomeSchema.parse({ kind: 'record', record: record(3, [claim('Kometa Halleya przeleciała nisko nad Zakopanem.', 'brak_wystarczajacych_dowodow')]), cached: false });
		const events: string[] = [];
		const engine = withCaseTracking(fakeEngine(() => outcome), broken, (type) => events.push(type));
		await expect(engine.verify({ text: 'x', channel: 'www' })).resolves.toBe(outcome);
		expect(events).toEqual(['case_error']);
	});

	it('przekazuje drugi argument verify (postęp) i getRecord', async () => {
		const { store: s } = store();
		let seenOpts: unknown;
		const inner = {
			verify: async (_input: VerifyInput, opts?: unknown) => {
				seenOpts = opts;
				return { kind: 'state', state: 'awaria_techniczna', message: 'x' } as VerifyOutcome;
			},
			getRecord: (id: string) => (id === id64(9) ? record(9, []) : null),
		};
		const engine = withCaseTracking(inner as Engine, s) as Engine & { verify(i: VerifyInput, o?: unknown): Promise<VerifyOutcome> };
		const opts = { onProgress: () => {} };
		await engine.verify({ text: 'x', channel: 'www' }, opts);
		expect(seenOpts).toBe(opts);
		expect(engine.getRecord(id64(9))?.id).toBe(id64(9));
	});

	it('twierdzenie jest ponownie maskowane i skracane', () => {
		const { store: s } = store();
		const long = `Kometa przeleciała nad Zakopanem ${'bardzo daleko '.repeat(60)}`;
		trackRecord(s, record(4, [claim(`Zadzwoń pod 600 700 800 w sprawie komety. ${long}`, 'brak_wystarczajacych_dowodow')]), 'www');
		const item = s.list()[0]!;
		expect(item.claimText).not.toContain('600 700 800');
		expect(item.claimText.length).toBeLessThanOrEqual(300);
		expect(safeText('mail jan.kowalski@example.com tu', 100)).not.toContain('jan.kowalski@example.com');
	});
});

describe('eksport CSV i JSON', () => {
	it('CSV: nagłówek, cytowanie, BOM, CRLF i ochrona przed formułami', () => {
		const { store: s } = store();
		const a = s.recordReport({ claimText: '=HYPERLINK("http://zly.example","kliknij"), "cytat"', searchInfo: INFO, recordId: id64(1), channel: 'www' });
		s.setNote(a.caseId, 'linia 1\nlinia 2');
		const csv = casesToCsv(s.list());
		expect(csv.startsWith('\uFEFFid,stan,zgloszenia,twierdzenie')).toBe(true);
		expect(csv).toContain("\"'=HYPERLINK(\"\"http://zly.example\"\",\"\"kliknij\"\"), \"\"cytat\"\"\"");
		expect(csv).toContain('"linia 1\nlinia 2"');
		expect(csv.endsWith('\r\n')).toBe(true);
		expect(csv.split('\r\n')[0]).toContain('rekordy');
		expect(csv).toContain(id64(1));
	});

	it('csvCell: wartości puste i liczby', () => {
		expect(csvCell(null)).toBe('');
		expect(csvCell(7)).toBe('7');
		expect(csvCell('-2')).toBe("'-2");
		expect(csvCell('a,b')).toBe('"a,b"');
	});

	it('JSON: liczba spraw i pełne dane', () => {
		const { store: s } = store();
		s.recordReport({ claimText: 'Kometa Halleya przeleciała nisko nad Zakopanem.', searchInfo: INFO, recordId: id64(1), channel: 'www' });
		const json = casesToJson(s.list(), new Date('2026-11-21T12:00:00Z'));
		expect(json).toMatchObject({ exportedAt: '2026-11-21T12:00:00.000Z', count: 1 });
		expect(json.cases[0]).toMatchObject({ reportCount: 1, state: 'nowa', claimText: expect.stringContaining('Kometa') });
	});
});
