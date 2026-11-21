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
