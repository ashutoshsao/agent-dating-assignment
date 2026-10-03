import express from "express";
import cors from "cors";
import type { Health } from "@dating/shared";
import { prisma } from "./db";
import { pingLlm, resolveLlm, serverLlm } from "./llm";
import { peopleRouter } from "./routes/people";
import { datesRouter, rankingsRouter, roundsRouter } from "./routes/dates";
import { rateLimit } from "./rateLimit";
import { errorHandler } from "./errors";

export const app = express();
app.set("trust proxy", 1);
if (process.env.WEB_ORIGIN) app.use(cors({ origin: process.env.WEB_ORIGIN }));
app.use(express.json({ limit: "5mb" }));

app.get("/api/healthz", (_req, res) => res.send("ok"));
app.get("/api/health", async (_req, res) => {
  const db = await prisma.$queryRaw`SELECT 1`.then(() => "ok" as const, () => "error" as const);
  const llm = process.env.DEEPSEEK_API_KEY ? await pingLlm(serverLlm()) : ("missing_key" as const);
  const body: Health = { ok: db === "ok", db, llm };
  res.json(body);
});

// Endpoints that call an LLM run on the visitor's key, but still cap them per IP
const llmLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 30 });
app.post(["/api/people", "/api/people/:id/analyze", "/api/rounds", "/api/dates", "/api/dates/:id/rerun", "/api/llm/check"], llmLimit);

/** BYOK: verify the visitor's key/base URL/model with a 1-token call. */
app.post("/api/llm/check", async (req, res) => {
  const llm = resolveLlm(req);
  const ok = (await pingLlm(llm)) === "ok";
  res.status(ok ? 200 : 400).json({ ok, model: llm.id });
});

app.use("/api/people", peopleRouter);
app.use("/api/dates", datesRouter);
app.use("/api/rounds", roundsRouter);
app.use("/api/rankings", rankingsRouter);
app.use("/api", (_req, res) => res.status(404).json({ error: "not_found" }));
app.use(errorHandler);

export default app;
