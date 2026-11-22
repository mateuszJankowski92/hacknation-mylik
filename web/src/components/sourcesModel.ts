import type { SourceMeta, SourceType } from '../../../src/contracts/source';

export type SourceCategory = 'urzedowe' | 'redakcje' | 'inne';

export const CATEGORY_LABELS: Record<SourceCategory, string> = {
	urzedowe: 'Urzędowe',
	redakcje: 'Weryfikacje redakcji',
	inne: 'Inne',
};

export const CATEGORY_ORDER: readonly SourceCategory[] = ['urzedowe', 'redakcje', 'inne'];

const CATEGORY_OF_TYPE: Record<SourceType, SourceCategory> = {
	urzedowe: 'urzedowe',
	prawo: 'urzedowe',
	factcheck: 'redakcje',
	media: 'inne',
	organizacja: 'inne',
};

export function categoryOf(type: SourceType): SourceCategory {
	return CATEGORY_OF_TYPE[type];
}

export interface PublisherGroup {
	id: string;
	publisher: string;
	domains: string[];
	licenses: string[];
	documents: SourceMeta[];
}

export interface SourceFilter {
	query: string;
	categories: ReadonlySet<SourceCategory>;
}

export function normalizeText(text: string): string {
	return text.toLocaleLowerCase('pl-PL').normalize('NFD').replace(/\p{M}+/gu, '').replace(/ł/g, 'l');
}

export function matchesFilter(doc: SourceMeta, filter: SourceFilter, needle: string): boolean {
	if (filter.categories.size > 0 && !filter.categories.has(categoryOf(doc.sourceType))) return false;
	if (!needle) return true;
	return normalizeText(`${doc.title} ${doc.publisher}`).includes(needle);
}

function unique(values: string[]): string[] {
	return [...new Set(values)];
}

export function groupByPublisher(documents: readonly SourceMeta[]): PublisherGroup[] {
	const byPublisher = new Map<string, SourceMeta[]>();
	for (const doc of documents) {
		const list = byPublisher.get(doc.publisher);
		if (list) list.push(doc);
		else byPublisher.set(doc.publisher, [doc]);
	}
	return [...byPublisher.entries()]
		.map(([publisher, docs]) => ({
			id: `wydawca-${normalizeText(publisher).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
			publisher,
			domains: unique(docs.map((d) => d.domain)),
			licenses: unique(docs.map((d) => d.license)),
			documents: docs,
		}))
		.sort((a, b) => b.documents.length - a.documents.length || a.publisher.localeCompare(b.publisher, 'pl'));
}

export function filterGroups(groups: readonly PublisherGroup[], filter: SourceFilter): PublisherGroup[] {
	const needle = normalizeText(filter.query.trim());
	if (!needle && filter.categories.size === 0) return [...groups];
	const out: PublisherGroup[] = [];
	for (const group of groups) {
		const documents = group.documents.filter((doc) => matchesFilter(doc, filter, needle));
		if (documents.length > 0) out.push({ ...group, documents });
	}
	return out;
}

export function latestFetchDate(documents: readonly SourceMeta[]): string | null {
	let latest: string | null = null;
	for (const doc of documents) if (!latest || doc.fetchedAt > latest) latest = doc.fetchedAt;
	return latest;
}

export function pluralPl(count: number, one: string, few: string, many: string): string {
	if (count === 1) return one;
	const last = count % 10;
	const lastTwo = count % 100;
	return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many;
}
