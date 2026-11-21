// Atrapy indeksu weryfikacji (ta sama struktura co odpowiedź Google Fact Check Tools claims:search)
// i sterowany skryptem model. Dane testowe są własne i neutralne (miejscowości i tezy zmyślone).
import type { ApiClaim, FactcheckIndex, IndexSearchRequest, IndexSearchResult } from '../../src/factcheck/client';
import { loadFactcheckConfig, type FactcheckConfig } from '../../src/factcheck/config';
import { createFactcheckLayer, type FactcheckLayer } from '../../src/factcheck/layer';
import type { ExtractedClaim, PassageAssessment, Stance } from '../../src/contracts/index';
import type { AssessFn } from '../engine/fakes';

export function apiClaim(over: {
  text: string;
  rating: string;
  url: string;
  claimant?: string;
  claimDate?: string;
  reviewDate?: string;
  title?: string;
  site?: string;
  publisher?: string;
}): ApiClaim {
  return {
    text: over.text,
    ...(over.claimant ? { claimant: over.claimant } : {}),
    ...(over.claimDate ? { claimDate: over.claimDate } : {}),
    claimReview: [
      {
        publisher: { name: over.publisher ?? 'Demagog', site: over.site ?? 'demagog.org.pl' },
        url: over.url,
        title: over.title ?? `Analiza: ${over.text}`,
        reviewDate: over.reviewDate ?? '2026-05-20T00:00:00Z',
        textualRating: over.rating,
        languageCode: 'pl',
      },
    ],
  };
}

/** Indeks w pamięci: zwraca wpisy, których klucz występuje w zapytaniu (bez rozróżniania wielkości liter). */
export class FakeIndex implements FactcheckIndex {
  readonly name = 'fake_index';
  calls: IndexSearchRequest[] = [];
  constructor(private entries: { key: string; claims: ApiClaim[] }[]) {}
  async search(req: IndexSearchRequest): Promise<IndexSearchResult> {
    this.calls.push(req);
    // Jak indeks: dopasowanie słów zapytania (rdzeń 5 liter) do tekstu tezy; klucz wpisu musi też trafić.
    const stems = (req.query.toLowerCase().match(/\p{L}{4,}/gu) ?? []).map((w) => w.slice(0, 5));
    return {
      ok: true,
      claims: this.entries
        .filter((e) => {
          const hay = `${e.key} ${e.claims.map((c) => c.text ?? '').join(' ')}`.toLowerCase();
          return stems.some((st) => hay.includes(st)) && stems.some((st) => e.key.toLowerCase().includes(st) || hay.includes(st));
        })
        .flatMap((e) => e.claims),
    };
  }
}

/** Indeks z wymuszoną awarią (np. 403 = błąd dostępu, 429 = limit). */
export class FailingIndex implements FactcheckIndex {
  readonly name = 'failing_index';
  calls = 0;
  constructor(private code: 'odmowa_dostepu' | 'limit' | 'blad_sieci' | 'brak_klucza' = 'odmowa_dostepu', private status = 403) {}
  async search(): Promise<IndexSearchResult> {
    this.calls++;
    return { ok: false, code: this.code, status: this.status };
  }
}

/** Indeks, który nie odpowiada (do testu własnego limitu czasu); kończy się po przerwaniu. */
export class HangingIndex implements FactcheckIndex {
  readonly name = 'hanging_index';
  search(req: IndexSearchRequest): Promise<IndexSearchResult> {
    return new Promise((resolve) => {
      req.signal?.addEventListener('abort', () => resolve({ ok: false, code: 'przekroczony_czas' }));
    });
  }
}

export function testConfig(over: Partial<FactcheckConfig['index']> = {}): FactcheckConfig {
  const c = loadFactcheckConfig('data/factcheck.json');
  return { ...c, index: { ...c.index, ...over } };
}

export function layerWith(index: FactcheckIndex, over: Partial<FactcheckConfig['index']> = {}): FactcheckLayer {
  return createFactcheckLayer({ config: testConfig(over), index });
}

/**
 * Model atrapa: ekstrakcja z mapy (tekst wejścia -> twierdzenie), ocena z mapy (tekst fragmentu -> stanowisko).
 * Cytat = cały tekst fragmentu (dosłowny podciąg).
 */
export type StanceRule = Record<string, Stance> | ((claimText: string, passageText: string) => Stance);

/** Domyślnie: ta sama teza (identyczny tekst) = potwierdza, reszta bez związku. */
export const sameThesis: StanceRule = (c, p) => (c.trim() === p.trim() ? 'potwierdza' : 'bez_zwiazku');

export function scriptedModel(claims: Record<string, string>, stances: StanceRule) {
  const extract = (text: string): ExtractedClaim[] => {
    for (const [k, v] of Object.entries(claims)) if (text.includes(k)) return [{ id: 'c1', text: v, kind: 'faktograficzna' }];
    return [];
  };
  const assess: AssessFn = (req) =>
    req.passages.map((p): PassageAssessment => {
      const stance =
        typeof stances === 'function'
          ? stances(req.claim.text, p.text)
          : (Object.entries(stances).find(([k]) => p.text.includes(k))?.[1] ?? 'bez_zwiazku');
      return {
        passageId: p.id,
        stance,
        quote: stance === 'bez_zwiazku' ? '' : p.text,
        injectionSuspected: false,
        ...(stance === 'rozbieznosc_kontekstu' ? { mismatch: 'warunki' as const } : {}),
      } as PassageAssessment;
    });
  return { extract, assess };
}
