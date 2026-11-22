import type { VerificationRecord } from '../../src/contracts/record';
import { VERDICTS, VERDICT_LABELS_PL, type Verdict } from '../../src/contracts/verdict';
import { HISTORY_STORAGE_KEY, historyMayBeSaved } from './privacy/consent';

export const HISTORY_KEY = HISTORY_STORAGE_KEY;
export const HISTORY_LIMIT = 8;
const CLAIM_PREVIEW_CHARS = 140;

export interface HistoryEntry {
	id: string;
	text: string;
	label: string;
	checkedAt: string;
}

function isEntry(value: unknown): value is HistoryEntry {
	if (typeof value !== 'object' || value === null) return false;
	const entry = value as Record<string, unknown>;
	return (
		typeof entry.id === 'string' &&
		/^[0-9a-f]{64}$/.test(entry.id) &&
		typeof entry.text === 'string' &&
		typeof entry.label === 'string' &&
		typeof entry.checkedAt === 'string'
	);
}

export function verdictOfEntry(entry: HistoryEntry): Verdict | null {
	return VERDICTS.find((verdict) => VERDICT_LABELS_PL[verdict] === entry.label) ?? null;
}

export function loadHistory(): HistoryEntry[] {
	if (!historyMayBeSaved()) return [];
	try {
		const raw = window.localStorage.getItem(HISTORY_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isEntry).slice(0, HISTORY_LIMIT);
	} catch {
		return [];
	}
}

function save(entries: HistoryEntry[]): void {
	try {
		window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
	} catch {
		return;
	}
}

export function entryFromRecord(record: VerificationRecord): HistoryEntry {
	const first = record.claims[0];
	const claimText = first?.claim.text.replace(/\s+/gu, ' ').trim() ?? '';
	const preview =
		claimText.length > CLAIM_PREVIEW_CHARS ? `${claimText.slice(0, CLAIM_PREVIEW_CHARS - 1).trimEnd()}…` : claimText;
	return {
		id: record.id,
		text: preview || 'Sprawdzenie bez twierdzenia',
		label: first ? VERDICT_LABELS_PL[first.verdict] : 'bez oceny',
		checkedAt: record.createdAt,
	};
}

export function addToHistory(record: VerificationRecord): void {
	if (!historyMayBeSaved()) return;
	try {
		const entry = entryFromRecord(record);
		const rest = loadHistory().filter((item) => item.id !== entry.id);
		save([entry, ...rest].slice(0, HISTORY_LIMIT));
	} catch {
		return;
	}
}

/** Usuwa z listy wpis, którego wynik już nie istnieje na serwerze (wygasł albo został usunięty). */
export function removeFromHistory(id: string): void {
	try {
		const rest = loadHistory().filter((item) => item.id !== id);
		if (rest.length === 0) window.localStorage.removeItem(HISTORY_KEY);
		else save(rest);
	} catch {
		return;
	}
}

export function clearHistory(): void {
	try {
		window.localStorage.removeItem(HISTORY_KEY);
	} catch {
		return;
	}
}
