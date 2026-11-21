import type { Passage } from './source';

export interface SearchOptions {
  limit?: number;
}

export interface CorpusStats {
  documents: number;
  domains: number;
  sourceTypes: number;
}

export interface Searcher {
  corpusVersion(): string;
  /**
   * Stan korpusu na: moment (ISO datetime z przesunięciem) ostatniego pobrania dokumentu,
   * albo null, gdy korpus pusty. Opcjonalne; brak => silnik użyje czasu sprawdzenia.
   */
  asOf?(): string | null;
  search(query: string, opts?: SearchOptions): Promise<Passage[]>;
  getPassage(id: string): Passage | null;
  stats(): CorpusStats;
}
