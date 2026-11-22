// Fabryka silnika weryfikacji. Kanały (WWW, SMS) wołają tylko `engine.verify` i renderują rekord.
import type { Engine } from '../contracts/index';
import { prepareInput } from '../input/index';
import { DEFAULT_EVAL_RESULTS_PATH } from './errorProfile';
import { createPageFetcher } from './fetch/index';
import { createEngineCore, type EngineDeps } from './pipeline';
import { defaultRenderer } from './render';
import { createFactcheckFromEnv, factcheckRecordTtlHours } from '../factcheck/index';

export type { EngineDeps, EngineExtraDeps, EngineOptions, EngineTraceEvent, PrepareFn } from './pipeline';
export {
  createEngineCore,
  counterQuery,
  DEFAULT_DEADLINE_MS,
  MAX_ASSESS,
  MAX_CLAIMS,
  MAX_COUNTER_PASSAGES,
  MAX_PASSAGES_PER_CLAIM,
  searchQuery,
  splitEven,
} from './pipeline';
export { decideVerdict, computeStrength, isArchival, isExpired } from './rules';
export { validateCitations } from './citations';
export { applySupportGate, type SupportGateStats } from './pipeline';
export {
  isSupportGate,
  SUPPORT_RELATIONS,
  type SupportCheckRequest,
  type SupportCheckResult,
  type SupportCheckVerdict,
  type SupportGate,
  type SupportRelation,
} from './supportGate';
export { detectInjectionSignals, stripInjectedSegments } from './injection';
export {
  forQueries,
  fuseRankings,
  isPassageRanker,
  orderByRanking,
  type PassageRanker,
  type RankRequest,
  type RankResult,
} from './ranker';
export { createPageFetcher, type PageFetcher, type PageFetchResult, type Resolver, type Transport } from './fetch/index';
export { incidentMatcherFromRecords, loadIncidentMatcher, type IncidentMatcher } from './incidents';
export {
  DEFAULT_EVAL_RESULTS_PATH,
  loadErrorProfileTable,
  loadVerifiedErrorProfile,
  MIN_PROFILE_BUCKET,
  parseErrorProfileTable,
  verifiedErrorProfile,
  type ErrorProfileMeta,
} from './errorProfile';
export { computeEngineFingerprint, engineFingerprint } from './fingerprint';
export { llmModelName } from './pipeline';
export { defaultRenderer, type EngineRenderer } from './render';

/**
 * Domyślne zależności produkcyjne: prawdziwe `prepareInput`, pobieranie stron z ochroną SSRF,
 * moduł zdań src/render, profil błędów z `EVAL_RESULTS_PATH` albo data/eval/results.json.
 * Baza incydentów jest opcjonalna (`incidents`, np. `loadIncidentMatcher()`).
 */
import { createSecondCheckFromEnv } from './secondCheckFactory';
import { llmModelName as modelNameOf } from './pipeline';

export function createEngine(deps: EngineDeps): Engine {
  const errorProfilePath = deps.options?.errorProfilePath ?? process.env.EVAL_RESULTS_PATH ?? DEFAULT_EVAL_RESULTS_PATH;
  return createEngineCore({
    ...deps,
    prepare: deps.prepare ?? prepareInput,
    fetchPage: deps.fetchPage ?? createPageFetcher(),
    renderer: deps.renderer ?? defaultRenderer,
    // Indeks weryfikacji redakcji: z konfiguracji i środowiska (FACTCHECK_LAYER, GOOGLE_FACTCHECK_API_KEY);
    // `null` w zależnościach wyłącza go jawnie.
    factcheck: deps.factcheck !== undefined ? deps.factcheck : createFactcheckFromEnv(),
    // Druga kontrola cytatów innym modelem (zad. 45): SECOND_CHECK=on, domyślnie wyłączona.
    secondCheck: deps.secondCheck !== undefined ? deps.secondCheck : createSecondCheckFromEnv(modelNameOf(deps.llm)),
    options: {
      // Rekordy z wpisami z indeksu Google: krótki czas życia (warunki API), FACTCHECK_RECORD_TTL_HOURS.
      indexRecordTtlMs: factcheckRecordTtlHours() * 3_600_000,
      ...deps.options,
      errorProfilePath,
    },
  });
}
