import type { MiddlewareHandler } from 'hono';
import { redactSecrets } from './redact';

export type LogEventFn = (type: string, detail: Record<string, string | number | boolean | null>) => void;

export interface RequestLoggerOptions {
	log?: ((line: string) => void) | null;
	logEvent?: LogEventFn;
	now?: () => number;
}

export const HTTP_EVENT_TYPE = 'http_request';
const MAX_PATH_LENGTH = 200;

export function routeLabel(path: string): string {
	if (/^\/api\/records\/[^/]+$/.test(path)) return '/api/records/:id';
	if (path.startsWith('/api/')) return path.slice(0, 40);
	return 'static';
}

export function requestLogger(options: RequestLoggerOptions = {}): MiddlewareHandler {
	const log = options.log === undefined ? (line: string) => console.log(line) : options.log;
	const now = options.now ?? (() => performance.now());
	return async function requestLoggerMiddleware(c, next) {
		const startedAt = now();
		await next();
		const ms = Math.round(now() - startedAt);
		const status = c.res.status;
		if (log) log(redactSecrets(`${c.req.method} ${c.req.path.slice(0, MAX_PATH_LENGTH)} ${status} ${ms}ms`));
		if (!options.logEvent || !c.req.path.startsWith('/api/')) return;
		try {
			options.logEvent(HTTP_EVENT_TYPE, { route: routeLabel(c.req.path), method: c.req.method, status, ms });
		} catch {
			return;
		}
	};
}
