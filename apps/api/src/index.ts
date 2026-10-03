import express from "express";
import cors from "cors";
import path from "node:path";
import { existsSync } from "node:fs";
import type { Health } from "@dating/shared";
import { prisma } from "./db";
import { pingLlm } from "./llm";
import { peopleRouter } from "./routes/people";
import { datesRouter, rankingsRouter, roundsRouter } from "./routes/dates";
import { rateLimit } from "./rateLimit";

const app = express();
app.set("trust proxy", 1);
app.use(cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json({ limit: "5mb" }));

// Cheap liveness probe for the host; /health also pings the LLM
app.get("/healthz", (_req, res) => res.send("ok"));
app.get("/health", async (_req, res) => {
  const db = await prisma.$queryRaw`SELECT 1`.then(() => "ok" as const, () => "error" as const);
  const llm = await pingLlm();
  const body: Health = { ok: db === "ok" && llm === "ok", db, llm };
  res.json(body);
});

// Public site: cap the endpoints that spend LLM tokens
const llmLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 30 });
app.post(["/api/people", "/api/people/:id/analyze", "/api/rounds", "/api/dates", "/api/dates/:id/rerun"], llmLimit);

app.use("/api/people", peopleRouter);
app.use("/api/dates", datesRouter);
app.use("/api/rounds", roundsRouter);
app.use("/api/rankings", rankingsRouter);

// In production the API also serves the built web app (single origin, no CORS)
const webDist = path.resolve(import.meta.dir, "../../web/dist");
if (existsSync(webDist)) {
  app.use(express.static(webDist, { maxAge: "1h", index: false }));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(webDist, "index.html")));
}

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`api on http://localhost:${port}`));
