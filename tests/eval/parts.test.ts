// Zad. 20: ocena per teza, sędzia z otoczeniem cytatu, profil omylności tylko z zestawu kontrolnego.
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { computeEngineFingerprint, verifiedErrorProfile } from '../../src/engine/index';
import {
  buildJudgeMessage,
  errorProfileByStrength,
  errorProfileExcluded,
  JUDGE_SYSTEM_PROMPT,
  macroF1,
  matchesThesis,
  parseCases,
  verdictItems,
  type CaseOutcome,
} from '../../src/eval/index';
import { SUPPORT_GATE_SYSTEM_PROMPT } from '../../src/llm/prompts';

const base = (over: Partial<CaseOutcome>): CaseOutcome => ({
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
});

describe('ocena per teza', () => {
  it('dopasowanie tezy po początkach słów', () => {
    expect(matchesThesis('Sprawca był obywatelem innego kraju.', { keywords: ['obywatel'] })).toBe(true);
    expect(matchesThesis('Sprawca był żołnierzem.', { keywords: ['obywatel'] })).toBe(false);
    expect(matchesThesis('Ala ma kota i psa.', { keywords: ['kot', 'ps'] })).toBe(true);
  });
  it('schemat: dokładnie jedno z verdict, state, claims', () => {
    const mk = (expected: unknown) => ({ version: 1, cases: [{ id: 'A01', scenario: 'A', category: 'prawda', input: { text: 'x' }, expected }] });
    expect(() => parseCases(mk({ claims: [{ about: 'a', keywords: ['xx'], verdict: 'falszywe' }] }))).not.toThrow();
    expect(() => parseCases(mk({ verdict: 'falszywe', claims: [{ about: 'a', keywords: ['x'], verdict: 'falszywe' }] }))).toThrow();
  });
  it('macro-F1 i profil liczone z pozycji (tez), stan techniczny poza profilem', () => {
    const outs = [
      base({
        id: 'I02',
        correct: false,
        items: [
          { about: 'a', expected: 'falszywe', predicted: 'falszywe', strength: 'srednia', correct: true },
          { about: 'b', expected: 'brak_wystarczajacych_dowodow', predicted: 'potwierdzone', strength: 'niska', correct: false },
        ],
      }),
      base({ id: 'A01', expectedVerdict: 'potwierdzone', predictedVerdict: 'potwierdzone', strength: 'srednia', correct: true }),
      base({ id: 'B04', kind: 'state', expectedVerdict: 'wprowadzajace_w_blad', predictedState: 'awaria_techniczna', correct: false }),
    ];
    expect(verdictItems(outs)).toHaveLength(4);
    expect(macroF1(verdictItems(outs).map((i) => ({ expected: i.expected, predicted: i.predicted }))).den).toBe(4);
    expect(errorProfileByStrength(outs)).toEqual({ srednia: { errors: 0, total: 2 }, niska: { errors: 1, total: 1 } });
    expect(errorProfileExcluded(outs)).toEqual({ items: 1, technicalState: 1, missingThesis: 0 });
  });
});

describe('sędzia cytowań', () => {
  it('widzi tytuł i cały fragment; prompt inny niż bramki wsparcia', () => {
    const m = buildJudgeMessage([{ claim: 'T', stance: 'potwierdza', quote: 'Q', title: 'Tytuł', passage: 'Cały fragment Q.' }]);
    expect(m).toContain('<tytul_dokumentu>Tytuł</tytul_dokumentu>');
    expect(m).toContain('<fragment>Cały fragment Q.</fragment>');
    expect(JUDGE_SYSTEM_PROMPT).not.toBe(SUPPORT_GATE_SYSTEM_PROMPT);
    expect(SUPPORT_GATE_SYSTEM_PROMPT.includes(JUDGE_SYSTEM_PROMPT.slice(0, 40))).toBe(false);
  });
});

describe('profil omylności: tylko kontrolny, ten model, ta wersja silnika, koszyk >= 20', () => {
  const meta = { part: 'kontrolny', model: 'm', engineVersion: 'v1', createdAt: 'x' };
  const errorProfile = { srednia: { errors: 3, total: 25 }, niska: { errors: 2, total: 5 } };
  it('małe koszyki ukryte, zgodne metadane wymagane', () => {
    expect(verifiedErrorProfile({ errorProfile, errorProfileMeta: meta }, { model: 'm', engineVersion: 'v1' })).toEqual({ srednia: { errors: 3, total: 25 } });
    expect(verifiedErrorProfile({ errorProfile, errorProfileMeta: { ...meta, part: 'strojeniowy' } }, { model: 'm', engineVersion: 'v1' })).toBeNull();
    expect(verifiedErrorProfile({ errorProfile }, { model: 'm', engineVersion: 'v1' })).toBeNull();
    expect(verifiedErrorProfile({ errorProfile: { niska: { errors: 2, total: 5 } }, errorProfileMeta: meta }, { model: 'm', engineVersion: 'v1' })).toBeNull();
  });
  it('skrót wersji silnika zależy od treści plików', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mylik-fp-'));
    for (const d of ['engine', 'llm', 'contracts']) mkdirSync(join(dir, d));
    writeFileSync(join(dir, 'engine', 'a.ts'), 'export const a = 1;');
    const one = computeEngineFingerprint(dir);
    expect(computeEngineFingerprint(dir)).toBe(one);
    writeFileSync(join(dir, 'llm', 'b.ts'), 'export const b = 2;');
    expect(computeEngineFingerprint(dir)).not.toBe(one);
  });
});
