import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(dir, 'styles.css'), 'utf8');
const homeCss = readFileSync(join(dir, 'components/home.css'), 'utf8');

const tokens: Record<string, string> = {};
for (const match of /:root\s*\{([^}]*)\}/.exec(css)![1].matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6});/g)) tokens[match[1]] = match[2].toLowerCase();

function luminance(hex: string): number {
	const channels = [1, 3, 5].map((index) => {
		const value = parseInt(hex.slice(index, index + 2), 16) / 255;
		return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string): number {
	const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
	return (light + 0.05) / (dark + 0.05);
}

function block(source: string, selector: string): string {
	const start = [...source.matchAll(new RegExp(`(^|[^,]\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{`, 'g'))][0]?.index ?? -1;
	expect(start, selector).toBeGreaterThanOrEqual(0);
	return source.slice(start, source.indexOf('}', start));
}

const waves = decodeURIComponent(/--scarf-waves:\s*url\("data:image\/svg\+xml,([^"]+)"\)/.exec(css)![1]);

describe('fokus klawiatury w stylu papieru', () => {
	it('wskaźnik fokusu jest grafitowy, ma kontrast co najmniej 3:1 względem tła, papieru i cienia papieru', () => {
		expect(tokens.focus).toBe(tokens.graphite);
		for (const background of ['bg', 'surface', 'paper', 'paper-light', 'paper-shade', 'accent', 'accent-hover', 'sea-tint', 'coral-tint']) {
			expect(contrastRatio(tokens.focus, tokens[background]), background).toBeGreaterThanOrEqual(3);
		}
	});

	it('przyciski, odnośniki i pola dostają podwójny grafitowy kontur, bez pełnej kolorowej obwódki', () => {
		expect(block(css, ':focus-visible')).toMatch(/outline: 6px double var\(--focus\)/);
		expect(block(css, '.button:focus-visible')).toMatch(/outline: 6px double var\(--focus\)/);
		expect(block(homeCss, '.home-list__item:has(a:focus-visible)')).toMatch(/outline: 6px double var\(--focus\)/);
		for (const source of [css, homeCss]) {
			expect(source).not.toMatch(/outline:\s*\d+px solid var\(--focus\)/);
			expect(source).not.toMatch(/outline(-color)?:[^;]*#(1f5f5a|ee9b4b)/i);
		}
	});

	it('pole tekstowe po kliknięciu nie ma konturu, a fokus pokazuje unoszenie kartki i ciemniejszą krawędź', () => {
		expect(block(css, 'textarea:focus-visible')).toContain('outline: none');
		const field = block(css, '.check-form__field:focus-within');
		expect(field).not.toMatch(/outline:\s*\d/);
		expect(field).not.toContain('border-color');
		expect(field).not.toContain('0 1px 0 0');
		expect(field).not.toContain('var(--shadow-focus)');
		expect(field).toContain('box-shadow: var(--shadow-lift)');
		expect(field).toContain('translateY(-1px)');
		expect(css).toMatch(/\.check-form__field:focus-within::after \{[^}]*var\(--focus-field-fold\)/);
	});

	it('fokus pola nie dokłada grubej dolnej krawędzi ani większego cienia niż unoszenie', () => {
		const field = block(css, '.check-form__field:focus-within');
		expect(field).not.toMatch(/box-shadow:[^;]*\b1px 0 0\b/);
		expect(field).not.toContain('--focus-field-edge');
	});
});

describe('przycisk główny jak pas apaszki', () => {
	const primary = block(css, '.button--primary');

	it('ma własny wzór SVG z jaśniejszymi falistymi liniami i cienką morską linią, w kolorach z palety', () => {
		expect(waves).toContain('<svg');
		expect(waves.match(/<path/g)!.length).toBeGreaterThanOrEqual(3);
		const colors = [...waves.matchAll(/stroke='(#[0-9a-f]{6})'/g)].map((m) => m[1]);
		expect(colors).toContain(tokens['scarf-wave']);
		expect(colors).toContain(tokens['scarf-sea']);
		expect(luminance(tokens['scarf-wave'])).toBeGreaterThan(luminance(tokens.accent));
		expect(css).not.toMatch(/url\(['"]?(?!data:)[^)]*postacie/);
	});

	it('ma grafitowy kontur 1,5 px i ścięte, nierówne końce (ogonki) wycięte clip-path', () => {
		expect(primary).toContain('border-radius: 0');
		expect(block(css, '.button--primary::before')).toMatch(/inset: calc\(var\(--outline\) \* -1\)/);
		expect(block(css, '.button--primary::before')).toContain('background: var(--graphite)');
		expect(block(css, '.button--primary::before')).toContain('clip-path: polygon(');
		expect(block(css, '.button--primary::after')).toContain('clip-path: polygon(');
		expect(primary).toMatch(/--scarf-cut-long:\s*\d+px/);
		expect(primary).toMatch(/--scarf-cut-short:\s*\d+px/);
		expect(primary).toContain('drop-shadow(');
	});

	it('tekst jest grafitowy, pogrubiony, a pod napisem nie ma linii wzoru', () => {
		expect(primary).toContain('color: var(--on-accent)');
		expect(primary).toContain('font-weight: 700');
		const textBand = [22, 42];
		for (const match of waves.matchAll(/d='M0 (\d+)Q\d+ (\d+) /g)) {
			const extreme = (Number(match[1]) + Number(match[2])) / 2;
			const baseline = Number(match[1]);
			const outside = (value: number) => value < textBand[0] || value > textBand[1];
			expect(outside(extreme) && outside(baseline), match[0]).toBe(true);
		}
		for (const dot of waves.matchAll(/M\d+ (\d+)h\.1/g)) expect(Number(dot[1]) < textBand[0] || Number(dot[1]) > textBand[1]).toBe(true);
	});

	it('kontrast AA tekstu liczony względem najjaśniejszego i najciemniejszego miejsca faktury', () => {
		const underText = [tokens.accent, tokens['accent-hover'], tokens['accent-active'], tokens['scarf-wave'], tokens['scarf-sea']];
		for (const color of underText) expect(contrastRatio(tokens['on-accent'], color), color).toBeGreaterThanOrEqual(4.5);
		const lightest = underText.reduce((a, b) => (luminance(a) > luminance(b) ? a : b));
		const darkest = underText.reduce((a, b) => (luminance(a) < luminance(b) ? a : b));
		expect(contrastRatio(tokens['on-accent'], lightest)).toBeGreaterThanOrEqual(4.5);
		expect(contrastRatio(tokens['on-accent'], darkest)).toBeGreaterThanOrEqual(4.5);
		expect(contrastRatio(tokens['on-accent-disabled'], tokens['accent-disabled'])).toBeGreaterThanOrEqual(4.5);
	});

	it('stany: hover przesuwa fakturę i unosi pas, active opuszcza pas i zdejmuje cień, disabled bez faktury', () => {
		const hover = block(css, '.button--primary:hover:not(:disabled)');
		expect(hover).toContain('translateY(-2px)');
		expect(hover).toContain('drop-shadow(');
		expect(block(css, '.button--primary:hover:not(:disabled)::after')).toContain('background-position');
		const active = block(css, '.button--primary:active:not(:disabled)');
		expect(active).toContain('translateY(2px)');
		expect(active).toContain('filter: none');
		const disabled = block(css, '.button--primary:disabled');
		expect(disabled).toContain('filter: none');
		const disabledFace = block(css, '.button--primary:disabled::after');
		expect(disabledFace).toContain('var(--scarf-waves-faded)');
		expect(disabledFace).toContain('var(--accent-disabled)');
		expect(disabledFace).not.toContain('var(--scarf-waves)');
	});

	it('przy ograniczeniu ruchu nic się nie animuje, a drugorzędne przyciski zostają kremowym papierem z konturem', () => {
		expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*:root:not\(\[data-motion='on'\]\) \*,\s*:root:not\(\[data-motion='on'\]\) \*::before,\s*:root:not\(\[data-motion='on'\]\) \*::after \{\s*animation: none !important;\s*transition: none !important;/);
		const secondary = block(css, '.button');
		expect(secondary).toContain('background: var(--paper)');
		expect(secondary).toContain('border: var(--outline) solid var(--graphite)');
		expect(secondary).toContain('box-shadow: var(--shadow-paper)');
	});
});
