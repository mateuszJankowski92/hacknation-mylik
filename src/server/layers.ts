// Stan warstw serwisu bez sekretów: indeks weryfikacji redakcji, druga warstwa (na żywo), Discord, rewizja.
// Wartości liczone tak samo jak przy składaniu silnika (createFactcheckFromEnv), żeby /api/health nie kłamał.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Hono } from 'hono';
import { DEFAULT_FACTCHECK_CONFIG_PATH, factcheckSwitch, loadFactcheckConfig } from '../factcheck/index';

export type FactcheckOffReason = 'brak klucza' | 'brak pliku konfiguracyjnego' | 'wyłączone';

export interface LayerStatus {
  factcheck: { enabled: boolean; reason?: FactcheckOffReason; publishers: number };
  live: { enabled: boolean };
  discord: { configured: boolean };
  revision: string;
}

export interface LayerInputs {
  env?: Record<string, string | undefined>;
  factcheckConfigPath?: string;
  liveEnabled: boolean;
  discordConfigured: boolean;
  projectRoot: string;
}

export function readRevision(projectRoot: string): string {
  try {
    const text = readFileSync(join(projectRoot, 'REVISION'), 'utf8').trim();
    return /^[0-9a-zA-Z._-]{1,64}$/.test(text) ? text : 'nieznana';
  } catch {
    return 'nieznana';
  }
}

export function computeLayerStatus(inputs: LayerInputs): LayerStatus {
  const env = inputs.env ?? process.env;
  const path = inputs.factcheckConfigPath ?? env.FACTCHECK_CONFIG_PATH ?? DEFAULT_FACTCHECK_CONFIG_PATH;
  const base = { live: { enabled: inputs.liveEnabled }, discord: { configured: inputs.discordConfigured }, revision: readRevision(inputs.projectRoot) };
  let publishers = 0;
  let configOk = true;
  try {
    publishers = loadFactcheckConfig(path).publishers.filter((p) => p.enabled).length;
  } catch {
    configOk = false;
  }
  if (factcheckSwitch(env) === 'off') return { ...base, factcheck: { enabled: false, reason: 'wyłączone', publishers } };
  if (!configOk) return { ...base, factcheck: { enabled: false, reason: 'brak pliku konfiguracyjnego', publishers: 0 } };
  if (!env.GOOGLE_FACTCHECK_API_KEY?.trim()) return { ...base, factcheck: { enabled: false, reason: 'brak klucza', publishers } };
  return { ...base, factcheck: { enabled: true, publishers } };
}

export interface TrustedPublishersResponse {
  publishers: Array<{ name: string; site: string }>;
  qualification: string | null;
}

export function loadTrustedPublishers(path = process.env.FACTCHECK_CONFIG_PATH ?? DEFAULT_FACTCHECK_CONFIG_PATH): TrustedPublishersResponse {
  if (!existsSync(path)) return { publishers: [], qualification: null };
  try {
    const cfg = loadFactcheckConfig(path);
    return {
      publishers: cfg.publishers.filter((p) => p.enabled).map((p) => ({ name: p.name, site: p.site })),
      qualification: cfg.qualification,
    };
  } catch {
    return { publishers: [], qualification: null };
  }
}

export const TRUSTED_PUBLISHERS_PATH = '/api/factcheck/publishers';

export function registerTrustedPublishersRoute(app: Hono, load: () => TrustedPublishersResponse = loadTrustedPublishers): void {
  app.get(TRUSTED_PUBLISHERS_PATH, (c) => {
    c.header('Cache-Control', 'no-store');
    return c.json(load(), 200);
  });
}
