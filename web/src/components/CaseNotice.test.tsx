// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CASE_SAVED_SENTENCE_PL } from '../../../src/cases/texts';
import { FIXTURE_OUTCOMES } from '../fixtures/outcomes';
import { CaseNotice } from './CaseNotice';
import { RecordView } from './RecordView';

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

function record(key: string) {
	const outcome = FIXTURE_OUTCOMES[key]!;
	if (outcome.kind !== 'record') throw new Error('brak rekordu');
	return outcome.record;
}

function stubStatus(body: unknown, ok = true) {
	const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status: ok ? 200 : 500, headers: { 'content-type': 'application/json' } }));
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

describe('CaseNotice: zapisano a przekazano', () => {
	it('zapisano: jedno uczciwe zdanie bez komunikatu o przekazaniu', async () => {
		const fetchMock = stubStatus({ status: 'zapisano' });
		render(<CaseNotice record={record('brak_wystarczajacych_dowodow')} />);
		const notice = await screen.findByRole('status');
		expect(notice.textContent).toBe(CASE_SAVED_SENTENCE_PL);
		expect(notice.textContent).toContain('Jeszcze nikomu go nie przekazałem');
		expect(notice.textContent).not.toMatch(/Przekazano do sprawdzenia/);
		const url = String((fetchMock.mock.calls[0] as unknown[])[0]);
		expect(url).toMatch(/^\/api\/records\/[0-9a-f]+\/obieg$/);
	});

	it('przekazano: "Przekazano do sprawdzenia <data>" po polsku, DD.MM.RRRR', async () => {
		stubStatus({ status: 'przekazano', forwardedAt: '2026-11-21T22:30:00.000Z' });
		render(<CaseNotice record={record('brak_wystarczajacych_dowodow')} />);
		const notice = await screen.findByRole('status');
		expect(notice.textContent).toBe('Przekazano do sprawdzenia 21.11.2026.');
	});

	it('brak sprawy, błąd serwera albo dziwna odpowiedź: nic nie pokazuje (żadnych domysłów)', async () => {
		for (const [body, ok] of [[{ status: 'brak' }, true], [{ status: 'zapisano' }, false], [{ status: 'cokolwiek' }, true]] as const) {
			const fetchMock = stubStatus(body, ok);
			const { container, unmount } = render(<CaseNotice record={record('brak_wystarczajacych_dowodow')} />);
			await waitFor(() => expect(fetchMock).toHaveBeenCalled());
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(container.textContent).toBe('');
			unmount();
		}
	});

	it('rekord z werdyktem merytorycznym nie pyta o sprawę i nic nie pokazuje', async () => {
		const fetchMock = stubStatus({ status: 'zapisano' });
		const { container } = render(<CaseNotice record={record('potwierdzone')} />);
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(fetchMock).not.toHaveBeenCalled();
		expect(container.textContent).toBe('');
	});

	it('widok rekordu z brakiem dowodów pokazuje zdanie, a przy potwierdzonym nie', async () => {
		stubStatus({ status: 'zapisano' });
		const { container } = render(<RecordView record={record('brak_wystarczajacych_dowodow')} />);
		await waitFor(() => expect(container.querySelector('.case-notice')?.textContent).toBe(CASE_SAVED_SENTENCE_PL));
		cleanup();
		const other = render(<RecordView record={record('potwierdzone')} />);
		expect(other.container.querySelector('.case-notice')).toBeNull();
	});
});
