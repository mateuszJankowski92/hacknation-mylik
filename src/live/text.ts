// Teksty dla obywatela dotyczące drugiej warstwy (zad. 29). Krótkie zdania, codzienne słowa.

/** Dopisek do zdania wyniku, gdy podstawa pochodzi z drugiej warstwy. */
export const LIVE_SOURCE_SENTENCE = 'To źródło spoza urzędów: media albo instytucja z naszej stałej listy.';

/** Ostrzeżenie przy każdym rozstrzygającym źródle z drugiej warstwy. */
export function liveSourceNotice(publisher: string): string {
  return `To nie jest źródło urzędowe. To ${publisher}, z naszej stałej listy mediów i instytucji.`;
}

export const LIVE_USED_LIMITATION =
  'W źródłach urzędowych nie było odpowiedzi. Szukałem też w mediach i instytucjach z jawnej listy. To źródło wtórne, więc pewność jest najwyżej średnia.';

export const LIVE_NOT_FOUND_LIMITATION =
  'W źródłach urzędowych nie było odpowiedzi. W mediach i instytucjach z jawnej listy też nie znalazłem nic pewnego.';

export const LIVE_FAILED_NOTICE =
  'Nie udało się teraz zajrzeć do mediów z naszej listy. Wynik opiera się tylko na źródłach urzędowych.';

export const LIVE_TIMEOUT_NOTICE =
  'Szukanie w mediach z naszej listy trwało za długo. Przerwałem je i nic z niego nie dodałem.';

export const LIVE_INJECTION_NOTICE = 'Na stronie z naszej listy są polecenia dla mnie. Pominąłem ten tekst.';

/** Gdy twierdzenie nie ma daty: odpowiedź pokazuje datę najnowszej strony, na której się oparła. */
export function liveDateNotice(isoDay: string): string {
  const [y, m, d] = isoDay.split('-');
  return `Ta strona jest z ${d}.${m}.${y}. Później mogło się coś zmienić.`;
}
