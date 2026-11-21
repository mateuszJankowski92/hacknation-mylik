import { describe, expect, it } from 'vitest';
import { claimSignature, normalizeClaimText, sameCase } from '../../src/cases/similarity';

function same(a: string, b: string): boolean {
	return sameCase(claimSignature(a), claimSignature(b));
}

describe('normalizeClaimText', () => {
	it('usuwa polskie znaki, interpunkcję i różnice wielkości liter', () => {
		expect(normalizeClaimText('  Żółć, GĘŚLĄ jaźń!!  ')).toBe('zolc gesla jazn');
		expect(normalizeClaimText('Łódź: 15%?')).toBe('lodz 15');
	});
});

describe('deduplikacja spraw: te same twierdzenia', () => {
	it('ten sam tekst z inną interpunkcją i wielkością liter', () => {
		expect(same('Kometa przeleciała nad Zakopanem!', 'kometa przeleciala nad zakopanem')).toBe(true);
	});

	it('zmieniony szyk i wstęp "podobno" (te same słowa kluczowe)', () => {
		expect(
			same(
				'Podobno od jutra wszystkie banki zamykają konta bez wcześniejszego uprzedzenia klientów.',
				'Od jutra banki zamykają konta klientów, uprzedzenia wcześniejszego nie będzie.',
			),
		).toBe(true);
		expect(
			same(
				'Szczepionka powoduje trwałe zmiany w materiale genetycznym człowieka.',
				'Podobno szczepionka powoduje zmiany trwałe w materiale genetycznym człowieka.',
			),
		).toBe(true);
	});

	it('odmiana słów (te same pierwsze litery rdzeni)', () => {
		expect(
			same(
				'Rząd planuje wprowadzenie nowego podatku od zwierząt domowych.',
				'Rząd planuje wprowadzić nowy podatek od zwierząt domowych.',
			),
		).toBe(true);
	});
});

describe('deduplikacja spraw: ostrożny próg, różne twierdzenia zostają osobno', () => {
	it('inna liczba', () => {
		expect(same('Podwyżka zasiłku wyniesie 300 złotych na każde dziecko od stycznia.', 'Podwyżka zasiłku wyniesie 500 złotych na każde dziecko od stycznia.')).toBe(false);
	});

	it('liczba w jednym twierdzeniu, brak w drugim', () => {
		expect(same('Podwyżka zasiłku wyniesie 300 złotych na każde dziecko.', 'Podwyżka zasiłku wyniesie złotych na każde dziecko.')).toBe(false);
	});

	it('przeczenie zmienia sens', () => {
		expect(same('Ta szczepionka jest bezpieczna dla dzieci poniżej pięciu lat.', 'Ta szczepionka nie jest bezpieczna dla dzieci poniżej pięciu lat.')).toBe(false);
		expect(same('Wszystkie szkoły w mieście będą otwarte w poniedziałek rano.', 'Szkoły w mieście bez wyjątku będą otwarte w poniedziałek rano.')).toBe(false);
	});

	it('inna nazwa własna w długim zdaniu', () => {
		expect(
			same(
				'Burmistrz ogłosił zamknięcie wszystkich szkół podstawowych w Krakowie na cały przyszły tydzień.',
				'Burmistrz ogłosił zamknięcie wszystkich szkół podstawowych w Gdańsku na cały przyszły tydzień.',
			),
		).toBe(false);
	});

	it('wspólny temat, ale inne twierdzenie', () => {
		expect(same('Szczepionka powoduje trwałe zmiany w materiale genetycznym człowieka.', 'Szczepionka została dopuszczona do obrotu po pięciu latach badań.')).toBe(false);
		expect(same('Rząd planuje wprowadzenie nowego podatku od zwierząt domowych.', 'Rząd planuje likwidację podatku od nieruchomości.')).toBe(false);
	});

	it('za mało słów kluczowych: tylko dokładny tekst się skleja', () => {
		expect(same('Prom nie pływa dziś.', 'Prom dziś nie kursuje.')).toBe(false);
		expect(same('Prom nie pływa dziś.', 'prom NIE pływa dziś')).toBe(true);
	});

	it('puste i krótkie teksty nie sklejają się ze wszystkim', () => {
		expect(same('', 'Cokolwiek tutaj jest napisane o czymś.')).toBe(false);
		expect(same('Tak', 'Nie')).toBe(false);
	});
});
