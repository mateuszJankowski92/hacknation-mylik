// Fabryka silnika weryfikacji. Kanały (WWW, SMS) wołają tylko `engine.verify` i renderują rekord.
import type { Engine } from '../contracts/index';
import { prepareInput } from '../input/index';
import { DEFAULT_EVAL_RESULTS_PATH } from './errorProfile';
import { createPageFetcher } from './fetch/index';
import { createEngineCore, type EngineDeps } from './pipeline';
import { defaultRenderer } from './render';

export type { EngineDeps, EngineExtraDeps, EngineOptions, PrepareFn } from './pipeline';
export { createEngineCore, counterQuery, MAX_CLAIMS, MAX_COUNTER_PASSAGES, MAX_PASSAGES_PER_CLAIM, searchQuery } from './pipeline';
export { decideVerdict, computeStrength, isArchival, isExpired } from './rules';
export { validateCitations } from './citations';
export { detectInjectionSignals, stripInjectedSegments } from './injection';
export { createPageFetcher, type PageFetcher, type PageFetchResult, type Resolver, type Transport } from './fetch/index';
export { incidentMatcherFromRecords, loadIncidentMatcher, type IncidentMatcher } from './incidents';
export { DEFAULT_EVAL_RESULTS_PATH, loadErrorProfileTable, parseErrorProfileTable } from './errorProfile';
export { defaultRenderer, type EngineRenderer } from './render';

/**
 * Domyślne zależności produkcyjne: prawdziwe `prepareInput`, pobieranie stron z ochroną SSRF,
 * moduł zdań src/render, profil błędów z `EVAL_RESULTS_PATH` albo data/eval/results.json.
 * Baza incydentów jest opcjonalna (`incidents`, np. `loadIncidentMatcher()`).
 */
export function createEngine(deps: EngineDeps): Engine {
  const errorProfilePath = deps.options?.errorProfilePath ?? process.env.EVAL_RESULTS_PATH ?? DEFAULT_EVAL_RESULTS_PATH;
  return createEngineCore({
    ...deps,
    prepare: deps.prepare ?? prepareInput,
    fetchPage: deps.fetchPage ?? createPageFetcher(),
    renderer: deps.renderer ?? defaultRenderer,
    options: { ...deps.options, errorProfilePath },
  });
}
