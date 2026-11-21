// Aplikacja Hono (bez portu): nagłówki bezpieczeństwa, log żądań, trasy API, statyczny interfejs.
import { Hono } from 'hono';
import { serverError } from './errors';
import { registerApiRoutes, type RouteDeps } from './routes';
import { createStaticHandler } from './static';

export interface AppDeps extends RouteDeps {
  /** Katalog zbudowanego interfejsu (zwykle dist/web). */
  distDir: string;
  /** Jedna linia logu na żądanie; domyślnie console.log. `null` wyłącza. */
  log?: ((line: string) => void) | null;
}

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function createApp(deps: AppDeps): Hono {
  const app = new Hono();
  const log = deps.log === undefined ? (line: string) => console.log(line) : deps.log;

  // Log: metoda, ścieżka (bez query), status, czas. Bez treści zgłoszeń i bez nagłówków.
  app.use('*', async (c, next) => {
    const t0 = performance.now();
    await next();
    if (log) {
      const ms = Math.round(performance.now() - t0);
      log(`${c.req.method} ${c.req.path.slice(0, 200)} ${c.res.status} ${ms}ms`);
    }
  });

  app.use('*', async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'no-referrer');
    c.header('Content-Security-Policy', CSP);
    c.header('X-Frame-Options', 'DENY');
    c.header('Cross-Origin-Opener-Policy', 'same-origin');
    c.header('Cross-Origin-Resource-Policy', 'same-origin');
    // Brak nagłówków CORS: API dostępne tylko z tego samego originu.
  });

  // TODO(zad. 07): limit żądań (RATE_LIMIT_PER_MIN) i retencja rekordów/zdarzeń jako middleware tutaj.

  registerApiRoutes(app, deps);

  const serveStatic = createStaticHandler(deps.distDir);
  app.get('*', (c) => serveStatic(c));

  app.onError((err, c) => {
    const name = err instanceof Error ? err.name.replace(/[^A-Za-z0-9_]/g, '').slice(0, 40) : 'unknown';
    try {
      deps.logEvent('server_error', { route: c.req.path.startsWith('/api/') ? c.req.path.slice(0, 40) : 'static', error: name });
    } catch {
      // log niedostępny
    }
    return serverError(c);
  });

  return app;
}
