import { useState } from 'react';
import { nb } from '../typography';
import {
	EXAMPLES_LABEL,
	EXAMPLES_REGION_LABEL,
	EXAMPLES_SHUFFLE_LABEL,
	pickExamples,
	type ExampleQuery,
} from './exampleSubmissions';
import './examples.css';

interface ExampleQueriesProps {
	onPick: (example: ExampleQuery) => void;
	examples?: readonly ExampleQuery[];
}

export function ExampleQueries({ onPick, examples }: ExampleQueriesProps) {
	const [drawn, setDrawn] = useState<readonly ExampleQuery[]>(() => examples ?? pickExamples());
	const shown = examples ?? drawn;
	if (shown.length === 0) return null;

	function drawAgain() {
		setDrawn((current) => pickExamples(undefined, Math.random, current.map((example) => example.id)));
	}

	return (
		<section className="examples" aria-label={EXAMPLES_REGION_LABEL}>
			<div className="examples__head">
				<p className="examples__label" aria-hidden="true">
					{EXAMPLES_LABEL}
				</p>
				{!examples && (
					<button type="button" className="text-button examples__shuffle" onClick={drawAgain}>
						{EXAMPLES_SHUFFLE_LABEL}
					</button>
				)}
			</div>
			<ul className="examples__list">
				{shown.map((example) => (
					<li key={example.id} className="examples__item">
						<button type="button" className="examples__note" data-example={example.id} onClick={() => onPick(example)}>
							{nb(example.label)}
						</button>
					</li>
				))}
			</ul>
		</section>
	);
}
