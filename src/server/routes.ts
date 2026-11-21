// Trasy HTTP kanału WWW. Bez logiki weryfikacji: tylko walidacja wejścia i wywołanie silnika.
import type { DatabaseSync } from 'node:sqlite';
import type { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import {
  API_PATHS,
  type HealthResponse,
  type SourcesResponse,
  VerifyRequestSchema,
} from '../contracts/api';
import type { Engine, Searcher, SourceMeta, SourceType, VerifyOutcome } from '../contracts/index';
import { MESSAGES_PL, apiError } from './errors';

export const MAX_BODY_BYTES = 16 * 1024;
const RECORD_ID_RE = /^[0-9a-f]{64}$/;

/** Komunikat stanu `awaria_techniczna`, gdy serwer złapie wyjątek spoza silnika. */
const TECHNICAL_STATE_MESSAGE =
  'Wystąpił problem techniczny i nie udało się sprawdzić zgłoszenia. To nie jest ocena jego treści. Spróbuj ponownie później.';

export interface RouteDeps {
  engine: Engine;
  db: DatabaseSync;
  searcher: Searcher;
  /** Nazwa dostawcy modelu (bez klucza). */
  providerName: string;
  /** Nazwa modelu (dla `mock` po prostu `mock`). */
  modelName: string;
  /** Zapis zdarzenia serwera do tabeli `events` (bez treści zgłoszeń). */
  logEvent: (type: string, detail: Record<string, string | number | boolean | null>) => void;
}

interface SourceRow {
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

export function registerApiRoutes(app: Hono, deps: RouteDeps): void {
  const { engine, db, searcher } = deps;
  const listSources = db.prepare(`
    SELECT d.id AS document_id, s.id AS source_id, d.title, s.publisher, s.domain, d.url,
           d.published_at, d.fetched_at, d.valid_until, s.source_type, s.license
    FROM documents d JOIN sources s ON s.id = d.source_id
    ORDER BY s.id, d.id`);

  app.post(
    API_PATHS.verify,
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (c) => apiError(c, 413, 'niepoprawne_wejscie', MESSAGES_PL.tooLarge),
    }),
    async (c) => {
      const ct = (c.req.header('content-type') ?? '').toLowerCase();
      if (!/^application\/json\b/.test(ct)) return apiError(c, 400, 'niepoprawne_wejscie', MESSAGES_PL.wrongContentType);
      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        return apiError(c, 400, 'niepoprawne_wejscie', MESSAGES_PL.invalidJson);
      }
      if (typeof body !== 'object' || body === null || Array.isArray(body))
        return apiError(c, 400, 'niepoprawne_wejscie', MESSAGES_PL.invalidJson);
      // Kanał wymusza serwer; to, co przysłał klient, jest ignorowane.
      const parsed = VerifyRequestSchema.safeParse({ ...(body as Record<string, unknown>), channel: 'www' });
      if (!parsed.success) return apiError(c, 400, 'niepoprawne_wejscie', MESSAGES_PL.invalidInput);

      let outcome: VerifyOutcome;
      try {
        outcome = await engine.verify({ ...parsed.data, channel: 'www' });
      } catch (err) {
        // Silnik sam mapuje wyjątki na stany; to jest zabezpieczenie na wypadek nieprzewidzianego.
        const name = err instanceof Error ? err.name.replace(/[^A-Za-z0-9_]/g, '').slice(0, 40) : 'unknown';
        try {
          deps.logEvent('server_error', { route: 'verify', error: name || 'Error' });
        } catch {
          // log niedostępny: nadal zwracamy stan
        }
        outcome = { kind: 'state', state: 'awaria_techniczna', message: TECHNICAL_STATE_MESSAGE, detail: `server:${name}` };
      }
      return c.json(outcome, 200);
    },
  );

  app.get(API_PATHS.record, (c) => {
    const id = c.req.param('id') ?? '';
    if (!RECORD_ID_RE.test(id)) return apiError(c, 400, 'niepoprawne_wejscie', MESSAGES_PL.invalidId);
    const record = engine.getRecord(id);
    if (!record) return apiError(c, 404, 'nie_znaleziono', MESSAGES_PL.recordNotFound);
    return c.json(record, 200);
  });

  app.get(API_PATHS.sources, (c) => {
    const rows = listSources.all() as unknown as SourceRow[];
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
    const res: SourcesResponse = { corpusVersion: searcher.corpusVersion(), documents };
    return c.json(res, 200);
  });

  app.get(API_PATHS.health, (c) => {
    const res: HealthResponse = {
      ok: true,
      provider: deps.providerName,
      model: deps.modelName,
      corpusVersion: searcher.corpusVersion(),
      documents: searcher.stats().documents,
    };
    return c.json(res, 200);
  });

  app.all('/api/*', (c) => apiError(c, 404, 'nie_znaleziono', MESSAGES_PL.apiNotFound));
}
