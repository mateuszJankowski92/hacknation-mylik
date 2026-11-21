/**
 * Schemat odpowiedzi bramki wsparcia (structured outputs). Interfejs bramki: src/engine/supportGate.ts.
 * Inny dostawca (np. model lokalny) implementuje `SupportGate.checkSupport` i może użyć tego schematu
 * oraz promptu `SUPPORT_GATE_SYSTEM_PROMPT`.
 */
import { z } from 'zod';
import { MismatchKindSchema } from '../contracts/index';
import { SUPPORT_RELATIONS, type SupportCheckVerdict } from '../engine/supportGate';

export const SupportGateOutputSchema = z.object({
  items: z.array(
    z.object({
      index: z.number().int(),
      relation: z.enum(SUPPORT_RELATIONS),
      mismatch: MismatchKindSchema.optional(),
      reason: z.string(),
    }),
  ),
});
export type SupportGateOutput = z.infer<typeof SupportGateOutputSchema>;

/** Odpowiedź modelu -> oceny w kolejności cytatów. Brak oceny = `nie_rozstrzyga`. */
export function verdictsFromOutput(out: SupportGateOutput, count: number): SupportCheckVerdict[] {
  const verdicts: SupportCheckVerdict[] = Array.from({ length: count }, () => ({ relation: 'nie_rozstrzyga', reason: 'brak oceny' }));
  for (const it of out.items) {
    if (it.index < 0 || it.index >= count) continue;
    verdicts[it.index] =
      it.relation === 'rozbieznosc_kontekstu'
        ? { relation: it.relation, ...(it.mismatch ? { mismatch: it.mismatch } : {}), reason: it.reason }
        : { relation: it.relation, reason: it.reason };
  }
  return verdicts;
}
