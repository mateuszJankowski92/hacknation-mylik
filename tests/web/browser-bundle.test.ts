import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, type LogOptions, type Logger, type Rollup } from 'vite';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');
const BUILD_TIMEOUT_MS = 120_000;
const EXTERNALIZED_WARNING = /externalized for browser compatibility/i;
const NODE_BUILTIN_REFERENCE = /browser-external|["'`]node:[a-z_/]+["'`]/;

function isOutput(value: unknown): value is Rollup.RollupOutput {
	return typeof value === 'object' && value !== null && 'output' in value;
}

async function buildBrowserBundle(): Promise<{ warnings: string[]; code: string }> {
	const warnings: string[] = [];
	const record = (msg: string) => {
		warnings.push(msg);
	};
	const logger: Logger = {
		hasWarned: false,
		info: () => undefined,
		warn: (msg: string, _options?: LogOptions) => record(msg),
		warnOnce: (msg: string, _options?: LogOptions) => record(msg),
		error: (msg: string, _options?: LogOptions) => record(msg),
		clearScreen: () => undefined,
		hasErrorLogged: () => false,
	};
	const result = await build({
		root: resolve(ROOT, 'web'),
		configFile: resolve(ROOT, 'vite.config.ts'),
		customLogger: logger,
		logLevel: 'warn',
		build: {
			write: false,
			outDir: resolve(ROOT, 'dist/web-bundle-check'),
			emptyOutDir: false,
			reportCompressedSize: false,
			rollupOptions: {
				onLog: (_level, log) => {
					record(log.message);
				},
			},
		},
	});
	const outputs = (Array.isArray(result) ? result : [result]).filter(isOutput);
	const code = outputs
		.flatMap((o) => o.output)
		.map((chunk) => (chunk.type === 'chunk' ? chunk.code : ''))
		.join('\n');
	return { warnings, code };
}

describe('pakiet przeglądarki (web)', () => {
	it(
		'build nie zgłasza modułów node:* wyeksternalizowanych dla przeglądarki i nie zawiera odwołań do node:*',
		async () => {
			const { warnings, code } = await buildBrowserBundle();
			expect(warnings.filter((w) => EXTERNALIZED_WARNING.test(w))).toEqual([]);
			expect(code.length).toBeGreaterThan(0);
			expect(code.match(NODE_BUILTIN_REFERENCE)).toBeNull();
		},
		BUILD_TIMEOUT_MS,
	);
});
