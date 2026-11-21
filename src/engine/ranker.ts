// WYBÓR KANDYDATÓW: szersza pula z wyszukiwania (kilka zapytań, scalenie rang), potem tanie wywołanie
// modelu porządkuje fragmenty według przydatności do oceny twierdzenia. Model dostaje fragmenty jako DANE
// i zwraca wyłącznie identyfikatory w kolejności; nie ocenia stanowiska i nie widzi źródeł.
// Brak modelu porządkującego albo jego błąd: zostaje kolejność z wyszukiwania (nigdy werdykt z domysłu).
import type { ExtractedClaim, LlmUsage, Passage } from '../contracts/index';

export interface RankRequest {
  claim: string;
  passages: { id: string; text: string }[];
  /** Najwięcej identyfikatorów w odpowiedzi. */
  limit: number;
}

export interface RankResult {
  /** Identyfikatory z danych, od najbardziej przydatnego; bez powtórzeń. */
  ids: string[];
  /** Fragmenty, w których model porządkujący widzi polecenia skierowane do systemu (tylko znane identyfikatory). */
  injectionSuspected?: string[];
  usage?: LlmUsage;
}

export interface PassageRanker {
  rankPassages(req: RankRequest): Promise<RankResult>;
}

export function isPassageRanker(x: unknown): x is PassageRanker {
  return !!x && typeof (x as { rankPassages?: unknown }).rankPassages === 'function';
}

/** Stała scalania rang (reciprocal rank fusion); typowa wartość z literatury wyszukiwania. */
export const RRF_K = 60;

/**
 * Scala kilka list wyników w jedną (reciprocal rank fusion): fragment wysoko w kilku listach wygrywa.
 * Remis rozstrzyga kolejność pierwszego wystąpienia (deterministycznie).
 */
export function fuseRankings(lists: readonly (readonly Passage[])[]): Passage[] {
  const score = new Map<string, number>();
  const first = new Map<string, { p: Passage; order: number }>();
  let order = 0;
  for (const list of lists)
    list.forEach((p, rank) => {
      score.set(p.id, (score.get(p.id) ?? 0) + 1 / (RRF_K + rank + 1));
      if (!first.has(p.id)) first.set(p.id, { p, order: order++ });
    });
  return [...first.values()]
    .sort((a, b) => score.get(b.p.id)! - score.get(a.p.id)! || a.order - b.order)
    .map((x) => x.p);
}

/** Zapytania "za": pełne twierdzenie oraz same słowa kluczowe modelu (warianty, synonimy, odmiany, skróty). */
export function forQueries(claim: ExtractedClaim): string[] {
  const terms = (claim.searchTerms ?? []).map((t) => t.trim()).filter(Boolean);
  const out = [[claim.text, ...terms].join(' ')];
  if (terms.length) out.push(terms.join(' '));
  out.push(claim.text);
  return [...new Set(out)];
}

/**
 * Porządek kandydatów po wywołaniu modelu: najpierw identyfikatory od modelu (tylko znane, bez powtórzeń),
 * potem dopełnienie kolejnością z wyszukiwania do `min` pozycji. Wynik najwyżej `max` pozycji.
 */
export function orderByRanking(pool: readonly Passage[], ids: readonly string[], min: number, max: number): Passage[] {
  const byId = new Map(pool.map((p) => [p.id, p]));
  const out: Passage[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const p = byId.get(id);
    if (!p || seen.has(id)) continue;
    seen.add(id);
    out.push(p);
    if (out.length >= max) return out;
  }
  for (const p of pool) {
    if (out.length >= Math.min(min, max)) break;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}
