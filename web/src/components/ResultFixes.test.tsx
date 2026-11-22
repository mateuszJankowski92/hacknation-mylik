// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ClaimResult, VerificationRecord } from '../../../src/contracts/record';
import { FORBIDDEN_CITIZEN_WORDS } from '../../../src/render/citizen';
import { FIXTURE_OUTCOMES } from '../fixtures/outcomes';
import { RecordView } from './RecordView';
import { plain } from '../typography';

afterEach(cleanup);

function baseRecord(key: string): VerificationRecord {
	const outcome = FIXTURE_OUTCOMES[key]!;
	if (outcome.kind !== 'record') throw new Error('brak rekordu');
	return structuredClone(outcome.record);
}

function withClaims(record: VerificationRecord, count: number): VerificationRecord {
	const first = record.claims[0]!;
	const claims: ClaimResult[] = Array.from({ length: count }, (_, index) => ({
		...structuredClone(first),
		claim: { ...first.claim, id: `c${index + 1}` },
	}));
	return { ...record, claims };
}

const JARGON_ABSTAIN =
	'W zbiorze źródeł nie znaleziono fragmentu, który potwierdza lub obala to twierdzenie. Sprawdzono 12 fragmentów; bramka cytatów odrzuciła 0 ocen.';
const JARGON_SCOPE =
	'Sprawdzono wyłącznie w zamkniętym zbiorze źródeł (wersja korpusu v1, 9 dokumentów). Wynik nie jest rozstrzygnięciem prawdy absolutnej.';

describe('jedno podsumowanie i jedna karta na stronę', () => {
	it('dla 5 twierdzeń: jedno podsumowanie, jedna karta, kolejne arkusze widoczne od razu', () => {
		const { container } = render(<RecordView record={withClaims(baseRecord('potwierdzone'), 5)} />);
		expect(plain(container.querySelector('.record__summary')?.textContent ?? '')).toMatch(/^Sprawdziłem 5 zdań z tej strony\. /);
		expect(container.querySelectorAll('.record-card')).toHaveLength(1);
		expect(container.querySelectorAll('img.record-card__image')).toHaveLength(1);
		const list = container.querySelector('div.record__claims-list') as HTMLElement;
		expect(container.querySelector('details.record__claims-list')).toBeNull();
		expect(list.querySelectorAll('article.record-claim')).toHaveLength(5);
		expect(container.querySelectorAll('[data-result-heading]')).toHaveLength(1);
		expect(container.querySelectorAll('.record-claim > .result-image').length).toBeLessThanOrEqual(1);
		expect(container.querySelectorAll('article.record-claim')).toHaveLength(5);
		expect(container.textContent).not.toContain('twierdzenia. Oceniam');
	});

	it('dla 1 twierdzenia: jedna karta', () => {
		const { container } = render(<RecordView record={baseRecord('potwierdzone')} />);
		expect(container.querySelectorAll('.record-card')).toHaveLength(1);
		expect(container.querySelector('.record__summary')).toBeNull();
	});

	it('podsumowanie odmienia liczbę zdań', () => {
		const two = render(<RecordView record={withClaims(baseRecord('potwierdzone'), 2)} />);
		expect(two.container.querySelector('.record__summary')?.textContent).toContain('2 zdania');
		two.unmount();
		const twentyTwo = render(<RecordView record={withClaims(baseRecord('potwierdzone'), 22)} />);
		expect(twentyTwo.container.querySelector('.record__summary')?.textContent).toContain('22 zdania');
	});
});

describe('brak pustych cudzysłowów', () => {
	it('bez cytatu nie ma cudzysłowów ani bloku cytatu, jest proste zdanie', () => {
		const record = baseRecord('potwierdzone');
		record.claims[0]!.evidence[0]!.quote = '   ';
		const { container } = render(<RecordView record={record} />);
		expect(container.querySelector('blockquote')).toBeNull();
		expect(container.textContent).not.toMatch(/„\s*”|""/);
		expect(plain(container.textContent ?? '')).toContain('Nie ma cytatu z tego źródła.');
	});

	it('puste zapytania obalające nie dają pustych cudzysłowów', () => {
		const record = baseRecord('potwierdzone');
		record.claims[0]!.refutation = { performed: true, queries: ['', ' '], found: 0 };
		const { container } = render(<RecordView record={record} />);
		expect(container.textContent).not.toMatch(/„\s*”/);
		expect(container.textContent).not.toContain('Czego szukałem');
	});
});

describe('brak żargonu w szczegółach', () => {
	function detailsWithoutTechnical(container: HTMLElement): string {
		const clone = container.cloneNode(true) as HTMLElement;
		clone.querySelectorAll('.record-claim__technical').forEach((node) => node.remove());
		return clone.textContent ?? '';
	}

	it('przepisuje teksty silnika na prosty język', () => {
		const record = baseRecord('brak_wystarczajacych_dowodow');
		record.claims[0]!.abstainReason = JARGON_ABSTAIN;
		record.claims[0]!.limitations = [JARGON_SCOPE];
		const { container } = render(<RecordView record={record} />);
		const text = detailsWithoutTechnical(container).toLowerCase();
		for (const word of FORBIDDEN_CITIZEN_WORDS) {
			if (['weryfikacj', 'model', 'wstrzymani'].includes(word)) continue;
			expect(text, word).not.toContain(word);
		}
		expect(text).not.toContain('bramka');
		expect(text).not.toContain('korpus');
	});

	it('przy dłuższych wynikach szczegóły nie mają żargonu', () => {
		const record = baseRecord('potwierdzone');
		record.claims[0]!.limitations = [JARGON_SCOPE, 'Ten fragment pochodzi z materiału archiwalnego.'];
		record.claims[0]!.explanation = 'Wstrzymujemy się od oceny. Znalezione fragmenty dają tło.';
		const { container } = render(<RecordView record={record} />);
		const text = detailsWithoutTechnical(container).toLowerCase();
		expect(text).not.toMatch(/korpus|fragment|bramk|wstrzymuj/);
		expect(text).toContain('stan zbioru źródeł');
	});

	it('liczby techniczne są tylko w rozwinięciu "Dla dociekliwych"', () => {
		const record = baseRecord('brak_wystarczajacych_dowodow');
		record.claims[0]!.abstainReason = JARGON_ABSTAIN;
		const { container } = render(<RecordView record={record} />);
		const technical = container.querySelector('.record-claim__technical');
		expect(technical?.querySelector('summary')?.textContent).toBe('Dla dociekliwych');
		expect(technical?.textContent).toContain('Sprawdzone teksty ze źródeł: 12');
		expect(technical?.textContent).toContain('Odrzucone dowody: 0');
	});
});

describe('wynik "brak wystarczających dowodów"', () => {
	it('w szczegółach jest jedno zdanie', () => {
		const record = baseRecord('brak_wystarczajacych_dowodow');
		record.claims[0]!.abstainReason = JARGON_ABSTAIN;
		record.claims[0]!.limitations = [JARGON_SCOPE];
		const { container } = render(<RecordView record={record} />);
		const abstain = container.querySelector('.record-claim__abstain')!;
		expect(abstain.querySelectorAll('p')).toHaveLength(1);
		expect(container.querySelector('.record-claim__limits')).toBeNull();
		expect(container.querySelector('.confidence--empty')).toBeNull();
	});
});
