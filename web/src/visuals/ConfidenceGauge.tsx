import { useId } from 'react';
import {
	GAUGE_CENTER_POINT,
	GAUGE_VIEWBOX,
	buildGaugeZones,
	gaugeNeedle,
	zoneForStrength,
} from '../../../src/card/visuals';
import type { Strength } from '../../../src/contracts/record';
import { REASON_PLAIN_PL, STRENGTH_PLAIN_PL, STRENGTH_TITLE_PL } from '../../../src/render/plain';
import './visuals.css';

export function ConfidenceGauge({ strength }: { strength: Strength }) {
	const titleId = useId();
	const zone = zoneForStrength(strength.level);
	const word = STRENGTH_PLAIN_PL[strength.level];
	const needle = gaugeNeedle(zone);
	const description = `${STRENGTH_TITLE_PL}: ${word}. Wskaźnik ma trzy strefy: mało, średnio, dużo.`;

	return (
		<section className="confidence" aria-labelledby={titleId}>
			<svg
				className="confidence__picture"
				viewBox={`0 0 ${GAUGE_VIEWBOX.width} ${GAUGE_VIEWBOX.height}`}
				role="img"
				aria-label={description}
			>
				{buildGaugeZones().map((item) => {
					const active = item.id === zone;
					return (
						<g key={item.id}>
							<path className={active ? 'confidence__zone confidence__zone--active' : 'confidence__zone'} d={item.path} />
							<text
								className={active ? 'confidence__zone-label confidence__zone-label--active' : 'confidence__zone-label'}
								x={item.labelX}
								y={item.labelY}
							>
								{item.label}
							</text>
						</g>
					);
				})}
				<line className="confidence__needle" x1={needle.x1} y1={needle.y1} x2={needle.x2} y2={needle.y2} />
				<circle className="confidence__hub" cx={GAUGE_CENTER_POINT.x} cy={GAUGE_CENTER_POINT.y} r="8" />
			</svg>
			<div className="confidence__text">
				<h4 id={titleId} className="confidence__word">
					{STRENGTH_TITLE_PL}: <strong>{word}</strong>
				</h4>
				{strength.reasons.length > 0 && (
					<>
						<p className="confidence__why-title">Dlaczego:</p>
						<ul className="confidence__why">
							{strength.reasons.map((reason) => (
								<li key={reason}>{REASON_PLAIN_PL[reason]}</li>
							))}
						</ul>
					</>
				)}
			</div>
		</section>
	);
}
