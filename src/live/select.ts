// Dobór dowodów drugiej warstwy po ocenie i bramkach (zad. 29b). Ogólne reguły, bez strojenia pod przypadki.
//
// (a) "Tylko potwierdza albo milczy": dowód z drugiej warstwy może dać wyłącznie "potwierdzone" albo nic.
//     Stanowiska "obala" i "rozbieżność kontekstu" z tej warstwy odpadają; gdy w tej warstwie są naraz
//     "potwierdza" i stanowisko przeciwne, warstwa milczy (żaden jej dowód rozstrzygający nie zostaje).
// (b) Zgodność zdarzenia: "potwierdza" liczy się tylko, gdy strona dotyczy tego samego zdarzenia:
//     nazwy własne z twierdzenia występują w fragmencie lub tytule strony, a data lub okres z twierdzenia
//     zgadza się z treścią albo datą publikacji. Gdy twierdzenie nie ma daty, zostaje tylko najnowsza
//     strona (z datą), a odpowiedź pokazuje jej datę.
import type { ExtractedClaim, Notice } from '../contracts/index';
import type { AcceptedEvidence } from '../engine/citations';
import type { LiveSelection } from './layer';
import { liveDateNotice } from './text';

const DAY_MS = 86_400_000;
/** Ile dni po dacie zdarzenia może się ukazać relacja (data publikacji strony). */
export const EVENT_PUBLISH_LAG_DAYS = 3;

const MONTHS: [RegExp, number][] = [
  [/^stycz/, 1],
  [/^lut/, 2],
  [/^mar(ca|cu|zec)$/, 3],
  [/^kwie(tnia|tniu|cień|cien)$/, 4],
  [/^maj[au]?$/, 5],
  [/^czerw/, 6],
  [/^lip(ca|cu|iec)$/, 7],
  [/^sierp/, 8],
  [/^wrze(śnia|śniu|sień|snia|sniu|sien)$/, 9],
  [/^październik|^pazdziernik/, 10],
  [/^listopad/, 11],
  [/^grud/, 12],
];

export function monthOf(word: string): number | null {
  const w = word.toLowerCase();
  for (const [re, m] of MONTHS) if (re.test(w)) return m;
  return null;
}

export interface ClaimDate {
  day?: number;
  month?: number;
  year?: number;
}

/** Data lub okres z tekstu twierdzenia: dzień i miesiąc (z rokiem albo bez), sam miesiąc z rokiem, sam rok. */
export function claimDate(text: string): ClaimDate | null {
  const num = /(?<!\d)(\d{1,2})\.(\d{1,2})(?:\.(20\d{2}))?(?!\d)/.exec(text);
  if (num && +num[2]! >= 1 && +num[2]! <= 12) return { day: +num[1]!, month: +num[2]!, ...(num[3] ? { year: +num[3] } : {}) };
  const words = [...text.matchAll(/(?:(?<!\d)(\d{1,2})\s+)?(\p{L}+)(?:\s+(20\d{2}))?/gu)];
  for (const w of words) {
    const m = monthOf(w[2]!);
    if (!m) continue;
    const out: ClaimDate = { month: m };
    if (w[1]) out.day = +w[1];
    if (w[3]) out.year = +w[3];
    else {
      const y = /(?<!\d)(20\d{2})(?!\d)/.exec(text);
      if (y) out.year = +y[1]!;
    }
    return out;
  }
  const y = /(?<!\d)(20\d{2})(?!\d)/.exec(text);
  return y ? { year: +y[1]! } : null;
}

/** Rdzeń słowa do porównań mimo odmiany ("Szwecją" i "Szwecja" -> "szwec"). */
export function stem(word: string): string {
  const w = word.toLowerCase();
  return w.length <= 4 ? w : w.slice(0, Math.max(4, Math.min(5, w.length - 1)));
}

/** Nazwy własne twierdzenia: wyrazy z wielkiej litery, poza pierwszym wyrazem zdania. */
export function properNames(text: string): string[] {
  const out = new Set<string>();
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    const words = sentence.match(/[\p{L}][\p{L}-]*/gu) ?? [];
    words.forEach((w, i) => {
      if (i === 0) return;
      if (/^\p{Lu}/u.test(w) && w.length >= 3) out.add(stem(w));
    });
  }
  return [...out];
}

function textHasDay(text: string, d: ClaimDate): boolean {
  if (!d.day || !d.month) return false;
  const low = text.toLowerCase();
  const dd = String(d.day);
  const mm = String(d.month);
  const numeric = new RegExp(`(?<!\\d)0?${dd}\\.0?${mm}(?!\\d)`);
  if (numeric.test(low)) return true;
  for (const w of low.matchAll(/(?<!\d)(\d{1,2})\s+(\p{L}+)/gu)) if (+w[1]! === d.day && monthOf(w[2]!) === d.month) return true;
  return false;
}

function textHasMonth(text: string, d: ClaimDate): boolean {
  if (!d.month) return false;
  for (const w of text.toLowerCase().matchAll(/\p{L}+/gu)) if (monthOf(w[0]) === d.month) return true;
  return false;
}

/** Czy strona (fragment, tytuł, data publikacji) pasuje do daty lub okresu z twierdzenia. */
export function dateMatches(d: ClaimDate, text: string, publishedAt: string | null, now: Date): boolean {
  const year = d.year ?? now.getUTCFullYear();
  const pub = publishedAt ? Date.parse(`${publishedAt}T00:00:00Z`) : NaN;
  if (d.day && d.month) {
    if (textHasDay(text, d)) return true;
    const at = Date.UTC(year, d.month - 1, d.day);
    return !Number.isNaN(pub) && pub >= at && pub <= at + EVENT_PUBLISH_LAG_DAYS * DAY_MS;
  }
  if (d.month) {
    const start = Date.UTC(year, d.month - 1, 1);
    const end = Date.UTC(year, d.month, 1) + EVENT_PUBLISH_LAG_DAYS * DAY_MS;
    if (!Number.isNaN(pub)) return pub >= start && pub < end;
    return textHasMonth(text, d) && (!d.year || text.includes(String(d.year)));
  }
  if (d.year) return (!Number.isNaN(pub) && new Date(pub).getUTCFullYear() === d.year) || text.includes(String(d.year));
  return true;
}

const DECISIVE = new Set(['potwierdza', 'obala', 'rozbieznosc_kontekstu']);

export function selectLiveEvidence(claim: ExtractedClaim, accepted: AcceptedEvidence[], now: Date): LiveSelection {
  const reasons: Record<string, number> = {};
  const drop = (code: string) => (reasons[code] = (reasons[code] ?? 0) + 1);
  const context = accepted.filter((a) => !DECISIVE.has(a.stance));
  const confirm = accepted.filter((a) => a.stance === 'potwierdza');
  const against = accepted.filter((a) => a.stance === 'obala' || a.stance === 'rozbieznosc_kontekstu');

  // (a) tylko "potwierdza" albo nic
  for (const _ of against) drop('nie_potwierdza');
  let kept = confirm;
  if (against.length && confirm.length) {
    for (const _ of confirm) drop('sprzeczne_w_warstwie');
    kept = [];
  }

  // (b) zgodność zdarzenia
  const names = properNames(claim.text);
  const date = claimDate(claim.text);
  kept = kept.filter((a) => {
    const hay = `${a.passage.meta.title}\n${a.passage.text}`;
    const low = hay.toLowerCase();
    if (names.some((n) => !low.includes(n))) return (drop('inne_nazwy'), false);
    if (date && !dateMatches(date, hay, a.passage.meta.publishedAt, now)) return (drop('inna_data'), false);
    return true;
  });
  const notices: Notice[] = [];
  if (!date && kept.length) {
    // Bez daty w twierdzeniu: tylko najnowsza strona z datą publikacji.
    const dated = kept.filter((a) => a.passage.meta.publishedAt);
    const newest = dated.map((a) => a.passage.meta.publishedAt!).sort().at(-1);
    const before = kept.length;
    kept = newest ? dated.filter((a) => a.passage.meta.publishedAt === newest) : [];
    for (let i = kept.length; i < before; i++) drop(newest ? 'starsza_strona' : 'brak_daty_strony');
    if (newest && kept.length) notices.push({ type: 'status_zrodla', text: liveDateNotice(newest), passageId: kept[0]!.passage.id });
  }
  const accepted2 = [...kept, ...context];
  const dropped = accepted.length - accepted2.length;
  return { accepted: accepted2, ...(notices.length ? { notices } : {}), ...(dropped ? { dropped, reasons } : {}) };
}
