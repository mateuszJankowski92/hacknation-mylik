import type { DatabaseSync } from 'node:sqlite';

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

export function purgeOlderThan(db: DatabaseSync, maxAgeDays: number, now: Date = new Date()): PurgeResult {
	if (!Number.isFinite(maxAgeDays) || maxAgeDays < 0) throw new RangeError('maxAgeDays musi być liczbą nieujemną');
	const cutoff = new Date(now.getTime() - maxAgeDays * DAY_MS).toISOString();
	const records = db.prepare('DELETE FROM records WHERE created_at < ?').run(cutoff);
	const events = db.prepare('DELETE FROM events WHERE ts < ?').run(cutoff);
	purgeOrphanRoles(db);
	return { records: Number(records.changes), events: Number(events.changes) };
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
