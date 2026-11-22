import type { Strength } from '../../../src/contracts/record';
import { REASON_PLAIN_PL } from '../../../src/render/plain';
import './visuals.css';

export function ConfidenceReasons({ strength }: { strength: Strength }) {
	if (strength.reasons.length === 0) return null;
	return (
		<div className="confidence-reasons">
			<p className="confidence__why-title">Dlaczego:</p>
			<ul className="confidence__why">
				{strength.reasons.map((reason) => (
					<li key={reason}>{REASON_PLAIN_PL[reason]}</li>
				))}
			</ul>
		</div>
	);
}
