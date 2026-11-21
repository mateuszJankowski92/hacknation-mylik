// Zad. 30: pomiar bramki wsparcia na Basalu obok Haiku na zestawie kontrolnym v2.
//   npx tsx scripts/eval-basal.ts --health
//   npx tsx scripts/eval-basal.ts [--part kontrolny_v2] [--only A01,B02] [--gpu-usd-per-hour 0.69] [--concurrency 3]
//     [--corpus-root <katalog>] [--out-dir data/eval/basal]
// Ekstrakcja, wybór kandydatów i ocena stanowisk: Claude Haiku 5.5. Bramka wsparcia: Basal (BASAL_URL, BASAL_TOKEN),
// przy błędzie Haiku (zapas jak w produkcji). Sędzia cytowań: Claude Sonnet 5.5. Bez Opusa.
// Wyniki: <out-dir>/results.json (mierniki, ten sam format co npm run eval) i <out-dir>/basal_gate.json
// (kalibracja: pewność Basala wobec oceny sędziego, bez treści twierdzeń i cytatów). Adres i token nie są wypisywane.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadConfig } from '../src/config';
import { AnthropicJudge, runEval, type EvalPart, type RunReport } from '../src/eval/index';
import { AnthropicProvider, DEFAULT_ANTHROPIC_MODEL } from '../src/llm/index';
import {
  BasalClient,
  BasalSupportGate,
  FallbackSupportGate,
  buildBasalRequest,
  supportGateConfigFromEnv,
  withSupportGate,
  type BasalDecisionResponse,
  type BasalGateEvent,
} from '../src/llm/basal';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(name);

/** Klient zapisujący wynik każdej decyzji pod kluczem stanu (twierdzenie + cytat), tylko w pamięci. */
class RecordingClient extends BasalClient {
  readonly byState = new Map<string, { choice: string; confidence: number; latencyMs: number }>();
  override async decide(body: Record<string, unknown>): Promise<BasalDecisionResponse> {
    const res = await super.decide(body);
    const rel = res.answers.relacja;
    if (rel && typeof rel.confidence === 'number')
      this.byState.set(String(body.state), { choice: rel.choice, confidence: rel.confidence, latencyMs: res.usage?.latency_ms ?? 0 });
    return res;
  }
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

async function health(url: string, token: string | undefined): Promise<void> {
  const base = url.replace(/\/+$/, '').replace(/\/v1$/, '');
  const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
  for (const path of ['/health', '/v1/models']) {
    try {
      const r = await fetch(base + path, { headers, signal: AbortSignal.timeout(10_000) });
      const body = (await r.json().catch(() => null)) as Record<string, unknown> | null;
      const models = Array.isArray(body?.models) ? (body!.models as Record<string, unknown>[]).map((m) => ({ name: m.name, mode: m.mode, certified: m.certified })) : undefined;
      console.log(path, r.status, JSON.stringify(models ?? body));
    } catch {
      console.log(path, 'niedostępny');
    }
  }
  const t0 = Date.now();
  try {
    const r = await new BasalClient({ baseUrl: url, ...(token ? { token } : {}), timeoutMs: 15_000 }).decide(
      buildBasalRequest('Most w Toruniu ma 300 m długości.', 'Oddany do ruchu most w Toruniu ma 300 m długości.'),
    );
    console.log('próba decyzji', Date.now() - t0, 'ms', JSON.stringify(r.answers.relacja), JSON.stringify(r.usage));
  } catch (e) {
    console.log('próba decyzji: błąd', e instanceof Error ? e.message : 'nieznany');
  }
}

async function main(): Promise<void> {
  const rootDir = process.cwd();
  try {
    process.loadEnvFile(join(rootDir, '.env'));
  } catch {
    // brak .env
  }
  const gateCfg = supportGateConfigFromEnv({ ...process.env, SUPPORT_GATE_PROVIDER: 'basal' });
  if (!gateCfg.url) {
    console.error('Brak BASAL_URL w środowisku lub .env.');
    process.exit(2);
  }
  console.log(`Basal: adres ustawiony, token ${gateCfg.token ? 'ustawiony' : 'brak'}, limit ${gateCfg.timeoutMs} ms, próg ${gateCfg.minConfidence}`);
  if (flag('--health')) return health(gateCfg.url, gateCfg.token);

  const cfg = loadConfig(process.env);
  if (!cfg.anthropicApiKey) {
    console.error('Brak ANTHROPIC_API_KEY.');
    process.exit(2);
  }
  const part = (arg('--part') ?? 'kontrolny_v2') as EvalPart;
  const outDir = resolve(rootDir, arg('--out-dir') ?? 'data/eval/basal');
  mkdirSync(outDir, { recursive: true });
  const only = arg('--only')?.split(',').map((s) => s.trim()).filter(Boolean);
  const gpuPerHour = arg('--gpu-usd-per-hour') ? Number(arg('--gpu-usd-per-hour')) : null;
  console.log('Szacunek kosztu API (kontrolny v2, 176 przypadków): silnik Haiku ok. $0,45-0,60, sędzia Sonnet ok. $0,80; razem ok. $1,3-1,4.');

  const events: BasalGateEvent[] = [];
  const client = new RecordingClient({ baseUrl: gateCfg.url, ...(gateCfg.token ? { token: gateCfg.token } : {}), timeoutMs: gateCfg.timeoutMs });
  const haiku = new AnthropicProvider({ apiKey: cfg.anthropicApiKey, model: DEFAULT_ANTHROPIC_MODEL });
  const basal = new BasalSupportGate({ baseUrl: gateCfg.url, client, minConfidence: gateCfg.minConfidence, onEvent: (e) => events.push(e) });
  const gate = new FallbackSupportGate(basal, { name: haiku.name, checkSupport: (r) => haiku.checkSupport(r) }, { onEvent: (e) => events.push(e), cooldownMs: gateCfg.cooldownMs });
  const llm = withSupportGate(haiku, gate);

  const started = Date.now();
  const { run } = await runEval({
    rootDir,
    provider: 'anthropic',
    model: 'basal-gate',
    llm,
    judge: new AnthropicJudge('claude-sonnet-5-5', cfg.anthropicApiKey),
    apiKey: cfg.anthropicApiKey,
    part,
    resultsPath: join(outDir, 'results.json'),
    reviewPath: join(outDir, 'review_sample.json'),
    writeReview: true,
    defaultRun: 'basal-gate',
    ...(arg('--corpus-root') ? { corpusRoot: arg('--corpus-root')! } : {}),
    ...(only?.length ? { only } : {}),
    ...(arg('--concurrency') ? { concurrency: Number(arg('--concurrency')) } : {}),
    log: (l) => console.log(l),
  });
  const wallMs = Date.now() - started;

  // Kalibracja: pewność Basala przy cytatach, które przeszły bramkę, wobec oceny sędziego ("supports").
  const pairs: { confidence: number; supports: boolean }[] = [];
  for (const c of run.cases)
    for (const cl of c.claims ?? [])
      for (const ev of cl.evidence ?? []) {
        if (ev.stance === 'kontekst' || typeof ev.supports !== 'boolean') continue;
        const d = client.byState.get(String(buildBasalRequest(cl.text, ev.quote).state));
        if (d) pairs.push({ confidence: d.confidence, supports: ev.supports });
      }
  const edges = [0, 0.6, 0.7, 0.8, 0.9, 0.95, 1.0001];
  const bins = edges.slice(0, -1).map((lo, i) => {
    const hi = edges[i + 1]!;
    const inBin = pairs.filter((p) => p.confidence >= lo && p.confidence < hi);
    return {
      range: `${lo.toFixed(2)}-${Math.min(hi, 1).toFixed(2)}`,
      n: inBin.length,
      meanConfidence: inBin.length ? inBin.reduce((s, p) => s + p.confidence, 0) / inBin.length : null,
      judgedCorrect: inBin.length ? inBin.filter((p) => p.supports).length / inBin.length : null,
    };
  });
  const ece = pairs.length
    ? bins.reduce((s, b) => s + (b.n && b.meanConfidence !== null && b.judgedCorrect !== null ? (b.n / pairs.length) * Math.abs(b.meanConfidence - b.judgedCorrect) : 0), 0)
    : null;
  const decisions = events.filter((e): e is Extract<BasalGateEvent, { type: 'support_gate_basal' }> => e.type === 'support_gate_basal');
  const fallbacks = events.filter((e) => e.type === 'support_gate_fallback');
  const lat = decisions.map((d) => d.latencyMs);
  const gpuBusyH = lat.reduce((s, x) => s + x, 0) / 3_600_000;
  const summary = {
    run: 'basal-gate',
    part,
    finishedAt: new Date().toISOString(),
    basalModel: decisions[0]?.model ?? null,
    calibration: decisions[0]?.calibration ?? null,
    minConfidence: gateCfg.minConfidence,
    timeoutMs: gateCfg.timeoutMs,
    decisions: decisions.length,
    belowThreshold: decisions.filter((d) => d.belowThreshold).length,
    choices: Object.fromEntries(['potwierdza', 'obala', 'rozbieznosc_kontekstu', 'nie_rozstrzyga'].map((k) => [k, decisions.filter((d) => d.choice === k).length])),
    fallbacks: fallbacks.length,
    fallbackReasons: Object.fromEntries([...new Set(fallbacks.map((f) => (f.type === 'support_gate_fallback' ? f.reason : '')))].map((r) => [r, fallbacks.filter((f) => f.type === 'support_gate_fallback' && f.reason === r).length])),
    basalLatencyMs: { median: median(lat), max: lat.length ? Math.max(...lat) : 0 },
    wallClockS: wallMs / 1000,
    gpu: {
      usdPerHour: gpuPerHour,
      busyHours: gpuBusyH,
      busyUsd: gpuPerHour !== null ? gpuBusyH * gpuPerHour : null,
      wallUsd: gpuPerHour !== null ? (wallMs / 3_600_000) * gpuPerHour : null,
    },
    calibrationTable: { pairs: pairs.length, ece, bins, note: 'pewność Basala przy cytatach, które przeszły bramkę, wobec oceny sędziego (Sonnet); cytaty odrzucone nie mają oceny sędziego' },
  };
  writeFileSync(join(outDir, 'basal_gate.json'), JSON.stringify(summary, null, 2) + '\n');

  const m = run.metrics;
  let haikuLine = '';
  try {
    const prev = JSON.parse(readFileSync(resolve(rootDir, 'data/eval/results.json'), 'utf8')) as { controlV2Runs?: Record<string, RunReport> };
    const h = prev.controlV2Runs?.[DEFAULT_ANTHROPIC_MODEL];
    if (h) haikuLine = row('Haiku (bramka Haiku)', h);
  } catch {
    // brak pliku
  }
  console.log('\n| Przebieg | macro-F1 | poprawność cytowań | wstrzymania | fałszywe wstrzymania | mediana czasu | koszt API silnika |');
  console.log('|---|---|---|---|---|---|---|');
  if (haikuLine) console.log(haikuLine);
  console.log(row('Basal (bramka)', run));
  console.log(`\nBasal: ${summary.decisions} decyzji, poniżej progu ${summary.belowThreshold}, zapas Haiku ${summary.fallbacks}, mediana ${summary.basalLatencyMs.median} ms; czas przebiegu ${summary.wallClockS.toFixed(0)} s; GPU ${gpuPerHour !== null ? `$${summary.gpu.wallUsd!.toFixed(3)} (czas przebiegu), $${summary.gpu.busyUsd!.toFixed(4)} (czas pracy)` : 'cena za godzinę nie podana'}`);
  console.log(`Kalibracja: ${pairs.length} par, ECE ${ece?.toFixed(3) ?? '-'}`);
  console.log(`Koszt: silnik $${m.cost.engineUsd.toFixed(4)}, sędzia $${m.cost.judgeUsd.toFixed(4)}`);
}

function row(label: string, r: RunReport): string {
  const m = r.metrics;
  const pct = (x: { value: number | null; num: number; den: number }) => `${x.value === null ? '-' : (x.value * 100).toFixed(1) + '%'} (${x.num}/${x.den})`;
  return `| ${label} | ${m.macroF1.value?.toFixed(3) ?? '-'} | ${pct(m.citationCorrectness)} | ${pct(m.abstention)} | ${pct(m.falseAbstention)} | ${m.latencyMs.median === null ? "-" : (m.latencyMs.median / 1000).toFixed(1) + " s"} | $${m.cost.engineUsd.toFixed(3)} |`;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : 'błąd');
  process.exit(1);
});
