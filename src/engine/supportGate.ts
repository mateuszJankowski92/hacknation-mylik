// BRAMKA WSPARCIA: drugie, niezależne sprawdzenie dowodu rozstrzygającego.
// Dostaje WYŁĄCZNIE twierdzenie i sam cytat (bez fragmentu, źródła, tytułu i oceny pierwszego wywołania)
// i odpowiada, co ten cytat sam w sobie robi z twierdzeniem. Dowód, którego cytat sam nie rozstrzyga, odpada;
// gdy nie zostaje żaden, silnik wstrzymuje się (zasada: wstrzymanie lepsze niż słaby dowód).
// Interfejs jest wymienny: implementacja LLM (Anthropic, atrapa) w src/llm, później np. model lokalny.
import type { LlmUsage, MismatchKind } from '../contracts/index';

/** Relacja ustalona przez bramkę. `nie_rozstrzyga`: tło, inna sprawa, tylko część twierdzenia, brak podmiotu. */
export const SUPPORT_RELATIONS = ['potwierdza', 'obala', 'rozbieznosc_kontekstu', 'nie_rozstrzyga'] as const;
export type SupportRelation = (typeof SUPPORT_RELATIONS)[number];

export interface SupportCheckRequest {
  claim: string;
  /** Cytaty do oceny, każdy osobno (kolejność = indeks w odpowiedzi). */
  quotes: string[];
}

export interface SupportCheckVerdict {
  relation: SupportRelation;
  /** Tylko przy `rozbieznosc_kontekstu`. */
  mismatch?: MismatchKind;
  /** Krótkie uzasadnienie (log zdarzeń, nie trafia do obywatela). */
  reason: string;
}

export interface SupportCheckResult {
  /** Dokładnie jedna ocena na cytat, w kolejności `quotes`. */
  verdicts: SupportCheckVerdict[];
  usage?: LlmUsage;
}

export interface SupportGate {
  readonly name: string;
  checkSupport(req: SupportCheckRequest): Promise<SupportCheckResult>;
}

export function isSupportGate(x: unknown): x is SupportGate {
  return !!x && typeof (x as { checkSupport?: unknown }).checkSupport === 'function';
}

/** Ujednolica odpowiedź bramki: brak oceny albo zła długość = `nie_rozstrzyga` (ostrożnie). */
export function normalizeVerdicts(result: SupportCheckResult | undefined, count: number): SupportCheckVerdict[] {
  const list = Array.isArray(result?.verdicts) ? result!.verdicts : [];
  return Array.from({ length: count }, (_, i) => {
    const v = list[i];
    if (!v || !SUPPORT_RELATIONS.includes(v.relation)) return { relation: 'nie_rozstrzyga' as const, reason: 'brak oceny bramki' };
    if (v.relation === 'rozbieznosc_kontekstu')
      return { relation: v.relation, ...(v.mismatch ? { mismatch: v.mismatch } : {}), reason: String(v.reason ?? '') };
    return { relation: v.relation, reason: String(v.reason ?? '') };
  });
}
