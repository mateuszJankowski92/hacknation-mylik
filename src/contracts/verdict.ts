import { z } from 'zod';

/** Pięć werdyktów merytorycznych (identyfikatory ASCII). */
export const VERDICTS = [
  'potwierdzone',
  'falszywe',
  'wprowadzajace_w_blad',
  'brak_wystarczajacych_dowodow',
  'nie_podlega_weryfikacji',
] as const;
export const VerdictSchema = z.enum(VERDICTS);
export type Verdict = z.infer<typeof VerdictSchema>;

export const VERDICT_LABELS_PL: Record<Verdict, string> = {
  potwierdzone: 'potwierdzone',
  falszywe: 'fałszywe',
  wprowadzajace_w_blad: 'wprowadzające w błąd',
  brak_wystarczajacych_dowodow: 'brak wystarczających dowodów',
  nie_podlega_weryfikacji: 'nie podlega weryfikacji',
};

/** Trzy stany, które NIE są werdyktami (osobny typ). */
export const STATES = [
  'awaria_techniczna',
  'brak_mozliwosci_sprawdzenia',
  'potrzeba_doprecyzowania',
] as const;
export const StateSchema = z.enum(STATES);
export type State = z.infer<typeof StateSchema>;

export const STATE_LABELS_PL: Record<State, string> = {
  awaria_techniczna: 'awaria techniczna',
  brak_mozliwosci_sprawdzenia: 'brak możliwości wykonania sprawdzenia',
  potrzeba_doprecyzowania: 'potrzeba doprecyzowania pytania',
};

/**
 * Stosunek fragmentu źródła do twierdzenia.
 * `rozbieznosc_kontekstu`: źródło opisuje to samo zdarzenie lub treść, ale z inną datą,
 * miejscem, skalą albo warunkami (rodzaj rozbieżności w polu `mismatch`).
 */
export const STANCES = ['potwierdza', 'obala', 'rozbieznosc_kontekstu', 'kontekst', 'bez_zwiazku'] as const;
export const StanceSchema = z.enum(STANCES);
export type Stance = z.infer<typeof StanceSchema>;

export const STANCE_LABELS_PL: Record<Stance, string> = {
  potwierdza: 'potwierdza',
  obala: 'obala',
  rozbieznosc_kontekstu: 'opisuje to samo w innym kontekście',
  kontekst: 'kontekst',
  bez_zwiazku: 'bez związku',
};

/** Rodzaj rozbieżności dla stanowiska `rozbieznosc_kontekstu` (wymagany przy tym stanowisku). */
export const MISMATCH_KINDS = ['data', 'miejsce', 'skala', 'warunki'] as const;
export const MismatchKindSchema = z.enum(MISMATCH_KINDS);
export type MismatchKind = z.infer<typeof MismatchKindSchema>;

export const MISMATCH_LABELS_PL: Record<MismatchKind, string> = {
  data: 'inna data',
  miejsce: 'inne miejsce',
  skala: 'inna skala',
  warunki: 'inne warunki',
};

/** Reguła wspólna: `mismatch` jest wymagany przy `rozbieznosc_kontekstu` i zabroniony przy innych stanowiskach. */
export function mismatchConsistent(v: { stance: Stance; mismatch?: MismatchKind | undefined }): boolean {
  return v.stance === 'rozbieznosc_kontekstu' ? v.mismatch !== undefined : v.mismatch === undefined;
}
export const MISMATCH_RULE_MESSAGE =
  'Pole "mismatch" jest wymagane przy stanowisku "rozbieznosc_kontekstu" i niedozwolone przy pozostałych.';

/** Siła podstawy werdyktu. */
export const STRENGTH_LEVELS = ['wysoka', 'srednia', 'niska', 'brak'] as const;
export const StrengthLevelSchema = z.enum(STRENGTH_LEVELS);
export type StrengthLevel = z.infer<typeof StrengthLevelSchema>;

export const STRENGTH_LABELS_PL: Record<StrengthLevel, string> = {
  wysoka: 'wysoka',
  srednia: 'średnia',
  niska: 'niska',
  brak: 'brak',
};

export const STRENGTH_REASON_CODES = [
  'zrodlo_urzedowe',
  'kilka_niezaleznych_zrodel',
  'jedno_zrodlo',
  'zrodlo_archiwalne',
  'sprzeczne_zrodla',
  'slabe_dopasowanie',
  'brak_dowodow',
] as const;
export const StrengthReasonCodeSchema = z.enum(STRENGTH_REASON_CODES);
export type StrengthReasonCode = z.infer<typeof StrengthReasonCodeSchema>;

export const STRENGTH_REASON_LABELS_PL: Record<StrengthReasonCode, string> = {
  zrodlo_urzedowe: 'źródło urzędowe',
  kilka_niezaleznych_zrodel: 'kilka niezależnych źródeł',
  jedno_zrodlo: 'tylko jedno źródło',
  zrodlo_archiwalne: 'źródło archiwalne',
  sprzeczne_zrodla: 'źródła są ze sobą sprzeczne',
  slabe_dopasowanie: 'słabe dopasowanie źródeł do twierdzenia',
  brak_dowodow: 'brak dowodów w korpusie',
};
