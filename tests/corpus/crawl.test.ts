import { describe, expect, it } from 'vitest';
import { cleanTitle, documentIdFor, excerptText, extractLinks, isAllowedByRobots, pageUrl, parseRobots } from '../../src/corpus/crawl';
import { extractPublishedDate, extractValidUntil } from '../../src/corpus/html';

describe('robots.txt', () => {
	it('zakazuje wszystkiego dla User-agent: * Disallow: /', () => {
		const rules = parseRobots('User-agent: Googlebot\nDisallow: /system/\n\nUser-agent: *\nDisallow: /\n');
		expect(isAllowedByRobots(rules, new URL('https://utk.gov.pl/pl/pasazerowie'))).toBe(false);
	});

	it('dłuższy Allow wygrywa z krótszym Disallow', () => {
		const rules = parseRobots('User-agent: *\nDisallow: /\nAllow: /komunikaty/\nAllow: /$\n');
		expect(isAllowedByRobots(rules, new URL('https://moje.cert.pl/komunikaty/?page=2'))).toBe(true);
		expect(isAllowedByRobots(rules, new URL('https://moje.cert.pl/admin'))).toBe(false);
	});

	it('pusty plik i brak reguł pozwalają', () => {
		expect(isAllowedByRobots(parseRobots(''), new URL('https://a.example/x'))).toBe(true);
		expect(isAllowedByRobots(parseRobots('User-agent: *\nDisallow:\n'), new URL('https://a.example/x'))).toBe(true);
	});

	it('czyta crawl-delay i wybiera grupę dla naszego agenta', () => {
		const rules = parseRobots('User-agent: *\nCrawl-delay: 3\nDisallow: /ftp/\n\nUser-agent: mylik\nDisallow: /tajne/\n');
		expect(rules.disallow).toEqual(['/tajne/']);
		expect(parseRobots('User-agent: *\nCrawl-delay: 3\n').crawlDelayMs).toBe(3000);
	});
});

describe('odkrywanie odnośników', () => {
	const html = '<div class="title"><a href="/web/x/a">A</a></div><div class="title"><a href="https://obca.example/b">B</a></div><div class="title"><a href="/web/x/a#czesc">A</a></div><div class="title"><a href="/web/x/c?x=1&amp;y=2">C</a></div>';

	it('zostawia tylko ten sam host, bez duplikatów i bez kotwic', () => {
		const links = extractLinks(html, '<div class="title"><a href="([^"]+)"', 'https://www.gov.pl/web/x/aktualnosci');
		expect(links).toEqual(['https://www.gov.pl/web/x/a', 'https://www.gov.pl/web/x/c?x=1&y=2']);
	});

	it('odrzuca schematy inne niż https', () => {
		expect(extractLinks('<a href="http://www.gov.pl/a">x</a><a href="javascript:void(0)">y</a>', '<a href="([^"]+)"', 'https://www.gov.pl/')).toEqual([]);
	});

	it('identyfikator dokumentu jest stabilny', () => {
		expect(documentIdFor('gov-x', 'https://www.gov.pl/a')).toBe(documentIdFor('gov-x', 'https://www.gov.pl/a'));
		expect(documentIdFor('gov-x', 'https://www.gov.pl/a')).toMatch(/^gov-x-[0-9a-f]{8}$/);
	});

	it('buduje adresy kolejnych stron', () => {
		expect(pageUrl('https://a.example/lista', 1)).toBe('https://a.example/lista');
		expect(pageUrl('https://a.example/lista', 3)).toBe('https://a.example/lista?page=3');
	});
});

describe('fragmenty i tytuły', () => {
	it('excerptText tnie na granicy zdania i nie przekracza limitu', () => {
		const text = `${'Pierwsze zdanie jest dość długie i ma sporo słów. '.repeat(30)}Koniec.`;
		const excerpt = excerptText(text, 300);
		expect(excerpt.length).toBeLessThanOrEqual(300);
		expect(excerpt.endsWith('.')).toBe(true);
		expect(excerptText('Krótko.', 300)).toBe('Krótko.');
	});

	it('cleanTitle usuwa nazwę serwisu i numerację', () => {
		expect(cleanTitle('3. Jak odebrać paszport u konsula? - Ministerstwo Spraw Zagranicznych - Portal Gov.pl')).toBe('Jak odebrać paszport u konsula?');
	});
});

describe('tytuły serwisów', () => {
	it('usuwa nazwę urzędu i portalu z końca tytułu', () => {
		expect(cleanTitle('Alert RCB - niezdatna woda (21.10) - Rządowe Centrum Bezpieczeństwa - Portal Gov.pl')).toBe('Alert RCB - niezdatna woda (21.10)');
		expect(cleanTitle('Operacja TOR. Rok wspólnej służby - Policja.pl - Portal polskiej Policji')).toBe('Operacja TOR. Rok wspólnej służby');
		expect(cleanTitle('Portal Gov.pl')).toBe('Portal Gov.pl');
	});
});

describe('daty', () => {
	it('czyta datę publikacji z polskiego formatu i z time', () => {
		expect(extractPublishedDate('<p class="event-date">10.11.2026</p>')).toBe('2026-11-10');
		expect(extractPublishedDate('<time datetime="2026-05-03T10:00:00+01:00">3 maja</time>')).toBe('2026-05-03');
		expect(extractPublishedDate('<p class="event-date">31.02.2026</p>')).toBeNull();
		expect(extractPublishedDate('<span class="data">Data publikacji  21.11.2026</span>')).toBe('2026-11-21');
		expect(extractPublishedDate('<li>\n 19-11-2026\n </li>')).toBe('2026-11-19');
		expect(extractPublishedDate('<span> 03 listopada 2026 </span>')).toBe('2026-11-03');
		expect(extractPublishedDate('<p>brak</p>')).toBeNull();
	});

	it('valid_until tylko gdy tekst go wyraźnie podaje', () => {
		expect(extractValidUntil('Ograniczenie obowiązuje do 15.12.2026 r. na całej granicy.', '2026-11-01')).toBe('2026-12-15');
		expect(extractValidUntil('Zakaz jest ważny do dnia 3 marca 2027.', null)).toBe('2027-03-03');
		expect(extractValidUntil('Spotkanie odbyło się do 10.10.2026.', null)).toBeNull();
		expect(extractValidUntil('Obowiązuje do 01.01.2020.', '2026-01-01')).toBeNull();
		expect(extractValidUntil('Brak terminu.', null)).toBeNull();
	});
});
