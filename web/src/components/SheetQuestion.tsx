import { useId, useLayoutEffect, useRef, useState } from 'react';
import { nb } from '../typography';

export const QUESTION_TEXTS = {
	label: 'Twoje pytanie',
	expand: 'Pokaż całe pytanie',
	collapse: 'Zwiń pytanie',
} as const;

export function SheetQuestion({ text }: { text: string }) {
	const [expanded, setExpanded] = useState(false);
	const [overflowing, setOverflowing] = useState(false);
	const textRef = useRef<HTMLParagraphElement>(null);
	const labelId = useId();
	const textId = useId();

	useLayoutEffect(() => {
		const element = textRef.current;
		if (!element || expanded) return;
		function measure() {
			if (!element) return;
			setOverflowing(element.scrollHeight > element.clientHeight + 1);
		}
		measure();
		if (typeof ResizeObserver !== 'function') return;
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return () => observer.disconnect();
	}, [text, expanded]);

	if (!text.trim()) return null;
	return (
		<section className="sheet-question" aria-labelledby={labelId}>
			<p id={labelId} className="sheet-question__label">
				{QUESTION_TEXTS.label}
			</p>
			<p id={textId} ref={textRef} className="sheet-question__text" data-expanded={expanded ? 'true' : 'false'}>
				{nb(text)}
			</p>
			{(overflowing || expanded) && (
				<button
					type="button"
					className="text-button sheet-question__toggle"
					aria-expanded={expanded}
					aria-controls={textId}
					onClick={() => setExpanded((current) => !current)}
				>
					{expanded ? QUESTION_TEXTS.collapse : QUESTION_TEXTS.expand}
				</button>
			)}
		</section>
	);
}
