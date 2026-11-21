// Masowe pobranie spisu weryfikacji redakcji z indeksu Google Fact Check Tools (zad. 41).
//
//   npx tsx scripts/factcheck-index-pobierz.ts [--sites demagog.org.pl,pravda.org.pl] [--max 400]
//   npx tsx scripts/factcheck-index-pobierz.ts --feed <plik data.json>   (zbiorczy plik ClaimReview Google)
//   npx tsx scripts/factcheck-index-pobierz.ts --stats
//
// Klucz: GOOGLE_FACTCHECK_API_KEY z .env (wczytywany przez skrypt, nigdy nie wypisywany).
// Wynik: data/raw/factcheck-index/<site>.jsonl (+ _state.json do wznawiania). Potem: npm run corpus:ingest.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GoogleFactCheckIndex } from '../src/factcheck/client';
import { loadFactcheckConfig } from '../src/factcheck/config';
import { appendFeedRecords, harvestIndex, harvestStats, recordsFromFeed } from '../src/factcheck/harvest';

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

async function main(): Promise<void> {
  const root = process.cwd();
  try {
    process.loadEnvFile(join(root, '.env'));
  } catch {
    // brak .env
  }
  const config = loadFactcheckConfig(join(root, 'data/factcheck.json'));
  const dir = join(root, config.harvest?.dir ?? 'data/raw/factcheck-index');
  const sites = arg('--sites')?.split(',').map((s) => s.trim()).filter(Boolean);
  const allSites = sites ?? config.publishers.filter((p) => p.harvest).map((p) => p.site);

  if (process.argv.includes('--stats')) {
    console.log(JSON.stringify(harvestStats(dir, allSites), null, 2));
    return;
  }
  const feed = arg('--feed');
  if (feed) {
    const records = recordsFromFeed(JSON.parse(readFileSync(feed, 'utf8')), config, new Date().toISOString(), sites);
    const added = appendFeedRecords(dir, records);
    console.log(`Plik zbiorczy ClaimReview: dopisano ${JSON.stringify(added)}`);
    console.log(JSON.stringify(harvestStats(dir, allSites), null, 2));
    return;
  }
  const key = process.env.GOOGLE_FACTCHECK_API_KEY?.trim();
  console.log(`Klucz GOOGLE_FACTCHECK_API_KEY: ${key ? 'jest' : 'BRAK'}`);
  if (!key) process.exit(2);
  const client = new GoogleFactCheckIndex({ endpoint: config.index.endpoint, apiKey: key });
  const max = arg('--max') ? Number(arg('--max')) : undefined;
  const summary = await harvestIndex({
    config,
    list: (req) => client.list(req),
    dir,
    ...(sites ? { sites } : {}),
    ...(max ? { maxRequests: max } : {}),
    log: (l) => console.log(l),
  });
  console.log(`Zapytania: ${summary.requests}${summary.stoppedBy ? `, zatrzymano: ${summary.stoppedBy}` : ''}`);
  console.log(JSON.stringify(harvestStats(dir, allSites), null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message.replace(/key=[^&\s]+/g, 'key=***') : 'błąd');
  process.exit(1);
});
