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
const themes = { jasny: blocks[0] };

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
	['text', 'paper-shade'],
	['text', 'paper-light'],
	['muted', 'paper-light'],
	['link', 'paper-light'],
	['text', 'sea-tint'],
	['text', 'coral-tint'],
	['muted', 'bg'],
	['struck', 'bg'],
	['muted', 'surface'],
	['muted', 'paper-shade'],
	['link', 'bg'],
	['link', 'surface'],
	['link', 'sea-tint'],
	['sea', 'bg'],
	['sea', 'surface'],
	['coral', 'bg'],
	['coral', 'surface'],
	['on-primary', 'primary'],
	['primary', 'bg'],
	['primary', 'surface'],
	['on-accent', 'accent'],
	['on-accent', 'accent-hover'],
	['on-accent', 'accent-active'],
	['on-accent', 'accent-edge'],
	['on-accent-disabled', 'accent-disabled'],
	['danger-fg', 'danger-bg'],
	['danger-fg', 'bg'],
	['danger-fg', 'surface'],
	['warn-fg', 'warn-bg'],
	['neutral-fg', 'neutral-bg'],
	['state-fg', 'state-bg'],
	['state-fg', 'bg'],
	['graphite', 'bg'],
	['graphite', 'surface'],
];

describe('kontrast kolorów (WCAG AA, min. 4,5:1)', () => {
	it('ma jeden, jasny motyw: tło dokładnie #FFFFFF i brak reakcji na systemowy tryb ciemny', () => {
		expect(blocks).toHaveLength(1);
		expect(Object.keys(themes.jasny).length).toBeGreaterThan(10);
		expect(themes.jasny.bg.toLowerCase()).toBe('#ffffff');
		expect(css).not.toMatch(/prefers-color-scheme/);
		expect(css).toMatch(/color-scheme:\s*only light/);
	});

	it('wszystkie arkusze interfejsu obywatela pomijają tryb ciemny', () => {
		for (const file of ['roles/roles.css', 'scenes/scenes.css', 'visuals/visuals.css', 'components/hero.css', 'components/home.css', 'components/record.css']) {
			expect(readFileSync(join(dirname(fileURLToPath(import.meta.url)), file), 'utf8')).not.toMatch(/prefers-color-scheme/);
		}
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
			expect(contrastRatio(tokens.graphite, tokens.bg)).toBeGreaterThanOrEqual(3);
			expect(contrastRatio(tokens.accent, tokens.bg)).toBeGreaterThanOrEqual(1.8);
		}
	});

	it('paleta papieru: kontur grafitowy, pomarańcz apaszki jako kolor działań, morski i koralowy jako akcenty', () => {
		const tokens = themes.jasny;
		expect(tokens.bg.toLowerCase()).toBe('#ffffff');
		expect(css).toMatch(/--outline:\s*1\.5px/);
		for (const name of ['paper', 'paper-shade', 'paper-fold', 'graphite', 'accent', 'sea', 'sea-tint', 'coral', 'coral-tint']) expect(tokens[name], name).toBeTruthy();
		const [r, g, b] = [1, 3, 5].map((index) => parseInt(tokens.accent.slice(index, index + 2), 16));
		expect(r).toBeGreaterThan(g);
		expect(g).toBeGreaterThan(b);
		expect(r).toBeGreaterThan(220);
		expect(b).toBeLessThan(110);
	});

	it('nie ma zieleni ani czerwieni jako sygnału werdyktu', () => {
		expect(css).not.toMatch(/--ok-(fg|bg)/);
		expect(css).not.toMatch(/\.verdict--(ok|danger|warn|info)\b/);
		for (const file of ['components/record.css', 'visuals/visuals.css', 'roles/roles.css']) {
			const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), file), 'utf8');
			expect(source, file).not.toMatch(/var\(--ok-|var\(--info-|\.verdict--(ok|danger|warn|info)\b/);
		}
	});

	it('akcent każdej roli ma kontrast co najmniej 4,5:1 na białym tle', () => {
		const roles = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'roles/roles.css'), 'utf8');
		const accents = new Map<string, string>();
		for (const match of roles.matchAll(/\[data-role='([a-z]+)'\]\s*\{\s*--role-accent:\s*(#[0-9a-fA-F]{6});/g)) accents.set(match[1], match[2]);
		accents.set('pogodynka', roles.match(/:root\s*\{\s*--role-accent:\s*(#[0-9a-fA-F]{6});/)![1]);
		expect([...accents.keys()].sort()).toEqual(
			['bibliotekarka', 'kasjer', 'konduktor', 'kucharz', 'lesnik', 'listonosz', 'nauczyciel', 'naukowiec', 'pilkarz', 'pogodynka', 'slusarz', 'sport'],
		);
		for (const [role, accent] of accents) expect(contrastRatio(accent, '#ffffff'), role).toBeGreaterThanOrEqual(4.5);
	});
});
