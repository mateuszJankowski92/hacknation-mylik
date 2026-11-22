// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VerificationRecord } from '../../src/contracts/record';
import { App } from './App';
import { HISTORY_KEY } from './history';
import { reloadHistoryConsent, setHistoryConsent } from './privacy/consent';
import { FIXTURE_OUTCOMES } from './fixtures/outcomes';
import { pickShowcaseExamples, SHOWCASE_TEXTS, type ShowcaseQuestion } from './showcase';
import { stubReducedMotion } from './testing/motion';
import { waitingTiming } from './visuals/waitingConfig';

const potwierdzone = FIXTURE_OUTCOMES.potwierdzone as { kind: 'record'; record: VerificationRecord };
const record: VerificationRecord = { ...potwierdzone.record, id: 'c'.repeat(64), maskedInput: 'Czy UOKiK nałożył karę na Allegro?' };
const HOME_NOTE = SHOWCASE_TEXTS.homeNote;

const QUESTIONS: ShowcaseQuestion[] = [
	{ id: record.id, text: record.maskedInput, inputKind: 'tekst', verdicts: ['potwierdzone'], answered: true },
	...Array.from({ length: 10 }, (_, index) => ({
		id: String(index).repeat(64).slice(0, 64),
		text: `Pytanie numer ${index}?`,
		inputKind: 'tekst' as const,
		verdicts: [index < 3 ? 'potwierdzone' : 'brak_wystarczajacych_dowodow'],
		answered: index < 3,
	})),
	{ id: 'f'.repeat(64), text: 'https://www.zus.pl/-/komunikat', inputKind: 'url', verdicts: ['potwierdzone'], answered: true },
];

function addMeta() {
	const meta = document.createElement('meta');
	meta.name = 'mylik-pokaz';
	meta.content = '1';
	document.head.appendChild(meta);
}

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

function stubApi(options: { questions?: ShowcaseQuestion[] | null; outcome?: unknown } = {}) {
	const outcome = options.outcome ?? { kind: 'record', record, cached: true };
	const fetchMock = vi.fn(async (path: string) => {
		if (path === '/api/pokaz') return options.questions === null ? new Response('{}', { status: 500 }) : ok({ questions: options.questions ?? QUESTIONS });
		if (path === '/api/verify/stream') return ok(outcome);
		if (path.startsWith('/api/records/')) return ok(record);
		if (path.startsWith('/api/sources/latest')) return ok({ corpusVersion: 'x', documents: [] });
		if (path === '/api/verify/key') return ok({ recordId: null });
		return new Response('{}', { status: 404 });
	});
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

async function submit(text: string) {
	fireEvent.change(screen.getByLabelText(/Wklej informację lub link/), { target: { value: text } });
	fireEvent.click(screen.getByRole('button', { name: 'Sprawdź' }));
}

beforeEach(() => {
	stubReducedMotion(true);
});

afterEach(() => {
	cleanup();
	document.head.querySelectorAll('meta[name="mylik-pokaz"]').forEach((node) => node.remove());
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	window.history.replaceState(null, '', '/');
	window.localStorage.clear();
	reloadHistoryConsent();
});

describe('tryb pokazowy: strona główna', () => {
	it('pokazuje notkę przy formularzu i podpowiedzi z /api/pokaz (4, w tym link i co najmniej 2 z odpowiedzią)', async () => {
		addMeta();
		stubApi();
		const { container } = render(<App />);
		const note = container.querySelector('.showcase-note');
		expect(note?.textContent?.replace(/\u00a0/g, ' ')).toBe(HOME_NOTE);
		await waitFor(() => expect(container.querySelectorAll('.examples__note')).toHaveLength(4));
		const labels = [...container.querySelectorAll('.examples__note')].map((node) => (node.textContent ?? '').replace(/\u00a0/g, ' '));
		expect(labels).toContain('Komunikat urzędu (zus.pl)');
		const picked = [...container.querySelectorAll<HTMLElement>('.examples__note')].map((node) => node.dataset.example);
		const answered = QUESTIONS.filter((question) => picked.includes(question.id) && question.answered);
		expect(answered.length).toBeGreaterThanOrEqual(2);
	});

	it('bez znacznika meta notki nie ma i podpowiedzi są dzisiejsze', async () => {
		const fetchMock = stubApi();
		const { container } = render(<App />);
		expect(container.querySelector('.showcase-note')).toBeNull();
		expect(container.querySelectorAll('.examples__note').length).toBeGreaterThan(0);
		expect(fetchMock.mock.calls.some(([path]) => path === '/api/pokaz')).toBe(false);
	});

	it('przy błędzie pobrania zostają dzisiejsze podpowiedzi', async () => {
		addMeta();
		stubApi({ questions: null });
		const { container } = render(<App />);
		await waitFor(() => expect(container.querySelectorAll('.examples__note').length).toBeGreaterThan(0));
		expect(container.querySelector('.examples__note[data-example="redakcja-ceny-paliw"]') ?? container.querySelector('.examples__note')).not.toBeNull();
		expect([...container.querySelectorAll<HTMLElement>('.examples__note')].some((node) => QUESTIONS.some((q) => q.id === node.dataset.example))).toBe(false);
	});

	it('minimalny czas ekranu czekania w trybie pokazowym to ok. 1,5 s i jest krótszy niż zwykle', () => {
		const normal = waitingTiming(false);
		const showcase = waitingTiming(true);
		const total = (timing: typeof normal) => timing.cachedLineMs + timing.readyHoldMs + timing.travelMs;
		expect(total(showcase)).toBeGreaterThanOrEqual(1300);
		expect(total(showcase)).toBeLessThanOrEqual(1700);
		expect(total(showcase)).toBeLessThan(total(normal));
	});

	it('pickShowcaseExamples: zawsze co najmniej 2 z odpowiedzią i link, gdy są', () => {
		for (let seed = 0; seed < 30; seed++) {
			let state = seed + 1;
			const random = () => {
				state = (state * 16807) % 2147483647;
				return state / 2147483647;
			};
			const picked = pickShowcaseExamples(QUESTIONS, random);
			expect(picked).toHaveLength(4);
			expect(picked.some((example) => example.kind === 'link')).toBe(true);
			expect(picked.filter((example) => QUESTIONS.find((q) => q.id === example.id)?.answered).length).toBeGreaterThanOrEqual(2);
		}
	});
});

describe('tryb pokazowy: wysyłanie i strona wyniku', () => {
	it('inne pytanie niż wpisane prowadzi pod /r/<id>?gotowy=1, z notką, zmienionym nagłówkiem i bez zapisu w historii', async () => {
		addMeta();
		setHistoryConsent('granted');
		stubApi();
		render(<App />);
		await submit('Czy w Gdańsku działa szybka kolej miejska?');
		await waitFor(() => expect(window.location.pathname).toBe(`/r/${record.id}`));
		expect(window.location.search).toBe('?gotowy=1');
		const note = await screen.findByRole('note');
		expect(note.textContent?.replace(/\u00a0/g, ' ')).toContain(SHOWCASE_TEXTS.readyNote);
		await waitFor(() => expect(document.activeElement).toBe(note));
		expect(screen.getByText(SHOWCASE_TEXTS.readyQuestionLabel)).not.toBeNull();
		expect(screen.queryByText('Twoje pytanie')).toBeNull();
		expect(window.localStorage.getItem(HISTORY_KEY)).toBeNull();
	});

	it('to samo pytanie co w pliku (po normalizacji) przechodzi pod zwykły adres, z historią i bez notki', async () => {
		addMeta();
		setHistoryConsent('granted');
		stubApi();
		render(<App />);
		await submit('  czy uokik nałożył karę na allegro?? ');
		await waitFor(() => expect(window.location.pathname).toBe(`/r/${record.id}`));
		expect(window.location.search).toBe('');
		await screen.findByText('Twoje pytanie');
		expect(screen.queryByRole('note')).toBeNull();
		expect(window.localStorage.getItem(HISTORY_KEY)).toContain(record.id);
	});

	it('wejście bezpośrednio pod /r/<id>?gotowy=1 też pokazuje notkę i nie zapisuje historii', async () => {
		addMeta();
		setHistoryConsent('granted');
		stubApi();
		window.history.replaceState(null, '', `/r/${record.id}?gotowy=1`);
		render(<App />);
		const note = await screen.findByRole('note');
		expect(note.textContent?.replace(/\u00a0/g, ' ')).toContain('Twojego pytania nie sprawdzałem.');
		expect(window.localStorage.getItem(HISTORY_KEY)).toBeNull();
	});

	it('poza trybem pokazowym nie ma przejścia z gotowy=1', async () => {
		stubApi();
		render(<App />);
		await submit('Czy w Gdańsku działa szybka kolej miejska?');
		await waitFor(() => expect(window.location.pathname).toBe(`/r/${record.id}`));
		expect(window.location.search).toBe('');
		expect(screen.queryByRole('note')).toBeNull();
	});
});
