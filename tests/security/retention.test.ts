import { describe, expect, it } from 'vitest';
import { openDb } from '../../src/db/open';
import { purgeAllSessionData, purgeOlderThan } from '../../src/security/index';

function seed() {
  const db = openDb(':memory:');
  const insertRecord = db.prepare('INSERT INTO records (id, input_hash, corpus_version, created_at, json) VALUES (?, ?, ?, ?, ?)');
  const insertEvent = db.prepare('INSERT INTO events (ts, type, detail) VALUES (?, ?, ?)');
  insertRecord.run('old', 'h1', 'v', '2026-01-01T00:00:00.000Z', '{}');
  insertRecord.run('new', 'h2', 'v', '2026-11-20T00:00:00.000Z', '{}');
  insertEvent.run('2026-01-01T00:00:00.000Z', 'verify_start', '{}');
  insertEvent.run('2026-11-20T00:00:00.000Z', 'verify_start', '{}');
  return db;
}

describe('retencja', () => {
  it('usuwa tylko dane starsze niż limit', () => {
    const db = seed();
    const result = purgeOlderThan(db, 7, new Date('2026-11-21T00:00:00.000Z'));
    expect(result).toEqual({ records: 1, events: 1 });
    const left = db.prepare('SELECT id FROM records').all() as Array<{ id: string }>;
    expect(left.map((r) => r.id)).toEqual(['new']);
  });

  it('odrzuca ujemny wiek', () => {
    expect(() => purgeOlderThan(seed(), -1)).toThrow(RangeError);
  });

  it('purgeAllSessionData czyści wszystko', () => {
    const db = seed();
    expect(purgeAllSessionData(db)).toEqual({ records: 2, events: 2 });
    expect((db.prepare('SELECT COUNT(*) AS n FROM events').get() as { n: number }).n).toBe(0);
  });
});
