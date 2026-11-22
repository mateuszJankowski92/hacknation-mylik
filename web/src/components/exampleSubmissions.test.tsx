import { describe, expect, it } from 'vitest';
import { predictLiveRole } from '../../../src/roles/live';
import { DEFAULT_ROLE, ROLES, isRole } from '../roles/config';
import { EXAMPLE_POOL, EXAMPLES_SHOWN, pickExamples, type ExampleQuery } from './exampleSubmissions';

function seeded(seed: number): () => number {
	let state = seed;
	return function next() {
		state = (state * 1664525 + 1013904223) % 4294967296;
		return state / 4294967296;
	};
}

const CLAIM_EXAMPLES = EXAMPLE_POOL.filter((example) => example.kind !== 'link');

describe('pula przykładów', () => {
	it('ma identyfikatory unikalne i każdą rolę z konfiguracji', () => {
		expect(new Set(EXAMPLE_POOL.map((example) => example.id)).size).toBe(EXAMPLE_POOL.length);
		for (const example of EXAMPLE_POOL) expect(isRole(example.role)).toBe(true);
	});

	it('każda rola ma co najmniej 2 przykłady', () => {
		for (const role of ROLES) {
			expect(EXAMPLE_POOL.filter((example) => example.role === role).length, role).toBeGreaterThanOrEqual(2);
		}
	});

	it('rola zapisana przy zgłoszeniu zgadza się z kodem dobierającym rolę', () => {
		for (const example of CLAIM_EXAMPLES) expect(predictLiveRole(example.text), example.id).toBe(example.role);
	});

	it('nie zapisuje treści odpowiedzi ani werdyktu', () => {
		for (const example of EXAMPLE_POOL) expect(Object.keys(example).sort()).toEqual(['id', 'kind', 'label', 'role', 'text']);
	});
});

describe('pickExamples', () => {
	it('losuje cztery różne role, najwyżej jedną domyślną, z białą plamą', () => {
		for (let seed = 1; seed <= 300; seed++) {
			const chosen = pickExamples(undefined, seeded(seed));
			expect(chosen).toHaveLength(EXAMPLES_SHOWN);
			expect(new Set(chosen.map((example) => example.role)).size, `seed ${seed}`).toBe(EXAMPLES_SHOWN);
			expect(chosen.filter((example) => example.role === DEFAULT_ROLE).length).toBeLessThanOrEqual(1);
			expect(chosen.some((example) => example.kind === 'biala_plama')).toBe(true);
		}
	});

	it('zwykle zawiera odpowiedź z oceny redakcji i ze źródła urzędowego', () => {
		let both = 0;
		for (let seed = 1; seed <= 100; seed++) {
			const chosen = pickExamples(undefined, seeded(seed));
			if (chosen.some((example) => example.kind === 'redakcja') && chosen.some((example) => example.kind === 'urzad')) both++;
		}
		expect(both).toBeGreaterThan(80);
	});

	it('kolejne losowanie ma inne role niż poprzednie, na ile się da', () => {
		for (let seed = 1; seed <= 100; seed++) {
			const random = seeded(seed);
			const first = pickExamples(undefined, random);
			const second = pickExamples(undefined, random, first.map((example) => example.id));
			const firstRoles = new Set(first.map((example) => example.role));
			const overlap = second.filter((example) => firstRoles.has(example.role)).length;
			expect(overlap, `seed ${seed}`).toBeLessThanOrEqual(1);
			expect(second.map((example) => example.id).some((id) => first.some((example) => example.id === id))).toBe(false);
		}
	});

	it('działa na małej puli', () => {
		const pool: ExampleQuery[] = EXAMPLE_POOL.slice(0, 2);
		expect(pickExamples(pool, seeded(3))).toHaveLength(2);
		expect(pickExamples([], seeded(3))).toEqual([]);
	});
});
