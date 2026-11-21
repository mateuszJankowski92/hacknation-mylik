// Profil błędów systemu wg siły podstawy, czytany z pliku wyników zestawu testowego (ewaluacji).
// Brak pliku lub nieznany format = brak profilu (pole `errorProfile` pominięte). Nigdy nie wpływa
// na werdykt ani siłę; to informacja, jak często system mylił się dla podobnej siły podstawy.
import { existsSync, readFileSync } from 'node:fs';
import { STRENGTH_LEVELS, type ErrorProfile, type StrengthLevel } from '../contracts/index';

export const DEFAULT_EVAL_RESULTS_PATH = 'data/eval/results.json';

export type ErrorProfileTable = Partial<Record<StrengthLevel, { errors: number; total: number }>>;

export function bucketName(level: StrengthLevel): string {
  return `sila_${level}`;
}

const isLevel = (v: unknown): v is StrengthLevel => typeof v === 'string' && (STRENGTH_LEVELS as readonly string[]).includes(v);
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

function fromMap(map: unknown): ErrorProfileTable | null {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return null;
  const out: ErrorProfileTable = {};
  for (const [k, v] of Object.entries(map as Record<string, unknown>)) {
    const level = k.startsWith('sila_') ? k.slice(5) : k;
    if (!isLevel(level) || !v || typeof v !== 'object') continue;
    const { errors, total } = v as { errors?: unknown; total?: unknown };
    if (isCount(errors) && isCount(total) && errors <= total && total > 0) out[level] = { errors, total };
  }
  return Object.keys(out).length ? out : null;
}

function itemLevel(item: Record<string, unknown>): StrengthLevel | null {
  const s = item.strength ?? item.strengthLevel ?? item.sila;
  if (isLevel(s)) return s;
  if (s && typeof s === 'object' && isLevel((s as { level?: unknown }).level)) return (s as { level: StrengthLevel }).level;
  return null;
}

function itemCorrect(item: Record<string, unknown>): boolean | null {
  for (const k of ['correct', 'ok', 'pass', 'passed']) if (typeof item[k] === 'boolean') return item[k] as boolean;
  const expected = item.expected ?? item.expectedVerdict;
  const actual = item.actual ?? item.actualVerdict ?? item.predicted ?? item.verdict;
  if (typeof expected === 'string' && typeof actual === 'string') return expected === actual;
  return null;
}

function fromItems(list: unknown): ErrorProfileTable | null {
  if (!Array.isArray(list)) return null;
  const out: ErrorProfileTable = {};
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const level = itemLevel(item);
    const correct = itemCorrect(item);
    if (!level || correct === null) continue;
    const cell = (out[level] ??= { errors: 0, total: 0 });
    cell.total++;
    if (!correct) cell.errors++;
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Akceptowane formaty pliku:
 * - `{ "errorProfile" | "byStrength": { "<poziom>": { "errors": n, "total": m } } }` (także klucze `sila_<poziom>`);
 * - `{ "results" | "items" | "cases": [ { "strength": "<poziom>" | {"level"}, "correct": bool } ] }`
 *   (zamiast `correct`: `expected` i `actual`/`verdict`);
 * - sama tablica pozycji jak wyżej.
 */
export function parseErrorProfileTable(json: unknown): ErrorProfileTable | null {
  if (Array.isArray(json)) return fromItems(json);
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  return (
    fromMap(o.errorProfile) ??
    fromMap(o.byStrength) ??
    fromItems(o.results) ??
    fromItems(o.items) ??
    fromItems(o.cases) ??
    fromMap(o)
  );
}

/** Czyta plik wyników; brak pliku, błąd odczytu lub nieznany format -> null. */
export function loadErrorProfileTable(path: string): ErrorProfileTable | null {
  try {
    if (!existsSync(path)) return null;
    return parseErrorProfileTable(JSON.parse(readFileSync(path, 'utf8')));
  } catch {
    return null;
  }
}

export function errorProfileFor(table: ErrorProfileTable | null, level: StrengthLevel): ErrorProfile | undefined {
  const cell = table?.[level];
  if (!cell) return undefined;
  return { bucket: bucketName(level), errors: cell.errors, total: cell.total };
}
