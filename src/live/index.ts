// Druga warstwa źródeł (zad. 29): szukanie na żywo na zamkniętej, jawnej liście serwisów.
// Domyślnie wyłączona (LIVE_LAYER=off); silnik działa wtedy jak dotąd.
import { createPageFetcher } from '../engine/fetch/index';
import { createLiveLayer, DEFAULT_LIVE_BUDGET_MS, type LiveLayer } from './layer';
import { AnthropicLiveSearcher } from './search';
import { loadLiveSources } from './sources';

export * from './layer';
export * from './search';
export * from './sources';
export * from './text';

/** Limit czasu pobrania jednej strony drugiej warstwy (krótszy niż dla adresu od obywatela). */
export const LIVE_PAGE_TIMEOUT_MS = 5_000;
export const LIVE_PAGE_MAX_CHARS = 40_000;

export interface ProductionLiveOptions {
  sourcesPath: string;
  apiKey?: string;
  model?: string;
  budgetMs?: number;
}

/** Warstwa produkcyjna: wyszukiwarka Anthropic (web_search) + bezpieczny pobieracz stron. */
export function createProductionLiveLayer(opts: ProductionLiveOptions): LiveLayer {
  return createLiveLayer({
    sources: loadLiveSources(opts.sourcesPath),
    searcher: new AnthropicLiveSearcher({ apiKey: opts.apiKey, model: opts.model }),
    fetchPage: createPageFetcher({ timeoutMs: LIVE_PAGE_TIMEOUT_MS, maxTextChars: LIVE_PAGE_MAX_CHARS }),
    budgetMs: opts.budgetMs ?? DEFAULT_LIVE_BUDGET_MS,
  });
}
