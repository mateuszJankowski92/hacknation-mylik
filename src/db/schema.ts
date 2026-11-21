import type { DatabaseSync } from 'node:sqlite';

export const SCHEMA_VERSION = 3;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  publisher TEXT NOT NULL,
  domain TEXT NOT NULL,
  source_type TEXT NOT NULL,
  license TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at TEXT,
  fetched_at TEXT NOT NULL,
  -- Data (YYYY-MM-DD), do której treść jest aktualna; NULL = nieokreślona.
  valid_until TEXT,
  corpus_version TEXT NOT NULL,
  content_sha256 TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS documents_source_idx ON documents(source_id);

CREATE TABLE IF NOT EXISTS passages (
  rowid INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  text TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS passages_document_idx ON passages(document_id);

CREATE VIRTUAL TABLE IF NOT EXISTS passages_fts USING fts5(
  text,
  content='passages',
  content_rowid='rowid',
  tokenize='trigram case_sensitive 0'
);

CREATE TRIGGER IF NOT EXISTS passages_ai AFTER INSERT ON passages BEGIN
  INSERT INTO passages_fts(rowid, text) VALUES (new.rowid, new.text);
END;
CREATE TRIGGER IF NOT EXISTS passages_ad AFTER DELETE ON passages BEGIN
  INSERT INTO passages_fts(passages_fts, rowid, text) VALUES ('delete', old.rowid, old.text);
END;
CREATE TRIGGER IF NOT EXISTS passages_au AFTER UPDATE ON passages BEGIN
  INSERT INTO passages_fts(passages_fts, rowid, text) VALUES ('delete', old.rowid, old.text);
  INSERT INTO passages_fts(rowid, text) VALUES (new.rowid, new.text);
END;

CREATE TABLE IF NOT EXISTS corpus_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  input_hash TEXT NOT NULL,
  corpus_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS records_created_idx ON records(created_at);

-- Log zdarzeń: detail to JSON bez danych osobowych i sekretów.
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  record_id TEXT NULL,
  channel TEXT,
  type TEXT NOT NULL,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS events_ts_idx ON events(ts);

CREATE TABLE IF NOT EXISTS cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_text TEXT NOT NULL,
  normalized TEXT NOT NULL,
  signature TEXT NOT NULL,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  report_count INTEGER NOT NULL DEFAULT 1,
  channels TEXT NOT NULL DEFAULT '{}',
  state TEXT NOT NULL DEFAULT 'nowa' CHECK (state IN ('nowa', 'w_toku', 'zamknieta')),
  note TEXT NOT NULL DEFAULT '',
  search_info TEXT NOT NULL DEFAULT '{}',
  forwarded_to TEXT NULL,
  forwarded_at TEXT NULL,
  forwarded_report_count INTEGER NULL
);
CREATE INDEX IF NOT EXISTS cases_state_idx ON cases(state);
CREATE INDEX IF NOT EXISTS cases_last_seen_idx ON cases(last_seen);

CREATE TABLE IF NOT EXISTS case_records (
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  linked_at TEXT NOT NULL,
  PRIMARY KEY (case_id, record_id)
);
CREATE INDEX IF NOT EXISTS case_records_record_idx ON case_records(record_id);

-- Rola wyglądu rekordu (zad. 13b, D): zapisana raz, ten sam /r/<id> zawsze ma tę samą rolę. Poza rekordem silnika.
CREATE TABLE IF NOT EXISTS record_roles (
  record_id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  serious INTEGER NOT NULL DEFAULT 0,
  reasons TEXT NOT NULL DEFAULT '[]',
  decided_at TEXT NOT NULL
);
`;

/** Typy zdarzeń w logu (rozszerzalne). */
export type EventType =
  | 'verify_start'
  | 'verify_ok'
  | 'abstain'
  | 'state'
  | 'injection_signal'
  | 'llm_error'
  | 'cache_hit'
  | (string & {});

function hasColumn(db: DatabaseSync, table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return cols.some((c) => c.name === column);
}

export function migrate(db: DatabaseSync): void {
  db.exec(SCHEMA_SQL);
  // v1 -> v2: kolumna `documents.valid_until` w istniejących bazach.
  if (!hasColumn(db, 'documents', 'valid_until')) db.exec('ALTER TABLE documents ADD COLUMN valid_until TEXT');
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
