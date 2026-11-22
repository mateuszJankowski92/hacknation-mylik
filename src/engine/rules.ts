// Tabela reguł werdyktu i siły podstawy (decyzja PM). Czyste funkcje, bez I/O.
//
// Z3/Z4: werdykt zależy WYŁĄCZNIE od stanowisk ważnych dowodów (po bramce cytatów).
// Domena, wydawca, typ źródła i aktualność wpływają tylko na SIŁĘ podstawy.
import type { ClaimKind, SourceMeta, Stance, StrengthLevel, StrengthReasonCode, Verdict } from '../contracts/index';

export type EvidenceStance = Exclude<Stance, 'bez_zwiazku'>;

export interface RuleEvidence {
  passageId: string;
  documentId: string;
  stance: EvidenceStance;
  source: SourceMeta;
  archival: boolean;
  /** Treść po terminie obowiązywania (`validUntil` < data sprawdzenia). Wpływa tylko na siłę. */
  expired?: boolean;
  /** Pozycja fragmentu w wynikach wyszukiwania dla twierdzenia (0 = najlepszy). */
  rank: number;
}

export type AbstainCode =
  | 'brak_dowodow'
  | 'sprzeczne_zrodla'
  | 'tylko_kontekst'
  | 'niejednoznaczny_dokument'
  | 'brak_proby_obalenia';

export interface VerdictDecision {
  verdict: Verdict;
  /** Ustawione, gdy werdykt to wstrzymanie się (`brak_wystarczajacych_dowodow`). */
  abstain?: AbstainCode;
  /** Dowody zgodne z werdyktem (podstawa do liczenia siły). */
  aligned: RuleEvidence[];
}

export interface DecideOptions {
  /**
   * Czy wykonano próbę obalenia (wyszukiwanie twierdzenia przeciwnego). Bez niej werdykt
   * `potwierdzone` jest niedozwolony. Domyślnie true (zgodność wstecz dla wywołań bez potoku).
   */
  refutationPerformed?: boolean;
}

/**
 * Wiersze tabeli (werdykt zależy WYŁĄCZNIE od stanowisk dowodów po bramce cytatów):
 * 1. opinia/prognoza -> nie_podlega_weryfikacji. (`niejasna` jest odfiltrowana wcześniej w potoku
 *    i daje stan potrzeba_doprecyzowania; gdyby tu trafiła: brak dowodów, bez werdyktu z domysłu.)
 * 2. E puste -> brak_wystarczajacych_dowodow (brak_dowodow).
 * 3. potwierdza i obala -> brak_wystarczajacych_dowodow: z różnych dokumentów `sprzeczne_zrodla`,
 *    z jednego dokumentu `niejednoznaczny_dokument`. Obie strony zostają w dowodach.
 * 4. obala (bez potwierdza) -> falszywe (rozbieżność kontekstu i kontekst tego nie zmieniają).
 * 5. potwierdza i rozbieznosc_kontekstu (bez obala) -> brak_wystarczajacych_dowodow
 *    (`sprzeczne_zrodla`): jedno źródło potwierdza okoliczności, inne podaje inne; nie rozstrzygamy.
 * 6. rozbieznosc_kontekstu (bez potwierdza i obala) -> wprowadzajace_w_blad. To JEDYNA droga do
 *    tego werdyktu; sama obecność fragmentów `kontekst` go nie daje.
 * 7. potwierdza (z ewentualnym kontekstem) -> potwierdzone, ale tylko gdy wykonano próbę obalenia
 *    (bez niej: brak_wystarczajacych_dowodow, `brak_proby_obalenia`). Dowód obalający z przebiegu
 *    "przeciw" trafia do E jako `obala`, więc wiersz 3 ma pierwszeństwo.
 * 8. tylko kontekst -> brak_wystarczajacych_dowodow (tylko_kontekst).
 */
export function decideVerdict(kind: ClaimKind, evidence: readonly RuleEvidence[], opts: DecideOptions = {}): VerdictDecision {
  if (kind === 'opinia' || kind === 'prognoza') return { verdict: 'nie_podlega_weryfikacji', aligned: [] };
  if (kind === 'niejasna') return { verdict: 'brak_wystarczajacych_dowodow', abstain: 'brak_dowodow', aligned: [] };

  const confirm = evidence.filter((e) => e.stance === 'potwierdza');
  const refute = evidence.filter((e) => e.stance === 'obala');
  const mismatch = evidence.filter((e) => e.stance === 'rozbieznosc_kontekstu');

  if (evidence.length === 0) return { verdict: 'brak_wystarczajacych_dowodow', abstain: 'brak_dowodow', aligned: [] };

  const against = [...refute, ...mismatch];
  if (confirm.length > 0 && against.length > 0) {
    const confirmDocs = new Set(confirm.map((e) => e.documentId));
    const crossDoc = against.some((e) => !confirmDocs.has(e.documentId)) || confirmDocs.size > 1;
    return {
      verdict: 'brak_wystarczajacych_dowodow',
      abstain: crossDoc ? 'sprzeczne_zrodla' : 'niejednoznaczny_dokument',
      aligned: [],
    };
  }
  if (refute.length > 0) return { verdict: 'falszywe', aligned: refute };
  if (mismatch.length > 0) return { verdict: 'wprowadzajace_w_blad', aligned: mismatch };
  if (confirm.length > 0) {
    if (opts.refutationPerformed === false)
      return { verdict: 'brak_wystarczajacych_dowodow', abstain: 'brak_proby_obalenia', aligned: [] };
    return { verdict: 'potwierdzone', aligned: confirm };
  }
  return { verdict: 'brak_wystarczajacych_dowodow', abstain: 'tylko_kontekst', aligned: [] };
}

export const DEFAULT_ARCHIVAL_MONTHS = 24;

/**
 * Dowód archiwalny: `publishedAt` starszy niż próg (domyślnie 24 mies.) dla typów innych niż `prawo`.
 * Brak daty nie oznacza archiwalności (obniża siłę osobno).
 */
export function isArchival(meta: SourceMeta, now: Date, months = DEFAULT_ARCHIVAL_MONTHS): boolean {
  if (meta.sourceType === 'prawo' || !meta.publishedAt) return false;
  const published = new Date(`${meta.publishedAt}T00:00:00Z`);
  if (Number.isNaN(published.getTime())) return false;
  const threshold = new Date(now.getTime());
  threshold.setUTCMonth(threshold.getUTCMonth() - months);
  return published.getTime() < threshold.getTime();
}

/** Treść po terminie obowiązywania: `validUntil` (YYYY-MM-DD) wcześniejsza niż dzień sprawdzenia. */
export function isExpired(meta: SourceMeta, now: Date): boolean {
  if (!meta.validUntil) return false;
  const until = new Date(`${meta.validUntil}T23:59:59.999Z`);
  if (Number.isNaN(until.getTime())) return false;
  return until.getTime() < now.getTime();
}

/** Pozycja w wynikach, od której dopasowanie uznajemy za słabe (gdy żaden zgodny dowód nie jest wyżej). */
export const WEAK_MATCH_RANK = 3;

export interface StrengthResult {
  level: StrengthLevel;
  reasons: StrengthReasonCode[];
}

const LEVELS: StrengthLevel[] = ['niska', 'srednia', 'wysoka'];
const down = (l: StrengthLevel): StrengthLevel => (l === 'wysoka' ? 'srednia' : l === 'srednia' ? 'niska' : l);

/**
 * Siła podstawy. NIGDY nie zmienia werdyktu. Progi:
 * - brak: wstrzymanie się bez dowodów (lub nie_podlega_weryfikacji);
 * - niska: sprzeczne źródła (pokazujemy obie strony bez arbitralnej pewności);
 * - wysoka: >= 2 niezależne domeny wśród zgodnych dowodów, w tym urzędowe/prawo, żaden archiwalny
 *   ani po terminie obowiązywania, każdy z datą publikacji (albo akt prawny);
 * - srednia: >= 1 źródło urzędowe/prawo albo >= 2 niezależne domeny;
 * - niska: pozostałe.
 * Następnie obniżenie o jeden poziom (nie poniżej `niska`), gdy: WSZYSTKIE zgodne dowody są
 * archiwalne lub po terminie obowiązywania (`validUntil`); którykolwiek zgodny dowód jest po terminie; żaden zgodny dowód nie ma daty (poza prawem); najlepszy zgodny dowód jest na pozycji
 * >= WEAK_MATCH_RANK w wynikach wyszukiwania (pozycja zamiast surowego `score`, bo skala score
 * zależy od wyszukiwarki).
 * Na końcu: gdy WSZYSTKIE zgodne dowody pochodzą z drugiej warstwy (`layer: media_i_instytucje`),
 * poziom najwyżej `srednia` i przesłanka `zrodlo_wtorne` (zad. 29). Podstawa wyłącznie ze strony urzędu
 * wklejonej przez użytkownika (`layer: strona_urzedu`, zad. 43): najwyżej `srednia`.
 */
export function computeStrength(decision: VerdictDecision): StrengthResult {
  const { verdict, abstain, aligned } = decision;
  if (verdict === 'nie_podlega_weryfikacji') return { level: 'brak', reasons: [] };
  if (verdict === 'brak_wystarczajacych_dowodow') {
    if (abstain === 'sprzeczne_zrodla' || abstain === 'niejednoznaczny_dokument')
      return { level: 'niska', reasons: ['sprzeczne_zrodla'] };
    return { level: 'brak', reasons: ['brak_dowodow'] };
  }
  if (aligned.length === 0) return { level: 'brak', reasons: ['brak_dowodow'] };

  const domains = new Set(aligned.map((e) => e.source.domain.toLowerCase()));
  const official = aligned.some((e) => e.source.sourceType === 'urzedowe' || e.source.sourceType === 'prawo');
  const stale = (e: RuleEvidence) => e.archival || e.expired === true;
  const anyArchival = aligned.some(stale);
  const allArchival = aligned.every(stale);
  const anyExpired = aligned.some((e) => e.expired === true);
  const undated = (e: RuleEvidence) => e.source.sourceType !== 'prawo' && !e.source.publishedAt;
  const anyUndated = aligned.some(undated);
  const allUndated = aligned.every(undated);
  const bestRank = Math.min(...aligned.map((e) => e.rank));
  const weak = bestRank >= WEAK_MATCH_RANK;

  // Ocena redakcji sprawdzającej fakty (indeks weryfikacji, src/factcheck): jak jedno źródło
  // urzędowe dla poziomu `srednia`; poziom `wysoka` tylko razem ze źródłem urzędowym (dwie domeny).
  const reviewed = aligned.some((e) => e.source.layer === 'weryfikacja_redakcji');
  let level: StrengthLevel;
  if (domains.size >= 2 && official && !anyArchival && !anyUndated) level = 'wysoka';
  else if (official || reviewed || domains.size >= 2) level = 'srednia';
  else level = 'niska';
  if (allArchival) level = down(level);
  else if (anyExpired) level = down(level);
  if (allUndated) level = down(level);
  if (weak) level = down(level);
  if (!LEVELS.includes(level)) level = 'niska';
  // Zad. 29: podstawa wyłącznie z drugiej warstwy (media i instytucje) daje najwyżej `srednia`.
  // To samo dla podstawy wyłącznie z ocen redakcji (indeks weryfikacji).
  const secondaryOnly = aligned.every((e) => e.source.layer === 'media_i_instytucje' || e.source.layer === 'weryfikacja_redakcji');
  if (secondaryOnly && level === 'wysoka') level = 'srednia';
  // Zad. 43: podstawa wyłącznie ze strony urzędu wklejonej przez użytkownika to jedno źródło, które mówi o sobie.
  const pageOnly = aligned.every((e) => e.source.layer === 'strona_urzedu');
  if (pageOnly && level === 'wysoka') level = 'srednia';

  const reasons: StrengthReasonCode[] = [];
  if (official) reasons.push('zrodlo_urzedowe');
  reasons.push(domains.size >= 2 ? 'kilka_niezaleznych_zrodel' : 'jedno_zrodlo');
  if (anyArchival) reasons.push('zrodlo_archiwalne');
  if (weak) reasons.push('slabe_dopasowanie');
  if (secondaryOnly) reasons.push('zrodlo_wtorne');
  return { level, reasons };
}
