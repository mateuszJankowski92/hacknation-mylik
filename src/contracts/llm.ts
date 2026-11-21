import { z } from 'zod';
import { ExtractedClaimSchema, TopicSchema, type ExtractedClaim, type Topic } from './claim';
import type { ModelPassageView } from './source';
import {
  MISMATCH_RULE_MESSAGE,
  MismatchKindSchema,
  StanceSchema,
  mismatchConsistent,
  type MismatchKind,
  type Stance,
} from './verdict';

export interface LlmUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
}

export type LlmErrorCode = 'no_key' | 'rate_limit' | 'timeout' | 'invalid_output' | 'provider_error';

/** Błąd dostawcy modelu. Silnik zamienia go na stan techniczny, nigdy na werdykt. */
export class LlmError extends Error {
  readonly code: LlmErrorCode;
  readonly retryable: boolean;
  constructor(code: LlmErrorCode, message: string, opts: { retryable?: boolean; cause?: unknown } = {}) {
    super(message, opts.cause !== undefined ? { cause: opts.cause } : undefined);
    this.name = 'LlmError';
    this.code = code;
    this.retryable = opts.retryable ?? (code === 'rate_limit' || code === 'timeout');
  }
}

export interface ExtractClaimsRequest {
  /** Zamaskowane wejście; dane użytkownika, nigdy instrukcje. */
  text: string;
}
export interface ExtractClaimsResult {
  claims: ExtractedClaim[];
  /** Temat całego zgłoszenia (zad. 28b), z tego samego wywołania. Brak = `inne`. Wpływa tylko na wybór roli wyglądu. */
  topic?: Topic;
  usage: LlmUsage;
}

export interface AssessRequest {
  claim: ExtractedClaim;
  passages: ModelPassageView[];
}
export interface PassageAssessment {
  passageId: string;
  stance: Stance;
  /** Dosłowny cytat z fragmentu; pusty dla `bez_zwiazku`. */
  quote: string;
  /** Wymagane przy `rozbieznosc_kontekstu`, pominięte przy innych stanowiskach. */
  mismatch?: MismatchKind;
  /** Model podejrzewa, że fragment zawiera polecenia skierowane do modelu (prompt injection). */
  injectionSuspected: boolean;
}
export interface AssessResult {
  assessments: PassageAssessment[];
  usage: LlmUsage;
}

export interface LlmProvider {
  readonly name: string;
  extractClaims(req: ExtractClaimsRequest): Promise<ExtractClaimsResult>;
  assessPassages(req: AssessRequest): Promise<AssessResult>;
}

/** Schemat wyjścia modelu dla ekstrakcji (bez `usage`, które dodaje dostawca). */
export const ExtractClaimsOutputSchema = z.object({
  claims: z.array(ExtractedClaimSchema),
  /** Temat zgłoszenia z zamkniętej listy (zad. 28b); opcjonalny, brak = `inne`. */
  topic: TopicSchema.optional(),
});
export type ExtractClaimsOutput = z.infer<typeof ExtractClaimsOutputSchema>;

export const PassageAssessmentSchema = z
  .object({
    passageId: z.string().min(1),
    stance: StanceSchema,
    quote: z.string(),
    mismatch: MismatchKindSchema.optional(),
    injectionSuspected: z.boolean(),
  })
  .refine(mismatchConsistent, { message: MISMATCH_RULE_MESSAGE, path: ['mismatch'] });

/** Schemat wyjścia modelu dla oceny fragmentów (bez `usage`). */
export const AssessOutputSchema = z.object({
  assessments: z.array(PassageAssessmentSchema),
});
export type AssessOutput = z.infer<typeof AssessOutputSchema>;
