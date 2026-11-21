import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import type { VerifyOutcome } from '../../../src/contracts/record';
import { ApiFailure, DEFAULT_ETA_SECONDS, fetchEtaSeconds, verifyWithFallback } from '../api';
import { BASE_TITLE, useDocumentTitle } from '../documentTitle';
import { addToHistory } from '../history';
import { navigate, readDraft, readFocusField, recordUrlPath, rememberDraft } from '../route';
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

export const WAITING_TITLE = `Sprawdzam… - ${BASE_TITLE}`;

type CheckState =
	| { status: 'idle' }
	| { status: 'loading'; progress: ProgressState; etaSeconds: number }
	| { status: 'notice'; outcome: VerifyOutcome }
	| { status: 'error'; message: string };

type CheckAction =
	| { type: 'start' }
	| { type: 'progress'; event: VerifyProgressEvent }
	| { type: 'eta'; seconds: number }
	| { type: 'notice'; outcome: VerifyOutcome }
	| { type: 'error'; message: string };

function reducer(state: CheckState, action: CheckAction): CheckState {
	switch (action.type) {
		case 'start':
			return { status: 'loading', progress: INITIAL_PROGRESS, etaSeconds: DEFAULT_ETA_SECONDS };
		case 'progress':
			return state.status === 'loading' ? { ...state, progress: reduceProgress(state.progress, action.event) } : state;
		case 'eta':
			return state.status === 'loading' ? { ...state, etaSeconds: action.seconds } : state;
		case 'notice':
			return { status: 'notice', outcome: action.outcome };
		case 'error':
			return { status: 'error', message: action.message };
	}
}

export function CheckPage() {
	const [state, dispatch] = useReducer(reducer, { status: 'idle' });
	const [initialDraft] = useState(readDraft);
	const [focusField] = useState(readFocusField);
	const controllerRef = useRef<AbortController | null>(null);
	const resultRef = useRef<HTMLDivElement>(null);
	const stage = useStage();
	const waiting = state.status === 'loading';
	const showsNotice = state.status === 'notice';
	useShownMark(showsNotice);
	useDocumentTitle(waiting ? WAITING_TITLE : BASE_TITLE);

	useEffect(() => {
		if (!import.meta.env.DEV) return;
		const name = new URLSearchParams(window.location.search).get('fixture');
		if (!name) return;
		void import('../fixtures/outcomes').then(({ FIXTURE_OUTCOMES }) => {
			const outcome = FIXTURE_OUTCOMES[name];
			if (!outcome) return;
			if (outcome.kind === 'record') {
				rememberRecord(outcome.record);
				stage.begin(currentRole(recordRoleOf(outcome.record)));
				stage.resolve(currentRole(recordRoleOf(outcome.record)), outcome.record.id);
				navigate(recordUrlPath(outcome.record.id), { replace: true });
				return;
			}
			stage.begin(currentForcedRole() ?? undefined);
			stage.resolve(null, null);
			dispatch({ type: 'notice', outcome });
		});
	}, []);

	useEffect(() => {
		const container = resultRef.current;
		if (!container || (!showsNotice && state.status !== 'error')) return;
		const heading = container.querySelector<HTMLElement>('[data-result-heading]');
		(heading ?? container).focus();
	}, [state.status, showsNotice]);

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
		stage.begin(currentForcedRole() ?? predictedRole(content));
		try {
			const pending = verifyWithProgress(content, controller);
			void fetchEtaSeconds(controller.signal).then((seconds) => {
				if (controllerRef.current === controller) dispatch({ type: 'eta', seconds });
			});
			const outcome = await pending;
			if (controllerRef.current !== controller) return;
			if (outcome.kind === 'record') {
				rememberRecord(outcome.record);
				addToHistory(outcome.record);
				stage.resolve(currentRole(recordRoleOf(outcome.record)), outcome.record.id);
				rememberDraft(content);
				navigate(recordUrlPath(outcome.record.id));
				return;
			}
			stage.resolve(null, null);
			dispatch({ type: 'notice', outcome });
		} catch (error) {
			if (controllerRef.current !== controller) return;
			const message = error instanceof ApiFailure ? error.message : new ApiFailure('unexpected').message;
			dispatch({ type: 'error', message });
		}
	}

	function handleCancel() {
		controllerRef.current?.abort();
	}

	let heroArt: ReactNode | null | undefined;
	if (state.status === 'loading') heroArt = <WaitingSteps layout="hero" role={stage.waitingRole} progress={state.progress} etaSeconds={state.etaSeconds} />;
	else if (state.status === 'notice') heroArt = null;

	return (
		<>
			<Hero role={currentForcedRole() ?? undefined} art={heroArt}>
				<div className="hero__panel">
					<div
						className="result"
						ref={resultRef}
						tabIndex={-1}
						data-engine-ms={showsNotice ? stage.timing?.engineMs : undefined}
						data-shown-ms={showsNotice ? stage.timing?.shownMs : undefined}
					>
						{state.status === 'error' && (
							<section className="http-error" role="alert">
								<h2 tabIndex={-1} data-result-heading>
									Nie udało się sprawdzić
								</h2>
								<p>{nb(state.message)}</p>
							</section>
						)}
						{state.status === 'notice' && <OutcomeView outcome={state.outcome} />}
					</div>
					<CheckForm
						loading={waiting}
						onSubmit={handleSubmit}
						onCancel={handleCancel}
						initialContent={initialDraft}
						focusOnMount={focusField}
						onDraftChange={rememberDraft}
					/>
				</div>
			</Hero>
			{state.status === 'idle' && <HomeSections />}
		</>
	);
}
