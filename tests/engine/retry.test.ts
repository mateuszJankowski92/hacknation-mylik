// Zad. 35: stany techniczne z błędów przejściowych (limit zapytań) i z niezgodnej odpowiedzi bramki.
import { describe, expect, it } from 'vitest';
import { LlmError } from '../../src/contracts/index';
import type { SupportCheckRequest } from '../../src/engine/supportGate';
import { openDb } from '../../src/db/open';
import { createEngineCore, makeRetry } from '../../src/engine/pipeline';
import { FakeSearcher, ScriptedLlm, claim, fakePrepare, fixedNow, passage, stanceTable, usage } from './fakes';

const P = passage('lib#0', 'Burmistrz poinformował, że nowa biblioteka publiczna przy rynku została otwarta w sobotę.', { sourceType: 'urzedowe' });

describe('makeRetry', () => {
  it('ponawia raz po błędzie przejściowym', async () => {
    let n = 0;
    const retry = makeRetry(() => 20_000, 1);
    await expect(retry(async () => (n++ === 0 ? Promise.reject(new LlmError('rate_limit', 'x')) : 'ok'))).resolves.toBe('ok');
    expect(n).toBe(2);
  });
  it('nie ponawia błędów trwałych, przekroczenia czasu ani przy braku czasu', async () => {
    for (const [err, remaining] of [
      [new LlmError('no_key', 'x', { retryable: false }), 20_000],
      [new LlmError('invalid_output', 'x', { retryable: false }), 20_000],
      [new LlmError('timeout', 'x'), 20_000],
      [new LlmError('rate_limit', 'x'), 1_000],
    ] as const) {
      let n = 0;
      const retry = makeRetry(() => remaining, 1);
      await expect(retry(async () => { n++; throw err; })).rejects.toBe(err);
      expect(n).toBe(1);
    }
  });
});

describe('silnik: błędy przejściowe i bramka', () => {
  function engineWith(llm: ScriptedLlm, gate?: { name: string; checkSupport(r: SupportCheckRequest): Promise<never> }) {
    return createEngineCore({
      db: openDb(':memory:'),
      searcher: new FakeSearcher([P]),
      llm,
      now: fixedNow,
      prepare: fakePrepare,
      supportGate: gate ?? null,
      ranker: null,
      options: { errorProfile: null, retryDelayMs: 1 },
    });
  }
  it('jednorazowy limit zapytań przy ocenie nie kończy się stanem technicznym', async () => {
    let failed = false;
    const llm = new ScriptedLlm(() => [claim('Otwarto bibliotekę publiczną przy rynku.')], (req) => {
      if (!failed) {
        failed = true;
        throw new LlmError('rate_limit', 'x');
      }
      return stanceTable({ 'lib#0': 'potwierdza' }, 200)(req);
    });
    const out = await engineWith(llm).verify({ text: 'Otwarto bibliotekę publiczną przy rynku.', channel: 'www' });
    expect(out.kind).toBe('record');
  });
  it('trwały limit zapytań: stan techniczny, nie werdykt', async () => {
    const llm = new ScriptedLlm(() => new LlmError('rate_limit', 'x'));
    const out = await engineWith(llm).verify({ text: 'Otwarto bibliotekę publiczną przy rynku.', channel: 'www' });
    expect(out.kind === 'state' && out.state).toBe('awaria_techniczna');
  });
  it('bramka z odpowiedzią niezgodną ze schematem: dowód odpada, wstrzymanie zamiast stanu technicznego', async () => {
    const llm = new ScriptedLlm(() => [claim('Otwarto bibliotekę publiczną przy rynku.')], stanceTable({ 'lib#0': 'potwierdza' }, 200));
    const gate = { name: 'zla', checkSupport: async () => Promise.reject(new LlmError('invalid_output', 'x', { retryable: false })) as Promise<never> };
    const out = await engineWith(llm, gate).verify({ text: 'Otwarto bibliotekę publiczną przy rynku.', channel: 'www' });
    expect(out.kind === 'record' && out.record.claims[0]!.verdict).toBe('brak_wystarczajacych_dowodow');
  });
  it('bramka bez klucza: stan techniczny (awaria nie udaje wstrzymania)', async () => {
    const llm = new ScriptedLlm(() => [claim('Otwarto bibliotekę publiczną przy rynku.')], stanceTable({ 'lib#0': 'potwierdza' }, 200));
    const gate = { name: 'zla', checkSupport: async () => Promise.reject(new LlmError('no_key', 'x', { retryable: false })) as Promise<never> };
    const out = await engineWith(llm, gate).verify({ text: 'Otwarto bibliotekę publiczną przy rynku.', channel: 'www' });
    expect(out.kind === 'state' && out.state).toBe('awaria_techniczna');
  });
  void usage;
});

describe('silnik: ocena porcji niezgodna ze schematem', () => {
  it('porcja dzielona na pół; każdy fragment oceniony, werdykt zamiast stanu technicznego', async () => {
    const ps = [0, 1, 2, 3].map((i) => passage(`b${i}#0`, `Biblioteka publiczna przy rynku numer ${i} otwarta w sobotę.`, { sourceType: 'urzedowe' }));
    const llm = new ScriptedLlm(() => [claim('Otwarto bibliotekę publiczną przy rynku.')], (req) => {
      if (req.passages.length > 2) throw new LlmError('invalid_output', 'x', { retryable: false });
      return stanceTable(Object.fromEntries(ps.map((p) => [p.id, 'potwierdza' as const])), 200)(req);
    });
    const engine = createEngineCore({
      db: openDb(':memory:'),
      searcher: new FakeSearcher(ps),
      llm,
      now: fixedNow,
      prepare: fakePrepare,
      supportGate: null,
      ranker: null,
      options: { errorProfile: null, retryDelayMs: 1 },
    });
    const out = await engine.verify({ text: 'Otwarto bibliotekę publiczną przy rynku.', channel: 'www' });
    expect(out.kind === 'record' && out.record.claims[0]!.verdict).toBe('potwierdzone');
    expect(new Set(llm.seenPassageIds).size).toBe(4);
  });
  it('błąd przy pojedynczym fragmencie: stan techniczny', async () => {
    const llm = new ScriptedLlm(() => [claim('Otwarto bibliotekę publiczną przy rynku.')], () => {
      throw new LlmError('invalid_output', 'x', { retryable: false });
    });
    const engine = createEngineCore({
      db: openDb(':memory:'),
      searcher: new FakeSearcher([P]),
      llm,
      now: fixedNow,
      prepare: fakePrepare,
      supportGate: null,
      ranker: null,
      options: { errorProfile: null, retryDelayMs: 1 },
    });
    const out = await engine.verify({ text: 'Otwarto bibliotekę publiczną przy rynku.', channel: 'www' });
    expect(out.kind === 'state' && out.state).toBe('awaria_techniczna');
  });
});
