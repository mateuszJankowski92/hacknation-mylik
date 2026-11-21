import { z } from 'zod';

export const CLAIM_KINDS = ['faktograficzna', 'opinia', 'prognoza', 'niejasna'] as const;
export const ClaimKindSchema = z.enum(CLAIM_KINDS);
export type ClaimKind = z.infer<typeof ClaimKindSchema>;

export const ExtractedClaimSchema = z.object({
  /** `c1`, `c2`, ... */
  id: z.string().regex(/^c\d+$/),
  text: z.string().min(1),
  kind: ClaimKindSchema,
  /**
   * Słowa kluczowe nadane przez model, w formach podstawowych i odmienionych.
   * Wyszukiwarka łączy je operatorem OR (FTS5 trigram nie ma stemmingu).
   */
  searchTerms: z.array(z.string().min(1)).optional(),
  /** Słowa do wyszukania twierdzenia przeciwnego (próba obalenia). */
  counterTerms: z.array(z.string().min(1)).optional(),
  /**
   * Angielskie słowa kluczowe (nazwy własne, liczby, kluczowe pojęcia). WYŁĄCZNIE do dopasowania
   * znanych operacji informacyjnych (EUvsDisinfo, notices); nie do wyszukiwania źródeł ani oceny.
   */
  englishTerms: z.array(z.string().min(1)).optional(),
});
export type ExtractedClaim = z.infer<typeof ExtractedClaimSchema>;

/**
 * Temat zgłoszenia (zad. 28b): nadaje go model w kroku wyodrębniania twierdzeń (bez dodatkowego wywołania).
 * Służy WYŁĄCZNIE do wyboru roli wyglądu (src/roles); nigdy do werdyktu, siły ani treści odpowiedzi.
 */
export const TOPICS = ['sport_rozrywka', 'przepisy_i_prawa_obywatela', 'inne'] as const;
export const TopicSchema = z.enum(TOPICS);
export type Topic = z.infer<typeof TopicSchema>;
