import { createHash } from 'node:crypto';

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Klucz rekordu: sha256 hex z `normalizedInput + "\n" + corpusVersion`. */
export function computeRecordKey(normalizedInput: string, corpusVersion: string): string {
  return sha256Hex(`${normalizedInput}\n${corpusVersion}`);
}
