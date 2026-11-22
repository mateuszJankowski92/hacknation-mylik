import { nb } from '../typography';
import { EXAMPLES_LABEL, EXAMPLES_REGION_LABEL, EXAMPLE_QUERIES, type ExampleQuery } from './exampleSubmissions';
import './examples.css';

interface ExampleQueriesProps {
	onPick: (example: ExampleQuery) => void;
	examples?: readonly ExampleQuery[];
}

export function ExampleQueries({ onPick, examples = EXAMPLE_QUERIES }: ExampleQueriesProps) {
	if (examples.length === 0) return null;
	return (
		<section className="examples" aria-label={EXAMPLES_REGION_LABEL}>
			<p className="examples__label" aria-hidden="true">
				{EXAMPLES_LABEL}
			</p>
			<ul className="examples__list">
				{examples.map((example) => (
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
