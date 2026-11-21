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
  HealthResponseSchema,
  API_ERROR_CODES,
  STANCES,
  RECORD_SCHEMA_VERSION,
  ExtractedClaimSchema,
  SourceMetaSchema,
} from '../src/contracts/index';
import { DatabaseSync } from 'node:sqlite';
import { migrate, SCHEMA_VERSION } from '../src/db/schema';
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

  it('migracja v1 -> v2 dodaje documents.valid_until do istniejącej bazy', () => {
    const db = new DatabaseSync(':memory:');
    db.exec(`CREATE TABLE documents (id TEXT PRIMARY KEY, source_id TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL,
      published_at TEXT, fetched_at TEXT NOT NULL, corpus_version TEXT NOT NULL, content_sha256 TEXT NOT NULL)`);
    migrate(db);
    migrate(db); // idempotentnie
    const cols = (db.prepare('PRAGMA table_info(documents)').all() as { name: string }[]).map((c) => c.name);
    expect(cols).toContain('valid_until');
    expect((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version).toBe(SCHEMA_VERSION);
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
          refutation: { performed: true, queries: ['nieprawda że przykład'], found: 0 },
          errorProfile: { bucket: 'faktograficzna', errors: 1, total: 20 },
        },
      ],
      injectionSignals: [],
      createdAt: '2026-11-21T10:00:00.000Z',
      asOf: '2026-01-02T00:00:00Z',
      shortAnswer: 'Stan na 2026-01-02: brak wystarczających dowodów: Przykładowe twierdzenie.',
      provider: 'mock',
      usage: { llmCalls: 2, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, latencyMs: 1 },
      schemaVersion: 2,
    };
    const parsed = VerificationRecordSchema.parse(record);
    expect(parsed.notices).toEqual([]);
    expect(VerifyOutcomeSchema.parse({ kind: 'record', record: parsed, cached: false }).kind).toBe('record');
    expect(() => VerificationRecordSchema.parse({ ...record, claims: [{ ...record.claims[0], verdict: 'awaria_techniczna' }] })).toThrow();
    // v2: stara wersja, brak asOf/shortAnswer/refutation i za długa odpowiedź są odrzucane
    expect(RECORD_SCHEMA_VERSION).toBe(2);
    expect(VerificationRecordSchema.safeParse({ ...record, schemaVersion: 1 }).success).toBe(false);
    const { asOf: _a, ...noAsOf } = record;
    expect(VerificationRecordSchema.safeParse(noAsOf).success).toBe(false);
    expect(VerificationRecordSchema.safeParse({ ...record, shortAnswer: 'x'.repeat(321) }).success).toBe(false);
    const { refutation: _r, ...noRef } = record.claims[0]!;
    expect(VerificationRecordSchema.safeParse({ ...record, claims: [noRef] }).success).toBe(false);
    const badProfile = { ...record.claims[0], errorProfile: { bucket: 'x', errors: 3, total: 2 } };
    expect(VerificationRecordSchema.safeParse({ ...record, claims: [badProfile] }).success).toBe(false);
    // dowód z rozbieżnością kontekstu wymaga `mismatch`
    const ev = record.claims[0]!.evidence[0]!;
    const withEv = (e: object) => ({ ...record, claims: [{ ...record.claims[0], evidence: [e] }] });
    expect(VerificationRecordSchema.safeParse(withEv({ ...ev, stance: 'rozbieznosc_kontekstu' })).success).toBe(false);
    expect(VerificationRecordSchema.safeParse(withEv({ ...ev, stance: 'rozbieznosc_kontekstu', mismatch: 'data' })).success).toBe(true);
    expect(VerificationRecordSchema.safeParse(withEv({ ...ev, mismatch: 'data' })).success).toBe(false);
  });

  it('v2: stanowiska, mismatch, injectionSuspected, counterTerms, validUntil, health, kody błędów', () => {
    expect(STANCES).toEqual(['potwierdza', 'obala', 'rozbieznosc_kontekstu', 'kontekst', 'bez_zwiazku']);
    expect(STATES).toContain('potrzeba_doprecyzowania');
    const a = { passageId: 'd1#0', stance: 'rozbieznosc_kontekstu', quote: 'cytat', injectionSuspected: false };
    expect(AssessOutputSchema.safeParse({ assessments: [a] }).success).toBe(false);
    expect(AssessOutputSchema.safeParse({ assessments: [{ ...a, mismatch: 'miejsce' }] }).success).toBe(true);
    expect(AssessOutputSchema.safeParse({ assessments: [{ ...a, mismatch: 'kolor' }] }).success).toBe(false);
    const { injectionSuspected: _i, ...noFlag } = { ...a, stance: 'potwierdza' };
    expect(AssessOutputSchema.safeParse({ assessments: [noFlag] }).success).toBe(false);
    expect(
      ExtractedClaimSchema.parse({ id: 'c1', text: 't', kind: 'faktograficzna', counterTerms: ['nie', 'zakaz'] }).counterTerms,
    ).toEqual(['nie', 'zakaz']);
    const meta = {
      documentId: 'd1', sourceId: 's1', title: 'T', publisher: 'W', domain: 'example.org', url: 'https://example.org',
      publishedAt: null, fetchedAt: '2026-01-02T00:00:00Z', sourceType: 'urzedowe', license: 'test',
    };
    expect(SourceMetaSchema.safeParse(meta).success).toBe(true);
    expect(SourceMetaSchema.safeParse({ ...meta, validUntil: '2026-12-31' }).success).toBe(true);
    expect(SourceMetaSchema.safeParse({ ...meta, validUntil: 'jutro' }).success).toBe(false);
    const h = { ok: true, provider: 'mock', model: 'mock', corpusVersion: 'v1', documents: 1 };
    expect(HealthResponseSchema.safeParse(h).success).toBe(true);
    const { model: _m, ...noModel } = h;
    expect(HealthResponseSchema.safeParse(noModel).success).toBe(false);
    expect(API_ERROR_CODES).toContain('blad_serwera');
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
