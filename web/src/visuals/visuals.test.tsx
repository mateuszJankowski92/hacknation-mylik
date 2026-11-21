// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { buildDotMatrix, buildGaugeZones, gaugeNeedle, scaleTiltDegrees, zoneForStrength } from '../../../src/card/visuals';
import type { VerifyProgressEvent } from '../../../src/contracts/api';
import { STRENGTH_LEVELS } from '../../../src/contracts/verdict';
import { findForbiddenForms } from '../../../src/render/metrics';
import { parseSseBlock } from '../api';
import { ConfidenceGauge } from './ConfidenceGauge';
import { ErrorDots } from './ErrorDots';
import { INITIAL_PROGRESS, describeProgress, reduceProgress, sourcesWord, type ProgressState } from './progress';
import { WaitingScale } from './WaitingScale';

afterEach(cleanup);

function play(events: VerifyProgressEvent[]): ProgressState {
	return events.reduce(reduceProgress, INITIAL_PROGRESS);
}

const judged = (publisher: string, stance: 'to_samo' | 'co_innego' | 'inna_data_lub_miejsce' | 'tlo'): VerifyProgressEvent => ({
	type: 'fragment_oceniony',
	claim: 0,
	publisher,
	publishedAt: '2026-01-02',
	stance,
});

describe('geometria wspólna', () => {
	it('wskazówka zawsze na środku jednej z trzech stref', () => {
		const zones = buildGaugeZones();
		expect(zones.map((zone) => zone.label)).toEqual(['mało', 'średnio', 'dużo']);
		for (const level of STRENGTH_LEVELS) {
			const zone = zones.find((item) => item.id === zoneForStrength(level))!;
			const needle = gaugeNeedle(zone.id);
			expect(needle.x1).toBe(120);
			expect(zone.needleAngle % 30).toBe(0);
		}
		expect(gaugeNeedle('średnio').x2).toBeCloseTo(120, 1);
	});

	it('matryca ma dokładnie total kropek i errors zaznaczonych', () => {
		const matrix = buildDotMatrix(2, 31)!;
		expect(matrix.cells).toHaveLength(31);
		expect(matrix.cells.filter((cell) => cell.marked)).toHaveLength(2);
		expect(buildDotMatrix(0, 5)!.cells.filter((cell) => cell.marked)).toHaveLength(0);
		expect(buildDotMatrix(3, 2)).toBeNull();
		expect(buildDotMatrix(1, 100000)).toBeNull();
	});

	it('przechył jest ograniczony', () => {
		expect(scaleTiltDegrees(0, 50)).toBeLessThanOrEqual(9);
		expect(scaleTiltDegrees(50, 0)).toBeGreaterThanOrEqual(-9);
		expect(scaleTiltDegrees(2, 2)).toBe(0);
	});
});

describe('postęp', () => {
	it('liczy źródła po polsku', () => {
		expect(sourcesWord(1)).toBe('1 źródło');
		expect(sourcesWord(2)).toBe('2 źródła');
		expect(sourcesWord(5)).toBe('5 źródeł');
		expect(sourcesWord(12)).toBe('12 źródeł');
		expect(sourcesWord(22)).toBe('22 źródła');
	});

	it('opisuje stan zdaniem bez żargonu', () => {
		const middle = play([
			{ type: 'zgloszenie_przeczytane', claims: 1 },
			{ type: 'fragmenty_za', claim: 0, count: 2 },
			judged('GIS', 'to_samo'),
			judged('Urząd', 'to_samo'),
			{ type: 'szukanie_przeciw_start', claim: 0 },
		]);
		expect(describeProgress(middle)).toBe('Znalazłem 2 źródła. Szukam jeszcze takich, które mówią co innego.');
		const finished = reduceProgress(middle, { type: 'szukanie_przeciw_koniec', claim: 0, count: 0 });
		expect(describeProgress(finished)).toContain('Mówią co innego: 0.');
		for (const state of [INITIAL_PROGRESS, middle, finished]) expect(findForbiddenForms(describeProgress(state))).toEqual([]);
	});

	it('parsuje blok SSE', () => {
		expect(parseSseBlock('event: progress\ndata: {"a":1}')).toEqual({ event: 'progress', data: '{"a":1}' });
		expect(parseSseBlock(': ping')).toBeNull();
	});
});

describe('WaitingScale', () => {
	it('puste szale: jeszcze nic nie znalazłem, potem nic nie znalazłem', () => {
		const { container, rerender } = render(<WaitingScale progress={INITIAL_PROGRESS} etaSeconds={12} elapsedSeconds={2} />);
		expect(screen.getByText('Sprawdzam. Zwykle trwa to około 12 sekund.')).toBeTruthy();
		expect(screen.getByText('Minęło: 2 s')).toBeTruthy();
		expect(container.textContent).toContain('Jeszcze nic nie znalazłem.');
		const done = play([
			{ type: 'zgloszenie_przeczytane', claims: 1 },
			{ type: 'fragmenty_za', claim: 0, count: 0 },
			{ type: 'szukanie_przeciw_koniec', claim: 0, count: 0 },
		]);
		rerender(<WaitingScale progress={done} etaSeconds={12} elapsedSeconds={3} />);
		expect(container.textContent).toContain('Nic nie znalazłem.');
	});

	it('odważniki trafiają na właściwe miejsca, tło i inna data osobno', () => {
		const progress = play([
			{ type: 'zgloszenie_przeczytane', claims: 1 },
			judged('GIS', 'to_samo'),
			judged('Portal', 'co_innego'),
			judged('Archiwum', 'inna_data_lub_miejsce'),
			judged('Blog', 'tlo'),
		]);
		const { container } = render(<WaitingScale progress={progress} elapsedSeconds={1} />);
		const box = (stance: string) => container.querySelector(`.waiting-scale__box--${stance}`)!.textContent;
		expect(box('to_samo')).toContain('GIS');
		expect(box('co_innego')).toContain('Portal');
		expect(box('inna_data_lub_miejsce')).toContain('Archiwum');
		expect(box('inna_data_lub_miejsce')).not.toContain('GIS');
		expect(box('tlo')).toContain('Blog');
		expect(container.querySelectorAll('.waiting-scale__pebble')).toHaveLength(2);
		expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
		expect(container.textContent).toContain('decydują reguły');
	});

	it('po przekroczeniu mediany pokazuje komunikat o dłuższym czasie', () => {
		render(<WaitingScale progress={INITIAL_PROGRESS} etaSeconds={10} elapsedSeconds={11} />);
		expect(screen.getByText('To trwa dłużej niż zwykle. Jeszcze chwila.')).toBeTruthy();
	});

	it('stan jest ogłaszany jako tekst w regionie aria-live', () => {
		const { container } = render(<WaitingScale progress={INITIAL_PROGRESS} elapsedSeconds={0} />);
		const live = [...container.querySelectorAll('[aria-live="polite"]')].map((node) => node.textContent);
		expect(live).toContain('Czytam Twoje zgłoszenie.');
	});
});

describe('ConfidenceGauge i ErrorDots', () => {
	it('pokazuje trzy strefy, słowo i przesłanki bez liczb', () => {
		const { container } = render(
			<ConfidenceGauge strength={{ level: 'srednia', reasons: ['zrodlo_urzedowe', 'jedno_zrodlo'] }} />,
		);
		const labels = [...container.querySelectorAll('.confidence__zone-label')].map((node) => node.textContent);
		expect(labels).toEqual(['mało', 'średnio', 'dużo']);
		expect(container.querySelectorAll('.confidence__zone--active')).toHaveLength(1);
		expect(container.querySelector('.confidence__word')?.textContent).toBe('Na ile to pewne: średnio');
		expect(screen.getByText('urzędowe źródło')).toBeTruthy();
		expect(screen.getByText('tylko jedno źródło')).toBeTruthy();
		expect(container.querySelector('svg')?.getAttribute('aria-label')).toContain('średnio');
		expect(container.textContent).not.toMatch(/\d/);
	});

	it('własna omylność: zdanie i 31 kropek z liczb rekordu', () => {
		const { container } = render(<ErrorDots profile={{ bucket: 'x', errors: 2, total: 31 }} />);
		expect(container.textContent).toContain('Mylik też się myli. Przy takiej podstawie pomyliłem się 2 razy na 31 sprawdzeń:');
		expect(container.querySelectorAll('circle.error-dots__ok')).toHaveLength(29);
		expect(container.querySelectorAll('path.error-dots__miss')).toHaveLength(2);
	});
});
