const WARSAW_PARTS = new Intl.DateTimeFormat('pl-PL', {
	timeZone: 'Europe/Warsaw',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
});

function warsawParts(date: Date): Record<string, string> {
	return Object.fromEntries(WARSAW_PARTS.formatToParts(date).map((part) => [part.type, part.value]));
}

export function formatDate(value: string | null): string {
	if (!value) return 'brak daty';
	if (!value.includes('T')) {
		const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
		return match ? `${match[3]}.${match[2]}.${match[1]}` : value;
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	const parts = warsawParts(date);
	return `${parts.day}.${parts.month}.${parts.year}`;
}

export function formatDateTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	const parts = warsawParts(date);
	return `${parts.day}.${parts.month}.${parts.year}, ${parts.hour}:${parts.minute}`;
}

export function shortId(id: string): string {
	return id.slice(0, 8);
}
