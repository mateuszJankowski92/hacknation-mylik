import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { openDb } from '../../src/db/open';
import { collectStats, createStatsApp, redactSecrets, requestLogger, routeLabel } from '../../src/obs/index';

describe('redactSecrets', () => {
  it('ukrywa klucze i tokeny', () => {
    expect(redactSecrets('klucz sk-ant-abcdefgh12345')).not.toContain('abcdefgh');
    expect(redactSecrets('Authorization: Bearer abcdef123456')).not.toContain('abcdef123456');
    expect(redactSecrets('GET /x?api_key=SEKRET123&a=1')).not.toContain('SEKRET123');
    expect(redactSecrets('{"token":"tajne1234"}')).not.toContain('tajne1234');
  });
  it('zostawia zwykły tekst', () => {
    expect(redactSecrets('POST /api/verify 200 12ms')).toBe('POST /api/verify 200 12ms');
  });
});

describe('requestLogger', () => {
  it('loguje czas i status, bez sekretów, i zapisuje zdarzenie dla /api', async () => {
    const lines: string[] = [];
    const events: Array<[string, Record<string, unknown>]> = [];
    let t = 0;
    const app = new Hono();
    app.use('*', requestLogger({ log: (l) => lines.push(l), logEvent: (type, d) => events.push([type, d]), now: () => (t += 25) }));
    app.get('/api/records/:id', (c) => c.json({}));
    app.get('/index.html', (c) => c.text('x'));
    await app.request('/api/records/abc?token=SEKRET12345');
    await app.request('/index.html');
    expect(lines[0]).toContain('200 25ms');
    expect(lines.join('\n')).not.toContain('SEKRET12345');
    expect(events).toHaveLength(1);
    expect(events[0][1]).toMatchObject({ route: '/api/records/:id', status: 200, ms: 25 });
  });

  it('routeLabel nie przepuszcza identyfikatorów', () => {
    expect(routeLabel('/api/records/xyz')).toBe('/api/records/:id');
    expect(routeLabel('/cokolwiek')).toBe('static');
  });
});

describe('statystyki', () => {
  it('liczy agregaty bez treści zgłoszeń', async () => {
    const db = openDb(':memory:');
    const ev = db.prepare('INSERT INTO events (ts, type, detail) VALUES (?, ?, ?)');
    const ts = '2026-11-21T10:00:00.000Z';
    ev.run(ts, 'verify_start', '{}');
    ev.run(ts, 'search_error', '{}');
    ev.run(ts, 'abstain', '{}');
    ev.run(ts, 'http_request', JSON.stringify({ route: '/api/verify', method: 'POST', status: 200, ms: 100 }));
    ev.run(ts, 'http_request', JSON.stringify({ route: '/api/verify', method: 'POST', status: 429, ms: 1 }));
    db.prepare('INSERT INTO records (id, input_hash, corpus_version, created_at, json) VALUES (?, ?, ?, ?, ?)').run(
      'r1', 'h', 'v', ts,
      JSON.stringify({ claims: [{ verdict: 'Fałsz' }], usage: { llmCalls: 2, inputTokens: 100, outputTokens: 50, estimatedCostUsd: 0.01 } }),
    );
    const stats = collectStats({ db, now: () => new Date(ts) });
    expect(stats.requests).toMatchObject({ total: 2, verify: 2, rateLimited: 1 });
    expect(stats.verifications).toMatchObject({ started: 1, searchErrors: 1, abstained: 1 });
    expect(stats.latencyMs.p50).toBe(100);
    expect(stats.records.verdicts).toEqual({ 'Fałsz': 1 });
    expect(stats.llm).toMatchObject({ calls: 2, inputTokens: 100, estimatedCostUsd: 0.01 });

    const res = await createStatsApp({ db }).request('/api/stats');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});
