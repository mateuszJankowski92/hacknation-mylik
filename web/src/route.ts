import { useEffect, useState } from 'react';

export type Route = { page: 'check' } | { page: 'record'; id: string } | { page: 'sources' };

const NAVIGATE_EVENT = 'mylik:navigate';
const ID_PATTERN = /^[0-9a-f]{64}$/;

function routeForPath(path: string): Route | null {
	if (path === '/zrodla') return { page: 'sources' };
	const result = /^\/r\/([^/]+)\/?$/.exec(path);
	if (result) return { page: 'record', id: decodeURIComponent(result[1]) };
	const legacy = /^\/rekord\/([^/]+)$/.exec(path);
	if (legacy) return { page: 'record', id: decodeURIComponent(legacy[1]) };
	return null;
}

export function parseHash(hash: string): Route {
	return routeForPath(hash.replace(/^#/, '')) ?? { page: 'check' };
}

export function parseLocation(pathname: string, hash: string): Route {
	const fromPath = routeForPath(pathname);
	if (fromPath) return fromPath;
	return parseHash(hash);
}

export const PENDING_CONTENT_KEY = 'pendingContent';

export function readPendingContent(): string | null {
	const state = window.history.state as Record<string, unknown> | null;
	const value = state?.[PENDING_CONTENT_KEY];
	return typeof value === 'string' && value.length > 0 ? value : null;
}

export function isRecordId(value: string): boolean {
	return ID_PATTERN.test(value);
}

export function recordUrlPath(id: string): string {
	return `/r/${encodeURIComponent(id)}`;
}

export interface NavigateOptions {
	replace?: boolean;
	state?: unknown;
}

export function navigate(path: string, options: NavigateOptions = {}): void {
	const state = options.state ?? null;
	if (options.replace) window.history.replaceState(state, '', path);
	else window.history.pushState(state, '', path);
	window.dispatchEvent(new Event(NAVIGATE_EVENT));
	window.scrollTo?.(0, 0);
}

export function useRoute(): Route {
	const [location, setLocation] = useState(() => ({ pathname: window.location.pathname, hash: window.location.hash }));
	useEffect(() => {
		const onChange = () => setLocation({ pathname: window.location.pathname, hash: window.location.hash });
		window.addEventListener('hashchange', onChange);
		window.addEventListener('popstate', onChange);
		window.addEventListener(NAVIGATE_EVENT, onChange);
		onChange();
		return () => {
			window.removeEventListener('hashchange', onChange);
			window.removeEventListener('popstate', onChange);
			window.removeEventListener(NAVIGATE_EVENT, onChange);
		};
	}, []);
	return parseLocation(location.pathname, location.hash);
}
