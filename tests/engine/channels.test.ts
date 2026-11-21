// Spójność kanałów (scenariusz G): ta sama treść przez WWW i adapter SMS daje ten sam zapisany rekord,
// niezależnie od formatowania. Bez sieci: prawdziwe prepareInput, baza :memory:, fałszywy model.
import { describe, expect, it } from 'vitest';
import { openDb } from '../../src/db/open';
import { createEngine } from '../../src/engine/index';
import { createSmsApp } from '../../src/sms/index';
import { smsVariant } from '../../src/eval/runner';
import type { Engine } from '../../src/contracts/index';
import { FakeSearcher, ScriptedLlm, claim, countRecords, fixedNow, passage, stanceTable } from './fakes';

const BASE = 'Gmina Zielonków otworzyła nową bibliotekę przy ulicy Długiej 5 w sobotę.';

const VARIANTS = [
  BASE,
  '  Gmina Zielonków  otworzyła nową bibliotekę przy ulicy Długiej 5 w sobotę  ',
  'GMINA ZIELONKÓW OTWORZYŁA NOWĄ BIBLIOTEKĘ PRZY ULICY DŁUGIEJ 5 W SOBOTĘ.',
  'gmina zielonków otworzyła nową bibliotekę przy ulicy długiej 5 w sobotę',
  'Gmina Zielonkow otworzyla nowa biblioteke przy ulicy Dlugiej 5 w sobote.',
  'Gmina Zielonków\notworzyła nową bibliotekę\r\nprzy ulicy Długiej 5 w sobotę.',
  'Gmina Zielonków otworzyła nową bibliotekę przy ulicy Długiej 5 w sobotę!!!',
  'Gmina Zielonków otworzyła nową bibliotekę przy ulicy Długiej 5 w sobotę ...',
  '„Gmina Zielonków otworzyła nową bibliotekę przy ulicy Długiej 5 w sobotę.”',
  '"Gmina Zielonków otworzyła nową bibliotekę przy ulicy Długiej 5 w sobotę."',
  'Gmina Zielonków otworzyła​ nową bibliotekę przy ulicy Długiej 5 w sobotę.',
  'Gmina\tZielonków otworzyła nową bibliotekę przy ulicy Długiej 5 w sobotę.',
  BASE.normalize('NFD'),
  'Gmina Zielonków otworzyła nową bibliotekę przy ulicy Długiej 5 w sobotę .',
  'Czy to prawda, że gmina Zielonków otworzyła nową bibliotekę przy ulicy Długiej 5 w sobotę?',
  'Czy gmina Zielonków otworzyła nową bibliotekę przy ulicy Długiej 5 w sobotę?',
  'Podobno gmina Zielonków otworzyła nową bibliotekę przy ulicy Długiej 5 w sobotę.',
  smsVariant(BASE),
];

function setup() {
  const db = openDb(':memory:');
  const searcher = new FakeSearcher([
    passage('bib#0', 'Gmina Zielonków otworzyła w sobotę nową bibliotekę przy ulicy Długiej 5.', { sourceType: 'urzedowe' }),
  ]);
  let n = 0;
  // Model niedeterministyczny: każde liczenie daje inne stanowisko. Zgodność musi dać pamięć rekordów.
  const llm = new ScriptedLlm(
    () => [claim('Gmina Zielonków otworzyła nową bibliotekę przy ulicy Długiej 5 w sobotę.')],
    (req) => stanceTable({ 'bib#0': n++ % 2 === 0 ? 'potwierdza' : 'kontekst' }, 60)(req),
  );
  const engine = createEngine({ db, searcher, llm, now: fixedNow, supportGate: null, ranker: null, options: { errorProfile: null } });
  return { db, engine, llm };
}

async function viaSms(engine: Engine, text: string): Promise<string> {
  const app = createSmsApp({ engine });
  const res = await app.request('/sms/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return res.text();
}

describe('spójność kanałów', () => {
  it('WWW, a potem SMS w różnych zapisach: zawsze ten sam zapisany rekord', async () => {
    const { db, engine, llm } = setup();
    const first = await engine.verify({ text: BASE, channel: 'www' });
    expect(first.kind).toBe('record');
    if (first.kind !== 'record') return;
    for (const text of VARIANTS) {
      const sms = await engine.verify({ text, channel: 'sms' });
      expect(sms.kind, text).toBe('record');
      if (sms.kind === 'record') {
        expect(sms.record.id, text).toBe(first.record.id);
        expect(sms.cached).toBe(true);
      }
      const www = await engine.verify({ text, channel: 'www' });
      expect(www.kind === 'record' && www.record.id).toBe(first.record.id);
      const reply = await viaSms(engine, text);
      expect(reply).toContain(first.record.id);
    }
    expect(llm.extractCalls).toBe(1);
    expect(countRecords(db)).toBe(1);
  });

  it('SMS pierwszy, potem WWW: ten sam rekord', async () => {
    const { engine, llm } = setup();
    await viaSms(engine, smsVariant(BASE));
    const www = await engine.verify({ text: BASE, channel: 'www' });
    expect(www.kind === 'record' && www.cached).toBe(true);
    expect(llm.extractCalls).toBe(1);
  });

  it('jednoczesne zgłoszenia z obu kanałów liczone raz', async () => {
    const { db, engine, llm } = setup();
    const [a, b] = await Promise.all([
      engine.verify({ text: BASE, channel: 'www' }),
      engine.verify({ text: smsVariant(BASE), channel: 'sms' }),
    ]);
    expect(a.kind === 'record' && b.kind === 'record' && a.record.id === b.record.id).toBe(true);
    expect(llm.extractCalls).toBe(1);
    expect(countRecords(db)).toBe(1);
  });

  it('sam adres w SMS-ie trafia w ten sam rekord co pole adresu w WWW', async () => {
    const { engine } = setup();
    const pages = { ok: true as const, finalUrl: 'https://example.org/a', contentType: 'text/html', title: 't', text: BASE, truncated: false, redirects: 0 };
    const db = openDb(':memory:');
    const e2 = createEngine({
      db,
      searcher: new FakeSearcher([passage('bib#0', BASE, { sourceType: 'urzedowe' })]),
      llm: new ScriptedLlm(() => [claim(BASE)], stanceTable({ 'bib#0': 'potwierdza' }, 60)),
      now: fixedNow,
      supportGate: null,
      ranker: null,
      fetchPage: async () => pages,
      options: { errorProfile: null },
    });
    void engine;
    const www = await e2.verify({ url: 'https://example.org/a', channel: 'www' });
    const sms = await e2.verify({ text: ' https://example.org/a ', channel: 'sms' });
    expect(www.kind === 'record' && sms.kind === 'record' && www.record.id === sms.record.id).toBe(true);
  });

  it('inna treść daje inny rekord', async () => {
    const { engine } = setup();
    const a = await engine.verify({ text: BASE, channel: 'www' });
    const b = await engine.verify({ text: BASE.replace('Długiej 5', 'Długiej 7'), channel: 'sms' });
    expect(a.kind === 'record' && b.kind === 'record' && a.record.id !== b.record.id).toBe(true);
  });
});
