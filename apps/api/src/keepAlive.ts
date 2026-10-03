import { waitUntil } from "@vercel/functions";

/** Keep background work (dates) running after the response on serverless hosts; no-op locally. */
export function keepAlive(p: Promise<unknown>) {
  waitUntil(p.catch(() => {}));
}
