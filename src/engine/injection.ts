// Wykrywanie sygnałów prompt injection (W6) w danych: wejściu, treści strony, fragmentach źródeł,
// twierdzeniach od modelu i cytatach. Wykrycie NIE zmienia werdyktu "na żądanie": podejrzane zdania
// wejścia nie trafiają do modelu, fragment z sygnałem jest wyłączany z dowodów, a sygnał trafia
// do rekordu (tylko kod, bez treści) i do logu zdarzeń.
//
// Detekcja działa na kilku postaciach tekstu naraz: surowej, znormalizowanej (NFKC, bez znaków
// niewidocznych i znaków łączących, z ujednoliconymi literami z innych alfabetów), ze sklejonym
// zapisem z odstępami ("z i g n o r u j") oraz na rozkodowanych wstawkach base64.

export type InjectionSignalCode =
  | 'ignorowanie_instrukcji'
  | 'prompt_systemowy'
  | 'zmiana_roli'
  | 'narzucony_werdykt'
  | 'znacznik_roli'
  | 'znacznik_wstrzykniecia'
  | 'ujawnienie_instrukcji'
  | 'podszycie_systemowe'
  | 'zakodowana_instrukcja';

interface Pattern {
  code: InjectionSignalCode;
  re: RegExp;
}

// Granica słowa zgodna z polskimi literami (`\b` w JS zna tylko ASCII).
const B = '(?<![\\p{L}\\p{N}_])';
const E = '(?![\\p{L}\\p{N}_])';
const re = (src: string, flags = 'iu') => new RegExp(src, flags);

/** Nazwy znaczników, którymi system oddziela dane od instrukcji (src/llm/sanitize.ts). */
const OWN_TAGS = 'dane_uzytkownika|twierdzenie|fragmenty?';

// Wzorce ogólne (nie zawierają konkretnych przykładów testowych).
const PATTERNS: Pattern[] = [
  {
    code: 'ignorowanie_instrukcji',
    re: re(
      `${B}(?:z?ignoruj(?:cie)?|pomi[nń](?:cie)?|zapomnij(?:cie)?|nie\\s+stosuj(?:cie)?|nie\\s+s[łl]uchaj(?:cie)?|porzu[cć]|uniewa[żz]nij)${E}\\s+(?:\\p{L}+\\s+){0,3}?(?:instrukcj\\p{L}*|regu[łl]\\p{L}*|polece\\p{L}*|zasad\\p{L}*|wytyczn\\p{L}*|ogranicze\\p{L}*)`,
    ),
  },
  {
    code: 'ignorowanie_instrukcji',
    re: /\b(?:ignore|disregard|forget|override|bypass)\s+(?:(?:all|any|the|your|my|previous|prior|above|earlier|preceding|system|initial|original|these|those)\s+)*?(?:all|any|your|previous|prior|above|earlier|preceding|system|initial|original)\s+(?:\w+\s+)?(?:instructions?|rules?|prompts?|guidelines?|directives?|restrictions?)\b|\b(?:ignore|disregard)\s+(?:everything|anything)\s+(?:above|before|else)\b/iu,
  },
  {
    code: 'ignorowanie_instrukcji',
    re: re(`${B}(?:nowe|zaktualizowane|prawdziwe|właściwe|dodatkowe)\\s+(?:instrukcj\\p{L}*|polecenia|zasady)\\s*:|\\b(?:new|updated|real|actual)\\s+(?:instructions|rules|task)\\s*:`),
  },
  { code: 'prompt_systemowy', re: /\bsystem(?:owy|owe|owego)?\s*[-_]?\s*prompt\p{L}*|\bprompt\p{L}*\s+systemow\p{L}*/iu },
  {
    code: 'zmiana_roli',
    re: re(
      `${B}(?:jeste[śs]\\s+teraz|od\\s+teraz\\s+(?:jeste[śs]|odpowiadaj|oceniaj|b[ęe]dziesz)|udawaj,?\\s+[żz]e|twoja\\s+nowa\\s+rola)${E}`,
    ),
  },
  {
    code: 'zmiana_roli',
    re: /\b(?:you\s+are\s+now|from\s+now\s+on,?\s+you|pretend\s+(?:to\s+be|that)|your\s+new\s+role|act\s+as\s+(?:an?\s+|the\s+|my\s+)?(?:\w+\s+){0,2}?(?:assistant|ai|model|system|admin\w*|developer|dan|chatbot|bot|jailbr\w*))\b/iu,
  },
  {
    code: 'narzucony_werdykt',
    re: re(
      `${B}(?:odpowiedz|odpowiadaj|zwr[óo][ćc]|wypisz|napisz|answer|respond|return|output|reply)${E}(?:\\s+(?:tylko|jedynie|wy[łl][ąa]cznie|s[łl]owem|jednym|only|just|with|the|word|a|single)){0,3}\\s*(?::\\s*["„'“]?\\s*(?:potwierdz|prawd|fa[łl]szyw|obala|true|false|confirmed|verified)|["„'“]\\s*(?:potwierdz|prawd|fa[łl]szyw|obala|true|false|confirmed|verified)|\\s(?:potwierdz\\p{L}*|fa[łl]szyw\\p{L}*|obala\\p{L}*|true|false|confirmed|verified)${E})`,
    ),
  },
  {
    code: 'narzucony_werdykt',
    re: re(
      `${B}(?:uznaj|oce[ńn]|oceniaj|oznacz|zakwalifikuj|traktuj|klasyfikuj|mark|classify|rate|label|treat)\\s+(?:\\p{L}+\\s+){0,4}?(?:za|jako|as)\\s+(?:potwierdz\\p{L}*|prawd\\p{L}*|fa[łl]szyw\\p{L}*|obala\\p{L}*|true|false|confirmed|verified|supported)`,
    ),
  },
  {
    code: 'narzucony_werdykt',
    re: re(
      `${B}(?:werdykt|verdict|stance|wynik\\s+sprawdzenia|ocena\\s+ko[ńn]cowa)\\s*(?:to|is|=|:|brzmi|must\\s+be|musi\\s+by[ćc])\\s*["„'“]?\\s*(?:potwierdz\\p{L}*|prawd\\p{L}*|fa[łl]szyw\\p{L}*|obala\\p{L}*|true|false|confirmed)`,
    ),
  },
  {
    code: 'narzucony_werdykt',
    re: /\b(?:say|state|confirm|declare)\s+(?:that\s+)?(?:this|it|the\s+claim)\s+is\s+(?:true|confirmed|verified|correct)\b|(?:napisz|powiedz|stwierd[źz]|potwierd[źz]|przyznaj),?\s+[żz]e\s+(?:to|ta\s+informacja|to\s+twierdzenie|twierdzenie)\s+(?:jest\s+)?(?:prawd\p{L}*|potwierdz\p{L}*)/iu,
  },
  {
    // Fragment JSON w kształcie wyjścia modelu (próba podsunięcia gotowej odpowiedzi).
    code: 'narzucony_werdykt',
    re: /["'„“]\s*(?:stance|verdict|injectionSuspected|passageId|assessments|claims)\s*["'”]\s*:/iu,
  },
  {
    code: 'ujawnienie_instrukcji',
    re: re(
      `${B}(?:ujawnij|poka[żz]|wypisz|podaj|wy[śs]wietl|powt[óo]rz|przytocz|zdrad[źz]|wklej|zacytuj)\\s+(?:\\p{L}+\\s+){0,4}?(?:(?:swoje|twoje|systemow\\p{L}*|ukryt\\p{L}*|pocz[ąa]tkow\\p{L}*)\\s+(?:\\p{L}+\\s+)?instrukcj\\p{L}*|prompt\\p{L}*|klucz\\p{L}*\\s+(?:api|dost[ęe]pu|systemu)|api\\s*key|has[łl]\\p{L}*\\s+(?:administratora|systemu)|konfiguracj\\p{L}*\\s+systemu)`,
    ),
  },
  {
    code: 'ujawnienie_instrukcji',
    re: /\b(?:reveal|show|print|output|repeat|display|tell\s+me|give\s+me|leak|dump|share)\s+(?:\w+\s+){0,4}?(?:system\s+prompt|(?:your|the|initial|hidden|original)\s+(?:\w+\s+)?(?:instructions|prompt|rules)|api[\s_-]?keys?|secret\s+keys?|secrets|passwords?|environment\s+variables)\b|\bwhat\s+(?:are|is|were)\s+your\s+(?:\w+\s+)?(?:instructions|prompt|rules)\b/iu,
  },
  {
    code: 'podszycie_systemowe',
    re: re(
      `\\[\\s*(?:system|admin|developer|dev|programista|deweloper|operator|instrukcja)\\s*\\]|(?:^|\\s)#{1,6}\\s*(?:system|instrukcj\\p{L}*|instructions?|developer|deweloper)${E}`,
    ),
  },
  {
    code: 'podszycie_systemowe',
    re: re(
      `${B}(?:wiadomo[śs][ćc]|komunikat|polecenie|instrukcja)\\s+(?:od|dla)\\s+(?:programist\\p{L}*|administrator\\p{L}*\\s+systemu|tw[óo]rc[óo]w\\s+systemu|systemu|modelu|asystenta|anthropic|openai)|\\b(?:message|instructions?|note)\\s+(?:from|to)\\s+(?:the\\s+)?(?:developers?|system|admin\\w*|anthropic|openai|the\\s+model|the\\s+assistant)\\b|${B}(?:tryb\\s+(?:programisty|deweloperski|administratora)|developer\\s+mode|debug\\s+mode|god\\s+mode|dan\\s+mode|jailbreak\\p{L}*)`,
    ),
  },
  {
    code: 'znacznik_roli',
    re: /(?:^|\n|[.!?…]\s)\s*(?:system|assistant|asystent|user|u[żz]ytkownik|human|developer|programista)\s*:/iu,
  },
  { code: 'znacznik_roli', re: /\b(?:SYSTEM|ASSISTANT|DEVELOPER|ADMIN)\s*:/u },
  { code: 'znacznik_roli', re: /<\|?\s*(?:im_start|im_end|system|endoftext)\s*\|?>|\[\/?INST\]|<<\/?SYS>>/iu },
  {
    code: 'znacznik_wstrzykniecia',
    re: re(
      `(?:<|&lt;|＜)(?:\\s*\\/\\s*|\\/?)(?:${OWN_TAGS}|system|instructions?|instrukcj\\p{L}*|passage|dane|data|prompt|assistant|user)(?![\\p{L}\\p{N}])[^>]*(?:>|&gt;)?`,
    ),
  },
  {
    code: 'zakodowana_instrukcja',
    re: re(`${B}(?:zdekoduj|odkoduj|rozkoduj|decode)${E}[^.\\n]{0,60}${B}(?:wykonaj|zastosuj|post[ąa]p|follow|execute|obey|run|apply)${E}`),
  },
];

// Litery z innych alfabetów, które wyglądają jak łacińskie (mieszane alfabety).
const CONFUSABLES: Record<string, string> = {
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', у: 'y', х: 'x', і: 'i', ї: 'i', ј: 'j', ѕ: 's', ԁ: 'd', ӏ: 'l', һ: 'h', ԛ: 'q', ԝ: 'w', к: 'k', м: 'm', н: 'h', т: 't', в: 'b', г: 'r', п: 'n', ь: 'b',
  А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', Х: 'X', У: 'Y', І: 'I', Ј: 'J', Ѕ: 'S',
  α: 'a', ε: 'e', ι: 'i', κ: 'k', ν: 'v', ο: 'o', ρ: 'p', τ: 't', υ: 'u', χ: 'x', γ: 'y', η: 'n', ω: 'w',
  Α: 'A', Β: 'B', Ε: 'E', Ζ: 'Z', Η: 'H', Ι: 'I', Κ: 'K', Μ: 'M', Ν: 'N', Ο: 'O', Ρ: 'P', Τ: 'T', Υ: 'Y', Χ: 'X',
  ı: 'i', ɡ: 'g', 'ⅰ': 'i',
};
const CONFUSABLE_RE = new RegExp(`[${Object.keys(CONFUSABLES).join('')}]`, 'gu');

// Znaki niewidoczne i formatujące (Cf: zero-width, bidi, znaczniki Unicode), selektory wariantów,
// znaki sterujące poza nową linią.
const INVISIBLE = /[\p{Cf}­͏ᅟᅠ឴឵ㅤﾠ︀-️\u{E0100}-\u{E01EF}]/gu;
const CONTROL = /[\p{Cc}]/gu;
// Znaki diakrytyczne polskich liter (kreska, ogonek, kropka); inne znaki łączące usuwamy.
const POLISH_MARKS = /[̨́̇]/u;

/** Ujednolica tekst do celów detekcji (nie do wyświetlania ani cytowania). */
export function normalizeForDetection(text: string): string {
  return text
    .normalize('NFKC')
    .replace(INVISIBLE, '')
    .replace(CONTROL, (c) => (c === '\n' ? '\n' : ' '))
    .normalize('NFD')
    .replace(/\p{M}/gu, (mark) => (POLISH_MARKS.test(mark) ? mark : ''))
    .normalize('NFC')
    .replace(CONFUSABLE_RE, (c) => CONFUSABLES[c] ?? c);
}

// Słowa zapisane z odstępami ("z i g n o r u j", "i.g.n.o.r.e"): co najmniej 4 litery z separatorem.
const SPACED_RUN = /(?<![\p{L}\p{N}])\p{L}(?:[ .\-_*·|/]\p{L}){3,}(?![\p{L}\p{N}])/gu;

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{M}+/gu, '').replace(/ł/g, 'l').replace(/Ł/g, 'L');
}

/** Rdzenie fraz sterujących w zapisie bez odstępów (dla tekstu "rozstrzelonego" bez przerw między słowami). */
const COMPACT_KEYS = [
  'zignoruj',
  'ignorujpoprzed',
  'ignorujinstrukc',
  'ignoreprevious',
  'ignoreall',
  'ignoretheabove',
  'disregardprevious',
  'systemprompt',
  'promptsystemow',
  'youarenow',
  'jestesteraz',
  'developermode',
  'trybprogramisty',
  'odpowiedzpotwierdz',
  'uznajzaprawd',
  'ocenjakopotwierdz',
  'revealyourinstructions',
  'ujawnijinstrukc',
  'ujawnijprompt',
];

/** Skleja "rozstrzelone" słowa; zwraca też postać bez odstępów do porównania z rdzeniami. */
function collapseSpaced(text: string): { collapsed: string; compact: string[] } {
  const compact: string[] = [];
  const collapsed = text.replace(SPACED_RUN, (run) => {
    const squashed = run.replace(/[ .\-_*·|/]/g, '');
    compact.push(stripDiacritics(squashed).toLowerCase());
    return squashed;
  });
  return { collapsed, compact };
}

const BASE64_TOKEN = /(?<![A-Za-z0-9+/=_-])[A-Za-z0-9+/_-]{16,}={0,2}(?![A-Za-z0-9+/=_-])/g;
const MAX_BASE64_TOKENS = 20;

/** Rozkodowane wstawki base64, które wyglądają na tekst (nie na losowe bajty). */
function decodedBase64Chunks(text: string): string[] {
  const out: string[] = [];
  const tokens = text.match(BASE64_TOKEN) ?? [];
  for (const tok of tokens.slice(0, MAX_BASE64_TOKENS)) {
    if (!/[A-Z]/.test(tok) && !/[0-9+/]/.test(tok)) continue; // zwykłe długie słowo
    let decoded: string;
    try {
      decoded = Buffer.from(tok.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    } catch {
      continue;
    }
    if (decoded.length < 8) continue;
    const printable = [...decoded].filter((c) => /[\p{L}\p{N}\p{P}\p{Zs}\n]/u.test(c)).length;
    if (printable / [...decoded].length >= 0.9) out.push(decoded);
  }
  return out;
}

function matchPatterns(text: string, found: Set<InjectionSignalCode>): void {
  for (const p of PATTERNS) if (p.re.test(text)) found.add(p.code);
}

/** Zwraca posortowaną listę unikalnych kodów sygnałów (bez treści tekstu). */
export function detectInjectionSignals(text: string): InjectionSignalCode[] {
  if (!text) return [];
  const found = new Set<InjectionSignalCode>();
  matchPatterns(text, found);
  const normalized = normalizeForDetection(text);
  if (normalized !== text) matchPatterns(normalized, found);
  const { collapsed, compact } = collapseSpaced(normalized);
  if (compact.length > 0) {
    matchPatterns(collapsed, found);
    const joined = compact.join('');
    if (COMPACT_KEYS.some((k) => joined.includes(k))) found.add('ignorowanie_instrukcji');
  }
  for (const chunk of decodedBase64Chunks(normalized)) {
    const inner = new Set<InjectionSignalCode>();
    matchPatterns(normalizeForDetection(chunk), inner);
    if (inner.size > 0) found.add('zakodowana_instrukcja');
  }
  return [...found].sort();
}

export interface StrippedText {
  /** Tekst bez podejrzanych zdań/wierszy/członów (to, co może trafić do modelu). */
  text: string;
  /** Kody sygnałów z usuniętych segmentów. */
  signals: InjectionSignalCode[];
  /** Liczba usuniętych segmentów. */
  removed: number;
}

/** Człon zdania, który zostaje po usunięciu polecenia, musi mieć co najmniej tyle słów. */
const MIN_KEPT_CLAUSE_WORDS = 3;
const CLAUSE_SPLIT = /(?<=[,;])\s+|\s+[-–—]\s+|\s+(?=(?:i|oraz|a|ale|lecz|and|but)\s)/u;
const CLAUSE_JOINER = /^(?:i|oraz|a|ale|lecz|and|but)\s+/iu;

function wordCount(s: string): number {
  return (s.match(/[\p{L}\p{N}]+/gu) ?? []).length;
}

/**
 * Zdanie z poleceniem: zostawia tylko człony PRZED pierwszym członem z poleceniem (zwykle to
 * twierdzenie), a polecenie i wszystko po nim usuwa (dalsze człony często należą do polecenia).
 */
function stripClauses(sentence: string): string {
  const kept: string[] = [];
  let flagged = false;
  for (const clause of sentence.split(CLAUSE_SPLIT)) {
    if (detectInjectionSignals(clause).length) {
      flagged = true;
      break;
    }
    kept.push(clause.replace(CLAUSE_JOINER, '').replace(/[,;.!?…]+\s*$/u, '').trim());
  }
  if (!flagged) return ''; // wzorzec obejmuje kilka członów: usuwamy całe zdanie
  const rest = kept.filter((k) => wordCount(k) >= MIN_KEPT_CLAUSE_WORDS).join(', ');
  return rest ? `${rest}. ` : '';
}

/**
 * Usuwa z tekstu zdania (albo człony zdań) i wiersze z sygnałem injection, żeby podejrzane fragmenty
 * nie trafiły do modelu. Sprawdza też cały tekst (wzorce mogą przekraczać granice zdań); gdy sygnał
 * zostaje w całości po usunięciu, zwraca pusty tekst (nie wiemy, który fragment usunąć).
 */
export function stripInjectedSegments(text: string): StrippedText {
  const whole = detectInjectionSignals(text);
  if (whole.length === 0) return { text, signals: [], removed: 0 };
  const signals = new Set<InjectionSignalCode>();
  const kept: string[] = [];
  let removed = 0;
  for (const line of text.split(/\n/)) {
    if (detectInjectionSignals(line).length === 0) {
      kept.push(line);
      continue;
    }
    const parts = line.match(/[^.!?…]+[.!?…]*\s*/gu) ?? [line];
    const keptParts: string[] = [];
    for (const part of parts) {
      const sig = detectInjectionSignals(part);
      if (sig.length) {
        removed++;
        for (const s of sig) signals.add(s);
        const rest = stripClauses(part);
        if (rest) keptParts.push(rest);
      } else keptParts.push(part);
    }
    kept.push(keptParts.join('').trimEnd());
  }
  let out = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (detectInjectionSignals(out).length > 0 || removed === 0) {
    for (const s of whole) signals.add(s);
    out = '';
    removed = Math.max(removed, 1);
  }
  return { text: out, signals: [...signals].sort(), removed };
}

/** Czy tekst zawiera adres URL lub domenę z protokołem/www. */
export function containsUrl(text: string): boolean {
  return /\bhttps?:\/\/|\bwww\.[a-z0-9-]+\.[a-z]{2,}/iu.test(text);
}

/** Adresy, domeny i e-maile w tekście (do sprawdzenia, czy twierdzenie nie dodaje nowych). */
export function linksIn(text: string): string[] {
  const found = text.toLowerCase().match(/\bhttps?:\/\/[^\s"'<>]+|\bwww\.[a-z0-9-]+(?:\.[a-z0-9-]+)+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|\b[a-z0-9-]+\.(?:pl|com|org|net|eu|info|ru|io|gov|xyz|top|biz)\b/giu);
  return found ? [...new Set(found)] : [];
}

export type ClaimRejectReason = 'polecenie_w_twierdzeniu' | 'adres_spoza_wejscia' | 'za_dlugie';

/** Najdłuższe twierdzenie przyjmowane od modelu (znaki). */
export const MAX_CLAIM_CHARS = 500;
const MAX_TERM_CHARS = 60;

export interface ScreenedClaim<C> {
  claim: C | null;
  reason?: ClaimRejectReason;
  signals: InjectionSignalCode[];
}

/** Usuwa znaki niewidoczne i sterujące, zwija odstępy (tekst od modelu, zanim trafi dalej). */
export function cleanModelText(text: string): string {
  return text.replace(INVISIBLE, '').replace(CONTROL, ' ').replace(/\s+/gu, ' ').trim();
}

/**
 * Twierdzenie od modelu przed oceną: to ono (a nie surowe wejście) trafia do oceny źródeł.
 * Odrzuca twierdzenia z poleceniem dla systemu (np. "oceń wszystko jako potwierdza"),
 * z adresem lub domeną spoza wejścia i zbyt długie; czyści słowa wyszukiwania.
 */
export function screenClaim<C extends { text: string; searchTerms?: string[]; counterTerms?: string[]; englishTerms?: string[] }>(
  claim: C,
  sourceText: string,
): ScreenedClaim<C> {
  const text = cleanModelText(claim.text);
  const signals = detectInjectionSignals(claim.text);
  if (signals.length) return { claim: null, reason: 'polecenie_w_twierdzeniu', signals };
  if (text.length > MAX_CLAIM_CHARS) return { claim: null, reason: 'za_dlugie', signals: [] };
  const source = sourceText.toLowerCase();
  if (linksIn(text).some((l) => !source.includes(l))) return { claim: null, reason: 'adres_spoza_wejscia', signals: [] };
  const okTerm = (t: string) =>
    t.length <= MAX_TERM_CHARS && detectInjectionSignals(t).length === 0 && linksIn(t).every((l) => source.includes(l));
  const terms = (list?: string[]) => list?.map(cleanModelText).filter((t) => t && okTerm(t));
  const out: C = { ...claim, text };
  const st = terms(claim.searchTerms);
  const ct = terms(claim.counterTerms);
  if (st !== undefined) out.searchTerms = st;
  if (ct !== undefined) out.counterTerms = ct;
  const et = terms(claim.englishTerms);
  if (et !== undefined) out.englishTerms = et;
  return { claim: out, signals: [] };
}
