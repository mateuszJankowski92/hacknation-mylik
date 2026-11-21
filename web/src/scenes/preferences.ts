const STORAGE_KEY = 'mylik.pomin-animacje';

let memoryValue: boolean | null = null;
const listeners = new Set<() => void>();

export function readSceneSkipped(): boolean {
	if (memoryValue !== null) return memoryValue;
	try {
		return window.localStorage.getItem(STORAGE_KEY) === '1';
	} catch {
		return false;
	}
}

export function writeSceneSkipped(skipped: boolean): void {
	try {
		if (skipped) window.localStorage.setItem(STORAGE_KEY, '1');
		else window.localStorage.removeItem(STORAGE_KEY);
		memoryValue = null;
	} catch {
		memoryValue = skipped;
	}
	listeners.forEach((listener) => listener());
}

export function subscribeSceneSkipped(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function connectionIsSlow(): boolean {
	if (typeof navigator === 'undefined') return false;
	const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
	if (!connection) return false;
	return connection.saveData === true || connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
}
