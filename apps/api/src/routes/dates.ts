import { Router } from "express";
import { z } from "zod";
import { bus } from "../bus";
import { computeRankings } from "../rankings";
import { getDate, listDates, scheduleDate, startDate, startRound } from "../dates";

export const datesRouter = Router();

datesRouter.get("/", async (_req, res) => {
  res.json(await listDates());
});

datesRouter.post("/", async (req, res) => {
  const body = z.object({ aId: z.string(), bId: z.string() }).safeParse(req.body);
  if (!body.success || body.data.aId === body.data.bId) return res.status(400).json({ error: "invalid_input" });
  try {
    const d = await scheduleDate(body.data.aId, body.data.bId);
    startDate(d.id);
    res.json({ id: d.id });
  } catch {
    res.status(422).json({ error: "not_analyzed", message: "Both people need an analyzed agent first." });
  }
});

datesRouter.get("/:id", async (req, res) => {
  const d = await getDate(req.params.id);
  if (!d) return res.status(404).json({ error: "not_found" });
  res.json(d);
});

/** EventSource stream: live events for a date (client loads history via GET /:id first). */
datesRouter.get("/:id/stream", (req, res) => {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders();
  const ping = setInterval(() => res.write(": ping\n\n"), 15000);
  const off = bus.subscribe(req.params.id, (e) => res.write(`data: ${JSON.stringify(e)}\n\n`));
  req.on("close", () => {
    clearInterval(ping);
    off();
  });
});

datesRouter.post("/:id/rerun", async (req, res) => {
  const d = await getDate(req.params.id);
  if (!d) return res.status(404).json({ error: "not_found" });
  startDate(d.id);
  res.json({ id: d.id });
});

export const roundsRouter = Router();

roundsRouter.post("/", async (req, res) => {
  const parsed = z.object({ personId: z.string().optional(), k: z.number().int().min(1).max(6).optional(), force: z.boolean().optional() }).safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const admin = process.env.ADMIN_TOKEN && req.get("x-admin-token") === process.env.ADMIN_TOKEN;
  // Without force, a round only runs dates that haven't happened yet; re-running everything is admin-only
  if (parsed.data.force && process.env.NODE_ENV === "production" && !admin) {
    return res.status(403).json({ error: "forbidden", message: "Re-running every date is admin-only." });
  }
  res.json(await startRound(parsed.data));
});

export const rankingsRouter = Router();

rankingsRouter.get("/", async (_req, res) => {
  res.json(await computeRankings());
});

rankingsRouter.get("/:personId", async (req, res) => {
  const [r] = await computeRankings(req.params.personId);
  if (!r) return res.status(404).json({ error: "not_found" });
  res.json(r);
});
