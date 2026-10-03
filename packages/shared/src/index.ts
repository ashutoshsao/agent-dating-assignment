import { z } from "zod";

export const HealthSchema = z.object({
  ok: z.boolean(),
  db: z.enum(["ok", "error"]),
  llm: z.enum(["ok", "error", "missing_key"]),
});
export type Health = z.infer<typeof HealthSchema>;
