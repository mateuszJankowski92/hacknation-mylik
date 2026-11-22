import { z } from 'zod';

export const LLM_PROVIDERS = ['mock', 'anthropic', 'mistral'] as const;
export type LlmProviderName = (typeof LLM_PROVIDERS)[number];

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const ConfigSchema = z.object({
  LLM_PROVIDER: z.preprocess(emptyToUndefined, z.enum(LLM_PROVIDERS).default('mock')),
  // Brak klucza nie wywraca konfiguracji: stan techniczny zgłosi silnik/dostawca.
  ANTHROPIC_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  ANTHROPIC_MODEL: z.preprocess(emptyToUndefined, z.string().default('')),
  MISTRAL_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  DB_PATH: z.preprocess(emptyToUndefined, z.string().default('data/mylik.sqlite')),
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(65535).default(8787)),
  RATE_LIMIT_PER_MIN: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(20)),
  RETENTION_DAYS: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(30)),
  // Integracja fali 2 (zad. I): pliki opcjonalne; brak pliku nie wywraca serwera.
  EVAL_RESULTS_PATH: z.preprocess(emptyToUndefined, z.string().default('data/eval/results.json')),
  // Limit czasu na zgłoszenie w ms (puste: wartość silnika, 22 s). Większy model potrzebuje więcej czasu.
  REQUEST_DEADLINE_MS: z.preprocess(emptyToUndefined, z.coerce.number().int().min(5_000).max(44_000).optional()),
  KNOWN_OPS_DIR: z.preprocess(emptyToUndefined, z.string().default('data/known-ops')),
  INCIDENTS_PATH: z.preprocess(emptyToUndefined, z.string().optional()),
  // Liczba zaufanych proxy przed serwerem (np. 1 za Passengerem/nginx); 0 = X-Forwarded-For ignorowany.
  TRUSTED_PROXY_HOPS: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(5).default(0)),
  // Publiczny adres serwisu (np. https://mylik.example.pl) dla odsyłaczy na karcie SVG; pusty = względny.
  PUBLIC_BASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  // Indeksowanie witryny przez wyszukiwarki: off (domyślnie: robots.txt Disallow, noindex w nagłówku i w HTML) albo on.
  SITE_INDEXING: z.preprocess(emptyToUndefined, z.enum(['off', 'on']).default('off')),
  // Zad. 29: druga warstwa źródeł (szukanie na żywo na jawnej liście serwisów). Domyślnie wyłączona.
  LIVE_LAYER: z.preprocess(emptyToUndefined, z.enum(['off', 'on']).default('off')),
  LIVE_SOURCES_PATH: z.preprocess(emptyToUndefined, z.string().default('data/live-sources.json')),
  // Tryb pokazowy po hackathonie: gotowe wyniki z pliku, bez modelu, indeksu i sieci.
  SHOWCASE_MODE: z.preprocess(emptyToUndefined, z.enum(['off', 'on']).default('off')),
  SHOWCASE_PATH: z.preprocess(emptyToUndefined, z.string().default('data/pokaz.json')),
  URZEDNIK_TOKEN: z.preprocess(emptyToUndefined, z.string().optional()),
  URZEDNIK_OSOBA: z.preprocess(emptyToUndefined, z.string().max(200).optional()),
  URZEDNIK_ADRES_POWIADOMIEN: z.preprocess(emptyToUndefined, z.string().max(200).optional()),
  CASE_RETENTION_DAYS: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(365)),
  // Kanał Discord (docs/ARCHITEKTURA.md): bez klucza publicznego POST /discord/interactions zwraca 503, zły klucz daje 401 (nie psuje startu).
  DISCORD_APPLICATION_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  DISCORD_PUBLIC_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
});

export interface AppConfig {
  llmProvider: LlmProviderName;
  anthropicApiKey?: string;
  /** Pusty = domyślny model ustalony przez dostawcę (zad. 02). */
  anthropicModel: string;
  mistralApiKey?: string;
  dbPath: string;
  port: number;
  rateLimitPerMin: number;
  retentionDays: number;
  /** Plik wyników zestawu testowego (profil błędów); względny od katalogu projektu. */
  evalResultsPath: string;
  /** Limit czasu na zgłoszenie w ms; brak = domyślny limit silnika. */
  requestDeadlineMs?: number;
  /** Katalog znanych operacji informacyjnych (EUvsDisinfo); względny od katalogu projektu. */
  knownOpsDir: string;
  /** Plik bazy incydentów; brak = wyszukiwanie domyślne (findIncidentsFile). */
  incidentsPath?: string;
  trustedProxyHops: number;
  publicBaseUrl?: string;
  /** `off` (domyślnie): witryna nieindeksowana (robots.txt, X-Robots-Tag, meta robots); `on`: indeksowanie dozwolone. */
  siteIndexing: 'off' | 'on';
  /** Druga warstwa źródeł (zad. 29): `off` (domyślnie, system działa jak dotąd) albo `on`. */
  liveLayer: 'off' | 'on';
  /** Lista serwisów drugiej warstwy; względna od katalogu projektu. */
  liveSourcesPath: string;
  /** `on`: atrapa bez modelu i sieci, wyniki z `showcasePath`; `off` (domyślnie): zwykły silnik. */
  showcaseMode: 'off' | 'on';
  /** Plik gotowych wyników trybu pokazowego; względny od katalogu projektu. */
  showcasePath: string;
  clerkToken?: string;
  clerkPerson?: string;
  clerkNotifyAddress?: string;
  caseRetentionDays: number;
  discordApplicationId?: string;
  discordPublicKey?: string;
}

/** Czyta konfigurację ze zmiennych środowiskowych. Nie czyta pliku `.env`. */
export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const c = ConfigSchema.parse({
    LLM_PROVIDER: env.LLM_PROVIDER,
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL: env.ANTHROPIC_MODEL,
    MISTRAL_API_KEY: env.MISTRAL_API_KEY,
    DB_PATH: env.DB_PATH,
    PORT: env.PORT,
    RATE_LIMIT_PER_MIN: env.RATE_LIMIT_PER_MIN,
    RETENTION_DAYS: env.RETENTION_DAYS,
    EVAL_RESULTS_PATH: env.EVAL_RESULTS_PATH,
    REQUEST_DEADLINE_MS: env.REQUEST_DEADLINE_MS,
    KNOWN_OPS_DIR: env.KNOWN_OPS_DIR,
    INCIDENTS_PATH: env.INCIDENTS_PATH,
    TRUSTED_PROXY_HOPS: env.TRUSTED_PROXY_HOPS,
    PUBLIC_BASE_URL: env.PUBLIC_BASE_URL,
    SITE_INDEXING: env.SITE_INDEXING,
    LIVE_LAYER: env.LIVE_LAYER,
    LIVE_SOURCES_PATH: env.LIVE_SOURCES_PATH,
    SHOWCASE_MODE: env.SHOWCASE_MODE,
    SHOWCASE_PATH: env.SHOWCASE_PATH,
    URZEDNIK_TOKEN: env.URZEDNIK_TOKEN,
    URZEDNIK_OSOBA: env.URZEDNIK_OSOBA,
    URZEDNIK_ADRES_POWIADOMIEN: env.URZEDNIK_ADRES_POWIADOMIEN,
    CASE_RETENTION_DAYS: env.CASE_RETENTION_DAYS,
    DISCORD_APPLICATION_ID: env.DISCORD_APPLICATION_ID?.trim(),
    DISCORD_PUBLIC_KEY: env.DISCORD_PUBLIC_KEY?.trim(),
  });
  return {
    llmProvider: c.LLM_PROVIDER,
    anthropicApiKey: c.ANTHROPIC_API_KEY,
    anthropicModel: c.ANTHROPIC_MODEL,
    mistralApiKey: c.MISTRAL_API_KEY,
    dbPath: c.DB_PATH,
    port: c.PORT,
    rateLimitPerMin: c.RATE_LIMIT_PER_MIN,
    retentionDays: c.RETENTION_DAYS,
    evalResultsPath: c.EVAL_RESULTS_PATH,
    requestDeadlineMs: c.REQUEST_DEADLINE_MS,
    knownOpsDir: c.KNOWN_OPS_DIR,
    incidentsPath: c.INCIDENTS_PATH,
    trustedProxyHops: c.TRUSTED_PROXY_HOPS,
    publicBaseUrl: c.PUBLIC_BASE_URL,
    siteIndexing: c.SITE_INDEXING,
    liveLayer: c.LIVE_LAYER,
    liveSourcesPath: c.LIVE_SOURCES_PATH,
    showcaseMode: c.SHOWCASE_MODE,
    showcasePath: c.SHOWCASE_PATH,
    clerkToken: c.URZEDNIK_TOKEN,
    clerkPerson: c.URZEDNIK_OSOBA,
    clerkNotifyAddress: c.URZEDNIK_ADRES_POWIADOMIEN,
    caseRetentionDays: c.CASE_RETENTION_DAYS,
    discordApplicationId: c.DISCORD_APPLICATION_ID,
    discordPublicKey: c.DISCORD_PUBLIC_KEY,
  };
}

/** Konfiguracja bezpieczna do logowania: sekrety zastąpione informacją o obecności. */
export function redactedConfig(cfg: AppConfig): Record<string, string | number | boolean> {
  return {
    llmProvider: cfg.llmProvider,
    anthropicApiKey: cfg.anthropicApiKey ? '[ustawiony]' : '[brak]',
    anthropicModel: cfg.anthropicModel,
    mistralApiKey: cfg.mistralApiKey ? '[ustawiony]' : '[brak]',
    dbPath: cfg.dbPath,
    port: cfg.port,
    rateLimitPerMin: cfg.rateLimitPerMin,
    retentionDays: cfg.retentionDays,
    evalResultsPath: cfg.evalResultsPath,
    knownOpsDir: cfg.knownOpsDir,
    incidentsPath: cfg.incidentsPath ?? '[domyślnie]',
    trustedProxyHops: cfg.trustedProxyHops,
    publicBaseUrl: cfg.publicBaseUrl ?? '[względny]',
    siteIndexing: cfg.siteIndexing,
    liveLayer: cfg.liveLayer,
    liveSourcesPath: cfg.liveSourcesPath,
    showcaseMode: cfg.showcaseMode,
    showcasePath: cfg.showcasePath,
    clerkToken: cfg.clerkToken ? '[ustawiony]' : '[brak]',
    clerkPerson: cfg.clerkPerson ?? '[brak]',
    clerkNotifyAddress: cfg.clerkNotifyAddress ? '[ustawiony]' : '[brak]',
    caseRetentionDays: cfg.caseRetentionDays,
    discordApplicationId: cfg.discordApplicationId ? '[ustawiony]' : '[brak]',
    discordPublicKey: cfg.discordPublicKey ? '[ustawiony]' : '[brak]',
  };
}
