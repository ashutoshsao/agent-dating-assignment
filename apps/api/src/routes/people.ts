import { Router } from "express";
import { CreatePersonInputSchema } from "@dating/shared";
import { openSse } from "../sse";
import { analyzePerson } from "../agents/analyze";
import { getOwnedPerson, getPerson, listPeople, scrapePerson } from "../people";
import { resolveLlm } from "../llm";
import { ForbiddenError, visitorId } from "../visitor";

export const peopleRouter = Router();

peopleRouter.post("/", async (req, res) => {
  const parsed = CreatePersonInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
  const vid = visitorId(req);
  if (!vid) throw new ForbiddenError("Missing visitor id");
  res.json(await scrapePerson(parsed.data, vid));
});

peopleRouter.get("/", async (req, res) => {
  res.json(await listPeople(visitorId(req)));
});

peopleRouter.get("/:id", async (req, res) => {
  const person = await getPerson(req.params.id, visitorId(req));
  if (!person) return res.status(404).json({ error: "not_found" });
  res.json(person);
});

peopleRouter.post("/:id/rescrape", async (req, res) => {
  const vid = visitorId(req);
  const person = await getOwnedPerson(req.params.id, vid);
  if (!person) return res.status(404).json({ error: "not_found" });
  res.json(await scrapePerson({ linkedinUrl: person.linkedinUrl, instagramUrl: person.instagramUrl, force: true }, vid));
});

peopleRouter.post("/:id/analyze", async (req, res) => {
  const person = await getOwnedPerson(req.params.id, visitorId(req));
  if (!person) return res.status(404).json({ error: "not_found" });
  const llm = resolveLlm(req); // before opening the stream so a missing key is a plain 401
  const sse = openSse(res);
  try {
    await analyzePerson(person.id, llm, sse.send);
  } catch (err) {
    console.error("analysis failed:", (err as Error).message);
    sse.send({ type: "error", message: "Analysis failed — check your API key and model, then retry." });
  }
  sse.close();
});
