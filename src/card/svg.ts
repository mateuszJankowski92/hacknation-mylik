import {
	VERDICT_LABELS_PL,
	type ClaimResult,
	type EvidenceItem,
	type Verdict,
	type VerificationRecord,
} from '../contracts/index';
import { VERDICT_SENTENCES, asOfSentence, formatDate } from '../render/templates';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

interface Palette {
	fg: string;
	bg: string;
	icon: string;
}

export const VERDICT_PALETTE: Record<Verdict, Palette> = {
	potwierdzone: { fg: '#14532d', bg: '#e7f6ec', icon: '✔' },
	falszywe: { fg: '#8a1c1c', bg: '#fdecec', icon: '✘' },
	wprowadzajace_w_blad: { fg: '#7a4100', bg: '#fff3df', icon: '▲' },
	brak_wystarczajacych_dowodow: { fg: '#1e3a8a', bg: '#e8eefc', icon: '?' },
	nie_podlega_weryfikacji: { fg: '#374151', bg: '#eef0f3', icon: '○' },
};

const TEXT = '#1b1f23';
const MUTED = '#4b5563';
const PAGE = '#ffffff';
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const MAX_CLAIM_CHARS = 170;
const MAX_QUOTE_CHARS = 260;

const XML_ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&apos;',
};

export function escapeXml(text: string): string {
	return text
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\uFFFE\uFFFF]/g, '')
		.replace(/[&<>"']/g, (char) => XML_ESCAPES[char] ?? char);
}

export function truncate(text: string, limit: number): string {
	const clean = text.replace(/\s+/g, ' ').trim();
	if (clean.length <= limit) return clean;
	return `${clean.slice(0, limit - 1).trimEnd()}…`;
}

export function wrapText(text: string, maxChars: number, maxLines: number): string[] {
	const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
	const lines: string[] = [];
	let current = '';
	for (const word of words) {
		const piece = word.length > maxChars ? `${word.slice(0, maxChars - 1)}…` : word;
		if (current && current.length + 1 + piece.length > maxChars) {
			lines.push(current);
			current = piece;
		} else {
			current = current ? `${current} ${piece}` : piece;
		}
	}
	if (current) lines.push(current);
	if (lines.length <= maxLines) return lines;
	const kept = lines.slice(0, maxLines);
	const last = kept[maxLines - 1]!;
	kept[maxLines - 1] = `${last.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
	return kept;
}

const PREFERRED_STANCES: Record<Verdict, EvidenceItem['stance'][]> = {
	potwierdzone: ['potwierdza'],
	falszywe: ['obala'],
	wprowadzajace_w_blad: ['rozbieznosc_kontekstu', 'kontekst'],
	brak_wystarczajacych_dowodow: [],
	nie_podlega_weryfikacji: [],
};

export function pickCardEvidence(claim: ClaimResult): EvidenceItem | undefined {
	for (const stance of PREFERRED_STANCES[claim.verdict]) {
		const found = claim.evidence.find((item) => item.stance === stance);
		if (found) return found;
	}
	return undefined;
}

function sourceLine(item: EvidenceItem): string {
	const name = (item.source.publisher || item.source.domain || 'Źródło').trim();
	const date = item.source.publishedAt ? formatDate(item.source.publishedAt) : 'bez daty publikacji';
	const title = item.source.title.trim();
	return truncate(title ? `${name}, ${title}, ${date}` : `${name}, ${date}`, 120);
}

function verdictSentence(claim: ClaimResult, item: EvidenceItem | undefined): string {
	const publisher = item ? truncate(item.source.publisher || item.source.domain || 'Źródło', 50) : 'Źródło';
	const date = item?.source.publishedAt ? formatDate(item.source.publishedAt) : 'w dokumencie bez daty publikacji';
	return VERDICT_SENTENCES[claim.verdict](publisher, date);
}

export interface CardOptions {
	cardUrl: string;
	claimIndex?: number;
}

function textLines(
	lines: string[],
	x: number,
	y: number,
	size: number,
	lineHeight: number,
	fill: string,
	extra = '',
): string {
	if (lines.length === 0) return '';
	const spans = lines
		.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
		.join('');
	return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${spans}</text>`;
}

export function renderCardSvg(record: VerificationRecord, options: CardOptions): string {
	const index = Math.min(Math.max(options.claimIndex ?? 0, 0), Math.max(record.claims.length - 1, 0));
	const claim = record.claims[index];
	const stamp = asOfSentence(record.asOf);
	const address = truncate(options.cardUrl, 120);
	const parts: string[] = [];
	const label = claim ? VERDICT_LABELS_PL[claim.verdict] : 'brak twierdzenia do oceny';
	const palette = claim ? VERDICT_PALETTE[claim.verdict] : VERDICT_PALETTE.nie_podlega_weryfikacji;
	const item = claim ? pickCardEvidence(claim) : undefined;

	const claimText = claim ? truncate(claim.claim.text, MAX_CLAIM_CHARS) : 'Nie znalazłem w zgłoszeniu twierdzenia do sprawdzenia.';
	const sentence = claim ? verdictSentence(claim, item) : 'Nie ma tu nic do oceny.';
	const quoteText = item ? truncate(item.quote, MAX_QUOTE_CHARS) : '';
	const countNote =
		record.claims.length > 1 ? ` To twierdzenie ${index + 1} z ${record.claims.length}.` : '';

	parts.push(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" role="img" aria-labelledby="card-title card-desc" font-family="${escapeXml(FONT)}">`,
	);
	parts.push(`<title id="card-title">${escapeXml(`Mylik: ${label}`)}</title>`);
	parts.push(
		`<desc id="card-desc">${escapeXml(`Twierdzenie: ${claimText}. ${sentence} ${stamp}`)}</desc>`,
	);
	parts.push(`<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${PAGE}"/>`);
	parts.push(`<rect x="8" y="8" width="${CARD_WIDTH - 16}" height="${CARD_HEIGHT - 16}" rx="18" fill="none" stroke="${palette.fg}" stroke-width="4"/>`);

	parts.push(`<rect x="40" y="36" width="1120" height="128" rx="14" fill="${palette.bg}" stroke="${palette.fg}" stroke-width="3"/>`);
	parts.push(
		`<text x="68" y="104" font-size="52" font-weight="700" fill="${palette.fg}">${escapeXml(`${palette.icon} ${label}`)}</text>`,
	);
	parts.push(textLines(wrapText(sentence, 88, 1), 68, 142, 24, 30, palette.fg));

	parts.push(`<text x="48" y="204" font-size="22" fill="${MUTED}">Sprawdzane twierdzenie</text>`);
	parts.push(textLines(wrapText(`„${claimText}”`, 70, 3), 48, 244, 32, 40, TEXT, 'font-weight="600"'));

	if (item) {
		parts.push(`<line x1="48" y1="372" x2="1152" y2="372" stroke="${MUTED}" stroke-width="1"/>`);
		parts.push(`<text x="48" y="404" font-size="22" fill="${MUTED}">Tak pisze źródło (cytat bez zmian)</text>`);
		parts.push(textLines(wrapText(`„${quoteText}”`, 88, 3), 48, 440, 26, 34, TEXT, 'font-style="italic"'));
		parts.push(textLines(wrapText(`Źródło: ${sourceLine(item)}`, 100, 1), 48, 534, 22, 28, MUTED));
	} else {
		parts.push(`<line x1="48" y1="372" x2="1152" y2="372" stroke="${MUTED}" stroke-width="1"/>`);
		parts.push(
			textLines(
				wrapText('Nie mam tu cytatu ze źródła, który rozstrzyga sprawę. Nie zgaduję odpowiedzi.', 80, 2),
				48,
				420,
				26,
				34,
				TEXT,
			),
		);
	}

	parts.push(`<line x1="48" y1="556" x2="1152" y2="556" stroke="${MUTED}" stroke-width="1"/>`);
	parts.push(textLines(wrapText(`${stamp}${countNote}`, 110, 1), 48, 584, 20, 26, MUTED));
	parts.push(textLines([`Karta: ${address}`], 48, 612, 18, 24, MUTED));
	parts.push('</svg>');
	return parts.filter(Boolean).join('\n');
}
