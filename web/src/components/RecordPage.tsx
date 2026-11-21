import { useEffect, useRef, useState } from 'react';
import type { VerifyOutcome } from '../../../src/contracts/record';
import { ApiFailure, fetchRecord } from '../api';
import { BASE_TITLE, resultTitle, useDocumentTitle } from '../documentTitle';
import { addToHistory } from '../history';
import { isRecordId } from '../route';
import { recallRecord } from '../recordCache';
import { useShownMark, useStage } from '../stage/StageContext';
import { Link } from './Link';
import { OutcomeView } from './OutcomeView';
import { ResultActions } from './ResultActions';
import { nb } from '../typography';

export const GONE_TEXTS = {
	title: 'Tego sprawdzenia już nie ma',
	body: 'Mogło zostać usunięte albo minął czas, przez który je przechowujemy. Możesz sprawdzić informację jeszcze raz.',
	back: 'Wróć na stronę główną',
} as const;

export const LOADING_TITLE = `Wczytuję… - ${BASE_TITLE}`;
export const GONE_PAGE_TITLE = `${GONE_TEXTS.title} - ${BASE_TITLE}`;
export const ERROR_PAGE_TITLE = `Nie udało się wczytać wyniku - ${BASE_TITLE}`;

type PageState =
	| { status: 'loading' }
	| { status: 'ready'; outcome: VerifyOutcome }
	| { status: 'gone' }
	| { status: 'error'; message: string };

function initialState(id: string, justChecked: boolean): PageState {
	if (!isRecordId(id)) return { status: 'gone' };
	const remembered = justChecked ? recallRecord(id) : null;
	if (remembered) return { status: 'ready', outcome: { kind: 'record', record: remembered, cached: false } };
	return { status: 'loading' };
}

function failureState(error: unknown): PageState {
	if (error instanceof ApiFailure && error.kind === 'not_found') return { status: 'gone' };
	return { status: 'error', message: error instanceof ApiFailure ? error.message : new ApiFailure('unexpected').message };
}

function pageTitle(state: PageState): string {
	switch (state.status) {
		case 'loading':
			return LOADING_TITLE;
		case 'gone':
			return GONE_PAGE_TITLE;
		case 'error':
			return ERROR_PAGE_TITLE;
		case 'ready':
			return state.outcome.kind === 'record' ? resultTitle(state.outcome.record.maskedInput) : resultTitle('');
	}
}

export function RecordPage({ id }: { id: string }) {
	const stage = useStage();
	const [state, setState] = useState<PageState>(() => initialState(id, stage.resultId === id));
	const resultRef = useRef<HTMLDivElement>(null);
	const { reset } = stage;
	const stageRef = useRef(stage);
	stageRef.current = stage;
	const showResult = state.status === 'ready';
	useShownMark(showResult);
	useDocumentTitle(pageTitle(state));

	useEffect(() => {
		if (!isRecordId(id)) {
			setState({ status: 'gone' });
			return;
		}
		const controller = new AbortController();
		const remembered = stageRef.current.resultId === id ? recallRecord(id) : null;
		if (remembered) {
			addToHistory(remembered);
			setState({ status: 'ready', outcome: { kind: 'record', record: remembered, cached: false } });
			return;
		}
		reset();
		setState({ status: 'loading' });
		fetchRecord(id, controller.signal).then(
			(record) => {
				if (controller.signal.aborted) return;
				addToHistory(record);
				setState({ status: 'ready', outcome: { kind: 'record', record, cached: true } });
			},
			(error: unknown) => {
				if (controller.signal.aborted) return;
				setState(failureState(error));
			},
		);
		return () => controller.abort();
	}, [id, reset]);

	useEffect(() => {
		const container = resultRef.current;
		if (!container) return;
		if (showResult) {
			const heading = container.querySelector<HTMLElement>('[data-result-heading]');
			(heading ?? container).focus();
			return;
		}
		if (state.status === 'gone' || state.status === 'error') container.focus();
	}, [state.status, showResult]);

	const question = state.status === 'ready' && state.outcome.kind === 'record' ? state.outcome.record.maskedInput : '';

	return (
		<div className="record-page">
			<h1 className={state.status === 'ready' || state.status === 'loading' ? 'visually-hidden' : 'page-title'}>
				{nb(state.status === 'gone' ? GONE_TEXTS.title : state.status === 'error' ? 'Nie udało się wczytać wyniku' : 'Wynik sprawdzenia')}
			</h1>
			{state.status === 'loading' && (
				<p role="status" aria-live="polite" className="record-page__loading">
					Wczytuję…
				</p>
			)}
			<div
				className="result"
				ref={resultRef}
				tabIndex={-1}
				data-engine-ms={showResult ? stage.timing?.engineMs : undefined}
				data-shown-ms={showResult ? stage.timing?.shownMs : undefined}
			>
				{state.status === 'gone' && (
					<section className="http-error" role="status">
						<p>{nb(GONE_TEXTS.body)}</p>
						<p>
							<Link to="/">{GONE_TEXTS.back}</Link>
						</p>
					</section>
				)}
				{state.status === 'error' && (
					<section className="http-error" role="alert">
						<p>{nb(state.message)}</p>
						<p>
							<Link to="/">{GONE_TEXTS.back}</Link>
						</p>
					</section>
				)}
				{showResult && state.status === 'ready' && (
					<>
						<OutcomeView outcome={state.outcome} />
						{state.outcome.kind === 'record' && <ResultActions record={state.outcome.record} question={question} />}
					</>
				)}
			</div>
		</div>
	);
}
