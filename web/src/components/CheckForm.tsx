import { useState, type FormEvent } from 'react';
import { MAX_INPUT_LENGTH, validateContent } from '../api';

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

	function handleSubmit(event: FormEvent) {
		event.preventDefault();
		if (blocked) return;
		onSubmit(content);
	}

	return (
		<form className="check-form" onSubmit={handleSubmit} noValidate>
			<label htmlFor="content" className="check-form__label">
				Wklej treść lub link do informacji, którą chcesz sprawdzić
			</label>
			<textarea
				id="content"
				name="content"
				rows={6}
				value={content}
				onChange={(event) => setContent(event.target.value)}
				aria-describedby="content-counter content-error"
				aria-invalid={tooLong}
				autoComplete="off"
			/>
			<p id="content-counter" className={tooLong ? 'check-form__counter check-form__counter--over' : 'check-form__counter'}>
				Znaków: {content.length} z {MAX_INPUT_LENGTH}
			</p>
			<p id="content-error" className="check-form__error" role={tooLong ? 'alert' : undefined}>
				{tooLong && `Treść jest za długa. Skróć ją o ${content.length - MAX_INPUT_LENGTH} znaków.`}
			</p>
			<div className="check-form__actions">
				<button type="submit" className="button button--primary" disabled={blocked}>
					Sprawdź
				</button>
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
