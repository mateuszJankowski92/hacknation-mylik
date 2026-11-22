import { useId, useLayoutEffect, useRef, useState } from 'react';
import { nb } from '../typography';

export const QUESTION_TEXTS = {
	label: 'Twoje pytanie',
	expand: 'Pokaż całe pytanie',
	collapse: 'Zwiń pytanie',
} as const;

const SHORT_ADDRESS_CHARS = 56;

export interface QuestionAddress {
	domain: string;
	shortAddress: string;
	fullAddress: string;
}

function decodeAddress(value: string): string {
	try {
		return decodeURI(value);
	} catch {
		return value.replace(/%[0-9a-f]{2}/giu, (escaped) => {
			try {
				return decodeURIComponent(escaped);
			} catch {
				return escaped;
			}
		});
	}
}

export function describeAddress(text: string): QuestionAddress | null {
	const trimmed = text.trim();
	if (!/^https?:\/\/\S+$/iu.test(trimmed)) return null;
	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		return null;
	}
	const domain = url.hostname.replace(/^www\./iu, '');
	const path = decodeAddress(`${url.pathname === '/' ? '' : url.pathname}${url.search}`).replace(/\/$/u, '');
	const short = path.length > SHORT_ADDRESS_CHARS ? `${path.slice(0, SHORT_ADDRESS_CHARS - 1).trimEnd()}…` : path;
	return { domain, shortAddress: short, fullAddress: decodeAddress(trimmed) };
}

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
	const address = describeAddress(text);
	if (address) return <AddressQuestion address={address} />;
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

function AddressQuestion({ address }: { address: QuestionAddress }) {
	const [expanded, setExpanded] = useState(false);
	const labelId = useId();
	const textId = useId();
	const shortened = address.shortAddress.endsWith('…');
	return (
		<section className="sheet-question sheet-question--address" aria-labelledby={labelId}>
			<p id={labelId} className="sheet-question__label">
				{QUESTION_TEXTS.label}
			</p>
			<p className="sheet-question__domain">{address.domain}</p>
			<p id={textId} className="sheet-question__text sheet-question__text--address" data-expanded={expanded ? 'true' : 'false'}>
				{expanded ? address.fullAddress : address.shortAddress}
			</p>
			{(shortened || expanded) && (
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
