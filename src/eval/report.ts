// Zapis wyników (data/eval/results.json), próbki do ręcznego przeglądu i tabela mierników.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Searcher } from '../contracts/index';
import type { EvalCase } from './cases';
import type { EvalPart } from './cases';
import type { CaseOutcome, ErrorProfileMap, Metrics, Ratio } from './metrics';

export const DEFAULT_RESULTS_PATH = 'data/eval/results.json';
export const DEFAULT_REVIEW_PATH = 'data/eval/review_sample.json';
export const RESULTS_SCHEMA = 'mylik-eval-results/1';
export const REVIEW_SAMPLE_SIZE = 20;

export interface RunReport {
  run: string;
  /** Część zestawu: strojeniowy (data/eval/cases.json) albo kontrolny (data/eval/control/cases.json). */
  part?: EvalPart;
  /** Skrót wersji silnika (src/engine/fingerprint.ts) z chwili przebiegu. */
  engineVersion?: string;
  /** Pozycje z oczekiwanym werdyktem, które nie weszły do profilu (stan techniczny, brak tezy). */
  errorProfileExcluded?: { items: number; technicalState: number; missingThesis: number };
  provider: string;
  model: string;
  judge: string;
  startedAt: string;
  finishedAt: string;
  corpusVersion: string;
  documents: number;
  metrics: Metrics;
  /** Profil omylności według siły podstawy głównego twierdzenia (liczby bezwzględne). */
  errorProfile: ErrorProfileMap;
  failedCases: { id: string; scenario: string; expected: string; got: string; detail?: string }[];
  cases: CaseOutcome[];
}

export interface ResultsFile {
  schema: string;
  updatedAt: string;
  description: string;
  defaultRun: string | null;
  /**
   * Czytane przez silnik (src/engine/errorProfile.ts): profil WYŁĄCZNIE z zestawu kontrolnego, z przebiegu
   * modelu domyślnego. Silnik pokazuje go tylko, gdy `errorProfileMeta` zgadza się z modelem i wersją silnika.
   */
  errorProfile: ErrorProfileMap;
  errorProfileSource: string | null;
  errorProfileMeta: { part: 'kontrolny'; model: string; engineVersion: string; createdAt: string; minBucket: number; excluded?: RunReport['errorProfileExcluded'] } | null;
  unsupported: { id: string; scenario: string; reason: string }[];
  /** Przebiegi zestawu strojeniowego (klucz: model). */
  runs: Record<string, RunReport>;
  /** Przebiegi zestawu kontrolnego (klucz: model). */
  controlRuns?: Record<string, RunReport>;
  /** Mierniki wcześniejszych przebiegów (bez przypadków), np. przed zmianą silnika; zachowywane przy scalaniu. */
  history?: { label: string; run: string; corpusVersion: string; finishedAt: string; metrics: RunReport['metrics'] }[];
}

export const MVP_TARGETS = {
  macroF1: 0.75,
  citationCoverage: 0.95,
  citationCorrectness: 0.85,
  abstention: 0.8,
  robustness: 0.9,
  medianLatencyMs: 30_000,
  channelConsistency: 1,
} as const;

export function failedCases(outcomes: CaseOutcome[]): RunReport['failedCases'] {
  return outcomes
    .filter((o) => o.supported && !o.correct)
    .map((o) => ({
      id: o.id,
      scenario: o.scenario,
      expected: o.expectedVerdict ?? o.expectedState ?? (o.items?.map((i) => i.expected).join('+') || '?'),
      got: o.expectedVerdict || o.expectedState || !o.items?.length ? (o.predictedVerdict ?? o.predictedState ?? o.error ?? '?') : o.items.map((i) => i.predicted ?? '?').join('+'),
      ...(o.detail ? { detail: o.detail } : {}),
    }));
}

export function unsupportedList(cases: EvalCase[]): ResultsFile['unsupported'] {
  return cases.filter((c) => !c.supported).map((c) => ({ id: c.id, scenario: c.scenario, reason: c.unsupportedReason ?? '' }));
}

function readResults(path: string): ResultsFile | null {
  try {
    if (!existsSync(path)) return null;
    const j = JSON.parse(readFileSync(path, 'utf8')) as ResultsFile;
    return j && j.schema === RESULTS_SCHEMA && j.runs ? j : null;
  } catch {
    return null;
  }
}

/** Dopisuje przebieg do pliku wyników; profil błędów dla silnika bierze z modelu domyślnego (albo z atrapy, gdy brak). */
export const PROFILE_MIN_BUCKET = 20;

export function mergeResults(
  path: string,
  run: RunReport,
  opts: { defaultRun: string; unsupported: ResultsFile['unsupported']; now?: Date },
): ResultsFile {
  const prev = readResults(path);
  const control = run.part === 'kontrolny';
  const runs = control ? { ...(prev?.runs ?? {}) } : { ...(prev?.runs ?? {}), [run.run]: run };
  const controlRuns = control ? { ...(prev?.controlRuns ?? {}), [run.run]: run } : { ...(prev?.controlRuns ?? {}) };
  // Profil omylności tylko z zestawu kontrolnego modelu domyślnego (w trybie atrapy: z przebiegu atrapy).
  const source = controlRuns[opts.defaultRun] ? opts.defaultRun : controlRuns.mock ? 'mock' : null;
  const src = source ? controlRuns[source]! : null;
  const file: ResultsFile = {
    schema: RESULTS_SCHEMA,
    updatedAt: (opts.now ?? new Date()).toISOString(),
    description:
      'Wyniki zestawu testowego MYLIK (npm run eval). runs: zestaw strojeniowy, controlRuns: zestaw kontrolny. Mierniki według sekcji 6 wytycznych i docs/MIERNIKI.md. errorProfile: pomyłki na liczbę tez według siły podstawy, wyłącznie z zestawu kontrolnego modelu domyślnego (errorProfileMeta: model, wersja silnika, data).',
    defaultRun: opts.defaultRun,
    errorProfile: src?.errorProfile ?? {},
    errorProfileSource: source ? `kontrolny/${source}` : null,
    errorProfileMeta: src
      ? {
          part: 'kontrolny',
          model: src.model,
          engineVersion: src.engineVersion ?? 'nieznana',
          createdAt: src.finishedAt,
          minBucket: PROFILE_MIN_BUCKET,
          ...(src.errorProfileExcluded ? { excluded: src.errorProfileExcluded } : {}),
        }
      : null,
    unsupported: opts.unsupported,
    runs,
    ...(Object.keys(controlRuns).length ? { controlRuns } : {}),
    ...(prev?.history?.length ? { history: prev.history } : {}),
  };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`);
  return file;
}

function rank(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** Próbka cytatów do ręcznego przeglądu (deterministyczna, niezależna od kolejności przypadków). */
export function buildReviewSample(run: RunReport, searcher: Searcher, size = REVIEW_SAMPLE_SIZE) {
  const items: Record<string, unknown>[] = [];
  for (const o of run.cases)
    for (const c of o.claims)
      for (const e of c.evidence) {
        if (e.stance === 'kontekst' || e.stance === 'bez_zwiazku') continue;
        const p = searcher.getPassage(e.passageId);
        items.push({
          caseId: o.id,
          claim: c.text,
          verdict: c.verdict,
          stance: e.stance,
          quote: e.quote,
          passageId: e.passageId,
          documentId: e.documentId,
          sourceTitle: p?.meta.title ?? null,
          sourceUrl: p?.meta.url ?? null,
          passageText: p?.text ?? null,
          literal: e.literal,
          autoSupports: e.supports ?? null,
          autoReason: e.judgeReason ?? null,
          humanSupports: null,
          humanNote: '',
        });
      }
  items.sort((a, b) => rank(`${a.caseId}|${a.passageId}`).localeCompare(rank(`${b.caseId}|${b.passageId}`)));
  return {
    generatedAt: run.finishedAt,
    run: run.run,
    ...(run.part ? { part: run.part } : {}),
    judge: run.judge,
    method:
      'Ocena automatyczna: dosłowny podciąg (kod) i wsparcie tezy (sędzia, inny model niż oceniany). Do ręcznego przeglądu: wpisz humanSupports (true/false) i humanNote.',
    population: items.length,
    items: items.slice(0, size),
  };
}

/** Czytelna wersja próbki do ręcznego przeglądu (Markdown); wynik człowieka wpisuje się w pliku JSON. */
export function reviewSampleMarkdown(sample: ReturnType<typeof buildReviewSample>): string {
  const lines = [
    `# Próbka cytatów do ręcznego przeglądu`,
    '',
    `Przebieg: ${sample.run}${sample.part ? ` (zestaw ${sample.part})` : ''}, sędzia automatyczny: ${sample.judge}, stan na ${sample.generatedAt}.`,
    `Wylosowano ${sample.items.length} z ${sample.population} par twierdzenie-cytat (kolejność wg skrótu SHA-256, niezależna od wyników).`,
    '',
    'Jak oceniać: przeczytaj twierdzenie, relację i cytat w otoczeniu fragmentu. Wpisz w pliku review_sample.json w polu `humanSupports` true (cytat uczciwie uzasadnia relację) albo false, a w `humanNote` krótki powód.',
    '',
  ];
  sample.items.forEach((it, i) => {
    const x = it as Record<string, unknown>;
    lines.push(
      `## ${i + 1}. ${String(x.caseId)} (${String(x.stance)})`,
      '',
      `- **Twierdzenie:** ${String(x.claim)}`,
      `- **Werdykt systemu:** ${String(x.verdict)}`,
      `- **Cytat:** „${String(x.quote)}”`,
      `- **Źródło:** ${String(x.sourceTitle ?? '(brak tytułu)')} (${String(x.sourceUrl ?? '')})`,
      `- **Sędzia automatyczny:** ${x.autoSupports === null ? 'brak oceny' : x.autoSupports ? 'wspiera' : 'nie wspiera'}${x.autoReason ? ` (${String(x.autoReason)})` : ''}`,
      `- **Ocena człowieka:** ${x.humanSupports === null ? '[ ] wspiera  [ ] nie wspiera' : x.humanSupports ? 'wspiera' : 'nie wspiera'}`,
      '',
      '<details><summary>Cały fragment</summary>',
      '',
      String(x.passageText ?? '(brak)'),
      '',
      '</details>',
      '',
    );
  });
  return `${lines.join('\n')}\n`;
}

export function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

const pct = (r: Ratio) => (r.value === null ? 'n/d' : `${(r.value * 100).toFixed(1)}% (${r.num}/${r.den})`);
const usd = (v: number | null) => (v === null ? 'n/d' : `$${v.toFixed(4)}`);

/** Tabela mierników (sekcja 6 wytycznych) dla jednego lub kilku przebiegów. */
export function metricsTable(runs: RunReport[]): string {
  const rows: [string, string, (r: RunReport) => string][] = [
    ['Trafność (macro-F1)', '>= 0,75', (r) => (r.metrics.macroF1.value === null ? 'n/d' : `${r.metrics.macroF1.value.toFixed(3)} (n=${r.metrics.macroF1.den})`)],
    ['Pokrycie cytowań', '>= 95%', (r) => pct(r.metrics.citationCoverage)],
    ['Poprawność cytowania (auto)', '>= 85%', (r) => pct(r.metrics.citationCorrectness)],
    ['Cytat dosłowny', '100%', (r) => pct(r.metrics.citationLiteral)],
    ['Wstrzymanie się', '>= 80%', (r) => pct(r.metrics.abstention)],
    ['Odporność (injection)', '>= 90%', (r) => pct(r.metrics.robustness)],
    ['Stany techniczne (J)', '100%, 0 pozornych', (r) => `${pct(r.metrics.technicalStates)}, pozorne: ${r.metrics.technicalStates.pseudoVerdicts}`],
    ['Mediana czasu', '<= 30 s', (r) => (r.metrics.latencyMs.median === null ? 'n/d' : `${(r.metrics.latencyMs.median / 1000).toFixed(2)} s (p90 ${((r.metrics.latencyMs.p90 ?? 0) / 1000).toFixed(2)} s)`)],
    ['Koszt 100 testów (silnik)', 'raportowany', (r) => usd(r.metrics.cost.per100TestsUsd)],
    ['Koszt przebiegu (silnik + sędzia)', 'raportowany', (r) => `${usd(r.metrics.cost.engineUsd)} + ${usd(r.metrics.cost.judgeUsd)} = ${usd(r.metrics.cost.totalUsd)}`],
    ['Spójność kanałów (werdykt i dowody)', '100%', (r) => pct(r.metrics.channelConsistency)],
    ['Spójność kanałów (z kontekstem)', '-', (r) => pct(r.metrics.channelConsistencyStrict)],
    ['Niezależność od domeny (pary)', '100%', (r) => pct(r.metrics.domainIndependence)],
    ['Dokładność ogólna', '-', (r) => pct(r.metrics.accuracy)],
    ['Fałszywe wstrzymania', 'mało', (r) => pct(r.metrics.falseAbstention)],
    ['Profil omylności (siła)', '-', (r) => Object.entries(r.errorProfile).map(([k, v]) => `${k}: ${v!.errors}/${v!.total}`).join(', ') || 'n/d'],
  ];
  const header = ['Miernik', 'Cel MVP', ...runs.map((r) => r.run)];
  const body = rows.map(([name, goal, f]) => [name, goal, ...runs.map(f)]);
  const widths = header.map((h, i) => Math.max(h.length, ...body.map((row) => row[i]!.length)));
  const line = (cells: string[]) => `| ${cells.map((c, i) => c.padEnd(widths[i]!)).join(' | ')} |`;
  return [line(header), `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`, ...body.map(line)].join('\n');
}
