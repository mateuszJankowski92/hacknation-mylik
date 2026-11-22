import { useEffect, useId, useState, type FormEvent } from 'react';
import { casePublicSentencePl } from '../../../src/cases/texts';
import type { VerificationRecord } from '../../../src/contracts/record';
import type { CasePublicStatus } from '../../../src/cases/types';
import { fetchCaseStatus } from '../api';
import { formatDate } from '../format';
import { nb } from '../typography';
import './notify.css';

export const NOTIFY_TEXTS = {
	invite: 'Chcesz dostać wiadomość, gdy się pojawi? Zostaw e-mail:',
	neutralInvite: 'Chcesz dostać wiadomość, gdy pojawi się oficjalny komunikat w tej sprawie? Zostaw e-mail:',
	submit: 'Powiadom mnie',
	invalid: 'Ten adres wygląda na niepełny. Sprawdź, czy ma znak @ i domenę, np. imie@poczta.pl.',
	prototype: 'Prototyp',
	confirmation: 'Tak będzie działać powiadomienie. W prototypie nie zapisaliśmy Twojego adresu i niczego nie wyślemy.',
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmailLike(value: string): boolean {
	return EMAIL_PATTERN.test(value.trim());
}

export function hasNoEvidenceClaim(record: VerificationRecord): boolean {
	return record.claims.some((result) => result.verdict === 'brak_wystarczajacych_dowodow');
}

/** Atrapa powiadomienia: adres nie opuszcza tego komponentu (bez sieci, bez localStorage). */
export function NotifyDummy({ invite = NOTIFY_TEXTS.invite }: { invite?: string }) {
	const inputId = useId();
	const errorId = useId();
	const [value, setValue] = useState('');
	const [error, setError] = useState(false);
	const [done, setDone] = useState(false);

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!isEmailLike(value)) {
			setError(true);
			return;
		}
		setError(false);
		setValue('');
		setDone(true);
	}

	if (done) {
		return (
			<p className="notify notify--done" role="status">
				<span className="notify__badge">{NOTIFY_TEXTS.prototype}</span> {nb(NOTIFY_TEXTS.confirmation)}
			</p>
		);
	}

	return (
		<form className="notify" onSubmit={submit} noValidate>
			<label className="notify__invite" htmlFor={inputId}>
				{nb(invite)}
			</label>
			<div className="notify__row">
				<div className="notify__field">
					<input
						id={inputId}
						type="email"
						name="email"
						inputMode="email"
						autoComplete="email"
						aria-invalid={error ? 'true' : undefined}
						aria-describedby={errorId}
						value={value}
						onChange={(event) => {
							setValue(event.target.value);
							if (error && isEmailLike(event.target.value)) setError(false);
						}}
					/>
				</div>
				<button type="submit" className="button notify__submit">
					{NOTIFY_TEXTS.submit}
				</button>
			</div>
			<p id={errorId} className="notify__error" aria-live="polite">
				{error ? nb(NOTIFY_TEXTS.invalid) : ''}
			</p>
		</form>
	);
}

type CaseLoad = { loaded: false } | { loaded: true; sentence: string | null; status: CasePublicStatus | null };

export function CaseNotice({ record }: { record: VerificationRecord }) {
	const [state, setState] = useState<CaseLoad>({ loaded: false });
	const relevant = hasNoEvidenceClaim(record);

	useEffect(() => {
		setState({ loaded: false });
		if (!relevant) return;
		const controller = new AbortController();
		void fetchCaseStatus(record.id, controller.signal).then((status) => {
			if (controller.signal.aborted) return;
			if (!status) {
				setState({ loaded: true, sentence: null, status: null });
				return;
			}
			const sentence = casePublicSentencePl(status.status, status.forwardedAt ? formatDate(status.forwardedAt) : undefined);
			setState({ loaded: true, sentence, status: status.status });
		});
		return () => controller.abort();
	}, [record.id, relevant]);

	if (!relevant || !state.loaded) return null;
	const saved = state.status === 'zapisano';
	return (
		<div className="case-notice">
			{state.sentence && (
				<p className="case-notice__text" role="status">
					{nb(state.sentence)}
				</p>
			)}
			<NotifyDummy invite={saved ? NOTIFY_TEXTS.invite : NOTIFY_TEXTS.neutralInvite} />
		</div>
	);
}
