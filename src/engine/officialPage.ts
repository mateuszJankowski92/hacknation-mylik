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
    ...(official ? { publisher: official.entry.publisher } : {}),
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
    title: desc.info.title ?? entry.publisher,
    publisher: entry.publisher,
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
  for (const p of paragraphs) {
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
