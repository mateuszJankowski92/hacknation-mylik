// Widoczność w wyszukiwarkach i dla asystentów AI: robots.txt, sitemap.xml, llms.txt oraz metadane
// strony (title, opis, canonical, Open Graph, JSON-LD) wstrzykiwane do index.html po stronie serwera,
// bo komunikatory i roboty nie wykonują skryptów. Treści użytkownika (wynik) są wejściem niezaufanym: escapowane.
import type { Context, Hono } from 'hono';
import type { VerificationRecord } from '../contracts/index';
import { buildResultLayout } from '../render/layout';
import {
  FAQ_ITEMS,
  REPOSITORY_NOTE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_PAGES,
  SITE_TAGLINE,
  SITE_UPDATED_ISO,
} from './seoContent';

const RECORD_PATH_RE = /^\/r\/([0-9a-f]{64})\/?$/;
const OG_IMAGE_PATH = '/og-image.png';
const QUESTION_TITLE_CHARS = 60;
const DESCRIPTION_CHARS = 200;

export const PRIVATE_PATHS = ['/urzednik', '/api/', '/r/', '/sms', '/discord/'] as const;
export const AI_CRAWLERS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'OAI-SearchBot'] as const;

export interface SeoDeps {
  publicBaseUrl?: string;
  getRecord?: (id: string) => VerificationRecord | null | undefined;
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch);
}

export function resolveBaseUrl(configured: string | undefined, requestUrl: string): string {
  if (configured) return configured.replace(/\/+$/, '');
  try {
    return new URL(requestUrl).origin;
  } catch {
    return '';
  }
}

function truncate(text: string, limit: number): string {
  const clean = text.replace(/\s+/gu, ' ').trim();
  return clean.length > limit ? `${clean.slice(0, limit - 1).trimEnd()}…` : clean;
}

export function robotsTxt(baseUrl: string): string {
  const disallow = PRIVATE_PATHS.map((p) => `Disallow: ${p}`);
  const group = (agent: string) => [`User-agent: ${agent}`, 'Allow: /', ...disallow];
  const lines = [
    ...group('*'),
    'Content-Signal: ai-train=no, search=yes, ai-input=yes',
    '',
    ...AI_CRAWLERS.flatMap((agent) => [...group(agent), '']),
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ];
  return lines.join('\n');
}

export function sitemapXml(baseUrl: string): string {
  const urls = SITE_PAGES.map(
    (page) =>
      `  <url><loc>${escapeHtml(baseUrl + (page.path === '/' ? '/' : page.path))}</loc><lastmod>${SITE_UPDATED_ISO}</lastmod></url>`,
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function llmsTxt(baseUrl: string): string {
  const page = (path: string) => `${baseUrl}${path}`;
  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION} Mylik to prototyp z hackathonu HackNation 2026 (nie jest oficjalną usługą administracji publicznej, nie udaje serwisu rządowego).

## Czym Mylik jest

Użytkownik wkleja informację albo link. Mylik wyszukuje w źródłach fragmenty, które jej dotyczą, i pokazuje, co z nich wynika: dosłowny cytat, wydawcę, datę publikacji i stan źródeł na dzień sprawdzenia. Odpowiada po polsku.

## Czego Mylik nie robi

- Nie orzeka o prawdzie sam z siebie: wskazuje, co mówią źródła, i pokazuje poziom pewności.
- Nie zmyśla źródeł: każde twierdzenie ma cytat z dokumentu, który da się otworzyć.
- Wstrzymuje się, gdy nie ma dowodów: odpowiada, że nie znalazł wystarczających dowodów, zamiast zgadywać.

## Skąd są źródła

- Zbiór publicznych dokumentów (urzędowych) z listą wydawców, licencji i zasad użycia: ${page('/zrodla')}
- Oceny zaufanych redakcji weryfikujących fakty, odczytywane z publicznego indeksu Google Fact Check Tools; ocena zawsze jest przypisana redakcji.

## Strony

- [Strona główna](${page('/')}): sprawdzanie informacji
- [Źródła](${page('/zrodla')}): lista dokumentów, wydawcy, zasady użycia, zaufane redakcje, najczęstsze pytania
- [Dostępność](${page('/dostepnosc')}): deklaracja dostępności i znane braki
- [Prywatność](${page('/prywatnosc')}): co zapisujemy, na jak długo, komu to trafia

## Jak cytować

Podaj nazwę „Mylik”, adres strony i datę sprawdzenia, np. „Mylik (${baseUrl}), sprawdzenie z dnia RRRR-MM-DD”. Strony wyników (/r/...) nie są indeksowane, bo zawierają treść wpisaną przez ludzi; ich adresy są prywatne dla osoby, która je udostępnia.

## Status

Prototyp (stan na ${SITE_UPDATED_ISO}). Wyniki mogą się mylić, a zbiór źródeł jest ograniczony do wymienionych na stronie Źródła.

## Kontakt

${REPOSITORY_NOTE}
`;
}

interface PageMeta {
  title: string;
  description: string;
  canonicalPath: string | null;
  noindex: boolean;
  jsonLd: unknown[];
}

function recordMeta(record: VerificationRecord | null | undefined, id: string): PageMeta {
  const base: PageMeta = {
    title: `Wynik sprawdzenia - ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    canonicalPath: null,
    noindex: true,
    jsonLd: [],
  };
  if (!record) return base;
  const question = truncate(record.maskedInput, QUESTION_TITLE_CHARS);
  const claim = record.claims[0];
  let description = SITE_DESCRIPTION;
  if (claim) {
    const layout = buildResultLayout(claim, record.asOf, { quote: 120 }, record.createdAt);
    description = truncate(`${layout.headline} Ocena: ${layout.label}. ${layout.asOf}`, DESCRIPTION_CHARS);
  }
  return {
    ...base,
    title: question ? `Wynik sprawdzenia: „${question}” - ${SITE_NAME}` : base.title,
    description,
    canonicalPath: `/r/${id}`,
  };
}

function jsonLdFor(baseUrl: string, path: string): unknown[] {
  if (path === '/') {
    return [
      {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${baseUrl}/#website`,
            url: `${baseUrl}/`,
            name: SITE_NAME,
            description: SITE_DESCRIPTION,
            inLanguage: 'pl-PL',
            dateModified: SITE_UPDATED_ISO,
          },
          {
            '@type': 'WebApplication',
            '@id': `${baseUrl}/#app`,
            url: `${baseUrl}/`,
            name: SITE_NAME,
            description: `${SITE_DESCRIPTION} Prototyp z hackathonu HackNation 2026, nie usługa administracji publicznej.`,
            applicationCategory: 'UtilitiesApplication',
            operatingSystem: 'Dowolna przeglądarka',
            inLanguage: 'pl-PL',
            isAccessibleForFree: true,
            dateModified: SITE_UPDATED_ISO,
          },
        ],
      },
    ];
  }
  if (path === '/zrodla') {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        dateModified: SITE_UPDATED_ISO,
        mainEntity: FAQ_ITEMS.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ];
  }
  return [];
}

function metaFor(path: string, baseUrl: string, deps: SeoDeps): PageMeta {
  const record = RECORD_PATH_RE.exec(path);
  if (record) {
    let found: VerificationRecord | null | undefined = null;
    try {
      found = deps.getRecord?.(record[1]!);
    } catch {
      found = null;
    }
    return recordMeta(found, record[1]!);
  }
  const normalized = path.length > 1 ? path.replace(/\/+$/, '') : path;
  const page = SITE_PAGES.find((p) => p.path === normalized);
  if (page) {
    return {
      title: page.title,
      description: page.description,
      canonicalPath: page.path,
      noindex: false,
      jsonLd: jsonLdFor(baseUrl, page.path),
    };
  }
  return { title: SITE_PAGES[0]!.title, description: SITE_DESCRIPTION, canonicalPath: null, noindex: true, jsonLd: [] };
}

function jsonLdScript(data: unknown): string {
  const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  return `<script type="application/ld+json">${json}</script>`;
}

/** Podmienia metadane w index.html (title, opis, og/twitter) i dopisuje canonical, og:url, og:image, robots, JSON-LD. */
export function injectPageMeta(html: string, path: string, baseUrl: string, deps: SeoDeps = {}): string {
  const meta = metaFor(path, baseUrl, deps);
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const image = escapeHtml(`${baseUrl}${OG_IMAGE_PATH}`);
  const setMeta = (out: string, attr: 'name' | 'property', key: string, value: string) =>
    out.replace(new RegExp(`<meta ${attr}="${key}" content="[^"]*"\\s*/?>`), `<meta ${attr}="${key}" content="${value}" />`);
  let out = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  out = setMeta(out, 'name', 'description', description);
  out = setMeta(out, 'property', 'og:title', title);
  out = setMeta(out, 'property', 'og:description', description);
  out = setMeta(out, 'name', 'twitter:title', title);
  out = setMeta(out, 'name', 'twitter:description', description);
  const extra: string[] = [];
  if (meta.canonicalPath !== null && !meta.noindex) {
    const url = escapeHtml(`${baseUrl}${meta.canonicalPath === '/' ? '/' : meta.canonicalPath}`);
    extra.push(`<link rel="canonical" href="${url}" />`, `<meta property="og:url" content="${url}" />`);
  } else if (meta.canonicalPath !== null) {
    extra.push(`<meta property="og:url" content="${escapeHtml(`${baseUrl}${meta.canonicalPath}`)}" />`);
  }
  extra.push(`<meta property="og:image" content="${image}" />`, `<meta name="twitter:image" content="${image}" />`);
  if (meta.noindex) extra.push('<meta name="robots" content="noindex, nofollow" />');
  for (const block of meta.jsonLd) extra.push(jsonLdScript(block));
  return out.replace('</head>', `    ${extra.join('\n    ')}\n  </head>`);
}

export function isRecordPath(path: string): boolean {
  return /^\/r\//.test(path);
}

const TEXT_HEADERS = { 'Cache-Control': 'public, max-age=3600' };

export function registerSeoRoutes(app: Hono, deps: SeoDeps): void {
  const base = (c: Context) => resolveBaseUrl(deps.publicBaseUrl, c.req.url);
  app.get('/robots.txt', (c) => c.text(robotsTxt(base(c)), 200, { ...TEXT_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' }));
  app.get('/sitemap.xml', (c) =>
    c.body(sitemapXml(base(c)), 200, { ...TEXT_HEADERS, 'Content-Type': 'application/xml; charset=utf-8' }),
  );
  app.get('/llms.txt', (c) => c.text(llmsTxt(base(c)), 200, { ...TEXT_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' }));
}
