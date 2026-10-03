import { Router } from "express";
import { z } from "zod";
import { bus } from "../bus";
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
  const body = z.object({ personId: z.string().optional(), k: z.number().int().min(1).max(10).optional(), force: z.boolean().optional() }).parse(req.body ?? {});
  res.json(await startRound(body));
});
