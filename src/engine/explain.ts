// Szablony tekstów po polsku. Uzasadnienie składa KOD (model nie pisze prozy).
import {
  MISMATCH_LABELS_PL,
  STRENGTH_LABELS_PL,
  STRENGTH_REASON_LABELS_PL,
  type MismatchKind,
  type StrengthLevel,
  type StrengthReasonCode,
  type Verdict,
} from '../contracts/index';
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
  /** Liczba dokumentów z rozbieżnością kontekstu i jej rodzaje (dla `wprowadzajace_w_blad`). */
  mismatchSources?: number;
  mismatchKinds?: readonly MismatchKind[];
  /** Czy przebieg "przeciw" (próba obalenia) został wykonany. */
  refutationPerformed?: boolean;
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
    case 'potwierdzone': {
      const ctx = x.contextSources > 0 ? ` Dodatkowe tło (${nSources(x.contextSources)}) pokazano osobno.` : '';
      const ref = x.refutationPerformed ? ' Szukaliśmy też źródeł, które mogłyby mu przeczyć, i takich nie znaleźliśmy.' : '';
      return `W zbiorze źródeł ${plural(x.confirmSources, 'jest', 'są', 'jest')} ${nSources(x.confirmSources)}, które ${plural(x.confirmSources, 'potwierdza', 'potwierdzają', 'potwierdzają')} to twierdzenie, i nie znaleziono źródła, które mu przeczy.${ref}${ctx} ${s}`;
    }
    case 'falszywe':
      return `W zbiorze źródeł ${plural(x.refuteSources, 'jest', 'są', 'jest')} ${nSources(x.refuteSources)}, które ${plural(x.refuteSources, 'przeczy', 'przeczą', 'przeczą')} temu twierdzeniu, i nie znaleziono źródła, które je potwierdza. ${s}`;
    case 'wprowadzajace_w_blad': {
      const n = x.mismatchSources ?? 0;
      const kinds = [...new Set(x.mismatchKinds ?? [])].map((k) => MISMATCH_LABELS_PL[k]);
      const what = kinds.length ? ` (${kinds.join(', ')})` : '';
      return `Źródła opisują to samo zdarzenie lub tę samą treść, ale w innym kontekście${what}, niż podaje twierdzenie. Twierdzenie przenosi prawdziwą informację w inne okoliczności, więc wprowadza w błąd (${nSources(n)}). ${s}`;
    }
    case 'brak_wystarczajacych_dowodow':
      if (x.abstain === 'sprzeczne_zrodla')
        return `Źródła są ze sobą sprzeczne: część potwierdza twierdzenie, a część mu przeczy. Pokazujemy obie strony i nie rozstrzygamy sporu. ${s}`;
      if (x.abstain === 'niejednoznaczny_dokument')
        return `Ten sam dokument zawiera fragmenty, które jednocześnie potwierdzają i podważają twierdzenie. Nie rozstrzygamy tego za źródło. ${s}`;
      if (x.abstain === 'brak_proby_obalenia')
        return 'Znaleźliśmy źródło, które potwierdza twierdzenie, ale nie udało się sprawdzić, czy inne źródła mu nie przeczą. Wstrzymujemy się od oceny.';
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
    case 'brak_proby_obalenia':
      return `Nie wykonano wyszukiwania źródeł przeczących twierdzeniu. ${stats}`;
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
  return `Pominąłem ${n} ${plural(n, 'tekst', 'teksty', 'tekstów')} ze źródeł. Miały treść przypominającą polecenia dla mnie.`;
}

export function archivalNotice(months: number): string {
  return `Ten fragment pochodzi z materiału archiwalnego (starszego niż ${months} mies.).`;
}

export function expiredNotice(validUntil: string): string {
  return `Ten fragment był aktualny do ${validUntil}; po tej dacie stan mógł się zmienić.`;
}

export const EXPIRED_LIMITATION =
  'Część dowodów pochodzi z materiałów po terminie obowiązywania, co obniża siłę podstawy.';

// Komunikaty o poleceniach w danych: prosty język, bez oskarżania, bez treści instrukcji systemu.
export const MODEL_INJECTION_NOTICE = 'Ten tekst ze źródła wygląda na polecenie dla mnie. Nie korzystam z niego.';

export const PAGE_INJECTION_NOTICE = 'Na tej stronie są polecenia dla mnie. Pominąłem je. Nie zmieniają wyniku.';

export const PAGE_IS_DATA_LIMITATION =
  'Treść pobranej strony była tylko przedmiotem analizy: z niej wzięliśmy twierdzenia, a dowodów szukaliśmy wyłącznie w zbiorze źródeł.';

export const PAGE_OFFICIAL_LIMITATION =
  'Strona urzędu spod wklejonego adresu została pobrana w chwili sprawdzenia i potraktowana jak dokument źródłowy: potwierdzamy tylko to, co da się zacytować dosłownie z tej strony. To jedno źródło, które mówi o sobie.';

export const PAGE_LEFT_LIST_NOTICE =
  'Ten adres prowadzi poza listę urzędów albo to nie jest zwykła strona internetowa, więc traktuję go jak relację, nie dokument źródłowy.';

export const PAGE_EMBEDDED_FAILED_NOTICE =
  'Nie udało się pobrać strony z podanego adresu, więc sprawdziłem samo zgłoszenie.';

export const PAGE_TRUNCATED_NOTICE = 'Strona była długa, więc przeanalizowaliśmy tylko jej początkową część.';

export const INJECTION_NOTICE = 'W tym tekście ze źródła są polecenia dla mnie. Nie korzystam z niego.';

export const INPUT_INJECTION_NOTICE = 'W wiadomości są też polecenia dla mnie. Nie wykonuję ich. Sprawdzam tylko informacje.';

export const MESSAGES = {
  tooSlow: 'Sprawdzanie trwało za długo i je przerwaliśmy. To nie jest ocena zgłoszenia. Spróbuj ponownie za chwilę.',
  technical:
    'Nie udało się teraz wykonać sprawdzenia z przyczyn technicznych. To nie jest ocena zgłoszenia. Spróbuj ponownie później.',
  emptyCorpus:
    'Nie możemy teraz wykonać sprawdzenia, bo zbiór źródeł jest pusty. To nie jest ocena zgłoszenia.',
  searchFailed:
    'Nie udało się przeszukać zbioru źródeł, więc sprawdzenie nie zostało wykonane. To nie jest ocena zgłoszenia. Spróbuj ponownie później.',
  urlNotFetched:
    'Nie udało się pobrać tej strony, więc sprawdzenie nie zostało wykonane. To nie jest ocena zgłoszenia. Wklej treść doniesienia jako tekst, a sprawdzimy ją w zbiorze źródeł.',
  urlBlocked:
    'Ten adres prowadzi do zasobu lokalnego lub wewnętrznego, więc go nie pobieramy. To nie jest ocena zgłoszenia. Wklej treść doniesienia jako tekst.',
  urlNoContent:
    'Pobrana strona nie zawiera tekstu, który moglibyśmy przeanalizować. To nie jest ocena zgłoszenia. Wklej treść doniesienia jako tekst.',
  urlWrongType:
    'Ten adres prowadzi do pliku albo innego formatu niż zwykła strona internetowa (np. PDF), którego nie czytamy. To nie jest ocena zgłoszenia. Wklej treść doniesienia jako tekst.',
  /** Wiadomość zawiera tylko polecenia, bez informacji do sprawdzenia. */
  injectionOnly:
    'Sprawdzam tylko informacje. Nie wykonuję poleceń z wiadomości. Napisz jednym zdaniem, co się stało. Kto, co, gdzie i kiedy?',
  clarification:
    'Nie znaleźliśmy w zgłoszeniu konkretnej informacji do sprawdzenia. Napisz, co dokładnie się wydarzyło, kogo lub czego dotyczy, gdzie i kiedy.',
} as const;

/** Zad. 44: sprzeczne dokumenty starsze niż strona urzędu (albo bez daty) są tłem, nie podstawą oceny. */
export const PAGE_OLDER_BACKGROUND_LIMITATION =
  'Wcześniejsze komunikaty, które opisują to inaczej, pokazuję jako tło: nowszy komunikat urzędu je zastępuje.';

/** Zad. 44: nowszy dokument niż strona urzędu i sprzeczny z nią: wyraźna uwaga, siła niższa, etykieta bez zmian. */
export { NEWER_SOURCE_PREFIX } from '../render/answer';
import { NEWER_SOURCE_PREFIX } from '../render/answer';
export function newerSourceNotice(publisher: string, publishedAt: string | null | undefined): string {
  const when = publishedAt ? `, ${publishedAt.split('-').reverse().join('.')}` : '';
  return `${NEWER_SOURCE_PREFIX} ${publisher.trim()}${when}. Sprawdź, czy komunikat urzędu jest nadal aktualny.`;
}
