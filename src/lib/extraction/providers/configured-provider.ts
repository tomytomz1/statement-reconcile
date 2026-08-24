import { serverEnv } from "@/config/env";
import {
  candidateStatementSchema,
  type NormalizedStatementCandidate,
} from "@/lib/schema/statement";

import {
  ProviderError,
  type RegionExtractionRequest,
  type StatementExtractionProvider,
} from "./interface";
import { CANDIDATE_JSON_SCHEMA, SYSTEM_INSTRUCTIONS, buildRegionPayload } from "./prompt";

/**
 * Structured-output providers, driven entirely by environment configuration.
 *
 * Two wire protocols cover the current landscape: the OpenAI chat-completions shape
 * (which many vendors and gateways implement) and the Anthropic messages shape. Both are
 * spoken with `fetch` rather than a vendor SDK so the dependency surface stays small and
 * the request can be audited line by line — important, because this is the only place
 * statement text leaves our own infrastructure.
 *
 * Neither implementation logs the request or the response body.
 */

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4.1-mini",
  "openai-compatible": "gpt-4.1-mini",
  anthropic: "claude-sonnet-4-5",
};

export function createConfiguredProvider(): StatementExtractionProvider | null {
  const env = serverEnv();
  if (env.PARSER_PROVIDER === "none" || !env.PARSER_API_KEY) return null;

  const model = env.PARSER_MODEL ?? DEFAULT_MODELS[env.PARSER_PROVIDER] ?? "";
  if (model === "") return null;

  if (env.PARSER_PROVIDER === "anthropic") {
    return new AnthropicProvider(
      env.PARSER_API_KEY,
      model,
      env.PARSER_BASE_URL,
      env.PARSER_TIMEOUT_MS,
    );
  }
  return new OpenAiCompatibleProvider(
    env.PARSER_API_KEY,
    model,
    env.PARSER_BASE_URL ?? "https://api.openai.com/v1",
    env.PARSER_TIMEOUT_MS,
  );
}

abstract class BaseProvider implements StatementExtractionProvider {
  abstract readonly name: string;

  protected constructor(
    protected readonly apiKey: string,
    readonly model: string,
    protected readonly timeoutMs: number,
  ) {}

  async extractRegion(
    input: RegionExtractionRequest,
    signal?: AbortSignal,
  ): Promise<NormalizedStatementCandidate> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const onAbort = (): void => controller.abort();
    signal?.addEventListener("abort", onAbort, { once: true });

    try {
      const raw = await this.request(buildRegionPayload(input), controller.signal);
      return parseCandidate(raw);
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (controller.signal.aborted) {
        throw new ProviderError("provider request timed out", "timeout");
      }
      throw new ProviderError("provider request failed", "unavailable");
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    }
  }

  protected abstract request(payload: string, signal: AbortSignal): Promise<string>;

  protected handleHttpFailure(status: number): never {
    if (status === 429) throw new ProviderError("provider rate limited", "rate_limited");
    throw new ProviderError(`provider responded with status ${status}`, "unavailable");
  }
}

class OpenAiCompatibleProvider extends BaseProvider {
  readonly name = "openai-compatible";

  constructor(
    apiKey: string,
    model: string,
    private readonly baseUrl: string,
    timeoutMs: number,
  ) {
    super(apiKey, model, timeoutMs);
  }

  protected override async request(payload: string, signal: AbortSignal): Promise<string> {
    const response = await fetch(`${trimSlash(this.baseUrl)}/chat/completions`, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTIONS },
          { role: "user", content: payload },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "statement_extraction",
            strict: false,
            schema: CANDIDATE_JSON_SCHEMA,
          },
        },
      }),
    });

    if (!response.ok) this.handleHttpFailure(response.status);

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim() === "") {
      throw new ProviderError("provider returned no content", "invalid_output");
    }
    return content;
  }
}

class AnthropicProvider extends BaseProvider {
  readonly name = "anthropic";

  constructor(
    apiKey: string,
    model: string,
    private readonly baseUrl: string | undefined,
    timeoutMs: number,
  ) {
    super(apiKey, model, timeoutMs);
  }

  protected override async request(payload: string, signal: AbortSignal): Promise<string> {
    const response = await fetch(
      `${trimSlash(this.baseUrl ?? "https://api.anthropic.com/v1")}/messages`,
      {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 16_000,
          temperature: 0,
          system: SYSTEM_INSTRUCTIONS,
          messages: [{ role: "user", content: payload }],
          // A single forced tool call is Anthropic's structured-output mechanism.
          tools: [
            {
              name: "return_statement_extraction",
              description: "Return the transcribed statement exactly as printed.",
              input_schema: CANDIDATE_JSON_SCHEMA,
            },
          ],
          tool_choice: { type: "tool", name: "return_statement_extraction" },
        }),
      },
    );

    if (!response.ok) this.handleHttpFailure(response.status);

    const body = (await response.json()) as {
      content?: Array<{ type?: string; input?: unknown }>;
    };
    const toolUse = body.content?.find((block) => block.type === "tool_use");
    if (!toolUse?.input) {
      throw new ProviderError("provider returned no structured output", "invalid_output");
    }
    return JSON.stringify(toolUse.input);
  }
}

/**
 * Validate the provider's output against our candidate schema.
 *
 * Malformed JSON, extra fields, and oversized payloads are rejected here rather than
 * being partially interpreted. Unknown keys are stripped by the schema, so a provider
 * that invents a `reconciled: true` field cannot influence anything.
 */
function parseCandidate(raw: string): NormalizedStatementCandidate {
  const text = stripCodeFence(raw);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ProviderError("provider returned malformed JSON", "invalid_output");
  }
  const parsed = candidateStatementSchema.safeParse(json);
  if (!parsed.success) {
    throw new ProviderError("provider output failed schema validation", "invalid_output");
  }
  return parsed.data;
}

/** Some models wrap JSON in a fenced block even when asked not to. */
function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
}

function trimSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
