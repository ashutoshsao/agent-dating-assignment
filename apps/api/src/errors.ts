import type { ErrorRequestHandler } from "express";
import { InvalidLlmConfigError, LlmKeyRequiredError } from "./llm";
import { ForbiddenError } from "./visitor";
import { InvalidUrlError } from "./scrapers/normalize";
import { InstagramPrivateError } from "./people";

/** Map domain errors to HTTP responses (Express 5 forwards async rejections here). */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (res.headersSent) return;
  if (err instanceof LlmKeyRequiredError) return res.status(401).json({ error: "llm_key_required", message: err.message });
  if (err instanceof InvalidLlmConfigError) return res.status(400).json({ error: "invalid_llm_config", message: err.message });
  if (err instanceof ForbiddenError) return res.status(403).json({ error: "forbidden", message: err.message });
  if (err instanceof InvalidUrlError) return res.status(400).json({ error: "invalid_url", message: err.message });
  if (err instanceof InstagramPrivateError) return res.status(422).json({ error: "instagram_private", message: err.message });
  console.error(err);
  res.status(500).json({ error: "internal", message: "Something went wrong" });
};
