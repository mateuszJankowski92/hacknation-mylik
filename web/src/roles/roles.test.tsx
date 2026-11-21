// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { RecordView } from '../components/RecordView';
import { FIXTURE_OUTCOMES } from '../fixtures/outcomes';
import { measureLanguage } from '../../../src/render/metrics';
import type { VerificationRecord } from '../../../src/contracts/record';
import { VERDICTS } from '../../../src/contracts/verdict';
import {
	ART_EXTENSIONS,
	DEFAULT_ROLE,
	RESULT_KEYS,
	ROLES,
	ROLE_SPECS,
	START_CHARACTER_ALT,
	artCandidates,
	resultImageFor,
	topicNote,
} from './config';
import { resolveRole } from './resolve';
import { ResultImage } from './ResultImage';
import { plain } from '../typography';

afterEach(cleanup);

const FORBIDDEN_WORDS =
	/personaliz|weryfik|werdykt|korpus|fragment|rekord|dowod|dowód|siła podstawy|stanowisk|wstrzyma|prompt|model|kanał|incydent|artefakt|wyrok|sąd|sędzi|oskarż|winn|prawda|fałsz/iu;

function allTexts(): string[] {
	const texts = [START_CHARACTER_ALT];
	for (const role of ROLES) {
		const spec = ROLE_SPECS[role];
		texts.push(spec.name, spec.topic, spec.character.postac, spec.character.praca);
		for (const key of RESULT_KEYS) {
			const image = resultImageFor(role, key);
			if (image) texts.push(image.caption);
		}
	}
	return texts;
}

function firstRecord(): VerificationRecord {
	for (const outcome of Object.values(FIXTURE_OUTCOMES)) {
		if (outcome.kind === 'record' && outcome.record.claims.length === 1) return outcome.record;
	}
	throw new Error('brak rekordu w danych przykładowych');
}

describe('tabela obrazów wyniku', () => {
	it('każda rola ma wpis (obraz albo jawne brak) dla każdej etykiety i stanu', () => {
		expect(RESULT_KEYS).toHaveLength(8);
		for (const role of ROLES) {
			for (const key of RESULT_KEYS) {
				expect(Object.prototype.hasOwnProperty.call(ROLE_SPECS[role].results, key)).toBe(true);
			}
		}
	});

	it('pogodynka ma obraz dla pięciu etykiet i stanów technicznych', () => {
		for (const key of VERDICTS) expect(resultImageFor('pogodynka', key)).not.toBeNull();
		expect(resultImageFor('pogodynka', 'awaria_techniczna')?.caption).toBe('Spróbuj ponownie.');
		expect(resultImageFor('pogodynka', 'falszywe')?.caption).toBe('Źródła mówią co innego.');
	});

	it('bibliotekarka i sport mają jawny brak obrazu wyniku', () => {
		for (const role of ['bibliotekarka', 'sport'] as const) {
			for (const key of RESULT_KEYS) expect(resultImageFor(role, key)).toBeNull();
		}
	});
});

describe('wybór roli', () => {
	it('bez pola w rekordzie wybiera rolę domyślną', () => {
		expect(resolveRole({})).toBe(DEFAULT_ROLE);
		expect(resolveRole({ recordRole: 'nieznana' })).toBe(DEFAULT_ROLE);
		expect(resolveRole({ recordRole: 'sport' })).toBe('sport');
	});

	it('parametr ?rola= działa tylko w trybie deweloperskim', () => {
		expect(resolveRole({ recordRole: 'sport', search: '?rola=bibliotekarka', dev: true })).toBe('bibliotekarka');
		expect(resolveRole({ recordRole: 'sport', search: '?rola=bibliotekarka', dev: false })).toBe('sport');
		expect(resolveRole({ search: '?rola=zla', dev: true })).toBe(DEFAULT_ROLE);
	});
});

describe('dostępność obrazu wyniku', () => {
	it('tekst alternatywny jest równy podpisowi, a podpis jest widoczny', () => {
		for (const key of RESULT_KEYS) {
			const spec = resultImageFor('pogodynka', key);
			if (!spec) continue;
			const { container } = render(<ResultImage role="pogodynka" resultKey={key} />);
			expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe(spec.caption);
			expect(plain(container.querySelector('figcaption')?.textContent ?? '')).toBe(spec.caption);
			cleanup();
		}
	});

	it('rola bez obrazu wyniku nic nie rysuje', () => {
		const { container } = render(<ResultImage role="sport" resultKey="potwierdzone" />);
		expect(container.firstChild).toBeNull();
	});

	it('każdy obraz ma inny podpis lub inny kształt niż kolor (podpis zawsze jest tekstem)', () => {
		const captions = VERDICTS.map((key) => resultImageFor('pogodynka', key)!.caption);
		expect(new Set(captions).size).toBe(captions.length);
	});

	it('pliki postaci mają ścieżkę rola/stan i rozszerzenia z listy', () => {
		const paths = artCandidates('sport', 'praca');
		expect(paths).toHaveLength(ART_EXTENSIONS.length);
		expect(paths[0]).toBe('/postacie/sport/praca.webp');
	});
});

describe('treść wyniku nie zależy od roli', () => {
	function contentFor(recordRole: string | undefined): string {
		const record = { ...firstRecord(), ...(recordRole ? { role: recordRole } : {}) } as VerificationRecord;
		const { container } = render(<RecordView record={record} />);
		const clone = container.cloneNode(true) as HTMLElement;
		clone.querySelectorAll('.result-image, .role-note').forEach((node) => node.remove());
		const text = clone.textContent ?? '';
		cleanup();
		return text;
	}

	it('duże zdanie, etykieta, cytat, źródło i data są identyczne w trzech rolach', () => {
		const baseline = contentFor(undefined);
		expect(baseline.length).toBeGreaterThan(50);
		for (const role of ROLES) expect(contentFor(role)).toBe(baseline);
	});

	it('obraz wyniku pojawia się obok zdania tylko w roli z tabelą obrazów', () => {
		const record = firstRecord();
		const withRole = (role: string) => ({ ...record, role }) as VerificationRecord;
		const weather = render(<RecordView record={withRole('pogodynka')} />);
		expect(weather.container.querySelector('.record-claim__lead .result-image')).not.toBeNull();
		cleanup();
		const library = render(<RecordView record={withRole('bibliotekarka')} />);
		expect(library.container.querySelector('.result-image')).toBeNull();
		expect(screen.getByText('Widok dopasowany do tematu: przepisy i prawa obywatela.')).toBeTruthy();
	});
});

describe('język ról', () => {
	it('teksty są proste, bez słownictwa sądowego i bez słowa personalizacja', () => {
		for (const text of allTexts()) expect(text).not.toMatch(FORBIDDEN_WORDS);
		const metrics = measureLanguage(allTexts());
		expect(metrics.forbiddenForms).toBe(0);
		expect(metrics.averageSentenceWords).toBeLessThanOrEqual(12);
	});

	it('notatka o temacie istnieje tylko dla ról innych niż domyślna', () => {
		expect(topicNote('pogodynka')).toBeNull();
		expect(topicNote('sport')).toBe('Widok dopasowany do tematu: sport i rozrywka.');
	});
});
