// Wspólne narzędzia dopasowania słów (zad. 28b): składanie tekstu i dopasowanie rdzeni odporne na odmianę.

/** Małe litery, bez polskich znaków (ł -> l), same litery i cyfry rozdzielone spacją. */
export function fold(text: string): string {
  return text
    .toLocaleLowerCase('pl')
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function tokens(text: string): string[] {
  const f = fold(text);
  return f ? f.split(' ') : [];
}

/**
 * Wpis listy słów. `stem`: rdzeń bez polskich znaków, dopasowany do POCZĄTKU słowa (obejmuje odmianę:
 * "wojn" -> wojna, wojny, wojnie). `exact`: tylko całe słowo (krótkie rdzenie, np. "nato").
 * `except`: początki słów, które NIE pasują mimo rdzenia (np. "lek" bez "lekko").
 * `phrase`: kilka słów obok siebie (np. "nie zyje").
 */
export type WordEntry = string | { stem: string; exact?: boolean; except?: readonly string[] };

function entryMatches(entry: WordEntry, toks: readonly string[], folded: string): boolean {
  if (typeof entry === 'string') return entryMatches({ stem: entry }, toks, folded);
  const stem = fold(entry.stem);
  if (!stem) return false;
  if (stem.includes(' ')) return ` ${folded} `.includes(` ${stem}`);
  return toks.some((t) => {
    if (entry.exact) return t === stem;
    if (!t.startsWith(stem)) return false;
    return !(entry.except ?? []).some((e) => t.startsWith(fold(e)));
  });
}

/** Rdzenie z listy, które występują w tekście (do zdarzeń i testów). */
export function matchedEntries(text: string, list: readonly WordEntry[]): string[] {
  const folded = fold(text);
  const toks = folded ? folded.split(' ') : [];
  const out: string[] = [];
  for (const e of list) if (entryMatches(e, toks, folded)) out.push(typeof e === 'string' ? e : e.stem);
  return out;
}
