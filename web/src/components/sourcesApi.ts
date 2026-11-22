export interface TrustedPublishers {
	publishers: Array<{ name: string; site: string }>;
	qualification: string | null;
}

export async function fetchTrustedPublishers(signal?: AbortSignal): Promise<TrustedPublishers | null> {
	try {
		const response = await fetch('/api/factcheck/publishers', { headers: { Accept: 'application/json' }, signal });
		if (!response.ok) return null;
		const body = (await response.json()) as Partial<TrustedPublishers>;
		if (!body || !Array.isArray(body.publishers)) return null;
		const publishers = body.publishers.filter(
			(item): item is { name: string; site: string } => typeof item?.name === 'string' && typeof item?.site === 'string',
		);
		return { publishers, qualification: typeof body.qualification === 'string' ? body.qualification : null };
	} catch {
		return null;
	}
}
