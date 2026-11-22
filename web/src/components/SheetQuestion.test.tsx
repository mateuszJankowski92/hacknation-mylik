import { describe, expect, it } from 'vitest';
import { describeAddress } from './SheetQuestion';

describe('adres w pytaniu', () => {
	it('pokazuje domenę i zdekodowany, skrócony adres', () => {
		const address = describeAddress(
			'https://www.gov.pl/web/gis/ostrze%C5%BCenie-publiczne-dotycz%C4%85ce-%C5%BCywno%C5%9Bci-stwierdzenie-przekroczenia-najwy%C5%BCszego-poziomu',
		);
		expect(address?.domain).toBe('gov.pl');
		expect(address?.shortAddress.endsWith('…')).toBe(true);
		expect(address?.shortAddress).toContain('ostrzeżenie-publiczne');
		expect(address?.fullAddress).toContain('żywności');
		expect(address?.fullAddress).not.toContain('%C5');
	});

	it('zwykły tekst nie jest adresem', () => {
		expect(describeAddress('Czy w Warszawie jest alarm?')).toBeNull();
		expect(describeAddress('Zobacz https://przyklad.example i oceń')).toBeNull();
	});
});
