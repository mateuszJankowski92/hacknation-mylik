// Zestaw testowy i mierniki (zad. 11). Wejście: data/eval/cases.json; wyjście: data/eval/results.json.
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { LlmProvider } from '../contracts/index';
import { AnthropicProvider, DEFAULT_ANTHROPIC_MODEL, MockLlmProvider } from '../llm/index';
import { engineFingerprint } from '../engine/index';
import { DEFAULT_CASES_PATH, DEFAULT_CONTROL_CASES_PATH, loadCases, type EvalCase, type EvalPart } from './cases';
import { AnthropicJudge, judgeModelFor, MockJudge, type CitationJudge } from './judge';
import { computeMetrics, errorProfileByStrength, errorProfileExcluded, type CaseOutcome } from './metrics';
import {
  buildReviewSample,
  DEFAULT_RESULTS_PATH,
  DEFAULT_REVIEW_PATH,
  failedCases,
  mergeResults,
  reviewSampleMarkdown,
  unsupportedList,
  writeJson,
  type ResultsFile,
  type RunReport,
} from './report';
import { judgeCitations, loadCorpus, loadIncidentFixture, runCases, type CorpusHandle } from './runner';

export * from './cases';
export * from './judge';
export * from './metrics';
export * from './report';
export * from './runner';

export interface EvalOptions {
  rootDir?: string;
  provider: 'mock' | 'anthropic';
  /** Model ocenianego dostawcy anthropic (pusty = domyślny dostawcy). */
  model?: string;
  apiKey?: string;
  /** Część zestawu (domyślnie strojeniowy). Ustala domyślną ścieżkę przypadków. */
  part?: EvalPart;
  casesPath?: string;
  resultsPath?: string;
  reviewPath?: string;
  /** Zapis próbki do przeglądu (domyślnie: dla modelu prawdziwego albo gdy pliku brak). */
  writeReview?: boolean;
  /** Nazwa przebiegu modelu domyślnego (źródło errorProfile dla silnika). */
  defaultRun?: string;
  concurrency?: number;
  /** Ograniczenie do wybranych przypadków (rozwój, testy). */
  only?: string[];
  corpus?: CorpusHandle;
  /**
   * Katalog z korpusem (data/sources.json i data/raw). Domyślnie `rootDir`. Pozwala porównywać
   * przebiegi na zamrożonej kopii korpusu, gdy repozytorium dostaje nowe dokumenty.
   */
  corpusRoot?: string;
  llm?: LlmProvider;
  judge?: CitationJudge;
  log?: (line: string) => void;
}

export interface EvalResult {
  run: RunReport;
  file: ResultsFile;
  outcomes: CaseOutcome[];
}

export async function runEval(opts: EvalOptions): Promise<EvalResult> {
  const rootDir = opts.rootDir ?? process.cwd();
  const log = opts.log ?? (() => {});
  const part: EvalPart = opts.part ?? 'strojeniowy';
  const all = loadCases(resolve(rootDir, opts.casesPath ?? (part === 'kontrolny' ? DEFAULT_CONTROL_CASES_PATH : DEFAULT_CASES_PATH))).cases;
  const cases: EvalCase[] = opts.only?.length ? all.filter((c) => opts.only!.includes(c.id)) : all;
  const corpusRoot = resolve(rootDir, opts.corpusRoot ?? '.');
  const corpus = opts.corpus ?? loadCorpus(corpusRoot);
  const model = opts.provider === 'mock' ? 'mock' : opts.model?.trim() || DEFAULT_ANTHROPIC_MODEL;
  const llm: LlmProvider =
    opts.llm ?? (opts.provider === 'mock' ? new MockLlmProvider() : new AnthropicProvider({ apiKey: opts.apiKey, model }));
  const judge: CitationJudge =
    opts.judge ?? (opts.provider === 'mock' ? new MockJudge() : new AnthropicJudge(judgeModelFor(model), opts.apiKey));
  const startedAt = new Date().toISOString();
  log(`Przebieg ${model} (zestaw ${part}): ${cases.length} przypadków, korpus ${corpus.version} (${corpus.documents} dokumentów), sędzia ${judge.name}`);

  const outcomes = await runCases(cases, {
    llm,
    corpus,
    corpusForSms: () => loadCorpus(corpusRoot),
    incidents: loadIncidentFixture(rootDir),
    concurrency: opts.concurrency ?? (opts.provider === 'mock' ? 1 : 3),
    onCase: (o) =>
      log(
        `  ${o.id} ${o.supported ? (o.correct ? 'OK ' : 'ŹLE') : 'POM'} oczekiwane=${o.expectedVerdict ?? o.expectedState ?? '-'} wynik=${o.predictedVerdict ?? o.predictedState ?? '-'} ${(o.latencyMs / 1000).toFixed(1)}s $${o.costUsd.toFixed(4)}`,
      ),
  });
  const judgeCost = await judgeCitations(outcomes, judge, opts.provider === 'mock' ? 1 : 3, (id) => corpus.searcher.getPassage(id));
  const metrics = computeMetrics(outcomes, { name: judge.name, costUsd: judgeCost });
  const run: RunReport = {
    run: model,
    part,
    engineVersion: engineFingerprint(),
    errorProfileExcluded: errorProfileExcluded(outcomes),
    provider: opts.provider,
    model,
    judge: judge.name,
    startedAt,
    finishedAt: new Date().toISOString(),
    corpusVersion: corpus.version,
    documents: corpus.documents,
    metrics,
    errorProfile: errorProfileByStrength(outcomes),
    failedCases: failedCases(outcomes),
    cases: outcomes,
  };
  const resultsPath = resolve(rootDir, opts.resultsPath ?? DEFAULT_RESULTS_PATH);
  const file = mergeResults(resultsPath, run, {
    defaultRun: opts.defaultRun ?? DEFAULT_ANTHROPIC_MODEL,
    unsupported: unsupportedList(all),
  });
  const reviewPath = resolve(rootDir, opts.reviewPath ?? DEFAULT_REVIEW_PATH);
  const writeReview = opts.writeReview ?? (opts.provider !== 'mock' || !existsSync(reviewPath));
  if (writeReview) {
    const sample = buildReviewSample(run, corpus.searcher);
    writeJson(reviewPath, sample);
    writeFileSync(reviewPath.replace(/\.json$/, '') + '.md', reviewSampleMarkdown(sample));
  }
  return { run, file, outcomes };
}
