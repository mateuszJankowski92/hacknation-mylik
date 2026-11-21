// Masowe pobranie spisu weryfikacji z indeksu (atrapa API): stronicowanie, filtr domeny, wznawianie,
// limit zapytań, zatrzymanie przy limicie API; import pliku zbiorczego ClaimReview; wczytanie do zbioru.
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { IndexListRequest, IndexListResult } from '../../src/factcheck/client';
import { appendFeedRecords, harvestIndex, harvestStats, recordsFromFeed, siteFile } from '../../src/factcheck/harvest';
import { loadReviewFile } from '../../src/corpus/reviews';
import { testConfig } from './helpers';

function pages(site: string, n: number) {
  return Array.from({ length: n }, (_, i) => ({
    claims: [
      {
        text: `Teza testowa numer ${i}`,
        claimant: 'Autor Testowy',
        claimDate: '2026-01-0' + ((i % 9) + 1) + 'T00:00:00Z',
        claimReview: [
          { publisher: { name: 'Redakcja', site }, url: `https://${site}/w/${i}/`, title: `Tytuł ${i}`, reviewDate: `2026-02-0${(i % 9) + 1}T00:00:00Z`, textualRating: i % 2 ? 'Fałsz' : 'Prawda' },
          // ocena innego wydawcy w tym samym wpisie: odpada
          { publisher: { name: 'Inny', site: 'inny.example.org' }, url: `https://inny.example.org/${i}`, textualRating: 'Prawda' },
        ],
      },
    ],
  }));
}

function fakeList(data: Record<string, ReturnType<typeof pages>>, opts: { failAt?: number } = {}) {
  const calls: IndexListRequest[] = [];
  const list = async (req: IndexListRequest): Promise<IndexListResult> => {
    calls.push(req);
    if (opts.failAt !== undefined && calls.length === opts.failAt) return { ok: false, code: 'limit', status: 429 };
    const p = data[req.site] ?? [];
    const i = req.pageToken ? Number(req.pageToken) : 0;
    return { ok: true, claims: p[i]?.claims ?? [], nextPageToken: i + 1 < p.length ? String(i + 1) : null };
  };
  return { list, calls };
}

describe('masowe pobranie z indeksu', () => {
  const cfg = testConfig();
  const sleep = async () => {};

  it('przechodzi wszystkie strony wydawcy z filtrem domeny, bez query, z odstępem i zapisem JSONL', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mylik-harvest-'));
    const { list, calls } = fakeList({ 'demagog.org.pl': pages('demagog.org.pl', 3) });
    let slept = 0;
    const s = await harvestIndex({ config: cfg, list, dir, sites: ['demagog.org.pl'], sleep: async () => void slept++ });
    expect(calls.map((c) => c.pageToken ?? null)).toEqual([null, '1', '2']);
    expect(calls.every((c) => c.site === 'demagog.org.pl' && c.languageCode === 'pl')).toBe(true);
    expect(slept).toBe(2);
    expect(s.perSite['demagog.org.pl']).toMatchObject({ total: 3, done: true });
    const lines = readFileSync(siteFile(dir, 'demagog.org.pl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    expect(lines[0]).toMatchObject({ claim: 'Teza testowa numer 0', rating: 'Prawda', url: 'https://demagog.org.pl/w/0/', claimant: 'Autor Testowy', via: 'claims_search' });
    expect(lines.some((l) => l.url.includes('inny'))).toBe(false);
    // Format zgodny z wczytywaniem weryfikacji do zbioru.
    expect(loadReviewFile(siteFile(dir, 'demagog.org.pl'), dir, 'fc-demagog').documents).toHaveLength(3);
    expect(harvestStats(dir, ['demagog.org.pl'])['demagog.org.pl']).toMatchObject({ entries: 3, ratings: { Prawda: 2, Fałsz: 1 }, from: '2026-02-01', to: '2026-02-03' });
  });

  it('limit API (429): zatrzymanie i wznowienie od tej samej strony bez duplikatów', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mylik-harvest-'));
    const data = { 'demagog.org.pl': pages('demagog.org.pl', 4) };
    const a = fakeList(data, { failAt: 3 });
    const s1 = await harvestIndex({ config: cfg, list: a.list, dir, sites: ['demagog.org.pl'], sleep });
    expect(s1.stoppedBy).toBe('limit:429');
    expect(JSON.parse(readFileSync(join(dir, '_state.json'), 'utf8')).sites['demagog.org.pl']).toMatchObject({ nextPageToken: '2', done: false });
    const b = fakeList(data);
    await harvestIndex({ config: cfg, list: b.list, dir, sites: ['demagog.org.pl'], sleep });
    expect(b.calls.map((c) => c.pageToken)).toEqual(['2', '3']);
    expect(harvestStats(dir, ['demagog.org.pl'])['demagog.org.pl']!.entries).toBe(4);
    // Kolejny przebieg po komplecie: bez zapytań.
    const c = fakeList(data);
    await harvestIndex({ config: cfg, list: c.list, dir, sites: ['demagog.org.pl'], sleep });
    expect(c.calls).toHaveLength(0);
  });

  it('limit zapytań na przebieg', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mylik-harvest-'));
    const { list, calls } = fakeList({ 'demagog.org.pl': pages('demagog.org.pl', 10) });
    const s = await harvestIndex({ config: cfg, list, dir, sites: ['demagog.org.pl'], sleep, maxRequests: 4 });
    expect(calls).toHaveLength(4);
    expect(s.stoppedBy).toBe('limit_zapytan_przebiegu');
  });

  it('brak klucza: nic nie zapisuje poza stanem, kończy od razu', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mylik-harvest-'));
    const s = await harvestIndex({ config: cfg, list: async () => ({ ok: false, code: 'brak_klucza' }), dir, sites: ['demagog.org.pl'], sleep });
    expect(s.stoppedBy).toBe('brak_klucza');
    expect(existsSync(siteFile(dir, 'demagog.org.pl'))).toBe(false);
  });

  it('plik zbiorczy ClaimReview: tylko wydawcy z listy, po domenie adresu, bez duplikatów', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mylik-feed-'));
    const feed = {
      '@type': 'DataFeed',
      dataFeedElement: [
        { item: [{ '@type': 'ClaimReview', url: 'https://pravda.org.pl/x/1', claimReviewed: 'Teza A', datePublished: '2024-01-02', author: { name: 'Pravda' }, reviewRating: { alternateName: 'Fałsz' }, itemReviewed: { author: { name: 'Polityk' }, datePublished: '2023-12-30' } }] },
        { item: [{ '@type': 'ClaimReview', url: 'https://nie-z-listy.example.org/1', claimReviewed: 'Teza B', reviewRating: { alternateName: 'Prawda' } }] },
        { item: null },
      ],
    };
    const recs = recordsFromFeed(feed, testConfig(), '2026-11-21T00:00:00Z');
    expect([...recs.keys()]).toEqual(['pravda.org.pl']);
    expect(appendFeedRecords(dir, recs)).toEqual({ 'pravda.org.pl': 1 });
    expect(appendFeedRecords(dir, recs)).toEqual({ 'pravda.org.pl': 0 });
    const line = JSON.parse(readFileSync(siteFile(dir, 'pravda.org.pl'), 'utf8').trim());
    expect(line).toMatchObject({ claim: 'Teza A', rating: 'Fałsz', claimant: 'Polityk', claimDate: '2023-12-30', reviewDate: '2024-01-02', via: 'claimreview_feed' });
    writeFileSync(join(dir, 'x'), '');
  });
});
