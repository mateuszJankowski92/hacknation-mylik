// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { findForbiddenForms } from '../../../src/render/metrics';
import { VERDICT_LABELS_PL, VERDICTS } from '../../../src/contracts/verdict';
import { FIXTURE_OUTCOMES, FIXTURE_QUOTE_TEXT } from '../fixtures/outcomes';
import { RecordView } from './RecordView';

afterEach(cleanup);

function record(key: string) {
	const outcome = FIXTURE_OUTCOMES[key]!;
	if (outcome.kind !== 'record') throw new Error('brak rekordu');
	return outcome.record;
}

describe('RecordView', () => {
	for (const verdict of VERDICTS) {
		it(`pokazuje etykietę z objaśnieniem i datą: ${verdict}`, () => {
			const { container } = render(<RecordView record={record(verdict)} />);
			expect(screen.getByText(VERDICT_LABELS_PL[verdict])).toBeTruthy();
			expect(container.querySelector('.record-claim__headline')?.textContent?.length).toBeGreaterThan(10);
			expect(container.querySelector('.verdict__certainty') !== null).toBe(verdict !== 'nie_podlega_weryfikacji');
			expect(screen.getAllByText('Stan na 10.01.2026, 09:30.').length).toBeGreaterThan(0);
		});
	}

	it('oddziela źródła od interpretacji Mylika i cytuje dosłownie', () => {
		const { container } = render(<RecordView record={record('potwierdzone')} />);
		expect(screen.getByText('Co ustalił Mylik')).toBeTruthy();
		expect(screen.getByText('Co mówią źródła')).toBeTruthy();
		const quote = container.querySelector('.record-claim__sources blockquote p');
		expect(quote?.textContent).toBe(FIXTURE_QUOTE_TEXT);
		expect(container.querySelector('.record-claim__mylik blockquote')).toBeNull();
		expect(screen.getByText('Źródła, które potwierdzają')).toBeTruthy();
		const link = container.querySelector('a[target="_blank"]');
		expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
	});

	it('grupuje dowody przeciw i kontekst', () => {
		render(<RecordView record={record('falszywe')} />);
		expect(screen.getByText('Źródła, które przeczą')).toBeTruthy();
		render(<RecordView record={record('wprowadzajace_w_blad')} />);
		expect(screen.getByText('Źródła z dodatkowym kontekstem')).toBeTruthy();
		expect(screen.getByText(/materiał|stary materiał/i)).toBeTruthy();
	});

	it('pokazuje wynik próby obalenia i własną omylność', () => {
		const base = record('potwierdzone');
		const withExtras = structuredClone(base);
		withExtras.claims[0]!.refutation = { performed: true, queries: ['biblioteka zamknięta'], found: 0 };
		withExtras.claims[0]!.errorProfile = { bucket: 'godziny otwarcia', errors: 2, total: 20 };
		render(<RecordView record={withExtras} />);
		expect(screen.getByText(/Nie znalazłem żadnego/)).toBeTruthy();
		expect(screen.getByText(/biblioteka zamknięta/)).toBeTruthy();
		expect(screen.getByText(/pomylił się/).textContent).toContain('2 razy na 20');
	});

	it('pokazuje czego nie ustalono, ostrzeżenia i krótką odpowiedź', () => {
		const base = structuredClone(record('wprowadzajace_w_blad'));
		base.notices = [{ type: 'material_archiwalny', text: 'Materiał archiwalny z 2020. Stan na 10.01.2026.' }];
		render(<RecordView record={base} />);
		expect(screen.getByText('Czego nie udało się ustalić')).toBeTruthy();
		expect(screen.getByText('Dodatkowe uwagi')).toBeTruthy();
		expect(screen.getByText(base.shortAnswer)).toBeTruthy();
	});

	it('wstrzymanie się: uczciwe wyjaśnienie bez cytatów', () => {
		const { container } = render(<RecordView record={record('brak_wystarczajacych_dowodow')} />);
		expect(screen.getByText(/oficjalnym źródle/)).toBeTruthy();
		expect(container.querySelector('blockquote')).toBeNull();
	});

	it('układ: zdanie główne, mała etykieta, pewność, data i odsyłacz w tej kolejności', () => {
		const { container } = render(<RecordView record={record('falszywe')} />);
		const order = ['.record-claim__headline', '.verdict__label', '.verdict__certainty', '.record-claim__asof', '.record-claim__evidence-link']
			.map((selector) => container.querySelector(selector));
		expect(order.every(Boolean)).toBe(true);
		for (let i = 1; i < order.length; i++) {
			expect(order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		}
		expect(container.querySelector('.record-claim__headline')?.textContent).toMatch(/podał .* co innego: „/);
		expect(screen.getByText('Na ile to pewne: średnio')).toBeTruthy();
		expect(container.querySelector('.verdict__label')?.closest('h1,h2,h3,h4,h5,h6')).toBeNull();
	});

	it('odsyłacz "Zobacz, skąd to wiem" otwiera źródła', () => {
		const { container } = render(<RecordView record={record('potwierdzone')} />);
		const details = container.querySelector('details.record-claim__sources') as HTMLDetailsElement;
		expect(details.open).toBe(false);
		fireEvent.click(screen.getByRole('button', { name: 'Zobacz, skąd to wiem' }));
		expect(details.open).toBe(true);
	});

	it('rozmiar czcionki etykiety jest mniejszy niż zdania głównego', () => {
		const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'record.css'), 'utf8');
		const sizeOf = (selector: string) => {
			const block = new RegExp(`${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`).exec(css);
			const size = /font-size:\s*([\d.]+)rem/.exec(block?.[1] ?? '');
			if (!size) throw new Error(`brak font-size: ${selector}`);
			return Number(size[1]);
		};
		const headline = sizeOf('.record-claim__headline');
		expect(sizeOf('.record-claim .verdict__label')).toBeLessThan(headline);
		expect(sizeOf('.record-claim .verdict__certainty')).toBeLessThan(headline);
		expect(headline).toBeGreaterThan(1.5);
	});

	it('dodaje kartę do pobrania z adresem SVG', () => {
		const rec = record('potwierdzone');
		const { container } = render(<RecordView record={rec} />);
		const img = container.querySelector('img.record-card__image');
		expect(img?.getAttribute('src')).toBe(`/api/records/${rec.id}/card.svg`);
		const download = container.querySelector('a.record-card__download');
		expect(download?.getAttribute('href')).toBe(`/api/records/${rec.id}/card.svg?download=1`);
		expect(download?.hasAttribute('download')).toBe(true);
	});

	it('własne teksty nie zawierają zakazanych form ani słów', () => {
		const { container } = render(<RecordView record={record('potwierdzone')} />);
		const own = [
			...container.querySelectorAll('.verdict__certainty, .record-claim__asof, .record-claim__note'),
		].map((node) => node.textContent ?? '');
		expect(findForbiddenForms(own.join(' '))).toEqual([]);
		const text = (container.textContent ?? '').toLowerCase();
		for (const word of ['korpus', 'werdykt', 'fragment ', 'rekord ', 'prompt', 'incydent', 'artefakt']) {
			expect(text).not.toContain(word);
		}
	});
});
