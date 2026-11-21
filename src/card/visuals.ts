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
