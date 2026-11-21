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
  | 'claim_rejected'
  | 'role_steering_ignored'
  | 'live_search'
  | 'factcheck_search'
  | 'factcheck_unavailable'
  | 'review_selection'
  | 'record_expired';

/** Dozwolone wartości w `detail`: liczby, kody, wartości logiczne (bez tekstu użytkownika). */
export type EventDetail = Record<string, string | number | boolean | null | string[]>;

export interface EngineStore {
  getRecord(id: string): VerificationRecord | null;
  /** INSERT OR IGNORE po `id`; zwraca true, gdy rekord został faktycznie zapisany. */
  insertRecord(record: VerificationRecord): boolean;
  logEvent(type: EngineEventType, e: { recordId?: string | null; channel?: Channel; detail?: EventDetail }): void;
}

/** Czy dowody rekordu zawierają wpis z indeksu Google Fact Check Tools (dokument `fc:...`). */
export function hasIndexEvidence(record: VerificationRecord): boolean {
  return record.claims.some((c) => c.evidence.some((e) => e.source.documentId.startsWith('fc:')));
}

export interface StoreOptions {
  /**
   * Czas życia rekordu z wpisem z indeksu Google (ms). Brak = jak inne rekordy (RETENTION_DAYS).
   * 0 = taki rekord nie jest zapisywany. Wygasanie leniwe: przy odczycie starszy rekord jest usuwany
   * i traktowany jak nieistniejący.
   */
  indexRecordTtlMs?: number;
  onExpired?: (id: string) => void;
}

export function createStore(db: DatabaseSync, now: () => Date, opts: StoreOptions = {}): EngineStore {
  const ttl = opts.indexRecordTtlMs;
  const selectRecord = db.prepare('SELECT json FROM records WHERE id = ?');
  const deleteRecord = db.prepare('DELETE FROM records WHERE id = ?');
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
      if (!parsed.success) return null;
      if (ttl !== undefined && hasIndexEvidence(parsed.data)) {
        const age = now().getTime() - Date.parse(parsed.data.createdAt);
        if (ttl <= 0 || !(age <= ttl)) {
          deleteRecord.run(id);
          opts.onExpired?.(id);
          return null;
        }
      }
      return parsed.data;
    },
    insertRecord(record) {
      const valid = VerificationRecordSchema.parse(record);
      // TTL 0: rekord z wpisem z indeksu żyje tylko w czasie odpowiedzi (nie trafia do bazy).
      if (ttl !== undefined && ttl <= 0 && hasIndexEvidence(valid)) return false;
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
