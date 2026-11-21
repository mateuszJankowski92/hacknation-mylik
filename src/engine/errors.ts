// Mapowanie wyjątków na stany niebędące werdyktami. Wyjątek NIGDY nie kończy się werdyktem.
import { LlmError, type State, type VerifyOutcome } from '../contracts/index';
import { MESSAGES } from './explain';

/** Błąd wyszukiwarki (opakowany przez potok), mapowany na `brak_mozliwosci_sprawdzenia`. */
export class SearchFailure extends Error {
  constructor(cause: unknown) {
    super('search_failed', { cause });
    this.name = 'SearchFailure';
  }
}

export function stateOutcome(state: State, message: string, detail?: string): VerifyOutcome {
  return detail === undefined ? { kind: 'state', state, message } : { kind: 'state', state, message, detail };
}

/**
 * Szczegół techniczny bez sekretów i bez treści zgłoszenia: tylko kod/nazwa klasy błędu,
 * nigdy `message` (komunikaty bibliotek mogą zawierać fragmenty żądania lub klucze).
 */
export function isLlmError(err: unknown): err is LlmError {
  return (
    err instanceof LlmError ||
    (err instanceof Error && err.name === 'LlmError' && typeof (err as { code?: unknown }).code === 'string')
  );
}

const LLM_CODES = new Set(['no_key', 'rate_limit', 'timeout', 'invalid_output', 'provider_error']);

export function technicalDetail(err: unknown): string {
  if (isLlmError(err)) return `llm:${LLM_CODES.has(err.code) ? err.code : 'provider_error'}`;
  if (err instanceof SearchFailure) return 'search:failed';
  if (err instanceof Error) return `unexpected:${err.name.replace(/[^A-Za-z0-9_]/g, '').slice(0, 40) || 'Error'}`;
  return 'unexpected:unknown';
}

export function errorToOutcome(err: unknown): VerifyOutcome {
  if (err instanceof SearchFailure)
    return stateOutcome('brak_mozliwosci_sprawdzenia', MESSAGES.searchFailed, technicalDetail(err));
  return stateOutcome('awaria_techniczna', MESSAGES.technical, technicalDetail(err));
}
