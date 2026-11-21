// Zadanie 25: diagnostyka etapów (bez sieci) i dopasowanie tez do twierdzeń.
import { describe, expect, it } from 'vitest';
import type { Passage, Searcher } from '../../src/contracts/index';
import type { EngineTraceEvent } from '../../src/engine/index';
import { bestThesisMatch, thesisMatchScore, type EvalCase } from '../../src/eval/cases';
import { diagnoseCase, diagnosisTable, summarizeDiagnosis } from '../../src/eval/diagnose';
import type { CaseOutcome } from '../../src/eval/metrics';

const searcher: Searcher = {
  corpusVersion: () => 'v',
  stats: () => ({ documents: 1, domains: 1, sourceTypes: 1 }),
  getPassage: () => null,
  search: async () => [] as Passage[],
};

function kase(over: Partial<EvalCase>): EvalCase {
  return { id: 'X01', scenario: 'A', category: 'prawda', supported: true, input: { text: 'Tekst zgłoszenia do sprawdzenia.' }, ...over } as EvalCase;
}
function outcome(over: Partial<CaseOutcome>): CaseOutcome {
  return {
    id: 'X01',
    scenario: 'A',
    category: 'prawda',
    supported: true,
    kind: 'record',
    correct: false,
    latencyMs: 0,
    costUsd: 0,
    llmCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    notices: [],
    injectionLogged: false,
    claims: [],
    ...over,
  };
}
const search = (role: 'za' | 'przeciw', docs: string[]): EngineTraceEvent => ({
  type: 'search',
  claimId: 'c1',
  role,
  query: 'q',
  passageIds: docs.map((d) => `${d}#0`),
  documentIds: docs,
});

describe('dopasowanie tezy', () => {
  it('słowo lub odmiana wygrywa z początkiem dłuższego słowa ("euro" a "europejskiej")', () => {
    const t = { keywords: ['euro'] };
    expect(thesisMatchScore('Polska jest członkiem Unii Europejskiej.', t)).toBe(1);
    expect(thesisMatchScore('W Polsce płaci się w euro.', t)).toBe(2);
    expect(thesisMatchScore('Polska ma złotego.', t)).toBe(0);
    const claims = ['Polska jest członkiem Unii Europejskiej.', 'W Polsce płaci się w euro.'];
    expect(bestThesisMatch(claims, (c) => c, t)).toBe('W Polsce płaci się w euro.');
    expect(bestThesisMatch(claims, (c) => c, { keywords: ['dolar'] })).toBeUndefined();
  });
});

describe('diagnostyka etapów', () => {
  it('etap pierwszego błędu i pozycje dokumentu wzorcowego', async () => {
    const c = kase({ goldDocs: ['g'], expected: { verdict: 'wprowadzajace_w_blad' } });
    const ev: EngineTraceEvent[] = [
      search('za', ['x', 'y', 'g']),
      search('przeciw', ['g']),
      { type: 'candidates', claimId: 'c1', passageIds: ['g#0', 'x#0'], documentIds: ['g', 'x'] },
      { type: 'assess', claimId: 'c1', items: [{ passageId: 'g#0', documentId: 'g', stance: 'rozbieznosc_kontekstu' }] },
      {
        type: 'gate',
        claimId: 'c1',
        before: [{ passageId: 'g#0', documentId: 'g', stance: 'rozbieznosc_kontekstu' }],
        after: [],
      },
      { type: 'verdict', claimId: 'c1', claimText: 'Teza.', kind: 'faktograficzna', verdict: 'brak_wystarczajacych_dowodow', abstain: 'brak_dowodow' },
    ];
    const [d] = await diagnoseCase(c, outcome({ predictedVerdict: 'brak_wystarczajacych_dowodow' }), ev, searcher, ['g#0']);
    expect(d).toMatchObject({ rankFor: 2, rankAgainst: 0, inCandidates: true, passageInCandidates: true, stage: 'c_bramka_wsparcia', abstain: 'brak_dowodow' });
    const s = summarizeDiagnosis([d!]);
    expect(s).toMatchObject({ items: 1, correct: 0, gateDropped: 1, wrongAbstain: 1 });
    expect(s.hitFor).toEqual({ top5: 1, top10: 1, top20: 1 });
    expect(diagnosisTable(s)).toContain('(c) właściwe stanowisko');
  });
  it('opinia zamiast twierdzenia faktograficznego: etap ekstrakcji; przypadek bez dokumentu wzorcowego pominięty', async () => {
    const c = kase({ goldDocs: ['g'], expected: { verdict: 'potwierdzone' } });
    const ev: EngineTraceEvent[] = [{ type: 'verdict', claimId: 'c1', claimText: 'Teza.', kind: 'prognoza', verdict: 'nie_podlega_weryfikacji' }];
    const [d] = await diagnoseCase(c, outcome({ predictedVerdict: 'nie_podlega_weryfikacji' }), ev, searcher);
    expect(d!.stage).toBe('e_ekstrakcja');
    expect(await diagnoseCase(kase({ expected: { verdict: 'potwierdzone' } }), outcome({}), ev, searcher)).toEqual([]);
  });
});
