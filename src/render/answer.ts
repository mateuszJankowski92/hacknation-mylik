// Forma odpowiedzi (szablony w kodzie, nie model). Pytanie rozstrzygające dostaje na początku
// bezpośrednią odpowiedź zgodną z etykietą; ocena redakcji jest zawsze przypisana redakcji;
// przy braku dowodów mówimy, czego nie udało się potwierdzić i jaki dokument by to rozstrzygnął.
// Ten sam tekst trafia do WWW i (skrócony) do SMS, bo oba kanały składają go z rekordu.
import type { ClaimResult, EvidenceItem, PageInfo, Verdict } from '../contracts/index';
import { isReviewQuestion, isYesNoQuestion } from '../input/question';
import { formatDate } from './templates';

export type AnswerMode = 'twierdzenie' | 'pytanie' | 'pytanie_o_ocene';

export function answerMode(text: string): AnswerMode {
  if (!text.trim()) return 'twierdzenie';
  if (isReviewQuestion(text)) return 'pytanie_o_ocene';
  return isYesNoQuestion(text) ? 'pytanie' : 'twierdzenie';
}

export const DIRECT_ANSWERS: Record<Verdict, string> = {
  potwierdzone: 'Tak.',
  falszywe: 'Nie.',
  wprowadzajace_w_blad: 'Częściowo.',
  brak_wystarczajacych_dowodow: 'Nie udało mi się tego potwierdzić.',
  nie_podlega_weryfikacji: 'Nie da się tego sprawdzić.',
};

export const NOT_FOUND_SENTENCE = 'Brak wyniku w moich źródłach nie oznacza, że to nieprawda.';

/**
 * Rodzaj dokumentu, który rozstrzygnąłby sprawę: ogólny szablon zależny od rodzaju sprawy (słowa
 * w twierdzeniu), bez zgadywania szczegółów. Kolejność: pierwszy pasujący rodzaj.
 */
const NEEDED_DOCUMENTS: { re: RegExp; doc: string }[] = [
  {
    re: /(zakaz|przepis|ustaw|uchwa[łl]|rozporz[ąa]dz|stref|obowi[ąa]z|mandat|op[łl]at|podat|regulamin)/iu,
    doc: 'oficjalny dokument, który to wprowadza (ustawa, rozporządzenie, uchwała albo regulamin), z zakresem i datą wejścia w życie',
  },
  {
    re: /(bilet|autobus|tramwaj|metro|poci[ąa]g|komunikacj|przejazd|kolej|przewo[źz]n|lini[ia])/iu,
    doc: 'komunikat przewoźnika albo organizatora transportu z datą albo aktualny regulamin przewozu',
  },
  {
    re: /(granic|wiz[aęy]?(?![\p{L}])|ambasad|konsul|za granic|podr[óo][żz]|lotnisk|paszport)/iu,
    doc: 'komunikat MSZ dla podróżnych albo ambasady z datą',
  },
  {
    re: /(szczepi|szpital|epidemi|zaka[żz]e|wirus|sanepid|nfz|lek(?:i|u|ów|ow)?(?![\p{L}]))/iu,
    doc: 'komunikat Głównego Inspektora Sanitarnego, Ministerstwa Zdrowia albo NFZ z datą',
  },
  {
    re: /(zasi[łl]|[śs]wiadcze|emerytur|rent[ay]?(?![\p{L}])|wyp[łl]at|dop[łl]at|zus)/iu,
    doc: 'komunikat instytucji, która wypłaca świadczenie, albo przepis z datą',
  },
  {
    re: /(strajk|protest|manifestac|wybor|g[łl]osowan|wybuch|po[żz]ar|pow[óo]d[źz]|zamach|atak)/iu,
    doc: 'relacja agencji prasowej albo komunikat władz lub organizatorów z datą i miejscem',
  },
  {
    re: /(powiedzia|stwierdzi|o[śs]wiadczy|wypowied|depesz|wpis|nagrani|film|zdj[ęe]ci|artyku[łl])/iu,
    doc: 'pierwotna publikacja (nagranie, wpis, depesza albo artykuł) z datą i autorem',
  },
];
export const DEFAULT_NEEDED_DOCUMENT = 'oficjalny komunikat instytucji, której sprawa dotyczy, z datą publikacji';

export function neededDocumentFor(claimText: string): string {
  return NEEDED_DOCUMENTS.find((n) => n.re.test(claimText))?.doc ?? DEFAULT_NEEDED_DOCUMENT;
}

/** Zdania przy braku dowodów: czego nie potwierdzono, jaki dokument, i że brak wyniku nie przesądza. */
export function missingEvidenceText(claim: ClaimResult): string {
  const doc = claim.neededDocument ?? neededDocumentFor(claim.claim.text);
  return `Nie udało mi się potwierdzić tej informacji. Do sprawdzenia potrzebuję: ${doc}. ${NOT_FOUND_SENTENCE}`;
}

const DECISIVE = new Set(['potwierdza', 'obala', 'rozbieznosc_kontekstu']);

export function reviewEvidence(claim: ClaimResult): EvidenceItem[] {
  return claim.evidence.filter((e) => e.source.layer === 'weryfikacja_redakcji' && e.source.review);
}

/** Pierwsza ocena redakcji, która rozstrzyga (ta sama teza, znana ocena) albo null. */
export function decisiveReview(claim: ClaimResult): EvidenceItem | null {
  return reviewEvidence(claim).find((e) => DECISIVE.has(e.stance)) ?? null;
}

/** Zdanie przypisujące ocenę redakcji (dosłowne pola indeksu w cudzysłowie), z datą publikacji. */
export function reviewSentence(item: EvidenceItem, opts: { maxThesis?: number } = {}): string {
  const r = item.source.review!;
  const thesis = cut(r.claimReviewed, opts.maxThesis ?? 220);
  const who = r.claimant ? ` (autor wypowiedzi: ${r.claimant})` : '';
  const when = item.source.publishedAt ? ` Publikacja z ${formatDate(item.source.publishedAt)}.` : '';
  // Teza odwrotna: zdanie mówi to wprost, a sprawdzana teza jest widoczna dosłownie.
  const what = r.inverse ? 'twierdzenie odwrotne do Twojego' : 'twierdzenie';
  return `${editorial(item)} sprawdziła ${what}: „${thesis}”${who} i oceniła je jako „${r.rating}”.${when}`;
}

/** Podobna sprawa: ocena redakcji pokazana, ale bez odpowiedzi wprost (brak szczegółu, inna data, inna teza). */
export function similarSentence(item: EvidenceItem, opts: { maxThesis?: number; link?: boolean } = {}): string {
  const r = item.source.review!;
  const thesis = cut(r.claimReviewed, opts.maxThesis ?? 220);
  const when = item.source.publishedAt ? `, ${formatDate(item.source.publishedAt)}` : '';
  const link = opts.link === false ? '' : `, ${item.source.url}`;
  return `${editorial(item)} sprawdziła podobne twierdzenie: „${thesis}” i oceniła je jako „${r.rating}”${when}${link}. To nie rozstrzyga Twojego pytania wprost.`;
}

/** Pierwsza ocena redakcji pokazana jako podobna sprawa (tło z tezą, nie uzasadnienie). */
export function similarReview(claim: ClaimResult): EvidenceItem | null {
  if (decisiveReview(claim)) return null;
  return reviewEvidence(claim).find((e) => e.source.review?.role !== 'uzasadnienie') ?? null;
}

const cut = (t: string, max: number) => (t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t);

/** "Redakcja X" (bez podwójnego słowa, gdy nazwa wydawcy zaczyna się od "Redakcja"). */
export function editorial(item: EvidenceItem, lower = false): string {
  const pub = (item.source.publisher || item.source.domain).trim();
  const s = /^redakcj/iu.test(pub) ? pub : `Redakcja ${pub}`;
  return lower ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

/** Strona starsza niż tyle dni od publikacji (albo bez daty) dostaje wyraźną uwagę o aktualności (zad. 43). */
export const PAGE_STALE_DAYS = 180;

/** Dowód ze strony urzędu wklejonej przez użytkownika (tymczasowy dokument, zad. 43). */
export function isPageEvidence(item: EvidenceItem): boolean {
  return item.source.layer === 'strona_urzedu';
}

/** Pierwszy dowód ze strony urzędu, który rozstrzyga (potwierdza, obala, rozbieżność), albo null. */
export function decisivePage(claim: ClaimResult): EvidenceItem | null {
  return claim.evidence.find((e) => isPageEvidence(e) && DECISIVE.has(e.stance)) ?? null;
}

/** Początek uwagi o nowszym, sprzecznym źródle (zad. 44; ta sama treść w silniku, src/engine/explain.ts). */
export const NEWER_SOURCE_PREFIX = 'Nowsze źródło mówi inaczej:';

/** Pierwsze, duże zdanie dla samego adresu strony urzędu: nie było pytania, więc nie "Tak.". */
export function officialAnnouncement(publisher: string): string {
  return `To oficjalny komunikat: ${publisher.trim()}.`;
}

const guillemets = (quote: string) => `«${quote.replace(/[«»]/gu, '"')}»`;

/** "<Wydawca> podaje: «cytat»" (cytat dosłowny, ze strony). */
export function pageSaysSentence(item: EvidenceItem, opts: { maxQuote?: number; maxPublisher?: number } = {}): string {
  const pub = cut((item.source.publisher || item.source.domain || 'Strona urzędu').trim(), opts.maxPublisher ?? 80);
  const quote = item.quote.replace(/\s+/gu, ' ').trim();
  return `${pub} podaje: ${guillemets(opts.maxQuote ? cut(quote, opts.maxQuote) : quote)}`;
}

/**
 * Uwaga o wieku strony: brak daty publikacji albo data starsza niż PAGE_STALE_DAYS od pobrania. Świeża
 * strona z datą: null. Ta sama funkcja daje ostrzeżenie w rekordzie i zdanie w odpowiedzi.
 */
export function pageAgeNote(publishedAt: string | null | undefined, fetchedAt: string): string | null {
  if (!publishedAt) return 'Nie znalazłem daty publikacji tej strony.';
  const published = Date.parse(`${publishedAt}T00:00:00Z`);
  const fetched = Date.parse(fetchedAt);
  if (Number.isNaN(published) || Number.isNaN(fetched)) return 'Nie znalazłem daty publikacji tej strony.';
  const fetchedDay = Math.floor(fetched / 86_400_000) * 86_400_000;
  if ((fetchedDay - published) / 86_400_000 <= PAGE_STALE_DAYS) return null;
  return `Ta strona pochodzi z ${formatDate(publishedAt)}; sprawdź, czy informacja jest nadal aktualna.`;
}

/** Krótka postać uwagi o wieku strony (SMS, Discord, gdy brakuje miejsca). */
export function pageAgeNoteShort(publishedAt: string | null | undefined, fetchedAt: string): string | null {
  const full = pageAgeNote(publishedAt, fetchedAt);
  if (full === null) return null;
  return publishedAt ? `Strona z ${formatDate(publishedAt)}, sprawdź aktualność.` : 'Brak daty publikacji strony.';
}

/**
 * Zdanie otwierające dla adresu spoza listy urzędów: strona została przeczytana, ale to relacja,
 * a nie dokument źródłowy. `maxTitle` skraca tytuł (SMS); brak tytułu = zdanie bez cudzysłowu.
 */
export function pageOpeningSentence(page: PageInfo, opts: { maxTitle?: number } = {}): string {
  const date = page.publishedAt ? formatDate(page.publishedAt) : 'bez daty publikacji';
  const where = `${page.domain}, ${date}`;
  const title = page.title ? cut(page.title.replace(/\s+/gu, ' ').trim(), opts.maxTitle ?? 120) : null;
  const read = title ? `Przeczytałem: ${guillemets(title)} (${where}).` : `Przeczytałem stronę (${where}).`;
  return `${read} To relacja, nie dokument źródłowy.`;
}

export interface AnnotateOptions {
  mode: AnswerMode;
  /** Pierwsze zdanie to zapowiedź oficjalnego komunikatu (sam adres strony urzędu, bez pytania; zad. 43). */
  announce?: boolean;
  /** Czy indeks weryfikacji odpowiedział dla tego twierdzenia (bez awarii). */
  indexChecked: boolean;
  /** Czy indeks był niedostępny (błąd dostępu, limit, brak klucza, czas) dla tego twierdzenia. */
  indexFailed?: boolean;
}

/** Ustawia `directAnswer` i `neededDocument` na wyniku twierdzenia (przed złożeniem zdań). */
export function annotateAnswer(claim: ClaimResult, opts: AnnotateOptions): void {
  if (opts.announce) {
    const page = decisivePage(claim);
    if (page) {
      claim.directAnswer = officialAnnouncement(page.source.publisher);
      return;
    }
  }
  const conflict = claim.evidence.some((e) => e.stance === 'potwierdza') && claim.evidence.some((e) => e.stance === 'obala');
  if (claim.verdict === 'brak_wystarczajacych_dowodow' && !conflict) {
    claim.neededDocument = neededDocumentFor(claim.claim.text);
    const missing = missingEvidenceText(claim);
    if (!claim.abstainReason?.startsWith(missing)) claim.abstainReason = claim.abstainReason ? `${missing} ${claim.abstainReason}` : missing;
  }
  if (opts.mode === 'twierdzenie') return;
  if (opts.mode === 'pytanie_o_ocene') {
    const rev = decisiveReview(claim);
    if (rev) claim.directAnswer = `Tak, ${editorial(rev, true)} to sprawdziła.`;
    else if (reviewEvidence(claim).length) claim.directAnswer = 'Znalazłem ocenę redakcji podobnej tezy, ale nie tej samej.';
    else if (opts.indexFailed) claim.directAnswer = 'Nie mogę teraz sprawdzić indeksu Google z ocenami redakcji z powodu błędu dostępu.';
    else if (opts.indexChecked) claim.directAnswer = 'Nie znalazłem takiej oceny w indeksie Google z ocenami redakcji.';
    else claim.directAnswer = 'Nie sprawdzałem tego w indeksie Google z ocenami redakcji.';
    return;
  }
  claim.directAnswer = DIRECT_ANSWERS[claim.verdict];
}
