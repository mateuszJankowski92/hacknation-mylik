// Znaki niewidoczne: formatujące (zero-width, bidi, znaczniki Unicode), miękki dywiz, łącznik
// grafemów, wypełniacze Hangul i selektory wariantów (używane do ukrywania treści).
const ZERO_WIDTH_AND_FORMAT = /[\p{Cf}\u00AD\u034F\u115F\u1160\u3164\uFFA0\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/gu;
const CONTROL_EXCEPT_NEWLINE = /[\p{Cc}]/gu;
const HORIZONTAL_SPACE = /[^\S\n]+/gu;
const TRAILING_PUNCTUATION = new Set(['.', ',', ';', ':', '!', '?', '…']);
const SPACE_BEFORE_PUNCTUATION = / +([.,;:!?])/gu;

export function cleanText(raw: string): string {
	// NFKC: znaki o wyglądzie liter (pełna szerokość, ligatury, indeksy) do postaci zwykłej.
	const unified = raw.normalize('NFKC').replace(/\r\n?/g, '\n').replace(/[\t\f\v]/g, ' ');
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

// Znaki typograficzne, które klawiatury, telefony i bramki SMS zamieniają różnie (cudzysłowy,
// apostrofy, myślniki, wielokropek): w kluczu jedna postać, żeby ta sama treść z WWW i z SMS
// trafiała w ten sam zapisany rekord.
const QUOTES = /[\u0022\u0027\u0060\u00AB\u00BB\u2018-\u201F\u2032\u2033\u2039\u203A\u275B-\u275E\u301D-\u301F\uFF02\uFF07]/gu;
const DASHES = /[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/gu;
const REPEATED_PUNCTUATION = /([.,;:!?])\1+/gu;
const SPACE_AROUND_DASH = / ?- ?/gu;

/**
 * Postać bez znaków diakrytycznych (ł -> l). Bramki SMS i telefony często wysyłają tekst bez
 * polskich znaków (alfabet GSM-7), więc klucz rekordu nie może od nich zależeć.
 */
export function foldDiacritics(value: string): string {
	return value
		.normalize('NFD')
		.replace(/\p{M}+/gu, '')
		.replace(/ł/g, 'l')
		.replace(/Ł/g, 'L')
		.normalize('NFC');
}

/**
 * Klucz porównania treści (część klucza rekordu). Niezależny od kanału i od formatowania:
 * wielkość liter, białe znaki i nowe wiersze, znaki niewidoczne (już w cleanText), polskie znaki,
 * rodzaj cudzysłowów i myślników, powtórzona i końcowa interpunkcja.
 */
export function normalizeForKey(cleaned: string): string {
	const singleLine = cleaned.replace(/\n/g, ' ').replace(HORIZONTAL_SPACE, ' ');
	const lowered = foldDiacritics(singleLine.normalize('NFKC').toLocaleLowerCase('pl'));
	const typography = lowered
		.replace(QUOTES, '')
		.replace(DASHES, '-')
		.replace(SPACE_AROUND_DASH, ' - ')
		.replace(REPEATED_PUNCTUATION, '$1')
		.replace(HORIZONTAL_SPACE, ' ');
	const tightened = typography.replace(SPACE_BEFORE_PUNCTUATION, '$1').trim();
	return stripTrailingPunctuation(tightened).trim();
}

export function countLetters(value: string): number {
	let count = 0;
	for (const char of value) {
		if (/\p{L}/u.test(char)) count++;
	}
	return count;
}
