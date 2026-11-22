import { describe, expect, it } from 'vitest';
import { SHORT_ANSWER_MAX_CHARS, type Notice, type VerificationRecord } from '../../src/contracts/index';
import { renderShortAnswer } from '../../src/render/index';
import { findForbiddenForms } from '../../src/render/metrics';
import { renderCardSvg } from '../../src/card/svg';
import { FIXTURE_OUTCOMES } from '../../web/src/fixtures/outcomes';
import {
	knownOpWarningLines,
	parseKnownOpNotice,
	selectKnownOpWarnings,
} from '../../src/render/warning';

function notice(title: string, date: string, url: string): Notice {
	return {
		type: 'dopasowanie_incydentu',
		text: `Stan na 2026-11-21. Opisała je strona EUvsDisinfo. Tytuł opisu po angielsku: „${title}” (${date}). Opis: ${url} To tylko informacja.`,
	};
}

const NOTICES: Notice[] = [
	notice('Alpha story', '2023-02-01', 'https://euvsdisinfo.eu/report/a'),
	notice('Gamma story', '2025-06-30', 'https://euvsdisinfo.eu/report/c'),
	notice('Beta story', '2024-05-17', 'https://euvsdisinfo.eu/report/b'),
	{ type: 'ograniczenie_techniczne', text: 'Inna uwaga.' },
];

function baseRecord(): VerificationRecord {
	const outcome = FIXTURE_OUTCOMES.potwierdzone!;
	if (outcome.kind !== 'record') throw new Error('brak rekordu');
	return { ...outcome.record, notices: NOTICES };
}

describe('ostrzeżenie EUvsDisinfo', () => {
	it('wyciąga tytuł, datę i odsyłacz, pomijając "Stan na"', () => {
		expect(parseKnownOpNotice(NOTICES[0]!.text)).toEqual({
			title: 'Alpha story',
			date: '2023-02-01',
			url: 'https://euvsdisinfo.eu/report/a',
		});
	});

	it('wybiera najwyżej dwa, najnowsze pierwsze', () => {
		const picked = selectKnownOpWarnings(NOTICES);
		expect(picked.map((w) => w.title)).toEqual(['Gamma story', 'Beta story']);
	});

	it('układ ma daty DD.MM.RRRR i neutralne zakończenie', () => {
		const lines = knownOpWarningLines(selectKnownOpWarnings(NOTICES)[0]!);
		expect(lines[0]).toBe('Uwaga: podobna wiadomość krążyła już wcześniej.');
		expect(lines[1]).toBe('Strona EUvsDisinfo (Unia Europejska) opisała ją 30.06.2025 jako dezinformację:');
		expect(lines[2]).toBe('„Gamma story”');
		expect(lines[3]).toBe('Zobacz opis: https://euvsdisinfo.eu/report/c');
		expect(lines.at(-1)).toBe('To tylko podpowiedź. Nie mówi, czy Twoja wiadomość to prawda.');
		const text = lines.join(' ');
		expect(text).not.toMatch(/operacj/i);
		expect(findForbiddenForms(text)).toEqual([]);
	});

	it('SMS: dwa pierwsze zdania, odsyłacz do karty, mieści się w limicie', () => {
		const sms = renderShortAnswer(baseRecord(), 'https://mylik.example/k/1');
		expect(sms).toContain('Uwaga: podobna wiadomość krążyła już wcześniej. Strona EUvsDisinfo (Unia Europejska) opisała ją 30.06.2025 jako dezinformację.');
		expect(sms).toContain('https://mylik.example/k/1');
		expect(sms).not.toContain('Gamma story');
		expect(sms.length).toBeLessThanOrEqual(SHORT_ANSWER_MAX_CHARS);
	});

	it('karta SVG: ostrzeżenie i podtytuł marki, bez zmiany etykiety', () => {
		const record = baseRecord();
		const withWarning = renderCardSvg(record, { cardUrl: 'https://mylik.example/k/1' });
		const without = renderCardSvg({ ...record, notices: [] }, { cardUrl: 'https://mylik.example/k/1' });
		expect(withWarning).toContain('opisała ją 30.06.2025 jako dezinformację');
		expect(withWarning).toContain('Mylik. Informacja to nie fakt.');
		expect(withWarning).toContain('Stan źródeł na 10.01.2026.');
		const label = (svg: string) => /<title id="card-title">([^<]*)</.exec(svg)?.[1];
		expect(label(withWarning)).toBe(label(without));
	});
});
