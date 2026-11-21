import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'styles.css'), 'utf8');

function parseTokens(block: string): Record<string, string> {
	const tokens: Record<string, string> = {};
	for (const match of block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6});/g)) tokens[match[1]] = match[2];
	return tokens;
}

const blocks = [...css.matchAll(/:root\s*\{([^}]*)\}/g)].map((match) => parseTokens(match[1]));
const themes = { jasny: blocks[0], ciemny: blocks[1] };

function luminance(hex: string): number {
	const channels = [1, 3, 5].map((index) => {
		const value = parseInt(hex.slice(index, index + 2), 16) / 255;
		return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(foreground: string, background: string): number {
	const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
	return (light + 0.05) / (dark + 0.05);
}

const PAIRS: Array<[string, string]> = [
	['text', 'bg'],
	['text', 'surface'],
	['muted', 'bg'],
	['muted', 'surface'],
	['link', 'bg'],
	['link', 'surface'],
	['on-primary', 'primary'],
	['primary', 'bg'],
	['ok-fg', 'ok-bg'],
	['danger-fg', 'danger-bg'],
	['danger-fg', 'bg'],
	['danger-fg', 'surface'],
	['warn-fg', 'warn-bg'],
	['info-fg', 'info-bg'],
	['neutral-fg', 'neutral-bg'],
	['state-fg', 'state-bg'],
];

describe('kontrast kolorów (WCAG AA, min. 4,5:1)', () => {
	it('wykrywa oba motywy w styles.css', () => {
		expect(Object.keys(themes.jasny).length).toBeGreaterThan(10);
		expect(Object.keys(themes.ciemny).length).toBe(Object.keys(themes.jasny).length);
	});

	for (const [themeName, tokens] of Object.entries(themes)) {
		for (const [foreground, background] of PAIRS) {
			it(`${themeName}: ${foreground} na ${background}`, () => {
				expect(contrastRatio(tokens[foreground], tokens[background])).toBeGreaterThanOrEqual(4.5);
			});
		}
	}

	it('obsługuje obramowanie i fokus (min. 3:1)', () => {
		for (const tokens of Object.values(themes)) {
			expect(contrastRatio(tokens.border, tokens.bg)).toBeGreaterThanOrEqual(3);
			expect(contrastRatio(tokens.focus, tokens.bg)).toBeGreaterThanOrEqual(3);
		}
	});
});
