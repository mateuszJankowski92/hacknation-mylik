// Szablony tekstów po polsku. Uzasadnienie składa KOD (model nie pisze prozy).
import { STRENGTH_LABELS_PL, STRENGTH_REASON_LABELS_PL, type StrengthLevel, type StrengthReasonCode, type Verdict } from '../contracts/index';
import type { AbstainCode } from './rules';

/** Odmiana liczebnika: 1 fragment, 2 fragmenty, 5 fragmentów. */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const d = n % 10;
  const t = n % 100;
  if (d >= 2 && d <= 4 && !(t >= 12 && t <= 14)) return few;
  return many;
}

const nFragments = (n: number) => `${n} ${plural(n, 'fragment', 'fragmenty', 'fragmentów')}`;
const nSources = (n: number) => `${n} ${plural(n, 'źródło', 'źródła', 'źródeł')}`;
const nDocuments = (n: number) => `${n} ${plural(n, 'dokument', 'dokumenty', 'dokumentów')}`;

export interface ExplainInput {
  verdict: Verdict;
  abstain?: AbstainCode;
  strength: { level: StrengthLevel; reasons: StrengthReasonCode[] };
  confirmSources: number;
  refuteSources: number;
  contextSources: number;
}

function strengthSentence(level: StrengthLevel, reasons: StrengthReasonCode[]): string {
  const why = reasons.map((r) => STRENGTH_REASON_LABELS_PL[r]).join(', ');
  return `Siła podstawy: ${STRENGTH_LABELS_PL[level]}${why ? ` (${why})` : ''}.`;
}

export function explainClaim(x: ExplainInput): string {
  const s = strengthSentence(x.strength.level, x.strength.reasons);
  switch (x.verdict) {
    case 'nie_podlega_weryfikacji':
      return 'To twierdzenie jest opinią albo prognozą, a nie informacją o faktach, więc nie da się go sprawdzić w źródłach.';
    case 'potwierdzone':
      return `W zbiorze źródeł ${plural(x.confirmSources, 'jest', 'są', 'jest')} ${nSources(x.confirmSources)}, które ${plural(x.confirmSources, 'potwierdza', 'potwierdzają', 'potwierdzają')} to twierdzenie, i nie znaleziono źródła, które mu przeczy. ${s}`;
    case 'falszywe':
      return `W zbiorze źródeł ${plural(x.refuteSources, 'jest', 'są', 'jest')} ${nSources(x.refuteSources)}, które ${plural(x.refuteSources, 'przeczy', 'przeczą', 'przeczą')} temu twierdzeniu, i nie znaleziono źródła, które je potwierdza. ${s}`;
    case 'wprowadzajace_w_blad':
      return `Źródła potwierdzają główną część twierdzenia, ale pomija ono ważny kontekst, który zmienia jego wymowę (${nSources(x.contextSources)} z kontekstem pokazano osobno). ${s}`;
    case 'brak_wystarczajacych_dowodow':
      if (x.abstain === 'sprzeczne_zrodla')
        return `Źródła są ze sobą sprzeczne: część potwierdza twierdzenie, a część mu przeczy. Pokazujemy obie strony i nie rozstrzygamy sporu. ${s}`;
      if (x.abstain === 'niejednoznaczny_dokument')
        return `Ten sam dokument zawiera fragmenty, które jednocześnie potwierdzają i podważają twierdzenie. Nie rozstrzygamy tego za źródło. ${s}`;
      if (x.abstain === 'tylko_kontekst')
        return 'Znalezione fragmenty dają jedynie tło do tematu, ale ani nie potwierdzają, ani nie obalają twierdzenia. Wstrzymujemy się od oceny.';
      return 'W zbiorze źródeł nie znaleziono fragmentu, który potwierdza lub obala to twierdzenie. Wstrzymujemy się od oceny.';
  }
}

export function abstainReasonText(code: AbstainCode, checked: number, rejected: number): string {
  const stats = `Sprawdzono ${nFragments(checked)}; bramka cytatów odrzuciła ${rejected} ${plural(rejected, 'ocenę', 'oceny', 'ocen')}.`;
  switch (code) {
    case 'sprzeczne_zrodla':
      return `Źródła z różnych dokumentów są ze sobą sprzeczne. ${stats}`;
    case 'niejednoznaczny_dokument':
      return `Jeden dokument zawiera fragmenty wskazujące w przeciwnych kierunkach. ${stats}`;
    case 'tylko_kontekst':
      return `Znaleziono tylko fragmenty z kontekstem, bez fragmentu, który potwierdza lub obala twierdzenie. ${stats}`;
    case 'brak_dowodow':
      return `W zbiorze źródeł nie znaleziono fragmentu, który potwierdza lub obala to twierdzenie. ${stats}`;
  }
}

export function scopeLimitation(corpusVersion: string, documents: number): string {
  return `Sprawdzono wyłącznie w zamkniętym zbiorze źródeł (wersja korpusu ${corpusVersion}, ${nDocuments(documents)}). Wynik nie jest rozstrzygnięciem prawdy absolutnej.`;
}

export const ESCALATION_LIMITATION =
  'System wstrzymał się od oceny, więc to zgłoszenie może wymagać przeglądu przez człowieka.';

export function archivalLimitation(months: number): string {
  return `Część dowodów pochodzi z materiałów archiwalnych (opublikowanych ponad ${months} mies. temu); stan faktyczny mógł się od tego czasu zmienić.`;
}

export const UNDATED_LIMITATION = 'Część dowodów nie ma znanej daty publikacji, co obniża siłę podstawy.';

export function injectionLimitation(n: number): string {
  return `Pominięto ${nFragments(n)} źródeł zawierających treść przypominającą polecenia dla systemu; nie zostały one użyte jako dowód.`;
}

export function archivalNotice(months: number): string {
  return `Ten fragment pochodzi z materiału archiwalnego (starszego niż ${months} mies.).`;
}

export const INJECTION_NOTICE = 'Fragment zawiera treść przypominającą polecenia dla systemu i nie został użyty jako dowód.';

export const INPUT_INJECTION_NOTICE =
  'Zgłoszenie zawiera treść przypominającą polecenia dla systemu. Takie polecenia nie mają wpływu na ocenę.';

export const MESSAGES = {
  technical:
    'Nie udało się teraz wykonać sprawdzenia z przyczyn technicznych. To nie jest ocena zgłoszenia. Spróbuj ponownie później.',
  emptyCorpus:
    'Nie możemy teraz wykonać sprawdzenia, bo zbiór źródeł jest pusty. To nie jest ocena zgłoszenia.',
  searchFailed:
    'Nie udało się przeszukać zbioru źródeł, więc sprawdzenie nie zostało wykonane. To nie jest ocena zgłoszenia. Spróbuj ponownie później.',
  urlNotFetched:
    'W tej wersji systemu nie pobieramy i nie sprawdzamy treści stron internetowych. Wklej treść doniesienia jako tekst, a sprawdzimy ją w zbiorze źródeł.',
  clarification:
    'Nie znaleźliśmy w zgłoszeniu konkretnej informacji do sprawdzenia. Napisz, co dokładnie się wydarzyło, kogo lub czego dotyczy, gdzie i kiedy.',
} as const;
