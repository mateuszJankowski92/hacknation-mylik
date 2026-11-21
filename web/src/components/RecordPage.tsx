import { useEffect, useState } from 'react';
import type { VerificationRecord } from '../../../src/contracts/record';
import { ApiFailure, fetchRecord } from '../api';
import { RecordView } from './RecordView';

type RecordState =
	| { status: 'loading' }
	| { status: 'ready'; record: VerificationRecord }
	| { status: 'error'; message: string };

export function RecordPage({ id }: { id: string }) {
	const [state, setState] = useState<RecordState>({ status: 'loading' });

	useEffect(() => {
		const controller = new AbortController();
		setState({ status: 'loading' });
		fetchRecord(id, controller.signal).then(
			(record) => setState({ status: 'ready', record }),
			(error: unknown) => {
				if (controller.signal.aborted) return;
				const message = error instanceof ApiFailure ? error.message : new ApiFailure('unexpected').message;
				setState({ status: 'error', message });
			},
		);
		return () => controller.abort();
	}, [id]);

	return (
		<div>
			<h2>Zapisane sprawdzenie</h2>
			<div role="status" aria-live="polite">
				{state.status === 'loading' && <p>Wczytuję…</p>}
			</div>
			{state.status === 'error' && (
				<section className="http-error" role="alert">
					<p>{state.message}</p>
				</section>
			)}
			{state.status === 'ready' && <RecordView record={state.record} />}
		</div>
	);
}
