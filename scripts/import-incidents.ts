import { existsSync, statSync } from 'node:fs';
import { DEFAULT_KNOWN_OPS_DIR, findIncidentsFile, loadIncidentsFile, loadKnownOpsDir } from '../src/corpus/incidents';

// Użycie: tsx scripts/import-incidents.ts [plik|katalog MSZ] [--known-ops katalog]
const knownOpsIndex = process.argv.indexOf('--known-ops');
const knownOpsDir = knownOpsIndex >= 0 ? (process.argv[knownOpsIndex + 1] ?? DEFAULT_KNOWN_OPS_DIR) : DEFAULT_KNOWN_OPS_DIR;
const arg = process.argv.slice(2).find((value, i, all) => !value.startsWith('--') && all[i - 1] !== '--known-ops');
const path = arg && existsSync(arg) && statSync(arg).isFile() ? arg : findIncidentsFile(arg);

if (!path) {
	console.log('Nie znaleziono pliku bazy incydentów MSZ (nazwa z "incydent"/"incident", .json lub .csv). Podaj ścieżkę jako argument.');
} else {
	const { records, skipped } = loadIncidentsFile(path);
	console.log(`Plik: ${path}`);
	console.log(`Wczytano rekordów: ${records.length}, pominięto błędnych wierszy: ${skipped}`);
}

const knownOps = loadKnownOpsDir(knownOpsDir);
console.log(`Znane operacje informacyjne (EUvsDisinfo) w ${knownOpsDir}: ${knownOps.records.length}, pominięto: ${knownOps.skipped}`);
