import { useEffect, useState } from 'react';
import type { SourcesResponse } from '../../../src/contracts/api';
import { SOURCE_TYPE_LABELS_PL } from '../../../src/contracts/source';
import { ApiFailure, fetchSources } from '../api';
import { formatDate } from '../format';
import { nb } from '../typography';

type SourcesState =
	| { status: 'loading' }
	| { status: 'ready'; data: SourcesResponse }
	| { status: 'error'; message: string };

export function SourcesPage() {
	const [state, setState] = useState<SourcesState>({ status: 'loading' });

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
		return () => controller.abort();
	}, []);

	return (
		<div>
			<h2>{nb('Źródła, z których korzystam')}</h2>
			<p>{nb('Sprawdzam tylko w tych źródłach. Poniżej cała lista.')}</p>
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
					<p>
						Wersja zbioru źródeł: <strong>{state.data.corpusVersion}</strong>. Liczba dokumentów:{' '}
						{state.data.documents.length}.
					</p>
					<div className="table-wrap" role="region" aria-label="Tabela źródeł" tabIndex={0}>
						<table>
							<caption className="visually-hidden">Lista źródeł w zbiorze</caption>
							<thead>
								<tr>
									<th scope="col">Tytuł</th>
									<th scope="col">Wydawca</th>
									<th scope="col">Domena</th>
									<th scope="col">Rodzaj</th>
									<th scope="col">Licencja</th>
									<th scope="col">Data publikacji</th>
									<th scope="col">Data pobrania</th>
									<th scope="col">Link</th>
								</tr>
							</thead>
							<tbody>
								{state.data.documents.map((doc) => (
									<tr key={doc.documentId}>
										<th scope="row">{doc.title}</th>
										<td>{doc.publisher}</td>
										<td>{doc.domain}</td>
										<td>{SOURCE_TYPE_LABELS_PL[doc.sourceType]}</td>
										<td>{doc.license}</td>
										<td>{formatDate(doc.publishedAt)}</td>
										<td>{formatDate(doc.fetchedAt)}</td>
										<td>
											<a href={doc.url} target="_blank" rel="noopener noreferrer">
												Otwórz<span className="visually-hidden"> źródło: {doc.title}</span>
											</a>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>
			)}
		</div>
	);
}
