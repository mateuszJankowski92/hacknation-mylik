/**
 * Opakowanie danych (treść od użytkownika, treść fragmentów korpusu) w jawne znaczniki,
 * tak by model odróżniał je od instrukcji (T5/W6).
 *
 * Neutralizujemy WYŁĄCZNIE sekwencje wyglądające jak nasze własne znaczniki
 * (otwierające i zamykające), zamieniając `<` na `&lt;`. Reszty tekstu nie ruszamy,
 * bo model ma zwracać cytaty będące dosłownymi podciągami fragmentu; zmiana innych
 * znaków psułaby weryfikację cytatów w silniku.
 */

/** Nazwy znaczników używanych w wiadomościach do modelu. */
export const DATA_TAGS = ['dane_uzytkownika', 'twierdzenie', 'fragment', 'fragmenty'] as const;

// `<` + opcjonalny `/` + opcjonalne białe znaki + nazwa znacznika + granica słowa.
const TAG_LIKE = new RegExp(`<(\\s*/?\\s*)(${DATA_TAGS.join('|')})(?![\\p{L}\\p{N}_])`, 'giu');

/** Unieszkodliwia w danych sekwencje przypominające nasze znaczniki. */
export function neutralizeTags(text: string): string {
  return text.replace(TAG_LIKE, '&lt;$1$2');
}

/** Wartość atrybutu (np. identyfikator fragmentu) bez znaków, które mogłyby zamknąć atrybut lub znacznik. */
export function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function wrapUserData(text: string): string {
  return `<dane_uzytkownika>\n${neutralizeTags(text)}\n</dane_uzytkownika>`;
}

export function wrapClaim(text: string): string {
  return `<twierdzenie>\n${neutralizeTags(text)}\n</twierdzenie>`;
}

export function wrapPassage(id: string, text: string): string {
  return `<fragment id="${escapeAttr(id)}">\n${neutralizeTags(text)}\n</fragment>`;
}

export function wrapPassages(passages: ReadonlyArray<{ id: string; text: string }>): string {
  return `<fragmenty>\n${passages.map((p) => wrapPassage(p.id, p.text)).join('\n')}\n</fragmenty>`;
}

// Uwaga: `\b` w JS nie rozumie polskich liter, stąd jawne `(?<!\p{L})`.
const INJECTION_PATTERNS: RegExp[] = [
  /(?<!\p{L})(zignoruj|ignoruj|pomiń|zapomnij)[^.\n]{0,60}(instrukcj|polece|zasad|wcześniejsz|poprzedni)/iu,
  /(?<!\p{L})ignore[^.\n]{0,40}(previous|prior|above|all)[^.\n]{0,40}(instruction|rule|prompt)/iu,
  /(?<!\p{L})(system prompt|prompt systemowy|jesteś teraz|you are now|act as|udawaj, że)/iu,
  /(?<!\p{L})(odpowiedz|oceń|uznaj|zwróć)[^.\n]{0,40}(potwierdz|prawdziw|fałszyw|werdykt)/iu,
  new RegExp(`</?\\s*(${DATA_TAGS.join('|')}|system|instructions?)(?![\\p{L}\\p{N}_])`, 'iu'),
];

/**
 * Heurystyka: czy dane wyglądają na próbę wstrzyknięcia instrukcji.
 * Nie blokuje niczego; silnik może na tej podstawie dodać informację dla użytkownika.
 * (Kontrakt wyjścia modelu nie ma pola na zgłoszenie wstrzyknięcia.)
 */
export function looksLikeInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((re) => re.test(text));
}
