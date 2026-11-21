// Mierniki z sekcji 6 wytycznych, liczone z wyników przypadków. Czyste funkcje, bez I/O.
import { STRENGTH_LEVELS, VERDICTS, type NoticeType, type Stance, type State, type StrengthLevel, type Verdict } from '../contracts/index';
import type { EvalCase } from './cases';

export interface EvidenceOutcome {
  passageId: string;
  documentId: string;
  stance: Stance;
  quote: string;
  /** Cytat jest dosłownym podciągiem fragmentu z bazy (sprawdzenie programowe). */
  literal: boolean;
  /** Ocena automatyczna sędziego (inny model niż oceniany); undefined = nie oceniano. */
  supports?: boolean;
  judgeReason?: string;
}

export interface ClaimOutcome {
  text: string;
  kind: string;
  verdict: Verdict;
  strength: StrengthLevel;
  evidence: EvidenceOutcome[];
}

/** Jedna oceniana pozycja: całe zgłoszenie (etykieta `verdict`) albo jedna teza zgłoszenia złożonego. */
export interface VerdictItem {
  /** Opis tezy (tylko przy etykietach per twierdzenie). */
  about?: string;
  expected: Verdict;
  /** Werdykt systemu, stan techniczny albo `brak_tezy` (system nie wyodrębnił takiej tezy). */
  predicted?: string;
  /** Siła podstawy twierdzenia, z którego wzięto werdykt (brak przy stanie). */
  strength?: StrengthLevel;
  correct: boolean;
}

export interface CaseOutcome {
  id: string;
  scenario: EvalCase['scenario'];
  category: EvalCase['category'];
  supported: boolean;
  expectedVerdict?: Verdict;
  expectedState?: State;
  expectedNotice?: NoticeType;
  /** Przypadek z tym samym tekstem innym wejściem (np. URL i tekst): oczekiwany ten sam wynik. */
  pairWith?: string;
  kind: 'record' | 'state' | 'skipped';
  predictedVerdict?: Verdict;
  predictedState?: State;
  /** Siła podstawy głównego twierdzenia. */
  strength?: StrengthLevel;
  /** Oceniane pozycje (macro-F1, profil omylności): jedna na zgłoszenie albo jedna na tezę. */
  items?: VerdictItem[];
  correct: boolean;
  latencyMs: number;
  costUsd: number;
  llmCalls: number;
  inputTokens: number;
  outputTokens: number;
  notices: NoticeType[];
  injectionLogged: boolean;
  claims: ClaimOutcome[];
  attack?: { resisted: boolean; ignored: boolean; logged: boolean; leaked: boolean };
  channel?: { consistent: boolean; strictConsistent: boolean; smsReplyMatches: boolean; www: string; sms: string };
  /** Szczegół techniczny stanu (np. `llm:timeout`), bez sekretów. */
  detail?: string;
  error?: string;
}

export interface Ratio {
  value: number | null;
  num: number;
  den: number;
}

export const ratio = (num: number, den: number): Ratio => ({ value: den > 0 ? num / den : null, num, den });

export interface ClassScore {
  precision: number | null;
  recall: number | null;
  f1: number | null;
  support: number;
}

export interface Metrics {
  cases: { total: number; supported: number; executed: number; unsupported: number };
  macroF1: { value: number | null; classes: Partial<Record<Verdict, ClassScore>>; den: number };
  accuracy: Ratio;
  citationCoverage: Ratio;
  citationLiteral: Ratio;
  citationCorrectness: Ratio & { method: string };
  abstention: Ratio;
  falseAbstention: Ratio;
  robustness: Ratio & { ignoredNotLogged: number };
  technicalStates: Ratio & { pseudoVerdicts: number };
  channelConsistency: Ratio;
  channelConsistencyStrict: Ratio;
  domainIndependence: Ratio;
  expectedNotices: Ratio;
  latencyMs: { median: number | null; p90: number | null; max: number | null; n: number };
  cost: { engineUsd: number; judgeUsd: number; totalUsd: number; per100TestsUsd: number | null; llmCalls: number; inputTokens: number; outputTokens: number };
}

export type ErrorProfileMap = Partial<Record<StrengthLevel, { errors: number; total: number }>>;

/** Dowód zgodny z werdyktem (podstawa werdyktu). */
export function alignedStance(v: Verdict): Stance | null {
  if (v === 'potwierdzone') return 'potwierdza';
  if (v === 'falszywe') return 'obala';
  if (v === 'wprowadzajace_w_blad') return 'rozbieznosc_kontekstu';
  return null;
}

const DECISIVE_STANCES: Stance[] = ['potwierdza', 'obala', 'rozbieznosc_kontekstu'];

export function macroF1(pairs: { expected: Verdict; predicted: string | undefined }[]): Metrics['macroF1'] {
  const classes: Partial<Record<Verdict, ClassScore>> = {};
  const f1s: number[] = [];
  for (const cls of VERDICTS) {
    const tp = pairs.filter((p) => p.expected === cls && p.predicted === cls).length;
    const fp = pairs.filter((p) => p.expected !== cls && p.predicted === cls).length;
    const fn = pairs.filter((p) => p.expected === cls && p.predicted !== cls).length;
    const support = tp + fn;
    if (support === 0 && fp === 0) continue;
    const precision = tp + fp > 0 ? tp / (tp + fp) : null;
    const recall = support > 0 ? tp / support : null;
    const f1 = tp === 0 ? 0 : (2 * tp) / (2 * tp + fp + fn);
    classes[cls] = { precision, recall, f1, support };
    // Macro-F1 na obsługiwanych klasach: klasy obecne w etykietach zestawu.
    if (support > 0) f1s.push(f1);
  }
  return { value: f1s.length ? f1s.reduce((a, b) => a + b, 0) / f1s.length : null, classes, den: pairs.length };
}

/** Pozycje z oczekiwanym werdyktem (per zgłoszenie albo per teza); przypadki pominięte też się liczą (jako brak odpowiedzi). */
export function verdictItems(outcomes: CaseOutcome[]): VerdictItem[] {
  return outcomes.flatMap((o) =>
    o.items?.length
      ? o.items
      : o.expectedVerdict
        ? [{ expected: o.expectedVerdict, ...(o.predictedVerdict ?? o.predictedState ? { predicted: o.predictedVerdict ?? o.predictedState } : {}), ...(o.strength ? { strength: o.strength } : {}), correct: o.correct }]
        : [],
  );
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]!;
}

export function computeMetrics(outcomes: CaseOutcome[], judge: { name: string; costUsd: number }): Metrics {
  const supported = outcomes.filter((o) => o.supported);
  const executed = supported.filter((o) => o.kind !== 'skipped');
  const pairs = verdictItems(supported).map((i) => ({ expected: i.expected, predicted: i.predicted }));

  // Pokrycie cytowań: tezy faktograficzne z werdyktem merytorycznym, które mają dosłowny dowód zgodny z werdyktem.
  let covNum = 0;
  let covDen = 0;
  let litNum = 0;
  let litDen = 0;
  let corNum = 0;
  let corDen = 0;
  for (const o of executed)
    for (const c of o.claims) {
      const aligned = alignedStance(c.verdict);
      if (c.kind === 'faktograficzna' && aligned) {
        covDen++;
        if (c.evidence.some((e) => e.stance === aligned && e.literal && e.quote.trim() !== '')) covNum++;
      }
      for (const e of c.evidence) {
        if (!DECISIVE_STANCES.includes(e.stance)) continue;
        litDen++;
        if (e.literal) litNum++;
        if (e.supports !== undefined) {
          corDen++;
          if (e.literal && e.supports) corNum++;
        }
      }
    }

  const noEvidence = executed.filter((o) => o.category === 'brak_dowodow');
  const shouldDecide = executed.filter((o) => o.expectedVerdict && o.expectedVerdict !== 'brak_wystarczajacych_dowodow');
  const attacks = executed.filter((o) => o.attack);
  const faults = executed.filter((o) => o.category === 'awaria');
  const channels = executed.filter((o) => o.channel);
  const withNotice = executed.filter((o) => o.expectedNotice);
  const byId = new Map(outcomes.map((o) => [o.id, o]));
  const pairsDone = new Set<string>();
  let pairNum = 0;
  let pairDen = 0;
  for (const o of executed) {
    const other = o.pairWith ? byId.get(o.pairWith) : undefined;
    if (!other || other.kind === 'skipped') continue;
    const key = [o.id, other.id].sort().join('|');
    if (pairsDone.has(key)) continue;
    pairsDone.add(key);
    pairDen++;
    if ((o.predictedVerdict ?? o.predictedState) === (other.predictedVerdict ?? other.predictedState)) pairNum++;
  }

  const latencies = executed.filter((o) => o.category !== 'awaria').map((o) => o.latencyMs);
  const engineUsd = executed.reduce((n, o) => n + o.costUsd, 0);
  const costCases = executed.filter((o) => o.category !== 'awaria');

  return {
    cases: { total: outcomes.length, supported: supported.length, executed: executed.length, unsupported: outcomes.length - supported.length },
    macroF1: macroF1(pairs),
    accuracy: ratio(executed.filter((o) => o.correct).length, executed.length),
    citationCoverage: ratio(covNum, covDen),
    citationLiteral: ratio(litNum, litDen),
    citationCorrectness: { ...ratio(corNum, corDen), method: `automatyczna (${judge.name}), dosłowny podciąg + ocena wsparcia tezy` },
    abstention: ratio(noEvidence.filter((o) => o.predictedVerdict === 'brak_wystarczajacych_dowodow').length, noEvidence.length),
    falseAbstention: ratio(shouldDecide.filter((o) => o.predictedVerdict === 'brak_wystarczajacych_dowodow').length, shouldDecide.length),
    robustness: {
      ...ratio(attacks.filter((o) => o.attack!.resisted).length, attacks.length),
      ignoredNotLogged: attacks.filter((o) => o.attack!.ignored && !o.attack!.logged).length,
    },
    technicalStates: {
      ...ratio(faults.filter((o) => o.correct).length, faults.length),
      pseudoVerdicts: faults.filter((o) => o.kind === 'record').length,
    },
    channelConsistency: ratio(channels.filter((o) => o.channel!.consistent && o.channel!.smsReplyMatches).length, channels.length),
    channelConsistencyStrict: ratio(channels.filter((o) => o.channel!.strictConsistent && o.channel!.smsReplyMatches).length, channels.length),
    domainIndependence: ratio(pairNum, pairDen),
    expectedNotices: ratio(withNotice.filter((o) => o.notices.includes(o.expectedNotice!)).length, withNotice.length),
    latencyMs: { median: median(latencies), p90: percentile(latencies, 90), max: latencies.length ? Math.max(...latencies) : null, n: latencies.length },
    cost: {
      engineUsd,
      judgeUsd: judge.costUsd,
      totalUsd: engineUsd + judge.costUsd,
      per100TestsUsd: costCases.length ? (costCases.reduce((n, o) => n + o.costUsd, 0) / costCases.length) * 100 : null,
      llmCalls: executed.reduce((n, o) => n + o.llmCalls, 0),
      inputTokens: executed.reduce((n, o) => n + o.inputTokens, 0),
      outputTokens: executed.reduce((n, o) => n + o.outputTokens, 0),
    },
  };
}

/**
 * Profil omylności według siły podstawy: liczby bezwzględne (np. 2 pomyłki na 31). Pozycja = teza z oczekiwanym
 * werdyktem, na którą system odpowiedział werdyktem (także wstrzymaniem się: trafnym albo nie). Odpowiedzi stanem
 * technicznym i brak tezy nie mają siły, więc nie wchodzą do koszyków (liczone osobno: `errorProfileExcluded`).
 */
/** Pozycje z oczekiwanym werdyktem, które nie trafiły do profilu (stan techniczny, brak tezy). */
export function errorProfileExcluded(outcomes: CaseOutcome[]): { items: number; technicalState: number; missingThesis: number } {
  let technicalState = 0;
  let missingThesis = 0;
  for (const o of outcomes) {
    if (!o.supported) continue;
    for (const i of verdictItems([o])) {
      if (i.strength && o.kind === 'record') continue;
      if (o.kind !== 'record') technicalState++;
      else missingThesis++;
    }
  }
  return { items: technicalState + missingThesis, technicalState, missingThesis };
}

export function errorProfileByStrength(outcomes: CaseOutcome[]): ErrorProfileMap {
  const out: ErrorProfileMap = {};
  for (const o of outcomes) {
    if (!o.supported || o.kind !== 'record') continue;
    for (const i of verdictItems([o])) {
      if (!i.strength) continue;
      const cell = (out[i.strength] ??= { errors: 0, total: 0 });
      cell.total++;
      if (!i.correct) cell.errors++;
    }
  }
  // Stała kolejność kluczy.
  const sorted: ErrorProfileMap = {};
  for (const l of STRENGTH_LEVELS) if (out[l]) sorted[l] = out[l];
  return sorted;
}
