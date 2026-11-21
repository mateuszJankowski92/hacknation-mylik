// Teksty warstwy indeksu weryfikacji dla obywatela (prosty język, bez słów z listy zakazanych).

/** Stan techniczny: indeks niedostępny, a zbiór urzędowy nie rozstrzyga (scenariusz J). */
export const FACTCHECK_DOWN_MESSAGE =
  'Nie mogę teraz sprawdzić indeksu Google, w którym redakcje sprawdzające fakty publikują swoje oceny, z powodu błędu dostępu. Nie oceniam tego zgłoszenia. Spróbuj ponownie za kilka minut.';

/** Dopisek, gdy zbiór urzędowy rozstrzyga, ale indeksu nie udało się sprawdzić. */
export const FACTCHECK_DOWN_LIMITATION =
  'Nie udało mi się teraz sprawdzić indeksu Google z ocenami redakcji sprawdzających fakty (błąd dostępu). Odpowiedź opiera się tylko na źródłach urzędowych.';

export const FACTCHECK_USED_LIMITATION =
  'Część podstawy to ocena redakcji sprawdzającej fakty z indeksu Google. Przytaczam jej ocenę, nie wydaję własnej. Szczegóły w publikacji pod linkiem.';

export const FACTCHECK_NOT_FOUND_LIMITATION =
  'W indeksie Google z ocenami redakcji nie znalazłem oceny tej samej tezy. Brak wyniku nie oznacza, że nikt tego nie sprawdzał.';

export const FACTCHECK_INJECTION_NOTICE =
  'Jeden wpis z indeksu ocen redakcji zawierał tekst podobny do poleceń dla systemu. Pominąłem go.';
