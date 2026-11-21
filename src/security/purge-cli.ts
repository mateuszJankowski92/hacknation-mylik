import { loadConfig } from '../config';
import { openDb } from '../db/open';
import { purgeAllSessionData, purgeOlderThan } from './retention';

function main(): void {
	const config = loadConfig();
	const db = openDb(config.dbPath);
	const argument = process.argv[2];
	const result = argument === '--all' ? purgeAllSessionData(db) : purgeOlderThan(db, config.retentionDays);
	console.log(`Usunięto rekordów: ${result.records}, zdarzeń: ${result.events}`);
	db.close();
}

main();
