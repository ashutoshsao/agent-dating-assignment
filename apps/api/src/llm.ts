import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const deepseek = createOpenAI({
  name: "deepseek",
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// DeepSeek only speaks Chat Completions — always use .chat(), never the Responses API.
export const model = deepseek.chat("deepseek-chat");

export async function pingLlm(): Promise<"ok" | "error" | "missing_key"> {
  if (!process.env.DEEPSEEK_API_KEY) return "missing_key";
  try {
    await generateText({ model, prompt: "Reply with: ok", maxOutputTokens: 1 });
    return "ok";
  } catch {
    return "error";
  }
}
