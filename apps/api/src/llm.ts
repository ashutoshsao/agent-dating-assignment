import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type LanguageModel } from "ai";
import { z } from "zod";
import type { Request } from "express";

export const DEFAULT_BASE_URL = "https://api.deepseek.com/v1";
export const DEFAULT_MODEL = "deepseek-chat";

/** A ready-to-use chat model plus its id (stored with analyses). */
export interface Llm {
  model: LanguageModel;
  id: string;
}

export class LlmKeyRequiredError extends Error {}
export class InvalidLlmConfigError extends Error {}

// Any OpenAI-compatible endpoint — always via .chat() (Chat Completions), never the Responses API.
function makeLlm(apiKey: string, baseURL = DEFAULT_BASE_URL, modelId = DEFAULT_MODEL): Llm {
  const provider = createOpenAI({ name: "byok", baseURL, apiKey });
  return { model: provider.chat(modelId), id: modelId };
}

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$|\[?f[cd])/i;

/** Visitor-supplied base URLs must be public https endpoints (no SSRF into the host network). */
function checkBaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new InvalidLlmConfigError("Base URL is not a valid URL");
  }
  if (url.protocol !== "https:") throw new InvalidLlmConfigError("Base URL must use https");
  if (PRIVATE_HOST.test(url.hostname) || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) {
    throw new InvalidLlmConfigError("Base URL must be a public hostname");
  }
  return url.toString().replace(/\/$/, "");
}

/** Server-side key: local dev and batch scripts only. */
export function serverLlm(): Llm {
  if (!process.env.DEEPSEEK_API_KEY) throw new LlmKeyRequiredError("DEEPSEEK_API_KEY is not set");
  return makeLlm(process.env.DEEPSEEK_API_KEY);
}

/** BYOK: the visitor's key from request headers; never stored or logged. */
export function resolveLlm(req: Request): Llm {
  const key = req.get("x-llm-key")?.trim();
  if (key) {
    const base = req.get("x-llm-base-url")?.trim();
    const model = req.get("x-llm-model")?.trim();
    if (model && !/^[\w.:/-]{1,100}$/.test(model)) throw new InvalidLlmConfigError("Invalid model name");
    return makeLlm(key, base ? checkBaseUrl(base) : DEFAULT_BASE_URL, model || DEFAULT_MODEL);
  }
  if (process.env.ALLOW_SERVER_KEY === "1") return serverLlm();
  throw new LlmKeyRequiredError("Add your own LLM API key in Settings to do this.");
}

export async function pingLlm(llm: Llm): Promise<"ok" | "error"> {
  try {
    await generateText({ model: llm.model, prompt: "Reply with: ok", maxOutputTokens: 1 });
    return "ok";
  } catch {
    return "error";
  }
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1];
  const body = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(body);
}

/**
 * Structured output for DeepSeek (which rejects json_schema response_format):
 * schema goes into the prompt, reply is parsed + Zod-validated, with one repair retry.
 */
export async function generateJson<S extends z.ZodType>(
  llm: Llm,
  opts: { schema: S; system: string; prompt: string; temperature?: number },
): Promise<z.infer<S>> {
  const jsonSchema = JSON.stringify(z.toJSONSchema(opts.schema));
  const system = `${opts.system}\n\nRespond with ONLY a JSON object matching this JSON Schema (no prose, no markdown):\n${jsonSchema}`;
  const messages: { role: "user" | "assistant"; content: string }[] = [{ role: "user", content: opts.prompt }];

  for (let attempt = 0; attempt < 2; attempt++) {
    const { text } = await generateText({ model: llm.model, system, messages, temperature: opts.temperature ?? 0.4, maxOutputTokens: 8000 });
    let error: string;
    try {
      const parsed = opts.schema.safeParse(extractJson(text));
      if (parsed.success) return parsed.data;
      error = z.prettifyError(parsed.error);
    } catch (e) {
      error = `Invalid JSON: ${(e as Error).message}`;
    }
    messages.push({ role: "assistant", content: text }, { role: "user", content: `That failed validation:\n${error}\nReturn the corrected JSON object only.` });
  }
  throw new Error("LLM did not return valid JSON after retry");
}
