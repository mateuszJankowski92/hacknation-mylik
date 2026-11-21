import { createHash } from 'node:crypto';

export interface RobotsRules {
	disallow: string[];
	allow: string[];
	crawlDelayMs: number;
}

export function parseRobots(body: string, agentToken = 'mylik'): RobotsRules {
	const groups: { agents: string[]; rules: RobotsRules }[] = [];
	let current: { agents: string[]; rules: RobotsRules } | null = null;
	let lastWasAgent = false;
	for (const rawLine of body.split(/\r?\n/)) {
		const line = rawLine.replace(/#.*/, '').trim();
		const separator = line.indexOf(':');
		if (separator < 0) continue;
		const field = line.slice(0, separator).trim().toLowerCase();
		const value = line.slice(separator + 1).trim();
		if (field === 'user-agent') {
			if (!current || !lastWasAgent) {
				current = { agents: [], rules: { disallow: [], allow: [], crawlDelayMs: 0 } };
				groups.push(current);
			}
			current.agents.push(value.toLowerCase());
			lastWasAgent = true;
			continue;
		}
		lastWasAgent = false;
		if (!current || !value) continue;
		if (field === 'crawl-delay') current.rules.crawlDelayMs = Math.min(30000, Number(value) * 1000 || 0);
		if (field === 'disallow') current.rules.disallow.push(value);
		if (field === 'allow') current.rules.allow.push(value);
	}
	const specific = groups.find((group) => group.agents.some((agent) => agent !== '*' && agentToken.includes(agent)));
	const generic = groups.find((group) => group.agents.includes('*'));
	return (specific ?? generic)?.rules ?? { disallow: [], allow: [], crawlDelayMs: 0 };
}

function patternMatches(pattern: string, path: string): boolean {
	const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
	const anchored = escaped.endsWith('\\$') ? `${escaped.slice(0, -2)}$` : escaped;
	return new RegExp(`^${anchored}`).test(path);
}

export function isAllowedByRobots(rules: RobotsRules, url: URL): boolean {
	const path = url.pathname + url.search;
	const longest = (patterns: string[]) =>
		Math.max(-1, ...patterns.filter((pattern) => patternMatches(pattern, path)).map((pattern) => pattern.length));
	const allow = longest(rules.allow);
	const disallow = longest(rules.disallow);
	if (disallow < 0) return true;
	return allow >= disallow;
}

export function extractLinks(html: string, linkPattern: string, baseUrl: string): string[] {
	const pattern = new RegExp(linkPattern, 'gi');
	const base = new URL(baseUrl);
	const seen = new Set<string>();
	const links: string[] = [];
	for (const match of html.matchAll(pattern)) {
		const raw = (match[1] ?? '').replace(/&amp;/g, '&').trim();
		if (!raw) continue;
		let url: URL;
		try {
			url = new URL(raw, base);
		} catch {
			continue;
		}
		if (url.protocol !== 'https:' || url.hostname !== base.hostname) continue;
		url.hash = '';
		const normalized = url.toString();
		if (seen.has(normalized)) continue;
		seen.add(normalized);
		links.push(normalized);
	}
	return links;
}

export function documentIdFor(sourceId: string, url: string): string {
	return `${sourceId}-${createHash('sha1').update(url).digest('hex').slice(0, 8)}`;
}

export function excerptText(text: string, maxChars: number): string {
	if (text.length <= maxChars) return text;
	const cut = text.slice(0, maxChars);
	const boundary = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('\n'));
	return (boundary > maxChars / 2 ? cut.slice(0, boundary + 1) : cut.slice(0, cut.lastIndexOf(' '))).trim();
}

const SITE_SEGMENT = /^(Portal Gov\.pl|Gov\.pl|Portal polskiej Policji|Policja[\w .]*|Aktualności|Ministerstwo .+|Komenda .+|Główny .+|Rządowe .+|Państwow\w+ .+|Urząd .+|Konkret24.*|TVN24.*|CERT Polska.*|NASK.*|fakenews\.pl.*)$/i;

export function cleanTitle(title: string): string {
	const parts = title.replace(/\s+/g, ' ').trim().split(' - ');
	while (parts.length > 1 && SITE_SEGMENT.test(parts[parts.length - 1].trim())) parts.pop();
	return parts.join(' - ').replace(/\s*[|:]\s*(Konkret24|TVN24|CERT Polska|fakenews\.pl)[^|]*$/i, '').replace(/^\d+\.\s+/, '').trim();
}

export function pageUrl(seedUrl: string, page: number): string {
	if (page <= 1) return seedUrl;
	const url = new URL(seedUrl);
	url.searchParams.set('page', String(page));
	return url.toString();
}
