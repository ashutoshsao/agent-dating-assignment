import type { RequestHandler } from "express";

/** Minimal fixed-window, per-IP rate limiter (in-memory; fine for a single instance). */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }): RequestHandler {
  const hits = new Map<string, { count: number; reset: number }>();
  return (req, res, next) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    if (++entry.count > max) {
      res.setHeader("Retry-After", Math.ceil((entry.reset - now) / 1000));
      return res.status(429).json({ error: "rate_limited", message: "Too many requests — try again later." });
    }
    next();
  };
}
