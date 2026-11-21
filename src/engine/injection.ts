// Wykrywanie sygnałów prompt injection (W6) w danych: wejściu, fragmentach źródeł i cytatach.
// Wykrycie NIE zmienia werdyktu "na żądanie": fragment z sygnałem jest wyłączany z dowodów,
// a sygnał trafia do rekordu (tylko kod, bez treści) i do logu zdarzeń.

export type InjectionSignalCode =
  | 'ignorowanie_instrukcji'
  | 'prompt_systemowy'
  | 'zmiana_roli'
  | 'narzucony_werdykt'
  | 'znacznik_roli'
  | 'znacznik_wstrzykniecia';

interface Pattern {
  code: InjectionSignalCode;
  re: RegExp;
}

// Wzorce ogólne (nie zawierają żadnych konkretnych przykładów testowych).
const PATTERNS: Pattern[] = [
  {
    code: 'ignorowanie_instrukcji',
    re: /\b(?:z?ignoruj\p{L}*|pomi[nń]\p{L}*|zapomnij\p{L}*|nie\s+stosuj\p{L}*)\s+(?:\p{L}+\s+){0,3}?(?:instrukcj\p{L}*|regu[łl]\p{L}*|polece\p{L}*|zasad\p{L}*|wytyczn\p{L}*)/iu,
  },
  {
    code: 'ignorowanie_instrukcji',
    re: /\b(?:ignore|disregard|forget|override)\s+(?:\w+\s+){0,3}?(?:instructions?|rules?|prompts?|guidelines?)\b/iu,
  },
  { code: 'prompt_systemowy', re: /\bsystem(?:owy|owe|owego)?\s*[-_]?\s*prompt\p{L}*|\bprompt\p{L}*\s+systemow\p{L}*/iu },
  {
    code: 'zmiana_roli',
    re: /\b(?:jeste[śs]\s+teraz|od\s+teraz\s+jeste[śs]|udawaj,?\s+[żz]e|you\s+are\s+now|act\s+as|pretend\s+to\s+be)\b/iu,
  },
  {
    code: 'narzucony_werdykt',
    re: /\b(?:odpowiedz|odpowiadaj|zwr[óo][ćc]|wypisz|answer|respond|return)\s*:?\s*["„']?\s*(?:potwierdz\p{L}*|prawd\p{L}*|fa[łl]szyw\p{L}*|obala\p{L}*|true|false|confirmed)/iu,
  },
  {
    code: 'narzucony_werdykt',
    re: /\b(?:uznaj|oce[ńn]|oznacz|zakwalifikuj|traktuj|mark|classify)\s+(?:\p{L}+\s+){0,4}?(?:za|jako|as)\s+(?:potwierdz\p{L}*|prawdziw\p{L}*|fa[łl]szyw\p{L}*|true|false|confirmed)/iu,
  },
  {
    code: 'znacznik_roli',
    re: /(?:^|\n)\s*(?:system|assistant|asystent|user|u[żz]ytkownik|human)\s*:/iu,
  },
  { code: 'znacznik_roli', re: /<\|?\s*(?:im_start|im_end|system|endoftext)\s*\|?>|\[\/?INST\]|<<\/?SYS>>/iu },
  {
    code: 'znacznik_wstrzykniecia',
    re: /<\/?\s*(?:system|instructions?|instrukcj\p{L}*|passage|fragment|dane|data|prompt|assistant|user)\b[^>]*>/iu,
  },
];

/** Zwraca posortowaną listę unikalnych kodów sygnałów (bez treści tekstu). */
export function detectInjectionSignals(text: string): InjectionSignalCode[] {
  if (!text) return [];
  const found = new Set<InjectionSignalCode>();
  for (const p of PATTERNS) if (p.re.test(text)) found.add(p.code);
  return [...found].sort();
}

export interface StrippedText {
  /** Tekst bez podejrzanych zdań/wierszy (to, co może trafić do modelu). */
  text: string;
  /** Kody sygnałów z usuniętych segmentów. */
  signals: InjectionSignalCode[];
  /** Liczba usuniętych segmentów. */
  removed: number;
}

/**
 * Usuwa z tekstu zdania i wiersze z sygnałem injection, żeby podejrzane fragmenty nie trafiły do modelu.
 * Sprawdza też cały tekst (wzorce mogą przekraczać granice zdań); gdy sygnał jest tylko w całości,
 * a nie w żadnym segmencie, zwraca pusty tekst (nie wiemy, który fragment usunąć).
 */
export function stripInjectedSegments(text: string): StrippedText {
  const whole = detectInjectionSignals(text);
  if (whole.length === 0) return { text, signals: [], removed: 0 };
  const signals = new Set<InjectionSignalCode>();
  const kept: string[] = [];
  let removed = 0;
  for (const line of text.split(/\n/)) {
    const parts = line.match(/[^.!?…]+[.!?…]*\s*/gu) ?? [line];
    const keptParts: string[] = [];
    for (const part of parts) {
      const sig = detectInjectionSignals(part);
      if (sig.length) {
        removed++;
        for (const s of sig) signals.add(s);
      } else keptParts.push(part);
    }
    kept.push(keptParts.join('').trimEnd());
  }
  let out = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (detectInjectionSignals(out).length > 0 || removed === 0) {
    for (const s of whole) signals.add(s);
    out = '';
    removed = Math.max(removed, 1);
  }
  return { text: out, signals: [...signals].sort(), removed };
}

/** Czy tekst zawiera adres URL lub domenę z protokołem/www. */
export function containsUrl(text: string): boolean {
  return /\bhttps?:\/\/|\bwww\.[a-z0-9-]+\.[a-z]{2,}/iu.test(text);
}
