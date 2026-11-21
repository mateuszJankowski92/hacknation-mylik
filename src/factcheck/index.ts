// Indeks weryfikacji redakcji (Google Fact Check Tools). Włączanie: FACTCHECK_LAYER=auto|on|off.
// auto (domyślnie): włączony, gdy GOOGLE_FACTCHECK_API_KEY jest niepusty; on: zawsze (brak klucza
// = stan techniczny przy pytaniach, których zbiór urzędowy nie rozstrzyga); off: wyłączony.
import { GoogleFactCheckIndex, type FactcheckIndex } from './client';
import { DEFAULT_FACTCHECK_CONFIG_PATH, loadFactcheckConfig } from './config';
import { createFactcheckLayer, type FactcheckLayer } from './layer';

export * from './client';
export * from './config';
export * from './layer';
export * from './ratings';
export * from './text';

export type FactcheckSwitch = 'auto' | 'on' | 'off';

export function factcheckSwitch(env: Record<string, string | undefined> = process.env): FactcheckSwitch {
  const v = (env.FACTCHECK_LAYER ?? '').trim().toLowerCase();
  return v === 'on' || v === 'off' ? v : 'auto';
}

export interface FactcheckFromEnvOptions {
  env?: Record<string, string | undefined>;
  configPath?: string;
  index?: FactcheckIndex;
}

/** Warstwa z konfiguracji i środowiska albo null (wyłączona). Zły plik konfiguracji = warstwa wyłączona. */
export function createFactcheckFromEnv(opts: FactcheckFromEnvOptions = {}): FactcheckLayer | null {
  const env = opts.env ?? process.env;
  const sw = factcheckSwitch(env);
  const key = env.GOOGLE_FACTCHECK_API_KEY?.trim() || undefined;
  if (sw === 'off' || (sw === 'auto' && !key && !opts.index)) return null;
  let config;
  try {
    config = loadFactcheckConfig(opts.configPath ?? env.FACTCHECK_CONFIG_PATH ?? DEFAULT_FACTCHECK_CONFIG_PATH);
  } catch {
    return null;
  }
  const index = opts.index ?? new GoogleFactCheckIndex({ endpoint: config.index.endpoint, apiKey: key });
  return createFactcheckLayer({ config, index });
}
