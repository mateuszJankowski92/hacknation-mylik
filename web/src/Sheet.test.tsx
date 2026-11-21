// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VerificationRecord } from '../../src/contracts/record';
import { App } from './App';
import { RecordView } from './components/RecordView';
import { QUESTION_TEXTS } from './components/SheetQuestion';
import { FIXTURE_OUTCOMES } from './fixtures/outcomes';
import { stubReducedMotion } from './testing/motion';
import { plain } from './typography';

const HERE = dirname(fileURLToPath(import.meta.url));
const LONG = FIXTURE_OUTCOMES.potwierdzone_dlugie as { kind: 'record'; record: VerificationRecord };
const MANY = FIXTURE_OUTCOMES.kilka_twierdzen as { kind: 'record'; record: VerificationRecord };
const ABSTAIN = FIXTURE_OUTCOMES.brak_z_silnika as { kind: 'record'; record: VerificationRecord };
const SHORT = FIXTURE_OUTCOMES.potwierdzone as { kind: 'record'; record: VerificationRecord };
const LATEST = { corpusVersion: 'x', documents: [] };

beforeEach(() => {
	stubReducedMotion(true);
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	window.history.replaceState(null, '', '/');
	window.localStorage.clear();
	document.title = 'Mylik';
});

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

function stubRecordApi(record: VerificationRecord) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (path: string) => {
			if (path === `/api/records/${record.id}`) return ok(record);
			if (path.startsWith('/api/sources/latest')) return ok(LATEST);
			if (path === '/api/verify/key') return ok({ recordId: null });
			if (path === '/api/verify/eta') return ok({ medianMs: 1000, samples: 1, defaulted: true });
			return new Response('{}', { status: 404 });
		}),
	);
}

async function openRecord(record: VerificationRecord) {
	stubRecordApi(record);
	window.history.replaceState(null, '', `/r/${record.id}`);
	const view = render(<App />);
	await screen.findByRole('link', { name: 'Sprawdź następną' });
	return view;
}

function precedes(first: Element | null, second: Element | null): boolean {
	return Boolean(first && second && first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe('arkusz wyniku: układ od góry', () => {
	it('pasek z pytaniem, "Stan na", zdanie wyniku, cytat ze źródłem, pewność, a ostrzeżenie na samym dole', () => {
		const { container } = render(<RecordView record={LONG.record} />);
		const sheet = container.querySelector('.sheet')!;
		const parts = [
			'.sheet__asof',
			'.sheet-question',
			'.record-claim__headline',
			'.verdict__label',
			'.record-claim__primary',
			'.record-claim__certainty',
			'details.record-claim__details',
			'.known-op',
		].map((selector) => sheet.querySelector(selector));
		expect(parts.every(Boolean)).toBe(true);
		for (let index = 1; index < parts.length; index++) expect(precedes(parts[index - 1]!, parts[index]!), String(index)).toBe(true);
		expect(sheet.querySelector('.sheet__asof')?.textContent).toBe('Stan na 10.01.2026, 09:30.');
		const lastBlock = sheet.querySelector('.sheet__body')?.lastElementChild;
		expect(lastBlock?.classList.contains('known-op')).toBe(true);
	});

	it('pytanie jest wiernie, a pewność jest mniejsza niż cytat', () => {
		const { container } = render(<RecordView record={LONG.record} />);
		expect(plain(container.querySelector('.sheet-question__text')?.textContent ?? '')).toBe(LONG.record.maskedInput);
		expect(container.querySelector('.sheet-question')?.getAttribute('aria-labelledby')).toBeTruthy();
		const sheetCss = readFileSync(join(HERE, 'components', 'sheet.css'), 'utf8');
		const recordCss = readFileSync(join(HERE, 'components', 'record.css'), 'utf8');
		expect(sheetCss).toMatch(/\.sheet-question__text \{[^}]*-webkit-line-clamp: 2;/);
		expect(recordCss).toMatch(/\.record-claim__primary \.record-evidence__quote p \{\s*font-size: 20px;/);
		expect(sheetCss).toMatch(/\.confidence__word \{[^}]*font-size: 1rem;/);
	});

	it('długie pytanie ma przycisk rozwijania, krótkie nie', () => {
		const scroll = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
			return this.classList.contains('sheet-question__text') && this.dataset.expanded === 'false' ? 120 : 40;
		});
		vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(60);
		render(<RecordView record={LONG.record} />);
		const toggle = screen.getByRole('button', { name: QUESTION_TEXTS.expand });
		expect(toggle.getAttribute('aria-expanded')).toBe('false');
		fireEvent.click(toggle);
		expect(document.querySelector('.sheet-question__text')?.getAttribute('data-expanded')).toBe('true');
		expect(screen.getByRole('button', { name: QUESTION_TEXTS.collapse }).getAttribute('aria-expanded')).toBe('true');
		scroll.mockRestore();
		cleanup();
		vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(40);
		render(<RecordView record={SHORT.record} />);
		expect(screen.queryByRole('button', { name: QUESTION_TEXTS.expand })).toBeNull();
	});

	it('"Nie udało mi się tego potwierdzić" to ten sam arkusz z białą plamą, bez cytatu i bez obrazu', () => {
		const { container } = render(<RecordView record={ABSTAIN.record} />);
		expect(container.querySelector('.sheet .record-claim--abstain')).not.toBeNull();
		const headline = plain(container.querySelector('.record-claim__headline')?.textContent ?? '');
		expect(headline).toMatch(/^Nie udało mi się potwierdzić tej informacji\. Do sprawdzenia potrzebuję: .+ Brak wyniku w moich źródłach nie oznacza, że to nieprawda\.$/u);
		expect(headline).not.toBe('Nie wiem.');
		expect(container.querySelector('.record-claim__primary')).toBeNull();
		const sheetCss = readFileSync(join(HERE, 'components', 'sheet.css'), 'utf8');
		expect(sheetCss).toMatch(/\.sheet \.record-claim--abstain::before \{[^}]*var\(--bg\)/);
	});

	it('przy grafice białej plamy stoi małe zdanie (zwykły akapit, nie nagłówek), po dużym zdaniu', () => {
		const { container } = render(<RecordView record={ABSTAIN.record} />);
		const note = container.querySelector('.record-claim__blank-spot') as HTMLElement;
		expect(note.tagName).toBe('P');
		expect(plain(note.textContent ?? '')).toBe('Biała plama: miejsce na mapie, którego nikt jeszcze nie opisał.');
		expect(precedes(container.querySelector('.record-claim__headline'), note)).toBe(true);
		expect(container.querySelectorAll('.record-claim__blank-spot')).toHaveLength(1);
		cleanup();
		const answered = render(<RecordView record={SHORT.record} />);
		expect(answered.container.querySelector('.record-claim__blank-spot')).toBeNull();
	});

	it('kilka twierdzeń: zdanie o białej plamie tylko przy pierwszej, z każdym zdaniem z silnika', () => {
		const record = structuredClone(MANY.record);
		const abstain = ABSTAIN.record.claims[0]!;
		record.claims = [
			record.claims[0]!,
			{ ...structuredClone(abstain), claim: { ...abstain.claim, id: 'c3' } },
			{ ...structuredClone(abstain), claim: { ...abstain.claim, id: 'c4' } },
		];
		const { container } = render(<RecordView record={record} />);
		const headlines = Array.from(container.querySelectorAll('.record-claim--abstain .record-claim__headline')).map((node) => plain(node.textContent ?? ''));
		expect(headlines).toHaveLength(2);
		for (const text of headlines) expect(text).toMatch(/^Nie udało mi się potwierdzić tej informacji\./u);
		expect(container.querySelectorAll('.record-claim__blank-spot')).toHaveLength(1);
		expect(container.querySelector('.record-claim--abstain .record-claim__blank-spot')).not.toBeNull();
	});

	it('pytanie rozstrzygające zaczyna duże zdanie od odpowiedzi: Tak., Nie., Częściowo., Nie udało mi się tego potwierdzić.', () => {
		const expected: Array<[string, RegExp]> = [
			['pytanie_tak', /^Tak\. /u],
			['pytanie_nie', /^Nie\. /u],
			['pytanie_czesciowo', /^Częściowo\. /u],
			['pytanie_brak_wystarczajacych_dowodow', /^Nie udało mi się tego potwierdzić\. Do sprawdzenia potrzebuję: /u],
		];
		for (const [key, pattern] of expected) {
			const outcome = FIXTURE_OUTCOMES[key] as { kind: 'record'; record: VerificationRecord };
			const { container } = render(<RecordView record={outcome.record} />);
			const headline = container.querySelector('.record-claim__headline');
			expect(plain(headline?.textContent ?? ''), key).toMatch(pattern);
			expect(headline?.tagName).toBe('H3');
			cleanup();
		}
	});

	it('w kodzie interfejsu nie ma stałego napisu "Nie wiem." jako wyniku', () => {
		const sources = ['components/RecordClaim.tsx', 'components/RecordView.tsx', 'components/OutcomeView.tsx'].map((file) => readFileSync(join(HERE, file), 'utf8'));
		for (const source of sources) expect(source).not.toMatch(/['"`]Nie wiem\.['"`]/u);
	});

	it('kilka twierdzeń to kolejne sekcje arkusza, widoczne od razu', () => {
		const { container } = render(<RecordView record={MANY.record} />);
		const sections = container.querySelectorAll('.sheet .record__claims-list > article.record-claim');
		expect(sections).toHaveLength(3);
		expect(container.querySelector('details.record__claims-list')).toBeNull();
		expect(container.querySelectorAll('[data-result-heading]')).toHaveLength(1);
		expect(container.querySelectorAll('.sheet')).toHaveLength(1);
	});

	it('bez ikon, ptaszków, krzyżyków i pieczątek w roli sygnału oceny', () => {
		for (const outcome of [LONG, MANY, ABSTAIN, SHORT]) {
			const { container } = render(<RecordView record={outcome.record} />);
			expect(container.textContent).not.toMatch(/[✔✓✘✗✖▲○]/u);
			expect(container.querySelector('[class*="verdict--"], [class*="stamp"], .verdict__icon')).toBeNull();
			cleanup();
		}
		const css = ['components/record.css', 'components/sheet.css'].map((file) => readFileSync(join(HERE, file), 'utf8')).join('\n');
		expect(css).not.toMatch(/green|#0f0|#00ff00|#f00\b|#ff0000|stamp/i);
	});

	it('rozwinięcie arkusza trwa najwyżej pół sekundy i wyłącza się przy ograniczeniu ruchu', () => {
		const css = readFileSync(join(HERE, 'components', 'sheet.css'), 'utf8');
		const duration = Number(/--sheet-unfold-duration:\s*(\d+)ms/.exec(css)?.[1]);
		expect(duration).toBeGreaterThan(0);
		expect(duration).toBeLessThanOrEqual(500);
		expect(css).toContain('animation: sheet-unfold var(--sheet-unfold-duration)');
		expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.sheet__plane,\s*\.sheet__body \{\s*animation: none;/);
		expect(css).toMatch(/\.sheet__plane \{[^}]*border: var\(--outline\) solid var\(--graphite\)/);
		expect(css).toMatch(/\.sheet__plane \{[^}]*box-shadow: var\(--shadow-paper\)/);
		expect(css).toContain('var(--crease)');
	});

	it('układ przyjmuje krótkie i długie zdanie wyniku', () => {
		const short = structuredClone(SHORT.record);
		const long = structuredClone(LONG.record);
		long.claims[0]!.claim.text = 'a '.repeat(200).trim();
		for (const record of [short, long]) {
			const { container } = render(<RecordView record={record} />);
			expect(container.querySelector('.record-claim__headline')?.getAttribute('data-length')).toMatch(/^(short|medium|long)$/);
			cleanup();
		}
	});
});

describe('arkusz wyniku: przyciski i nawigacja', () => {
	it('"Zobacz źródło" otwiera źródło w nowej karcie', async () => {
		await openRecord(SHORT.record);
		const link = screen.getByRole('link', { name: /^Zobacz źródło/ });
		expect(link.getAttribute('href')).toBe(SHORT.record.claims[0]!.evidence[0]!.source.url);
		expect(link.getAttribute('target')).toBe('_blank');
		expect(link.getAttribute('rel')).toBe('noopener noreferrer');
	});

	it('"Zapytaj inaczej" wraca do formularza z tekstem pytania i fokusem w polu', async () => {
		await openRecord(SHORT.record);
		fireEvent.click(screen.getByRole('link', { name: 'Zapytaj inaczej' }));
		const field = (await screen.findByLabelText(/Wklej informację lub link/)) as HTMLTextAreaElement;
		expect(window.location.pathname).toBe('/');
		expect(plain(field.value)).toBe(SHORT.record.maskedInput);
		await waitFor(() => expect(document.activeElement).toBe(field));
		expect(field.selectionStart).toBe(field.value.length);
	});

	it('"Sprawdź następną" otwiera pusty formularz z fokusem w polu', async () => {
		await openRecord(SHORT.record);
		fireEvent.click(screen.getByRole('link', { name: 'Sprawdź następną' }));
		const field = (await screen.findByLabelText(/Wklej informację lub link/)) as HTMLTextAreaElement;
		expect(field.value).toBe('');
		await waitFor(() => expect(document.activeElement).toBe(field));
	});

	it('nie ma przycisku "OK"', async () => {
		await openRecord(SHORT.record);
		expect(screen.queryByRole('button', { name: /^OK$/ })).toBeNull();
		expect(screen.queryByRole('link', { name: /^OK$/ })).toBeNull();
	});

	it('"Kopiuj link": gdy schowek odmawia, pokazuje pole do ręcznego skopiowania', async () => {
		await openRecord(SHORT.record);
		vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn(async () => Promise.reject(new Error('odmowa'))) } });
		fireEvent.click(screen.getByRole('button', { name: 'Kopiuj link' }));
		const input = (await screen.findByLabelText('Adres tego sprawdzenia')) as HTMLInputElement;
		expect(input.value).toBe(`${window.location.origin}/r/${SHORT.record.id}`);
	});

	it('Wstecz z wyniku wraca na stronę główną z wpisanym tekstem', async () => {
		let release: (response: Response) => void = () => undefined;
		vi.stubGlobal(
			'fetch',
			vi.fn(async (path: string) => {
				if (path === '/api/verify/stream') return new Promise<Response>((resolve) => (release = resolve));
				if (path.startsWith('/api/sources/latest')) return ok(LATEST);
				if (path === '/api/verify/key') return ok({ recordId: null });
				if (path === '/api/verify/eta') return ok({ medianMs: 1000, samples: 1, defaulted: true });
				return new Response('{}', { status: 404 });
			}),
		);
		render(<App />);
		const text = 'Biblioteka jest czynna od 9 do 17.';
		fireEvent.change(screen.getByLabelText(/Wklej informację lub link/), { target: { value: text } });
		fireEvent.click(screen.getByRole('button', { name: 'Sprawdź' }));
		await screen.findByLabelText('Postęp sprawdzania');
		await waitFor(() => expect(typeof release).toBe('function'));
		await act(async () => {
			release(ok({ ...SHORT, record: { ...SHORT.record, id: 'b'.repeat(64) } }));
		});
		await waitFor(() => expect(window.location.pathname).toBe(`/r/${'b'.repeat(64)}`));
		await act(async () => {
			window.history.back();
		});
		const field = (await screen.findByLabelText(/Wklej informację lub link/)) as HTMLTextAreaElement;
		expect(window.location.pathname).toBe('/');
		expect(field.value).toBe(text);
	});
});

describe('arkusz wyniku: dostępność', () => {
	it('fokus ląduje na zdaniu wyniku, a tytuł strony zawiera pytanie', async () => {
		await openRecord(SHORT.record);
		const heading = document.querySelector('[data-result-heading]') as HTMLElement;
		await waitFor(() => expect(document.activeElement).toBe(heading));
		expect(heading.tagName).toBe('H3');
		expect(document.title).toContain('Wynik sprawdzenia');
		expect(document.title).toContain(SHORT.record.maskedInput.slice(0, 20));
		expect(document.title).toContain('Mylik');
	});

	it('długie pytanie jest skracane w tytule', async () => {
		await openRecord(LONG.record);
		expect(document.title.length).toBeLessThan(110);
		expect(document.title).toContain('…');
	});

	it('kolejność tabulatora: pytanie, odsyłacz do źródeł, przyciski pod arkuszem', async () => {
		const { container } = await openRecord(SHORT.record);
		const focusable = [...container.querySelectorAll<HTMLElement>('a[href], button, summary, input, textarea')].filter(
			(node) => !node.closest('.site-header') && !node.hasAttribute('disabled') && node.tabIndex >= 0,
		);
		const labels = focusable.map((node) => plain(node.textContent ?? '').trim());
		const evidence = labels.findIndex((label) => label === 'Zobacz, skąd to wiem');
		const next = labels.findIndex((label) => label === 'Sprawdź następną');
		const source = labels.findIndex((label) => label.startsWith('Zobacz źródło'));
		expect(evidence).toBeGreaterThanOrEqual(0);
		expect(source).toBeGreaterThan(evidence);
		expect(next).toBeGreaterThan(source);
	});

	it('w czasie czekania stan jest ogłaszany (aria-live), a nie wynik', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (path: string) => {
				if (path === '/api/verify/stream') return new Promise<Response>(() => undefined);
				if (path.startsWith('/api/sources/latest')) return ok(LATEST);
				if (path === '/api/verify/key') return ok({ recordId: null });
				if (path === '/api/verify/eta') return ok({ medianMs: 1000, samples: 1, defaulted: true });
				return new Response('{}', { status: 404 });
			}),
		);
		render(<App />);
		fireEvent.change(screen.getByLabelText(/Wklej informację lub link/), { target: { value: 'Biblioteka jest czynna od 9 do 17.' } });
		fireEvent.click(screen.getByRole('button', { name: 'Sprawdź' }));
		const scene = await screen.findByLabelText('Postęp sprawdzania');
		expect(scene.querySelector('[role="status"][aria-live="polite"]')).not.toBeNull();
		expect(document.title).toContain('Sprawdzam');
	});
});

describe('szkic pytania w historii przeglądarki', () => {
	it('wpisany tekst zapisuje się w stanie wpisu po opuszczeniu pola', () => {
		vi.stubGlobal('fetch', vi.fn(async () => ok(LATEST)));
		render(<App />);
		const field = screen.getByLabelText(/Wklej informację lub link/);
		fireEvent.change(field, { target: { value: 'Szkic pytania' } });
		fireEvent.blur(field);
		expect(window.history.state).toMatchObject({ draft: 'Szkic pytania' });
	});

	it('odświeżenie strony głównej przywraca szkic z historii', () => {
		vi.stubGlobal('fetch', vi.fn(async () => ok(LATEST)));
		window.history.replaceState({ draft: 'Wrócił szkic' }, '', '/');
		render(<App />);
		expect((screen.getByLabelText(/Wklej informację lub link/) as HTMLTextAreaElement).value).toBe('Wrócił szkic');
	});
});
