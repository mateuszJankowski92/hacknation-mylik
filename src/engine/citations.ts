// BRAMKA CYTATÓW: kod (nie model) decyduje, które oceny modelu stają się dowodami.
import type { MismatchKind, Passage, PassageAssessment, Stance } from '../contracts/index';
import { containsUrl, detectInjectionSignals } from './injection';

export const MIN_QUOTE_CHARS = 20;
export const MAX_QUOTE_CHARS = 600;

export type CitationRejectReason =
  | 'nieznany_fragment'
  | 'pusty_cytat'
  | 'za_krotki'
  | 'za_dlugi'
  | 'brak_w_zrodle'
  | 'url_w_cytacie'
  | 'instrukcja_w_cytacie'
  | 'fragment_z_sygnalem'
  | 'injection_wg_modelu'
  | 'brak_kluczowych_elementow';

export interface AcceptedEvidence {
  passage: Passage;
  stance: Exclude<Stance, 'bez_zwiazku'>;
  /** Rodzaj rozbieżności (tylko przy `rozbieznosc_kontekstu`), przekazany od modelu. */
  mismatch?: MismatchKind;
  /** Cytat wycięty z TEKSTU ŹRÓDŁA (oryginalny przedział), nie napis od modelu. */
  quote: string;
  /** Pozycja fragmentu w wynikach wyszukiwania (0 = najlepszy). */
  rank: number;
}

export interface RejectedAssessment {
  passageId: string;
  reason: CitationRejectReason;
}

export interface CitationResult {
  accepted: AcceptedEvidence[];
  rejected: RejectedAssessment[];
  /** Oceny `bez_zwiazku` (nie są dowodem ani odrzuceniem). */
  irrelevant: number;
  /** Powtórzone oceny tego samego fragmentu, pominięte. */
  duplicates: number;
}

export interface ValidateCitationsOptions {
  /** Fragmenty z wykrytym sygnałem injection: nigdy nie są dowodem. */
  flaggedPassageIds?: ReadonlySet<string>;
  /**
   * Tekst twierdzenia. Gdy podany, cytat "potwierdza" musi zawierać choć jedną liczbę z twierdzenia
   * (jeśli twierdzenie ma liczby: kwoty, daty, ilości), inaczej odpada jako `brak_kluczowych_elementow`.
   */
  claimText?: string;
}

/** Zwija białe znaki do pojedynczej spacji i przycina; nie zmienia liter ani diakrytyków. */
export function normalizeWhitespace(s: string): string {
  return s.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

/**
 * Normalizuje tekst i zwraca mapę: indeks w tekście znormalizowanym -> indeks w `source`
 * (gdzie `source` to tekst po NFC). Pozwala wyciąć oryginalny przedział cytatu.
 */
function normalizeWithMap(text: string): { source: string; norm: string; map: number[] } {
  const source = text.normalize('NFC');
  let norm = '';
  const map: number[] = [];
  let pendingSpace = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]!;
    if (/\s/u.test(ch)) {
      if (norm.length > 0) pendingSpace = true;
      continue;
    }
    if (pendingSpace) {
      norm += ' ';
      map.push(i - 1);
      pendingSpace = false;
    }
    norm += ch;
    map.push(i);
  }
  return { source, norm, map };
}

/** Znajduje cytat w fragmencie; zwraca przedział w tekście źródła (po NFC) albo null. */
export function locateQuoteRange(passageText: string, quote: string): { source: string; start: number; end: number } | null {
  const q = normalizeWhitespace(quote);
  if (!q) return null;
  const { source, norm, map } = normalizeWithMap(passageText);
  const at = norm.indexOf(q);
  if (at < 0) return null;
  return { source, start: map[at]!, end: map[at + q.length - 1]! + 1 };
}

/** Znajduje cytat w fragmencie; zwraca oryginalny wycinek źródła albo null. */
export function locateQuote(passageText: string, quote: string): string | null {
  const r = locateQuoteRange(passageText, quote);
  return r ? r.source.slice(r.start, r.end) : null;
}

const SENTENCE_END = /[.!?…]/u;
const SENTENCE_START = /[\p{Lu}\p{N}"„«(\[]/u;

/** Czy pozycja `i` zaczyna zdanie (początek tekstu, nowa linia albo koniec zdania i wielka litera). */
function isSentenceStart(source: string, i: number): boolean {
  if (i <= 0) return true;
  let j = i - 1;
  let sawSpace = false;
  while (j >= 0 && /\s/u.test(source[j]!)) {
    if (source[j] === '\n') return true;
    sawSpace = true;
    j--;
  }
  if (j < 0) return true;
  return sawSpace && SENTENCE_END.test(source[j]!) && SENTENCE_START.test(source[i]!);
}

/** Czy zdanie kończy się na pozycji `end` (wyłącznie). */
function isSentenceEnd(source: string, end: number): boolean {
  if (end >= source.length) return true;
  if (!SENTENCE_END.test(source[end - 1]!) && source[end] !== '\n') {
    // koniec linii bez kropki (np. nagłówek) też kończy zdanie
    let k = end;
    while (k < source.length && source[k] !== '\n' && /\s/u.test(source[k]!)) k++;
    return k >= source.length || source[k] === '\n';
  }
  let k = end;
  while (k < source.length && /\s/u.test(source[k]!)) {
    if (source[k] === '\n') return true;
    k++;
  }
  return k >= source.length || (k > end && SENTENCE_START.test(source[k]!));
}

/**
 * Rozszerza przedział cytatu do pełnych zdań (początek i koniec zdania w tekście źródła).
 * Cytat urwany w pół zdania traci podmiot albo zastrzeżenie; pełne zdanie czyta się samodzielnie.
 * Gdy pełne zdania przekraczają limit długości, zostaje przedział od modelu.
 */
export function snapToSentences(source: string, start: number, end: number, maxChars = MAX_QUOTE_CHARS): { start: number; end: number } {
  let s = start;
  while (s > 0 && !isSentenceStart(source, s)) s--;
  while (s < start && /\s/u.test(source[s]!)) s++;
  let e = end;
  while (e < source.length && !isSentenceEnd(source, e)) e++;
  while (e > end && /\s/u.test(source[e - 1]!)) e--;
  if (normalizeWhitespace(source.slice(s, e)).length > maxChars) return { start, end };
  return { start: s, end: e };
}

/**
 * Cytat poszerzony o zdanie poprzedzające (gdy podmiot nazwano zdanie wcześniej, a cytat używa zaimka
 * albo ogólnego określenia). Zwraca ciągły wycinek źródła albo null (brak zdania wcześniej, za długi).
 */
export function withPreviousSentence(passageText: string, quote: string, maxChars = MAX_QUOTE_CHARS): string | null {
  const r = locateQuoteRange(passageText, quote);
  if (!r) return null;
  const { source, start, end } = r;
  let s = start - 1;
  while (s > 0 && /\s/u.test(source[s]!)) s--;
  if (s <= 0) return null;
  while (s > 0 && !isSentenceStart(source, s)) s--;
  const out = source.slice(s, end).trim();
  if (out === source.slice(start, end).trim() || normalizeWhitespace(out).length > maxChars) return null;
  return out;
}

/** Liczby z tekstu, znormalizowane ("1 500" -> "1500", "10,2" bez zmian). */
export function numbersIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.normalize('NFC').matchAll(/\d+(?:[ \u00a0\u202f]\d{3})*(?:[.,]\d+)?/gu)) out.add(m[0].replace(/[ \u00a0\u202f]/gu, ''));
  return out;
}

/** Twierdzenie bez liczb: brak wymogu. Z liczbami: cytat musi mieć choć jedną z nich. */
export function hasKeyNumbers(claimText: string, quote: string): boolean {
  const need = numbersIn(claimText);
  if (need.size === 0) return true;
  const have = numbersIn(quote);
  for (const n of need) if (have.has(n)) return true;
  return false;
}

/**
 * Sprawdza oceny modelu dla jednego twierdzenia.
 * (a) passageId musi należeć do fragmentów przekazanych modelowi; (b) cytat po normalizacji
 * białych znaków musi być podciągiem fragmentu; (c) 20..600 znaków; (d) stanowisko inne niż
 * `bez_zwiazku` wymaga cytatu; (e) cytat bez URL-a i bez znamion instrukcji. Fragment
 * oznaczony sygnałem injection (przez kod albo zgłoszony przez model) nie może być dowodem. Dowody deduplikowane po fragmencie.
 * (f) cytat rozszerzony do pełnych zdań źródła; (g) przy `claimText` cytat "potwierdza" zawiera liczbę z twierdzenia.
 */
export function validateCitations(
  assessments: readonly PassageAssessment[],
  sentPassages: readonly Passage[],
  opts: ValidateCitationsOptions = {},
): CitationResult {
  const byId = new Map<string, { passage: Passage; rank: number }>();
  sentPassages.forEach((p, rank) => {
    if (!byId.has(p.id)) byId.set(p.id, { passage: p, rank });
  });
  const flagged = opts.flaggedPassageIds ?? new Set<string>();
  const accepted: AcceptedEvidence[] = [];
  const rejected: RejectedAssessment[] = [];
  const seen = new Set<string>();
  let irrelevant = 0;
  let duplicates = 0;

  for (const a of assessments) {
    const entry = byId.get(a.passageId);
    if (!entry) {
      rejected.push({ passageId: a.passageId, reason: 'nieznany_fragment' });
      continue;
    }
    if (a.stance === 'bez_zwiazku') {
      irrelevant++;
      continue;
    }
    const reject = (reason: CitationRejectReason) => rejected.push({ passageId: a.passageId, reason });
    if (flagged.has(a.passageId)) {
      reject('fragment_z_sygnalem');
      continue;
    }
    if (a.injectionSuspected === true) {
      // Model zgłosił polecenia we fragmencie: fragment nie może być dowodem.
      reject('injection_wg_modelu');
      continue;
    }
    const q = normalizeWhitespace(a.quote ?? '');
    if (!q) {
      reject('pusty_cytat');
      continue;
    }
    if (q.length < MIN_QUOTE_CHARS) {
      reject('za_krotki');
      continue;
    }
    if (q.length > MAX_QUOTE_CHARS) {
      reject('za_dlugi');
      continue;
    }
    if (containsUrl(q)) {
      reject('url_w_cytacie');
      continue;
    }
    if (detectInjectionSignals(q).length > 0) {
      reject('instrukcja_w_cytacie');
      continue;
    }
    const range = locateQuoteRange(entry.passage.text, q);
    if (range === null) {
      reject('brak_w_zrodle');
      continue;
    }
    // Pełne zdania; poszerzenie nie może wnieść adresu ani znamion instrukcji.
    const snapped = snapToSentences(range.source, range.start, range.end);
    let original = range.source.slice(snapped.start, snapped.end);
    if (containsUrl(original) || detectInjectionSignals(original).length > 0) original = range.source.slice(range.start, range.end);
    if (opts.claimText !== undefined && a.stance === 'potwierdza' && !hasKeyNumbers(opts.claimText, original)) {
      reject('brak_kluczowych_elementow');
      continue;
    }
    if (seen.has(a.passageId)) {
      duplicates++;
      continue;
    }
    seen.add(a.passageId);
    accepted.push({
      passage: entry.passage,
      stance: a.stance,
      ...(a.mismatch !== undefined ? { mismatch: a.mismatch } : {}),
      quote: original,
      rank: entry.rank,
    });
  }
  return { accepted, rejected, irrelevant, duplicates };
}
