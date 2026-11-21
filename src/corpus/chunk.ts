export interface ChunkOptions {
	min?: number;
	max?: number;
}

const DEFAULT_MIN = 400;
const DEFAULT_MAX = 900;

function splitSentences(paragraph: string): string[] {
	const parts = paragraph.match(/[^.!?]+(?:[.!?]+["'”»)]*(?:\s+|$)|$)/g) ?? [paragraph];
	return parts.map((part) => part.trim()).filter(Boolean);
}

function hardSplit(text: string, max: number): string[] {
	const pieces: string[] = [];
	let rest = text.trim();
	while (rest.length > max) {
		let cut = rest.lastIndexOf(' ', max);
		if (cut < max / 2) cut = max;
		pieces.push(rest.slice(0, cut).trim());
		rest = rest.slice(cut).trim();
	}
	if (rest) pieces.push(rest);
	return pieces;
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
	const min = options.min ?? DEFAULT_MIN;
	const max = options.max ?? DEFAULT_MAX;
	const paragraphs = text
		.replace(/\r\n?/g, '\n')
		.split(/\n\s*\n/)
		.map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
		.filter(Boolean);

	const units: string[] = [];
	for (const paragraph of paragraphs) {
		if (paragraph.length <= max) {
			units.push(paragraph);
			continue;
		}
		for (const sentence of splitSentences(paragraph)) {
			if (sentence.length <= max) units.push(sentence);
			else units.push(...hardSplit(sentence, max));
		}
	}

	const chunks: string[] = [];
	let current = '';
	for (const unit of units) {
		if (!current) {
			current = unit;
			continue;
		}
		if (current.length >= min || current.length + 1 + unit.length > max) {
			chunks.push(current);
			current = unit;
		} else {
			current = `${current} ${unit}`;
		}
	}
	if (current) chunks.push(current);

	if (chunks.length > 1) {
		const last = chunks[chunks.length - 1];
		const previous = chunks[chunks.length - 2];
		if (last.length < min / 2 && previous.length + 1 + last.length <= max) {
			chunks.splice(chunks.length - 2, 2, `${previous} ${last}`);
		}
	}
	return chunks.filter((chunk) => chunk.length > 0);
}
