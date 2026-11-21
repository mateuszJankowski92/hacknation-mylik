import type { Notice } from '../../../src/contracts/record';
import {
	KNOWN_OP_DISCLAIMER,
	KNOWN_OP_INTRO,
	KNOWN_OP_LINK_TEXT,
	knownOpDescription,
	selectKnownOpWarnings,
} from '../../../src/render/warning';
import { nb } from '../typography';

export function KnownOpWarnings({ notices }: { notices: Notice[] }) {
	const warnings = selectKnownOpWarnings(notices);
	if (warnings.length === 0) return null;

	return (
		<section className="known-op" aria-label="Podobna wiadomość już się pojawiała">
			{warnings.map((warning, index) => (
				<div className="known-op__item" key={`${warning.url ?? warning.title ?? 'przypadek'}-${index}`}>
					<p className="known-op__intro">{nb(KNOWN_OP_INTRO)}</p>
					<p>{nb(knownOpDescription(warning))}</p>
					{warning.title && (
						<p className="known-op__title">
							<q lang="en">{warning.title}</q>
						</p>
					)}
					{warning.url && (
						<p>
							<a href={warning.url} target="_blank" rel="noopener noreferrer">
								{KNOWN_OP_LINK_TEXT} &gt;
							</a>
						</p>
					)}
					<p className="known-op__note">{nb(KNOWN_OP_DISCLAIMER)}</p>
				</div>
			))}
		</section>
	);
}
