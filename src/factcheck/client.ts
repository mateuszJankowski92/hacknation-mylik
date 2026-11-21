// Klient indeksu weryfikacji: Google Fact Check Tools API, metoda claims:search (GET, bez treści żądania).
// Dokumentacja: https://developers.google.com/fact-check/tools/api/reference/rest/v1alpha1/claims/search
// Klucz tylko ze zmiennej środowiskowej GOOGLE_FACTCHECK_API_KEY; nigdy w logu ani w kodzie błędu.

/** Pola odpowiedzi API (Claim, ClaimReview, Publisher), tak jak w dokumentacji. */
export interface ApiClaimReview {
  publisher?: { name?: string; site?: string };
  url?: string;
  title?: string;
  reviewDate?: string;
  textualRating?: string;
  languageCode?: string;
}
export interface ApiClaim {
  text?: string;
  claimant?: string;
  claimDate?: string;
  claimReview?: ApiClaimReview[];
}
export interface ApiSearchResponse {
  claims?: ApiClaim[];
  nextPageToken?: string;
}

export type IndexErrorCode = 'brak_klucza' | 'limit' | 'odmowa_dostepu' | 'blad_http' | 'blad_sieci' | 'zla_odpowiedz' | 'przekroczony_czas';

export type IndexSearchResult = { ok: true; claims: ApiClaim[] } | { ok: false; code: IndexErrorCode; status?: number };

export interface IndexSearchRequest {
  query: string;
  /** Filtr wydawcy (reviewPublisherSiteFilter), np. demagog.org.pl. */
  site?: string;
  languageCode: string;
  pageSize: number;
  signal?: AbortSignal;
}

export interface IndexListRequest {
  /** Domena wydawcy (reviewPublisherSiteFilter); wtedy query jest niewymagane (dokumentacja claims:search). */
  site: string;
  languageCode: string;
  pageSize: number;
  pageToken?: string;
  signal?: AbortSignal;
}

export type IndexListResult = { ok: true; claims: ApiClaim[]; nextPageToken: string | null } | { ok: false; code: IndexErrorCode; status?: number };

export interface FactcheckIndex {
  readonly name: string;
  search(req: IndexSearchRequest): Promise<IndexSearchResult>;
}

export type FetchLike = (url: string, init: { method: 'GET'; signal?: AbortSignal; headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  headers?: { get(name: string): string | null };
}>;

/** Czas ważności odpowiedzi z nagłówka Cache-Control (ms); 0 = nie wolno trzymać. */
export function cacheTtlMs(cacheControl: string | null | undefined): number {
  const v = (cacheControl ?? '').toLowerCase();
  if (!v || /no-store|no-cache/.test(v)) return 0;
  const m = /max-age=(\d+)/.exec(v);
  return m ? Number(m[1]) * 1000 : 0;
}

export const INDEX_CACHE_MAX_ENTRIES = 500;

export interface GoogleIndexOptions {
  endpoint: string;
  apiKey: string | undefined;
  fetchImpl?: FetchLike;
  nowMs?: () => number;
}

export class GoogleFactCheckIndex implements FactcheckIndex {
  readonly name = 'google_fact_check_tools';
  private readonly endpoint: string;
  private readonly apiKey: string | undefined;
  private readonly fetchImpl: FetchLike;
  /** Pamięć odpowiedzi tylko w procesie i tylko na czas z nagłówka Cache-Control; nic na dysk. */
  private readonly cache = new Map<string, { until: number; result: IndexListResult }>();
  private readonly nowMs: () => number;

  constructor(opts: GoogleIndexOptions) {
    this.endpoint = opts.endpoint;
    this.apiKey = opts.apiKey?.trim() || undefined;
    this.fetchImpl = opts.fetchImpl ?? ((url, init) => fetch(url, init));
    this.nowMs = opts.nowMs ?? (() => Date.now());
  }

  async search(req: IndexSearchRequest): Promise<IndexSearchResult> {
    const params: Record<string, string> = { query: req.query, languageCode: req.languageCode, pageSize: String(req.pageSize) };
    if (req.site) params.reviewPublisherSiteFilter = req.site;
    const r = await this.call(params, req.signal);
    return r.ok ? { ok: true, claims: r.claims } : r;
  }

  /** Strona wyników jednego wydawcy (masowe pobranie spisu weryfikacji). */
  async list(req: IndexListRequest): Promise<IndexListResult> {
    const params: Record<string, string> = { reviewPublisherSiteFilter: req.site, languageCode: req.languageCode, pageSize: String(req.pageSize) };
    if (req.pageToken) params.pageToken = req.pageToken;
    return this.call(params, req.signal);
  }

  private async call(params: Record<string, string>, signal?: AbortSignal): Promise<IndexListResult> {
    if (!this.apiKey) return { ok: false, code: 'brak_klucza' };
    const cacheKey = JSON.stringify(Object.entries(params).sort());
    const hit = this.cache.get(cacheKey);
    if (hit && hit.until > this.nowMs()) return hit.result;
    if (hit) this.cache.delete(cacheKey);
    const u = new URL(this.endpoint);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    u.searchParams.set('key', this.apiKey);
    const req = { signal };
    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await this.fetchImpl(u.toString(), { method: 'GET', signal: req.signal, headers: { accept: 'application/json' } });
    } catch (e) {
      const aborted = (e as { name?: string })?.name === 'AbortError' || req.signal?.aborted === true;
      return { ok: false, code: aborted ? 'przekroczony_czas' : 'blad_sieci' };
    }
    if (!res.ok) {
      const code: IndexErrorCode = res.status === 429 ? 'limit' : res.status === 400 || res.status === 401 || res.status === 403 ? 'odmowa_dostepu' : 'blad_http';
      return { ok: false, code, status: res.status };
    }
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      return { ok: false, code: 'zla_odpowiedz' };
    }
    if (!body || typeof body !== 'object') return { ok: false, code: 'zla_odpowiedz' };
    const claims = (body as ApiSearchResponse).claims;
    if (claims !== undefined && !Array.isArray(claims)) return { ok: false, code: 'zla_odpowiedz' };
    const next = (body as ApiSearchResponse).nextPageToken;
    const result: IndexListResult = { ok: true, claims: claims ?? [], nextPageToken: typeof next === 'string' && next ? next : null };
    const ttl = cacheTtlMs(res.headers?.get('cache-control'));
    if (ttl > 0) {
      if (this.cache.size >= INDEX_CACHE_MAX_ENTRIES) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(cacheKey, { until: this.nowMs() + ttl, result });
    }
    return result;
  }
}
