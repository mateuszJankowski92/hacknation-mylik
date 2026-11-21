// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VerificationRecord } from '../../../src/contracts/record';
import { App } from '../App';
import { FIXTURE_OUTCOMES } from '../fixtures/outcomes';
import { animationStartsAutomatically, prefersReducedMotion } from '../scenes/preferences';
import { stubReducedMotion } from '../testing/motion';
import { plain } from '../typography';
import { A11Y_TEXTS } from './AccessibilityMenu';
import { A11Y_STORAGE_KEY, DEFAULT_SETTINGS, getSettings, parseSettings, reloadSettings, resetSettings, updateSettings } from './settings';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHORT = FIXTURE_OUTCOMES.potwierdzone as { kind: 'record'; record: VerificationRecord };
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

function stubApi() {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (path: string) => {
			if (path === `/api/records/${SHORT.record.id}`) return ok(SHORT.record);
			if (path.startsWith('/api/sources/latest')) return ok({ corpusVersion: 'x', documents: [] });
			if (path.startsWith('/api/sources')) return ok({ corpusVersion: 'x', documents: [] });
			if (path === '/api/verify/key') return ok({ recordId: null });
			if (path === '/api/verify/eta') return ok({ medianMs: 1000, samples: 1, defaulted: true });
			return new Response('{}', { status: 404 });
		}),
	);
}

beforeEach(() => {
	stubReducedMotion(false);
	stubApi();
	window.localStorage.clear();
	reloadSettings();
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	window.history.replaceState(null, '', '/');
	window.localStorage.clear();
	reloadSettings();
});

const html = () => document.documentElement;

describe('ustawienia dostępności: model', () => {
	it('domyślnie nie ustawia żadnych atrybutów i nic nie zapisuje', () => {
		expect(getSettings()).toEqual(DEFAULT_SETTINGS);
		for (const name of ['data-contrast', 'data-text-size', 'data-spacing', 'data-motion']) expect(html().hasAttribute(name)).toBe(false);
		expect(window.localStorage.getItem(A11Y_STORAGE_KEY)).toBeNull();
	});

	it('zmiana ustawia atrybuty na <html> od razu i zapamiętuje w localStorage', () => {
		updateSettings({ contrast: 'high', textSize: 'xlarge', spacing: 'wide', motion: 'off' });
		expect(html().getAttribute('data-contrast')).toBe('high');
		expect(html().getAttribute('data-text-size')).toBe('xlarge');
		expect(html().getAttribute('data-spacing')).toBe('wide');
		expect(html().getAttribute('data-motion')).toBe('off');
		expect(JSON.parse(window.localStorage.getItem(A11Y_STORAGE_KEY) ?? '{}')).toEqual({ contrast: 'high', textSize: 'xlarge', spacing: 'wide', motion: 'off' });
		reloadSettings();
		expect(getSettings().textSize).toBe('xlarge');
		expect(html().getAttribute('data-contrast')).toBe('high');
	});

	it('przywrócenie domyślnych czyści atrybuty i zapis', () => {
		updateSettings({ contrast: 'high', motion: 'on' });
		resetSettings();
		expect(getSettings()).toEqual(DEFAULT_SETTINGS);
		expect(html().hasAttribute('data-contrast')).toBe(false);
		expect(window.localStorage.getItem(A11Y_STORAGE_KEY)).toBeNull();
	});

	it('uszkodzony lub obcy zapis wraca do domyślnych wartości', () => {
		expect(parseSettings({ contrast: 'neon', textSize: 5, spacing: 'wide' })).toEqual({ ...DEFAULT_SETTINGS, spacing: 'wide' });
		expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
		window.localStorage.setItem(A11Y_STORAGE_KEY, '{nie json');
		reloadSettings();
		expect(getSettings()).toEqual(DEFAULT_SETTINGS);
	});

	it('animacje: domyślnie wg systemu, a wybór użytkownika ma pierwszeństwo', () => {
		stubReducedMotion(true);
		expect(prefersReducedMotion()).toBe(true);
		updateSettings({ motion: 'on' });
		expect(prefersReducedMotion()).toBe(false);
		expect(animationStartsAutomatically()).toBe(true);
		stubReducedMotion(false);
		updateSettings({ motion: 'off' });
		expect(prefersReducedMotion()).toBe(true);
		expect(animationStartsAutomatically()).toBe(false);
		resetSettings();
		expect(prefersReducedMotion()).toBe(false);
	});
});

describe('panel dostępności', () => {
	function openPanel() {
		const button = screen.getByRole('button', { name: A11Y_TEXTS.button });
		fireEvent.click(button);
		return button;
	}

	it('przycisk w nagłówku ma ikonę i napis, aria-expanded i aria-controls', () => {
		const { container } = render(<App />);
		const button = screen.getByRole('button', { name: A11Y_TEXTS.button });
		expect(button.closest('.site-header')).not.toBeNull();
		expect(button.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
		expect(button.getAttribute('aria-expanded')).toBe('false');
		const panel = container.querySelector(`#${CSS.escape(button.getAttribute('aria-controls') ?? '')}`) as HTMLElement;
		expect(panel).not.toBeNull();
		expect(panel.hidden).toBe(true);
		openPanel();
		expect(button.getAttribute('aria-expanded')).toBe('true');
		expect(panel.hidden).toBe(false);
		expect(panel.getAttribute('role')).toBe('group');
		expect(panel.getAttribute('aria-modal')).toBeNull();
	});

	it('Esc zamyka panel i oddaje fokus przyciskowi; kliknięcie poza panelem też go zamyka', () => {
		render(<App />);
		const button = openPanel();
		const option = screen.getByRole('button', { name: A11Y_TEXTS.contrastHigh });
		option.focus();
		fireEvent.keyDown(option, { key: 'Escape' });
		expect(button.getAttribute('aria-expanded')).toBe('false');
		expect(document.activeElement).toBe(button);
		openPanel();
		fireEvent.pointerDown(screen.getByRole('main'));
		expect(button.getAttribute('aria-expanded')).toBe('false');
		openPanel();
		fireEvent.pointerDown(screen.getByRole('button', { name: A11Y_TEXTS.contrastHigh }));
		expect(button.getAttribute('aria-expanded')).toBe('true');
	});

	it('opcje działają od razu, mają aria-pressed i są zapamiętywane', () => {
		render(<App />);
		openPanel();
		fireEvent.click(screen.getByRole('button', { name: A11Y_TEXTS.contrastHigh }));
		expect(html().getAttribute('data-contrast')).toBe('high');
		expect(screen.getByRole('button', { name: A11Y_TEXTS.contrastHigh }).getAttribute('aria-pressed')).toBe('true');
		expect(screen.getByRole('button', { name: A11Y_TEXTS.contrastNormal }).getAttribute('aria-pressed')).toBe('false');
		fireEvent.click(screen.getByRole('button', { name: 'Tekst 125%' }));
		expect(html().getAttribute('data-text-size')).toBe('large');
		fireEvent.click(screen.getByRole('button', { name: 'Tekst 150%' }));
		expect(html().getAttribute('data-text-size')).toBe('xlarge');
		fireEvent.click(screen.getByRole('button', { name: A11Y_TEXTS.spacingWide }));
		expect(html().getAttribute('data-spacing')).toBe('wide');
		fireEvent.click(screen.getByRole('button', { name: A11Y_TEXTS.motionOff }));
		expect(html().getAttribute('data-motion')).toBe('off');
		expect(JSON.parse(window.localStorage.getItem(A11Y_STORAGE_KEY) ?? '{}')).toEqual({ contrast: 'high', textSize: 'xlarge', spacing: 'wide', motion: 'off' });
	});

	it('animacje: bez wyboru pokazują stan systemu, a przycisk Przywróć czyści wszystko', async () => {
		stubReducedMotion(true);
		render(<App />);
		openPanel();
		expect(screen.getByRole('button', { name: A11Y_TEXTS.motionOff }).getAttribute('aria-pressed')).toBe('true');
		expect(screen.getByText(A11Y_TEXTS.motionSystemOff)).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: A11Y_TEXTS.motionOn }));
		expect(html().getAttribute('data-motion')).toBe('on');
		fireEvent.click(screen.getByRole('button', { name: A11Y_TEXTS.contrastHigh }));
		fireEvent.click(screen.getByRole('button', { name: A11Y_TEXTS.reset }));
		expect(getSettings()).toEqual(DEFAULT_SETTINGS);
		expect(html().hasAttribute('data-contrast')).toBe(false);
		expect(window.localStorage.getItem(A11Y_STORAGE_KEY)).toBeNull();
		await waitFor(() => expect(screen.getByText(A11Y_TEXTS.resetDone)).toBeTruthy());
	});

	it('zapamiętane ustawienia są stosowane po ponownym wczytaniu', () => {
		window.localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ contrast: 'high', textSize: 'large' }));
		reloadSettings();
		render(<App />);
		expect(html().getAttribute('data-contrast')).toBe('high');
		openPanel();
		expect(screen.getByRole('button', { name: 'Tekst 125%' }).getAttribute('aria-pressed')).toBe('true');
	});
});

const TABBABLE = 'a[href], button, textarea, input, select, summary, [tabindex]';

function tabOrder(root: ParentNode): HTMLElement[] {
	return [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter(
		(node) => node.tabIndex >= 0 && !node.hasAttribute('disabled') && !node.closest('[hidden]') && !node.closest('[aria-hidden="true"]'),
	);
}

function label(node: HTMLElement): string {
	return plain(node.getAttribute('aria-label') ?? node.textContent ?? '').trim();
}

describe('przejście klawiaturą', () => {
	it('strona główna: "Przejdź do treści" pierwsze, potem nagłówek, pole, "Sprawdź", stopka na końcu, brak dodatniego tabindex', async () => {
		const { container } = render(<App />);
		await screen.findByText('Twoje ostatnie sprawdzenia');
		fireEvent.change(screen.getByLabelText(/Wklej informację lub link/), { target: { value: 'Biblioteka jest czynna od 9 do 17.' } });
		const order = tabOrder(container);
		const labels = order.map(label);
		expect(labels[0]).toBe('Przejdź do treści');
		expect(labels.slice(1, 4)).toEqual(['Mylik', 'Źródła', A11Y_TEXTS.button]);
		const field = order.findIndex((node) => node.tagName === 'TEXTAREA');
		const submit = order.findIndex((node) => node.getAttribute('type') === 'submit');
		expect(field).toBeGreaterThan(3);
		expect(submit).toBeGreaterThan(field);
		expect(labels.slice(-4)).toEqual(['Źródła', 'Dostępność', 'Prywatność', 'Ustawienia prywatności']);
		for (const node of container.querySelectorAll('[tabindex]')) expect(Number(node.getAttribute('tabindex'))).toBeLessThanOrEqual(0);
	});

	it('"Przejdź do treści" przenosi fokus na główną treść', () => {
		render(<App />);
		fireEvent.click(screen.getByRole('link', { name: 'Przejdź do treści' }));
		expect(document.activeElement).toBe(screen.getByRole('main'));
	});

	it('wynik: pierwsze "Przejdź do treści", pytanie i odsyłacze przed stopką, a stopka na końcu', async () => {
		window.history.replaceState(null, '', `/r/${SHORT.record.id}`);
		const { container } = render(<App />);
		await screen.findByRole('link', { name: 'Sprawdź następną' });
		const labels = tabOrder(container).map(label);
		expect(labels[0]).toBe('Przejdź do treści');
		expect(labels.indexOf('Sprawdź następną')).toBeGreaterThan(labels.indexOf(A11Y_TEXTS.button));
		expect(labels.indexOf('Sprawdź następną')).toBeLessThan(labels.indexOf('Prywatność'));
		expect(labels.slice(-4)).toEqual(['Źródła', 'Dostępność', 'Prywatność', 'Ustawienia prywatności']);
		for (const node of container.querySelectorAll('[tabindex]')) expect(Number(node.getAttribute('tabindex'))).toBeLessThanOrEqual(0);
	});

	it('Esc zamyka rozwinięte szczegóły wyniku i zwraca fokus na podsumowanie', async () => {
		window.history.replaceState(null, '', `/r/${SHORT.record.id}`);
		const { container } = render(<App />);
		await screen.findByRole('link', { name: 'Sprawdź następną' });
		const details = container.querySelector('details.record-claim__details') as HTMLDetailsElement;
		details.open = true;
		const inner = details.querySelector('a, button, summary') as HTMLElement;
		inner.focus();
		fireEvent.keyDown(inner, { key: 'Escape' });
		expect(details.open).toBe(false);
		expect(document.activeElement).toBe(details.querySelector('summary'));
	});

	it('Ctrl+Enter w polu nadal wysyła sprawdzenie', async () => {
		render(<App />);
		const field = screen.getByLabelText(/Wklej informację lub link/);
		fireEvent.change(field, { target: { value: 'Biblioteka jest czynna od 9 do 17.' } });
		fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true });
		await waitFor(() => expect((global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.some((call) => String(call[0]).startsWith('/api/verify'))).toBe(true));
	});
});

const PAGES: Array<[string, string]> = [
	['główna', '/'],
	['źródła', '/zrodla'],
	['dostępność', '/dostepnosc'],
	['prywatność', '/prywatnosc'],
	['wynik', `/r/${SHORT.record.id}`],
	['brak wyniku', '/r/nie-ma-takiego'],
];

describe('przegląd WCAG stron', () => {
	it('dokument ma lang="pl"', () => {
		expect(readFileSync(join(HERE, '..', '..', 'index.html'), 'utf8')).toMatch(/<html lang="pl">/);
	});

	for (const [name, path] of PAGES) {
		describe(name, () => {
			async function show() {
				window.history.replaceState(null, '', path);
				const view = render(<App />);
				await act(async () => {
					await new Promise((resolve) => setTimeout(resolve, 30));
				});
				return view;
			}

			it('ma jeden h1, a poziomy nagłówków idą po kolei', async () => {
				const { container } = await show();
				const headings = [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter((node) => !node.closest('[hidden]'));
				const levels = headings.map((node) => Number(node.tagName.slice(1)));
				expect(levels.filter((level) => level === 1)).toHaveLength(1);
				expect(levels[0]).toBe(1);
				levels.forEach((level, index) => {
					if (index > 0) expect(level, `${name}: ${headings[index].textContent}`).toBeLessThanOrEqual(levels[index - 1] + 1);
				});
			});

			it('każde pole ma etykietę, każdy przycisk i odnośnik ma nazwę, każdy obraz ma alt', async () => {
				const { container } = await show();
				for (const field of container.querySelectorAll<HTMLElement>('textarea, input:not([type="hidden"]), select')) {
					const id = field.getAttribute('id');
					const labelled = field.getAttribute('aria-label') || field.getAttribute('aria-labelledby') || (id && container.querySelector(`label[for="${id}"]`));
					expect(labelled, `${name}: pole ${id}`).toBeTruthy();
				}
				for (const control of container.querySelectorAll<HTMLElement>('button, a[href]')) {
					if (control.closest('[hidden]')) continue;
					const named = (control.getAttribute('aria-label') ?? control.textContent ?? '').trim();
					expect(named, `${name}: ${control.outerHTML.slice(0, 80)}`).not.toBe('');
				}
				for (const image of container.querySelectorAll('img')) {
					expect(image.hasAttribute('alt'), `${name}: img ${image.getAttribute('src')}`).toBe(true);
				}
				for (const image of container.querySelectorAll('img[alt=""]')) {
					expect(image.getAttribute('aria-hidden') === 'true' || image.getAttribute('role') === 'presentation' || image.closest('[aria-hidden="true"]'), `${name}: ozdobny obraz`).toBeTruthy();
				}
			});

			it('ma stopkę z odnośnikami i punkt orientacyjny main', async () => {
				const { container } = await show();
				expect(container.querySelectorAll('main')).toHaveLength(1);
				expect(within(container.querySelector('footer') as HTMLElement).getAllByRole('link')).toHaveLength(4);
			});
		});
	}

	it('czekanie i wynik są ogłaszane (role status z aria-live)', async () => {
		const { container } = render(<App />);
		expect(container.querySelector('.check-form__status[role="status"][aria-live="polite"]')).not.toBeNull();
	});
});

function luminance(hex: string): number {
	const channels = [1, 3, 5].map((index) => {
		const value = parseInt(hex.slice(index, index + 2), 16) / 255;
		return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function ratio(a: string, b: string): number {
	const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (light + 0.05) / (dark + 0.05);
}

describe('wysoki kontrast', () => {
	const css = readFileSync(join(HERE, 'a11y.css'), 'utf8');
	const block = /html\[data-contrast='high'\] \{([^}]*)\}/.exec(css)![1];
	const tokens: Record<string, string> = {};
	for (const match of block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6});/g)) tokens[match[1]] = match[2];

	const PAIRS: Array<[string, string]> = [
		['text', 'bg'],
		['text', 'surface'],
		['text', 'paper'],
		['text', 'paper-shade'],
		['muted', 'bg'],
		['muted', 'paper-shade'],
		['struck', 'bg'],
		['link', 'bg'],
		['link', 'paper-shade'],
		['link', 'sea-tint'],
		['text', 'sea-tint'],
		['text', 'coral-tint'],
		['sea', 'bg'],
		['coral', 'bg'],
		['primary', 'bg'],
		['on-primary', 'primary'],
		['on-accent', 'accent'],
		['on-accent', 'accent-hover'],
		['on-accent', 'accent-active'],
		['on-accent', 'accent-edge'],
		['on-accent-disabled', 'accent-disabled'],
		['danger-fg', 'danger-bg'],
		['warn-fg', 'warn-bg'],
		['neutral-fg', 'neutral-bg'],
		['state-fg', 'state-bg'],
		['focus', 'bg'],
		['graphite', 'bg'],
		['border', 'bg'],
	];

	for (const [foreground, background] of PAIRS) {
		it(`${foreground} na ${background} ma kontrast co najmniej 7:1`, () => {
			expect(tokens[foreground], foreground).toBeTruthy();
			expect(tokens[background], background).toBeTruthy();
			expect(ratio(tokens[foreground], tokens[background])).toBeGreaterThanOrEqual(7);
		});
	}

	it('tło jest czarne, a w paletach są tylko biel i żółć', () => {
		expect(tokens.bg).toBe('#000000');
		expect(tokens.text).toBe('#ffffff');
		expect(tokens.link).toBe('#ffff00');
		expect(css).toMatch(/html\[data-contrast='high'\] \*,[^{]*\{\s*box-shadow: none !important;/);
		expect(css).toMatch(/html\[data-contrast='high'\] \.stage \{\s*border: 4px solid #ffffff;/);
	});
});
