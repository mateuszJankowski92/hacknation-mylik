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
import { INITIAL_PROGRESS, reduceProgress, sourcesWord, type ProgressState, type WaitingEvent } from './progress';
import { WaitingSteps } from './WaitingSteps';
import { waitingLines } from './waitingLines';

afterEach(cleanup);

function play(events: WaitingEvent[]): ProgressState {
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

	it('buduje kroki z danych zdarzeń, bez żargonu i bez zakazanych form', () => {
		const middle = play([
			{ type: 'zgloszenie_przeczytane', claims: 1 },
			{ type: 'fragmenty_za', claim: 0, count: 2 },
			{ type: 'szukanie_przeciw_start', claim: 0 },
			{ type: 'szukanie_przeciw_koniec', claim: 0, count: 1 },
		]);
		expect(waitingLines(middle).map((line) => line.text)).toEqual([
			'Przeczytałem zgłoszenie.',
			'Znalazłem 3 fragmenty do sprawdzenia.',
			'Sprawdzam cytaty…',
		]);
		const judgedState = reduceProgress(middle, judged('GIS', 'to_samo'));
		const texts = waitingLines(judgedState).map((line) => line.text);
		expect(texts.at(-1)).toBe('Sprawdziłem cytaty: 1 przeszedł kontrolę.');
		for (const state of [INITIAL_PROGRESS, middle, judgedState]) {
			for (const line of waitingLines(state)) expect(findForbiddenForms(line.text)).toEqual([]);
		}
	});

	it('parsuje blok SSE', () => {
		expect(parseSseBlock('event: progress\ndata: {"a":1}')).toEqual({ event: 'progress', data: '{"a":1}' });
		expect(parseSseBlock(': ping')).toBeNull();
	});
});

describe('WaitingSteps', () => {
	it('pokazuje scenę, kroki i Anuluj, bez licznika czasu i zapowiedzi', () => {
		const middle = play([
			{ type: 'zgloszenie_przeczytane', claims: 1 },
			{ type: 'fragmenty_za', claim: 0, count: 2 },
		]);
		const { container } = render(<WaitingSteps progress={middle} role="sport" onCancel={() => undefined} />);
		expect(container.querySelector('.waiting-steps')?.getAttribute('data-role')).toBe('sport');
		expect(container.querySelector('.stage-slot--foreground')).not.toBeNull();
		expect(container.querySelectorAll('li')).toHaveLength(2);
		expect(screen.getByRole('button', { name: 'Anuluj' })).toBeTruthy();
		expect(container.textContent).not.toMatch(/Minęło|Zwykle trwa|dłużej niż zwykle/);
	});

	it('bez zdarzeń nie wymyśla kroków: tylko ukryty komunikat dla czytnika', () => {
		const { container } = render(<WaitingSteps progress={INITIAL_PROGRESS} />);
		expect(container.querySelectorAll('li')).toHaveLength(0);
		expect(container.querySelector('[role="status"][aria-live="polite"]')?.textContent).toBe('Sprawdzam…');
	});

	it('po gotowości pokazuje "Wynik gotowy." w regionie aria-live i chowa Anuluj', () => {
		const { container } = render(<WaitingSteps progress={INITIAL_PROGRESS} ready onCancel={() => undefined} />);
		expect(container.querySelector('[role="status"][aria-live="polite"]')?.textContent).toContain('Wynik gotowy.');
		expect(screen.queryByRole('button', { name: 'Anuluj' })).toBeNull();
	});

	it('nie pokazuje więcej niż 5 linii', () => {
		const many = play([
			{ type: 'zgloszenie_przeczytane', claims: 1 },
			{ type: 'fragmenty_za', claim: 0, count: 2 },
			{ type: 'szukanie_przeciw_koniec', claim: 0, count: 1 },
			judged('GIS', 'to_samo'),
			{ type: 'druga_kontrola', agreed: 1, total: 1 },
		]);
		expect(waitingLines(many).length).toBeLessThanOrEqual(5);
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
