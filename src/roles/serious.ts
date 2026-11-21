// Poważny temat (zad. 13b): wspólna definicja dla wyglądu wyniku. Poważny temat = lista tematów wrażliwych
// (src/roles/sensitive.ts) plus dodatkowe słowa (live-words.ts) oraz warunki wymuszające rolę poważną
// (dopasowanie znanej operacji, sygnał prompt injection, próba sterowania wyglądem).
// Poważny temat nigdy nie dostaje roli lekkiej ani obrazu pogody, tylko gest wskazania cytatu i daty.
import type { VerificationRecord } from '../contracts/record';
import { detectRoleSteering, isSensitive } from './index';
import { SERIOUS_EXTRA_WORDS, SPORT_SHOT_CONTEXT, SPORT_SHOT_PATTERN } from './live-words';
import { fold, matchedEntries } from './text';

/** Zdejmuje formy "strzelił gola" ze słów, ale tylko w tekście ze słowami sportowymi. */
function withoutSportShots(text: string): string {
  if (matchedEntries(text, SPORT_SHOT_CONTEXT).length === 0) return text;
  return fold(text)
    .split(' ')
    .filter((token) => !SPORT_SHOT_PATTERN.test(token))
    .join(' ');
}

export function isSeriousTopic(text: string): boolean {
  if (isSensitive(withoutSportShots(text))) return true;
  return matchedEntries(text, SERIOUS_EXTRA_WORDS).length > 0;
}

export function isSeriousText(texts: readonly string[]): boolean {
  return texts.some(isSeriousTopic);
}

/** Teksty rekordu, po których poznajemy temat: zgłoszenie po masce i twierdzenia. */
export function recordTexts(record: Pick<VerificationRecord, 'maskedInput' | 'claims'>): string[] {
  return [record.maskedInput, ...record.claims.map((result) => result.claim.text)];
}

export type SeriousReason = 'temat_powazny' | 'dopasowanie_incydentu' | 'sygnal_injection' | 'sterowanie_rola';

/** Powody, dla których wynik ma wyglądać poważnie (puste = temat neutralny). */
export function seriousReasons(record: Pick<VerificationRecord, 'maskedInput' | 'claims' | 'notices' | 'injectionSignals'>): SeriousReason[] {
  const texts = recordTexts(record);
  const reasons: SeriousReason[] = [];
  if (isSeriousText(texts)) reasons.push('temat_powazny');
  if (record.notices.some((notice) => notice.type === 'dopasowanie_incydentu')) reasons.push('dopasowanie_incydentu');
  if (record.injectionSignals.length > 0) reasons.push('sygnal_injection');
  if (texts.some((text) => detectRoleSteering(text).length > 0)) reasons.push('sterowanie_rola');
  return reasons;
}

export function isSeriousRecord(record: Pick<VerificationRecord, 'maskedInput' | 'claims' | 'notices' | 'injectionSignals'>): boolean {
  return seriousReasons(record).length > 0;
}
