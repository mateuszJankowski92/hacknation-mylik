// Usuwanie z HTML treści niewidocznej dla czytelnika strony, zanim tekst trafi do analizy.
// Instrukcje dla modelu chowa się zwykle w elementach ukrytych stylem lub atrybutem; czytelnik ich
// nie widzi, więc nie są częścią doniesienia. Komentarze, skrypty i atrybuty usuwa dalej htmlToText
// (atrybuty nie trafiają do tekstu, bo znaczniki są zastępowane spacją).

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/** Elementy, których treść nigdy nie jest widoczna jako tekst strony. */
const ALWAYS_HIDDEN = new Set(['template', 'head', 'title', 'textarea', 'object', 'dialog']);

const HIDDEN_STYLE =
  /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|opacity\s*:\s*0(?:\.0+)?\s*(?:;|$|!)|font-size\s*:\s*0(?:\.0+)?(?:px|em|rem|pt|%)?\s*(?:;|$|!)|(?:max-)?(?:height|width)\s*:\s*0(?:px)?\s*(?:;|$|!)|clip\s*:\s*rect\(\s*0|clip-path\s*:\s*inset\(\s*50%|text-indent\s*:\s*-\d{3,}|(?:left|top)\s*:\s*-\d{3,}px)/i;
const HIDDEN_CLASS = /(?:^|\s)(?:hidden|d-none|sr-only|visually-hidden|screen-reader-text|invisible|xHidden|hide)(?:\s|$)/;

const TAG = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

function attr(attrs: string, name: string): string | null {
  const m = new RegExp(`(?:^|\\s)${name}\\s*(?:=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+)))?`, 'i').exec(attrs);
  if (!m) return null;
  return m[1] ?? m[2] ?? m[3] ?? '';
}

/** Czy znacznik otwierający oznacza element niewidoczny dla czytelnika. */
export function isHiddenElement(name: string, attrs: string): boolean {
  const tag = name.toLowerCase();
  if (ALWAYS_HIDDEN.has(tag)) return true;
  // Kontenery całej strony bywają chwilowo ukryte skryptem; ich nie wycinamy.
  if (tag === 'html' || tag === 'body' || tag === 'main') return false;
  // Atrybut logiczny `hidden` sprawdzamy bez wartości innych atrybutów (np. title="... hidden ...").
  if (attr(attrs.replace(/"[^"]*"|'[^']*'/g, '""'), 'hidden') !== null) return true;
  const aria = attr(attrs, 'aria-hidden');
  if (aria !== null && aria.trim().toLowerCase() === 'true') return true;
  const style = attr(attrs, 'style');
  if (style && HIDDEN_STYLE.test(style.replace(/\s+/g, ' '))) return true;
  const cls = attr(attrs, 'class');
  if (cls && HIDDEN_CLASS.test(cls)) return true;
  return false;
}

/**
 * Wycina elementy ukryte (razem z zawartością). Dopasowanie otwarcia z zamknięciem liczy
 * zagnieżdżenia elementów o tej samej nazwie; brak zamknięcia = wycięcie do końca dokumentu
 * (ostrożnie: lepiej stracić tekst niż przepuścić ukrytą instrukcję).
 */
export function stripHiddenHtml(source: string): string {
  // Najpierw komentarze, skrypty i style: ich treść nie może udawać znaczników.
  const html = source
    .replace(/<!--[\s\S]*?(?:-->|$)/g, ' ')
    .replace(/<(script|style|noscript)\b[\s\S]*?(?:<\/\1\s*>|$)/gi, ' ');
  let out = '';
  let pos = 0;
  TAG.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG.exec(html)) !== null) {
    const full = m[0];
    const name = m[1]!.toLowerCase();
    if (full.startsWith('</') || VOID_ELEMENTS.has(name) || full.endsWith('/>')) continue;
    if (!isHiddenElement(name, m[2] ?? '')) continue;
    out += html.slice(pos, m.index);
    // Szukamy zamknięcia z uwzględnieniem zagnieżdżeń tego samego elementu.
    const inner = new RegExp(`<(/?)${name}\\b(?:[^>"']|"[^"]*"|'[^']*')*>`, 'gi');
    inner.lastIndex = m.index + full.length;
    let depth = 1;
    let end = html.length;
    let n: RegExpExecArray | null;
    while ((n = inner.exec(html)) !== null) {
      if (n[1] === '/') depth--;
      else if (!n[0].endsWith('/>')) depth++;
      if (depth === 0) {
        end = n.index + n[0].length;
        break;
      }
    }
    out += ' ';
    pos = end;
    TAG.lastIndex = end;
  }
  return out + html.slice(pos);
}
