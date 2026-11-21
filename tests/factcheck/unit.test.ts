import { describe, expect, it } from 'vitest';
import { GoogleFactCheckIndex, type FetchLike } from '../../src/factcheck/client';
import { createFactcheckFromEnv, factcheckSwitch } from '../../src/factcheck/index';
import { labelForRating, labelForUserClaim, RATING_TABLE } from '../../src/factcheck/ratings';
import { excludedCorpusSourceIds, loadFactcheckConfig, matchPublisher } from '../../src/factcheck/config';
import { answerMode, neededDocumentFor } from '../../src/render/answer';

describe('tabela ocen redakcji', () => {
  it.each([
    ['Prawda', 'potwierdzone'],
    ['Fałsz', 'falszywe'],
    ['FAŁSZ', 'falszywe'],
    ['Manipulacja', 'wprowadzajace_w_blad'],
    ['Częściowa prawda', 'wprowadzajace_w_blad'],
    ['Częściowy fałsz', 'wprowadzajace_w_blad'],
    ['Nieweryfikowalne', 'brak_wystarczajacych_dowodow'],
  ])('%s -> %s', (rating, label) => expect(labelForRating(rating)).toBe(label));

  it('nieznana ocena: tylko tło (null)', () => {
    expect(labelForRating('Mostly false')).toBeNull();
    expect(labelForRating('Ocena redakcji: zobacz artykuł')).toBeNull();
  });

  it('pytanie odwrotne: prawda i fałsz zamieniają się, ocen pośrednich nie odwracamy', () => {
    expect(labelForUserClaim('falszywe', true)).toBe('potwierdzone');
    expect(labelForUserClaim('potwierdzone', true)).toBe('falszywe');
    expect(labelForUserClaim('wprowadzajace_w_blad', true)).toBeNull();
    expect(labelForUserClaim('wprowadzajace_w_blad', false)).toBe('wprowadzajace_w_blad');
  });

  it('tabela zawiera tylko cztery etykiety (bez "nie podlega weryfikacji")', () => {
    expect(new Set(Object.values(RATING_TABLE))).toEqual(new Set(['potwierdzone', 'falszywe', 'wprowadzajace_w_blad', 'brak_wystarczajacych_dowodow']));
  });
});

describe('klient indeksu', () => {
  const ok: FetchLike = async () => ({ ok: true, status: 200, json: async () => ({ claims: [{ text: 't', claimReview: [] }] }) });
  it('bez klucza: brak_klucza, bez wywołania sieci', async () => {
    let called = 0;
    const idx = new GoogleFactCheckIndex({ endpoint: 'https://x.example/v1alpha1/claims:search', apiKey: '', fetchImpl: async (...a) => (called++, ok(...a)) });
    expect(await idx.search({ query: 'q', languageCode: 'pl', pageSize: 5 })).toEqual({ ok: false, code: 'brak_klucza' });
    expect(called).toBe(0);
  });
  it('parametry zapytania zgodne z dokumentacją claims:search', async () => {
    let seen = '';
    const idx = new GoogleFactCheckIndex({ endpoint: 'https://x.example/v1alpha1/claims:search', apiKey: 'k', fetchImpl: async (u, i) => ((seen = u), ok(u, i)) });
    const r = await idx.search({ query: 'test zdanie', languageCode: 'pl', pageSize: 5 });
    expect(r.ok).toBe(true);
    const u = new URL(seen);
    expect(u.searchParams.get('query')).toBe('test zdanie');
    expect(u.searchParams.get('languageCode')).toBe('pl');
    expect(u.searchParams.get('pageSize')).toBe('5');
  });
  it.each([
    [403, 'odmowa_dostepu'],
    [400, 'odmowa_dostepu'],
    [429, 'limit'],
    [500, 'blad_http'],
  ])('HTTP %s -> %s (kod bez klucza)', async (status, code) => {
    const idx = new GoogleFactCheckIndex({ endpoint: 'https://x.example/s', apiKey: 'tajny', fetchImpl: async () => ({ ok: false, status, json: async () => ({}) }) });
    const r = await idx.search({ query: 'q', languageCode: 'pl', pageSize: 5 });
    expect(r).toMatchObject({ ok: false, code });
    expect(JSON.stringify(r)).not.toContain('tajny');
  });
  it('błąd sieci i zła odpowiedź', async () => {
    const down = new GoogleFactCheckIndex({ endpoint: 'https://x.example/s', apiKey: 'k', fetchImpl: async () => { throw new Error('ECONNRESET'); } });
    expect(await down.search({ query: 'q', languageCode: 'pl', pageSize: 5 })).toEqual({ ok: false, code: 'blad_sieci' });
    const bad = new GoogleFactCheckIndex({ endpoint: 'https://x.example/s', apiKey: 'k', fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ claims: 'x' }) }) });
    expect(await bad.search({ query: 'q', languageCode: 'pl', pageSize: 5 })).toEqual({ ok: false, code: 'zla_odpowiedz' });
  });
});

describe('konfiguracja', () => {
  it('lista wydawców: plik jawny, każdy wpis z zasadą i statusem; dopasowanie domeny w kodzie', () => {
    const c = loadFactcheckConfig();
    expect(c.publishers.find((p) => p.id === 'demagog')?.enabled).toBe(true);
    expect(matchPublisher(c, 'demagog.org.pl')?.id).toBe('demagog');
    expect(matchPublisher(c, 'www.demagog.org.pl')?.id).toBe('demagog');
    expect(matchPublisher(c, 'demagog.org.pl.example.com')).toBeNull();
    expect(matchPublisher(c, 'evildemagog.org.pl')).toBeNull();
  });
  it('dokumenty redakcji w zbiorze: wyłącznik domyślnie pozwala ich używać; wyłączone przy use=false', () => {
    expect(excludedCorpusSourceIds()).toEqual([]);
    expect(loadFactcheckConfig().corpusDirectFactcheck.sourceIds).toContain('konkret24');
  });
  it('przełącznik: auto bez klucza = wyłączona, off = wyłączona', () => {
    expect(factcheckSwitch({})).toBe('auto');
    expect(createFactcheckFromEnv({ env: {} })).toBeNull();
    expect(createFactcheckFromEnv({ env: { FACTCHECK_LAYER: 'off', GOOGLE_FACTCHECK_API_KEY: 'k' } })).toBeNull();
    expect(createFactcheckFromEnv({ env: { FACTCHECK_LAYER: 'on' } })).not.toBeNull();
    expect(createFactcheckFromEnv({ env: { GOOGLE_FACTCHECK_API_KEY: 'k' } })).not.toBeNull();
  });
});

describe('forma odpowiedzi', () => {
  it('rozpoznaje pytanie rozstrzygające i pytanie o ocenę redakcji', () => {
    expect(answerMode('Czy od jutra bilety drożeją?')).toBe('pytanie');
    expect(answerMode('Od jutra bilety drożeją.')).toBe('twierdzenie');
    expect(answerMode('Czy Demagog sprawdzał, czy bilety drożeją?')).toBe('pytanie_o_ocene');
    expect(answerMode('Kto wygrał mecz?')).toBe('twierdzenie');
  });
  it('dokument potrzebny przy braku dowodów: ogólny rodzaj sprawy', () => {
    expect(neededDocumentFor('Od jutra zakaz wjazdu do centrum.')).toMatch(/uchwała|rozporządzenie/);
    expect(neededDocumentFor('Bilety autobusowe tylko w aplikacji.')).toMatch(/przewoźnika/);
    expect(neededDocumentFor('Coś się stało.')).toMatch(/oficjalny komunikat/);
  });
});

import { cacheTtlMs } from '../../src/factcheck/client';
import { phraseVariants, planQueries } from '../../src/factcheck/layer';

describe('zapytania na żywo: krótkie frazy, plan, pamięć tylko w procesie', () => {
  const claim = { id: 'c1', kind: 'faktograficzna' as const, text: 'Wrocław był jedynym miastem w Polsce, w którym 65-latkowie jeździli komunikacją miejską za darmo.', searchTerms: ['Wrocław', 'darmowa komunikacja', 'seniorzy'] };

  it('3-5 wariantów po 1-3 słowa, bez całego zdania', () => {
    const v = phraseVariants(claim);
    expect(v.length).toBeGreaterThanOrEqual(3);
    expect(v.length).toBeLessThanOrEqual(5);
    for (const q of v) expect(q.split(' ').length).toBeLessThanOrEqual(3);
    expect(v).toContain('Wrocław Polsce');
  });

  it('plan: najpierw bez filtra, potem z filtrem wydawcy; łącznie najwyżej limit', () => {
    const plan = planQueries(['a b', 'c', 'd e'], ['demagog.org.pl', 'pravda.org.pl'], 8);
    expect(plan).toHaveLength(8);
    expect(plan.slice(0, 3).every((q) => !q.site)).toBe(true);
    expect(plan[3]).toEqual({ query: 'a b', site: 'demagog.org.pl' });
    expect(planQueries(['a', 'b'], ['x.pl'], 3)).toHaveLength(3);
  });

  it('pamięć odpowiedzi: tylko według Cache-Control', async () => {
    expect(cacheTtlMs('public, max-age=300')).toBe(300_000);
    expect(cacheTtlMs('private, no-store')).toBe(0);
    expect(cacheTtlMs(null)).toBe(0);
    let calls = 0;
    let now = 0;
    const mk = (cc: string | null) =>
      new GoogleFactCheckIndex({
        endpoint: 'https://x.example/s',
        apiKey: 'k',
        nowMs: () => now,
        fetchImpl: async () => (calls++, { ok: true, status: 200, json: async () => ({ claims: [] }), headers: { get: () => cc } }),
      });
    const cached = mk('max-age=60');
    await cached.search({ query: 'q', languageCode: 'pl', pageSize: 5 });
    await cached.search({ query: 'q', languageCode: 'pl', pageSize: 5 });
    expect(calls).toBe(1);
    now = 61_000;
    await cached.search({ query: 'q', languageCode: 'pl', pageSize: 5 });
    expect(calls).toBe(2);
    const nocache = mk(null);
    await nocache.search({ query: 'q', languageCode: 'pl', pageSize: 5 });
    await nocache.search({ query: 'q', languageCode: 'pl', pageSize: 5 });
    expect(calls).toBe(4);
  });

  it('filtr wydawcy trafia do parametru reviewPublisherSiteFilter', async () => {
    let seen = '';
    const idx = new GoogleFactCheckIndex({ endpoint: 'https://x.example/s', apiKey: 'k', fetchImpl: async (u) => ((seen = u), { ok: true, status: 200, json: async () => ({}) }) });
    await idx.search({ query: 'Wrocław', site: 'demagog.org.pl', languageCode: 'pl', pageSize: 10 });
    expect(new URL(seen).searchParams.get('reviewPublisherSiteFilter')).toBe('demagog.org.pl');
  });
});

import { namePhrases, namesMatch } from '../../src/factcheck/layer';

describe('zgodność nazw osób z wpisem redakcji', () => {
  const p = namePhrases('Czy radna Anna Testowska otworzyła nowy most?');
  it('wystarczy nazwisko, także w innej odmianie', () => {
    expect(namesMatch(p, 'Testowska otworzyła most w Lipnie')).toBe(true);
    expect(namesMatch(p, 'Radna Testowskiej przypisano otwarcie mostu')).toBe(true);
  });
  it('to samo nazwisko z innym imieniem: odrzucenie', () => {
    expect(namesMatch(p, 'Maria Testowska otworzyła most')).toBe(false);
  });
  it('brak członu nazwy: odrzucenie; nazwa jednowyrazowa jak dotąd', () => {
    expect(namesMatch(p, 'Anna otworzyła most')).toBe(false);
    expect(namesMatch(namePhrases('Czy w Lipnie otwarto most?'), 'Most w Lipnie otwarty')).toBe(true);
    expect(namesMatch(namePhrases('Czy w Lipnie otwarto most?'), 'Most w Borowie otwarty')).toBe(false);
  });
});
