import type { VerificationRecord } from '../../../src/contracts/record';
import { STEP_TEXTS } from '../visuals/waitingConfig';

export function howSearchedLines(record: VerificationRecord): string[] {
	if (record.claims.length === 0) return [];
	const lines: string[] = [STEP_TEXTS.read()];
	const refutations = record.claims.map((result) => result.refutation).filter((refutation) => refutation.performed);
	if (refutations.length > 0) {
		const found = refutations.reduce((sum, refutation) => sum + refutation.found, 0);
		lines.push(found === 0 ? 'Szukałem też źródeł, które mówią co innego. Nic nie znalazłem.' : `Szukałem też źródeł, które mówią co innego. Znalazłem: ${found}.`);
	}
	const passed = record.claims.reduce((sum, result) => sum + result.evidence.length, 0);
	if (passed > 0) lines.push(STEP_TEXTS.checkedQuotes(passed));
	const seconds = Math.round(record.usage.latencyMs / 1000);
	if (seconds > 0) lines.push(`Całe sprawdzenie trwało ${seconds} s.`);
	return lines;
}
