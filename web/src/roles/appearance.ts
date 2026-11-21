import type { VerificationRecord } from '../../../src/contracts/record';
import { isSeriousRecord } from '../../../src/roles/serious';

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
