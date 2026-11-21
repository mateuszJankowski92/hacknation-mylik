import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context, MiddlewareHandler } from 'hono';
import type { ApiError } from '../contracts/api';

export interface RateLimitOptions {
	limit: number;
	windowMs?: number;
	trustedProxyHops?: number;
	getClientKey?: (c: Context) => string;
	appliesTo?: (c: Context) => boolean;
	now?: () => number;
	maxKeys?: number;
}

export const RATE_LIMIT_MESSAGE_PL = 'Za dużo zgłoszeń w krótkim czasie. Odczekaj chwilę i spróbuj ponownie.';

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_KEYS = 10_000;
const UNKNOWN_CLIENT = 'nieznany';
const MAX_KEY_LENGTH = 64;

interface Bucket {
	count: number;
	resetAt: number;
}

export function parseForwardedFor(header: string | undefined, trustedProxyHops: number): string | null {
	if (!header || trustedProxyHops < 1) return null;
	const hops = header
		.split(',')
		.map((hop) => hop.trim())
		.filter((hop) => hop.length > 0);
	const index = hops.length - trustedProxyHops;
	if (index < 0) return null;
	return hops[index].slice(0, MAX_KEY_LENGTH);
}

function socketAddress(c: Context): string | null {
	try {
		return getConnInfo(c).remote.address ?? null;
	} catch {
		return null;
	}
}

export function resolveClientKey(c: Context, trustedProxyHops: number): string {
	const forwarded = parseForwardedFor(c.req.header('x-forwarded-for'), trustedProxyHops);
	if (forwarded) return forwarded;
	return socketAddress(c) ?? UNKNOWN_CLIENT;
}

function isVerifyRequest(c: Context): boolean {
	return c.req.path.startsWith('/api/') && c.req.method !== 'GET' && c.req.method !== 'HEAD' && c.req.method !== 'OPTIONS';
}

export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
	const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
	const maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS;
	const trustedProxyHops = options.trustedProxyHops ?? 0;
	const now = options.now ?? Date.now;
	const appliesTo = options.appliesTo ?? isVerifyRequest;
	const getClientKey = options.getClientKey ?? ((c: Context) => resolveClientKey(c, trustedProxyHops));
	const buckets = new Map<string, Bucket>();

	function evict(current: number): void {
		for (const [key, bucket] of buckets) {
			if (bucket.resetAt <= current) buckets.delete(key);
		}
		while (buckets.size >= maxKeys) {
			const oldest = buckets.keys().next();
			if (oldest.done) break;
			buckets.delete(oldest.value);
		}
	}

	return async function rateLimitMiddleware(c, next) {
		if (!appliesTo(c)) return next();
		const current = now();
		const key = getClientKey(c).slice(0, MAX_KEY_LENGTH);
		let bucket = buckets.get(key);
		if (!bucket || bucket.resetAt <= current) {
			if (!bucket && buckets.size >= maxKeys) evict(current);
			bucket = { count: 0, resetAt: current + windowMs };
			buckets.set(key, bucket);
		}
		bucket.count += 1;
		const remaining = Math.max(0, options.limit - bucket.count);
		c.header('X-RateLimit-Limit', String(options.limit));
		c.header('X-RateLimit-Remaining', String(remaining));
		if (bucket.count > options.limit) {
			const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - current) / 1000));
			c.header('Retry-After', String(retryAfter));
			return c.json({ error: 'limit_zadan', message: RATE_LIMIT_MESSAGE_PL } satisfies ApiError, 429);
		}
		return next();
	};
}
