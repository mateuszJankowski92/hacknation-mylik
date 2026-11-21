import { createHash, randomBytes } from 'node:crypto';

export interface UserLimiterOptions {
	limit: number;
	windowMs?: number;
	maxKeys?: number;
	now?: () => number;
}

export interface UserLimiter {
	allow(userId: string): boolean;
}

interface Bucket {
	count: number;
	resetAt: number;
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_KEYS = 10_000;
const KEY_HEX_CHARS = 24;

export function createUserLimiter(options: UserLimiterOptions): UserLimiter {
	const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
	const maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS;
	const now = options.now ?? Date.now;
	const salt = randomBytes(16);
	const buckets = new Map<string, Bucket>();

	function keyFor(userId: string): string {
		return createHash('sha256').update(salt).update(userId, 'utf8').digest('hex').slice(0, KEY_HEX_CHARS);
	}

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

	return {
		allow(userId) {
			if (options.limit <= 0) return true;
			const current = now();
			const key = keyFor(userId);
			let bucket = buckets.get(key);
			if (!bucket || bucket.resetAt <= current) {
				if (!bucket && buckets.size >= maxKeys) evict(current);
				bucket = { count: 0, resetAt: current + windowMs };
				buckets.set(key, bucket);
			}
			bucket.count += 1;
			return bucket.count <= options.limit;
		},
	};
}
