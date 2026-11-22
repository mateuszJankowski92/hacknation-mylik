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
export function NotifyDummy() {
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
				{nb(NOTIFY_TEXTS.invite)}
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

export function CaseNotice({ record }: { record: VerificationRecord }) {
	const [state, setState] = useState<{ sentence: string; status: CasePublicStatus } | null>(null);
	const relevant = hasNoEvidenceClaim(record);

	useEffect(() => {
		if (!relevant) {
			setState(null);
			return;
		}
		const controller = new AbortController();
		void fetchCaseStatus(record.id, controller.signal).then((status) => {
			if (controller.signal.aborted || !status) return;
			const sentence = casePublicSentencePl(status.status, status.forwardedAt ? formatDate(status.forwardedAt) : undefined);
			setState(sentence ? { sentence, status: status.status } : null);
		});
		return () => controller.abort();
	}, [record.id, relevant]);

	if (!relevant || !state) return null;
	return (
		<div className="case-notice">
			<p className="case-notice__text" role="status">
				{nb(state.sentence)}
			</p>
			{state.status === 'zapisano' && <NotifyDummy />}
		</div>
	);
}
