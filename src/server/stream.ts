// Strumień postępu sprawdzania (Server-Sent Events) i mediana czasu sprawdzeń.
// POST /api/verify zostaje bez zmian; strumień zwraca na końcu ten sam wynik (`event: result`).
import type { DatabaseSync } from 'node:sqlite';
import type { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { API_PATHS, VERIFY_STREAM_EVENTS, type EngineProgressEvent, type VerifyEtaResponse } from '../contracts/api';
import { parseVerifyRequest, safeVerify, verifyBodyLimit, type RouteDeps } from './routes';

/** Wartość domyślna, gdy pomiarów jest za mało. */
export const DEFAULT_ETA_MS = 15_000;
/** Minimalna liczba pomiarów, od której podajemy medianę. */
export const MIN_ETA_SAMPLES = 3;
/** Ile ostatnich pełnych sprawdzeń bierzemy pod uwagę. */
export const ETA_WINDOW = 20;

export function median(values: readonly number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/**
 * Mediana czasu ostatnich pełnych sprawdzeń z logu zdarzeń (`verify_ok`, pole `ms`).
 * Odpowiedzi z pamięci (`cache_hit`) i stany nie są liczone.
 */
export function verifyEta(db: DatabaseSync): VerifyEtaResponse {
  const rows = db
    .prepare(
      `SELECT CAST(json_extract(detail, '$.ms') AS REAL) AS ms FROM events
       WHERE type = 'verify_ok' AND json_extract(detail, '$.ms') IS NOT NULL
       ORDER BY id DESC LIMIT ?`,
    )
    .all(ETA_WINDOW) as Array<{ ms: number | null }>;
  const samples = rows.map((r) => Number(r.ms)).filter((n) => Number.isFinite(n) && n >= 0);
  if (samples.length < MIN_ETA_SAMPLES) return { medianMs: DEFAULT_ETA_MS, samples: samples.length, defaulted: true };
  return { medianMs: Math.round(median(samples)), samples: samples.length, defaulted: false };
}

/** Montowane przed `registerApiRoutes` (ta kończy się zbiorczym 404 dla /api/*). */
export function registerStreamRoutes(app: Hono, deps: RouteDeps): void {
  app.get(API_PATHS.verifyEta, (c) => {
    c.header('Cache-Control', 'no-store');
    return c.json(verifyEta(deps.db), 200);
  });

  app.post(API_PATHS.verifyStream, verifyBodyLimit(), async (c) => {
    const input = await parseVerifyRequest(c);
    if (input instanceof Response) return input;
    c.header('Cache-Control', 'no-store');
    c.header('X-Accel-Buffering', 'no');
    return streamSSE(c, async (stream) => {
      // Zdarzenia przychodzą synchronicznie z silnika; zapisujemy je po kolei, bez czekania silnika na sieć.
      let chain: Promise<void> = Promise.resolve();
      const write = (event: string, data: unknown) => {
        chain = chain.then(async () => {
          if (stream.aborted || stream.closed) return;
          try {
            await stream.writeSSE({ event, data: JSON.stringify(data) });
          } catch {
            // klient się rozłączył: sprawdzanie kończy się normalnie, rekord trafia do bazy
          }
        });
      };
      const outcome = await safeVerify(deps, input, {
        // Wszystkie zdarzenia postępu (także szczegółowe z zad. 45) pod nazwą `progress`; interfejs sprawdza
        // każde schematem i pomija typy, których nie zna.
        onProgress: (e: EngineProgressEvent) => write(VERIFY_STREAM_EVENTS.progress, e),
      });
      write(VERIFY_STREAM_EVENTS.result, outcome);
      await chain;
    });
  });
}
