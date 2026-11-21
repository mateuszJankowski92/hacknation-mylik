// Atrapy drugiej warstwy (bez sieci i bez klucza): wyniki wyszukiwania i strony z plików testowych.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PageFetcher, PageFetchResult } from '../../src/engine/fetch/index';
import { createLiveLayer, type LiveLayer, type LiveLayerOptions } from '../../src/live/layer';
import type { LiveSearchHit, LiveSearcher, LiveSearchRequest, LiveSearchResult } from '../../src/live/search';
import { loadLiveSources } from '../../src/live/sources';

const FIX = join(import.meta.dirname, 'fixtures');

export function fixtureHits(name = 'search-sport.json'): LiveSearchHit[] {
  return (JSON.parse(readFileSync(join(FIX, name), 'utf8')) as { hits: LiveSearchHit[] }).hits;
}

interface FixturePage {
  title?: string;
  text: string;
  redirect?: string;
}

export function fixturePages(): Record<string, FixturePage> {
  return JSON.parse(readFileSync(join(FIX, 'pages.json'), 'utf8')) as Record<string, FixturePage>;
}

export class FakeLiveSearcher implements LiveSearcher {
  readonly name = 'atrapa';
  calls: LiveSearchRequest[] = [];
  constructor(
    private hits: LiveSearchHit[] | Error | (() => Promise<LiveSearchHit[]>),
    private searches = 1,
  ) {}
  async search(req: LiveSearchRequest): Promise<LiveSearchResult> {
    this.calls.push(req);
    const h = this.hits;
    if (h instanceof Error) throw h;
    const hits = typeof h === 'function' ? await h() : h;
    return {
      hits,
      searches: this.searches,
      searchFeeUsd: this.searches * 0.01,
      usage: { model: 'fake', inputTokens: 100, outputTokens: 10, estimatedCostUsd: 0.0001, latencyMs: 1 },
    };
  }
}

export interface FakeFetcherOpts {
  robots?: Record<string, string>;
  fail?: Set<string>;
}

/** Pobieracz z plików testowych; robots.txt domyślnie 404 (wolno), chyba że podano treść. */
export function fakeFetcher(pages: Record<string, FixturePage>, opts: FakeFetcherOpts = {}): PageFetcher & { urls: string[] } {
  const urls: string[] = [];
  const f = (async (url: string): Promise<PageFetchResult> => {
    urls.push(url);
    if (url.endsWith('/robots.txt')) {
      const origin = new URL(url).origin;
      const body = opts.robots?.[origin];
      return body !== undefined
        ? { ok: true, finalUrl: url, contentType: 'text/plain', title: null, text: body, truncated: false, redirects: 0 }
        : { ok: false, reason: 'status_http', status: 404 };
    }
    if (opts.fail?.has(url)) return { ok: false, reason: 'blad_sieci' };
    const p = pages[url];
    if (!p) return { ok: false, reason: 'status_http', status: 404 };
    return { ok: true, finalUrl: p.redirect ?? url, contentType: 'text/html', title: p.title ?? null, text: p.text, truncated: false, redirects: p.redirect ? 1 : 0 };
  }) as PageFetcher & { urls: string[] };
  f.urls = urls;
  return f;
}

export const SOURCES_PATH = join(import.meta.dirname, '..', '..', 'data', 'live-sources.json');

export function testLayer(searcher: LiveSearcher, fetchPage: PageFetcher, over: Partial<LiveLayerOptions> = {}): LiveLayer {
  return createLiveLayer({ sources: loadLiveSources(SOURCES_PATH), searcher, fetchPage, ...over });
}
