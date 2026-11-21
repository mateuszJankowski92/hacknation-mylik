import { useSyncExternalStore } from 'react';

export const A11Y_STORAGE_KEY = 'mylik:dostepnosc:v1';

export const CONTRASTS = ['normal', 'high'] as const;
export const TEXT_SIZES = ['normal', 'large', 'xlarge'] as const;
export const SPACINGS = ['normal', 'wide'] as const;
export const MOTIONS = ['system', 'on', 'off'] as const;

export type Contrast = (typeof CONTRASTS)[number];
export type TextSize = (typeof TEXT_SIZES)[number];
export type Spacing = (typeof SPACINGS)[number];
export type Motion = (typeof MOTIONS)[number];

export interface A11ySettings {
	contrast: Contrast;
	textSize: TextSize;
	spacing: Spacing;
	motion: Motion;
}

export const DEFAULT_SETTINGS: A11ySettings = { contrast: 'normal', textSize: 'normal', spacing: 'normal', motion: 'system' };

export const TEXT_SIZE_PERCENT: Record<TextSize, number> = { normal: 100, large: 125, xlarge: 150 };

const ATTRIBUTES: Record<keyof A11ySettings, string> = {
	contrast: 'data-contrast',
	textSize: 'data-text-size',
	spacing: 'data-spacing',
	motion: 'data-motion',
};

function pick<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
	return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function parseSettings(raw: unknown): A11ySettings {
	if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_SETTINGS };
	const value = raw as Record<string, unknown>;
	return {
		contrast: pick(CONTRASTS, value.contrast, DEFAULT_SETTINGS.contrast),
		textSize: pick(TEXT_SIZES, value.textSize, DEFAULT_SETTINGS.textSize),
		spacing: pick(SPACINGS, value.spacing, DEFAULT_SETTINGS.spacing),
		motion: pick(MOTIONS, value.motion, DEFAULT_SETTINGS.motion),
	};
}

export function isDefaultSettings(settings: A11ySettings): boolean {
	return (Object.keys(DEFAULT_SETTINGS) as Array<keyof A11ySettings>).every((key) => settings[key] === DEFAULT_SETTINGS[key]);
}

function readStored(): A11ySettings {
	try {
		const raw = window.localStorage.getItem(A11Y_STORAGE_KEY);
		return raw ? parseSettings(JSON.parse(raw)) : { ...DEFAULT_SETTINGS };
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

function writeStored(settings: A11ySettings): void {
	try {
		if (isDefaultSettings(settings)) window.localStorage.removeItem(A11Y_STORAGE_KEY);
		else window.localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(settings));
	} catch {
		return;
	}
}

export function applySettings(settings: A11ySettings, root: HTMLElement = document.documentElement): void {
	for (const key of Object.keys(ATTRIBUTES) as Array<keyof A11ySettings>) {
		if (settings[key] === DEFAULT_SETTINGS[key]) root.removeAttribute(ATTRIBUTES[key]);
		else root.setAttribute(ATTRIBUTES[key], settings[key]);
	}
}

let current: A11ySettings | null = null;
const listeners = new Set<() => void>();

export function getSettings(): A11ySettings {
	if (!current) {
		current = readStored();
		applySettings(current);
	}
	return current;
}

function publish(next: A11ySettings): void {
	current = next;
	applySettings(next);
	writeStored(next);
	listeners.forEach((listener) => listener());
}

export function updateSettings(patch: Partial<A11ySettings>): void {
	publish(parseSettings({ ...getSettings(), ...patch }));
}

export function resetSettings(): void {
	publish({ ...DEFAULT_SETTINGS });
}

export function reloadSettings(): void {
	current = null;
	getSettings();
	listeners.forEach((listener) => listener());
}

export function subscribeSettings(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function useA11ySettings(): A11ySettings {
	return useSyncExternalStore(subscribeSettings, getSettings, getSettings);
}

export function useMotionSetting(): Motion {
	return useA11ySettings().motion;
}
