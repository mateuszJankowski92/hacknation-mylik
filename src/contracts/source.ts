import { z } from 'zod';

export const SOURCE_TYPES = ['urzedowe', 'prawo', 'media', 'factcheck', 'organizacja'] as const;
export const SourceTypeSchema = z.enum(SOURCE_TYPES);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const SOURCE_TYPE_LABELS_PL: Record<SourceType, string> = {
  urzedowe: 'źródło urzędowe',
  prawo: 'akt prawny',
  media: 'media',
  factcheck: 'organizacja weryfikująca fakty',
  organizacja: 'organizacja',
};

/**
 * Warstwa źródła (zad. 29): `urzedowe` = zamknięty zbiór urzędowy (korpus), `media_i_instytucje` =
 * druga warstwa, szukana na żywo wyłącznie na jawnej liście serwisów (data/live-sources.json).
 * Wpływa tylko na siłę podstawy (z samej drugiej warstwy najwyżej `srednia`), nigdy na werdykt.
 */
export const SOURCE_LAYERS = ['urzedowe', 'media_i_instytucje'] as const;
export const SourceLayerSchema = z.enum(SOURCE_LAYERS);
export type SourceLayer = z.infer<typeof SourceLayerSchema>;
export const SOURCE_LAYER_LABELS_PL: Record<SourceLayer, string> = {
  urzedowe: 'źródło urzędowe',
  media_i_instytucje: 'media i instytucje',
};

export const SourceMetaSchema = z.object({
  documentId: z.string().min(1),
  sourceId: z.string().min(1),
  title: z.string(),
  publisher: z.string(),
  domain: z.string(),
  url: z.string(),
  /** Data publikacji (ISO, YYYY-MM-DD) albo null, gdy nieznana. */
  publishedAt: z.iso.date().nullable(),
  /** Moment pobrania (ISO datetime). */
  fetchedAt: z.iso.datetime({ offset: true }),
  /** Data, do której treść jest aktualna (ISO, YYYY-MM-DD); null lub brak, gdy nieokreślona. */
  validUntil: z.iso.date().nullable().optional(),
  sourceType: SourceTypeSchema,
  license: z.string(),
  /** Warstwa źródła (zad. 29); brak = `urzedowe` (zgodność ze starszymi rekordami v2). */
  layer: SourceLayerSchema.optional(),
});
export type SourceMeta = z.infer<typeof SourceMetaSchema>;

export const PassageSchema = z.object({
  /** Stabilny identyfikator, np. `${documentId}#${n}`. */
  id: z.string().min(1),
  documentId: z.string().min(1),
  text: z.string(),
  meta: SourceMetaSchema,
  score: z.number().optional(),
});
export type Passage = z.infer<typeof PassageSchema>;

/** Jedyne, co widzi model: identyfikator i treść fragmentu. */
export const ModelPassageViewSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
});
export type ModelPassageView = z.infer<typeof ModelPassageViewSchema>;
