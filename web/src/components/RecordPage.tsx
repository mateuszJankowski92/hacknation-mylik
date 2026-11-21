import { useEffect, useRef, useState } from 'react';
import type { VerifyProgressEvent } from '../../../src/contracts/api';
import type { VerifyOutcome } from '../../../src/contracts/record';
import { ApiFailure, DEFAULT_ETA_SECONDS, fetchEtaSeconds, fetchRecord, verifyWithFallback } from '../api';
import { addToHistory } from '../history';
import { isRecordId, navigate, PENDING_CONTENT_KEY, readPendingContent, recordUrlPath } from '../route';
import { INITIAL_PROGRESS, reduceProgress, type ProgressState } from '../visuals/progress';
import { WaitingSteps } from '../visuals/WaitingSteps';
import { Link } from './Link';
import { OutcomeView } from './OutcomeView';
import { ResultActions } from './ResultActions';

export const GONE_TEXTS = {
	title: 'Tego sprawdzenia już nie ma',
	body: 'Mogło zostać usunięte albo minął czas, przez który je przechowujemy. Możesz sprawdzić informację jeszcze raz.',
	back: 'Wróć na stronę główną',
} as const;

type PageState =
	| { status: 'loading' }
	| { status: 'waiting'; progress: ProgressState; etaSeconds: number }
	| { status: 'ready'; outcome: VerifyOutcome }
	| { status: 'gone' }
	| { status: 'error'; message: string };

function initialState(id: string): PageState {
	if (!isRecordId(id)) return { status: 'gone' };
	return readPendingContent()
		? { status: 'waiting', progress: INITIAL_PROGRESS, etaSeconds: DEFAULT_ETA_SECONDS }
		: { status: 'loading' };
}

function clearPending(id: string): void {
	const state = window.history.state as Record<string, unknown> | null;
	if (!state || !(PENDING_CONTENT_KEY in state)) return;
	window.history.replaceState(null, '', recordUrlPath(id));
}

function failureState(error: unknown): PageState {
	if (error instanceof ApiFailure && error.kind === 'not_found') return { status: 'gone' };
	return { status: 'error', message: error instanceof ApiFailure ? error.message : new ApiFailure('unexpected').message };
}

export function RecordPage({ id }: { id: string }) {
	const [state, setState] = useState<PageState>(() => initialState(id));
	const resultRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isRecordId(id)) {
			setState({ status: 'gone' });
			return;
		}
		const controller = new AbortController();
		const pending = readPendingContent();

		function finish(outcome: VerifyOutcome) {
			if (outcome.kind === 'record') {
				addToHistory(outcome.record);
				if (outcome.record.id !== id) {
					navigate(recordUrlPath(outcome.record.id), { replace: true });
					return;
				}
			}
			clearPending(id);
			setState({ status: 'ready', outcome });
		}

		if (pending) {
			setState({ status: 'waiting', progress: INITIAL_PROGRESS, etaSeconds: DEFAULT_ETA_SECONDS });
			const onProgress = (event: VerifyProgressEvent) => {
				if (controller.signal.aborted) return;
				setState((current) =>
					current.status === 'waiting' ? { ...current, progress: reduceProgress(current.progress, event) } : current,
				);
			};
			void fetchEtaSeconds(controller.signal).then((seconds) => {
				if (controller.signal.aborted) return;
				setState((current) => (current.status === 'waiting' ? { ...current, etaSeconds: seconds } : current));
			});
			verifyWithFallback(pending, onProgress, controller.signal).then(finish, (error: unknown) => {
				if (controller.signal.aborted) return;
				clearPending(id);
				setState(failureState(error));
			});
		} else {
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
		}
		return () => controller.abort();
	}, [id]);

	useEffect(() => {
		if (state.status === 'ready' || state.status === 'gone' || state.status === 'error') resultRef.current?.focus();
	}, [state.status]);

	return (
		<div className="record-page">
			<h2>{state.status === 'gone' ? GONE_TEXTS.title : 'Wynik sprawdzenia'}</h2>
			{state.status === 'loading' && (
				<p role="status" aria-live="polite">
					Wczytuję…
				</p>
			)}
			{state.status === 'waiting' && <WaitingSteps progress={state.progress} etaSeconds={state.etaSeconds} />}
			<div className="result" ref={resultRef} tabIndex={-1} aria-live="polite">
				{state.status === 'gone' && (
					<section className="http-error" role="status">
						<p>{GONE_TEXTS.body}</p>
						<p>
							<Link to="/">{GONE_TEXTS.back}</Link>
						</p>
					</section>
				)}
				{state.status === 'error' && (
					<section className="http-error" role="alert">
						<p>{state.message}</p>
						<p>
							<Link to="/">{GONE_TEXTS.back}</Link>
						</p>
					</section>
				)}
				{state.status === 'ready' && (
					<>
						<OutcomeView outcome={state.outcome} />
						{state.outcome.kind === 'record' && <ResultActions id={state.outcome.record.id} />}
					</>
				)}
			</div>
		</div>
	);
}
