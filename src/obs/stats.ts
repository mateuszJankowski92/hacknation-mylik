import type { DatabaseSync } from 'node:sqlite';
import { Hono } from 'hono';
import { HTTP_EVENT_TYPE } from './request-log';

export const STATS_PATH = '/api/stats';
const LATENCY_SAMPLE_SIZE = 1000;

export interface StatsDeps {
	db: DatabaseSync;
	now?: () => Date;
}

export interface StatsResponse {
	asOf: string;
	requests: { total: number; verify: number; rateLimited: number; serverErrors: number };
	latencyMs: { samples: number; p50: number | null; p95: number | null };
	verifications: {
		started: number;
		completed: number;
		cacheHits: number;
		abstained: number;
		states: Record<string, number>;
		llmErrors: number;
		searchErrors: number;
		urlNotFetched: number;
		injectionSignals: number;
	};
	records: { total: number; verdicts: Record<string, number> };
	llm: { calls: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number };
}

function percentile(sorted: number[], p: number): number | null {
	if (sorted.length === 0) return null;
	const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
	return sorted[index];
}

function scalar(db: DatabaseSync, sql: string, ...params: string[]): number {
	const row = db.prepare(sql).get(...params) as { n: number | null } | undefined;
	return Number(row?.n ?? 0);
}

function countEvents(db: DatabaseSync, type: string): number {
	return scalar(db, 'SELECT COUNT(*) AS n FROM events WHERE type = ?', type);
}

function stateCounts(db: DatabaseSync): Record<string, number> {
	const rows = db
		.prepare("SELECT json_extract(detail, '$.state') AS state, COUNT(*) AS n FROM events WHERE type = 'state' GROUP BY state")
		.all() as Array<{ state: string | null; n: number }>;
	const result: Record<string, number> = {};
	for (const row of rows) result[row.state ?? 'nieznany'] = Number(row.n);
	return result;
}

function verdictCounts(db: DatabaseSync): Record<string, number> {
	const rows = db
		.prepare(
			`SELECT json_extract(c.value, '$.verdict') AS verdict, COUNT(*) AS n
			 FROM records r, json_each(r.json, '$.claims') c GROUP BY verdict`,
		)
		.all() as Array<{ verdict: string | null; n: number }>;
	const result: Record<string, number> = {};
	for (const row of rows) result[row.verdict ?? 'nieznany'] = Number(row.n);
	return result;
}

function latencySamples(db: DatabaseSync): number[] {
	const rows = db
		.prepare(
			`SELECT CAST(json_extract(detail, '$.ms') AS REAL) AS ms FROM events
			 WHERE type = ? AND json_extract(detail, '$.route') = '/api/verify' AND json_extract(detail, '$.status') = 200
			 ORDER BY id DESC LIMIT ?`,
		)
		.all(HTTP_EVENT_TYPE, LATENCY_SAMPLE_SIZE) as Array<{ ms: number | null }>;
	return rows.map((row) => Number(row.ms ?? 0)).sort((a, b) => a - b);
}

export function collectStats(deps: StatsDeps): StatsResponse {
	const { db } = deps;
	const now = deps.now ?? (() => new Date());
	const latencies = latencySamples(db);
	const usage = db
		.prepare(
			`SELECT COALESCE(SUM(json_extract(json, '$.usage.llmCalls')), 0) AS calls,
			        COALESCE(SUM(json_extract(json, '$.usage.inputTokens')), 0) AS input,
			        COALESCE(SUM(json_extract(json, '$.usage.outputTokens')), 0) AS output,
			        COALESCE(SUM(json_extract(json, '$.usage.estimatedCostUsd')), 0) AS cost,
			        COUNT(*) AS total
			 FROM records`,
		)
		.get() as { calls: number; input: number; output: number; cost: number; total: number };
	const httpEvents = (extra: string) =>
		scalar(db, `SELECT COUNT(*) AS n FROM events WHERE type = '${HTTP_EVENT_TYPE}'${extra}`);
	return {
		asOf: now().toISOString(),
		requests: {
			total: httpEvents(''),
			verify: httpEvents(" AND json_extract(detail, '$.route') = '/api/verify'"),
			rateLimited: httpEvents(" AND json_extract(detail, '$.status') = 429"),
			serverErrors: countEvents(db, 'server_error') + httpEvents(" AND json_extract(detail, '$.status') >= 500"),
		},
		latencyMs: { samples: latencies.length, p50: percentile(latencies, 0.5), p95: percentile(latencies, 0.95) },
		verifications: {
			started: countEvents(db, 'verify_start'),
			completed: countEvents(db, 'verify_ok'),
			cacheHits: countEvents(db, 'cache_hit'),
			abstained: countEvents(db, 'abstain'),
			states: stateCounts(db),
			llmErrors: countEvents(db, 'llm_error'),
			searchErrors: countEvents(db, 'search_error'),
			urlNotFetched: countEvents(db, 'url_not_fetched'),
			injectionSignals: countEvents(db, 'injection_signal'),
		},
		records: { total: Number(usage.total), verdicts: verdictCounts(db) },
		llm: {
			calls: Number(usage.calls),
			inputTokens: Number(usage.input),
			outputTokens: Number(usage.output),
			estimatedCostUsd: Number(Number(usage.cost).toFixed(6)),
		},
	};
}

export function createStatsApp(deps: StatsDeps): Hono {
	const app = new Hono();
	app.get(STATS_PATH, (c) => {
		c.header('Cache-Control', 'no-store');
		return c.json(collectStats(deps));
	});
	return app;
}
