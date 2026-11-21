import { DEFAULT_ROLE, isRole, type Role } from './config';

export interface ResolveRoleInput {
	recordRole?: unknown;
	search?: string;
	dev?: boolean;
}

export function resolveRole({ recordRole, search = '', dev = false }: ResolveRoleInput = {}): Role {
	if (dev) {
		const forced = new URLSearchParams(search).get('rola');
		if (isRole(forced)) return forced;
	}
	return isRole(recordRole) ? recordRole : DEFAULT_ROLE;
}

export function forcedRole(search: string, dev: boolean): Role | null {
	if (!dev) return null;
	const forced = new URLSearchParams(search).get('rola');
	return isRole(forced) ? forced : null;
}

export function currentRole(recordRole?: unknown): Role {
	return resolveRole({ recordRole, search: window.location.search, dev: import.meta.env.DEV });
}

export function currentForcedRole(): Role | null {
	return forcedRole(window.location.search, import.meta.env.DEV);
}
