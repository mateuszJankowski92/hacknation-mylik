import type { DatabaseSync } from 'node:sqlite';
import { factcheckRecordTtlHours } from '../factcheck/index';

export interface PurgeResult {
	records: number;
	events: number;
}

const DAY_MS = 86_400_000;

function purgeOrphanRoles(db: DatabaseSync): void {
	try {
		db.prepare('DELETE FROM record_roles WHERE record_id NOT IN (SELECT id FROM records)').run();
	} catch {
		return;
	}
}

/** Wzorzec rekordu z wpisem z indeksu Google (dokument `fc:...` w dowodach). */
const INDEX_RECORD_LIKE = '%"documentId":"fc:%';

export function purgeOlderThan(
	db: DatabaseSync,
	maxAgeDays: number,
	now: Date = new Date(),
	indexTtlHours: number = factcheckRecordTtlHours(),
): PurgeResult {
	if (!Number.isFinite(maxAgeDays) || maxAgeDays < 0) throw new RangeError('maxAgeDays musi być liczbą nieujemną');
	const cutoff = new Date(now.getTime() - maxAgeDays * DAY_MS).toISOString();
	const records = db.prepare('DELETE FROM records WHERE created_at < ?').run(cutoff);
	// Rekordy z wpisami z indeksu Google: krótszy czas życia (domyślnie 24 h, warunki API).
	const indexCutoff = new Date(now.getTime() - indexTtlHours * 3_600_000).toISOString();
	const indexRecords = db.prepare('DELETE FROM records WHERE created_at < ? AND json LIKE ?').run(indexCutoff, INDEX_RECORD_LIKE);
	const events = db.prepare('DELETE FROM events WHERE ts < ?').run(cutoff);
	purgeOrphanRoles(db);
	return { records: Number(records.changes) + Number(indexRecords.changes), events: Number(events.changes) };
}

export function purgeAllSessionData(db: DatabaseSync): PurgeResult {
	const records = db.prepare('DELETE FROM records').run();
	const events = db.prepare('DELETE FROM events').run();
	purgeOrphanRoles(db);
	return { records: Number(records.changes), events: Number(events.changes) };
}

export interface RetentionScheduler {
	runOnce(): PurgeResult;
	stop(): void;
}

export function startRetention(
	db: DatabaseSync,
	retentionDays: number,
	intervalMs: number = 3_600_000,
): RetentionScheduler {
	function runOnce(): PurgeResult {
		return purgeOlderThan(db, retentionDays);
	}
	const timer = setInterval(() => {
		try {
			runOnce();
		} catch {
			return;
		}
	}, intervalMs);
	timer.unref();
	return { runOnce, stop: () => clearInterval(timer) };
}
