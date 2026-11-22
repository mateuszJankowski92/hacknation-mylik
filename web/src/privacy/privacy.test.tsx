// @vitest-environment jsdom
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VerificationRecord } from '../../../src/contracts/record';
import { A11Y_STORAGE_KEY, reloadSettings, updateSettings } from '../a11y/settings';
import { App } from '../App';
import { PRIVACY_TEXTS } from '../components/PrivacyPage';
import { FIXTURE_OUTCOMES } from '../fixtures/outcomes';
import { HISTORY_KEY, addToHistory, loadHistory } from '../history';
import { stubReducedMotion } from '../testing/motion';
import { plain } from '../typography';
import { CONSENT_TEXTS } from './ConsentBanner';
import { PRIVACY_STORAGE_KEY, getHistoryConsent, reloadHistoryConsent, setHistoryConsent } from './consent';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_SRC = join(HERE, '..');
const SHORT = FIXTURE_OUTCOMES.potwierdzone as { kind: 'record'; record: VerificationRecord };
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

function stubApi() {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (path: string) => {
			if (path === `/api/records/${SHORT.record.id}`) return ok(SHORT.record);
			if (path.startsWith('/api/sources')) return ok({ corpusVersion: 'x', documents: [] });
			if (path === '/api/verify/key') return ok({ recordId: null });
			if (path === '/api/verify/eta') return ok({ medianMs: 1000, samples: 1, defaulted: true });
			return new Response('{}', { status: 404 });
		}),
	);
}

beforeEach(() => {
	stubReducedMotion(true);
	stubApi();
	window.localStorage.clear();
	reloadHistoryConsent();
	reloadSettings();
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	window.history.replaceState(null, '', '/');
	window.localStorage.clear();
	reloadHistoryConsent();
	reloadSettings();
});

const storedHistory = () => window.localStorage.getItem(HISTORY_KEY);

function seedHistory() {
	window.localStorage.setItem(
		HISTORY_KEY,
		JSON.stringify([{ id: SHORT.record.id, text: 'Woda w kranie jest zdatna do picia.', label: 'potwierdzone', checkedAt: '2026-11-20T10:00:00Z' }]),
	);
}

describe('historia sprawdzeń a zgoda', () => {
	it('przed wyborem historia NIE jest zapisywana, także po otwarciu wyniku', async () => {
		addToHistory(SHORT.record);
		expect(storedHistory()).toBeNull();
		window.history.replaceState(null, '', `/r/${SHORT.record.id}`);
		render(<App />);
		await screen.findByRole('link', { name: 'Sprawdź następną' });
		expect(storedHistory()).toBeNull();
		expect(window.localStorage.getItem(PRIVACY_STORAGE_KEY)).toBeNull();
	});

	it('przed wyborem istniejąca lista nie jest pokazywana, a strona główna odsyła do ustawień', () => {
		seedHistory();
		render(<App />);
		const section = screen.getByRole('heading', { name: 'Twoje ostatnie sprawdzenia' }).closest('section') as HTMLElement;
		expect(within(section).queryByRole('link', { name: /Woda/ })).toBeNull();
		expect(plain(section.textContent ?? '')).toContain('dopóki nie wybierzesz');
		expect(within(section).getByRole('link', { name: 'Ustawienia prywatności' }).getAttribute('href')).toBe('/prywatnosc#ustawienia');
	});

	it('"Zapamiętuj" włącza zapis, a lista pojawia się od razu', async () => {
		seedHistory();
		render(<App />);
		fireEvent.click(screen.getByRole('button', { name: CONSENT_TEXTS.accept }));
		expect(getHistoryConsent()).toBe('granted');
		expect(JSON.parse(window.localStorage.getItem(PRIVACY_STORAGE_KEY) ?? '{}')).toEqual({ history: 'granted' });
		await waitFor(() => expect(screen.getByRole('link', { name: /Woda/ })).toBeTruthy());
		addToHistory({ ...SHORT.record, id: 'c'.repeat(64) });
		expect(loadHistory().map((entry) => entry.id)).toContain('c'.repeat(64));
	});

	it('"Nie zapamiętuj" usuwa istniejącą historię i wyłącza zapis', () => {
		seedHistory();
		render(<App />);
		fireEvent.click(screen.getByRole('button', { name: CONSENT_TEXTS.decline }));
		expect(storedHistory()).toBeNull();
		expect(getHistoryConsent()).toBe('denied');
		addToHistory(SHORT.record);
		expect(storedHistory()).toBeNull();
		expect(plain(screen.getByRole('heading', { name: 'Twoje ostatnie sprawdzenia' }).closest('section')?.textContent ?? '')).toContain('Nie zapamiętuję Twoich sprawdzeń');
	});

	it('decyzję można zmienić na stronie Prywatność, także po odmowie', async () => {
		setHistoryConsent('denied');
		window.history.replaceState(null, '', '/prywatnosc');
		render(<App />);
		expect(screen.queryByRole('region', { name: CONSENT_TEXTS.label })).toBeNull();
		const accept = screen.getByRole('button', { name: PRIVACY_TEXTS.accept });
		const decline = screen.getByRole('button', { name: PRIVACY_TEXTS.decline });
		expect(decline.getAttribute('aria-pressed')).toBe('true');
		fireEvent.click(accept);
		expect(getHistoryConsent()).toBe('granted');
		expect(accept.getAttribute('aria-pressed')).toBe('true');
		addToHistory(SHORT.record);
		expect(JSON.parse(storedHistory() ?? '[]')).toHaveLength(1);
		fireEvent.click(decline);
		expect(getHistoryConsent()).toBe('denied');
		expect(storedHistory()).toBeNull();
		expect(screen.getByText(PRIVACY_TEXTS.savedDenied)).toBeTruthy();
	});

	it('na stronie Prywatność można usunąć same sprawdzenia albo wszystko', () => {
		setHistoryConsent('granted');
		seedHistory();
		updateSettings({ contrast: 'high' });
		window.history.replaceState(null, '', '/prywatnosc');
		render(<App />);
		fireEvent.click(screen.getByRole('button', { name: PRIVACY_TEXTS.deleteHistory }));
		expect(storedHistory()).toBeNull();
		expect(getHistoryConsent()).toBe('granted');
		seedHistory();
		fireEvent.click(screen.getByRole('button', { name: PRIVACY_TEXTS.deleteAll }));
		expect(storedHistory()).toBeNull();
		expect(window.localStorage.getItem(PRIVACY_STORAGE_KEY)).toBeNull();
		expect(window.localStorage.getItem(A11Y_STORAGE_KEY)).toBeNull();
		expect(window.localStorage.length).toBe(0);
		expect(getHistoryConsent()).toBe('unset');
	});

	it('uszkodzony zapis decyzji oznacza brak decyzji', () => {
		window.localStorage.setItem(PRIVACY_STORAGE_KEY, '{nie json');
		reloadHistoryConsent();
		expect(getHistoryConsent()).toBe('unset');
		window.localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify({ history: 'chyba' }));
		reloadHistoryConsent();
		expect(getHistoryConsent()).toBe('unset');
	});
});

describe('baner prywatności', () => {
	it('ma dosłowny tekst, dwa równorzędne przyciski i odnośnik "Więcej o prywatności"', () => {
		render(<App />);
		const banner = screen.getByRole('region', { name: CONSENT_TEXTS.label });
		expect(plain(banner.textContent ?? '')).toContain(
			'Mylik nie śledzi i nie używa plików cookie do reklam ani statystyk. Może zapamiętać w tej przeglądarce Twoje ostatnie sprawdzenia, żebyś łatwo do nich wrócił.',
		);
		const accept = within(banner).getByRole('button', { name: 'Zapamiętuj' });
		const decline = within(banner).getByRole('button', { name: 'Nie zapamiętuj' });
		expect(accept.className).toBe(decline.className);
		expect(accept.className).not.toContain('primary');
		expect(within(banner).getByRole('link', { name: /Więcej o.prywatności/ }).getAttribute('href')).toBe('/prywatnosc');
	});

	it('nie blokuje: nie jest modalny, nie kradnie fokusu i nie przechwytuje klawiszy', () => {
		const { container } = render(<App />);
		const banner = screen.getByRole('region', { name: CONSENT_TEXTS.label });
		expect(banner.getAttribute('aria-modal')).toBeNull();
		expect(banner.closest('[inert], [aria-hidden="true"]')).toBeNull();
		expect(banner.contains(document.activeElement)).toBe(false);
		fireEvent.keyDown(banner, { key: 'Escape' });
		expect(screen.getByRole('region', { name: CONSENT_TEXTS.label })).toBeTruthy();
		expect(container.querySelector('main')?.hasAttribute('inert')).toBe(false);
		expect(container.querySelector('textarea')).not.toBeNull();
	});

	it('jest dostępny z klawiatury: kolejność Tab po nagłówku, przed treścią, wybór przenosi fokus na główną treść i jest ogłaszany', () => {
		const { container } = render(<App />);
		const order = [...container.querySelectorAll<HTMLElement>('a[href], button, textarea')].filter(
			(node) => !node.closest('[hidden]') && !node.hasAttribute('disabled'),
		);
		const labels = order.map((node) => plain(node.textContent ?? '').trim());
		const first = labels.indexOf('Więcej o prywatności');
		expect(labels.slice(first, first + 3)).toEqual(['Więcej o prywatności', 'Zapamiętuj', 'Nie zapamiętuj']);
		expect(first).toBeGreaterThan(labels.indexOf('Dostępność'));
		expect(first).toBeLessThan(order.findIndex((node) => node.tagName === 'TEXTAREA'));
		const decline = screen.getByRole('button', { name: 'Nie zapamiętuj' });
		decline.focus();
		fireEvent.click(decline);
		expect(screen.queryByRole('region', { name: CONSENT_TEXTS.label })).toBeNull();
		expect(document.activeElement).toBe(screen.getByRole('main'));
		expect(screen.getByText(CONSENT_TEXTS.savedDenied).closest('[role="status"]')).not.toBeNull();
	});

	it('nie wraca po wyborze i nie pokazuje się, gdy decyzja już zapadła', () => {
		setHistoryConsent('granted');
		render(<App />);
		expect(screen.queryByRole('region', { name: CONSENT_TEXTS.label })).toBeNull();
	});

	it('jest papierową karteczką przy dolnej krawędzi i nie zasłania formularza (arkusz stylów)', () => {
		const css = readFileSync(join(HERE, 'privacy.css'), 'utf8');
		expect(css).toMatch(/\.consent-banner \{\s*position: fixed;[^}]*bottom: var\(--space-2\);/);
		expect(css).toMatch(/html\[data-text-size='large'\] \.consent-banner,[^{]*\{\s*position: relative;/);
		expect(css).toMatch(/@media \(max-height: 829px\) \{\s*\.consent-banner \{\s*position: relative;/);
		expect(readFileSync(join(HERE, '..', 'paper-fold.css'), 'utf8')).toContain('.consent-banner');
	});
});

describe('strona Prywatność', () => {
	it('opisuje retencję 30 dni i 24 godziny, dostawców, brak zapisu IP i numeru SMS oraz co jest tylko w przeglądarce', () => {
		window.history.replaceState(null, '', '/prywatnosc');
		const { container } = render(<App />);
		const text = plain(container.querySelector('main')?.textContent ?? '');
		for (const fragment of ['30 dni', '24 godziny', 'Anthropic', 'poza Europejskim Obszarem Gospodarczym', 'Adresu IP nie zapisujemy na stałe', 'Numeru nadawcy SMS nie zapisujemy', 'Nie profilujemy', 'docs/MODELE.md', 'niezbędn']) {
			expect(text, fragment).toContain(fragment);
		}
		const headings = [...container.querySelectorAll('main h2')].map((node) => plain(node.textContent ?? ''));
		expect(headings).toEqual([
			'Ustawienia prywatności',
			'Co trafia na serwer',
			'Co trafia do dostawców modeli',
			'Czego nie zbieramy',
			'Co zostaje tylko w Twojej przeglądarce',
			'Jak to wyczyścić',
		]);
	});

	it('odnośnik "Ustawienia prywatności" ze stopki przenosi fokus na sekcję ustawień', async () => {
		const { container } = render(<App />);
		fireEvent.click(within(container.querySelector('footer') as HTMLElement).getByRole('link', { name: 'Ustawienia prywatności' }));
		await waitFor(() => expect(document.activeElement?.id).toBe('ustawienia'));
	});
});

function sourceFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((name) => {
		const path = join(directory, name);
		if (statSync(path).isDirectory()) return name === 'fixtures' || name === 'testing' ? [] : sourceFiles(path);
		return /\.(ts|tsx|css)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
	});
}

describe('inwentaryzacja: bez stron trzecich, cookies i śledzenia po stronie interfejsu', () => {
	const files = sourceFiles(WEB_SRC);

	it('kod interfejsu nie zawiera adresów cudzych serwerów (poza przestrzenią nazw SVG)', () => {
		expect(files.length).toBeGreaterThan(20);
		for (const file of files) {
			const text = readFileSync(file, 'utf8').replace(/https?:\/\/www\.w3\.org\/[^'"\s)]*/g, '');
			expect(text, file).not.toMatch(/https?:\/\//);
			expect(text, file).not.toMatch(/@import\s+url/);
		}
		expect(readFileSync(join(WEB_SRC, '..', 'index.html'), 'utf8')).not.toMatch(/https?:\/\//);
	});

	it('nie używa cookies, sessionStorage, IndexedDB, sendBeacon ani gniazd', () => {
		for (const file of files) {
			expect(readFileSync(file, 'utf8'), file).not.toMatch(/document\.cookie|sessionStorage|indexedDB|sendBeacon|new WebSocket|new EventSource/);
		}
	});

	it('localStorage dotyka tylko trzech kluczy Myliku (historia, wybór, ustawienia dostępności) i jednego do usunięcia', () => {
		const keys = new Set<string>();
		for (const file of files) {
			const text = readFileSync(file, 'utf8');
			for (const match of text.matchAll(/'(mylik[.:][a-z:-]+(?:v\d)?)'/g)) if (match[1] !== 'mylik:navigate') keys.add(match[1]);
		}
		expect([...keys].sort()).toEqual(['mylik.pomin-animacje', 'mylik:dostepnosc:v1', 'mylik:ostatnie-sprawdzenia:v1', 'mylik:prywatnosc:v1']);
	});
});
