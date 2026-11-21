/*
 * Dopasowanie twierdzenia do bazy incydentów MSZ. Wynik to wyłącznie neutralne ostrzeżenia
 * (notices typu dopasowanie_incydentu): nigdy werdykt, nigdy cytat dowodowy.
 * Dopasowanie jest leksykalne (rdzenie słów po usunięciu ogonków), wymaga co najmniej
 * dwóch wspólnych rdzeni i nie zależy od domeny ani autora.
 */
import type { ExtractedClaim } from '../../contracts/claim';
import type { Notice } from '../../contracts/record';
import { normalizeKey, type IncidentRecord } from './parse';

export type IncidentNotice = Notice & { type: 'dopasowanie_incydentu' };

export interface MatchOptions {
	now?: Date;
	limit?: number;
	minSharedStems?: number;
}

const STEM_LENGTH = 5;
const MIN_WORD_LENGTH = 4;
const STOPWORDS = new Set(['oraz', 'ktory', 'ktora', 'ktore', 'ktorzy', 'jest', 'sa', 'byl', 'byla', 'bylo', 'przez', 'przy', 'tego', 'jego', 'jako', 'ktorego', 'wiec', 'takze', 'tylko', 'czy', 'dla', 'nie', 'sie', 'tez', 'ale', 'jesli', 'gdy', 'albo']);

export function stemsOf(text: string): Set<string> {
	const stems = new Set<string>();
	for (const word of text.split(/[^\p{L}\p{N}]+/u)) {
		const key = normalizeKey(word);
		if (key.length < MIN_WORD_LENGTH || STOPWORDS.has(key) || /^\d+$/.test(key)) continue;
		stems.add(key.slice(0, STEM_LENGTH));
	}
	return stems;
}

function describe(record: IncidentRecord): string {
	const label = record.title || record.description.slice(0, 120);
	const meta = [record.date, record.country].filter(Boolean).join(', ');
	return meta ? `${label} (${meta})` : label;
}

export function matchIncidents(claim: Pick<ExtractedClaim, 'text' | 'searchTerms'>, records: IncidentRecord[], options: MatchOptions = {}): IncidentNotice[] {
	const { now = new Date(), limit = 3, minSharedStems = 2 } = options;
	const claimStems = stemsOf([claim.text, ...(claim.searchTerms ?? [])].join(' '));
	if (claimStems.size === 0) return [];
	const asOf = now.toISOString().slice(0, 10);
	return records
		.map((record) => {
			const recordStems = stemsOf([record.title, record.description, record.country ?? '', ...record.keywords].join(' '));
			let shared = 0;
			for (const stem of claimStems) if (recordStems.has(stem)) shared += 1;
			return { record, shared };
		})
		.filter(({ shared }) => shared >= minSharedStems)
		.sort((a, b) => b.shared - a.shared || a.record.id.localeCompare(b.record.id))
		.slice(0, limit)
		.map(({ record }) => ({
			type: 'dopasowanie_incydentu' as const,
			text: `Stan na ${asOf}: w bazie incydentów MSZ jest wpis powiązany tematycznie: ${describe(record)}. To tylko informacja o możliwym związku, nie ocena prawdziwości twierdzenia.`,
		}));
}
