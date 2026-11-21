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
  search(query: string, opts?: SearchOptions): Promise<Passage[]>;
  getPassage(id: string): Passage | null;
  stats(): CorpusStats;
}
