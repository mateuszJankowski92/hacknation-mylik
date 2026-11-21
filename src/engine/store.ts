// Odczyt i zapis rekordów oraz zdarzeń (T5/T7). Zdarzenia nie zawierają tekstu zgłoszenia.
import type { DatabaseSync } from 'node:sqlite';
import { VerificationRecordSchema, type Channel, type VerificationRecord } from '../contracts/index';
import type { EventType } from '../db/schema';

export type EngineEventType =
  | EventType
  | 'citation_rejected'
  | 'llm_unknown_passage'
  | 'url_not_fetched'
  | 'url_fetched'
  | 'url_fetch_failed'
  | 'incident_match'
  | 'claim_rejected';

/** Dozwolone wartości w `detail`: liczby, kody, wartości logiczne (bez tekstu użytkownika). */
export type EventDetail = Record<string, string | number | boolean | null | string[]>;

export interface EngineStore {
  getRecord(id: string): VerificationRecord | null;
  /** INSERT OR IGNORE po `id`; zwraca true, gdy rekord został faktycznie zapisany. */
  insertRecord(record: VerificationRecord): boolean;
  logEvent(type: EngineEventType, e: { recordId?: string | null; channel?: Channel; detail?: EventDetail }): void;
}

export function createStore(db: DatabaseSync, now: () => Date): EngineStore {
  const selectRecord = db.prepare('SELECT json FROM records WHERE id = ?');
  const insertRecord = db.prepare(
    'INSERT OR IGNORE INTO records(id, input_hash, corpus_version, created_at, json) VALUES (?, ?, ?, ?, ?)',
  );
  const insertEvent = db.prepare(
    'INSERT INTO events(ts, record_id, channel, type, detail) VALUES (?, ?, ?, ?, ?)',
  );
  return {
    getRecord(id) {
      const row = selectRecord.get(id) as { json: string } | undefined;
      if (!row) return null;
      const parsed = VerificationRecordSchema.safeParse(JSON.parse(row.json));
      return parsed.success ? parsed.data : null;
    },
    insertRecord(record) {
      const valid = VerificationRecordSchema.parse(record);
      const res = insertRecord.run(
        valid.id,
        valid.inputHash,
        valid.corpusVersion,
        valid.createdAt,
        JSON.stringify(valid),
      );
      return Number(res.changes) > 0;
    },
    logEvent(type, e) {
      insertEvent.run(
        now().toISOString(),
        e.recordId ?? null,
        e.channel ?? null,
        type,
        e.detail ? JSON.stringify(e.detail) : null,
      );
    },
  };
}
