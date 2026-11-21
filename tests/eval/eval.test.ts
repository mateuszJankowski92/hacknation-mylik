// Zestaw testowy (zad. 11): dane przypadków, mierniki, przebieg w trybie mock (bez klucza i sieci).
import { mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseErrorProfileTable } from '../../src/engine/index';
import {
  computeMetrics,
  errorProfileByStrength,
  judgeModelFor,
  loadCases,
  macroF1,
  median,
  mergeResults,
  runEval,
  type CaseOutcome,
  type RunReport,
} from '../../src/eval/index';

const ROOT = process.cwd();
const file = loadCases(join(ROOT, 'data/eval/cases.json'));
const cases = file.cases;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('dane zestawu testowego', () => {
  it('ma 40-60 przypadków ze scenariuszy A-J i wymaganych kategorii', () => {
    expect(cases.length).toBeGreaterThanOrEqual(40);
    expect(cases.length).toBeLessThanOrEqual(60);
    const scen = new Set(cases.map((c) => c.scenario));
    for (const s of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']) expect(scen.has(s as never)).toBe(true);
    const cat = new Set(cases.map((c) => c.category));
    for (const k of ['prawda', 'falsz', 'czesciowa_prawda', 'nieaktualne', 'sprzeczne', 'brak_dowodow', 'injection', 'awaria'])
      expect(cat.has(k as never)).toBe(true);
    expect(cases.filter((c) => c.category === 'injection').length).toBeGreaterThanOrEqual(5);
  });

  it('dokumenty wzorcowe istnieją w katalogu korpusu', () => {
    const catalog = JSON.parse(readFileSync(join(ROOT, 'data/sources.json'), 'utf8')) as {
      sources: { documents: { id: string }[] }[];
    };
    const ids = new Set(catalog.sources.flatMap((s) => s.documents.map((d) => d.id)));
    for (const c of cases) for (const d of c.goldDocs ?? []) expect(ids.has(d), `${c.id}: ${d}`).toBe(true);
  });

  it('nieobsługiwane przypadki mają powód; pary odwołują się do istniejących przypadków', () => {
    for (const c of cases.filter((x) => !x.supported)) expect(c.unsupportedReason).toBeTruthy();
    expect(cases.filter((c) => !c.supported).map((c) => c.scenario).sort()).toEqual(['F', 'H']);
  });

  it('Z8: treść przypadków nie występuje w kodzie silnika, modelu ani kanałów', () => {
    const sources = walk(join(ROOT, 'src'))
      .filter((p) => !p.includes(`${join('src', 'eval')}`))
      .map((p) => readFileSync(p, 'utf8'))
      .join('\n');
    const needles = cases.flatMap((c) => [
      'text' in c.input ? c.input.text : c.input.url,
      ...(c.fixturePassages ?? []).map((f) => f.text),
      ...(c.page ? [c.page.text] : []),
    ]);
    for (const n of needles) if (n.length > 20) expect(sources.includes(n), n).toBe(false);
    expect(sources.includes('cases.json')).toBe(false);
  });
});

function outcome(over: Partial<CaseOutcome>): CaseOutcome {
  return {
    id: 'X01',
    scenario: 'A',
    category: 'prawda',
    supported: true,
    kind: 'record',
    correct: false,
    latencyMs: 1000,
    costUsd: 0.01,
    llmCalls: 2,
    inputTokens: 100,
    outputTokens: 10,
    notices: [],
    injectionLogged: false,
    claims: [],
    ...over,
  };
}

describe('mierniki', () => {
  it('macro-F1 liczy średnią F1 klas obecnych w etykietach', () => {
    const r = macroF1([
      { expected: 'potwierdzone', predicted: 'potwierdzone' },
      { expected: 'potwierdzone', predicted: 'falszywe' },
      { expected: 'falszywe', predicted: 'falszywe' },
      { expected: 'brak_wystarczajacych_dowodow', predicted: 'awaria_techniczna' },
    ]);
    // potwierdzone: tp1 fn1 -> 2/3; falszywe: tp1 fp1 -> 2/3; brak: 0 -> średnia 4/9
    expect(r.value).toBeCloseTo(4 / 9, 6);
    expect(r.classes.brak_wystarczajacych_dowodow?.f1).toBe(0);
  });

  it('mediana i profil omylności według siły (liczby bezwzględne)', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    const p = errorProfileByStrength([
      outcome({ id: 'a', expectedVerdict: 'potwierdzone', predictedVerdict: 'potwierdzone', correct: true, strength: 'wysoka' }),
      outcome({ id: 'b', expectedVerdict: 'falszywe', predictedVerdict: 'potwierdzone', correct: false, strength: 'wysoka' }),
      outcome({ id: 'c', expectedVerdict: 'falszywe', predictedVerdict: 'falszywe', correct: true, strength: 'niska' }),
      outcome({ id: 'd', expectedState: 'awaria_techniczna', kind: 'state', correct: true }),
    ]);
    expect(p).toEqual({ wysoka: { errors: 1, total: 2 }, niska: { errors: 0, total: 1 } });
    expect(parseErrorProfileTable({ errorProfile: p })).toEqual(p);
  });

  it('pokrycie i poprawność cytowań, wstrzymanie, odporność, stany', () => {
    const m = computeMetrics(
      [
        outcome({
          id: 'a',
          expectedVerdict: 'potwierdzone',
          predictedVerdict: 'potwierdzone',
          correct: true,
          claims: [
            {
              text: 't',
              kind: 'faktograficzna',
              verdict: 'potwierdzone',
              strength: 'srednia',
              evidence: [
                { passageId: 'p#0', documentId: 'p', stance: 'potwierdza', quote: 'q', literal: true, supports: true },
                { passageId: 'r#0', documentId: 'r', stance: 'potwierdza', quote: 'z', literal: true, supports: false },
              ],
            },
          ],
        }),
        outcome({ id: 'b', category: 'brak_dowodow', expectedVerdict: 'brak_wystarczajacych_dowodow', predictedVerdict: 'brak_wystarczajacych_dowodow', correct: true }),
        outcome({ id: 'c', category: 'injection', attack: { resisted: true, ignored: true, logged: true, leaked: false } }),
        outcome({ id: 'd', category: 'awaria', kind: 'record', expectedState: 'awaria_techniczna', predictedVerdict: 'potwierdzone' }),
      ],
      { name: 'mock', costUsd: 0.5 },
    );
    expect(m.citationCoverage).toMatchObject({ num: 1, den: 1 });
    expect(m.citationCorrectness).toMatchObject({ num: 1, den: 2 });
    expect(m.abstention).toMatchObject({ num: 1, den: 1 });
    expect(m.robustness).toMatchObject({ num: 1, den: 1 });
    expect(m.technicalStates).toMatchObject({ num: 0, den: 1, pseudoVerdicts: 1 });
    expect(m.cost.judgeUsd).toBe(0.5);
    expect(m.cost.per100TestsUsd).toBeCloseTo(1, 6);
  });

  it('sędzia cytatów to zawsze inny model niż oceniany', () => {
    for (const m of ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5']) expect(judgeModelFor(m)).not.toBe(m);
  });
});

describe('przebieg mock (bez klucza i sieci)', () => {
  it('liczy mierniki, zapisuje wyniki czytelne dla silnika i próbkę do przeglądu', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mylik-eval-'));
    const resultsPath = join(dir, 'results.json');
    const reviewPath = join(dir, 'review.json');
    const only = ['A01', 'A13', 'D01', 'E01', 'E04', 'G01', 'I01', 'I02', 'J01', 'J04', 'K03', 'F01'];
    const res = await runEval({ rootDir: ROOT, provider: 'mock', resultsPath, reviewPath, only, defaultRun: 'claude-haiku-5-5' });
    expect(res.outcomes).toHaveLength(only.length);
    const byId = new Map(res.outcomes.map((o) => [o.id, o]));
    expect(byId.get('F01')!.kind).toBe('skipped');
    expect(byId.get('J01')!.predictedState).toBe('awaria_techniczna');
    expect(byId.get('J04')!.predictedState).toBe('brak_mozliwosci_sprawdzenia');
    expect(res.run.metrics.technicalStates.pseudoVerdicts).toBe(0);
    expect(byId.get('E01')!.injectionLogged).toBe(true);
    expect(byId.get('G01')!.channel?.smsReplyMatches).toBe(true);
    expect(res.run.metrics.cost.engineUsd).toBe(0);

    const saved = JSON.parse(readFileSync(resultsPath, 'utf8'));
    expect(saved.runs.mock).toBeTruthy();
    expect(saved.errorProfileSource).toBe('mock');
    expect(saved.unsupported.map((u: { id: string }) => u.id)).toEqual(['F01', 'H01']);
    expect(parseErrorProfileTable(saved)).not.toBeNull();
    const review = JSON.parse(readFileSync(reviewPath, 'utf8'));
    expect(review.items.length).toBeGreaterThan(0);
    expect(review.items[0]).toHaveProperty('humanSupports', null);

    // Przebieg modelu domyślnego ma pierwszeństwo jako źródło profilu dla silnika.
    const fake: RunReport = { ...res.run, run: 'claude-haiku-5-5', errorProfile: { srednia: { errors: 2, total: 31 } } };
    const merged = mergeResults(resultsPath, fake, { defaultRun: 'claude-haiku-5-5', unsupported: [] });
    expect(Object.keys(merged.runs).sort()).toEqual(['claude-haiku-5-5', 'mock']);
    expect(merged.errorProfile).toEqual({ srednia: { errors: 2, total: 31 } });
  }, 60_000);
});
