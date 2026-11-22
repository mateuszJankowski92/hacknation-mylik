// E2E strumienia postępu (SSE) i mediany czasu: prawdziwy silnik, baza :memory:, dostawca `mock`.
// Bez sieci i bez klucza. Treści fragmentów są wymyślone i neutralne.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VerifyEtaResponseSchema, VerifyProgressDetailEventSchema, VerifyProgressEventSchema, type VerifyProgressEvent } from '../../src/contracts/api';
import { VerifyOutcomeSchema, type VerifyOutcome } from '../../src/contracts/index';
import { ingestCatalog } from '../../src/corpus/index';
import { openDb } from '../../src/db/open';
import { bootstrap, type Bootstrapped } from '../../src/server/bootstrap';
import { DEFAULT_ETA_MS, median } from '../../src/server/stream';

const TEXTS: Record<string, string> = {
  'park-1':
    'Zarząd zieleni poinformował, że ogród botaniczny w Lipinach jest otwarty codziennie od godziny ósmej.\n\nWstęp do ogrodu jest bezpłatny dla dzieci.',
  'kolej-1': 'Przewoźnik kolejowy uruchomił nowe połączenie między Brzezinami a Dębowem w poprzednim kwartale.',
};

function boot(): Bootstrapped {
  const root = mkdtempSync(join(tmpdir(), 'mylik-stream-'));
  mkdirSync(join(root, 'data/raw'), { recursive: true });
  for (const [id, text] of Object.entries(TEXTS)) writeFileSync(join(root, `data/raw/${id}.txt`), text);
  const catalog = {
    version: 1,
    sources: [
      {
        id: 'zielen',
        publisher: 'Zarząd Zieleni (test)',
        domain: 'zielen.example.gov',
        sourceType: 'urzedowe',
        license: 'test',
        documents: [{ id: 'park-1', title: 'Ogród', url: 'https://zielen.example.gov/ogrod', publishedAt: '2026-09-01', file: 'data/raw/park-1.txt' }],
      },
      {
        id: 'kolej',
        publisher: 'Przewoźnik, dział prasowy',
        domain: 'kolej.example.com',
        sourceType: 'media',
        license: 'test',
        documents: [{ id: 'kolej-1', title: 'Połączenie', url: 'https://kolej.example.com/1', publishedAt: '2026-08-15', file: 'data/raw/kolej-1.txt' }],
      },
    ],
  };
  writeFileSync(join(root, 'sources.json'), JSON.stringify(catalog));
  const db = openDb(':memory:');
  ingestCatalog(db, join(root, 'sources.json'), root);
  return bootstrap({
    env: {},
    db,
    config: { llmProvider: 'mock', anthropicApiKey: undefined, incidentsPath: join(tmpdir(), 'mylik-stream-brak-incydentow.json') },
    distDir: join(tmpdir(), 'mylik-stream-no-dist'),
    log: null,
    warn: () => {},
  });
}

const json = (body: unknown) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

function parseSse(text: string): { event: string; data: unknown }[] {
  return text
    .split('\n\n')
    .filter((b) => b.trim())
    .map((block) => {
      const lines = block.split('\n');
      const event = lines.find((l) => l.startsWith('event: '))?.slice(7) ?? '';
      const data = lines
        .filter((l) => l.startsWith('data: '))
        .map((l) => l.slice(6))
        .join('\n');
      return { event, data: JSON.parse(data) };
    });
}

async function stream(b: Bootstrapped, body: unknown) {
  const res = await b.app.request('/api/verify/stream', json(body));
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toContain('text/event-stream');
  const msgs = parseSse(await res.text());
  // Zdarzenia szczegółowe (zad. 45) idą tym samym kanałem; każde musi pasować do jednego ze schematów.
  const all = msgs.filter((m) => m.event === 'progress');
  for (const m of all) expect(VerifyProgressEventSchema.safeParse(m.data).success || VerifyProgressDetailEventSchema.safeParse(m.data).success).toBe(true);
  const details = all.filter((m) => VerifyProgressDetailEventSchema.safeParse(m.data).success).map((m) => VerifyProgressDetailEventSchema.parse(m.data));
  const progress = all.filter((m) => VerifyProgressEventSchema.safeParse(m.data).success).map((m) => VerifyProgressEventSchema.parse(m.data));
  const results = msgs.filter((m) => m.event === 'result');
  expect(results).toHaveLength(1);
  expect(msgs.at(-1)!.event).toBe('result');
  return { res, progress, details, outcome: VerifyOutcomeSchema.parse(results[0]!.data) };
}

async function plain(b: Bootstrapped, body: unknown): Promise<VerifyOutcome> {
  const res = await b.app.request('/api/verify', json(body));
  expect(res.status).toBe(200);
  return VerifyOutcomeSchema.parse(await res.json());
}

const MATCHING = 'Ogród botaniczny w Lipinach jest otwarty codziennie od godziny ósmej.';

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Dwa serwery mają osobno zbudowany korpus: moment pobrania i wersja korpusu (asOf) różnią się
 * o milisekundy (zegar SQLite). Tylko te dwa pola ujednolicamy; reszta rekordu musi być identyczna.
 */
function stable(o: VerifyOutcome): unknown {
  if (o.kind !== 'record') return o;
  const copy = structuredClone(o);
  copy.record.asOf = 'X';
  for (const c of copy.record.claims) for (const e of c.evidence) e.source.fetchedAt = 'X';
  return copy;
}

describe('POST /api/verify/stream', () => {
  it('zdarzenia postępu, potem wynik; ten sam rekord co ze zwykłego wywołania', async () => {
    const b = boot();
    const s = await stream(b, { text: MATCHING });
    expect(s.res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(s.outcome.kind).toBe('record');
    if (s.outcome.kind !== 'record') return;
    expect(s.outcome.cached).toBe(false);
    const types = s.progress.map((e) => e.type);
    expect(types[0]).toBe('zgloszenie_przeczytane');
    expect(types).toContain('fragmenty_za');
    expect(types).toContain('szukanie_przeciw_start');
    expect(types).toContain('szukanie_przeciw_koniec');
    expect(types.at(-1)).toBe('gotowe');
    // Zad. 45: etapy szczegółowe w tym samym strumieniu, liczby zgodne z rekordem.
    if (s.outcome.kind === 'record' && s.outcome.record.claims.length > 0) {
      const searched = s.details.filter((e) => e.type === 'przeszukano');
      expect(searched.length).toBeGreaterThan(0);
      for (const e of searched) expect((e as { documents: number }).documents).toBeGreaterThan(0);
      const judged = s.details.filter((e) => e.type === 'twierdzenie_ocenione') as { claim: number; passed: number }[];
      for (const e of judged) expect(e.passed).toBe(s.outcome.record.claims[e.claim]!.evidence.length);
    }
    expect(s.progress.at(-1)).toEqual({ type: 'gotowe', recordId: s.outcome.record.id, cached: false, checkedAt: s.outcome.record.createdAt });
    const assessed = s.progress.filter((e): e is Extract<VerifyProgressEvent, { type: 'fragment_oceniony' }> => e.type === 'fragment_oceniony');
    expect(assessed.length).toBe(s.outcome.record.claims.flatMap((c) => c.evidence).length);
    expect(assessed.map((e) => e.publisher)).toContain('Zarząd Zieleni');
    // Zdarzenia bez treści zgłoszenia i fragmentów.
    const evJson = JSON.stringify(s.progress);
    for (const w of ['Lipinach', 'botaniczny', 'ósmej']) expect(evJson).not.toContain(w);

    // Ten sam rekord ze zwykłego wywołania (z pamięci) i z GET /api/records/:id.
    const again = await plain(b, { text: MATCHING });
    expect(again.kind === 'record' && again.cached).toBe(true);
    if (again.kind !== 'record') return;
    expect(again.record).toEqual(s.outcome.record);
    const byId = await (await b.app.request(`/api/records/${s.outcome.record.id}`)).json();
    const { appearance, ...byIdRecord } = byId as Record<string, unknown>;
    expect(appearance).toMatchObject({ serious: expect.any(Boolean) });
    expect(byIdRecord).toEqual(s.outcome.record);
  });

  it('spójność z POST /api/verify na osobnym serwerze (zamrożony zegar)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-20T10:00:00.000Z'));
    const texts = [MATCHING, 'Kometa Halleya przeleciała nisko nad Zakopanem podczas ostatniej pełni księżyca.', 'abc'];
    for (const text of texts) {
      const s = await stream(boot(), { text });
      const p = await plain(boot(), { text });
      expect(stable(s.outcome)).toEqual(stable(p));
    }
  }, 30_000);

  it('powtórka w strumieniu: tylko "gotowe" z cached=true', async () => {
    const b = boot();
    await plain(b, { text: MATCHING });
    const s = await stream(b, { text: MATCHING });
    expect(s.outcome.kind === 'record' && s.outcome.cached).toBe(true);
    expect(s.progress.map((e) => e.type)).toEqual(['gotowe']);
  });

  it('stan zamiast rekordu: bez zdarzeń postępu, sam wynik', async () => {
    const s = await stream(boot(), { text: 'abc' });
    expect(s.outcome.kind).toBe('state');
    expect(s.progress).toEqual([]);
  });

  it('błędne wejście: zwykła odpowiedź JSON jak w /api/verify', async () => {
    const b = boot();
    const bad = await b.app.request('/api/verify/stream', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'x' });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toBe('niepoprawne_wejscie');
    const big = await b.app.request('/api/verify/stream', json({ text: 'a'.repeat(20_000) }));
    expect(big.status).toBe(413);
  });
});

describe('GET /api/verify/eta', () => {
  it('za mało pomiarów: 15 s domyślnie; potem mediana z logu zdarzeń', async () => {
    const b = boot();
    const first = VerifyEtaResponseSchema.parse(await (await b.app.request('/api/verify/eta')).json());
    expect(first).toEqual({ medianMs: DEFAULT_ETA_MS, samples: 0, defaulted: true });
    for (const t of [MATCHING, 'Przewoźnik kolejowy uruchomił połączenie między Brzezinami a Dębowem.', 'Wstęp do ogrodu jest bezpłatny dla dzieci.'])
      await plain(b, { text: t });
    await plain(b, { text: MATCHING }); // z pamięci: nie liczy się
    const eta = VerifyEtaResponseSchema.parse(await (await b.app.request('/api/verify/eta')).json());
    expect(eta.defaulted).toBe(false);
    expect(eta.samples).toBe(3);
  });
  it('median', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});
