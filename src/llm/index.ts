/**
 * Fabryka dostawców modelu. Silnik zna tylko interfejs `LlmProvider`.
 *
 * - `mock` (domyślny): deterministyczny, bez sieci i klucza.
 * - `anthropic`: oficjalne SDK; brak klucza NIE wywraca tworzenia, tylko pierwsze
 *   wywołanie rzuca `LlmError('no_key')` (silnik zamienia to na stan techniczny).
 * - `mistral`: miejsce na trzeciego dostawcę (implementacja `LlmProvider` w `src/llm/mistral.ts`
 *   i jedna gałąź poniżej; silnik bez zmian). Na razie błąd konfiguracji.
 *
 * Bramka wsparcia (zad. 30): SUPPORT_GATE_PROVIDER=basal + BASAL_URL podmienia bramkę dostawcy na Basal
 * z automatycznym zapasem w bramce dostawcy (src/llm/basal.ts). Domyślnie wyłączone.
 * SUPPORT_GATE_PROVIDER=jev + JEV_API_KEY robi to samo z Jevem (src/llm/jev.ts), zapas także przy niskiej pewności.
 */
import type { AppConfig } from '../config';
import type { LlmProvider } from '../contracts/llm';
import { AnthropicProvider } from './anthropic';
import { applySupportGateConfig, supportGateConfigFromEnv } from './basal';
import { applyJevSupportGateConfig, jevConfigFromEnv } from './jev';
import { MockLlmProvider } from './mock';

export { AnthropicProvider, DEFAULT_ANTHROPIC_MODEL, mapAnthropicError } from './anthropic';
export { MockLlmProvider } from './mock';
export { looksLikeInjection } from './sanitize';
export {
  BasalClient,
  BasalError,
  BasalSupportGate,
  FallbackSupportGate,
  applySupportGateConfig,
  supportGateConfigFromEnv,
  withSupportGate,
  type BasalGateEvent,
} from './basal';
export {
  JevClient,
  JevError,
  JevSupportGate,
  applyJevSupportGateConfig,
  createJevStats,
  jevConfigFromEnv,
  type JevGateEvent,
  type JevStats,
} from './jev';

/** Błąd konfiguracji dostawcy (nieznana nazwa, niezaimplementowany dostawca). Bez sekretów w treści. */
export class LlmConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmConfigError';
  }
}

export function createLlmProvider(
  cfg: Pick<AppConfig, 'llmProvider' | 'anthropicApiKey' | 'anthropicModel'>,
  env: Record<string, string | undefined> = process.env,
): LlmProvider {
  const withBasal = applySupportGateConfig(createBaseProvider(cfg), supportGateConfigFromEnv(env));
  return applyJevSupportGateConfig(withBasal, jevConfigFromEnv(env));
}

function createBaseProvider(cfg: Pick<AppConfig, 'llmProvider' | 'anthropicApiKey' | 'anthropicModel'>): LlmProvider {
  const name = String(cfg.llmProvider ?? 'mock');
  switch (name) {
    case 'mock':
      return new MockLlmProvider();
    case 'anthropic':
      return new AnthropicProvider({ apiKey: cfg.anthropicApiKey, model: cfg.anthropicModel });
    case 'mistral':
      throw new LlmConfigError('Dostawca "mistral" nie jest jeszcze zaimplementowany. Ustaw LLM_PROVIDER=mock lub anthropic.');
    default:
      throw new LlmConfigError(
        `Nieznany dostawca modelu w LLM_PROVIDER: "${name.slice(0, 40)}". Dozwolone: mock, anthropic.`,
      );
  }
}
