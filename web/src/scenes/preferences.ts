export const LEGACY_SCENE_STORAGE_KEY = 'mylik.pomin-animacje';

export function clearLegacySceneChoice(): void {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.removeItem(LEGACY_SCENE_STORAGE_KEY);
	} catch {
		return;
	}
}

function motionChoice(): string | undefined {
	if (typeof document === 'undefined') return undefined;
	return document.documentElement.getAttribute('data-motion') ?? undefined;
}

export function prefersReducedMotion(): boolean {
	const choice = motionChoice();
	if (choice === 'off') return true;
	if (choice === 'on') return false;
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function connectionIsSlow(): boolean {
	if (typeof navigator === 'undefined' || motionChoice() === 'on') return false;
	const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
	if (!connection) return false;
	return connection.saveData === true || connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
}

export function animationStartsAutomatically(): boolean {
	return !prefersReducedMotion() && !connectionIsSlow();
}
