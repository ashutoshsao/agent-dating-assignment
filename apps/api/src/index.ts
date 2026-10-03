import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { app } from "./app";

// When run as a plain server (not on Vercel), also serve the built web app if present
const webDist = path.resolve(import.meta.dir, "../../web/dist");
if (existsSync(webDist) && process.env.SERVE_WEB === "1") {
  app.use(express.static(webDist, { maxAge: "1h", index: false }));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(webDist, "index.html")));
}

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`api on http://localhost:${port}`));
