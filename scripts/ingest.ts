import { resolve } from 'node:path';
import { openDb } from '../src/db/open';
import { ingestCatalog } from '../src/corpus/ingest';

function readArg(name: string, fallback: string): string {
	const index = process.argv.indexOf(name);
	return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function main(): void {
	const rootDir = process.cwd();
	const catalogPath = resolve(rootDir, readArg('--catalog', 'data/sources.json'));
	const dbPath = readArg('--db', 'data/mylik.sqlite');
	const db = openDb(dbPath === ':memory:' ? dbPath : resolve(rootDir, dbPath));
	const { documents, passages, version } = ingestCatalog(db, catalogPath, rootDir);
	console.log(`documents=${documents} passages=${passages} version=${version}`);
	db.close();
}

main();
