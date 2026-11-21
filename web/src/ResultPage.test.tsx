// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VERDICT_LABELS_PL } from '../../src/contracts/verdict';
import type { VerificationRecord } from '../../src/contracts/record';
import { App } from './App';
import { RecordView } from './components/RecordView';
import { GONE_TEXTS } from './components/RecordPage';
import { HOME_TEXTS } from './components/HomeSections';
import { HISTORY_KEY } from './history';
import { FIXTURE_OUTCOMES } from './fixtures/outcomes';
import { writeSceneSkipped } from './scenes/preferences';

const ID = 'a'.repeat(64);
const potwierdzone = FIXTURE_OUTCOMES.potwierdzone as { kind: 'record'; record: VerificationRecord };

beforeEach(() => {
	writeSceneSkipped(true);
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	window.history.replaceState(null, '', '/');
	window.localStorage.clear();
});

type Handler = (path: string, init?: RequestInit) => Response | Promise<Response>;

function stubApi(handlers: Record<string, Handler>) {
	const fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
		const key = Object.keys(handlers).find((prefix) => path.startsWith(prefix));
		if (!key) return new Response('{}', { status: 404 });
		return handlers[key](path, init);
	});
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const LATEST = { corpusVersion: 'x', documents: [] };

describe('strona wyniku /r/<id>', () => {
	it('po kliknięciu "Sprawdź" od razu przechodzi na /r/<id>, potem pokazuje wynik i przyciski', async () => {
		writeSceneSkipped(true);
		let release: (response: Response) => void = () => undefined;
		const fetchMock = stubApi({
			'/api/verify/key': () => ok({ recordId: ID }),
			'/api/verify/eta': () => ok({ medianMs: 12000, samples: 5, defaulted: false }),
			'/api/verify/stream': () => new Promise<Response>((resolve) => (release = resolve)),
			'/api/sources/latest': () => ok(LATEST),
		});
		render(<App />);
		fireEvent.change(screen.getByLabelText(/Wklej informację lub link/), { target: { value: 'Biblioteka jest czynna od 9 do 17.' } });
		fireEvent.click(screen.getByRole('button', { name: 'Sprawdź' }));
		await waitFor(() => expect(window.location.pathname).toBe(`/r/${ID}`));
		await screen.findByLabelText('Postęp sprawdzania');
		expect(screen.queryByLabelText(/Wklej informację lub link/)).toBeNull();
		await waitFor(() => expect(fetchMock.mock.calls.some((c) => c[0] === '/api/verify/stream')).toBe(true));
		release(ok({ ...potwierdzone, record: { ...potwierdzone.record, id: ID } }));
		await screen.findByText(VERDICT_LABELS_PL.potwierdzone);
		expect(screen.getByRole('button', { name: 'Kopiuj link' })).toBeTruthy();
		const download = screen.getByRole('link', { name: 'Pobierz obraz-kartę' });
		expect(download.getAttribute('href')).toBe(`/api/records/${ID}/card.svg?download=1`);
		expect(window.history.state).toBeNull();
		const saved = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? '[]') as Array<{ id: string }>;
		expect(saved[0]?.id).toBe(ID);
	});

	it('wejście z linku pokazuje ten sam rekord bez ponownego sprawdzania', async () => {
		const fetchMock = stubApi({ [`/api/records/${ID}`]: () => ok({ ...potwierdzone.record, id: ID }) });
		window.history.replaceState(null, '', `/r/${ID}`);
		render(<App />);
		await screen.findByText(VERDICT_LABELS_PL.potwierdzone);
		expect(fetchMock.mock.calls.every((c) => !String(c[0]).includes('/api/verify'))).toBe(true);
		expect(screen.getByText(/Numer sprawdzenia/)).toBeTruthy();
	});

	it('po retencji albo usunięciu pokazuje prosty komunikat', async () => {
		stubApi({ [`/api/records/${ID}`]: () => new Response('{"error":"nie_znaleziono","message":"x"}', { status: 404 }) });
		window.history.replaceState(null, '', `/r/${ID}`);
		render(<App />);
		await screen.findByText(GONE_TEXTS.body);
		expect(screen.getByRole('heading', { name: GONE_TEXTS.title })).toBeTruthy();
		expect(screen.getByRole('link', { name: GONE_TEXTS.back }).getAttribute('href')).toBe('/');
	});

	it('niepoprawny identyfikator w adresie nie pyta serwera', async () => {
		const fetchMock = stubApi({});
		window.history.replaceState(null, '', '/r/zly');
		render(<App />);
		await screen.findByText(GONE_TEXTS.body);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('kopiuje link do schowka i pokazuje potwierdzenie', async () => {
		stubApi({ [`/api/records/${ID}`]: () => ok({ ...potwierdzone.record, id: ID }) });
		const writeText = vi.fn(async () => undefined);
		vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
		window.history.replaceState(null, '', `/r/${ID}`);
		render(<App />);
		fireEvent.click(await screen.findByRole('button', { name: 'Kopiuj link' }));
		await screen.findByText('Link skopiowany.');
		expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/r/${ID}`);
	});

	it('"Wyślij dalej" jest tylko tam, gdzie działa udostępnianie systemowe', async () => {
		stubApi({ [`/api/records/${ID}`]: () => ok({ ...potwierdzone.record, id: ID }) });
		window.history.replaceState(null, '', `/r/${ID}`);
		const first = render(<App />);
		await screen.findByRole('button', { name: 'Kopiuj link' });
		expect(screen.queryByRole('button', { name: 'Wyślij dalej' })).toBeNull();
		first.unmount();

		const share = vi.fn(async (_data: ShareData) => undefined);
		vi.stubGlobal('navigator', { ...navigator, share });
		render(<App />);
		fireEvent.click(await screen.findByRole('button', { name: 'Wyślij dalej' }));
		await waitFor(() => expect(share).toHaveBeenCalled());
		expect(share.mock.calls[0]?.[0]).toMatchObject({ url: `${window.location.origin}/r/${ID}` });
	});

	it('dla adresu internetowego (brak identyfikatora z góry) przechodzi na /r/<id> po wyniku', async () => {
		stubApi({
			'/api/verify/key': () => ok({ recordId: null }),
			'/api/verify/eta': () => ok({ medianMs: 1000, samples: 1, defaulted: true }),
			'/api/verify/stream': () => ok({ ...potwierdzone, record: { ...potwierdzone.record, id: ID } }),
			[`/api/records/${ID}`]: () => ok({ ...potwierdzone.record, id: ID }),
			'/api/sources/latest': () => ok(LATEST),
		});
		render(<App />);
		fireEvent.change(screen.getByLabelText(/Wklej informację lub link/), { target: { value: 'https://przyklad.example/a' } });
		fireEvent.click(screen.getByRole('button', { name: 'Sprawdź' }));
		await waitFor(() => expect(window.location.pathname).toBe(`/r/${ID}`));
		await screen.findByText(VERDICT_LABELS_PL.potwierdzone);
	});
});

describe('wynik "brak wystarczających dowodów"', () => {
	it('pokazuje samo zdanie, czego nie znaleziono, zamiast wskazówki', () => {
		const outcome = FIXTURE_OUTCOMES.brak_wystarczajacych_dowodow as { kind: 'record'; record: VerificationRecord };
		const { container } = render(<RecordView record={outcome.record} />);
		expect(container.querySelector('.confidence__needle')).toBeNull();
		expect(container.querySelector('.verdict__certainty')).toBeNull();
		expect(container.textContent).not.toContain('Na ile to pewne');
		expect(container.textContent).not.toContain('wcale');
		expect(container.querySelector('.verdict__note')?.textContent).toMatch(/zajrzyj na stronę właściwego urzędu/);
		expect(container.querySelector('.record-claim__abstain p')?.textContent).toMatch(/Sprawdziłem zbiór źródeł/);
	});

	it('dla werdyktu z dowodami nadal pokazuje wskaźnik ze wskazówką', () => {
		const { container } = render(<RecordView record={potwierdzone.record} />);
		expect(container.querySelector('.confidence__needle')).not.toBeNull();
		expect(container.querySelector('.confidence--empty')).toBeNull();
	});
});

describe('strona główna', () => {
	it('pokazuje ostatnie sprawdzenia z przeglądarki i pozwala je wyczyścić', async () => {
		window.localStorage.setItem(
			HISTORY_KEY,
			JSON.stringify([{ id: ID, text: 'Woda w kranie jest zdatna do picia.', label: 'potwierdzone', checkedAt: '2026-11-20T10:00:00Z' }]),
		);
		stubApi({ '/api/sources/latest': () => ok(LATEST) });
		render(<App />);
		const link = screen.getByRole('link', { name: 'Woda w kranie jest zdatna do picia.' });
		expect(link.getAttribute('href')).toBe(`/r/${ID}`);
		fireEvent.click(screen.getByRole('button', { name: HOME_TEXTS.recentClear }));
		expect(screen.getByText(HOME_TEXTS.recentEmpty)).toBeTruthy();
		expect(window.localStorage.getItem(HISTORY_KEY)).toBeNull();
	});

	it('działa, gdy localStorage jest zablokowany', async () => {
		stubApi({ '/api/sources/latest': () => ok(LATEST) });
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('zablokowane');
		});
		render(<App />);
		expect(screen.getByText(HOME_TEXTS.recentEmpty)).toBeTruthy();
		vi.restoreAllMocks();
	});

	it('pokazuje najnowsze ostrzeżenia ze źródeł: wydawca, data, link', async () => {
		const source = potwierdzone.record.claims[0].evidence[0].source;
		stubApi({ '/api/sources/latest': () => ok({ corpusVersion: 'x', documents: [source] }) });
		render(<App />);
		const section = (await screen.findByRole('heading', { name: HOME_TEXTS.latestTitle })).closest('section')!;
		const link = await within(section).findByRole('link', { name: /Przykładowy komunikat/ });
		expect(link.getAttribute('href')).toBe(source.url);
		expect(link.getAttribute('rel')).toBe('noopener noreferrer');
		expect(within(section).getByText(/Przykładowy Urząd Miasta/)).toBeTruthy();
		expect(within(section).getByText(/2025/)).toBeTruthy();
	});

	it('nie pokazuje listy pytań innych osób', () => {
		stubApi({ '/api/sources/latest': () => ok(LATEST) });
		render(<App />);
		expect(screen.queryByText(/pytania innych/i)).toBeNull();
	});
});
