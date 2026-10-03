import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { z } from "zod";

const deepseek = createOpenAI({
  name: "deepseek",
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// DeepSeek only speaks Chat Completions — always use .chat(), never the Responses API.
export const MODEL_ID = "deepseek-chat";
export const model = deepseek.chat(MODEL_ID);

export async function pingLlm(): Promise<"ok" | "error" | "missing_key"> {
  if (!process.env.DEEPSEEK_API_KEY) return "missing_key";
  try {
    await generateText({ model, prompt: "Reply with: ok", maxOutputTokens: 1 });
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
export async function generateJson<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  prompt: string;
  temperature?: number;
}): Promise<z.infer<S>> {
  const jsonSchema = JSON.stringify(z.toJSONSchema(opts.schema));
  const system = `${opts.system}\n\nRespond with ONLY a JSON object matching this JSON Schema (no prose, no markdown):\n${jsonSchema}`;
  const messages: { role: "user" | "assistant"; content: string }[] = [{ role: "user", content: opts.prompt }];

  for (let attempt = 0; attempt < 2; attempt++) {
    const { text } = await generateText({ model, system, messages, temperature: opts.temperature ?? 0.4, maxOutputTokens: 8000 });
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
