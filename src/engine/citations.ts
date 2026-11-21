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
  | 'fragment_z_sygnalem';

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

/** Znajduje cytat w fragmencie; zwraca oryginalny wycinek źródła albo null. */
export function locateQuote(passageText: string, quote: string): string | null {
  const q = normalizeWhitespace(quote);
  if (!q) return null;
  const { source, norm, map } = normalizeWithMap(passageText);
  const at = norm.indexOf(q);
  if (at < 0) return null;
  const start = map[at]!;
  const end = map[at + q.length - 1]! + 1;
  return source.slice(start, end);
}

/**
 * Sprawdza oceny modelu dla jednego twierdzenia.
 * (a) passageId musi należeć do fragmentów przekazanych modelowi; (b) cytat po normalizacji
 * białych znaków musi być podciągiem fragmentu; (c) 20..600 znaków; (d) stanowisko inne niż
 * `bez_zwiazku` wymaga cytatu; (e) cytat bez URL-a i bez znamion instrukcji. Fragment
 * oznaczony sygnałem injection nie może być dowodem. Dowody deduplikowane po fragmencie.
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
    const original = locateQuote(entry.passage.text, q);
    if (original === null) {
      reject('brak_w_zrodle');
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
