// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readUnscaled } from '../testing/css';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { findForbiddenForms } from '../../../src/render/metrics';
import { VERDICT_EXPLANATIONS_PL } from '../../../src/render/plain';
import { VERDICT_LABELS_PL, VERDICTS } from '../../../src/contracts/verdict';
import { FIXTURE_OUTCOMES, FIXTURE_QUOTE_TEXT } from '../fixtures/outcomes';
import { plain } from '../typography';
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
			const { container } = render(<RecordView record={record(verdict === 'brak_wystarczajacych_dowodow' ? 'brak_z_silnika' : verdict)} />);
			expect(screen.getByText(VERDICT_LABELS_PL[verdict])).toBeTruthy();
			const headline = container.querySelector('.record-claim__headline')?.textContent ?? '';
			if (verdict === 'brak_wystarczajacych_dowodow') expect(plain(headline)).toMatch(/^Nie udało mi się potwierdzić tej informacji\. Do sprawdzenia potrzebuję: .+ Brak wyniku w moich źródłach nie oznacza, że to nieprawda\.$/u);
			else expect(headline.length).toBeGreaterThan(10);
			expect(container.querySelector('.confidence')).toBeNull();
			expect(container.querySelectorAll('.other-verdicts__item')).toHaveLength(4);
			expect(screen.getAllByText('Stan źródeł na 10.01.2026. Sprawdzono 10.01.2026, 10:00.').length).toBeGreaterThan(0);
		});
	}

	it('rekord bez pola o brakującym dokumencie pokazuje duże zdanie z silnika, nie stały napis', () => {
		const { container } = render(<RecordView record={record('brak_wystarczajacych_dowodow')} />);
		expect(plain(container.querySelector('.record-claim__headline')?.textContent ?? '')).toBe(VERDICT_EXPLANATIONS_PL.brak_wystarczajacych_dowodow);
	});

	it('oddziela źródła od interpretacji Mylika i cytuje dosłownie', () => {
		const { container } = render(<RecordView record={record('potwierdzone')} />);
		expect(screen.getByText('Co ustalił Mylik')).toBeTruthy();
		const quote = container.querySelector('.record-claim__primary blockquote p');
		expect(quote?.textContent).toBe(FIXTURE_QUOTE_TEXT);
		expect(container.querySelector('.record-claim__details .record-claim__primary')).toBeNull();
		expect(container.querySelector('.record-claim__group-block blockquote')).toBeNull();
		const link = container.querySelector('a[target="_blank"]');
		expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
	});

	it('grupuje dodatkowe dowody pod "Pokaż szczegóły"', () => {
		const base = structuredClone(record('falszywe'));
		const first = base.claims[0]!.evidence[0]!;
		base.claims[0]!.evidence = [
			first,
			{ ...first, passageId: 'p2', quote: 'Drugi cytat.', stance: 'potwierdza' },
			{ ...first, passageId: 'p3', quote: 'Trzeci cytat.', stance: 'kontekst' },
		];
		const { container } = render(<RecordView record={base} />);
		const details = container.querySelector('details.record-claim__details')!;
		expect(details.querySelector('summary')?.textContent).toBe('Pokaż szczegóły');
		expect(within(details as HTMLElement).getByText('Źródła, które potwierdzają')).toBeTruthy();
		expect(within(details as HTMLElement).getByText('Źródła z dodatkowym kontekstem')).toBeTruthy();
		expect(container.querySelectorAll('blockquote')).toHaveLength(3);
		expect(container.querySelectorAll('.record-claim__primary blockquote')).toHaveLength(1);
		render(<RecordView record={record('wprowadzajace_w_blad')} />);
		expect(screen.getByText(/stary materiał/i)).toBeTruthy();
	});

	it('pierwszy ekran wyniku ma jeden główny dowód, reszta jest pod jednym rozwijanym blokiem', () => {
		const { container } = render(<RecordView record={record('potwierdzone')} />);
		const details = container.querySelectorAll('details');
		expect(details).toHaveLength(1);
		const outside = [...container.querySelectorAll('.record-claim__primary a[target="_blank"]')];
		expect(outside).toHaveLength(1);
		for (const selector of ['.record-claim__mylik', '.record__footer', '.record-card']) {
			const node = container.querySelector(selector);
			if (node) expect(details[0]!.contains(node)).toBe(true);
		}
		expect(container.querySelector('.confidence')).toBeNull();
		const others = container.querySelector('.other-verdicts');
		expect(others).not.toBeNull();
		expect(details[0]!.contains(others)).toBe(false);
		expect(details[0]!.querySelector('summary')?.matches(':focus-visible, summary')).toBe(true);
		expect(container.querySelector('.record-claim__primary')?.textContent).toContain('Przykładowy Urząd Miasta');
	});

	it('pokazuje wynik próby obalenia i własną omylność', () => {
		const base = record('potwierdzone');
		const withExtras = structuredClone(base);
		withExtras.claims[0]!.refutation = { performed: true, queries: ['biblioteka zamknięta'], found: 0 };
		withExtras.claims[0]!.errorProfile = { bucket: 'godziny otwarcia', errors: 2, total: 20 };
		const { container } = render(<RecordView record={withExtras} />);
		expect(screen.getByText(/Nie znalazłem żadnego/)).toBeTruthy();
		expect(screen.getByText(/biblioteka zamknięta/)).toBeTruthy();
		expect(container.querySelector('.error-dots__sentence')?.textContent).toContain('2 razy na 20 sprawdzeń');
		expect(container.querySelectorAll('.error-dots__ok, .error-dots__miss')).toHaveLength(20);
		expect(container.querySelectorAll('.error-dots__miss')).toHaveLength(2);
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
		expect(screen.getByText(/Szukaj dalej na stronie właściwego urzędu/)).toBeTruthy();
		expect(container.querySelector('blockquote')).toBeNull();
	});

	it('układ: zdanie główne, duża etykieta, pozostałe oceny, odsyłacz, a niżej cytat ze źródłem', () => {
		const { container } = render(<RecordView record={record('falszywe')} />);
		const order = ['.record-claim__headline', '.verdict__label', '.other-verdicts', '.record-claim__evidence-link', '.record-claim__primary']
			.map((selector) => container.querySelector(selector));
		expect(order.every(Boolean)).toBe(true);
		for (let i = 1; i < order.length; i++) {
			expect(order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		}
		expect(container.querySelector('.record-claim__headline')?.textContent).toMatch(/Źródło: .*, .*\. Co innego: „/);
		expect(container.querySelector('.confidence__word')).toBeNull();
		expect(container.querySelector('.verdict__label')?.closest('h1,h2,h3,h4,h5,h6')).toBeNull();
	});

	it('odsyłacz "Zobacz, skąd to wiem" otwiera źródła', () => {
		const { container } = render(<RecordView record={record('potwierdzone')} />);
		const details = container.querySelector('details.record-claim__details') as HTMLDetailsElement;
		expect(details.open).toBe(false);
		fireEvent.click(screen.getByRole('button', { name: 'Zobacz, skąd to wiem' }));
		expect(details.open).toBe(true);
	});

	it('rozmiar czcionki etykiety jest mniejszy niż zdania głównego', () => {
		const here = dirname(fileURLToPath(import.meta.url));
		const record = readUnscaled(join(here, 'record.css'), 'utf8');
		const roles = readUnscaled(join(here, '..', 'roles', 'roles.css'), 'utf8');
		const styles = readUnscaled(join(here, '..', 'styles.css'), 'utf8');
		const headlineSizes = [...roles.matchAll(/--headline-size:\s*(\d+)px/g)].map((match) => Number(match[1]));
		const smallText = Number(/--text-small:\s*(\d+)px/.exec(styles)?.[1]);
		expect(smallText).toBeGreaterThanOrEqual(16);
		expect(headlineSizes.length).toBeGreaterThan(0);
		for (const size of headlineSizes) expect(size).toBeGreaterThan(smallText);
		expect(Math.min(...headlineSizes)).toBeGreaterThanOrEqual(28);
		expect(Math.max(...headlineSizes)).toBeLessThanOrEqual(48);
		const noteBlock = /\.record-claim \.verdict__note\s*\{([^}]*)\}/.exec(record);
		expect(noteBlock?.[1]).toContain('font-size: var(--text-small)');
		const labelBlock = /\.record-claim \.verdict__label\s*\{([^}]*)\}/.exec(record);
		expect(Number(/font-size: (\d+)px/.exec(labelBlock?.[1] ?? '')?.[1])).toBeLessThan(Math.min(...headlineSizes));
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
			...container.querySelectorAll('.confidence__word, .sheet__asof, .record-claim__note'),
		].map((node) => node.textContent ?? '');
		expect(findForbiddenForms(own.join(' '))).toEqual([]);
		const text = (container.textContent ?? '').toLowerCase();
		for (const word of ['korpus', 'werdykt', 'fragment ', 'rekord ', 'prompt', 'incydent', 'artefakt', 'wyrok', 'sędzi', 'orzek', 'rozstrzyga', 'młotek', 'Temid', 'szal', ' wag']) {
			expect(text).not.toContain(word);
		}
	});
});
