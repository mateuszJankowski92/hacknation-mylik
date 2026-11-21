// E2E tras strony wyniku: identyfikator przed pracą modelu i najnowsze dokumenty korpusu.
// Bez sieci i bez klucza. Treści fragmentów są wymyślone i neutralne.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VerifyOutcomeSchema } from '../../src/contracts/index';
import { ingestCatalog } from '../../src/corpus/index';
import { openDb } from '../../src/db/open';
import { bootstrap, type Bootstrapped } from '../../src/server/bootstrap';
import type { LatestSourcesResponse, VerifyKeyResponse } from '../../src/server/extras';

const TEXTS: Record<string, string> = {
  'park-1':
    'Zarząd zieleni poinformował, że ogród botaniczny w Lipinach jest otwarty codziennie od godziny ósmej.\n\nWstęp do ogrodu jest bezpłatny dla dzieci.',
  'kolej-1': 'Przewoźnik kolejowy uruchomił nowe połączenie między Brzezinami a Dębowem w poprzednim kwartale.',
};

function boot(): Bootstrapped {
  const root = mkdtempSync(join(tmpdir(), 'mylik-result-'));
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
    config: { llmProvider: 'mock', anthropicApiKey: undefined, incidentsPath: join(tmpdir(), 'mylik-result-brak-incydentow.json') },
    distDir: join(tmpdir(), 'mylik-result-no-dist'),
    log: null,
    warn: () => {},
  });
}

const json = (body: unknown) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const MATCHING = 'Ogród botaniczny w Lipinach jest otwarty codziennie od godziny ósmej.';

describe('POST /api/verify/key', () => {
  it('podaje ten sam identyfikator, który potem ma rekord', async () => {
    const b = boot();
    const key = (await (await b.app.request('/api/verify/key', json({ text: MATCHING }))).json()) as VerifyKeyResponse;
    expect(key.recordId).toMatch(/^[0-9a-f]{64}$/);
    const res = await b.app.request('/api/verify', json({ text: MATCHING }));
    const outcome = VerifyOutcomeSchema.parse(await res.json());
    expect(outcome.kind === 'record' && outcome.record.id).toBe(key.recordId);
    const again = (await (await b.app.request('/api/verify/key', json({ text: `  ${MATCHING}  ` }))).json()) as VerifyKeyResponse;
    expect(again.recordId).toBe(key.recordId);
  });

  it('dla adresu i za krótkiego tekstu zwraca null', async () => {
    const b = boot();
    for (const body of [{ url: 'https://zielen.example.gov/ogrod' }, { text: 'abc' }]) {
      const key = (await (await b.app.request('/api/verify/key', json(body))).json()) as VerifyKeyResponse;
      expect(key.recordId).toBeNull();
    }
  });

  it('odrzuca zły format wejścia', async () => {
    const b = boot();
    const res = await b.app.request('/api/verify/key', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'x' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/sources/latest', () => {
  it('zwraca najświeższe dokumenty, od najnowszego, z ograniczeniem liczby', async () => {
    const b = boot();
    const all = (await (await b.app.request('/api/sources/latest')).json()) as LatestSourcesResponse;
    expect(all.documents.map((d) => d.documentId)).toEqual(['park-1', 'kolej-1']);
    expect(all.documents[0]!.publisher).toBe('Zarząd Zieleni (test)');
    const one = (await (await b.app.request('/api/sources/latest?limit=1')).json()) as LatestSourcesResponse;
    expect(one.documents).toHaveLength(1);
    const bad = (await (await b.app.request('/api/sources/latest?limit=abc')).json()) as LatestSourcesResponse;
    expect(bad.documents).toHaveLength(2);
  });
});
