import { describe, expect, it } from 'vitest';
import { maskPii } from '../../src/input/index';
import { maskNames } from '../../src/input/pii';

// Wskazanie mentora MSZ (21.11.2026): nie maskujemy informacji, bez których zmienia się sens pytania
// albo nie da się znaleźć dowodu; na pewno nie imion i nazwisk osób publicznych. Maskujemy numery
// PESEL, dokumentów, telefonów, adresy e-mail, numery rachunków.
describe('maskowanie: imiona i nazwiska zostają', () => {
  it.each([
    'Pan Jan Kowalski dzwonił wczoraj.',
    'Czy Donald Tusk powiedział to w Sejmie?',
    'Imię i nazwisko: Piotr Zieliński',
    'Nazywam się Ewa Mazur i mam pytanie.',
    'Pan Premier Kowalski ogłosił decyzję.',
    'Czy Wrocław był jedynym miastem, w którym 65-latkowie jeździli za darmo?',
  ])('nie rusza: %s', (input) => {
    const result = maskPii(input);
    expect(result.text).toBe(input);
    expect(result.masks.some((m) => m.type === 'OSOBA')).toBe(false);
  });

  it('kwoty i liczebności nie są numerem telefonu (zmieniłoby to sens pytania)', () => {
    for (const input of [
      'Czy Wrocław wydaje na komunikację 700000000 zł rocznie?',
      'Na protest przyszło 120 000 000 osób.',
      'Budżet to 650 000 000 PLN.',
    ]) {
      expect(maskPii(input).text).toBe(input);
    }
  });

  it('nadal maskuje PESEL, telefon, e-mail, rachunek i dowód', () => {
    const r = maskPii('PESEL 44051401359, tel. 600 700 800, mail jan@example.org, konto PL61 1090 1014 0000 0712 1981 2874, dowód ABA300000');
    const types = r.masks.map((m) => m.type).sort();
    expect(types).toEqual(['DOWOD', 'E-MAIL', 'IBAN', 'PESEL', 'TELEFON']);
    expect(r.text).not.toMatch(/44051401359|600 700 800|jan@example\.org|ABA300000/);
  });

  it('maskNames zostaje jako osobna funkcja (nieużywana przez maskPii)', () => {
    expect(maskNames('Pan Jan Kowalski dzwonił.')).toBe('Pan [OSOBA] dzwonił.');
  });
});
