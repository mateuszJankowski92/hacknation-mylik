import type { VerificationRecord } from '../../src/contracts/record';

const MAX_CACHED_RECORDS = 8;
const records = new Map<string, VerificationRecord>();

export function rememberRecord(record: VerificationRecord): void {
	records.delete(record.id);
	records.set(record.id, record);
	while (records.size > MAX_CACHED_RECORDS) {
		const oldest = records.keys().next().value;
		if (oldest === undefined) return;
		records.delete(oldest);
	}
}

export function recallRecord(id: string): VerificationRecord | null {
	return records.get(id) ?? null;
}

export function forgetRecords(): void {
	records.clear();
}
