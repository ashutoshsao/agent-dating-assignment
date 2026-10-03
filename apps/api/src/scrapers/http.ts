import pLimit from "p-limit";

export const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
export const GOOGLEBOT_UA = "Googlebot/2.1 (+http://www.google.com/bot.html)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Per-host queues: LinkedIn rate-limits hard (HTTP 999), so it gets one request at a time.
const hosts = {
  linkedin: { limit: pLimit(1), minDelay: 2500 },
  default: { limit: pLimit(2), minDelay: 1000 },
};
const RETRYABLE = new Set([429, 999]);
const BACKOFF_MS = [6000, 15000];

export interface FetchResult {
  status: number;
  finalUrl: string;
  body: string;
}

/** Polite fetch: per-host concurrency + jitter, retries with backoff on 429/999/5xx/network errors. */
export function politeFetch(url: string, headers: Record<string, string>): Promise<FetchResult> {
  const host = new URL(url).hostname.includes("linkedin.com") ? hosts.linkedin : hosts.default;
  return host.limit(async () => {
    for (let attempt = 0; ; attempt++) {
      await sleep(host.minDelay + Math.random() * 1000);
      const canRetry = attempt < BACKOFF_MS.length;
      try {
        const res = await fetch(url, {
          headers: { "Accept-Language": "en-US,en;q=0.9", ...headers },
          redirect: "follow",
          signal: AbortSignal.timeout(20000),
        });
        const body = await res.text();
        if ((RETRYABLE.has(res.status) || res.status >= 500) && canRetry) {
          await sleep(BACKOFF_MS[attempt]!);
          continue;
        }
        return { status: res.status, finalUrl: res.url, body };
      } catch (err) {
        if (!canRetry) throw err;
        await sleep(BACKOFF_MS[attempt]!);
      }
    }
  });
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
