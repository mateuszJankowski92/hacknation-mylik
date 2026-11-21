// Schemat i wczytywanie przypadków zestawu testowego (data/eval/cases.json).
// Przypadki to wyłącznie dane dla ewaluacji: nigdy nie trafiają do promptów ani do silnika (Z8).
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { NOTICE_TYPES, STATES, VERDICTS } from '../contracts/index';

export const DEFAULT_CASES_PATH = 'data/eval/cases.json';
/** Zestaw KONTROLNY: pisany osobno, nigdy nie służy do zmian w silniku ani promptach. */
export const DEFAULT_CONTROL_CASES_PATH = 'data/eval/control/cases.json';
/** Zestaw KONTROLNY v2 (zad. 26): czysty pomiar po zad. 25; od niego pochodzi profil omylności. */
export const DEFAULT_CONTROL_V2_CASES_PATH = 'data/eval/control_v2/cases.json';
export const EVAL_PARTS = ['strojeniowy', 'kontrolny', 'kontrolny_v2'] as const;
export type EvalPart = (typeof EVAL_PARTS)[number];

/** Domyślna ścieżka przypadków części zestawu. */
export function casesPathFor(part: EvalPart): string {
  return part === 'kontrolny' ? DEFAULT_CONTROL_CASES_PATH : part === 'kontrolny_v2' ? DEFAULT_CONTROL_V2_CASES_PATH : DEFAULT_CASES_PATH;
}

/** Identyfikatory przypadków oznaczonych w pliku jako wątpliwe (`doubtful: true`; pole spoza schematu). */
export function doubtfulCaseIds(path: string): string[] {
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as { cases?: { id?: unknown; doubtful?: unknown }[] };
    return (raw.cases ?? []).filter((c) => c.doubtful === true && typeof c.id === 'string').map((c) => c.id as string);
  } catch {
    return [];
  }
}
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

/**
 * Etykieta jednej tezy zgłoszenia złożonego (ocena per twierdzenie). Teza jest odnajdywana wśród
 * twierdzeń wyodrębnionych przez system po słowach kluczowych (początki słów, wszystkie muszą wystąpić).
 */
export const ThesisSchema = z.object({
  about: z.string().min(1),
  keywords: z.array(z.string().min(2)).min(1),
  verdict: z.enum(VERDICTS),
});
export type Thesis = z.infer<typeof ThesisSchema>;

const ExpectedSchema = z
  .object({
    verdict: z.enum(VERDICTS).optional(),
    state: z.enum(STATES).optional(),
    claims: z.array(ThesisSchema).min(1).optional(),
    notice: z.enum(NOTICE_TYPES).optional(),
  })
  .refine((e) => [e.verdict, e.state, e.claims].filter((x) => x !== undefined).length === 1, {
    message: 'Podaj dokładnie jedno: verdict, state albo claims (etykiety tez).',
  });

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

/** Twierdzenie pasuje do tezy, gdy każde słowo kluczowe jest początkiem któregoś słowa twierdzenia. */
export function matchesThesis(claimText: string, thesis: Pick<Thesis, 'keywords'>): boolean {
  const words = claimText.toLocaleLowerCase('pl').match(/[\p{L}\p{N}]+/gu) ?? [];
  return thesis.keywords.every((k) => {
    const key = k.toLocaleLowerCase('pl');
    return words.some((w) => w.startsWith(key));
  });
}

/** Słowo kluczowe pasuje jako odmiana (końcówka do 4 znaków), nie jako początek innego słowa ("euro" a "europejskiej"). */
const INFLECTION_TAIL = 4;

/**
 * Siła dopasowania twierdzenia do tezy: 0, gdy nie pasuje; inaczej suma po słowach kluczowych
 * (2 = słowo lub jego odmiana, 1 = tylko początek dłuższego słowa).
 */
export function thesisMatchScore(claimText: string, thesis: Pick<Thesis, 'keywords'>): number {
  if (!matchesThesis(claimText, thesis)) return 0;
  const words = claimText.toLocaleLowerCase('pl').match(/[\p{L}\p{N}]+/gu) ?? [];
  let score = 0;
  for (const k of thesis.keywords) {
    const key = k.toLocaleLowerCase('pl');
    score += words.some((w) => w.startsWith(key) && w.length - key.length <= INFLECTION_TAIL) ? 2 : 1;
  }
  return score;
}

/** Twierdzenie najlepiej pasujące do tezy (przy remisie pierwsze); brak = teza niewyodrębniona. */
export function bestThesisMatch<T>(items: readonly T[], text: (t: T) => string, thesis: Pick<Thesis, 'keywords'>): T | undefined {
  let best: T | undefined;
  let bestScore = 0;
  for (const it of items) {
    const s = thesisMatchScore(text(it), thesis);
    if (s > bestScore) [best, bestScore] = [it, s];
  }
  return best;
}

export function loadCases(path = DEFAULT_CASES_PATH): CasesFile {
  return parseCases(JSON.parse(readFileSync(path, 'utf8')));
}

export function caseInputText(c: EvalCase): string {
  return 'text' in c.input ? c.input.text : c.input.url;
}
