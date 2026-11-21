import {
	type ClaimResult,
	type EvidenceItem,
	type Verdict,
	type VerificationRecord,
} from '../contracts/index';
import { EVIDENCE_LINK_TEXT, buildResultLayout, pickLayoutEvidence } from '../render/layout';
import { asOfStamp, formatDate } from '../render/templates';
import { BRAND_TAGLINE, KNOWN_OP_INTRO, knownOpDescription, selectKnownOpWarnings } from '../render/warning';
import { renderGaugeMarkup, zoneForStrength } from './visuals';

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

export function pickCardEvidence(claim: ClaimResult): EvidenceItem | undefined {
	return pickLayoutEvidence(claim);
}

function sourceLine(item: EvidenceItem): string {
	const name = (item.source.publisher || item.source.domain || 'Źródło').trim();
	const date = item.source.publishedAt ? formatDate(item.source.publishedAt) : 'bez daty publikacji';
	const title = item.source.title.trim();
	return truncate(title ? `${name}, ${title}, ${date}` : `${name}, ${date}`, 120);
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

export const CARD_FONT_SIZES = {
	headline: 42,
	label: 24,
	certainty: 24,
	detail: 20,
	footer: 20,
} as const;

const HEADLINE_CHARS = 46;
const HEADLINE_LINES = 4;
const HEADLINE_QUOTE_CHARS = 150;
const LABEL_CHAR_WIDTH = 14;

export function renderCardSvg(record: VerificationRecord, options: CardOptions): string {
	const index = Math.min(Math.max(options.claimIndex ?? 0, 0), Math.max(record.claims.length - 1, 0));
	const claim = record.claims[index];
	const address = truncate(options.cardUrl, 110);
	const parts: string[] = [];
	const palette = claim ? VERDICT_PALETTE[claim.verdict] : VERDICT_PALETTE.nie_podlega_weryfikacji;
	const item = claim ? pickCardEvidence(claim) : undefined;
	const layout = claim
		? buildResultLayout(claim, record.asOf, { publisher: 50, quote: HEADLINE_QUOTE_CHARS })
		: {
				headline: 'Nie znalazłem w zgłoszeniu nic do sprawdzenia.',
				label: 'brak twierdzenia do oceny',
				certainty: null,
				asOf: asOfStamp(record.asOf),
				evidenceLink: EVIDENCE_LINK_TEXT,
			};
	const claimText = claim ? truncate(claim.claim.text, MAX_CLAIM_CHARS) : '';
	const countNote = record.claims.length > 1 ? ` To twierdzenie ${index + 1} z ${record.claims.length}.` : '';
	const chipText = `${palette.icon} ${layout.label}`;
	const chipWidth = Math.min(1104, Math.round(chipText.length * LABEL_CHAR_WIDTH + 40));
	const certaintyX = 48 + chipWidth + 24;

	parts.push(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" role="img" aria-labelledby="card-title card-desc" font-family="${escapeXml(FONT)}">`,
	);
	parts.push(`<title id="card-title">${escapeXml(`Mylik: ${layout.label}`)}</title>`);
	parts.push(
		`<desc id="card-desc">${escapeXml(`${layout.headline} Ocena: ${layout.label}.${layout.certainty ? ` ${layout.certainty}.` : ''} ${layout.asOf}`)}</desc>`,
	);
	parts.push(`<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${PAGE}"/>`);
	parts.push(`<rect x="8" y="8" width="${CARD_WIDTH - 16}" height="${CARD_HEIGHT - 16}" rx="18" fill="none" stroke="${palette.fg}" stroke-width="4"/>`);

	parts.push(
		textLines(
			wrapText(layout.headline, HEADLINE_CHARS, HEADLINE_LINES),
			48,
			96,
			CARD_FONT_SIZES.headline,
			54,
			TEXT,
			'font-weight="700"',
		),
	);

	parts.push(`<rect x="48" y="326" width="${chipWidth}" height="46" rx="23" fill="${palette.bg}" stroke="${palette.fg}" stroke-width="2"/>`);
	parts.push(
		`<text x="68" y="358" font-size="${CARD_FONT_SIZES.label}" font-weight="600" fill="${palette.fg}">${escapeXml(chipText)}</text>`,
	);
	if (layout.certainty) {
		parts.push(
			`<text x="${certaintyX}" y="358" font-size="${CARD_FONT_SIZES.certainty}" fill="${TEXT}">${escapeXml(layout.certainty)}</text>`,
		);
	}

	if (claim && layout.certainty) {
		const gauge = renderGaugeMarkup(zoneForStrength(claim.strength.level), {
			ink: TEXT,
			muted: MUTED,
			active: palette.fg,
		});
		parts.push(`<g transform="translate(912 278)" role="presentation">${gauge}</g>`);
	}

	if (claimText) {
		parts.push(
			textLines(wrapText(`Sprawdzane twierdzenie: „${claimText}”`, 100, 2), 48, 416, CARD_FONT_SIZES.detail, 28, MUTED),
		);
	}
	const knownOpFirst = selectKnownOpWarnings(record.notices)[0];
	if (item) {
		parts.push(textLines(wrapText(`Źródło: ${sourceLine(item)}`, 100, knownOpFirst ? 1 : 2), 48, 484, CARD_FONT_SIZES.detail, 28, MUTED));
	}

	if (knownOpFirst) {
		const warningLines = wrapText(`${KNOWN_OP_INTRO} ${knownOpDescription({ ...knownOpFirst, title: null })}`, 135, 1);
		parts.push(textLines(warningLines, 48, 526, 16, 20, MUTED));
	}

	parts.push(`<line x1="48" y1="540" x2="1152" y2="540" stroke="${MUTED}" stroke-width="1"/>`);
	parts.push(textLines(wrapText(`${layout.asOf}${countNote}`, 100, 1), 48, 572, CARD_FONT_SIZES.footer, 26, TEXT));
	parts.push(
		textLines([`${layout.evidenceLink}: ${address}`], 48, 604, CARD_FONT_SIZES.footer, 26, MUTED),
	);
	parts.push(`<text x="1152" y="30" font-size="16" text-anchor="end" fill="${MUTED}">${escapeXml(`Mylik. ${BRAND_TAGLINE}`)}</text>`);
	parts.push('</svg>');
	return parts.filter(Boolean).join('\n');
}
