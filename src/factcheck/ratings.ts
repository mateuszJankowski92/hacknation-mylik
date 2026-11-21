// Jawna tabela: ocena redakcji (pole claimReview.textualRating z indeksu) -> nasza etykieta.
// Ocena dotyczy SPRAWDZANEJ TEZY. Kod (select.ts) uwzględnia, że pytanie użytkownika może być jej
// odwrotnością. Nieznana ocena = tylko tło (nie rozstrzyga). Odpowiedź zawsze przypisuje ocenę
// redakcji ("Redakcja X oceniła ... jako ..."), Mylik nie orzeka od siebie.
import type { ReviewInfo } from '../contracts/index';

export type ReviewLabel = NonNullable<ReviewInfo['label']>;

/** Klucz: ocena po normalizacji (małe litery, bez polskich znaków i interpunkcji). */
export const RATING_TABLE: Readonly<Record<string, ReviewLabel>> = {
  prawda: 'potwierdzone',
  falsz: 'falszywe',
  nieprawda: 'falszywe',
  manipulacja: 'wprowadzajace_w_blad',
  'czesciowa prawda': 'wprowadzajace_w_blad',
  'czesciowy falsz': 'wprowadzajace_w_blad',
  'czesciowo falsz': 'wprowadzajace_w_blad',
  'czesciowo prawda': 'wprowadzajace_w_blad',
  'brak kontekstu': 'wprowadzajace_w_blad',
  'wprowadza w blad': 'wprowadzajace_w_blad',
  'wprowadzajace w blad': 'wprowadzajace_w_blad',
  zmanipulowane: 'wprowadzajace_w_blad',
  nieweryfikowalne: 'brak_wystarczajacych_dowodow',
  'nie da sie zweryfikowac': 'brak_wystarczajacych_dowodow',
};

export function normalizeRating(rating: string): string {
  return rating
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Etykieta dla oceny redakcji albo null (ocena nieznana: tylko tło). */
export function labelForRating(rating: string): ReviewLabel | null {
  return RATING_TABLE[normalizeRating(rating)] ?? null;
}

/**
 * Etykieta dla twierdzenia użytkownika. Ta sama teza: etykieta oceny. Teza odwrotna: prawda i fałsz
 * zamieniają się miejscami; ocen pośrednich (manipulacja, częściowa prawda) nie da się odwrócić,
 * więc wtedy null (tylko tło).
 */
export function labelForUserClaim(label: ReviewLabel | null, inverse: boolean): ReviewLabel | null {
  if (!label || !inverse) return label;
  if (label === 'potwierdzone') return 'falszywe';
  if (label === 'falszywe') return 'potwierdzone';
  if (label === 'brak_wystarczajacych_dowodow') return label;
  return null;
}
