import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import type { VerifyOutcome } from '../../../src/contracts/record';
import { ApiFailure, verifyWithFallback } from '../api';
import { BASE_TITLE, useDocumentTitle } from '../documentTitle';
import { addToHistory } from '../history';
import { navigate, readDraft, readFocusField, recordUrlPath, rememberDraft } from '../route';
import { INITIAL_PROGRESS, reduceProgress, type WaitingEvent, type ProgressState } from '../visuals/progress';
import { WAITING_TIMING } from '../visuals/waitingConfig';
import { WaitingSteps } from '../visuals/WaitingSteps';
import type { VerificationRecord } from '../../../src/contracts/record';
import { CheckForm } from './CheckForm';
import { HERO_PAGE_TITLE } from './heroCopy';
import { Hero } from './Hero';
import { HomeSections } from './HomeSections';
import { ExampleQueries } from './ExampleQueries';
import { predictedRole, recordRoleOf } from '../roles/appearance';
import { currentForcedRole, currentRole } from '../roles/resolve';
import { rememberRecord } from '../recordCache';
import { animationStartsAutomatically } from '../scenes/preferences';
import { useShownMark, useStage } from '../stage/StageContext';
import { OutcomeView } from './OutcomeView';
import { nb } from '../typography';

export const WAITING_TITLE = `Sprawdzam… - ${BASE_TITLE}`;
export const READY_TITLE = `Wynik gotowy - ${BASE_TITLE}`;

type CheckState =
	| { status: 'idle' }
	| { status: 'loading'; progress: ProgressState; ready: boolean; record: VerificationRecord | null; cached: boolean }
	| { status: 'notice'; outcome: VerifyOutcome }
	| { status: 'error'; message: string };

type CheckAction =
	| { type: 'start' }
	| { type: 'progress'; event: WaitingEvent }
	| { type: 'outcome'; record: VerificationRecord; cached: boolean }
	| { type: 'ready' }
	| { type: 'notice'; outcome: VerifyOutcome }
	| { type: 'error'; message: string };

function reducer(state: CheckState, action: CheckAction): CheckState {
	switch (action.type) {
		case 'start':
			return { status: 'loading', progress: INITIAL_PROGRESS, ready: false, record: null, cached: false };
		case 'progress':
			return state.status === 'loading' ? { ...state, progress: reduceProgress(state.progress, action.event) } : state;
		case 'outcome':
			return state.status === 'loading' ? { ...state, record: action.record, cached: action.cached } : state;
		case 'ready':
			return state.status === 'loading' ? { ...state, ready: true } : state;
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
	const [fill, setFill] = useState<{ id: number; text: string } | null>(null);
	const controllerRef = useRef<AbortController | null>(null);
	const resultRef = useRef<HTMLDivElement>(null);
	const holdTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const showReadyRef = useRef<(() => void) | null>(null);
	const stage = useStage();
	const waiting = state.status === 'loading';
	const showsNotice = state.status === 'notice';
	useShownMark(showsNotice);
	useDocumentTitle(waiting ? (state.ready ? READY_TITLE : WAITING_TITLE) : HERO_PAGE_TITLE);

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

	useEffect(
		() => () => {
			clearTimeout(holdTimerRef.current);
			controllerRef.current?.abort();
		},
		[],
	);

	function clearHold() {
		clearTimeout(holdTimerRef.current);
		holdTimerRef.current = undefined;
		showReadyRef.current = null;
	}

	function verifyWithProgress(content: string, controller: AbortController): Promise<VerifyOutcome> {
		const onProgress = (event: WaitingEvent) => {
			if (controllerRef.current === controller) dispatch({ type: 'progress', event });
		};
		return verifyWithFallback(content, onProgress, controller.signal);
	}

	async function handleSubmit(content: string) {
		controllerRef.current?.abort();
		clearHold();
		const controller = new AbortController();
		controllerRef.current = controller;
		dispatch({ type: 'start' });
		stage.begin(currentForcedRole() ?? predictedRole(content));
		try {
			const outcome = await verifyWithProgress(content, controller);
			if (controllerRef.current !== controller) return;
			if (outcome.kind === 'record') {
				const record = outcome.record;
				const readyAt = Date.now();
				const resultRole = currentRole(recordRoleOf(record));
				const showRecord = () => {
					if (controllerRef.current !== controller) return;
					clearHold();
					rememberRecord(record);
					addToHistory(record);
					stage.resolve(resultRole, record.id, readyAt);
					rememberDraft(content);
					navigate(recordUrlPath(record.id));
				};
				if (!animationStartsAutomatically()) {
					showRecord();
					return;
				}
				dispatch({ type: 'outcome', record, cached: outcome.cached });
				showReadyRef.current = showRecord;
				const markReady = () => {
					if (controllerRef.current !== controller) return;
					dispatch({ type: 'ready' });
					stage.resolve(resultRole, record.id, readyAt);
					holdTimerRef.current = setTimeout(showRecord, WAITING_TIMING.readyHoldMs);
				};
				if (outcome.cached) holdTimerRef.current = setTimeout(markReady, WAITING_TIMING.cachedLineMs);
				else markReady();
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
		const holding = showReadyRef.current !== null;
		clearHold();
		controllerRef.current?.abort();
		if (holding) dispatch({ type: 'error', message: new ApiFailure('cancelled').message });
	}

	const skippable = state.status === 'loading' && state.ready;
	useEffect(() => {
		if (!skippable) return;
		const skip = () => showReadyRef.current?.();
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Enter' || event.key === ' ') skip();
		};
		window.addEventListener('pointerdown', skip);
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('pointerdown', skip);
			window.removeEventListener('keydown', onKey);
		};
	}, [skippable]);

	const heroArt: ReactNode | null | undefined = state.status === 'notice' ? null : undefined;
	const showsHome = state.status === 'idle' || state.status === 'loading';

	return (
		<>
			<div className="check-home" inert={waiting} aria-hidden={waiting ? true : undefined}>
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
							initialContent={initialDraft}
							focusOnMount={focusField}
							onDraftChange={rememberDraft}
							fill={fill}
						/>
					</div>
				</Hero>
				{showsHome && <ExampleQueries onPick={(example) => setFill((current) => ({ id: (current?.id ?? 0) + 1, text: example.text }))} />}
				{showsHome && <HomeSections />}
			</div>
			{state.status === 'loading' && (
				<WaitingSteps
					role={stage.waitingRole}
					progress={state.progress}
					record={state.record}
					cached={state.cached}
					ready={state.ready}
					onCancel={handleCancel}
				/>
			)}
		</>
	);
}
