// Druga warstwa źródeł (zad. 29): zamknięta lista serwisów z pliku konfiguracyjnego i kontrola domeny.
// Kontrola domeny jest w kodzie i dotyczy KAŻDEGO adresu (z wyszukiwania i po przekierowaniach).
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { SourceType } from '../contracts/index';

export const DEFAULT_LIVE_SOURCES_PATH = 'data/live-sources.json';

const DomainSchema = z
  .string()
  .min(3)
  .max(100)
  .regex(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/, 'domena: małe litery, bez protokołu i ścieżki');

const KindSchema = z.object({
  label: z.string().min(1),
  sourceType: z.enum(['media', 'organizacja']),
  qualification: z.string().min(20),
});

const SourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,40}$/),
  domain: DomainSchema,
  publisher: z.string().min(2).max(120),
  kind: z.string().min(1),
  addedAt: z.iso.date(),
});

export const LiveSourcesFileSchema = z
  .object({
    version: z.number().int().positive(),
    description: z.string().optional(),
    kinds: z.record(z.string(), KindSchema),
    sources: z.array(SourceSchema).min(1).max(64),
  })
  .superRefine((f, ctx) => {
    const ids = new Set<string>();
    const domains = new Set<string>();
    f.sources.forEach((s, i) => {
      if (!f.kinds[s.kind]) ctx.addIssue({ code: 'custom', path: ['sources', i, 'kind'], message: `nieznany rodzaj ${s.kind}` });
      if (ids.has(s.id)) ctx.addIssue({ code: 'custom', path: ['sources', i, 'id'], message: 'powtórzony id' });
      if (domains.has(s.domain)) ctx.addIssue({ code: 'custom', path: ['sources', i, 'domain'], message: 'powtórzona domena' });
      ids.add(s.id);
      domains.add(s.domain);
    });
  });
export type LiveSourcesFile = z.infer<typeof LiveSourcesFileSchema>;

export interface LiveSource {
  id: string;
  domain: string;
  publisher: string;
  kind: string;
  kindLabel: string;
  sourceType: Extract<SourceType, 'media' | 'organizacja'>;
  qualification: string;
  addedAt: string;
}

export interface LiveSourceList {
  version: number;
  sources: readonly LiveSource[];
  /** Domeny dla filtra wyszukiwarki (`allowed_domains`). */
  domains(): string[];
  /** Serwis z listy, do którego należy adres; `null` = adres spoza listy (odrzucony). */
  match(url: string): LiveSource | null;
}

/** Host adresu należy do domeny: równy jej albo jej subdomena (granica na kropce). */
export function hostInDomain(host: string, domain: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '');
  return h === domain || h.endsWith(`.${domain}`);
}

export function liveSourceList(file: LiveSourcesFile): LiveSourceList {
  const parsed = LiveSourcesFileSchema.parse(file);
  const sources: LiveSource[] = parsed.sources.map((s) => {
    const k = parsed.kinds[s.kind]!;
    return { ...s, kindLabel: k.label, sourceType: k.sourceType, qualification: k.qualification };
  });
  // Najdłuższa domena wygrywa (np. sport.tvp.pl przed ewentualnym tvp.pl).
  const byLength = [...sources].sort((a, b) => b.domain.length - a.domain.length);
  return {
    version: parsed.version,
    sources,
    domains: () => sources.map((s) => s.domain),
    match(url) {
      let u: URL;
      try {
        u = new URL(url);
      } catch {
        return null;
      }
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
      if (u.username || u.password) return null;
      if (u.port && u.port !== '80' && u.port !== '443') return null;
      return byLength.find((s) => hostInDomain(u.hostname, s.domain)) ?? null;
    },
  };
}

export function loadLiveSources(path = DEFAULT_LIVE_SOURCES_PATH): LiveSourceList {
  return liveSourceList(JSON.parse(readFileSync(path, 'utf8')) as LiveSourcesFile);
}
