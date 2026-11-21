import type { DatabaseSync } from 'node:sqlite';

export const SCHEMA_VERSION = 1;

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

export function migrate(db: DatabaseSync): void {
  db.exec(SCHEMA_SQL);
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
