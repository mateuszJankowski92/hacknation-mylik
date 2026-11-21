import {
	VERIFY_STREAM_EVENTS,
	VerifyProgressEventSchema,
	type SourcesResponse,
	type VerifyEtaResponse,
	type VerifyProgressEvent,
} from '../../src/contracts/api';
import type { VerificationRecord, VerifyOutcome } from '../../src/contracts/record';

export const MAX_INPUT_LENGTH = 2000;
export const REQUEST_TIMEOUT_MS = 45000;

export type ApiFailureKind =
	| 'timeout'
	| 'cancelled'
	| 'network'
	| 'bad_request'
	| 'rate_limit'
	| 'not_found'
	| 'server'
	| 'unexpected';

const FAILURE_MESSAGES_PL: Record<ApiFailureKind, string> = {
	timeout: 'Sprawdzanie trwa zbyt długo, więc je przerwałem. Spróbuj ponownie za chwilę.',
	cancelled: 'Sprawdzanie zostało anulowane. Możesz wkleić treść ponownie.',
	network: 'Nie mogę połączyć się z usługą. Sprawdź połączenie z internetem i spróbuj ponownie.',
	bad_request: 'Nie mogę przyjąć tej treści. Upewnij się, że wkleiłeś tekst albo jeden adres internetowy.',
	rate_limit: 'Wysłano zbyt wiele zapytań. Odczekaj chwilę i spróbuj ponownie.',
	not_found: 'Nie znalazłem takiego sprawdzenia. Sprawdź, czy adres jest poprawny.',
	server: 'Usługa chwilowo nie działa. To nie jest ocena Twojego zgłoszenia. Spróbuj ponownie później.',
	unexpected: 'Dostałem nieoczekiwaną odpowiedź. To nie jest ocena Twojego zgłoszenia. Spróbuj ponownie później.',
};

export class ApiFailure extends Error {
	readonly kind: ApiFailureKind;

	constructor(kind: ApiFailureKind) {
		super(FAILURE_MESSAGES_PL[kind]);
		this.name = 'ApiFailure';
		this.kind = kind;
	}
}

const URL_PATTERN = /^https?:\/\/\S+$/i;

export function buildVerifyBody(content: string): { url: string; channel: 'www' } | { text: string; channel: 'www' } {
	const trimmed = content.trim();
	if (URL_PATTERN.test(trimmed)) return { url: trimmed, channel: 'www' };
	return { text: trimmed, channel: 'www' };
}

export function validateContent(content: string): 'ok' | 'empty' | 'too_long' {
	if (content.trim().length === 0) return 'empty';
	if (content.length > MAX_INPUT_LENGTH) return 'too_long';
	return 'ok';
}

function failureKindForStatus(status: number): ApiFailureKind {
	if (status === 429) return 'rate_limit';
	if (status === 404) return 'not_found';
	if (status >= 500) return 'server';
	if (status >= 400) return 'bad_request';
	return 'unexpected';
}

async function requestJson<T>(path: string, init: RequestInit, userSignal?: AbortSignal): Promise<T> {
	const controller = new AbortController();
	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		controller.abort();
	}, REQUEST_TIMEOUT_MS);
	const forwardAbort = () => controller.abort();
	if (userSignal?.aborted) controller.abort();
	userSignal?.addEventListener('abort', forwardAbort);

	try {
		const response = await fetch(path, { ...init, signal: controller.signal });
		if (!response.ok) throw new ApiFailure(failureKindForStatus(response.status));
		try {
			return (await response.json()) as T;
		} catch {
			throw new ApiFailure('unexpected');
		}
	} catch (error) {
		if (error instanceof ApiFailure) throw error;
		if (controller.signal.aborted) throw new ApiFailure(timedOut ? 'timeout' : 'cancelled');
		throw new ApiFailure('network');
	} finally {
		clearTimeout(timer);
		userSignal?.removeEventListener('abort', forwardAbort);
	}
}

export async function verifyContent(content: string, signal?: AbortSignal): Promise<VerifyOutcome> {
	const outcome = await requestJson<VerifyOutcome>(
		'/api/verify',
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(buildVerifyBody(content)),
		},
		signal,
	);
	if (!outcome || (outcome.kind !== 'record' && outcome.kind !== 'state')) throw new ApiFailure('unexpected');
	return outcome;
}

export async function fetchRecord(id: string, signal?: AbortSignal): Promise<VerificationRecord> {
	return requestJson<VerificationRecord>(`/api/records/${encodeURIComponent(id)}`, { method: 'GET' }, signal);
}

export async function fetchSources(signal?: AbortSignal): Promise<SourcesResponse> {
	return requestJson<SourcesResponse>('/api/sources', { method: 'GET' }, signal);
}

export const DEFAULT_ETA_SECONDS = 15;

export async function fetchEtaSeconds(signal?: AbortSignal): Promise<number> {
	try {
		const eta = await requestJson<VerifyEtaResponse>('/api/verify/eta', { method: 'GET' }, signal);
		const seconds = Math.round(eta.medianMs / 1000);
		return Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_ETA_SECONDS;
	} catch {
		return DEFAULT_ETA_SECONDS;
	}
}

export interface SseMessage {
	event: string;
	data: string;
}

export function parseSseBlock(block: string): SseMessage | null {
	let event = 'message';
	const data: string[] = [];
	for (const rawLine of block.split('\n')) {
		const line = rawLine.replace(/\r$/, '');
		if (line.startsWith(':') || line.length === 0) continue;
		const separator = line.indexOf(':');
		const field = separator === -1 ? line : line.slice(0, separator);
		const value = separator === -1 ? '' : line.slice(separator + 1).replace(/^ /, '');
		if (field === 'event') event = value;
		else if (field === 'data') data.push(value);
	}
	return data.length === 0 ? null : { event, data: data.join('\n') };
}

export async function verifyContentStream(
	content: string,
	onProgress: (event: VerifyProgressEvent) => void,
	signal?: AbortSignal,
): Promise<VerifyOutcome> {
	const controller = new AbortController();
	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		controller.abort();
	}, REQUEST_TIMEOUT_MS);
	const forwardAbort = () => controller.abort();
	if (signal?.aborted) controller.abort();
	signal?.addEventListener('abort', forwardAbort);

	try {
		const response = await fetch('/api/verify/stream', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(buildVerifyBody(content)),
			signal: controller.signal,
		});
		if (!response.ok) throw new ApiFailure(failureKindForStatus(response.status));
		const contentType = response.headers.get('content-type') ?? '';
		if (!contentType.includes('text/event-stream')) {
			let plain: VerifyOutcome;
			try {
				plain = (await response.json()) as VerifyOutcome;
			} catch {
				throw new ApiFailure('unexpected');
			}
			if (!plain || (plain.kind !== 'record' && plain.kind !== 'state')) throw new ApiFailure('unexpected');
			return plain;
		}
		if (!response.body) throw new ApiFailure('unexpected');
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		let outcome: VerifyOutcome | null = null;

		function handleBlock(block: string) {
			const message = parseSseBlock(block);
			if (!message) return;
			let parsed: unknown;
			try {
				parsed = JSON.parse(message.data);
			} catch {
				return;
			}
			if (message.event === VERIFY_STREAM_EVENTS.progress) {
				const event = VerifyProgressEventSchema.safeParse(parsed);
				if (event.success) onProgress(event.data);
			} else if (message.event === VERIFY_STREAM_EVENTS.result) {
				const candidate = parsed as VerifyOutcome;
				if (candidate && (candidate.kind === 'record' || candidate.kind === 'state')) outcome = candidate;
			}
		}

		for (;;) {
			const { done, value } = await reader.read();
			buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n');
			let boundary = buffer.indexOf('\n\n');
			while (boundary !== -1) {
				handleBlock(buffer.slice(0, boundary));
				buffer = buffer.slice(boundary + 2);
				boundary = buffer.indexOf('\n\n');
			}
			if (done) break;
		}
		if (buffer.trim().length > 0) handleBlock(buffer);
		if (!outcome) throw new ApiFailure('unexpected');
		return outcome;
	} catch (error) {
		if (error instanceof ApiFailure) throw error;
		if (controller.signal.aborted) throw new ApiFailure(timedOut ? 'timeout' : 'cancelled');
		throw new ApiFailure('network');
	} finally {
		clearTimeout(timer);
		signal?.removeEventListener('abort', forwardAbort);
	}
}
