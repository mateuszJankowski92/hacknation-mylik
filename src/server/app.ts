// Aplikacja Hono (bez portu): log żądań, nagłówki bezpieczeństwa, limit żądań, trasy API,
// podaplikacje (SMS, karta SVG, statystyki) i statyczny interfejs.
import { createHash } from 'node:crypto';
import { Hono, type MiddlewareHandler } from 'hono';
import { createCardApp } from '../card/index';
import { createCaseStore, type CaseStore } from '../cases/index';
import { createDiscordApp } from '../discord/index';
import { createStatsApp, requestLogger, type LogEventFn } from '../obs/index';
import { RATE_LIMIT_MESSAGE_PL, rateLimit } from '../security/index';
import { SIMULATOR_HTML, createSmsApp } from '../sms/index';
import { createClerkApp, type ClerkDeps } from './clerk';
import { serverError } from './errors';
import { registerExtraRoutes } from './extras';
import { registerTrustedPublishersRoute } from './layers';
import { injectPageMeta, isKnownPagePath, isRecordPath, registerSeoRoutes, resolveBaseUrl } from './seo';
import { registerCaseStatusRoute } from './obieg';
import { registerApiRoutes, type RouteDeps } from './routes';
import { addShowcaseMeta } from './showcase';
import { createStaticHandler } from './static';
import { registerStreamRoutes } from './stream';

export interface AppDeps extends RouteDeps {
  /** Katalog zbudowanego interfejsu (zwykle dist/web). */
  distDir: string;
  /** Jedna linia logu na żądanie; domyślnie console.log. `null` wyłącza. */
  log?: ((line: string) => void) | null;
  /** Zapis zdarzeń kanału SMS (kanał `sms` w tabeli events). Domyślnie `logEvent`. */
  logEventSms?: LogEventFn;
  /** Kanał Discord (POST /discord/interactions): klucz publiczny aplikacji, jej identyfikator, zapis zdarzeń. */
  discord?: { publicKey?: string; applicationId?: string; logEvent?: LogEventFn };
  /** Limit zgłoszeń na minutę na klienta (POST /api/* i POST /sms/webhook osobno). 0 = bez limitu. */
  rateLimitPerMin?: number;
  /** Liczba zaufanych proxy przed serwerem (X-Forwarded-For). 0 = adres gniazda. */
  trustedProxyHops?: number;
  /** Publiczny adres serwisu dla odsyłaczy na karcie SVG. */
  publicBaseUrl?: string;
  /** `off` (domyślnie): nagłówek X-Robots-Tag noindex, nofollow na każdej odpowiedzi, robots.txt Disallow, brak mapy strony. */
  siteIndexing?: 'off' | 'on';
  cases?: CaseStore;
  clerk?: Pick<ClerkDeps, 'token' | 'person' | 'notifyAddress' | 'secureCookie'>;
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

function inlineHashes(html: string, tag: 'script' | 'style'): string {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
  return [...html.matchAll(re)]
    .map((m) => `'sha256-${createHash('sha256').update(m[1] ?? '').digest('base64')}'`)
    .join(' ');
}

/** Symulator SMS ma wbudowany skrypt i style: dopuszczamy dokładnie te treści (hash), nic więcej. */
export const SMS_SIMULATOR_CSP = [
  "default-src 'self'",
  `script-src ${inlineHashes(SIMULATOR_HTML, 'script') || "'none'"}`,
  `style-src ${inlineHashes(SIMULATOR_HTML, 'style') || "'none'"}`,
  "connect-src 'self'",
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const isPost = (method: string) => method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';

export function createApp(deps: AppDeps): Hono {
  const app = new Hono();
  const log = deps.log === undefined ? (line: string) => console.log(line) : deps.log;
  const indexingOff = (deps.siteIndexing ?? 'off') === 'off';

  // Log: metoda, ścieżka (bez query), status, czas; zdarzenie http_request dla /api (statystyki).
  // Bez treści zgłoszeń i bez nagłówków.
  app.use('*', requestLogger({ log, logEvent: deps.logEvent }));

  app.use('*', async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'no-referrer');
    // Podaplikacje mogą ustawić własną, węższą politykę (karta SVG); wtedy jej nie nadpisujemy.
    if (!c.res.headers.has('Content-Security-Policy')) {
      c.header('Content-Security-Policy', c.req.path === '/sms' ? SMS_SIMULATOR_CSP : CSP);
    }
    c.header('X-Frame-Options', 'DENY');
    c.header('Cross-Origin-Opener-Policy', 'same-origin');
    c.header('Cross-Origin-Resource-Policy', 'same-origin');
    if (indexingOff) c.header('X-Robots-Tag', 'noindex, nofollow');
    // Brak nagłówków CORS: API dostępne tylko z tego samego originu.
  });

  const limit = deps.rateLimitPerMin ?? 0;
  if (limit > 0) {
    const trustedProxyHops = deps.trustedProxyHops ?? 0;
    app.use('/api/*', rateLimit({ limit, trustedProxyHops }));
    // Osobny licznik dla SMS; odpowiedź zwykłym tekstem, jak cały kanał SMS.
    const smsLimiter = rateLimit({ limit, trustedProxyHops, appliesTo: (c) => isPost(c.req.method) });
    const smsLimit: MiddlewareHandler = async (c, next) => {
      const res = await smsLimiter(c, next);
      if (res instanceof Response && res.status === 429) {
        return new Response(RATE_LIMIT_MESSAGE_PL, {
          status: 429,
          headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'no-store',
            'retry-after': res.headers.get('Retry-After') ?? '60',
          },
        });
      }
      return res;
    };
    app.use('/sms/webhook', smsLimit);
  }

  // Podaplikacje przed trasami API: registerApiRoutes kończy się zbiorczym 404 dla /api/*.
  app.route('/', createStatsApp({ db: deps.db }));
  app.route('/', createCardApp({ engine: deps.engine, baseUrl: deps.publicBaseUrl }));
  app.route('/', createSmsApp({ engine: deps.engine, logEvent: deps.logEventSms ?? deps.logEvent }));
  app.route(
    '/',
    createDiscordApp({
      engine: deps.engine,
      publicKey: deps.discord?.publicKey,
      applicationId: deps.discord?.applicationId,
      publicBaseUrl: deps.publicBaseUrl,
      rateLimitPerMin: limit,
      logEvent: deps.discord?.logEvent ?? deps.logEvent,
    }),
  );

  const cases = deps.cases ?? createCaseStore(deps.db);
  app.route(
    '/',
    createClerkApp({
      ...deps.clerk,
      store: cases,
      trustedProxyHops: deps.trustedProxyHops,
      logEvent: deps.logEvent,
    }),
  );
  registerCaseStatusRoute(app, cases);

  registerStreamRoutes(app, deps);
  registerExtraRoutes(app, deps);
  registerTrustedPublishersRoute(app);
  registerApiRoutes(app, deps);

  const seoDeps = { publicBaseUrl: deps.publicBaseUrl, indexing: indexingOff ? ('off' as const) : ('on' as const), getRecord: (id: string) => deps.engine.getRecord(id) };
  registerSeoRoutes(app, seoDeps);
  const serveStatic = createStaticHandler(deps.distDir, {
    transformIndex: (html, path, requestUrl) => {
      const page = injectPageMeta(html, path, resolveBaseUrl(deps.publicBaseUrl, requestUrl), seoDeps);
      return deps.showcase ? addShowcaseMeta(page) : page;
    },
    indexHeaders: (path) => ({
      ...(isRecordPath(path) ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}),
      ...(path === '/' ? { Link: '</llms.txt>; rel="service-doc"; type="text/plain"' } : {}),
      ...(isKnownPagePath(path) ? {} : { 'X-Robots-Tag': 'noindex, nofollow' }),
    }),
    isKnownPath: isKnownPagePath,
  });
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
