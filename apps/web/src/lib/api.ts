// Same origin in production (API serves the web app); separate port in dev
export const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:3001" : "");

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? "error", body.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

/** POST that returns a Server-Sent Events stream; calls onEvent per `data:` message. */
export async function streamSse<E>(path: string, onEvent: (e: E) => void, signal?: AbortSignal, body?: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  if (!res.ok || !res.body) throw new ApiError(res.status, "stream_failed", `Stream failed (${res.status})`);
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
