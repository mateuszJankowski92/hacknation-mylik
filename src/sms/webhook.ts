import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { Engine, VerifyOutcome } from '../contracts/index';
import { SIMULATOR_HTML } from './simulator';

export const SMS_MAX_CHARS = 480;
export const SMS_MAX_BODY_BYTES = 8 * 1024;

const TEXT_KEYS = ['text', 'body', 'message', 'tresc', 'treść', 'content', 'sms'];

const MESSAGES = {
	empty: 'Napisz w SMS-ie, co dokładnie chcesz sprawdzić.',
	tooLong: `Wiadomość jest za długa (limit to ${SMS_MAX_CHARS} znaków). Skróć ją do jednego doniesienia.`,
	technical: 'Wystąpił problem techniczny i nie udało się sprawdzić zgłoszenia. To nie jest ocena jego treści. Spróbuj ponownie później.',
	wrongFormat: 'Nie mogę odczytać wiadomości. Wyślij dane jako JSON lub formularz.',
	tooLargeBody: 'Wiadomość jest za duża. Skróć ją i spróbuj ponownie.',
} as const;

export interface SmsDeps {
	engine: Engine;
	publicBaseUrl?: string;
	logEvent?: (type: string, detail: Record<string, string | number | boolean | null>) => void;
}

function pickField(data: Record<string, unknown>, keys: string[]): string | undefined {
	const lower = new Map<string, unknown>();
	for (const [key, value] of Object.entries(data)) lower.set(key.toLowerCase(), value);
	for (const key of keys) {
		const value = lower.get(key);
		if (typeof value === 'string') return value;
	}
	return undefined;
}

async function readPayload(request: Request): Promise<Record<string, unknown> | null> {
	const contentType = (request.headers.get('content-type') ?? '').toLowerCase();
	try {
		if (/^application\/json\b/.test(contentType)) {
			const body: unknown = await request.json();
			if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
			return body as Record<string, unknown>;
		}
		if (/^application\/x-www-form-urlencoded\b/.test(contentType)) {
			const params = new URLSearchParams(await request.text());
			const data: Record<string, unknown> = {};
			for (const [key, value] of params) data[key] = value;
			return data;
		}
	} catch {
		return null;
	}
	return null;
}

const RELATIVE_RECORD_LINK = /(^|\s)(?:\/#\/rekord|\/r)\/([0-9a-f]{64})/gu;

export function normalizeRecordLinks(text: string, publicBaseUrl?: string): string {
	const base = (publicBaseUrl ?? '').replace(/\/+$/u, '');
	return text.replace(RELATIVE_RECORD_LINK, (_match, lead: string, id: string) => `${lead}${base}/r/${id}`);
}

function outcomeToText(outcome: VerifyOutcome, publicBaseUrl?: string): string {
	return outcome.kind === 'record' ? normalizeRecordLinks(outcome.record.shortAnswer, publicBaseUrl) : outcome.message;
}

function textResponse(body: string, status: 200 | 400 | 413 = 200): Response {
	return new Response(body, {
		status,
		headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
	});
}

export function createSmsApp(deps: SmsDeps): Hono {
	const app = new Hono();

	app.get('/sms', (c) => c.html(SIMULATOR_HTML));

	app.post(
		'/sms/webhook',
		bodyLimit({ maxSize: SMS_MAX_BODY_BYTES, onError: () => textResponse(MESSAGES.tooLargeBody, 413) }),
		async (c) => {
			const payload = await readPayload(c.req.raw);
			if (!payload) return textResponse(MESSAGES.wrongFormat, 400);
			const text = pickField(payload, TEXT_KEYS);
			if (text === undefined || text.trim() === '') return textResponse(MESSAGES.empty);
			if (text.length > SMS_MAX_CHARS) return textResponse(MESSAGES.tooLong);

			let outcome: VerifyOutcome;
			try {
				outcome = await deps.engine.verify({ text, channel: 'sms' });
			} catch (err) {
				const name = err instanceof Error ? err.name.replace(/[^A-Za-z0-9_]/g, '').slice(0, 40) : 'unknown';
				try {
					deps.logEvent?.('server_error', { route: 'sms', error: name || 'Error' });
				} catch {
				}
				return textResponse(MESSAGES.technical);
			}
			return textResponse(outcomeToText(outcome, deps.publicBaseUrl));
		},
	);

	return app;
}
