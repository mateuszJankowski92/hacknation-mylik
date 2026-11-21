// Odpowiedzi błędów HTTP. Bez śladów stosu, bez sekretów, bez treści zgłoszenia.
import type { Context } from 'hono';
import type { ApiError } from '../contracts/api';

export const MESSAGES_PL = {
  invalidJson: 'Nie mogę odczytać zgłoszenia. Wyślij dane w formacie JSON.',
  wrongContentType: 'Zgłoszenie musi mieć nagłówek Content-Type: application/json.',
  invalidInput: 'Podaj dokładnie jedno: tekst albo adres URL.',
  tooLarge: 'Zgłoszenie jest za duże. Skróć treść i spróbuj ponownie.',
  invalidId: 'Niepoprawny identyfikator sprawdzenia.',
  recordNotFound: 'Nie znalazłem takiego sprawdzenia.',
  apiNotFound: 'Nie ma takiego adresu w usłudze.',
  server: 'Usługa chwilowo nie działa. To nie jest ocena Twojego zgłoszenia. Spróbuj ponownie później.',
} as const;

export function apiError(
  c: Context,
  status: 400 | 404 | 413 | 415,
  error: ApiError['error'],
  message: string,
): Response {
  return c.json({ error, message } satisfies ApiError, status);
}

/**
 * Błąd serwera (500). Kod `blad_serwera` NIE należy do `API_ERROR_CODES` w kontrakcie
 * (tam brak kodu dla 500); interfejs rozpoznaje 5xx po statusie.
 */
export function serverError(c: Context): Response {
  return c.json({ error: 'blad_serwera', message: MESSAGES_PL.server }, 500);
}
