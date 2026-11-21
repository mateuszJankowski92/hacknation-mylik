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
	GESTURE_CAPTION,
	RESULT_KEYS,
	ROLES,
	ROLE_SPECS,
	START_CHARACTER_ALT,
	artCandidates,
	resultImageFor,
	topicNote,
	usesGesture,
} from './config';
import { imageUrlFor } from './manifest';
import { predictedRole, recordRoleOf } from './appearance';
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

	it('wszystkie role poza pogodynkiem mają jawny brak obrazu wyniku', () => {
		for (const role of ROLES) {
			if (role === 'pogodynka') continue;
			for (const key of RESULT_KEYS) expect(resultImageFor(role, key)).toBeNull();
		}
	});
});

describe('wszystkie role na żywo', () => {
	it('rekord zwraca rolę z appearance, a bez niej starą rolę rekordu', () => {
		const record = firstRecord();
		const withAppearance = { ...record, role: 'bibliotekarka', appearance: { role: 'pilkarz', serious: false } } as VerificationRecord;
		expect(resolveRole({ recordRole: recordRoleOf(withAppearance) })).toBe('pilkarz');
		const legacy = { ...record, role: 'sport' } as VerificationRecord;
		expect(resolveRole({ recordRole: recordRoleOf(legacy) })).toBe('sport');
		const unknown = { ...record, appearance: { role: 'nieznana', serious: false } } as unknown as VerificationRecord;
		expect(resolveRole({ recordRole: recordRoleOf(unknown) })).toBe(DEFAULT_ROLE);
	});

	it('każda rola ma nazwę, temat i notatkę o dopasowanym widoku', () => {
		for (const role of ROLES) {
			expect(ROLE_SPECS[role].name.length).toBeGreaterThan(2);
			expect(topicNote(role) === null).toBe(role === DEFAULT_ROLE);
		}
		expect(ROLE_SPECS.pilkarz.name).toBe('Piłkarz');
		expect(ROLE_SPECS.sport.name).toBe('Komentator sportowy');
	});

	it('przewidywanie roli sceny czekania: lekka rola tylko przy neutralnym temacie, inaczej pogodynek', () => {
		expect(predictedRole('Bramkarz obronił rzut karny w dogrywce.')).toBe('pilkarz');
		expect(predictedRole('Klub ogłosił transfer nowego zawodnika.')).toBe('sport');
		expect(predictedRole('Inflacja podniosła ceny w sklepach.')).toBe('kasjer');
		expect(predictedRole('Piłkarz zginął w wypadku po meczu.')).toBe(DEFAULT_ROLE);
		expect(predictedRole('https://example.org/artykul')).toBe(DEFAULT_ROLE);
	});

	it('wynik roli bez słownika pokazuje gest, a poważny temat tej roli też', () => {
		for (const role of ROLES) {
			if (role === 'pogodynka') continue;
			expect(usesGesture(role, 'potwierdzone', false)).toBe(true);
			expect(usesGesture(role, 'falszywe', true)).toBe(true);
		}
		expect(usesGesture('pogodynka', 'potwierdzone', false)).toBe(false);
		expect(usesGesture('pogodynka', 'potwierdzone', true)).toBe(true);
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

	it('rola bez słownika wyniku pokazuje gest wskazania cytatu i daty, a stan techniczny nic nie rysuje', () => {
		const { container } = render(<ResultImage role="sport" resultKey="potwierdzone" />);
		const figure = container.querySelector('figure');
		expect(figure?.getAttribute('data-gesture')).toBe('true');
		expect(plain(figure?.querySelector('figcaption')?.textContent ?? '')).toBe(GESTURE_CAPTION);
		expect(imageUrlFor('sport', 'wskazuje')).toBe('/postacie/sport/praca__wskazuje.webp');
		expect(imageUrlFor('pogodynka', 'wskazuje')).toBe('/postacie/pogodynka/praca__wskaznik.webp');
		expect(imageUrlFor('bibliotekarka', 'wskazuje')).toBe('/postacie/bibliotekarka/praca__praca.webp');
		cleanup();
		const state = render(<ResultImage role="sport" resultKey="awaria_techniczna" />);
		expect(state.container.firstChild).toBeNull();
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

	it('pogoda tylko w roli z tabelą obrazów przy temacie neutralnym, w innych przypadkach gest wskazania', () => {
		const record = firstRecord();
		const withRole = (role: string) => ({ ...record, role }) as VerificationRecord;
		const weather = render(<RecordView record={withRole('pogodynka')} />);
		const weatherFigure = weather.container.querySelector('.record-claim__lead .result-image');
		expect(weatherFigure).not.toBeNull();
		expect(weatherFigure?.getAttribute('data-gesture')).toBeNull();
		expect(weather.container.querySelector('.record-claim--pointing')).toBeNull();
		cleanup();
		const library = render(<RecordView record={withRole('bibliotekarka')} />);
		expect(library.container.querySelector('.result-image')?.getAttribute('data-gesture')).toBe('true');
		expect(library.container.querySelector('.record-claim--pointing .record-claim__primary')).not.toBeNull();
		expect(screen.getByText('Widok dopasowany do tematu: przepisy i prawa obywatela.')).toBeTruthy();
	});

	it('temat wrażliwy w roli pogodynka: zamiast pogody gest wskazania, a treść wyniku bez zmian', () => {
		const record = firstRecord();
		const sensitive = {
			...record,
			maskedInput: 'Po wypadku w szkole zmarł uczeń.',
			claims: record.claims.map((claim) => ({ ...claim, claim: { ...claim.claim, text: 'Po wypadku w szkole zmarł uczeń.' } })),
		} as VerificationRecord;
		const view = render(<RecordView record={sensitive} />);
		expect(view.container.querySelector('.result-image')?.getAttribute('data-gesture')).toBe('true');
		expect(view.container.querySelector('.result-image--potwierdzone')).toBeNull();
		expect(view.container.querySelector('.result-image video')).toBeNull();
		expect(plain(view.container.querySelector('.result-image figcaption')?.textContent ?? '')).toBe(GESTURE_CAPTION);
		cleanup();
		const forced = { ...record, appearance: { role: 'pogodynka', serious: true } } as unknown as VerificationRecord;
		expect(render(<RecordView record={forced} />).container.querySelector('.result-image')?.getAttribute('data-gesture')).toBe('true');
		cleanup();
		const neutral = { ...record, appearance: { role: 'pogodynka', serious: false } } as unknown as VerificationRecord;
		expect(render(<RecordView record={neutral} />).container.querySelector('.result-image')?.getAttribute('data-gesture')).toBeNull();
	});

	it('gest dotyczy tylko etykiet werdyktu, a podpis pod obrazem jest zawsze prostym zdaniem', () => {
		for (const key of RESULT_KEYS) {
			const isVerdict = (VERDICTS as readonly string[]).includes(key);
			expect(usesGesture('sport', key, false)).toBe(isVerdict);
			expect(usesGesture('pogodynka', key, true)).toBe(isVerdict);
			expect(usesGesture('pogodynka', key, false)).toBe(false);
		}
		const captions = [GESTURE_CAPTION];
		for (const role of ROLES) for (const key of RESULT_KEYS) {
			const spec = resultImageFor(role, key);
			if (spec) captions.push(spec.caption);
		}
		for (const caption of captions) {
			expect(caption).toMatch(/^[A-ZĄĆĘŁŃÓŚŹŻ][^.!?]*[.]$/u);
			expect(caption.split(/\s+/u).length).toBeLessThanOrEqual(8);
		}
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
		expect(topicNote('pilkarz')).toBe('Widok dopasowany do tematu: piłka nożna.');
	});
});
