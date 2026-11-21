import { describe, expect, it } from 'vitest';
import {
  computeRecordKey,
  sha256Hex,
  VERDICTS,
  STATES,
  VerificationRecordSchema,
  VerifyInputSchema,
  VerifyOutcomeSchema,
  ExtractClaimsOutputSchema,
  AssessOutputSchema,
  LlmError,
} from '../src/contracts/index';
import { loadConfig, redactedConfig } from '../src/config';
import { openDb } from '../src/db/open';

describe('baza', () => {
  it('migracja na :memory: przechodzi, FTS5 trigram znajduje słowo z diakrytykami', () => {
    const db = openDb(':memory:');
    db.prepare(
      "INSERT INTO sources(id, publisher, domain, source_type, license) VALUES ('s1','Wydawca','example.org','urzedowe','test')",
    ).run();
    db.prepare(
      "INSERT INTO documents(id, source_id, title, url, published_at, fetched_at, corpus_version, content_sha256) VALUES ('d1','s1','Tytuł','https://example.org/a','2026-01-01','2026-01-02T00:00:00Z','v1','x')",
    ).run();
    db.prepare("INSERT INTO passages(id, document_id, ordinal, text) VALUES ('d1#0','d1',0,?)").run(
      'Spotkanie odbyło się w mieście Łódź w poniedziałek.',
    );
    db.prepare("INSERT INTO passages(id, document_id, ordinal, text) VALUES ('d1#1','d1',1,?)").run(
      'Inny fragment bez nazwy miasta.',
    );
    const rows = db
      .prepare('SELECT p.id FROM passages_fts f JOIN passages p ON p.rowid = f.rowid WHERE passages_fts MATCH ?')
      .all('"Łódź"') as { id: string }[];
    expect(rows.map((r) => r.id)).toEqual(['d1#0']);
    // bez rozróżniania wielkości liter
    const rows2 = db.prepare('SELECT rowid FROM passages_fts WHERE passages_fts MATCH ?').all('"łódź"');
    expect(rows2.length).toBe(1);
    // trigger usuwania synchronizuje indeks
    db.prepare("DELETE FROM passages WHERE id = 'd1#0'").run();
    expect(db.prepare('SELECT rowid FROM passages_fts WHERE passages_fts MATCH ?').all('"Łódź"').length).toBe(0);
    db.close();
  });
});

describe('kontrakty', () => {
  it('computeRecordKey jest deterministyczny i zależy od wersji korpusu', () => {
    const a = computeRecordKey('tekst', 'v1');
    expect(a).toBe(computeRecordKey('tekst', 'v1'));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(computeRecordKey('tekst', 'v2'));
    expect(a).toBe(sha256Hex('tekst\nv1'));
  });

  it('stany nie są werdyktami', () => {
    for (const s of STATES) expect((VERDICTS as readonly string[]).includes(s)).toBe(false);
  });

  it('przykładowy rekord przechodzi VerificationRecordSchema.parse', () => {
    const normalized = 'przykładowe doniesienie [EMAIL]';
    const record = {
      id: computeRecordKey(normalized, 'v1'),
      inputHash: sha256Hex(normalized),
      corpusVersion: 'v1',
      inputKind: 'tekst',
      maskedInput: normalized,
      piiMasked: [{ type: 'email', count: 1 }],
      claims: [
        {
          claim: { id: 'c1', text: 'Przykładowe twierdzenie.', kind: 'faktograficzna', searchTerms: ['przykład', 'przykładowe'] },
          verdict: 'brak_wystarczajacych_dowodow',
          strength: { level: 'brak', reasons: ['brak_dowodow'] },
          explanation: 'W korpusie nie znaleziono źródeł odnoszących się do tego twierdzenia.',
          explanationSource: 'szablon',
          evidence: [
            {
              passageId: 'd1#0',
              stance: 'kontekst',
              quote: 'fragment',
              source: {
                documentId: 'd1',
                sourceId: 's1',
                title: 'Tytuł',
                publisher: 'Wydawca',
                domain: 'example.org',
                url: 'https://example.org/a',
                publishedAt: null,
                fetchedAt: '2026-01-02T00:00:00Z',
                sourceType: 'urzedowe',
                license: 'test',
              },
              archival: false,
            },
          ],
          limitations: [],
          abstainReason: 'brak_dowodow',
        },
      ],
      injectionSignals: [],
      createdAt: '2026-11-21T10:00:00.000Z',
      provider: 'mock',
      usage: { llmCalls: 2, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, latencyMs: 1 },
      schemaVersion: 1,
    };
    const parsed = VerificationRecordSchema.parse(record);
    expect(parsed.notices).toEqual([]);
    expect(VerifyOutcomeSchema.parse({ kind: 'record', record: parsed, cached: false }).kind).toBe('record');
    expect(() => VerificationRecordSchema.parse({ ...record, claims: [{ ...record.claims[0], verdict: 'awaria_techniczna' }] })).toThrow();
  });

  it('VerifyInput wymaga dokładnie jednego z text/url', () => {
    expect(VerifyInputSchema.safeParse({ text: 'a', channel: 'www' }).success).toBe(true);
    expect(VerifyInputSchema.safeParse({ url: 'https://x.pl', channel: 'sms' }).success).toBe(true);
    expect(VerifyInputSchema.safeParse({ text: 'a', url: 'https://x.pl', channel: 'www' }).success).toBe(false);
    expect(VerifyInputSchema.safeParse({ channel: 'www' }).success).toBe(false);
  });

  it('schematy wyjścia modelu i LlmError', () => {
    expect(ExtractClaimsOutputSchema.parse({ claims: [{ id: 'c1', text: 't', kind: 'opinia' }] }).claims.length).toBe(1);
    expect(AssessOutputSchema.safeParse({ assessments: [{ passageId: 'd1#0', stance: 'inna', quote: '' }] }).success).toBe(false);
    const e = new LlmError('rate_limit', 'limit');
    expect(e).toBeInstanceOf(Error);
    expect(e.retryable).toBe(true);
  });
});

describe('konfiguracja', () => {
  it('wartości domyślne i brak klucza nie wywracają loadConfig', () => {
    const d = loadConfig({});
    expect(d).toMatchObject({ llmProvider: 'mock', dbPath: 'data/mylik.sqlite', port: 8787, rateLimitPerMin: 20, retentionDays: 30 });
    const a = loadConfig({ LLM_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: '' });
    expect(a.llmProvider).toBe('anthropic');
    expect(a.anthropicApiKey).toBeUndefined();
    expect(loadConfig({ LLM_PROVIDER: 'mistral' }).llmProvider).toBe('mistral');
    const r = redactedConfig(loadConfig({ ANTHROPIC_API_KEY: 'tajne' }));
    expect(JSON.stringify(r)).not.toContain('tajne');
  });
});
