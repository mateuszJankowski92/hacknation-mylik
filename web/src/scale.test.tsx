// @vitest-environment jsdom
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { VerificationRecord } from '../../src/contracts/record';
import { ABSTAIN_WORDS, headlineLength } from './components/RecordClaim';
import { RecordView } from './components/RecordView';
import { FIXTURE_OUTCOMES } from './fixtures/outcomes';

afterEach(cleanup);

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT_FONT_PX = 18;

function cssFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((name) => {
		const path = join(directory, name);
		if (statSync(path).isDirectory()) return cssFiles(path);
		return name.endsWith('.css') ? [path] : [];
	});
}

function readCss(name: string): string {
	return readFileSync(join(HERE, name), 'utf8');
}

function block(css: string, selector: string, occurrence = 0): string {
	const escaped = selector.replace(/[.[\]()*+?^$|\\]/g, '\\$&');
	const matches = [...css.matchAll(new RegExp(`(?:^|\\n|\\t)${escaped}\\s*\\{([^}]*)\\}`, 'g'))];
	const found = matches[occurrence];
	if (!found) throw new Error(`brak reguły: ${selector}`);
	return found[1];
}

function record(key: string): VerificationRecord {
	const outcome = FIXTURE_OUTCOMES[key]!;
	if (outcome.kind !== 'record') throw new Error('brak rekordu');
	return outcome.record;
}

function fontSizesPx(css: string): number[] {
	const sizes: number[] = [];
	for (const match of css.matchAll(/font-size:\s*([^;]+);/g)) {
		const value = match[1].trim();
		for (const part of value.matchAll(/(\d*\.?\d+)(px|rem)/g)) {
			sizes.push(part[2] === 'rem' ? Number(part[1]) * ROOT_FONT_PX : Number(part[1]));
		}
	}
	return sizes;
}

describe('minima skali', () => {
	const files = cssFiles(HERE);

	it('żaden tekst nie jest mniejszy niż 16 px, a nic poza hasłem nie przekracza 72 px', () => {
		expect(files.length).toBeGreaterThan(5);
		for (const file of files) {
			const sizes = fontSizesPx(readFileSync(file, 'utf8'));
			for (const size of sizes) {
				expect(size, file).toBeGreaterThanOrEqual(16);
				expect(size, file).toBeLessThanOrEqual(72);
			}
		}
	});

	it('cele dotyku mają co najmniej 48 px', () => {
		const touch: Array<[string, string]> = [
			['styles.css', '.site-header nav a'],
			['styles.css', '.site-header__brand a'],
			['styles.css', '.text-button'],
			['styles.css', '.button'],
			['scenes/scenes.css', '.scene-skip'],
			['components/hero.css', '.hero__skip'],
			['components/record.css', '.record-claim__evidence-link button'],
			['components/record.css', '.record-card__download'],
		];
		for (const [file, selector] of touch) {
			const height = Number(/min-height:\s*(\d+)px/.exec(block(readCss(file), selector))?.[1]);
			expect(height, `${file} ${selector}`).toBeGreaterThanOrEqual(48);
		}
		for (const file of files) expect(readFileSync(file, 'utf8')).not.toMatch(/min-height:\s*44px/);
	});

	it('odstępy sekcji na dużym ekranie to 96 px lub więcej', () => {
		const styles = readCss('styles.css');
		expect(styles).toMatch(/--space-10:\s*96px/);
		expect(styles).toMatch(/@media \(min-width: 1024px\) \{\s*body \{\s*--section-gap:\s*var\(--space-10\);/);
	});
});

describe('strona główna w skali', () => {
	const hero = readCss('components/hero.css');

	it('hasło: 32-36 px na telefonie, 56-72 px na dużym ekranie, logotyp 24-28 px', () => {
		expect(block(hero, '.hero__title')).toContain('font-size: clamp(32px, 8.4vw, 36px)');
		expect(hero).toContain('font-size: clamp(56px, 4vw, 72px)');
		const brand = Number(/font-size:\s*(\d+)px/.exec(block(readCss('styles.css'), '.site-header__brand'))?.[1]);
		expect(brand).toBeGreaterThanOrEqual(24);
		expect(brand).toBeLessThanOrEqual(28);
	});

	it('pole i przycisk: telefon 120 px, 20 px, 56 px; duży ekran 140 px, 22 px, 64 px', () => {
		const textarea = block(hero, '.hero textarea');
		expect(textarea).toContain('min-height: 120px');
		expect(textarea).toContain('font-size: 20px');
		expect(block(hero, '.hero .button')).toContain('min-height: 56px');
		expect(hero).toMatch(/\.hero textarea \{\s*min-height: 140px;[^}]*font-size: 22px;/);
		expect(hero).toMatch(/\.hero \.button \{\s*min-height: 64px;[^}]*font-size: 22px;/);
	});

	it('postać na dużym ekranie: 420-520 px wysokości, układ dzielony na dwie kolumny', () => {
		expect(hero).toContain('--hero-art-height: clamp(420px, 56svh, 520px)');
		expect(hero).toMatch(/grid-template-columns: minmax\(560px, 1fr\) minmax\(0, 1fr\)/);
	});

	it('na telefonie wysokość postaci zależy od ekranu tak, by przycisk został nad 600 px', () => {
		expect(block(hero, '.hero')).toMatch(/--hero-art-height: clamp\(120px, calc\(70svh - \d+px\), 36svh\)/);
	});
});

describe('czekanie i wynik w skali', () => {
	const visuals = readCss('visuals/visuals.css');
	const roles = readCss('roles/roles.css');
	const styles = readCss('styles.css');

	it('zdanie postępu ma 22 px, a scena zajmuje większość ekranu', () => {
		expect(block(visuals, '.waiting-steps__status')).toContain('font-size: 22px');
		expect(block(visuals, '.waiting-steps')).toContain('--waiting-scene-width: min(100%, calc((100svh - 340px) * 0.8), 640px)');
		expect(block(visuals, '.waiting-steps__scene')).toContain('width: var(--waiting-scene-width)');
	});

	it('postać w rogu wyniku ma 96 px na telefonie i 112 px na dużym ekranie', () => {
		expect(block(roles, '.result-corner')).toContain('width: 96px');
		expect(roles).toMatch(/\.result-corner \{\s*position: absolute;[^}]*width: 112px;/);
	});

	it('zdanie wyniku: 28-32 px na telefonie, 40-48 px na dużym ekranie, "Nie wiem." co najmniej tyle', () => {
		const phone = [block(roles, '.record-claim__lead .record-claim__headline'), block(roles, ".record-claim__lead .record-claim__headline[data-length='medium']"), block(roles, ".record-claim__lead .record-claim__headline[data-length='long']")]
			.map((text) => Number(/--headline-size:\s*(\d+)px/.exec(text)?.[1]));
		expect(phone).toEqual([32, 30, 28]);
		const wide = [...roles.matchAll(/@media \(min-width: 1024px\) \{([\s\S]*?)\n\}/g)].map((match) => match[1]).join('\n');
		expect([...wide.matchAll(/--headline-size:\s*(\d+)px/g)].map((match) => Number(match[1]))).toEqual([48, 44, 40]);
		const abstain = readCss('components/record.css');
		expect(abstain).toMatch(/--headline-size: 44px/);
		expect(abstain).toMatch(/--headline-size: clamp\(56px, 6vw, 72px\)/);
	});

	it('przejście rozmiaru trwa 300-400 ms i jest wyłączone przy ograniczeniu ruchu', () => {
		const duration = Number(/--resize-duration:\s*(\d+)ms/.exec(styles)?.[1]);
		expect(duration).toBeGreaterThanOrEqual(300);
		expect(duration).toBeLessThanOrEqual(400);
		expect(roles).toContain('animation: result-sentence-grow var(--resize-duration)');
		expect(roles).toContain('animation: result-corner-shrink var(--resize-duration)');
		expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\*,\s*\*::before,\s*\*::after \{\s*animation: none !important;/);
	});
});

describe('wynik w skali: widok', () => {
	it('postać w rogu jest dekoracją, a zdanie wyniku dostaje rozmiar od długości', () => {
		const { container } = render(<RecordView record={record('potwierdzone')} />);
		const corner = container.querySelector('.result-corner');
		expect(corner?.getAttribute('aria-hidden')).toBe('true');
		expect(container.querySelector('.result-corner img[alt=""], .result-corner svg[aria-hidden="true"]')).not.toBeNull();
		expect(container.querySelector('.record-claim__headline')?.getAttribute('data-length')).toMatch(/^(short|medium|long)$/);
		expect(headlineLength('a'.repeat(60))).toBe('short');
		expect(headlineLength('a'.repeat(120))).toBe('medium');
		expect(headlineLength('a'.repeat(260))).toBe('long');
	});

	it('"brak wystarczających dowodów": dwa słowa, jedno zdanie, bez obrazu wyniku, etykieta mała', () => {
		const { container } = render(<RecordView record={record('brak_wystarczajacych_dowodow')} />);
		expect(container.querySelector('.record-claim--abstain')).not.toBeNull();
		const headline = container.querySelector('.record-claim__headline');
		expect(headline?.textContent).toBe(ABSTAIN_WORDS);
		expect(ABSTAIN_WORDS.split(' ')).toHaveLength(2);
		const note = container.querySelector('.record-claim__summary .verdict__note');
		expect(note?.textContent).toMatch(/Nie znalazłem tego w sprawdzonych źródłach/);
		expect(note?.textContent).toMatch(/zajrzyj na stronę właściwego urzędu/);
		expect(container.querySelector('.result-image')).toBeNull();
		expect(container.querySelector('.record-claim__abstain-sentence')).toBeNull();
		expect(container.querySelector('.record-claim__primary')).toBeNull();
	});

	it('sprzeczne źródła: pod "Nie wiem." stoi zdanie z nazwami wydawców', () => {
		const base = structuredClone(record('brak_wystarczajacych_dowodow'));
		const evidence = structuredClone(record('potwierdzone').claims[0]!.evidence[0]!);
		base.claims[0]!.evidence = [
			{ ...evidence, stance: 'potwierdza', source: { ...evidence.source, publisher: 'Urząd A' } },
			{ ...evidence, passageId: 'p2', stance: 'obala', source: { ...evidence.source, publisher: 'Urząd B' } },
		];
		const { container } = render(<RecordView record={base} />);
		expect(container.querySelector('.record-claim__headline')?.textContent).toBe(ABSTAIN_WORDS);
		expect(container.querySelector('.record-claim__abstain-sentence')?.textContent).toMatch(/Urząd A i Urząd B podają sprzeczne informacje/);
	});
});
