import type { DatabaseSync } from 'node:sqlite';
import { DEFAULT_LIVE_ROLE, appearanceOf, decideLiveRole, isLiveRole, type Appearance, type LiveRoleDecision } from './live';
import type { VerificationRecord } from '../contracts/record';

export interface RoleStore {
	get(recordId: string): Appearance | null;
	decideAndSave(record: VerificationRecord, now?: Date): Appearance;
}

interface RoleRow {
	role: string;
	serious: number;
}

export function createRoleStore(db: DatabaseSync): RoleStore {
	const select = db.prepare('SELECT role, serious FROM record_roles WHERE record_id = ?');
	const insert = db.prepare(
		'INSERT OR IGNORE INTO record_roles(record_id, role, serious, reasons, decided_at) VALUES (?, ?, ?, ?, ?)',
	);

	function get(recordId: string): Appearance | null {
		const row = select.get(recordId) as RoleRow | undefined;
		if (!row) return null;
		return { role: isLiveRole(row.role) ? row.role : DEFAULT_LIVE_ROLE, serious: row.serious === 1 };
	}

	function save(recordId: string, decision: LiveRoleDecision, now: Date): void {
		insert.run(recordId, decision.role, decision.serious ? 1 : 0, JSON.stringify(decision.reasons), now.toISOString());
	}

	function decideAndSave(record: VerificationRecord, now: Date = new Date()): Appearance {
		const stored = get(record.id);
		if (stored) return stored;
		const decision = decideLiveRole(record);
		save(record.id, decision, now);
		return get(record.id) ?? appearanceOf(decision);
	}

	return { get, decideAndSave };
}
