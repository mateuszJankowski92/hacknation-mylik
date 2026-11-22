import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { MAX_INPUT_LENGTH, validateContent } from '../api';
import { nb } from '../typography';
import { isSubmitShortcut, submitShortcutHint } from './shortcut';

const COUNTER_THRESHOLD = Math.floor(MAX_INPUT_LENGTH * 0.8);
const DRAFT_SAVE_DELAY_MS = 300;

interface CheckFormProps {
	loading: boolean;
	onSubmit: (content: string) => void;
	initialContent?: string;
	focusOnMount?: boolean;
	onDraftChange?: (content: string) => void;
	fill?: { id: number; text: string } | null;
}

export function CheckForm({ loading, onSubmit, initialContent = '', focusOnMount = false, onDraftChange, fill = null }: CheckFormProps) {
	const [content, setContent] = useState(initialContent);
	const fieldRef = useRef<HTMLTextAreaElement>(null);
	const savedRef = useRef(initialContent);
	const validity = validateContent(content);
	const tooLong = validity === 'too_long';
	const blocked = validity !== 'ok' || loading;
	const showCounter = content.length >= COUNTER_THRESHOLD;
	const [shortcutHint] = useState(submitShortcutHint);

	useEffect(() => {
		if (!focusOnMount) return;
		const field = fieldRef.current;
		if (!field) return;
		field.focus();
		field.setSelectionRange(field.value.length, field.value.length);
	}, [focusOnMount]);

	useEffect(() => {
		if (!fill) return;
		setContent(fill.text);
		const field = fieldRef.current;
		if (!field) return;
		field.focus();
		field.setSelectionRange(fill.text.length, fill.text.length);
	}, [fill]);

	function saveDraft(next: string) {
		if (!onDraftChange || savedRef.current === next) return;
		savedRef.current = next;
		onDraftChange(next);
	}

	useEffect(() => {
		if (!onDraftChange) return;
		const timer = setTimeout(() => saveDraft(content), DRAFT_SAVE_DELAY_MS);
		return () => clearTimeout(timer);
	}, [content]);

	function submit() {
		if (blocked) return;
		saveDraft(content);
		onSubmit(content);
	}

	function handleSubmit(event: FormEvent) {
		event.preventDefault();
		submit();
	}

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		if (!isSubmitShortcut({ key: event.key, metaKey: event.metaKey, ctrlKey: event.ctrlKey, isComposing: event.nativeEvent.isComposing })) return;
		event.preventDefault();
		submit();
	}

	return (
		<form className="check-form" onSubmit={handleSubmit} noValidate aria-busy={loading}>
			<label htmlFor="content" className="check-form__label">
				Wklej informację lub link
			</label>
			<div className="check-form__field">
				<textarea
					id="content"
					name="content"
					ref={fieldRef}
					rows={3}
					value={content}
					readOnly={loading}
					onChange={(event) => setContent(event.target.value)}
					onBlur={() => saveDraft(content)}
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
			</div>
			<p className="check-form__status" role="status" aria-live="polite" />
		</form>
	);
}
