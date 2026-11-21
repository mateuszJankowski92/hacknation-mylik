import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadCatalog, type CatalogDocument, type CatalogSource } from '../src/corpus/catalog';
import { cleanTitle, documentIdFor, excerptText, extractLinks, isAllowedByRobots, pageUrl, parseRobots, type RobotsRules } from '../src/corpus/crawl';
import { FETCHED_FILE } from '../src/corpus/ingest';
import { extractHeading, extractPublishedDate, extractTitle, extractValidUntil, htmlToText } from '../src/corpus/html';

const USER_AGENT = 'MYLIK-hackathon-corpus-fetcher/0.2 (HackNation 2026 prototype; closed corpus of public sources)';
const MIN_DELAY_MS = 1100;
const MAX_BYTES = 1024 * 1024;
const MAX_LISTING_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 20000;
const MIN_TEXT_CHARS = 300;
const META_FILE = 'data/raw/_meta.json';
const SKIPPED_FILE = 'data/raw/_skipped.json';

interface PageMeta {
	title: string | null;
	publishedAt: string | null;
}

interface FetchedPage {
	text: string;
	meta: PageMeta;
	validUntil: string | null;
}

const robotsCache = new Map<string, Promise<RobotsRules>>();
const nextSlotByOrigin = new Map<string, number>();

function readArg(name: string, fallback: string): string {
	const index = process.argv.indexOf(name);
	return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

async function reserveSlot(origin: string, delayMs: number): Promise<void> {
	const slot = Math.max(Date.now(), nextSlotByOrigin.get(origin) ?? 0);
	nextSlotByOrigin.set(origin, slot + Math.max(delayMs, MIN_DELAY_MS));
	const wait = slot - Date.now();
	if (wait > 0) await new Promise((done) => setTimeout(done, wait));
}

async function politeFetch(url: string, delayMs = MIN_DELAY_MS): Promise<Response> {
	await reserveSlot(new URL(url).origin, delayMs);
	return fetch(url, {
		headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,text/plain;q=0.9', 'Accept-Language': 'pl,en;q=0.5' },
		redirect: 'follow',
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});
}

function loadRules(url: URL): Promise<RobotsRules> {
	let pending = robotsCache.get(url.origin);
	if (!pending) {
		pending = (async () => {
			try {
				const response = await politeFetch(`${url.origin}/robots.txt`);
				if (response.status === 404) return { disallow: [], allow: [], crawlDelayMs: 0 };
				if (!response.ok) return { disallow: ['/'], allow: [], crawlDelayMs: 0 };
				return parseRobots((await response.text()).slice(0, 200000));
			} catch {
				return { disallow: ['/'], allow: [], crawlDelayMs: 0 };
			}
		})();
		robotsCache.set(url.origin, pending);
	}
	return pending;
}

async function readLimited(response: Response): Promise<string | null> {
	const declared = Number(response.headers.get('content-length') ?? 0);
	if (declared > MAX_BYTES) return null;
	const buffer = Buffer.from(await response.arrayBuffer());
	if (buffer.length > MAX_BYTES) return null;
	return buffer.toString('utf8');
}

async function readLimitedText(response: Response, limit: number): Promise<string | null> {
	const declared = Number(response.headers.get('content-length') ?? 0);
	if (declared > limit) return null;
	const buffer = Buffer.from(await response.arrayBuffer());
	if (buffer.length > limit) return null;
	return buffer.toString('utf8');
}

type Outcome<T> = { ok: true; value: T } | { ok: false; reason: string };

async function getHtml(rawUrl: string, limit: number): Promise<Outcome<{ body: string; contentType: string }>> {
	let url: URL;
	try {
		url = new URL(rawUrl);
	} catch {
		return { ok: false, reason: 'nieprawidłowy adres' };
	}
	if (url.protocol !== 'https:') return { ok: false, reason: 'dozwolony tylko https' };
	const rules = await loadRules(url);
	if (!isAllowedByRobots(rules, url)) return { ok: false, reason: 'robots.txt zabrania' };
	let response: Response;
	try {
		response = await politeFetch(rawUrl, rules.crawlDelayMs);
	} catch (error) {
		return { ok: false, reason: `błąd sieci: ${error instanceof Error ? error.message : 'nieznany'}` };
	}
	if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
	const finalUrl = new URL(response.url || rawUrl);
	if (finalUrl.hostname !== url.hostname) return { ok: false, reason: `przekierowanie na inną domenę (${finalUrl.hostname})` };
	let body: string | null;
	try {
		body = await readLimitedText(response, limit);
	} catch (error) {
		return { ok: false, reason: `błąd odczytu: ${error instanceof Error ? error.message : 'nieznany'}` };
	}
	if (body === null) return { ok: false, reason: 'dokument większy niż limit' };
	return { ok: true, value: { body, contentType: response.headers.get('content-type') ?? '' } };
}

async function fetchPage(rawUrl: string, excerptChars: number | undefined): Promise<Outcome<FetchedPage>> {
	const result = await getHtml(rawUrl, MAX_BYTES);
	if (!result.ok) return result;
	const { body, contentType } = result.value;
	const isHtml = contentType.includes('html');
	const fullText = isHtml ? htmlToText(body) : body;
	if (fullText.length < MIN_TEXT_CHARS) return { ok: false, reason: 'zbyt mało tekstu (strona dynamiczna lub zablokowana)' };
	const text = excerptChars ? excerptText(fullText, excerptChars) : fullText;
	const publishedAt = isHtml ? extractPublishedDate(body) : null;
	const heading = isHtml ? extractHeading(body) : null;
	const rawTitle = isHtml ? extractTitle(body) : null;
	return {
		ok: true,
		value: {
			text,
			meta: { title: (rawTitle ? cleanTitle(rawTitle) : null) || heading, publishedAt },
			validUntil: extractValidUntil(fullText, publishedAt),
		},
	};
}

async function discoverDocuments(source: CatalogSource, skipped: string[]): Promise<CatalogDocument[]> {
	const discovery = source.discovery;
	if (!discovery) return [];
	const known = new Set(source.documents.map((doc) => doc.url));
	const found: string[] = [];
	for (const seed of discovery.seeds) {
		for (let page = 1; page <= (seed.pages ?? 1); page += 1) {
			const listingUrl = pageUrl(seed.url, page);
			const listing = await getHtml(listingUrl, MAX_LISTING_BYTES);
			if (!listing.ok) {
				skipped.push(`${source.id} lista ${listingUrl}: ${listing.reason}`);
				break;
			}
			const links = extractLinks(listing.value.body, seed.link, listingUrl);
			if (links.length === 0) break;
			for (const link of links) if (!known.has(link) && !found.includes(link)) found.push(link);
		}
	}
	return found.slice(0, discovery.maxNew).map((url) => ({
		id: documentIdFor(source.id, url),
		title: url,
		url,
		publishedAt: null,
		file: `data/raw/${documentIdFor(source.id, url)}.txt`,
	}));
}

async function processSource(
	source: CatalogSource,
	rootDir: string,
	fetched: Record<string, string>,
	meta: Record<string, PageMeta>,
	skipped: string[],
): Promise<{ saved: number }> {
	const existingIds = new Set(source.documents.map((doc) => doc.id));
	const fresh = await discoverDocuments(source, skipped);
	const kept: CatalogDocument[] = [];
	let saved = 0;
	for (const doc of [...source.documents, ...fresh]) {
		const isNew = !existingIds.has(doc.id);
		const filePath = resolve(rootDir, doc.file);
		const result = await fetchPage(doc.url, source.discovery?.excerptChars);
		if (!result.ok) {
			skipped.push(`${doc.id} (${doc.url}): ${result.reason}`);
			if (!isNew && existsSync(filePath)) kept.push(doc);
			continue;
		}
		const { text, meta: pageMeta, validUntil } = result.value;
		mkdirSync(dirname(filePath), { recursive: true });
		writeFileSync(filePath, `${text}\n`);
		fetched[doc.id] = new Date().toISOString();
		meta[doc.id] = pageMeta;
		if (/-[0-9a-f]{8}$/.test(doc.id) && pageMeta.title) doc.title = pageMeta.title;
		doc.publishedAt = pageMeta.publishedAt ?? doc.publishedAt;
		doc.validUntil = validUntil ?? doc.validUntil ?? null;
		kept.push(doc);
		saved += 1;
	}
	source.documents = kept;
	return { saved };
}

async function main(): Promise<void> {
	const startedAt = Date.now();
	const rootDir = process.cwd();
	const catalogPath = resolve(rootDir, readArg('--catalog', 'data/sources.json'));
	const onlyArg = readArg('--only', '');
	const only = onlyArg ? new Set(onlyArg.split(',')) : null;
	const catalog = loadCatalog(catalogPath);
	const fetchedPath = resolve(rootDir, FETCHED_FILE);
	const fetched: Record<string, string> = existsSync(fetchedPath) ? JSON.parse(readFileSync(fetchedPath, 'utf8')) : {};
	const metaPath = resolve(rootDir, META_FILE);
	const meta: Record<string, PageMeta> = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : {};
	const skipped: string[] = [];

	const results = await Promise.all(
		catalog.sources.map((source) => (only && !only.has(source.id) ? Promise.resolve({ saved: 0 }) : processSource(source, rootDir, fetched, meta, skipped))),
	);
	const saved = results.reduce((sum, result) => sum + result.saved, 0);

	mkdirSync(dirname(fetchedPath), { recursive: true });
	writeFileSync(fetchedPath, `${JSON.stringify(fetched, null, 2)}\n`);
	writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
	writeFileSync(resolve(rootDir, SKIPPED_FILE), `${JSON.stringify(skipped, null, 2)}\n`);
	writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
	const total = catalog.sources.reduce((sum, source) => sum + source.documents.length, 0);
	console.log(`saved=${saved} skipped=${skipped.length} documents=${total} seconds=${Math.round((Date.now() - startedAt) / 1000)}`);
	for (const line of skipped) console.log(`POMINIĘTO ${line}`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
