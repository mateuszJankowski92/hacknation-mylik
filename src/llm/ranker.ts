/**
 * Schemat odpowiedzi wyboru kandydatów (structured outputs). Interfejs: src/engine/ranker.ts.
 * Model zwraca wyłącznie identyfikatory fragmentów z danych, w kolejności przydatności.
 */
import { z } from 'zod';

export const RankOutputSchema = z.object({
  ids: z.array(z.string()),
  /** Identyfikatory fragmentów z poleceniami skierowanymi do systemu lub modelu. */
  injectionSuspected: z.array(z.string()),
});
export type RankOutput = z.infer<typeof RankOutputSchema>;

/** Tylko znane identyfikatory, bez powtórzeń, najwyżej `limit`. */
export function idsFromOutput(out: RankOutput, known: ReadonlySet<string>, limit: number): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const raw of out.ids) {
    const id = raw.trim();
    if (!known.has(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= limit) break;
  }
  return ids;
}
