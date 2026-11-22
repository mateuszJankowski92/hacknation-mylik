// Zad. 45: druga kontrola cytatów innym modelem. Tylko odbiera dowody (niezgoda lub "nie wiem" = tło),
// nigdy nie dodaje; błąd albo czas = bez zmian i jawna nota; ten sam model = krok wyłączony. Bez sieci.
import { describe, expect, it } from 'vitest';
import { VerifyProgressDetailEventSchema, type EngineProgressEvent } from '../../src/contracts/api';
import { VerificationRecordSchema, type VerificationRecord } from '../../src/contracts/index';
import { openDb } from '../../src/db/open';
import { createEngineCore } from '../../src/engine/pipeline';
import {
  SECOND_CHECK_UNAVAILABLE_NOTICE,
  runSecondCheck,
  sameModel,
  secondCheckConfigFromEnv,
  type SecondCheck,
} from '../../src/engine/secondCheck';
import { createSecondCheckFromEnv } from '../../src/engine/secondCheckFactory';
import type { SupportCheckRequest, SupportGate, SupportRelation } from '../../src/engine/supportGate';
import { defaultRenderer } from '../../src/engine/render';
import { FakeSearcher, ScriptedLlm, claim, fakePrepare, fixedNow, passage, stanceTable } from './fakes';

const INPUT = 'W miasteczku otwarto nową bibliotekę publiczną przy rynku.';
const P1 = passage('lib#0', 'Burmistrz poinformował, że nowa biblioteka publiczna przy rynku została otwarta w sobotę.', { sourceType: 'urzedowe', publishedAt: '2026-05-02' });
const P2 = passage('news#0', 'Mieszkańcy odwiedzili otwartą w sobotę bibliotekę publiczną przy rynku, podała gazeta.', { publishedAt: '2026-05-03' });
const P3 = passage('spr#0', 'Sprostowanie: biblioteka przy rynku nie została otwarta, otwarcie przełożono na czerwiec.', { publishedAt: '2026-05-04' });

function gate(answer: (req: SupportCheckRequest) => SupportRelation | Error | 'wait'): SupportGate & { calls: SupportCheckRequest[] } {
  const calls: SupportCheckRequest[] = [];
  return {
    name: 'druga-atrapa',
    calls,
    async checkSupport(req) {
      calls.push(req);
      const a = answer(req);
      if (a instanceof Error) throw a;
      if (a === 'wait') await new Promise((r) => setTimeout(r, 200));
      return {
        verdicts: req.quotes.map(() => ({ relation: a === 'wait' ? 'potwierdza' : a, reason: 'atrapa' })),
        usage: { model: 'druga', inputTokens: 5, outputTokens: 2, estimatedCostUsd: 0.0001, latencyMs: 1 },
      };
    },
  };
}

const check = (g: SupportGate, model = 'drugi-model', timeoutMs = 2000): SecondCheck => ({ model, gate: g, timeoutMs });

function setup(o: { table?: Record<string, 'potwierdza' | 'obala' | 'kontekst' | 'bez_zwiazku'>; second?: SecondCheck | null }) {
  const llm = new ScriptedLlm(() => [claim('Otwarto nową bibliotekę publiczną przy rynku.', 'faktograficzna', 'c1')], stanceTable(o.table ?? { 'lib#0': 'potwierdza', 'news#0': 'potwierdza' }));
  const db = openDb(':memory:');
  const engine = createEngineCore({
    db,
    searcher: new FakeSearcher([P1, P2, P3]),
    llm,
    now: fixedNow,
    prepare: fakePrepare,
    supportGate: null,
    ranker: null,
    renderer: defaultRenderer,
    secondCheck: o.second ?? null,
  });
  return { engine, db };
}

async function run(engine: ReturnType<typeof setup>['engine'], text = INPUT): Promise<{ r: VerificationRecord; events: EngineProgressEvent[] }> {
  const events: EngineProgressEvent[] = [];
  const out = await engine.verify({ text, channel: 'www' }, { onProgress: (e) => events.push(e) });
  if (out.kind !== 'record') throw new Error(JSON.stringify(out));
  return { r: out.record, events };
}

describe('druga kontrola w potoku', () => {
  it('zgoda: werdykt bez zmian, w rekordzie model i liczby, zdarzenie druga_kontrola', async () => {
    const base = (await run(setup({}).engine)).r.claims[0]!;
    const g = gate((req) => (req.quotes[0]!.length > 0 ? 'potwierdza' : 'nie_rozstrzyga'));
    const { r, events } = await run(setup({ second: check(g) }).engine);
    expect(VerificationRecordSchema.safeParse(r).success).toBe(true);
    expect(r.claims[0]!.verdict).toBe(base.verdict);
    expect(r.claims[0]!.verdict).toBe('potwierdzone');
    expect(r.secondCheck).toMatchObject({ model: 'drugi-model', checked: 2, agreed: 2, status: 'ok' });
    const ev = events.find((e) => e.type === 'druga_kontrola');
    expect(ev).toEqual({ type: 'druga_kontrola', claim: 0, checked: 2, agreed: 2, ok: true });
    expect(VerifyProgressDetailEventSchema.safeParse(ev).success).toBe(true);
    // Każda para osobno, tylko twierdzenie i cytat (bez fragmentu, źródła i oceny pierwszego modelu).
    expect(g.calls).toHaveLength(2);
    for (const c of g.calls) expect(Object.keys(c).sort()).toEqual(['claim', 'quotes']);
  });

  it('niezgoda: dowód staje się tłem, werdykt spada do wstrzymania, ograniczenie w twierdzeniu', async () => {
    const { r } = await run(setup({ second: check(gate(() => 'obala')) }).engine);
    const c = r.claims[0]!;
    expect(c.verdict).toBe('brak_wystarczajacych_dowodow');
    expect(c.evidence.length).toBeGreaterThan(0);
    expect(c.evidence.every((e) => e.stance === 'kontekst')).toBe(true);
    expect(r.secondCheck).toMatchObject({ checked: 2, agreed: 0, status: 'ok' });
    expect(c.limitations.some((l) => l.startsWith('Drugi model nie uznał 2 cytatów'))).toBe(true);
  });

  it('"nie wiem" działa jak niezgoda; częściowa zgoda zostawia uznany dowód', async () => {
    const g = gate((req) => (req.quotes[0]!.startsWith('Burmistrz') ? 'potwierdza' : 'nie_rozstrzyga'));
    const { r } = await run(setup({ second: check(g) }).engine);
    const c = r.claims[0]!;
    expect(c.verdict).toBe('potwierdzone');
    expect(c.evidence.filter((e) => e.stance === 'potwierdza').map((e) => e.passageId)).toEqual(['lib#0']);
    expect(r.secondCheck).toMatchObject({ checked: 2, agreed: 1 });
  });

  it('błąd dostawcy: dowody bez zmian i jawna nota "druga kontrola niedostępna"', async () => {
    const base = (await run(setup({}).engine)).r;
    const { r, events } = await run(setup({ second: check(gate(() => new Error('awaria'))) }).engine);
    expect(r.claims[0]!.verdict).toBe(base.claims[0]!.verdict);
    expect(r.claims[0]!.evidence.map((e) => e.stance)).toEqual(base.claims[0]!.evidence.map((e) => e.stance));
    expect(r.notices.map((n) => n.text)).toContain(SECOND_CHECK_UNAVAILABLE_NOTICE);
    expect(r.secondCheck?.status).toBe('niedostepna');
    expect(events.find((e) => e.type === 'druga_kontrola')).toMatchObject({ ok: false });
  });

  it('przekroczenie czasu: bez zmian i nota', async () => {
    const { r } = await run(setup({ second: check(gate(() => 'wait'), 'drugi-model', 20) }).engine);
    expect(r.claims[0]!.verdict).toBe('potwierdzone');
    expect(r.notices.map((n) => n.text)).toContain(SECOND_CHECK_UNAVAILABLE_NOTICE);
  });

  it('ten sam model co ocena: krok wyłączony (bez wywołań i bez pola w rekordzie)', async () => {
    const g = gate(() => 'obala');
    const { r } = await run(setup({ second: check(g, 'fake') }).engine);
    expect(g.calls).toHaveLength(0);
    expect(r.claims[0]!.verdict).toBe('potwierdzone');
    expect(r.secondCheck).toBeUndefined();
    expect(sameModel('claude-haiku-5-5', 'Claude-Haiku-5-5-20261001')).toBe(true);
    expect(sameModel('claude-haiku-5-5', 'claude-sonnet-5-5')).toBe(false);
  });

  it('nigdy nie podnosi werdyktu: brak dowodów zostaje brakiem, sprzeczność nie zmienia się w potwierdzenie', async () => {
    const yes = gate(() => 'potwierdza');
    const none = await run(setup({ table: { 'lib#0': 'kontekst' }, second: check(yes) }).engine);
    expect(none.r.claims[0]!.verdict).toBe('brak_wystarczajacych_dowodow');
    expect(yes.calls).toHaveLength(0);
    const mixedBase = (await run(setup({ table: { 'lib#0': 'potwierdza', 'spr#0': 'obala' } }).engine)).r.claims[0]!;
    // Druga kontrola "potwierdza" na wszystko: cytat z "obala" nie dostaje "potwierdza", tylko odpada.
    const mixed = (await run(setup({ table: { 'lib#0': 'potwierdza', 'spr#0': 'obala' }, second: check(gate(() => 'potwierdza')) }).engine)).r.claims[0]!;
    expect(mixed.evidence.some((e) => e.stance === 'obala')).toBe(false);
    expect(mixed.evidence.filter((e) => e.stance === 'potwierdza').length).toBeLessThanOrEqual(mixedBase.evidence.filter((e) => e.stance === 'potwierdza').length);
    expect(mixed.evidence.length).toBe(mixedBase.evidence.length);
  });
});

describe('zdarzenie twierdzenie_ocenione: liczby zgodne z rekordem', () => {
  it('kandydaci, dowody po kontroli, rozstrzygające i różne dokumenty', async () => {
    const { r, events } = await run(setup({ table: { 'lib#0': 'potwierdza', 'news#0': 'kontekst' } }).engine);
    const ev = events.find((e) => e.type === 'twierdzenie_ocenione');
    const c = r.claims[0]!;
    expect(VerifyProgressDetailEventSchema.safeParse(ev).success).toBe(true);
    expect(ev).toMatchObject({ claim: 0, passed: c.evidence.length, decisive: 1, sources: 1 });
    expect((ev as { candidates: number }).candidates).toBeGreaterThanOrEqual(c.evidence.length);
    expect(c.strength.reasons).toContain('jedno_zrodlo');
  });
});

describe('spójność kanałów z drugą kontrolą', () => {
  it('WWW i SMS (ten sam silnik, kanał sms): ten sam werdykt i te same dowody', async () => {
    const { engine } = setup({ second: check(gate((req) => (req.quotes[0]!.startsWith('Burmistrz') ? 'potwierdza' : 'obala'))) });
    const www = (await run(engine)).r;
    const again = await engine.verify({ text: INPUT, channel: 'sms' });
    if (again.kind !== 'record') throw new Error('rekord');
    expect(again.record.claims.map((c) => c.verdict)).toEqual(www.claims.map((c) => c.verdict));
    expect(again.record.claims[0]!.evidence.map((e) => [e.passageId, e.stance])).toEqual(www.claims[0]!.evidence.map((e) => [e.passageId, e.stance]));
  });
});

describe('konfiguracja', () => {
  it('domyślnie wyłączona; anthropic z domyślnym Sonnetem; jev; limit czasu', () => {
    expect(secondCheckConfigFromEnv({}).enabled).toBe(false);
    expect(secondCheckConfigFromEnv({ SECOND_CHECK: 'on' })).toMatchObject({ enabled: true, provider: 'anthropic', model: 'claude-sonnet-5-5', timeoutMs: 8000 });
    expect(secondCheckConfigFromEnv({ SECOND_CHECK: 'on', SECOND_CHECK_PROVIDER: 'jev', SECOND_CHECK_TIMEOUT_MS: '3000' })).toMatchObject({ provider: 'jev', timeoutMs: 3000 });
  });

  it('fabryka: wyłączona bez klucza i przy tym samym modelu (ostrzeżenie), włączona przy innym', () => {
    const warns: string[] = [];
    expect(createSecondCheckFromEnv('claude-haiku-5-5', { SECOND_CHECK: 'on' }, (w) => warns.push(w))).toBeNull();
    expect(createSecondCheckFromEnv('claude-sonnet-5-5', { SECOND_CHECK: 'on', ANTHROPIC_API_KEY: 'x' }, (w) => warns.push(w))).toBeNull();
    expect(warns.some((w) => w.includes('taki sam'))).toBe(true);
    expect(createSecondCheckFromEnv('claude-haiku-5-5', { SECOND_CHECK: 'on', ANTHROPIC_API_KEY: 'x' }, () => {})?.model).toBe('claude-sonnet-5-5');
    expect(createSecondCheckFromEnv('claude-haiku-5-5', { SECOND_CHECK: 'off', ANTHROPIC_API_KEY: 'x' }, () => {})).toBeNull();
  });

  it('runSecondCheck bez par nie woła dostawcy', async () => {
    const g = gate(() => 'potwierdza');
    const out = await runSecondCheck(check(g), []);
    expect(out).toMatchObject({ ok: true, answers: [] });
    expect(g.calls).toHaveLength(0);
  });
});
