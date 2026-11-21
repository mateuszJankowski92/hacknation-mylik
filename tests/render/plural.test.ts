import { describe, expect, it } from 'vitest';
import { countNoun, pluralForm } from '../../src/render/plural';

describe('pluralForm', () => {
	const form = (n: number) => pluralForm(n, 'twierdzenie', 'twierdzenia', 'twierdzeń');

	it('1 to liczba pojedyncza', () => {
		expect(form(1)).toBe('twierdzenie');
	});

	it('2-4, 22-24, 32-34 to druga forma', () => {
		for (const n of [2, 3, 4, 22, 23, 24, 32, 104]) expect(form(n)).toBe('twierdzenia');
	});

	it('0, 5-21, 25-31 oraz 12-14 to trzecia forma', () => {
		for (const n of [0, 5, 6, 11, 12, 13, 14, 15, 21, 25, 100, 112, 113, 114]) expect(form(n)).toBe('twierdzeń');
	});

	it('countNoun odmienia typowe rzeczowniki', () => {
		expect(countNoun(5, 'twierdzenie')).toBe('5 twierdzeń');
		expect(countNoun(2, 'zrodlo')).toBe('2 źródła');
		expect(countNoun(1, 'zrodlo')).toBe('1 źródło');
		expect(countNoun(5, 'zdanie')).toBe('5 zdań');
		expect(countNoun(3, 'dokument')).toBe('3 dokumenty');
		expect(countNoun(12, 'dokument')).toBe('12 dokumentów');
	});
});
