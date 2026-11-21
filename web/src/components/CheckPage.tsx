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
import { predictedRole, recordRoleOf } from '../roles/appearance';
import { currentForcedRole, currentRole } from '../roles/resolve';
import { rememberRecord } from '../recordCache';
import { useShownMark, useStage } from '../stage/StageContext';
import { OutcomeView } from './OutcomeView';
import { nb } from '../typography';

type CheckState =
	| { status: 'idle' }
	| { status: 'loading'; progress: ProgressState; etaSeconds: number }
	| { status: 'done'; outcome: VerifyOutcome; progress: ProgressState; etaSeconds: number }
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
			return {
				status: 'done',
				outcome: action.outcome,
				progress: state.status === 'loading' ? state.progress : INITIAL_PROGRESS,
				etaSeconds: state.status === 'loading' ? state.etaSeconds : DEFAULT_ETA_SECONDS,
			};
		case 'error':
			return { status: 'error', message: action.message };
	}
}

export function CheckPage() {
	const [state, dispatch] = useReducer(reducer, { status: 'idle' });
	const controllerRef = useRef<AbortController | null>(null);
	const resultRef = useRef<HTMLDivElement>(null);
	const fromCheckRef = useRef(false);
	const stage = useStage();
	const showResult = state.status === 'done';
	const waiting = state.status === 'loading';
	useShownMark(state.status === 'done' && !(fromCheckRef.current && state.outcome.kind === 'record'));

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
		if (showResult || state.status === 'error') resultRef.current?.focus();
	}, [state.status, showResult]);

	useEffect(() => {
		if (!showResult || state.status !== 'done' || !fromCheckRef.current) return;
		if (state.outcome.kind !== 'record') return;
		addToHistory(state.outcome.record);
		navigate(recordUrlPath(state.outcome.record.id), { replace: true });
	}, [showResult, state]);

	useEffect(() => () => controllerRef.current?.abort(), []);

	function verifyWithProgress(content: string, controller: AbortController): Promise<VerifyOutcome> {
		const onProgress = (event: VerifyProgressEvent) => {
			if (controllerRef.current === controller) dispatch({ type: 'progress', event });
		};
		return verifyWithFallback(content, onProgress, controller.signal);
	}

	async function handleSubmit(content: string) {
		controllerRef.current?.abort();
		fromCheckRef.current = false;
		const controller = new AbortController();
		controllerRef.current = controller;
		dispatch({ type: 'start' });
		stage.begin(currentForcedRole() ?? predictedRole(content));
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
			fromCheckRef.current = true;
			if (outcome.kind === 'record') rememberRecord(outcome.record);
			stage.resolve(outcome.kind === 'record' ? currentRole(recordRoleOf(outcome.record)) : null, outcome.kind === 'record' ? outcome.record.id : null);
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

	const heroArt =
		(state.status === 'loading' || state.status === 'done') && waiting ? (
			<WaitingSteps layout="hero" role={stage.waitingRole} progress={state.progress} etaSeconds={state.etaSeconds} />
		) : state.status === 'idle' || state.status === 'error' ? undefined : null;

	return (
		<>
			<Hero role={currentForcedRole() ?? undefined} art={heroArt}>
				<CheckForm loading={state.status === 'loading'} onSubmit={handleSubmit} onCancel={handleCancel} />
			</Hero>
			<div
				className="result"
				ref={resultRef}
				tabIndex={-1}
				aria-live="polite"
				data-engine-ms={showResult ? stage.timing?.engineMs : undefined}
				data-shown-ms={showResult ? stage.timing?.shownMs : undefined}
			>
				{state.status === 'error' && (
					<section className="http-error" role="alert">
						<h2>Nie udało się sprawdzić</h2>
						<p>{nb(state.message)}</p>
					</section>
				)}
				{showResult && state.status === 'done' && !(fromCheckRef.current && state.outcome.kind === 'record') && (
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
