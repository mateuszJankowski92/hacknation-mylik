import type { MaskResult } from '../contracts';

// Znane ograniczenie: nie rozpoznajemy imion, nazwisk ani adresów zamieszkania
// (zbyt niepewne, groziłoby fałszywymi trafieniami). Maskujemy tylko dane
// o jednoznacznej strukturze, a tam gdzie istnieje suma kontrolna, ją sprawdzamy.

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
		pattern: /(?<![\p{L}\d+])(?<!\d[ -])(?:00 ?48[ -]?)?[1-9]\d{2}[ -]?\d{3}[ -]?\d{3}(?![ -]?\d)/gu,
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
