export function formatDate(value: string | null): string {
	if (!value) return 'brak daty';
	const hasTime = value.includes('T');
	const date = new Date(hasTime ? value : `${value}T00:00:00Z`);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString('pl-PL', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: hasTime ? undefined : 'UTC',
	});
}

export function formatDateTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' });
}

export function shortId(id: string): string {
	return id.slice(0, 8);
}
