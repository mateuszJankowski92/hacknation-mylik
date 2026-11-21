import { createHash } from 'node:crypto';
import { z } from 'zod';
import { ExtractedClaimSchema } from './claim';
import { SourceMetaSchema } from './source';
import {
  StanceSchema,
  StateSchema,
  StrengthLevelSchema,
  StrengthReasonCodeSchema,
  VerdictSchema,
} from './verdict';

export const INPUT_KINDS = ['tekst', 'url'] as const;
export const InputKindSchema = z.enum(INPUT_KINDS);
export type InputKind = z.infer<typeof InputKindSchema>;

/** Kanał wejścia. NIE jest częścią rekordu ani klucza (T9); trafia tylko do logu zdarzeń. */
export const CHANNELS = ['www', 'sms'] as const;
export const ChannelSchema = z.enum(CHANNELS);
export type Channel = z.infer<typeof ChannelSchema>;

export const EvidenceItemSchema = z.object({
  passageId: z.string().min(1),
  stance: StanceSchema,
  /** Dosłowny cytat (podciąg fragmentu), sprawdzony przez kod. */
  quote: z.string(),
  /** Metadane wstawione przez kod z bazy, nigdy przez model. */
  source: SourceMetaSchema,
  archival: z.boolean(),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const StrengthSchema = z.object({
  level: StrengthLevelSchema,
  reasons: z.array(StrengthReasonCodeSchema),
});
export type Strength = z.infer<typeof StrengthSchema>;

/** Kto złożył uzasadnienie. Na razie zawsze `szablon` (kod z szablonów). */
export const EXPLANATION_SOURCES = ['szablon', 'model'] as const;
export const ExplanationSourceSchema = z.enum(EXPLANATION_SOURCES);
export type ExplanationSource = z.infer<typeof ExplanationSourceSchema>;

export const ClaimResultSchema = z.object({
  claim: ExtractedClaimSchema,
  verdict: VerdictSchema,
  strength: StrengthSchema,
  /** Uzasadnienie po polsku, składane przez kod z szablonów. */
  explanation: z.string(),
  explanationSource: ExplanationSourceSchema,
  evidence: z.array(EvidenceItemSchema),
  limitations: z.array(z.string()),
  abstainReason: z.string().optional(),
});
export type ClaimResult = z.infer<typeof ClaimResultSchema>;

/** Neutralne ostrzeżenia, które nie są werdyktem. */
export const NOTICE_TYPES = [
  'material_archiwalny',
  'status_zrodla',
  'dopasowanie_incydentu',
  'ograniczenie_techniczne',
] as const;
export const NoticeTypeSchema = z.enum(NOTICE_TYPES);
export type NoticeType = z.infer<typeof NoticeTypeSchema>;

export const NoticeSchema = z.object({
  type: NoticeTypeSchema,
  text: z.string(),
  passageId: z.string().optional(),
});
export type Notice = z.infer<typeof NoticeSchema>;

export const PiiMaskSchema = z.object({
  type: z.string(),
  count: z.number().int().nonnegative(),
});
export type PiiMask = z.infer<typeof PiiMaskSchema>;

export const RecordUsageSchema = z.object({
  llmCalls: z.number().int().nonnegative(),
  inputTokens: z.number().nonnegative(),
  outputTokens: z.number().nonnegative(),
  estimatedCostUsd: z.number().nonnegative(),
  latencyMs: z.number().nonnegative(),
});
export type RecordUsage = z.infer<typeof RecordUsageSchema>;

export const VerificationRecordSchema = z.object({
  /** Klucz rekordu: `computeRecordKey(normalizedInput, corpusVersion)`. */
  id: z.string().regex(/^[0-9a-f]{64}$/),
  /** SHA-256 hex znormalizowanego, zamaskowanego wejścia. */
  inputHash: z.string().regex(/^[0-9a-f]{64}$/),
  corpusVersion: z.string().min(1),
  inputKind: InputKindSchema,
  maskedInput: z.string(),
  piiMasked: z.array(PiiMaskSchema),
  claims: z.array(ClaimResultSchema),
  notices: z.array(NoticeSchema).default([]),
  injectionSignals: z.array(z.string()),
  createdAt: z.iso.datetime({ offset: true }),
  provider: z.string(),
  usage: RecordUsageSchema,
  schemaVersion: z.literal(1),
});
export type VerificationRecord = z.infer<typeof VerificationRecordSchema>;

export const VerifyInputSchema = z
  .object({
    text: z.string().optional(),
    url: z.string().optional(),
    channel: ChannelSchema,
  })
  .refine((v) => (v.text !== undefined) !== (v.url !== undefined), {
    message: 'Podaj dokładnie jedno: tekst albo adres URL.',
  });
export type VerifyInput = z.infer<typeof VerifyInputSchema>;

export const VerifyOutcomeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('record'), record: VerificationRecordSchema, cached: z.boolean() }),
  z.object({
    kind: z.literal('state'),
    state: StateSchema,
    /** Komunikat po polsku dla obywatela. */
    message: z.string(),
    /** Szczegół techniczny, bez sekretów. */
    detail: z.string().optional(),
  }),
]);
export type VerifyOutcome = z.infer<typeof VerifyOutcomeSchema>;

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Klucz rekordu: sha256 hex z `normalizedInput + "\n" + corpusVersion`. */
export function computeRecordKey(normalizedInput: string, corpusVersion: string): string {
  return sha256Hex(`${normalizedInput}\n${corpusVersion}`);
}
