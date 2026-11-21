/*
 * Pobieranie przypadków EUvsDisinfo przez publiczny serwer MCP (streamable HTTP, nie SSE).
 * Opis API: https://euvsdisinfo.eu/public-docs/How_to_grab_all_Articles_and_Cases_from_disinfo.pdf
 *
 * Wymaga klucza w zmiennej środowiskowej EUVSDISINFO_TOKEN. Klucz wydaje EUvsDisinfo "na prośbę"
 * (e-mail/formularz na https://euvsdisinfo.eu/about/). Skrypt nie czyta .env i nie zapisuje klucza.
 * Bez klucza kończy się komunikatem (kod 0) i niczego nie pobiera.
 *
 * Tempo: jedno żądanie na MIN_DELAY_MS, strona po 100 przypadków (maksimum API), domyślnie
 * najwyżej --max-pages 5 stron. Wynik: data/known-ops/cases-<offset>.json (structuredContent).
 *
 * Użycie: EUVSDISINFO_TOKEN=... npx tsx scripts/fetch-euvsdisinfo.ts [--max-pages N] [--offset K] [--out data/known-ops]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEuvsdisinfoCases } from '../src/corpus/incidents';

const ENDPOINT = 'https://euvsdisinfo-mcp-server.vercel.app/mcp';
const USER_AGENT = 'MYLIK-hackathon-known-ops-fetcher/0.1 (HackNation 2026 prototype)';
const PAGE_LIMIT = 100;
const MIN_DELAY_MS = 2000;
const TIMEOUT_MS = 30000;

function readArg(name: string, fallback: string): string {
	const index = process.argv.indexOf(name);
	return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

let lastRequest = 0;
let nextId = 1;

/** Odpowiedź MCP bywa JSON-em albo strumieniem SSE ("data: {...}"); bierzemy pierwszy obiekt z result/error. */
function parseMcpBody(body: string): Record<string, unknown> | null {
	const candidates = body.trim().startsWith('{') ? [body] : body.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.slice(5));
	for (const candidate of candidates) {
		try {
			const parsed = JSON.parse(candidate) as Record<string, unknown>;
			if ('result' in parsed || 'error' in parsed) return parsed;
		} catch {
			// pomijamy niepełne linie
		}
	}
	return null;
}

async function rpc(token: string, sessionId: string | null, method: string, params: unknown, notification = false): Promise<{ body: Record<string, unknown> | null; sessionId: string | null }> {
	const wait = lastRequest + MIN_DELAY_MS - Date.now();
	if (wait > 0) await new Promise((done) => setTimeout(done, wait));
	lastRequest = Date.now();
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Accept: 'application/json, text/event-stream',
		Authorization: `Bearer ${token}`,
		'User-Agent': USER_AGENT,
	};
	if (sessionId) headers['mcp-session-id'] = sessionId;
	const payload = notification ? { jsonrpc: '2.0', method, params } : { jsonrpc: '2.0', id: nextId++, method, params };
	const response = await fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(TIMEOUT_MS) });
	if (response.status === 401 || response.status === 403) throw new Error(`Serwer odrzucił klucz (HTTP ${response.status}).`);
	if (response.status === 429) throw new Error('Serwer zgłosił zbyt wiele żądań (HTTP 429). Spróbuj później.');
	if (!response.ok && !(notification && response.status === 202)) throw new Error(`HTTP ${response.status} dla ${method}`);
	const text = notification ? '' : await response.text();
	return { body: notification ? null : parseMcpBody(text), sessionId: response.headers.get('mcp-session-id') ?? sessionId };
}

async function main(): Promise<void> {
	const token = process.env.EUVSDISINFO_TOKEN?.trim();
	if (!token) {
		console.log('Brak EUVSDISINFO_TOKEN. Serwer MCP EUvsDisinfo wymaga klucza wydawanego na prośbę (https://euvsdisinfo.eu/about/). Nic nie pobrano.');
		return;
	}
	const maxPages = Math.max(1, Number(readArg('--max-pages', '5')) || 5);
	let offset = Math.max(0, Number(readArg('--offset', '0')) || 0);
	const outDir = readArg('--out', 'data/known-ops');
	mkdirSync(outDir, { recursive: true });

	const init = await rpc(token, null, 'initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'mylik', version: '0.1.0' } });
	if (!init.body || 'error' in init.body) throw new Error(`Inicjalizacja nieudana: ${JSON.stringify(init.body?.error ?? null)}`);
	const sessionId = init.sessionId;
	await rpc(token, sessionId, 'notifications/initialized', {}, true).catch(() => undefined);

	let total = 0;
	for (let page = 0; page < maxPages; page += 1) {
		const { body } = await rpc(token, sessionId, 'tools/call', { name: 'cases', arguments: { offset, limit: PAGE_LIMIT } });
		const structured = (body?.result as Record<string, unknown> | undefined)?.structuredContent as Record<string, unknown> | undefined;
		if (!structured) throw new Error(`Brak structuredContent przy offset ${offset}: ${JSON.stringify(body?.error ?? null)}`);
		const { records, skipped } = parseEuvsdisinfoCases(structured);
		const file = join(outDir, `cases-${String(offset).padStart(6, '0')}.json`);
		writeFileSync(file, JSON.stringify({ fetchedAt: new Date().toISOString(), source: ENDPOINT, ...structured }, null, '\t'));
		total += records.length;
		console.log(`${file}: ${records.length} przypadków, pominięto ${skipped}, łącznie w bazie ${String(structured.total ?? '?')}`);
		if (structured.hasNextPage !== true || records.length === 0) break;
		offset += PAGE_LIMIT;
	}
	console.log(`Zapisano przypadków: ${total}. Ostatni pobrany offset: ${offset}.`);
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
