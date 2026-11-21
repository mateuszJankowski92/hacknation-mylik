import type { ClaimResult, Engine, VerificationRecord, VerifyInput, VerifyOutcome } from '../contracts/index';
import { STRENGTH_REASON_LABELS_PL } from '../contracts/verdict';
import type { ProgressEngine, VerifyOptions } from '../engine/progress';
import { maskPii } from '../input/pii';
import type { CaseStore, ReportResult } from './store';
import type { CaseSearchInfo } from './types';

export const MAX_CLAIM_CHARS = 300;
const MAX_LIST_ITEMS = 12;
const MAX_ITEM_CHARS = 120;
const MAX_REASON_CHARS = 400;

export type CaseEventFn = (type: string, detail: Record<string, string | number | boolean | null>) => void;

function clip(text: string, max: number): string {
	const clean = text.replace(/\s+/g, ' ').trim();
	return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export function safeText(text: string, max: number): string {
	return clip(maskPii(text).text, max);
}

function safeList(list: readonly string[] | undefined): string[] {
	return (list ?? []).slice(0, MAX_LIST_ITEMS).map((t) => safeText(t, MAX_ITEM_CHARS)).filter((t) => t.length > 0);
}

export function isNoEvidence(result: ClaimResult): boolean {
	return result.verdict === 'brak_wystarczajacych_dowodow';
}

export function searchInfoOf(result: ClaimResult): CaseSearchInfo {
	return {
		claimKind: result.claim.kind,
		searchTerms: safeList(result.claim.searchTerms),
		counterTerms: safeList(result.claim.counterTerms),
		refutationPerformed: result.refutation.performed,
		refutationQueries: safeList(result.refutation.queries),
		refutationFound: result.refutation.found,
		abstainReason: safeText(result.abstainReason ?? '', MAX_REASON_CHARS),
		strengthReasons: result.strength.reasons.map((code) => STRENGTH_REASON_LABELS_PL[code]),
		limitations: safeList(result.limitations),
		evidenceCount: result.evidence.length,
	};
}

export function trackRecord(store: CaseStore, record: VerificationRecord, channel: string): ReportResult[] {
	const reports: ReportResult[] = [];
	for (const result of record.claims) {
		if (!isNoEvidence(result)) continue;
		const claimText = safeText(result.claim.text, MAX_CLAIM_CHARS);
		if (claimText.length === 0) continue;
		reports.push(store.recordReport({ claimText, searchInfo: searchInfoOf(result), recordId: record.id, channel }));
	}
	return reports;
}

export function withCaseTracking(engine: Engine, store: CaseStore, logEvent?: CaseEventFn): Engine {
	const inner = engine as ProgressEngine;
	return {
		...engine,
		async verify(input: VerifyInput, opts?: VerifyOptions): Promise<VerifyOutcome> {
			const outcome = await inner.verify(input, opts);
			if (outcome.kind !== 'record') return outcome;
			try {
				for (const report of trackRecord(store, outcome.record, input.channel)) {
					logEvent?.('case_saved', {
						caseId: report.caseId,
						created: report.created,
						reportCount: report.reportCount,
						reopened: report.reopened,
						channel: input.channel,
					});
				}
			} catch {
				try {
					logEvent?.('case_error', { channel: input.channel });
				} catch {
				}
			}
			return outcome;
		},
		getRecord: (id: string) => engine.getRecord(id),
	} as ProgressEngine;
}
