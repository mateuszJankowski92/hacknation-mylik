import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { CHANNELS, type Channel, type Engine, type VerifyOutcome } from '../contracts/index';
import { RATE_LIMIT_MESSAGE_PL } from '../security/index';
import { normalizeRecordLinks } from '../sms/index';
import {
	CALLBACK_TYPE,
	COMMAND_TYPE,
	DISCORD_MAX_CONTENT_CHARS,
	DISCORD_MAX_TEXT_CHARS,
	EPHEMERAL_FLAG,
	INTERACTION_TYPE,
	MESSAGE_COMMAND_NAME,
	PUBLIC_OPTION_NAME,
	SLASH_COMMAND_NAME,
	TEXT_OPTION_NAME,
} from './commands';
import { createUserLimiter, type UserLimiter } from './limit';
import { verifyDiscordSignature } from './signature';

export const DISCORD_INTERACTIONS_PATH = '/discord/interactions';
export const DISCORD_MAX_BODY_BYTES = 256 * 1024;
export const DISCORD_WORK_TIMEOUT_MS = 60_000;
export const DISCORD_API_BASE = 'https://discord.com/api/v10';

const EDIT_ATTEMPTS = 3;
const EDIT_REQUEST_TIMEOUT_MS = 10_000;
const EDIT_RETRY_DELAY_MS = 500;
const EDIT_RETRY_MAX_DELAY_MS = 5_000;
const NO_MENTIONS = { parse: [] as string[] };

const channelNames: readonly string[] = CHANNELS;
export const DISCORD_ENGINE_CHANNEL: Channel = (channelNames.includes('discord') ? 'discord' : 'sms') as Channel;

export const DISCORD_MESSAGES = {
	empty: 'Napisz, co dokładnie chcesz sprawdzić: wiadomość albo adres strony.',
	tooLong: `Tekst jest za długi (limit to ${DISCORD_MAX_TEXT_CHARS} znaków). Skróć go do jednego doniesienia.`,
	noText: 'W tej wiadomości nie ma tekstu do sprawdzenia. Załączników i obrazków nie czytam.',
	technical: 'Wystąpił problem techniczny i nie udało się sprawdzić zgłoszenia. To nie jest ocena jego treści. Spróbuj ponownie później.',
	unsupported: 'Tej interakcji nie obsługuję. Użyj komendy /sprawdz albo polecenia „Sprawdź z Mylikiem” z menu wiadomości.',
	unknownCommand: 'Nie znam tej komendy. Użyj /sprawdz albo polecenia „Sprawdź z Mylikiem” z menu wiadomości.',
	notConfigured: 'Kanał Discord nie jest skonfigurowany.',
	invalidBody: 'Nie mogę odczytać żądania.',
	tooLargeBody: 'Żądanie jest za duże.',
	unauthorized: 'invalid request signature',
} as const;

const InteractionSchema = z.object({
	type: z.number(),
	application_id: z.string().regex(/^\d{1,25}$/).optional(),
	token: z.string().regex(/^[A-Za-z0-9._-]{10,600}$/).optional(),
	data: z
		.object({
			name: z.string().optional(),
			type: z.number().optional(),
			target_id: z.string().optional(),
			options: z.array(z.object({ name: z.string(), value: z.unknown().optional() })).optional(),
			resolved: z
				.object({
					messages: z.record(z.string(), z.object({ content: z.unknown().optional() })).optional(),
				})
				.optional(),
		})
		.optional(),
	member: z.object({ user: z.object({ id: z.string() }).optional() }).optional(),
	user: z.object({ id: z.string() }).optional(),
});

type Interaction = z.infer<typeof InteractionSchema>;

export interface DiscordDeps {
	engine: Engine;
	publicKey?: string;
	applicationId?: string;
	publicBaseUrl?: string;
	rateLimitPerMin?: number;
	fetch?: typeof fetch;
	schedule?: (task: () => Promise<void>) => void;
	workTimeoutMs?: number;
	retryDelayMs?: number;
	limiter?: UserLimiter;
	logEvent?: (type: string, detail: Record<string, string | number | boolean | null>) => void;
}

interface Job {
	applicationId: string;
	token: string;
	text: string;
}

function defaultSchedule(task: () => Promise<void>): void {
	setImmediate(() => {
		task().catch(() => undefined);
	});
}

function safeErrorName(err: unknown): string {
	const name = err instanceof Error ? err.name.replace(/[^A-Za-z0-9_]/g, '').slice(0, 40) : 'unknown';
	return name || 'Error';
}

class WorkTimeout extends Error {
	constructor() {
		super('work_timeout');
		this.name = 'DiscordWorkTimeout';
	}
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => reject(new WorkTimeout()), ms);
		timer.unref?.();
		promise.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(err: unknown) => {
				clearTimeout(timer);
				reject(err);
			},
		);
	});
}

function sleep(ms: number): Promise<void> {
	return ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));
}

const MENTION_TOKEN = /<(?:@[!&]?|#)\d{15,25}>/gu;

export function cleanDiscordText(raw: string): string {
	return raw.replace(MENTION_TOKEN, ' ').replace(/[ \t]{2,}/gu, ' ').trim();
}

export function fitDiscordContent(text: string): string {
	const trimmed = text.trim();
	if (trimmed === '') return DISCORD_MESSAGES.technical;
	if (trimmed.length <= DISCORD_MAX_CONTENT_CHARS) return trimmed;
	return `${trimmed.slice(0, DISCORD_MAX_CONTENT_CHARS - 1).trimEnd()}…`;
}

function outcomeToContent(outcome: VerifyOutcome, publicBaseUrl?: string): string {
	return fitDiscordContent(
		outcome.kind === 'record' ? normalizeRecordLinks(outcome.record.shortAnswer, publicBaseUrl) : outcome.message,
	);
}

function invokingUserId(interaction: Interaction): string {
	return interaction.member?.user?.id ?? interaction.user?.id ?? 'nieznany';
}

function extractText(interaction: Interaction): { command: 'slash' | 'message'; raw: string | undefined; publicReply: boolean } | null {
	const data = interaction.data;
	if (!data) return null;
	if ((data.type ?? COMMAND_TYPE.slash) === COMMAND_TYPE.slash && data.name === SLASH_COMMAND_NAME) {
		const options = data.options ?? [];
		const text = options.find((o) => o.name === TEXT_OPTION_NAME)?.value;
		const publicReply = options.find((o) => o.name === PUBLIC_OPTION_NAME)?.value === true;
		return { command: 'slash', raw: typeof text === 'string' ? text : undefined, publicReply };
	}
	if (data.type === COMMAND_TYPE.message && data.name === MESSAGE_COMMAND_NAME) {
		const message = data.target_id ? data.resolved?.messages?.[data.target_id] : undefined;
		const content = message?.content;
		return { command: 'message', raw: typeof content === 'string' ? content : undefined, publicReply: false };
	}
	return null;
}

function immediateMessage(content: string) {
	return {
		type: CALLBACK_TYPE.message,
		data: { content, flags: EPHEMERAL_FLAG, allowed_mentions: NO_MENTIONS },
	};
}

function deferredMessage(publicReply: boolean) {
	return {
		type: CALLBACK_TYPE.deferredMessage,
		data: publicReply ? { allowed_mentions: NO_MENTIONS } : { flags: EPHEMERAL_FLAG, allowed_mentions: NO_MENTIONS },
	};
}

function textResponse(body: string, status: 400 | 401 | 413 | 503): Response {
	return new Response(body, {
		status,
		headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
	});
}

export function createDiscordApp(deps: DiscordDeps): Hono {
	const app = new Hono();
	const fetchImpl = deps.fetch ?? fetch;
	const schedule = deps.schedule ?? defaultSchedule;
	const workTimeoutMs = deps.workTimeoutMs ?? DISCORD_WORK_TIMEOUT_MS;
	const retryDelayMs = deps.retryDelayMs ?? EDIT_RETRY_DELAY_MS;
	const limiter = deps.limiter ?? createUserLimiter({ limit: deps.rateLimitPerMin ?? 0 });
	const userAgent = `DiscordBot (${deps.publicBaseUrl ?? 'https://mylik.invalid'}, 0.1.0)`;

	function log(type: string, detail: Record<string, string | number | boolean | null>): void {
		try {
			deps.logEvent?.(type, detail);
		} catch {
			return;
		}
	}

	async function produceContent(text: string): Promise<string> {
		try {
			const outcome = await withTimeout(deps.engine.verify({ text, channel: DISCORD_ENGINE_CHANNEL }), workTimeoutMs);
			return outcomeToContent(outcome, deps.publicBaseUrl);
		} catch (err) {
			log('server_error', { route: 'discord', error: safeErrorName(err) });
			return DISCORD_MESSAGES.technical;
		}
	}

	async function editOriginal(job: Job, content: string): Promise<void> {
		const url = `${DISCORD_API_BASE}/webhooks/${job.applicationId}/${job.token}/messages/@original`;
		const body = JSON.stringify({ content, allowed_mentions: NO_MENTIONS });
		let status = 0;
		for (let attempt = 1; attempt <= EDIT_ATTEMPTS; attempt += 1) {
			let delay = retryDelayMs * attempt;
			try {
				const res = await fetchImpl(url, {
					method: 'PATCH',
					headers: { 'content-type': 'application/json', 'user-agent': userAgent },
					body,
					signal: AbortSignal.timeout(EDIT_REQUEST_TIMEOUT_MS),
				});
				if (res.ok) return;
				status = res.status;
				if (status !== 429 && status < 500) break;
				if (status === 429) {
					const retryAfter = Number(((await res.json().catch(() => null)) as { retry_after?: unknown } | null)?.retry_after);
					if (Number.isFinite(retryAfter) && retryAfter > 0) delay = Math.min(EDIT_RETRY_MAX_DELAY_MS, retryAfter * 1000);
				}
			} catch {
				status = 0;
			}
			if (attempt < EDIT_ATTEMPTS) await sleep(delay);
		}
		log('discord_edit_failed', { status });
	}

	async function runJob(job: Job): Promise<void> {
		const content = await produceContent(job.text);
		await editOriginal(job, content);
	}

	app.post(
		DISCORD_INTERACTIONS_PATH,
		bodyLimit({ maxSize: DISCORD_MAX_BODY_BYTES, onError: () => textResponse(DISCORD_MESSAGES.tooLargeBody, 413) }),
		async (c) => {
			if (!deps.publicKey) return textResponse(DISCORD_MESSAGES.notConfigured, 503);
			const rawBody = new Uint8Array(await c.req.arrayBuffer());
			const valid = verifyDiscordSignature({
				publicKey: deps.publicKey,
				signature: c.req.header('x-signature-ed25519'),
				timestamp: c.req.header('x-signature-timestamp'),
				rawBody,
			});
			if (!valid) return textResponse(DISCORD_MESSAGES.unauthorized, 401);

			let parsed: Interaction;
			try {
				const result = InteractionSchema.safeParse(JSON.parse(new TextDecoder().decode(rawBody)));
				if (!result.success) return textResponse(DISCORD_MESSAGES.invalidBody, 400);
				parsed = result.data;
			} catch {
				return textResponse(DISCORD_MESSAGES.invalidBody, 400);
			}

			if (parsed.type === INTERACTION_TYPE.ping) return c.json({ type: CALLBACK_TYPE.pong });
			if (parsed.type !== INTERACTION_TYPE.applicationCommand) return c.json(immediateMessage(DISCORD_MESSAGES.unsupported));

			const extracted = extractText(parsed);
			if (!extracted) return c.json(immediateMessage(DISCORD_MESSAGES.unknownCommand));

			const text = extracted.raw === undefined ? '' : cleanDiscordText(extracted.raw);
			if (text === '') {
				return c.json(immediateMessage(extracted.command === 'message' ? DISCORD_MESSAGES.noText : DISCORD_MESSAGES.empty));
			}
			if (text.length > DISCORD_MAX_TEXT_CHARS) return c.json(immediateMessage(DISCORD_MESSAGES.tooLong));

			if (!parsed.application_id || !parsed.token) return textResponse(DISCORD_MESSAGES.invalidBody, 400);
			if (deps.applicationId && deps.applicationId !== parsed.application_id) return textResponse(DISCORD_MESSAGES.invalidBody, 400);

			if (!limiter.allow(invokingUserId(parsed))) {
				log('discord_rate_limited', {});
				return c.json(immediateMessage(RATE_LIMIT_MESSAGE_PL));
			}

			log('discord_command', { command: extracted.command, public: extracted.publicReply });
			const job: Job = { applicationId: parsed.application_id, token: parsed.token, text };
			schedule(() => runJob(job));
			return c.json(deferredMessage(extracted.publicReply));
		},
	);

	return app;
}
