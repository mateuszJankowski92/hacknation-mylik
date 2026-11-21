const STOPWORDS = new Set([
	'oraz', 'czyli', 'ponieważ', 'ponieważ', 'który', 'która', 'które', 'których', 'którym', 'którego',
	'jest', 'są', 'był', 'była', 'było', 'były', 'będzie', 'będą', 'jako', 'przez', 'przed', 'przy',
	'dla', 'bez', 'nad', 'pod', 'ale', 'albo', 'lub', 'czy', 'nie', 'tak', 'tego', 'tym', 'tej', 'ten',
	'ta', 'to', 'te', 'tych', 'tylko', 'jeszcze', 'także', 'też', 'już', 'bardzo', 'może', 'można',
	'należy', 'jego', 'jej', 'ich', 'nas', 'was', 'mnie', 'sobie', 'się', 'jak', 'gdy', 'gdzie',
	'kiedy', 'dlaczego', 'czemu', 'więc', 'wszystkie', 'wszystkich', 'wszyscy', 'każdy', 'pod',
	'nawet', 'oraz', 'między', 'według', 'podczas', 'wobec', 'około', 'będąc', 'mają', 'ma', 'mieć',
	'jestem', 'jesteś', 'mówi', 'mówią', 'podobno', 'twierdzi', 'twierdzą', 'prawda', 'fałsz',
	'the', 'and', 'for', 'with', 'that', 'this',
]);

const STEM_THRESHOLD = 7;
const STEM_LENGTH = 5;
const MAX_TERMS = 24;

export function extractKeywords(text: string): string[] {
	const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
	const seen = new Set<string>();
	const terms: string[] = [];
	for (const word of words) {
		if (word.length < 3 || STOPWORDS.has(word)) continue;
		const term = word.length > STEM_THRESHOLD ? word.slice(0, STEM_LENGTH + 1) : word;
		if (seen.has(term)) continue;
		seen.add(term);
		terms.push(term);
		if (terms.length >= MAX_TERMS) break;
	}
	return terms;
}

export function buildFtsQuery(text: string): string | null {
	const terms = extractKeywords(text);
	if (terms.length === 0) return null;
	return terms.map((term) => `"${term.replace(/"/g, '""')}"`).join(' OR ');
}
