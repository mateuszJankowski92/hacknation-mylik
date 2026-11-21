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

export const DiscoverySeedSchema = z.object({
	url: z.url(),
	/** Wyrażenie regularne; grupa 1 to adres odnośnika (względny lub bezwzględny) do dokumentu. */
	link: z.string().min(1),
	/** Liczba stron listy (parametr ?page=N); domyślnie 1. */
	pages: z.number().int().min(1).max(10).optional(),
});

export const DiscoverySchema = z.object({
	seeds: z.array(DiscoverySeedSchema).min(1),
	/** Maksymalna liczba nowych dokumentów dołączanych do źródła w jednym przebiegu. */
	maxNew: z.number().int().min(1).max(500),
	/** Gdy ustawione, zapisujemy tylko początek tekstu (licencja nie pozwala na pełny tekst). */
	excerptChars: z.number().int().min(200).max(5000).optional(),
});

export const PolicySchema = z.object({
	qualification: z.string().min(1),
	update: z.string().min(1),
	exclusion: z.string().min(1),
});

export const CatalogSourceSchema = z.object({
	id: z.string().min(1),
	publisher: z.string().min(1),
	domain: z.string().min(1),
	sourceType: SourceTypeSchema,
	license: z.string().min(1),
	notes: z.string().optional(),
	policy: PolicySchema.optional(),
	discovery: DiscoverySchema.optional(),
	/**
	 * Weryfikacje redakcji z pliku JSONL (jedna weryfikacja w linii: url, title, claim, claimant,
	 * claimDate, rating, reviewDate, body, fetchedAt). Każda staje się dokumentem: fragment 0 = teza
	 * (pole claim dosłownie), dalej uzasadnienie (pole body). Brak pliku = zero dokumentów, bez błędu.
	 */
	reviews: z
		.object({
			file: z.string().min(1),
			/** Gdy ustawione, z uzasadnienia zapisujemy tylko początek (licencja). */
			excerptChars: z.number().int().min(200).max(20000).optional(),
		})
		.optional(),
	documents: z.array(CatalogDocumentSchema),
});

export const CatalogSchema = z.object({
	version: z.literal(1),
	sources: z.array(CatalogSourceSchema),
});

export type Discovery = z.infer<typeof DiscoverySchema>;
export type Policy = z.infer<typeof PolicySchema>;
export type Catalog = z.infer<typeof CatalogSchema>;
export type CatalogSource = z.infer<typeof CatalogSourceSchema>;
export type CatalogDocument = z.infer<typeof CatalogDocumentSchema>;

export function loadCatalog(path: string): Catalog {
	return CatalogSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}
