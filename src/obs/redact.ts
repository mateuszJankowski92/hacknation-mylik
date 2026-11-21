const SECRET_PATTERNS: RegExp[] = [
	/sk-[A-Za-z0-9_-]{8,}/g,
	/(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi,
	/((?:api[_-]?key|token|secret|password|authorization|x-api-key)["']?\s*[:=]\s*["']?)[^\s"',;&]{4,}/gi,
	/([?&](?:api[_-]?key|key|token|secret|access_token)=)[^&\s]+/gi,
];

export const REDACTED = '[UKRYTE]';

export function redactSecrets(text: string): string {
	let result = text;
	for (const pattern of SECRET_PATTERNS) {
		result = result.replace(pattern, (...args: unknown[]) => {
			const prefix = typeof args[1] === 'string' ? args[1] : '';
			return `${prefix}${REDACTED}`;
		});
	}
	return result;
}

export function redactDetail<T extends Record<string, string | number | boolean | null>>(detail: T): T {
	const result: Record<string, string | number | boolean | null> = {};
	for (const [key, value] of Object.entries(detail)) {
		result[key] = typeof value === 'string' ? redactSecrets(value) : value;
	}
	return result as T;
}
