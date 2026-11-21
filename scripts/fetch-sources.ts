import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadCatalog } from '../src/corpus/catalog';
import { FETCHED_FILE } from '../src/corpus/ingest';
import { extractPublishedDate, extractTitle, htmlToText } from '../src/corpus/html';

const USER_AGENT = 'MYLIK-hackathon-corpus-fetcher/0.1 (HackNation 2026 prototype; closed corpus of public sources)';
const MIN_DELAY_MS = 1100;
const MAX_BYTES = 1024 * 1024;
const TIMEOUT_MS = 20000;
const MIN_TEXT_CHARS = 300;
const META_FILE = 'data/raw/_meta.json';

interface PageMeta {
	title: string | null;
	publishedAt: string | null;
}

interface RobotsRules {
	disallow: string[];
	allow: string[];
	crawlDelayMs: number;
}

const robotsCache = new Map<string, RobotsRules>();
const lastRequestByOrigin = new Map<string, number>();

function readArg(name: string, fallback: string): string {
	const index = process.argv.indexOf(name);
	return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

async function politeFetch(url: string, delayMs = MIN_DELAY_MS): Promise<Response> {
	const origin = new URL(url).origin;
	const wait = (lastRequestByOrigin.get(origin) ?? 0) + Math.max(delayMs, MIN_DELAY_MS) - Date.now();
	if (wait > 0) await new Promise((done) => setTimeout(done, wait));
	lastRequestByOrigin.set(origin, Date.now());
	return fetch(url, {
		headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,text/plain;q=0.9', 'Accept-Language': 'pl,en;q=0.5' },
		redirect: 'follow',
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});
}

function parseRobots(body: string): RobotsRules {
	const rules: RobotsRules = { disallow: [], allow: [], crawlDelayMs: 0 };
	let applies = false;
	let sawAgent = false;
	for (const rawLine of body.split(/\r?\n/)) {
		const line = rawLine.replace(/#.*/, '').trim();
		const separator = line.indexOf(':');
		if (separator < 0) continue;
		const field = line.slice(0, separator).trim().toLowerCase();
		const value = line.slice(separator + 1).trim();
		if (field === 'user-agent') {
			if (!sawAgent) applies = false;
			sawAgent = true;
			if (value === '*') applies = true;
			continue;
		}
		sawAgent = false;
		if (!applies || !value) continue;
		if (field === 'crawl-delay') rules.crawlDelayMs = Math.min(30000, Number(value) * 1000 || 0);
		if (field === 'disallow') rules.disallow.push(value);
		if (field === 'allow') rules.allow.push(value);
	}
	return rules;
}

function patternMatches(pattern: string, path: string): boolean {
	const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
	const anchored = escaped.endsWith('\\$') ? `${escaped.slice(0, -2)}$` : escaped;
	return new RegExp(`^${anchored}`).test(path);
}

async function loadRules(url: URL): Promise<RobotsRules> {
	let rules = robotsCache.get(url.origin);
	if (!rules) {
		rules = { disallow: [], allow: [], crawlDelayMs: 0 };
		try {
			const response = await politeFetch(`${url.origin}/robots.txt`);
			if (response.ok) rules = parseRobots((await response.text()).slice(0, 200000));
		} catch {
			rules = { disallow: [], allow: [], crawlDelayMs: 0 };
		}
		robotsCache.set(url.origin, rules);
	}
	return rules;
}

function isAllowed(rules: RobotsRules, url: URL): boolean {
	const path = url.pathname + url.search;
	const longest = (patterns: string[]) => Math.max(0, ...patterns.filter((pattern) => patternMatches(pattern, path)).map((pattern) => pattern.length));
	return longest(rules.allow) >= longest(rules.disallow);
}

async function readLimited(response: Response): Promise<string | null> {
	const declared = Number(response.headers.get('content-length') ?? 0);
	if (declared > MAX_BYTES) return null;
	const buffer = Buffer.from(await response.arrayBuffer());
	if (buffer.length > MAX_BYTES) return null;
	return buffer.toString('utf8');
}

async function main(): Promise<void> {
	const rootDir = process.cwd();
	const catalog = loadCatalog(resolve(rootDir, readArg('--catalog', 'data/sources.json')));
	const fetchedPath = resolve(rootDir, FETCHED_FILE);
	const fetched: Record<string, string> = existsSync(fetchedPath) ? JSON.parse(readFileSync(fetchedPath, 'utf8')) : {};
	const metaPath = resolve(rootDir, META_FILE);
	const meta: Record<string, PageMeta> = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : {};
	const skipped: string[] = [];
	let saved = 0;

	for (const source of catalog.sources) {
		for (const doc of source.documents) {
			const reason = await fetchOne(doc.url, resolve(rootDir, doc.file), doc.id, fetched, meta);
			if (reason) skipped.push(`${doc.id} (${doc.url}): ${reason}`);
			else saved += 1;
		}
	}

	mkdirSync(dirname(fetchedPath), { recursive: true });
	writeFileSync(fetchedPath, `${JSON.stringify(fetched, null, 2)}\n`);
	writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
	console.log(`saved=${saved} skipped=${skipped.length}`);
	for (const line of skipped) console.log(`POMINIĘTO ${line}`);
}

async function fetchOne(rawUrl: string, filePath: string, id: string, fetched: Record<string, string>, meta: Record<string, PageMeta>): Promise<string | null> {
	const url = new URL(rawUrl);
	const rules = await loadRules(url);
	if (!isAllowed(rules, url)) return 'robots.txt zabrania';
	let response: Response;
	try {
		response = await politeFetch(rawUrl, rules.crawlDelayMs);
	} catch (error) {
		return `błąd sieci: ${error instanceof Error ? error.message : 'nieznany'}`;
	}
	if (!response.ok) return `HTTP ${response.status}`;
	const body = await readLimited(response);
	if (body === null) return 'dokument większy niż 1 MB';
	const contentType = response.headers.get('content-type') ?? '';
	const text = contentType.includes('html') ? htmlToText(body) : body;
	if (text.length < MIN_TEXT_CHARS) return 'zbyt mało tekstu (strona dynamiczna lub zablokowana)';
	mkdirSync(dirname(filePath), { recursive: true });
	writeFileSync(filePath, `${text}\n`);
	fetched[id] = new Date().toISOString();
	if (contentType.includes('html')) meta[id] = { title: extractTitle(body), publishedAt: extractPublishedDate(body) };
	return null;
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
