// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VerifyOutcome } from '../../src/contracts/record';
import { App } from './App';
import { FIXTURE_OUTCOMES } from './fixtures/outcomes';
import { formatDateTime } from './format';
import { stubReducedMotion } from './testing/motion';
import { WAITING_TIMING } from './visuals/waitingConfig';

const RECORD_PATH = /^\/r\/[0-9a-f]{64}$/;

interface StreamApi {
	push: (event: string, data: unknown) => void;
	finish: (outcome: VerifyOutcome) => void;
}

function stubStream(): StreamApi {
	const encoder = new TextEncoder();
	let controller!: ReadableStreamDefaultController<Uint8Array>;
	const body = new ReadableStream<Uint8Array>({
		start(created) {
			controller = created;
		},
	});
	vi.stubGlobal(
		'fetch',
		vi.fn(async (path: string, init?: RequestInit) => {
			if (path === '/api/verify/key') return new Response(JSON.stringify({ recordId: null }), { status: 200 });
			if (path.startsWith('/api/sources/latest')) return new Response(JSON.stringify({ corpusVersion: 'x', documents: [] }), { status: 200 });
			if (path === '/api/verify/stream') {
				init?.signal?.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')));
				return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
			}
			return new Response('{}', { status: 404 });
		}),
	);
	const push = (event: string, data: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
	return {
		push,
		finish: (outcome) => {
			push('result', outcome);
			controller.close();
		},
	};
}

const potwierdzone = FIXTURE_OUTCOMES.potwierdzone as Extract<VerifyOutcome, { kind: 'record' }>;
const fresh: VerifyOutcome = { ...potwierdzone, cached: false };
const cachedOutcome: VerifyOutcome = { ...potwierdzone, cached: true };

async function advance(ms: number) {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms);
	});
}

async function submit() {
	render(<App />);
	fireEvent.change(screen.getByLabelText(/Wklej informację lub link/), { target: { value: 'Biblioteka jest czynna od 9 do 17.' } });
	fireEvent.click(screen.getByRole('button', { name: 'Sprawdź' }));
	await advance(0);
}

function lines(): string[] {
	return [...document.querySelectorAll('.waiting-steps__line')].map((node) => (node.textContent ?? '').replace(/\u00a0/g, ' '));
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'requestAnimationFrame', 'cancelAnimationFrame'] });
	vi.spyOn(Math, 'random').mockReturnValue(0);
	stubReducedMotion(false);
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	window.history.replaceState(null, '', '/');
	window.localStorage.clear();
	document.documentElement.removeAttribute('data-motion');
});

describe('stałe czasowe w jednym miejscu', () => {
	it('ruch trwa 1,2-1,6 s, a przytrzymanie przed ruchem jest krótkie', () => {
		expect(WAITING_TIMING.travelMs).toBeGreaterThanOrEqual(1200);
		expect(WAITING_TIMING.travelMs).toBeLessThanOrEqual(1600);
		expect(WAITING_TIMING.readyHoldMs).toBeLessThanOrEqual(600);
		expect(WAITING_TIMING.homeFadeMs).toBe(300);
	});
});

describe('ekran czekania: sama scena i prawdziwy ślad pracy', () => {
	it('po wysłaniu zostaje scena, kroki i cichy odnośnik Anuluj, bez licznika i bez zapowiedzi czasu', async () => {
		stubStream();
		await submit();
		const region = screen.getByLabelText('Postęp sprawdzania');
		expect(region.querySelector('.stage-slot--foreground')).not.toBeNull();
		expect(lines()).toEqual([]);
		expect(screen.getByRole('button', { name: 'Anuluj' })).not.toBeNull();
		expect(document.body.textContent).not.toMatch(/Zwykle trwa|Minęło|Pokaż wynik teraz/);
		expect(document.querySelector('.check-home')?.hasAttribute('inert')).toBe(true);
		await advance(30000);
		expect(lines()).toEqual([]);
		expect(window.location.pathname).toBe('/');
	});

	it('kroki pojawiają się tylko z prawdziwych zdarzeń, nieznane etapy są pomijane', async () => {
		const api = stubStream();
		await submit();
		await act(async () => api.push('progress', { type: 'zgloszenie_przeczytane', claims: 1 }));
		await advance(0);
		expect(lines()).toEqual(['Przeczytałem zgłoszenie.', 'Szukam w źródłach…']);
		await act(async () => api.push('progress', { type: 'etap_ktorego_nie_znam', count: 7 }));
		await advance(0);
		expect(lines()).toEqual(['Przeczytałem zgłoszenie.', 'Szukam w źródłach…']);
		await act(async () => {
			api.push('progress', { type: 'fragmenty_za', claim: 0, count: 2 });
			api.push('progress', { type: 'szukanie_przeciw_start', claim: 0 });
			api.push('progress', { type: 'szukanie_przeciw_koniec', claim: 0, count: 1 });
		});
		await advance(0);
		expect(lines()).toEqual(['Przeczytałem zgłoszenie.', 'Znalazłem 3 fragmenty do sprawdzenia.', 'Sprawdzam cytaty…']);
		await act(async () => api.push('progress', { type: 'fragment_oceniony', claim: 0, publisher: 'GUS', publishedAt: null, stance: 'to_samo' }));
		await advance(0);
		expect(lines()).toEqual(['Przeczytałem zgłoszenie.', 'Znalazłem 3 fragmenty do sprawdzenia.', 'Sprawdziłem cytaty: 1 przeszedł kontrolę.']);
		expect(document.body.textContent).not.toMatch(/Przeszukałem|Zapytałem redakcje|Drugi model/);
		await act(async () => api.push('progress', { type: 'druga_kontrola', agreed: 1, total: 1 }));
		await advance(0);
		expect(lines().at(-1)).toBe('Drugi model sprawdził cytaty: 1 z 1 zgodny.');
		expect(lines()).toHaveLength(4);
	});

	it('nie ma sztucznego minimum: wynik po 1 s, "Wynik gotowy.", przejście po krótkim przytrzymaniu', async () => {
		const api = stubStream();
		await submit();
		await advance(1000);
		await act(async () => api.finish(fresh));
		await advance(0);
		expect(screen.getByText('Wynik gotowy.')).not.toBeNull();
		expect(screen.queryByRole('button', { name: 'Anuluj' })).toBeNull();
		expect(document.title).toContain('Wynik gotowy');
		expect(window.location.pathname).toBe('/');
		await advance(WAITING_TIMING.readyHoldMs - 50);
		expect(window.location.pathname).toBe('/');
		await advance(100);
		expect(window.location.pathname).toMatch(RECORD_PATH);
	});

	it('liczba w kroku o cytatach pochodzi z rekordu i zgadza się ze stroną wyniku', async () => {
		const api = stubStream();
		await submit();
		await act(async () => {
			api.push('progress', { type: 'zgloszenie_przeczytane', claims: 1 });
			api.push('progress', { type: 'fragmenty_za', claim: 0, count: 3 });
			api.push('progress', { type: 'szukanie_przeciw_koniec', claim: 0, count: 0 });
		});
		await advance(0);
		await act(async () => api.finish(fresh));
		await advance(0);
		const evidence = potwierdzone.record.claims.reduce((sum, result) => sum + result.evidence.length, 0);
		expect(lines()).toContain(`Sprawdziłem cytaty: ${evidence} przeszedł kontrolę.`);
	});

	it.each([
		['kliknięcie', () => fireEvent.pointerDown(document.body)],
		['Enter', () => fireEvent.keyDown(window, { key: 'Enter' })],
		['Spacja', () => fireEvent.keyDown(window, { key: ' ' })],
	])('%s po gotowości skraca przejście do natychmiastowego', async (_name, act1) => {
		const api = stubStream();
		await submit();
		await act(async () => api.finish(fresh));
		await advance(0);
		expect(window.location.pathname).toBe('/');
		await act(async () => {
			act1();
		});
		await advance(0);
		expect(window.location.pathname).toMatch(RECORD_PATH);
	});

	it('wynik z pamięci: jeden prawdziwy krok z godziną z rekordu, przejście nie wcześniej niż po ok. 2,5 s i nie później niż po 4 s', async () => {
		const api = stubStream();
		await submit();
		await advance(900);
		await act(async () => api.finish(cachedOutcome));
		await advance(0);
		expect(lines()).toEqual([`To pytanie sprawdziłem wcześniej, ${formatDateTime(potwierdzone.record.createdAt)}.`]);
		expect(screen.queryByText('Wynik gotowy.')).toBeNull();
		await advance(WAITING_TIMING.cachedLineMs + 20);
		expect(screen.getByText('Wynik gotowy.')).not.toBeNull();
		expect(window.location.pathname).toBe('/');
		const beforeTravel = 900 + WAITING_TIMING.cachedLineMs + WAITING_TIMING.readyHoldMs;
		expect(beforeTravel + WAITING_TIMING.travelMs).toBeGreaterThanOrEqual(2500);
		expect(beforeTravel + WAITING_TIMING.travelMs).toBeLessThanOrEqual(4000);
		await advance(WAITING_TIMING.readyHoldMs + 20);
		expect(window.location.pathname).toMatch(RECORD_PATH);
	});

	it('animacje wyłączone w panelu Dostępność: wynik od razu po gotowości, bez ruchu', async () => {
		document.documentElement.setAttribute('data-motion', 'off');
		const api = stubStream();
		await submit();
		await act(async () => api.finish(fresh));
		await advance(0);
		expect(window.location.pathname).toMatch(RECORD_PATH);
	});

	it('systemowe ograniczenie ruchu: wynik od razu po gotowości', async () => {
		stubReducedMotion(true);
		const api = stubStream();
		await submit();
		await act(async () => api.finish(fresh));
		await advance(0);
		expect(window.location.pathname).toMatch(RECORD_PATH);
	});

	it('stan techniczny pokazuje się od razu', async () => {
		const api = stubStream();
		await submit();
		await act(async () => api.finish(FIXTURE_OUTCOMES.brak_mozliwosci_sprawdzenia!));
		await advance(0);
		expect(window.location.pathname).toBe('/');
		expect(screen.queryByText('Wynik gotowy.')).toBeNull();
		expect(document.querySelector('.state')).not.toBeNull();
	});

	it('anulowanie w czasie sprawdzania wraca do formularza i nie przechodzi później', async () => {
		stubStream();
		await submit();
		fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
		await advance(8000);
		expect(window.location.pathname).toBe('/');
		expect(screen.queryByLabelText('Postęp sprawdzania')).toBeNull();
	});
});
