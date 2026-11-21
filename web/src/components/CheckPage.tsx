import { useEffect, useReducer, useRef } from 'react';
import type { VerifyOutcome } from '../../../src/contracts/record';
import { ApiFailure, DEFAULT_ETA_SECONDS, fetchEtaSeconds, fetchRecordKey, verifyWithFallback } from '../api';
import { addToHistory } from '../history';
import { navigate, PENDING_CONTENT_KEY, recordUrlPath } from '../route';
import { INITIAL_PROGRESS, reduceProgress, type ProgressState } from '../visuals/progress';
import { WaitingSteps } from '../visuals/WaitingSteps';
import type { VerifyProgressEvent } from '../../../src/contracts/api';
import { CheckForm } from './CheckForm';
import { Hero } from './Hero';
import { HomeSections } from './HomeSections';
import { OutcomeView } from './OutcomeView';

type CheckState =
	| { status: 'idle' }
	| { status: 'loading'; progress: ProgressState; etaSeconds: number }
	| { status: 'done'; outcome: VerifyOutcome }
	| { status: 'error'; message: string };

type CheckAction =
	| { type: 'start' }
	| { type: 'progress'; event: VerifyProgressEvent }
	| { type: 'eta'; seconds: number }
	| { type: 'done'; outcome: VerifyOutcome }
	| { type: 'error'; message: string };

function reducer(state: CheckState, action: CheckAction): CheckState {
	switch (action.type) {
		case 'start':
			return { status: 'loading', progress: INITIAL_PROGRESS, etaSeconds: DEFAULT_ETA_SECONDS };
		case 'progress':
			return state.status === 'loading' ? { ...state, progress: reduceProgress(state.progress, action.event) } : state;
		case 'eta':
			return state.status === 'loading' ? { ...state, etaSeconds: action.seconds } : state;
		case 'done':
			return { status: 'done', outcome: action.outcome };
		case 'error':
			return { status: 'error', message: action.message };
	}
}

export function CheckPage() {
	const [state, dispatch] = useReducer(reducer, { status: 'idle' });
	const controllerRef = useRef<AbortController | null>(null);
	const resultRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!import.meta.env.DEV) return;
		const name = new URLSearchParams(window.location.search).get('fixture');
		if (!name) return;
		void import('../fixtures/outcomes').then(({ FIXTURE_OUTCOMES }) => {
			const outcome = FIXTURE_OUTCOMES[name];
			if (outcome) dispatch({ type: 'done', outcome });
		});
	}, []);

	useEffect(() => {
		if (state.status === 'done' || state.status === 'error') resultRef.current?.focus();
	}, [state]);

	useEffect(() => () => controllerRef.current?.abort(), []);

	function verifyWithProgress(content: string, controller: AbortController): Promise<VerifyOutcome> {
		const onProgress = (event: VerifyProgressEvent) => {
			if (controllerRef.current === controller) dispatch({ type: 'progress', event });
		};
		return verifyWithFallback(content, onProgress, controller.signal);
	}

	async function handleSubmit(content: string) {
		controllerRef.current?.abort();
		const controller = new AbortController();
		controllerRef.current = controller;
		dispatch({ type: 'start' });
		try {
			const recordId = await fetchRecordKey(content, controller.signal);
			if (controllerRef.current !== controller) return;
			if (controller.signal.aborted) throw new ApiFailure('cancelled');
			if (recordId) {
				navigate(recordUrlPath(recordId), { state: { [PENDING_CONTENT_KEY]: content } });
				return;
			}
			const pending = verifyWithProgress(content, controller);
			void fetchEtaSeconds(controller.signal).then((seconds) => {
				if (controllerRef.current === controller) dispatch({ type: 'eta', seconds });
			});
			const outcome = await pending;
			if (controllerRef.current !== controller) return;
			if (outcome.kind === 'record') {
				addToHistory(outcome.record);
				navigate(recordUrlPath(outcome.record.id), { replace: true });
				return;
			}
			dispatch({ type: 'done', outcome });
		} catch (error) {
			if (controllerRef.current !== controller) return;
			const message = error instanceof ApiFailure ? error.message : new ApiFailure('unexpected').message;
			dispatch({ type: 'error', message });
		}
	}

	function handleCancel() {
		controllerRef.current?.abort();
	}

	return (
		<>
			<Hero>
				<CheckForm loading={state.status === 'loading'} onSubmit={handleSubmit} onCancel={handleCancel} />
			</Hero>
			{state.status === 'loading' && <WaitingSteps progress={state.progress} etaSeconds={state.etaSeconds} />}
			<div className="result" ref={resultRef} tabIndex={-1} aria-live="polite">
				{state.status === 'error' && (
					<section className="http-error" role="alert">
						<h2>Nie udało się sprawdzić</h2>
						<p>{state.message}</p>
					</section>
				)}
				{state.status === 'done' && (
					<>
						<h2>Wynik sprawdzenia</h2>
						<OutcomeView outcome={state.outcome} />
					</>
				)}
			</div>
			{state.status === 'idle' && <HomeSections />}
		</>
	);
}
