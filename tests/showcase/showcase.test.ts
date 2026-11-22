import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDb } from '../../src/db/open';
import type { VerificationRecord, VerifyOutcome } from '../../src/contracts/index';
import type { EngineProgressEvent } from '../../src/contracts/api';
import { createShowcaseEngine, loadShowcase, showcaseRefusalMessage } from '../../src/server/showcase';
import { sameShowcaseInput, normalizeShowcaseText } from '../../src/shared/showcaseText';

const providerSpy = vi.hoisted(() => vi.fn(() => {
  throw new Error('dostawca modelu nie może być wołany w trybie pokazowym');
}));
vi.mock('../../src/llm/index', () => ({ createLlmProvider: providerSpy }));

const { bootstrap } = await import('../../src/server/bootstrap');

const SHOWCASE_FILE = join(process.cwd(), 'data/pokaz.json');
const records = loadShowcase(SHOWCASE_FILE);
const confirmed = records.find((r) => r.maskedInput.startsWith('Czy UOKiK'))!;
const page = records.find((r) => r.inputKind === 'url')!;

let fetchSpy: ReturnType<typeof vi.fn>;
beforeEach(() => {
  providerSpy.mockClear();
  fetchSpy = vi.fn(() => {
    throw new Error('sieć niedozwolona w trybie pokazowym');
  });
  vi.stubGlobal('fetch', fetchSpy);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function record(outcome: VerifyOutcome): VerificationRecord {
  if (outcome.kind !== 'record') throw new Error('oczekiwano rekordu');
  return outcome.record;
}

function engineFor(list: readonly VerificationRecord[], events: Array<[string, unknown]> = []) {
  return createShowcaseEngine(list, { logEvent: (type, detail) => events.push([type, detail]), publicBaseUrl: 'https://mylik.example.pl' });
}

describe('plik pokaz.json', () => {
  it('wczytuje 29 rekordów, w tym jeden link', () => {
    expect(records).toHaveLength(29);
    expect(records.filter((r) => r.inputKind === 'url')).toHaveLength(1);
  });

  it('pomija błędne rekordy z ostrzeżeniem, brak pliku daje pustą listę', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mylik-pokaz-'));
    const file = join(dir, 'p.json');
    writeFileSync(file, JSON.stringify({ version: 1, records: [records[0], { id: 'zly' }, records[1]] }));
    const warnings: string[] = [];
    expect(loadShowcase(file, (l) => warnings.push(l))).toHaveLength(2);
    expect(warnings).toHaveLength(1);
    const missing: string[] = [];
    expect(loadShowcase(join(dir, 'brak.json'), (l) => missing.push(l))).toEqual([]);
    expect(missing).toHaveLength(1);
  });
});

describe('silnik pokazowy', () => {
  it('dokładne trafienie (z normalizacją) zwraca rekord z pamięci i zdarzenie gotowe', async () => {
    const events: Array<[string, unknown]> = [];
    const progress: EngineProgressEvent[] = [];
    const engine = engineFor(records, events);
    const outcome = await engine.verify({ text: '  czy uokik nałożył   karę na allegro za greenwashing ', channel: 'www' }, { onProgress: (e) => progress.push(e) });
    expect(outcome).toMatchObject({ kind: 'record', cached: true });
    expect(record(outcome).id).toBe(confirmed.id);
    expect(progress).toEqual([{ type: 'gotowe', recordId: confirmed.id, cached: true }]);
    expect(events).toEqual([['showcase', { match: 'exact', channel: 'www' }]]);
    expect(engine.getRecord(confirmed.id)).toEqual(confirmed);
    expect(engine.getRecord('0'.repeat(64))).toBeNull();
  });

  it('adres spoza pliku dostaje stronę urzędu jako zastępstwo (pole url i sam adres w tekście)', async () => {
    const events: Array<[string, unknown]> = [];
    const engine = engineFor(records, events);
    const viaUrl = await engine.verify({ url: 'https://example.org/cos', channel: 'www' });
    const viaText = await engine.verify({ text: 'https://example.org/cos', channel: 'www' });
    expect(record(viaUrl).id).toBe(page.id);
    expect(record(viaText).id).toBe(page.id);
    expect(record(viaUrl).inputKind).toBe('url');
    expect(events.map(([, d]) => (d as { match: string }).match)).toEqual(['substitute', 'substitute']);
  });

  it('dokładny adres trafia w rekord strony jako trafienie dokładne', async () => {
    const events: Array<[string, unknown]> = [];
    const outcome = await engineFor(records, events).verify({ url: ` ${page.maskedInput} `, channel: 'www' });
    expect(record(outcome).id).toBe(page.id);
    expect(events).toEqual([['showcase', { match: 'exact', channel: 'www' }]]);
  });

  it('tekst bez trafienia dostaje rekord o największym pokryciu słów', async () => {
    const outcome = await engineFor(records).verify({ text: 'Allegro dostało karę od UOKiK za greenwashing w reklamach', channel: 'www' });
    expect(record(outcome).id).toBe(confirmed.id);
  });

  it('przy remisie pierwszeństwo ma rekord z werdyktem innym niż brak dowodów', async () => {
    const [first, second] = [records.find((r) => r.claims[0]!.verdict === 'brak_wystarczajacych_dowodow')!, confirmed];
    const a = { ...first, id: 'a'.repeat(64), maskedInput: 'Czy kasztany rosną przy rzece?' };
    const b = { ...second, id: 'b'.repeat(64), maskedInput: 'Czy kasztany rosną przy jeziorze?' };
    const outcome = await engineFor([a, b]).verify({ text: 'kasztany rosną', channel: 'www' });
    expect(record(outcome).id).toBe(b.id);
  });

  it('zerowe pokrycie daje pierwszy rekord z werdyktem potwierdzone', async () => {
    const outcome = await engineFor(records).verify({ text: 'xyz qrs', channel: 'www' });
    const expected = records.find((r) => r.claims.some((c) => c.verdict === 'potwierdzone'))!;
    expect(record(outcome).id).toBe(expected.id);
  });

  it('sms bez trafienia dostaje stan z komunikatem i adresem strony, bez rekordu', async () => {
    const events: Array<[string, unknown]> = [];
    const outcome = await engineFor(records, events).verify({ text: 'Czy będzie jutro padać w Gdańsku?', channel: 'sms' });
    expect(outcome).toEqual({
      kind: 'state',
      state: 'brak_mozliwosci_sprawdzenia',
      message: 'To wersja pokazowa po hackathonie: nowych pytań już nie sprawdzam. Gotowe przykłady są na stronie: https://mylik.example.pl',
      detail: 'showcase',
    });
    expect(events).toEqual([['showcase', { match: 'refused', channel: 'sms' }]]);
  });

  it('bez adresu publicznego komunikat nie ma końcówki', () => {
    expect(showcaseRefusalMessage()).toBe('To wersja pokazowa po hackathonie: nowych pytań już nie sprawdzam.');
  });

  it('sms z dokładnym pytaniem dostaje gotowy rekord', async () => {
    const outcome = await engineFor(records).verify({ text: confirmed.maskedInput, channel: 'sms' });
    expect(record(outcome).id).toBe(confirmed.id);
  });

  it('pusta lista rekordów: każde zgłoszenie dostaje stan', async () => {
    const outcome = await engineFor([]).verify({ text: 'cokolwiek', channel: 'www' });
    expect(outcome).toMatchObject({ kind: 'state', state: 'brak_mozliwosci_sprawdzenia' });
  });
});

describe('normalizacja wspólna dla serwera i interfejsu', () => {
  it('usuwa końcową interpunkcję, cudzysłowy i zwija białe znaki', () => {
    expect(normalizeShowcaseText('  „Czy  to   działa?!” ')).toBe('czy to działa');
    expect(sameShowcaseInput('CZY to działa?', 'Czy to działa')).toBe(true);
    expect(sameShowcaseInput('https://a.pl/x ', 'https://a.pl/x')).toBe(true);
    expect(sameShowcaseInput('https://a.pl/X', 'https://a.pl/x')).toBe(false);
    expect(sameShowcaseInput('Czy to działa?', 'Czy to nie działa?')).toBe(false);
  });
});

describe('aplikacja w trybie pokazowym', () => {
  function app(extra: Record<string, string | undefined> = {}) {
    return bootstrap({
      db: openDb(':memory:'),
      env: { SHOWCASE_MODE: 'on', ...extra },
      config: { llmProvider: 'anthropic', anthropicApiKey: undefined, showcasePath: SHOWCASE_FILE },
      log: null,
      warn: () => undefined,
      retention: false,
      distDir: join(tmpdir(), 'mylik-brak-dist'),
    });
  }

  it('startuje bez klucza i sieci, nie tworzy dostawcy modelu', async () => {
    const boot = app();
    const res = await boot.app.request('/api/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'Czy w Krakowie jest smog w lipcu?', channel: 'www' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as VerifyOutcome;
    expect(body.kind).toBe('record');
    expect(providerSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    boot.close();
  });

  it('GET /api/health ma showcase: true, a poza trybem false', async () => {
    const on = app();
    const health = (await (await on.app.request('/api/health')).json()) as { showcase: boolean; factcheck: { enabled: boolean } };
    expect(health.showcase).toBe(true);
    expect(health.factcheck.enabled).toBe(false);
    on.close();
    const off = bootstrap({
      db: openDb(':memory:'),
      config: { llmProvider: 'mock', showcaseMode: 'off' },
      log: null,
      warn: () => undefined,
      retention: false,
      incidents: null,
    });
    expect(((await (await off.app.request('/api/health')).json()) as { showcase: boolean }).showcase).toBe(false);
    off.close();
  });

  it('GET /api/pokaz zwraca pytania, a poza trybem 404', async () => {
    const on = app();
    const res = await on.app.request('/api/pokaz');
    const body = (await res.json()) as { questions: Array<{ id: string; text: string; inputKind: string; verdicts: string[]; answered: boolean }> };
    expect(body.questions).toHaveLength(29);
    const first = body.questions.find((q) => q.id === confirmed.id)!;
    expect(first).toEqual({ id: confirmed.id, text: confirmed.maskedInput, inputKind: 'tekst', verdicts: ['potwierdzone'], answered: true });
    expect(body.questions.find((q) => q.inputKind === 'url')).toBeTruthy();
    expect(body.questions.some((q) => !q.answered)).toBe(true);
    on.close();
    const off = bootstrap({ db: openDb(':memory:'), config: { llmProvider: 'mock', showcaseMode: 'off' }, log: null, warn: () => undefined, retention: false, incidents: null });
    expect((await off.app.request('/api/pokaz')).status).toBe(404);
    off.close();
  });

  it('record z /api/records działa, /urzednik bez tokenu to 401, /sms odpowiada', async () => {
    const on = app();
    expect((await on.app.request(`/api/records/${confirmed.id}`)).status).toBe(200);
    expect((await on.app.request('/urzednik')).status).toBe(401);
    expect((await on.app.request('/sms')).status).toBe(200);
    on.close();
  });

  it('brak pliku: tryb pokazowy bez rekordów, zgłoszenie dostaje stan', async () => {
    const boot = bootstrap({
      db: openDb(':memory:'),
      config: { showcaseMode: 'on', showcasePath: join(tmpdir(), 'nie-ma-takiego-pokazu.json') },
      log: null,
      warn: () => undefined,
      retention: false,
    });
    const res = await boot.app.request('/api/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'cokolwiek', channel: 'www' }),
    });
    expect(((await res.json()) as VerifyOutcome).kind).toBe('state');
    boot.close();
  });

  it('znacznik meta mylik-pokaz trafia do index.html tylko w trybie pokazowym', async () => {
    const dist = mkdtempSync(join(tmpdir(), 'mylik-dist-'));
    writeFileSync(join(dist, 'index.html'), '<!doctype html><html><head><title>x</title></head><body></body></html>');
    const make = (mode: 'on' | 'off') =>
      bootstrap({
        db: openDb(':memory:'),
        config: { llmProvider: 'mock', showcaseMode: mode, showcasePath: SHOWCASE_FILE },
        log: null,
        warn: () => undefined,
        retention: false,
        incidents: null,
        distDir: dist,
      });
    const on = make('on');
    expect(await (await on.app.request('/')).text()).toContain('<meta name="mylik-pokaz" content="1" />');
    on.close();
    const off = make('off');
    expect(await (await off.app.request('/')).text()).not.toContain('mylik-pokaz');
    off.close();
  });
});
