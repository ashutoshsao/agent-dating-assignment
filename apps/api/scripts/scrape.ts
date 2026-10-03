/**
 * Batch scrape: bun scripts/scrape.ts [file=../../data/people.json] [--force]
 * File format: [{ "linkedinUrl": "...", "instagramUrl": "..." }]
 */
import path from "node:path";
import { CreatePersonInputSchema } from "@dating/shared";
import { scrapePerson } from "../src/people";
import { prisma } from "../src/db";

const args = process.argv.slice(2);
const force = args.includes("--force");
const file = path.resolve(args.find((a) => !a.startsWith("--")) ?? path.join(import.meta.dir, "../../../data/people.json"));
const list = CreatePersonInputSchema.array().parse(await Bun.file(file).json());

console.log(`scraping ${list.length} people from ${file}${force ? " (force)" : ""}`);
const results = await Promise.all(
  list.map(async (input, i) => {
    try {
      const p = await scrapePerson({ ...input, force }, null);
      const s = Object.fromEntries(p.sources!.map((x) => [x.kind, x.status]));
      const ig = p.sources!.find((x) => x.kind === "instagram")?.data as any;
      console.log(`${String(i + 1).padStart(2)} ${p.name.padEnd(28)} li=${s.linkedin} ig=${s.instagram} igName=${ig?.fullName ?? "-"} captions=${ig?.captions?.length ?? 0}`);
      return s.linkedin === "ok" && s.instagram === "ok";
    } catch (err) {
      console.log(`${String(i + 1).padStart(2)} ${input.linkedinUrl} FAILED: ${(err as Error).message}`);
      return false;
    }
  }),
);
console.log(`\n${results.filter(Boolean).length}/${list.length} fully ok`);
await prisma.$disconnect();
