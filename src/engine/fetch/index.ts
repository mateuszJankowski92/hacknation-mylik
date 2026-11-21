// Pobieranie strony podanej przez użytkownika, z ochroną SSRF.
//
// Zasady:
// - tylko http/https, porty domyślne (80/443), bez loginu i hasła w adresie;
// - nazwy lokalne odrzucane przed DNS; KAŻDY adres z rozwiązania DNS musi być publiczny;
// - połączenie idzie na adres sprawdzony (przypięty), więc podmiana DNS po sprawdzeniu nie działa;
// - przekierowania obsługujemy ręcznie i każde sprawdzamy od nowa (limit liczby);
// - limit rozmiaru (czytamy najwyżej `maxBytes`) i czasu (jeden termin na cały łańcuch).
// Treść strony to DANE do analizy: nie jest dowodem ani instrukcją (o tym decyduje potok).
import { lookup as dnsLookup } from 'node:dns/promises';
import * as http from 'node:http';
import * as https from 'node:https';
import { isIP } from 'node:net';
import { extractTitle, htmlToText } from '../../corpus/html';
import { isBlockedHostname, isBlockedIp } from './ip';

export { isBlockedHostname, isBlockedIp, isBlockedIpv4, isBlockedIpv6 } from './ip';

export type FetchFailReason =
  | 'zly_adres'
  | 'niedozwolony_protokol'
  | 'niedozwolony_port'
  | 'adres_prywatny'
  | 'dns'
  | 'za_duzo_przekierowan'
  | 'status_http'
  | 'zly_typ_tresci'
  | 'przekroczony_czas'
  | 'blad_sieci'
  | 'pusta_tresc';

export type PageFetchResult =
  | { ok: true; finalUrl: string; contentType: string; title: string | null; text: string; truncated: boolean; redirects: number }
  | { ok: false; reason: FetchFailReason; status?: number };

export type PageFetcher = (url: string) => Promise<PageFetchResult>;

/** Rozwiązuje nazwę hosta na listę adresów IP (wszystkie rekordy A/AAAA). */
export type Resolver = (host: string) => Promise<string[]>;

export interface TransportRequest {
  url: URL;
  /** Adres IP sprawdzony przez ochronę SSRF; transport MUSI łączyć się właśnie z nim. */
  address: string;
  headers: Record<string, string>;
  signal: AbortSignal;
}
export interface TransportResponse {
  status: number;
  headers: Record<string, string | undefined>;
  body: AsyncIterable<Uint8Array>;
  /** Zwalnia połączenie, gdy nie czytamy treści do końca. */
  close?(): void;
}
export type Transport = (req: TransportRequest) => Promise<TransportResponse>;

export interface PageFetcherOptions {
  resolver?: Resolver;
  transport?: Transport;
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  /** Limit długości tekstu po wyciągnięciu z HTML (znaki). */
  maxTextChars?: number;
}

export const DEFAULT_MAX_BYTES = 1_000_000;
export const DEFAULT_TIMEOUT_MS = 8_000;
export const DEFAULT_MAX_REDIRECTS = 3;
export const DEFAULT_MAX_TEXT_CHARS = 20_000;
const USER_AGENT = 'MYLIK-weryfikator/0.1 (+analiza tresci; bez ciasteczek)';
const ALLOWED_PORTS = new Set(['', '80', '443']);
const REDIRECTS = new Set([301, 302, 303, 307, 308]);

class FetchAbort extends Error {
  constructor(readonly reason: FetchFailReason, readonly status?: number) {
    super(reason);
  }
}

export const systemResolver: Resolver = async (host) => {
  const list = await dnsLookup(host, { all: true, verbatim: true });
  return list.map((a) => a.address);
};

/** Transport na node:http/https z przypiętym adresem IP (`lookup` zwraca tylko sprawdzony adres). */
export const nodeTransport: Transport = (req) =>
  new Promise((resolve, reject) => {
    const mod = req.url.protocol === 'https:' ? https : http;
    const family = isIP(req.address) === 6 ? 6 : 4;
    const r = mod.request(
      req.url,
      {
        method: 'GET',
        headers: req.headers,
        signal: req.signal,
        lookup: (_host, opts, cb) => {
          // Node woła lookup z `all: true` lub bez; obsługujemy oba warianty.
          if ((opts as { all?: boolean }).all) (cb as unknown as (e: null, a: { address: string; family: number }[]) => void)(null, [{ address: req.address, family }]);
          else cb(null, req.address, family);
        },
      },
      (res) => {
        const headers: Record<string, string | undefined> = {};
        for (const [k, v] of Object.entries(res.headers)) headers[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v;
        resolve({ status: res.statusCode ?? 0, headers, body: res, close: () => res.destroy() });
      },
    );
    r.on('error', reject);
    r.end();
  });

function checkUrl(raw: string | URL): URL {
  let u: URL;
  try {
    u = raw instanceof URL ? raw : new URL(raw);
  } catch {
    throw new FetchAbort('zly_adres');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new FetchAbort('niedozwolony_protokol');
  if (u.username || u.password) throw new FetchAbort('zly_adres');
  if (!ALLOWED_PORTS.has(u.port)) throw new FetchAbort('niedozwolony_port');
  return u;
}

async function resolveSafe(u: URL, resolver: Resolver): Promise<string> {
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) {
    if (isBlockedIp(host)) throw new FetchAbort('adres_prywatny');
    return host;
  }
  if (isBlockedHostname(host) || !host.includes('.')) throw new FetchAbort('adres_prywatny');
  let addrs: string[];
  try {
    addrs = await resolver(host);
  } catch {
    throw new FetchAbort('dns');
  }
  if (!Array.isArray(addrs) || addrs.length === 0) throw new FetchAbort('dns');
  // Wszystkie adresy muszą być publiczne: inaczej klient mógłby trafić w adres wewnętrzny.
  if (addrs.some((a) => isBlockedIp(a))) throw new FetchAbort('adres_prywatny');
  return addrs[0]!;
}

function decode(bytes: Uint8Array, contentType: string): string {
  const m = /charset\s*=\s*"?([\w.:-]+)"?/i.exec(contentType);
  const label = m?.[1]?.toLowerCase() ?? 'utf-8';
  try {
    return new TextDecoder(label).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

async function readLimited(body: AsyncIterable<Uint8Array>, max: number, close?: () => void): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  let truncated = false;
  for await (const chunk of body) {
    const c = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk;
    if (size + c.length > max) {
      chunks.push(c.subarray(0, max - size));
      size = max;
      truncated = true;
      break;
    }
    chunks.push(c);
    size += c.length;
  }
  if (truncated) close?.();
  const out = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return { bytes: out, truncated };
}

/** Tworzy funkcję pobierającą stronę. Wyjątków nie rzuca: błąd to `{ ok: false, reason }`. */
export function createPageFetcher(opts: PageFetcherOptions = {}): PageFetcher {
  const resolver = opts.resolver ?? systemResolver;
  const transport = opts.transport ?? nodeTransport;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const maxTextChars = opts.maxTextChars ?? DEFAULT_MAX_TEXT_CHARS;

  return async (rawUrl) => {
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        ctrl.abort();
        reject(new FetchAbort('przekroczony_czas'));
      }, timeoutMs);
    });
    deadline.catch(() => undefined);

    const work = async (): Promise<PageFetchResult> => {
      let url = checkUrl(rawUrl);
      for (let hop = 0; ; hop++) {
        const address = await resolveSafe(url, resolver);
        let res: TransportResponse;
        try {
          res = await transport({
            url,
            address,
            headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml,text/plain;q=0.9', 'accept-encoding': 'identity' },
            signal: ctrl.signal,
          });
        } catch (e) {
          if (e instanceof FetchAbort) throw e;
          throw new FetchAbort(ctrl.signal.aborted ? 'przekroczony_czas' : 'blad_sieci');
        }
        if (REDIRECTS.has(res.status)) {
          res.close?.();
          const loc = res.headers['location'];
          if (!loc) throw new FetchAbort('status_http', res.status);
          if (hop >= maxRedirects) throw new FetchAbort('za_duzo_przekierowan');
          let next: URL;
          try {
            next = new URL(loc, url);
          } catch {
            throw new FetchAbort('zly_adres');
          }
          url = checkUrl(next);
          continue;
        }
        if (res.status < 200 || res.status >= 300) {
          res.close?.();
          throw new FetchAbort('status_http', res.status);
        }
        const contentType = (res.headers['content-type'] ?? '').toLowerCase();
        const isHtml = /text\/html|application\/xhtml\+xml/.test(contentType);
        const isText = /^text\/plain/.test(contentType);
        if (!isHtml && !isText) {
          res.close?.();
          throw new FetchAbort('zly_typ_tresci');
        }
        let read: { bytes: Uint8Array; truncated: boolean };
        try {
          read = await readLimited(res.body, maxBytes, res.close);
        } catch {
          throw new FetchAbort(ctrl.signal.aborted ? 'przekroczony_czas' : 'blad_sieci');
        }
        const raw = decode(read.bytes, contentType);
        const title = isHtml ? extractTitle(raw) : null;
        let text = (isHtml ? htmlToText(raw) : raw).replace(/\r\n?/g, '\n').trim();
        let truncated = read.truncated;
        if (text.length > maxTextChars) {
          text = text.slice(0, maxTextChars);
          truncated = true;
        }
        if (!text) throw new FetchAbort('pusta_tresc');
        return { ok: true, finalUrl: url.toString(), contentType: contentType.split(';')[0]!.trim(), title, text, truncated, redirects: hop };
      }
    };

    try {
      return await Promise.race([work(), deadline]);
    } catch (e) {
      if (e instanceof FetchAbort) return e.status !== undefined ? { ok: false, reason: e.reason, status: e.status } : { ok: false, reason: e.reason };
      return { ok: false, reason: 'blad_sieci' };
    } finally {
      if (timer) clearTimeout(timer);
      ctrl.abort();
    }
  };
}
