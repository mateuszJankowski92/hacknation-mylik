// Dodatkowe trasy dla strony wyniku i strony głównej:
// POST /api/verify/key  - identyfikator rekordu znany przed pracą modelu (tylko dla tekstu),
// GET  /api/sources/latest - kilka najświeższych dokumentów korpusu (bez list pytań użytkowników).
import type { Hono } from 'hono';
import { computeRecordKey } from '../contracts/record';
import type { SourceMeta, SourceType } from '../contracts/index';
import { prepareInput } from '../input/index';
import { parseVerifyRequest, verifyBodyLimit, type RouteDeps } from './routes';

export const LATEST_SOURCES_PATH = '/api/sources/latest';
export const VERIFY_KEY_PATH = '/api/verify/key';
export const LATEST_DEFAULT_LIMIT = 5;
export const LATEST_MAX_LIMIT = 10;

/** `recordId` = null: identyfikatora nie da się policzyć przed pracą (adres URL, treść do doprecyzowania, pusty zbiór). */
export interface VerifyKeyResponse {
  recordId: string | null;
}

export interface LatestSourcesResponse {
  corpusVersion: string;
  documents: SourceMeta[];
}

interface LatestRow {
  document_id: string;
  source_id: string;
  title: string;
  publisher: string;
  domain: string;
  url: string;
  published_at: string | null;
  fetched_at: string;
  valid_until: string | null;
  source_type: string;
  license: string;
}

export function registerExtraRoutes(app: Hono, deps: RouteDeps): void {
  const { db, searcher } = deps;
  const latest = db.prepare(`
    SELECT d.id AS document_id, s.id AS source_id, d.title, s.publisher, s.domain, d.url,
           d.published_at, d.fetched_at, d.valid_until, s.source_type, s.license
    FROM documents d JOIN sources s ON s.id = d.source_id
    WHERE d.published_at IS NOT NULL
      AND (d.valid_until IS NULL OR d.valid_until >= ?)
    ORDER BY d.published_at DESC, d.fetched_at DESC, d.id
    LIMIT ?`);

  app.get(LATEST_SOURCES_PATH, (c) => {
    const asked = Number.parseInt(c.req.query('limit') ?? '', 10);
    const limit = Number.isFinite(asked) ? Math.min(Math.max(asked, 1), LATEST_MAX_LIMIT) : LATEST_DEFAULT_LIMIT;
    const today = new Date().toISOString().slice(0, 10);
    const rows = latest.all(today, limit) as unknown as LatestRow[];
    const documents: SourceMeta[] = rows.map((r) => ({
      documentId: r.document_id,
      sourceId: r.source_id,
      title: r.title,
      publisher: r.publisher,
      domain: r.domain,
      url: r.url,
      publishedAt: r.published_at,
      fetchedAt: r.fetched_at,
      validUntil: r.valid_until,
      sourceType: r.source_type as SourceType,
      license: r.license,
    }));
    const res: LatestSourcesResponse = { corpusVersion: searcher.corpusVersion(), documents };
    c.header('Cache-Control', 'no-store');
    return c.json(res, 200);
  });

  app.post(VERIFY_KEY_PATH, verifyBodyLimit(), async (c) => {
    const input = await parseVerifyRequest(c);
    if (input instanceof Response) return input;
    c.header('Cache-Control', 'no-store');
    const none: VerifyKeyResponse = { recordId: null };
    try {
      const prepared = prepareInput(input);
      if (!('normalizedInput' in prepared) || prepared.kind !== 'tekst') return c.json(none, 200);
      if (!searcher.stats().documents) return c.json(none, 200);
      const res: VerifyKeyResponse = { recordId: computeRecordKey(prepared.normalizedInput, searcher.corpusVersion()) };
      return c.json(res, 200);
    } catch {
      return c.json(none, 200);
    }
  });
}
