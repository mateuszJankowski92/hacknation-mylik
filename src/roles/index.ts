// Wybór roli wyglądu wyniku (zad. 28b). Rolę wybiera KOD, nie model.
// Domyślnie `pogodynka`. Inna rola tylko, gdy WSZYSTKIE warunki są spełnione:
//   1) temat od modelu jest jednoznaczny (sport_rozrywka albo przepisy_i_prawa_obywatela) i tekst go potwierdza
//      słowami z listy tematu, bez słów drugiego tematu;
//   2) brak słów z listy tematów wrażliwych (src/roles/sensitive.ts), także dzieci w kontekście krzywdy;
//   3) brak dopasowania w bazie EUvsDisinfo (i baza odpowiedziała);
//   4) brak sygnałów prompt injection;
//   5) zgłoszenie zawiera dokładnie jedno twierdzenie;
//   6) treść nie próbuje sterować rolą ani wyglądem.
// Każda wątpliwość daje rolę domyślną. Rola nigdy nie wpływa na werdykt, siłę podstawy ani treść odpowiedzi.
import type { Topic } from '../contracts/claim';
import { DEFAULT_ROLE, type Role } from '../contracts/record';
import { CHILD_HARM_WORDS, CHILD_WORDS, SENSITIVE_WORDS } from './sensitive';
import { matchedEntries, type WordEntry } from './text';
import { TOPIC_WORDS } from './topics';

export { DEFAULT_ROLE, type Role };
export { SENSITIVE_WORDS } from './sensitive';
export { TOPIC_WORDS } from './topics';
export { fold, matchedEntries } from './text';

export const TOPIC_ROLE: Record<Topic, Role> = {
  sport_rozrywka: 'sport',
  przepisy_i_prawa_obywatela: 'bibliotekarka',
  inne: DEFAULT_ROLE,
};

/** Powody wyboru roli domyślnej (kody do zdarzeń; bez tekstu użytkownika). */
export type RoleReason =
  | 'temat_inne'
  | 'temat_niepotwierdzony'
  | 'temat_wrazliwy'
  | 'dopasowanie_incydentu'
  | 'incydenty_nieznane'
  | 'sygnal_injection'
  | 'liczba_twierdzen'
  | 'sterowanie_rola';

export interface RoleInput {
  /** Temat od modelu (z kroku wyodrębniania twierdzeń); brak = `inne`. */
  topic?: Topic;
  /** Teksty zgłoszenia do sprawdzenia słów (wejście po masce i twierdzenia). */
  texts: readonly string[];
  /** Liczba twierdzeń w zgłoszeniu (wszystkie wyodrębnione). */
  claimCount: number;
  /** Czy baza incydentów zwróciła dopasowanie. */
  incidentMatched: boolean;
  /** Czy sprawdzenie bazy incydentów się nie udało (wątpliwość). */
  incidentUnknown?: boolean;
  /** Liczba sygnałów prompt injection w zgłoszeniu. */
  injectionSignals: number;
}

export interface RoleDecision {
  role: Role;
  /** Puste przy roli lżejszej; inaczej wszystkie powody roli domyślnej. */
  reasons: RoleReason[];
}

function hits(texts: readonly string[], list: readonly WordEntry[]): number {
  let n = 0;
  for (const t of texts) n += matchedEntries(t, list).length;
  return n;
}

/** Czy tekst dotyczy tematu wrażliwego (lista słów albo dziecko w kontekście krzywdy). */
export function isSensitive(text: string): boolean {
  if (matchedEntries(text, SENSITIVE_WORDS).length > 0) return true;
  return matchedEntries(text, CHILD_WORDS).length > 0 && matchedEntries(text, CHILD_HARM_WORDS).length > 0;
}

/**
 * Słowa sterujące wyglądem: nazwy ról i prośby o rolę lub wygląd. Taka treść to dane, nie polecenie:
 * rola zostaje domyślna, a próbę odnotowuje silnik w zdarzeniach.
 */
const STEERING_WORDS: readonly WordEntry[] = [
  'pogodynk', 'bibliotekar', 'sportowiec', 'komentator sport',
  { stem: 'rola', exact: true }, { stem: 'role', exact: true }, { stem: 'roli', exact: true },
  { stem: 'rol', exact: true }, 'rolach', 'postac', 'wyglad', 'motyw', 'skork', 'tryb sport', 'widok',
];

export function detectRoleSteering(text: string): string[] {
  return matchedEntries(text, STEERING_WORDS);
}

/** Temat potwierdzony przez słowa tekstu: słowa tego tematu są, słów drugiego tematu brak. */
export function topicConfirmed(topic: Topic, texts: readonly string[]): boolean {
  if (topic === 'inne') return false;
  const other: Exclude<Topic, 'inne'> = topic === 'sport_rozrywka' ? 'przepisy_i_prawa_obywatela' : 'sport_rozrywka';
  return hits(texts, TOPIC_WORDS[topic]) > 0 && hits(texts, TOPIC_WORDS[other]) === 0;
}

/** Wskazówka tematu z samych słów (atrapa modelu w trybie mock i w testach). */
export function topicFromWords(text: string): Topic {
  if (topicConfirmed('sport_rozrywka', [text])) return 'sport_rozrywka';
  if (topicConfirmed('przepisy_i_prawa_obywatela', [text])) return 'przepisy_i_prawa_obywatela';
  return 'inne';
}

export function chooseRole(input: RoleInput): RoleDecision {
  const topic: Topic = input.topic ?? 'inne';
  const reasons: RoleReason[] = [];
  if (topic === 'inne') reasons.push('temat_inne');
  else if (!topicConfirmed(topic, input.texts)) reasons.push('temat_niepotwierdzony');
  if (input.texts.some(isSensitive)) reasons.push('temat_wrazliwy');
  if (input.incidentMatched) reasons.push('dopasowanie_incydentu');
  if (input.incidentUnknown) reasons.push('incydenty_nieznane');
  if (input.injectionSignals > 0) reasons.push('sygnal_injection');
  if (input.claimCount !== 1) reasons.push('liczba_twierdzen');
  if (input.texts.some((t) => detectRoleSteering(t).length > 0)) reasons.push('sterowanie_rola');
  return reasons.length > 0 ? { role: DEFAULT_ROLE, reasons } : { role: TOPIC_ROLE[topic], reasons };
}
