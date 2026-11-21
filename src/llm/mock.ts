/**
 * Dostawca `mock`: deterministyczny, bez sieci i bez klucza.
 * Służy do testów i do uruchomienia całości bez klucza. Nie weryfikuje faktów,
 * stosuje proste reguły leksykalne. Wynik zależy wyłącznie od wejścia
 * (zero losowości, zero zegara).
 */
import type {
  AssessRequest,
  AssessResult,
  ExtractClaimsRequest,
  ExtractClaimsResult,
  LlmProvider,
  LlmUsage,
  PassageAssessment,
} from '../contracts/llm';
import type { ClaimKind, ExtractedClaim } from '../contracts/claim';
import type { Stance } from '../contracts/verdict';
import { MAX_CLAIMS, ASSESS_SYSTEM_PROMPT, EXTRACT_SYSTEM_PROMPT, buildAssessUserMessage, buildExtractUserMessage } from './prompts';

const MAX_SEARCH_TERMS = 10;
/** Minimalny udział słów kluczowych twierdzenia obecnych w zdaniu fragmentu. */
const COVERAGE_THRESHOLD = 0.34;

const STOPWORDS = new Set(
  `jest są było była były został została zostało zostały będzie będą jestem jesteś jesteśmy mamy mają mieć miał miała
  który która które którzy którego której którym tego temu tych tymi jako oraz przez przy także również jednak bardzo
  może można trzeba ponad około według wśród między nawet gdzie kiedy jeśli jeżeli żeby tylko swoje swoich swój swoja
  jego niej nich nimi sobie wszystko wszyscy wszystkie właśnie teraz więc dlatego ponieważ bowiem lecz albo natomiast
  tutaj każdy każda każde inne innych inny takie taki taka przed potem wtedy gdyż czyli choć chociaż poniżej powyżej
  dzięki wobec ostatnio sposób czego czym kogo komu nami wami tobie mnie mój moja moje twój twoja nasz nasza nasze
  wasz wasza zdaniem uważam sądzę myślę wydaje brak nieprawda fałsz
  that this with from have were been which their there about would`
    .split(/\s+/)
    .filter(Boolean),
);

const NEGATIONS = ['nie', 'nieprawda', 'fałsz', 'brak'];
const OPINION_MARKERS = ['moim zdaniem', 'uważam', 'sądzę', 'myślę, że', 'wydaje mi się', 'według mnie', 'jestem przekonany', 'jestem przekonana'];
const FORECAST_MARKERS = ['będzie', 'będą', 'wkrótce', 'w przyszłym roku', 'w przyszłości', 'prognoz', 'przewiduje się'];
const LIMIT_MARKERS = ['tylko', 'z wyjątkiem', 'do dnia', 'w przypadku'];
const IMPERATIVE_STARTS = new Set(
  `sprawdź sprawdźcie zobacz zobaczcie przeczytaj przeczytajcie udostępnij udostępnijcie kliknij napisz napiszcie powiedz
  wyślij wyślijcie podaj podajcie zignoruj ignoruj pamiętaj pamiętajcie uważaj uważajcie zrób zróbcie weź weźcie daj
  dajcie idź idźcie kup kupcie głosuj głosujcie przekaż przekażcie oceń wyjaśnij opisz`
    .split(/\s+/)
    .filter(Boolean),
);

function words(text: string): string[] {
  return text.toLocaleLowerCase('pl').match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** Bardzo prosty "rdzeń": ucięcie końcówki fleksyjnej (polski jest silnie fleksyjny). */
export function stem(word: string): string {
  const w = word.toLocaleLowerCase('pl');
  if (w.length <= 4 || /^\p{N}+$/u.test(w)) return w;
  return w.slice(0, Math.min(7, Math.max(4, w.length - 3)));
}

function keywords(text: string): string[] {
  const out: string[] = [];
  for (const w of words(text)) {
    if ((w.length > 3 || /^\p{N}+$/u.test(w)) && !STOPWORDS.has(w) && !out.includes(w)) out.push(w);
  }
  return out;
}

function hasNegation(text: string): boolean {
  const ws = words(text);
  return ws.some((w) => NEGATIONS.includes(w) || w.startsWith('fałszyw'));
}

function containsAny(text: string, markers: string[]): boolean {
  const t = ` ${text.toLocaleLowerCase('pl')} `;
  return markers.some((m) => t.includes(m));
}

/** Zdania jako dosłowne podciągi (przycięte) tekstu źródłowego. */
function sentences(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/[^.!?…\n]+[.!?…]*/g)) {
    const s = m[0].trim();
    if (s) out.push(s);
  }
  return out;
}

function classify(sentence: string): ClaimKind {
  const first = words(sentence)[0] ?? '';
  if (sentence.trimEnd().endsWith('?') || IMPERATIVE_STARTS.has(first)) return 'niejasna';
  if (containsAny(sentence, OPINION_MARKERS)) return 'opinia';
  if (containsAny(sentence, FORECAST_MARKERS)) return 'prognoza';
  return 'faktograficzna';
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function usageFor(input: string, output: unknown): LlmUsage {
  return {
    model: 'mock',
    inputTokens: estimateTokens(input),
    outputTokens: estimateTokens(JSON.stringify(output)),
    estimatedCostUsd: 0,
    latencyMs: 0,
  };
}

function coverage(claimStems: string[], sentence: string): { ratio: number; hits: number } {
  if (claimStems.length === 0) return { ratio: 0, hits: 0 };
  const sentStems = new Set(keywords(sentence).map(stem));
  let hits = 0;
  for (const s of claimStems) if (sentStems.has(s)) hits++;
  return { ratio: hits / claimStems.length, hits };
}

export class MockLlmProvider implements LlmProvider {
  readonly name = 'mock';

  async extractClaims(req: ExtractClaimsRequest): Promise<ExtractClaimsResult> {
    const claims: ExtractedClaim[] = [];
    for (const s of sentences(req.text)) {
      if (claims.length >= MAX_CLAIMS) break;
      if (words(s).length < 4) continue;
      const kind = classify(s);
      const kws = keywords(s);
      const terms: string[] = [];
      for (const k of kws) {
        for (const t of [k, stem(k)]) if (!terms.includes(t)) terms.push(t);
      }
      const claim: ExtractedClaim = { id: `c${claims.length + 1}`, text: s, kind };
      if (terms.length > 0) claim.searchTerms = terms.slice(0, MAX_SEARCH_TERMS);
      claims.push(claim);
    }
    const out = { claims };
    return { claims, usage: usageFor(EXTRACT_SYSTEM_PROMPT + buildExtractUserMessage(req), out) };
  }

  async assessPassages(req: AssessRequest): Promise<AssessResult> {
    const claimStems = [...new Set(keywords(req.claim.text).map(stem))];
    const claimNegated = hasNegation(req.claim.text);
    const minHits = Math.min(2, claimStems.length);

    const assessments: PassageAssessment[] = req.passages.map((p) => {
      let best = '';
      let bestRatio = 0;
      let bestHits = 0;
      for (const s of sentences(p.text)) {
        const c = coverage(claimStems, s);
        if (c.ratio > bestRatio) {
          best = s;
          bestRatio = c.ratio;
          bestHits = c.hits;
        }
      }
      if (claimStems.length === 0 || bestRatio < COVERAGE_THRESHOLD || bestHits < minHits) {
        return { passageId: p.id, stance: 'bez_zwiazku', quote: '' };
      }
      let stance: Stance = 'potwierdza';
      if (hasNegation(best) !== claimNegated) stance = 'obala';
      else if (containsAny(p.text, LIMIT_MARKERS)) stance = 'kontekst';
      return { passageId: p.id, stance, quote: best };
    });

    const out = { assessments };
    return { assessments, usage: usageFor(ASSESS_SYSTEM_PROMPT + buildAssessUserMessage(req), out) };
  }
}
