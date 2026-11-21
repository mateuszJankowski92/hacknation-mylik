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
  /** Pozycja fragmentu w wynikach wyszukiwania dla twierdzenia (0 = najlepszy). */
  rank: number;
}

export type AbstainCode = 'brak_dowodow' | 'sprzeczne_zrodla' | 'tylko_kontekst' | 'niejednoznaczny_dokument';

export interface VerdictDecision {
  verdict: Verdict;
  /** Ustawione, gdy werdykt to wstrzymanie się (`brak_wystarczajacych_dowodow`). */
  abstain?: AbstainCode;
  /** Dowody zgodne z werdyktem (podstawa do liczenia siły). */
  aligned: RuleEvidence[];
}

/**
 * Wiersze tabeli:
 * 1. opinia/prognoza -> nie_podlega_weryfikacji. (`niejasna` jest odfiltrowana wcześniej w potoku;
 *    gdyby tu trafiła, traktujemy ją jak brak dowodów, bez werdyktu z domysłu.)
 * 2. E puste -> brak_wystarczajacych_dowodow (brak_dowodow).
 * 3. potwierdza i obala z różnych dokumentów -> brak_wystarczajacych_dowodow (sprzeczne_zrodla).
 *    Doprecyzowanie: potwierdza i obala z TEGO SAMEGO dokumentu też nie dają werdyktu
 *    (niejednoznaczny_dokument), bo kod nie rozstrzyga, która część dokumentu jest wiążąca.
 * 4. potwierdza + kontekst (bez obala) -> wprowadzajace_w_blad.
 * 5. tylko potwierdza -> potwierdzone; obala (bez potwierdza) -> falszywe (kontekst nie zmienia
 *    obalenia; dowody kontekstu są pokazane osobno); tylko kontekst -> brak_wystarczajacych_dowodow.
 */
export function decideVerdict(kind: ClaimKind, evidence: readonly RuleEvidence[]): VerdictDecision {
  if (kind === 'opinia' || kind === 'prognoza') return { verdict: 'nie_podlega_weryfikacji', aligned: [] };
  if (kind === 'niejasna') return { verdict: 'brak_wystarczajacych_dowodow', abstain: 'brak_dowodow', aligned: [] };

  const confirm = evidence.filter((e) => e.stance === 'potwierdza');
  const refute = evidence.filter((e) => e.stance === 'obala');
  const context = evidence.filter((e) => e.stance === 'kontekst');

  if (evidence.length === 0) return { verdict: 'brak_wystarczajacych_dowodow', abstain: 'brak_dowodow', aligned: [] };

  if (confirm.length > 0 && refute.length > 0) {
    const confirmDocs = new Set(confirm.map((e) => e.documentId));
    const crossDoc = refute.some((e) => !confirmDocs.has(e.documentId)) || confirmDocs.size > 1;
    return {
      verdict: 'brak_wystarczajacych_dowodow',
      abstain: crossDoc ? 'sprzeczne_zrodla' : 'niejednoznaczny_dokument',
      aligned: [],
    };
  }
  if (confirm.length > 0 && context.length > 0) return { verdict: 'wprowadzajace_w_blad', aligned: confirm };
  if (confirm.length > 0) return { verdict: 'potwierdzone', aligned: confirm };
  if (refute.length > 0) return { verdict: 'falszywe', aligned: refute };
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
 * - wysoka: >= 2 niezależne domeny wśród zgodnych dowodów, w tym urzędowe/prawo, żaden archiwalny,
 *   każdy z datą publikacji (albo akt prawny);
 * - srednia: >= 1 źródło urzędowe/prawo albo >= 2 niezależne domeny;
 * - niska: pozostałe.
 * Następnie obniżenie o jeden poziom (nie poniżej `niska`), gdy: WSZYSTKIE zgodne dowody są
 * archiwalne; żaden zgodny dowód nie ma daty (poza prawem); najlepszy zgodny dowód jest na pozycji
 * >= WEAK_MATCH_RANK w wynikach wyszukiwania (pozycja zamiast surowego `score`, bo skala score
 * zależy od wyszukiwarki).
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
  const anyArchival = aligned.some((e) => e.archival);
  const allArchival = aligned.every((e) => e.archival);
  const undated = (e: RuleEvidence) => e.source.sourceType !== 'prawo' && !e.source.publishedAt;
  const anyUndated = aligned.some(undated);
  const allUndated = aligned.every(undated);
  const bestRank = Math.min(...aligned.map((e) => e.rank));
  const weak = bestRank >= WEAK_MATCH_RANK;

  let level: StrengthLevel;
  if (domains.size >= 2 && official && !anyArchival && !anyUndated) level = 'wysoka';
  else if (official || domains.size >= 2) level = 'srednia';
  else level = 'niska';
  if (allArchival) level = down(level);
  if (allUndated) level = down(level);
  if (weak) level = down(level);
  if (!LEVELS.includes(level)) level = 'niska';

  const reasons: StrengthReasonCode[] = [];
  if (official) reasons.push('zrodlo_urzedowe');
  reasons.push(domains.size >= 2 ? 'kilka_niezaleznych_zrodel' : 'jedno_zrodlo');
  if (anyArchival) reasons.push('zrodlo_archiwalne');
  if (weak) reasons.push('slabe_dopasowanie');
  return { level, reasons };
}
