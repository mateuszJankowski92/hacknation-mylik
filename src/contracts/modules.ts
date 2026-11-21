// Sygnatury fabryk implementowanych przez zadania równoległe (tylko typy):
// zad. 01: src/corpus/index.ts  export function createSearcher(db: DatabaseSync): Searcher
// zad. 02: src/llm/index.ts     export function createLlmProvider(cfg: AppConfig): LlmProvider
// zad. 05: src/input/index.ts   export function prepareInput(input: VerifyInput): PreparedInput | NeedsClarification
//                               export function maskPii(text: string): { text: string; masks: PiiMask[] }
// zad. 03: src/engine/index.ts  export function createEngine(deps: EngineDeps): Engine
import type { DatabaseSync } from 'node:sqlite';
import type { LlmProvider } from './llm';
import type { InputKind, PiiMask, VerificationRecord, VerifyInput, VerifyOutcome } from './record';
import type { Searcher } from './search';

export interface PreparedInput {
  kind: InputKind;
  /** Po maskowaniu i normalizacji; wejście do skrótu rekordu. */
  normalizedInput: string;
  maskedInput: string;
  masks: PiiMask[];
  urlInfo?: { host: string; url: string };
}

export interface NeedsClarification {
  needsClarification: true;
  message: string;
}

export interface MaskResult {
  text: string;
  masks: PiiMask[];
}

export interface EngineDeps {
  db: DatabaseSync;
  searcher: Searcher;
  llm: LlmProvider;
  now?: () => Date;
}

export interface Engine {
  verify(input: VerifyInput): Promise<VerifyOutcome>;
  getRecord(id: string): VerificationRecord | null;
}

export type CreateSearcher = (db: DatabaseSync) => Searcher;
export type PrepareInput = (input: VerifyInput) => PreparedInput | NeedsClarification;
export type MaskPii = (text: string) => MaskResult;
export type CreateEngine = (deps: EngineDeps) => Engine;
