import type { ClaimResult, EvidenceItem } from '../../../src/contracts/record';
import { SOURCE_TYPE_LABELS_PL } from '../../../src/contracts/source';
import {
	MISMATCH_LABELS_PL,
	STRENGTH_LABELS_PL,
	STRENGTH_REASON_LABELS_PL,
	VERDICT_LABELS_PL,
	type Verdict,
} from '../../../src/contracts/verdict';
import { formatDate } from '../format';
import './record.css';

const VERDICT_PRESENTATION: Record<Verdict, { icon: string; tone: string; meaning: string }> = {
	potwierdzone: {
		icon: '✔',
		tone: 'ok',
		meaning: 'Źródła w zbiorze zgadzają się z tym twierdzeniem i żadne mu nie przeczy.',
	},
	falszywe: {
		icon: '✘',
		tone: 'danger',
		meaning: 'Źródła w zbiorze przeczą temu twierdzeniu i żadne go nie potwierdza.',
	},
	wprowadzajace_w_blad: {
		icon: '▲',
		tone: 'warn',
		meaning: 'Źródła potwierdzają część twierdzenia, ale pomija ono ważny kontekst.',
	},
	brak_wystarczajacych_dowodow: {
		icon: '?',
		tone: 'info',
		meaning: 'W zbiorze źródeł nie ma dość informacji, żeby to ocenić. Nie zgaduję.',
	},
	nie_podlega_weryfikacji: {
		icon: '○',
		tone: 'neutral',
		meaning: 'To opinia albo prognoza. Nie da się jej sprawdzić w źródłach.',
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
	const { source } = item;
	return (
		<li className="record-evidence">
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
			<dl className="record-evidence__meta">
				<div>
					<dt>Tytuł</dt>
					<dd>{source.title}</dd>
				</div>
				<div>
					<dt>Wydawca</dt>
					<dd>{source.publisher}</dd>
				</div>
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

export function RecordClaim({ result, asOfLabel }: { result: ClaimResult; asOfLabel: string }) {
	const presentation = VERDICT_PRESENTATION[result.verdict];
	const isAbstain = result.verdict === 'brak_wystarczajacych_dowodow';
	const headingId = `record-claim-${result.claim.id}`;
	const groups = groupEvidence(result.evidence);
	const limitations = [...result.limitations];
	if (result.abstainReason) limitations.unshift(result.abstainReason);
	const profile = result.errorProfile;

	return (
		<article className="record-claim" aria-labelledby={headingId}>
			<h3 id={headingId} className="record-claim__claim">
				<span className="record-claim__label">Sprawdzane twierdzenie</span>
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
				<p className="verdict__abstain">{presentation.meaning}</p>
				<p className="verdict__abstain">{asOfLabel}</p>
			</div>

			<section className="record-claim__mylik" aria-label="Ocena Mylika">
				<h4>Co ustalił Mylik</h4>
				<p className="record-claim__note">To nasze wyjaśnienie, a nie cytat ze źródła.</p>
				<p>{result.explanation}</p>
				<p>
					Siła podstawy: <strong>{STRENGTH_LABELS_PL[result.strength.level]}</strong>
				</p>
				{result.strength.reasons.length > 0 && (
					<ul>
						{result.strength.reasons.map((reason) => (
							<li key={reason}>{STRENGTH_REASON_LABELS_PL[reason]}</li>
						))}
					</ul>
				)}
				<Refutation result={result} />
				{profile && profile.total > 0 && (
					<p className="record-claim__profile">
						Mylik też się myli. W naszych próbach na podobnych twierdzeniach (grupa: {profile.bucket}) pomylił się{' '}
						{profile.errors} razy na {profile.total}.
					</p>
				)}
			</section>

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
		</article>
	);
}
