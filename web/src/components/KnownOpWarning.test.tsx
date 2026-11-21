// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BRAND_HEADLINE, BRAND_SUBHEAD } from '../../../src/render/warning';
import { formatDate, formatDateTime } from '../format';
import { FIXTURE_OUTCOMES } from '../fixtures/outcomes';
import { App } from '../App';
import { RecordView } from './RecordView';

afterEach(cleanup);

function notice(title: string, date: string, url: string) {
	return {
		type: 'dopasowanie_incydentu' as const,
		text: `Stan na 2026-11-21. Opisała je strona EUvsDisinfo. Tytuł opisu po angielsku: „${title}” (${date}). Opis: ${url} To tylko informacja.`,
	};
}

describe('ostrzeżenie EUvsDisinfo w WWW', () => {
	it('pokazuje najwyżej dwa ostrzeżenia z lang="en" i bez zmiany etykiety', () => {
		const outcome = FIXTURE_OUTCOMES.potwierdzone!;
		if (outcome.kind !== 'record') throw new Error('brak rekordu');
		const base = outcome.record;
		const withNotices = {
			...base,
			notices: [
				notice('Old story', '2022-01-02', 'https://euvsdisinfo.eu/report/1'),
				notice('New story', '2025-03-04', 'https://euvsdisinfo.eu/report/2'),
				notice('Mid story', '2024-03-04', 'https://euvsdisinfo.eu/report/3'),
			],
		};
		const { container } = render(<RecordView record={withNotices} />);
		const titles = Array.from(container.querySelectorAll('.known-op q')).map((q) => q.textContent);
		expect(titles).toEqual(['New story', 'Mid story']);
		expect(container.querySelector('.known-op q')?.getAttribute('lang')).toBe('en');
		expect(screen.getAllByText(/opisała ją 04.03.2025 jako dezinformację/).length).toBe(1);
		expect(screen.getAllByText('To tylko podpowiedź. Nie mówi, czy Twoja wiadomość to prawda.').length).toBe(2);
		const bare = render(<RecordView record={base} />);
		expect(bare.container.querySelector('.known-op')).toBeNull();
		expect(container.querySelector('.verdict__label')?.textContent).toBe(bare.container.querySelector('.verdict__label')?.textContent);
	});

	it('daty w zapisie DD.MM.RRRR', () => {
		expect(formatDate('2025-03-14')).toBe('14.03.2025');
		expect(formatDateTime('2026-01-10T09:30:00+01:00')).toBe('10.01.2026, 09:30');
	});

	it('strona główna pokazuje hasło dwupoziomowe', () => {
		render(<App />);
		expect(screen.getByText(BRAND_HEADLINE)).toBeTruthy();
		expect(screen.getByText(BRAND_SUBHEAD)).toBeTruthy();
	});
});
