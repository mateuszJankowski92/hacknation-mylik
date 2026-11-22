// Składanie drugiej kontroli z konfiguracji (zad. 45). Osobny plik, żeby moduł kroku (secondCheck.ts)
// nie zależał od SDK dostawców.
import { AnthropicProvider } from '../llm/anthropic';
import { JevClient, JevSupportGate, jevConfigFromEnv } from '../llm/jev';
import { sameModel, secondCheckConfigFromEnv, type SecondCheck } from './secondCheck';
import type { SupportGate } from './supportGate';

/**
 * Druga kontrola z SECOND_CHECK* albo `null` (wyłączona, brak klucza, ten sam model co ocena).
 * Jev: bez zapasu w modelu oceny; niepewna lub nieudana odpowiedź Jeva = druga kontrola niedostępna
 * (dowody bez zmian, nota), nigdy cicha zmiana.
 */
export function createSecondCheckFromEnv(
  mainModel: string,
  env: Record<string, string | undefined> = process.env,
  warn: (line: string) => void = console.warn,
): SecondCheck | null {
  const cfg = secondCheckConfigFromEnv(env);
  if (!cfg.enabled) return null;
  let gate: SupportGate;
  let model: string;
  if (cfg.provider === 'jev') {
    const jev = jevConfigFromEnv(env);
    if (!jev.apiKey) {
      warn('Uwaga: SECOND_CHECK=on z dostawcą jev bez JEV_API_KEY; druga kontrola wyłączona.');
      return null;
    }
    model = cfg.model || jev.model;
    const client = new JevClient({ apiKey: jev.apiKey, model, timeoutMs: Math.min(jev.timeoutMs, cfg.timeoutMs) });
    const fallback: SupportGate = {
      name: 'brak-zapasu',
      checkSupport: async () => {
        throw new Error('jev: brak pewnej odpowiedzi');
      },
    };
    gate = new JevSupportGate({ client, fallback, minConfidence: jev.minConfidence, onEvent: () => {} });
  } else {
    const apiKey = env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      warn('Uwaga: SECOND_CHECK=on bez ANTHROPIC_API_KEY; druga kontrola wyłączona.');
      return null;
    }
    model = cfg.model;
    gate = new AnthropicProvider({ apiKey, model });
  }
  if (sameModel(model, mainModel)) {
    warn(`Uwaga: model drugiej kontroli (${model}) jest taki sam jak model oceny; druga kontrola wyłączona.`);
    return null;
  }
  return { model, gate, timeoutMs: cfg.timeoutMs };
}
