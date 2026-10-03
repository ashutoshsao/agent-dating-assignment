import type { Request } from "express";

/** Anonymous visitor id sent by the web app (random UUID kept in localStorage). */
export function visitorId(req: Request): string | null {
  const v = (req.get("x-visitor-id") ?? (typeof req.query.v === "string" ? req.query.v : undefined))?.trim();
  return v && /^[A-Za-z0-9-]{8,64}$/.test(v) ? v : null;
}

/** People a visitor can see: the shared demo pool plus their own. */
export const visibleTo = (vid: string | null) => ({ OR: [{ ownerId: null }, ...(vid ? [{ ownerId: vid }] : [])] });

export class ForbiddenError extends Error {}
