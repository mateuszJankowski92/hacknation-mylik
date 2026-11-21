// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { OutcomeView } from './components/OutcomeView';
import { FIXTURE_OUTCOMES } from './fixtures/outcomes';
import { writeSceneSkipped } from './scenes/preferences';
import { nb } from './typography';

const NBSP = '\u00a0';

describe('nb: twarda spacja po jednoliterowych spójnikach i przyimkach', () => {
	it('łączy a, i, o, u, w, z z następnym słowem', () => {
		expect(nb('Mylik sprawdza mapę, zanim w nią uwierzysz.')).toBe(`Mylik sprawdza mapę, zanim w${NBSP}nią uwierzysz.`);
		expect(nb('kot i pies a ptak o dom u kogoś z nami')).toBe(
			`kot i${NBSP}pies a${NBSP}ptak o${NBSP}dom u${NBSP}kogoś z${NBSP}nami`,
		);
	});

	it('obsługuje wielkie litery i początek tekstu', () => {
		expect(nb('W Warszawie i O niej')).toBe(`W${NBSP}Warszawie i${NBSP}O${NBSP}niej`);
		expect(nb('Z domu A potem')).toBe(`Z${NBSP}domu A${NBSP}potem`);
	});

	it('obsługuje litery po cudzysłowie i nawiasie', () => {
		expect(nb('(w domu) „o tym” "z nim"')).toBe(`(w${NBSP}domu) „o${NBSP}tym” "z${NBSP}nim"`);
	});

	it('nie rusza liter będących końcem dłuższego słowa ani innych liter', () => {
		expect(nb('kawa mama ala k s')).toBe('kawa mama ala k s');
		expect(nb('rok w 2026')).toBe(`rok w${NBSP}2026`);
	});

	it('nie zamienia spacji na końcu tekstu i jest idempotentne', () => {
		expect(nb('to jest w ')).toBe('to jest w ');
		const once = nb('Mapa to nie terytorium. Mylik sprawdza mapę, zanim w nią uwierzysz.');
		expect(nb(once)).toBe(once);
	});

	it('nie zmienia długości tekstu ani innych znaków', () => {
		const text = 'Co w tym i o czym a z kim u nas';
		expect(nb(text).replaceAll(NBSP, ' ')).toBe(text);
	});
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	window.history.replaceState(null, '', '/');
	window.localStorage.clear();
});

const ORPHAN = /(^|[\s(„"])[aiouwzAIOUWZ] \S/u;

function visibleTextOrphans(root: HTMLElement): string[] {
	const clone = root.cloneNode(true) as HTMLElement;
	clone.querySelectorAll('blockquote, q, input, textarea, .visually-hidden, [aria-hidden="true"]').forEach((node) => node.remove());
	const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
	const found: string[] = [];
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const text = node.textContent ?? '';
		if (ORPHAN.test(text)) found.push(text);
	}
	return found;
}

describe('widoczne teksty interfejsu nie zostawiają jednoliterowych spójników na końcu wiersza', () => {
	it('strona główna', () => {
		writeSceneSkipped(true);
		vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ corpusVersion: 'x', documents: [] }), { status: 200 })));
		const { container } = render(<App />);
		expect(visibleTextOrphans(container)).toEqual([]);
	});

	for (const key of Object.keys(FIXTURE_OUTCOMES)) {
		it(`wynik: ${key}`, () => {
			writeSceneSkipped(true);
			const { container } = render(<OutcomeView outcome={FIXTURE_OUTCOMES[key]!} />);
			expect(visibleTextOrphans(container)).toEqual([]);
		});
	}
});
