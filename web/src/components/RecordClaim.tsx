import { useRef, type ReactNode } from 'react';
import type { ClaimResult, EvidenceItem } from '../../../src/contracts/record';
import { SOURCE_TYPE_LABELS_PL } from '../../../src/contracts/source';
import {
	MISMATCH_LABELS_PL,
	type Verdict,
} from '../../../src/contracts/verdict';
import { buildResultLayout, pickLayoutEvidence } from '../../../src/render/layout';
import { citizenText, extractCheckStats } from '../../../src/render/citizen';
import { countNoun } from '../../../src/render/plural';
import { formatDate } from '../format';
import { ConfidenceGauge } from '../visuals/ConfidenceGauge';
import { ErrorDots } from '../visuals/ErrorDots';
import type { Role } from '../roles/config';
import { ResultImage } from '../roles/ResultImage';
import './record.css';

const VERDICT_PRESENTATION: Record<Verdict, { icon: string; tone: string }> = {
	potwierdzone: {
		icon: '✔',
		tone: 'ok',
	},
	falszywe: {
		icon: '✘',
		tone: 'danger',
	},
	wprowadzajace_w_blad: {
		icon: '▲',
		tone: 'warn',
	},
	brak_wystarczajacych_dowodow: {
		icon: '?',
		tone: 'info',
	},
	nie_podlega_weryfikacji: {
		icon: '○',
		tone: 'neutral',
	},
};

export const ABSTAIN_ONE_SENTENCE =
	'Sprawdziłem zbiór źródeł i nie znalazłem w nim tego twierdzenia. Szukaj dalej na stronie właściwego urzędu.';
export const NO_QUOTE_TEXT = 'Nie ma cytatu z tego źródła.';

interface EvidenceGroup {
	key: string;
	title: string;
	items: EvidenceItem[];
}

function groupEvidence(evidence: EvidenceItem[]): EvidenceGroup[] {
	const groups: EvidenceGroup[] = [
		{ key: 'za', title: 'Źródła, które potwierdzają', items: evidence.filter((item) => item.stance === 'potwierdza') },
		{ key: 'przeciw', title: 'Źródła, które przeczą', items: evidence.filter((item) => item.stance === 'obala') },
		{
			key: 'kontekst',
			title: 'Źródła z dodatkowym kontekstem',
			items: evidence.filter((item) => item.stance === 'kontekst' || item.stance === 'rozbieznosc_kontekstu'),
		},
	];
	return groups.filter((group) => group.items.length > 0);
}

function SourceEvidence({ item }: { item: EvidenceItem }) {
	return (
		<li className="record-evidence">
			<EvidenceBody item={item} />
		</li>
	);
}

function EvidenceBody({ item }: { item: EvidenceItem }) {
	const { source } = item;
	return (
		<>
			{item.archival && (
				<p className="record-evidence__archival" role="note">
					<span aria-hidden="true">⚠ </span>
					<strong>Uwaga, to stary materiał.</strong> Informacja mogła się zmienić.
				</p>
			)}
			{item.stance === 'rozbieznosc_kontekstu' && item.mismatch && (
				<p className="record-evidence__mismatch">
					Źródło opisuje to samo, ale w innym kontekście: {MISMATCH_LABELS_PL[item.mismatch]}.
				</p>
			)}
			{item.quote.trim() ? (
				<blockquote className="record-evidence__quote">
					<p>{item.quote}</p>
				</blockquote>
			) : (
				<p className="record-evidence__no-quote">{NO_QUOTE_TEXT}</p>
			)}
			<p className="record-evidence__meta">
				{source.publisher}, {formatDate(source.publishedAt)}, {SOURCE_TYPE_LABELS_PL[source.sourceType]}. Pobrano{' '}
				<time dateTime={source.fetchedAt}>{formatDate(source.fetchedAt)}</time>.
			</p>
			<p className="record-evidence__link">
				<a href={source.url} target="_blank" rel="noopener noreferrer">
					Otwórz źródło: {source.title}
					<span className="visually-hidden"> (otworzy się w nowej karcie)</span>
				</a>
			</p>
		</>
	);
}

function Refutation({ result }: { result: ClaimResult }) {
	const { refutation } = result;
	if (!refutation.performed) {
		return <p>Nie szukałem osobno źródeł, które przeczą temu twierdzeniu.</p>;
	}
	return (
		<>
			<p>
				{refutation.found === 0
					? 'Szukałem też źródeł, które przeczą twierdzeniu. Nie znalazłem żadnego.'
					: `Szukałem też źródeł, które przeczą twierdzeniu. Znalazłem ${countNoun(refutation.found, 'zrodlo')}.`}
			</p>
			{refutation.queries.some((query) => query.trim()) && (
				<p className="record-claim__queries">
					Czego szukałem: {refutation.queries.filter((query) => query.trim()).map((query) => `„${query}”`).join(', ')}.
				</p>
			)}
		</>
	);
}

const WEB_HEADLINE_QUOTE_CHARS = 300;

interface RecordClaimProps {
	result: ClaimResult;
	asOf: string;
	extraDetails?: ReactNode;
	role: Role;
}

export function RecordClaim({ result, asOf, extraDetails, role }: RecordClaimProps) {
	const presentation = VERDICT_PRESENTATION[result.verdict];
	const isAbstain = result.verdict === 'brak_wystarczajacych_dowodow';
	const headingId = `record-claim-${result.claim.id}`;
	const primary = pickLayoutEvidence(result);
	const restEvidence = result.evidence.filter((item) => item !== primary);
	const groups = groupEvidence(restEvidence);
	const rawLimitations = [...result.limitations];
	if (result.abstainReason) rawLimitations.unshift(result.abstainReason);
	const stats = result.abstainReason ? extractCheckStats(result.abstainReason) : null;
	const limitations = rawLimitations.map(citizenText).filter(Boolean);
	const profile = result.errorProfile;
	const layout = buildResultLayout(result, asOf, { quote: WEB_HEADLINE_QUOTE_CHARS });
	const certainty = layout.certainty;
	const detailsRef = useRef<HTMLDetailsElement>(null);

	function showDetails() {
		const details = detailsRef.current;
		if (!details) return;
		details.open = true;
		details.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
		details.querySelector('summary')?.focus();
	}

	return (
		<article className="record-claim" aria-labelledby={headingId}>
			<div className="record-claim__lead">
				<h3 id={headingId} className="record-claim__headline">
					{layout.headline}
				</h3>
				<ResultImage role={role} resultKey={result.verdict} />
				<div className="record-claim__summary">
					<div className={`verdict verdict--${presentation.tone}`}>
						<p className="verdict__label">
							<span className="verdict__icon" aria-hidden="true">
								{presentation.icon}
							</span>
							<span className="visually-hidden">Ocena: </span>
							<strong>{layout.label}</strong>
						</p>
						{certainty && <p className="verdict__certainty">{certainty}</p>}
						{layout.uncertaintyNote && <p className="verdict__note">{layout.uncertaintyNote}</p>}
					</div>

					<p className="record-claim__asof">{layout.asOf}</p>
					<p className="record-claim__evidence-link">
						<button type="button" onClick={showDetails}>
							{layout.evidenceLink}
						</button>
					</p>
				</div>
			</div>

			{primary && (
				<section className="record-claim__primary" aria-label="Główne źródło">
					<EvidenceBody item={primary} />
				</section>
			)}

			<details className="record-claim__details" ref={detailsRef}>
				<summary>Pokaż szczegóły</summary>

				{isAbstain ? (
					<section className="record-claim__group-block record-claim__abstain" aria-label="Co sprawdziłem">
						<p>{ABSTAIN_ONE_SENTENCE}</p>
					</section>
				) : (
					<>
						<section className="record-claim__group-block" aria-label="Twierdzenie i ocena Mylika">
							<h4>Co ustalił Mylik</h4>
							<p className="record-claim__note">To nasze wyjaśnienie, a nie cytat ze źródła.</p>
							{result.claim.text.trim() && (
								<p className="record-claim__claim">
									<span className="record-claim__label">Sprawdzane twierdzenie: </span>
									<q>{result.claim.text}</q>
								</p>
							)}
							<p>{citizenText(result.explanation)}</p>
							{layout.certainty && <ConfidenceGauge strength={result.strength} />}
							<Refutation result={result} />
							{profile && profile.total > 0 && <ErrorDots profile={profile} />}
						</section>

						{groups.length > 0 && (
							<section className="record-claim__sources" aria-label="Co mówią źródła">
								<h4>Co mówią źródła</h4>
								<p className="record-claim__note">Cytaty pochodzą ze źródeł i podajemy je bez zmian.</p>
								{groups.map((group) => (
									<div key={group.key} className={`record-claim__group record-claim__group--${group.key}`}>
										<h5>{group.title}</h5>
										<ul className="record-evidence-list">
											{group.items.map((item) => (
												<SourceEvidence key={`${item.passageId}-${item.quote}`} item={item} />
											))}
										</ul>
									</div>
								))}
							</section>
						)}

						{limitations.length > 0 && (
							<section aria-label="Czego nie udało się ustalić" className="record-claim__limits">
								<h4>Czego nie udało się ustalić</h4>
								<ul>
									{limitations.map((text) => (
										<li key={text}>{text}</li>
									))}
								</ul>
							</section>
						)}
					</>
				)}

				{stats && (
					<details className="record-claim__technical">
						<summary>Dla dociekliwych</summary>
						<p>
							Sprawdzone teksty ze źródeł: {stats.checked}. Odrzucone dowody: {stats.rejected}.
						</p>
					</details>
				)}

				{extraDetails}
			</details>
		</article>
	);
}
