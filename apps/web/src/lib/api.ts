import { getVisitorId, openSettings, requestHeaders } from "./settings";

// Same origin in production (API and web on one Vercel project); separate port in dev
export const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:3001" : "");

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function toError(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => ({}));
  const err = new ApiError(res.status, body.error ?? "error", body.message ?? `Request failed (${res.status})`);
  if (err.code === "llm_key_required") openSettings(err.message);
  return err;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...requestHeaders(), ...init?.headers },
  });
  if (!res.ok) throw await toError(res);
  return res.json() as Promise<T>;
}

/** URL for an EventSource (which can't send headers): visitor id goes in the query. */
export const streamUrl = (path: string) => `${API_URL}${path}?v=${encodeURIComponent(getVisitorId())}`;

/** POST that returns a Server-Sent Events stream; calls onEvent per `data:` message. */
export async function streamSse<E>(path: string, onEvent: (e: E) => void, signal?: AbortSignal, body?: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...requestHeaders() },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  if (!res.ok || !res.body) throw await toError(res);
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const data = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (data) onEvent(JSON.parse(data.slice(6)) as E);
    }
  }
}
