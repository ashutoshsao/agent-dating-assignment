import express from "express";
import cors from "cors";
import type { Health } from "@dating/shared";
import { prisma } from "./db";
import { pingLlm } from "./llm";

const app = express();
app.use(cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json({ limit: "5mb" }));

app.get("/health", async (_req, res) => {
  const db = await prisma.$queryRaw`SELECT 1`.then(() => "ok" as const, () => "error" as const);
  const llm = await pingLlm();
  const body: Health = { ok: db === "ok" && llm === "ok", db, llm };
  res.json(body);
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`api on http://localhost:${port}`));
