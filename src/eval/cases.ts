// Schemat i wczytywanie przypadków zestawu testowego (data/eval/cases.json).
// Przypadki to wyłącznie dane dla ewaluacji: nigdy nie trafiają do promptów ani do silnika (Z8).
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { NOTICE_TYPES, STATES, VERDICTS } from '../contracts/index';

export const DEFAULT_CASES_PATH = 'data/eval/cases.json';
export const DEFAULT_INCIDENTS_FIXTURE = 'data/eval/incidents_fixture.json';

export const SCENARIOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'inne'] as const;
export const CATEGORIES = [
  'prawda',
  'falsz',
  'czesciowa_prawda',
  'nieaktualne',
  'sprzeczne',
  'brak_dowodow',
  'opinia',
  'doprecyzowanie',
  'injection',
  'spojnosc',
  'url_incydent',
  'awaria',
  'multimodal',
  'petla',
] as const;
export const FAULTS = ['no_key', 'rate_limit', 'timeout', 'provider_error', 'invalid_output', 'search_down', 'empty_corpus'] as const;
export type Fault = (typeof FAULTS)[number];

const ExpectedSchema = z
  .object({
    verdict: z.enum(VERDICTS).optional(),
    state: z.enum(STATES).optional(),
    notice: z.enum(NOTICE_TYPES).optional(),
  })
  .refine((e) => (e.verdict === undefined) !== (e.state === undefined), { message: 'Podaj dokładnie jedno: verdict albo state.' });

export const EvalCaseSchema = z
  .object({
    id: z.string().regex(/^[A-Z]\d{2}$/),
    scenario: z.enum(SCENARIOS),
    category: z.enum(CATEGORIES),
    supported: z.boolean().default(true),
    unsupportedReason: z.string().optional(),
    input: z.union([z.object({ text: z.string().min(1) }), z.object({ url: z.string().min(1) })]),
    page: z.object({ title: z.string().optional(), text: z.string().min(1) }).optional(),
    fixturePassages: z.array(z.object({ id: z.string().min(1), text: z.string().min(1), domain: z.string().min(1) })).optional(),
    fault: z.enum(FAULTS).optional(),
    channels: z.boolean().optional(),
    pairWith: z.string().optional(),
    expected: ExpectedSchema.optional(),
    attack: z
      .object({
        forbiddenVerdict: z.enum(VERDICTS).optional(),
        forbiddenText: z.array(z.string().min(1)).optional(),
        leakPrompt: z.boolean().optional(),
      })
      .optional(),
    goldDocs: z.array(z.string().min(1)).optional(),
    note: z.string().optional(),
  })
  .refine((c) => !c.supported || c.expected !== undefined, { message: 'Obsługiwany przypadek wymaga pola expected.' })
  .refine((c) => c.supported || !!c.unsupportedReason, { message: 'Nieobsługiwany przypadek wymaga unsupportedReason.' });
export type EvalCase = z.infer<typeof EvalCaseSchema>;

export const CasesFileSchema = z.object({
  version: z.number().int(),
  description: z.string().optional(),
  corpusCommit: z.string().optional(),
  labeledAt: z.string().optional(),
  cases: z.array(EvalCaseSchema).min(1),
});
export type CasesFile = z.infer<typeof CasesFileSchema>;

export function parseCases(json: unknown): CasesFile {
  const file = CasesFileSchema.parse(json);
  const ids = new Set<string>();
  for (const c of file.cases) {
    if (ids.has(c.id)) throw new Error(`Powtórzony identyfikator przypadku: ${c.id}`);
    ids.add(c.id);
  }
  for (const c of file.cases) if (c.pairWith && !ids.has(c.pairWith)) throw new Error(`pairWith ${c.id} -> nieznany ${c.pairWith}`);
  return file;
}

export function loadCases(path = DEFAULT_CASES_PATH): CasesFile {
  return parseCases(JSON.parse(readFileSync(path, 'utf8')));
}

export function caseInputText(c: EvalCase): string {
  return 'text' in c.input ? c.input.text : c.input.url;
}
