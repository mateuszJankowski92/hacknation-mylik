// Potok weryfikacji: jedyne miejsce logiki `verify(input) -> VerifyOutcome`.
// Etapy: (1) prepare (+ pobranie strony dla URL), (2) klucz + cache, (3) filtr injection i ekstrakcja
// twierdzeń (model), (4) wyszukiwanie "za" i "przeciw" (kod), (5) ocena stanowisk (model),
// (6) bramka cytatów (kod), (7) werdykt i siła (kod), (8) ostrzeżenia, zdania i zapis.
import {
  ExtractedClaimSchema,
  LlmError,
  computeRecordKey,
  noRefutation,
  RECORD_SCHEMA_VERSION,
  sha256Hex,
  type ClaimResult,
  type EngineDeps as ContractEngineDeps,
  type EvidenceItem,
  type ExtractedClaim,
  type LlmUsage,
  type MismatchKind,
  type NeedsClarification,
  type Notice,
  type Passage,
  type PreparedInput,
  type Refutation,
  type VerificationRecord,
  type VerifyInput,
  type VerifyOutcome,
} from '../contracts/index';
import { isUnavailableInput, maskPii, questionToStatement } from '../input/index';
import { cleanText } from '../input/normalize';
import { hasKeyNumbers, validateCitations, withPreviousSentence, type AcceptedEvidence } from './citations';
import { isSupportGate, normalizeVerdicts, type SupportGate } from './supportGate';
import { errorProfileFor, loadVerifiedErrorProfile, type ErrorProfileTable } from './errorProfile';
import { engineFingerprint } from './fingerprint';
import { errorToOutcome, isLlmError, SearchFailure, stateOutcome, technicalDetail } from './errors';
import {
  abstainReasonText,
  archivalLimitation,
  archivalNotice,
  ESCALATION_LIMITATION,
  EXPIRED_LIMITATION,
  expiredNotice,
  explainClaim,
  INJECTION_NOTICE,
  INPUT_INJECTION_NOTICE,
  injectionLimitation,
  MESSAGES,
  MODEL_INJECTION_NOTICE,
  PAGE_EMBEDDED_FAILED_NOTICE,
  PAGE_INJECTION_NOTICE,
  PAGE_IS_DATA_LIMITATION,
  PAGE_LEFT_LIST_NOTICE,
  PAGE_OFFICIAL_LIMITATION,
  PAGE_OLDER_BACKGROUND_LIMITATION,
  newerSourceNotice,
  PAGE_TRUNCATED_NOTICE,
  scopeLimitation,
  UNDATED_LIMITATION,
} from './explain';
import type { PageFetcher, PageFetchResult } from './fetch/index';
import {
  runSecondCheck,
  sameModel,
  SECOND_CHECK_UNAVAILABLE_NOTICE,
  secondCheckDroppedLimitation,
  type SecondCheck,
} from './secondCheck';
import { MAX_INCIDENT_NOTICES, type IncidentMatcher } from './incidents';
import { containsUrl, detectInjectionSignals, screenClaim, stripInjectedSegments } from './injection';
import { createProgressEmitter, type ProgressEmitter, type ProgressEngine } from './progress';
import { buildShortAnswer, safeExplanation, safeShortAnswer, type EngineRenderer } from './render';
import {
  computeStrength,
  decideVerdict,
  DEFAULT_ARCHIVAL_MONTHS,
  isArchival,
  isExpired,
  type RuleEvidence,
} from './rules';
import { createStore, type EngineStore } from './store';
import { forQueries, fuseRankings, isPassageRanker, orderByRanking, type PassageRanker } from './ranker';
import { chooseRole, detectRoleSteering } from '../roles/index';
import type { LiveLayer } from '../live/layer';
import {
  LIVE_FAILED_NOTICE,
  LIVE_INJECTION_NOTICE,
  LIVE_NOT_FOUND_LIMITATION,
  LIVE_SOURCE_SENTENCE,
  LIVE_TIMEOUT_NOTICE,
  LIVE_USED_LIMITATION,
  liveSourceNotice,
} from '../live/text';
import {
  FACTCHECK_DOWN_LIMITATION,
  FACTCHECK_DOWN_MESSAGE,
  FACTCHECK_INJECTION_NOTICE,
  FACTCHECK_NOT_FOUND_LIMITATION,
  FACTCHECK_USED_LIMITATION,
} from '../factcheck/text';
import { isFactcheckFailure, selectReviewEvidence, type FactcheckLayer, type FactcheckStatus } from '../factcheck/layer';
import { annotateAnswer, answerMode, decisivePage, pageAgeNote } from '../render/answer';
import { defaultOfficialHosts, type OfficialHostList } from './officialHosts';
import {
  applyPagePrecedence,
  type PagePrecedence,
  buildOfficialDocument,
  describePage,
  firstOfficialUrl,
  sameUrl,
  selectPagePassages,
  type OfficialPageDocument,
  type PageDescription,
} from './officialPage';

export { buildShortAnswer };

export const MAX_CLAIMS = 5;
export const MAX_PASSAGES_PER_CLAIM = 8;
/** Dodatkowe (nowe) fragmenty z przebiegu "przeciw", oceniane razem z fragmentami "za". */
export const MAX_COUNTER_PASSAGES = 4;
/** Wyników na jedno zapytanie (pula przed wyborem kandydatów). */
export const SEARCH_LIMIT = 20;
/** Pula "za" po scaleniu zapytań i pula nowych fragmentów "przeciw". */
export const FOR_POOL = 20;
export const COUNTER_POOL = 10;
/** Kandydaci do oceny po wyborze przez model porządkujący (najwyżej / najmniej, dopełnienie z wyszukiwania). */
export const MAX_ASSESS = 10;
export const MIN_ASSESS = 6;
/** Najwięcej fragmentów w jednym wywołaniu oceny (porcje oceniane równolegle). */
export const ASSESS_CHUNK = 6;
/** Limit czasu na jedno zgłoszenie; po nim stan techniczny, nigdy werdykt. */
export const DEFAULT_DEADLINE_MS = 22_000;
/** Słowa dodawane do zapytania "przeciw", gdy model nie podał `counterTerms`. */
/** Zad. 29: limit czasu zgłoszenia przy włączonej drugiej warstwie (całość poniżej 25 s). */
export const LIVE_DEADLINE_MS = 24_000;
/** Czas zostawiany po drugiej warstwie na reguły, zdania i zapis. */
export const LIVE_RESERVE_MS = 1_500;
/** Poniżej tego budżetu druga warstwa nie startuje (uczciwe "nie zdążyłem"). */
export const LIVE_MIN_BUDGET_MS = 3_000;
/** Okno ponownego użycia rekordu przy włączonej drugiej warstwie (6 h): potem nowe sprawdzenie, nowy adres. */
export const DEFAULT_LIVE_CACHE_WINDOW_MS = 6 * 60 * 60 * 1000;
/** Rekord z nieudanym pobraniem strony z adresu w tekście nie jest używany ponownie po tym czasie (nowa próba). */
export const EMBEDDED_RETRY_WINDOW_MS = 15 * 60 * 1000;
export const DEFAULT_COUNTER_MARKERS = ['nieprawda', 'zaprzecza', 'dementuje', 'sprostowanie', 'nieprawdziwe'];

export type PrepareFn = (i: VerifyInput) => PreparedInput | NeedsClarification;

export interface EngineOptions {
  /** Próg archiwalności w miesiącach (domyślnie 24). */
  archivalMonths?: number;
  /**
   * Ścieżka pliku wyników zestawu testowego (profil błędów). Brak = bez profilu. Profil jest użyty tylko,
   * gdy pochodzi z zestawu kontrolnego dla tego samego modelu i wersji silnika (`verifiedErrorProfile`).
   */
  errorProfilePath?: string;
  /** Gotowa tabela profilu błędów (pierwszeństwo przed ścieżką; testy). */
  errorProfile?: ErrorProfileTable | null;
  /**
   * Śledzenie etapów (diagnostyka ewaluacji: src/eval/diagnose.ts). Wołane synchronicznie; wyjątek
   * z callbacku jest ignorowany i nie zmienia wyniku. Produkcja go nie ustawia.
   */
  trace?: (event: EngineTraceEvent) => void;
  /** Limit czasu na zgłoszenie w ms (domyślnie DEFAULT_DEADLINE_MS); po nim stan `awaria_techniczna`. */
  deadlineMs?: number;
  /** Przerwa przed ponowieniem po błędzie przejściowym modelu (domyślnie RETRY_DELAY_MS; testy). */
  retryDelayMs?: number;
  /**
   * Zad. 29: okno ponownego użycia rekordu przy włączonej drugiej warstwie (domyślnie 6 h). Numer okna
   * wchodzi do klucza, więc zapisany rekord jest trwały (ten sam adres = to samo), a po oknie powstaje nowy.
   */
  liveCacheWindowMs?: number;
  /**
   * Czas życia rekordu, którego dowody zawierają wpis z indeksu Google Fact Check Tools (ms). Brak = jak
   * inne rekordy. 0 = taki rekord nie jest zapisywany. Produkcja: FACTCHECK_RECORD_TTL_HOURS (domyślnie 24).
   */
  indexRecordTtlMs?: number;
}

/** Zdarzenie śledzenia etapów potoku (tylko identyfikatory i stanowiska; bez metadanych źródeł). */
export type EngineTraceEvent =
  | { type: 'search'; claimId: string; role: 'za' | 'przeciw'; query: string; passageIds: string[]; documentIds: string[] }
  | { type: 'candidates'; claimId: string; passageIds: string[]; documentIds: string[] }
  | { type: 'rank'; claimId: string; pool: number; chosen: number }
  | { type: 'assess'; claimId: string; items: { passageId: string; documentId: string; stance: string }[] }
  | {
      type: 'gate';
      claimId: string;
      before: { passageId: string; documentId: string; stance: string }[];
      after: { passageId: string; documentId: string; stance: string }[];
    }
  | { type: 'verdict'; claimId: string; claimText: string; kind: string; verdict: string; abstain?: string };

export interface EngineExtraDeps {
  prepare?: PrepareFn;
  options?: EngineOptions;
  /** Pobieranie stron dla wejścia URL. Brak = URL kończy się stanem brak_mozliwosci_sprawdzenia. */
  fetchPage?: PageFetcher;
  /** Dopasowanie do bazy incydentów (tylko notices). */
  incidents?: IncidentMatcher | null;
  /** Składanie zdań (src/render). Brak = szablony silnika. */
  renderer?: EngineRenderer;
  /**
   * Bramka wsparcia (drugie, niezależne sprawdzenie cytatów rozstrzygających). Brak = dostawca modelu,
   * jeśli sam ją implementuje (`checkSupport`); `null` = wyłączona.
   */
  supportGate?: SupportGate | null;
  /**
   * Druga kontrola cytatów innym modelem (zad. 45, src/engine/secondCheck.ts): po dowodach, przed regułami.
   * Brak albo `null` = wyłączona. Model musi być inny niż model oceny (inaczej krok jest pomijany).
   */
  secondCheck?: SecondCheck | null;
  /**
   * Wybór kandydatów do oceny (tanie wywołanie modelu nad szerszą pulą). Brak = dostawca modelu,
   * jeśli sam go implementuje (`rankPassages`); `null` = kolejność z wyszukiwania.
   */
  ranker?: PassageRanker | null;
  /**
   * Druga warstwa źródeł (zad. 29, src/live): szukanie na żywo na jawnej liście serwisów, tylko gdy korpus
   * nie dał rozstrzygającego dowodu dla twierdzenia. Brak lub `null` = wyłączona (jak dotąd).
   */
  live?: LiveLayer | null;
  /**
   * Indeks weryfikacji redakcji (src/factcheck, Google Fact Check Tools): równolegle z wyszukiwaniem
   * w zbiorze urzędowym, dla każdego twierdzenia faktograficznego. Brak lub `null` = wyłączony.
   */
  factcheck?: FactcheckLayer | null;
  /**
   * Jawna lista hostów urzędowych (zad. 43, data/official-hosts.json): strona z takiego adresu staje się
   * tymczasowym dokumentem dowodowym ("potwierdzone" z dosłownym cytatem). Brak = lista domyślna z pliku
   * (gdy go nie ma, ścieżka wyłączona); `null` = wyłączona jawnie.
   */
  officialHosts?: OfficialHostList | null;
}

export type EngineDeps = ContractEngineDeps & EngineExtraDeps;
export type CoreEngineDeps = ContractEngineDeps & EngineExtraDeps & { prepare: PrepareFn };

interface UsageAcc {
  llmCalls: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

function addUsage(acc: UsageAcc, u: LlmUsage | undefined): void {
  acc.llmCalls++;
  if (!u) return;
  acc.inputTokens += Math.max(0, u.inputTokens || 0);
  acc.outputTokens += Math.max(0, u.outputTokens || 0);
  acc.estimatedCostUsd += Math.max(0, u.estimatedCostUsd || 0);
}

export function searchQuery(claim: ExtractedClaim): string {
  // Wyszukiwarka wyciąga słowa kluczowe z tekstu i łączy je przez OR.
  return [claim.text, ...(claim.searchTerms ?? [])].join(' ');
}

/**
 * Zapytanie "przeciw" (próba obalenia): najpierw słowa twierdzenia przeciwnego od modelu
 * (inne liczby, daty, miejsca, zaprzeczenie), potem rdzeń tematu, żeby trafić w to samo zdarzenie.
 */
export function counterQuery(claim: ExtractedClaim): string {
  const counter = (claim.counterTerms ?? []).map((t) => t.trim()).filter(Boolean);
  const core = claim.searchTerms?.length ? claim.searchTerms : [claim.text];
  return [...(counter.length ? counter : DEFAULT_COUNTER_MARKERS), ...core].join(' ');
}

function dedupeNotices(list: Notice[]): Notice[] {
  const seen = new Set<string>();
  return list.filter((n) => {
    const k = `${n.type}|${n.passageId ?? ''}|${n.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Stan korpusu na: czas wersji korpusu od wyszukiwarki, a gdy brak lub niepoprawny, czas sprawdzenia. */
function resolveAsOf(searcher: CoreEngineDeps['searcher'], fallback: string): string {
  try {
    const v = searcher.asOf?.();
    if (v && !Number.isNaN(Date.parse(v)) && /(Z|[+-]\d{2}:\d{2})$/.test(v)) return new Date(v).toISOString();
  } catch {
    // brak danych o czasie korpusu: używamy czasu sprawdzenia
  }
  return fallback;
}

function isPrepared(p: PreparedInput | NeedsClarification): p is PreparedInput {
  return !(p as NeedsClarification).needsClarification;
}

/** Dzieli listę na najmniejszą liczbę porcji o rozmiarze najwyżej `size`, możliwie równych. */
export function splitEven<T>(list: readonly T[], size: number): T[][] {
  if (list.length === 0) return [];
  const parts = Math.ceil(list.length / Math.max(1, size));
  const per = Math.ceil(list.length / parts);
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += per) out.push(list.slice(i, i + per));
  return out;
}

/** Przekroczenie limitu czasu zgłoszenia (wewnętrzne; kończy się stanem technicznym). */
export class DeadlineExceeded extends Error {
  constructor() {
    super('deadline');
    this.name = 'DeadlineExceeded';
  }
}

interface Deadline {
  /** Rzuca DeadlineExceeded po przekroczeniu limitu (między etapami potoku). */
  check(): void;
  /** Ile ms zostało do limitu. */
  remaining(): number;
  /** Rozstrzyga się stanem technicznym, gdy limit minie. */
  expired: Promise<VerifyOutcome>;
  clear(): void;
}

function createDeadline(ms: number): Deadline {
  const at = Date.now() + ms;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<VerifyOutcome>((resolve) => {
    timer = setTimeout(() => resolve(stateOutcome('awaria_techniczna', MESSAGES.tooSlow, 'deadline')), ms);
    (timer as { unref?: () => void }).unref?.();
  });
  return {
    check() {
      if (Date.now() >= at) throw new DeadlineExceeded();
    },
    remaining() {
      return at - Date.now();
    },
    expired,
    clear() {
      if (timer) clearTimeout(timer);
    },
  };
}

function uniqueById(list: readonly Passage[]): Passage[] {
  const seen = new Set<string>();
  return list.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

const DECISIVE = new Set(['potwierdza', 'obala', 'rozbieznosc_kontekstu']);

export interface SupportGateStats {
  /** Ile cytatów rozstrzygających sprawdzono. */
  checked: number;
  /** Zostały z relacją taką jak w ocenie. */
  kept: number;
  /** Bramka ustaliła inną relację niż ocena (zad. 35: taki dowód odpada, liczony też w `dropped`). */
  changed: number;
  /** Odpadły: cytat sam nie rozstrzyga twierdzenia. */
  dropped: number;
  /** Ponowione z poprzedzającym zdaniem źródła (podmiot zdanie wcześniej). */
  retried: number;
  /** Z tego uratowane (cytat poszerzony). */
  rescued: number;
}

export type RetryFn = <T>(call: () => Promise<T>) => Promise<T>;

/** Przerwa przed jedynym ponowieniem po błędzie przejściowym (limit zapytań, błąd 5xx dostawcy). */
export const RETRY_DELAY_MS = 700;
/** Ponawiamy tylko, gdy po przerwie zostaje co najmniej tyle czasu do limitu zgłoszenia. */
export const RETRY_MIN_REMAINING_MS = 6_000;

/**
 * Jedno ponowienie wywołania modelu po błędzie przejściowym (`retryable`: 429, 5xx, zerwane połączenie),
 * gdy zostało dość czasu. Przekroczenie czasu odpowiedzi i błędy trwałe (klucz, schemat) nie są ponawiane.
 * Zad. 35: dwa stany techniczne w końcowym przebiegu to limit zapytań przy równoległych wywołaniach.
 */
export function makeRetry(remaining: () => number, delayMs = RETRY_DELAY_MS): RetryFn {
  return async <T>(call: () => Promise<T>): Promise<T> => {
    try {
      return await call();
    } catch (e) {
      const transient = isLlmError(e) && e.retryable === true && e.code !== 'timeout';
      if (!transient || remaining() < delayMs + RETRY_MIN_REMAINING_MS) throw e;
      await new Promise((r) => setTimeout(r, delayMs));
      return call();
    }
  };
}

/** Każdy cytat osobnym wywołaniem bramki (cytat oceniany sam w sobie), wywołania równolegle. */
async function checkEach(
  gate: SupportGate,
  claimText: string,
  quotes: readonly string[],
  onUsage: (u: LlmUsage | undefined) => void,
  retry: RetryFn,
): Promise<ReturnType<typeof normalizeVerdicts>> {
  return Promise.all(
    quotes.map(async (q) => {
      let r: Awaited<ReturnType<SupportGate['checkSupport']>>;
      try {
        r = await retry(() => gate.checkSupport({ claim: claimText, quotes: [q] }));
      } catch (e) {
        // Bramka odpowiedziała, ale niezgodnie ze schematem (także po ponowieniu): cytat nie jest
        // potwierdzony, więc dowód odpada (ostrożnie). Inne błędy (klucz, sieć, limit) idą dalej: stan techniczny.
        if (isLlmError(e) && e.code === 'invalid_output') return normalizeVerdicts(undefined, 1)[0]!;
        throw e;
      }
      onUsage(r.usage);
      return normalizeVerdicts(r, 1)[0]!;
    }),
  );
}

/**
 * Bramka wsparcia: każdy cytat rozstrzygający (potwierdza, obala, rozbieżność) idzie do bramki SAM,
 * tylko z twierdzeniem (osobne wywołania, równolegle). Cytat, który sam nie rozstrzyga, dostaje jedną
 * szansę z poprzedzającym zdaniem tego samego fragmentu (ciągły wycinek źródła, sprawdzany równolegle
 * z samym cytatem); potem odpada.
 * Dowód zostaje tylko przy zgodzie: bramka musi dać dokładnie tę relację co ocena (zad. 35; wcześniej
 * wystarczał ten sam kierunek, co przepuszczało słabe dowody "rozbieżności", najczęściej odrzucane przez
 * sędziego cytowań). Przy niezgodzie dowód odpada.
 * Dowody `kontekst` przechodzą bez zmian (nie wpływają na werdykt rozstrzygający).
 */
export async function applySupportGate(
  gate: SupportGate,
  claimText: string,
  accepted: AcceptedEvidence[],
  onUsage: (u: LlmUsage | undefined) => void,
  retry: RetryFn = (f) => f(),
): Promise<{ accepted: AcceptedEvidence[]; stats: SupportGateStats }> {
  const stats: SupportGateStats = { checked: 0, kept: 0, changed: 0, dropped: 0, retried: 0, rescued: 0 };
  const items = accepted.filter((a) => DECISIVE.has(a.stance));
  if (items.length === 0) return { accepted, stats };
  stats.checked = items.length;
  // Wariant z poprzedzającym zdaniem sprawdzamy od razu, równolegle (bez drugiej rundy czekania);
  // używamy go tylko, gdy sam cytat nie rozstrzyga.
  const extended = items.map((a) => {
    const ext = withPreviousSentence(a.passage.text, a.quote);
    return ext && !containsUrl(ext) && detectInjectionSignals(ext).length === 0 ? ext : null;
  });
  const extIdx = extended.flatMap((e, i) => (e ? [i] : []));
  const [verdicts, extVerdicts] = await Promise.all([
    checkEach(gate, claimText, items.map((a) => a.quote), onUsage, retry),
    checkEach(gate, claimText, extIdx.map((i) => extended[i]!), onUsage, retry),
  ]);
  const quotes = items.map((a) => a.quote);
  extIdx.forEach((index, j) => {
    if (verdicts[index]!.relation !== 'nie_rozstrzyga') return;
    stats.retried++;
    const v = extVerdicts[j]!;
    if (v.relation === 'nie_rozstrzyga') return;
    verdicts[index] = v;
    quotes[index] = extended[index]!;
    stats.rescued++;
  });

  const out = new Map<AcceptedEvidence, AcceptedEvidence | null>();
  items.forEach((a, i) => {
    const v = verdicts[i]!;
    // Bramka nie omija wymogu liczb: "potwierdza" bez liczby z twierdzenia odpada.
    // Zad. 35: dowód zostaje tylko, gdy dwa niezależne sprawdzenia (ocena z całym fragmentem i bramka
    // z samym cytatem) dają TĘ SAMĄ relację. Każda niezgoda (także "obala" wobec "rozbieżności") to słaby
    // dowód: odpada, a bez innych dowodów system się wstrzymuje (wstrzymanie lepsze niż zgadywanie).
    if (
      v.relation === 'nie_rozstrzyga' ||
      v.relation !== a.stance ||
      (v.relation === 'potwierdza' && !hasKeyNumbers(claimText, quotes[i]!))
    ) {
      out.set(a, null);
      stats.dropped++;
      if (v.relation !== 'nie_rozstrzyga' && v.relation !== a.stance) stats.changed++;
      return;
    }
    const mismatch: MismatchKind | undefined =
      a.stance === 'rozbieznosc_kontekstu' ? (a.mismatch ?? v.mismatch ?? 'warunki') : undefined;
    stats.kept++;
    const { mismatch: _old, ...rest } = a;
    out.set(a, { ...rest, quote: quotes[i]!, ...(mismatch !== undefined ? { mismatch } : {}) });
  });
  const result: AcceptedEvidence[] = [];
  for (const a of accepted) {
    if (!out.has(a)) result.push(a);
    else {
      const r = out.get(a);
      if (r) result.push(r);
    }
  }
  return { accepted: result, stats };
}

/** Nazwa modelu dostawcy (pole `model`, gdy jest; inaczej nazwa dostawcy, np. `mock`). */
export function llmModelName(llm: { name: string }): string {
  const m = (llm as { model?: unknown }).model;
  return typeof m === 'string' && m ? m : llm.name;
}

export function createEngineCore(deps: CoreEngineDeps): ProgressEngine {
  const now = deps.now ?? (() => new Date());
  const store: EngineStore = createStore(deps.db, now, {
    ...(deps.options?.indexRecordTtlMs !== undefined ? { indexRecordTtlMs: deps.options.indexRecordTtlMs } : {}),
    onExpired: (id) => {
      try {
        store.logEvent('record_expired', { recordId: id, detail: { reason: 'wygasl', kind: 'indeks_weryfikacji' } });
      } catch {
        // log niedostępny
      }
    },
  });
  const archivalMonths = deps.options?.archivalMonths ?? DEFAULT_ARCHIVAL_MONTHS;
  const errorTable: ErrorProfileTable | null =
    deps.options?.errorProfile !== undefined
      ? deps.options.errorProfile
      : deps.options?.errorProfilePath
        ? loadVerifiedErrorProfile(deps.options.errorProfilePath, { model: llmModelName(deps.llm), engineVersion: engineFingerprint() })
        : null;
  const { searcher, llm, prepare } = deps;
  const renderer = deps.renderer;
  const traceFn = deps.options?.trace;
  const trace = (e: EngineTraceEvent) => {
    if (!traceFn) return;
    try {
      traceFn(e);
    } catch {
      // diagnostyka nie wpływa na wynik
    }
  };
  const evView = (list: readonly AcceptedEvidence[]) =>
    list.map((a) => ({ passageId: a.passage.id, documentId: a.passage.documentId, stance: a.stance as string }));
  const supportGate: SupportGate | null =
    deps.supportGate !== undefined ? deps.supportGate : isSupportGate(llm) ? llm : null;
  const secondCheck: SecondCheck | null =
    deps.secondCheck && !sameModel(deps.secondCheck.model, llmModelName(llm)) ? deps.secondCheck : null;
  const ranker: PassageRanker | null = deps.ranker !== undefined ? deps.ranker : isPassageRanker(llm) ? llm : null;
  const live: LiveLayer | null = deps.live ?? null;
  const factcheck: FactcheckLayer | null = deps.factcheck ?? null;
  const officialHosts: OfficialHostList | null = deps.officialHosts !== undefined ? deps.officialHosts : defaultOfficialHosts();
  const deadlineMs = deps.options?.deadlineMs ?? (live ? LIVE_DEADLINE_MS : DEFAULT_DEADLINE_MS);
  /** Liczenia w toku po kluczu rekordu (jedno liczenie na tę samą treść naraz, niezależnie od kanału). */
  const inflight = new Map<string, Promise<VerifyOutcome>>();
  const liveWindowMs = Math.max(60_000, deps.options?.liveCacheWindowMs ?? DEFAULT_LIVE_CACHE_WINDOW_MS);

  async function search(query: string, limit: number): Promise<Passage[]> {
    try {
      const found = await searcher.search(query, { limit });
      return Array.isArray(found) ? found : [];
    } catch (e) {
      throw new SearchFailure(e);
    }
  }

  async function run(input: VerifyInput, progress: ProgressEmitter, deadline: Deadline): Promise<VerifyOutcome> {
    const channel = input.channel;
    const retry = makeRetry(() => deadline.remaining(), deps.options?.retryDelayMs);
    const started = now().getTime();
    store.logEvent('verify_start', { channel, detail: { inputKind: input.url !== undefined ? 'url' : 'tekst' } });

    const toState = (outcome: VerifyOutcome, recordId: string | null = null): VerifyOutcome => {
      if (outcome.kind === 'state')
        store.logEvent('state', {
          recordId,
          channel,
          detail: { state: outcome.state, ...(outcome.detail ? { detail: outcome.detail } : {}) },
        });
      return outcome;
    };

    // (1) przygotowanie wejścia
    const prepared = prepare(input);
    if (!isPrepared(prepared)) {
      // Adres lokalny lub wewnętrzny: wejście jasne, ale niedostępne (jak blokada pobierania), nie doprecyzowanie.
      if (isUnavailableInput(prepared)) {
        store.logEvent('url_fetch_failed', { channel, detail: { reason: 'adres_prywatny', stage: 'wejscie' } });
        return toState(stateOutcome('brak_mozliwosci_sprawdzenia', MESSAGES.urlBlocked, 'url:adres_prywatny'));
      }
      return toState(stateOutcome('potrzeba_doprecyzowania', prepared.message));
    }

    let corpusVersion: string;
    let documents: number;
    try {
      corpusVersion = searcher.corpusVersion();
      documents = searcher.stats().documents;
    } catch (e) {
      throw new SearchFailure(e);
    }
    if (!documents) return toState(stateOutcome('brak_mozliwosci_sprawdzenia', MESSAGES.emptyCorpus, 'empty_corpus'));

    // Tekst do analizy: dla URL to treść strony (dane, nigdy dowód ani instrukcja).
    // Pytanie tak/nie lub "podobno ..." analizujemy jako twierdzenie (src/input/question.ts).
    let analysisText = prepared.kind === 'tekst' ? questionToStatement(prepared.maskedInput) : prepared.maskedInput;
    let keyInput = prepared.normalizedInput;
    let pageTruncated = false;
    // Zad. 43: dane pobranej strony (rekord) i, dla strony z listy urzędów, tymczasowy dokument dowodowy.
    let pageDescription: PageDescription | null = null;
    let pageDocumentRaw: OfficialPageDocument | null = null;
    let pageNotice: string | null = null;
    /** Zwraca tekst strony do analizy: dla strony urzędu sama treść główna (zad. 44), gdy ją wyodrębniono. */
    const takePage = (page: Extract<PageFetchResult, { ok: true }>, requested: string): string => {
      pageDescription = describePage(page, requested, officialHosts, now());
      if (pageDescription.official) {
        const main = page.mainText ? { ...page, text: page.mainText } : page;
        pageDocumentRaw = buildOfficialDocument(main, pageDescription);
        return main.text;
      }
      if (pageDescription.leftTheList) pageNotice = PAGE_LEFT_LIST_NOTICE;
      return page.text;
    };
    if (prepared.kind === 'url') {
      if (!deps.fetchPage) {
        store.logEvent('url_not_fetched', { channel, detail: {} });
        return toState(stateOutcome('brak_mozliwosci_sprawdzenia', MESSAGES.urlNotFetched, 'url_not_fetched'));
      }
      const target = prepared.urlInfo?.url ?? prepared.maskedInput;
      let page: Awaited<ReturnType<PageFetcher>>;
      try {
        page = await deps.fetchPage(target);
      } catch {
        page = { ok: false, reason: 'blad_sieci' };
      }
      if (!page.ok) {
        store.logEvent('url_fetch_failed', {
          channel,
          detail: { reason: page.reason, ...(page.status !== undefined ? { status: page.status } : {}) },
        });
        const message =
          page.reason === 'adres_prywatny' || page.reason === 'niedozwolony_port' || page.reason === 'niedozwolony_protokol'
            ? MESSAGES.urlBlocked
            : page.reason === 'zly_typ_tresci'
              ? MESSAGES.urlWrongType
              : page.reason === 'pusta_tresc'
                ? MESSAGES.urlNoContent
                : MESSAGES.urlNotFetched;
        return toState(stateOutcome('brak_mozliwosci_sprawdzenia', message, `url:${page.reason}`));
      }
      const pageText = takePage(page, target);
      store.logEvent('url_fetched', {
        channel,
        detail: {
          redirects: page.redirects,
          truncated: page.truncated,
          contentType: page.contentType,
          official: pageDocumentRaw !== null,
          dated: Boolean(page.publishedAt),
        },
      });
      // Ta sama normalizacja co dla tekstu od obywatela (znaki niewidoczne, NFKC, sterujące).
      analysisText = maskPii(cleanText(pageText)).text;
      pageTruncated = page.truncated;
      // Klucz obejmuje skrót treści: zmiana strony = nowe sprawdzenie, nie stary rekord. Rodzaj strony
      // (urzędowa albo zwykła) też, bo od niego zależy odpowiedź (zad. 43).
      keyInput = `${prepared.normalizedInput}\n#tresc:${sha256Hex(analysisText)}\n#strona:${pageDocumentRaw ? 'urzad' : 'zwykla'}`;
    } else if (deps.fetchPage && officialHosts) {
      // Adres strony urzędu wklejony razem z tekstem (np. pytaniem): strona jest dowodem, nie źródłem twierdzeń.
      const embedded = firstOfficialUrl(prepared.maskedInput, officialHosts);
      if (embedded) {
        let page: Awaited<ReturnType<PageFetcher>>;
        try {
          page = await deps.fetchPage(embedded);
        } catch {
          page = { ok: false, reason: 'blad_sieci' };
        }
        if (page.ok) {
          takePage(page, embedded);
          store.logEvent('url_fetched', {
            channel,
            detail: {
              redirects: page.redirects,
              truncated: page.truncated,
              contentType: page.contentType,
              official: pageDocumentRaw !== null,
              dated: Boolean(page.publishedAt),
              embedded: true,
            },
          });
          keyInput = `${keyInput}\n#strona:${sha256Hex(page.text)}:${pageDocumentRaw ? 'urzad' : 'zwykla'}`;
        } else {
          store.logEvent('url_fetch_failed', { channel, detail: { reason: page.reason, stage: 'osadzony' } });
          pageNotice = PAGE_EMBEDDED_FAILED_NOTICE;
          keyInput = `${keyInput}\n#strona:brak:${Math.floor(started / EMBEDDED_RETRY_WINDOW_MS)}`;
        }
      }
    }
    const pageInfo = (pageDescription as PageDescription | null)?.info;
    const pageDocument = pageDocumentRaw as OfficialPageDocument | null;
    const pageNoticeText = pageNotice as string | null;

    // Zad. 29: przy drugiej warstwie numer okna czasu wchodzi do klucza (świeże wiadomości po oknie).
    if (live) keyInput = `${keyInput}\n#warstwa2:${Math.floor(started / liveWindowMs)}`;
    // Zad. 45: druga kontrola zmienia dowody, więc rekord z nią i bez niej to różne rekordy.
    if (secondCheck) keyInput = `${keyInput}\n#druga_kontrola:${secondCheck.model}`;
    // Indeks weryfikacji: odpowiedź zależy od stanu indeksu, więc okno czasu wchodzi do klucza (jak wyżej).
    if (factcheck) keyInput = `${keyInput}\n#indeks:${Math.floor(started / liveWindowMs)}`;

    // (2) klucz rekordu i cache
    const recordId = computeRecordKey(keyInput, corpusVersion);
    const cached = store.getRecord(recordId);
    if (cached) {
      store.logEvent('cache_hit', { recordId, channel });
      progress.done(recordId, true, cached.createdAt);
      return { kind: 'record', record: cached, cached: true };
    }

    // To samo zgłoszenie w toku (np. WWW i SMS naraz): czekamy na jedno liczenie i zwracamy jego rekord,
    // zamiast liczyć drugi raz niedeterministycznym modelem.
    const pending = inflight.get(recordId);
    if (pending) {
      const shared = await pending;
      if (shared.kind !== 'record') return shared;
      store.logEvent('cache_hit', { recordId, channel, detail: { inflight: true } });
      progress.done(recordId, true, shared.record.createdAt);
      return { kind: 'record', record: shared.record, cached: true };
    }
    const ready: PreparedInput = prepared;
    const computing = compute();
    inflight.set(recordId, computing);
    computing.then(
      () => inflight.delete(recordId),
      () => inflight.delete(recordId),
    );
    return computing;

    async function compute(): Promise<VerifyOutcome> {
    const prepared = ready;
        const usage: UsageAcc = { llmCalls: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };
        const injectionSignals = new Set<string>();
    const notices: Notice[] = [];
    let injectionEvents = 0;
    const isUrl = prepared.kind === 'url';
    if (pageTruncated) notices.push({ type: 'ograniczenie_techniczne', text: PAGE_TRUNCATED_NOTICE });
    if (pageNoticeText) notices.push({ type: 'ograniczenie_techniczne', text: pageNoticeText });
    if (pageDocument && pageInfo) {
      // Strona urzędu starsza niż 180 dni albo bez daty: wyraźna uwaga, treść nadal tylko dane i cytat.
      const age = pageAgeNote(pageInfo.publishedAt, pageInfo.fetchedAt);
      if (age) notices.push({ type: pageInfo.publishedAt ? 'material_archiwalny' : 'status_zrodla', text: age });
      // Akapity strony z poleceniami dla modelu nie są dowodem (także, gdy strona nie była źródłem twierdzeń).
      const pageSignals = new Set(pageDocument.flagged.flatMap((f) => f.signals));
      if (pageSignals.size > 0) {
        for (const sig of pageSignals) injectionSignals.add(`strona:${sig}`);
        notices.push({ type: 'ograniczenie_techniczne', text: PAGE_INJECTION_NOTICE });
        store.logEvent('injection_signal', { recordId, channel, detail: { where: 'strona_urzedu', signals: [...pageSignals], removedSegments: pageDocument.flagged.length } });
        injectionEvents++;
      }
    }

    // (3) podejrzane segmenty wejścia/strony nie trafiają do modelu
    const where = isUrl ? 'strona' : 'wejscie';
    const stripped = stripInjectedSegments(analysisText);
    if (stripped.signals.length) {
      for (const s of stripped.signals) injectionSignals.add(`${where}:${s}`);
      notices.push({ type: 'ograniczenie_techniczne', text: isUrl ? PAGE_INJECTION_NOTICE : INPUT_INJECTION_NOTICE });
      store.logEvent('injection_signal', {
        recordId,
        channel,
        detail: { where, signals: stripped.signals, removedSegments: stripped.removed },
      });
      injectionEvents++;
    }
    // Same polecenia, bez informacji do sprawdzenia: prosty komunikat stanu, model nie jest wołany.
    const nothingToCheck = () =>
      injectionSignals.size > 0
        ? stateOutcome('potrzeba_doprecyzowania', MESSAGES.injectionOnly, 'injection_only')
        : stateOutcome('potrzeba_doprecyzowania', MESSAGES.clarification, 'no_checkable_claims');
    if (!stripped.text.trim()) return toState(nothingToCheck(), recordId);

    const extracted = await retry(() => llm.extractClaims({ text: stripped.text }));
    deadline.check();
    addUsage(usage, extracted.usage);
    const rawClaims = Array.isArray(extracted.claims) ? extracted.claims : [];
    const claims: ExtractedClaim[] = [];
    for (const c of rawClaims) {
      const parsed = ExtractedClaimSchema.safeParse(c);
      if (!parsed.success) throw new LlmError('invalid_output', 'claim schema');
      // Do oceny trafia oczyszczone twierdzenie, nigdy surowe wejście ani polecenie.
      const screened = screenClaim(parsed.data, stripped.text);
      if (!screened.claim) {
        store.logEvent('claim_rejected', {
          recordId,
          channel,
          detail: { claimId: parsed.data.id, reason: screened.reason ?? 'nieznany', signals: screened.signals },
        });
        if (screened.signals.length) {
          for (const sig of screened.signals) injectionSignals.add(`twierdzenie:${parsed.data.id}:${sig}`);
          notices.push({ type: 'ograniczenie_techniczne', text: isUrl ? PAGE_INJECTION_NOTICE : INPUT_INJECTION_NOTICE });
          store.logEvent('injection_signal', {
            recordId,
            channel,
            detail: { where: 'twierdzenie', claimId: parsed.data.id, signals: screened.signals },
          });
          injectionEvents++;
        }
        continue;
      }
      claims.push(screened.claim);
    }
    // Twierdzenie niejasne nie jest werdyktem: bez żadnego sprawdzalnego twierdzenia -> stan.
    const checkable = claims.filter((c) => c.kind !== 'niejasna').slice(0, MAX_CLAIMS);
    if (checkable.length === 0) return toState(nothingToCheck(), recordId);
    progress.claimsRead(checkable.length);

    const createdAt = new Date(started).toISOString();
    let asOf = resolveAsOf(searcher, createdAt);
    const abstainCodes = new Map<string, string>();
    const nowDate = now();
    const scope = scopeLimitation(corpusVersion, documents);
    const baseLimitations = pageDocument ? [scope, PAGE_OFFICIAL_LIMITATION] : isUrl ? [scope, PAGE_IS_DATA_LIMITATION] : [scope];

    /** Ostrzeżenia i sygnały jednego twierdzenia; scalane po kolei twierdzeń (wynik deterministyczny). */
    interface ClaimSide {
      notices: Notice[];
      signals: string[];
      injectionEvents: number;
    }

    type AssessFn = (groups: Passage[][], sentList: Passage[]) => Promise<{ accepted: AcceptedEvidence[]; rejected: number }>;
    interface FactcheckOutcome {
      accepted: AcceptedEvidence[];
      rejected: number;
      status: FactcheckStatus;
      flagged: number;
    }
    /** Status indeksu weryfikacji dla twierdzenia (do decyzji o stanie technicznym). */
    const fcStatuses = new Map<string, FactcheckStatus>();
    interface LiveOutcome {
      accepted: AcceptedEvidence[];
      rejected: number;
      flagged: number;
      /** Czy druga warstwa w ogóle przeszukała listę (dla ograniczenia "nic nie znalazłem"). */
      searched: boolean;
    }

    /**
     * Druga warstwa dla jednego twierdzenia (zad. 29): wyszukanie i pobranie (src/live), potem ten sam
     * przebieg oceny i bramek co dla korpusu. Własny limit czasu; po nim uczciwe "nic nie dodałem".
     * Błąd wyszukiwania, sieci albo oceny daje ostrzeżenie, nigdy werdykt z domysłu.
     */
    async function runLive(claim: ExtractedClaim, side: ClaimSide, assess: AssessFn): Promise<LiveOutcome> {
      const none: LiveOutcome = { accepted: [], rejected: 0, flagged: 0, searched: false };
      const layer = live!;
      const budget = Math.min(layer.budgetMs, deadline.remaining() - LIVE_RESERVE_MS);
      if (budget < LIVE_MIN_BUDGET_MS) {
        store.logEvent('live_search', { recordId, channel, detail: { claimId: claim.id, status: 'brak_czasu', budgetMs: Math.max(0, budget) } });
        side.notices.push({ type: 'ograniczenie_techniczne', text: LIVE_TIMEOUT_NOTICE });
        return none;
      }
      const t0 = Date.now();
      const found = await layer.find(claim, { budgetMs: budget, now: nowDate });
      if (found.usage) addUsage(usage, found.usage);
      usage.estimatedCostUsd += Math.max(0, found.searchFeeUsd || 0);
      for (const f of found.flagged) {
        for (const sig of f.signals) side.signals.push(`fragment:${f.passageId}:${sig}`);
        side.notices.push({ type: 'ograniczenie_techniczne', text: LIVE_INJECTION_NOTICE, passageId: f.passageId });
        store.logEvent('injection_signal', {
          recordId,
          channel,
          detail: { where: 'fragment_warstwa2', passageId: f.passageId, claimId: claim.id, signals: f.signals },
        });
        side.injectionEvents++;
      }
      // Koszt wyszukiwania osobno (opłata za wyszukiwania i tokeny), bez treści zgłoszenia i stron.
      store.logEvent('live_search', {
        recordId,
        channel,
        detail: {
          claimId: claim.id,
          status: found.status,
          hits: found.hits,
          rejectedDomains: [...new Set(found.rejectedDomains)].slice(0, 10),
          robotsBlocked: found.robotsBlocked,
          fetchFailed: found.fetchFailed,
          pages: found.pages,
          passages: found.passages.length,
          flagged: found.flagged.length,
          searches: found.searches,
          searchFeeUsd: found.searchFeeUsd,
          tokenCostUsd: found.usage?.estimatedCostUsd ?? 0,
          ms: found.ms,
          ...(found.errorCode ? { code: found.errorCode } : {}),
        },
      });
      const out: LiveOutcome = { ...none, flagged: found.flagged.length, searched: true };
      if (found.status === 'blad_wyszukiwania') {
        side.notices.push({ type: 'ograniczenie_techniczne', text: LIVE_FAILED_NOTICE });
        return { ...out, searched: false };
      }
      if (found.status === 'przekroczony_czas') {
        side.notices.push({ type: 'ograniczenie_techniczne', text: LIVE_TIMEOUT_NOTICE });
        return { ...out, searched: false };
      }
      if (found.passages.length === 0) return out;
      const left = budget - (Date.now() - t0);
      if (left < 1_000) {
        side.notices.push({ type: 'ograniczenie_techniczne', text: LIVE_TIMEOUT_NOTICE });
        return { ...out, searched: false };
      }
      const assessing = assess(splitEven(found.passages, ASSESS_CHUNK), found.passages);
      assessing.catch(() => {});
      let timer: ReturnType<typeof setTimeout> | undefined;
      const late = new Promise<'late'>((resolve) => {
        timer = setTimeout(() => resolve('late'), left);
        (timer as { unref?: () => void }).unref?.();
      });
      try {
        const r = await Promise.race([assessing, late]);
        if (r === 'late') {
          store.logEvent('live_search', { recordId, channel, detail: { claimId: claim.id, status: 'przekroczony_czas', stage: 'ocena' } });
          side.notices.push({ type: 'ograniczenie_techniczne', text: LIVE_TIMEOUT_NOTICE });
          return { ...out, searched: false };
        }
        // Reguły doboru dowodów drugiej warstwy (src/live, np. tylko "potwierdza", zgodność zdarzenia).
        const sel = layer.select ? layer.select(claim, r.accepted, nowDate) : { accepted: r.accepted };
        for (const n of sel.notices ?? []) side.notices.push(n);
        if (sel.dropped) store.logEvent('live_search', { recordId, channel, detail: { claimId: claim.id, status: 'odrzucone_regulami', dropped: sel.dropped, ...(sel.reasons ?? {}) } });
        return { ...out, accepted: sel.accepted, rejected: r.rejected + (sel.dropped ?? 0) };
      } catch (e) {
        if (e instanceof DeadlineExceeded) throw e;
        store.logEvent('live_search', { recordId, channel, detail: { claimId: claim.id, status: 'blad_oceny', code: technicalDetail(e) } });
        side.notices.push({ type: 'ograniczenie_techniczne', text: LIVE_FAILED_NOTICE });
        return { ...out, searched: false };
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    async function checkClaim(claim: ExtractedClaim, claimIndex: number, side: ClaimSide): Promise<ClaimResult> {
      if (claim.kind === 'opinia' || claim.kind === 'prognoza') {
        const decision = decideVerdict(claim.kind, []);
        const strength = computeStrength(decision);
        trace({ type: 'verdict', claimId: claim.id, claimText: claim.text, kind: claim.kind, verdict: decision.verdict });
        return {
          claim,
          verdict: decision.verdict,
          strength,
          explanation: explainClaim({ verdict: decision.verdict, strength, confirmSources: 0, refuteSources: 0, contextSources: 0 }),
          explanationSource: 'szablon',
          evidence: [],
          limitations: [...baseLimitations],
          refutation: noRefutation(),
        };
      }

      // (5) ocena stanowisk (model, porcje równolegle) i (6) bramka cytatów (kod); ten sam przebieg
      // dla fragmentów korpusu i dla fragmentów drugiej warstwy (zad. 29).
      const modelFlagged = new Set<string>();
      /**
       * Ocena jednej porcji. Zad. 35: gdy odpowiedź jest niezgodna ze schematem także po ponowieniu
       * (np. brak oceny części fragmentów), porcję dzielimy na pół i oceniamy połówki osobno. Każdy fragment
       * nadal dostaje ocenę; dopiero błąd przy pojedynczym fragmencie daje stan techniczny.
       */
      async function assessChunk(g: Passage[]): Promise<Awaited<ReturnType<typeof llm.assessPassages>>> {
        try {
          return await retry(() => llm.assessPassages({ claim, passages: g.map((p) => ({ id: p.id, text: p.text })) }));
        } catch (e) {
          if (!(isLlmError(e) && e.code === 'invalid_output' && g.length > 1)) throw e;
          deadline.check();
          const mid = Math.ceil(g.length / 2);
          const [a, b] = await Promise.all([assessChunk(g.slice(0, mid)), assessChunk(g.slice(mid))]);
          // Połówka A liczona tu, połówka B przez wołającego (dwa wywołania).
          addUsage(usage, a.usage);
          return { assessments: [...(a.assessments ?? []), ...(b.assessments ?? [])], usage: b.usage };
        }
      }
      /**
       * Indeks weryfikacji dla twierdzenia: wyszukanie (własny limit czasu), ten sam krok oceny i bramka
       * wsparcia co dla zbioru urzędowego, potem reguły doboru (zgodność tezy i zdarzenia, tabela ocen).
       * Awaria, limit, brak klucza, przekroczenie czasu: status techniczny, nigdy werdykt.
       */
      async function runFactcheck(c: ExtractedClaim, sd: ClaimSide): Promise<FactcheckOutcome> {
        const layer = factcheck!;
        const budget = Math.min(layer.budgetMs, deadline.remaining() - LIVE_RESERVE_MS);
        if (budget < 1_000) {
          store.logEvent('factcheck_search', { recordId, channel, detail: { claimId: c.id, status: 'przekroczony_czas', stage: 'start' } });
          progress.indexFailed(claimIndex, 'przekroczony_czas');
          return { accepted: [], rejected: 0, status: 'przekroczony_czas', flagged: 0 };
        }
        // Wspólny limit zapytań na zgłoszenie, dzielony równo między twierdzenia faktograficzne (co najmniej 1).
        const factual = checkable.filter((x) => x.kind === 'faktograficzna').length || 1;
        const perClaim = Math.max(1, Math.floor(layer.maxQueriesPerRequest / factual));
        const found = await layer.find(c, { budgetMs: budget, now: nowDate, maxQueries: perClaim });
        if (isFactcheckFailure(found.status)) progress.indexFailed(claimIndex, found.status);
        else progress.indexQueried(claimIndex, found.queries, found.passages.length);
        for (const f of found.flagged) {
          for (const sig of f.signals) sd.signals.push(`fragment:${f.passageId}:${sig}`);
          sd.notices.push({ type: 'ograniczenie_techniczne', text: FACTCHECK_INJECTION_NOTICE, passageId: f.passageId });
          store.logEvent('injection_signal', { recordId, channel, detail: { where: 'indeks_weryfikacji', passageId: f.passageId, claimId: c.id, signals: f.signals } });
          sd.injectionEvents++;
        }
        // Bez treści zgłoszenia i bez klucza: tylko liczby i kody.
        store.logEvent('factcheck_search', {
          recordId,
          channel,
          detail: {
            claimId: c.id,
            status: found.status,
            hits: found.hits,
            otherPublishers: found.otherPublishers,
            passages: found.passages.length,
            flagged: found.flagged.length,
            queries: found.queries,
            ms: found.ms,
            ...(found.httpStatus ? { httpStatus: found.httpStatus } : {}),
          },
        });
        const base: FactcheckOutcome = { accepted: [], rejected: 0, status: found.status, flagged: found.flagged.length };
        if (found.passages.length === 0) return base;
        try {
          const r = await assessAndGate([found.passages], found.passages);
          const sel = layer.select(c, r.accepted, nowDate);
          for (const n of sel.notices ?? []) sd.notices.push(n);
          if (sel.dropped || sel.reasons)
            store.logEvent('factcheck_search', { recordId, channel, detail: { claimId: c.id, status: 'dobor', dropped: sel.dropped ?? 0, ...(sel.reasons ?? {}) } });
          return { ...base, accepted: sel.accepted, rejected: r.rejected + (sel.dropped ?? 0) };
        } catch (e) {
          if (e instanceof DeadlineExceeded) throw e;
          store.logEvent('factcheck_search', { recordId, channel, detail: { claimId: c.id, status: 'blad_oceny', code: technicalDetail(e) } });
          return { ...base, status: 'blad_sieci' };
        }
      }
      async function assessAndGate(groups: Passage[][], sentList: Passage[]): Promise<{ accepted: AcceptedEvidence[]; rejected: number }> {
        const sentIdSet = new Set(sentList.map((p) => p.id));
        const assessedAll = await Promise.all(
          groups.map((g) => assessChunk(g)),
        );
        deadline.check();
        const assessments = assessedAll.flatMap((a) => {
          addUsage(usage, a.usage);
          return Array.isArray(a.assessments) ? a.assessments : [];
        });
        trace({
          type: 'assess',
          claimId: claim.id,
          items: assessments.map((a) => ({ passageId: a.passageId, documentId: sentList.find((p) => p.id === a.passageId)?.documentId ?? '', stance: a.stance })),
        });
        for (const a of assessments)
          if (a?.injectionSuspected === true && sentIdSet.has(a.passageId) && !modelFlagged.has(a.passageId)) {
            modelFlagged.add(a.passageId);
            side.signals.push(`fragment:${a.passageId}:zgloszone_przez_model`);
            side.notices.push({ type: 'ograniczenie_techniczne', text: MODEL_INJECTION_NOTICE, passageId: a.passageId });
            store.logEvent('injection_signal', {
              recordId,
              channel,
              detail: { where: 'fragment', passageId: a.passageId, claimId: claim.id, signals: ['zgloszone_przez_model'] },
            });
            side.injectionEvents++;
          }
        const gate = validateCitations(assessments, sentList, { flaggedPassageIds: modelFlagged, claimText: claim.text });
        let acc = gate.accepted;
        let rejected = gate.rejected.length;
        // Teza z oceny redakcji nie jest dowodem na twierdzenie, tylko kandydatem na „tę samą tezę”:
        // bramka wsparcia („czy cytat sam rozstrzyga”) nie dotyczy tezy uznanej za tę samą. Tożsamość tezy ustala ocena relacji
        // i reguły doboru w kodzie (nazwy, data, tabela ocen). Uzasadnienie redakcji przechodzi przez bramkę.
        // Decyzja prowadzącego (22.11): bez bramki tylko „ta sama teza” (potwierdza); teza odwrotna (obala) przez bramkę.
        const isThesis = (a: AcceptedEvidence) =>
          !!a.passage.meta.review && a.passage.meta.review.role !== 'uzasadnienie' && a.stance === 'potwierdza';
        const theses = acc.filter(isThesis);
        if (supportGate && acc.length > theses.length) {
          const gated = acc.filter((a) => !isThesis(a));
          const checked = await applySupportGate(supportGate, claim.text, gated, (u) => addUsage(usage, u), retry);
          deadline.check();
          trace({ type: 'gate', claimId: claim.id, before: evView(gated), after: evView(checked.accepted) });
          acc = [...checked.accepted, ...theses];
          rejected += checked.stats.dropped;
          if (checked.stats.checked > 0)
            store.logEvent('support_gate', { recordId, channel, detail: { claimId: claim.id, gate: supportGate.name, ...checked.stats } });
        }
        for (const a of acc) progress.passageAssessed(claimIndex, a.passage.meta, a.stance);
        const unknown = gate.rejected.filter((r) => r.reason === 'nieznany_fragment').length;
        if (unknown > 0) store.logEvent('llm_unknown_passage', { recordId, channel, detail: { claimId: claim.id, count: unknown } });
        if (rejected > 0) {
          const byReason: Record<string, number> = {};
          for (const r of gate.rejected) byReason[r.reason] = (byReason[r.reason] ?? 0) + 1;
          store.logEvent('citation_rejected', {
            recordId,
            channel,
            detail: { claimId: claim.id, count: rejected, ...byReason },
          });
        }
        return { accepted: acc, rejected };
      }
      // (3a) strona urzędu wklejona przez użytkownika: fragmenty najbliższe twierdzeniu przechodzą ten sam krok
      // oceny i te same bramki co fragmenty zbioru (cytat dosłowny, bramka wsparcia); start równolegle z wyszukiwaniem.
      const pageRun: Promise<{ accepted: AcceptedEvidence[]; rejected: number }> | null = pageDocument
        ? (async () => {
            const chosen = selectPagePassages(pageDocument, claim);
            return chosen.length > 0 ? assessAndGate([chosen], chosen) : { accepted: [], rejected: 0 };
          })()
        : null;
      pageRun?.catch(() => {});

      // (3b) indeks weryfikacji redakcji: startuje od razu, równolegle z wyszukiwaniem w zbiorze urzędowym.
      const fcRun: Promise<FactcheckOutcome> | null = factcheck ? runFactcheck(claim, side) : null;
      fcRun?.catch(() => {});

      // (4) wyszukiwanie "za" (kilka zapytań, scalenie rang) i "przeciw" (kod), równolegle
      const fQueries = forQueries(claim);
      const cQuery = counterQuery(claim);
      const [forLists, counterRaw] = await Promise.all([
        Promise.all(fQueries.map((q) => search(q, SEARCH_LIMIT))),
        search(cQuery, SEARCH_LIMIT),
      ]);
      deadline.check();
      const forPool = fuseRankings(forLists.map(uniqueById)).slice(0, FOR_POOL);
      const counterFound = uniqueById(counterRaw);
      const counterIds = new Set(counterFound.map((p) => p.id));
      const forIds = new Set(forPool.map((p) => p.id));
      const counterPool = counterFound.filter((p) => !forIds.has(p.id)).slice(0, COUNTER_POOL);
      trace({ type: 'search', claimId: claim.id, role: 'za', query: fQueries[0]!, passageIds: forPool.map((p) => p.id), documentIds: forPool.map((p) => p.documentId) });
      trace({ type: 'search', claimId: claim.id, role: 'przeciw', query: cQuery, passageIds: counterFound.map((p) => p.id), documentIds: counterFound.map((p) => p.documentId) });

      // Injection: fragmenty z sygnałem nie trafiają do żadnego modelu i nie mogą być dowodem.
      const flagged = new Set<string>();
      for (const p of [...forPool, ...counterPool]) {
        const sig = detectInjectionSignals(p.text);
        if (sig.length) {
          flagged.add(p.id);
          for (const s of sig) side.signals.push(`fragment:${p.id}:${s}`);
          side.notices.push({ type: 'ograniczenie_techniczne', text: INJECTION_NOTICE, passageId: p.id });
          store.logEvent('injection_signal', {
            recordId,
            channel,
            detail: { where: 'fragment', passageId: p.id, claimId: claim.id, signals: sig },
          });
          side.injectionEvents++;
        }
      }
      const forEligible = forPool.filter((p) => !flagged.has(p.id));
      const counterEligible = counterPool.filter((p) => !flagged.has(p.id));

      // Wybór kandydatów: bez modelu porządkującego (albo przy jego błędzie) kolejność z wyszukiwania.
      let forSel = forEligible.slice(0, MAX_PASSAGES_PER_CLAIM);
      let counterSel = counterEligible.slice(0, MAX_COUNTER_PASSAGES);
      const union = [...forEligible, ...counterEligible];
      const rankFlagged = new Set<string>();
      if (ranker && union.length > MAX_ASSESS) {
        try {
          const ranked = await retry(() => ranker.rankPassages({
            claim: claim.text,
            passages: union.map((p) => ({ id: p.id, text: p.text })),
            limit: MAX_ASSESS,
          }));
          addUsage(usage, ranked.usage);
          // Fragment z poleceniami wskazany przez model porządkujący: jak zgłoszony przez model oceny.
          const unionIds = new Set(union.map((p) => p.id));
          for (const id of Array.isArray(ranked.injectionSuspected) ? ranked.injectionSuspected : [])
            if (unionIds.has(id) && !rankFlagged.has(id)) {
              rankFlagged.add(id);
              side.signals.push(`fragment:${id}:zgloszone_przez_model`);
              side.notices.push({ type: 'ograniczenie_techniczne', text: MODEL_INJECTION_NOTICE, passageId: id });
              store.logEvent('injection_signal', {
                recordId,
                channel,
                detail: { where: 'fragment', passageId: id, claimId: claim.id, signals: ['zgloszone_przez_model'], stage: 'wybor' },
              });
              side.injectionEvents++;
            }
          const chosen = orderByRanking(
            union.filter((p) => !rankFlagged.has(p.id)),
            Array.isArray(ranked.ids) ? ranked.ids : [],
            MIN_ASSESS,
            MAX_ASSESS,
          );
          const counterOnly = new Set(counterEligible.map((p) => p.id));
          forSel = chosen.filter((p) => !counterOnly.has(p.id));
          counterSel = chosen.filter((p) => counterOnly.has(p.id));
          trace({ type: 'rank', claimId: claim.id, pool: union.length, chosen: chosen.length });
        } catch (e) {
          // Porządkowanie to tylko optymalizacja: przy błędzie zostaje kolejność z wyszukiwania.
          store.logEvent('rank_failed', { recordId, channel, detail: { claimId: claim.id, code: technicalDetail(e) } });
        }
        deadline.check();
      }
      progress.searched(claimIndex, documents);
      progress.forPassages(claimIndex, forSel.length);
      progress.counterSearchStart(claimIndex);
      progress.counterSearchDone(claimIndex, counterSel.length);
      const sent = [...forSel, ...counterSel];
      const considered = sent.length + flagged.size;
      trace({ type: 'candidates', claimId: claim.id, passageIds: sent.map((p) => p.id), documentIds: sent.map((p) => p.documentId) });

      let accepted: AcceptedEvidence[] = [];
      let rejectedCount = 0;
      if (sent.length > 0) {
        // Zad. 35: porcje do oceny w stałej kolejności wyszukiwania (nie w kolejności od modelu porządkującego):
        // ten sam zbiór kandydatów daje zawsze te same porcje i to samo wejście oceny. Pozycja dowodu
        // (słabe dopasowanie) zostaje z kolejności wyboru.
        const searchPos = new Map(union.map((p, i) => [p.id, i]));
        const bySearch = (list: Passage[]) => [...list].sort((a, b) => (searchPos.get(a.id) ?? 0) - (searchPos.get(b.id) ?? 0));
        const r = await assessAndGate([...splitEven(bySearch(forSel), ASSESS_CHUNK), ...splitEven(bySearch(counterSel), ASSESS_CHUNK)], sent);
        accepted = r.accepted;
        rejectedCount = r.rejected;
        // Weryfikacje redakcji w zbiorze: te same reguły doboru i ta sama tabela ocen co dla indeksu.
        const reviewed = accepted.filter((a) => a.passage.meta.review);
        if (reviewed.length) {
          const sel = selectReviewEvidence(claim, reviewed, nowDate);
          accepted = [...accepted.filter((a) => !a.passage.meta.review), ...sel.accepted];
          rejectedCount += sel.dropped ?? 0;
          if (sel.dropped || sel.reasons)
            store.logEvent('review_selection', { recordId, channel, detail: { claimId: claim.id, where: 'zbior', dropped: sel.dropped ?? 0, ...(sel.reasons ?? {}) } });
        }
      }

      // (6a0) strona urzędu: dowody z pobranej strony dołączają do dowodów zbioru. Ta sama strona w zbiorze
      // i pobrana teraz: zostaje świeża treść ze strony.
      if (pageRun) {
        const pr = await pageRun;
        deadline.check();
        const pageUrls = pr.accepted.map((a) => a.passage.meta.url);
        accepted = [...accepted.filter((a) => !pageUrls.some((u) => sameUrl(u, a.passage.meta.url))), ...pr.accepted];
        rejectedCount += pr.rejected;
        if (pr.accepted.length > 0 || pr.rejected > 0)
          store.logEvent('url_fetched', { recordId, channel, detail: { stage: 'strona_urzedu', claimId: claim.id, accepted: pr.accepted.length, rejected: pr.rejected } });
      }

      // (6a) indeks weryfikacji: dowody z ocen redakcji dołączają do dowodów zbioru urzędowego.
      let fcStatus: FactcheckStatus | null = null;
      let fcUsed = false;
      let fcFlagged = 0;
      if (fcRun) {
        const fc = await fcRun;
        deadline.check();
        fcStatus = fc.status;
        fcFlagged = fc.flagged;
        // Ta sama publikacja ze zbioru i z indeksu: zostaje wpis ze zbioru.
        const have = new Set(accepted.map((a) => a.passage.meta.url));
        const fresh = fc.accepted.filter((a) => !have.has(a.passage.meta.url));
        accepted = [...accepted, ...fresh];
        rejectedCount += fc.rejected;
      }

      // (6b) druga warstwa (zad. 29): tylko gdy korpus nie dał żadnego rozstrzygającego dowodu.
      let liveFlagged = 0;
      let liveUsed = false;
      let liveNothing = false;
      if (live && !accepted.some((a) => DECISIVE.has(a.stance))) {
        const lr = await runLive(claim, side, assessAndGate);
        liveFlagged = lr.flagged;
        liveUsed = lr.accepted.some((a) => DECISIVE.has(a.stance));
        liveNothing = lr.searched && !liveUsed;
        accepted = [...accepted, ...lr.accepted];
        rejectedCount += lr.rejected;
      }

      // (6c) zad. 44: twierdzenie wyodrębnione ze strony urzędu ocenia dowód z tej strony; starsze sprzeczne
      // dokumenty są tłem, nowszy sprzeczny dokument daje uwagę i niższą siłę (officialPage.ts).
      let precedence: PagePrecedence<AcceptedEvidence> | null = null;
      if (pageDocument && pageInfo && isUrl) {
        precedence = applyPagePrecedence(accepted, pageInfo);
        accepted = precedence.accepted;
      }

      // (6d) zad. 45: druga kontrola innym modelem. Każda rozstrzygająca para (twierdzenie, cytat, stanowisko)
      // dostaje "tak" / "nie" / "nie wiem"; poza "tak" dowód staje się tłem. Tylko odbiera, nigdy nie dodaje.
      // Teza z oceny redakcji ("ta sama teza", bez uzasadnienia) jest pomijana: jej cytat to sprawdzana teza,
      // nie zdanie uzasadniające, więc pytanie "czy cytat sam uzasadnia stanowisko" jej nie dotyczy.
      let secondDropped = 0;
      if (secondCheck) {
        const idx = accepted.flatMap((a, i) =>
          DECISIVE.has(a.stance) && !(a.passage.meta.review && a.passage.meta.review.role !== 'uzasadnienie') ? [i] : [],
        );
        if (idx.length > 0) {
          const pairs = idx.map((i) => ({ claim: claim.text, quote: accepted[i]!.quote, stance: accepted[i]!.stance as 'potwierdza' | 'obala' | 'rozbieznosc_kontekstu' }));
          const sc = await runSecondCheck(secondCheck, pairs);
          for (const u of sc.usage) addUsage(usage, u);
          deadline.check();
          if (sc.ok) {
            const agreed = sc.answers.filter((x) => x === 'tak').length;
            const next = [...accepted];
            idx.forEach((i, k) => {
              if (sc.answers[k] === 'tak') return;
              const { mismatch: _m, ...rest } = next[i]!;
              next[i] = { ...rest, stance: 'kontekst' };
              secondDropped++;
            });
            accepted = next;
            secondStats.checked += idx.length;
            secondStats.agreed += agreed;
            progress.secondCheck(claimIndex, idx.length, agreed, true);
          } else {
            secondStats.failed = true;
            progress.secondCheck(claimIndex, idx.length, 0, false);
          }
          secondStats.ms = Math.max(secondStats.ms, sc.ms);
          store.logEvent('second_check', { recordId, channel, detail: { claimId: claim.id, model: secondCheck.model, checked: idx.length, ok: sc.ok, dropped: secondDropped, ...(sc.ok ? {} : { reason: sc.reason }) } });
        }
      }

      // Próba obalenia: ile dowodów przeciwnych przyniósł przebieg "przeciw".
      const refutation: Refutation = {
        performed: true,
        queries: [cQuery],
        found: accepted.filter((a) => counterIds.has(a.passage.id) && (a.stance === 'obala' || a.stance === 'rozbieznosc_kontekstu'))
          .length,
      };

      // (7) werdykt i siła (kod)
      const ruleEvidence: RuleEvidence[] = accepted.map((a) => ({
        passageId: a.passage.id,
        documentId: a.passage.documentId,
        stance: a.stance,
        source: a.passage.meta,
        archival: isArchival(a.passage.meta, nowDate, archivalMonths),
        expired: isExpired(a.passage.meta, nowDate),
        rank: a.rank,
      }));
      const decision = decideVerdict(claim.kind, ruleEvidence, { refutationPerformed: refutation.performed });
      trace({ type: 'verdict', claimId: claim.id, claimText: claim.text, kind: claim.kind, verdict: decision.verdict, ...(decision.abstain ? { abstain: decision.abstain } : {}) });
      const strength = computeStrength(decision);
      const precedenceLimitations: string[] = [];
      if (precedence?.pageConfirms && decision.verdict === 'potwierdzone') {
        if (precedence.backgrounded > 0) precedenceLimitations.push(PAGE_OLDER_BACKGROUND_LIMITATION);
        const seenDocs = new Set<string>();
        for (const a of precedence.newer) {
          if (seenDocs.has(a.passage.documentId)) continue;
          seenDocs.add(a.passage.documentId);
          const text = newerSourceNotice(a.passage.meta.publisher || a.passage.meta.domain, a.passage.meta.publishedAt);
          precedenceLimitations.push(text);
          side.notices.push({ type: 'status_zrodla', text, passageId: a.passage.id });
        }
        if (precedence.newer.length > 0) {
          strength.level = strength.level === 'wysoka' ? 'srednia' : 'niska';
          if (!strength.reasons.includes('sprzeczne_zrodla')) strength.reasons.push('sprzeczne_zrodla');
        }
      }
      const evidence: EvidenceItem[] = accepted.map((a, i) => ({
        passageId: a.passage.id,
        stance: a.stance,
        ...(a.mismatch !== undefined ? { mismatch: a.mismatch } : {}),
        quote: a.quote,
        source: a.passage.meta, // metadane z bazy, nigdy od modelu
        archival: ruleEvidence[i]!.archival,
      }));
      const distinctDocs = (stance: string) =>
        new Set(ruleEvidence.filter((e) => e.stance === stance).map((e) => e.documentId)).size;

      const limitations: string[] = [...baseLimitations, ...precedenceLimitations];
      if (secondDropped > 0) limitations.push(secondCheckDroppedLimitation(secondDropped));
      if (ruleEvidence.some((e) => e.archival)) {
        limitations.push(archivalLimitation(archivalMonths));
        for (const e of ruleEvidence)
          if (e.archival) side.notices.push({ type: 'material_archiwalny', text: archivalNotice(archivalMonths), passageId: e.passageId });
      }
      if (ruleEvidence.some((e) => e.expired)) {
        limitations.push(EXPIRED_LIMITATION);
        for (const e of ruleEvidence)
          if (e.expired && e.source.validUntil)
            side.notices.push({ type: 'material_archiwalny', text: expiredNotice(e.source.validUntil), passageId: e.passageId });
      }
      if (decision.aligned.some((e) => e.source.sourceType !== 'prawo' && !e.source.publishedAt))
        limitations.push(UNDATED_LIMITATION);
      if (liveUsed) {
        limitations.push(LIVE_USED_LIMITATION);
        for (const e of ruleEvidence)
          if (e.source.layer === 'media_i_instytucje' && DECISIVE.has(e.stance))
            side.notices.push({ type: 'status_zrodla', text: liveSourceNotice(e.source.publisher), passageId: e.passageId });
      } else if (liveNothing) limitations.push(LIVE_NOT_FOUND_LIMITATION);
      fcUsed = accepted.some((a) => a.passage.meta.layer === 'weryfikacja_redakcji' && DECISIVE.has(a.stance));
      if (fcUsed) limitations.push(FACTCHECK_USED_LIMITATION);
      else if (fcStatus && isFactcheckFailure(fcStatus)) limitations.push(FACTCHECK_DOWN_LIMITATION);
      else if (fcStatus) limitations.push(FACTCHECK_NOT_FOUND_LIMITATION);
      const flaggedHere = flagged.size + rankFlagged.size + modelFlagged.size + liveFlagged + fcFlagged;
      if (flaggedHere > 0) limitations.push(injectionLimitation(flaggedHere));

      const mismatchKinds = accepted
        .filter((a) => a.stance === 'rozbieznosc_kontekstu' && a.mismatch !== undefined)
        .map((a) => a.mismatch as MismatchKind);
      const result: ClaimResult = {
        claim,
        verdict: decision.verdict,
        strength,
        explanation: explainClaim({
          verdict: decision.verdict,
          ...(decision.abstain ? { abstain: decision.abstain } : {}),
          strength,
          confirmSources: distinctDocs('potwierdza'),
          refuteSources: distinctDocs('obala'),
          contextSources: distinctDocs('kontekst'),
          mismatchSources: distinctDocs('rozbieznosc_kontekstu'),
          mismatchKinds,
          refutationPerformed: refutation.performed,
        }),
        explanationSource: 'szablon',
        evidence,
        limitations,
        refutation,
      };
      if (fcStatus) fcStatuses.set(claim.id, fcStatus);
      // Zad. 45: liczby zgodne z rekordem (fragmenty do sprawdzenia, dowody po kontroli, różne dokumenty).
      const decisiveEv = evidence.filter((e) => DECISIVE.has(e.stance));
      progress.claimChecked(claimIndex, {
        candidates: considered,
        passed: evidence.length,
        decisive: decisiveEv.length,
        sources: new Set(decisiveEv.map((e) => e.source.documentId)).size,
      });
      const profile = errorProfileFor(errorTable, strength.level);
      if (profile) result.errorProfile = profile;
      if (decision.abstain) {
        abstainCodes.set(claim.id, decision.abstain);
        result.abstainReason = abstainReasonText(decision.abstain, considered, rejectedCount);
        // W5: flaga eskalacji (samo powiadomienie moderatora to późniejsze zadanie).
        limitations.push(ESCALATION_LIMITATION);
      }
      return result;
    }

    const secondStats = { checked: 0, agreed: 0, ms: 0, failed: false };
    // Twierdzenia są niezależne: sprawdzamy je równolegle, wynik i ostrzeżenia w kolejności twierdzeń.
    const sides: ClaimSide[] = checkable.map(() => ({ notices: [], signals: [], injectionEvents: 0 }));
    const results: ClaimResult[] = await Promise.all(checkable.map((claim, i) => checkClaim(claim, i, sides[i]!)));
    deadline.check();
    if (secondStats.failed) notices.push({ type: 'ograniczenie_techniczne', text: SECOND_CHECK_UNAVAILABLE_NOTICE });
    for (const side of sides) {
      notices.push(...side.notices);
      for (const s of side.signals) injectionSignals.add(s);
      injectionEvents += side.injectionEvents;
    }

    // Scenariusz J: indeks niedostępny, a zbiór urzędowy nie rozstrzyga żadnego twierdzenia -> stan techniczny
    // (nigdy "nie znaleziono"). Gdy coś rozstrzyga, wynik zostaje z dopiskiem (limitations wyżej).
    const fcFailed = [...fcStatuses.values()].some(isFactcheckFailure);
    const anyDecided = results.some((r) => r.verdict !== 'brak_wystarczajacych_dowodow' && r.verdict !== 'nie_podlega_weryfikacji');
    if (fcFailed && !anyDecided) {
      store.logEvent('factcheck_unavailable', {
        recordId,
        channel,
        detail: { statuses: [...new Set([...fcStatuses.values()].filter(isFactcheckFailure))] },
      });
      return toState(stateOutcome('awaria_techniczna', FACTCHECK_DOWN_MESSAGE, 'indeks_weryfikacji'), recordId);
    }

    // Profil błędów także dla nie_podlega_weryfikacji (siła `brak`), jeśli plik go zawiera.
    for (const r of results)
      if (!r.errorProfile) {
        const p = errorProfileFor(errorTable, r.strength.level);
        if (p) r.errorProfile = p;
      }

    // (8a) baza incydentów: wyłącznie ostrzeżenia, nigdy werdykt
    let incidentUnknown = false;
    let incidentAdded = 0;
    if (deps.incidents) {
      let added = 0;
      for (const claim of checkable) {
        if (added >= MAX_INCIDENT_NOTICES) break;
        try {
          const hits = await deps.incidents.match(claim, nowDate);
          for (const h of Array.isArray(hits) ? hits : []) {
            if (added >= MAX_INCIDENT_NOTICES) break;
            if (typeof h?.text !== 'string' || !h.text.trim()) continue;
            notices.push({ type: 'dopasowanie_incydentu', text: h.text });
            added++;
          }
        } catch {
          // baza incydentów niedostępna: brak ostrzeżenia, ocena bez zmian (rola domyślna)
          incidentUnknown = true;
        }
      }
      if (added > 0) store.logEvent('incident_match', { recordId, channel, detail: { count: added } });
      incidentAdded = added;
    }

    // (8a') rola wyglądu (zad. 28b): wybiera kod, po wszystkich ocenach; nie zmienia niczego w wyniku.
    const steering = detectRoleSteering(stripped.text);
    if (steering.length > 0) store.logEvent('role_steering_ignored', { recordId, channel, detail: { words: steering } });
    const roleDecision = chooseRole({
      topic: extracted.topic,
      texts: [stripped.text, ...rawClaims.map((c) => (typeof c?.text === 'string' ? c.text : ''))],
      claimCount: rawClaims.length,
      incidentMatched: incidentAdded > 0,
      incidentUnknown,
      injectionSignals: injectionSignals.size,
    });

    // Zad. 29: gdy podstawa pochodzi z drugiej warstwy, "stan na" to czas pobrania strony.
    const liveDecisive = (r: ClaimResult) =>
      r.evidence.filter((e) => e.source.layer === 'media_i_instytucje' && DECISIVE.has(e.stance));
    const pageDecisive = (r: ClaimResult) => r.evidence.filter((e) => e.source.layer === 'strona_urzedu' && DECISIVE.has(e.stance));
    const liveFetched = results.flatMap((r) => [...liveDecisive(r), ...pageDecisive(r)].map((e) => e.source.fetchedAt)).sort();
    if (liveFetched.length) asOf = new Date(liveFetched[liveFetched.length - 1]!).toISOString();

    // Zad. 45: etap strony urzędu (wydawca z listy lub tytułu, liczba dosłownych cytatów ze strony, które
    // potwierdzają, i zdań nimi potwierdzonych; te same liczby co etykieta zbiorcza w odpowiedzi).
    if (pageDocument && pageInfo) {
      const pageQuotes = results.flatMap((r) => r.evidence.filter((e) => e.source.layer === 'strona_urzedu' && e.stance === 'potwierdza'));
      const confirmed = results.filter((r) => r.verdict === 'potwierdzone' && r.evidence.some((e) => e.source.layer === 'strona_urzedu' && e.stance === 'potwierdza')).length;
      progress.officialPage(pageInfo.publisher ?? pageInfo.domain, pageQuotes.length, confirmed, results.length);
    }

    // (8b') forma odpowiedzi (src/render/answer.ts, szablony): pytanie rozstrzygające dostaje na początku
    // bezpośrednią odpowiedź zgodną z wynikiem; przy braku dowodów opis brakującego dokumentu.
    const mode = answerMode(prepared.kind === 'tekst' ? prepared.maskedInput : '');
    // Sam adres strony urzędu (bez pytania): pierwsze zdanie to "To oficjalny komunikat: <wydawca>", nie "Tak.".
    let announced = false;
    for (const r of results) {
      const st = fcStatuses.get(r.claim.id);
      const announce = prepared.kind === 'url' && !announced && r.verdict === 'potwierdzone' && decisivePage(r)?.stance === 'potwierdza';
      if (announce) announced = true;
      annotateAnswer(r, { mode, announce, indexChecked: st !== undefined && !isFactcheckFailure(st), indexFailed: st !== undefined && isFactcheckFailure(st) });
    }

    // (8b) zdania dla obywatela (src/render), z zapasowymi szablonami silnika
    if (renderer) for (const r of results) r.explanation = safeExplanation(renderer, r, asOf);
    // Zad. 29: proste zdanie, że źródło pochodzi spoza zbioru urzędowego.
    for (const r of results)
      if (liveDecisive(r).length && !r.explanation.includes(LIVE_SOURCE_SENTENCE))
        r.explanation = `${r.explanation.trim()} ${LIVE_SOURCE_SENTENCE}`;

    // (8c) zapis rekordu
    const record: VerificationRecord = {
      id: recordId,
      inputHash: sha256Hex(keyInput),
      corpusVersion,
      inputKind: prepared.kind,
      maskedInput: prepared.maskedInput,
      piiMasked: prepared.masks,
      claims: results,
      notices: dedupeNotices(notices),
      injectionSignals: [...injectionSignals].sort(),
      createdAt,
      asOf,
      shortAnswer: buildShortAnswer(results, asOf),
      provider: llm.name,
      usage: {
        llmCalls: usage.llmCalls,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCostUsd: usage.estimatedCostUsd,
        latencyMs: Math.max(0, now().getTime() - started),
      },
      role: roleDecision.role,
      ...(pageInfo ? { page: pageInfo } : {}),
      ...(secondCheck && (secondStats.checked > 0 || secondStats.failed)
        ? {
            secondCheck: {
              model: secondCheck.model.slice(0, 80),
              checked: secondStats.checked,
              agreed: secondStats.agreed,
              ms: secondStats.ms,
              status: secondStats.failed ? ('niedostepna' as const) : ('ok' as const),
            },
          }
        : {}),
      schemaVersion: RECORD_SCHEMA_VERSION,
    };
    if (renderer) record.shortAnswer = safeShortAnswer(renderer, record);
    // Po limicie czasu nic nie zapisujemy: obywatel dostał już stan techniczny.
    deadline.check();
    const inserted = store.insertRecord(record);
    for (const r of results)
      if (r.verdict === 'brak_wystarczajacych_dowodow')
        store.logEvent('abstain', {
          recordId,
          channel,
          detail: { claimId: r.claim.id, reason: abstainCodes.get(r.claim.id) ?? 'brak_dowodow', evidence: r.evidence.length },
        });
    if (!inserted) {
      // Współbieżne identyczne zgłoszenie zapisało rekord pierwsze: zwracamy jeden wspólny rekord.
      const existing = store.getRecord(recordId);
      if (existing) {
        store.logEvent('cache_hit', { recordId, channel, detail: { race: true } });
        progress.done(recordId, true, existing.createdAt);
        return { kind: 'record', record: existing, cached: true };
      }
    }
    const latencyMs = record.usage.latencyMs;
    store.logEvent('verify_ok', {
      recordId,
      channel,
      detail: {
        claims: results.length,
        verdicts: results.map((r) => r.verdict),
        llmCalls: usage.llmCalls,
        injectionEvents,
        refutationFound: results.reduce((n, r) => n + r.refutation.found, 0),
        role: roleDecision.role,
        roleReasons: roleDecision.reasons,
        // Czas pełnego sprawdzenia (mediana dla GET /api/verify/eta).
        ms: latencyMs,
      },
    });
    progress.done(recordId, false, record.createdAt);
    return { kind: 'record', record, cached: false };
    }
  }

  function logDeadline(channel: VerifyInput['channel']): void {
    try {
      store.logEvent('state', { channel, detail: { state: 'awaria_techniczna', detail: 'deadline', limitMs: deadlineMs } });
    } catch {
      // log niedostępny: nadal stan techniczny
    }
  }

  return {
    async verify(input, opts) {
      const deadline = createDeadline(deadlineMs);
      try {
        const running = run(input, createProgressEmitter(opts?.onProgress), deadline);
        // Po przekroczeniu limitu potok przerywa się przy najbliższym etapie; jego błąd nie może wyciec.
        running.catch(() => {});
        const outcome = await Promise.race([running, deadline.expired]);
        if (outcome.kind === 'state' && outcome.detail === 'deadline') logDeadline(input.channel);
        return outcome;
      } catch (err) {
        if (err instanceof DeadlineExceeded) {
          logDeadline(input.channel);
          return stateOutcome('awaria_techniczna', MESSAGES.tooSlow, 'deadline');
        }
        // Zero ścieżek, w których wyjątek lub brak klucza kończy się werdyktem.
        const outcome = errorToOutcome(err);
        try {
          if (isLlmError(err))
            store.logEvent('llm_error', { channel: input.channel, detail: { code: technicalDetail(err) } });
          if (outcome.kind === 'state')
            store.logEvent('state', {
              channel: input.channel,
              detail: { state: outcome.state, detail: outcome.detail ?? null },
            });
        } catch {
          // log niedostępny: nadal zwracamy stan, nie werdykt
        }
        return outcome;
      } finally {
        deadline.clear();
      }
    },
    getRecord(id) {
      try {
        return store.getRecord(id);
      } catch {
        return null;
      }
    },
  };
}
