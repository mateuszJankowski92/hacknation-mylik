const TRAILING_NOISE = /[\s.,;:!?…"'„”“”«»]+$/u;
const LEADING_NOISE = /^[\s"'„”“”«»]+/u;
const ADDRESS_PATTERN = /^https?:\/\/\S+$/iu;
const WORD_PATTERN = /\p{L}{4,}/gu;

export function normalizeShowcaseText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/gu, ' ').replace(LEADING_NOISE, '').replace(TRAILING_NOISE, '');
}

export function isShowcaseAddress(text: string): boolean {
  return ADDRESS_PATTERN.test(text.trim());
}

export function sameShowcaseInput(typed: string, maskedInput: string): boolean {
  if (isShowcaseAddress(typed) || isShowcaseAddress(maskedInput)) return typed.trim() === maskedInput.trim();
  return normalizeShowcaseText(typed) === normalizeShowcaseText(maskedInput);
}

export function showcaseWords(text: string): Set<string> {
  return new Set(text.toLowerCase().match(WORD_PATTERN) ?? []);
}

export function wordOverlap(a: string, b: string): number {
  const left = showcaseWords(a);
  const right = showcaseWords(b);
  if (left.size === 0 || right.size === 0) return 0;
  let common = 0;
  for (const word of left) if (right.has(word)) common++;
  return common / (left.size + right.size - common);
}
