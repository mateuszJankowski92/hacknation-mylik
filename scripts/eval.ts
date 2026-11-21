// npm run eval [-- --mock] [--model <id>] [--compare] [--part strojeniowy|kontrolny|kontrolny_v2|oba|wszystkie] [--only A01,B02]
//   [--concurrency N] [--out <plik>] [--review <plik>] [--corpus-root <katalog>]
//   [--no-rank] [--live] [--diagnose --diag-out <plik>]
//   --live: druga warstwa źródeł (zad. 29, tylko anthropic); wyniki domyślnie do data/eval/results_live.json,
//   żeby nie zmieniać profilu omylności liczonego bez niej. Domyślnie przebiegi idą BEZ drugiej warstwy.
//   --diagnose: przebieg diagnostyczny etapów, bez sędziego i bez zapisu results.json
// Części: strojeniowy (data/eval/cases.json), kontrolny (data/eval/control/cases.json, pomijany, gdy pliku brak)
// i kontrolny_v2 (data/eval/control_v2/cases.json; tylko jawnie: --part kontrolny_v2 albo wszystkie).
// Zestawu kontrolnego nie używa się do zmian w silniku ani promptach; profil omylności pochodzi tylko z niego.
// Liczy mierniki z sekcji 6 wytycznych i zapisuje data/eval/results.json (z niego profil błędów czyta silnik).
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../src/config';
import { DEFAULT_ANTHROPIC_MODEL } from '../src/llm/index';
import { createProductionLiveLayer, type LiveLayer } from '../src/live/index';
import {
  DEFAULT_CONTROL_CASES_PATH,
  DEFAULT_CONTROL_V2_CASES_PATH,
  diagnosisTable,
  metricsTable,
  runDiagnosis,
  runEval,
  type EvalPart,
  type ResultsFile,
  type RunReport,
} from '../src/eval/index';

/** Pełne porównanie modeli (identyfikatory z tabeli modeli skilla claude-api, stan 2026-11-03). */
const COMPARE_MODELS = ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'] as const;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(name);

async function main(): Promise<void> {
  const rootDir = process.cwd();
  if (!flag('--mock')) {
    // Sekrety tylko z .env (jak serwer); zmienne środowiskowe mają pierwszeństwo.
    try {
      process.loadEnvFile(join(rootDir, '.env'));
    } catch {
      // brak .env
    }
  }
  const cfg = loadConfig(process.env);
  const provider = flag('--mock') ? 'mock' : cfg.llmProvider === 'anthropic' ? 'anthropic' : 'mock';
  if (provider === 'anthropic' && !cfg.anthropicApiKey) {
    console.error('Brak ANTHROPIC_API_KEY. Uruchom: npm run eval -- --mock');
    process.exit(2);
  }
  const defaultModel = cfg.anthropicModel || DEFAULT_ANTHROPIC_MODEL;
  const models = provider === 'mock' ? ['mock'] : flag('--compare') ? [...COMPARE_MODELS] : [arg('--model') ?? defaultModel];
  const only = arg('--only')
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const concurrency = arg('--concurrency') ? Number(arg('--concurrency')) : undefined;
  const partArg = arg('--part') ?? 'oba';
  if (!['strojeniowy', 'kontrolny', 'kontrolny_v2', 'oba', 'wszystkie'].includes(partArg)) {
    console.error('--part: strojeniowy, kontrolny, kontrolny_v2, oba albo wszystkie');
    process.exit(2);
  }
  const hasControl = existsSync(join(rootDir, DEFAULT_CONTROL_CASES_PATH));
  const hasControlV2 = existsSync(join(rootDir, DEFAULT_CONTROL_V2_CASES_PATH));
  if (partArg === 'kontrolny' && !hasControl) {
    console.error(`Brak zestawu kontrolnego: ${DEFAULT_CONTROL_CASES_PATH}`);
    process.exit(2);
  }
  if (partArg === 'kontrolny_v2' && !hasControlV2) {
    console.error(`Brak zestawu kontrolnego v2: ${DEFAULT_CONTROL_V2_CASES_PATH}`);
    process.exit(2);
  }
  if (partArg === 'oba' && !hasControl) console.log(`Brak ${DEFAULT_CONTROL_CASES_PATH}: tylko zestaw strojeniowy.`);
  const parts: EvalPart[] =
    partArg === 'oba' || partArg === 'wszystkie'
      ? [
          'strojeniowy',
          ...(hasControl ? (['kontrolny'] as const) : []),
          ...(partArg === 'wszystkie' && hasControlV2 ? (['kontrolny_v2'] as const) : []),
        ]
      : [partArg as EvalPart];
  if (flag('--diagnose')) {
    for (const model of models)
      for (const part of parts) {
        const d = await runDiagnosis({
          part,
          rootDir,
          provider,
          model,
          apiKey: cfg.anthropicApiKey,
          ...(arg('--corpus-root') ? { corpusRoot: arg('--corpus-root') } : {}),
          ...(only ? { only } : {}),
          ...(concurrency ? { concurrency } : {}),
          ...(flag('--no-rank') ? { noRank: true } : {}),
          log: (l) => console.log(l),
        });
        const m = d.metrics;
        console.log(`\nDiagnostyka ${model} (${part}):`);
        console.log(diagnosisTable(d.summary));
        console.log(
          `macro-F1 ${m.macroF1.value?.toFixed(3)}, dokładność ${m.accuracy.value?.toFixed(3)}, fałszywe wstrzymania ${m.falseAbstention.num}/${m.falseAbstention.den}, mediana ${((m.latencyMs.median ?? 0) / 1000).toFixed(1)} s, max ${((m.latencyMs.max ?? 0) / 1000).toFixed(1)} s, koszt silnika $${m.cost.engineUsd.toFixed(4)}`,
        );
        const out = arg('--diag-out');
        if (out) writeFileSync(out.replace(/\.json$/, '') + `.${model}.${part}.json`, JSON.stringify(d, null, 2));
      }
    return;
  }
  // Zad. 29: druga warstwa tylko na żądanie; koszt wyszukiwania liczony osobno.
  const liveCost = { claims: 0, searches: 0, feeUsd: 0, tokenUsd: 0 };
  let live: LiveLayer | undefined;
  if (flag('--live')) {
    if (provider !== 'anthropic') {
      console.error('--live wymaga dostawcy anthropic (bez --mock).');
      process.exit(2);
    }
    const base = createProductionLiveLayer({
      sourcesPath: join(rootDir, cfg.liveSourcesPath),
      apiKey: cfg.anthropicApiKey,
      model: arg('--model') ?? defaultModel,
    });
    live = {
      sources: base.sources,
      budgetMs: base.budgetMs,
      async find(claim, o) {
        const r = await base.find(claim, o);
        liveCost.claims++;
        liveCost.searches += r.searches;
        liveCost.feeUsd += r.searchFeeUsd;
        liveCost.tokenUsd += r.usage?.estimatedCostUsd ?? 0;
        return r;
      },
    };
    console.log('Druga warstwa włączona. Szacunek: ok. 0,013 USD na twierdzenie bez odpowiedzi w korpusie (wyszukiwanie 0,01 + tokeny).');
  }
  const runs: RunReport[] = [];
  let file: ResultsFile | undefined;
  for (const model of models)
  for (const part of parts) {
    const res = await runEval({
      part,
      rootDir,
      provider,
      model,
      apiKey: cfg.anthropicApiKey,
      defaultRun: defaultModel,
      ...(arg('--out') ? { resultsPath: arg('--out') } : live ? { resultsPath: 'data/eval/results_live.json' } : {}),
      ...(arg('--review') ? { reviewPath: arg('--review') } : live ? { reviewPath: 'data/eval/review_sample_live.json' } : {}),
      ...(live ? { live } : {}),
      ...(arg('--corpus-root') ? { corpusRoot: arg('--corpus-root') } : {}),
      ...(flag('--compare') ? { writeReview: model === defaultModel } : {}),
      ...(only ? { only } : {}),
      ...(concurrency ? { concurrency } : {}),
      ...(flag('--no-rank') ? { noRank: true } : {}),
      log: (l) => console.log(l),
    });
    runs.push(res.run);
    file = res.file;
    const c = res.run.metrics.cost;
    console.log(`Koszt przebiegu ${model} (${part}): silnik $${c.engineUsd.toFixed(4)}, sędzia $${c.judgeUsd.toFixed(4)}, razem $${c.totalUsd.toFixed(4)}`);
    if (live)
      console.log(
        `Druga warstwa (osobno): ${liveCost.claims} twierdzeń, ${liveCost.searches} wyszukiwań, opłata $${liveCost.feeUsd.toFixed(4)}, tokeny wyszukiwania $${liveCost.tokenUsd.toFixed(4)} (ocena fragmentów w koszcie silnika)`,
      );
    const d = res.run.doubtful;
    if (d) {
      const w = d.metricsWithout;
      console.log(`Przypadki wątpliwe (${d.ids.length}): ${d.ids.join(', ')}; błędne: ${d.failed.join(', ') || 'brak'}`);
      console.log(
        `Bez wątpliwych: macro-F1 ${w.macroF1.value?.toFixed(3) ?? 'n/d'} (n=${w.macroF1.den}), profil ${Object.entries(d.errorProfileWithout).map(([k, v]) => `${k}: ${v!.errors}/${v!.total}`).join(', ') || 'n/d'}`,
      );
    }
  }
  for (const part of parts) {
    console.log('');
    console.log(`Zestaw ${part}:`);
    console.log(metricsTable(runs.filter((r) => r.part === part)));
  }
  console.log('');
  for (const r of runs)
    console.log(
      `Przypadki z błędnym wynikiem (${r.run}, ${r.part}): ${r.failedCases.length ? r.failedCases.map((f) => `${f.id} (${f.expected} -> ${f.got})`).join(', ') : 'brak'}`,
    );
  console.log('Przypadki, których system nie obsługuje:');
  for (const u of file?.unsupported ?? []) console.log(`  ${u.id} [${u.scenario}]: ${u.reason}`);
  console.log(`Zapisano: ${arg('--out') ?? 'data/eval/results.json'} (profil błędów silnika z: ${file?.errorProfileSource ?? 'brak'})`);
}

main().catch((e) => {
  console.error(e instanceof Error ? `${e.name}: ${e.message}` : e);
  process.exit(1);
});
