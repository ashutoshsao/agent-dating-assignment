import { Router } from "express";
import { CreatePersonInputSchema } from "@dating/shared";
import { InvalidUrlError } from "../scrapers/normalize";
import { openSse } from "../sse";
import { analyzePerson } from "../agents/analyze";
import { getPerson, InstagramPrivateError, listPeople, scrapePerson } from "../people";

export const peopleRouter = Router();

peopleRouter.post("/", async (req, res) => {
  const parsed = CreatePersonInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
  try {
    res.json(await scrapePerson(parsed.data));
  } catch (err) {
    if (err instanceof InvalidUrlError) return res.status(400).json({ error: "invalid_url", message: err.message });
    if (err instanceof InstagramPrivateError) return res.status(422).json({ error: "instagram_private", message: err.message });
    console.error(err);
    res.status(500).json({ error: "scrape_failed" });
  }
});

peopleRouter.get("/", async (_req, res) => {
  res.json(await listPeople());
});

peopleRouter.get("/:id", async (req, res) => {
  const person = await getPerson(req.params.id);
  if (!person) return res.status(404).json({ error: "not_found" });
  res.json(person);
});

peopleRouter.post("/:id/rescrape", async (req, res) => {
  const person = await getPerson(req.params.id);
  if (!person) return res.status(404).json({ error: "not_found" });
  try {
    res.json(await scrapePerson({ linkedinUrl: person.linkedinUrl, instagramUrl: person.instagramUrl, force: true }));
  } catch (err) {
    if (err instanceof InstagramPrivateError) return res.status(422).json({ error: "instagram_private" });
    console.error(err);
    res.status(500).json({ error: "scrape_failed" });
  }
});

peopleRouter.post("/:id/analyze", async (req, res) => {
  const person = await getPerson(req.params.id);
  if (!person) return res.status(404).json({ error: "not_found" });
  const sse = openSse(res);
  try {
    await analyzePerson(person.id, sse.send);
  } catch (err) {
    console.error(err);
    sse.send({ type: "error", message: (err as Error).message });
  }
  sse.close();
});
