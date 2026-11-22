// Zdarzenia postępu sprawdzania. Silnik zgłasza wyłącznie kroki, które naprawdę wykonał
// (bez zegara, bez zdarzeń "na zapas"). Zdarzenia nie zawierają treści zgłoszenia, fragmentów
// ani odpowiedzi modelu; wydawca i data pochodzą z metadanych bazy źródeł.
import type { EngineProgressEvent, ProgressStance } from '../contracts/api';
import type { Engine, SourceMeta, Stance, VerifyInput, VerifyOutcome } from '../contracts/index';

export type ProgressFn = (event: EngineProgressEvent) => void;

export interface VerifyOptions {
  /** Wołane synchronicznie w trakcie sprawdzania. Wyjątek z callbacku nie zmienia wyniku. */
  onProgress?: ProgressFn;
}

/** Silnik zgodny z kontraktem `Engine`, z opcjonalnym drugim argumentem `verify`. */
export interface ProgressEngine extends Engine {
  verify(input: VerifyInput, opts?: VerifyOptions): Promise<VerifyOutcome>;
}

export const MAX_PUBLISHER_LENGTH = 60;

/**
 * Krótka nazwa wydawcy z bazy: bez dopisku w nawiasie i bez części po przecinku,
 * np. "Policja (Komenda Główna Policji)" -> "Policja".
 */
export function shortPublisher(publisher: string): string {
  const full = publisher.replace(/\s+/g, ' ').trim();
  const short = full.replace(/\s*\([^)]*\)/g, '').split(',')[0]!.trim() || full;
  return short.length > MAX_PUBLISHER_LENGTH ? `${short.slice(0, MAX_PUBLISHER_LENGTH - 1).trimEnd()}…` : short;
}

export function progressStance(stance: Exclude<Stance, 'bez_zwiazku'>): ProgressStance {
  switch (stance) {
    case 'potwierdza':
      return 'to_samo';
    case 'obala':
      return 'co_innego';
    case 'rozbieznosc_kontekstu':
      return 'inna_data_lub_miejsce';
    default:
      return 'tlo';
  }
}

export interface ProgressEmitter {
  claimsRead(claims: number): void;
  forPassages(claim: number, count: number): void;
  counterSearchStart(claim: number): void;
  counterSearchDone(claim: number, count: number): void;
  passageAssessed(claim: number, meta: SourceMeta, stance: Exclude<Stance, 'bez_zwiazku'>): void;
  claimChecked(claim: number, counts: { candidates: number; passed: number; decisive: number; sources: number }): void;
  secondCheck(claim: number, checked: number, agreed: number, ok: boolean): void;
  searched(claim: number, documents: number): void;
  indexQueried(claim: number, queries: number, candidates: number): void;
  indexFailed(claim: number, reason: string): void;
  officialPage(publisher: string, quotes: number, confirmedClaims: number, claims: number): void;
  done(recordId: string, cached: boolean, checkedAt?: string): void;
}

/** Bezpieczny nadajnik: brak callbacku = nic; wyjątek z callbacku jest połykany. */
export function createProgressEmitter(onProgress?: ProgressFn): ProgressEmitter {
  const emit = (e: EngineProgressEvent) => {
    if (!onProgress) return;
    try {
      onProgress(e);
    } catch {
      // odbiorca zdarzeń nie może zepsuć sprawdzania
    }
  };
  const date = (d: string | null | undefined) => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  return {
    claimsRead: (claims) => emit({ type: 'zgloszenie_przeczytane', claims }),
    forPassages: (claim, count) => emit({ type: 'fragmenty_za', claim, count }),
    counterSearchStart: (claim) => emit({ type: 'szukanie_przeciw_start', claim }),
    counterSearchDone: (claim, count) => emit({ type: 'szukanie_przeciw_koniec', claim, count }),
    passageAssessed: (claim, meta, stance) =>
      emit({
        type: 'fragment_oceniony',
        claim,
        publisher: shortPublisher(meta.publisher),
        publishedAt: date(meta.publishedAt),
        stance: progressStance(stance),
      }),
    claimChecked: (claim, c) => emit({ type: 'twierdzenie_ocenione', claim, ...c }),
    secondCheck: (claim, checked, agreed, ok) => emit({ type: 'druga_kontrola', claim, checked, total: checked, agreed, ok }),
    searched: (claim, documents) => emit({ type: 'przeszukano', claim, documents }),
    indexQueried: (claim, queries, candidates) => emit({ type: 'indeks_redakcji', claim, queries, candidates }),
    indexFailed: (claim, reason) => emit({ type: 'indeks_redakcji_blad', claim, reason: reason.slice(0, 40) }),
    officialPage: (publisher, quotes, confirmedClaims, claims) =>
      emit({ type: 'strona_urzedu', publisher: shortPublisher(publisher), quotes, confirmedClaims, claims }),
    done: (recordId, cached, checkedAt) => emit({ type: 'gotowe', recordId, cached, ...(checkedAt ? { checkedAt } : {}) }),
  };
}
