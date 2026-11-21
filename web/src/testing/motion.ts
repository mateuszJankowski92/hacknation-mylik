import { vi } from 'vitest';

export function stubReducedMotion(matches: boolean): void {
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: matches && query.includes('reduce'),
		media: query,
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
	}));
}
