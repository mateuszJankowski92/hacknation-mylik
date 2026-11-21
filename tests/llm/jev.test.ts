import { describe, expect, it } from 'vitest';
import { VerificationRecordSchema } from '../../src/contracts/index';
import { openDb } from '../../src/db/open';
import { createEngineCore } from '../../src/engine/pipeline';
import { isSupportGate, type SupportCheckRequest, type SupportCheckResult, type SupportGate } from '../../src/engine/supportGate';
import type { FetchLike } from '../../src/llm/basal';
import { createLlmProvider } from '../../src/llm/index';
import {
  DEFAULT_JEV_MIN_CONFIDENCE,
  DEFAULT_JEV_MODEL,
  DEFAULT_JEV_TIMEOUT_MS,
  JEV_ENDPOINT,
  JevClient,
  JevSupportGate,
  applyJevSupportGateConfig,
  buildJevRequest,
  createJevStats,
  jevConfigFromEnv,
  type JevGateEvent,
} from '../../src/llm/jev';
import { MockLlmProvider } from '../../src/llm/mock';
import { FakeSearcher, ScriptedLlm, claim, fakePrepare, fixedNow, passage, stanceTable } from '../engine/fakes';

const KEY = 'sekretny-klucz-testowy';
const RELATIONS = ['potwierdza', 'obala', 'rozbieznosc_kontekstu', 'nie_rozstrzyga'];

interface Seen {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

type Decision = { relacja: [string, number]; szczegol?: string } | { status: number } | 'hang' | 'bad' | 'unreachable' | 'not-json';

function fakeJev(decide: (state: { twierdzenie: string; cytat: string }) => Decision) {
  const seen: Seen[] = [];
  const fetch: FetchLike = async (url, init) => {
    const body = JSON.parse(init.body) as Record<string, unknown>;
    seen.push({ url, headers: init.headers, body });
    const d = decide(body.state as { twierdzenie: string; cytat: string });
    if (d === 'hang') return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error(`aborted ${url}`))));
    if (d === 'unreachable') throw new Error(`connect ECONNREFUSED ${url}?key=${KEY}`);
    if (d === 'not-json') return { ok: true, status: 200, json: async () => Promise.reject(new SyntaxError('Unexpected token')) };
    if (d === 'bad') return { ok: true, status: 200, json: async () => ({ model: DEFAULT_JEV_MODEL, answers: { relacja: { type: 'choice' } }, usage: { input_tokens: 1, output_tokens: 1 } }) };
    if ('status' in d) return { ok: false, status: d.status, json: async () => ({ detail: 'x' }) };
    const [choice, confidence] = d.relacja;
    const probabilities = Object.fromEntries(RELATIONS.map((k) => [k, k === choice ? 0.25 + 0.75 * confidence : (0.75 - 0.75 * confidence) / 3]));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        model: DEFAULT_JEV_MODEL,
        answers: {
          relacja: { type: 'choice', choice, probabilities, confidence },
          szczegol: { type: 'choice', choice: d.szczegol ?? 'skala', probabilities: { skala: 0.7, data: 0.1, miejsce: 0.1, warunki: 0.1 }, confidence: 0.6 },
        },
        usage: { input_tokens: 200, output_tokens: 30 },
      }),
    };
  };
  return { fetch, seen };
}

class CountingGate implements SupportGate {
  readonly name = 'haiku-atrapa';
  readonly received: SupportCheckRequest[] = [];
  async checkSupport(r: SupportCheckRequest): Promise<SupportCheckResult> {
    this.received.push(r);
    return {
      verdicts: r.quotes.map(() => ({ relation: 'potwierdza' as const, reason: 'zapas' })),
      usage: { model: 'haiku-atrapa', inputTokens: 50, outputTokens: 5, estimatedCostUsd: 0.001, latencyMs: 3 },
    };
  }
}

function newGate(fetch: FetchLike, opts: { minConfidence?: number; timeoutMs?: number; cooldownMs?: number; now?: () => number } = {}) {
  const events: JevGateEvent[] = [];
  const backup = new CountingGate();
  const stats = createJevStats();
  const gate = new JevSupportGate({
    client: new JevClient({ apiKey: KEY, fetch, ...(opts.timeoutMs ? { timeoutMs: opts.timeoutMs } : {}) }),
    fallback: backup,
    onEvent: (e) => events.push(e),
    stats,
    ...(opts.minConfidence !== undefined ? { minConfidence: opts.minConfidence } : {}),
    ...(opts.cooldownMs !== undefined ? { cooldownMs: opts.cooldownMs } : {}),
    ...(opts.now ? { now: opts.now } : {}),
  });
  return { gate, events, backup, stats };
}

describe('kontrakt żądania', () => {
  it('POST /v1/systemone, Bearer, model przypięty, stan = twierdzenie i cytat, dwa pytania choice', async () => {
    const { fetch, seen } = fakeJev(() => ({ relacja: ['potwierdza', 0.93] }));
    const { gate } = newGate(fetch);
    const r = await gate.checkSupport({ claim: 'Most ma 300 m.', quotes: ['Most ma 300 m długości.'] });
    expect(r.verdicts).toEqual([{ relation: 'potwierdza', reason: 'jev conf=0.930' }]);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.url).toBe(JEV_ENDPOINT);
    expect(seen[0]!.headers.authorization).toBe(`Bearer ${KEY}`);
    expect(Object.keys(seen[0]!.body).sort()).toEqual(['model', 'questions', 'state']);
    expect(seen[0]!.body.model).toBe('jev-1.14.0');
    expect(seen[0]!.body.state).toEqual({ twierdzenie: 'Most ma 300 m.', cytat: 'Most ma 300 m długości.' });
    const questions = seen[0]!.body.questions as Record<string, { type: string; criteria: Record<string, string> }>;
    expect(Object.keys(questions)).toEqual(['relacja', 'szczegol']);
    expect(questions.relacja!.type).toBe('choice');
    expect(Object.keys(questions.relacja!.criteria)).toEqual(['nie_rozstrzyga', 'potwierdza', 'obala', 'rozbieznosc_kontekstu']);
    expect(Object.keys(questions.szczegol!.criteria)).toEqual(['skala', 'data', 'miejsce', 'warunki']);
    expect(JSON.stringify(seen[0]!.body)).not.toMatch(/ask_if|"lang"/);
  });
  it('do Jeva trafiają tylko twierdzenie i cytat (długie pola przycięte)', () => {
    const body = buildJevRequest(`  ${'a'.repeat(5000)}  `, 'b');
    expect((body.state as { twierdzenie: string }).twierdzenie).toHaveLength(2000);
    expect(Object.keys(body.state as object)).toEqual(['twierdzenie', 'cytat']);
  });
  it('kolejność opcji: ostrożna opcja pierwsza (Jev skłania się ku pierwszej)', () => {
    const criteria = (buildJevRequest('a', 'b').questions as { relacja: { criteria: object } }).relacja.criteria;
    expect(Object.keys(criteria)[0]).toBe('nie_rozstrzyga');
  });
  it('własny adres i model w kliencie', async () => {
    const { fetch, seen } = fakeJev(() => ({ relacja: ['obala', 0.8] }));
    await new JevClient({ apiKey: KEY, model: 'jev-latest', endpoint: 'http://h/v1/systemone', fetch }).decide(buildJevRequest('a', 'b'));
    expect(seen[0]!.url).toBe('http://h/v1/systemone');
    expect(seen[0]!.body.model).toBe('jev-latest');
  });
});

describe('decyzje Jeva', () => {
  it('rozbieżność z rodzajem szczegółu, każdy cytat osobnym żądaniem; szczegół ignorowany przy innych relacjach', async () => {
    const { fetch, seen } = fakeJev((s) =>
      s.cytat.includes('czerwcu') ? { relacja: ['rozbieznosc_kontekstu', 0.88], szczegol: 'data' } : { relacja: ['potwierdza', 0.9], szczegol: 'miejsce' },
    );
    const { gate, backup, stats } = newGate(fetch);
    const r = await gate.checkSupport({ claim: 'X w maju.', quotes: ['X w maju.', 'X w czerwcu.'] });
    expect(r.verdicts.map((v) => [v.relation, v.mismatch])).toEqual([
      ['potwierdza', undefined],
      ['rozbieznosc_kontekstu', 'data'],
    ]);
    expect(seen).toHaveLength(2);
    expect(backup.received).toHaveLength(0);
    expect(stats).toEqual({ quotes: 2, accepted: 2, fallbacks: 0, byReason: {} });
  });
  it('użycie: tokeny wejścia i koszt z cennika 0,042 USD za mln, zdarzenie bez treści i klucza', async () => {
    const { fetch } = fakeJev(() => ({ relacja: ['obala', 0.95] }));
    const { gate, events } = newGate(fetch);
    const r = await gate.checkSupport({ claim: 'SEKRET-TWIERDZENIE', quotes: ['SEKRET-CYTAT'] });
    expect(r.usage).toMatchObject({ model: 'jev-1.14.0', inputTokens: 200, outputTokens: 0 });
    expect(r.usage!.estimatedCostUsd).toBeCloseTo((200 * 0.042) / 1e6, 12);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'support_gate_jev', choice: 'obala', confidence: 0.95, belowThreshold: false, model: 'jev-1.14.0' });
    expect(JSON.stringify(events)).not.toMatch(/SEKRET|sekretny/);
  });
  it('pusta lista cytatów: bez żądań', async () => {
    const { fetch, seen } = fakeJev(() => ({ relacja: ['obala', 0.95] }));
    const { gate } = newGate(fetch);
    expect(await gate.checkSupport({ claim: 'A', quotes: [] })).toEqual({ verdicts: [] });
    expect(seen).toHaveLength(0);
  });
  it('odpowiedź z nazwą opcji spoza listy (np. constructor) -> zapas', async () => {
    const { fetch } = fakeJev(() => ({ relacja: ['constructor', 0.99] }));
    const { gate, stats } = newGate(fetch);
    const r = await gate.checkSupport({ claim: 'A', quotes: ['B'] });
    expect(r.verdicts[0]!.reason).toBe('zapas');
    expect(stats.byReason).toEqual({ invalid_output: 1 });
  });
});

describe('niska pewność: przejście awaryjne na Haiku', () => {
  it('pewność poniżej progu -> ten cytat ocenia zapas, pewność równa progowi zostaje przy Jevie', async () => {
    const { fetch } = fakeJev((s) => ({ relacja: ['potwierdza', s.cytat === 'niska' ? DEFAULT_JEV_MIN_CONFIDENCE - 0.01 : DEFAULT_JEV_MIN_CONFIDENCE] }));
    const { gate, backup, events, stats } = newGate(fetch);
    const r = await gate.checkSupport({ claim: 'A', quotes: ['równa', 'niska', 'równa'] });
    expect(r.verdicts.map((v) => v.reason)).toEqual(['jev conf=0.600', 'zapas', 'jev conf=0.600']);
    expect(backup.received).toEqual([{ claim: 'A', quotes: ['niska'] }]);
    expect(stats).toEqual({ quotes: 3, accepted: 2, fallbacks: 1, byReason: { low_confidence: 1 } });
    expect(events.filter((e) => e.type === 'support_gate_jev_fallback')).toEqual([{ type: 'support_gate_jev_fallback', reason: 'low_confidence', fallback: 'haiku-atrapa' }]);
    expect(events.find((e) => e.type === 'support_gate_jev' && e.belowThreshold)).toMatchObject({ choice: 'potwierdza', confidence: 0.59 });
    expect(r.usage!.inputTokens).toBe(3 * 200 + 50);
    expect(r.usage!.estimatedCostUsd).toBeCloseTo((600 * 0.042) / 1e6 + 0.001, 12);
  });
  it('próg z konfiguracji: wyższy próg odsyła więcej cytatów do zapasu', async () => {
    const { fetch } = fakeJev(() => ({ relacja: ['obala', 0.85] }));
    const strict = newGate(fetch, { minConfidence: 0.9 });
    const lax = newGate(fetch, { minConfidence: 0.5 });
    await strict.gate.checkSupport({ claim: 'A', quotes: ['B'] });
    await lax.gate.checkSupport({ claim: 'A', quotes: ['B'] });
    expect(strict.stats.fallbacks).toBe(1);
    expect(lax.stats.fallbacks).toBe(0);
  });
});

describe('zapas: Haiku przy błędzie, czasie, niedostępności', () => {
  const cases: [string, Decision, string][] = [
    ['HTTP 503', { status: 503 }, 'http_error'],
    ['HTTP 401 (zły klucz)', { status: 401 }, 'unauthorized'],
    ['HTTP 429 (limit)', { status: 429 }, 'rate_limited'],
    ['HTTP 529 (przeciążenie)', { status: 529 }, 'rate_limited'],
    ['HTTP 504', { status: 504 }, 'timeout'],
    ['przekroczenie czasu', 'hang', 'timeout'],
    ['brak pola choice', 'bad', 'invalid_output'],
    ['odpowiedź nie jest JSON', 'not-json', 'invalid_output'],
    ['serwer niedostępny', 'unreachable', 'unavailable'],
  ];
  for (const [label, mode, reason] of cases)
    it(`${label} -> ocena zapasem, licznik i zdarzenie z przyczyną ${reason}, bez klucza`, async () => {
      const { fetch } = fakeJev(() => mode);
      const { gate, backup, events, stats } = newGate(fetch, { timeoutMs: 30 });
      const r = await gate.checkSupport({ claim: 'A', quotes: ['B'] });
      expect(r.verdicts[0]!.reason).toBe('zapas');
      expect(backup.received).toHaveLength(1);
      expect(stats.fallbacks).toBe(1);
      expect(stats.byReason[reason as 'timeout']).toBe(1);
      expect(events.filter((e) => e.type === 'support_gate_jev_fallback')).toEqual([{ type: 'support_gate_jev_fallback', reason, fallback: 'haiku-atrapa' }]);
      expect(JSON.stringify(events)).not.toContain(KEY);
    });
  it('błąd zapasu nie jest połykany (silnik ma własną obsługę)', async () => {
    const { fetch } = fakeJev(() => ({ status: 500 }));
    const gate = new JevSupportGate({
      client: new JevClient({ apiKey: KEY, fetch }),
      fallback: { name: 'haiku-atrapa', checkSupport: async () => Promise.reject(new Error('zapas padł')) },
    });
    await expect(gate.checkSupport({ claim: 'A', quotes: ['B'] })).rejects.toThrow('zapas padł');
  });
  it('po błędzie przerwa bez prób (cooldown), potem Jev wraca; zdarzenia nie zawierają klucza', async () => {
    let t = 0;
    let call = 0;
    const { fetch, seen } = fakeJev(() => (++call === 1 ? 'unreachable' : { relacja: ['potwierdza', 0.9] }));
    const { gate, backup, events, stats } = newGate(fetch, { cooldownMs: 1000, now: () => t });
    await gate.checkSupport({ claim: 'A', quotes: ['B'] });
    t = 500;
    await gate.checkSupport({ claim: 'A', quotes: ['B'] });
    t = 1500;
    const r = await gate.checkSupport({ claim: 'A', quotes: ['B'] });
    expect(seen).toHaveLength(2);
    expect(backup.received).toHaveLength(2);
    expect(r.verdicts[0]!.reason).toBe('jev conf=0.900');
    expect(stats.byReason).toEqual({ unavailable: 1, cooldown: 1 });
    expect(JSON.stringify(events)).not.toContain(KEY);
  });
  it('niska pewność nie uruchamia przerwy', async () => {
    const { fetch, seen } = fakeJev(() => ({ relacja: ['potwierdza', 0.2] }));
    const { gate } = newGate(fetch, { cooldownMs: 60_000 });
    await gate.checkSupport({ claim: 'A', quotes: ['B'] });
    await gate.checkSupport({ claim: 'A', quotes: ['B'] });
    expect(seen).toHaveLength(2);
  });
});

describe('konfiguracja', () => {
  it('domyślnie wyłączone; włącza tylko SUPPORT_GATE_PROVIDER=jev', () => {
    expect(jevConfigFromEnv({}).enabled).toBe(false);
    expect(jevConfigFromEnv({ JEV_API_KEY: KEY }).enabled).toBe(false);
    expect(jevConfigFromEnv({ SUPPORT_GATE_PROVIDER: 'basal', JEV_API_KEY: KEY }).enabled).toBe(false);
    expect(jevConfigFromEnv({ SUPPORT_GATE_PROVIDER: ' JEV ' }).enabled).toBe(true);
  });
  it('wartości domyślne i odporność na złe wartości', () => {
    expect(jevConfigFromEnv({ SUPPORT_GATE_PROVIDER: 'jev', JEV_API_KEY: KEY })).toEqual({
      enabled: true,
      apiKey: KEY,
      model: 'jev-1.14.0',
      timeoutMs: DEFAULT_JEV_TIMEOUT_MS,
      minConfidence: DEFAULT_JEV_MIN_CONFIDENCE,
    });
    expect(jevConfigFromEnv({ SUPPORT_GATE_PROVIDER: 'jev', JEV_MODEL: 'jev-latest', JEV_TIMEOUT_MS: '2500', JEV_MIN_CONFIDENCE: '0.8' })).toMatchObject({
      model: 'jev-latest',
      timeoutMs: 2500,
      minConfidence: 0.8,
    });
    expect(jevConfigFromEnv({ JEV_MODEL: 'a b/../c', JEV_TIMEOUT_MS: 'x', JEV_MIN_CONFIDENCE: '7' })).toMatchObject({
      model: 'jev-1.14.0',
      timeoutMs: DEFAULT_JEV_TIMEOUT_MS,
      minConfidence: DEFAULT_JEV_MIN_CONFIDENCE,
    });
  });
  it('brak klucza: ostrzeżenie, dostawca bez zmian, zero żądań', async () => {
    const warns: string[] = [];
    const { fetch, seen } = fakeJev(() => ({ relacja: ['potwierdza', 0.9] }));
    const llm = new MockLlmProvider();
    const out = applyJevSupportGateConfig(llm, jevConfigFromEnv({ SUPPORT_GATE_PROVIDER: 'jev', JEV_API_KEY: '  ' }), { warn: (l) => warns.push(l), fetch });
    expect(out).toBe(llm);
    expect(warns).toHaveLength(1);
    expect(warns[0]).not.toContain(KEY);
    await out.checkSupport({ claim: 'A', quotes: ['B'] });
    expect(seen).toHaveLength(0);
  });
  it('wyłączone: dostawca bez zmian i bez ostrzeżenia', () => {
    const warns: string[] = [];
    const llm = new MockLlmProvider();
    expect(applyJevSupportGateConfig(llm, jevConfigFromEnv({ JEV_API_KEY: KEY }), { warn: (l) => warns.push(l) })).toBe(llm);
    expect(warns).toHaveLength(0);
  });
  it('fabryka: bez zmiennej dostawca bez zmian; z jev bramka podmieniona, reszta metod ta sama', () => {
    const plain = createLlmProvider({ llmProvider: 'mock', anthropicModel: '' }, { JEV_API_KEY: KEY });
    expect(plain).toBeInstanceOf(MockLlmProvider);
    const gated = createLlmProvider({ llmProvider: 'mock', anthropicModel: '' }, { SUPPORT_GATE_PROVIDER: 'jev', JEV_API_KEY: KEY });
    expect(gated).not.toBe(plain);
    expect(isSupportGate(gated)).toBe(true);
    expect((gated as { supportGateName?: string }).supportGateName).toBe('jev');
    expect(gated.name).toBe('mock');
    expect(typeof gated.extractClaims).toBe('function');
  });
  it('fabryka: przy basal bramka Jeva się nie włącza', () => {
    const gated = createLlmProvider({ llmProvider: 'mock', anthropicModel: '' }, { SUPPORT_GATE_PROVIDER: 'basal', BASAL_URL: 'http://127.0.0.1:9', JEV_API_KEY: KEY });
    expect((gated as { supportGateName?: string }).supportGateName).toBe('basal+mock');
  });
});

describe('w silniku', () => {
  const INPUT = 'W miasteczku otwarto nową bibliotekę publiczną przy rynku.';
  const P1 = passage('lib#0', 'Burmistrz poinformował, że nowa biblioteka publiczna przy rynku została otwarta w sobotę.');
  function engineWith(fetch: FetchLike, events: JevGateEvent[], stats = createJevStats()) {
    const base = Object.assign(
      new ScriptedLlm(() => [claim('Otwarto nową bibliotekę publiczną przy rynku.')], stanceTable({ 'lib#0': 'potwierdza' }, 200)),
      { checkSupport: async (r: SupportCheckRequest): Promise<SupportCheckResult> => ({ verdicts: r.quotes.map(() => ({ relation: 'potwierdza' as const, reason: 'haiku' })) }) },
    );
    const llm = applyJevSupportGateConfig(base, jevConfigFromEnv({ SUPPORT_GATE_PROVIDER: 'jev', JEV_API_KEY: KEY, JEV_TIMEOUT_MS: '200' }), {
      fetch,
      onEvent: (e) => events.push(e),
      stats,
    });
    return createEngineCore({ db: openDb(':memory:'), searcher: new FakeSearcher([P1]), llm, now: fixedNow, prepare: fakePrepare });
  }
  it('Jev niedostępny -> werdykt z bramki zapasowej, nigdy stan techniczny', async () => {
    const events: JevGateEvent[] = [];
    const stats = createJevStats();
    const out = await engineWith(fakeJev(() => ({ status: 503 })).fetch, events, stats).verify({ text: INPUT, channel: 'www' });
    expect(out.kind).toBe('record');
    if (out.kind !== 'record') return;
    expect(VerificationRecordSchema.safeParse(out.record).success).toBe(true);
    expect(out.record.claims[0]!.verdict).toBe('potwierdzone');
    expect(events.some((e) => e.type === 'support_gate_jev_fallback')).toBe(true);
    expect(stats.fallbacks).toBeGreaterThan(0);
  });
  it('Jev uznaje, że cytat nie rozstrzyga (wysoka pewność) -> wstrzymanie się', async () => {
    const events: JevGateEvent[] = [];
    const out = await engineWith(fakeJev(() => ({ relacja: ['nie_rozstrzyga', 0.95] })).fetch, events).verify({ text: INPUT, channel: 'www' });
    expect(out.kind === 'record' && out.record.claims[0]!.verdict).toBe('brak_wystarczajacych_dowodow');
    expect(events.filter((e) => e.type === 'support_gate_jev').length).toBeGreaterThan(0);
  });
  it('Jev niepewny -> decyduje zapas', async () => {
    const events: JevGateEvent[] = [];
    const out = await engineWith(fakeJev(() => ({ relacja: ['nie_rozstrzyga', 0.1] })).fetch, events).verify({ text: INPUT, channel: 'www' });
    expect(out.kind === 'record' && out.record.claims[0]!.verdict).toBe('potwierdzone');
    expect(events.some((e) => e.type === 'support_gate_jev_fallback' && e.reason === 'low_confidence')).toBe(true);
  });
});
