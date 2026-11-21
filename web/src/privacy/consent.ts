import { useSyncExternalStore } from 'react';

export const PRIVACY_STORAGE_KEY = 'mylik:prywatnosc:v1';
export const HISTORY_STORAGE_KEY = 'mylik:ostatnie-sprawdzenia:v1';

export type HistoryConsent = 'unset' | 'granted' | 'denied';

function parseConsent(raw: string | null): HistoryConsent {
	if (!raw) return 'unset';
	try {
		const parsed: unknown = JSON.parse(raw);
		const value = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>).history : undefined;
		return value === 'granted' || value === 'denied' ? value : 'unset';
	} catch {
		return 'unset';
	}
}

function readStored(): HistoryConsent {
	try {
		return parseConsent(window.localStorage.getItem(PRIVACY_STORAGE_KEY));
	} catch {
		return 'unset';
	}
}

function writeStored(consent: HistoryConsent): void {
	try {
		if (consent === 'unset') window.localStorage.removeItem(PRIVACY_STORAGE_KEY);
		else window.localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify({ history: consent }));
	} catch {
		return;
	}
}

function removeHistory(): void {
	try {
		window.localStorage.removeItem(HISTORY_STORAGE_KEY);
	} catch {
		return;
	}
}

let current: HistoryConsent | null = null;
const listeners = new Set<() => void>();

export function getHistoryConsent(): HistoryConsent {
	if (current === null) current = readStored();
	return current;
}

export function setHistoryConsent(next: HistoryConsent): void {
	if (next === 'denied') removeHistory();
	current = next;
	writeStored(next);
	listeners.forEach((listener) => listener());
}

export function reloadHistoryConsent(): void {
	current = null;
	listeners.forEach((listener) => listener());
}

export function historyMayBeSaved(): boolean {
	return getHistoryConsent() === 'granted';
}

export function subscribeConsent(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function useHistoryConsent(): HistoryConsent {
	return useSyncExternalStore(subscribeConsent, getHistoryConsent, getHistoryConsent);
}
