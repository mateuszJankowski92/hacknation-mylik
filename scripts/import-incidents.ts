import { existsSync, statSync } from 'node:fs';
import { findIncidentsFile, loadIncidentsFile } from '../src/corpus/incidents';

const arg = process.argv[2];
const path = arg && existsSync(arg) && statSync(arg).isFile() ? arg : findIncidentsFile(arg);

if (!path) {
	console.log('Nie znaleziono pliku bazy incydentów MSZ (nazwa z "incydent"/"incident", .json lub .csv). Podaj ścieżkę jako argument.');
	process.exit(0);
}

const { records, skipped } = loadIncidentsFile(path);
console.log(`Plik: ${path}`);
console.log(`Wczytano rekordów: ${records.length}, pominięto błędnych wierszy: ${skipped}`);
