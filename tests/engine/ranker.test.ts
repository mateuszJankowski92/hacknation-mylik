// Zadanie 25: szersza pula kandydatów (kilka zapytań, scalenie rang), wybór kandydatów przez model,
// równoległa ocena porcji i twierdzeń, limit czasu na zgłoszenie, adres lokalny na wejściu.
import { describe, expect, it } from 'vitest';
import { LlmError, VerificationRecordSchema, type ExtractedClaim, type Passage } from '../../src/contracts/index';
import { openDb } from '../../src/db/open';
import { createEngine } from '../../src/engine/index';
import { createEngineCore, splitEven } from '../../src/engine/pipeline';
import { forQueries, fuseRankings, orderByRanking, type PassageRanker, type RankRequest } from '../../src/engine/ranker';
import { FakeSearcher, ScriptedLlm, claim, events, fakePrepare, fixedNow, passage, stanceTable, usage } from './fakes';

const P = (n: number) => passage(`d${n}#0`, `Biblioteka publiczna numer ${n} przy rynku została otwarta w sobotę rano.`);

describe('scalenie rang i porządek kandydatów', () => {
  it('fragment wysoko w kilku listach wygrywa; remis wg pierwszego wystąpienia', () => {
    const [a, b, c] = [P(1), P(2), P(3)];
    expect(fuseRankings([[a, b, c], [b, c]]).map((p) => p.id)).toEqual(['d2#0', 'd3#0', 'd1#0']);
    expect(fuseRankings([[a], [b]]).map((p) => p.id)).toEqual(['d1#0', 'd2#0']);
  });
  it('zapytania "za": pełne twierdzenie ze słowami, same słowa, samo twierdzenie (bez powtórzeń)', () => {
    const c: ExtractedClaim = { ...claim('Otwarto bibliotekę.'), searchTerms: ['biblioteka', 'czytelnia'] };
    expect(forQueries(c)).toEqual(['Otwarto bibliotekę. biblioteka czytelnia', 'biblioteka czytelnia', 'Otwarto bibliotekę.']);
    expect(forQueries(claim('Otwarto bibliotekę.'))).toEqual(['Otwarto bibliotekę.']);
  });
  it('kolejność od modelu (tylko znane, bez powtórzeń), dopełnienie z wyszukiwania do minimum, limit', () => {
    const pool = [P(1), P(2), P(3), P(4), P(5)];
    const ids = (l: Passage[]) => l.map((p) => p.id);
    expect(ids(orderByRanking(pool, ['d4#0', 'obcy#9', 'd4#0', 'd2#0'], 3, 4))).toEqual(['d4#0', 'd2#0', 'd1#0']);
    expect(ids(orderByRanking(pool, ['d5#0', 'd4#0', 'd3#0', 'd2#0', 'd1#0'], 2, 3))).toEqual(['d5#0', 'd4#0', 'd3#0']);
    expect(ids(orderByRanking(pool, [], 2, 4))).toEqual(['d1#0', 'd2#0']);
  });
  it('podział na porcje możliwie równe', () => {
    expect(splitEven([1, 2, 3, 4, 5, 6, 7, 8], 6).map((x) => x.length)).toEqual([4, 4]);
    expect(splitEven([1, 2, 3], 6)).toEqual([[1, 2, 3]]);
    expect(splitEven([], 6)).toEqual([]);
  });
});

class RankingLlm extends ScriptedLlm implements PassageRanker {
  rankCalls: RankRequest[] = [];
  constructor(
    extract: () => ExtractedClaim[],
    assess: ConstructorParameters<typeof ScriptedLlm>[1],
    private rank: (req: RankRequest) => string[] | Error,
  ) {
    super(extract, assess);
  }
  async rankPassages(req: RankRequest) {
    this.rankCalls.push(req);
    const r = this.rank(req);
    if (r instanceof Error) throw r;
    return { ids: r, usage: usage() };
  }
}

describe('wybór kandydatów w silniku', () => {
  const pool = Array.from({ length: 14 }, (_, i) => P(i + 1));
  const C = () => [{ ...claim('Otwarto bibliotekę publiczną przy rynku.'), searchTerms: ['biblioteka', 'rynek'] }];

  it('pula większa niż limit: model wybiera, do oceny idą jego kandydaci, zdarzenie w śledzeniu', async () => {
    const llm = new RankingLlm(C, stanceTable({ 'd13#0': 'potwierdza' }, 200), (req) => ['d13#0', 'd14#0', 'd2#0'].filter((id) => req.passages.some((p) => p.id === id)));
    const trace: string[] = [];
    const engine = createEngineCore({
      db: openDb(':memory:'),
      searcher: new FakeSearcher(pool),
      llm,
      now: fixedNow,
      prepare: fakePrepare,
      supportGate: null,
      options: { trace: (e) => trace.push(e.type) },
    });
    const out = await engine.verify({ text: 'Otwarto bibliotekę publiczną przy rynku w sobotę.', channel: 'www' });
    if (out.kind !== 'record') throw new Error(JSON.stringify(out));
    expect(VerificationRecordSchema.safeParse(out.record).success).toBe(true);
    expect(llm.rankCalls).toHaveLength(1);
    expect(llm.rankCalls[0]!.passages.length).toBe(14);
    // Model wskazał 3, dopełnienie z wyszukiwania do minimum 6.
    expect(llm.seenPassageIds).toEqual(expect.arrayContaining(['d13#0', 'd14#0', 'd2#0']));
    expect(llm.seenPassageIds).toHaveLength(6);
    // Zad. 35: do oceny w stałej kolejności wyszukiwania, niezależnie od kolejności od modelu.
    const pos = (id: string) => Number(id.slice(1, id.indexOf('#')));
    expect([...llm.seenPassageIds].sort((a, b) => pos(a) - pos(b))).toEqual(llm.seenPassageIds);
    expect(out.record.claims[0]!.verdict).toBe('potwierdzone');
    expect(trace).toContain('rank');
  });
  it('błąd modelu porządkującego: kolejność z wyszukiwania, nadal werdykt z oceny, zdarzenie rank_failed', async () => {
    const llm = new RankingLlm(C, stanceTable({ 'd1#0': 'potwierdza' }, 200), () => new LlmError('timeout', 'x'));
    const db = openDb(':memory:');
    const engine = createEngineCore({ db, searcher: new FakeSearcher(pool), llm, now: fixedNow, prepare: fakePrepare, supportGate: null });
    const out = await engine.verify({ text: 'Otwarto bibliotekę publiczną przy rynku w sobotę.', channel: 'www' });
    expect(out.kind === 'record' && out.record.claims[0]!.verdict).toBe('potwierdzone');
    expect(llm.seenPassageIds.slice(0, 2)).toEqual(['d1#0', 'd2#0']);
    expect(events(db).map((e) => e.type)).toContain('rank_failed');
  });
  it('fragment z poleceniami wskazany przy wyborze: nie idzie do oceny, zdarzenie i ostrzeżenie', async () => {
    const llm = new RankingLlm(C, stanceTable({ 'd2#0': 'potwierdza' }, 200), () => ['d1#0', 'd2#0']);
    const ranker = { rankPassages: async (req: RankRequest) => ({ ...(await llm.rankPassages(req)), injectionSuspected: ['d1#0'] }) };
    const db = openDb(':memory:');
    const engine = createEngineCore({ db, searcher: new FakeSearcher(pool), llm, ranker, now: fixedNow, prepare: fakePrepare, supportGate: null });
    const out = await engine.verify({ text: 'Otwarto bibliotekę publiczną przy rynku w sobotę.', channel: 'www' });
    if (out.kind !== 'record') throw new Error('oczekiwano rekordu');
    expect(llm.seenPassageIds).not.toContain('d1#0');
    expect(out.record.injectionSignals).toContain('fragment:d1#0:zgloszone_przez_model');
    expect(events(db).some((e) => e.type === 'injection_signal')).toBe(true);
  });
  it('mała pula: model porządkujący nie jest wołany', async () => {
    const llm = new RankingLlm(C, stanceTable({ 'd1#0': 'potwierdza' }, 200), () => []);
    const engine = createEngineCore({ db: openDb(':memory:'), searcher: new FakeSearcher(pool.slice(0, 3)), llm, now: fixedNow, prepare: fakePrepare, supportGate: null });
    await engine.verify({ text: 'Otwarto bibliotekę publiczną przy rynku w sobotę.', channel: 'www' });
    expect(llm.rankCalls).toHaveLength(0);
  });
  it('wiele kandydatów: ocena w kilku porcjach (wywołania równoległe), każdy fragment oceniony raz', async () => {
    const llm = new ScriptedLlm(C, stanceTable({}, 200));
    const engine = createEngineCore({ db: openDb(':memory:'), searcher: new FakeSearcher(pool), llm, now: fixedNow, prepare: fakePrepare, supportGate: null });
    await engine.verify({ text: 'Otwarto bibliotekę publiczną przy rynku w sobotę.', channel: 'www' });
    expect(llm.assessCalls).toBeGreaterThanOrEqual(2);
    expect(new Set(llm.seenPassageIds).size).toBe(llm.seenPassageIds.length);
  });
});

describe('twierdzenia równolegle', () => {
  it('kolejność wyników zgodna z kolejnością twierdzeń, choć odpowiedzi przychodzą w innej kolejności', async () => {
    const A = passage('a#0', 'Most na rzece otwarto w piątek po południu.');
    const B = passage('b#0', 'Szkoła podstawowa zamknięta z powodu remontu dachu.');
    const llm = new ScriptedLlm(
      () => [claim('Most na rzece otwarto w piątek.', 'faktograficzna', 'c1'), claim('Szkoła zamknięta z powodu remontu.', 'faktograficzna', 'c2')],
      stanceTable({ 'a#0': 'potwierdza', 'b#0': 'obala' }, 200),
    );
    const slow = Object.assign(llm, {
      assessPassages: async (req: Parameters<ScriptedLlm['assessPassages']>[0]) => {
        if (req.claim.id === 'c1') await new Promise((r) => setTimeout(r, 30));
        return ScriptedLlm.prototype.assessPassages.call(llm, req);
      },
    });
    const engine = createEngineCore({ db: openDb(':memory:'), searcher: new FakeSearcher([A, B]), llm: slow, now: fixedNow, prepare: fakePrepare, supportGate: null });
    const out = await engine.verify({ text: 'Most otwarto, a szkołę zamknięto z powodu remontu.', channel: 'www' });
    if (out.kind !== 'record') throw new Error('oczekiwano rekordu');
    expect(out.record.claims.map((c) => [c.claim.id, c.verdict])).toEqual([
      ['c1', 'potwierdzone'],
      ['c2', 'falszywe'],
    ]);
  });
});

describe('limit czasu na zgłoszenie', () => {
  it('po przekroczeniu: stan awaria_techniczna z detalem deadline, bez rekordu, nigdy werdykt', async () => {
    const llm = new ScriptedLlm(() => [claim('Otwarto bibliotekę publiczną przy rynku.')], stanceTable({ 'd1#0': 'potwierdza' }, 200));
    const hanging = Object.assign(llm, { assessPassages: () => new Promise<never>(() => {}) });
    const db = openDb(':memory:');
    const engine = createEngineCore({
      db,
      searcher: new FakeSearcher([P(1)]),
      llm: hanging,
      now: fixedNow,
      prepare: fakePrepare,
      supportGate: null,
      options: { deadlineMs: 40 },
    });
    const t0 = Date.now();
    const out = await engine.verify({ text: 'Otwarto bibliotekę publiczną przy rynku w sobotę.', channel: 'www' });
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(out).toMatchObject({ kind: 'state', state: 'awaria_techniczna', detail: 'deadline' });
    expect(out.kind === 'state' && out.message).toMatch(/za długo/);
    expect((db.prepare('SELECT COUNT(*) AS n FROM records').get() as { n: number }).n).toBe(0);
    expect(events(db).some((e) => e.type === 'state' && (e.detail ?? '').includes('deadline'))).toBe(true);
  });
  it('potok przekracza limit między etapami: stan, rekord niezapisany', async () => {
    const llm = new ScriptedLlm(() => [claim('Otwarto bibliotekę publiczną przy rynku.')], stanceTable({ 'd1#0': 'potwierdza' }, 200));
    const slow = Object.assign(llm, {
      extractClaims: async (r: Parameters<ScriptedLlm['extractClaims']>[0]) => {
        await new Promise((res) => setTimeout(res, 60));
        return ScriptedLlm.prototype.extractClaims.call(llm, r);
      },
    });
    const db = openDb(':memory:');
    const engine = createEngineCore({ db, searcher: new FakeSearcher([P(1)]), llm: slow, now: fixedNow, prepare: fakePrepare, supportGate: null, options: { deadlineMs: 20 } });
    const out = await engine.verify({ text: 'Otwarto bibliotekę publiczną przy rynku w sobotę.', channel: 'www' });
    expect(out).toMatchObject({ kind: 'state', state: 'awaria_techniczna', detail: 'deadline' });
    await new Promise((res) => setTimeout(res, 100));
    expect((db.prepare('SELECT COUNT(*) AS n FROM records').get() as { n: number }).n).toBe(0);
  });
});

describe('adres lokalny na wejściu (prawdziwe prepareInput)', () => {
  it('brak_mozliwosci_sprawdzenia, nie potrzeba_doprecyzowania; model nie jest wołany', async () => {
    const llm = new ScriptedLlm(() => [claim('x')]);
    const db = openDb(':memory:');
    const engine = createEngine({ db, searcher: new FakeSearcher([P(1)]), llm, now: fixedNow, options: { errorProfile: null } });
    for (const url of ['http://10.0.0.7/panel', 'http://localhost:3000/']) {
      const out = await engine.verify({ url, channel: 'www' });
      expect(out).toMatchObject({ kind: 'state', state: 'brak_mozliwosci_sprawdzenia', detail: 'url:adres_prywatny' });
    }
    expect(llm.extractCalls).toBe(0);
    const bad = await engine.verify({ url: 'to nie adres', channel: 'www' });
    expect(bad).toMatchObject({ kind: 'state', state: 'potrzeba_doprecyzowania' });
  });
});
