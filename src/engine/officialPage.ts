// Strona urzędu wklejona przez użytkownika jako tymczasowy dokument dowodowy (zad. 43).
//
// Strona jest pobrana przez bezpieczny pobieracz (SSRF, limity, bez treści ukrytej). Host początkowy
// i końcowy (po przekierowaniach) muszą być na jawnej liście (officialHosts.ts), a typ treści to HTML.
// Z treści powstają fragmenty z metadanymi wydawcy z listy, adresem, datą publikacji i datą pobrania.
// Dalej TEN SAM potok co dla zbioru (ocena stanowiska, cytat jako dosłowny podciąg, bramka wsparcia,
// tabela reguł). Dokument nie jest zapisywany w zbiorze; w rekordzie zostaje cytat i metadane.
import {
  sha256Hex,
  type ExtractedClaim,
  type PageInfo,
  type Passage,
  type SourceMeta,
} from '../contracts/index';
import { chunkText } from '../corpus/chunk';
import { cleanText } from '../input/normalize';
import { maskPii } from '../input/pii';
import { normalizeUrl } from '../input/url';
import { claimTerms, relevance } from '../live/layer';
import type { PageFetchResult } from './fetch/index';
import { detectInjectionSignals, type InjectionSignalCode } from './injection';
import type { OfficialHostList, OfficialHostMatch } from './officialHosts';

export const PAGE_SOURCE_ID = 'strona-urzedu';
export const PAGE_LICENSE =
  'Krótki cytat z podaniem wydawcy, adresu i daty pobrania (art. 29 ustawy o prawie autorskim); strona pobrana w chwili zgłoszenia, bez przechowywania pełnej treści.';
/** Najwyżej tyle fragmentów strony idzie do oceny dla jednego twierdzenia. */
export const PAGE_PASSAGES_PER_CLAIM = 4;
const MIN_CHUNK_CHARS = 40;
const MAX_TITLE_CHARS = 200;
/** Krótszy akapit bez znaku końca zdania przed pierwszym akapitem treści to nagłówek strony. */
const HEADER_MAX_CHARS = 120;
const DATE_ONLY =
  /^(?:(?:data publikacji|opublikowano|dodano|data)\s*:?\s*)?(?:\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+\p{L}+\s+\d{4})(?:\s*r\.?)?(?:,?\s*(?:godz\.\s*)?\d{1,2}:\d{2})?$/iu;

type OkPage = Extract<PageFetchResult, { ok: true }>;

const HTML_TYPES = new Set(['text/html', 'application/xhtml+xml']);

export interface PageDescription {
  info: PageInfo;
  /** Adres po maskowaniu parametrów (do dowodów i rekordu). */
  url: string;
  /** Dopasowanie do listy; `null`, gdy strona nie jest urzędowa (zwykła ścieżka). */
  official: OfficialHostMatch | null;
  /** Adres początkowy był na liście, ale host końcowy (albo typ treści) nie: nie "potwierdzamy" z takiej strony. */
  leftTheList: boolean;
}

/** Tytuł do pokazania: oczyszczony, bez poleceń i danych osobowych, do 200 znaków; `null`, gdy nic nie zostaje. */
export function safeTitle(title: string | null | undefined): string | null {
  const t = maskPii(cleanText(title ?? '')).text.replace(/\s+/gu, ' ').trim();
  if (!t || detectInjectionSignals(t).length > 0) return null;
  return t.length > MAX_TITLE_CHARS ? `${t.slice(0, MAX_TITLE_CHARS - 1).trimEnd()}…` : t;
}

const ORGAN_START =
  /^(?:Ministerstwo|Minister|Urząd|Kancelaria|Główny|Główna|Główne|Generalny|Generalna|Komenda|Inspekcja|Inspektorat|Agencja|Rzecznik|Biuro|Centrum|Centralny|Centralne|Centralna|Narodowy|Narodowe|Narodowa|Państwow\p{L}*|Krajow\p{L}*|Komisja|Rada|Rządow\p{L}*|Najwyższa|Najwyższy|Instytut|Straż|Policja|Komendant|Wojewod\p{L}*|Starostwo|Ambasada|Konsulat|Sekretariat|Departament|Służba|Prokuratura|Sąd|Trybunał|Parlament|Europejsk\p{L}*|European)(?=\s|$)/u;

/**
 * Nazwa organu z tytułu strony we wspólnej strefie urzędów (wpis `sufiks`, np. gov.pl): układ
 * "<tytuł> - <organ> - <portal>", czyli przedostatni człon, tylko gdy zaczyna się jak nazwa organu
 * (Ministerstwo, Urząd, Kancelaria...). Inaczej `null` i zostaje ogólna nazwa z listy.
 */
export function organFromTitle(title: string | null | undefined): string | null {
  const t = safeTitle(title);
  if (!t) return null;
  const parts = t.split(/\s+[-–—|]\s+/u).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return null;
  const organ = parts[parts.length - 2]!;
  return organ.length >= 5 && organ.length <= 100 && ORGAN_START.test(organ) ? organ : null;
}

export function pageDomain(host: string): string {
  return host.replace(/^www\./u, '');
}

function maskedFinalUrl(finalUrl: string, fallback: string): string {
  const n = normalizeUrl(finalUrl);
  return n.ok ? n.normalizedInput : fallback;
}

/**
 * Opis pobranej strony do rekordu i decyzja, czy jest urzędowa. Urzędowa: adres początkowy ORAZ końcowy
 * rozpoznane przez listę (ścisłe reguły), typ treści HTML.
 */
export function describePage(
  page: OkPage,
  requestedUrl: string,
  list: OfficialHostList | null,
  fetchedAt: Date,
): PageDescription {
  const url = maskedFinalUrl(page.finalUrl, requestedUrl);
  let host = '';
  try {
    host = new URL(page.finalUrl).hostname.toLowerCase().replace(/\.$/u, '');
  } catch {
    // zostaje pusty host
  }
  const startedOn = list?.match(requestedUrl) ?? null;
  const endedOn = list?.match(page.finalUrl) ?? null;
  const html = HTML_TYPES.has(page.contentType.toLowerCase());
  const official = startedOn && endedOn && html ? endedOn : null;
  const info: PageInfo = {
    url,
    title: safeTitle(page.title),
    domain: pageDomain(host || 'nieznany.host'),
    ...(page.publishedAt ? { publishedAt: page.publishedAt } : {}),
    fetchedAt: fetchedAt.toISOString(),
    official: official !== null,
    ...(official
      ? { publisher: (official.entry.rule === 'sufiks' ? organFromTitle(page.title) : null) ?? official.entry.publisher }
      : {}),
  };
  return { info, url, official, leftTheList: startedOn !== null && official === null };
}

export interface OfficialPageDocument {
  documentId: string;
  meta: SourceMeta;
  /** Fragmenty bez sygnałów injection, w kolejności strony. */
  passages: Passage[];
  /** Fragmenty odrzucone z powodu sygnału injection (kody, bez treści). */
  flagged: { passageId: string; signals: InjectionSignalCode[] }[];
}

/**
 * Tymczasowy dokument dowodowy ze strony urzędu. Tekst dzieli się na akapity; akapit z sygnałem injection
 * odpada, a sąsiednie czyste akapity są dzielone na fragmenty osobno (cytat nie obejmuje pominiętego miejsca,
 * więc zawsze jest dosłownym podciągiem strony).
 */
export function buildOfficialDocument(page: OkPage, desc: PageDescription): OfficialPageDocument {
  const entry = desc.official!.entry;
  const documentId = `page:${sha256Hex(`${desc.url}\n${page.text}`).slice(0, 16)}`;
  const meta: SourceMeta = {
    documentId,
    sourceId: PAGE_SOURCE_ID,
    title: desc.info.title ?? desc.info.publisher ?? entry.publisher,
    publisher: desc.info.publisher ?? entry.publisher,
    domain: entry.host,
    url: desc.url,
    publishedAt: desc.info.publishedAt ?? null,
    fetchedAt: desc.info.fetchedAt,
    sourceType: 'urzedowe',
    license: PAGE_LICENSE,
    layer: 'strona_urzedu',
  };
  const paragraphs = page.text
    .replace(/\r\n?/gu, '\n')
    .split(/\n\s*\n/u)
    .map((p) => cleanText(p))
    .filter(Boolean);
  const runs: string[][] = [[]];
  const flaggedParagraphs: InjectionSignalCode[][] = [];
  let bodyStarted = false;
  for (const p of paragraphs) {
    // Data publikacji jako osobny akapit (np. zaraz po tytule) nie jest treścią: przerywa ciąg, żeby cytat
    // nie zaczynał się od daty, i nie trafia do fragmentów. Krótkie akapity przed pierwszym zdaniem treści
    // (tytuł, okruszki, "Powrót") też nie: to nagłówek strony, nie komunikat.
    if (DATE_ONLY.test(p)) {
      runs.push([]);
      continue;
    }
    if (!bodyStarted) {
      if (p.length < HEADER_MAX_CHARS && !/[.!?:;]$/u.test(p)) continue;
      bodyStarted = true;
    }
    const sig = detectInjectionSignals(p);
    if (sig.length > 0) {
      flaggedParagraphs.push(sig);
      runs.push([]);
      continue;
    }
    runs[runs.length - 1]!.push(p);
  }
  const passages: Passage[] = [];
  const flagged: OfficialPageDocument['flagged'] = flaggedParagraphs.map((signals, i) => ({ passageId: `${documentId}#x${i}`, signals }));
  let n = 0;
  for (const run of runs) {
    if (run.length === 0) continue;
    for (const chunk of chunkText(run.join('\n\n'))) {
      const text = cleanText(chunk);
      if (text.length < MIN_CHUNK_CHARS) continue;
      const sig = detectInjectionSignals(text);
      const id = `${documentId}#${n++}`;
      if (sig.length > 0) {
        flagged.push({ passageId: id, signals: sig });
        continue;
      }
      passages.push({ id, documentId, text, meta });
    }
  }
  return { documentId, meta, passages, flagged };
}

/** Fragmenty strony najbardziej związane z twierdzeniem (słowa i liczby), najwyżej `limit`, w kolejności trafności. */
export function selectPagePassages(doc: OfficialPageDocument, claim: ExtractedClaim, limit = PAGE_PASSAGES_PER_CLAIM): Passage[] {
  const terms = claimTerms(claim);
  return doc.passages
    .map((p, i) => ({ p, i, score: relevance(p.text, terms) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.p);
}

const EMBEDDED_URL = /(?:https?:\/\/|(?<![\p{L}\p{N}./@-])www\.)[^\s<>"'«»„”]+/giu;

/** Adresy w tekście zgłoszenia (kolejność wystąpienia, bez powtórzeń, bez znaków interpunkcji na końcu). */
export function urlsInText(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(EMBEDDED_URL)) {
    let u = m[0].replace(/[.,;:!?)\]}]+$/u, '');
    if (/^www\./iu.test(u)) u = `https://${u}`;
    if (!out.includes(u)) out.push(u);
  }
  return out;
}

/** Pierwszy adres z tekstu, który lista rozpoznaje jako urzędowy (https); inne adresy w tekście nie są pobierane. */
export function firstOfficialUrl(text: string, list: OfficialHostList): string | null {
  return urlsInText(text).find((u) => list.match(u) !== null) ?? null;
}

/** Ten sam adres strony: bez fragmentu, bez końcowego ukośnika, host bez `www.`. */
export function sameUrl(a: string, b: string): boolean {
  const key = (s: string): string | null => {
    try {
      const u = new URL(s);
      return `${u.hostname.toLowerCase().replace(/^www\./u, '')}${u.pathname.replace(/\/+$/u, '')}${u.search}`;
    } catch {
      return null;
    }
  };
  const ka = key(a);
  return ka !== null && ka === key(b);
}

/** Wynik pierwszeństwa strony urzędu nad innymi dowodami dla twierdzenia wyodrębnionego z tej strony. */
export interface PagePrecedence<T> {
  accepted: T[];
  /** Strona ma dosłowny cytat ze stanowiskiem `potwierdza`. */
  pageConfirms: boolean;
  /** Nowsze niż strona i sprzeczne z nią dowody (inne dokumenty, oceny redakcji): uwaga i niższa siła, nie werdykt. */
  newer: T[];
  /** Ile sprzecznych dowodów starszych niż strona (albo bez daty, albo przy stronie bez daty) zostało tłem. */
  backgrounded: number;
}

type PrecedenceItem = { passage: { meta: SourceMeta }; stance: string; mismatch?: unknown };

const CONTRA = new Set(['obala', 'rozbieznosc_kontekstu']);

/**
 * Zad. 44, reguła ogólna: twierdzenie wyodrębnione ze strony urzędu ocenia się dowodem z TEJ strony.
 * - Fragmenty tej strony (warstwa `strona_urzedu` albo kopia pod tym samym adresem w zbiorze) nie mogą
 *   przeczyć zdaniu, które z nich pochodzi: ich `obala`/`rozbieznosc_kontekstu` staje się `kontekst`.
 * - Inne dokumenty (zbiór, indeks redakcji) sprzeczne ze stroną: starsze niż strona, bez daty albo przy
 *   stronie bez daty są tłem (`kontekst`, "wcześniejszy komunikat"); nowszy urząd zastępuje starszy.
 * - Nowszy niż strona sprzeczny dokument: nie zmienia werdyktu po cichu (też `kontekst` w regułach),
 *   ale trafia do `newer` (uwaga "Nowsze źródło mówi inaczej" i niższa siła), gdy strona potwierdza.
 * Zgodne dowody innych dokumentów zostają bez zmian.
 */
export function applyPagePrecedence<T extends PrecedenceItem>(accepted: T[], page: Pick<PageInfo, 'url' | 'publishedAt'>): PagePrecedence<T> {
  const fromPage = (a: T) => a.passage.meta.layer === 'strona_urzedu' || sameUrl(a.passage.meta.url, page.url);
  const pageConfirms = accepted.some((a) => fromPage(a) && a.stance === 'potwierdza');
  const pageDate = page.publishedAt ?? null;
  const newer: T[] = [];
  let backgrounded = 0;
  const asContext = (a: T): T => {
    const { mismatch: _m, ...rest } = a;
    return { ...(rest as T), stance: 'kontekst' };
  };
  const out = accepted.map((a) => {
    if (!CONTRA.has(a.stance)) return a;
    if (fromPage(a)) return asContext(a);
    const date = a.passage.meta.publishedAt ?? null;
    if (pageDate && date && date > pageDate) {
      if (pageConfirms) newer.push(a);
      return asContext(a);
    }
    backgrounded++;
    return asContext(a);
  });
  return { accepted: out, pageConfirms, newer, backgrounded };
}
