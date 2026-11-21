// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { buildDotMatrix, buildGaugeZones, gaugeNeedle, zoneForStrength } from '../../../src/card/visuals';
import type { VerifyProgressEvent } from '../../../src/contracts/api';
import { STRENGTH_LEVELS } from '../../../src/contracts/verdict';
import { findForbiddenForms } from '../../../src/render/metrics';
import { parseSseBlock } from '../api';
import { ConfidenceGauge } from './ConfidenceGauge';
import { ErrorDots } from './ErrorDots';
import { INITIAL_PROGRESS, describeProgress, progressSteps, reduceProgress, sourcesWord, type ProgressState } from './progress';
import { WaitingSteps } from './WaitingSteps';

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

describe('WaitingSteps', () => {
	it('pokazuje postać przy pracy, jedno zdanie o postępie i czas', () => {
		const { container, rerender } = render(<WaitingSteps progress={INITIAL_PROGRESS} etaSeconds={12} elapsedSeconds={2} role="pogodynka" />);
		expect(screen.getByText('Sprawdzam. Zwykle trwa to około 12 sekund.')).toBeTruthy();
		expect(screen.getByText('Minęło: 2 s')).toBeTruthy();
		expect(screen.getByText('Czytam Twoje zgłoszenie.')).toBeTruthy();
		expect(container.querySelector('ol')).toBeNull();
		expect(container.querySelector('.stage-slot--foreground')).not.toBeNull();
		const middle = play([
			{ type: 'zgloszenie_przeczytane', claims: 1 },
			{ type: 'fragmenty_za', claim: 0, count: 2 },
			judged('GIS', 'to_samo'),
		]);
		rerender(<WaitingSteps progress={middle} etaSeconds={12} elapsedSeconds={3} role="sport" />);
		expect(container.querySelector('.waiting-steps')?.getAttribute('data-role')).toBe('sport');
		expect(container.querySelector('[role="status"]')?.textContent).toBe(describeProgress(middle));
	});

	it('kroki w stanie postępu zostają dostępne jako dane', () => {
		const done = play([
			{ type: 'zgloszenie_przeczytane', claims: 1 },
			{ type: 'fragmenty_za', claim: 0, count: 0 },
			{ type: 'szukanie_przeciw_koniec', claim: 0, count: 0 },
		]);
		const steps = progressSteps(done);
		expect(steps.map((step) => step.status)).toEqual(['done', 'done', 'done', 'current']);
		expect(steps[1]!.text).toBe('Szukałem źródeł. Nic nie znalazłem');
		expect(progressSteps(play([{ type: 'zgloszenie_przeczytane', claims: 0 }]))).toHaveLength(1);
	});

	it('teksty postępu nie zawierają zakazanych form', () => {
		const states = [INITIAL_PROGRESS, play([{ type: 'zgloszenie_przeczytane', claims: 1 }, judged('GIS', 'to_samo')])];
		for (const state of states) {
			expect(findForbiddenForms(describeProgress(state))).toEqual([]);
			for (const step of progressSteps(state)) expect(findForbiddenForms(step.text)).toEqual([]);
		}
	});

	it('po przekroczeniu mediany pokazuje komunikat o dłuższym czasie', () => {
		render(<WaitingSteps progress={INITIAL_PROGRESS} etaSeconds={10} elapsedSeconds={11} />);
		expect(screen.getByText('To trwa dłużej niż zwykle. Jeszcze chwila.')).toBeTruthy();
	});

	it('stan jest ogłaszany jako tekst w regionie aria-live', () => {
		const { container } = render(<WaitingSteps progress={INITIAL_PROGRESS} elapsedSeconds={0} />);
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
