import { useEffect, useState } from 'react';

export type Route =
	| { page: 'check' }
	| { page: 'record'; id: string }
	| { page: 'sources' }
	| { page: 'accessibility' }
	| { page: 'privacy' }
	| { page: 'notFound' };

const NAVIGATE_EVENT = 'mylik:navigate';
const ID_PATTERN = /^[0-9a-f]{64}$/;

function routeForPath(path: string): Route | null {
	if (path === '/zrodla') return { page: 'sources' };
	if (path === '/dostepnosc') return { page: 'accessibility' };
	if (path === '/prywatnosc') return { page: 'privacy' };
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
	if (pathname !== '/' && pathname !== '' && pathname !== '/index.html') return { page: 'notFound' };
	return parseHash(hash);
}

export const DRAFT_KEY = 'draft';
export const FOCUS_FIELD_KEY = 'focusField';

function historyState(): Record<string, unknown> {
	const state = window.history.state as Record<string, unknown> | null;
	return state && typeof state === 'object' ? state : {};
}

export function readDraft(): string {
	const value = historyState()[DRAFT_KEY];
	return typeof value === 'string' ? value : '';
}

export function readFocusField(): boolean {
	return historyState()[FOCUS_FIELD_KEY] === true;
}

export function rememberDraft(content: string): void {
	const state = historyState();
	if (state[DRAFT_KEY] === content || (!content && !(DRAFT_KEY in state))) return;
	try {
		window.history.replaceState({ ...state, [DRAFT_KEY]: content }, '');
	} catch {
		return;
	}
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
	focusFragment(path);
}

function focusFragment(path: string): void {
	const fragment = path.split('#')[1];
	if (!fragment) return;
	window.setTimeout(() => {
		const target = document.getElementById(decodeURIComponent(fragment));
		if (!target) return;
		target.scrollIntoView?.({ block: 'start' });
		target.focus({ preventScroll: true });
	}, 0);
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
