import { describe, expect, it } from 'vitest';
import { maskPii } from '../../src/input/index';

describe('maskowanie imion i nazwisk', () => {
  it.each([
    ['Pan Jan Kowalski dzwonił wczoraj.', 'Pan [OSOBA] dzwonił wczoraj.'],
    ['Pani Anna Nowak-Wiśniewska prosi o pomoc.', 'Pani [OSOBA] prosi o pomoc.'],
    ['Imię i nazwisko: Piotr Zieliński', 'Imię i nazwisko: [OSOBA]'],
    ['Nazywam się Ewa Mazur i mam pytanie.', 'Nazywam się [OSOBA] i mam pytanie.'],
  ])('maskuje: %s', (input, expected) => {
    const result = maskPii(input);
    expect(result.text).toBe(expected);
    expect(result.masks.find((m) => m.type === 'OSOBA')?.count).toBe(1);
  });

  it.each([
    'Pan Premier Kowalski ogłosił decyzję.',
    'Pani Minister Nowak ogłosiła decyzję.',
    'Pan Prezydent Warszawy podpisał ustawę.',
    'Pan Bóg wie, co będzie.',
    'Mieszkam w Warszawie, a pracuję w Krakowie.',
    'Uniwersytet Jagielloński ogłosił nabór.',
    'Zakład Ubezpieczeń Społecznych wypłaca zasiłek.',
    'Rzeczpospolita Polska jest krajem w Europie.',
    'Szpital Wojewódzki w Lublinie zamknął oddział.',
  ])('nie rusza: %s', (input) => {
    const result = maskPii(input);
    expect(result.text).toBe(input);
    expect(result.masks.some((m) => m.type === 'OSOBA')).toBe(false);
  });
});
