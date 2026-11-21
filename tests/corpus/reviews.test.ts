// Weryfikacje redakcji w zbiorze: plik JSONL -> dokumenty typu factcheck z metadaną oceny,
// teza jako osobny fragment 0, uzasadnienie dalej; ten sam dobór i ta sama tabela ocen co dla indeksu.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { openDb } from '../../src/db/open';
import { ingestCatalog } from '../../src/corpus/ingest';
import { createSearcher } from '../../src/corpus/search';
import { createEngineCore } from '../../src/engine/pipeline';
import { defaultRenderer } from '../../src/engine/render';
import { buildHeadline } from '../../src/render/index';
import { fakePrepare, fixedNow, ScriptedLlm } from '../engine/fakes';
import { sameThesis, scriptedModel } from '../factcheck/helpers';

const THESIS = 'Lipno Testowe to jedyne miasto, w którym seniorzy jeżdżą komunikacją za darmo.';

function setup() {
  const root = mkdtempSync(join(tmpdir(), 'mylik-reviews-'));
  mkdirSync(join(root, 'data/raw/redakcja'), { recursive: true });
  const lines = [
    {
      url: 'https://redakcja.example.org/wypowiedzi/test-1/',
      publisher: 'Redakcja Testowa',
      kind: 'wypowiedz',
      title: 'Czy Lipno Testowe jako jedyne oferuje darmowe przejazdy?',
      claim: THESIS,
      claimant: 'Radny Testowy',
      claimDate: '2026-04-01',
      rating: 'Fałsz',
      reviewDate: '2026-04-10',
      body: 'Darmowe przejazdy dla seniorów oferuje także Gródek Testowy i Borowo Testowe. Lipno Testowe nie jest więc jedynym takim miastem.',
      fetchedAt: '2026-11-21T20:00:00Z',
    },
    { url: 'zly adres', claim: 'x', rating: 'Fałsz' },
  ];
  writeFileSync(join(root, 'data/raw/redakcja/weryfikacje.jsonl'), lines.map((l) => JSON.stringify(l)).join('\n'));
  const catalog = {
    version: 1,
    sources: [
      {
        id: 'redakcja-testowa',
        publisher: 'Redakcja Testowa',
        domain: 'redakcja.example.org',
        sourceType: 'factcheck',
        license: 'test',
        reviews: { file: 'data/raw/redakcja/weryfikacje.jsonl' },
        documents: [],
      },
    ],
  };
  const catalogPath = join(root, 'sources.json');
  writeFileSync(catalogPath, JSON.stringify(catalog));
  const db = openDb(':memory:');
  const res = ingestCatalog(db, catalogPath, root);
  return { db, res };
}

describe('weryfikacje redakcji w zbiorze', () => {
  it('wczytuje plik JSONL: dokument z tezą jako fragmentem 0 i metadaną oceny; złe linie pomija', async () => {
    const { db, res } = setup();
    expect(res.documents).toBe(1);
    const s = createSearcher(db, { excludeSourceIds: [] });
    const found = await s.search('seniorzy darmo', { limit: 10 });
    const thesis = found.find((p) => p.id.endsWith('#0'))!;
    expect(thesis.text).toBe(THESIS);
    expect(thesis.meta).toMatchObject({ layer: 'weryfikacja_redakcji', sourceType: 'factcheck', publishedAt: '2026-04-10' });
    expect(thesis.meta.review).toMatchObject({ claimReviewed: THESIS, rating: 'Fałsz', label: 'falszywe', role: 'teza', claimant: 'Radny Testowy' });
    const body = found.find((p) => !p.id.endsWith('#0'));
    expect(body?.meta.review?.role).toBe('uzasadnienie');
  });

  it('pytanie: ocena redakcji ze zbioru przypisana redakcji; uzasadnienie tylko jako tło', async () => {
    const { db } = setup();
    const m = scriptedModel({ 'jedynym miastem': THESIS }, (c, p) => (p === c ? 'potwierdza' : p.includes('nie jest więc jedynym') ? 'obala' : 'bez_zwiazku'));
    const engine = createEngineCore({
      db,
      searcher: createSearcher(db, { excludeSourceIds: [] }),
      llm: new ScriptedLlm(m.extract, m.assess),
      now: fixedNow,
      prepare: fakePrepare,
      supportGate: null,
      ranker: null,
      renderer: defaultRenderer,
      factcheck: null,
    });
    const out = await engine.verify({ text: 'Czy Lipno Testowe było jedynym miastem z darmowymi przejazdami dla seniorów?', channel: 'www' });
    if (out.kind !== 'record') throw new Error(JSON.stringify(out));
    const c = out.record.claims[0]!;
    expect(c.verdict).toBe('falszywe');
    expect(c.directAnswer).toBe('Nie.');
    expect(buildHeadline(c)).toContain('Nie. Redakcja Testowa sprawdziła twierdzenie');
    expect(buildHeadline(c)).toContain('oceniła je jako „Fałsz”');
    // Uzasadnienie mówi "obala", ale rozstrzyga tylko teza z oceną: zostaje jako tło.
    expect(c.evidence.filter((e) => e.stance === 'obala')).toHaveLength(1);
    expect(c.evidence.some((e) => e.stance === 'kontekst' && e.source.review?.role === 'uzasadnienie')).toBe(true);
    expect(c.explanation).toContain('https://redakcja.example.org/wypowiedzi/test-1/');
  });
});
