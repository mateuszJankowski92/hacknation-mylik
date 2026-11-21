// Fabryka silnika weryfikacji. Kanały (WWW, SMS) wołają tylko `engine.verify` i renderują rekord.
import type { Engine } from '../contracts/index';
import { prepareInput } from '../input/index';
import { createEngineCore, type EngineDeps } from './pipeline';

export type { EngineDeps, EngineOptions, PrepareFn } from './pipeline';
export { createEngineCore, MAX_CLAIMS, MAX_PASSAGES_PER_CLAIM } from './pipeline';
export { decideVerdict, computeStrength, isArchival } from './rules';
export { validateCitations } from './citations';
export { detectInjectionSignals } from './injection';

// Miejsca na późniejsze zadania: powiadomienie moderatora (W5), limit żądań, retencja rekordów.
export function createEngine(deps: EngineDeps): Engine {
  return createEngineCore({ ...deps, prepare: deps.prepare ?? prepareInput });
}
