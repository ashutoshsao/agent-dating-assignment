import pLimit from "p-limit";
import type { DateDTO, DebriefOutput, Persona, Venue } from "@dating/shared";
import { prisma } from "./db";
import { runDate } from "./agents/date";
import { pickPairs, prescreen } from "./agents/prescreen";

const personSel = { select: { id: true, name: true, avatarSeed: true, sources: { where: { kind: "linkedin" as const }, select: { data: true } } } };

type Row = Awaited<ReturnType<typeof listRows>>[number];
const listRows = () => prisma.date.findMany({ include: { a: personSel, b: personSel }, orderBy: { createdAt: "desc" } });

const toPerson = (p: Row["a"]) => {
  const h = (p.sources[0]?.data as { headline?: string } | null)?.headline;
  return { id: p.id, name: p.name, avatarSeed: p.avatarSeed, headline: h ? [...new Set(h.split(" · "))].join(" · ") : undefined };
};

const toDTO = (d: Row): DateDTO => ({
  id: d.id,
  status: d.status,
  a: toPerson(d.a),
  b: toPerson(d.b),
  venue: d.venue as Venue | null,
  prescreen: d.prescreen,
  mutual: d.mutual,
  createdAt: d.createdAt.toISOString(),
});

export async function listDates(): Promise<DateDTO[]> {
  return (await listRows()).map(toDTO);
}

export async function getDate(id: string): Promise<DateDTO | null> {
  const d = await prisma.date.findUnique({
    where: { id },
    include: { a: personSel, b: personSel, turns: { orderBy: { idx: "asc" } }, debriefs: true },
  });
  if (!d) return null;
  return {
    ...toDTO(d),
    turns: d.turns.map((t) => ({ idx: t.idx, speakerId: t.speakerId, message: t.message, thought: t.thought, interest: t.interest })),
    debriefs: d.debriefs.map((x) => ({ personId: x.personId, score: x.score, data: x.data as DebriefOutput })),
  };
}

async function analyzedPeople() {
  const rows = await prisma.person.findMany({ where: { status: "analyzed" }, include: { analysis: true } });
  return rows.filter((r) => r.analysis).map((r) => ({ id: r.id, persona: r.analysis!.persona as unknown as Persona }));
}

/** Create (or reuse) a date row for an unordered pair. */
export async function scheduleDate(x: string, y: string, score?: number) {
  const [aId, bId] = [x, y].sort() as [string, string];
  let s = score;
  if (s == null) {
    const [pa, pb] = await Promise.all([aId, bId].map((id) => prisma.analysis.findUniqueOrThrow({ where: { personId: id } })));
    s = prescreen(pa!.persona as unknown as Persona, pb!.persona as unknown as Persona);
  }
  return prisma.date.upsert({ where: { aId_bId: { aId, bId } }, create: { aId, bId, prescreen: s }, update: { prescreen: s } });
}

const limit = pLimit(6);
const running = new Set<string>();

/** Start a date in the background (deduped while running). */
export function startDate(dateId: string) {
  if (running.has(dateId)) return;
  running.add(dateId);
  return limit(() => runDate(dateId))
    .catch((e) => console.error(`date ${dateId} failed:`, e.message))
    .finally(() => running.delete(dateId));
}

/** Pre-screen and schedule a round: everyone's top-k, or a single person's. Skips finished dates unless force. */
export async function startRound(opts: { personId?: string; k?: number; force?: boolean } = {}) {
  const people = await analyzedPeople();
  const pairs = pickPairs(people, opts.k ?? 4, opts.personId);
  const ids: string[] = [];
  for (const p of pairs) {
    const d = await scheduleDate(p.aId, p.bId, p.score);
    if (d.status === "done" && !opts.force) continue;
    ids.push(d.id);
  }
  ids.forEach((id) => startDate(id));
  return { scheduled: ids.length, pairs: pairs.length, dateIds: ids };
}
