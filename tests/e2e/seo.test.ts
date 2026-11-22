// E2E widoczności i stanu warstw: robots.txt, sitemap.xml, llms.txt, metadane stron (w tym wyniku
// z treścią niezaufaną), JSON-LD, /api/health z jawnym stanem warstw i lista zaufanych redakcji. Bez sieci.
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VerifyOutcomeSchema } from '../../src/contracts/index';
import { ingestCatalog } from '../../src/corpus/index';
import { openDb } from '../../src/db/open';
import { bootstrap, type Bootstrapped } from '../../src/server/bootstrap';
import { computeLayerStatus } from '../../src/server/layers';
import { escapeHtml, injectPageMeta, llmsTxt, robotsTxt, sitemapXml } from '../../src/server/seo';

const BASE = 'https://mylik.example.test';
const TEXT = 'Zarząd zieleni poinformował, że ogród botaniczny w Lipinach jest otwarty codziennie od godziny ósmej.';
const INDEX = 'web/index.html';

function boot(publicBaseUrl?: string): Bootstrapped {
  const root = mkdtempSync(join(tmpdir(), 'mylik-seo-'));
  mkdirSync(join(root, 'data/raw'), { recursive: true });
  writeFileSync(join(root, 'data/raw/park-1.txt'), TEXT);
  writeFileSync(
    join(root, 'sources.json'),
    JSON.stringify({
      version: 1,
      sources: [
        {
          id: 'zielen',
          publisher: 'Zarząd Zieleni (test)',
          domain: 'zielen.example.gov',
          sourceType: 'urzedowe',
          license: 'test',
          documents: [{ id: 'park-1', title: 'Ogród', url: 'https://zielen.example.gov/ogrod', publishedAt: '2026-09-01', file: 'data/raw/park-1.txt' }],
        },
      ],
    }),
  );
  const db = openDb(':memory:');
  ingestCatalog(db, join(root, 'sources.json'), root);
  const dist = join(root, 'dist');
  mkdirSync(dist, { recursive: true });
  copyFileSync(INDEX, join(dist, 'index.html'));
  return bootstrap({
    env: {},
    db,
    config: { llmProvider: 'mock', anthropicApiKey: undefined, publicBaseUrl, incidentsPath: join(tmpdir(), 'mylik-seo-brak-incydentow.json') },
    distDir: dist,
    log: null,
    warn: () => {},
  });
}

describe('pliki dla robotów', () => {
  const b = boot(BASE);

  it('robots.txt: publiczne strony dozwolone, /r/, /api/, /urzednik wyłączone, sygnały treści, mapa strony', async () => {
    const res = await b.app.request('/robots.txt');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    const text = await res.text();
    expect(text).toContain('User-agent: *\nAllow: /\nDisallow: /urzednik\nDisallow: /api/\nDisallow: /r/');
    expect(text).toMatch(/User-agent: \*[\s\S]*Content-Signal: ai-train=no, search=yes, ai-input=yes/);
    expect(text).toContain('User-agent: GPTBot');
    expect(text).toContain(`Sitemap: ${BASE}/sitemap.xml`);
  });

  it('sitemap.xml: strona główna, źródła, dostępność, prywatność; bez /r/', async () => {
    const text = await (await b.app.request('/sitemap.xml')).text();
    for (const path of ['/', '/zrodla', '/dostepnosc', '/prywatnosc']) expect(text).toContain(`<loc>${BASE}${path}</loc>`);
    expect(text).not.toContain('/r/');
    expect(text).toContain('<lastmod>2026-11-22</lastmod>');
  });

  it('llms.txt: czym jest, czego nie robi, źródła, cytowanie, status, kontakt; bez słów zakazanych', async () => {
    const res = await b.app.request('/llms.txt');
    const text = await res.text();
    expect(text.startsWith('# Mylik')).toBe(true);
    for (const part of ['## Czego Mylik nie robi', 'Nie zmyśla źródeł', 'Wstrzymuje się', '## Jak cytować', '## Status', '## Kontakt', `${BASE}/zrodla`]) {
      expect(text).toContain(part);
    }
    expect(text).not.toMatch(/Winner Script|Son of Anton|IP 3\.0|Wilson/);
    expect(text).not.toMatch(/[–—]/);
  });

  it('bez PUBLIC_BASE_URL adres bierze z żądania', async () => {
    const other = boot();
    const text = await (await other.app.request('http://localhost:9999/robots.txt')).text();
    expect(text).toContain('Sitemap: http://localhost:9999/sitemap.xml');
  });

  it('funkcje czyste dają to samo co trasy', () => {
    expect(robotsTxt(BASE)).toContain('Disallow: /r/');
    expect(sitemapXml(BASE)).toContain('<urlset');
    expect(llmsTxt(BASE)).toContain(BASE);
  });
});

describe('metadane stron', () => {
  const b = boot(BASE);

  it('strona główna: title, opis, canonical, Open Graph 1200x630, Twitter, JSON-LD WebSite i WebApplication, nagłówek Link', async () => {
    const res = await b.app.request('/');
    const html = await res.text();
    expect(html).toContain('<title>Mylik: informacja to nie fakt</title>');
    expect(html).toContain(`<link rel="canonical" href="${BASE}/" />`);
    expect(html).toContain(`<meta property="og:url" content="${BASE}/" />`);
    expect(html).toContain(`<meta property="og:image" content="${BASE}/og-image.png" />`);
    expect(html).toContain('og:locale" content="pl_PL"');
    expect(html).toContain('twitter:card" content="summary_large_image"');
    expect(html).not.toContain('noindex');
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]!));
    const types = ld.flatMap((d) => (d['@graph'] ?? [d]).map((n: { '@type': string }) => n['@type']));
    expect(types).toEqual(expect.arrayContaining(['WebSite', 'WebApplication']));
    expect(res.headers.get('link')).toContain('/llms.txt');
  });

  it('Źródła: FAQPage w JSON-LD, ten sam tekst co widoczne pytania', async () => {
    const html = await (await b.app.request('/zrodla')).text();
    expect(html).toContain('<title>Źródła - Mylik</title>');
    expect(html).toContain(`<link rel="canonical" href="${BASE}/zrodla" />`);
    const ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)![1]!);
    expect(ld['@type']).toBe('FAQPage');
    expect(ld.mainEntity).toHaveLength(4);
    expect(ld.mainEntity[3].acceptedAnswer.text).toContain('nie oficjalna usługa administracji publicznej');
  });

  it('wynik /r/<id>: własny tytuł i opis, noindex (meta i nagłówek), bez canonical, treść użytkownika escapowana', async () => {
    const outcome = VerifyOutcomeSchema.parse(await (await b.app.request('/api/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: TEXT }) })).json());
    if (outcome.kind !== 'record') throw new Error('brak rekordu');
    const res = await b.app.request(`/r/${outcome.record.id}`);
    const html = await res.text();
    expect(res.headers.get('x-robots-tag')).toContain('noindex');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(html).not.toContain('rel="canonical"');
    expect(html).toMatch(/<title>Wynik sprawdzenia: „Zarząd zieleni/);
    expect(html).toMatch(/<meta name="description" content="[^"]+Ocena:/);
    expect(html).toContain(`<meta property="og:image" content="${BASE}/og-image.png" />`);
    expect(html.match(/<title>/g)).toHaveLength(1);
  });

  it('nieznany wynik i nieznana ścieżka: noindex, ogólny tytuł', async () => {
    const missing = await (await b.app.request(`/r/${'a'.repeat(64)}`)).text();
    expect(missing).toContain('noindex');
    expect(missing).toContain('<title>Wynik sprawdzenia - Mylik</title>');
    expect(await (await b.app.request('/cos-nieznanego')).text()).toContain('noindex');
  });

  it('wejście niezaufane nie wstrzykuje znaczników', () => {
    const evil = '"><script>alert(1)</script>';
    expect(escapeHtml(evil)).toBe('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
    const html = '<html><head><title>x</title><meta name="description" content="y" /></head></html>';
    const out = injectPageMeta(html, `/r/${'b'.repeat(64)}`, BASE, {
      getRecord: () =>
        ({ maskedInput: evil, asOf: '2026-11-22', createdAt: '2026-11-22T10:00:00.000Z', claims: [] }) as never,
    });
    expect(out).not.toContain('<script>alert');
    expect(out).toContain('&lt;script&gt;');
  });
});

describe('/api/health: stan warstw', () => {
  it('zwraca factcheck, live, discord, revision bez sekretów', async () => {
    const b = boot(BASE);
    const h = (await (await b.app.request('/api/health')).json()) as Record<string, any>;
    expect(typeof h.factcheck.enabled).toBe('boolean');
    expect(typeof h.factcheck.publishers).toBe('number');
    expect(h.live).toEqual({ enabled: false });
    expect(typeof h.discord.configured).toBe('boolean');
    expect(typeof h.revision).toBe('string');
    expect(JSON.stringify(h)).not.toMatch(/key|token|secret/i);
  });

  it('powody wyłączenia indeksu: brak klucza, brak pliku konfiguracyjnego, wyłączone', () => {
    const base = { liveEnabled: true, discordConfigured: true, projectRoot: tmpdir() };
    const config = 'data/factcheck.json';
    expect(computeLayerStatus({ ...base, env: {}, factcheckConfigPath: config }).factcheck).toMatchObject({ enabled: false, reason: 'brak klucza' });
    expect(computeLayerStatus({ ...base, env: { GOOGLE_FACTCHECK_API_KEY: 'x' }, factcheckConfigPath: join(tmpdir(), 'nie-ma.json') }).factcheck).toEqual({
      enabled: false,
      reason: 'brak pliku konfiguracyjnego',
      publishers: 0,
    });
    expect(computeLayerStatus({ ...base, env: { GOOGLE_FACTCHECK_API_KEY: 'x', FACTCHECK_LAYER: 'off' }, factcheckConfigPath: config }).factcheck).toMatchObject({
      enabled: false,
      reason: 'wyłączone',
    });
    const on = computeLayerStatus({ ...base, env: { GOOGLE_FACTCHECK_API_KEY: 'x' }, factcheckConfigPath: config });
    expect(on.factcheck.enabled).toBe(true);
    expect(on.factcheck.reason).toBeUndefined();
    expect(on.factcheck.publishers).toBeGreaterThan(0);
    expect(on.live.enabled).toBe(true);
  });

  it('lista zaufanych redakcji z pliku konfiguracyjnego', async () => {
    const b = boot(BASE);
    const body = (await (await b.app.request('/api/factcheck/publishers')).json()) as { publishers: Array<{ name: string }>; qualification: string | null };
    expect(body.publishers.length).toBeGreaterThan(0);
    expect(body.publishers.map((p) => p.name)).toContain('Demagog');
    expect(body.qualification).toMatch(/IFCN|EFCSN/);
  });
});
