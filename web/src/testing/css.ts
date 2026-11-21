import { readFileSync } from 'node:fs';

const SCALED_VALUE = /calc\(((?:[^()]|\([^()]*\))+) \* var\(--ts\)\)/g;

export function unscaleTextSize(css: string): string {
	return css.replace(SCALED_VALUE, '$1');
}

export function readUnscaled(path: string, encoding: BufferEncoding = 'utf8'): string {
	return unscaleTextSize(readFileSync(path, encoding));
}
