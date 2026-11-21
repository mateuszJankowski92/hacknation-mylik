import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { parseEuvsdisinfoCases, type KnownOpRecord, type KnownOpsParseResult } from './euvsdisinfo';
import { parseIncidents, type ParseResult } from './parse';

export const DEFAULT_INCIDENTS_DIR = '/Users/marcinowczarzak/Documents/artifacts/hacknation/';
export const INCIDENT_FILE_PATTERN = /incyd|incident/i;

export function findIncidentsFile(dir: string = DEFAULT_INCIDENTS_DIR): string | null {
	if (!existsSync(dir)) return null;
	const candidates = readdirSync(dir)
		.filter((name) => INCIDENT_FILE_PATTERN.test(name) && ['.json', '.csv'].includes(extname(name).toLowerCase()))
		.sort();
	return candidates[0] ? join(dir, candidates[0]) : null;
}

export function loadIncidentsFile(path: string): ParseResult {
	const format = extname(path).toLowerCase() === '.csv' ? 'csv' : 'json';
	return parseIncidents(readFileSync(path, 'utf8'), format);
}

/** Katalog z przypadkami znanych operacji informacyjnych (pliki zapisane przez scripts/fetch-euvsdisinfo.ts). */
export const DEFAULT_KNOWN_OPS_DIR = 'data/known-ops';

/**
 * Wczytuje wszystkie pliki *.json z katalogu (poza zaczynającymi się od "_", np. _terms.json).
 * Brak katalogu daje pusty wynik. Duplikaty id są pomijane (liczy się pierwszy).
 */
export function loadKnownOpsDir(dir: string = DEFAULT_KNOWN_OPS_DIR): KnownOpsParseResult {
	if (!existsSync(dir)) return { records: [], skipped: 0 };
	const seen = new Set<string>();
	const records: KnownOpRecord[] = [];
	let skipped = 0;
	const files = readdirSync(dir).filter((name) => extname(name).toLowerCase() === '.json' && !name.startsWith('_')).sort();
	for (const name of files) {
		const result = parseEuvsdisinfoCases(readFileSync(join(dir, name), 'utf8'));
		skipped += result.skipped;
		for (const record of result.records) {
			if (seen.has(record.id)) continue;
			seen.add(record.id);
			records.push(record);
		}
	}
	return { records, skipped };
}
