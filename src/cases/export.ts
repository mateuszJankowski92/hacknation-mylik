import { CASE_STATE_LABELS_PL, type CaseItem } from './types';

export const CSV_COLUMNS = [
	'id',
	'stan',
	'zgloszenia',
	'twierdzenie',
	'pierwsze_zgloszenie',
	'ostatnie_zgloszenie',
	'kanaly',
	'przekazano_do',
	'przekazano_data',
	'zgloszenia_od_przekazania',
	'notatka',
	'czego_szukal_system',
	'rekordy',
] as const;

export function csvCell(value: string | number | null): string {
	let text = value === null ? '' : String(value);
	if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
	return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function channelsText(channels: Record<string, number>): string {
	return Object.entries(channels)
		.map(([name, n]) => `${name}:${n}`)
		.join(';');
}

function searchedText(item: CaseItem): string {
	const info = item.searchInfo;
	const parts: string[] = [];
	if (info.searchTerms.length) parts.push(`szukane: ${info.searchTerms.join(', ')}`);
	if (info.counterTerms.length) parts.push(`przeciwne: ${info.counterTerms.join(', ')}`);
	if (info.abstainReason) parts.push(info.abstainReason);
	return parts.join(' | ');
}

export function casesToCsv(items: readonly CaseItem[]): string {
	const lines = [CSV_COLUMNS.join(',')];
	for (const item of items) {
		const forwardedSince =
			item.forwardedReportCount === null ? null : Math.max(0, item.reportCount - item.forwardedReportCount);
		lines.push(
			[
				item.id,
				CASE_STATE_LABELS_PL[item.state],
				item.reportCount,
				item.claimText,
				item.firstSeen,
				item.lastSeen,
				channelsText(item.channels),
				item.forwardedTo,
				item.forwardedAt,
				forwardedSince,
				item.note,
				searchedText(item),
				item.records.map((r) => r.recordId).join(';'),
			]
				.map(csvCell)
				.join(','),
		);
	}
	return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export interface CasesJsonExport {
	exportedAt: string;
	count: number;
	cases: CaseItem[];
}

export function casesToJson(items: readonly CaseItem[], now: Date = new Date()): CasesJsonExport {
	return { exportedAt: now.toISOString(), count: items.length, cases: [...items] };
}
