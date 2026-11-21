import { z } from 'zod';
import { ExtractedClaimSchema } from './claim';
import { SourceMetaSchema } from './source';
import {
  MISMATCH_RULE_MESSAGE,
  MismatchKindSchema,
  mismatchConsistent,
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

export const EvidenceItemSchema = z
  .object({
    passageId: z.string().min(1),
    stance: StanceSchema,
    /** Rodzaj rozbieżności; wymagany przy `rozbieznosc_kontekstu`. */
    mismatch: MismatchKindSchema.optional(),
    /** Dosłowny cytat (podciąg fragmentu), sprawdzony przez kod. */
    quote: z.string(),
    /** Metadane wstawione przez kod z bazy, nigdy przez model. */
    source: SourceMetaSchema,
    archival: z.boolean(),
  })
  .refine(mismatchConsistent, { message: MISMATCH_RULE_MESSAGE, path: ['mismatch'] });
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

/** Próba obalenia: czy wykonano wyszukiwanie twierdzenia przeciwnego, jakimi zapytaniami i ile znaleziono. */
export const RefutationSchema = z.object({
  performed: z.boolean(),
  queries: z.array(z.string()),
  found: z.number().int().nonnegative(),
});
export type Refutation = z.infer<typeof RefutationSchema>;

/** Wartość domyślna, gdy próby obalenia nie wykonano. */
export function noRefutation(): Refutation {
  return { performed: false, queries: [], found: 0 };
}

/** Profil błędów systemu dla koszyka podobnych twierdzeń (z ewaluacji): `errors` z `total`. */
export const ErrorProfileSchema = z
  .object({
    bucket: z.string().min(1),
    errors: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  })
  .refine((v) => v.errors <= v.total, { message: 'errors nie może przekraczać total', path: ['errors'] });
export type ErrorProfile = z.infer<typeof ErrorProfileSchema>;

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
  refutation: RefutationSchema,
  errorProfile: ErrorProfileSchema.optional(),
  /**
   * Bezpośrednia odpowiedź na pytanie rozstrzygające ("Tak.", "Nie.", "Częściowo.", "Nie udało mi się
   * tego potwierdzić."), z szablonu w kodzie (src/render/answer.ts), zgodna z etykietą. Brak = zgłoszenie
   * nie było pytaniem.
   */
  directAnswer: z.string().optional(),
  /** Przy braku dowodów: jakiego rodzaju dokument rozstrzygnąłby sprawę (ogólny szablon, bez szczegółów). */
  neededDocument: z.string().optional(),
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

/**
 * Rola wyglądu wyniku (zad. 28b): wybiera ją kod (src/roles), nie model. Zapisana w rekordzie, poza kluczem,
 * więc ten sam /r/<id> zawsze ma tę samą rolę. Nie wpływa na werdykt, siłę ani treść. Brak = `pogodynka`.
 */
export const ROLES = ['pogodynka', 'bibliotekarka', 'sport'] as const;
export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;
export const DEFAULT_ROLE: Role = 'pogodynka';

/** Wersja kontraktu rekordu. Rekordy w starszej wersji nie są odczytywane (liczone od nowa). */
export const RECORD_SCHEMA_VERSION = 2;
export const SHORT_ANSWER_MAX_CHARS = 320;

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
  /** Stan korpusu na (ISO datetime): każda odpowiedź jest datowana. */
  asOf: z.iso.datetime({ offset: true }),
  /** Krótka odpowiedź (np. SMS), składana przez kod; zawiera datę stanu. */
  shortAnswer: z.string().min(1).max(SHORT_ANSWER_MAX_CHARS),
  provider: z.string(),
  usage: RecordUsageSchema,
  /** Rola wyglądu (zad. 28b); opcjonalna dla zgodności ze starszymi rekordami v2 (brak = `pogodynka`). */
  role: RoleSchema.optional(),
  schemaVersion: z.literal(RECORD_SCHEMA_VERSION),
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
