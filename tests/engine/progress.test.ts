// Zdarzenia postępu silnika: tylko prawdziwe kroki, bez treści, wydawca z bazy; wynik bez zmian.
import { describe, expect, it } from 'vitest';
import { VerifyProgressEventSchema, type VerifyProgressEvent } from '../../src/contracts/api';
import { openDb } from '../../src/db/open';
import { createEngineCore } from '../../src/engine/pipeline';
import { progressStance, shortPublisher } from '../../src/engine/progress';
import { FakeSearcher, ScriptedLlm, claim, events, fakePrepare, fixedNow, passage, stanceTable } from './fakes';

const INPUT = 'W miasteczku otwarto nową bibliotekę publiczną przy rynku.';
const P1 = passage('lib#0', 'Burmistrz poinformował, że nowa biblioteka publiczna przy rynku została otwarta w sobotę.', {
  sourceType: 'urzedowe',
  publisher: 'Urząd Miasta (Wydział Kultury), Biuro Prasowe',
  publishedAt: '2026-05-02',
});
const P2 = passage('news#0', 'Mieszkańcy tłumnie odwiedzili otwartą w sobotę bibliotekę publiczną przy rynku.', {
  publisher: 'Gazeta Lokalna',
  publishedAt: null,
});
const P3 = passage('spr#0', 'Sprostowanie: biblioteka przy rynku nie została otwarta, otwarcie przełożono.', {
  publisher: 'Portal Miejski',
});

function setup(table: Record<string, 'potwierdza' | 'obala' | 'kontekst' | 'bez_zwiazku'> = { 'lib#0': 'potwierdza', 'news#0': 'kontekst' }) {
  const db = openDb(':memory:');
  const searcher = new FakeSearcher([P1, P2, P3]);
  const llm = new ScriptedLlm(
    () => [claim('Otwarto nową bibliotekę publiczną przy rynku.', 'faktograficzna', 'c1')],
    stanceTable(table),
  );
  const engine = createEngineCore({ db, searcher, llm, now: fixedNow, prepare: fakePrepare });
  return { db, engine, llm };
}

async function collect(engine: ReturnType<typeof setup>['engine'], text = INPUT) {
  const seen: VerifyProgressEvent[] = [];
  const out = await engine.verify({ text, channel: 'www' }, {
    // Zdarzenia szczegółowe (zad. 45) mają osobny test (tests/engine/secondCheck.test.ts).
    onProgress: (e) => {
      const base = VerifyProgressEventSchema.safeParse(e);
      if (base.success && e.type === base.data.type) seen.push(e as VerifyProgressEvent);
    },
  });
  return { out, seen };
}

describe('zdarzenia postępu silnika', () => {
  it('kolejność i treść zdarzeń odpowiada wykonanym krokom', async () => {
    const { engine } = setup({ 'lib#0': 'potwierdza', 'news#0': 'kontekst', 'spr#0': 'obala' });
    const { out, seen } = await collect(engine);
    if (out.kind !== 'record') throw new Error('oczekiwano rekordu');
    for (const e of seen) expect(VerifyProgressEventSchema.safeParse(e).success).toBe(true);
    expect(seen.map((e) => e.type)).toEqual([
      'zgloszenie_przeczytane',
      'fragmenty_za',
      'szukanie_przeciw_start',
      'szukanie_przeciw_koniec',
      ...out.record.claims[0]!.evidence.map(() => 'fragment_oceniony'),
      'gotowe',
    ]);
    expect(seen[0]).toEqual({ type: 'zgloszenie_przeczytane', claims: 1 });
    expect(seen.at(-1)).toEqual({ type: 'gotowe', recordId: out.record.id, cached: false, checkedAt: out.record.createdAt });
    const assessed = seen.filter((e) => e.type === 'fragment_oceniony');
    expect(assessed.length).toBe(out.record.claims[0]!.evidence.length);
    expect(assessed.length).toBeGreaterThan(0);
    // Wydawca i data z metadanych bazy (te same co w rekordzie), stanowisko zgodne z dowodem.
    out.record.claims[0]!.evidence.forEach((ev, i) => {
      const e = assessed[i]!;
      if (e.type !== 'fragment_oceniony') return;
      expect(e.publisher).toBe(shortPublisher(ev.source.publisher));
      expect(e.publishedAt).toBe(ev.source.publishedAt);
      expect(e.stance).toBe(progressStance(ev.stance as 'potwierdza'));
    });
    expect(assessed.find((e) => e.type === 'fragment_oceniony' && e.publisher === 'Urząd Miasta')).toBeTruthy();
    // Liczby z prawdziwych przebiegów wyszukiwania.
    const forEv = seen.find((e) => e.type === 'fragmenty_za');
    const counterEv = seen.find((e) => e.type === 'szukanie_przeciw_koniec');
    expect(forEv?.type === 'fragmenty_za' && forEv.count).toBeGreaterThan(0);
    expect(counterEv?.type === 'szukanie_przeciw_koniec' && counterEv.count).toBeGreaterThanOrEqual(0);
  });

  it('zdarzenia nie zawierają treści zgłoszenia ani fragmentów', async () => {
    const { engine } = setup();
    const { seen } = await collect(engine);
    const json = JSON.stringify(seen);
    for (const word of ['miasteczku', 'Burmistrz', 'tłumnie', 'Sprostowanie', 'bibliotek']) expect(json).not.toContain(word);
  });

  it('rekord z pamięci: tylko "gotowe" z cached=true', async () => {
    const { engine } = setup();
    const first = await collect(engine);
    const second = await collect(engine);
    if (first.out.kind !== 'record') throw new Error('oczekiwano rekordu');
    expect(second.seen).toEqual([{ type: 'gotowe', recordId: first.out.record.id, cached: true, checkedAt: first.out.record.createdAt }]);
  });

  it('stan (brak twierdzeń): bez zdarzeń', async () => {
    const db = openDb(':memory:');
    const engine = createEngineCore({ db, searcher: new FakeSearcher([P1]), llm: new ScriptedLlm(() => []), now: fixedNow, prepare: fakePrepare });
    const { out, seen } = await collect(engine);
    expect(out.kind).toBe('state');
    expect(seen).toEqual([]);
  });

  it('opinia: przeczytano zgłoszenie, bez szukania', async () => {
    const db = openDb(':memory:');
    const engine = createEngineCore({
      db,
      searcher: new FakeSearcher([P1]),
      llm: new ScriptedLlm(() => [claim('Biblioteka jest piękna.', 'opinia')]),
      now: fixedNow,
      prepare: fakePrepare,
    });
    const { seen } = await collect(engine);
    expect(seen.map((e) => e.type)).toEqual(['zgloszenie_przeczytane', 'gotowe']);
  });

  it('wynik z callbackiem (także rzucającym) jest identyczny jak bez niego', async () => {
    const a = setup();
    const b = setup();
    const c = setup();
    const plain = await a.engine.verify({ text: INPUT, channel: 'www' });
    const withCb = await collect(b.engine);
    const throwing = await c.engine.verify(
      { text: INPUT, channel: 'www' },
      {
        onProgress: () => {
          throw new Error('odbiorca padł');
        },
      },
    );
    expect(withCb.out).toEqual(plain);
    expect(throwing).toEqual(plain);
  });

  it('verify_ok zapisuje czas sprawdzenia (ms) dla mediany', async () => {
    const { engine, db } = setup();
    await engine.verify({ text: INPUT, channel: 'www' });
    const ok = events(db).find((e) => e.type === 'verify_ok');
    expect(typeof JSON.parse(ok!.detail!).ms).toBe('number');
  });
});

describe('shortPublisher i progressStance', () => {
  it('skraca nazwę wydawcy z bazy', () => {
    expect(shortPublisher('Policja (Komenda Główna Policji)')).toBe('Policja');
    expect(shortPublisher('Komisja Europejska, DG ds. Migracji i Spraw Wewnętrznych')).toBe('Komisja Europejska');
    expect(shortPublisher('Główny Inspektorat Sanitarny')).toBe('Główny Inspektorat Sanitarny');
    expect(shortPublisher('(tylko nawias)')).toBe('(tylko nawias)');
    expect(shortPublisher('A'.repeat(100)).length).toBeLessThanOrEqual(60);
  });
  it('mapuje stanowiska', () => {
    expect(progressStance('potwierdza')).toBe('to_samo');
    expect(progressStance('obala')).toBe('co_innego');
    expect(progressStance('rozbieznosc_kontekstu')).toBe('inna_data_lub_miejsce');
    expect(progressStance('kontekst')).toBe('tlo');
  });
});
