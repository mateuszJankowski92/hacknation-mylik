import type { Notice } from '../contracts/index';
import { formatDate } from './templates';

export const BRAND_TAGLINE = 'Mapa to nie terytorium. Mylik sprawdza mapę, zanim w nią uwierzysz.';

export const KNOWN_OP_INTRO = 'Uwaga: podobna wiadomość krążyła już wcześniej.';
export const KNOWN_OP_LINK_TEXT = 'Zobacz opis';
export const KNOWN_OP_DISCLAIMER = 'To tylko podpowiedź. Nie mówi, czy Twoja wiadomość to prawda.';
export const MAX_KNOWN_OP_WARNINGS = 2;

export interface KnownOpWarning {
	date: string | null;
	title: string | null;
	url: string | null;
}

const TITLE = /„([^”]+)”/u;
const URL_PATTERN = /https?:\/\/[^\s<>"„”]+/iu;
const ISO_DATE = /(\d{4})-(\d{2})-(\d{2})/u;
const PL_DATE = /(\d{2})\.(\d{2})\.(\d{4})/u;
const STAMP = /Stan na \d{2}[.-]\d{2}[.-]\d{4}(, \d{2}:\d{2})?\.|Stan na \d{4}-\d{2}-\d{2}\./gu;

function isoOf(text: string): string | null {
	const iso = ISO_DATE.exec(text);
	if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
	const pl = PL_DATE.exec(text);
	if (pl) return `${pl[3]}-${pl[2]}-${pl[1]}`;
	return null;
}

export function isKnownOpNotice(notice: Notice): boolean {
	return notice.type === 'dopasowanie_incydentu' && /euvsdisinfo/iu.test(notice.text);
}

export function parseKnownOpNotice(text: string): KnownOpWarning {
	const titleMatch = TITLE.exec(text);
	const title = titleMatch ? titleMatch[1]!.trim() : null;
	const withoutTitle = titleMatch ? text.replace(titleMatch[0], ' ') : text;
	const withoutUrl = withoutTitle.replace(URL_PATTERN, ' ').replace(STAMP, ' ');
	const urlMatch = URL_PATTERN.exec(text);
	const url = urlMatch ? urlMatch[0].replace(/[.,;)]+$/u, '') : null;
	return { date: isoOf(withoutUrl), title: title || null, url };
}

export function selectKnownOpWarnings(notices: Notice[]): KnownOpWarning[] {
	const seen = new Set<string>();
	const parsed: KnownOpWarning[] = [];
	for (const notice of notices) {
		if (!isKnownOpNotice(notice)) continue;
		const warning = parseKnownOpNotice(notice.text);
		const key = `${warning.url ?? ''}|${warning.title ?? ''}|${warning.date ?? ''}`;
		if (seen.has(key)) continue;
		seen.add(key);
		parsed.push(warning);
	}
	return parsed
		.map((warning, index) => ({ warning, index }))
		.sort((a, b) => (b.warning.date ?? '').localeCompare(a.warning.date ?? '') || a.index - b.index)
		.slice(0, MAX_KNOWN_OP_WARNINGS)
		.map(({ warning }) => warning);
}

export function knownOpDescription(warning: KnownOpWarning): string {
	const date = warning.date ? ` ${formatDate(warning.date)}` : '';
	return `Strona EUvsDisinfo (Unia Europejska) opisała ją${date} jako dezinformację${warning.title ? ':' : '.'}`;
}

export function knownOpWarningLines(warning: KnownOpWarning): string[] {
	const lines = [KNOWN_OP_INTRO, knownOpDescription(warning)];
	if (warning.title) lines.push(`„${warning.title}”`);
	if (warning.url) lines.push(`${KNOWN_OP_LINK_TEXT}: ${warning.url}`);
	lines.push(KNOWN_OP_DISCLAIMER);
	return lines;
}

export function knownOpSmsText(notices: Notice[]): string {
	const first = selectKnownOpWarnings(notices)[0];
	if (!first) return '';
	return `${KNOWN_OP_INTRO} ${knownOpDescription({ ...first, title: null })}`;
}
