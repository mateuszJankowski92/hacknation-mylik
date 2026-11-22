// Treść główna strony (zad. 44): węższy wycinek HTML dla stron urzędów, bez menu, okruszków,
// przycisków "udostępnij", list powiązanych artykułów i stopki. Używany tylko na ścieżce strony urzędu
// (officialPage.ts); zwykłe strony (prasa) idą dotychczasowym htmlToText bez zmian.
// Kolejność: jedyny <article> w <main> (albo w dokumencie), element z id="main-content" / role="main",
// <main>; każdy kandydat musi mieć co najmniej MIN_MAIN_TEXT znaków tekstu, inaczej następny.
// Cytat zawsze jest dosłownym podciągiem tekstu, który z tego wycinka powstaje (nic nie jest dopisywane).
import { decodeEntities } from '../../corpus/html';

const MIN_MAIN_TEXT = 200;

/** Klasa, id, etykieta albo rola elementu wskazująca na nawigację lub dodatki poza treścią. */
const CHROME_ATTR =
  /\b(?:class|id|aria-label|role)\s*=\s*["'][^"']*(?:breadcrumb|okruszk|share|sharing|social|udost[eę]pnij|related|powiazan|powiązan|navigation|menu|cookie|newsletter|tags?-list|return-button)[^"']*["']/iu;

/** Pozycja końca elementu otwartego w `start` (po znaczniku zamykającym), z liczeniem zagnieżdżeń. */
function elementEnd(html: string, start: number, tag: string): number {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'giu');
  re.lastIndex = start;
  let depth = 0;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    if (m[0].endsWith('/>')) continue;
    depth += m[1] ? -1 : 1;
    if (depth === 0) return m.index + m[0].length;
  }
  return -1;
}

function textLength(html: string): number {
  return decodeEntities(html.replace(/<(script|style)\b[\s\S]*?<\/\1>/giu, ' ').replace(/<[^>]+>/gu, ' ')).replace(/\s+/gu, ' ').trim().length;
}

/** Wszystkie elementy `tag` najwyższego poziomu (bez zagnieżdżonych w sobie). */
function topElements(html: string, tag: string): string[] {
  const out: string[] = [];
  const open = new RegExp(`<${tag}\\b[^>]*>`, 'giu');
  for (let m = open.exec(html); m; m = open.exec(html)) {
    const end = elementEnd(html, m.index, tag);
    if (end < 0) break;
    out.push(html.slice(m.index, end));
    open.lastIndex = end;
  }
  return out;
}

/** Usuwa elementy (dowolny znacznik blokowy) z atrybutem nawigacji/dodatków, razem z zawartością. */
export function stripChrome(html: string): string {
  let out = html;
  const open = /<(div|section|nav|ul|ol|aside|p|span|a|footer|header)\b[^>]*>/giu;
  for (let guard = 0; guard < 500; guard++) {
    open.lastIndex = 0;
    let found = false;
    for (let m = open.exec(out); m; m = open.exec(out)) {
      if (!CHROME_ATTR.test(m[0])) continue;
      const end = elementEnd(out, m.index, m[1]!.toLowerCase());
      if (end < 0) continue;
      out = `${out.slice(0, m.index)} ${out.slice(end)}`;
      found = true;
      break;
    }
    if (!found) break;
  }
  return out;
}

/** Wycinek HTML z treścią główną albo `null`, gdy nie ma pewnego kandydata (wtedy cała strona). */
export function mainContentHtml(rawHtml: string): string | null {
  const html = rawHtml.replace(/<!--[\s\S]*?-->/gu, ' ');
  const mains = topElements(html, 'main');
  const scope = mains.length === 1 ? mains[0]! : html;
  const candidates: string[] = [];
  const articles = topElements(scope, 'article');
  if (articles.length === 1) candidates.push(articles[0]!);
  const byId = /<(div|section|article)\b[^>]*(?:id\s*=\s*["']main-content["']|role\s*=\s*["']main["'])[^>]*>/iu.exec(html);
  if (byId) {
    const end = elementEnd(html, byId.index, byId[1]!.toLowerCase());
    if (end > 0) candidates.push(html.slice(byId.index, end));
  }
  if (mains.length === 1) candidates.push(mains[0]!);
  for (const c of candidates) {
    const cleaned = stripChrome(c);
    if (textLength(cleaned) >= MIN_MAIN_TEXT) return cleaned;
  }
  return null;
}
