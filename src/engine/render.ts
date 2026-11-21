// Składanie zdań dla obywatela (uzasadnienie twierdzenia, krótka odpowiedź) przez moduł src/render.
// Silnik zna tylko interfejs `EngineRenderer`; gdy moduł zawiedzie lub zwróci tekst niezgodny
// z kontraktem, używamy szablonów silnika (explain.ts), żeby błąd renderowania nie psuł rekordu.
import {
  SHORT_ANSWER_MAX_CHARS,
  VERDICT_LABELS_PL,
  type ClaimResult,
  type VerificationRecord,
} from '../contracts/index';
import { renderExplanation, renderShortAnswer } from '../render/index';

export interface EngineRenderer {
  explanation(claim: ClaimResult, asOf: string): string;
  shortAnswer(record: VerificationRecord): string;
}

/** Względny adres karty rekordu w interfejsie WWW (kanał może go poprzedzić własnym hostem). */
export function cardPath(recordId: string): string {
  return `/#/rekord/${recordId}`;
}

/** Zapasowa krótka odpowiedź z werdyktów (gdy moduł renderowania zawiedzie). */
export function buildShortAnswer(results: readonly ClaimResult[], asOf: string): string {
  const head = `Stan na ${asOf.slice(0, 10)}: `;
  const body =
    results.length === 0
      ? 'brak twierdzeń do oceny.'
      : results.map((r) => `${VERDICT_LABELS_PL[r.verdict]}: ${r.claim.text}`).join(' | ');
  const full = head + body;
  return full.length <= SHORT_ANSWER_MAX_CHARS ? full : `${full.slice(0, SHORT_ANSWER_MAX_CHARS - 1).trimEnd()}…`;
}

export const defaultRenderer: EngineRenderer = {
  explanation: (claim, asOf) => renderExplanation(claim, asOf),
  shortAnswer: (record) => renderShortAnswer(record, cardPath(record.id)),
};

export function safeExplanation(r: EngineRenderer, claim: ClaimResult, asOf: string): string {
  try {
    const s = r.explanation(claim, asOf);
    if (typeof s === 'string' && s.trim()) return s;
  } catch {
    // zostaje szablon silnika
  }
  return claim.explanation;
}

export function safeShortAnswer(r: EngineRenderer, record: VerificationRecord): string {
  try {
    const s = r.shortAnswer(record);
    if (typeof s === 'string' && s.trim() && s.length <= SHORT_ANSWER_MAX_CHARS) return s;
  } catch {
    // zostaje wersja zapasowa
  }
  return buildShortAnswer(record.claims, record.asOf);
}
