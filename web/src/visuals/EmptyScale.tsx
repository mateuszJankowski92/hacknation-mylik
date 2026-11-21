import { SCALE_ARM, SCALE_PIVOT, SCALE_STRING, SCALE_VIEWBOX } from '../../../src/card/visuals';
import './visuals.css';

export const EMPTY_SCALE_TITLE = 'Na ile to pewne';
export const EMPTY_SCALE_HEADING = 'tego nie da się ocenić';

export function EmptyScale({ sentence }: { sentence: string }) {
	const bowlY = SCALE_PIVOT.y + SCALE_STRING;
	const leftX = SCALE_PIVOT.x - SCALE_ARM;
	const rightX = SCALE_PIVOT.x + SCALE_ARM;
	const description = `${EMPTY_SCALE_TITLE}: ${EMPTY_SCALE_HEADING}. Waga jest pusta. ${sentence}`;

	return (
		<section className="confidence confidence--empty" aria-label={`${EMPTY_SCALE_TITLE}: ${EMPTY_SCALE_HEADING}`}>
			<svg
				className="confidence__picture confidence__picture--scale"
				viewBox={`0 0 ${SCALE_VIEWBOX.width} ${SCALE_VIEWBOX.height}`}
				role="img"
				aria-label={description}
			>
				<line className="waiting-scale__stand" x1={SCALE_PIVOT.x} y1={SCALE_PIVOT.y} x2={SCALE_PIVOT.x} y2={SCALE_VIEWBOX.height - 14} />
				<line className="waiting-scale__foot" x1={SCALE_PIVOT.x - 40} y1={SCALE_VIEWBOX.height - 12} x2={SCALE_PIVOT.x + 40} y2={SCALE_VIEWBOX.height - 12} />
				<g className="waiting-scale__beam">
					<line x1={leftX} y1={SCALE_PIVOT.y} x2={rightX} y2={SCALE_PIVOT.y} />
				</g>
				<circle className="waiting-scale__pivot" cx={SCALE_PIVOT.x} cy={SCALE_PIVOT.y} r="6" />
				{[leftX, rightX].map((x) => (
					<g key={x}>
						<line className="waiting-scale__string" x1={x} y1={SCALE_PIVOT.y} x2={x - 40} y2={bowlY} />
						<line className="waiting-scale__string" x1={x} y1={SCALE_PIVOT.y} x2={x + 40} y2={bowlY} />
						<path className="waiting-scale__bowl" d={`M ${x - 44} ${bowlY} Q ${x} ${bowlY + 26} ${x + 44} ${bowlY} Z`} />
					</g>
				))}
				<text className="waiting-scale__caption" x={leftX} y={bowlY + 44} textAnchor="middle">
					mówią to samo
				</text>
				<text className="waiting-scale__caption" x={rightX} y={bowlY + 44} textAnchor="middle">
					mówią co innego
				</text>
			</svg>
			<div className="confidence__text">
				<h4 className="confidence__word">
					{EMPTY_SCALE_TITLE}: <strong>{EMPTY_SCALE_HEADING}</strong>
				</h4>
				<p className="confidence__empty-sentence">{sentence}</p>
			</div>
		</section>
	);
}
