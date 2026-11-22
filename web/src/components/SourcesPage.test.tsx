// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SourceMeta } from '../../../src/contracts/source';
import { GROUP_PAGE_SIZE, SourcesPage } from './SourcesPage';
import { filterGroups, groupByPublisher, normalizeText, pluralPl } from './sourcesModel';

function doc(n: number, publisher: string, sourceType: SourceMeta['sourceType'] = 'urzedowe', title = `Dokument ${n}`): SourceMeta {
	return {
		documentId: `d-${n}`,
		sourceId: publisher.toLowerCase().replace(/\s+/g, '-'),
		title,
		publisher,
		domain: `${publisher.toLowerCase().replace(/\s+/g, '')}.gov.pl`,
		url: `https://example.gov.pl/${n}`,
		publishedAt: n % 2 ? '2026-10-28' : null,
		fetchedAt: `2026-11-2${n % 3}T10:00:00.000Z`,
		validUntil: null,
		sourceType,
		license: `Licencja wydawcy ${publisher}`,
	};
}

const DOCS: SourceMeta[] = [
	...Array.from({ length: 60 }, (_, i) => doc(i, 'Wielki Urząd')),
	doc(100, 'Mały Urząd', 'urzedowe', 'Łódź: komunikat o powodzi'),
	doc(101, 'Redakcja Faktów', 'factcheck', 'Ocena: kolejne twierdzenie'),
];

beforeEach(() => {
	window.history.replaceState(null, '', '/zrodla');
	vi.stubGlobal(
		'fetch',
		vi.fn(async (path: string) => {
			if (path === '/api/factcheck/publishers') {
				return new Response(JSON.stringify({ publishers: [{ name: 'Demagog', site: 'demagog.org.pl' }], qualification: 'Wydawca kwalifikuje się, gdy jest sygnatariuszem IFCN.' }), { status: 200 });
			}
			return new Response(JSON.stringify({ corpusVersion: 'abc123', documents: DOCS }), { status: 200 });
		}),
	);
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe('model źródeł', () => {
	it('grupuje po wydawcy malejąco według liczby dokumentów', () => {
		const groups = groupByPublisher(DOCS);
		expect(groups.map((g) => g.publisher)).toEqual(['Wielki Urząd', 'Mały Urząd', 'Redakcja Faktów']);
		expect(groups[0].documents).toHaveLength(60);
		expect(groups[0].licenses).toEqual(['Licencja wydawcy Wielki Urząd']);
	});

	it('filtruje po tytule bez względu na wielkość liter i polskie znaki oraz po rodzaju', () => {
		const groups = groupByPublisher(DOCS);
		const byTitle = filterGroups(groups, { query: 'LODZ', categories: new Set() });
		expect(byTitle).toHaveLength(1);
		expect(byTitle[0].publisher).toBe('Mały Urząd');
		const byType = filterGroups(groups, { query: '', categories: new Set(['redakcje'] as const) });
		expect(byType.map((g) => g.publisher)).toEqual(['Redakcja Faktów']);
		expect(normalizeText('Łódź')).toBe('lodz');
	});

	it('odmienia liczebniki', () => {
		expect([1, 2, 5, 12, 22].map((n) => pluralPl(n, 'dokument', 'dokumenty', 'dokumentów'))).toEqual(['dokument', 'dokumenty', 'dokumentów', 'dokumentów', 'dokumenty']);
	});
});

describe('strona Źródła', () => {
	it('pokazuje trzy liczby, zaufane redakcje i grupy zwinięte; wiersze renderuje dopiero po rozwinięciu', async () => {
		render(<SourcesPage />);
		await screen.findByRole('heading', { name: 'Lista źródeł' });
		expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
		const stats = screen.getByLabelText('Zbiór w liczbach');
		expect(within(stats).getByText('62')).toBeTruthy();
		expect(within(stats).getByText('3')).toBeTruthy();
		await screen.findByText('demagog.org.pl');
		expect(document.title).toBe('Źródła - Mylik');
		expect(screen.queryAllByRole('link', { name: /Dokument/ })).toHaveLength(0);
		const toggle = screen.getByRole('button', { name: /Wielki Urząd/ });
		expect(toggle.getAttribute('aria-expanded')).toBe('false');
		fireEvent.click(toggle);
		expect(toggle.getAttribute('aria-expanded')).toBe('true');
		expect(screen.getAllByRole('link', { name: /Dokument/ })).toHaveLength(GROUP_PAGE_SIZE);
		expect(screen.getByText('Zasady użycia')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: /Pokaż kolejne/ }));
		expect(screen.getAllByRole('link', { name: /Dokument/ })).toHaveLength(60);
	});

	it('filtr tekstowy i przełączniki zawężają listę i aktualizują licznik', async () => {
		render(<SourcesPage />);
		await screen.findByRole('heading', { name: 'Lista źródeł' });
		fireEvent.change(screen.getByLabelText('Szukaj po tytule lub wydawcy'), { target: { value: 'lodz' } });
		await waitFor(() => expect(screen.getByText(/Wyniki: 1 dokument u 1 wydawcy/)).toBeTruthy());
		expect(screen.getByRole('link', { name: /Łódź/ })).toBeTruthy();
		fireEvent.change(screen.getByLabelText('Szukaj po tytule lub wydawcy'), { target: { value: '' } });
		const filter = screen.getByRole('button', { name: 'Weryfikacje redakcji' });
		fireEvent.click(filter);
		expect(filter.getAttribute('aria-pressed')).toBe('true');
		expect(screen.getByText(/Wyniki: 1 dokument u 1 wydawcy/)).toBeTruthy();
		fireEvent.change(screen.getByLabelText('Szukaj po tytule lub wydawcy'), { target: { value: 'nieistniejace' } });
		expect(screen.getByText(/Nic nie znaleziono/)).toBeTruthy();
	});

	it('ma widoczne pytania i odpowiedzi, jeden nagłówek pierwszego poziomu i czytelną maszynowo datę', async () => {
		render(<SourcesPage />);
		await screen.findByRole('heading', { name: 'Lista źródeł' });
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
		expect(screen.getByText('Czy to usługa urzędu?')).toBeTruthy();
		expect(screen.getByText(/nie oficjalna usługa administracji publicznej/)).toBeTruthy();
		expect(document.querySelector('time[datetime="2026-11-22"]')).toBeTruthy();
	});
});
