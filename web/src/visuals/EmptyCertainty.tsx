import './visuals.css';

export const EMPTY_CERTAINTY_TITLE = 'Na ile to pewne';
export const EMPTY_CERTAINTY_HEADING = 'tego nie da się ocenić';

export function EmptyCertainty({ sentence }: { sentence: string }) {
	return (
		<section className="confidence confidence--empty" aria-label={`${EMPTY_CERTAINTY_TITLE}: ${EMPTY_CERTAINTY_HEADING}`}>
			<div className="confidence__text">
				<h4 className="confidence__word">
					{EMPTY_CERTAINTY_TITLE}: <strong>{EMPTY_CERTAINTY_HEADING}</strong>
				</h4>
				<p className="confidence__empty-sentence">{sentence}</p>
			</div>
		</section>
	);
}
