/** Run a full dating round: bun scripts/round.ts [k=4] [--force] — waits for all dates to finish. */
import { prisma } from "../src/db";
import { startRound } from "../src/dates";
import { bus } from "../src/bus";
import { serverLlm } from "../src/llm";

const k = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 4);
const force = process.argv.includes("--force");
// Demo pool only (visitor null)
const { dateIds, pairs } = await startRound({ k, force }, serverLlm(), null);
console.log(`${pairs} pairs, running ${dateIds.length} dates`);
let left = dateIds.length;
await new Promise<void>((resolve) => {
  if (!left) resolve();
  for (const id of dateIds) {
    const off = bus.subscribe(id, async (e) => {
      if (e.type !== "done" && e.type !== "error") return;
      off();
      const d = await prisma.date.findUnique({ where: { id }, include: { a: true, b: true } });
      console.log(`${e.type === "done" ? "✓" : "✗"} ${d?.a.name} × ${d?.b.name} → ${e.type === "done" ? e.mutual : e.message}  (${--left} left)`);
      if (!left) resolve();
    });
  }
});
await prisma.$disconnect();
