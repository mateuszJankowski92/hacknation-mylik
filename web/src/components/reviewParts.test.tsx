// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { EvidenceItem } from '../../../src/contracts/record';
import { linkifyAddresses, parseReviewAssessment } from './reviewParts';

const URL_SCHEME = ['https:', '', ''].join('/');
const ADDRESS = `${URL_SCHEME}demagog.org.pl/wypowiedzi/darmowa-komunikacja-jaka-kwote-musialby-dolozyc-wroclaw/`;
const THESIS = 'To rezygnacja z przychodów z tytułu biletów, a to jest w 7 mld budżecie naprawdę skromna kwota.';

function reviewItem(claimant: string | null = null): EvidenceItem {
	return {
		passageId: 'p1',
		stance: 'kontekst',
		quote: THESIS,
		source: {
			documentId: 'fc:1',
			sourceId: 'fc-demagog',
			title: 'Darmowa komunikacja',
			publisher: 'Demagog',
			domain: 'demagog.org.pl',
			url: ADDRESS,
			publishedAt: '2024-04-05',
			review: { claimReviewed: THESIS, claimant, claimDate: null, rating: 'Częściowa prawda', label: null },
		},
	} as unknown as EvidenceItem;
}

describe('ocena redakcji rozdzielona na przypisanie, cytat i odnośnik', () => {
	const similar = `Redakcja Demagog sprawdziła podobne twierdzenie: „${THESIS}” i oceniła je jako „Częściowa prawda”, 05.04.2024, ${ADDRESS}.`;

	it('podobna sprawa: jedno krótkie zdanie, cytat z pola dowodu i odnośnik z domeną', () => {
		const parts = parseReviewAssessment(similar, [reviewItem()])!;
		expect(parts.attribution).toBe('Redakcja Demagog sprawdziła podobne twierdzenie i oceniła je jako „Częściowa prawda”, 05.04.2024.');
		expect(parts.thesis).toBe(THESIS);
		expect(parts.claimant).toBeNull();
		expect(parts.link).toEqual({ href: ADDRESS, label: 'Zobacz publikację: demagog.org.pl' });
		expect(parts.attribution).not.toContain('http');
	});

	it('ocena wprost: autor wypowiedzi trafia pod cytat, bez odnośnika, gdy zdanie nie ma adresu', () => {
		const direct = `Redakcja Demagog sprawdziła twierdzenie: „${THESIS}” (autor wypowiedzi: Jan Kowalski) i oceniła je jako „Częściowa prawda”.`;
		const parts = parseReviewAssessment(direct, [reviewItem('Jan Kowalski')])!;
		expect(parts.attribution).toBe('Redakcja Demagog sprawdziła twierdzenie i oceniła je jako „Częściowa prawda”.');
		expect(parts.claimant).toBe('Jan Kowalski');
		expect(parts.thesis).toBe(THESIS);
		expect(parts.link).toBeNull();
	});

	it('nie dopasowuje zdania bez dowodu z oceną redakcji', () => {
		expect(parseReviewAssessment(similar, [])).toBeNull();
		expect(parseReviewAssessment('Strona urzędu mówi coś innego.', [reviewItem()])).toBeNull();
	});
});

describe('surowe adresy w zdaniach zamieniane na opisane odnośniki', () => {
	it('zostawia znaki interpunkcji poza odnośnikiem', () => {
		const pieces = linkifyAddresses(`Zobacz ${ADDRESS}. Dalej tekst.`);
		expect(pieces.map((piece) => piece.kind)).toEqual(['text', 'link', 'text', 'text']);
		expect(pieces[1]).toMatchObject({ href: ADDRESS, text: 'Zobacz publikację: demagog.org.pl' });
		expect(pieces.map((piece) => piece.text).join('')).not.toContain('https');
	});
});
