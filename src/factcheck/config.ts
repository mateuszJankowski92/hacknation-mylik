// Konfiguracja indeksu weryfikacji (data/factcheck.json): jawna lista wydawców do audytu,
// parametry zapytań i wyłącznik dokumentów redakcji pobranych wcześniej bezpośrednio do zbioru.
import { readFileSync } from 'node:fs';
import { z } from 'zod';

export const DEFAULT_FACTCHECK_CONFIG_PATH = 'data/factcheck.json';

const SiteSchema = z
  .string()
  .min(3)
  .max(100)
  .regex(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/, 'domena: małe litery, bez protokołu i ścieżki');

export const FactcheckConfigSchema = z.object({
  version: z.literal(1),
  index: z.object({
    endpoint: z.url().refine((u) => u.startsWith('https://'), 'tylko https'),
    languageCode: z.string().min(2).max(10),
    pageSize: z.number().int().min(1).max(50),
    maxQueries: z.number().int().min(1).max(3),
    timeoutMs: z.number().int().min(500).max(15_000),
  }),
  qualification: z.string().min(20),
  publishers: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]{2,40}$/),
        name: z.string().min(2).max(120),
        site: SiteSchema,
        enabled: z.boolean(),
        standard: z.string().min(3),
        added: z.iso.date(),
        /** Czy pobierać wpisy wydawcy masowo z indeksu (scripts/factcheck-index-pobierz.ts). */
        harvest: z.boolean().optional(),
      }),
    )
    .min(1),
  harvest: z
    .object({
      dir: z.string().min(1),
      pageSize: z.number().int().min(1).max(100),
      delayMs: z.number().int().min(500),
      maxRequestsPerRun: z.number().int().min(1).max(5000),
    })
    .optional(),
  corpusDirectFactcheck: z.object({
    use: z.boolean(),
    sourceIds: z.array(z.string().min(1)),
  }),
});
export type FactcheckConfig = z.infer<typeof FactcheckConfigSchema>;
export type FactcheckPublisher = FactcheckConfig['publishers'][number];

export function loadFactcheckConfig(path = DEFAULT_FACTCHECK_CONFIG_PATH): FactcheckConfig {
  return FactcheckConfigSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}

/** Źródła zbioru urzędowego wyłączone ze ścieżki dowodowej (domyślnie strony redakcji pobrane wprost). */
export function excludedCorpusSourceIds(path = DEFAULT_FACTCHECK_CONFIG_PATH): string[] {
  try {
    const c = loadFactcheckConfig(path);
    return c.corpusDirectFactcheck.use ? [] : [...c.corpusDirectFactcheck.sourceIds];
  } catch {
    return [];
  }
}

/** Wydawca z listy dla hosta (dokładnie domena albo jej subdomena), tylko włączeni. */
export function matchPublisher(cfg: FactcheckConfig, host: string): FactcheckPublisher | null {
  const h = host.toLowerCase().replace(/^www\./, '');
  for (const p of cfg.publishers) if (p.enabled && (h === p.site || h.endsWith(`.${p.site}`))) return p;
  return null;
}
