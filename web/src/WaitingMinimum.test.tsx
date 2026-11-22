// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { FIXTURE_OUTCOMES } from './fixtures/outcomes';
import { WAITING_SCENE_MIN_MS } from './scenes/config';
import { stubReducedMotion } from './testing/motion';

const RECORD_PATH = /^\/r\/[0-9a-f]{64}$/;

function stubApi(streamDelayMs: number, outcomeName: keyof typeof FIXTURE_OUTCOMES = 'potwierdzone') {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (path: string) => {
			if (path === '/api/verify/key') return new Response(JSON.stringify({ recordId: null }), { status: 200 });
			if (path.startsWith('/api/sources/latest')) return new Response(JSON.stringify({ corpusVersion: 'x', documents: [] }), { status: 200 });
			if (path === '/api/verify/eta') return new Response(JSON.stringify({ medianMs: 7000, samples: 4, defaulted: false }), { status: 200 });
			if (path === '/api/verify/stream') {
				await new Promise((resolve) => setTimeout(resolve, streamDelayMs));
				return new Response(JSON.stringify(FIXTURE_OUTCOMES[outcomeName]), { status: 200 });
			}
			return new Response('{}', { status: 404 });
		}),
	);
}

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

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
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

describe('scena czekania trwa co najmniej 7 sekund', () => {
	it('stała wynosi 7 sekund', () => {
		expect(WAITING_SCENE_MIN_MS).toBe(7000);
	});

	it('wynik po 1 s: komunikat "Wynik gotowy.", przycisk, przejście dopiero po 7 s', async () => {
		stubApi(1000);
		await submit();
		await advance(1500);
		expect(window.location.pathname).toBe('/');
		expect(screen.getByText('Wynik gotowy.')).not.toBeNull();
		expect(screen.queryByText(/Sprawdzam\. Zwykle/)).toBeNull();
		expect(screen.getByRole('button', { name: 'Pokaż wynik teraz' })).not.toBeNull();
		expect(document.title).toContain('Wynik gotowy');
		await advance(5000);
		expect(window.location.pathname).toBe('/');
		await advance(600);
		expect(window.location.pathname).toMatch(RECORD_PATH);
	});

	it('przycisk "Pokaż wynik teraz" przechodzi od razu i nie dostaje fokusu na siłę', async () => {
		stubApi(1000);
		await submit();
		await advance(1500);
		const button = screen.getByRole('button', { name: 'Pokaż wynik teraz' });
		expect(document.activeElement).not.toBe(button);
		fireEvent.click(button);
		await advance(0);
		expect(window.location.pathname).toMatch(RECORD_PATH);
	});

	it('wynik po 12 s przechodzi od razu', async () => {
		stubApi(12000);
		await submit();
		await advance(11900);
		expect(window.location.pathname).toBe('/');
		await advance(200);
		expect(window.location.pathname).toMatch(RECORD_PATH);
		expect(screen.queryByRole('button', { name: 'Pokaż wynik teraz' })).toBeNull();
	});

	it('animacje wyłączone w panelu Dostępność: bez sztucznego opóźnienia', async () => {
		document.documentElement.setAttribute('data-motion', 'off');
		stubApi(1000);
		await submit();
		await advance(1100);
		expect(window.location.pathname).toMatch(RECORD_PATH);
	});

	it('systemowe ograniczenie ruchu: bez sztucznego opóźnienia', async () => {
		stubReducedMotion(true);
		stubApi(1000);
		await submit();
		await advance(1100);
		expect(window.location.pathname).toMatch(RECORD_PATH);
	});

	it('stan techniczny pokazuje się od razu', async () => {
		stubApi(1000, 'brak_mozliwosci_sprawdzenia');
		await submit();
		await advance(1100);
		expect(window.location.pathname).toBe('/');
		expect(screen.queryByText('Wynik gotowy.')).toBeNull();
		expect(document.querySelector('.state')).not.toBeNull();
	});

	it('anulowanie w czasie oczekiwania po gotowości wraca do formularza i nie przechodzi później', async () => {
		stubApi(1000);
		await submit();
		await advance(1500);
		fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
		await advance(8000);
		expect(window.location.pathname).toBe('/');
	});
});
