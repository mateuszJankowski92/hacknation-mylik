/**
 * Dostawca `anthropic` (oficjalne SDK `@anthropic-ai/sdk`).
 *
 * - Model domyślny: `claude-haiku-5-5` (mały, tani, szybki); zmiana przez `ANTHROPIC_MODEL`.
 * - Wyjście wymuszone schematem przez structured outputs (`output_config.format`),
 *   to NIE jest narzędzie: żadnych `tools`, brak sieci po stronie modelu, brak streamingu.
 * - `temperature` NIE jest wysyłane: Claude Haiku 5.5 (i nowsze modele) zwraca 400
 *   dla niedomyślnych parametrów próbkowania. Determinizm zapewnia schemat i prompt.
 * - `output_config.effort: 'low'`: myślenie adaptacyjne zostaje domyślne, niski wysiłek
 *   trzyma opóźnienie i koszt nisko.
 * - Timeout 25 s na wywołanie, `maxRetries: 0` w SDK; jedyne ponowienie to jedno
 *   ponowienie po niezgodności ze schematem. Błędy przejściowe (429, timeout, 5xx)
 *   zgłaszamy jako `LlmError` z `retryable`, decyzję podejmuje silnik.
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import {
  AssessOutputSchema,
  ExtractClaimsOutputSchema,
  LlmError,
  type AssessRequest,
  type AssessResult,
  type ExtractClaimsRequest,
  type ExtractClaimsResult,
  type LlmProvider,
  type LlmUsage,
} from '../contracts/llm';
import { estimateCostUsd } from './pricing';
import {
  ASSESS_SYSTEM_PROMPT,
  EXTRACT_SYSTEM_PROMPT,
  MAX_CLAIMS,
  buildAssessUserMessage,
  buildExtractUserMessage,
  buildSchemaRetryNote,
} from './prompts';

export const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-5-5';
export const ANTHROPIC_TIMEOUT_MS = 25_000;
const MAX_TOKENS = 8_000;

/** Minimalny wycinek klienta SDK, którego używamy (pozwala podmienić SDK w testach). */
export interface AnthropicMessagesClient {
  messages: {
    create(body: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
  };
}

export interface AnthropicProviderOptions {
  apiKey?: string;
  model?: string;
  /** Wstrzyknięty klient (testy). Bez niego klient SDK powstaje leniwie przy pierwszym wywołaniu. */
  client?: AnthropicMessagesClient;
  /** Zegar do pomiaru opóźnienia (testy). */
  now?: () => number;
}

class SchemaProblem extends Error {}

/** Zamienia wyjątek SDK na `LlmError`. Komunikaty nie zawierają klucza ani treści zgłoszenia. */
export function mapAnthropicError(err: unknown): LlmError {
  if (err instanceof LlmError) return err;
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return new LlmError('timeout', 'Przekroczono czas oczekiwania na odpowiedź modelu.', { cause: err });
  }
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return new LlmError('no_key', 'Klucz API Anthropic jest nieprawidłowy lub nie ma uprawnień.', {
      retryable: false,
      cause: err,
    });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new LlmError('rate_limit', 'Przekroczono limit zapytań do modelu.', { retryable: true, cause: err });
  }
  if (err instanceof Anthropic.InternalServerError) {
    return new LlmError('provider_error', `Błąd po stronie dostawcy modelu (HTTP ${err.status}).`, {
      retryable: true,
      cause: err,
    });
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new LlmError('provider_error', 'Brak połączenia z dostawcą modelu.', { retryable: true, cause: err });
  }
  if (err instanceof Anthropic.APIError) {
    const status = typeof err.status === 'number' ? ` (HTTP ${err.status})` : '';
    return new LlmError('provider_error', `Dostawca modelu odrzucił zapytanie${status}.`, {
      retryable: false,
      cause: err,
    });
  }
  return new LlmError('provider_error', 'Nieoczekiwany błąd wywołania modelu.', { retryable: false, cause: err });
}

function issuesSummary(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((i) => `${i.path.join('.') || '(korzeń)'}: ${i.message}`)
    .join('; ');
}

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  readonly model: string;
  private readonly apiKey?: string;
  private client?: AnthropicMessagesClient;
  private readonly now: () => number;

  constructor(opts: AnthropicProviderOptions = {}) {
    this.apiKey = opts.apiKey;
    this.model = opts.model && opts.model.trim() !== '' ? opts.model.trim() : DEFAULT_ANTHROPIC_MODEL;
    this.client = opts.client;
    this.now = opts.now ?? (() => performance.now());
  }

  private getClient(): AnthropicMessagesClient {
    if (this.client) return this.client;
    if (!this.apiKey) {
      throw new LlmError('no_key', 'Brak klucza API Anthropic (ANTHROPIC_API_KEY).', { retryable: false });
    }
    this.client = new Anthropic({ apiKey: this.apiKey, timeout: ANTHROPIC_TIMEOUT_MS, maxRetries: 0 });
    return this.client;
  }

  async extractClaims(req: ExtractClaimsRequest): Promise<ExtractClaimsResult> {
    const { data, usage } = await this.callStructured(
      EXTRACT_SYSTEM_PROMPT,
      buildExtractUserMessage(req),
      ExtractClaimsOutputSchema,
      (out) => {
        const ids = new Set<string>();
        for (const c of out.claims) {
          if (ids.has(c.id)) throw new SchemaProblem(`powtórzony identyfikator ${c.id}`);
          ids.add(c.id);
        }
      },
    );
    return { claims: data.claims.slice(0, MAX_CLAIMS), usage };
  }

  async assessPassages(req: AssessRequest): Promise<AssessResult> {
    const expected = new Set(req.passages.map((p) => p.id));
    const { data, usage } = await this.callStructured(
      ASSESS_SYSTEM_PROMPT,
      buildAssessUserMessage(req),
      AssessOutputSchema,
      (out) => {
        const seen = new Set<string>();
        for (const a of out.assessments) {
          if (!expected.has(a.passageId)) throw new SchemaProblem('identyfikator fragmentu spoza danych');
          if (seen.has(a.passageId)) throw new SchemaProblem('powtórzona ocena fragmentu');
          seen.add(a.passageId);
        }
        if (seen.size !== expected.size) throw new SchemaProblem('brak oceny dla części fragmentów');
      },
    );
    const assessments = data.assessments.map((a) => ({
      passageId: a.passageId,
      stance: a.stance,
      quote: a.stance === 'bez_zwiazku' ? '' : a.quote,
    }));
    return { assessments, usage };
  }

  /**
   * Jedno wywołanie + najwyżej jedno ponowienie po niezgodności ze schematem.
   * `usage` sumuje oba wywołania.
   */
  private async callStructured<T>(
    system: string,
    userMessage: string,
    schema: z.ZodType<T>,
    check: (out: T) => void,
  ): Promise<{ data: T; usage: LlmUsage }> {
    const client = this.getClient();
    const format = zodOutputFormat(schema as never);
    const usage: LlmUsage = { model: this.model, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, latencyMs: 0 };
    let problem: string | undefined;

    for (let attempt = 0; attempt < 2; attempt++) {
      const content = problem === undefined ? userMessage : userMessage + buildSchemaRetryNote(problem);
      const started = this.now();
      let response: Anthropic.Message;
      try {
        response = await client.messages.create({
          model: this.model,
          max_tokens: MAX_TOKENS,
          system,
          messages: [{ role: 'user', content }],
          output_config: { effort: 'low', format: { type: 'json_schema', schema: format.schema } },
        });
      } catch (err) {
        throw mapAnthropicError(err);
      }
      usage.latencyMs += Math.max(0, this.now() - started);
      const inTok = response.usage?.input_tokens ?? 0;
      const outTok = response.usage?.output_tokens ?? 0;
      usage.inputTokens += inTok;
      usage.outputTokens += outTok;
      usage.estimatedCostUsd += estimateCostUsd(response.model || this.model, inTok, outTok);

      if (response.stop_reason === 'refusal') {
        throw new LlmError('provider_error', 'Model odmówił wykonania zadania.', { retryable: false });
      }

      try {
        if (response.stop_reason === 'max_tokens') throw new SchemaProblem('odpowiedź ucięta limitem długości');
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('');
        let json: unknown;
        try {
          json = JSON.parse(text);
        } catch {
          throw new SchemaProblem('odpowiedź nie jest poprawnym JSON');
        }
        const parsed = schema.safeParse(json);
        if (!parsed.success) throw new SchemaProblem(issuesSummary(parsed.error));
        check(parsed.data);
        return { data: parsed.data, usage };
      } catch (err) {
        if (!(err instanceof SchemaProblem)) throw err;
        problem = err.message;
      }
    }
    throw new LlmError('invalid_output', `Odpowiedź modelu niezgodna ze schematem po ponowieniu: ${problem}.`, {
      retryable: false,
    });
  }
}
