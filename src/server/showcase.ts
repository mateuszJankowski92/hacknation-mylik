import { existsSync, readFileSync } from 'node:fs';
import {
  VerificationRecordSchema,
  type Engine,
  type VerificationRecord,
  type VerifyInput,
  type VerifyOutcome,
} from '../contracts/index';
import { createProgressEmitter, type ProgressEngine, type VerifyOptions } from '../engine/progress';
import { isShowcaseAddress, normalizeShowcaseText, wordOverlap } from '../shared/showcaseText';

export const SHOWCASE_META_TAG = '<meta name="mylik-pokaz" content="1" />';
export const SHOWCASE_PATH_API = '/api/pokaz';
const ABSTAIN = 'brak_wystarczajacych_dowodow';

export type ShowcaseMatch = 'exact' | 'substitute' | 'refused';

export interface ShowcaseQuestion {
  id: string;
  text: string;
  inputKind: 'tekst' | 'url';
  verdicts: string[];
  answered: boolean;
}

export interface ShowcaseEngineOptions {
  logEvent?: (type: string, detail: Record<string, string | number | boolean | null>) => void;
  publicBaseUrl?: string;
}

export function showcaseRefusalMessage(publicBaseUrl?: string): string {
  const base = 'To wersja pokazowa po hackathonie: nowych pytań już nie sprawdzam.';
  return publicBaseUrl ? `${base} Gotowe przykłady są na stronie: ${publicBaseUrl}` : base;
}

export function loadShowcase(path: string, warn: (line: string) => void = () => undefined): VerificationRecord[] {
  if (!existsSync(path)) {
    warn('Uwaga: brak pliku trybu pokazowego (SHOWCASE_PATH); tryb pokazowy działa bez rekordów.');
    return [];
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    warn('Uwaga: nie udało się odczytać pliku trybu pokazowego; tryb pokazowy działa bez rekordów.');
    return [];
  }
  const list = (raw as { records?: unknown } | null)?.records;
  if (!Array.isArray(list)) {
    warn('Uwaga: plik trybu pokazowego nie ma listy records; tryb pokazowy działa bez rekordów.');
    return [];
  }
  const records: VerificationRecord[] = [];
  const seen = new Set<string>();
  list.forEach((item, index) => {
    const parsed = VerificationRecordSchema.safeParse(item);
    if (!parsed.success) {
      warn(`Uwaga: rekord ${index} w pliku trybu pokazowego jest błędny; pomijam.`);
      return;
    }
    if (seen.has(parsed.data.id)) return;
    seen.add(parsed.data.id);
    records.push(parsed.data);
  });
  return records;
}

function verdictsOf(record: VerificationRecord): string[] {
  return [...new Set(record.claims.map((claim) => claim.verdict))];
}

function isAnswered(record: VerificationRecord): boolean {
  return record.claims.some((claim) => claim.verdict !== ABSTAIN);
}

export function showcaseQuestions(records: readonly VerificationRecord[]): ShowcaseQuestion[] {
  return records.map((record) => ({
    id: record.id,
    text: record.maskedInput,
    inputKind: record.inputKind,
    verdicts: verdictsOf(record),
    answered: isAnswered(record),
  }));
}

function inputAddress(input: VerifyInput): string | null {
  if (input.url !== undefined) return input.url.trim();
  if (input.text !== undefined && isShowcaseAddress(input.text)) return input.text.trim();
  return null;
}

function pickSubstitute(records: readonly VerificationRecord[], input: VerifyInput): VerificationRecord {
  const address = inputAddress(input);
  if (address !== null) {
    const page = records.find((record) => record.inputKind === 'url');
    if (page) return page;
  }
  const typed = input.text ?? input.url ?? '';
  let best: VerificationRecord | null = null;
  let bestScore = 0;
  for (const record of records) {
    const score = wordOverlap(typed, record.maskedInput);
    if (score > bestScore || (score === bestScore && score > 0 && best && !isAnswered(best) && isAnswered(record))) {
      best = record;
      bestScore = score;
    }
  }
  if (best && bestScore > 0) return best;
  return records.find((record) => record.claims.some((claim) => claim.verdict === 'potwierdzone')) ?? records[0]!;
}

function findExact(records: readonly VerificationRecord[], input: VerifyInput): VerificationRecord | null {
  const address = inputAddress(input);
  if (address !== null) return records.find((record) => record.maskedInput.trim() === address) ?? null;
  const typed = normalizeShowcaseText(input.text ?? '');
  if (typed === '') return null;
  return records.find((record) => normalizeShowcaseText(record.maskedInput) === typed) ?? null;
}

export function createShowcaseEngine(records: readonly VerificationRecord[], options: ShowcaseEngineOptions = {}): ProgressEngine {
  const byId = new Map(records.map((record) => [record.id, record]));
  const log = (match: ShowcaseMatch, channel: string) => {
    try {
      options.logEvent?.('showcase', { match, channel });
    } catch {
    }
  };
  const ready = (record: VerificationRecord, opts?: VerifyOptions): VerifyOutcome => {
    createProgressEmitter(opts?.onProgress).done(record.id, true);
    return { kind: 'record', record, cached: true };
  };
  return {
    getRecord: (id: string) => byId.get(id) ?? null,
    async verify(input: VerifyInput, opts?: VerifyOptions): Promise<VerifyOutcome> {
      const exact = findExact(records, input);
      if (exact) {
        log('exact', input.channel);
        return ready(exact, opts);
      }
      if (input.channel === 'www' && records.length > 0) {
        log('substitute', input.channel);
        return ready(pickSubstitute(records, input), opts);
      }
      log('refused', input.channel);
      return {
        kind: 'state',
        state: 'brak_mozliwosci_sprawdzenia',
        message: showcaseRefusalMessage(options.publicBaseUrl),
        detail: 'showcase',
      };
    },
  } as Engine as ProgressEngine;
}

export function addShowcaseMeta(html: string): string {
  if (html.includes('name="mylik-pokaz"')) return html;
  return html.replace('</head>', `    ${SHOWCASE_META_TAG}\n  </head>`);
}
