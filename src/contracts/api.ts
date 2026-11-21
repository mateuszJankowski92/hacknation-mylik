import { z } from 'zod';
import { VerificationRecordSchema, VerifyInputSchema, VerifyOutcomeSchema } from './record';
import { SourceMetaSchema } from './source';

/** Ścieżki HTTP wspólne dla serwera i interfejsu. */
export const API_PATHS = {
  verify: '/api/verify',
  record: '/api/records/:id',
  sources: '/api/sources',
  health: '/api/health',
} as const;

export const recordPath = (id: string): string => `/api/records/${encodeURIComponent(id)}`;

/** POST /api/verify: body (kanał `www` wymusza serwer). */
export const VerifyRequestSchema = VerifyInputSchema;
/** POST /api/verify: 200. */
export const VerifyResponseSchema = VerifyOutcomeSchema;

export const API_ERROR_CODES = ['niepoprawne_wejscie', 'limit_zadan', 'nie_znaleziono'] as const;
export const ApiErrorSchema = z.object({
  error: z.enum(API_ERROR_CODES),
  message: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

/** GET /api/records/:id: 200 (404 => ApiError `nie_znaleziono`). */
export const RecordResponseSchema = VerificationRecordSchema;

/** GET /api/sources: 200. */
export const SourcesResponseSchema = z.object({
  corpusVersion: z.string(),
  documents: z.array(SourceMetaSchema),
});
export type SourcesResponse = z.infer<typeof SourcesResponseSchema>;

/** GET /api/health: 200. */
export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  provider: z.string(),
  corpusVersion: z.string(),
  documents: z.number().int().nonnegative(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
