/** Batch analysis: bun scripts/analyze.ts [--force] — analyzes every scraped person (concurrency 4). */
import pLimit from "p-limit";
import { prisma } from "../src/db";
import { analyzePerson } from "../src/agents/analyze";

const force = process.argv.includes("--force");
const people = await prisma.person.findMany({ where: { status: force ? { in: ["scraped", "analyzed"] } : "scraped" } });
console.log(`analyzing ${people.length} people`);
const limit = pLimit(4);
await Promise.all(
  people.map((p) =>
    limit(async () => {
      try {
        let evidence = "";
        await analyzePerson(p.id, (e) => {
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
