// Rola wyglądu na żywo (zad. 13b, D): wszystkie role, w tym dwie sportowe. Rolę wybiera KOD po słowach z pliku
// konfiguracyjnego (live-words.ts), nigdy model; rola nie wpływa na werdykt, siłę podstawy ani treść.
// Rola lekka tylko, gdy temat jest neutralny (brak powodów poważnych), zgłoszenie ma dokładnie jedno twierdzenie
// i jedna rola (lub jedna rodzina sportowa) ma wyraźną przewagę liczby trafień. Każda wątpliwość daje pogodynka.
import type { VerificationRecord } from '../contracts/record';
import {
  DEFAULT_LIVE_ROLE,
  LIVE_ROLES,
  LIVE_ROLE_WORDS,
  SPORT_FAMILY,
  SPORT_TIE_ROLE,
  type LiveRole,
} from './live-words';
import { detectRoleSteering } from './index';
import { matchedEntries } from './text';
import { isSeriousText, recordTexts, seriousReasons, type SeriousReason } from './serious';

export { DEFAULT_LIVE_ROLE, LIVE_ROLES, type LiveRole };

export function isLiveRole(value: unknown): value is LiveRole {
  return typeof value === 'string' && (LIVE_ROLES as readonly string[]).includes(value);
}

export type LiveRoleReason = SeriousReason | 'liczba_twierdzen' | 'brak_dopasowania' | 'niejednoznaczne';

export interface LiveRoleInput {
  texts: readonly string[];
  claimCount: number;
  incidentMatched?: boolean;
  injectionSignals?: number;
  seriousReasons?: readonly SeriousReason[];
}

export interface LiveRoleDecision {
  role: LiveRole;
  serious: boolean;
  reasons: LiveRoleReason[];
  scores: Partial<Record<LiveRole, number>>;
}

/** Wygląd zapisany przy rekordzie; trafia do odpowiedzi API obok rekordu. */
export interface Appearance {
  role: LiveRole;
  serious: boolean;
}

export function liveRoleScores(texts: readonly string[]): Partial<Record<LiveRole, number>> {
  const scores: Partial<Record<LiveRole, number>> = {};
  for (const role of LIVE_ROLES) {
    if (role === DEFAULT_LIVE_ROLE) continue;
    const stems = new Set<string>();
    for (const text of texts) for (const stem of matchedEntries(text, LIVE_ROLE_WORDS[role as Exclude<LiveRole, 'pogodynka'>])) stems.add(stem);
    if (stems.size > 0) scores[role] = stems.size;
  }
  return scores;
}

function familyOf(role: LiveRole): string {
  return SPORT_FAMILY.includes(role) ? 'sport' : role;
}

function pickFromScores(scores: Partial<Record<LiveRole, number>>): LiveRole | null {
  const families = new Map<string, number>();
  for (const [role, score] of Object.entries(scores) as [LiveRole, number][]) {
    const family = familyOf(role);
    families.set(family, (families.get(family) ?? 0) + score);
  }
  const ranked = [...families.entries()].sort((a, b) => b[1] - a[1]);
  const best = ranked[0];
  if (!best) return null;
  if (ranked[1] && ranked[1][1] === best[1]) return null;
  if (best[0] !== 'sport') return best[0] as LiveRole;
  const sport = SPORT_FAMILY.map((role) => ({ role, score: scores[role] ?? 0 })).sort((a, b) => b.score - a.score);
  const top = sport[0]!;
  const second = sport[1];
  if (second && second.score === top.score) return SPORT_TIE_ROLE;
  return top.role;
}

export function chooseLiveRole(input: LiveRoleInput): LiveRoleDecision {
  const reasons: LiveRoleReason[] = [...(input.seriousReasons ?? [])];
  if (input.incidentMatched && !reasons.includes('dopasowanie_incydentu')) reasons.push('dopasowanie_incydentu');
  if ((input.injectionSignals ?? 0) > 0 && !reasons.includes('sygnal_injection')) reasons.push('sygnal_injection');
  const serious = reasons.length > 0;
  if (input.claimCount !== 1) reasons.push('liczba_twierdzen');
  const scores = liveRoleScores(input.texts);
  if (reasons.length > 0) return { role: DEFAULT_LIVE_ROLE, serious, reasons, scores };
  if (Object.keys(scores).length === 0) return { role: DEFAULT_LIVE_ROLE, serious, reasons: ['brak_dopasowania'], scores };
  const role = pickFromScores(scores);
  if (!role) return { role: DEFAULT_LIVE_ROLE, serious, reasons: ['niejednoznaczne'], scores };
  return { role, serious, reasons: [], scores };
}

type RoleRecord = Pick<VerificationRecord, 'maskedInput' | 'claims' | 'notices' | 'injectionSignals'>;

export function decideLiveRole(record: RoleRecord): LiveRoleDecision {
  const reasons = seriousReasons(record);
  return chooseLiveRole({ texts: recordTexts(record), claimCount: record.claims.length, seriousReasons: reasons });
}

export function appearanceOf(decision: LiveRoleDecision): Appearance {
  return { role: decision.role, serious: decision.serious };
}

/** Przewidywanie roli sceny czekania z samego zgłoszenia (przed odpowiedzią silnika); ostrożne, bez znajomości incydentów. */
export function predictLiveRole(text: string): LiveRole {
  const reasons: SeriousReason[] = [];
  if (isSeriousText([text])) reasons.push('temat_powazny');
  if (detectRoleSteering(text).length > 0) reasons.push('sterowanie_rola');
  return chooseLiveRole({ texts: [text], claimCount: 1, seriousReasons: reasons }).role;
}
