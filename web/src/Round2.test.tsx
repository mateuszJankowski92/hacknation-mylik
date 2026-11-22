// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { summarizeVerdicts } from './components/RecordView';
import { EXAMPLES_SHOWN, EXAMPLE_POOL, REQUIRED_EXAMPLE_KINDS, pickExamples } from './components/exampleSubmissions';
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

function seededRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 2 ** 32;
	};
}

function exampleById(id: string | null) {
	return EXAMPLE_POOL.find((example) => example.id === id)!;
}

describe('podpowiedzi zgłoszeń na stronie głównej', () => {
	it('to jawna lista co najmniej 16 zgłoszeń z kategorią doboru, bez zapisanych odpowiedzi', () => {
		expect(EXAMPLE_POOL.length).toBeGreaterThanOrEqual(16);
		expect(new Set(EXAMPLE_POOL.map((example) => example.id)).size).toBe(EXAMPLE_POOL.length);
		for (const example of EXAMPLE_POOL) {
			expect(Object.keys(example).sort()).toEqual(['id', 'kind', 'label', 'role', 'text']);
			expect(['redakcja', 'urzad', 'biala_plama', 'link']).toContain(example.kind);
			expect(example.text.trim().length).toBeGreaterThan(10);
		}
		for (const kind of REQUIRED_EXAMPLE_KINDS) expect(EXAMPLE_POOL.some((example) => example.kind === kind)).toBe(true);
		expect(EXAMPLE_POOL.some((example) => /^https?:\/\//u.test(example.text))).toBe(true);
	});

	it('losowanie zawsze daje 4 różne karteczki, w tym białą plamę, ocenę redakcji i źródło urzędowe', () => {
		for (let seed = 1; seed <= 300; seed++) {
			const picked = pickExamples(EXAMPLE_POOL, seededRandom(seed));
			expect(picked).toHaveLength(EXAMPLES_SHOWN);
			expect(new Set(picked.map((example) => example.id)).size).toBe(EXAMPLES_SHOWN);
			for (const kind of REQUIRED_EXAMPLE_KINDS) expect(picked.some((example) => example.kind === kind)).toBe(true);
		}
	});

	it('kolejne losowanie unika karteczek, które już widać', () => {
		const first = pickExamples(EXAMPLE_POOL, seededRandom(7));
		const second = pickExamples(EXAMPLE_POOL, seededRandom(8), first.map((example) => example.id));
		const repeated = second.filter((example) => first.some((other) => other.id === example.id));
		expect(repeated.length).toBeLessThanOrEqual(1);
	});

	it('kliknięcie wkleja pełną treść do pola i ustawia fokus, ale niczego nie wysyła', () => {
		const fetchMock = vi.mocked(fetch);
		render(<App />);
		const region = screen.getByRole('region', { name: 'Przykładowe zgłoszenia' });
		const buttons = region.querySelectorAll('.examples__note');
		expect(buttons).toHaveLength(EXAMPLES_SHOWN);
		const first = buttons[1] as HTMLElement;
		fireEvent.click(first);
		const field = document.getElementById('content') as HTMLTextAreaElement;
		expect(field.value).toBe(exampleById(first.getAttribute('data-example')).text);
		expect(document.activeElement).toBe(field);
		expect(fetchMock.mock.calls.some((call) => String(call[0]).startsWith('/api/verify'))).toBe(false);
		const last = buttons[3] as HTMLElement;
		fireEvent.click(last);
		expect(field.value).toBe(exampleById(last.getAttribute('data-example')).text);
	});

	it('zestaw jest stabilny między renderami, a "Inne przykłady" losuje ponownie', () => {
		const { rerender } = render(<App />);
		const ids = () => [...screen.getByRole('region', { name: 'Przykładowe zgłoszenia' }).querySelectorAll('.examples__note')].map((node) => node.getAttribute('data-example'));
		const before = ids();
		rerender(<App />);
		expect(ids()).toEqual(before);
		fireEvent.click(screen.getByRole('button', { name: 'Inne przykłady' }));
		const after = ids();
		expect(after).toHaveLength(EXAMPLES_SHOWN);
		expect(after).not.toEqual(before);
		const field = document.getElementById('content') as HTMLTextAreaElement;
		expect(field.value).toBe('');
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
