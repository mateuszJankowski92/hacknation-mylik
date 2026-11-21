export const SUBMIT_SHORTCUT_LABELS = { apple: '⌘ Enter', other: 'Ctrl + Enter' } as const;

interface ShortcutKeyEvent {
	key: string;
	metaKey: boolean;
	ctrlKey: boolean;
	isComposing?: boolean;
}

export function isSubmitShortcut(event: ShortcutKeyEvent): boolean {
	return event.key === 'Enter' && (event.metaKey || event.ctrlKey) && event.isComposing !== true;
}

function isTouchDevice(): boolean {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
	return window.matchMedia('(hover: none), (pointer: coarse)').matches;
}

function isApplePlatform(): boolean {
	if (typeof navigator === 'undefined') return false;
	const data = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
	const platform = data?.platform || navigator.platform || '';
	return /mac|iphone|ipad|ipod/i.test(platform);
}

export function submitShortcutHint(): string | null {
	if (isTouchDevice()) return null;
	return isApplePlatform() ? SUBMIT_SHORTCUT_LABELS.apple : SUBMIT_SHORTCUT_LABELS.other;
}
