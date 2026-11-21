import type { MaskResult } from '../contracts';

// Maskujemy wyłącznie dane o jednoznacznej strukturze (z sumą kontrolną, gdzie istnieje):
// PESEL, NIP, numer dowodu, numery rachunków i kart, telefony, adresy e-mail, adresy IP.
// Imion i nazwisk NIE maskujemy (wskazanie mentora MSZ, 21.11.2026): bez nich zmienia się sens
// pytania i nie da się znaleźć dowodu, a osoby publiczne muszą zostać nazwane. Nie maskujemy też
// niczego, co zmienia sens pytania (np. kwot: "700000000 zł" to nie numer telefonu).
// Funkcja `maskNames` zostaje do świadomego użycia (np. podpis w liście), ale `maskPii` jej nie woła.

interface PiiRule {
	type: string;
	pattern: RegExp;
	isValid: (match: string) => boolean;
}

function digitsOf(value: string): number[] {
	const digits: number[] = [];
	for (const char of value) {
		if (char >= '0' && char <= '9') digits.push(char.charCodeAt(0) - 48);
	}
	return digits;
}

function weightedSum(digits: number[], weights: number[]): number {
	let sum = 0;
	for (let i = 0; i < weights.length; i++) sum += digits[i] * weights[i];
	return sum;
}

export function isValidPesel(value: string): boolean {
	const digits = digitsOf(value);
	if (digits.length !== 11) return false;
	const sum = weightedSum(digits, [1, 3, 7, 9, 1, 3, 7, 9, 1, 3]);
	return (10 - (sum % 10)) % 10 === digits[10];
}

export function isValidNip(value: string): boolean {
	const digits = digitsOf(value);
	if (digits.length !== 10) return false;
	const control = weightedSum(digits, [6, 5, 7, 2, 3, 4, 5, 6, 7]) % 11;
	return control !== 10 && control === digits[9];
}

export function isValidLuhn(value: string): boolean {
	const digits = digitsOf(value);
	if (digits.length < 13 || digits.length > 19) return false;
	let sum = 0;
	let double = false;
	for (let i = digits.length - 1; i >= 0; i--) {
		let digit = digits[i];
		if (double) {
			digit *= 2;
			if (digit > 9) digit -= 9;
		}
		sum += digit;
		double = !double;
	}
	return sum % 10 === 0;
}

export function isValidPolishIban(value: string): boolean {
	const digits = digitsOf(value);
	if (digits.length !== 26) return false;
	// PL = 25 21, przeniesione na koniec razem z cyframi kontrolnymi
	const rearranged = [...digits.slice(2), 2, 5, 2, 1, digits[0], digits[1]];
	let remainder = 0;
	for (const digit of rearranged) remainder = (remainder * 10 + digit) % 97;
	return remainder === 1;
}

export function isValidIdCard(value: string): boolean {
	if (value.length !== 9) return false;
	const values: number[] = [];
	for (let i = 0; i < 9; i++) {
		const code = value.charCodeAt(i);
		if (i < 3) values.push(code - 55);
		else values.push(code - 48);
	}
	const weights = [7, 3, 1, 9, 7, 3, 1, 7, 3];
	let sum = 0;
	for (let i = 0; i < 9; i++) sum += values[i] * weights[i];
	return sum % 10 === 0;
}

function isValidIpv4(value: string): boolean {
	const parts = value.split('.');
	if (parts.length !== 4) return false;
	return parts.every((part) => part.length <= 3 && Number(part) <= 255 && (part === '0' || part[0] !== '0'));
}

function countDigits(value: string): number {
	return digitsOf(value).length;
}

const ALWAYS_VALID = () => true;

const RULES: PiiRule[] = [
	{
		type: 'E-MAIL',
		pattern: /(?<![\p{L}\p{N}._%+-])[\p{L}\p{N}._%+-]{1,64}@[\p{L}\p{N}-]{1,63}(?:\.[\p{L}\p{N}-]{1,63}){1,8}/gu,
		isValid: ALWAYS_VALID,
	},
	{
		type: 'IBAN',
		pattern: /(?<![\p{L}\d])(?:PL ?)?\d{2}(?: ?\d{4}){6}(?!\d)/gu,
		isValid: isValidPolishIban,
	},
	{
		type: 'KARTA',
		pattern: /(?<![\d])\d(?:[ -]?\d){12,18}(?!\d)/g,
		isValid: isValidLuhn,
	},
	{
		type: 'PESEL',
		pattern: /(?<!\d)\d{11}(?!\d)/g,
		isValid: isValidPesel,
	},
	{
		type: 'NIP',
		pattern: /(?<![\d-])(?:\d{10}|\d{3}-\d{3}-\d{2}-\d{2}|\d{3}-\d{2}-\d{2}-\d{3})(?![\d-]\d|\d)/g,
		isValid: isValidNip,
	},
	{
		type: 'TELEFON',
		pattern: /(?<![\p{L}\d])\+\d(?:[ -]?\d){7,14}(?!\d)/gu,
		isValid: (match) => {
			const count = countDigits(match);
			return count >= 8 && count <= 15;
		},
	},
	{
		type: 'TELEFON',
		// Bez kwot i liczebności: po numerze nie stoi jednostka ani waluta ("700000000 zł", "500 000 000 osób").
		pattern: /(?<![\p{L}\d+.,])(?<!\d[ -])(?:00 ?48[ -]?)?[1-9]\d{2}[ -]?\d{3}[ -]?\d{3}(?![ -]?\d)(?![.,]\d)(?!\s*(?:zł|zl|pln|złotych|zlotych|eur|euro|usd|dolar\p{L}*|\$|€|%|osób|osob|ludzi|mieszkańc\p{L}*|mieszkanc\p{L}*|km|kg|ton\p{L}*|szt\p{L}*|głos\p{L}*|glos\p{L}*)(?![\p{L}]))/giu,
		isValid: ALWAYS_VALID,
	},
	{
		type: 'DOWOD',
		pattern: /(?<![\p{L}\d])[A-Z]{3}\d{6}(?![\p{L}\d])/gu,
		isValid: isValidIdCard,
	},
	{
		type: 'ADRES-IP',
		pattern: /(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d]|\.\d)/g,
		isValid: isValidIpv4,
	},
];

const NAME_WORD = String.raw`\p{Lu}\p{Ll}{1,29}(?:-\p{Lu}\p{Ll}{1,29})?`;
const NAME_PHRASE = `${NAME_WORD}(?: ${NAME_WORD})?`;
const NAME_PLACEHOLDER = '[OSOBA]';

const NON_NAME_WORDS = new Set(
	[
		'prezydent', 'prezydencie', 'premier', 'premierze', 'minister', 'ministrze', 'ministerstwo', 'prezes', 'prezesie',
		'dyrektor', 'dyrektorze', 'wójt', 'burmistrz', 'starosta', 'marszałek', 'sędzia', 'sędzio', 'rzecznik', 'poseł',
		'senator', 'komendant', 'prokurator', 'kanclerz', 'wicepremier', 'wiceminister', 'rząd', 'sejm', 'senat', 'urząd',
		'zus', 'nfz', 'gus', 'nik', 'ipn', 'polska', 'polski', 'polskie', 'rzeczpospolita', 'unia', 'komisja', 'rada',
		'sąd', 'szpital', 'uniwersytet', 'fundacja', 'stowarzyszenie', 'spółka', 'bank', 'gmina', 'miasto', 'powiat',
		'województwo', 'warszawa', 'kraków', 'gdańsk', 'wrocław', 'poznań', 'łódź', 'katowice', 'lublin', 'bóg', 'boże',
		'jezus', 'chrystus', 'tadeusz', 'doktor', 'profesor', 'mecenas', 'inżynier', 'redaktor', 'kierownik', 'generał',
		'ksiądz', 'biskup', 'papież', 'król', 'królowa', 'książę', 'ambasador', 'konsul',
	].map((word) => word.toLowerCase()),
);

function isNonName(word: string): boolean {
	return word.split('-').some((part) => NON_NAME_WORDS.has(part.toLowerCase()));
}

function maskableNameLength(phrase: string): number {
	const words = phrase.split(' ');
	if (isNonName(words[0])) return 0;
	if (words.length > 1 && isNonName(words[1])) return 1;
	return words.length;
}

interface NameRule {
	pattern: RegExp;
}

const NAME_RULES: NameRule[] = [
	{ pattern: new RegExp(String.raw`(?<![\p{L}\d])((?:[Pp]an|[Pp]ani|[Pp]ana|[Pp]anu|[Pp]anią|[Pp]anem|[Pp]anie|[Pp]aniom) )(${NAME_PHRASE})(?![\p{L}\d-])`, 'gu') },
	{ pattern: new RegExp(String.raw`(?<![\p{L}\d])((?:[Ii]mię i nazwisko|[Ii]mię|[Nn]azwisko|[Pp]odpis)\s*[:\-]\s*)(${NAME_PHRASE})(?![\p{L}\d-])`, 'gu') },
	{ pattern: new RegExp(String.raw`(?<![\p{L}\d])((?:[Nn]azywam się|[Mm]am na imię|[Mm]oje nazwisko to|[Mm]oje imię i nazwisko to)\s+)(${NAME_PHRASE})(?![\p{L}\d-])`, 'gu') },
	{ pattern: new RegExp(String.raw`(?<![\p{L}\d])((?:Pozdrawiam(?: serdecznie)?,|[Zz] poważaniem,?)\s+)(${NAME_PHRASE})(?![\p{L}\d-])`, 'gu') },
];

export function maskNames(text: string, counts: Map<string, number> = new Map()): string {
	let result = text;
	for (const rule of NAME_RULES) {
		result = result.replace(rule.pattern, (match: string, lead: string, phrase: string) => {
			const keep = maskableNameLength(phrase);
			if (keep === 0) return match;
			const words = phrase.split(' ');
			counts.set('OSOBA', (counts.get('OSOBA') ?? 0) + 1);
			return `${lead}${NAME_PLACEHOLDER}${words.length > keep ? ` ${words.slice(keep).join(' ')}` : ''}`;
		});
	}
	return result;
}

export function maskPii(text: string): MaskResult {
	const counts = new Map<string, number>();
	let result = text;
	for (const rule of RULES) {
		result = result.replace(rule.pattern, (match) => {
			if (!rule.isValid(match)) return match;
			counts.set(rule.type, (counts.get(rule.type) ?? 0) + 1);
			return `[${rule.type}]`;
		});
	}
	const masks = [...counts.entries()].map(([type, count]) => ({ type, count }));
	return { text: result, masks };
}
