import { useEffect, useState } from 'react';

export type Route = { page: 'check' } | { page: 'record'; id: string } | { page: 'sources' };

export function parseHash(hash: string): Route {
	const path = hash.replace(/^#/, '');
	if (path === '/zrodla') return { page: 'sources' };
	const match = /^\/rekord\/([^/]+)$/.exec(path);
	if (match) return { page: 'record', id: decodeURIComponent(match[1]) };
	return { page: 'check' };
}

export function useRoute(): Route {
	const [hash, setHash] = useState(() => window.location.hash);
	useEffect(() => {
		const onChange = () => setHash(window.location.hash);
		window.addEventListener('hashchange', onChange);
		return () => window.removeEventListener('hashchange', onChange);
	}, []);
	return parseHash(hash);
}
