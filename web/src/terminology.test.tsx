import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(HERE, '..', 'public');
const TEXT_FILE = /\.(ts|tsx|css|json|md|html)$/u;
const RETIRED_TERMS = [['mar', 'tw'], ['blind', '.?', 'spot'], ['śl', 'ep']].map((parts) => new RegExp(parts.join(''), 'iu'));

function textFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((name) => {
		const path = join(directory, name);
		if (statSync(path).isDirectory()) return textFiles(path);
		return TEXT_FILE.test(name) ? [path] : [];
	});
}

describe('terminologia: biała plama', () => {
	it('w web/src i web/public nie ma wycofanych nazw miejsca bez opisu', () => {
		const offenders = [...textFiles(HERE), ...textFiles(PUBLIC)].flatMap((file) => {
			const text = readFileSync(file, 'utf8');
			return RETIRED_TERMS.filter((term) => term.test(text)).map((term) => `${relative(HERE, file)}: ${term.source}`);
		});
		expect(offenders).toEqual([]);
	});
});
