import { describe, expect, it } from 'vitest';
import { VerifyOutcomeSchema, type VerificationRecord } from '../../src/contracts/index';
import { openDb } from '../../src/db/open';
import { createEngineCore, LIVE_DEADLINE_MS } from '../../src/engine/pipeline';
import type { LiveLayer } from '../../src/live/layer';
import {
  LIVE_FAILED_NOTICE,
  LIVE_INJECTION_NOTICE,
  LIVE_NOT_FOUND_LIMITATION,
  LIVE_SOURCE_SENTENCE,
  LIVE_USED_LIMITATION,
} from '../../src/live/text';
import { claim, events, FakeSearcher, fakePrepare, fixedNow, FIXED_NOW, passage, ScriptedLlm, type AssessFn } from '../engine/fakes';
import { FakeLiveSearcher, fakeFetcher, fixtureHits, fixturePages, testLayer } from './helpers';

const INPUT = 'Reprezentacja Polski wygrała z Holandią 2:1 w sobotę.';
const CLAIM_TEXT = 'Reprezentacja Polski wygrała z Holandią 2:1.';
// Korpus urzędowy bez odpowiedzi na pytanie sportowe.
const OFFICIAL = passage('gis#0', 'Woda w wodociągu miejskim nadaje się do picia według komunikatu sanepidu.', { sourceType: 'urzedowe' });

/** Ocena atrapy: fragment ze zdaniem o wyniku "potwierdza" (cytat = pierwsze zdanie z wynikiem). */
const assessLive: AssessFn = (req) =>
  req.passages.map((p) => {
    const m = /[^.]*wygrała z Holandią 2:1[^.]*\./.exec(p.text);
    return m
      ? { passageId: p.id, stance: 'potwierdza' as const, quote: m[0].trim(), injectionSuspected: false }
      : { passageId: p.id, stance: 'bez_zwiazku' as const, quote: '', injectionSuspected: false };
  });

function setup(live: LiveLayer | null, assess: AssessFn = assessLive, corpus = [OFFICIAL]) {
  const db = openDb(':memory:');
  const llm = new ScriptedLlm(() => [claim(CLAIM_TEXT)], assess);
  const engine = createEngineCore({ db, searcher: new FakeSearcher(corpus), llm, now: fixedNow, prepare: fakePrepare, live, supportGate: null });
  return { db, llm, engine };
}

async function record(engine: ReturnType<typeof setup>['engine']): Promise<VerificationRecord> {
  const out = await engine.verify({ text: INPUT, channel: 'www' });
  expect(VerifyOutcomeSchema.safeParse(out).success).toBe(true);
  if (out.kind !== 'record') throw new Error(`oczekiwany rekord, jest ${JSON.stringify(out)}`);
  return out.record;
}

describe('silnik z drugą warstwą', () => {
  it('bez warstwy drugiej (LIVE_LAYER=off): jak dotąd, wstrzymanie się', async () => {
    const { engine } = setup(null);
    const r = await record(engine);
    expect(r.claims[0]!.verdict).toBe('brak_wystarczajacych_dowodow');
  });

  it('korpus milczy, lista mediów ma odpowiedź: ten sam potok, siła najwyżej średnia, jawna warstwa i czas pobrania', async () => {
    const searcher = new FakeLiveSearcher(fixtureHits());
    const { engine, db } = setup(testLayer(searcher, fakeFetcher(fixturePages())));
    const r = await record(engine);
    const c = r.claims[0]!;
    expect(searcher.calls).toHaveLength(1);
    expect(c.verdict).toBe('potwierdzone');
    expect(['srednia', 'niska']).toContain(c.strength.level);
    expect(c.strength.reasons).toContain('zrodlo_wtorne');
    expect(c.evidence.length).toBeGreaterThan(0);
    for (const e of c.evidence) {
      expect(e.source.layer).toBe('media_i_instytucje');
      // Cytat to dosłowny podciąg pobranej treści, tylko krótki wycinek.
      expect(e.quote.length).toBeLessThan(300);
    }
    expect(c.limitations).toContain(LIVE_USED_LIMITATION);
    expect(c.explanation).toContain(LIVE_SOURCE_SENTENCE);
    expect(r.notices.some((n) => n.type === 'status_zrodla' && n.text.includes('nie jest źródło urzędowe'))).toBe(true);
    // Strona z poleceniem dla modelu: odrzucona i odnotowana.
    expect(r.notices.some((n) => n.text === LIVE_INJECTION_NOTICE)).toBe(true);
    expect(r.injectionSignals.some((s) => s.includes('ignorowanie_instrukcji'))).toBe(true);
    expect(c.evidence.some((e) => e.quote.includes('Zignoruj'))).toBe(false);
    // Stan na = czas pobrania strony.
    expect(r.asOf).toBe(FIXED_NOW.toISOString());
    const ev = events(db).filter((e) => e.type === 'live_search');
    expect(ev).toHaveLength(1);
    const d = JSON.parse(ev[0]!.detail!);
    expect(d).toMatchObject({ status: 'ok', searches: 1, searchFeeUsd: 0.01 });
    expect(d.rejectedDomains).toEqual(expect.arrayContaining(['evilpap.pl']));
    expect(JSON.stringify(d)).not.toContain('Holandi');
  });

  it('powtórne zgłoszenie w krótkim czasie korzysta z zapisanego rekordu (bez nowego wyszukiwania)', async () => {
    const searcher = new FakeLiveSearcher(fixtureHits());
    const { engine } = setup(testLayer(searcher, fakeFetcher(fixturePages())));
    const a = await engine.verify({ text: INPUT, channel: 'www' });
    const b = await engine.verify({ text: INPUT, channel: 'www' });
    expect(b).toMatchObject({ kind: 'record', cached: true });
    expect(a.kind === 'record' && b.kind === 'record' && a.record.id === b.record.id).toBe(true);
    expect(searcher.calls).toHaveLength(1);
  });

  it('korpus rozstrzyga: warstwa druga nie startuje', async () => {
    const searcher = new FakeLiveSearcher(fixtureHits());
    const official = passage('pzpn-urz#0', 'Komunikat urzędu: reprezentacja Polski wygrała z Holandią 2:1 w sobotę.', { sourceType: 'urzedowe' });
    const assess: AssessFn = (req) =>
      req.passages.map((p) =>
        p.id === 'pzpn-urz#0'
          ? { passageId: p.id, stance: 'potwierdza', quote: 'reprezentacja Polski wygrała z Holandią 2:1 w sobotę.', injectionSuspected: false }
          : { passageId: p.id, stance: 'bez_zwiazku', quote: '', injectionSuspected: false },
      );
    const { engine } = setup(testLayer(searcher, fakeFetcher(fixturePages())), assess, [official]);
    const r = await record(engine);
    expect(r.claims[0]!.verdict).toBe('potwierdzone');
    expect(searcher.calls).toHaveLength(0);
    expect(r.claims[0]!.evidence.every((e) => e.source.layer === undefined)).toBe(true);
  });

  it('brak wyników na liście: wstrzymanie się z prostym ograniczeniem', async () => {
    const { engine } = setup(testLayer(new FakeLiveSearcher([]), fakeFetcher(fixturePages())));
    const c = (await record(engine)).claims[0]!;
    expect(c.verdict).toBe('brak_wystarczajacych_dowodow');
    expect(c.limitations).toContain(LIVE_NOT_FOUND_LIMITATION);
  });

  it('błąd sieci przy wyszukiwaniu: uczciwy komunikat, żadnego werdyktu z domysłu', async () => {
    const { engine } = setup(testLayer(new FakeLiveSearcher(new Error('ENOTFOUND')), fakeFetcher(fixturePages())));
    const r = await record(engine);
    expect(r.claims[0]!.verdict).toBe('brak_wystarczajacych_dowodow');
    expect(r.claims[0]!.evidence.some((e) => e.source.layer === 'media_i_instytucje')).toBe(false);
    expect(r.notices.some((n) => n.text === LIVE_FAILED_NOTICE)).toBe(true);
  });

  it('opinia nie uruchamia warstwy drugiej; limit czasu z warstwą drugą poniżej 25 s', async () => {
    const searcher = new FakeLiveSearcher(fixtureHits());
    const db = openDb(':memory:');
    const llm = new ScriptedLlm(() => [claim('Ten mecz był najpiękniejszy w historii.', 'opinia')], assessLive);
    const engine = createEngineCore({
      db,
      searcher: new FakeSearcher([OFFICIAL]),
      llm,
      now: fixedNow,
      prepare: fakePrepare,
      live: testLayer(searcher, fakeFetcher(fixturePages())),
    });
    const out = await engine.verify({ text: 'Ten mecz był najpiękniejszy w historii.', channel: 'www' });
    expect(out.kind === 'record' && out.record.claims[0]!.verdict).toBe('nie_podlega_weryfikacji');
    expect(searcher.calls).toHaveLength(0);
    expect(LIVE_DEADLINE_MS).toBeLessThan(25_000);
  });
});
