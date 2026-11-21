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
  };
}
