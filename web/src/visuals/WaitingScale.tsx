import { useEffect, useState } from 'react';
import type { ProgressStance } from '../../../src/contracts/api';
import {
	SCALE_ARM,
	SCALE_PIVOT,
	SCALE_STRING,
	SCALE_VIEWBOX,
	STANCE_SHAPES,
	panOffsetY,
	pebblePlacements,
	scaleTiltDegrees,
	shapePath,
	SCALE_MAX_VISIBLE_PEBBLES,
} from '../../../src/card/visuals';
import {
	INITIAL_PROGRESS,
	againstSearchFinished,
	describeProgress,
	forSearchFinished,
	pebblesFor,
	type Pebble,
	type ProgressState,
} from './progress';
import { DEFAULT_ETA_SECONDS } from '../api';
import './visuals.css';

const PEBBLE_SIZE = 16;
const PUBLISHER_MAX_CHARS = 28;

export const WAITING_TEXTS = {
	leftTitle: 'Mówią to samo',
	rightTitle: 'Mówią co innego',
	otherTitle: 'Inna data lub miejsce',
	backgroundTitle: 'Tylko tło',
	emptyWaiting: 'Jeszcze nic nie znalazłem.',
	emptyDone: 'Nic nie znalazłem.',
	emptyBox: 'Na razie nic.',
	overtime: 'To trwa dłużej niż zwykle. Jeszcze chwila.',
	note: 'Przechył pokazuje tylko to, co znalazłem. O ocenie decydują reguły, a nie liczba źródeł.',
} as const;

export function etaSentence(etaSeconds: number): string {
	return `Sprawdzam. Zwykle trwa to około ${etaSeconds} sekund.`;
}

function shortPublisher(name: string): string {
	const clean = name.replace(/\s+/gu, ' ').trim() || 'Źródło';
	return clean.length <= PUBLISHER_MAX_CHARS ? clean : `${clean.slice(0, PUBLISHER_MAX_CHARS - 1).trimEnd()}…`;
}

function useElapsedSeconds(): number {
	const [seconds, setSeconds] = useState(0);
	useEffect(() => {
		const startedAt = Date.now();
		const timer = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
		return () => clearInterval(timer);
	}, []);
	return seconds;
}

function PebbleShapeMark({ stance, x, y }: { stance: ProgressStance; x: number; y: number }) {
	return (
		<path
			className={`waiting-scale__pebble waiting-scale__pebble--${stance}`}
			d={shapePath(STANCE_SHAPES[stance], PEBBLE_SIZE)}
			transform={`translate(${x} ${y})`}
		/>
	);
}

interface PanProps {
	side: 'left' | 'right';
	pebbles: Pebble[];
	stance: ProgressStance;
	offsetY: number;
	caption: string;
	emptyLines: [string, string] | null;
}

function Pan({ side, pebbles, stance, offsetY, caption, emptyLines }: PanProps) {
	const x = side === 'left' ? SCALE_PIVOT.x - SCALE_ARM : SCALE_PIVOT.x + SCALE_ARM;
	const bowlY = SCALE_PIVOT.y + SCALE_STRING;
	const placements = pebblePlacements(pebbles.length);
	const hidden = pebbles.length - Math.min(pebbles.length, SCALE_MAX_VISIBLE_PEBBLES);
	return (
		<g className="waiting-scale__pan" style={{ transform: `translateY(${offsetY}px)` }}>
			<line className="waiting-scale__string" x1={x} y1={SCALE_PIVOT.y} x2={x - 40} y2={bowlY} />
			<line className="waiting-scale__string" x1={x} y1={SCALE_PIVOT.y} x2={x + 40} y2={bowlY} />
			{placements.map((place, index) => (
				<PebbleShapeMark key={pebbles[index]!.id} stance={stance} x={x + place.x} y={bowlY + place.y} />
			))}
			{hidden > 0 && (
				<text className="waiting-scale__more" x={x} y={bowlY + 15} textAnchor="middle">
					{`+${hidden}`}
				</text>
			)}
			{emptyLines && (
				<text className="waiting-scale__empty" x={x} y={bowlY - 22} textAnchor="middle">
					<tspan x={x}>{emptyLines[0]}</tspan>
					<tspan x={x} dy="15">
						{emptyLines[1]}
					</tspan>
				</text>
			)}
			<path className="waiting-scale__bowl" d={`M ${x - 44} ${bowlY} Q ${x} ${bowlY + 26} ${x + 44} ${bowlY} Z`} />
			<text className="waiting-scale__caption" x={x} y={bowlY + 44} textAnchor="middle">
				{caption}
			</text>
		</g>
	);
}

function PebbleList({ title, glyph, pebbles, stance, emptyText }: {
	title: string;
	glyph: string;
	pebbles: Pebble[];
	stance: ProgressStance;
	emptyText: string;
}) {
	return (
		<div className={`waiting-scale__box waiting-scale__box--${stance}`}>
			<h4 className="waiting-scale__box-title">
				<span aria-hidden="true">{glyph} </span>
				{title}
				{pebbles.length > 0 && <span className="waiting-scale__count">: {pebbles.length}</span>}
			</h4>
			{pebbles.length === 0 ? (
				<p className="waiting-scale__box-empty">{emptyText}</p>
			) : (
				<ul className="waiting-scale__names">
					{pebbles.map((pebble) => (
						<li key={pebble.id}>{shortPublisher(pebble.publisher)}</li>
					))}
				</ul>
			)}
		</div>
	);
}

export interface WaitingScaleProps {
	progress?: ProgressState;
	etaSeconds?: number;
	elapsedSeconds?: number;
}

export function WaitingScale({ progress = INITIAL_PROGRESS, etaSeconds = DEFAULT_ETA_SECONDS, elapsedSeconds }: WaitingScaleProps) {
	const clock = useElapsedSeconds();
	const elapsed = elapsedSeconds ?? clock;
	const same = pebblesFor(progress, 'to_samo');
	const other = pebblesFor(progress, 'co_innego');
	const elsewhere = pebblesFor(progress, 'inna_data_lub_miejsce');
	const background = pebblesFor(progress, 'tlo');
	const tilt = scaleTiltDegrees(same.length, other.length);
	const overtime = elapsed > etaSeconds;
	const leftEmpty = same.length === 0 ? (forSearchFinished(progress) ? 'done' : 'waiting') : null;
	const rightEmpty = other.length === 0 ? (againstSearchFinished(progress) ? 'done' : 'waiting') : null;
	const emptyLines = (kind: 'done' | 'waiting' | null): [string, string] | null => {
		if (kind === null) return null;
		return kind === 'done' ? ['nic nie', 'znalazłem'] : ['jeszcze nic', 'nie znalazłem'];
	};
	const emptyText = (kind: 'done' | 'waiting' | null) =>
		kind === 'done' ? WAITING_TEXTS.emptyDone : WAITING_TEXTS.emptyWaiting;

	return (
		<section className="waiting-scale" aria-label="Postęp sprawdzania">
			<p className="waiting-scale__eta" role="status" aria-live="polite">
				{overtime ? WAITING_TEXTS.overtime : etaSentence(etaSeconds)}
			</p>
			<p className="waiting-scale__elapsed">Minęło: {elapsed} s</p>

			<svg
				className="waiting-scale__picture"
				viewBox={`0 0 ${SCALE_VIEWBOX.width} ${SCALE_VIEWBOX.height}`}
				aria-hidden="true"
				focusable="false"
			>
				<line className="waiting-scale__stand" x1={SCALE_PIVOT.x} y1={SCALE_PIVOT.y} x2={SCALE_PIVOT.x} y2={SCALE_VIEWBOX.height - 14} />
				<line className="waiting-scale__foot" x1={SCALE_PIVOT.x - 40} y1={SCALE_VIEWBOX.height - 12} x2={SCALE_PIVOT.x + 40} y2={SCALE_VIEWBOX.height - 12} />
				<g
					className="waiting-scale__beam"
					style={{ transform: `rotate(${tilt}deg)`, transformOrigin: `${SCALE_PIVOT.x}px ${SCALE_PIVOT.y}px` }}
				>
					<line x1={SCALE_PIVOT.x - SCALE_ARM} y1={SCALE_PIVOT.y} x2={SCALE_PIVOT.x + SCALE_ARM} y2={SCALE_PIVOT.y} />
				</g>
				<circle className="waiting-scale__pivot" cx={SCALE_PIVOT.x} cy={SCALE_PIVOT.y} r="6" />
				<Pan
					side="left"
					pebbles={same}
					stance="to_samo"
					offsetY={panOffsetY(tilt, 'left')}
					caption="mówią to samo"
					emptyLines={emptyLines(leftEmpty)}
				/>
				<Pan
					side="right"
					pebbles={other}
					stance="co_innego"
					offsetY={panOffsetY(tilt, 'right')}
					caption="mówią co innego"
					emptyLines={emptyLines(rightEmpty)}
				/>
			</svg>

			<p className="waiting-scale__status" role="status" aria-live="polite">
				{describeProgress(progress)}
			</p>
			<p className="waiting-scale__note">{WAITING_TEXTS.note}</p>

			<div className="waiting-scale__boxes">
				<PebbleList title={WAITING_TEXTS.leftTitle} glyph="●" pebbles={same} stance="to_samo" emptyText={emptyText(leftEmpty)} />
				<PebbleList title={WAITING_TEXTS.rightTitle} glyph="■" pebbles={other} stance="co_innego" emptyText={emptyText(rightEmpty)} />
				<PebbleList title={WAITING_TEXTS.otherTitle} glyph="◆" pebbles={elsewhere} stance="inna_data_lub_miejsce" emptyText={WAITING_TEXTS.emptyBox} />
				<PebbleList title={WAITING_TEXTS.backgroundTitle} glyph="▲" pebbles={background} stance="tlo" emptyText={WAITING_TEXTS.emptyBox} />
			</div>
		</section>
	);
}
