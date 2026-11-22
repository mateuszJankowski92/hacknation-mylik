import { useEffect, useMemo, useState } from 'react';
import type { SourcesResponse } from '../../../src/contracts/api';
import { SOURCE_TYPE_LABELS_PL } from '../../../src/contracts/source';
import { FAQ_ITEMS, SITE_PAGES, SITE_UPDATED_ISO } from '../../../src/server/seoContent';
import { ApiFailure, fetchSources } from '../api';
import { useDocumentTitle } from '../documentTitle';
import { formatDate } from '../format';
import { nb } from '../typography';
import {
	CATEGORY_LABELS,
	CATEGORY_ORDER,
	categoryOf,
	filterGroups,
	groupByPublisher,
	latestFetchDate,
	pluralPl,
	type SourceCategory,
	type PublisherGroup,
} from './sourcesModel';
import { fetchTrustedPublishers, type TrustedPublishers } from './sourcesApi';
import './sources.css';

export const SOURCES_TITLE = SITE_PAGES.find((page) => page.path === '/zrodla')?.title ?? 'Źródła - Mylik';
export const GROUP_PAGE_SIZE = 40;

type SourcesState =
	| { status: 'loading' }
	| { status: 'ready'; data: SourcesResponse }
	| { status: 'error'; message: string };

function documentsLabel(count: number): string {
	return `${count} ${pluralPl(count, 'dokument', 'dokumenty', 'dokumentów')}`;
}

function Stats({ data, publishers }: { data: SourcesResponse; publishers: number }) {
	const fetched = latestFetchDate(data.documents);
	return (
		<section className="sources__stats" aria-label="Zbiór w liczbach">
			<dl className="sources__stat-list">
				<div className="sources__stat">
					<dt>Dokumenty</dt>
					<dd>{data.documents.length}</dd>
				</div>
				<div className="sources__stat">
					<dt>Wydawcy</dt>
					<dd>{publishers}</dd>
				</div>
				<div className="sources__stat">
					<dt>Data zbioru</dt>
					<dd>{fetched ? <time dateTime={fetched.slice(0, 10)}>{formatDate(fetched)}</time> : 'brak daty'}</dd>
				</div>
			</dl>
			<p className="sources__version">
				Wersja zbioru: <code>{data.corpusVersion}</code>
			</p>
		</section>
	);
}

function Reviews({ trusted }: { trusted: TrustedPublishers | null }) {
	return (
		<section className="sources__reviews" aria-labelledby="redakcje-title">
			<h2 id="redakcje-title">Weryfikacje redakcji</h2>
			<p className="sources__note">
				{nb('Mylik pyta o nie publiczny indeks Google Fact Check Tools i zawsze przypisuje ocenę redakcji, która ją wydała.')}
			</p>
			{trusted && trusted.publishers.length > 0 && (
				<ul className="sources__pills">
					{trusted.publishers.map((item) => (
						<li key={item.site}>
							<strong>{item.name}</strong> <span className="sources__muted">{item.site}</span>
						</li>
					))}
				</ul>
			)}
			{trusted?.qualification && (
				<details className="sources__rule">
					<summary>Zasada kwalifikacji redakcji</summary>
					<p>{nb(trusted.qualification)}</p>
				</details>
			)}
		</section>
	);
}

interface GroupProps {
	group: PublisherGroup;
	open: boolean;
	onToggle: () => void;
}

function Group({ group, open, onToggle }: GroupProps) {
	const [visible, setVisible] = useState(GROUP_PAGE_SIZE);
	const panelId = `${group.id}-lista`;
	const shown = group.documents.slice(0, visible);
	return (
		<li className="sources__group" data-open={open ? 'true' : 'false'}>
			<h3 className="sources__group-head">
				<button type="button" className="sources__toggle" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
					<span className="sources__publisher">{group.publisher}</span>
					<span className="sources__count">{documentsLabel(group.documents.length)}</span>
				</button>
			</h3>
			{open && (
				<div id={panelId} className="sources__panel">
					<details className="sources__rule">
						<summary>Zasady użycia</summary>
						{group.licenses.map((license) => (
							<p key={license}>{nb(license)}</p>
						))}
						<p className="sources__muted">Domena: {group.domains.join(', ')}</p>
					</details>
					<ul className="sources__rows">
						{shown.map((doc) => (
							<li key={doc.documentId} className="sources__row">
								<a className="sources__title" href={doc.url} target="_blank" rel="noopener noreferrer">
									{doc.title}
									<span className="visually-hidden"> (otwiera się w nowej karcie)</span>
								</a>
								<span className="sources__meta">
									{doc.publishedAt ? (
										<time dateTime={doc.publishedAt.slice(0, 10)}>{formatDate(doc.publishedAt)}</time>
									) : (
										<span>brak daty</span>
									)}
									<span className="sources__tag" data-category={categoryOf(doc.sourceType)}>
										{SOURCE_TYPE_LABELS_PL[doc.sourceType]}
									</span>
								</span>
							</li>
						))}
					</ul>
					{visible < group.documents.length && (
						<button type="button" className="text-button" onClick={() => setVisible((n) => n + GROUP_PAGE_SIZE)}>
							Pokaż kolejne ({group.documents.length - visible})
						</button>
					)}
				</div>
			)}
		</li>
	);
}

function SourceList({ data }: { data: SourcesResponse }) {
	const groups = useMemo(() => groupByPublisher(data.documents), [data.documents]);
	const [query, setQuery] = useState('');
	const [categories, setCategories] = useState<ReadonlySet<SourceCategory>>(new Set());
	const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
	const filter = useMemo(() => ({ query, categories }), [query, categories]);
	const filtered = useMemo(() => filterGroups(groups, filter), [groups, filter]);
	const total = filtered.reduce((sum, group) => sum + group.documents.length, 0);
	const narrowed = query.trim() !== '' || categories.size > 0;
	const autoOpen = narrowed && filtered.length <= 3;

	function toggleCategory(category: SourceCategory) {
		setCategories((current) => {
			const next = new Set(current);
			if (next.has(category)) next.delete(category);
			else next.add(category);
			return next;
		});
	}

	function toggleGroup(id: string, isOpen: boolean) {
		setOpened((current) => {
			const next = new Set(current);
			if (isOpen) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	return (
		<section className="sources__list" aria-labelledby="lista-title">
			<h2 id="lista-title">Lista źródeł</h2>
			<div className="sources__tools">
				<div className="sources__search">
					<label htmlFor="sources-search">Szukaj po tytule lub wydawcy</label>
					<input
						id="sources-search"
						type="search"
						value={query}
						autoComplete="off"
						onChange={(event) => setQuery(event.target.value)}
					/>
				</div>
				<div className="sources__filters" role="group" aria-label="Rodzaj źródła">
					{CATEGORY_ORDER.map((category) => (
						<button
							key={category}
							type="button"
							className="sources__filter"
							aria-pressed={categories.has(category)}
							onClick={() => toggleCategory(category)}
						>
							{CATEGORY_LABELS[category]}
						</button>
					))}
				</div>
			</div>
			<p className="sources__result-count" role="status" aria-live="polite">
				{total === 0
					? 'Nic nie znaleziono. Zmień frazę albo wyłącz filtry.'
					: `Wyniki: ${documentsLabel(total)} u ${filtered.length} ${pluralPl(filtered.length, 'wydawcy', 'wydawców', 'wydawców')}.`}
			</p>
			<ul className="sources__groups">
				{filtered.map((group) => {
					const isOpen = opened.has(group.id) || autoOpen;
					return <Group key={group.id} group={group} open={isOpen} onToggle={() => toggleGroup(group.id, isOpen)} />;
				})}
			</ul>
		</section>
	);
}

function Faq() {
	return (
		<section className="sources__faq" aria-labelledby="pytania-title">
			<h2 id="pytania-title">Najczęstsze pytania</h2>
			<dl className="sources__faq-list">
				{FAQ_ITEMS.map((item) => (
					<div key={item.question} className="sources__faq-item">
						<dt>{item.question}</dt>
						<dd>{nb(item.answer)}</dd>
					</div>
				))}
			</dl>
		</section>
	);
}

export function SourcesPage() {
	useDocumentTitle(SOURCES_TITLE);
	const [state, setState] = useState<SourcesState>({ status: 'loading' });
	const [trusted, setTrusted] = useState<TrustedPublishers | null>(null);

	useEffect(() => {
		const controller = new AbortController();
		fetchSources(controller.signal).then(
			(data) => setState({ status: 'ready', data }),
			(error: unknown) => {
				if (controller.signal.aborted) return;
				const message = error instanceof ApiFailure ? error.message : new ApiFailure('unexpected').message;
				setState({ status: 'error', message });
			},
		);
		fetchTrustedPublishers(controller.signal).then((value) => {
			if (!controller.signal.aborted) setTrusted(value);
		});
		return () => controller.abort();
	}, []);

	const publisherCount = useMemo(
		() => (state.status === 'ready' ? new Set(state.data.documents.map((doc) => doc.publisher)).size : 0),
		[state],
	);

	return (
		<div className="sources">
			<header className="sources__head">
				<h1 className="page-title">{nb('Źródła, z których korzystam')}</h1>
				<p className="sources__lede">{nb('Sprawdzam tylko w tych źródłach. Poniżej cała lista.')}</p>
			</header>
			<div role="status" aria-live="polite">
				{state.status === 'loading' && <p>Wczytuję…</p>}
			</div>
			{state.status === 'error' && (
				<section className="http-error" role="alert">
					<p>{nb(state.message)}</p>
				</section>
			)}
			{state.status === 'ready' && (
				<>
					<Stats data={state.data} publishers={publisherCount} />
					<Reviews trusted={trusted} />
					<SourceList data={state.data} />
				</>
			)}
			<Faq />
			<p className="sources__updated">
				Strona zaktualizowana: <time dateTime={SITE_UPDATED_ISO}>{formatDate(SITE_UPDATED_ISO)}</time>
			</p>
		</div>
	);
}
