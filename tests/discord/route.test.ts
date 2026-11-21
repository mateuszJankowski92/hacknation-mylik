import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openDb } from '../../src/db/open';
import { bootstrap, type Bootstrapped } from '../../src/server/bootstrap';
import { redactedConfig } from '../../src/config';
import { APPLICATION_ID, USER_ID, makeKeys, signedRequest, slashInteraction } from './helpers';

const TEXT = 'Ogród botaniczny w Lipinach jest otwarty codziennie od godziny ósmej.';

function boot(env: Record<string, string>): Bootstrapped {
	return bootstrap({
		env,
		db: openDb(':memory:'),
		config: { llmProvider: 'mock', anthropicApiKey: undefined, incidentsPath: join(tmpdir(), 'mylik-discord-brak-incydentow.json'), rateLimitPerMin: 20, publicBaseUrl: 'https://mylik.example' },
		distDir: join(tmpdir(), 'mylik-discord-no-dist'),
		log: null,
		warn: () => {},
		retention: false,
	});
}

async function waitFor(check: () => boolean, ms = 3000): Promise<void> {
	const until = Date.now() + ms;
	while (!check() && Date.now() < until) await new Promise((resolveWait) => setTimeout(resolveWait, 10));
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('trasa POST /discord/interactions w serwerze', () => {
	it('bez konfiguracji Discorda: 503, nic nie jest wołane', async () => {
		const b = boot({});
		const res = await b.app.request('/discord/interactions', signedRequest(makeKeys(), '{"type":1}'));
		expect(res.status).toBe(503);
		b.close();
	});

	it('PING i zły podpis; konfiguracja nie ujawnia wartości', async () => {
		const keys = makeKeys();
		const b = boot({ DISCORD_PUBLIC_KEY: keys.publicKeyHex, DISCORD_APPLICATION_ID: APPLICATION_ID });
		const pong = await b.app.request('/discord/interactions', signedRequest(keys, '{"type":1}'));
		expect(pong.status).toBe(200);
		expect(await pong.json()).toEqual({ type: 1 });
		const forged = await b.app.request('/discord/interactions', signedRequest(makeKeys(), '{"type":1}'));
		expect(forged.status).toBe(401);
		const shown = JSON.stringify(redactedConfig(b.config));
		expect(shown).not.toContain(keys.publicKeyHex);
		expect(shown).not.toContain(APPLICATION_ID);
		b.close();
	});

	it('komenda: odroczenie, potem PATCH z wynikiem; w bazie zdarzenia kanału discord bez danych użytkownika', async () => {
		const patches: Array<{ url: string; body: { content: string } }> = [];
		vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
			patches.push({ url: String(url), body: JSON.parse(String(init.body)) });
			return new Response('{}', { status: 200 });
		});
		const keys = makeKeys();
		const b = boot({ DISCORD_PUBLIC_KEY: keys.publicKeyHex, DISCORD_APPLICATION_ID: APPLICATION_ID });
		const res = await b.app.request('/discord/interactions', signedRequest(keys, slashInteraction(TEXT)));
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ type: 5, data: { flags: 64, allowed_mentions: { parse: [] } } });
		await waitFor(() => patches.length > 0);
		expect(patches).toHaveLength(1);
		expect(patches[0]!.url).toContain(`/webhooks/${APPLICATION_ID}/`);
		expect(patches[0]!.url.endsWith('/messages/@original')).toBe(true);
		expect(patches[0]!.body.content.length).toBeGreaterThan(0);
		expect(patches[0]!.body.content.length).toBeLessThanOrEqual(2000);

		const channels = b.db.prepare('SELECT DISTINCT channel FROM events').all() as Array<{ channel: string | null }>;
		expect(channels.map((c) => c.channel)).toContain('discord');
		const dump = JSON.stringify({
			events: b.db.prepare('SELECT * FROM events').all(),
			records: b.db.prepare('SELECT * FROM records').all(),
		});
		expect(dump).not.toContain(USER_ID);
		b.close();
	});
});
