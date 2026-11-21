import type { NeedsClarification, PreparedInput, VerifyInput } from '../contracts';
import { cleanText, countLetters, normalizeForKey } from './normalize';
import { maskPii } from './pii';
import { normalizeUrl } from './url';
import { isOnlyOpenQuestions, isReviewQuestion, isYesNoQuestion, OPEN_QUESTION_MESSAGE, questionToStatement } from './question';

export { isOnlyOpenQuestions, isReviewQuestion, isYesNoQuestion, OPEN_QUESTION_MESSAGE, questionToStatement };

export { maskPii };

const MIN_TEXT_LENGTH = 10;
const MAX_TEXT_LENGTH = 2000;
const MIN_LETTERS = 3;
/** Całe zgłoszenie to jeden adres (z protokołem albo zaczynający się od www.). */
const BARE_URL = /^(?:https?:\/\/|www\.)\S+$/iu;

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
	// Sam adres strony wklejony jako tekst (np. w SMS-ie): ta sama ścieżka i ten sam klucz co pole adresu.
	if (BARE_URL.test(cleaned)) return prepareUrl(cleaned);
	if (isOnlyOpenQuestions(cleaned)) return clarify(OPEN_QUESTION_MESSAGE);
	// Pytanie tak/nie i "podobno ..." to twierdzenie do sprawdzenia; klucz liczony z twierdzenia,
	// więc "Czy X?" i "X." dają ten sam rekord.
	const statement = questionToStatement(cleaned);
	const comparable = normalizeForKey(statement);
	if (comparable.length < MIN_TEXT_LENGTH || countLetters(comparable) < MIN_LETTERS) {
		return clarify(statement !== cleaned ? OPEN_QUESTION_MESSAGE : 'Napisz proszę pełne zdanie, co dokładnie chcesz sprawdzić.');
	}
	const masked = maskPii(cleaned);
	return {
		kind: 'tekst',
		normalizedInput: normalizeForKey(maskPii(statement).text),
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
