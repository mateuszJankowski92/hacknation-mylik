import { useEffect, useState } from 'react';
import type { SourceMeta } from '../../../src/contracts/source';
import { SOURCE_TYPE_LABELS_PL } from '../../../src/contracts/source';
import { fetchLatestSources } from '../api';
import { formatDate, formatDateTime } from '../format';
import { clearHistory, loadHistory, verdictOfEntry, type HistoryEntry } from '../history';
import { useHistoryConsent } from '../privacy/consent';
import { recordUrlPath } from '../route';
import { nb } from '../typography';
import { Link } from './Link';
import { ResultTag } from './ResultTag';
import './home.css';

const HOME_TEXTS_RAW = {
	recentTitle: 'Twoje ostatnie sprawdzenia',
	recentEmpty: 'Na razie nic tu nie ma.',
	showMore: 'Pokaż więcej',
	showLess: 'Pokaż mniej',
	recentClear: 'Wyczyść listę',
	recentCleared: 'Lista jest pusta.',
	recentOff: 'Nie zapamiętuję Twoich sprawdzeń. Możesz to zmienić w ustawieniach prywatności.',
	recentUnset: 'Nie zapamiętuję Twoich sprawdzeń, dopóki nie wybierzesz, czy mam to robić.',
	recentSettings: 'Ustawienia prywatności',
	latestTitle: 'Najnowsze ostrzeżenia ze źródeł',
	latestEmpty: 'Nie mam jeszcze żadnych dokumentów do pokazania.',
	latestFailed: 'Nie udało się wczytać najnowszych dokumentów. Spróbuj odświeżyć stronę.',
} as const;

export const HOME_TEXTS = Object.fromEntries(
	Object.entries(HOME_TEXTS_RAW).map(([key, value]) => [key, nb(value)]),
) as typeof HOME_TEXTS_RAW;

const VISIBLE_ITEMS = 3;

function RecentLabel({ entry }: { entry: HistoryEntry }) {
	const verdict = verdictOfEntry(entry);
	if (!verdict) return <>{entry.label}, </>;
	return (
		<>
			<ResultTag kind={verdict} size="sm" />{' '}
		</>
	);
}

export function RecentChecks() {
	const consent = useHistoryConsent();
	const [entries, setEntries] = useState<HistoryEntry[]>(() => loadHistory());
	const [cleared, setCleared] = useState(false);
	const [expanded, setExpanded] = useState(false);

	useEffect(() => {
		setEntries(loadHistory());
	}, [consent]);

	function handleClear() {
		clearHistory();
		setEntries([]);
		setCleared(true);
	}

	return (
		<section className="home-section" aria-labelledby="recent-title">
			<h2 id="recent-title">{HOME_TEXTS.recentTitle}</h2>
			{consent !== 'granted' ? (
				<p>
					{consent === 'denied' ? HOME_TEXTS.recentOff : HOME_TEXTS.recentUnset}{' '}
					<Link to="/prywatnosc#ustawienia">{HOME_TEXTS.recentSettings}</Link>
				</p>
			) : entries.length === 0 ? (
				<p>{HOME_TEXTS.recentEmpty}</p>
			) : (
				<>
					<ul className="home-list">
						{(expanded ? entries : entries.slice(0, VISIBLE_ITEMS)).map((entry) => (
							<li key={entry.id} className="home-list__item">
								<Link to={recordUrlPath(entry.id)}>{nb(entry.text)}</Link>
								<span className="home-list__meta">
									<RecentLabel entry={entry} />
									{formatDateTime(entry.checkedAt)}
								</span>
							</li>
						))}
					</ul>
					<div className="home-section__actions">
						{entries.length > VISIBLE_ITEMS && (
							<button type="button" className="text-button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
								{expanded ? HOME_TEXTS.showLess : HOME_TEXTS.showMore}
							</button>
						)}
						<button type="button" className="text-button" onClick={handleClear}>
							{HOME_TEXTS.recentClear}
						</button>
					</div>
				</>
			)}
			<p className="visually-hidden" role="status" aria-live="polite">
				{cleared ? HOME_TEXTS.recentCleared : ''}
			</p>
		</section>
	);
}

type LatestState =
	| { status: 'loading' }
	| { status: 'ready'; documents: SourceMeta[] }
	| { status: 'error'; message: string };

export function LatestWarnings() {
	const [state, setState] = useState<LatestState>({ status: 'loading' });
	const [expanded, setExpanded] = useState(false);

	useEffect(() => {
		const controller = new AbortController();
		fetchLatestSources(controller.signal).then(
			(data) => setState({ status: 'ready', documents: Array.isArray(data?.documents) ? data.documents : [] }),
			() => {
				if (controller.signal.aborted) return;
				setState({ status: 'error', message: HOME_TEXTS.latestFailed });
			},
		);
		return () => controller.abort();
	}, []);

	return (
		<section className="home-section" aria-labelledby="latest-title">
			<h2 id="latest-title">{HOME_TEXTS.latestTitle}</h2>
			{state.status === 'loading' && <p role="status">Wczytuję…</p>}
			{state.status === 'error' && <p>{state.message}</p>}
			{state.status === 'ready' && state.documents.length === 0 && <p>{HOME_TEXTS.latestEmpty}</p>}
			{state.status === 'ready' && state.documents.length > 0 && (
				<ul className="home-list">
					{(expanded ? state.documents : state.documents.slice(0, VISIBLE_ITEMS)).map((doc) => (
						<li key={doc.documentId} className="home-list__item">
							<a href={doc.url} target="_blank" rel="noopener noreferrer">
								{doc.title}
								<span className="visually-hidden"> (otworzy się w nowej karcie)</span>
							</a>
							<span className="home-list__meta">
								{doc.publisher}, <time dateTime={doc.publishedAt ?? undefined}>{formatDate(doc.publishedAt)}</time>,{' '}
								{SOURCE_TYPE_LABELS_PL[doc.sourceType]}
							</span>
						</li>
					))}
				</ul>
			)}
			{state.status === 'ready' && state.documents.length > VISIBLE_ITEMS && (
				<div className="home-section__actions">
					<button type="button" className="text-button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
						{expanded ? HOME_TEXTS.showLess : HOME_TEXTS.showMore}
					</button>
				</div>
			)}
		</section>
	);
}

export function HomeSections() {
	return (
		<div className="home-sections">
			<RecentChecks />
			<LatestWarnings />
		</div>
	);
}
