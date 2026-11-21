import type { VerificationRecord } from '../../../src/contracts/record';
import { predictLiveRole } from '../../../src/roles/live';
import { isSeriousRecord } from '../../../src/roles/serious';
import { DEFAULT_ROLE, isRole, type Role } from './config';

interface StoredAppearance {
	role?: unknown;
	serious?: unknown;
}

function storedAppearance(record: VerificationRecord): StoredAppearance {
	const value = (record as { appearance?: unknown }).appearance;
	return typeof value === 'object' && value !== null ? (value as StoredAppearance) : {};
}

export function recordSerious(record: VerificationRecord): boolean {
	const stored = storedAppearance(record).serious;
	return typeof stored === 'boolean' ? stored : isSeriousRecord(record);
}

export function recordRoleOf(record: VerificationRecord): unknown {
	const stored = storedAppearance(record).role;
	return isRole(stored) ? stored : (record as { role?: unknown }).role;
}

export function predictedRole(content: string): Role {
	const role = predictLiveRole(content);
	return isRole(role) ? role : DEFAULT_ROLE;
}
