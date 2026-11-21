// Składanie zależności: loadConfig -> openDb -> createSearcher -> createLlmProvider -> createEngine -> createApp.
import type { DatabaseSync } from 'node:sqlite';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Hono } from 'hono';
import { loadConfig, type AppConfig } from '../config';
import { LlmError, type Engine, type LlmProvider, type Searcher } from '../contracts/index';
import { createCaseStore, withCaseTracking, type CaseStore } from '../cases/index';
import { createSearcher } from '../corpus/index';
import { openDb } from '../db/open';
import { loadKnownOpsDir, matchKnownOps, type KnownOpRecord } from '../corpus/incidents/index';
import { MAX_INCIDENT_NOTICES, loadIncidentMatcher, type IncidentHit, type IncidentMatcher } from '../engine/incidents';
import { createEngine } from '../engine/index';
import { createLlmProvider } from '../llm/index';
import { createProductionLiveLayer, type LiveLayer } from '../live/index';
import { startRetention, type RetentionScheduler } from '../security/index';
import { CLERK_MIN_TOKEN_LENGTH } from './clerk';
import { createApp } from './app';

/** Katalog główny projektu (niezależny od katalogu roboczego procesu). */
export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export interface BootstrapOptions {
  env?: Record<string, string | undefined>;
  /** Nadpisuje konfigurację (np. w testach). */
  config?: Partial<AppConfig>;
  /** Gotowa baza (np. `:memory:` w testach); wtedy DB_PATH jest ignorowane. */
  db?: DatabaseSync;
  distDir?: string;
  log?: ((line: string) => void) | null;
  warn?: (line: string) => void;
  /** Gotowe dopasowanie incydentów (testy); `null` wyłącza; brak = pliki z konfiguracji. */
  incidents?: IncidentMatcher | null;
  /** Retencja rekordów i zdarzeń (RETENTION_DAYS). Domyślnie włączona; testy mogą wyłączyć. */
  retention?: boolean;
}

export interface Bootstrapped {
  config: AppConfig;
  db: DatabaseSync;
  searcher: Searcher;
  llm: LlmProvider;
  engine: Engine;
  cases: CaseStore;
  app: Hono;
  providerName: string;
  modelName: string;
  /** Liczba wczytanych wpisów: baza incydentów MSZ i znane operacje (EUvsDisinfo). */
  incidentSources: { incidents: boolean; knownOps: number };
  close(): void;
}

/** Dostawca zastępczy, gdy konfiguracja dostawcy jest błędna: każde wywołanie to stan techniczny. */
class UnavailableProvider implements LlmProvider {
  constructor(readonly name: string) {}
  async extractClaims(): Promise<never> {
    throw new LlmError('provider_error', 'Dostawca modelu nie jest dostępny w tej konfiguracji.');
  }
  async assessPassages(): Promise<never> {
    throw new LlmError('provider_error', 'Dostawca modelu nie jest dostępny w tej konfiguracji.');
  }
}

/** Ścieżka bazy: względna liczona od katalogu projektu (Passenger może mieć inny katalog roboczy). */
export function resolveDbPath(p: string): string {
  if (p === ':memory:' || isAbsolute(p)) return p;
  return resolve(PROJECT_ROOT, p);
}

/** Ścieżka pliku/katalogu danych: względna liczona od katalogu projektu. */
export function resolveProjectPath(p: string): string {
  return isAbsolute(p) ? p : resolve(PROJECT_ROOT, p);
}

/** Dopasowanie znanych operacji (EUvsDisinfo) jako `IncidentMatcher`; tylko notices. */
export function knownOpsMatcher(records: KnownOpRecord[]): IncidentMatcher {
  return { match: (claim, now) => matchKnownOps(claim, records, { now, limit: MAX_INCIDENT_NOTICES }) };
}

/** Łączy kilka źródeł ostrzeżeń; awaria jednego nie psuje pozostałych; łącznie co najwyżej MAX_INCIDENT_NOTICES. */
export function combineIncidentMatchers(matchers: IncidentMatcher[]): IncidentMatcher | null {
  if (matchers.length === 0) return null;
  if (matchers.length === 1) return matchers[0]!;
  return {
    async match(claim, now) {
      const out: IncidentHit[] = [];
      const seen = new Set<string>();
      for (const m of matchers) {
        let hits: IncidentHit[] = [];
        try {
          hits = await m.match(claim, now);
        } catch {
          continue;
        }
        for (const h of hits) {
          if (seen.has(h.text)) continue;
          seen.add(h.text);
          out.push(h);
        }
      }
      return out.slice(0, MAX_INCIDENT_NOTICES);
    },
  };
}

function loadIncidentSources(config: AppConfig, warn: (l: string) => void): { matcher: IncidentMatcher | null; incidents: boolean; knownOps: number } {
  const matchers: IncidentMatcher[] = [];
  const incidents = loadIncidentMatcher(config.incidentsPath ? resolveProjectPath(config.incidentsPath) : undefined);
  if (incidents) matchers.push(incidents);
  let knownOps = 0;
  try {
    const { records } = loadKnownOpsDir(resolveProjectPath(config.knownOpsDir));
    knownOps = records.length;
    if (records.length) matchers.push(knownOpsMatcher(records));
  } catch {
    warn('Uwaga: nie udało się wczytać katalogu znanych operacji (KNOWN_OPS_DIR); działam bez nich.');
  }
  return { matcher: combineIncidentMatchers(matchers), incidents: incidents !== null, knownOps };
}

export function bootstrap(opts: BootstrapOptions = {}): Bootstrapped {
  const warn = opts.warn ?? ((l: string) => console.warn(l));
  const config: AppConfig = { ...loadConfig(opts.env ?? process.env), ...opts.config };
  const db = opts.db ?? openDb(resolveDbPath(config.dbPath));
  const searcher = createSearcher(db);

  let llm: LlmProvider;
  try {
    llm = createLlmProvider(config);
  } catch (e) {
    warn(`Uwaga: ${e instanceof Error ? e.message : 'błąd konfiguracji dostawcy modelu'}`);
    llm = new UnavailableProvider(config.llmProvider);
  }
  const model = (llm as { model?: unknown }).model;
  const modelName = typeof model === 'string' && model ? model : llm.name;

  const sources =
    opts.incidents !== undefined
      ? { matcher: opts.incidents, incidents: opts.incidents !== null, knownOps: 0 }
      : loadIncidentSources(config, warn);

  // Zad. 29: druga warstwa tylko przy LIVE_LAYER=on i dostawcy anthropic (wyszukiwarka web_search API).
  let live: LiveLayer | null = null;
  if (config.liveLayer === 'on') {
    if (config.llmProvider !== 'anthropic' || !config.anthropicApiKey)
      warn('Uwaga: LIVE_LAYER=on wymaga LLM_PROVIDER=anthropic i klucza; druga warstwa wyłączona.');
    else
      try {
        live = createProductionLiveLayer({
          sourcesPath: resolveProjectPath(config.liveSourcesPath),
          apiKey: config.anthropicApiKey,
          model: modelName,
        });
      } catch {
        warn('Uwaga: nie udało się wczytać listy serwisów drugiej warstwy (LIVE_SOURCES_PATH); druga warstwa wyłączona.');
      }
  }

  // Profil błędów z EVAL_RESULTS_PATH (plik opcjonalny: brak = bez profilu).
  const coreEngine = createEngine({
    db,
    searcher,
    llm,
    live,
    incidents: sources.matcher,
    options: { errorProfilePath: resolveProjectPath(config.evalResultsPath) },
  });

  const insertEvent = db.prepare('INSERT INTO events(ts, record_id, channel, type, detail) VALUES (?, NULL, ?, ?, ?)');
  const eventLogger =
    (channel: 'www' | 'sms') => (type: string, detail: Record<string, string | number | boolean | null>) => {
      insertEvent.run(new Date().toISOString(), channel, type, JSON.stringify(detail));
    };
  const logEvent = eventLogger('www');

  const cases = createCaseStore(db);
  const engine = withCaseTracking(coreEngine, cases, logEvent);
  const clerkToken =
    config.clerkToken && config.clerkToken.length >= CLERK_MIN_TOKEN_LENGTH ? config.clerkToken : undefined;
  if (config.clerkToken && !clerkToken)
    warn(`Uwaga: URZEDNIK_TOKEN jest za krótki (min. ${CLERK_MIN_TOKEN_LENGTH} znaków); widok urzędnika zamknięty.`);
  const purgeCases = () => {
    try {
      cases.purgeOlderThan(config.caseRetentionDays);
    } catch {
      warn('Uwaga: retencja spraw urzędnika nie ruszyła.');
    }
  };
  let casesTimer: ReturnType<typeof setInterval> | null = null;
  if (opts.retention !== false) {
    purgeCases();
    casesTimer = setInterval(purgeCases, 3_600_000);
    casesTimer.unref();
  }

  let retention: RetentionScheduler | null = null;
  if (opts.retention !== false) {
    try {
      retention = startRetention(db, config.retentionDays);
      retention.runOnce();
    } catch {
      warn('Uwaga: retencja danych nie ruszyła.');
    }
  }

  try {
    if (searcher.stats().documents === 0) warn('Korpus pusty: uruchom npm run corpus:ingest');
  } catch {
    warn('Korpus pusty: uruchom npm run corpus:ingest');
  }

  const app = createApp({
    engine,
    db,
    searcher,
    providerName: llm.name,
    modelName,
    logEvent,
    logEventSms: eventLogger('sms'),
    rateLimitPerMin: config.rateLimitPerMin,
    trustedProxyHops: config.trustedProxyHops,
    publicBaseUrl: config.publicBaseUrl,
    cases,
    clerk: {
      token: clerkToken,
      person: config.clerkPerson,
      notifyAddress: config.clerkNotifyAddress,
      secureCookie: config.publicBaseUrl ? config.publicBaseUrl.startsWith('https:') : undefined,
    },
    distDir: opts.distDir ?? resolve(PROJECT_ROOT, 'dist', 'web'),
    log: opts.log,
  });

  return {
    config,
    db,
    searcher,
    llm,
    engine,
    cases,
    app,
    providerName: llm.name,
    modelName,
    incidentSources: { incidents: sources.incidents, knownOps: sources.knownOps },
    close() {
      retention?.stop();
      if (casesTimer) clearInterval(casesTimer);
      try {
        db.close();
      } catch {
        // już zamknięta
      }
    },
  };
}
