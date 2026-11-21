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
import { maskPii } from '../input/index';
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
  PAGE_INJECTION_NOTICE,
  PAGE_IS_DATA_LIMITATION,
  PAGE_TRUNCATED_NOTICE,
  scopeLimitation,
  UNDATED_LIMITATION,
} from './explain';
import type { PageFetcher } from './fetch/index';
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

export { buildShortAnswer };

export const MAX_CLAIMS = 5;
export const MAX_PASSAGES_PER_CLAIM = 8;
/** Dodatkowe (nowe) fragmenty z przebiegu "przeciw", oceniane razem z fragmentami "za". */
export const MAX_COUNTER_PASSAGES = 4;
/** Słowa dodawane do zapytania "przeciw", gdy model nie podał `counterTerms`. */
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
}

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
  /** Zostały, ale bramka ustaliła inną relację (ona wygrywa). */
  changed: number;
  /** Odpadły: cytat sam nie rozstrzyga twierdzenia. */
  dropped: number;
  /** Ponowione z poprzedzającym zdaniem źródła (podmiot zdanie wcześniej). */
  retried: number;
  /** Z tego uratowane (cytat poszerzony). */
  rescued: number;
}

/**
 * Bramka wsparcia: każdy cytat rozstrzygający (potwierdza, obala, rozbieżność) idzie do bramki SAM,
 * tylko z twierdzeniem. Cytat, który sam nie rozstrzyga, dostaje jedną szansę z poprzedzającym zdaniem
 * tego samego fragmentu (ciągły wycinek źródła); potem odpada. Relacja bramki zastępuje relację oceny.
 * Dowody `kontekst` przechodzą bez zmian (nie wpływają na werdykt rozstrzygający).
 */
export async function applySupportGate(
  gate: SupportGate,
  claimText: string,
  accepted: AcceptedEvidence[],
  onUsage: (u: LlmUsage | undefined) => void,
): Promise<{ accepted: AcceptedEvidence[]; stats: SupportGateStats }> {
  const stats: SupportGateStats = { checked: 0, kept: 0, changed: 0, dropped: 0, retried: 0, rescued: 0 };
  const items = accepted.filter((a) => DECISIVE.has(a.stance));
  if (items.length === 0) return { accepted, stats };
  stats.checked = items.length;
  const first = await gate.checkSupport({ claim: claimText, quotes: items.map((a) => a.quote) });
  onUsage(first.usage);
  const verdicts = normalizeVerdicts(first, items.length);

  const retry: { index: number; quote: string }[] = [];
  verdicts.forEach((v, i) => {
    if (v.relation !== 'nie_rozstrzyga') return;
    const ext = withPreviousSentence(items[i]!.passage.text, items[i]!.quote);
    if (ext && !containsUrl(ext) && detectInjectionSignals(ext).length === 0) retry.push({ index: i, quote: ext });
  });
  const quotes = items.map((a) => a.quote);
  if (retry.length > 0) {
    stats.retried = retry.length;
    const second = await gate.checkSupport({ claim: claimText, quotes: retry.map((r) => r.quote) });
    onUsage(second.usage);
    normalizeVerdicts(second, retry.length).forEach((v, j) => {
      if (v.relation === 'nie_rozstrzyga') return;
      const { index, quote } = retry[j]!;
      verdicts[index] = v;
      quotes[index] = quote;
      stats.rescued++;
    });
  }

  const out = new Map<AcceptedEvidence, AcceptedEvidence | null>();
  items.forEach((a, i) => {
    const v = verdicts[i]!;
    // Bramka nie omija wymogu liczb: "potwierdza" bez liczby z twierdzenia odpada.
    if (v.relation === 'nie_rozstrzyga' || (v.relation === 'potwierdza' && !hasKeyNumbers(claimText, quotes[i]!))) {
      out.set(a, null);
      stats.dropped++;
      return;
    }
    const stance = v.relation;
    const mismatch: MismatchKind | undefined =
      stance === 'rozbieznosc_kontekstu' ? (v.mismatch ?? a.mismatch ?? 'warunki') : undefined;
    if (stance === a.stance) stats.kept++;
    else stats.changed++;
    const { mismatch: _old, ...rest } = a;
    out.set(a, { ...rest, stance, quote: quotes[i]!, ...(mismatch !== undefined ? { mismatch } : {}) });
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
  const store: EngineStore = createStore(deps.db, now);
  const archivalMonths = deps.options?.archivalMonths ?? DEFAULT_ARCHIVAL_MONTHS;
  const errorTable: ErrorProfileTable | null =
    deps.options?.errorProfile !== undefined
      ? deps.options.errorProfile
      : deps.options?.errorProfilePath
        ? loadVerifiedErrorProfile(deps.options.errorProfilePath, { model: llmModelName(deps.llm), engineVersion: engineFingerprint() })
        : null;
  const { searcher, llm, prepare } = deps;
  const renderer = deps.renderer;
  const supportGate: SupportGate | null =
    deps.supportGate !== undefined ? deps.supportGate : isSupportGate(llm) ? llm : null;

  async function search(query: string, limit: number): Promise<Passage[]> {
    try {
      const found = await searcher.search(query, { limit });
      return Array.isArray(found) ? found : [];
    } catch (e) {
      throw new SearchFailure(e);
    }
  }

  async function run(input: VerifyInput, progress: ProgressEmitter): Promise<VerifyOutcome> {
    const channel = input.channel;
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
    if (!isPrepared(prepared)) return toState(stateOutcome('potrzeba_doprecyzowania', prepared.message));

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
    let analysisText = prepared.maskedInput;
    let keyInput = prepared.normalizedInput;
    let pageTruncated = false;
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
            : page.reason === 'pusta_tresc' || page.reason === 'zly_typ_tresci'
              ? MESSAGES.urlNoContent
              : MESSAGES.urlNotFetched;
        return toState(stateOutcome('brak_mozliwosci_sprawdzenia', message, `url:${page.reason}`));
      }
      store.logEvent('url_fetched', {
        channel,
        detail: { redirects: page.redirects, truncated: page.truncated, contentType: page.contentType },
      });
      // Ta sama normalizacja co dla tekstu od obywatela (znaki niewidoczne, NFKC, sterujące).
      analysisText = maskPii(cleanText(page.text)).text;
      pageTruncated = page.truncated;
      // Klucz obejmuje skrót treści: zmiana strony = nowe sprawdzenie, nie stary rekord.
      keyInput = `${prepared.normalizedInput}\n#tresc:${sha256Hex(analysisText)}`;
    }

    // (2) klucz rekordu i cache
    const recordId = computeRecordKey(keyInput, corpusVersion);
    const cached = store.getRecord(recordId);
    if (cached) {
      store.logEvent('cache_hit', { recordId, channel });
      progress.done(recordId, true);
      return { kind: 'record', record: cached, cached: true };
    }

    const usage: UsageAcc = { llmCalls: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };
    const injectionSignals = new Set<string>();
    const notices: Notice[] = [];
    let injectionEvents = 0;
    const isUrl = prepared.kind === 'url';
    if (pageTruncated) notices.push({ type: 'ograniczenie_techniczne', text: PAGE_TRUNCATED_NOTICE });

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

    const extracted = await llm.extractClaims({ text: stripped.text });
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
    const asOf = resolveAsOf(searcher, createdAt);
    const results: ClaimResult[] = [];
    const abstainCodes = new Map<string, string>();
    const nowDate = now();
    const scope = scopeLimitation(corpusVersion, documents);
    const baseLimitations = isUrl ? [scope, PAGE_IS_DATA_LIMITATION] : [scope];

    for (const [claimIndex, claim] of checkable.entries()) {
      if (claim.kind === 'opinia' || claim.kind === 'prognoza') {
        const decision = decideVerdict(claim.kind, []);
        const strength = computeStrength(decision);
        results.push({
          claim,
          verdict: decision.verdict,
          strength,
          explanation: explainClaim({ verdict: decision.verdict, strength, confirmSources: 0, refuteSources: 0, contextSources: 0 }),
          explanationSource: 'szablon',
          evidence: [],
          limitations: [...baseLimitations],
          refutation: noRefutation(),
        });
        continue;
      }

      // (4) wyszukiwanie "za" i "przeciw" (kod)
      const forPassages = uniqueById(await search(searchQuery(claim), MAX_PASSAGES_PER_CLAIM)).slice(0, MAX_PASSAGES_PER_CLAIM);
      progress.forPassages(claimIndex, forPassages.length);
      const cQuery = counterQuery(claim);
      progress.counterSearchStart(claimIndex);
      const counterFound = uniqueById(await search(cQuery, MAX_PASSAGES_PER_CLAIM));
      const counterIds = new Set(counterFound.map((p) => p.id));
      const forIds = new Set(forPassages.map((p) => p.id));
      const counterNew = counterFound.filter((p) => !forIds.has(p.id)).slice(0, MAX_COUNTER_PASSAGES);
      progress.counterSearchDone(claimIndex, counterNew.length);
      const passages = [...forPassages, ...counterNew];

      // Injection: fragmenty z sygnałem nie trafiają do modelu i nie mogą być dowodem.
      const flagged = new Set<string>();
      for (const p of passages) {
        const sig = detectInjectionSignals(p.text);
        if (sig.length) {
          flagged.add(p.id);
          for (const s of sig) injectionSignals.add(`fragment:${p.id}:${s}`);
          notices.push({ type: 'ograniczenie_techniczne', text: INJECTION_NOTICE, passageId: p.id });
          store.logEvent('injection_signal', {
            recordId,
            channel,
            detail: { where: 'fragment', passageId: p.id, claimId: claim.id, signals: sig },
          });
          injectionEvents++;
        }
      }
      const sent = passages.filter((p) => !flagged.has(p.id));
      const sentIds = new Set(sent.map((p) => p.id));

      // (5) ocena stanowisk (model) i (6) bramka cytatów (kod)
      let accepted: AcceptedEvidence[] = [];
      let rejectedCount = 0;
      const modelFlagged = new Set<string>();
      if (sent.length > 0) {
        const assessed = await llm.assessPassages({ claim, passages: sent.map((p) => ({ id: p.id, text: p.text })) });
        addUsage(usage, assessed.usage);
        const assessments = Array.isArray(assessed.assessments) ? assessed.assessments : [];
        for (const a of assessments)
          if (a?.injectionSuspected === true && sentIds.has(a.passageId) && !modelFlagged.has(a.passageId)) {
            modelFlagged.add(a.passageId);
            injectionSignals.add(`fragment:${a.passageId}:zgloszone_przez_model`);
            notices.push({ type: 'ograniczenie_techniczne', text: MODEL_INJECTION_NOTICE, passageId: a.passageId });
            store.logEvent('injection_signal', {
              recordId,
              channel,
              detail: { where: 'fragment', passageId: a.passageId, claimId: claim.id, signals: ['zgloszone_przez_model'] },
            });
            injectionEvents++;
          }
        const gate = validateCitations(assessments, sent, { flaggedPassageIds: modelFlagged, claimText: claim.text });
        accepted = gate.accepted;
        rejectedCount = gate.rejected.length;
        if (supportGate) {
          const checked = await applySupportGate(supportGate, claim.text, accepted, (u) => addUsage(usage, u));
          accepted = checked.accepted;
          rejectedCount += checked.stats.dropped;
          if (checked.stats.checked > 0)
            store.logEvent('support_gate', { recordId, channel, detail: { claimId: claim.id, gate: supportGate.name, ...checked.stats } });
        }
        for (const a of accepted) progress.passageAssessed(claimIndex, a.passage.meta, a.stance);
        const unknown = gate.rejected.filter((r) => r.reason === 'nieznany_fragment').length;
        if (unknown > 0) store.logEvent('llm_unknown_passage', { recordId, channel, detail: { claimId: claim.id, count: unknown } });
        if (rejectedCount > 0) {
          const byReason: Record<string, number> = {};
          for (const r of gate.rejected) byReason[r.reason] = (byReason[r.reason] ?? 0) + 1;
          store.logEvent('citation_rejected', {
            recordId,
            channel,
            detail: { claimId: claim.id, count: rejectedCount, ...byReason },
          });
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
      const strength = computeStrength(decision);
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

      const limitations: string[] = [...baseLimitations];
      if (ruleEvidence.some((e) => e.archival)) {
        limitations.push(archivalLimitation(archivalMonths));
        for (const e of ruleEvidence)
          if (e.archival) notices.push({ type: 'material_archiwalny', text: archivalNotice(archivalMonths), passageId: e.passageId });
      }
      if (ruleEvidence.some((e) => e.expired)) {
        limitations.push(EXPIRED_LIMITATION);
        for (const e of ruleEvidence)
          if (e.expired && e.source.validUntil)
            notices.push({ type: 'material_archiwalny', text: expiredNotice(e.source.validUntil), passageId: e.passageId });
      }
      if (decision.aligned.some((e) => e.source.sourceType !== 'prawo' && !e.source.publishedAt))
        limitations.push(UNDATED_LIMITATION);
      const flaggedHere = passages.filter((p) => flagged.has(p.id) || modelFlagged.has(p.id)).length;
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
      const profile = errorProfileFor(errorTable, strength.level);
      if (profile) result.errorProfile = profile;
      if (decision.abstain) {
        abstainCodes.set(claim.id, decision.abstain);
        result.abstainReason = abstainReasonText(decision.abstain, passages.length, rejectedCount);
        // W5: flaga eskalacji (samo powiadomienie moderatora to późniejsze zadanie).
        limitations.push(ESCALATION_LIMITATION);
      }
      results.push(result);
    }

    // Profil błędów także dla nie_podlega_weryfikacji (siła `brak`), jeśli plik go zawiera.
    for (const r of results)
      if (!r.errorProfile) {
        const p = errorProfileFor(errorTable, r.strength.level);
        if (p) r.errorProfile = p;
      }

    // (8a) baza incydentów: wyłącznie ostrzeżenia, nigdy werdykt
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
          // baza incydentów niedostępna: brak ostrzeżenia, ocena bez zmian
        }
      }
      if (added > 0) store.logEvent('incident_match', { recordId, channel, detail: { count: added } });
    }

    // (8b) zdania dla obywatela (src/render), z zapasowymi szablonami silnika
    if (renderer) for (const r of results) r.explanation = safeExplanation(renderer, r, asOf);

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
      schemaVersion: RECORD_SCHEMA_VERSION,
    };
    if (renderer) record.shortAnswer = safeShortAnswer(renderer, record);
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
        progress.done(recordId, true);
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
        // Czas pełnego sprawdzenia (mediana dla GET /api/verify/eta).
        ms: latencyMs,
      },
    });
    progress.done(recordId, false);
    return { kind: 'record', record, cached: false };
  }

  return {
    async verify(input, opts) {
      try {
        return await run(input, createProgressEmitter(opts?.onProgress));
      } catch (err) {
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
