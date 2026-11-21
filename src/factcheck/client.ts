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
}>;

export interface GoogleIndexOptions {
  endpoint: string;
  apiKey: string | undefined;
  fetchImpl?: FetchLike;
}

export class GoogleFactCheckIndex implements FactcheckIndex {
  readonly name = 'google_fact_check_tools';
  private readonly endpoint: string;
  private readonly apiKey: string | undefined;
  private readonly fetchImpl: FetchLike;

  constructor(opts: GoogleIndexOptions) {
    this.endpoint = opts.endpoint;
    this.apiKey = opts.apiKey?.trim() || undefined;
    this.fetchImpl = opts.fetchImpl ?? ((url, init) => fetch(url, init));
  }

  async search(req: IndexSearchRequest): Promise<IndexSearchResult> {
    const r = await this.call({ query: req.query, languageCode: req.languageCode, pageSize: String(req.pageSize) }, req.signal);
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
    return { ok: true, claims: claims ?? [], nextPageToken: typeof next === 'string' && next ? next : null };
  }
}
