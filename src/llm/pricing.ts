/**
 * Ceny modeli Anthropic (USD za 1 mln tokenów, pierwsza strona API, bez cache i batch).
 * Źródło: tabela "Current Models" w skillu `claude-api` (stan z 2026-11-03),
 * spisana 2026-11-21. Przed budżetowaniem sprawdź aktualny cennik Anthropic.
 *
 * Claude Haiku 5.5 ma dwa cenniki zależnie od długości promptu:
 * do 100 tys. tokenów wejścia 0,10 / 0,50; powyżej 0,50 / 2,50.
 */
export interface ModelPrice {
  inputPerMTok: number;
  outputPerMTok: number;
  /** Opcjonalny droższy cennik dla promptów dłuższych niż `longPromptThreshold` tokenów. */
  longPrompt?: { threshold: number; inputPerMTok: number; outputPerMTok: number };
}

export const PRICING_AS_OF = '2026-11-03';

export const ANTHROPIC_PRICES: Readonly<Record<string, ModelPrice>> = {
  'claude-haiku-5-5': {
    inputPerMTok: 0.1,
    outputPerMTok: 0.5,
    longPrompt: { threshold: 100_000, inputPerMTok: 0.5, outputPerMTok: 2.5 },
  },
  'claude-haiku-4-5': { inputPerMTok: 1, outputPerMTok: 5 },
  'claude-sonnet-5-5': { inputPerMTok: 2, outputPerMTok: 10 },
  'claude-sonnet-5': { inputPerMTok: 2, outputPerMTok: 10 },
  'claude-sonnet-4-6': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-opus-5-5': { inputPerMTok: 4, outputPerMTok: 20 },
  'claude-opus-5': { inputPerMTok: 5, outputPerMTok: 25 },
  'claude-opus-4-8': { inputPerMTok: 5, outputPerMTok: 25 },
  'claude-opus-4-7': { inputPerMTok: 5, outputPerMTok: 25 },
  'claude-opus-4-6': { inputPerMTok: 5, outputPerMTok: 25 },
  'claude-fable-5-2': { inputPerMTok: 8, outputPerMTok: 40 },
  'claude-fable-5-1': { inputPerMTok: 10, outputPerMTok: 50 },
  'claude-fable-5': { inputPerMTok: 10, outputPerMTok: 50 },
};

/** Dla modelu spoza tabeli liczymy ostrożnie po najdroższej znanej stawce (zawyżenie, nigdy fałszywe zero). */
const FALLBACK_PRICE: ModelPrice = { inputPerMTok: 10, outputPerMTok: 50 };

/** Szacunkowy koszt jednego wywołania w USD. */
export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = ANTHROPIC_PRICES[model] ?? FALLBACK_PRICE;
  const tier =
    price.longPrompt && inputTokens > price.longPrompt.threshold ? price.longPrompt : price;
  return (inputTokens * tier.inputPerMTok + outputTokens * tier.outputPerMTok) / 1_000_000;
}
