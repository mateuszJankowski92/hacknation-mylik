import type { ClaimResult, EvidenceItem } from '../../../src/contracts/record';
import { STANCE_LABELS_PL, VERDICT_LABELS_PL, type Verdict } from '../../../src/contracts/verdict';
import {
	REASON_PLAIN_PL,
	STRENGTH_PLAIN_PL,
	STRENGTH_TITLE_PL,
	VERDICT_EXPLANATIONS_PL,
} from '../../../src/render/plain';
import { SOURCE_TYPE_LABELS_PL } from '../../../src/contracts/source';
import { formatDate } from '../format';

const VERDICT_PRESENTATION: Record<Verdict, { icon: string; tone: string }> = {
	potwierdzone: { icon: '✔', tone: 'ok' },
	falszywe: { icon: '✘', tone: 'danger' },
	wprowadzajace_w_blad: { icon: '▲', tone: 'warn' },
	brak_wystarczajacych_dowodow: { icon: '?', tone: 'info' },
	nie_podlega_weryfikacji: { icon: '○', tone: 'neutral' },
};

const ABSTAIN_SUGGESTION =
	'Nie bierz tego za potwierdzenie ani za zaprzeczenie. Sprawdź informację w oficjalnym źródle, na przykład na stronie właściwego urzędu.';

function EvidenceBlock({ item }: { item: EvidenceItem }) {
	const { source } = item;
	return (
		<li className="evidence">
			{item.archival && (
				<p className="evidence__archival" role="note">
					<span aria-hidden="true">⚠ </span>
					<strong>Uwaga, materiał archiwalny.</strong> To stare źródło. Sprawdź, czy informacja
					nadal się zgadza.
				</p>
			)}
			<p className="evidence__stance">
				Co mówi to źródło o twierdzeniu: <strong>{STANCE_LABELS_PL[item.stance]}</strong>
			</p>
			<blockquote className="evidence__quote">
				<p>{item.quote}</p>
				<footer>
					<cite>{source.title}</cite>, {source.publisher}
					{source.publishedAt && (
						<>
							, opublikowano <time dateTime={source.publishedAt}>{formatDate(source.publishedAt)}</time>
						</>
					)}
				</footer>
			</blockquote>
			<dl className="evidence__meta">
				<div>
					<dt>Rodzaj źródła</dt>
					<dd>{SOURCE_TYPE_LABELS_PL[source.sourceType]}</dd>
				</div>
				<div>
					<dt>Data publikacji</dt>
					<dd>{formatDate(source.publishedAt)}</dd>
				</div>
				<div>
					<dt>Data pobrania</dt>
					<dd>
						<time dateTime={source.fetchedAt}>{formatDate(source.fetchedAt)}</time>
					</dd>
				</div>
			</dl>
			<p>
				<a href={source.url} target="_blank" rel="noopener noreferrer">
					Otwórz źródło: {source.title}
					<span className="visually-hidden"> (otworzy się w nowej karcie)</span>
				</a>
			</p>
		</li>
	);
}

export function ClaimCard({ result }: { result: ClaimResult }) {
	const presentation = VERDICT_PRESENTATION[result.verdict];
	const isAbstain = result.verdict === 'brak_wystarczajacych_dowodow';
	const headingId = `claim-${result.claim.id}`;
	const limitations = [...result.limitations];
	if (result.abstainReason) limitations.unshift(result.abstainReason);

	return (
		<article className="claim-card" aria-labelledby={headingId}>
			<h3 id={headingId} className="claim-card__claim">
				<span className="claim-card__label">Sprawdzane twierdzenie</span>
				<q>{result.claim.text}</q>
			</h3>

			<div className={`verdict verdict--${presentation.tone}`}>
				<p className="verdict__label">
					<span className="verdict__icon" aria-hidden="true">
						{presentation.icon}
					</span>
					<span className="visually-hidden">Ocena: </span>
					<strong>{VERDICT_LABELS_PL[result.verdict]}</strong>
				</p>
				<p className={isAbstain ? 'verdict__explanation verdict__abstain' : 'verdict__explanation'}>
					{VERDICT_EXPLANATIONS_PL[result.verdict]}
				</p>
			</div>

			<p className="claim-card__strength">
				{STRENGTH_TITLE_PL}: <strong>{STRENGTH_PLAIN_PL[result.strength.level]}</strong>
			</p>
			{result.strength.reasons.length > 0 && (
				<ul className="claim-card__reasons">
					{result.strength.reasons.map((reason) => (
						<li key={reason}>{REASON_PLAIN_PL[reason]}</li>
					))}
				</ul>
			)}

			<section aria-label="Uzasadnienie">
				<h4>Dlaczego taka ocena</h4>
				<p>{result.explanation}</p>
			</section>

			{result.evidence.length > 0 && (
				<section aria-label="Źródła">
					<h4>Źródła</h4>
					<ul className="evidence-list">
						{result.evidence.map((item) => (
							<EvidenceBlock key={`${item.passageId}-${item.quote}`} item={item} />
						))}
					</ul>
				</section>
			)}

			{(limitations.length > 0 || isAbstain) && (
				<section aria-label="Czego nie udało się ustalić" className="claim-card__limits">
					<h4>Czego nie udało się ustalić</h4>
					{limitations.length > 0 && (
						<ul>
							{limitations.map((text) => (
								<li key={text}>{text}</li>
							))}
						</ul>
					)}
					{isAbstain && <p>{ABSTAIN_SUGGESTION}</p>}
				</section>
			)}
		</article>
	);
}
