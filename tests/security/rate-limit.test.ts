import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { parseForwardedFor, rateLimit } from '../../src/security/index';

function makeApp(options: Parameters<typeof rateLimit>[0]) {
  const app = new Hono();
  app.use('*', rateLimit(options));
  app.post('/api/verify', (c) => c.json({ ok: true }));
  app.get('/api/health', (c) => c.json({ ok: true }));
  return app;
}

function post(app: Hono, ip: string) {
  return app.request('/api/verify', { method: 'POST', headers: { 'x-forwarded-for': ip } });
}

describe('rateLimit', () => {
  it('przepuszcza do limitu i zwraca 429 z Retry-After', async () => {
    let t = 1000;
    const app = makeApp({ limit: 2, windowMs: 60_000, trustedProxyHops: 1, now: () => t });
    expect((await post(app, '1.1.1.1')).status).toBe(200);
    expect((await post(app, '1.1.1.1')).status).toBe(200);
    t += 10_000;
    const res = await post(app, '1.1.1.1');
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('50');
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('limit_zadan');
  });

  it('liczy osobno każdy klucz i resetuje okno', async () => {
    let t = 0;
    const app = makeApp({ limit: 1, windowMs: 1000, trustedProxyHops: 1, now: () => t });
    expect((await post(app, '1.1.1.1')).status).toBe(200);
    expect((await post(app, '2.2.2.2')).status).toBe(200);
    expect((await post(app, '1.1.1.1')).status).toBe(429);
    t = 1500;
    expect((await post(app, '1.1.1.1')).status).toBe(200);
  });

  it('nie limituje tras GET', async () => {
    const app = makeApp({ limit: 1, trustedProxyHops: 1 });
    for (let i = 0; i < 5; i++) {
      expect((await app.request('/api/health', { headers: { 'x-forwarded-for': '3.3.3.3' } })).status).toBe(200);
    }
  });

  it('bez zaufanego proxy ignoruje X-Forwarded-For (nie da się obejść limitu)', async () => {
    const app = makeApp({ limit: 1, trustedProxyHops: 0 });
    expect((await post(app, '1.1.1.1')).status).toBe(200);
    expect((await post(app, '9.9.9.9')).status).toBe(429);
  });

  it('ogranicza liczbę kluczy w pamięci', async () => {
    const app = makeApp({ limit: 1, trustedProxyHops: 1, maxKeys: 3 });
    for (let i = 0; i < 10; i++) expect((await post(app, `10.0.0.${i}`)).status).toBe(200);
  });
});

describe('parseForwardedFor', () => {
  it('bierze adres dodany przez zaufany proxy, nie wpis klienta', () => {
    expect(parseForwardedFor('6.6.6.6, 1.1.1.1', 1)).toBe('1.1.1.1');
    expect(parseForwardedFor('6.6.6.6, 1.1.1.1, 2.2.2.2', 2)).toBe('1.1.1.1');
  });
  it('zwraca null gdy brak nagłówka, zaufania lub za mało wpisów', () => {
    expect(parseForwardedFor(undefined, 1)).toBeNull();
    expect(parseForwardedFor('1.1.1.1', 0)).toBeNull();
    expect(parseForwardedFor('1.1.1.1', 2)).toBeNull();
  });
});
