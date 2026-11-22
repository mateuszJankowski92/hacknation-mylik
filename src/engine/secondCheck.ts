// DRUGA KONTROLA (zad. 45, "druga para oczu"): po zbudowaniu dowodów, przed tabelą reguł, inny model niż
// model oceny sprawdza każdą ROZSTRZYGAJĄCĄ parę (twierdzenie, dosłowny cytat, stanowisko): czy ten cytat sam
// w sobie uzasadnia to stanowisko. Odpowiedź "tak" zostawia dowód; "nie" albo "nie wiem" zamienia go w tło
// (`kontekst`). Krok NIGDY nie dodaje dowodu ani nie zmienia stanowiska na inne rozstrzygające, więc nie może
// podnieść werdyktu. Błąd albo przekroczenie czasu: dowody bez zmian i jawna nota w rekordzie.
//
// Dostawca to dowolna bramka wsparcia (`SupportGate`: Anthropic z innym modelem albo Jev) wołana osobno
// dla każdej pary, równolegle. Ten sam prompt i te same zabezpieczenia co bramka wsparcia (twierdzenie
// i cytat jako dane, bez fragmentu, źródła i oceny pierwszego modelu); relacja zgodna ze stanowiskiem = "tak",
// `nie_rozstrzyga` = "nie wiem", inna relacja = "nie".
import type { LlmUsage } from '../contracts/index';
import { normalizeVerdicts, type SupportGate } from './supportGate';

export const SECOND_CHECK_DEFAULT_TIMEOUT_MS = 8_000;
export const SECOND_CHECK_DEFAULT_MODEL = 'claude-sonnet-5-5';
export const SECOND_CHECK_UNAVAILABLE_NOTICE =
  'Druga kontrola cytatów (inny model) była niedostępna. Dowody zostały bez dodatkowego sprawdzenia.';
export const secondCheckDroppedLimitation = (n: number): string =>
  `Drugi model nie uznał ${n === 1 ? '1 cytatu' : `${n} cytatów`} za wystarczające uzasadnienie, więc ${n === 1 ? 'pokazuję go' : 'pokazuję je'} tylko jako tło.`;

export type SecondCheckAnswer = 'tak' | 'nie' | 'nie_wiem';

export interface SecondCheck {
  /** Model drugiej kontroli (musi różnić się od modelu oceny). */
  readonly model: string;
  readonly gate: SupportGate;
  readonly timeoutMs: number;
}

export interface SecondCheckPair {
  claim: string;
  quote: string;
  stance: 'potwierdza' | 'obala' | 'rozbieznosc_kontekstu';
}

export type SecondCheckOutcome =
  | { ok: true; answers: SecondCheckAnswer[]; ms: number; usage: LlmUsage[] }
  | { ok: false; reason: 'blad' | 'czas'; ms: number; usage: LlmUsage[] };

/** Wszystkie pary równolegle, jeden wspólny limit czasu. Brak par = wynik pusty bez wywołań. */
export async function runSecondCheck(check: SecondCheck, pairs: SecondCheckPair[], now: () => number = Date.now): Promise<SecondCheckOutcome> {
  const started = now();
  const usage: LlmUsage[] = [];
  if (pairs.length === 0) return { ok: true, answers: [], ms: 0, usage };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'czas'>((res) => {
    timer = setTimeout(() => res('czas'), Math.max(1, check.timeoutMs));
  });
  const work = Promise.all(
    pairs.map(async (p): Promise<SecondCheckAnswer> => {
      const r = await check.gate.checkSupport({ claim: p.claim, quotes: [p.quote] });
      if (r?.usage) usage.push(r.usage);
      const v = normalizeVerdicts(r, 1)[0]!;
      if (v.relation === p.stance) return 'tak';
      return v.relation === 'nie_rozstrzyga' ? 'nie_wiem' : 'nie';
    }),
  );
  work.catch(() => {});
  try {
    const out = await Promise.race([work, timeout]);
    if (out === 'czas') return { ok: false, reason: 'czas', ms: now() - started, usage };
    return { ok: true, answers: out, ms: now() - started, usage };
  } catch {
    return { ok: false, reason: 'blad', ms: now() - started, usage };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type SecondCheckSwitch = 'on' | 'off';
export type SecondCheckProviderName = 'anthropic' | 'jev';

export interface SecondCheckEnvConfig {
  enabled: boolean;
  provider: SecondCheckProviderName;
  model: string;
  timeoutMs: number;
}

/** SECOND_CHECK=off|on (domyślnie off), SECOND_CHECK_PROVIDER=anthropic|jev, SECOND_CHECK_MODEL, SECOND_CHECK_TIMEOUT_MS. */
export function secondCheckConfigFromEnv(env: Record<string, string | undefined> = process.env): SecondCheckEnvConfig {
  const enabled = (env.SECOND_CHECK ?? '').trim().toLowerCase() === 'on';
  const provider: SecondCheckProviderName = (env.SECOND_CHECK_PROVIDER ?? '').trim().toLowerCase() === 'jev' ? 'jev' : 'anthropic';
  const model = env.SECOND_CHECK_MODEL?.trim() || (provider === 'anthropic' ? SECOND_CHECK_DEFAULT_MODEL : '');
  const t = Number(env.SECOND_CHECK_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(t) && t >= 500 && t <= 60_000 ? Math.floor(t) : SECOND_CHECK_DEFAULT_TIMEOUT_MS;
  return { enabled, provider, model, timeoutMs };
}

/** Model drugiej kontroli musi być inny niż model oceny (porównanie bez daty wersji i wielkości liter). */
export function sameModel(a: string, b: string): boolean {
  const k = (s: string) => s.trim().toLowerCase().replace(/-\d{8}$/u, '');
  return k(a) === k(b);
}
