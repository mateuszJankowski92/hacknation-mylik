import { describe, expect, it } from 'vitest';
import type { Engine, VerifyInput, VerifyOutcome } from '../../src/contracts/index';
import { createSmsApp, SMS_MAX_CHARS } from '../../src/sms/index';

function fakeEngine(): { engine: Engine; calls: VerifyInput[] } {
	const calls: VerifyInput[] = [];
	const engine: Engine = {
		async verify(input): Promise<VerifyOutcome> {
			calls.push(input);
			if (input.text?.includes('stan')) return { kind: 'state', state: 'potrzeba_doprecyzowania', message: 'Doprecyzuj (stan na 2026-11-21).' };
			if (input.text?.includes('boom')) throw new Error('boom');
			return {
				kind: 'record',
				cached: false,
				record: { shortAnswer: 'Odpowiedź (stan na 2026-11-21).' } as never,
			};
		},
		getRecord: () => null,
	};
	return { engine, calls };
}

const TEXT = 'Ogród botaniczny jest otwarty codziennie od ósmej.';

describe('sms', () => {
	it('JSON: zwraca shortAnswer i wymusza kanał sms', async () => {
		const { engine, calls } = fakeEngine();
		const app = createSmsApp({ engine });
		const res = await app.request('/sms/webhook', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ from: '+48500111222', text: TEXT, channel: 'www' }),
		});
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('text/plain');
		expect(await res.text()).toBe('Odpowiedź (stan na 2026-11-21).');
		expect(calls).toEqual([{ text: TEXT, channel: 'sms' }]);
	});

	it('form-urlencoded z polskimi nazwami pól', async () => {
		const { engine, calls } = fakeEngine();
		const app = createSmsApp({ engine });
		const body = new URLSearchParams({ nadawca: '+48500111222', treść: TEXT }).toString();
		const res = await app.request('/sms/webhook', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded; charset=utf-8' },
			body,
		});
		expect(res.status).toBe(200);
		expect(calls[0]).toEqual({ text: TEXT, channel: 'sms' });
	});

	it('stan silnika zwraca komunikat', async () => {
		const { engine } = fakeEngine();
		const app = createSmsApp({ engine });
		const res = await app.request('/sms/webhook', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text: 'jaki stan sprawy' }),
		});
		expect(await res.text()).toBe('Doprecyzuj (stan na 2026-11-21).');
	});

	it('limit długości: silnik nie jest wywoływany', async () => {
		const { engine, calls } = fakeEngine();
		const app = createSmsApp({ engine });
		const res = await app.request('/sms/webhook', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text: 'a'.repeat(SMS_MAX_CHARS + 1) }),
		});
		expect(res.status).toBe(200);
		expect(await res.text()).toContain('za długa');
		expect(calls).toHaveLength(0);
	});

	it('pusta treść i zły format', async () => {
		const { engine, calls } = fakeEngine();
		const app = createSmsApp({ engine });
		const empty = await app.request('/sms/webhook', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ from: '1' }),
		});
		expect(await empty.text()).toContain('Napisz');
		const bad = await app.request('/sms/webhook', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'x' });
		expect(bad.status).toBe(400);
		const broken = await app.request('/sms/webhook', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: '{',
		});
		expect(broken.status).toBe(400);
		expect(calls).toHaveLength(0);
	});

	it('wyjątek silnika daje komunikat techniczny bez treści zgłoszenia', async () => {
		const { engine } = fakeEngine();
		const events: string[] = [];
		const app = createSmsApp({ engine, logEvent: (type) => events.push(type) });
		const res = await app.request('/sms/webhook', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text: 'to jest boom zgłoszenie' }),
		});
		expect(res.status).toBe(200);
		expect(await res.text()).toContain('problem techniczny');
		expect(events).toEqual(['server_error']);
	});

	it('GET /sms zwraca symulator HTML', async () => {
		const { engine } = fakeEngine();
		const app = createSmsApp({ engine });
		const res = await app.request('/sms');
		expect(res.status).toBe(200);
		const html = await res.text();
		expect(html).toContain('/sms/webhook');
		expect(html).toContain('symulator');
	});
});
