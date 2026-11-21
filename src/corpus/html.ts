const ENTITIES: Record<string, string> = {
	amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '-', mdash: '-', hellip: '...',
	oacute: 'ó', Oacute: 'Ó', eacute: 'é', Eacute: 'É', uuml: 'ü', ouml: 'ö', auml: 'ä', euro: '€', copy: '©', reg: '®', deg: '°', sect: '§',
	laquo: '«', raquo: '»', bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
};

export function decodeEntities(text: string): string {
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
		if (entity.startsWith('#x') || entity.startsWith('#X')) return safeFromCodePoint(parseInt(entity.slice(2), 16), match);
		if (entity.startsWith('#')) return safeFromCodePoint(parseInt(entity.slice(1), 10), match);
		return ENTITIES[entity] ?? ENTITIES[entity.toLowerCase()] ?? match;
	});
}

function safeFromCodePoint(code: number, fallback: string): string {
	if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return fallback;
	return String.fromCodePoint(code);
}

function pickContentRegion(html: string): string {
	const patterns = [/<main\b[^>]*>([\s\S]*?)<\/main>/i, /<article\b[^>]*>([\s\S]*?)<\/article>/i, /<body\b[^>]*>([\s\S]*?)<\/body>/i];
	for (const pattern of patterns) {
		const match = html.match(pattern);
		if (match && match[1].trim().length > 200) return match[1];
	}
	return html;
}

export function extractTitle(html: string): string | null {
	const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
	return match ? decodeEntities(match[1]).replace(/\s+/g, ' ').trim() : null;
}

const HIDDEN_SPAN = /<span\b[^>]*class="[^"]*xHidden[^"]*"[^>]*>[\s\S]*?<\/span>/gi;
const SEMANTIC_BLOCKS = /<(h[1-6]|p|li|blockquote|td|th|dt|dd)\b[^>]*>([\s\S]*?)<\/\1>/gi;
const LEAF_DIVS = /<div\b[^>]*>((?:(?!<\/?div\b)[\s\S])*?)<\/div>/gi;
const LEAF_FALLBACK_MAX_RATIO = 0.03;

function collectBlocks(region: string, pattern: RegExp, group: number): string[] {
	const blocks: string[] = [];
	for (const match of region.matchAll(pattern)) {
		const inner = match[group].replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ');
		const text = decodeEntities(inner).replace(/\s+/g, ' ').trim();
		if (text.length >= 2) blocks.push(text);
	}
	return blocks;
}

export function htmlToText(html: string): string {
	const cleaned = html
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(HIDDEN_SPAN, ' ')
		.replace(/<(script|style|noscript|svg|nav|header|footer|form|aside|button|select|iframe)\b[\s\S]*?<\/\1>/gi, ' ');
	const region = pickContentRegion(cleaned);
	let blocks = collectBlocks(region, SEMANTIC_BLOCKS, 2);
	if (region.length > 100000 && blocks.join('').length < region.length * LEAF_FALLBACK_MAX_RATIO) {
		const leafBlocks = collectBlocks(region, LEAF_DIVS, 1);
		if (leafBlocks.join('').length > blocks.join('').length) blocks = leafBlocks;
	}
	const unique: string[] = [];
	for (const block of blocks) if (unique[unique.length - 1] !== block) unique.push(block);
	return unique.join('\n\n');
}

export function extractPublishedDate(html: string): string | null {
	const patterns = [
		/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/,
		/<meta[^>]+property="article:published_time"[^>]+content="(\d{4}-\d{2}-\d{2})/i,
		/<meta[^>]+content="(\d{4}-\d{2}-\d{2})[^"]*"[^>]+property="article:published_time"/i,
	];
	for (const pattern of patterns) {
		const match = html.match(pattern);
		if (match) return match[1];
	}
	return null;
}
