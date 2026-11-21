import type { DatabaseSync } from 'node:sqlite';
import { claimSignature, sameCase, type ClaimSignature } from './similarity';
import {
	CASE_STATES,
	type CaseItem,
	type CasePublicResponse,
	type CaseRecordLink,
	type CaseSearchInfo,
	type CaseState,
} from './types';

export const MAX_NOTE_CHARS = 2000;
export const MAX_FORWARDED_TO_CHARS = 200;
const DAY_MS = 86_400_000;

export interface ReportInput {
	claimText: string;
	searchInfo: CaseSearchInfo;
	recordId: string;
	channel: string;
}

export interface ReportResult {
	caseId: number;
	created: boolean;
	reportCount: number;
	reopened: boolean;
}

export interface ListOptions {
	state?: CaseState;
	limit?: number;
}

interface CaseRow {
	id: number;
	claim_text: string;
	normalized: string;
	signature: string;
	first_seen: string;
	last_seen: string;
	report_count: number;
	channels: string;
	state: string;
	note: string;
	search_info: string;
	forwarded_to: string | null;
	forwarded_at: string | null;
	forwarded_report_count: number | null;
}

const EMPTY_SEARCH_INFO: CaseSearchInfo = {
	claimKind: '',
	searchTerms: [],
	counterTerms: [],
	refutationPerformed: false,
	refutationQueries: [],
	refutationFound: 0,
	abstainReason: '',
	strengthReasons: [],
	limitations: [],
	evidenceCount: 0,
};

function parseJson<T>(text: string, fallback: T): T {
	try {
		const value: unknown = JSON.parse(text);
		return (value ?? fallback) as T;
	} catch {
		return fallback;
	}
}

function toItem(row: CaseRow, records: CaseRecordLink[]): CaseItem {
	const state = (CASE_STATES as readonly string[]).includes(row.state) ? (row.state as CaseState) : 'nowa';
	return {
		id: Number(row.id),
		claimText: row.claim_text,
		firstSeen: row.first_seen,
		lastSeen: row.last_seen,
		reportCount: Number(row.report_count),
		channels: parseJson<Record<string, number>>(row.channels, {}),
		state,
		note: row.note,
		searchInfo: { ...EMPTY_SEARCH_INFO, ...parseJson<Partial<CaseSearchInfo>>(row.search_info, {}) },
		forwardedTo: row.forwarded_to,
		forwardedAt: row.forwarded_at,
		forwardedReportCount: row.forwarded_report_count === null ? null : Number(row.forwarded_report_count),
		records,
	};
}

export interface CaseStore {
	recordReport(input: ReportInput): ReportResult;
	list(options?: ListOptions): CaseItem[];
	get(id: number): CaseItem | null;
	setState(id: number, state: CaseState): boolean;
	setNote(id: number, note: string): boolean;
	markForwarded(id: number, to: string): boolean;
	pendingCount(): number;
	counts(): Record<CaseState, number>;
	publicStatusForRecord(recordId: string): CasePublicResponse;
	purgeOlderThan(maxAgeDays: number): number;
	purgeAll(): number;
}

export function createCaseStore(db: DatabaseSync, now: () => Date = () => new Date()): CaseStore {
	const insertCase = db.prepare(
		`INSERT INTO cases(claim_text, normalized, signature, first_seen, last_seen, report_count, channels, state, search_info)
		 VALUES (?, ?, ?, ?, ?, 1, ?, 'nowa', ?)`,
	);
	const insertLink = db.prepare('INSERT OR IGNORE INTO case_records(case_id, record_id, linked_at) VALUES (?, ?, ?)');
	const selectCandidates = db.prepare('SELECT id, normalized, signature FROM cases ORDER BY last_seen DESC LIMIT 5000');
	const selectOne = db.prepare('SELECT * FROM cases WHERE id = ?');
	const selectLinks = db.prepare('SELECT record_id, linked_at FROM case_records WHERE case_id = ? ORDER BY linked_at, record_id');
	const updateReport = db.prepare(
		`UPDATE cases SET last_seen = ?, report_count = report_count + 1, channels = ?, search_info = ?, state = ? WHERE id = ?`,
	);

	function links(caseId: number): CaseRecordLink[] {
		return (selectLinks.all(caseId) as unknown as Array<{ record_id: string; linked_at: string }>).map((r) => ({
			recordId: r.record_id,
			linkedAt: r.linked_at,
		}));
	}

	function findSimilar(signature: ClaimSignature): number | null {
		const candidates = selectCandidates.all() as unknown as Array<{ id: number; normalized: string; signature: string }>;
		for (const c of candidates) {
			const other = parseJson<ClaimSignature | null>(c.signature, null);
			if (!other) continue;
			if (sameCase(signature, { ...other, normalized: c.normalized })) return Number(c.id);
		}
		return null;
	}

	function transaction<T>(fn: () => T): T {
		db.exec('BEGIN IMMEDIATE');
		try {
			const result = fn();
			db.exec('COMMIT');
			return result;
		} catch (err) {
			try {
				db.exec('ROLLBACK');
			} catch {
			}
			throw err;
		}
	}

	return {
		recordReport(input) {
			const ts = now().toISOString();
			const signature = claimSignature(input.claimText);
			return transaction<ReportResult>(() => {
				const existingId = findSimilar(signature);
				if (existingId === null) {
					const res = insertCase.run(
						input.claimText,
						signature.normalized,
						JSON.stringify(signature),
						ts,
						ts,
						JSON.stringify({ [input.channel]: 1 }),
						JSON.stringify(input.searchInfo),
					);
					const caseId = Number(res.lastInsertRowid);
					insertLink.run(caseId, input.recordId, ts);
					return { caseId, created: true, reportCount: 1, reopened: false };
				}
				const row = selectOne.get(existingId) as unknown as CaseRow;
				const channels = parseJson<Record<string, number>>(row.channels, {});
				channels[input.channel] = (channels[input.channel] ?? 0) + 1;
				const reopened = row.state === 'zamknieta';
				updateReport.run(
					ts,
					JSON.stringify(channels),
					JSON.stringify(input.searchInfo),
					reopened ? 'nowa' : row.state,
					existingId,
				);
				insertLink.run(existingId, input.recordId, ts);
				return { caseId: existingId, created: false, reportCount: Number(row.report_count) + 1, reopened };
			});
		},

		list(options = {}) {
			const limit = Math.min(Math.max(options.limit ?? 500, 1), 5000);
			const rows = (
				options.state
					? db
							.prepare('SELECT * FROM cases WHERE state = ? ORDER BY report_count DESC, last_seen DESC, id DESC LIMIT ?')
							.all(options.state, limit)
					: db.prepare('SELECT * FROM cases ORDER BY report_count DESC, last_seen DESC, id DESC LIMIT ?').all(limit)
			) as unknown as CaseRow[];
			return rows.map((row) => toItem(row, links(Number(row.id))));
		},

		get(id) {
			const row = selectOne.get(id) as unknown as CaseRow | undefined;
			return row ? toItem(row, links(id)) : null;
		},

		setState(id, state) {
			if (!(CASE_STATES as readonly string[]).includes(state)) return false;
			return Number(db.prepare('UPDATE cases SET state = ? WHERE id = ?').run(state, id).changes) > 0;
		},

		setNote(id, note) {
			const clean = note.replace(/\r\n/g, '\n').slice(0, MAX_NOTE_CHARS);
			return Number(db.prepare('UPDATE cases SET note = ? WHERE id = ?').run(clean, id).changes) > 0;
		},

		markForwarded(id, to) {
			const row = selectOne.get(id) as unknown as CaseRow | undefined;
			if (!row) return false;
			const person = to.trim().slice(0, MAX_FORWARDED_TO_CHARS);
			const nextState = row.state === 'nowa' ? 'w_toku' : row.state;
			db.prepare(
				'UPDATE cases SET forwarded_to = ?, forwarded_at = ?, forwarded_report_count = ?, state = ? WHERE id = ?',
			).run(person, now().toISOString(), Number(row.report_count), nextState, id);
			return true;
		},

		pendingCount() {
			const row = db.prepare("SELECT COUNT(*) AS n FROM cases WHERE state = 'nowa'").get() as { n: number };
			return Number(row.n);
		},

		counts() {
			const result: Record<CaseState, number> = { nowa: 0, w_toku: 0, zamknieta: 0 };
			const rows = db.prepare('SELECT state, COUNT(*) AS n FROM cases GROUP BY state').all() as unknown as Array<{
				state: CaseState;
				n: number;
			}>;
			for (const r of rows) if (r.state in result) result[r.state] = Number(r.n);
			return result;
		},

		publicStatusForRecord(recordId) {
			const row = db
				.prepare(
					`SELECT COUNT(*) AS linked, MIN(c.forwarded_at) AS forwarded_at
					 FROM case_records l JOIN cases c ON c.id = l.case_id WHERE l.record_id = ?`,
				)
				.get(recordId) as { linked: number; forwarded_at: string | null };
			if (Number(row.linked) === 0) return { status: 'brak' };
			if (row.forwarded_at) return { status: 'przekazano', forwardedAt: row.forwarded_at };
			return { status: 'zapisano' };
		},

		purgeOlderThan(maxAgeDays) {
			if (!Number.isFinite(maxAgeDays) || maxAgeDays < 0) throw new RangeError('maxAgeDays musi być liczbą nieujemną');
			const cutoff = new Date(now().getTime() - maxAgeDays * DAY_MS).toISOString();
			return Number(db.prepare('DELETE FROM cases WHERE last_seen < ?').run(cutoff).changes);
		},

		purgeAll() {
			return Number(db.prepare('DELETE FROM cases').run().changes);
		},
	};
}
