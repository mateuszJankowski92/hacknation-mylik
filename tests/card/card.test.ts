import { describe, expect, it } from 'vitest';
import { createCardApp } from '../../src/card/index';
import { escapeXml, renderCardSvg, shortAddress, wrapText } from '../../src/card/svg';
import { VERDICT_LABELS_PL, VERDICTS, type EvidenceItem, type VerificationRecord } from '../../src/contracts/index';
import { FIXTURE_OUTCOMES } from '../../web/src/fixtures/outcomes';

function fixtureRecord(key: string): VerificationRecord {
	const outcome = FIXTURE_OUTCOMES[key]!;
	if (outcome.kind !== 'record') throw new Error('brak rekordu');
	return outcome.record;
}

const CARD_URL = 'https://mylik.example/r/abc';

describe('escapeXml', () => {
	it('ucieka znaki specjalne i usuwa znaki sterujące', () => {
		expect(escapeXml(`<a href="x">&'</a>\u0000\u0008`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;');
	});
});

describe('wrapText', () => {
	it('zawija i ucina z wielokropkiem', () => {
		const lines = wrapText('aaa bbb ccc ddd eee fff', 7, 2);
		expect(lines).toHaveLength(2);
		expect(lines[1]!.endsWith('…')).toBe(true);
		for (const line of lines) expect(line.length).toBeLessThanOrEqual(7);
	});
	it('nie ucina krótkiego tekstu', () => {
		expect(wrapText('ala ma kota', 40, 3)).toEqual(['ala ma kota']);
	});
});

describe('renderCardSvg', () => {
	for (const verdict of VERDICTS) {
		it(`rysuje kartę dla: ${verdict}`, () => {
			const svg = renderCardSvg(fixtureRecord(verdict), { cardUrl: CARD_URL });
			expect(svg.startsWith('<svg')).toBe(true);
			expect(svg).toContain(VERDICT_LABELS_PL[verdict]);
			expect(svg).toContain('Stan źródeł na 10.01.2026.');
			expect(svg).toContain('mylik.example');
		});
	}

	it('zawiera cytat i źródło dla potwierdzonego', () => {
		const svg = renderCardSvg(fixtureRecord('potwierdzone'), { cardUrl: CARD_URL });
		expect(svg).toContain('Biblioteka miejska jest czynna od poniedziałku do piątku');
		expect(svg).toContain('Przykładowy Urząd Miasta');
		expect(svg).toContain('14.03.2025');
	});

	it('nie wymyśla cytatu przy wstrzymaniu się', () => {
		const svg = renderCardSvg(fixtureRecord('brak_wystarczajacych_dowodow'), { cardUrl: CARD_URL });
		expect(svg).not.toContain('Tak pisze źródło');
		expect(svg).toContain('Nie wiem, czy to prawda.');
	});

	it('ucieka złośliwą treść w twierdzeniu, cytacie i źródle', () => {
		const record = structuredClone(fixtureRecord('potwierdzone'));
		const claim = record.claims[0]!;
		const evil = '</text><script>alert(1)</script>&"\'';
		claim.claim.text = evil;
		const item: EvidenceItem = claim.evidence[0]!;
		item.quote = evil;
		item.source.publisher = evil;
		item.source.title = evil;
		const svg = renderCardSvg(record, { cardUrl: `https://x.example/?a=1&b=<2>` });
		expect(svg).not.toContain('<script');
		expect(svg).not.toContain('</text><script');
		expect(svg).toContain('&lt;script&gt;');
		expect(svg).toContain('&amp;b=&lt;2&gt;');
		expect(svg.match(/<svg/g)).toHaveLength(1);
	});

	it('wybiera twierdzenie po indeksie i dodaje numer', () => {
		const record = structuredClone(fixtureRecord('potwierdzone'));
		const second = structuredClone(fixtureRecord('falszywe').claims[0]!);
		second.claim.id = 'c2';
		record.claims.push(second);
		const svg = renderCardSvg(record, { cardUrl: CARD_URL, claimIndex: 1 });
		expect(svg).toContain(VERDICT_LABELS_PL.falszywe);
		expect(svg).toContain('twierdzenie 2 z 2');
	});

	it('radzi sobie z rekordem bez twierdzeń', () => {
		const record = { ...fixtureRecord('potwierdzone'), claims: [] };
		const svg = renderCardSvg(record, { cardUrl: CARD_URL });
		expect(svg).toContain('brak twierdzenia do oceny');
	});

	it('nie używa zewnętrznych zasobów', () => {
		const svg = renderCardSvg(fixtureRecord('potwierdzone'), { cardUrl: CARD_URL });
		expect(svg).not.toMatch(/<image|<foreignObject|xlink:href|url\(http/);
	});
});

describe('układ karty', () => {
	function sizeOf(svg: string, text: string): number {
		const match = new RegExp(`font-size="(\\d+)"[^>]*>(?:<tspan[^>]*>)?[^<]*${text}`).exec(svg);
		if (!match) throw new Error(`brak tekstu: ${text}`);
		return Number(match[1]);
	}

	it('zdanie główne jest największe, etykieta mała, bez pewności', () => {
		const svg = renderCardSvg(fixtureRecord('falszywe'), { cardUrl: CARD_URL });
		const headline = sizeOf(svg, 'Przykładowy Urząd Miasta podał');
		const label = sizeOf(svg, VERDICT_LABELS_PL.falszywe);
		expect(label).toBeLessThan(headline);
		const sizes = [...svg.matchAll(/font-size="(\d+)"/g)].map((m) => Number(m[1]));
		expect(Math.max(...sizes)).toBe(headline);
		expect(svg).not.toContain('Na ile to pewne');
		expect(svg).toContain('Zobacz, skąd to wiem: ');
		const drawn = svg.slice(svg.indexOf('</desc>'));
		expect(drawn.indexOf('Przykładowy Urząd Miasta podał')).toBeLessThan(drawn.indexOf(VERDICT_LABELS_PL.falszywe));
		expect(drawn.indexOf(VERDICT_LABELS_PL.falszywe)).toBeLessThan(drawn.indexOf('Stan źródeł na'));
	});

	it('zdanie główne w opisie zawiera cytat bez zmian', () => {
		const svg = renderCardSvg(fixtureRecord('potwierdzone'), { cardUrl: CARD_URL });
		expect(svg).toContain('Przykładowy Urząd Miasta podał 14.03.2025 to samo: „Biblioteka miejska');
	});
});

describe('createCardApp', () => {
	const record = fixtureRecord('potwierdzone');
	const app = createCardApp({
		engine: { getRecord: (id) => (id === record.id ? record : null) },
		baseUrl: 'https://mylik.example/',
	});

	it('zwraca SVG z odpowiednimi nagłówkami', async () => {
		const res = await app.request(`/api/records/${record.id}/card.svg`);
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('image/svg+xml');
		expect(res.headers.get('content-disposition')).toContain('inline');
		expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
		const body = await res.text();
		expect(body).toContain(`mylik.example/r/${record.id.slice(0, 12)}…`);
		expect(body).not.toContain(record.id);
	});

	it('wymusza pobranie z ?download=1', async () => {
		const res = await app.request(`/api/records/${record.id}/card.svg?download=1`);
		expect(res.headers.get('content-disposition')).toContain('attachment');
	});

	it('zwraca 404 dla nieznanego i błędnego id', async () => {
		expect((await app.request(`/api/records/${'f'.repeat(64)}/card.svg`)).status).toBe(404);
		expect((await app.request('/api/records/xyz/card.svg')).status).toBe(404);
	});
});

describe('styl papierowy karty', () => {
	it('nie ma wskaźnika ani zdania o pewności, jest hasło i krótki adres', () => {
		const svg = renderCardSvg(fixtureRecord('potwierdzone'), { cardUrl: CARD_URL });
		for (const word of ['mało', 'średnio', 'dużo']) expect(svg).not.toContain(`>${word}</text>`);
		expect(svg).not.toContain('Na ile to pewne');
		expect(svg).toContain('Mylik. Informacja to nie fakt.');
		expect(svg).toContain('stroke-linejoin="round"');
	});

	it('shortAddress skraca identyfikator do 12 znaków', () => {
		expect(shortAddress('https://mylik.example/r/abcdef0123456789abcdef')).toBe('mylik.example/r/abcdef012345…');
		expect(shortAddress('https://mylik.example/r/abc')).toBe('mylik.example/r/abc');
	});
});
