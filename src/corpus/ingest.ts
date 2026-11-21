import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { chunkText } from './chunk';
import { loadCatalog, type CatalogSource } from './catalog';
import { loadReviewFile, type ReviewDocument } from './reviews';

export interface IngestResult {
	documents: number;
	passages: number;
	version: string;
}

export const FETCHED_FILE = 'data/raw/_fetched.json';

function sha256(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

function readFetchedMap(rootDir: string): Record<string, string> {
	const path = join(rootDir, FETCHED_FILE);
	if (!existsSync(path)) return {};
	return JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>;
}

function sourceNotes(source: CatalogSource): string | null {
	const parts = [
		source.notes,
		source.policy ? `Kwalifikacja: ${source.policy.qualification}` : undefined,
		source.policy ? `Aktualizacja: ${source.policy.update}` : undefined,
		source.policy ? `Wykluczanie: ${source.policy.exclusion}` : undefined,
	].filter((part): part is string => Boolean(part));
	return parts.length > 0 ? parts.join('\n') : null;
}

export function ingestCatalog(db: DatabaseSync, catalogPath: string, rootDir: string): IngestResult {
	const catalog = loadCatalog(catalogPath);
	const fetched = readFetchedMap(rootDir);

	const prepared = catalog.sources.map((source) => ({
		source,
		documents: source.documents.map((doc) => {
			const filePath = isAbsolute(doc.file) ? doc.file : join(rootDir, doc.file);
			if (!existsSync(filePath)) throw new Error(`Brak pliku dokumentu ${doc.id}: ${doc.file}`);
			const content = readFileSync(filePath, 'utf8');
			const fetchedAt = fetched[doc.id] ?? statSync(filePath).mtime.toISOString();
			return { doc, content, fetchedAt, contentSha: sha256(content) };
		}),
	}));

	// Weryfikacje redakcji z pliku JSONL (src/corpus/reviews.ts): osobne dokumenty z metadaną oceny.
	const reviewSets = catalog.sources.map((source) => ({
		source,
		reviews: source.reviews ? loadReviewFile(source.reviews.file, rootDir, source.id, { excerptChars: source.reviews.excerptChars }).documents : ([] as ReviewDocument[]),
	}));
	const ingestedAt = new Date().toISOString();

	const versionInput = [
		...prepared.flatMap(({ source, documents }) =>
			documents.map(({ doc, contentSha }) => `${source.id}|${doc.id}|${doc.url}|${doc.title}|${doc.publishedAt ?? ''}|${contentSha}${doc.validUntil ? `|${doc.validUntil}` : ''}`),
		),
		...reviewSets.flatMap(({ source, reviews }) => reviews.map((r) => `${source.id}|${r.id}|${r.url}|${r.title}|${r.publishedAt ?? ''}|${r.contentSha}`)),
	]
		.sort()
		.join('\n');
	const version = sha256(versionInput).slice(0, 12);

	const insertSource = db.prepare(
		'INSERT INTO sources (id, publisher, domain, source_type, license, notes) VALUES (?, ?, ?, ?, ?, ?)',
	);
	const insertDocument = db.prepare(
		`INSERT INTO documents (id, source_id, title, url, published_at, valid_until, fetched_at, corpus_version, content_sha256)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	);
	const insertPassage = db.prepare('INSERT INTO passages (id, document_id, ordinal, text) VALUES (?, ?, ?, ?)');
	const insertReview = db.prepare('INSERT INTO document_reviews (document_id, claim, claimant, claim_date, rating, kind) VALUES (?, ?, ?, ?, ?, ?)');
	const upsertMeta = db.prepare(
		'INSERT INTO corpus_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
	);

	let documents = 0;
	let passages = 0;
	db.exec('BEGIN');
	try {
		db.exec('DELETE FROM document_reviews');
		db.exec('DELETE FROM passages');
		db.exec('DELETE FROM documents');
		db.exec('DELETE FROM sources');
		for (const { source, documents: docs } of prepared) {
			insertSource.run(source.id, source.publisher, source.domain, source.sourceType, source.license, sourceNotes(source));
			for (const { doc, content, fetchedAt, contentSha } of docs) {
				insertDocument.run(doc.id, source.id, doc.title, doc.url, doc.publishedAt, doc.validUntil ?? null, fetchedAt, version, contentSha);
				documents += 1;
				chunkText(content).forEach((text, ordinal) => {
					insertPassage.run(`${doc.id}#${ordinal}`, doc.id, ordinal, text);
					passages += 1;
				});
			}
		}
		const reviewFetched: string[] = [];
		for (const { source, reviews } of reviewSets) {
			for (const r of reviews) {
				const fetchedAt = r.fetchedAt ?? ingestedAt;
				reviewFetched.push(fetchedAt);
				insertDocument.run(r.id, source.id, r.title, r.url, r.publishedAt, null, fetchedAt, version, r.contentSha);
				insertReview.run(r.id, r.claim, r.claimant, r.claimDate, r.rating, r.kind);
				documents += 1;
				r.passages.forEach((text, ordinal) => {
					insertPassage.run(`${r.id}#${ordinal}`, r.id, ordinal, text);
					passages += 1;
				});
			}
		}
		upsertMeta.run('version', version);
		upsertMeta.run('ingested_at', new Date().toISOString());
		upsertMeta.run('as_of', [...prepared.flatMap(({ documents: docs }) => docs.map(({ fetchedAt }) => fetchedAt)), ...reviewFetched].sort().pop() ?? null);
		upsertMeta.run('documents', String(documents));
		db.exec('COMMIT');
	} catch (error) {
		db.exec('ROLLBACK');
		throw error;
	}
	return { documents, passages, version };
}
