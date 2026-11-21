import { useEffect, useState } from 'react';
import type { SourceMeta } from '../../../src/contracts/source';
import { SOURCE_TYPE_LABELS_PL } from '../../../src/contracts/source';
import { fetchLatestSources } from '../api';
import { formatDate, formatDateTime } from '../format';
import { clearHistory, loadHistory, type HistoryEntry } from '../history';
import { recordUrlPath } from '../route';
import { Link } from './Link';
import './home.css';

export const HOME_TEXTS = {
	recentTitle: 'Twoje ostatnie sprawdzenia',
	recentNote: 'Widzisz tylko swoje sprawdzenia. Są zapisane w tej przeglądarce, nikt inny ich nie zobaczy.',
	recentEmpty: 'Na razie nic tu nie ma. Gdy coś sprawdzisz, pojawi się tutaj.',
	recentClear: 'Wyczyść listę',
	recentCleared: 'Lista jest pusta.',
	latestTitle: 'Najnowsze ostrzeżenia ze źródeł',
	latestNote: 'To najświeższe dokumenty ze źródeł, które sprawdzam. Nie są oceną niczyich pytań.',
	latestEmpty: 'Nie mam jeszcze żadnych dokumentów do pokazania.',
	latestFailed: 'Nie udało się wczytać najnowszych dokumentów. Spróbuj odświeżyć stronę.',
} as const;

export function RecentChecks() {
	const [entries, setEntries] = useState<HistoryEntry[]>(() => loadHistory());
	const [cleared, setCleared] = useState(false);

	function handleClear() {
		clearHistory();
		setEntries([]);
		setCleared(true);
	}

	return (
		<section className="home-section" aria-labelledby="recent-title">
			<h2 id="recent-title">{HOME_TEXTS.recentTitle}</h2>
			<p className="home-section__note">{HOME_TEXTS.recentNote}</p>
			{entries.length === 0 ? (
				<p>{HOME_TEXTS.recentEmpty}</p>
			) : (
				<>
					<ul className="home-list">
						{entries.map((entry) => (
							<li key={entry.id} className="home-list__item">
								<Link to={recordUrlPath(entry.id)}>{entry.text}</Link>
								<span className="home-list__meta">
									{entry.label}, {formatDateTime(entry.checkedAt)}
								</span>
							</li>
						))}
					</ul>
					<button type="button" className="button" onClick={handleClear}>
						{HOME_TEXTS.recentClear}
					</button>
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
			<p className="home-section__note">{HOME_TEXTS.latestNote}</p>
			{state.status === 'loading' && <p role="status">Wczytuję…</p>}
			{state.status === 'error' && <p>{state.message}</p>}
			{state.status === 'ready' && state.documents.length === 0 && <p>{HOME_TEXTS.latestEmpty}</p>}
			{state.status === 'ready' && state.documents.length > 0 && (
				<ul className="home-list">
					{state.documents.map((doc) => (
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
