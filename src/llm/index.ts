/**
 * Fabryka dostawców modelu. Silnik zna tylko interfejs `LlmProvider`.
 *
 * - `mock` (domyślny): deterministyczny, bez sieci i klucza.
 * - `anthropic`: oficjalne SDK; brak klucza NIE wywraca tworzenia, tylko pierwsze
 *   wywołanie rzuca `LlmError('no_key')` (silnik zamienia to na stan techniczny).
 * - `mistral`: miejsce na trzeciego dostawcę (implementacja `LlmProvider` w `src/llm/mistral.ts`
 *   i jedna gałąź poniżej; silnik bez zmian). Na razie błąd konfiguracji.
 */
import type { AppConfig } from '../config';
import type { LlmProvider } from '../contracts/llm';
import { AnthropicProvider } from './anthropic';
import { MockLlmProvider } from './mock';

export { AnthropicProvider, DEFAULT_ANTHROPIC_MODEL, mapAnthropicError } from './anthropic';
export { MockLlmProvider } from './mock';
export { looksLikeInjection } from './sanitize';

/** Błąd konfiguracji dostawcy (nieznana nazwa, niezaimplementowany dostawca). Bez sekretów w treści. */
export class LlmConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmConfigError';
  }
}

export function createLlmProvider(cfg: Pick<AppConfig, 'llmProvider' | 'anthropicApiKey' | 'anthropicModel'>): LlmProvider {
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
