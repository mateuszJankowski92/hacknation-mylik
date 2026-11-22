// Data publikacji strony ze znaczników HTML (zad. 43). Tylko jawne znaczniki, nigdy domysł z treści:
// 1. <meta property="article:published_time">, 2. JSON-LD "datePublished", 3. <time datetime="...">,
// 4. element, którego klasa zawiera "date" (np. article__date), z datą w treści (dd.mm.rrrr albo "1 stycznia 2022").
// Brak jawnego znacznika = null (odpowiedź mówi wtedy, że daty nie znaleziono).
import { decodeEntities, toIsoDate } from '../../corpus/html';

const MONTHS_PL: Record<string, number> = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, października: 10, listopada: 11, grudnia: 12,
};

const ISO_DAY = /(\d{4})-(\d{2})-(\d{2})/;
const MIN_YEAR = 1990;

function validDay(year: number, month: number, day: number, now: Date): string | null {
  if (year < MIN_YEAR) return null;
  const iso = toIsoDate(year, month, day);
  if (!iso) return null;
  // Data z przyszłości (więcej niż doba) to nie data publikacji.
  if (new Date(`${iso}T00:00:00Z`).getTime() > now.getTime() + 86_400_000) return null;
  return iso;
}

function fromIsoValue(value: string, now: Date): string | null {
  const m = ISO_DAY.exec(value.trim());
  return m ? validDay(Number(m[1]), Number(m[2]), Number(m[3]), now) : null;
}

function fromPolishText(text: string, now: Date): string | null {
  const t = text.replace(/\s+/g, ' ').trim();
  const num = /(?<!\d)(\d{1,2})\.(\d{1,2})\.(\d{4})(?!\d)/.exec(t);
  if (num) return validDay(Number(num[3]), Number(num[2]), Number(num[1]), now);
  const word = /(?<!\d)(\d{1,2})\s+(\p{L}+)\s+(\d{4})(?!\d)/u.exec(t);
  const month = word ? MONTHS_PL[word[2]!.toLowerCase()] : undefined;
  if (word && month) return validDay(Number(word[3]), month, Number(word[1]), now);
  return fromIsoValue(t, now);
}

function metaPublished(html: string, now: Date): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!/(?:property|name|itemprop)\s*=\s*["']?(?:article:published_time|datePublished|og:published_time)["']?/i.test(tag)) continue;
    const content = /content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i.exec(tag);
    const value = content ? (content[1] ?? content[2] ?? '') : '';
    const day = fromIsoValue(value, now);
    if (day) return day;
  }
  return null;
}

function jsonLdPublished(html: string, now: Date): string | null {
  for (const m of html.matchAll(/"datePublished"\s*:\s*"([^"]{8,40})"/g)) {
    const day = fromIsoValue(m[1]!, now);
    if (day) return day;
  }
  return null;
}

function timePublished(html: string, now: Date): string | null {
  for (const m of html.matchAll(/<time\b[^>]*>/gi)) {
    const attr = /datetime\s*=\s*"([^"]*)"|datetime\s*=\s*'([^']*)'/i.exec(m[0]);
    const day = attr ? fromIsoValue(attr[1] ?? attr[2] ?? '', now) : null;
    if (day) return day;
  }
  return null;
}

const DATE_CLASS = /<(div|p|span|li|small|h\d)\b[^>]*class\s*=\s*"[^"]*date[^"]*"[^>]*>([\s\S]{0,400}?)<\/\1>/gi;
const NOT_PUBLICATION = /(modif|updat|edit|expir|valid|aktualiz|zmian|do-dnia|deadline|event(?!-date))/i;

function classPublished(html: string, now: Date): string | null {
  for (const m of html.matchAll(DATE_CLASS)) {
    if (NOT_PUBLICATION.test(m[0].slice(0, m[0].indexOf('>') + 1))) continue;
    const text = decodeEntities(m[2]!.replace(/<[^>]+>/g, ' '));
    const day = fromPolishText(text, now);
    if (day) return day;
  }
  return null;
}

/** Data publikacji (YYYY-MM-DD) z surowego HTML albo null. Komentarze HTML są pomijane. */
export function extractPageDate(rawHtml: string, now: Date = new Date()): string | null {
  const html = rawHtml.replace(/<!--[\s\S]*?-->/g, ' ');
  return metaPublished(html, now) ?? jsonLdPublished(html, now) ?? timePublished(html, now) ?? classPublished(html, now);
}
