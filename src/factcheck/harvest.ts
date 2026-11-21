// Masowe pobranie spisu weryfikacji redakcji (zad. 41): legalne kanały zbiorcze zamiast stron redakcji.
// (1) Indeks Google Fact Check Tools: claims:search z reviewPublisherSiteFilter (query wtedy niewymagane),
//     stronicowanie pageSize + pageToken, odstęp między zapytaniami, limit zapytań na przebieg,
//     wznawianie z pliku stanu. (2) Zbiorczy plik ClaimReview Google (DataFeed schema.org) z dysku.
// Wynik: data/raw/factcheck-index/<site>.jsonl w formacie wczytywanym przez src/corpus/reviews.ts.
// Pola wpisu przechodzą dosłownie (teza, autor tezy, ocena, tytuł, adres, daty); bez treści artykułów.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ApiClaim, IndexListRequest, IndexListResult } from './client';
import type { FactcheckConfig, FactcheckPublisher } from './config';

export interface ReviewRecord {
  url: string;
  publisher: string;
  kind: string | null;
  title: string;
  claim: string;
  claimant: string | null;
  claimDate: string | null;
  rating: string;
  reviewDate: string | null;
  body: null;
  fetchedAt: string;
  /** Kanał: indeks API albo plik zbiorczy. */
  via: 'claims_search' | 'claimreview_feed';
}

export interface HarvestState {
  sites: Record<string, { nextPageToken: string | null; done: boolean; requests: number; saved: number; lastError?: string; updatedAt: string }>;
}

export interface HarvestDeps {
  config: FactcheckConfig;
  list: (req: IndexListRequest) => Promise<IndexListResult>;
  dir: string;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  /** Tylko te domeny (domyślnie wszyscy wydawcy z `harvest: true`). */
  sites?: string[];
  maxRequests?: number;
  log?: (line: string) => void;
}

export interface HarvestSummary {
  requests: number;
  perSite: Record<string, { saved: number; total: number; done: boolean; stoppedBy?: string }>;
  stoppedBy: string | null;
}

const hostOf = (u: string): string | null => {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.hostname.toLowerCase().replace(/^www\./, '') : null;
  } catch {
    return null;
  }
};
const onSite = (host: string | null, site: string) => !!host && (host === site || host.endsWith(`.${site}`));
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Wpisy z odpowiedzi API dla jednego wydawcy (tylko oceny z jego domeny). */
export function recordsFromApi(claims: ApiClaim[], pub: FactcheckPublisher, fetchedAt: string): ReviewRecord[] {
  const out: ReviewRecord[] = [];
  for (const c of claims) {
    const claim = str(c?.text);
    if (!claim) continue;
    for (const r of Array.isArray(c.claimReview) ? c.claimReview : []) {
      const url = str(r?.url);
      const rating = str(r?.textualRating);
      if (!url || !rating || !onSite(hostOf(url), pub.site)) continue;
      out.push({
        url,
        publisher: str(r.publisher?.name) ?? pub.name,
        kind: null,
        title: str(r.title) ?? claim,
        claim,
        claimant: str(c.claimant),
        claimDate: str(c.claimDate),
        rating,
        reviewDate: str(r.reviewDate),
        body: null,
        fetchedAt,
        via: 'claims_search',
      });
    }
  }
  return out;
}

export function readState(dir: string): HarvestState {
  const p = join(dir, '_state.json');
  if (!existsSync(p)) return { sites: {} };
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as HarvestState;
  } catch {
    return { sites: {} };
  }
}

function writeState(dir: string, s: HarvestState): void {
  writeFileSync(join(dir, '_state.json'), `${JSON.stringify(s, null, 2)}\n`);
}

/** Adresy już zapisane w pliku wydawcy (wznawianie bez duplikatów). */
export function knownKeys(file: string): Set<string> {
  const keys = new Set<string>();
  if (!existsSync(file)) return keys;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line) as { url?: string; claim?: string };
      if (r.url) keys.add(`${r.url}\n${r.claim ?? ''}`);
    } catch {
      // zła linia: pomijamy
    }
  }
  return keys;
}

export const siteFile = (dir: string, site: string) => join(dir, `${site}.jsonl`);

export async function harvestIndex(deps: HarvestDeps): Promise<HarvestSummary> {
  const { config, list, dir } = deps;
  const h = config.harvest ?? { dir, pageSize: 50, delayMs: 1100, maxRequestsPerRun: 400 };
  const now = deps.now ?? (() => new Date());
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const log = deps.log ?? (() => {});
  const maxRequests = deps.maxRequests ?? h.maxRequestsPerRun;
  mkdirSync(dir, { recursive: true });
  const state = readState(dir);
  const pubs = config.publishers.filter((p) => (deps.sites ? deps.sites.includes(p.site) : p.harvest));
  const summary: HarvestSummary = { requests: 0, perSite: {}, stoppedBy: null };
  for (const pub of pubs) {
    const st = (state.sites[pub.site] ??= { nextPageToken: null, done: false, requests: 0, saved: 0, updatedAt: now().toISOString() });
    const file = siteFile(dir, pub.site);
    const keys = knownKeys(file);
    const per: HarvestSummary['perSite'][string] = (summary.perSite[pub.site] = { saved: 0, total: keys.size, done: st.done });
    while (!st.done) {
      if (summary.requests >= maxRequests) {
        summary.stoppedBy = 'limit_zapytan_przebiegu';
        break;
      }
      if (summary.requests > 0) await sleep(h.delayMs);
      summary.requests++;
      st.requests++;
      const res = await list({ site: pub.site, languageCode: config.index.languageCode, pageSize: h.pageSize, ...(st.nextPageToken ? { pageToken: st.nextPageToken } : {}) });
      st.updatedAt = now().toISOString();
      if (!res.ok) {
        // Limit, odmowa, brak klucza: zapis stanu i koniec (wznowienie później od tej samej strony).
        st.lastError = `${res.code}${res.status ? `:${res.status}` : ''}`;
        per.stoppedBy = st.lastError;
        writeState(dir, state);
        log(`${pub.site}: zatrzymano (${st.lastError}) po ${st.requests} zapytaniach`);
        if (res.code === 'limit' || res.code === 'brak_klucza' || res.code === 'odmowa_dostepu') {
          summary.stoppedBy = st.lastError;
          return summary;
        }
        break;
      }
      delete st.lastError;
      const fresh = recordsFromApi(res.claims, pub, now().toISOString()).filter((r) => {
        const k = `${r.url}\n${r.claim}`;
        if (keys.has(k)) return false;
        keys.add(k);
        return true;
      });
      if (fresh.length) appendFileSync(file, fresh.map((r) => JSON.stringify(r)).join('\n') + '\n');
      per.saved += fresh.length;
      per.total = keys.size;
      st.saved += fresh.length;
      st.nextPageToken = res.nextPageToken;
      if (!res.nextPageToken) st.done = true;
      per.done = st.done;
      writeState(dir, state);
    }
    log(`${pub.site}: ${per.total} wpisów (nowych ${per.saved})${st.done ? ', komplet' : ''}`);
    if (summary.stoppedBy) break;
  }
  writeState(dir, state);
  return summary;
}

/** Wpisy z pliku zbiorczego ClaimReview (DataFeed schema.org) dla wydawców z listy (po domenie adresu). */
export function recordsFromFeed(feed: unknown, config: FactcheckConfig, fetchedAt: string, sites?: string[]): Map<string, ReviewRecord[]> {
  const out = new Map<string, ReviewRecord[]>();
  const pubs = config.publishers.filter((p) => (sites ? sites.includes(p.site) : p.harvest));
  const els = (feed as { dataFeedElement?: unknown[] })?.dataFeedElement;
  for (const el of Array.isArray(els) ? els : []) {
    const items = (el as { item?: unknown[] })?.item;
    for (const it of Array.isArray(items) ? items : []) {
      const r = it as Record<string, unknown>;
      const url = str(r.url);
      const host = url ? hostOf(url) : null;
      const pub = pubs.find((p) => onSite(host, p.site));
      if (!pub || !url) continue;
      const claim = str(r.claimReviewed);
      const rating = str((r.reviewRating as Record<string, unknown> | undefined)?.alternateName);
      if (!claim || !rating) continue;
      const reviewed = (r.itemReviewed ?? {}) as Record<string, unknown>;
      const author = (r.author ?? {}) as Record<string, unknown>;
      const rec: ReviewRecord = {
        url,
        publisher: str(author.name) ?? pub.name,
        kind: null,
        title: str(r.name) ?? str(r.headline) ?? claim,
        claim,
        claimant: str((reviewed.author as Record<string, unknown> | undefined)?.name),
        claimDate: str(reviewed.datePublished),
        rating,
        reviewDate: str(r.datePublished),
        body: null,
        fetchedAt,
        via: 'claimreview_feed',
      };
      const list = out.get(pub.site) ?? [];
      list.push(rec);
      out.set(pub.site, list);
    }
  }
  return out;
}

/** Dopisuje wpisy z pliku zbiorczego do plików wydawców (bez duplikatów adres + teza). */
export function appendFeedRecords(dir: string, records: Map<string, ReviewRecord[]>): Record<string, number> {
  mkdirSync(dir, { recursive: true });
  const added: Record<string, number> = {};
  for (const [site, recs] of records) {
    const file = siteFile(dir, site);
    const keys = knownKeys(file);
    const fresh = recs.filter((r) => {
      const k = `${r.url}\n${r.claim}`;
      if (keys.has(k)) return false;
      keys.add(k);
      return true;
    });
    if (fresh.length) appendFileSync(file, fresh.map((r) => JSON.stringify(r)).join('\n') + '\n');
    added[site] = fresh.length;
  }
  return added;
}

/** Liczby po pobraniu: wpisy na wydawcę, rozkład ocen, zakres dat weryfikacji. */
export function harvestStats(dir: string, sites: string[]): Record<string, { entries: number; ratings: Record<string, number>; from: string | null; to: string | null }> {
  const out: Record<string, { entries: number; ratings: Record<string, number>; from: string | null; to: string | null }> = {};
  for (const site of sites) {
    const file = siteFile(dir, site);
    const s = { entries: 0, ratings: {} as Record<string, number>, from: null as string | null, to: null as string | null };
    if (existsSync(file))
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        try {
          const r = JSON.parse(line) as ReviewRecord;
          s.entries++;
          s.ratings[r.rating] = (s.ratings[r.rating] ?? 0) + 1;
          const d = (r.reviewDate ?? '').slice(0, 10);
          if (d) {
            if (!s.from || d < s.from) s.from = d;
            if (!s.to || d > s.to) s.to = d;
          }
        } catch {
          // pomijamy
        }
      }
    out[site] = s;
  }
  return out;
}
