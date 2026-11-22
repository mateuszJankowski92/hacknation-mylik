// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ClaimResult, VerificationRecord } from '../../../src/contracts/record';
import { annotateAnswer, officialAnnouncement } from '../../../src/render/answer';
import { plain } from '../typography';
import { FIXTURE_OUTCOMES } from '../fixtures/outcomes';
import { RecordView } from './RecordView';

afterEach(cleanup);

function base(): VerificationRecord {
	const outcome = FIXTURE_OUTCOMES.potwierdzone!;
	if (outcome.kind !== 'record') throw new Error('brak rekordu');
	return structuredClone(outcome.record);
}

const URL_OFFICIAL = 'https://www.gov.pl/web/zdrowie/komunikat-o-szczepieniach';
const FETCHED = '2026-01-10T09:30:00+01:00';

function officialRecord(): VerificationRecord {
	const record = base();
	const first = record.claims[0]!;
	first.evidence = [
		{
			...first.evidence[0]!,
			quote: 'Szczepienia są bezpłatne dla osób powyżej 65. roku życia.',
			source: { ...first.evidence[0]!.source, layer: 'strona_urzedu', publisher: 'Ministerstwo Zdrowia' },
		},
	];
	annotateAnswer(first, { mode: 'twierdzenie', announce: true, indexChecked: true });
	const held: ClaimResult = {
		...structuredClone(first),
		claim: { id: 'c2', text: 'Szczepienia odbywają się w soboty.', kind: 'faktograficzna' },
		verdict: 'brak_wystarczajacych_dowodow',
		strength: { level: 'brak', reasons: ['brak_dowodow'] },
		evidence: [],
		abstainReason: 'Strona nie podaje tego twierdzenia.',
		directAnswer: undefined,
	};
	record.claims = [first, held];
	record.maskedInput = URL_OFFICIAL;
	record.inputKind = 'url';
	record.page = {
		url: URL_OFFICIAL,
		title: 'Komunikat o szczepieniach <b>2026</b>',
		domain: 'gov.pl',
		publishedAt: '2025-01-05',
		fetchedAt: FETCHED,
		official: true,
		publisher: 'Ministerstwo Zdrowia',
	};
	return record;
}

function pressRecord(): VerificationRecord {
	const record = base();
	record.maskedInput = 'https://wiadomosci.example/artykul';
	record.inputKind = 'url';
	record.claims = [
		record.claims[0]!,
		{ ...structuredClone(record.claims[0]!), claim: { id: 'c2', text: 'Drugie twierdzenie z artykułu.', kind: 'faktograficzna' }, verdict: 'falszywe' },
	];
	record.page = {
		url: 'https://wiadomosci.example/artykul',
		title: null,
		domain: 'wiadomosci.example',
		fetchedAt: FETCHED,
		official: false,
	};
	return record;
}

describe('blok "Przeczytałem"', () => {
	it('strona urzędu: etykieta, komunikat z silnika, cytaty w ramkach i spokojna uwaga o wieku', () => {
		const { container } = render(<RecordView record={officialRecord()} />);
		const block = container.querySelector('.page-read')!;
		expect(block.textContent).toContain('Przeczytałem');
		expect(block.textContent).toContain('gov.pl');
		expect(block.textContent).toContain('05.01.2025');
		expect(block.textContent).toContain('strona urzędu');
		expect(container.querySelector('.sheet-question')).toBeNull();
		const open = block.querySelector('a.page-read__open')!;
		expect(open.getAttribute('target')).toBe('_blank');
		expect(open.getAttribute('rel')).toContain('noopener');
		const headline = container.querySelector('.page-official__headline')!;
		expect(headline.textContent).toBe(officialAnnouncement('Ministerstwo Zdrowia'));
		expect(screen.getByText('Ministerstwo Zdrowia podaje:')).toBeTruthy();
		const quotes = container.querySelectorAll('.page-quote blockquote');
		expect(quotes).toHaveLength(1);
		expect(quotes[0]!.textContent).toBe('Szczepienia są bezpłatne dla osób powyżej 65. roku życia.');
		expect(container.querySelector('.page-quote__verdict')?.textContent).toBe('potwierdzone');
		expect(container.querySelector('.page-official__age')?.getAttribute('role')).toBe('note');
		expect(plain(container.querySelector('.record__held')?.textContent ?? '')).toContain('Szczepienia odbywają się w soboty.');
		expect(container.querySelectorAll('.record__summary')).toHaveLength(1);
	});

	it('tytuł i cytaty to tekst, nie HTML', () => {
		const { container } = render(<RecordView record={officialRecord()} />);
		expect(container.querySelector('.page-read__title b')).toBeNull();
		expect(container.querySelector('.page-read__title')?.textContent).toContain('<b>2026</b>');
	});

	it('pełny adres dopiero po rozwinięciu', () => {
		const { container } = render(<RecordView record={officialRecord()} />);
		expect(container.querySelector('.page-read__address')).toBeNull();
		fireEvent.click(screen.getByText('Pokaż pełny adres'));
		expect(container.querySelector('.page-read__address')?.textContent).toBe(URL_OFFICIAL);
	});

	it('prasa: mówi wprost, że to relacja, i wylicza twierdzenia artykułu z wynikiem', () => {
		const { container } = render(<RecordView record={pressRecord()} />);
		const block = container.querySelector('.page-read')!;
		expect(block.textContent).toContain('relacja, nie dokument źródłowy');
		expect(block.textContent).toContain('bez daty publikacji');
		expect(block.textContent).toContain('Strona bez tytułu');
		expect(container.querySelector('.page-official')).toBeNull();
		expect(screen.getByText('Artykuł twierdzi:')).toBeTruthy();
		const items = container.querySelectorAll('.page-article__item');
		expect(items).toHaveLength(2);
		expect(plain(items[1]!.textContent ?? '')).toContain('Drugie twierdzenie z artykułu.');
		expect(items[1]!.querySelector('.page-article__result')?.textContent?.length).toBeGreaterThan(3);
		expect(container.querySelectorAll('.record-claim')).toHaveLength(2);
		expect(container.querySelectorAll('.record__summary')).toHaveLength(1);
	});

	it('rekord bez pola page wygląda jak dotąd', () => {
		const record = base();
		const { container } = render(<RecordView record={record} />);
		expect(container.querySelector('.page-read')).toBeNull();
		expect(container.querySelector('.page-article')).toBeNull();
		expect(container.querySelector('.sheet-question')).not.toBeNull();
	});
});
