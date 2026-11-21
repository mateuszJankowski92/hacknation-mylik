const ZERO_WIDTH_AND_FORMAT = /[\p{Cf}\u00AD]/gu;
const CONTROL_EXCEPT_NEWLINE = /[\p{Cc}]/gu;
const HORIZONTAL_SPACE = /[^\S\n]+/gu;
const TRAILING_PUNCTUATION = new Set(['.', ',', ';', ':', '!', '?', '…']);
const SPACE_BEFORE_PUNCTUATION = / +([.,;:!?])/gu;

export function cleanText(raw: string): string {
	const unified = raw.normalize('NFC').replace(/\r\n?/g, '\n').replace(/[\t\f\v]/g, ' ');
	const withoutHidden = unified.replace(ZERO_WIDTH_AND_FORMAT, '');
	const withoutControl = withoutHidden.replace(CONTROL_EXCEPT_NEWLINE, (char) => (char === '\n' ? char : ''));
	const lines = withoutControl
		.replace(HORIZONTAL_SPACE, ' ')
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
	return lines.join('\n').trim();
}

function stripTrailingPunctuation(value: string): string {
	let end = value.length;
	while (end > 0 && (TRAILING_PUNCTUATION.has(value[end - 1]) || value[end - 1] === ' ')) end--;
	return value.slice(0, end);
}

export function normalizeForKey(cleaned: string): string {
	const singleLine = cleaned.replace(/\n/g, ' ').replace(HORIZONTAL_SPACE, ' ');
	const lowered = singleLine.toLocaleLowerCase('pl').normalize('NFC');
	const tightened = lowered.replace(SPACE_BEFORE_PUNCTUATION, '$1');
	return stripTrailingPunctuation(tightened).trim();
}

export function countLetters(value: string): number {
	let count = 0;
	for (const char of value) {
		if (/\p{L}/u.test(char)) count++;
	}
	return count;
}
