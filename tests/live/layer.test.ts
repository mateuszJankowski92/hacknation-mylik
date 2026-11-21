import { describe, expect, it } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { claim } from '../engine/fakes';
import { AnthropicLiveSearcher, hitsFromResponse, WEB_SEARCH_TOOL_TYPE } from '../../src/live/search';
import { hostInDomain, liveSourceList, loadLiveSources } from '../../src/live/sources';
import { publishedDate } from '../../src/live/layer';
import { FakeLiveSearcher, fakeFetcher, fixtureHits, fixturePages, SOURCES_PATH, testLayer } from './helpers';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const CLAIM = claim('Reprezentacja Polski wygrała z Holandią 2:1.');

describe('lista serwisów drugiej warstwy', () => {
  const list = loadLiveSources(SOURCES_PATH);

  it('plik konfiguracyjny jest poprawny: 10-20 serwisów, każdy z wydawcą, rodzajem, zasadą i datą', () => {
    expect(list.sources.length).toBeGreaterThanOrEqual(10);
    expect(list.sources.length).toBeLessThanOrEqual(20);
    for (const s of list.sources) {
      expect(s.publisher.length).toBeGreaterThan(1);
      expect(s.qualification.length).toBeGreaterThan(20);
      expect(s.addedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(new Set(list.sources.map((s) => s.kind))).toEqual(new Set(['agencja_i_media_publiczne', 'zwiazek_lub_instytucja']));
  });

  it('dopuszcza domenę i jej subdomeny, odrzuca podróbki, inne porty i protokoły', () => {
    expect(list.match('https://www.pap.pl/a')?.id).toBe('pap');
    expect(list.match('https://pap.pl/a')?.id).toBe('pap');
    expect(list.match('https://sport.tvp.pl/x')?.id).toBe('tvpsport');
    expect(list.match('https://www.tvp.pl/x')).toBeNull();
    expect(list.match('https://evilpap.pl/a')).toBeNull();
    expect(list.match('https://pap.pl.example.com/a')).toBeNull();
    expect(list.match('https://pap.pl:8080/a')).toBeNull();
    expect(list.match('ftp://pap.pl/a')).toBeNull();
    expect(list.match('https://user:x@pap.pl/a')).toBeNull();
    expect(list.match('to nie adres')).toBeNull();
    expect(hostInDomain('PAP.PL.', 'pap.pl')).toBe(true);
  });

  it('nie wczytuje listy z błędami (zły rodzaj, powtórzona domena, adres zamiast domeny)', () => {
    const kinds = { k: { label: 'x', sourceType: 'media' as const, qualification: 'zasada kwalifikacji dość długa' } };
    const base = { id: 'a1', domain: 'a.pl', publisher: 'A', kind: 'k', addedAt: '2026-11-21' };
    expect(() => liveSourceList({ version: 1, kinds, sources: [{ ...base, kind: 'zly' }] })).toThrow();
    expect(() => liveSourceList({ version: 1, kinds, sources: [base, { ...base, id: 'a2' }] })).toThrow();
    expect(() => liveSourceList({ version: 1, kinds, sources: [{ ...base, domain: 'https://a.pl/' }] })).toThrow();
  });
});

describe('wyszukiwarka: adresy tylko ze strukturalnych wyników', () => {
  it('pomija adresy z tekstu modelu, czyta bloki web_search_tool_result, zgłasza błąd wyszukiwarki', () => {
    const content = [
      { type: 'text', text: 'Zobacz https://zlo.example.com/strona', citations: null },
      {
        type: 'web_search_tool_result',
        tool_use_id: 't1',
        content: [{ type: 'web_search_result', url: 'https://www.pap.pl/a', title: 'A', page_age: 'May 30, 2026', encrypted_content: 'x' }],
      },
    ] as unknown as Anthropic.ContentBlock[];
    expect(hitsFromResponse(content).hits).toEqual([{ url: 'https://www.pap.pl/a', title: 'A', pageAge: 'May 30, 2026' }]);
    const err = [
      { type: 'web_search_tool_result', tool_use_id: 't1', content: { type: 'web_search_tool_result_error', error_code: 'unavailable' } },
    ] as unknown as Anthropic.ContentBlock[];
    expect(hitsFromResponse(err)).toMatchObject({ hits: [], errorCode: 'unavailable' });
  });

  it('wysyła narzędzie web_search z filtrem domen z listy i liczy opłatę osobno', async () => {
    let body: Anthropic.MessageCreateParamsNonStreaming | undefined;
    const client = {
      messages: {
        async create(b: Anthropic.MessageCreateParamsNonStreaming) {
          body = b;
          return {
            model: 'claude-haiku-5-5',
            stop_reason: 'end_turn',
            usage: { input_tokens: 5000, output_tokens: 20, server_tool_use: { web_search_requests: 2 } },
            content: [
              {
                type: 'web_search_tool_result',
                tool_use_id: 't',
                content: [{ type: 'web_search_result', url: 'https://www.pap.pl/a', title: 'A', page_age: null, encrypted_content: 'x' }],
              },
            ],
          } as unknown as Anthropic.Message;
        },
      },
    };
    const s = new AnthropicLiveSearcher({ client, model: 'claude-haiku-5-5' });
    const r = await s.search({ claim: CLAIM.text, today: '2026-06-01', domains: ['pap.pl', 'pzpn.pl'] });
    const tool = body!.tools![0] as { type: string; allowed_domains: string[]; max_uses: number };
    expect(tool.type).toBe(WEB_SEARCH_TOOL_TYPE);
    expect(tool.allowed_domains).toEqual(['pap.pl', 'pzpn.pl']);
    expect(tool.max_uses).toBeLessThanOrEqual(2);
    expect(r.searches).toBe(2);
    expect(r.searchFeeUsd).toBeCloseTo(0.02);
    expect(r.usage!.estimatedCostUsd).toBeCloseTo((5000 * 0.1 + 20 * 0.5) / 1e6);
    expect(r.hits).toHaveLength(1);
  });
});

describe('warstwa druga: pobranie, kontrola domeny, injection', () => {
  it('odrzuca domeny spoza listy i przekierowanie poza listę, odnotowuje stronę z poleceniem', async () => {
    const fetch = fakeFetcher(fixturePages());
    const layer = testLayer(new FakeLiveSearcher(fixtureHits()), fetch);
    const r = await layer.find(CLAIM, { budgetMs: 5000, now: NOW });
    expect(r.status).toBe('ok');
    expect(r.rejectedDomains).toEqual(expect.arrayContaining(['evilpap.pl', 'pap.pl.example.com', 'kibice.example.com']));
    // Strony spoza listy nie są nawet pobierane.
    expect(fetch.urls.some((u) => u.includes('evilpap') || u.includes('example.com/x'))).toBe(false);
    expect(r.flagged.length).toBeGreaterThan(0);
    expect(r.flagged[0]!.signals).toContain('ignorowanie_instrukcji');
    for (const p of r.passages) {
      expect(p.meta.layer).toBe('media_i_instytucje');
      expect(p.text).not.toMatch(/Zignoruj/);
      expect(['pap.pl', 'sport.tvp.pl']).toContain(p.meta.domain);
      expect(p.meta.fetchedAt).toBe(NOW.toISOString());
    }
    const pap = r.passages.find((p) => p.meta.domain === 'pap.pl')!;
    expect(pap.meta.publisher).toBe('Polska Agencja Prasowa');
    expect(pap.meta.publishedAt).toBe('2026-05-31');
    expect(pap.text).toContain('wygrała z Holandią 2:1');
  });

  it('szanuje robots.txt', async () => {
    const fetch = fakeFetcher(fixturePages(), { robots: { 'https://www.pap.pl': 'User-agent: *\nDisallow: /aktualnosci/' } });
    const r = await testLayer(new FakeLiveSearcher(fixtureHits()), fetch).find(CLAIM, { budgetMs: 5000, now: NOW });
    expect(r.robotsBlocked).toBe(1);
    expect(r.passages.some((p) => p.meta.domain === 'pap.pl')).toBe(false);
    expect(fetch.urls).not.toContain('https://www.pap.pl/aktualnosci/mecz-polska-holandia');
  });

  it('brak wyników, błąd sieci, błąd wyszukiwarki i limit czasu dają uczciwe stany', async () => {
    const pages = fixturePages();
    const none = await testLayer(new FakeLiveSearcher([]), fakeFetcher(pages)).find(CLAIM, { budgetMs: 5000, now: NOW });
    expect(none).toMatchObject({ status: 'brak_wynikow', passages: [] });

    const fail = new Set(Object.keys(pages));
    const net = await testLayer(new FakeLiveSearcher(fixtureHits()), fakeFetcher(pages, { fail })).find(CLAIM, { budgetMs: 5000, now: NOW });
    expect(net.status).toBe('brak_wynikow');
    expect(net.fetchFailed).toBeGreaterThan(0);

    const down = await testLayer(new FakeLiveSearcher(new Error('ECONNRESET')), fakeFetcher(pages)).find(CLAIM, { budgetMs: 5000, now: NOW });
    expect(down).toMatchObject({ status: 'blad_wyszukiwania', passages: [] });

    const slow = new FakeLiveSearcher(() => new Promise((r) => setTimeout(() => r(fixtureHits()), 300)));
    const late = await testLayer(slow, fakeFetcher(pages)).find(CLAIM, { budgetMs: 50, now: NOW });
    expect(late).toMatchObject({ status: 'przekroczony_czas', passages: [] });
  });

  it('data publikacji z wieku strony albo z tekstu; brak pewnej daty = null', () => {
    expect(publishedDate('2026-05-30T10:00:00Z', '', NOW)).toBe('2026-05-30');
    expect(publishedDate('2 days ago', '', NOW)).toBe('2026-05-30');
    expect(publishedDate('May 28, 2026', '', NOW)).toBe('2026-05-28');
    expect(publishedDate(null, 'Warszawa, 27 maja 2026. Treść', NOW)).toBe('2026-05-27');
    expect(publishedDate(null, 'Opublikowano 26.05.2026', NOW)).toBe('2026-05-26');
    expect(publishedDate(null, 'Mecz w 2030 roku', NOW)).toBeNull();
    expect(publishedDate('2027-01-01', '', NOW)).toBeNull();
  });
});
