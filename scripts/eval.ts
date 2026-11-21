// npm run eval [-- --mock] [--model <id>] [--compare] [--only A01,B02] [--concurrency N] [--out <plik>]
// Liczy mierniki z sekcji 6 wytycznych i zapisuje data/eval/results.json (z niego profil błędów czyta silnik).
import { join } from 'node:path';
import { loadConfig } from '../src/config';
import { DEFAULT_ANTHROPIC_MODEL } from '../src/llm/index';
import { metricsTable, runEval, type ResultsFile, type RunReport } from '../src/eval/index';

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
  const runs: RunReport[] = [];
  let file: ResultsFile | undefined;
  for (const model of models) {
    const res = await runEval({
      rootDir,
      provider,
      model,
      apiKey: cfg.anthropicApiKey,
      defaultRun: defaultModel,
      ...(arg('--out') ? { resultsPath: arg('--out') } : {}),
      ...(arg('--review') ? { reviewPath: arg('--review') } : {}),
      ...(flag('--compare') ? { writeReview: model === defaultModel } : {}),
      ...(only ? { only } : {}),
      ...(concurrency ? { concurrency } : {}),
      log: (l) => console.log(l),
    });
    runs.push(res.run);
    file = res.file;
    const c = res.run.metrics.cost;
    console.log(`Koszt przebiegu ${model}: silnik $${c.engineUsd.toFixed(4)}, sędzia $${c.judgeUsd.toFixed(4)}, razem $${c.totalUsd.toFixed(4)}`);
  }
  console.log('');
  console.log(metricsTable(runs));
  console.log('');
  for (const r of runs)
    console.log(
      `Przypadki z błędnym wynikiem (${r.run}): ${r.failedCases.length ? r.failedCases.map((f) => `${f.id} (${f.expected} -> ${f.got})`).join(', ') : 'brak'}`,
    );
  console.log('Przypadki, których system nie obsługuje:');
  for (const u of file?.unsupported ?? []) console.log(`  ${u.id} [${u.scenario}]: ${u.reason}`);
  console.log(`Zapisano: ${arg('--out') ?? 'data/eval/results.json'} (profil błędów silnika z: ${file?.errorProfileSource ?? 'brak'})`);
}

main().catch((e) => {
  console.error(e instanceof Error ? `${e.name}: ${e.message}` : e);
  process.exit(1);
});
