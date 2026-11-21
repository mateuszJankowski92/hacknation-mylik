import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { SourceTypeSchema } from '../contracts/source';

export const CatalogDocumentSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	url: z.string().min(1),
	publishedAt: z.iso.date().nullable(),
	/** Data, do której treść jest aktualna (opcjonalna). */
	validUntil: z.iso.date().nullable().optional(),
	file: z.string().min(1),
});

export const CatalogSourceSchema = z.object({
	id: z.string().min(1),
	publisher: z.string().min(1),
	domain: z.string().min(1),
	sourceType: SourceTypeSchema,
	license: z.string().min(1),
	notes: z.string().optional(),
	documents: z.array(CatalogDocumentSchema),
});

export const CatalogSchema = z.object({
	version: z.literal(1),
	sources: z.array(CatalogSourceSchema),
});

export type Catalog = z.infer<typeof CatalogSchema>;
export type CatalogSource = z.infer<typeof CatalogSourceSchema>;
export type CatalogDocument = z.infer<typeof CatalogDocumentSchema>;

export function loadCatalog(path: string): Catalog {
	return CatalogSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}
