// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { VerificationRecord } from '../../src/contracts/record';
import { RecordView } from './components/RecordView';
import { howSearchedLines } from './components/howSearched';
import { FIXTURE_OUTCOMES } from './fixtures/outcomes';
import { plain } from './typography';

afterEach(cleanup);

function record(key: string): VerificationRecord {
	const outcome = FIXTURE_OUTCOMES[key]!;
	if (outcome.kind !== 'record') throw new Error('brak rekordu');
	return outcome.record;
}

describe('Jak szukałem', () => {
	it('lista pochodzi z pól rekordu: twierdzenia, obalanie, cytaty, czas', () => {
		const base = record('potwierdzone');
		const withTime: VerificationRecord = { ...base, usage: { ...base.usage, latencyMs: 12400 } };
		const lines = howSearchedLines(withTime);
		const quotes = base.claims.reduce((sum, result) => sum + result.evidence.length, 0);
		expect(lines[0]).toBe('Przeczytałem zgłoszenie.');
		expect(lines).toContain(`Sprawdziłem cytaty: ${quotes} przeszedł kontrolę.`);
		expect(lines.at(-1)).toBe('Całe sprawdzenie trwało 12 s.');
	});

	it('bez czasu w rekordzie nie zgaduje czasu, a bez dowodów nie podaje liczby cytatów', () => {
		const base = record('brak_wystarczajacych_dowodow');
		const lines = howSearchedLines({ ...base, usage: { ...base.usage, latencyMs: 0 } });
		expect(lines.join(' ')).not.toMatch(/trwało|cytaty/);
	});

	it('sekcja jest w rozwijanych szczegółach arkusza', () => {
		const { container } = render(<RecordView record={record('potwierdzone')} />);
		const section = container.querySelector('.record__searched');
		expect(section).not.toBeNull();
		expect(section?.closest('details')).not.toBeNull();
		expect(section?.querySelector('h2')?.textContent).toBe('Jak szukałem');
	});
});

describe('drobne usterki', () => {
	it('nazwa wydawcy w dużym zdaniu nie jest ucinana w pół słowa', () => {
		const base = record('potwierdzone');
		const publisher = 'Wojewódzka Stacja Sanitarno-Epidemiologiczna w Białymstoku Oddział Terenowy';
		const claim = base.claims[0]!;
		const changed: VerificationRecord = {
			...base,
			claims: [{ ...claim, evidence: claim.evidence.map((item) => ({ ...item, source: { ...item.source, publisher } })) }],
		};
		const { container } = render(<RecordView record={changed} />);
		const headline = plain(container.querySelector('.record-claim__headline')?.textContent ?? '');
		expect(headline).toContain(publisher);
		expect(headline).not.toContain('…');
	});

	it('przy wstrzymaniu praktyczna wskazówka stoi nad zdaniem o białej plamie', () => {
		const { container } = render(<RecordView record={record('brak_z_silnika')} />);
		const lead = container.querySelector('.record-claim__lead') as HTMLElement;
		const text = plain(lead.textContent ?? '');
		expect(text.indexOf('Do sprawdzenia potrzebuję:')).toBeGreaterThanOrEqual(0);
		expect(text.indexOf('Do sprawdzenia potrzebuję:')).toBeLessThan(text.indexOf('Biała plama'));
	});
});
