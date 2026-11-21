import { VERDICT_LABELS_PL, type Verdict } from '../../../src/contracts/verdict';
import './record.css';

export function cardImagePath(id: string, claimNumber = 1): string {
	const base = `/api/records/${encodeURIComponent(id)}/card.svg`;
	return claimNumber > 1 ? `${base}?claim=${claimNumber}` : base;
}

export function RecordCardImage({
	id,
	claimNumber = 1,
	verdict,
}: {
	id: string;
	claimNumber?: number;
	verdict?: Verdict;
}) {
	const src = cardImagePath(id, claimNumber);
	const downloadHref = `${src}${src.includes('?') ? '&' : '?'}download=1`;
	const alt = verdict
		? `Karta do udostępnienia. Ocena: ${VERDICT_LABELS_PL[verdict]}.`
		: 'Karta do udostępnienia.';
	return (
		<section className="record-card record-claim__group-block" aria-label="Karta do udostępnienia">
			<h4>Karta do udostępnienia</h4>
			<img className="record-card__image" src={src} alt={alt} width={1200} height={630} loading="lazy" />
			<p>
				<a className="record-card__download" href={downloadHref} download={`mylik-${id.slice(0, 8)}.svg`}>
					Pobierz kartę (obraz SVG)
				</a>
			</p>
		</section>
	);
}
