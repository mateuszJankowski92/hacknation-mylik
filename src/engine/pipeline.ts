// Potok weryfikacji: jedyne miejsce logiki `verify(input) -> VerifyOutcome`.
// Etapy: (1) prepare, (2) klucz + cache, (3) ekstrakcja twierdzeń (model), (4) wyszukiwanie (kod),
// (5) ocena stanowisk (model), (6) bramka cytatów (kod), (7) werdykt i siła (kod), (8) zapis.
import {
  ExtractedClaimSchema,
  LlmError,
  computeRecordKey,
  noRefutation,
  RECORD_SCHEMA_VERSION,
  sha256Hex,
  SHORT_ANSWER_MAX_CHARS,
  VERDICT_LABELS_PL,
  type ClaimResult,
  type Engine,
  type EngineDeps as ContractEngineDeps,
  type EvidenceItem,
  type ExtractedClaim,
  type LlmUsage,
  type NeedsClarification,
  type Notice,
  type Passage,
  type PreparedInput,
  type VerificationRecord,
  type VerifyInput,
  type VerifyOutcome,
} from '../contracts/index';
import { validateCitations } from './citations';
import { errorToOutcome, isLlmError, SearchFailure, stateOutcome, technicalDetail } from './errors';
import {
  abstainReasonText,
  archivalLimitation,
  archivalNotice,
  ESCALATION_LIMITATION,
  explainClaim,
  INJECTION_NOTICE,
  INPUT_INJECTION_NOTICE,
  injectionLimitation,
  MESSAGES,
  scopeLimitation,
  UNDATED_LIMITATION,
} from './explain';
import { detectInjectionSignals } from './injection';
import { computeStrength, decideVerdict, DEFAULT_ARCHIVAL_MONTHS, isArchival, type RuleEvidence } from './rules';
import { createStore, type EngineStore } from './store';

export const MAX_CLAIMS = 5;
export const MAX_PASSAGES_PER_CLAIM = 8;

export type PrepareFn = (i: VerifyInput) => PreparedInput | NeedsClarification;

export interface EngineOptions {
  /** Próg archiwalności w miesiącach (domyślnie 24). */
  archivalMonths?: number;
}

export type EngineDeps = ContractEngineDeps & { prepare?: PrepareFn; options?: EngineOptions };
export type CoreEngineDeps = ContractEngineDeps & { prepare: PrepareFn; options?: EngineOptions };

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

function searchQuery(claim: ExtractedClaim): string {
  // Wyszukiwarka wyciąga słowa kluczowe z tekstu i łączy je przez OR.
  return [claim.text, ...(claim.searchTerms ?? [])].join(' ');
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

/** Prosta krótka odpowiedź z werdyktów (pełną logikę dostarczy późniejsze zadanie). */
export function buildShortAnswer(results: readonly ClaimResult[], asOf: string): string {
  const head = `Stan na ${asOf.slice(0, 10)}: `;
  const body =
    results.length === 0
      ? 'brak twierdzeń do oceny.'
      : results.map((r) => `${VERDICT_LABELS_PL[r.verdict]}: ${r.claim.text}`).join(' | ');
  const full = head + body;
  return full.length <= SHORT_ANSWER_MAX_CHARS ? full : `${full.slice(0, SHORT_ANSWER_MAX_CHARS - 1).trimEnd()}…`;
}

function isPrepared(p: PreparedInput | NeedsClarification): p is PreparedInput {
  return !(p as NeedsClarification).needsClarification;
}

export function createEngineCore(deps: CoreEngineDeps): Engine {
  const now = deps.now ?? (() => new Date());
  const store: EngineStore = createStore(deps.db, now);
  const archivalMonths = deps.options?.archivalMonths ?? DEFAULT_ARCHIVAL_MONTHS;
  const { searcher, llm, prepare } = deps;

  async function run(input: VerifyInput): Promise<VerifyOutcome> {
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
    if (prepared.kind === 'url') {
      // URL użytkownika jest przedmiotem analizy, nie dowodem; w tym etapie nie pobieramy stron.
      store.logEvent('url_not_fetched', { channel, detail: {} });
      return toState(stateOutcome('brak_mozliwosci_sprawdzenia', MESSAGES.urlNotFetched, 'url_not_fetched'));
    }

    // (2) klucz rekordu i cache
    let corpusVersion: string;
    let documents: number;
    try {
      corpusVersion = searcher.corpusVersion();
      documents = searcher.stats().documents;
    } catch (e) {
      throw new SearchFailure(e);
    }
    if (!documents) return toState(stateOutcome('brak_mozliwosci_sprawdzenia', MESSAGES.emptyCorpus, 'empty_corpus'));

    const recordId = computeRecordKey(prepared.normalizedInput, corpusVersion);
    const cached = store.getRecord(recordId);
    if (cached) {
      store.logEvent('cache_hit', { recordId, channel });
      return { kind: 'record', record: cached, cached: true };
    }

    const usage: UsageAcc = { llmCalls: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };
    const injectionSignals = new Set<string>();
    const notices: Notice[] = [];
    let injectionEvents = 0;

    const inputSignals = detectInjectionSignals(prepared.maskedInput);
    if (inputSignals.length) {
      for (const s of inputSignals) injectionSignals.add(`wejscie:${s}`);
      notices.push({ type: 'ograniczenie_techniczne', text: INPUT_INJECTION_NOTICE });
      store.logEvent('injection_signal', { recordId, channel, detail: { where: 'wejscie', signals: inputSignals } });
      injectionEvents++;
    }

    // (3) ekstrakcja twierdzeń (dane wejściowe idą jako dane, nie instrukcje)
    const extracted = await llm.extractClaims({ text: prepared.maskedInput });
    addUsage(usage, extracted.usage);
    const rawClaims = Array.isArray(extracted.claims) ? extracted.claims : [];
    const claims: ExtractedClaim[] = [];
    for (const c of rawClaims) {
      const parsed = ExtractedClaimSchema.safeParse(c);
      if (!parsed.success) throw new LlmError('invalid_output', 'claim schema');
      claims.push(parsed.data);
    }
    const checkable = claims.filter((c) => c.kind !== 'niejasna').slice(0, MAX_CLAIMS);
    if (checkable.length === 0)
      return toState(stateOutcome('potrzeba_doprecyzowania', MESSAGES.clarification, 'no_checkable_claims'), recordId);

    const results: ClaimResult[] = [];
    const abstainCodes = new Map<string, string>();
    const nowDate = now();
    for (const claim of checkable) {
      const scope = scopeLimitation(corpusVersion, documents);
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
          limitations: [scope],
          refutation: noRefutation(),
        });
        continue;
      }

      // (4) wyszukiwanie fragmentów (kod)
      let found: Passage[];
      try {
        found = await searcher.search(searchQuery(claim), { limit: MAX_PASSAGES_PER_CLAIM });
      } catch (e) {
        throw new SearchFailure(e);
      }
      const seenIds = new Set<string>();
      const passages = (Array.isArray(found) ? found : [])
        .filter((p) => (seenIds.has(p.id) ? false : (seenIds.add(p.id), true)))
        .slice(0, MAX_PASSAGES_PER_CLAIM);

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

      // (5) ocena stanowisk (model) i (6) bramka cytatów (kod)
      let accepted: ReturnType<typeof validateCitations>['accepted'] = [];
      let rejectedCount = 0;
      if (sent.length > 0) {
        const assessed = await llm.assessPassages({ claim, passages: sent.map((p) => ({ id: p.id, text: p.text })) });
        addUsage(usage, assessed.usage);
        const gate = validateCitations(Array.isArray(assessed.assessments) ? assessed.assessments : [], sent, {
          flaggedPassageIds: flagged,
        });
        accepted = gate.accepted;
        rejectedCount = gate.rejected.length;
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

      // (7) werdykt i siła (kod)
      const ruleEvidence: RuleEvidence[] = accepted.map((a) => ({
        passageId: a.passage.id,
        documentId: a.passage.documentId,
        stance: a.stance,
        source: a.passage.meta,
        archival: isArchival(a.passage.meta, nowDate, archivalMonths),
        rank: a.rank,
      }));
      const decision = decideVerdict(claim.kind, ruleEvidence);
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

      const limitations: string[] = [scope];
      if (ruleEvidence.some((e) => e.archival)) {
        limitations.push(archivalLimitation(archivalMonths));
        for (const e of ruleEvidence)
          if (e.archival) notices.push({ type: 'material_archiwalny', text: archivalNotice(archivalMonths), passageId: e.passageId });
      }
      if (decision.aligned.some((e) => e.source.sourceType !== 'prawo' && !e.source.publishedAt))
        limitations.push(UNDATED_LIMITATION);
      const flaggedHere = passages.filter((p) => flagged.has(p.id)).length;
      if (flaggedHere > 0) limitations.push(injectionLimitation(flaggedHere));

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
        }),
        explanationSource: 'szablon',
        evidence,
        limitations,
        refutation: noRefutation(),
      };
      if (decision.abstain) {
        abstainCodes.set(claim.id, decision.abstain);
        result.abstainReason = abstainReasonText(decision.abstain, passages.length, rejectedCount);
        // W5: flaga eskalacji (samo powiadomienie moderatora to późniejsze zadanie).
        limitations.push(ESCALATION_LIMITATION);
      }
      results.push(result);
    }

    // (8) zapis rekordu
    const createdAt = new Date(started).toISOString();
    const asOf = resolveAsOf(searcher, createdAt);
    const record: VerificationRecord = {
      id: recordId,
      inputHash: sha256Hex(prepared.normalizedInput),
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
        return { kind: 'record', record: existing, cached: true };
      }
    }
    store.logEvent('verify_ok', {
      recordId,
      channel,
      detail: {
        claims: results.length,
        verdicts: results.map((r) => r.verdict),
        llmCalls: usage.llmCalls,
        injectionEvents,
      },
    });
    return { kind: 'record', record, cached: false };
  }

  return {
    async verify(input) {
      try {
        return await run(input);
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
