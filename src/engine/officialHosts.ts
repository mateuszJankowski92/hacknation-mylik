// Jawna lista hostów urzędowych (data/official-hosts.json) i ścisłe rozpoznanie adresu (zad. 43).
//
// To granica bezpieczeństwa: lista służy wyłącznie do ustalenia, że źródło jest urzędem (ta sama
// kwalifikacja co dokumenty zbioru). Werdykt nigdy nie wynika z domeny, tylko z dosłownego cytatu.
// Adres jest urzędowy, gdy: parsuje się jako URL, jest https na porcie domyślnym, bez loginu i hasła,
// host (po zamianie na małe litery i postać ASCII/punycode) nie jest adresem IP i jest równy wpisowi
// albo kończy się na "." + wpis. `zus.pl.inny.host`, `evilzus.pl`, `zus.pl@inny.host` odpadają.
import { readFileSync } from 'node:fs';
import { isIP } from 'node:net';
import { z } from 'zod';

export const DEFAULT_OFFICIAL_HOSTS_PATH = 'data/official-hosts.json';

export const OFFICIAL_HOST_RULES = ['katalog', 'sufiks', 'instytucja'] as const;

const HostSchema = z
  .string()
  .min(3)
  .max(100)
  .regex(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/, 'host: małe litery, bez protokołu i ścieżki');

const EntrySchema = z.object({
  host: HostSchema,
  publisher: z.string().min(2).max(120),
  rule: z.enum(OFFICIAL_HOST_RULES),
  basis: z.string().min(2),
});

const ExcludedSchema = z.object({
  host: HostSchema,
  reason: z.string().min(10),
});

export const OfficialHostsFileSchema = z
  .object({
    version: z.number().int().positive(),
    description: z.string().optional(),
    qualification: z.string().min(20),
    rules: z.record(z.string(), z.string()).optional(),
    hosts: z.array(EntrySchema).min(1).max(200),
    excluded: z.array(ExcludedSchema).default([]),
  })
  .superRefine((f, ctx) => {
    const seen = new Set<string>();
    f.hosts.forEach((h, i) => {
      if (seen.has(h.host)) ctx.addIssue({ code: 'custom', path: ['hosts', i, 'host'], message: 'powtórzony host' });
      seen.add(h.host);
    });
    f.excluded.forEach((e, i) => {
      if (seen.has(e.host)) ctx.addIssue({ code: 'custom', path: ['excluded', i, 'host'], message: 'host jest jednocześnie na liście i wykluczony' });
    });
  });
export type OfficialHostsFile = z.infer<typeof OfficialHostsFileSchema>;
export type OfficialHostEntry = z.infer<typeof EntrySchema>;

export interface OfficialHostMatch {
  /** Wpis z listy, do którego należy host (najdłuższy, czyli najbardziej szczegółowy). */
  entry: OfficialHostEntry;
  /** Host adresu po normalizacji (małe litery, ASCII, bez końcowej kropki). */
  host: string;
}

export interface OfficialHostList {
  version: number;
  hosts: readonly OfficialHostEntry[];
  /** Adres urzędowy według ścisłych reguł albo `null`. */
  match(url: string | URL): OfficialHostMatch | null;
}

/** Host jest równy domenie albo jest jej subdomeną (granica na kropce). */
export function hostInDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** Host z adresu: małe litery, ASCII (URL zamienia IDN na punycode), bez końcowej kropki; `null` = nie nadaje się. */
function normalizedHost(u: URL): string | null {
  let host = u.hostname.toLowerCase();
  if (host.startsWith('[') || isIP(host) !== 0) return null;
  if (host.endsWith('.')) host = host.slice(0, -1);
  if (!/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) return null;
  // Czteroliczbowe zapisy liczbowe (np. 0x7f.1) URL zamienia na IP; reszta numerycznych TLD nie jest domeną.
  if (/^\d+(\.\d+)*$/.test(host) || /\.\d+$/.test(host)) return null;
  return host;
}

export function officialHostList(file: unknown): OfficialHostList {
  const parsed = OfficialHostsFileSchema.parse(file);
  const entries = [...parsed.hosts].sort((a, b) => b.host.length - a.host.length);
  const excluded = [...parsed.excluded].sort((a, b) => b.host.length - a.host.length);
  return {
    version: parsed.version,
    hosts: parsed.hosts,
    match(url) {
      let u: URL;
      try {
        u = url instanceof URL ? url : new URL(url);
      } catch {
        return null;
      }
      if (u.protocol !== 'https:') return null;
      if (u.username !== '' || u.password !== '') return null;
      if (u.port !== '' && u.port !== '443') return null;
      const host = normalizedHost(u);
      if (host === null) return null;
      const entry = entries.find((e) => hostInDomain(host, e.host));
      if (!entry) return null;
      // Wykluczenie bardziej szczegółowe niż wpis (np. podhost wyjęty ze strefy) wygrywa.
      const blocker = excluded.find((e) => hostInDomain(host, e.host));
      if (blocker && blocker.host.length > entry.host.length) return null;
      return { entry, host };
    },
  };
}

/** Wczytuje i sprawdza schematem plik listy; błąd (brak pliku, zły schemat) zgłasza wyjątkiem. */
export function loadOfficialHosts(path = DEFAULT_OFFICIAL_HOSTS_PATH): OfficialHostList {
  return officialHostList(JSON.parse(readFileSync(path, 'utf8')));
}

let defaultList: OfficialHostList | null | undefined;

/**
 * Lista domyślna (liczona raz na proces): `data/official-hosts.json` względem katalogu roboczego, a gdy go
 * tam nie ma, względem repozytorium. Brak albo błędny plik = `null` (ścieżka stron urzędów wyłączona,
 * zwykła ścieżka adresów działa jak dotąd); ostrzeżenie idzie raz na stderr.
 */
export function defaultOfficialHosts(): OfficialHostList | null {
  if (defaultList !== undefined) return defaultList;
  const candidates = [DEFAULT_OFFICIAL_HOSTS_PATH, new URL('../../data/official-hosts.json', import.meta.url).pathname];
  for (const p of candidates) {
    try {
      defaultList = loadOfficialHosts(p);
      return defaultList;
    } catch {
      // następny kandydat
    }
  }
  console.warn('Uwaga: nie udało się wczytać data/official-hosts.json; strony urzędów nie są rozpoznawane jako źródło pierwotne.');
  defaultList = null;
  return null;
}
