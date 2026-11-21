// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { STATE_LABELS_PL, VERDICT_LABELS_PL, VERDICTS, STATES } from '../../src/contracts/verdict';
import { App } from './App';
import { OutcomeView } from './components/OutcomeView';
import { FIXTURE_OUTCOMES, FIXTURE_QUOTE_TEXT } from './fixtures/outcomes';

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	window.location.hash = '';
	window.history.replaceState(null, '', '/');
	window.localStorage.clear();
});

function callFor(fetchMock: ReturnType<typeof vi.fn>, path: string): [string, RequestInit] {
	const call = fetchMock.mock.calls.find((item) => (item as unknown as [string])[0] === path);
	if (!call) throw new Error(`Brak wywołania ${path}`);
	return call as unknown as [string, RequestInit];
}

function mockFetchJson(status: number, body: unknown) {
	const fetchMock = vi.fn(async (path: string) => {
		if (status === 200 && path === '/api/verify/key') return new Response(JSON.stringify({ recordId: null }), { status });
		if (status === 200 && path.startsWith('/api/sources/latest')) {
			return new Response(JSON.stringify({ corpusVersion: 'x', documents: [] }), { status });
		}
		const outcome = body as { kind?: string; record?: unknown };
		if (status === 200 && path.startsWith('/api/records/') && outcome?.kind === 'record') {
			return new Response(JSON.stringify(outcome.record), { status });
		}
		return new Response(JSON.stringify(body), { status });
	});
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

describe('warianty fixture', () => {
	for (const verdict of VERDICTS) {
		it(`renderuje werdykt: ${verdict}`, () => {
			render(<OutcomeView outcome={FIXTURE_OUTCOMES[verdict]} />);
			expect(screen.getByText(VERDICT_LABELS_PL[verdict])).toBeTruthy();
		});
	}

	for (const state of STATES) {
		it(`renderuje stan: ${state}`, () => {
			const { container } = render(<OutcomeView outcome={FIXTURE_OUTCOMES[state]} />);
			expect(screen.getByText(STATE_LABELS_PL[state])).toBeTruthy();
			expect(screen.getByText('To nie jest ocena zgłoszenia', { exact: false })).toBeTruthy();
			const text = container.textContent ?? '';
			for (const label of Object.values(VERDICT_LABELS_PL)) expect(text.toLowerCase()).not.toContain(label);
			expect(container.querySelector('.verdict')).toBeNull();
		});
	}

	it('pokazuje uczciwe "Nie wiem" przy wstrzymaniu się', () => {
		render(<OutcomeView outcome={FIXTURE_OUTCOMES.brak_wystarczajacych_dowodow} />);
		expect(screen.getAllByText(/Nie wiem/).length).toBeGreaterThan(0);
		expect(screen.getByText(/oficjalnym źródle/)).toBeTruthy();
	});

	it('renderuje cytat dosłownie, z linkiem rel noopener noreferrer', () => {
		const { container } = render(<OutcomeView outcome={FIXTURE_OUTCOMES.potwierdzone} />);
		const quote = container.querySelector('blockquote');
		expect(quote?.querySelector('p')?.textContent).toBe(FIXTURE_QUOTE_TEXT);
		for (const link of container.querySelectorAll('a[target="_blank"]')) {
			expect(link.getAttribute('rel')).toBe('noopener noreferrer');
		}
		expect(container.querySelectorAll('a[target="_blank"]').length).toBeGreaterThan(0);
	});

	it('oznacza źródła archiwalne ostrzeżeniem', () => {
		render(<OutcomeView outcome={FIXTURE_OUTCOMES.wprowadzajace_w_blad} />);
		expect(screen.getByText(/stary materiał/)).toBeTruthy();
	});

	it('pokazuje informacje o zamaskowanych danych i próbach manipulacji', () => {
		render(<OutcomeView outcome={FIXTURE_OUTCOMES.nie_podlega_weryfikacji} />);
		expect(screen.getByText(/zamaskowałem dane osobowe/)).toBeTruthy();
		expect(screen.getByText(/próbę wpłynięcia/)).toBeTruthy();
	});
});

describe('formularz', () => {
	it('blokuje przycisk przy pustym polu', () => {
		render(<App />);
		const button = screen.getByRole('button', { name: 'Sprawdź' }) as HTMLButtonElement;
		expect(button.disabled).toBe(true);
	});

	it('blokuje przycisk powyżej 2000 znaków i pokazuje komunikat', () => {
		render(<App />);
		const field = screen.getByLabelText(/Wklej informację lub link/);
		fireEvent.change(field, { target: { value: 'a'.repeat(2001) } });
		expect((screen.getByRole('button', { name: 'Sprawdź' }) as HTMLButtonElement).disabled).toBe(true);
		expect(screen.getByText(/za długa/)).toBeTruthy();
		fireEvent.change(field, { target: { value: 'a'.repeat(2000) } });
		expect((screen.getByRole('button', { name: 'Sprawdź' }) as HTMLButtonElement).disabled).toBe(false);
	});

	it('wysyła adres URL jako url', async () => {
		const fetchMock = mockFetchJson(200, FIXTURE_OUTCOMES.potwierdzone);
		render(<App />);
		fireEvent.change(screen.getByLabelText(/Wklej informację lub link/), { target: { value: ' https://przyklad.example/a?b=1 ' } });
		fireEvent.click(screen.getByRole('button', { name: 'Sprawdź' }));
		await waitFor(() => expect(fetchMock.mock.calls.some((c) => (c as unknown as [string])[0] === '/api/verify/stream')).toBe(true));
		const [, init] = callFor(fetchMock, '/api/verify/stream');
		expect(JSON.parse(init.body as string)).toEqual({ url: 'https://przyklad.example/a?b=1', channel: 'www' });
		await screen.findByText(VERDICT_LABELS_PL.potwierdzone);
	});

	it('wysyła zwykły tekst jako text', async () => {
		const fetchMock = mockFetchJson(200, FIXTURE_OUTCOMES.potwierdzone);
		render(<App />);
		fireEvent.change(screen.getByLabelText(/Wklej informację lub link/), { target: { value: 'Zobacz https://przyklad.example i oceń' } });
		fireEvent.click(screen.getByRole('button', { name: 'Sprawdź' }));
		await waitFor(() => expect(fetchMock.mock.calls.some((c) => (c as unknown as [string])[0] === '/api/verify/stream')).toBe(true));
		const [, init] = callFor(fetchMock, '/api/verify/stream');
		expect(JSON.parse(init.body as string)).toEqual({ text: 'Zobacz https://przyklad.example i oceń', channel: 'www' });
	});

	it('pokazuje polski komunikat dla błędu 429 i nie traktuje go jak wyniku', async () => {
		mockFetchJson(429, { error: 'limit_zadan', message: 'Too many requests' });
		render(<App />);
		fireEvent.change(screen.getByLabelText(/Wklej informację lub link/), { target: { value: 'Jakaś informacja' } });
		fireEvent.click(screen.getByRole('button', { name: 'Sprawdź' }));
		const alert = await screen.findByRole('alert');
		expect(within(alert).getByText(/zbyt wiele zapytań/)).toBeTruthy();
		expect(screen.queryByText('Wynik sprawdzenia')).toBeNull();
		expect(alert.textContent).not.toMatch(/Too many/);
	});

	it('pokazuje komunikat po utracie sieci', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
		render(<App />);
		fireEvent.change(screen.getByLabelText(/Wklej informację lub link/), { target: { value: 'Jakaś informacja' } });
		fireEvent.click(screen.getByRole('button', { name: 'Sprawdź' }));
		const alert = await screen.findByRole('alert');
		expect(alert.textContent).toMatch(/połączenie z internetem/);
	});

	it('pokazuje stan ładowania i pozwala anulować', async () => {
		vi.stubGlobal('fetch', vi.fn((_path: string, init: RequestInit) => new Promise((_resolve, reject) => {
			init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
		})));
		render(<App />);
		fireEvent.change(screen.getByLabelText(/Wklej informację lub link/), { target: { value: 'Jakaś informacja' } });
		fireEvent.click(screen.getByRole('button', { name: 'Sprawdź' }));
		expect(screen.getByText('Sprawdzam…')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
		const alert = await screen.findByRole('alert');
		expect(alert.textContent).toMatch(/anulowane/);
	});
});

describe('strony', () => {
	it('wczytuje rekord pod #/rekord/<id>', async () => {
		const record = (FIXTURE_OUTCOMES.potwierdzone as { kind: 'record'; record: unknown }).record;
		const fetchMock = mockFetchJson(200, record);
		window.location.hash = '#/rekord/' + 'a'.repeat(64);
		render(<App />);
		await screen.findByText(VERDICT_LABELS_PL.potwierdzone);
		expect(callFor(fetchMock, '/api/records/' + 'a'.repeat(64))).toBeTruthy();
		expect(screen.getByText(/Numer sprawdzenia/)).toBeTruthy();
	});

	it('wyświetla tabelę źródeł pod #/zrodla', async () => {
		const record = FIXTURE_OUTCOMES.potwierdzone as { kind: 'record'; record: { claims: Array<{ evidence: Array<{ source: unknown }> }> } };
		mockFetchJson(200, { corpusVersion: 'fixture-1', documents: [record.record.claims[0].evidence[0].source] });
		window.location.hash = '#/zrodla';
		render(<App />);
		await screen.findByRole('table');
		expect(screen.getByText(/fixture-1/)).toBeTruthy();
		expect(screen.getByText('Przykładowy Urząd Miasta')).toBeTruthy();
	});
});
