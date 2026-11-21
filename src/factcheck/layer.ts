// Warstwa "indeks weryfikacji" (warstwa 3 źródeł): oceny redakcji sprawdzających fakty z indeksu
// Google Fact Check Tools. Działa równolegle z wyszukiwaniem w zbiorze urzędowym, z własnym limitem czasu.
//
// Zasady:
// - Treść przekazywana do oceny to WYŁĄCZNIE dosłowne pole `claim.text` (sprawdzana teza) z odpowiedzi API.
//   Ocena redakcji, tytuł, wydawca, data i adres trafiają do metadanych (wstawia je kod), model ich nie widzi.
// - Model ocenia (istniejący krok oceny i bramka wsparcia) relację tezy do twierdzenia użytkownika:
//   "potwierdza" = ta sama teza, "obala" = teza odwrotna. Reszta to tło albo brak związku.
// - Kod (select) wymaga zgodności zdarzenia (nazwy własne i data, jak w drugiej warstwie) i dopiero
//   wtedy przekłada ocenę redakcji na stanowisko jawną tabelą (ratings.ts).
// - Awaria, limit, brak klucza, przekroczenie czasu: status techniczny, nigdy werdykt ani "nie znaleziono".
// - Stron redakcji nie pobieramy (wskazanie organizatora): odpowiedź odsyła do publikacji adresem z indeksu.
import { sha256Hex, type ExtractedClaim, type Notice, type Passage, type SourceMeta } from '../contracts/index';
import type { AcceptedEvidence } from '../engine/citations';
import { detectInjectionSignals, type InjectionSignalCode } from '../engine/injection';
import { claimDate, dateMatches, properNames } from '../live/select';
import { claimTerms, relevance } from '../live/layer';
import type { FactcheckIndex, IndexErrorCode } from './client';
import { matchPublisher, type FactcheckConfig } from './config';
import { labelForRating, labelForUserClaim } from './ratings';

export const FACTCHECK_MAX_PASSAGES = 6;
export const FACTCHECK_LICENSE =
  'Wpis z indeksu Google Fact Check Tools (ClaimReview): sprawdzana teza, ocena i adres publikacji wydawcy; bez kopii artykułu.';

export type FactcheckStatus = 'ok' | 'brak_wynikow' | IndexErrorCode;

export interface FactcheckFindResult {
  status: FactcheckStatus;
  passages: Passage[];
  flagged: { passageId: string; signals: InjectionSignalCode[] }[];
  /** Ile wpisów zwrócił indeks (przed filtrem wydawców). */
  hits: number;
  /** Ile wpisów odpadło, bo wydawca spoza listy. */
  otherPublishers: number;
  queries: number;
  ms: number;
  httpStatus?: number;
}

export interface FactcheckSelection {
  accepted: AcceptedEvidence[];
  notices?: Notice[];
  dropped?: number;
  reasons?: Record<string, number>;
}

export interface FactcheckLayer {
  readonly budgetMs: number;
  find(claim: ExtractedClaim, opts: { budgetMs: number; now: Date; maxQueries?: number }): Promise<FactcheckFindResult>;
  /** Łączny limit zapytań do indeksu na jedno zgłoszenie (dzielony między twierdzenia). */
  readonly maxQueriesPerRequest: number;
  select(claim: ExtractedClaim, accepted: AcceptedEvidence[], now: Date): FactcheckSelection;
}

/** Status techniczny (awaria) w odróżnieniu od wyniku ("ok", "brak_wynikow"). */
export function isFactcheckFailure(s: FactcheckStatus): boolean {
  return s !== 'ok' && s !== 'brak_wynikow';
}

function isoDay(v: string | undefined): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(v ?? '');
  if (!m) return null;
  return Number.isNaN(Date.parse(`${m[1]}T00:00:00Z`)) ? null : m[1]!;
}

const STOP = new Set(['który', 'która', 'które', 'których', 'przez', 'oraz', 'tylko', 'jest', 'były', 'było', 'była', 'będzie', 'został', 'została', 'zostały', 'jako', 'także', 'około', 'ponad', 'bardzo', 'jeszcze', 'wszystkie', 'można', 'może', 'mogą', 'nawet', 'kiedy', 'gdzie', 'ostatnio']);

/**
 * Krótkie warianty frazy z twierdzenia (po 1-3 słowa): indeks dopasowuje frazy dosłownie, bez
 * podobieństwa, więc pytamy go kilkoma krótkimi frazami zamiast całego zdania. Kolejność: nazwy własne,
 * nazwa z liczbą, najdłuższe słowa treści, słowa kluczowe od modelu, nazwa ze słowem treści.
 * Bez treści zgłoszenia i bez danych spoza twierdzenia.
 */
export function phraseVariants(claim: ExtractedClaim, max = 5): string[] {
  const out: string[] = [];
  const add = (words: string[]) => {
    const t = words.slice(0, 3).join(' ').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (t.length >= 3 && !out.includes(t)) out.push(t);
  };
  const text = claim.text.replace(/[.?!]+$/u, '');
  const tokens = text.match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) ?? [];
  const terms = new Set((claim.searchTerms ?? []).map((t) => t.toLowerCase()));
  // Pierwszy wyraz zdania liczy się jako nazwa tylko, gdy to skrótowiec albo model podał go jako słowo kluczowe.
  const isName = (w: string, i: number) =>
    w.length >= 2 && /^\p{Lu}/u.test(w) && (i > 0 ? w.length >= 3 : /^\p{Lu}{2,}$/u.test(w) || terms.has(w.toLowerCase()));
  const names = tokens.filter((w, i) => isName(w, i) && !/\d/.test(w));
  const numbers = tokens.filter((w) => /\d/.test(w));
  const content = tokens.filter((w, i) => w.length >= 5 && !STOP.has(w.toLowerCase()) && !/\d/.test(w) && !isName(w, i));
  const longest = [...content].sort((x, y) => y.length - x.length || content.indexOf(x) - content.indexOf(y)).slice(0, 2);
  if (names.length) add(names);
  // Liczby i oznaczenia z cyfrą (np. "F-16", "CO2", "4400"): z nazwą albo osobno, gdy nazw brak.
  if (numbers.length) add(names.length ? [names[0]!, numbers[0]!] : numbers);
  // Początek zdania (podmiot i orzeczenie), gdy pierwszy wyraz może być nazwą (np. marka na początku zdania).
  if (tokens.length >= 2 && /^\p{Lu}/u.test(tokens[0]!) && tokens[0]!.length >= 3 && !names.includes(tokens[0]!)) add(tokens.slice(0, 2));
  if (longest.length) add(content.filter((w) => longest.includes(w)));
  for (const t of claim.searchTerms ?? []) add(t.split(/\s+/));
  if (names.length && content.length) add([names[0]!, content[0]!]);
  if (!out.length) add(tokens.slice(0, 3));
  return out.slice(0, max);
}

/** Zgodność wstecz: same warianty fraz. */
export function indexQueries(claim: ExtractedClaim, max: number): string[] {
  return phraseVariants(claim, max);
}

export interface PlannedQuery {
  query: string;
  site?: string;
}

/**
 * Plan zapytań jednego twierdzenia: każdy wariant bez filtra wydawcy, potem (po kolei) warianty
 * z filtrem dla każdego włączonego wydawcy z listy, łącznie najwyżej `maxTotal`.
 */
export function planQueries(variants: string[], sites: string[], maxTotal: number): PlannedQuery[] {
  const plan: PlannedQuery[] = variants.map((query) => ({ query }));
  for (let v = 0; plan.length < maxTotal && v < variants.length; v++)
    for (const site of sites) {
      if (plan.length >= maxTotal) break;
      plan.push({ query: variants[v]!, site });
    }
  return plan.slice(0, maxTotal);
}

export function createFactcheckLayer(opts: { config: FactcheckConfig; index: FactcheckIndex }): FactcheckLayer {
  const { config, index } = opts;

  return {
    budgetMs: config.index.timeoutMs,
    maxQueriesPerRequest: config.index.maxQueries,
    async find(claim, { budgetMs, now, maxQueries }) {
      const started = Date.now();
      const out: FactcheckFindResult = { status: 'brak_wynikow', passages: [], flagged: [], hits: 0, otherPublishers: 0, queries: 0, ms: 0 };
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), Math.max(0, budgetMs));
      (timer as { unref?: () => void }).unref?.();
      try {
        const sites = config.publishers.filter((p) => p.enabled).map((p) => p.site);
        const queries = planQueries(phraseVariants(claim, config.index.variants ?? 5), sites, Math.max(1, Math.min(config.index.maxQueries, maxQueries ?? config.index.maxQueries)));
        out.queries = queries.length;
        const results = await Promise.all(
          queries.map(({ query, site }) =>
            index
              .search({ query, ...(site ? { site } : {}), languageCode: config.index.languageCode, pageSize: config.index.pageSize, signal: ctrl.signal })
              .catch(() => ({ ok: false as const, code: 'blad_sieci' as const })),
          ),
        );
        const seen = new Set<string>();
        const candidates: Passage[] = [];
        let failure: { code: IndexErrorCode; status?: number } | null = null;
        for (const r of results) {
          if (!r.ok) {
            failure ??= { code: ctrl.signal.aborted ? 'przekroczony_czas' : r.code, ...('status' in r && r.status ? { status: r.status } : {}) };
            continue;
          }
          for (const c of r.claims) {
            const text = typeof c?.text === 'string' ? c.text.trim() : '';
            for (const rev of Array.isArray(c?.claimReview) ? c.claimReview : []) {
              out.hits++;
              const url = typeof rev?.url === 'string' ? rev.url : '';
              let host = '';
              try {
                const u = new URL(url);
                if (u.protocol !== 'https:' && u.protocol !== 'http:') continue;
                host = u.hostname;
              } catch {
                continue;
              }
              // Wydawca z listy: domena adresu publikacji (nie samo pole nazwy) musi pasować do listy.
              const pub = matchPublisher(config, host);
              const siteOk = !rev.publisher?.site || matchPublisher(config, rev.publisher.site)?.id === pub?.id;
              if (!pub || !siteOk) {
                out.otherPublishers++;
                continue;
              }
              const rating = typeof rev.textualRating === 'string' ? rev.textualRating.trim() : '';
              if (!text || !rating) continue;
              const key = `${url}\n${text}`;
              if (seen.has(key)) continue;
              seen.add(key);
              const docId = `fc:${sha256Hex(url).slice(0, 16)}`;
              const id = `${docId}#${sha256Hex(text).slice(0, 8)}`;
              const title = typeof rev.title === 'string' && rev.title.trim() ? rev.title.trim() : text;
              const signals = [...new Set([...detectInjectionSignals(text), ...detectInjectionSignals(title), ...detectInjectionSignals(rating)])];
              if (signals.length) {
                out.flagged.push({ passageId: id, signals });
                continue;
              }
              const meta: SourceMeta = {
                documentId: docId,
                sourceId: `fc-${pub.id}`,
                title: title.length > 200 ? `${title.slice(0, 199).trimEnd()}…` : title,
                publisher: (rev.publisher?.name ?? '').trim() || pub.name,
                domain: pub.site,
                url,
                publishedAt: isoDay(rev.reviewDate) ?? isoDay(c.claimDate),
                fetchedAt: now.toISOString(),
                sourceType: 'factcheck',
                license: FACTCHECK_LICENSE,
                layer: 'weryfikacja_redakcji',
                review: {
                  claimReviewed: text,
                  claimant: typeof c.claimant === 'string' && c.claimant.trim() ? c.claimant.trim() : null,
                  claimDate: isoDay(c.claimDate),
                  rating,
                  label: labelForRating(rating),
                },
              };
              candidates.push({ id, documentId: docId, text, meta });
            }
          }
        }
        // Nasz ranking zamiast kolejności indeksu: dopasowanie słów i liczb twierdzenia do tezy i tytułu.
        // Dalej o tym, czy to ta sama teza, rozstrzyga ocena modelu i wymóg zgodności zdarzenia.
        const terms = claimTerms(claim);
        out.passages = candidates
          .map((p, i) => ({ p, i, score: relevance(`${p.text}\n${p.meta.title}`, terms) }))
          .sort((x, y) => y.score - x.score || x.i - y.i)
          .slice(0, FACTCHECK_MAX_PASSAGES)
          .map((x) => x.p);
        if (out.passages.length) out.status = 'ok';
        else if (failure) {
          out.status = failure.code;
          if (failure.status) out.httpStatus = failure.status;
        } else out.status = ctrl.signal.aborted ? 'przekroczony_czas' : 'brak_wynikow';
      } finally {
        clearTimeout(timer);
        out.ms = Date.now() - started;
      }
      return out;
    },

    select: selectReviewEvidence,
  };
}

/**
 * Reguły doboru dla ocen redakcji (z indeksu i ze zbioru): tylko ta sama teza ("potwierdza") albo
 * teza odwrotna ("obala"), zgodne nazwy własne i data; ocena redakcji -> stanowisko jawną tabelą.
 * Uzasadnienie weryfikacji ze zbioru i ocena bez rozstrzygnięcia: tylko tło. Może tylko odrzucać
 * albo osłabiać do tła; nigdy nie dodaje dowodu.
 */
export function selectReviewEvidence(claim: ExtractedClaim, accepted: AcceptedEvidence[], now: Date): FactcheckSelection {
    const reasons: Record<string, number> = {};
    const drop = (code: string) => (reasons[code] = (reasons[code] ?? 0) + 1);
    const names = properNames(claim.text);
    const date = claimDate(claim.text);
    const kept: AcceptedEvidence[] = [];
    for (const a of accepted) {
      const review = a.passage.meta.review;
      if (!review) {
        drop('brak_oceny');
        continue;
      }
      // Uzasadnienie z weryfikacji w zbiorze: tylko tło (rozstrzyga wyłącznie teza z oceną redakcji).
      if (review.role === 'uzasadnienie') {
        if (a.stance !== 'kontekst') drop('uzasadnienie_jako_tlo');
        const { mismatch: _m, ...rest } = a;
        kept.push({ ...rest, stance: 'kontekst' });
        continue;
      }
      // Tylko ta sama teza (potwierdza) albo teza odwrotna (obala); inna okoliczność lub tło = bez oceny.
      if (a.stance !== 'potwierdza' && a.stance !== 'obala') {
        if (a.stance === 'kontekst' || a.stance === 'rozbieznosc_kontekstu') {
          const { mismatch: _m, ...rest } = a;
          kept.push({ ...rest, stance: 'kontekst', passage: withReview(a.passage, { ...review, label: null }) });
          drop('inna_teza');
        } else drop('bez_zwiazku');
        continue;
      }
      // Zgodność zdarzenia: nazwy własne z twierdzenia w tezie lub tytule; data lub okres zgodne.
      const hay = `${a.passage.meta.title}\n${review.claimReviewed}`;
      const low = hay.toLowerCase();
      if (names.some((n) => !low.includes(n))) {
        drop('inne_nazwy');
        continue;
      }
      // Sedno i szczegół: konkret ilościowy lub czasowy z twierdzenia (liczba, data, okres, próg,
      // „jedyny”, „pierwszy”, „wszyscy”), którego nie ma w tezie ani tytule, albo niezgodna data:
      // ocena redakcji nie daje odpowiedzi wprost, zostaje jako „podobna sprawa” (tło z oceną).
      const missing = missingDetails(claim.text, hay, [review.claimDate, a.passage.meta.publishedAt]);
      const dateOff = date && !dateMatches(date, hay, review.claimDate ?? a.passage.meta.publishedAt, now) && !dateMatches(date, hay, a.passage.meta.publishedAt, now);
      if (missing.length || dateOff) {
        drop(dateOff ? 'inna_data' : 'brak_szczegolu');
        const { mismatch: _m, ...rest } = a;
        kept.push({ ...rest, stance: 'kontekst', passage: withReview(a.passage, { ...review, label: null, similar: true, ...(a.stance === 'obala' ? { inverse: true } : {}) }) });
        continue;
      }
      const inverse = a.stance === 'obala';
      const label = labelForUserClaim(review.label, inverse);
      const passage = withReview(a.passage, { ...review, inverse });
      if (label === 'potwierdzone') kept.push({ ...a, stance: 'potwierdza', passage });
      else if (label === 'falszywe') kept.push({ ...a, stance: 'obala', passage });
      else if (label === 'wprowadzajace_w_blad') kept.push({ ...a, stance: 'rozbieznosc_kontekstu', mismatch: 'warunki', passage });
      else {
        // nieweryfikowalne, ocena nieznana albo nieodwracalna: tylko tło z przypisaną oceną
        const { mismatch: _m, ...rest } = a;
      kept.push({ ...rest, stance: 'kontekst', passage });
        drop(review.label ? 'ocena_bez_rozstrzygniecia' : 'nieznana_ocena');
      }
    }
    const dropped = accepted.length - kept.length;
    return { accepted: kept, ...(Object.keys(reasons).length ? { reasons } : {}), ...(dropped ? { dropped } : {}) };
  }

/** Słowa zakresu i progu (kwantyfikatory), porównywane rdzeniem. */
const DETAIL_WORDS = /^(jedyn|pierws|wszys|wszyst|każd|kazd|zawsz|nigdy|nikt|żadn|zadn|ponad|powyż|powyz|poniż|poniz|najwi|najmn)/u;
const POLISH_STEM = (w: string) => w.toLowerCase().slice(0, 5);

/**
 * Konkrety z twierdzenia, których brak w tekście wpisu redakcji: liczby (rok zgodny z datą tezy
 * lub weryfikacji też się liczy) i słowa zakresu lub progu.
 */
export function missingDetails(claimText: string, hay: string, dates: (string | null | undefined)[]): string[] {
  const low = hay.toLowerCase();
  const years = new Set(dates.filter(Boolean).map((d) => d!.slice(0, 4)));
  const out: string[] = [];
  for (const n of claimText.match(/\d+(?:[.,]\d+)?/g) ?? []) {
    if (low.includes(n) || low.includes(n.replace(',', '.')) || low.includes(n.replace('.', ','))) continue;
    if (/^(19|20)\d{2}$/.test(n) && years.has(n)) continue;
    out.push(n);
  }
  for (const w of claimText.match(/\p{L}+/gu) ?? []) {
    if (!DETAIL_WORDS.test(w.toLowerCase())) continue;
    const st = POLISH_STEM(w);
    if (!low.includes(st)) out.push(w);
  }
  return [...new Set(out)];
}

function withReview(p: Passage, review: NonNullable<SourceMeta['review']>): Passage {
  return { ...p, meta: { ...p.meta, review } };
}
