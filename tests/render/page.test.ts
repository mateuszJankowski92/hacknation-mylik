import { describe, expect, it } from 'vitest';
import type { EvidenceItem, PageInfo } from '../../src/contracts/index';
import { officialAnnouncement, pageAgeNote, pageAgeNoteShort, pageOpeningSentence, pageSaysSentence } from '../../src/render/answer';

const item = (quote: string, publisher = 'Zakład Ubezpieczeń Społecznych'): EvidenceItem =>
  ({
    passageId: 'p#0',
    stance: 'potwierdza',
    quote,
    source: { publisher, domain: 'zus.pl', url: 'https://www.zus.pl/a', layer: 'strona_urzedu' },
  }) as unknown as EvidenceItem;

const FETCHED = '2026-06-01T12:00:00.000Z';

describe('zdania strony urzędu', () => {
  it('zapowiedź oficjalnego komunikatu', () => {
    expect(officialAnnouncement(' Zakład Ubezpieczeń Społecznych ')).toBe('To oficjalny komunikat: Zakład Ubezpieczeń Społecznych.');
  });

  it('wydawca podaje cytat w «», cudzysłowy w cytacie są zamieniane, długi cytat skrócony', () => {
    expect(pageSaysSentence(item('Wypłacamy 500 zł.'))).toBe('Zakład Ubezpieczeń Społecznych podaje: «Wypłacamy 500 zł.»');
    expect(pageSaysSentence(item('Mówi «tak» i «nie»'))).toBe('Zakład Ubezpieczeń Społecznych podaje: «Mówi "tak" i "nie"»');
    const long = pageSaysSentence(item('a'.repeat(300)), { maxQuote: 50, maxPublisher: 10 });
    expect(long.startsWith('Zakład Ub… podaje: «')).toBe(true);
    expect(long.length).toBeLessThan(80);
    expect(long).toContain('…»');
  });

  it('wiek strony: brak daty, stara, świeża, granica 180 dni liczona w dniach kalendarzowych', () => {
    expect(pageAgeNote(null, FETCHED)).toBe('Nie znalazłem daty publikacji tej strony.');
    expect(pageAgeNote(undefined, FETCHED)).toBe('Nie znalazłem daty publikacji tej strony.');
    expect(pageAgeNote('2025-10-01', FETCHED)).toBe('Ta strona pochodzi z 01.10.2025; sprawdź, czy informacja jest nadal aktualna.');
    expect(pageAgeNote('2026-05-20', FETCHED)).toBeNull();
    expect(pageAgeNote('2025-12-03', FETCHED)).toBeNull();
    expect(pageAgeNote('2025-12-02', FETCHED)).not.toBeNull();
    expect(pageAgeNote('2025-12-03', '2026-06-01T23:59:59.000Z')).toBeNull();
    expect(pageAgeNote('zła data', FETCHED)).toBe('Nie znalazłem daty publikacji tej strony.');
  });

  it('krótka uwaga o wieku: tylko gdy pełna istnieje', () => {
    expect(pageAgeNoteShort('2026-05-20', FETCHED)).toBeNull();
    expect(pageAgeNoteShort('2025-10-01', FETCHED)).toBe('Strona z 01.10.2025, sprawdź aktualność.');
    expect(pageAgeNoteShort(null, FETCHED)).toBe('Brak daty publikacji strony.');
  });

  it('zdanie otwierające dla adresu spoza listy', () => {
    const page: PageInfo = { url: 'https://x.pl/a', title: 'Tytuł artykułu', domain: 'x.pl', publishedAt: '2026-05-30', fetchedAt: FETCHED, official: false };
    expect(pageOpeningSentence(page)).toBe('Przeczytałem: «Tytuł artykułu» (x.pl, 30.05.2026). To relacja, nie dokument źródłowy.');
    expect(pageOpeningSentence({ ...page, publishedAt: undefined })).toBe('Przeczytałem: «Tytuł artykułu» (x.pl, bez daty publikacji). To relacja, nie dokument źródłowy.');
    expect(pageOpeningSentence({ ...page, title: null })).toBe('Przeczytałem stronę (x.pl, 30.05.2026). To relacja, nie dokument źródłowy.');
    expect(pageOpeningSentence({ ...page, title: 'T'.repeat(100) }, { maxTitle: 10 })).toContain('«TTTTTTTTT…»');
  });
});
