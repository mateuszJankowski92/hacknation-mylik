import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import type { Hono } from 'hono';
import type { Engine, VerifyInput, VerifyOutcome } from '../../src/contracts/index';
import { createDiscordApp, DISCORD_INTERACTIONS_PATH, type DiscordDeps } from '../../src/discord/index';

export const APPLICATION_ID = '1234567890123456789';
export const INTERACTION_TOKEN = 'aW50ZXJhY3Rpb24tdG9rZW4tdGVzdG93eS0xMjM0NTY3ODkw';
export const USER_ID = '987654321098765432';

export interface TestKeys {
	publicKeyHex: string;
	privateKey: KeyObject;
}

export function makeKeys(): TestKeys {
	const { publicKey, privateKey } = generateKeyPairSync('ed25519');
	const der = publicKey.export({ format: 'der', type: 'spki' });
	return { publicKeyHex: der.subarray(der.length - 32).toString('hex'), privateKey };
}

export function signedRequest(keys: TestKeys, body: string, timestamp = '1766000000'): RequestInit {
	const signature = sign(null, Buffer.from(timestamp + body), keys.privateKey).toString('hex');
	return {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-signature-ed25519': signature,
			'x-signature-timestamp': timestamp,
		},
		body,
	};
}

export function slashInteraction(text: string, options: { publicReply?: boolean; userId?: string; inDm?: boolean } = {}): string {
	const user = { id: options.userId ?? USER_ID, username: 'tester' };
	return JSON.stringify({
		id: '111111111111111111',
		application_id: APPLICATION_ID,
		type: 2,
		token: INTERACTION_TOKEN,
		version: 1,
		data: {
			id: '222222222222222222',
			name: 'sprawdz',
			type: 1,
			options: [
				{ name: 'tekst', type: 3, value: text },
				...(options.publicReply === undefined ? [] : [{ name: 'publicznie', type: 5, value: options.publicReply }]),
			],
		},
		...(options.inDm ? { user } : { guild_id: '333333333333333333', member: { user } }),
	});
}

export function messageInteraction(content: string, userId = USER_ID): string {
	return JSON.stringify({
		id: '111111111111111112',
		application_id: APPLICATION_ID,
		type: 2,
		token: INTERACTION_TOKEN,
		version: 1,
		data: {
			id: '222222222222222223',
			name: 'Sprawdź z Mylikiem',
			type: 3,
			target_id: '444444444444444444',
			resolved: { messages: { '444444444444444444': { id: '444444444444444444', content, attachments: [] } } },
		},
		member: { user: { id: userId, username: 'tester' } },
	});
}

export interface EditCall {
	url: string;
	method: string;
	headers: Record<string, string>;
	body: { content: string; allowed_mentions: { parse: string[] } };
}

export function fakeFetch(options: { statuses?: number[] } = {}): { fetch: typeof fetch; calls: EditCall[] } {
	const calls: EditCall[] = [];
	const statuses = [...(options.statuses ?? [])];
	const impl = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
		calls.push({
			url: String(input),
			method: init?.method ?? 'GET',
			headers: Object.fromEntries(new Headers(init?.headers).entries()),
			body: JSON.parse(String(init?.body ?? 'null')),
		});
		const status = statuses.shift() ?? 200;
		if (status === 0) throw new TypeError('network');
		return new Response(status === 200 ? '{}' : '{"retry_after":0.001}', { status });
	};
	return { fetch: impl as typeof fetch, calls };
}

export function fakeEngine(): { engine: Engine; calls: VerifyInput[] } {
	const calls: VerifyInput[] = [];
	const engine: Engine = {
		async verify(input): Promise<VerifyOutcome> {
			calls.push(input);
			if (input.text?.includes('stan')) {
				return { kind: 'state', state: 'potrzeba_doprecyzowania', message: 'Doprecyzuj (stan na 2026-11-21).' };
			}
			if (input.text?.includes('boom')) throw new Error('boom');
			if (input.text?.includes('zawiesza')) return new Promise<VerifyOutcome>(() => undefined);
			return {
				kind: 'record',
				cached: false,
				record: { id: 'a'.repeat(64), shortAnswer: `Odpowiedź (stan na 2026-11-21). Dowody: /#/rekord/${'a'.repeat(64)}` } as never,
			};
		},
		getRecord: () => null,
	};
	return { engine, calls };
}

export interface DiscordHarness {
	app: Hono;
	keys: TestKeys;
	tasks: Array<() => Promise<void>>;
	runTasks(): Promise<void>;
	edits: EditCall[];
	events: Array<{ type: string; detail: Record<string, string | number | boolean | null> }>;
}

export function makeDiscord(engine: Engine, overrides: Partial<DiscordDeps> = {}, statuses: number[] = []): DiscordHarness {
	const keys = makeKeys();
	const tasks: Array<() => Promise<void>> = [];
	const { fetch: fetchImpl, calls: edits } = fakeFetch({ statuses });
	const events: DiscordHarness['events'] = [];
	const app = createDiscordApp({
		engine,
		publicKey: keys.publicKeyHex,
		applicationId: APPLICATION_ID,
		publicBaseUrl: 'https://mylik.example',
		fetch: fetchImpl,
		schedule: (task) => {
			tasks.push(task);
		},
		retryDelayMs: 0,
		logEvent: (type, detail) => events.push({ type, detail }),
		...overrides,
	});
	return {
		app,
		keys,
		tasks,
		edits,
		events,
		async runTasks() {
			const pending = tasks.splice(0);
			for (const task of pending) await task();
		},
	};
}

export async function postInteraction(harness: DiscordHarness, body: string): Promise<{ status: number; json: any }> {
	const res = await harness.app.request(DISCORD_INTERACTIONS_PATH, signedRequest(harness.keys, body));
	const text = await res.text();
	let json: unknown = null;
	try {
		json = JSON.parse(text);
	} catch {
		json = null;
	}
	return { status: res.status, json };
}
