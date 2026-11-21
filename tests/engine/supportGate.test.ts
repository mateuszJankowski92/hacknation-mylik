// Zadanie 20: pełne zdania w cytatach, wymóg liczb z twierdzenia i bramka wsparcia (bez sieci i klucza).
import { describe, expect, it } from 'vitest';
import { LlmError, VerificationRecordSchema } from '../../src/contracts/index';
import { openDb } from '../../src/db/open';
import { hasKeyNumbers, locateQuoteRange, numbersIn, snapToSentences, validateCitations, withPreviousSentence } from '../../src/engine/citations';
import { applySupportGate, createEngineCore } from '../../src/engine/pipeline';
import type { SupportCheckRequest, SupportCheckResult, SupportCheckVerdict, SupportGate } from '../../src/engine/supportGate';
import { FakeSearcher, ScriptedLlm, claim, events, fakePrepare, fixedNow, passage, stanceTable, usage } from './fakes';

function snapped(text: string, quote: string): string {
  const r = locateQuoteRange(text, quote)!;
  const s = snapToSentences(r.source, r.start, r.end);
  return r.source.slice(s.start, s.end);
}

describe('cytat jako pełne zdanie', () => {
  const T = 'Most na rzece otwarto w piątek. Oddany do ruchu 12 maja 2026 r. most ma 300 m długości. Koszt wyniósł 40 mln zł.';
  it('urywek rozszerzony do zdania, skrót "r." przed małą literą nie kończy zdania', () => {
    expect(snapped(T, 'do ruchu 12 maja')).toBe('Oddany do ruchu 12 maja 2026 r. most ma 300 m długości.');
  });
  it('cytat z pełnym zdaniem zostaje bez zmian', () => {
    expect(snapped(T, 'Koszt wyniósł 40 mln zł.')).toBe('Koszt wyniósł 40 mln zł.');
  });
  it('urywek z początku tekstu i do końca linii bez kropki', () => {
    expect(snapped('Nagłówek bez kropki\nDalej tekst.', 'bez kropki')).toBe('Nagłówek bez kropki');
  });
  it('zdania dłuższe niż limit: zostaje przedział od modelu', () => {
    const long = `Początek ${'słowo '.repeat(150)}koniec zdania.`;
    const r = locateQuoteRange(long, 'koniec zdania')!;
    const s = snapToSentences(r.source, r.start, r.end);
    expect(r.source.slice(s.start, s.end)).toBe('koniec zdania');
  });
  it('poprzednie zdanie dokładane jako ciągły wycinek źródła', () => {
    expect(withPreviousSentence(T, 'Oddany do ruchu 12 maja 2026 r. most ma 300 m długości.')).toBe(
      'Most na rzece otwarto w piątek. Oddany do ruchu 12 maja 2026 r. most ma 300 m długości.',
    );
    expect(withPreviousSentence(T, 'Most na rzece otwarto w piątek.')).toBeNull();
  });
});

describe('liczby z twierdzenia w cytacie "potwierdza"', () => {
  it('normalizacja liczb', () => {
    expect([...numbersIn('ponad 1 500 punktów i 10,2 km w 2026 r.')]).toEqual(['1500', '10,2', '2026']);
  });
  it('wystarczy jedna liczba z twierdzenia; twierdzenie bez liczb nie ma wymogu', () => {
    expect(hasKeyNumbers('Przedłużono o 60 dni.', 'Przepisy obowiązują na kolejne 60 dni.')).toBe(true);
    expect(hasKeyNumbers('Przedłużono o 60 dni.', 'Kolejne przedłużenie wynika ze skuteczności.')).toBe(false);
    expect(hasKeyNumbers('Otwarto bibliotekę.', 'Biblioteka działa.')).toBe(true);
  });
  it('validateCitations odrzuca "potwierdza" bez liczby, "obala" i "kontekst" bez wymogu', () => {
    const P = passage('d#0', 'Kolejne przedłużenie wynika ze skuteczności tego rozwiązania prawnego.');
    const r = validateCitations(
      [{ passageId: 'd#0', stance: 'potwierdza', quote: 'Kolejne przedłużenie wynika ze skuteczności', injectionSuspected: false }],
      [P],
      { claimText: 'Przepisy przedłużono o 60 dni.' },
    );
    expect(r.rejected).toEqual([{ passageId: 'd#0', reason: 'brak_kluczowych_elementow' }]);
    const r2 = validateCitations(
      [{ passageId: 'd#0', stance: 'kontekst', quote: 'Kolejne przedłużenie wynika ze skuteczności', injectionSuspected: false }],
      [P],
      { claimText: 'Przepisy przedłużono o 60 dni.' },
    );
    expect(r2.accepted).toHaveLength(1);
  });
});

/** Bramka sterowana funkcją; zapisuje, co dostała (sprawdzamy, że widzi tylko twierdzenie i cytaty). */
class FakeGate implements SupportGate {
  readonly name = 'fake-gate';
  calls: SupportCheckRequest[] = [];
  constructor(private decide: (claim: string, quote: string, call: number) => SupportCheckVerdict | Error) {}
  async checkSupport(req: SupportCheckRequest): Promise<SupportCheckResult> {
    this.calls.push(req);
    const call = this.calls.length;
    const verdicts = req.quotes.map((q) => {
      const v = this.decide(req.claim, q, call);
      if (v instanceof Error) throw v;
      return v;
    });
    return { verdicts, usage: usage() };
  }
}

const ev = (id: string, text: string, stance: 'potwierdza' | 'obala' | 'kontekst' | 'rozbieznosc_kontekstu', quote = text) => ({
  passage: passage(id, text),
  stance,
  quote,
  rank: 0,
  ...(stance === 'rozbieznosc_kontekstu' ? { mismatch: 'skala' as const } : {}),
});

describe('applySupportGate', () => {
  it('niewspierający odpada, inny kierunek bramki zastępuje ocenę, kontekst nie jest sprawdzany', async () => {
    const gate = new FakeGate((_c, q) =>
      q.startsWith('Tło') ? { relation: 'nie_rozstrzyga', reason: 'tło' } : { relation: 'obala', reason: 'wyklucza' },
    );
    const items = [
      ev('a#0', 'Tło sprawy jest takie.', 'potwierdza'),
      ev('b#0', 'Usługa jest całkowicie darmowa.', 'potwierdza'),
      ev('c#0', 'Ogólne informacje o usłudze.', 'kontekst'),
    ];
    const out = await applySupportGate(gate, 'Usługa kosztuje dużo.', items, () => {});
    expect(out.accepted.map((a) => [a.passage.id, a.stance])).toEqual([
      ['b#0', 'obala'],
      ['c#0', 'kontekst'],
    ]);
    expect(out.accepted[0]!.mismatch).toBeUndefined();
    expect(out.stats).toMatchObject({ checked: 2, dropped: 1, changed: 1, kept: 0 });
    // Każdy cytat osobnym wywołaniem (sam w sobie), bez cytatów kontekstu.
    expect(gate.calls.map((c) => c.quotes)).toEqual([['Tło sprawy jest takie.'], ['Usługa jest całkowicie darmowa.']]);
  });
  it('ten sam kierunek ("przeciw"): zostaje stanowisko z oceny (sedno czy szczegół ocenia się z całym fragmentem)', async () => {
    const gate = new FakeGate((_c, q) =>
      q.includes('100') ? { relation: 'obala', reason: 'inna liczba' } : { relation: 'rozbieznosc_kontekstu', mismatch: 'data', reason: 'inna data' },
    );
    const items = [
      ev('a#0', 'Na miejsce wysłano 100 strażaków.', 'rozbieznosc_kontekstu'),
      ev('b#0', 'Zdarzenia nie było, to wymysł.', 'obala'),
    ];
    const out = await applySupportGate(gate, 'Wysłano 900 strażaków.', items, () => {});
    expect(out.accepted.map((a) => [a.passage.id, a.stance, a.mismatch])).toEqual([
      ['a#0', 'rozbieznosc_kontekstu', 'skala'],
      ['b#0', 'obala', undefined],
    ]);
    expect(out.stats).toMatchObject({ checked: 2, kept: 2, changed: 0 });
  });
  it('ponowienie z poprzednim zdaniem ratuje cytat bez nazwanego podmiotu', async () => {
    const text = 'Most na rzece Wiśle otwarto w piątek. Oddany do ruchu obiekt ma 300 m.';
    const gate = new FakeGate((_c, q) =>
      q.includes('Wiśle') ? { relation: 'potwierdza', reason: 'ok' } : { relation: 'nie_rozstrzyga', reason: 'brak podmiotu' },
    );
    const out = await applySupportGate(gate, 'Most na Wiśle ma 300 m.', [ev('m#0', text, 'potwierdza', 'Oddany do ruchu obiekt ma 300 m.')], () => {});
    expect(out.accepted).toHaveLength(1);
    expect(out.accepted[0]!.quote).toBe(text);
    expect(text.includes(out.accepted[0]!.quote)).toBe(true);
    expect(out.stats).toMatchObject({ retried: 1, rescued: 1, dropped: 0 });
  });
  it('"potwierdza" od bramki bez liczby z twierdzenia nadal odpada', async () => {
    const gate = new FakeGate(() => ({ relation: 'potwierdza', reason: 'ok' }));
    const out = await applySupportGate(gate, 'Most ma 300 m.', [ev('m#0', 'Most jest długi.', 'obala')], () => {});
    expect(out.accepted).toHaveLength(0);
  });
  it('rozbieżność bez rodzaju: zostaje rodzaj z oceny albo "warunki"', async () => {
    const gate = new FakeGate(() => ({ relation: 'rozbieznosc_kontekstu', reason: 'inne' }));
    const out = await applySupportGate(gate, 'Coś było.', [ev('a#0', 'Coś było gdzie indziej.', 'rozbieznosc_kontekstu'), ev('b#0', 'Coś było kiedy indziej.', 'potwierdza')], () => {});
    expect(out.accepted.map((a) => a.mismatch)).toEqual(['skala', 'warunki']);
  });
});

describe('bramka w silniku', () => {
  const INPUT = 'W miasteczku otwarto nową bibliotekę publiczną przy rynku.';
  const P1 = passage('lib#0', 'Burmistrz poinformował, że nowa biblioteka publiczna przy rynku została otwarta w sobotę.');
  const P2 = passage('news#0', 'Mieszkańcy tłumnie odwiedzili otwartą w sobotę bibliotekę publiczną przy rynku.');
  function setup(gate: SupportGate | null | undefined, llm?: ScriptedLlm) {
    const db = openDb(':memory:');
    const searcher = new FakeSearcher([P1, P2]);
    const l = llm ?? new ScriptedLlm(() => [claim('Otwarto nową bibliotekę publiczną przy rynku.')], stanceTable({ 'lib#0': 'potwierdza', 'news#0': 'potwierdza' }, 200));
    const engine = createEngineCore({ db, searcher, llm: l, now: fixedNow, prepare: fakePrepare, ...(gate !== undefined ? { supportGate: gate } : {}) });
    return { db, engine };
  }

  it('bramka odrzuca wszystkie dowody -> wstrzymanie się, zdarzenie support_gate w logu', async () => {
    const gate = new FakeGate(() => ({ relation: 'nie_rozstrzyga', reason: 'tło' }));
    const { db, engine } = setup(gate);
    const out = await engine.verify({ text: INPUT, channel: 'www' });
    expect(out.kind).toBe('record');
    if (out.kind !== 'record') return;
    expect(VerificationRecordSchema.safeParse(out.record).success).toBe(true);
    expect(out.record.claims[0]!.verdict).toBe('brak_wystarczajacych_dowodow');
    expect(out.record.claims[0]!.evidence.filter((e) => e.stance !== 'kontekst')).toHaveLength(0);
    const g = events(db).find((e) => e.type === 'support_gate');
    expect(g).toBeDefined();
    expect(JSON.parse(g!.detail!)).toMatchObject({ claimId: 'c1', gate: 'fake-gate', checked: 2, dropped: 2 });
    expect(out.record.usage.llmCalls).toBeGreaterThanOrEqual(3);
  });
  it('bramka potwierdza -> werdykt jak bez bramki', async () => {
    const { engine } = setup(new FakeGate(() => ({ relation: 'potwierdza', reason: 'ok' })));
    const out = await engine.verify({ text: INPUT, channel: 'www' });
    expect(out.kind === 'record' && out.record.claims[0]!.verdict).toBe('potwierdzone');
  });
  it('awaria bramki -> stan techniczny, nie werdykt', async () => {
    const { engine } = setup(new FakeGate(() => new LlmError('timeout', 'x')));
    const out = await engine.verify({ text: INPUT, channel: 'www' });
    expect(out).toMatchObject({ kind: 'state', state: 'awaria_techniczna' });
  });
  it('dostawca z checkSupport jest bramką domyślnie; null wyłącza', async () => {
    const gated = Object.assign(
      new ScriptedLlm(() => [claim('Otwarto nową bibliotekę publiczną przy rynku.')], stanceTable({ 'lib#0': 'potwierdza', 'news#0': 'potwierdza' }, 200)),
      { checkSupport: async (r: SupportCheckRequest): Promise<SupportCheckResult> => ({ verdicts: r.quotes.map(() => ({ relation: 'nie_rozstrzyga' as const, reason: '' })) }) },
    );
    const a = await setup(undefined, gated).engine.verify({ text: INPUT, channel: 'www' });
    expect(a.kind === 'record' && a.record.claims[0]!.verdict).toBe('brak_wystarczajacych_dowodow');
    const b = await setup(null, gated).engine.verify({ text: INPUT, channel: 'www' });
    expect(b.kind === 'record' && b.record.claims[0]!.verdict).toBe('potwierdzone');
  });
});
