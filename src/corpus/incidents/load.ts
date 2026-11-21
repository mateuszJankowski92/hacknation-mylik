import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
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
