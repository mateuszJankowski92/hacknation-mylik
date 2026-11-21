import { createCaseStore } from '../cases/index';
import { loadConfig } from '../config';
import { openDb } from '../db/open';
import { purgeAllSessionData, purgeOlderThan } from './retention';

function main(): void {
	const config = loadConfig();
	const db = openDb(config.dbPath);
	const cases = createCaseStore(db);
	const argument = process.argv[2];
	const result = argument === '--all' ? purgeAllSessionData(db) : purgeOlderThan(db, config.retentionDays);
	const purgedCases = argument === '--all' ? cases.purgeAll() : cases.purgeOlderThan(config.caseRetentionDays);
	console.log(`Usunięto rekordów: ${result.records}, zdarzeń: ${result.events}, spraw urzędnika: ${purgedCases}`);
	db.close();
}

main();
