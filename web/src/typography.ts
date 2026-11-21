const NO_BREAK_SPACE = '\u00a0';
const SINGLE_LETTER_WORD = /(?<=^|[\s(„"'‘“])([aiouwzAIOUWZ])[ \t]+(?=\S)/gu;

export function nb(text: string): string {
	return text.replace(SINGLE_LETTER_WORD, `$1${NO_BREAK_SPACE}`);
}

export function plain(text: string): string {
	return text.replaceAll(NO_BREAK_SPACE, ' ');
}
