// Składanie zależności: loadConfig -> openDb -> createSearcher -> createLlmProvider -> createEngine -> createApp.
import type { DatabaseSync } from 'node:sqlite';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Hono } from 'hono';
import { loadConfig, type AppConfig } from '../config';
import { LlmError, type Engine, type LlmProvider, type Searcher } from '../contracts/index';
import { createSearcher } from '../corpus/index';
import { openDb } from '../db/open';
import { createEngine } from '../engine/index';
import { createLlmProvider } from '../llm/index';
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
}

export interface Bootstrapped {
  config: AppConfig;
  db: DatabaseSync;
  searcher: Searcher;
  llm: LlmProvider;
  engine: Engine;
  app: Hono;
  providerName: string;
  modelName: string;
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

  const engine = createEngine({ db, searcher, llm });

  const insertEvent = db.prepare('INSERT INTO events(ts, record_id, channel, type, detail) VALUES (?, NULL, ?, ?, ?)');
  const logEvent = (type: string, detail: Record<string, string | number | boolean | null>) => {
    insertEvent.run(new Date().toISOString(), 'www', type, JSON.stringify(detail));
  };

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
    distDir: opts.distDir ?? resolve(PROJECT_ROOT, 'dist', 'web'),
    log: opts.log,
  });

  return {
    config,
    db,
    searcher,
    llm,
    engine,
    app,
    providerName: llm.name,
    modelName,
    close() {
      try {
        db.close();
      } catch {
        // już zamknięta
      }
    },
  };
}
