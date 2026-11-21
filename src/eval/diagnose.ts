// Diagnostyka etapów silnika na zestawie z dokumentami wzorcowymi (`goldDocs`). Tylko liczby zbiorcze:
// gdzie ginie dokument wskazany jako podstawa (ekstrakcja, wyszukiwanie, ocena, bramka, reguły). Ewaluacja
// tylko obserwuje silnik przez `options.trace`; nic stąd nie trafia do silnika ani promptów (Z8).
import type { Searcher, Verdict } from '../contracts/index';
import type { EngineTraceEvent } from '../engine/index';
import { bestThesisMatch, type EvalCase } from './cases';
import type { CaseOutcome } from './metrics';

const STANCE_FOR: Partial<Record<Verdict, string>> = {
  potwierdzone: 'potwierdza',
  falszywe: 'obala',
  wprowadzajace_w_blad: 'rozbieznosc_kontekstu',
};
const DECISIVE = new Set(['potwierdza', 'obala', 'rozbieznosc_kontekstu']);
export const DIAG_DEPTHS = [5, 10, 20] as const;

export type DiagStage =
  | 'e_ekstrakcja'
  | 'a_wyszukiwanie'
  | 'b_ocena_bez_zwiazku_lub_kontekst'
  | 'b2_ocena_inne_stanowisko'
  | 'c0_bramka_cytatow_kod'
  | 'c_bramka_wsparcia'
  | 'd_reguly';

/** Diagnoza jednej pozycji (teza zgłoszenia złożonego albo całe zgłoszenie) z etykietą rozstrzygającą. */
export interface ItemDiagnosis {
  id: string;
  about?: string;
  expected: Verdict;
  predicted: string;
  correct: boolean;
  /** Najlepsza pozycja (0 = pierwsza) dokumentu wzorcowego w przebiegu "za"/"przeciw"; null = brak w 20. */
  rankFor: number | null;
  rankAgainst: number | null;
  /** Dokument wzorcowy (dowolny jego fragment) trafił do kandydatów oceny stanowiska. */
  inCandidates: boolean;
  /** Fragment wskazany w zestawie jako dowód trafił do kandydatów (gdy zestaw je podaje). */
  passageInCandidates: boolean | null;
  goldStances: string[];
  /** Rozstrzygające dowody z dokumentu wzorcowego po kodowej bramce cytatów (przed bramką wsparcia) i po niej. */
  goldBeforeGate: string[];
  goldAfterGate: string[];
  /** Rozstrzygające dowody z innych dokumentów po bramce wsparcia. */
  otherAfterGate: string[];
  abstain?: string;
  stage: DiagStage | null;
}

function firstRank(ids: readonly string[], gold: ReadonlySet<string>): number | null {
  const i = ids.findIndex((d) => gold.has(d));
  return i < 0 ? null : i;
}

const minRank = (a: number | null, b: number | null) => (a === null ? b : b === null ? a : Math.min(a, b));

/** Pozycja dokumentu wzorcowego w puli; gdy pula krótsza niż 20 i go brak, ponowne zapytanie z limitem 20. */
async function rankInSearch(
  e: Extract<EngineTraceEvent, { type: 'search' }>,
  gold: ReadonlySet<string>,
  searcher: Searcher,
): Promise<number | null> {
  const r = firstRank(e.documentIds, gold);
  if (r !== null || e.documentIds.length >= 20) return r;
  const found = await searcher.search(e.query, { limit: 20 });
  return firstRank(
    found.map((p) => p.documentId),
    gold,
  );
}

async function diagnoseItem(
  base: { id: string; about?: string; expected: Verdict; predicted: string; correct: boolean },
  events: readonly EngineTraceEvent[],
  factual: boolean,
  gold: ReadonlySet<string>,
  goldPassages: ReadonlySet<string>,
  searcher: Searcher,
): Promise<ItemDiagnosis> {
  const wanted = STANCE_FOR[base.expected]!;
  let rankFor: number | null = null;
  let rankAgainst: number | null = null;
  let inCandidates = false;
  let passageIn = false;
  let abstain: string | undefined;
  const goldStances: string[] = [];
  const before: string[] = [];
  const after: string[] = [];
  const other: string[] = [];
  for (const e of events) {
    if (e.type === 'search') {
      const r = await rankInSearch(e, gold, searcher);
      if (e.role === 'za') rankFor = minRank(rankFor, r);
      else rankAgainst = minRank(rankAgainst, r);
    } else if (e.type === 'candidates') {
      if (e.documentIds.some((d) => gold.has(d))) inCandidates = true;
      if (e.passageIds.some((p) => goldPassages.has(p))) passageIn = true;
    } else if (e.type === 'assess') {
      for (const it of e.items) if (gold.has(it.documentId)) goldStances.push(it.stance);
    } else if (e.type === 'gate') {
      for (const it of e.before) if (gold.has(it.documentId) && DECISIVE.has(it.stance)) before.push(it.stance);
      for (const it of e.after) {
        if (!DECISIVE.has(it.stance)) continue;
        if (gold.has(it.documentId)) after.push(it.stance);
        else other.push(it.stance);
      }
    } else if (e.type === 'verdict' && e.abstain) abstain = e.abstain;
  }
  let stage: DiagStage | null = null;
  if (!base.correct) {
    const decisive = goldStances.filter((s) => DECISIVE.has(s));
    if (!factual) stage = 'e_ekstrakcja';
    else if (!inCandidates) stage = 'a_wyszukiwanie';
    else if (decisive.length === 0) stage = 'b_ocena_bez_zwiazku_lub_kontekst';
    else if (!decisive.includes(wanted)) stage = 'b2_ocena_inne_stanowisko';
    else if (!before.includes(wanted)) stage = 'c0_bramka_cytatow_kod';
    else if (!after.includes(wanted)) stage = 'c_bramka_wsparcia';
    else stage = 'd_reguly';
  }
  return {
    ...base,
    rankFor,
    rankAgainst,
    inCandidates,
    passageInCandidates: goldPassages.size ? passageIn : null,
    goldStances,
    goldBeforeGate: before,
    goldAfterGate: after,
    otherAfterGate: other,
    ...(abstain ? { abstain } : {}),
    stage,
  };
}

/**
 * Pozycje przypadku z etykietą rozstrzygającą i dokumentem wzorcowym. Teza zgłoszenia złożonego
 * dostaje zdarzenia swojego twierdzenia (dopasowanie jak w mierniku); zgłoszenie z jedną etykietą
 * dostaje zdarzenia wszystkich twierdzeń.
 */
export async function diagnoseCase(
  c: EvalCase,
  outcome: CaseOutcome,
  events: readonly EngineTraceEvent[],
  searcher: Searcher,
  goldPassageIds: readonly string[] = [],
): Promise<ItemDiagnosis[]> {
  if (!c.goldDocs?.length) return [];
  const gold = new Set(c.goldDocs);
  const goldPassages = new Set(goldPassageIds);
  const verdicts = events.filter((e): e is Extract<EngineTraceEvent, { type: 'verdict' }> => e.type === 'verdict');
  const out: ItemDiagnosis[] = [];
  if (c.expected?.claims) {
    for (const [i, t] of c.expected.claims.entries()) {
      if (!STANCE_FOR[t.verdict]) continue;
      const item = outcome.items?.[i];
      const v = bestThesisMatch(verdicts, (x) => x.claimText, t);
      const own = v ? events.filter((e) => 'claimId' in e && e.claimId === v.claimId) : [];
      out.push(
        await diagnoseItem(
          { id: c.id, about: t.about, expected: t.verdict, predicted: String(item?.predicted ?? 'brak'), correct: !!item?.correct },
          own,
          v?.kind === 'faktograficzna',
          gold,
          goldPassages,
          searcher,
        ),
      );
    }
  } else if (c.expected?.verdict && STANCE_FOR[c.expected.verdict]) {
    out.push(
      await diagnoseItem(
        {
          id: c.id,
          expected: c.expected.verdict,
          predicted: String(outcome.predictedVerdict ?? outcome.predictedState ?? 'brak'),
          correct: outcome.correct,
        },
        events,
        verdicts.some((v) => v.kind === 'faktograficzna'),
        gold,
        goldPassages,
        searcher,
      ),
    );
  }
  return out;
}

export interface DiagnosisSummary {
  items: number;
  correct: number;
  hitFor: Record<string, number>;
  hitAgainst: Record<string, number>;
  hitAny: Record<string, number>;
  inCandidates: number;
  passageInCandidates: number;
  passageKnown: number;
  /** Dokument w kandydatach, ale wszystkie jego fragmenty ocenione jako bez_zwiazku/kontekst. */
  judgedIrrelevant: number;
  /** Ocenione rozstrzygająco, ale inne stanowisko niż oczekiwane. */
  judgedOtherStance: number;
  /** Właściwe stanowisko przed bramką wsparcia, po niej brak właściwego. */
  gateDropped: number;
  /** Właściwe stanowisko po bramce, a etykieta inna niż oczekiwana. */
  rulesOther: number;
  /** Błędne pozycje zakończone wstrzymaniem (brak wystarczających dowodów). */
  wrongAbstain: number;
  stages: Record<string, number>;
}

export function summarizeDiagnosis(list: readonly ItemDiagnosis[]): DiagnosisSummary {
  const hit = (pick: (d: ItemDiagnosis) => number | null) =>
    Object.fromEntries(
      DIAG_DEPTHS.map((k) => [
        `top${k}`,
        list.filter((d) => {
          const r = pick(d);
          return r !== null && r < k;
        }).length,
      ]),
    );
  const stages: Record<string, number> = {};
  for (const d of list) if (d.stage) stages[d.stage] = (stages[d.stage] ?? 0) + 1;
  const wanted = (d: ItemDiagnosis) => STANCE_FOR[d.expected]!;
  return {
    items: list.length,
    correct: list.filter((d) => d.correct).length,
    hitFor: hit((d) => d.rankFor),
    hitAgainst: hit((d) => d.rankAgainst),
    hitAny: hit((d) => minRank(d.rankFor, d.rankAgainst)),
    inCandidates: list.filter((d) => d.inCandidates).length,
    passageInCandidates: list.filter((d) => d.passageInCandidates === true).length,
    passageKnown: list.filter((d) => d.passageInCandidates !== null).length,
    judgedIrrelevant: list.filter((d) => d.inCandidates && !d.goldStances.some((s) => DECISIVE.has(s))).length,
    judgedOtherStance: list.filter((d) => d.goldStances.some((s) => DECISIVE.has(s)) && !d.goldStances.includes(wanted(d))).length,
    gateDropped: list.filter((d) => d.goldBeforeGate.includes(wanted(d)) && !d.goldAfterGate.includes(wanted(d))).length,
    rulesOther: list.filter((d) => d.stage === 'd_reguly').length,
    wrongAbstain: list.filter((d) => !d.correct && d.predicted === 'brak_wystarczajacych_dowodow').length,
    stages,
  };
}

export function diagnosisTable(s: DiagnosisSummary): string {
  const n = s.items;
  const of = (x: number, d = n) => `${x}/${d}`;
  const rows: [string, string][] = [
    ['pozycje z dokumentem wzorcowym i etykietą rozstrzygającą', String(n)],
    ['trafne', of(s.correct)],
    ...DIAG_DEPTHS.map((k): [string, string] => [
      `(a) dokument wzorcowy w top ${k}: za / przeciw / którykolwiek`,
      `${of(s.hitFor[`top${k}`]!)} / ${of(s.hitAgainst[`top${k}`]!)} / ${of(s.hitAny[`top${k}`]!)}`,
    ]),
    ['(a) dokument wzorcowy wśród kandydatów oceny', of(s.inCandidates)],
    ['(a) fragment wzorcowy wśród kandydatów oceny', of(s.passageInCandidates, s.passageKnown)],
    ['(b) w kandydatach, ale oceniony jako bez związku/kontekst', of(s.judgedIrrelevant)],
    ['(b2) oceniony rozstrzygająco, ale inne stanowisko', of(s.judgedOtherStance)],
    ['(c) właściwe stanowisko odrzucone lub zmienione przez bramkę wsparcia', of(s.gateDropped)],
    ['(d) właściwe stanowisko po bramce, inna etykieta (reguły)', of(s.rulesOther)],
    ['błędne pozycje zakończone wstrzymaniem', String(s.wrongAbstain)],
    ...Object.entries(s.stages)
      .sort()
      .map(([k, v]): [string, string] => [`etap pierwszego błędu: ${k}`, String(v)]),
  ];
  const w = Math.max(...rows.map((r) => r[0].length));
  return rows.map(([a, b]) => `${a.padEnd(w)}  ${b}`).join('\n');
}
