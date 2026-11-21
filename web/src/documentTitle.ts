import { useEffect } from 'react';

export const BASE_TITLE = 'Mylik';
const QUESTION_TITLE_CHARS = 60;

export function shortQuestion(text: string): string {
	const clean = text.replace(/\s+/gu, ' ').trim();
	return clean.length > QUESTION_TITLE_CHARS ? `${clean.slice(0, QUESTION_TITLE_CHARS - 1).trimEnd()}…` : clean;
}

export function resultTitle(question: string): string {
	const short = shortQuestion(question);
	return short ? `Wynik sprawdzenia: „${short}” - ${BASE_TITLE}` : `Wynik sprawdzenia - ${BASE_TITLE}`;
}

export function useDocumentTitle(title: string): void {
	useEffect(() => {
		document.title = title;
		return () => {
			document.title = BASE_TITLE;
		};
	}, [title]);
}
