import type { NeedsClarification, PreparedInput, VerifyInput } from '../contracts';
import { cleanText, countLetters, normalizeForKey } from './normalize';
import { maskPii } from './pii';
import { normalizeUrl } from './url';

export { maskPii };

const MIN_TEXT_LENGTH = 10;
const MAX_TEXT_LENGTH = 2000;
const MIN_LETTERS = 3;

/**
 * Odrzucenie wejścia. `unavailable`: wejście jest jasne i poprawne, ale nie możemy go sprawdzić
 * (adres lokalny lub wewnętrzny); silnik zwraca wtedy stan "brak możliwości sprawdzenia",
 * a nie "potrzeba doprecyzowania". Dodatkowe pole nie zmienia kontraktu NeedsClarification.
 */
export type InputRejection = NeedsClarification & { unavailable?: true };

function clarify(message: string, unavailable = false): InputRejection {
	return unavailable ? { needsClarification: true, message, unavailable: true } : { needsClarification: true, message };
}

export function isUnavailableInput(x: NeedsClarification): boolean {
	return (x as InputRejection).unavailable === true;
}

function prepareText(text: string): PreparedInput | NeedsClarification {
	const cleaned = cleanText(text);
	if (cleaned.length > MAX_TEXT_LENGTH) {
		return clarify(`Tekst jest za długi (limit to ${MAX_TEXT_LENGTH} znaków). Skróć go do jednego konkretnego doniesienia.`);
	}
	const comparable = normalizeForKey(cleaned);
	if (comparable.length < MIN_TEXT_LENGTH || countLetters(comparable) < MIN_LETTERS) {
		return clarify('Napisz proszę pełne zdanie, co dokładnie chcesz sprawdzić.');
	}
	const masked = maskPii(cleaned);
	return {
		kind: 'tekst',
		normalizedInput: normalizeForKey(masked.text),
		maskedInput: masked.text,
		masks: masked.masks,
	};
}

function prepareUrl(rawUrl: string): PreparedInput | NeedsClarification {
	const result = normalizeUrl(rawUrl);
	if (!result.ok) return clarify(result.message, result.unavailable === true);
	return {
		kind: 'url',
		normalizedInput: result.normalizedInput,
		maskedInput: result.maskedInput,
		masks: result.masks,
		urlInfo: { host: result.host, url: result.maskedInput },
	};
}

export function prepareInput(input: VerifyInput): PreparedInput | NeedsClarification {
	const hasText = input.text !== undefined;
	const hasUrl = input.url !== undefined;
	if (hasText === hasUrl) {
		return clarify('Podaj dokładnie jedno: tekst doniesienia albo adres strony.');
	}
	return hasText ? prepareText(input.text as string) : prepareUrl(input.url as string);
}
