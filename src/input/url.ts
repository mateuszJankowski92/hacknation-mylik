import { maskPii } from './pii';

export type UrlResult =
	| { ok: true; normalizedInput: string; maskedInput: string; host: string; masks: { type: string; count: number }[] }
	| { ok: false; message: string };

const MAX_URL_LENGTH = 2048;
const TRACKING_PARAMS = new Set(['fbclid', 'gclid', 'mc_cid', 'mc_eid', 'igshid']);
const INVALID_URL_MESSAGE = 'Ten adres wygląda na niepoprawny. Wklej pełny adres strony zaczynający się od http:// lub https://.';
const PRIVATE_URL_MESSAGE = 'Ten adres wskazuje na zasób lokalny lub wewnętrzny, więc nie możemy go sprawdzić. Wklej publiczny adres strony.';

function isTrackingParam(name: string): boolean {
	const lower = name.toLowerCase();
	return lower.startsWith('utm_') || TRACKING_PARAMS.has(lower);
}

function isPrivateIpv4(host: string): boolean {
	const parts = host.split('.').map(Number);
	const [a, b] = parts;
	if (a === 0 || a === 10 || a === 127) return true;
	if (a === 169 && b === 254) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	if (a === 100 && b >= 64 && b <= 127) return true;
	return a >= 224;
}

function isPrivateIpv6(host: string): boolean {
	const inner = host.slice(1, -1).toLowerCase();
	if (inner === '::1' || inner === '::') return true;
	if (inner.startsWith('::ffff:')) return true;
	if (/^fe[89ab]/.test(inner)) return true;
	return /^f[cd]/.test(inner);
}

function isForbiddenHost(host: string): boolean {
	if (host.startsWith('[')) return isPrivateIpv6(host);
	if (/^\d+(?:\.\d+){3}$/.test(host)) return isPrivateIpv4(host);
	if (host === 'localhost' || host.endsWith('.localhost')) return true;
	if (host.endsWith('.local') || host.endsWith('.internal')) return true;
	return !host.includes('.');
}

function withScheme(raw: string): string {
	if (raw.includes('://')) return raw;
	if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(raw)) return raw;
	return `https://${raw}`;
}

export function normalizeUrl(rawInput: string): UrlResult {
	const raw = rawInput.trim();
	if (raw.length === 0 || raw.length > MAX_URL_LENGTH || /\s/u.test(raw)) {
		return { ok: false, message: INVALID_URL_MESSAGE };
	}
	let parsed: URL;
	try {
		parsed = new URL(withScheme(raw));
	} catch {
		return { ok: false, message: INVALID_URL_MESSAGE };
	}
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		return { ok: false, message: INVALID_URL_MESSAGE };
	}
	if (parsed.username !== '' || parsed.password !== '') {
		return { ok: false, message: 'Adres zawiera login lub hasło. Usuń je i wklej sam adres strony.' };
	}
	const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
	if (host === '') return { ok: false, message: INVALID_URL_MESSAGE };
	if (isForbiddenHost(host)) return { ok: false, message: PRIVATE_URL_MESSAGE };

	const counts = new Map<string, number>();
	const kept: [string, string][] = [];
	for (const [name, value] of parsed.searchParams.entries()) {
		if (isTrackingParam(name)) continue;
		const maskedName = maskPii(name);
		const maskedValue = maskPii(value);
		for (const mask of [...maskedName.masks, ...maskedValue.masks]) {
			counts.set(mask.type, (counts.get(mask.type) ?? 0) + mask.count);
		}
		kept.push([maskedName.text, maskedValue.text]);
	}
	kept.sort((left, right) => (left[0] === right[0] ? (left[1] < right[1] ? -1 : left[1] > right[1] ? 1 : 0) : left[0] < right[0] ? -1 : 1));

	const search = new URLSearchParams(kept).toString();
	let pathname = parsed.pathname;
	if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.replace(/\/+$/, '') || '/';
	const authority = parsed.port === '' ? parsed.hostname.toLowerCase() : `${parsed.hostname.toLowerCase()}:${parsed.port}`;
	const url = `${parsed.protocol}//${authority}${pathname}${search === '' ? '' : `?${search}`}`;
	const masks = [...counts.entries()].map(([type, count]) => ({ type, count }));
	return { ok: true, normalizedInput: url, maskedInput: url, host, masks };
}
