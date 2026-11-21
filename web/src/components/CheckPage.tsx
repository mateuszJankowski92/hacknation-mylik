import { useEffect, useReducer, useRef } from 'react';
import type { VerifyOutcome } from '../../../src/contracts/record';
import { ApiFailure, verifyContent } from '../api';
import { CheckForm } from './CheckForm';
import { OutcomeView } from './OutcomeView';

type CheckState =
	| { status: 'idle' }
	| { status: 'loading' }
	| { status: 'done'; outcome: VerifyOutcome }
	| { status: 'error'; message: string };

type CheckAction =
	| { type: 'start' }
	| { type: 'done'; outcome: VerifyOutcome }
	| { type: 'error'; message: string };

function reducer(_state: CheckState, action: CheckAction): CheckState {
	switch (action.type) {
		case 'start':
			return { status: 'loading' };
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

	async function handleSubmit(content: string) {
		controllerRef.current?.abort();
		const controller = new AbortController();
		controllerRef.current = controller;
		dispatch({ type: 'start' });
		try {
			const outcome = await verifyContent(content, controller.signal);
			if (controllerRef.current !== controller) return;
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
			<CheckForm loading={state.status === 'loading'} onSubmit={handleSubmit} onCancel={handleCancel} />
			<div className="result" ref={resultRef} tabIndex={-1} aria-live="polite">
				{state.status === 'error' && (
					<section className="http-error" role="alert">
						<h2>Nie udało się wykonać sprawdzenia</h2>
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
		</>
	);
}
