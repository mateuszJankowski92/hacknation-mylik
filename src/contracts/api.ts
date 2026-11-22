import { z } from 'zod';
import { VerificationRecordSchema, VerifyInputSchema, VerifyOutcomeSchema } from './record';
import { SourceMetaSchema } from './source';

/** Ścieżki HTTP wspólne dla serwera i interfejsu. */
export const API_PATHS = {
  verify: '/api/verify',
  record: '/api/records/:id',
  sources: '/api/sources',
  health: '/api/health',
  /** POST, to samo ciało co `verify`; odpowiedź: Server-Sent Events (`progress`, na końcu `result`). */
  verifyStream: '/api/verify/stream',
  /** GET: mediana czasu ostatnich sprawdzeń. */
  verifyEta: '/api/verify/eta',
} as const;

export const recordPath = (id: string): string => `/api/records/${encodeURIComponent(id)}`;

/** POST /api/verify: body (kanał `www` wymusza serwer). */
export const VerifyRequestSchema = VerifyInputSchema;
/** POST /api/verify: 200. */
export const VerifyResponseSchema = VerifyOutcomeSchema;

/** `blad_serwera`: odpowiedź 500 (nie jest oceną zgłoszenia). */
export const API_ERROR_CODES = ['niepoprawne_wejscie', 'limit_zadan', 'nie_znaleziono', 'blad_serwera'] as const;
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
  /** Identyfikator modelu dostawcy (dla atrapy np. `mock`). */
  model: z.string(),
  corpusVersion: z.string(),
  documents: z.number().int().nonnegative(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

/**
 * Stanowisko fragmentu w zdarzeniu postępu (kody; teksty dla obywatela robi interfejs):
 * potwierdza -> to_samo, obala -> co_innego, rozbieznosc_kontekstu -> inna_data_lub_miejsce, kontekst -> tlo.
 */
export const PROGRESS_STANCES = ['to_samo', 'co_innego', 'inna_data_lub_miejsce', 'tlo'] as const;
export const ProgressStanceSchema = z.enum(PROGRESS_STANCES);
export type ProgressStance = z.infer<typeof ProgressStanceSchema>;

/** Numer twierdzenia (0..), którego dotyczy zdarzenie. */
const claimIndex = z.number().int().nonnegative();
const count = z.number().int().nonnegative();

/**
 * Zdarzenie postępu sprawdzania: tylko to, co silnik naprawdę zrobił (bez zegara).
 * Bez danych osobowych i bez treści; wydawca i data z bazy źródeł, nigdy od modelu.
 */
export const VerifyProgressEventSchema = z.discriminatedUnion('type', [
  /** Przeczytano zgłoszenie: liczba twierdzeń do sprawdzenia. */
  z.object({ type: z.literal('zgloszenie_przeczytane'), claims: count }),
  /** Znaleziono fragmenty "za" dla twierdzenia. */
  z.object({ type: z.literal('fragmenty_za'), claim: claimIndex, count }),
  /** Rozpoczęto szukanie źródeł mówiących co innego. */
  z.object({ type: z.literal('szukanie_przeciw_start'), claim: claimIndex }),
  /** Zakończono szukanie: liczba nowych fragmentów (spoza "za") dołączonych do oceny. */
  z.object({ type: z.literal('szukanie_przeciw_koniec'), claim: claimIndex, count }),
  /** Oceniono fragment (przyjęty przez bramkę cytatów). */
  z.object({
    type: z.literal('fragment_oceniony'),
    claim: claimIndex,
    publisher: z.string().max(60),
    publishedAt: z.iso.date().nullable(),
    stance: ProgressStanceSchema,
  }),
  /** Gotowe: identyfikator rekordu (`cached`: rekord z pamięci, bez ponownej oceny). */
  z.object({ type: z.literal('gotowe'), recordId: z.string().regex(/^[0-9a-f]{64}$/), cached: z.boolean() }),
]);
export type VerifyProgressEvent = z.infer<typeof VerifyProgressEventSchema>;

/**
 * Zad. 45: zdarzenia szczegółowe, wysyłane w strumieniu pod osobną nazwą (`progress_detail`), żeby
 * interfejs, który ich nie zna, działał bez zmian.
 */
export const VerifyProgressDetailEventSchema = z.discriminatedUnion('type', [
  /**
   * Zad. 45: liczby jednego twierdzenia zgodne z rekordem, po wszystkich kontrolach (przed złożeniem odpowiedzi).
   * `candidates`: fragmenty znalezione do sprawdzenia (za i przeciw), `passed`: dowody, które przeszły kontrolę
   * cytatów (wszystkie w rekordzie, także tło), `decisive`: z nich rozstrzygające (to samo / co innego /
   * inna data lub miejsce), `sources`: różne dokumenty wśród rozstrzygających (to liczy siła podstawy jako źródła).
   */
  z.object({ type: z.literal('twierdzenie_ocenione'), claim: claimIndex, candidates: count, passed: count, decisive: count, sources: count }),
  /** Zad. 45: druga kontrola innym modelem dla twierdzenia: ile par sprawdzono, ile uznano (`ok: false` = niedostępna). */
  z.object({ type: z.literal('druga_kontrola'), claim: claimIndex, checked: count, agreed: count, ok: z.boolean() })
]);
export type VerifyProgressDetailEvent = z.infer<typeof VerifyProgressDetailEventSchema>;
/** Wszystkie zdarzenia postępu silnika (zwykłe i szczegółowe). */
export type EngineProgressEvent = VerifyProgressEvent | VerifyProgressDetailEvent;

/**
 * POST /api/verify/stream (text/event-stream): zero lub więcej `event: progress`
 * (dane: VerifyProgressEvent), na końcu dokładnie jedno `event: result` (dane: VerifyOutcome,
 * ten sam co z POST /api/verify). Błędy wejścia: zwykła odpowiedź JSON ApiError jak w /api/verify.
 */
export const VERIFY_STREAM_EVENTS = { progress: 'progress', progressDetail: 'progress_detail', result: 'result' } as const;

/** GET /api/verify/eta: 200. Mediana czasu ostatnich pełnych sprawdzeń (bez odpowiedzi z pamięci). */
export const VerifyEtaResponseSchema = z.object({
  medianMs: z.number().int().nonnegative(),
  samples: z.number().int().nonnegative(),
  /** true: za mało pomiarów, podano wartość domyślną. */
  defaulted: z.boolean(),
});
export type VerifyEtaResponse = z.infer<typeof VerifyEtaResponseSchema>;
