/** Batch analysis: bun scripts/analyze.ts [--force] — analyzes every scraped person (concurrency 4). */
import pLimit from "p-limit";
import { prisma } from "../src/db";
import { analyzePerson } from "../src/agents/analyze";
import { serverLlm } from "../src/llm";

const force = process.argv.includes("--force");
const llm = serverLlm();
// Scripts manage the demo pool only (ownerId null)
const people = await prisma.person.findMany({ where: { ownerId: null, status: force ? { in: ["scraped", "analyzed"] } : "scraped" } });
console.log(`analyzing ${people.length} people`);
const limit = pLimit(4);
await Promise.all(
  people.map((p) =>
    limit(async () => {
      try {
        let evidence = "";
        await analyzePerson(p.id, llm, (e) => {
          if (e.type === "step" && e.status === "done" && e.step === "evidence") evidence = e.notes;
        });
        console.log(`✓ ${p.name.padEnd(26)} ${evidence}`);
      } catch (err) {
        console.log(`✗ ${p.name}: ${(err as Error).message}`);
      }
    }),
  ),
);
await prisma.$disconnect();
