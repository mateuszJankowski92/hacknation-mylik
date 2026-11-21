// Fałszywe implementacje do testów silnika (bez sieci i bez klucza).
import type { DatabaseSync } from 'node:sqlite';
import type {
  AssessRequest,
  AssessResult,
  CorpusStats,
  ExtractClaimsRequest,
  ExtractClaimsResult,
  ExtractedClaim,
  LlmProvider,
  LlmUsage,
  NeedsClarification,
  Passage,
  PassageAssessment,
  PreparedInput,
  Searcher,
  SourceMeta,
  Stance,
  VerifyInput,
} from '../../src/contracts/index';
import { sha256Hex } from '../../src/contracts/index';

export const FIXED_NOW = new Date('2026-06-01T12:00:00.000Z');
export const fixedNow = () => new Date(FIXED_NOW.getTime());

export function meta(over: Partial<SourceMeta> & { documentId: string }): SourceMeta {
  return {
    sourceId: `src-${over.documentId}`,
    title: `Dokument ${over.documentId}`,
    publisher: 'Wydawca testowy',
    domain: `${over.documentId}.example.org`,
    url: `https://${over.documentId}.example.org/a`,
    publishedAt: '2026-03-01',
    fetchedAt: '2026-05-01T00:00:00Z',
    sourceType: 'media',
    license: 'test',
    ...over,
  };
}

export function passage(id: string, text: string, m: Partial<SourceMeta> = {}): Passage {
  const documentId = m.documentId ?? id.split('#')[0]!;
  return { id, documentId, text, meta: meta({ ...m, documentId }) };
}

export function usage(): LlmUsage {
  return { model: 'fake', inputTokens: 10, outputTokens: 5, estimatedCostUsd: 0.001, latencyMs: 1 };
}

export interface FakeSearcherOpts {
  version?: string;
  documents?: number;
  failSearch?: boolean;
}

/** Wyszukiwarka w pamięci: zwraca fragmenty zawierające którekolwiek słowo zapytania (>= 4 litery). */
export class FakeSearcher implements Searcher {
  searches = 0;
  constructor(
    public passages: Passage[],
    private opts: FakeSearcherOpts = {},
  ) {}
  corpusVersion() {
    return this.opts.version ?? 'test-v1';
  }
  async search(query: string, o?: { limit?: number }): Promise<Passage[]> {
    this.searches++;
    if (this.opts.failSearch) throw new Error('search down');
    const words = (query.toLowerCase().match(/\p{L}{4,}/gu) ?? []).filter(Boolean);
    return this.passages
      .filter((p) => words.some((w) => p.text.toLowerCase().includes(w)))
      .slice(0, o?.limit ?? 8)
      .map((p, i) => ({ ...p, score: 10 - i }));
  }
  getPassage(id: string) {
    return this.passages.find((p) => p.id === id) ?? null;
  }
  stats(): CorpusStats {
    const docs = new Set(this.passages.map((p) => p.documentId)).size;
    return { documents: this.opts.documents ?? docs, domains: docs, sourceTypes: 1 };
  }
}

export type AssessFn = (req: AssessRequest) => PassageAssessment[];

/** Dostawca sterowany skryptem: ekstrakcja i oceny podane w teście. */
export class ScriptedLlm implements LlmProvider {
  readonly name = 'fake';
  extractCalls = 0;
  assessCalls = 0;
  seenPassageIds: string[] = [];
  constructor(
    private extract: (text: string) => ExtractedClaim[] | Error,
    private assess: AssessFn = () => [],
  ) {}
  async extractClaims(req: ExtractClaimsRequest): Promise<ExtractClaimsResult> {
    this.extractCalls++;
    const r = this.extract(req.text);
    if (r instanceof Error) throw r;
    return { claims: r, usage: usage() };
  }
  async assessPassages(req: AssessRequest): Promise<AssessResult> {
    this.assessCalls++;
    this.seenPassageIds.push(...req.passages.map((p) => p.id));
    return { assessments: this.assess(req), usage: usage() };
  }
}

/** Ocena "z tabeli": stanowisko wg identyfikatora fragmentu, cytat = dosłowny początek fragmentu. */
export function stanceTable(table: Record<string, Stance>, quoteLen = 40): AssessFn {
  return (req) =>
    req.passages.map((p) => {
      const stance = table[p.id] ?? 'bez_zwiazku';
      return { passageId: p.id, stance, quote: stance === 'bez_zwiazku' ? '' : p.text.slice(0, quoteLen) };
    });
}

export function claim(text: string, kind: ExtractedClaim['kind'] = 'faktograficzna', id = 'c1'): ExtractedClaim {
  return { id, text, kind };
}

/** Proste `prepare` do testów: przycina i zwija spacje; URL rozpoznaje po protokole. */
export function fakePrepare(i: VerifyInput): PreparedInput | NeedsClarification {
  if (i.url !== undefined) {
    return { kind: 'url', normalizedInput: i.url, maskedInput: i.url, masks: [], urlInfo: { host: 'example.org', url: i.url } };
  }
  const t = (i.text ?? '').replace(/\s+/g, ' ').trim();
  if (t.length < 5) return { needsClarification: true, message: 'Napisz pełne zdanie.' };
  return { kind: 'tekst', normalizedInput: t.toLowerCase(), maskedInput: t, masks: [] };
}

export function countRecords(db: DatabaseSync): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM records').get() as { n: number }).n;
}

export function events(db: DatabaseSync): { type: string; channel: string | null; record_id: string | null; detail: string | null }[] {
  return db.prepare('SELECT type, channel, record_id, detail FROM events ORDER BY id').all() as never;
}

/** Wstawia mały korpus do prawdziwej bazy (dla prawdziwego `createSearcher`). */
export function seedCorpus(db: DatabaseSync, version: string, passages: Passage[]): void {
  db.prepare("INSERT OR REPLACE INTO corpus_meta(key, value) VALUES ('version', ?)").run(version);
  const src = db.prepare('INSERT OR IGNORE INTO sources(id, publisher, domain, source_type, license) VALUES (?, ?, ?, ?, ?)');
  const doc = db.prepare(
    'INSERT OR IGNORE INTO documents(id, source_id, title, url, published_at, fetched_at, corpus_version, content_sha256) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const pas = db.prepare('INSERT INTO passages(id, document_id, ordinal, text) VALUES (?, ?, ?, ?)');
  passages.forEach((p, i) => {
    const m = p.meta;
    src.run(m.sourceId, m.publisher, m.domain, m.sourceType, m.license);
    doc.run(m.documentId, m.sourceId, m.title, m.url, m.publishedAt, m.fetchedAt, version, sha256Hex(p.text));
    pas.run(p.id, p.documentId, i, p.text);
  });
}
