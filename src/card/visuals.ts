import type { ProgressStance } from '../contracts/api';
import type { StrengthLevel } from '../contracts/verdict';

export type GaugeZoneId = 'mało' | 'średnio' | 'dużo';

export interface GaugeZone {
	id: GaugeZoneId;
	label: string;
	path: string;
	labelX: number;
	labelY: number;
	needleAngle: number;
}

export const GAUGE_VIEWBOX = { width: 240, height: 128 } as const;

const GAUGE_CENTER = { x: 120, y: 100 };
const GAUGE_RADIUS = 78;
const GAUGE_LABEL_RADIUS = 104;
const GAUGE_NEEDLE_LENGTH = 62;
const ZONE_GAP_DEGREES = 3;
const ZONE_IDS: GaugeZoneId[] = ['mało', 'średnio', 'dużo'];

const STRENGTH_TO_ZONE: Record<StrengthLevel, GaugeZoneId> = {
	brak: 'mało',
	niska: 'mało',
	srednia: 'średnio',
	wysoka: 'dużo',
};

export function zoneForStrength(level: StrengthLevel): GaugeZoneId {
	return STRENGTH_TO_ZONE[level];
}

function round(value: number): number {
	return Math.round(value * 100) / 100;
}

function pointOnArc(angleFromLeft: number, radius: number): { x: number; y: number } {
	const radians = (Math.PI * (180 - angleFromLeft)) / 180;
	return {
		x: round(GAUGE_CENTER.x + radius * Math.cos(radians)),
		y: round(GAUGE_CENTER.y - radius * Math.sin(radians)),
	};
}

export function buildGaugeZones(): GaugeZone[] {
	return ZONE_IDS.map((id, index) => {
		const start = index * 60 + ZONE_GAP_DEGREES;
		const end = (index + 1) * 60 - ZONE_GAP_DEGREES;
		const from = pointOnArc(start, GAUGE_RADIUS);
		const to = pointOnArc(end, GAUGE_RADIUS);
		const middle = index * 60 + 30;
		const labelPoint = pointOnArc(middle, GAUGE_LABEL_RADIUS);
		return {
			id,
			label: id,
			path: `M ${from.x} ${from.y} A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 0 1 ${to.x} ${to.y}`,
			labelX: labelPoint.x,
			labelY: labelPoint.y,
			needleAngle: middle,
		};
	});
}

export function gaugeNeedle(zone: GaugeZoneId): { x1: number; y1: number; x2: number; y2: number } {
	const angle = ZONE_IDS.indexOf(zone) * 60 + 30;
	const tip = pointOnArc(angle, GAUGE_NEEDLE_LENGTH);
	return { x1: GAUGE_CENTER.x, y1: GAUGE_CENTER.y, x2: tip.x, y2: tip.y };
}

export const GAUGE_CENTER_POINT = GAUGE_CENTER;
export const GAUGE_ARC_STROKE = 16;

export interface GaugeColors {
	ink: string;
	muted: string;
	active: string;
}

function escapeText(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderGaugeMarkup(zone: GaugeZoneId, colors: GaugeColors, fontSize = 18): string {
	const parts: string[] = [];
	for (const item of buildGaugeZones()) {
		const isActive = item.id === zone;
		parts.push(
			`<path d="${item.path}" fill="none" stroke="${isActive ? colors.active : colors.muted}" stroke-width="${isActive ? GAUGE_ARC_STROKE + 6 : GAUGE_ARC_STROKE}" stroke-linecap="butt"${isActive ? '' : ' stroke-opacity="0.45"'}/>`,
		);
		parts.push(
			`<text x="${item.labelX}" y="${item.labelY}" font-size="${fontSize}" text-anchor="middle" fill="${colors.ink}"${isActive ? ' font-weight="700"' : ''}>${escapeText(item.label)}</text>`,
		);
	}
	const needle = gaugeNeedle(zone);
	parts.push(
		`<line x1="${needle.x1}" y1="${needle.y1}" x2="${needle.x2}" y2="${needle.y2}" stroke="${colors.ink}" stroke-width="5" stroke-linecap="round"/>`,
		`<circle cx="${GAUGE_CENTER.x}" cy="${GAUGE_CENTER.y}" r="8" fill="${colors.ink}"/>`,
	);
	return parts.join('');
}

export interface DotCell {
	x: number;
	y: number;
	marked: boolean;
}

export interface DotMatrix {
	cells: DotCell[];
	width: number;
	height: number;
	columns: number;
	pitch: number;
}

export const DOT_MATRIX_LIMIT = 120;
const DOT_PITCH = 22;

export function buildDotMatrix(errors: number, total: number): DotMatrix | null {
	if (!Number.isInteger(total) || !Number.isInteger(errors)) return null;
	if (total <= 0 || total > DOT_MATRIX_LIMIT || errors < 0 || errors > total) return null;
	const columns = total <= 10 ? total : Math.min(10, Math.ceil(Math.sqrt(total * 2)));
	const rows = Math.ceil(total / columns);
	const cells: DotCell[] = [];
	const markedStep = errors > 0 ? total / errors : 0;
	const markedIndexes = new Set<number>();
	for (let index = 0; index < errors; index += 1) markedIndexes.add(Math.min(total - 1, Math.floor(index * markedStep)));
	for (let index = 0; index < total; index += 1) {
		cells.push({
			x: (index % columns) * DOT_PITCH + DOT_PITCH / 2,
			y: Math.floor(index / columns) * DOT_PITCH + DOT_PITCH / 2,
			marked: markedIndexes.has(index),
		});
	}
	return { cells, width: columns * DOT_PITCH, height: rows * DOT_PITCH, columns, pitch: DOT_PITCH };
}

export const SCALE_VIEWBOX = { width: 320, height: 210 } as const;
export const SCALE_PIVOT = { x: 160, y: 46 } as const;
export const SCALE_ARM = 104;
export const SCALE_STRING = 54;
export const SCALE_MAX_TILT_DEGREES = 9;
export const SCALE_TILT_PER_SOURCE = 3;
export const SCALE_MAX_VISIBLE_PEBBLES = 8;

export function scaleTiltDegrees(leftCount: number, rightCount: number): number {
	const raw = (rightCount - leftCount) * SCALE_TILT_PER_SOURCE;
	return Math.max(-SCALE_MAX_TILT_DEGREES, Math.min(SCALE_MAX_TILT_DEGREES, raw));
}

export function panOffsetY(tiltDegrees: number, side: 'left' | 'right'): number {
	const sign = side === 'right' ? 1 : -1;
	return round(sign * SCALE_ARM * Math.sin((tiltDegrees * Math.PI) / 180));
}

export interface PebblePlacement {
	x: number;
	y: number;
}

export function pebblePlacements(count: number): PebblePlacement[] {
	const visible = Math.min(count, SCALE_MAX_VISIBLE_PEBBLES);
	const placements: PebblePlacement[] = [];
	for (let index = 0; index < visible; index += 1) {
		const column = index % 4;
		const row = Math.floor(index / 4);
		placements.push({ x: (column - 1.5) * 22, y: -12 - row * 22 });
	}
	return placements;
}

export type PebbleShape = 'circle' | 'square' | 'diamond' | 'triangle';

export const STANCE_SHAPES: Record<ProgressStance, PebbleShape> = {
	to_samo: 'circle',
	co_innego: 'square',
	inna_data_lub_miejsce: 'diamond',
	tlo: 'triangle',
};

export function shapePath(shape: PebbleShape, size: number): string {
	const half = size / 2;
	switch (shape) {
		case 'circle':
			return `M ${-half} 0 A ${half} ${half} 0 1 0 ${half} 0 A ${half} ${half} 0 1 0 ${-half} 0 Z`;
		case 'square':
			return `M ${-half} ${-half} H ${half} V ${half} H ${-half} Z`;
		case 'diamond':
			return `M 0 ${-half - 1} L ${half + 1} 0 L 0 ${half + 1} L ${-half - 1} 0 Z`;
		case 'triangle':
			return `M 0 ${-half - 1} L ${half + 1} ${half} L ${-half - 1} ${half} Z`;
	}
}
