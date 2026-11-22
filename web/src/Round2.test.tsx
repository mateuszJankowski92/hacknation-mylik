// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { summarizeVerdicts } from './components/RecordView';
import { EXAMPLE_QUERIES } from './components/exampleSubmissions';
import { SCENE_TEXTS } from './scenes/config';
import { stubReducedMotion } from './testing/motion';

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(join(HERE, path), 'utf8');

beforeEach(() => {
	stubReducedMotion(true);
	vi.stubGlobal(
		'fetch',
		vi.fn(async (path: string) => {
			if (path.startsWith('/api/sources/latest')) return new Response(JSON.stringify({ corpusVersion: 'x', documents: [] }), { status: 200 });
			return new Response(JSON.stringify({}), { status: 200 });
		}),
	);
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	window.history.replaceState(null, '', '/');
	window.localStorage.clear();
});

describe('podpowiedzi zgłoszeń na stronie głównej', () => {
	it('to 3-4 gotowe zgłoszenia z jednego pliku, bez zapisanych odpowiedzi', () => {
		expect(EXAMPLE_QUERIES.length).toBeGreaterThanOrEqual(3);
		expect(EXAMPLE_QUERIES.length).toBeLessThanOrEqual(4);
		for (const example of EXAMPLE_QUERIES) {
			expect(Object.keys(example).sort()).toEqual(['id', 'label', 'text']);
			expect(example.text.trim().length).toBeGreaterThan(10);
		}
		expect(EXAMPLE_QUERIES.some((example) => /^https?:\/\//u.test(example.text))).toBe(true);
	});

	it('kliknięcie wkleja tekst do pola i ustawia fokus, ale niczego nie wysyła', () => {
		const fetchMock = vi.mocked(fetch);
		render(<App />);
		const region = screen.getByRole('region', { name: 'Przykładowe zgłoszenia' });
		const buttons = region.querySelectorAll('button');
		expect(buttons).toHaveLength(EXAMPLE_QUERIES.length);
		fireEvent.click(buttons[1]!);
		const field = document.getElementById('content') as HTMLTextAreaElement;
		expect(field.value).toBe(EXAMPLE_QUERIES[1]!.text);
		expect(document.activeElement).toBe(field);
		expect(fetchMock.mock.calls.some((call) => String(call[0]).startsWith('/api/verify'))).toBe(false);
		fireEvent.click(buttons[3]!);
		expect(field.value).toBe(EXAMPLE_QUERIES[3]!.text);
	});

	it('karteczki mają cel dotyku 48 px i stoją pod przyciskiem "Sprawdź"', () => {
		expect(read('components/examples.css')).toMatch(/\.examples__note \{[^}]*min-height: 48px/);
		const { container } = render(<App />);
		const submit = container.querySelector('button[type="submit"]') as HTMLElement;
		const region = screen.getByRole('region', { name: 'Przykładowe zgłoszenia' });
		expect(submit.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});
});

describe('podsumowanie wielu zdań', () => {
	it('mówi po ludzku i zachowuje liczby', () => {
		expect(summarizeVerdicts(Array(5).fill('brak_wystarczajacych_dowodow'))).toBe('Żadnego nie udało mi się potwierdzić.');
		expect(summarizeVerdicts(['potwierdzone', 'potwierdzone'])).toBe('Wszystkie udało mi się potwierdzić.');
		expect(summarizeVerdicts(['potwierdzone', 'falszywe', 'brak_wystarczajacych_dowodow', 'brak_wystarczajacych_dowodow'])).toBe(
			'Potwierdzonych: 1. Fałszywych: 1. Niepotwierdzonych: 2.',
		);
	});
});

describe('przycisk animacji w rogu sceny', () => {
	it('ma nazwę dla czytnika, ikonę i nie stoi pod postacią', () => {
		expect(SCENE_TEXTS.skip).toBe('Zatrzymaj animację');
		const css = read('scenes/playback.css');
		expect(css).toMatch(/\.playback-button \{[^}]*position: absolute;[^}]*min-height: 48px/s);
		expect(css).toMatch(/\.playback-button__label \{[^}]*opacity: 0/s);
		expect(css).toMatch(/\.playback-button:focus-visible \.playback-button__label/);
		const stage = read('stage/stage.css');
		expect(stage).not.toMatch(/\.character-stage__skip \{[^}]*top: 100%/s);
	});
});

describe('arkusz bez zieleni i czerwieni jako sygnału', () => {
	it('pytanie, ramka zapisu i cytat nie mają kolorowego paska', () => {
		const sheet = read('components/sheet.css');
		const record = read('components/record.css');
		expect(sheet).not.toMatch(/\.sheet-question \{[^}]*border-left/s);
		expect(record).not.toMatch(/\.case-notice \{[^}]*border-left/s);
		for (const css of [sheet, record]) expect(css).not.toMatch(/border-left:[^;]*var\(--(sea|coral|role-accent)/);
	});

	it('postać na arkuszu wtapia się w papier (mix-blend-mode), a w wysokim kontraście bez efektów', () => {
		expect(read('components/sheet.css')).toMatch(/\.result-image__stage img,[^{]*\{[^}]*mix-blend-mode: multiply/s);
		expect(read('stage/stage.css')).toMatch(/\.character-stage\[data-mode='corner'\] \{\s*mix-blend-mode: multiply/);
		expect(read('a11y/a11y.css')).toMatch(/data-contrast='high'\] \.character-stage \{\s*mix-blend-mode: normal !important/);
	});
});

describe('pasek nawigacji', () => {
	it('jest półprzezroczysty z rozmyciem, z zapasem bez wsparcia i pełny w wysokim kontraście', () => {
		const css = read('styles.css');
		expect(css).toMatch(/\.site-header \{[^}]*background: rgba\(255, 255, 255, 0\.92\)/s);
		expect(css).toMatch(/@supports \(backdrop-filter: blur\(1px\)\)[^{]*\{\s*\.site-header \{[^}]*rgba\(255, 255, 255, 0\.76\)[^}]*backdrop-filter: blur/s);
		expect(read('a11y/a11y.css')).toMatch(/data-contrast='high'\] \.site-header \{\s*background: var\(--bg\)/);
	});
});
