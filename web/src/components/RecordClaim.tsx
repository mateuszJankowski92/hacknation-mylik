import { useRef, type ReactNode } from 'react';
import type { ClaimResult, EvidenceItem } from '../../../src/contracts/record';
import { SOURCE_TYPE_LABELS_PL } from '../../../src/contracts/source';
import {
	MISMATCH_LABELS_PL,
	type Verdict,
} from '../../../src/contracts/verdict';
import { buildResultLayout, pickLayoutEvidence } from '../../../src/render/layout';
import { formatDate } from '../format';
import { ConfidenceGauge } from '../visuals/ConfidenceGauge';
import { EmptyCertainty, EMPTY_CERTAINTY_HEADING, EMPTY_CERTAINTY_TITLE } from '../visuals/EmptyCertainty';
import { ErrorDots } from '../visuals/ErrorDots';
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

const ABSTAIN_SUGGESTION =
	'Nie traktuj tego jako potwierdzenia ani zaprzeczenia. Sprawdź informację w oficjalnym źródle, na przykład na stronie właściwego urzędu.';

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
			<blockquote className="record-evidence__quote">
				<p>{item.quote}</p>
			</blockquote>
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
					: `Szukałem też źródeł, które przeczą twierdzeniu. Znalazłem: ${refutation.found}.`}
			</p>
			{refutation.queries.length > 0 && (
				<p className="record-claim__queries">
					Czego szukałem: {refutation.queries.map((query) => `„${query}”`).join(', ')}.
				</p>
			)}
		</>
	);
}

const WEB_HEADLINE_QUOTE_CHARS = 300;

export function emptyCertaintySentence(result: ClaimResult): string {
	const same = result.evidence.filter((item) => item.stance === 'potwierdza').length;
	const other = result.evidence.filter((item) => item.stance === 'obala').length;
	if (same === 0 && other === 0) {
		return 'Nie znalazłem w sprawdzonych źródłach nic, co mówi to samo, ani nic, co mówi co innego.';
	}
	if (same > 0 && other > 0) {
		return `Źródła mówią różne rzeczy: to samo ${same}, co innego ${other}. Dlatego nie da się ocenić, na ile to pewne.`;
	}
	return 'Znalazłem za mało, żeby ocenić, na ile to pewne.';
}

function isUnmeasurable(result: ClaimResult): boolean {
	return result.verdict === 'brak_wystarczajacych_dowodow' || result.strength.level === 'brak';
}

interface RecordClaimProps {
	result: ClaimResult;
	asOf: string;
	extraDetails?: ReactNode;
}

export function RecordClaim({ result, asOf, extraDetails }: RecordClaimProps) {
	const presentation = VERDICT_PRESENTATION[result.verdict];
	const isAbstain = result.verdict === 'brak_wystarczajacych_dowodow';
	const headingId = `record-claim-${result.claim.id}`;
	const primary = pickLayoutEvidence(result);
	const restEvidence = result.evidence.filter((item) => item !== primary);
	const groups = groupEvidence(restEvidence);
	const limitations = [...result.limitations];
	if (result.abstainReason) limitations.unshift(result.abstainReason);
	const profile = result.errorProfile;
	const layout = buildResultLayout(result, asOf, { quote: WEB_HEADLINE_QUOTE_CHARS });
	const unmeasurable = isUnmeasurable(result);
	const certainty = unmeasurable && layout.certainty ? `${EMPTY_CERTAINTY_TITLE}: ${EMPTY_CERTAINTY_HEADING}` : layout.certainty;
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
			<h3 id={headingId} className="record-claim__headline">
				{layout.headline}
			</h3>

			<div className={`verdict verdict--${presentation.tone}`}>
				<p className="verdict__label">
					<span className="verdict__icon" aria-hidden="true">
						{presentation.icon}
					</span>
					<span className="visually-hidden">Ocena: </span>
					<strong>{layout.label}</strong>
				</p>
				{certainty && <p className="verdict__certainty">{certainty}</p>}
			</div>

			<p className="record-claim__asof">{layout.asOf}</p>
			<p className="record-claim__evidence-link">
				<button type="button" onClick={showDetails}>
					{layout.evidenceLink}
				</button>
			</p>

			{primary && (
				<section className="record-claim__primary" aria-label="Główne źródło">
					<EvidenceBody item={primary} />
				</section>
			)}

			<details className="record-claim__details" ref={detailsRef}>
				<summary>Pokaż szczegóły</summary>

				<section className="record-claim__group-block" aria-label="Twierdzenie i ocena Mylika">
					<h4>Co ustalił Mylik</h4>
					<p className="record-claim__note">To nasze wyjaśnienie, a nie cytat ze źródła.</p>
					<p className="record-claim__claim">
						<span className="record-claim__label">Sprawdzane twierdzenie: </span>
						<q>{result.claim.text}</q>
					</p>
					<p>{result.explanation}</p>
					{layout.certainty && unmeasurable && <EmptyCertainty sentence={emptyCertaintySentence(result)} />}
					{layout.certainty && !unmeasurable && <ConfidenceGauge strength={result.strength} />}
					<Refutation result={result} />
					{profile && profile.total > 0 && <ErrorDots profile={profile} />}
				</section>

				{(groups.length > 0 || !primary) && (
					<section className="record-claim__sources" aria-label="Co mówią źródła">
						<h4>Co mówią źródła</h4>
						<p className="record-claim__note">Cytaty pochodzą ze źródeł i podajemy je bez zmian.</p>
						{groups.length === 0 && <p>Nie mam żadnego cytatu ze źródeł do tego twierdzenia.</p>}
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

				{(limitations.length > 0 || isAbstain) && (
					<section aria-label="Czego nie udało się ustalić" className="record-claim__limits">
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

				{extraDetails}
			</details>
		</article>
	);
}
