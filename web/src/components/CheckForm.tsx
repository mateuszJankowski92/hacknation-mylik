import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { MAX_INPUT_LENGTH, validateContent } from '../api';
import { nb } from '../typography';
import { isSubmitShortcut, submitShortcutHint } from './shortcut';

const COUNTER_THRESHOLD = Math.floor(MAX_INPUT_LENGTH * 0.8);

interface CheckFormProps {
	loading: boolean;
	onSubmit: (content: string) => void;
	onCancel: () => void;
}

export function CheckForm({ loading, onSubmit, onCancel }: CheckFormProps) {
	const [content, setContent] = useState('');
	const validity = validateContent(content);
	const tooLong = validity === 'too_long';
	const blocked = validity !== 'ok' || loading;
	const showCounter = content.length >= COUNTER_THRESHOLD;
	const [shortcutHint] = useState(submitShortcutHint);

	function handleSubmit(event: FormEvent) {
		event.preventDefault();
		if (blocked) return;
		onSubmit(content);
	}

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		if (!isSubmitShortcut({ key: event.key, metaKey: event.metaKey, ctrlKey: event.ctrlKey, isComposing: event.nativeEvent.isComposing })) return;
		event.preventDefault();
		if (blocked) return;
		onSubmit(content);
	}

	return (
		<form className="check-form" onSubmit={handleSubmit} noValidate>
			<label htmlFor="content" className="check-form__label">
				Wklej informację lub link
			</label>
			<div className="check-form__field">
				<textarea
					id="content"
					name="content"
					rows={3}
					value={content}
					onChange={(event) => setContent(event.target.value)}
					onKeyDown={handleKeyDown}
					aria-keyshortcuts="Control+Enter Meta+Enter"
					aria-describedby="content-counter content-error"
					aria-invalid={tooLong}
					autoComplete="off"
				/>
			</div>
			<p id="content-counter" className={tooLong ? 'check-form__counter check-form__counter--over' : 'check-form__counter'}>
				{showCounter && nb(`Znaków: ${content.length} z ${MAX_INPUT_LENGTH}`)}
			</p>
			<p id="content-error" className="check-form__error" role={tooLong ? 'alert' : undefined}>
				{tooLong && nb(`Treść jest za długa. Skróć ją o ${content.length - MAX_INPUT_LENGTH} znaków.`)}
			</p>
			<div className="check-form__actions">
				<button type="submit" className="button button--primary" disabled={blocked}>
					Sprawdź
				</button>
				{shortcutHint && !loading && (
					<span className="check-form__hint" aria-hidden="true">
						{shortcutHint}
					</span>
				)}
				{loading && (
					<button type="button" className="button" onClick={onCancel}>
						Anuluj
					</button>
				)}
			</div>
			<p className="check-form__status" role="status" aria-live="polite">
				{loading ? 'Sprawdzam…' : ''}
			</p>
		</form>
	);
}
