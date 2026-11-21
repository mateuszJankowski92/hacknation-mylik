// Pobieranie stron z ochroną SSRF: bez sieci (wstrzykiwany resolver i transport).
import { describe, expect, it } from 'vitest';
import {
  createPageFetcher,
  isBlockedHostname,
  isBlockedIp,
  type Resolver,
  type Transport,
  type TransportRequest,
} from '../../src/engine/fetch/index';

const enc = new TextEncoder();
async function* chunks(...parts: string[]): AsyncIterable<Uint8Array> {
  for (const p of parts) yield enc.encode(p);
}

type Route = { status: number; headers?: Record<string, string>; body?: string[] };

function fakeNet(dns: Record<string, string[]>, routes: Record<string, Route>) {
  const calls: TransportRequest[] = [];
  const resolver: Resolver = async (host) => {
    const r = dns[host];
    if (!r) throw new Error('ENOTFOUND');
    return r;
  };
  const transport: Transport = async (req) => {
    calls.push(req);
    const route = routes[req.url.toString()];
    if (!route) throw new Error('ECONNREFUSED');
    return { status: route.status, headers: route.headers ?? {}, body: chunks(...(route.body ?? [])) };
  };
  return { resolver, transport, calls };
}

const HTML = { 'content-type': 'text/html; charset=utf-8' };
const PAGE = '<html><head><title>Tytuł</title></head><body><p>Treść artykułu o bibliotece publicznej.</p></body></html>';

describe('klasyfikacja adresów', () => {
  it('blokuje adresy prywatne, lokalne i specjalne (v4 i v6), przepuszcza publiczne', () => {
    for (const ip of [
      '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0',
      '224.0.0.1', '255.255.255.255', '::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1',
      '64:ff9b::a00:1', '2002:c0a8:0101::1', 'ff02::1', 'nie-ip',
    ])
      expect(isBlockedIp(ip), ip).toBe(true);
    for (const ip of ['8.8.8.8', '93.184.216.34', '172.32.0.1', '2606:4700:4700::1111', '::ffff:8.8.8.8'])
      expect(isBlockedIp(ip), ip).toBe(false);
    expect(isBlockedHostname('localhost')).toBe(true);
    expect(isBlockedHostname('api.internal')).toBe(true);
    expect(isBlockedHostname('example.org')).toBe(false);
  });
});

describe('createPageFetcher', () => {
  it('pobiera stronę HTML, łączy się z adresem sprawdzonym w DNS', async () => {
    const net = fakeNet({ 'news.example.org': ['93.184.216.34'] }, { 'https://news.example.org/a': { status: 200, headers: HTML, body: [PAGE] } });
    const r = await createPageFetcher(net)('https://news.example.org/a');
    expect(r).toMatchObject({ ok: true, title: 'Tytuł', contentType: 'text/html', truncated: false, redirects: 0 });
    expect(r.ok && r.text).toContain('Treść artykułu o bibliotece publicznej.');
    expect(net.calls[0]!.address).toBe('93.184.216.34');
  });
  it('odrzuca protokoły inne niż http/https, porty niestandardowe i dane logowania', async () => {
    const f = createPageFetcher(fakeNet({}, {}));
    expect(await f('file:///etc/passwd')).toEqual({ ok: false, reason: 'niedozwolony_protokol' });
    expect(await f('ftp://example.org/x')).toEqual({ ok: false, reason: 'niedozwolony_protokol' });
    expect(await f('http://example.org:6379/')).toEqual({ ok: false, reason: 'niedozwolony_port' });
    expect(await f('https://u:p@example.org/')).toEqual({ ok: false, reason: 'zly_adres' });
    expect(await f('nie adres')).toEqual({ ok: false, reason: 'zly_adres' });
  });
  it('blokuje adres prywatny wprost i po rozwiązaniu DNS (także gdy tylko jeden z adresów jest prywatny)', async () => {
    const net = fakeNet({ 'evil.example.org': ['93.184.216.34', '10.0.0.5'], 'meta.example.org': ['169.254.169.254'] }, {});
    const f = createPageFetcher(net);
    expect(await f('http://127.0.0.1/')).toEqual({ ok: false, reason: 'adres_prywatny' });
    expect(await f('http://[::1]/')).toEqual({ ok: false, reason: 'adres_prywatny' });
    expect(await f('http://localhost/')).toEqual({ ok: false, reason: 'adres_prywatny' });
    expect(await f('http://evil.example.org/')).toEqual({ ok: false, reason: 'adres_prywatny' });
    expect(await f('http://meta.example.org/')).toEqual({ ok: false, reason: 'adres_prywatny' });
    expect(await f('http://brak.example.org/')).toEqual({ ok: false, reason: 'dns' });
    expect(net.calls).toHaveLength(0);
  });
  it('sprawdza każde przekierowanie: przekierowanie na adres wewnętrzny jest blokowane', async () => {
    const net = fakeNet(
      { 'a.example.org': ['93.184.216.34'], 'b.example.org': ['93.184.216.35'], 'in.example.org': ['192.168.0.10'] },
      {
        'https://a.example.org/': { status: 302, headers: { location: 'https://b.example.org/x' } },
        'https://b.example.org/x': { status: 301, headers: { location: 'http://in.example.org/admin' } },
        'https://a.example.org/ok': { status: 307, headers: { location: '/final' } },
        'https://a.example.org/final': { status: 200, headers: { 'content-type': 'text/plain' }, body: ['Zwykły tekst.'] },
        'https://a.example.org/loc': { status: 302, headers: { location: 'http://169.254.169.254/latest' } },
      },
    );
    const f = createPageFetcher(net);
    expect(await f('https://a.example.org/')).toEqual({ ok: false, reason: 'adres_prywatny' });
    expect(net.calls.map((c) => c.url.host)).toEqual(['a.example.org', 'b.example.org']);
    expect(await f('https://a.example.org/loc')).toEqual({ ok: false, reason: 'adres_prywatny' });
    expect(await f('https://a.example.org/ok')).toMatchObject({ ok: true, text: 'Zwykły tekst.', redirects: 1, finalUrl: 'https://a.example.org/final' });
  });
  it('limit przekierowań', async () => {
    const routes: Record<string, Route> = {};
    for (let i = 0; i < 6; i++) routes[`https://a.example.org/${i}`] = { status: 302, headers: { location: `/${i + 1}` } };
    const f = createPageFetcher({ ...fakeNet({ 'a.example.org': ['93.184.216.34'] }, routes), maxRedirects: 3 });
    expect(await f('https://a.example.org/0')).toEqual({ ok: false, reason: 'za_duzo_przekierowan' });
  });
  it('limit rozmiaru: czyta najwyżej maxBytes i oznacza obcięcie', async () => {
    const net = fakeNet(
      { 'a.example.org': ['93.184.216.34'] },
      { 'https://a.example.org/': { status: 200, headers: { 'content-type': 'text/plain' }, body: ['a'.repeat(60), 'b'.repeat(60)] } },
    );
    const r = await createPageFetcher({ ...net, maxBytes: 100 })('https://a.example.org/');
    expect(r).toMatchObject({ ok: true, truncated: true });
    expect(r.ok && r.text.length).toBe(100);
  });
  it('limit czasu: zawieszony transport kończy się przekroczony_czas', async () => {
    const transport: Transport = (req) =>
      new Promise((_, reject) => req.signal.addEventListener('abort', () => reject(new Error('aborted'))));
    const f = createPageFetcher({ resolver: async () => ['93.184.216.34'], transport, timeoutMs: 20 });
    expect(await f('https://a.example.org/')).toEqual({ ok: false, reason: 'przekroczony_czas' });
  });
  it('status HTTP, typ treści i pusta treść', async () => {
    const net = fakeNet(
      { 'a.example.org': ['93.184.216.34'] },
      {
        'https://a.example.org/404': { status: 404 },
        'https://a.example.org/pdf': { status: 200, headers: { 'content-type': 'application/pdf' }, body: ['%PDF'] },
        'https://a.example.org/empty': { status: 200, headers: HTML, body: ['<html><body>   </body></html>'] },
      },
    );
    const f = createPageFetcher(net);
    expect(await f('https://a.example.org/404')).toEqual({ ok: false, reason: 'status_http', status: 404 });
    expect(await f('https://a.example.org/pdf')).toEqual({ ok: false, reason: 'zly_typ_tresci' });
    expect(await f('https://a.example.org/empty')).toEqual({ ok: false, reason: 'pusta_tresc' });
    expect(await f('https://a.example.org/brak')).toEqual({ ok: false, reason: 'blad_sieci' });
  });
});

describe('nodeTransport', () => {
  it('łączy się z przypiętym adresem, nie z wynikiem systemowego DNS dla nazwy z URL', async () => {
    const { createServer } = await import('node:http');
    const { nodeTransport } = await import('../../src/engine/fetch/index');
    const server = createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end(`host=${req.headers.host}`);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    const port = (server.address() as { port: number }).port;
    try {
      const ctrl = new AbortController();
      // Nazwa nie istnieje w DNS: połączenie działa tylko dzięki przypiętemu adresowi.
      const res = await nodeTransport({ url: new URL(`http://nie-istnieje.invalid:${port}/`), address: '127.0.0.1', headers: {}, signal: ctrl.signal });
      let body = '';
      for await (const c of res.body) body += Buffer.from(c).toString('utf8');
      expect(res.status).toBe(200);
      expect(body).toBe(`host=nie-istnieje.invalid:${port}`);
    } finally {
      server.close();
    }
  });
});
