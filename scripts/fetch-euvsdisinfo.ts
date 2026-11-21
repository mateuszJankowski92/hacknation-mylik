/*
 * Pobieranie przypadków EUvsDisinfo do lokalnej migawki (data/known-ops/cases-*.json).
 * Serwer MCP (https://mcp.euvsd.info/mcp) po zwykłym HTTP (streamable HTTP, nie SSE): initialize -> notifications/initialized
 * -> tools/call "cases" { offset, limit <= 100 }. Opis API:
 * https://euvsdisinfo.eu/public-docs/How_to_grab_all_Articles_and_Cases_from_disinfo.pdf
 *
 * Klucz: zmienna EUVSDISINFO_TOKEN (z .env jak serwer i scripts/eval.ts; zmienne środowiskowe mają
 * pierwszeństwo). Klucza nie drukujemy; każdy komunikat błędu przechodzi przez redact().
 *
 * Co zapisujemy (licencja niepotwierdzona, patrz data/known-ops/_terms.json): tylko id, tytuł,
 * skrót twierdzenia (do CLAIM_MAX znaków), datę, słowa kluczowe, kraje i odsyłacz do opisu.
 * Bez sprostowań (pole fact), bez odsyłaczy do materiałów źródłowych.
 * Treść przypadków to niezaufane dane: tylko dopasowanie w kodzie, nigdy do modelu.
 *
 * Tempo: 1 żądanie na MIN_DELAY_MS; ponowienia z rosnącą przerwą; wznowienie od offsetu
 * zapisanego w data/known-ops/_fetch-state.json (po każdej stronie).
 *
 * Użycie: npm run known-ops:fetch -- [--max-pages N] [--offset K] [--restart] [--out data/known-ops]
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { compactKnownOpCase, KNOWN_OP_CLAIM_MAX } from '../src/corpus/incidents';

/** Adres z dokumentacji EUvsDisinfo (07.2025, zmiana 04.05.2026); stary host vercel.app odrzuca klucze. */
const ENDPOINT = process.env.EUVSDISINFO_MCP_URL?.trim() || 'https://mcp.euvsd.info/mcp';
const USER_AGENT = 'mylik-known-ops-fetcher/0.2';
const PAGE_LIMIT = 100;
const MIN_DELAY_MS = 1100;
const TIMEOUT_MS = 30000;
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_ATTEMPTS = 5;
const STATE_FILE = '_fetch-state.json';

function readArg(name: string, fallback: string): string {
	const index = process.argv.indexOf(name);
	return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

let secret = '';
/** Usuwa klucz z każdego tekstu, który może trafić do logów. */
function redact(text: string): string {
	return secret ? text.split(secret).join('***') : text;
}

class FetchError extends Error {
	constructor(
		message: string,
		readonly retryable: boolean,
		readonly sessionLost = false,
	) {
		super(message);
	}
}

const RpcEnvelope = z.object({
	jsonrpc: z.literal('2.0').optional(),
	result: z.unknown().optional(),
	error: z.object({ code: z.number().optional(), message: z.string().optional() }).passthrough().optional(),
});

const CasesPage = z.object({
	cases: z.array(z.unknown()).max(PAGE_LIMIT * 2),
	total: z.number().int().nonnegative().optional(),
	hasNextPage: z.boolean().optional(),
});
type CasesPage = z.infer<typeof CasesPage>;

/** Odpowiedź bywa JSON-em albo strumieniem SSE ("data: {...}"); bierzemy pierwszy obiekt z result/error. */
function parseMcpBody(body: string): z.infer<typeof RpcEnvelope> | null {
	const trimmed = body.trim();
	const candidates = trimmed.startsWith('{') ? [trimmed] : trimmed.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.slice(5));
	for (const candidate of candidates) {
		try {
			const parsed = RpcEnvelope.safeParse(JSON.parse(candidate));
			if (parsed.success && ('result' in parsed.data || 'error' in parsed.data)) return parsed.data;
		} catch {
			// niepełna linia
		}
	}
	return null;
}

let lastRequest = 0;
let nextId = 1;

async function readLimited(response: Response): Promise<string> {
	const declared = Number(response.headers.get('content-length') ?? '0');
	if (declared > MAX_BODY_BYTES) throw new FetchError(`Odpowiedź za duża (${declared} B).`, false);
	if (!response.body) return '';
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > MAX_BODY_BYTES) {
			await reader.cancel();
			throw new FetchError(`Odpowiedź przekroczyła ${MAX_BODY_BYTES} B.`, false);
		}
		chunks.push(value);
	}
	return Buffer.concat(chunks).toString('utf8');
}

async function post(sessionId: string | null, method: string, params: unknown, notification: boolean) {
	const wait = lastRequest + MIN_DELAY_MS - Date.now();
	if (wait > 0) await new Promise((done) => setTimeout(done, wait));
	lastRequest = Date.now();
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Accept: 'application/json, text/event-stream',
		Authorization: `Bearer ${secret}`,
		'User-Agent': USER_AGENT,
	};
	if (sessionId) headers['mcp-session-id'] = sessionId;
	const payload = notification ? { jsonrpc: '2.0', method, params } : { jsonrpc: '2.0', id: nextId++, method, params };
	let response: Response;
	try {
		response = await fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(TIMEOUT_MS) });
	} catch (error) {
		throw new FetchError(`Błąd sieci (${method}): ${error instanceof Error ? error.name : 'nieznany'}`, true);
	}
	if (response.status === 401 || response.status === 403) throw new FetchError(`Serwer odrzucił klucz (HTTP ${response.status}).`, false);
	if (response.status === 404 && sessionId) throw new FetchError('Sesja wygasła (HTTP 404).', true, true);
	if (response.status === 429 || response.status >= 500) throw new FetchError(`HTTP ${response.status} (${method})`, true);
	if (!response.ok) throw new FetchError(`HTTP ${response.status} (${method})`, response.status === 400 && Boolean(sessionId), response.status === 400);
	const text = notification ? '' : await readLimited(response);
	return { body: notification ? null : parseMcpBody(text), sessionId: response.headers.get('mcp-session-id') ?? sessionId };
}

async function openSession(): Promise<string | null> {
	const init = await post(null, 'initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'mylik', version: '0.2.0' } }, false);
	if (!init.body || init.body.error) throw new FetchError(`Inicjalizacja nieudana: ${init.body?.error?.message ?? 'brak odpowiedzi'}`, true);
	await post(init.sessionId, 'notifications/initialized', {}, true).catch(() => undefined);
	return init.sessionId;
}

/** Strona przypadków ze structuredContent albo z JSON-a w content[].text. */
function extractPage(result: unknown): CasesPage | null {
	if (typeof result !== 'object' || result === null) return null;
	const r = result as Record<string, unknown>;
	const candidates: unknown[] = [r.structuredContent];
	if (Array.isArray(r.content)) {
		for (const item of r.content) {
			const t = typeof item === 'object' && item !== null ? (item as Record<string, unknown>).text : undefined;
			if (typeof t === 'string' && t.trim().startsWith('{')) {
				try {
					candidates.push(JSON.parse(t));
				} catch {
					// tekst opisowy
				}
			}
		}
	}
	for (const c of candidates) {
		const parsed = CasesPage.safeParse(c);
		if (parsed.success) return parsed.data;
	}
	return null;
}

interface FetchState {
	nextOffset: number;
	total: number | null;
	saved: number;
	done: boolean;
	updatedAt: string;
}

function readState(dir: string): FetchState | null {
	const path = join(dir, STATE_FILE);
	if (!existsSync(path)) return null;
	try {
		const s = JSON.parse(readFileSync(path, 'utf8')) as FetchState;
		return Number.isInteger(s.nextOffset) && s.nextOffset >= 0 ? s : null;
	} catch {
		return null;
	}
}

function writeAtomic(path: string, data: unknown): void {
	writeFileSync(`${path}.tmp`, JSON.stringify(data));
	renameSync(`${path}.tmp`, path);
}

async function main(): Promise<void> {
	try {
		process.loadEnvFile(join(process.cwd(), '.env'));
	} catch {
		// brak .env: tylko zmienne środowiskowe
	}
	secret = process.env.EUVSDISINFO_TOKEN?.trim() ?? '';
	if (!secret) {
		console.log('Brak EUVSDISINFO_TOKEN (w .env albo w środowisku). Nic nie pobrano.');
		return;
	}
	const outDir = readArg('--out', 'data/known-ops');
	mkdirSync(outDir, { recursive: true });
	const maxPages = Math.max(1, Number(readArg('--max-pages', '1000')) || 1000);
	const state = process.argv.includes('--restart') ? null : readState(outDir);
	if (state?.done && !process.argv.includes('--offset')) {
		console.log(`Migawka kompletna (${state.saved} przypadków, ${state.updatedAt}). Użyj --restart, aby pobrać od nowa.`);
		return;
	}
	let offset = process.argv.includes('--offset') ? Math.max(0, Number(readArg('--offset', '0')) || 0) : (state?.nextOffset ?? 0);
	let saved = state && !process.argv.includes('--restart') ? state.saved : 0;
	let total: number | null = state?.total ?? null;
	const started = Date.now();
	console.log(`Start od offsetu ${offset}.`);

	let sessionId = await withRetry('initialize', openSession);
	let done = false;
	for (let page = 0; page < maxPages; page += 1) {
		const result = await withRetry(`offset ${offset}`, async () => {
			try {
				const { body } = await post(sessionId, 'tools/call', { name: 'cases', arguments: { offset, limit: PAGE_LIMIT } }, false);
				if (!body) throw new FetchError('Pusta lub nieczytelna odpowiedź.', true);
				if (body.error) throw new FetchError(`Błąd serwera: ${body.error.message ?? body.error.code ?? '?'}`, true, true);
				const pageData = extractPage(body.result);
				if (!pageData) throw new FetchError('Odpowiedź niezgodna ze schematem strony przypadków.', true);
				return pageData;
			} catch (error) {
				if (error instanceof FetchError && error.sessionLost) sessionId = await openSession();
				throw error;
			}
		});
		const compact = result.cases.map(compactKnownOpCase).filter((c) => c !== null);
		const file = join(outDir, `cases-${String(offset).padStart(6, '0')}.json`);
		writeAtomic(file, { source: 'euvsdisinfo', fetchedAt: new Date().toISOString(), offset, cases: compact });
		saved += compact.length;
		total = result.total ?? total;
		const nextOffset = offset + PAGE_LIMIT;
		done = result.cases.length === 0 || result.hasNextPage === false || (total !== null && nextOffset >= total);
		writeAtomic(join(outDir, STATE_FILE), { nextOffset, total, saved, done, updatedAt: new Date().toISOString() } satisfies FetchState);
		if (page % 10 === 0 || done) console.log(`offset ${offset}: ${compact.length} zapisanych (łącznie ${saved}/${total ?? '?'})`);
		offset = nextOffset;
		if (done) break;
	}
	const minutes = ((Date.now() - started) / 60000).toFixed(1);
	console.log(`${done ? 'Koniec zbioru.' : 'Przerwano po limicie stron.'} Zapisano łącznie ${saved}. Następny offset: ${offset}. Czas: ${minutes} min.`);
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
	for (let attempt = 1; ; attempt += 1) {
		try {
			return await fn();
		} catch (error) {
			const retryable = error instanceof FetchError ? error.retryable : false;
			const message = redact(error instanceof Error ? error.message : String(error));
			if (!retryable || attempt >= MAX_ATTEMPTS) throw new Error(`${label}: ${message} (próba ${attempt}). Wznowienie: uruchom ponownie (offset w ${STATE_FILE}).`);
			const pause = 2000 * 2 ** (attempt - 1);
			console.warn(`${label}: ${message}; ponawiam za ${pause / 1000} s.`);
			await new Promise((done) => setTimeout(done, pause));
		}
	}
}

main().catch((error: unknown) => {
	console.error(redact(error instanceof Error ? error.message : String(error)));
	process.exit(1);
});
