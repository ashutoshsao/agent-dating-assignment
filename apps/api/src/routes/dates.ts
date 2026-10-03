import { Router } from "express";
import { z } from "zod";
import { bus } from "../bus";
import { computeRankings } from "../rankings";
import { assertCanDate, getDate, listDates, scheduleDate, startDate, startRound } from "../dates";
import { getOwnedPerson } from "../people";
import { resolveLlm } from "../llm";
import { keepAlive } from "../keepAlive";
import { ForbiddenError, visitorId } from "../visitor";

export const datesRouter = Router();

datesRouter.get("/", async (req, res) => {
  res.json(await listDates(visitorId(req)));
});

datesRouter.post("/", async (req, res) => {
  const body = z.object({ aId: z.string(), bId: z.string() }).safeParse(req.body);
  if (!body.success || body.data.aId === body.data.bId) return res.status(400).json({ error: "invalid_input" });
  await assertCanDate(body.data.aId, body.data.bId, visitorId(req));
  const llm = resolveLlm(req);
  const d = await scheduleDate(body.data.aId, body.data.bId).catch(() => null);
  if (!d) return res.status(422).json({ error: "not_analyzed", message: "Both people need an analyzed agent first." });
  keepAlive(startDate(d.id, llm));
  res.json({ id: d.id });
});

datesRouter.get("/:id", async (req, res) => {
  const d = await getDate(req.params.id, visitorId(req));
  if (!d) return res.status(404).json({ error: "not_found" });
  res.json(d);
});

/** EventSource stream of live events (works when the date runs in this process; clients also poll). */
datesRouter.get("/:id/stream", async (req, res) => {
  if (!(await getDate(req.params.id, visitorId(req)))) return res.status(404).end();
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
  const vid = visitorId(req);
  const d = await getDate(req.params.id, vid);
  if (!d) return res.status(404).json({ error: "not_found" });
  await assertCanDate(d.a.id, d.b.id, vid);
  keepAlive(startDate(d.id, resolveLlm(req)));
  res.json({ id: d.id });
});

export const roundsRouter = Router();

/** Send one of the visitor's people on dates with their top-k matches. */
roundsRouter.post("/", async (req, res) => {
  const parsed = z.object({ personId: z.string(), k: z.number().int().min(1).max(6).optional() }).safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "invalid_input", message: "personId is required" });
  const vid = visitorId(req);
  const person = await getOwnedPerson(parsed.data.personId, vid);
  if (!person) return res.status(404).json({ error: "not_found" });
  if (person.status !== "analyzed") throw new ForbiddenError("Analyze this person before sending them on dates.");
  const { done, ...result } = await startRound({ personId: person.id, k: parsed.data.k }, resolveLlm(req), vid);
  keepAlive(done);
  res.json(result);
});

export const rankingsRouter = Router();

rankingsRouter.get("/", async (req, res) => {
  res.json(await computeRankings(visitorId(req)));
});

rankingsRouter.get("/:personId", async (req, res) => {
  const [r] = await computeRankings(visitorId(req), req.params.personId);
  if (!r) return res.status(404).json({ error: "not_found" });
  res.json(r);
});
