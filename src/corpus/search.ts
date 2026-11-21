import type { DatabaseSync } from 'node:sqlite';
import type { Passage, SourceType } from '../contracts/source';
import type { CorpusStats, SearchOptions, Searcher } from '../contracts/search';
import { buildFtsQuery } from './query';
import { excludedCorpusSourceIds } from '../factcheck/config';
import { labelForRating } from '../factcheck/ratings';

const DEFAULT_LIMIT = 8;

interface PassageRow {
	id: string;
	document_id: string;
	text: string;
	title: string;
	url: string;
	published_at: string | null;
	fetched_at: string;
	valid_until: string | null;
	source_id: string;
	publisher: string;
	domain: string;
	source_type: string;
	license: string;
	ordinal?: number;
	r_claim?: string | null;
	r_claimant?: string | null;
	r_claim_date?: string | null;
	r_rating?: string | null;
	rank?: number;
}

const PASSAGE_SELECT = `
	SELECT p.id, p.document_id, p.text, d.title, d.url, d.published_at, d.fetched_at, d.valid_until,
	       s.id AS source_id, s.publisher, s.domain, s.source_type, s.license,
	       p.ordinal, r.claim AS r_claim, r.claimant AS r_claimant, r.claim_date AS r_claim_date, r.rating AS r_rating`;

function toPassage(row: PassageRow, score?: number): Passage {
	return {
		id: row.id,
		documentId: row.document_id,
		text: row.text,
		meta: {
			documentId: row.document_id,
			sourceId: row.source_id,
			title: row.title,
			publisher: row.publisher,
			domain: row.domain,
			url: row.url,
			publishedAt: row.published_at,
			fetchedAt: row.fetched_at,
			validUntil: row.valid_until,
			sourceType: row.source_type as SourceType,
			license: row.license,
			// Weryfikacja redakcji w zbiorze: dosłowne pola wpisu, ocena przez jawną tabelę (src/factcheck/ratings.ts).
			...(row.r_claim && row.r_rating
				? {
						layer: 'weryfikacja_redakcji' as const,
						review: {
							claimReviewed: row.r_claim,
							claimant: row.r_claimant ?? null,
							claimDate: row.r_claim_date ?? null,
							rating: row.r_rating,
							label: labelForRating(row.r_rating),
							role: row.ordinal === 0 ? ('teza' as const) : ('uzasadnienie' as const),
						},
					}
				: {}),
		},
		...(score === undefined ? {} : { score }),
	};
}

export interface SearcherOptions {
	/**
	 * Źródła pominięte w ścieżce dowodowej (wyszukiwanie, fragmenty, liczniki). Domyślnie z wyłącznika
	 * w data/factcheck.json (`corpusDirectFactcheck`); obecnie wyłącznik pozwala używać tych dokumentów.
	 */
	excludeSourceIds?: string[];
}

export function createSearcher(db: DatabaseSync, opts: SearcherOptions = {}): Searcher {
	const excluded = JSON.stringify(opts.excludeSourceIds ?? excludedCorpusSourceIds());
	const versionStatement = db.prepare("SELECT value FROM corpus_meta WHERE key = 'version'");
	const searchStatement = db.prepare(`${PASSAGE_SELECT}, bm25(passages_fts) AS rank
		FROM passages_fts
		JOIN passages p ON p.rowid = passages_fts.rowid
		JOIN documents d ON d.id = p.document_id
		JOIN sources s ON s.id = d.source_id
		LEFT JOIN document_reviews r ON r.document_id = d.id
		WHERE passages_fts MATCH ? AND s.id NOT IN (SELECT value FROM json_each(?))
		ORDER BY rank, p.id
		LIMIT ?`);
	const getStatement = db.prepare(`${PASSAGE_SELECT}
		FROM passages p
		JOIN documents d ON d.id = p.document_id
		JOIN sources s ON s.id = d.source_id
		LEFT JOIN document_reviews r ON r.document_id = d.id
		WHERE p.id = ? AND s.id NOT IN (SELECT value FROM json_each(?))`);
	const asOfStatement = db.prepare('SELECT MAX(fetched_at) AS value FROM documents');
	const statsStatement = db.prepare(
		`SELECT (SELECT COUNT(*) FROM documents WHERE source_id NOT IN (SELECT value FROM json_each(?1))) AS documents,
		        (SELECT COUNT(DISTINCT domain) FROM sources WHERE id NOT IN (SELECT value FROM json_each(?1))) AS domains,
		        (SELECT COUNT(DISTINCT source_type) FROM sources WHERE id NOT IN (SELECT value FROM json_each(?1))) AS source_types`,
	);

	return {
		corpusVersion(): string {
			const row = versionStatement.get() as { value: string | null } | undefined;
			return row?.value || 'empty';
		},

		asOf(): string | null {
			const row = asOfStatement.get() as { value: string | null } | undefined;
			return row?.value ?? null;
		},

		async search(query: string, opts?: SearchOptions): Promise<Passage[]> {
			const match = buildFtsQuery(query);
			if (!match) return [];
			const limit = Math.max(1, Math.floor(opts?.limit ?? DEFAULT_LIMIT));
			try {
				const rows = searchStatement.all(match, excluded, limit) as unknown as PassageRow[];
				return rows.map((row) => toPassage(row, Math.abs(row.rank ?? 0)));
			} catch {
				return [];
			}
		},

		getPassage(id: string): Passage | null {
			const row = getStatement.get(id, excluded) as PassageRow | undefined;
			return row ? toPassage(row) : null;
		},

		stats(): CorpusStats {
			const row = statsStatement.get(excluded) as { documents: number; domains: number; source_types: number };
			return { documents: row.documents, domains: row.domains, sourceTypes: row.source_types };
		},
	};
}
