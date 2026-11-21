// Druga warstwa źródeł (zad. 29): szukanie na żywo na zamkniętej liście serwisów.
//
// Kolejność: wyszukanie adresów (tylko strukturalne wyniki) -> kontrola domeny w kodzie -> robots.txt
// -> pobranie istniejącym bezpiecznym pobieraczem (SSRF, limity) -> ponowna kontrola domeny po
// przekierowaniach -> podział na fragmenty z metadanymi -> odrzucenie fragmentów z sygnałem injection.
// Dalej TEN SAM potok co dla korpusu (ocena stanowiska, cytat jako podciąg, bramka wsparcia, reguły)
// prowadzi silnik (src/engine/pipeline.ts). Treść stron to dane, nie polecenia.
// Moduł niczego nie zapisuje: w rekordzie zostaje tylko cytat i metadane (jak dla korpusu).
import { sha256Hex, type ExtractedClaim, type LlmUsage, type Passage, type SourceMeta } from '../contracts/index';
import { chunkText } from '../corpus/chunk';
import { isAllowedByRobots, parseRobots, type RobotsRules } from '../corpus/crawl';
import type { PageFetcher } from '../engine/fetch/index';
import { detectInjectionSignals, type InjectionSignalCode } from '../engine/injection';
import { cleanText } from '../input/normalize';
import type { LiveSearchHit, LiveSearcher } from './search';
import type { LiveSource, LiveSourceList } from './sources';

/** Najwyżej tyle stron pobieramy dla jednego twierdzenia. */
export const LIVE_MAX_PAGES = 3;
/** Najwyżej tyle fragmentów z jednej strony i łącznie idzie do oceny. */
export const LIVE_PASSAGES_PER_PAGE = 2;
export const LIVE_MAX_PASSAGES = 6;
/** Domyślny limit czasu całej drugiej warstwy dla jednego twierdzenia (wyszukanie + pobranie + ocena). */
export const DEFAULT_LIVE_BUDGET_MS = 12_000;
/** Ważność odczytanego robots.txt w pamięci procesu. */
export const ROBOTS_TTL_MS = 60 * 60 * 1000;
export const LIVE_LICENSE =
  'Krótki cytat z podaniem wydawcy, adresu i daty pobrania (art. 29 ustawy o prawie autorskim); bez przechowywania pełnej treści.';

export type LiveStatus = 'ok' | 'brak_wynikow' | 'blad_wyszukiwania' | 'przekroczony_czas';

export interface LiveFindResult {
  status: LiveStatus;
  /** Fragmenty do oceny (bez fragmentów z sygnałem injection). */
  passages: Passage[];
  /** Fragmenty odrzucone z powodu sygnału injection (odnotowane w logu i w rekordzie). */
  flagged: { passageId: string; signals: InjectionSignalCode[] }[];
  hits: number;
  /** Domeny adresów spoza listy (odrzucone przez kod). */
  rejectedDomains: string[];
  robotsBlocked: number;
  fetchFailed: number;
  pages: number;
  searches: number;
  searchFeeUsd: number;
  usage?: LlmUsage;
  ms: number;
  errorCode?: string;
}

export interface LiveFindOptions {
  /** Limit czasu tego wywołania (ms). */
  budgetMs: number;
  now: Date;
}

export interface LiveLayer {
  readonly sources: LiveSourceList;
  /** Domyślny limit czasu na twierdzenie. */
  readonly budgetMs: number;
  find(claim: ExtractedClaim, opts: LiveFindOptions): Promise<LiveFindResult>;
}

export interface LiveLayerOptions {
  sources: LiveSourceList;
  searcher: LiveSearcher;
  /** Bezpieczny pobieracz (createPageFetcher). */
  fetchPage: PageFetcher;
  budgetMs?: number;
  maxPages?: number;
}

const PL_MONTHS: Record<string, number> = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

function isoDay(y: number, m: number, d: number, now: Date): string | null {
  if (y < 2000 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getTime() > now.getTime() + 86_400_000) return null;
  return dt.toISOString().slice(0, 10);
}

/**
 * Data publikacji: z wieku strony podanego przez wyszukiwarkę (ISO, "N days ago", data po angielsku),
 * a gdy brak, z pierwszej daty w początku tekstu strony (dd.mm.rrrr albo "20 listopada 2026").
 * Brak pewnej daty = null (obniża siłę podstawy, nie zmienia werdyktu).
 */
export function publishedDate(pageAge: string | null, text: string, now: Date): string | null {
  const age = (pageAge ?? '').trim();
  if (age) {
    const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(age);
    if (iso) return isoDay(+iso[1]!, +iso[2]!, +iso[3]!, now);
    const rel = /^(\d{1,3})\s+(minute|hour|day|week)s?\s+ago$/i.exec(age);
    if (rel) {
      const unit = { minute: 60_000, hour: 3_600_000, day: 86_400_000, week: 604_800_000 }[rel[2]!.toLowerCase() as 'day']!;
      return new Date(now.getTime() - +rel[1]! * unit).toISOString().slice(0, 10);
    }
    const parsed = Date.parse(`${age} UTC`);
    if (!Number.isNaN(parsed)) {
      const d = new Date(parsed);
      return isoDay(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), now);
    }
  }
  const head = text.slice(0, 2_000);
  const num = /(?<!\d)(\d{1,2})\.(\d{1,2})\.(20\d{2})(?!\d)/.exec(head);
  if (num) {
    const v = isoDay(+num[3]!, +num[2]!, +num[1]!, now);
    if (v) return v;
  }
  const word = /(?<!\d)(\d{1,2})\s+(\p{L}+)\s+(20\d{2})(?!\d)/iu.exec(head);
  if (word) {
    const m = PL_MONTHS[word[2]!.toLowerCase()];
    if (m) return isoDay(+word[3]!, m, +word[1]!, now);
  }
  return null;
}

/** Rdzenie słów twierdzenia (pierwsze 5 liter) i liczby: do wyboru fragmentów z długiej strony. */
export function claimTerms(claim: ExtractedClaim): { stems: string[]; numbers: string[] } {
  const text = [claim.text, ...(claim.searchTerms ?? [])].join(' ').toLowerCase();
  const stems = [...new Set((text.match(/\p{L}{4,}/gu) ?? []).map((w) => w.slice(0, 5)))];
  const numbers = [...new Set(text.match(/\d+(?:[:.,]\d+)?/g) ?? [])];
  return { stems, numbers };
}

export function relevance(chunk: string, terms: { stems: string[]; numbers: string[] }): number {
  const low = chunk.toLowerCase();
  let s = 0;
  for (const st of terms.stems) if (low.includes(st)) s++;
  for (const n of terms.numbers) if (low.includes(n)) s += 2;
  return s;
}

function shortTitle(title: string | null | undefined, fallback: string): string {
  const t = cleanText(title ?? '').replace(/\s+/g, ' ').trim();
  if (!t || detectInjectionSignals(t).length > 0) return fallback;
  return t.length > 200 ? `${t.slice(0, 199).trimEnd()}…` : t;
}

class Timeout extends Error {}

export function createLiveLayer(opts: LiveLayerOptions): LiveLayer {
  const { sources, searcher, fetchPage } = opts;
  const maxPages = opts.maxPages ?? LIVE_MAX_PAGES;
  const robotsCache = new Map<string, { at: number; rules: RobotsRules | null }>();

  /** Reguły robots.txt; `null` = nie wolno pobierać (błąd serwera lub sieci: ostrożnie). */
  async function robotsFor(origin: string): Promise<RobotsRules | null> {
    const hit = robotsCache.get(origin);
    if (hit && Date.now() - hit.at < ROBOTS_TTL_MS) return hit.rules;
    let rules: RobotsRules | null;
    const r = await fetchPage(`${origin}/robots.txt`).catch(() => ({ ok: false as const, reason: 'blad_sieci' as const }));
    if (r.ok) rules = parseRobots(r.text);
    else if (r.reason === 'status_http' && (r as { status?: number }).status !== undefined && (r as { status: number }).status < 500)
      rules = { disallow: [], allow: [], crawlDelayMs: 0 };
    else if (r.reason === 'pusta_tresc' || r.reason === 'zly_typ_tresci') rules = { disallow: [], allow: [], crawlDelayMs: 0 };
    else rules = null;
    robotsCache.set(origin, { at: Date.now(), rules });
    return rules;
  }

  async function run(claim: ExtractedClaim, now: Date, signal: AbortSignal, out: LiveFindResult): Promise<void> {
    const res = await searcher.search({ claim: claim.text, today: now.toISOString().slice(0, 10), domains: sources.domains(), signal });
    out.searches = res.searches;
    out.searchFeeUsd = res.searchFeeUsd;
    if (res.usage) out.usage = res.usage;
    out.hits = res.hits.length;
    if (res.errorCode) out.errorCode = res.errorCode;

    // Kontrola domeny w kodzie: adres spoza listy odpada niezależnie od filtra wyszukiwarki.
    const chosen: { hit: LiveSearchHit; source: LiveSource }[] = [];
    const seen = new Set<string>();
    for (const hit of res.hits) {
      const source = sources.match(hit.url);
      if (!source) {
        let host = 'zly_adres';
        try {
          host = new URL(hit.url).hostname;
        } catch {
          // zostaje zly_adres
        }
        out.rejectedDomains.push(host);
        continue;
      }
      const key = hit.url.replace(/#.*$/, '');
      if (seen.has(key)) continue;
      seen.add(key);
      chosen.push({ hit, source });
      if (chosen.length >= maxPages) break;
    }
    if (chosen.length === 0) {
      out.status = res.errorCode ? 'blad_wyszukiwania' : 'brak_wynikow';
      return;
    }

    const terms = claimTerms(claim);
    const perPage = await Promise.all(
      chosen.map(async ({ hit, source }, pageIndex) => {
        const url = new URL(hit.url);
        const rules = await robotsFor(url.origin);
        if (!rules || !isAllowedByRobots(rules, url)) {
          out.robotsBlocked++;
          return [];
        }
        const page = await fetchPage(hit.url).catch(() => ({ ok: false as const, reason: 'blad_sieci' as const }));
        if (!page.ok) {
          out.fetchFailed++;
          return [];
        }
        // Przekierowanie poza listę: strona odpada.
        if (sources.match(page.finalUrl)?.id !== source.id) {
          out.rejectedDomains.push(new URL(page.finalUrl).hostname);
          return [];
        }
        out.pages++;
        const fetchedAt = now.toISOString();
        const docId = `live:${sha256Hex(page.finalUrl).slice(0, 16)}`;
        const meta: SourceMeta = {
          documentId: docId,
          sourceId: `live-${source.id}`,
          title: shortTitle(page.title ?? hit.title, source.publisher),
          publisher: source.publisher,
          domain: source.domain,
          url: page.finalUrl,
          publishedAt: publishedDate(hit.pageAge, page.text, now),
          fetchedAt,
          sourceType: source.sourceType,
          license: LIVE_LICENSE,
          layer: 'media_i_instytucje',
        };
        const chunks = chunkText(page.text).map((c) => cleanText(c)).filter((c) => c.length >= 40);
        const scored = chunks
          .map((text, n) => ({ text, n, score: relevance(text, terms) }))
          .filter((c) => c.score > 0)
          .sort((a, b) => b.score - a.score || a.n - b.n)
          .slice(0, LIVE_PASSAGES_PER_PAGE);
        return scored.map((c) => ({ passage: { id: `${docId}#${c.n}`, documentId: docId, text: c.text, meta } as Passage, score: c.score, pageIndex }));
      }),
    );
    // Kolejność: po trafności, przy remisie po pozycji w wynikach wyszukiwania.
    const all = perPage.flat().sort((a, b) => b.score - a.score || a.pageIndex - b.pageIndex);
    for (const { passage } of all) {
      const sig = detectInjectionSignals(passage.text);
      if (sig.length) {
        out.flagged.push({ passageId: passage.id, signals: sig });
        continue;
      }
      if (out.passages.length < LIVE_MAX_PASSAGES) out.passages.push(passage);
    }
    out.status = out.passages.length ? 'ok' : 'brak_wynikow';
  }

  return {
    sources,
    budgetMs: opts.budgetMs ?? DEFAULT_LIVE_BUDGET_MS,
    async find(claim, { budgetMs, now }) {
      const started = Date.now();
      const out: LiveFindResult = {
        status: 'brak_wynikow',
        passages: [],
        flagged: [],
        hits: 0,
        rejectedDomains: [],
        robotsBlocked: 0,
        fetchFailed: 0,
        pages: 0,
        searches: 0,
        searchFeeUsd: 0,
        ms: 0,
      };
      const ctrl = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          ctrl.abort();
          reject(new Timeout());
        }, Math.max(0, budgetMs));
        (timer as { unref?: () => void }).unref?.();
      });
      timeout.catch(() => undefined);
      try {
        await Promise.race([run(claim, now, ctrl.signal, out), timeout]);
        out.ms = Date.now() - started;
        return out;
      } catch (e) {
        // Kopia: przerwany przebieg może jeszcze dopisywać do `out`, ale wynik jest już ustalony.
        const failed: LiveFindResult = {
          ...out,
          passages: [],
          flagged: [...out.flagged],
          rejectedDomains: [...out.rejectedDomains],
          status: e instanceof Timeout ? 'przekroczony_czas' : 'blad_wyszukiwania',
          ms: Date.now() - started,
        };
        if (!(e instanceof Timeout)) failed.errorCode = (e as { code?: string })?.code ?? 'blad';
        return failed;
      } finally {
        if (timer) clearTimeout(timer);
        ctrl.abort();
      }
    },
  };
}
