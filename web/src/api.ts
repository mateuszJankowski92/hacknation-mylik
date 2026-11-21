import type { SourcesResponse } from '../../src/contracts/api';
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
