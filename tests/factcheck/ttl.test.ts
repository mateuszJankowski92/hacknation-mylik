// Rekordy z wpisami z indeksu Google: krótki czas życia (domyślnie 24 h), wygasanie leniwe,
// polecenie czyszczenia; rekordy bez takich wpisów bez zmian; spójność kanałów w czasie życia.
import { describe, expect, it } from 'vitest';
import { openDb } from '../../src/db/open';
import { createEngineCore } from '../../src/engine/pipeline';
import { defaultRenderer } from '../../src/engine/render';
import { purgeOlderThan } from '../../src/security/retention';
import { events, FakeSearcher, fakePrepare, passage, ScriptedLlm } from '../engine/fakes';
import { apiClaim, FakeIndex, layerWith, sameThesis, scriptedModel } from './helpers';

const THESIS = 'Lipno Testowe to jedyne miasto, w którym seniorzy jeżdżą komunikacją za darmo.';
const Q = 'Czy Lipno Testowe było jedynym miastem z darmowymi przejazdami dla seniorów?';
const H = 3_600_000;

function setup(ttlMs: number | undefined, withIndex = true) {
  let t = Date.parse('2026-06-01T12:00:00Z');
  const now = () => new Date(t);
  const db = openDb(':memory:');
  const index = new FakeIndex([{ key: 'seniorzy', claims: [apiClaim({ text: THESIS, rating: 'Fałsz', url: 'https://demagog.org.pl/x/' })] }]);
  const official = passage('urz#0', 'Komunikat urzędu: seniorzy w Lipnie Testowym jeżdżą komunikacją za darmo, podobnie jak w innych miastach.', { sourceType: 'urzedowe' });
  const m = scriptedModel({ 'jedynym miastem': THESIS }, withIndex ? sameThesis : { 'Komunikat urzędu': 'obala' });
  const engine = createEngineCore({
    db,
    searcher: new FakeSearcher(withIndex ? [passage('g#0', 'Nic tu nie ma.', { sourceType: 'urzedowe' })] : [official]),
    llm: new ScriptedLlm(m.extract, m.assess),
    now,
    prepare: fakePrepare,
    supportGate: null,
    ranker: null,
    renderer: defaultRenderer,
    factcheck: withIndex ? layerWith(index) : null,
    options: { ...(ttlMs !== undefined ? { indexRecordTtlMs: ttlMs } : {}), liveCacheWindowMs: 365 * 24 * H },
  });
  return { db, engine, index, advance: (ms: number) => (t += ms), now };
}

describe('czas życia rekordów z wpisami z indeksu', () => {
  it('w ciągu 24 h WWW i SMS dostają ten sam zapisany rekord; po 24 h rekord wygasa i liczy się od nowa', async () => {
    const { db, engine, index, advance } = setup(24 * H);
    const a = await engine.verify({ text: Q, channel: 'www' });
    advance(23 * H);
    const b = await engine.verify({ text: Q, channel: 'sms' });
    expect(a.kind === 'record' && b.kind === 'record' && b.cached && a.record.id === b.record.id).toBe(true);
    const callsBefore = index.calls.length;
    advance(2 * H);
    const id = a.kind === 'record' ? a.record.id : '';
    // Odczyt wygasłego rekordu = brak rekordu (jak nieistniejący).
    expect(engine.getRecord(id)).toBeNull();
    expect(events(db).some((e) => e.type === 'record_expired' && e.record_id === id)).toBe(true);
    const c = await engine.verify({ text: Q, channel: 'www' });
    expect(c.kind === 'record' && !c.cached).toBe(true);
    expect(index.calls.length).toBeGreaterThan(callsBefore);
  });

  it('TTL 0: rekord z wpisem z indeksu nie jest zapisywany (wynik tylko w odpowiedzi)', async () => {
    const { engine } = setup(0);
    const a = await engine.verify({ text: Q, channel: 'www' });
    expect(a.kind).toBe('record');
    expect(a.kind === 'record' && engine.getRecord(a.record.id)).toBeNull();
  });

  it('rekord bez wpisów z indeksu nie jest skracany', async () => {
    const { engine, advance } = setup(24 * H, false);
    const a = await engine.verify({ text: Q, channel: 'www' });
    if (a.kind !== 'record') throw new Error('rekord');
    advance(10 * 24 * H);
    expect(engine.getRecord(a.record.id)?.id).toBe(a.record.id);
  });

  it('polecenie czyszczenia usuwa rekordy z indeksu po 24 h, inne dopiero po RETENTION_DAYS', async () => {
    const x = setup(24 * H);
    const y = setup(24 * H, false);
    const a = await x.engine.verify({ text: Q, channel: 'www' });
    const b = await y.engine.verify({ text: Q, channel: 'www' });
    expect(a.kind === 'record' && b.kind === 'record').toBe(true);
    const later = new Date(Date.parse('2026-06-01T12:00:00Z') + 25 * H);
    expect(purgeOlderThan(x.db, 30, later, 24).records).toBe(1);
    expect(purgeOlderThan(y.db, 30, later, 24).records).toBe(0);
  });
});
