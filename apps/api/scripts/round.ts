/** Run a full dating round: bun scripts/round.ts [k=4] [--force] — waits for all dates to finish. */
import { prisma } from "../src/db";
import { startRound } from "../src/dates";
import { bus } from "../src/bus";

const k = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 4);
const force = process.argv.includes("--force");
const { dateIds, pairs } = await startRound({ k, force });
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
