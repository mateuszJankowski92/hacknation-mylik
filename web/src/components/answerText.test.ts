import { describe, expect, it } from 'vitest';
import { classifyAnswer, splitSentences } from './answerText';

describe('podział odpowiedzi na zdania', () => {
	it('nie dzieli w cudzysłowie, w nawiasie, po skrócie, inicjale ani w dacie', () => {
		const text =
			'Redakcja Demagog sprawdziła twierdzenie: „W Warszawie policja ogłosiła alarm. Funkcjonariusze są pilnie ściągani.” (autor wypowiedzi: M. Jakubiak, np. na antenie) i oceniła je jako „Fałsz”. Publikacja z 10.11.2026.';
		expect(splitSentences(text)).toEqual([
			'Redakcja Demagog sprawdziła twierdzenie: „W Warszawie policja ogłosiła alarm. Funkcjonariusze są pilnie ściągani.” (autor wypowiedzi: M. Jakubiak, np. na antenie) i oceniła je jako „Fałsz”.',
			'Publikacja z 10.11.2026.',
		]);
	});

	it('dzieli po adresie kończącym zdanie i nie zmienia liter', () => {
		const text = 'Podobne twierdzenie: „x” i oceniła je jako „Prawda”, 05.04.2024, https://demagog.org.pl/a/b/. To nie rozstrzyga Twojego pytania wprost.';
		const parts = splitSentences(text);
		expect(parts).toHaveLength(2);
		expect(parts.join(' ')).toBe(text);
	});
});

describe('poziomy odpowiedzi', () => {
	it('bezpośrednia odpowiedź jest wielka, ocena średnia, reszta zwykła, zastrzeżenie małe', () => {
		const headline =
			'Nie udało mi się tego potwierdzić. Do sprawdzenia potrzebuję: komunikat przewoźnika. Brak wyniku w moich źródłach nie oznacza, że to nieprawda. Redakcja X sprawdziła podobne twierdzenie: „a. B” i oceniła je jako „Fałsz”. To nie rozstrzyga Twojego pytania wprost.';
		const parts = classifyAnswer(headline, 'Nie udało mi się tego potwierdzić.');
		expect(parts.map((part) => part.level)).toEqual(['lead', 'assessment', 'plain', 'needed', 'caveat']);
		expect(parts[0]!.text).toBe('Nie udało mi się tego potwierdzić.');
		expect(parts.map((part) => part.text).sort()).toEqual(splitSentences(headline).sort());
	});

	it('bez bezpośredniej odpowiedzi pierwsze zdanie jest wielkie, a treść zostaje bez zmian', () => {
		const headline = 'Nie udało mi się potwierdzić tej informacji. Do sprawdzenia potrzebuję: dokument. Brak wyniku w moich źródłach nie oznacza, że to nieprawda.';
		const parts = classifyAnswer(headline);
		expect(parts.map((part) => part.level)).toEqual(['lead', 'needed', 'caveat']);
		expect(parts.map((part) => part.text).join(' ')).toBe(headline);
	});
});
