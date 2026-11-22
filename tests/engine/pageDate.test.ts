// Zad. 43: data publikacji strony ze znaczników HTML (bez sieci).
import { describe, expect, it } from 'vitest';
import { createPageFetcher, extractPageDate, type Resolver, type Transport } from '../../src/engine/fetch/index';

const NOW = new Date('2026-11-22T12:00:00Z');
const date = (html: string) => extractPageDate(html, NOW);

describe('extractPageDate', () => {
  it('article:published_time (meta, dowolna kolejność atrybutów)', () => {
    expect(date('<meta property="article:published_time" content="2026-11-20T09:30:00+01:00">')).toBe('2026-11-20');
    expect(date('<meta content="2026-10-02" property="article:published_time"/>')).toBe('2026-10-02');
  });
  it('JSON-LD datePublished', () => {
    expect(date('<script type="application/ld+json">{"@type":"NewsArticle","datePublished":"2026-09-15T08:00:00Z","dateModified":"2026-11-01"}</script>')).toBe('2026-09-15');
  });
  it('znacznik <time datetime>', () => {
    expect(date('<p>Aktualności <time datetime="2026-08-30T10:00">30 sierpnia</time></p>')).toBe('2026-08-30');
  });
  it('element z klasą zawierającą "date": polski zapis z miesiącem słownie i zapis numeryczny', () => {
    expect(date('<div class="article__date zus-date"><p><span>1 </span><span><span>stycznia</span><span>2026</span></span></p></div>')).toBe('2026-01-01');
    expect(date('<span class="news-date">05.11.2026</span>')).toBe('2026-11-05');
  });
  it('klasa daty modyfikacji, ważności albo wydarzenia nie jest datą publikacji', () => {
    expect(date('<span class="date-modified">05.11.2026</span>')).toBeNull();
    expect(date('<p class="event-date">05.11.2026</p>')).toBe('2026-11-05');
    expect(date('<span class="event-start-date">05.11.2026</span>')).toBeNull();
  });
  it('kolejność źródeł: meta przed JSON-LD przed time przed klasą', () => {
    const html =
      '<span class="x-date">04.04.2026</span><time datetime="2026-03-03"></time>' +
      '<script type="application/ld+json">{"datePublished":"2026-02-02"}</script><meta property="article:published_time" content="2026-01-01">';
    expect(date(html)).toBe('2026-01-01');
  });
  it('brak jawnego znacznika: null (daty w treści akapitu nie zgadujemy)', () => {
    expect(date('<p>Od 1 stycznia 2027 r. zmieniają się zasady. Opublikowano wczoraj.</p>')).toBeNull();
    expect(date('')).toBeNull();
  });
  it('data z przyszłości, sprzed 1990 i niemożliwa nie jest datą publikacji', () => {
    expect(date('<meta property="article:published_time" content="2030-01-01">')).toBeNull();
    expect(date('<meta property="article:published_time" content="1970-01-01">')).toBeNull();
    expect(date('<meta property="article:published_time" content="2026-02-31">')).toBeNull();
  });
  it('znacznik w komentarzu HTML jest pomijany', () => {
    expect(date('<!-- <meta property="article:published_time" content="2026-11-20"> -->')).toBeNull();
  });
});

describe('pobieracz zwraca publishedAt', () => {
  const enc = new TextEncoder();
  const resolver: Resolver = async () => ['93.184.216.34'];
  const make = (body: string, contentType = 'text/html; charset=utf-8') => {
    const transport: Transport = async () => ({
      status: 200,
      headers: { 'content-type': contentType },
      body: (async function* () {
        yield enc.encode(body);
      })(),
    });
    return createPageFetcher({ resolver, transport });
  };

  it('strona HTML ze znacznikiem daty', async () => {
    const r = await make('<html><head><meta property="article:published_time" content="2026-11-20"></head><body><p>Treść komunikatu urzędu.</p></body></html>')('https://www.zus.pl/a');
    expect(r).toMatchObject({ ok: true, publishedAt: '2026-11-20' });
  });
  it('strona HTML bez znacznika: null; zwykły tekst: null', async () => {
    expect(await make('<html><body><p>Treść komunikatu urzędu.</p></body></html>')('https://www.zus.pl/a')).toMatchObject({ ok: true, publishedAt: null });
    expect(await make('Treść komunikatu.', 'text/plain')('https://www.zus.pl/a')).toMatchObject({ ok: true, publishedAt: null });
  });
});
