// Zad. 30: bramka wsparcia na Basalu (atrapa serwera basal-serve zgodna z kontraktem POST /v1/systemone; bez sieci).
import { describe, expect, it } from 'vitest';
import { VerificationRecordSchema } from '../../src/contracts/index';
import { openDb } from '../../src/db/open';
import { createEngineCore } from '../../src/engine/pipeline';
import { isSupportGate, type SupportCheckRequest, type SupportCheckResult, type SupportGate } from '../../src/engine/supportGate';
import {
  BasalClient,
  BasalSupportGate,
  FallbackSupportGate,
  applySupportGateConfig,
  buildBasalRequest,
  supportGateConfigFromEnv,
  withSupportGate,
  type BasalGateEvent,
  type FetchLike,
} from '../../src/llm/basal';
import { createLlmProvider } from '../../src/llm/index';
import { MockLlmProvider } from '../../src/llm/mock';
import { FakeSearcher, ScriptedLlm, claim, fakePrepare, fixedNow, passage, stanceTable } from '../engine/fakes';

const TOKEN = 'sekretny-token-testowy';

interface Seen {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

/** Atrapa basal-serve: odpowiada w kształcie z docs/API.md Basala. */
function fakeServer(decide: (state: string) => { relacja: [string, number]; szczegol?: string } | 'error' | 'hang' | 'bad') {
  const seen: Seen[] = [];
  const fetch: FetchLike = async (url, init) => {
    const body = JSON.parse(init.body) as Record<string, unknown>;
    seen.push({ url, headers: init.headers, body });
    const d = decide(String(body.state));
    if (d === 'hang')
      return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error(`aborted ${url}`))));
    if (d === 'error') return { ok: false, status: 503, json: async () => ({ error: 'out of memory', code: 'OUT_OF_MEMORY' }) };
    if (d === 'bad') return { ok: true, status: 200, json: async () => ({ answers: { relacja: { type: 'choice' } } }) };
    const [choice, p] = d.relacja;
    const rest = (1 - p) / 3;
    const probabilities = Object.fromEntries(['potwierdza', 'obala', 'rozbieznosc_kontekstu', 'nie_rozstrzyga'].map((k) => [k, k === choice ? p : rest]));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        model: 'basal-2.0-4.5B',
        answers: {
          relacja: { type: 'choice', choice, probabilities, confidence: p },
          szczegol: d.szczegol ? { type: 'choice', choice: d.szczegol, probabilities: { [d.szczegol]: 0.9 }, confidence: 0.9 } : null,
        },
        usage: { input_tokens: 120, output_tokens: 0, questions: 2, branches: 2, latency_ms: 42 },
      }),
    };
  };
  return { fetch, seen };
}

class CountingGate implements SupportGate {
  readonly name = 'haiku-atrapa';
  calls = 0;
  async checkSupport(r: SupportCheckRequest): Promise<SupportCheckResult> {
    this.calls++;
    return { verdicts: r.quotes.map(() => ({ relation: 'potwierdza' as const, reason: 'zapas' })) };
  }
}

describe('kontrakt żądania', () => {
  it('POST /v1/systemone, Bearer, stan = twierdzenie i cytat, pytanie choice z czterema relacjami', async () => {
    const { fetch, seen } = fakeServer(() => ({ relacja: ['potwierdza', 0.93] }));
    const gate = new BasalSupportGate({ baseUrl: 'https://pod.example/', token: TOKEN, fetch });
    const r = await gate.checkSupport({ claim: 'Most ma 300 m.', quotes: ['Most ma 300 m długości.'] });
    expect(r.verdicts).toEqual([{ relation: 'potwierdza', reason: 'basal p=0.930' }]);
    expect(r.usage).toMatchObject({ model: 'basal-2.0-4.5B', inputTokens: 120, outputTokens: 0, estimatedCostUsd: 0 });
    expect(seen).toHaveLength(1);
    expect(seen[0]!.url).toBe('https://pod.example/v1/systemone');
    expect(seen[0]!.headers.authorization).toBe(`Bearer ${TOKEN}`);
    const body = seen[0]!.body as { state: string; questions: Record<string, { type: string; criteria: object; ask_if?: object }> };
    expect(body.state).toBe('Twierdzenie: Most ma 300 m.\nCytat ze źródła: Most ma 300 m długości.');
    expect(body.questions.relacja!.type).toBe('choice');
    expect(Object.keys(body.questions.relacja!.criteria)).toEqual(['potwierdza', 'obala', 'rozbieznosc_kontekstu', 'nie_rozstrzyga']);
    expect(body.questions.szczegol!.ask_if).toEqual({ relacja: ['rozbieznosc_kontekstu'] });
    // Do serwera trafiają tylko pola kontraktu: bez identyfikatorów, kanału, źródła.
    expect(Object.keys(body).sort()).toEqual(['lang', 'questions', 'state']);
  });
  it('adres z końcówką /v1 i bez tokenu', async () => {
    const { fetch, seen } = fakeServer(() => ({ relacja: ['obala', 0.8] }));
    await new BasalClient({ baseUrl: 'http://h:8000/v1', fetch }).decide(buildBasalRequest('a', 'b'));
    expect(seen[0]!.url).toBe('http://h:8000/v1/systemone');
    expect(seen[0]!.headers.authorization).toBeUndefined();
  });
});

describe('odpowiedzi Basala', () => {
  it('rozbieżność z rodzajem szczegółu, każdy cytat osobnym żądaniem', async () => {
    const { fetch, seen } = fakeServer((s) => (s.includes('czerwcu') ? { relacja: ['rozbieznosc_kontekstu', 0.88], szczegol: 'data' } : { relacja: ['potwierdza', 0.9] }));
    const r = await new BasalSupportGate({ baseUrl: 'http://h', fetch }).checkSupport({ claim: 'X w maju.', quotes: ['X w maju.', 'X w czerwcu.'] });
    expect(r.verdicts.map((v) => [v.relation, v.mismatch])).toEqual([
      ['potwierdza', undefined],
      ['rozbieznosc_kontekstu', 'data'],
    ]);
    expect(seen).toHaveLength(2);
  });
  it('pewność poniżej progu -> nie_rozstrzyga; prawdopodobieństwo tylko w zdarzeniu', async () => {
    const events: BasalGateEvent[] = [];
    const { fetch } = fakeServer(() => ({ relacja: ['potwierdza', 0.41] }));
    const r = await new BasalSupportGate({ baseUrl: 'http://h', fetch, minConfidence: 0.6, onEvent: (e) => events.push(e) }).checkSupport({
      claim: 'A',
      quotes: ['B'],
    });
    expect(r.verdicts[0]!.relation).toBe('nie_rozstrzyga');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'support_gate_basal', choice: 'potwierdza', relation: 'nie_rozstrzyga', confidence: 0.41, belowThreshold: true });
    // Zdarzenie bez treści twierdzenia i cytatu.
    expect(JSON.stringify(events[0])).not.toMatch(/"A"|"B"/);
  });
});

describe('zapas: Haiku przy błędzie, czasie, niedostępności', () => {
  const cases: [string, 'error' | 'hang' | 'bad', string][] = [
    ['HTTP 503', 'error', 'http_error'],
    ['przekroczenie czasu', 'hang', 'timeout'],
    ['zła odpowiedź', 'bad', 'invalid_output'],
  ];
  for (const [label, mode, code] of cases)
    it(`${label} -> ocena bramką zapasową, zdarzenie support_gate_fallback, bez tokenu`, async () => {
      const events: BasalGateEvent[] = [];
      const { fetch } = fakeServer(() => mode);
      const backup = new CountingGate();
      const gate = new FallbackSupportGate(new BasalSupportGate({ baseUrl: 'http://h', token: TOKEN, fetch, timeoutMs: 30 }), backup, {
        onEvent: (e) => events.push(e),
      });
      const r = await gate.checkSupport({ claim: 'A', quotes: ['B'] });
      expect(r.verdicts[0]!.reason).toBe('zapas');
      expect(backup.calls).toBe(1);
      expect(events).toEqual([{ type: 'support_gate_fallback', reason: code, fallback: 'haiku-atrapa' }]);
      expect(JSON.stringify(events)).not.toContain(TOKEN);
    });
  it('serwer nieosiągalny (wyjątek fetch z adresem) -> zapas; potem przerwa bez prób', async () => {
    let tries = 0;
    const fetch: FetchLike = async () => {
      tries++;
      throw new Error(`connect ECONNREFUSED http://h?token=${TOKEN}`);
    };
    let t = 0;
    const events: BasalGateEvent[] = [];
    const backup = new CountingGate();
    const gate = new FallbackSupportGate(new BasalSupportGate({ baseUrl: 'http://h', fetch }), backup, {
      onEvent: (e) => events.push(e),
      cooldownMs: 1000,
      now: () => t,
    });
    await gate.checkSupport({ claim: 'A', quotes: ['B'] });
    t = 500;
    await gate.checkSupport({ claim: 'A', quotes: ['B'] });
    t = 1500;
    await gate.checkSupport({ claim: 'A', quotes: ['B'] });
    expect(tries).toBe(2);
    expect(backup.calls).toBe(3);
    expect(events.map((e) => e.type === 'support_gate_fallback' && e.reason)).toEqual(['unavailable', 'cooldown', 'unavailable']);
    expect(JSON.stringify(events)).not.toContain(TOKEN);
  });
});

describe('konfiguracja', () => {
  it('domyślnie wyłączone; basal tylko przy SUPPORT_GATE_PROVIDER=basal', () => {
    expect(supportGateConfigFromEnv({}).provider).toBe('default');
    expect(supportGateConfigFromEnv({ SUPPORT_GATE_PROVIDER: 'haiku' }).provider).toBe('default');
    const c = supportGateConfigFromEnv({ SUPPORT_GATE_PROVIDER: 'basal', BASAL_URL: 'http://h', BASAL_TIMEOUT_MS: 'x' });
    expect(c).toMatchObject({ provider: 'basal', url: 'http://h', timeoutMs: 5000, minConfidence: 0.6 });
  });
  it('fabryka: bez zmiennej dostawca bez zmian; z basal bramka podmieniona, reszta metod ta sama', async () => {
    const plain = createLlmProvider({ llmProvider: 'mock', anthropicModel: '' }, {});
    expect(plain).toBeInstanceOf(MockLlmProvider);
    const gated = createLlmProvider({ llmProvider: 'mock', anthropicModel: '' }, { SUPPORT_GATE_PROVIDER: 'basal', BASAL_URL: 'http://127.0.0.1:9' });
    expect(isSupportGate(gated)).toBe(true);
    expect(gated.name).toBe('mock');
    expect(typeof gated.extractClaims).toBe('function');
  });
  it('basal bez adresu: ostrzeżenie, dostawca bez zmian', () => {
    const warns: string[] = [];
    const llm = new MockLlmProvider();
    expect(applySupportGateConfig(llm, supportGateConfigFromEnv({ SUPPORT_GATE_PROVIDER: 'basal' }), { warn: (l) => warns.push(l) })).toBe(llm);
    expect(warns).toHaveLength(1);
  });
});

describe('w silniku', () => {
  const INPUT = 'W miasteczku otwarto nową bibliotekę publiczną przy rynku.';
  const P1 = passage('lib#0', 'Burmistrz poinformował, że nowa biblioteka publiczna przy rynku została otwarta w sobotę.');
  function engineWith(fetch: FetchLike, events: BasalGateEvent[]) {
    const base = Object.assign(
      new ScriptedLlm(() => [claim('Otwarto nową bibliotekę publiczną przy rynku.')], stanceTable({ 'lib#0': 'potwierdza' }, 200)),
      { checkSupport: async (r: SupportCheckRequest): Promise<SupportCheckResult> => ({ verdicts: r.quotes.map(() => ({ relation: 'potwierdza' as const, reason: 'haiku' })) }) },
    );
    const llm = applySupportGateConfig(base, supportGateConfigFromEnv({ SUPPORT_GATE_PROVIDER: 'basal', BASAL_URL: 'http://h', BASAL_TIMEOUT_MS: '200' }), {
      fetch,
      onEvent: (e) => events.push(e),
    });
    return createEngineCore({ db: openDb(':memory:'), searcher: new FakeSearcher([P1]), llm, now: fixedNow, prepare: fakePrepare });
  }
  it('Basal niedostępny -> werdykt z bramki zapasowej, nigdy stan techniczny', async () => {
    const events: BasalGateEvent[] = [];
    const out = await engineWith(fakeServer(() => 'error').fetch, events).verify({ text: INPUT, channel: 'www' });
    expect(out.kind).toBe('record');
    if (out.kind !== 'record') return;
    expect(VerificationRecordSchema.safeParse(out.record).success).toBe(true);
    expect(out.record.claims[0]!.verdict).toBe('potwierdzone');
    expect(events.some((e) => e.type === 'support_gate_fallback')).toBe(true);
  });
  it('Basal odrzuca cytat -> wstrzymanie się', async () => {
    const events: BasalGateEvent[] = [];
    const out = await engineWith(fakeServer(() => ({ relacja: ['nie_rozstrzyga', 0.9] })).fetch, events).verify({ text: INPUT, channel: 'www' });
    expect(out.kind === 'record' && out.record.claims[0]!.verdict).toBe('brak_wystarczajacych_dowodow');
    expect(events.filter((e) => e.type === 'support_gate_basal').length).toBeGreaterThan(0);
  });
  it('withSupportGate nie zmienia pól dostawcy', () => {
    const llm = new MockLlmProvider();
    const g = withSupportGate(llm, new CountingGate());
    expect(g.name).toBe(llm.name);
  });
});
