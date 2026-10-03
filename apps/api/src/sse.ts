import type { Response } from "express";

/** Open a Server-Sent Events stream; returns a send fn and a close fn. */
export function openSse(res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  const ping = setInterval(() => res.write(": ping\n\n"), 15000);
  let closed = false;
  res.on("close", () => {
    closed = true;
    clearInterval(ping);
  });
  return {
    send: (event: unknown) => {
      if (!closed) res.write(`data: ${JSON.stringify(event)}\n\n`);
    },
    close: () => {
      clearInterval(ping);
      if (!closed) res.end();
    },
    get closed() {
      return closed;
    },
  };
}
