import { sameShowcaseInput } from '../../src/shared/showcaseText';
import { DEFAULT_ROLE } from './roles/config';
import { describeAddress } from './components/SheetQuestion';
import type { ExampleQuery } from './components/exampleSubmissions';

export const SHOWCASE_META_NAME = 'mylik-pokaz';
export const SHOWCASE_READY_PARAM = 'gotowy';
export const SHOWCASE_EXAMPLES_SHOWN = 4;
export const SHOWCASE_MIN_ANSWERED = 2;

export const SHOWCASE_TEXTS = {
	homeNote:
		'Wersja pokazowa po hackathonie HackNation 2026. Nowych pytań już nie sprawdzam: po wysłaniu pokażę gotowy wynik dla najbliższego z przygotowanych pytań.',
	readyNoteLabel: 'Wersja pokazowa',
	readyNote: 'To gotowy wynik z wersji pokazowej, a nie odpowiedź na Twoje pytanie. Twojego pytania nie sprawdzałem.',
	readyQuestionLabel: 'Pytanie, dla którego jest ten wynik',
	linkLabel: 'Komunikat urzędu',
} as const;

export interface ShowcaseQuestion {
	id: string;
	text: string;
	inputKind: 'tekst' | 'url';
	verdicts: string[];
	answered: boolean;
}

export function isShowcase(): boolean {
	if (typeof document === 'undefined') return false;
	return document.querySelector(`meta[name="${SHOWCASE_META_NAME}"]`)?.getAttribute('content') === '1';
}

export function isReadyResultUrl(search: string): boolean {
	return new URLSearchParams(search).get(SHOWCASE_READY_PARAM) === '1';
}

export function readyResultPath(path: string): string {
	return `${path}?${SHOWCASE_READY_PARAM}=1`;
}

export function differsFromTyped(typed: string, maskedInput: string): boolean {
	return !sameShowcaseInput(typed, maskedInput);
}

type Random = () => number;

function shuffle<T>(items: readonly T[], random: Random): T[] {
	const copy = [...items];
	for (let index = copy.length - 1; index > 0; index--) {
		const other = Math.min(index, Math.floor(random() * (index + 1)));
		[copy[index], copy[other]] = [copy[other]!, copy[index]!];
	}
	return copy;
}

function toExample(question: ShowcaseQuestion): ExampleQuery {
	if (question.inputKind === 'url') {
		const domain = describeAddress(question.text)?.domain;
		const label = domain ? `${SHOWCASE_TEXTS.linkLabel} (${domain})` : SHOWCASE_TEXTS.linkLabel;
		return { id: question.id, kind: 'link', role: DEFAULT_ROLE, label, text: question.text };
	}
	return { id: question.id, kind: 'biala_plama', role: DEFAULT_ROLE, label: question.text, text: question.text };
}

export function pickShowcaseExamples(questions: readonly ShowcaseQuestion[], random: Random = Math.random): ExampleQuery[] {
	const link = shuffle(questions.filter((question) => question.inputKind === 'url'), random)[0];
	const texts = shuffle(questions.filter((question) => question.inputKind !== 'url'), random);
	const answered = texts.filter((question) => question.answered);
	const chosen: ShowcaseQuestion[] = link ? [link] : [];
	const needAnswered = Math.max(0, SHOWCASE_MIN_ANSWERED - chosen.filter((question) => question.answered).length);
	for (const question of answered.slice(0, needAnswered)) chosen.push(question);
	for (const question of texts) {
		if (chosen.length >= SHOWCASE_EXAMPLES_SHOWN) break;
		if (!chosen.includes(question)) chosen.push(question);
	}
	return shuffle(chosen, random).map(toExample);
}
