import type { Engine, VerificationRecord, VerifyInput, VerifyOutcome } from '../contracts/index';
import type { ProgressEngine, VerifyOptions } from '../engine/progress';
import type { Appearance } from './live';
import type { RoleStore } from './store';

export type RoleEventFn = (type: string, detail: Record<string, string | number | boolean | null>) => void;

export type RecordWithAppearance = VerificationRecord & { appearance: Appearance };

function withAppearance(record: VerificationRecord, store: RoleStore, logEvent?: RoleEventFn): RecordWithAppearance {
	const before = store.get(record.id);
	const appearance = store.decideAndSave(record);
	if (!before) {
		try {
			logEvent?.('role_chosen', { role: appearance.role, serious: appearance.serious });
		} catch {
			// log nie może psuć odpowiedzi
		}
	}
	return { ...record, appearance };
}

/**
 * Dokłada do rekordu pole `appearance` (rola wyglądu i flaga powagi) z zapisu przy rekordzie. Awaria zapisu
 * nigdy nie psuje odpowiedzi: rekord wraca bez `appearance`, a interfejs używa roli domyślnej.
 */
export function withLiveRole(engine: Engine, store: RoleStore, logEvent?: RoleEventFn): Engine {
	const inner = engine as ProgressEngine;
	function decorate(record: VerificationRecord): VerificationRecord {
		try {
			return withAppearance(record, store, logEvent);
		} catch {
			return record;
		}
	}
	return {
		...engine,
		async verify(input: VerifyInput, opts?: VerifyOptions): Promise<VerifyOutcome> {
			const outcome = await inner.verify(input, opts);
			if (outcome.kind !== 'record') return outcome;
			return { ...outcome, record: decorate(outcome.record) };
		},
		getRecord(id: string): VerificationRecord | null {
			const record = engine.getRecord(id);
			return record ? decorate(record) : null;
		},
	} as ProgressEngine;
}
