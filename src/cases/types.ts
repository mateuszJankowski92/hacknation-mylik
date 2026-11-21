export const CASE_STATES = ['nowa', 'w_toku', 'zamknieta'] as const;
export type CaseState = (typeof CASE_STATES)[number];

export const CASE_STATE_LABELS_PL: Record<CaseState, string> = {
	nowa: 'nowa',
	w_toku: 'w toku',
	zamknieta: 'zamknięta',
};

export function isCaseState(value: unknown): value is CaseState {
	return typeof value === 'string' && (CASE_STATES as readonly string[]).includes(value);
}

export interface CaseSearchInfo {
	claimKind: string;
	searchTerms: string[];
	counterTerms: string[];
	refutationPerformed: boolean;
	refutationQueries: string[];
	refutationFound: number;
	abstainReason: string;
	strengthReasons: string[];
	limitations: string[];
	evidenceCount: number;
}

export interface CaseRecordLink {
	recordId: string;
	linkedAt: string;
}

export interface CaseItem {
	id: number;
	claimText: string;
	firstSeen: string;
	lastSeen: string;
	reportCount: number;
	channels: Record<string, number>;
	state: CaseState;
	note: string;
	searchInfo: CaseSearchInfo;
	forwardedTo: string | null;
	forwardedAt: string | null;
	forwardedReportCount: number | null;
	records: CaseRecordLink[];
}

export const CASE_PUBLIC_STATUSES = ['brak', 'zapisano', 'przekazano'] as const;
export type CasePublicStatus = (typeof CASE_PUBLIC_STATUSES)[number];

export interface CasePublicResponse {
	status: CasePublicStatus;
	forwardedAt?: string;
}
