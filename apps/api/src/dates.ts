import pLimit from "p-limit";
import type { DateDTO, DebriefOutput, Persona, Venue } from "@dating/shared";
import { prisma } from "./db";
import { runDate } from "./agents/date";
import { pickPairs, prescreen } from "./agents/prescreen";
import type { Llm } from "./llm";
import { ForbiddenError, visibleTo } from "./visitor";

const personSel = {
  select: { id: true, name: true, avatarSeed: true, ownerId: true, sources: { where: { kind: "linkedin" as const }, select: { data: true } } },
};

type Row = Awaited<ReturnType<typeof listRows>>[number];
const listRows = (vid: string | null) =>
  prisma.date.findMany({
    where: { a: visibleTo(vid), b: visibleTo(vid) },
    include: { a: personSel, b: personSel },
    orderBy: { createdAt: "desc" },
  });

const toPerson = (p: Row["a"]) => {
  const h = (p.sources[0]?.data as { headline?: string } | null)?.headline;
  return { id: p.id, name: p.name, avatarSeed: p.avatarSeed, owned: p.ownerId !== null, headline: h ? [...new Set(h.split(" · "))].join(" · ") : undefined };
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
  owned: d.a.ownerId !== null || d.b.ownerId !== null,
});

export async function listDates(vid: string | null): Promise<DateDTO[]> {
  return (await listRows(vid)).map(toDTO);
}

export async function getDate(id: string, vid: string | null): Promise<DateDTO | null> {
  const d = await prisma.date.findFirst({
    where: { id, a: visibleTo(vid), b: visibleTo(vid) },
    include: { a: personSel, b: personSel, turns: { orderBy: { idx: "asc" } }, debriefs: true },
  });
  if (!d) return null;
  return {
    ...toDTO(d),
    turns: d.turns.map((t) => ({ idx: t.idx, speakerId: t.speakerId, message: t.message, thought: t.thought, interest: t.interest })),
    debriefs: d.debriefs.map((x) => ({ personId: x.personId, score: x.score, data: x.data as DebriefOutput })),
  };
}

async function analyzedPeople(vid: string | null) {
  const rows = await prisma.person.findMany({ where: { status: "analyzed", ...visibleTo(vid) }, include: { analysis: true } });
  return rows.filter((r) => r.analysis).map((r) => ({ id: r.id, ownerId: r.ownerId, persona: r.analysis!.persona as unknown as Persona }));
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

/** A visitor may only create or re-run dates that involve one of their own people. */
export async function assertCanDate(aId: string, bId: string, vid: string | null) {
  const people = await prisma.person.findMany({ where: { id: { in: [aId, bId] }, ...visibleTo(vid) } });
  if (people.length !== 2) throw new ForbiddenError("Unknown person");
  if (!vid || !people.some((p) => p.ownerId === vid)) {
    throw new ForbiddenError("Demo dates are read-only — add your own person and send them on dates.");
  }
}

const limit = pLimit(6);
const running = new Map<string, Promise<unknown>>();

/** Run a date in the background (deduped while running). Returns its promise so hosts can keep it alive. */
export function startDate(dateId: string, llm: Llm): Promise<unknown> {
  const existing = running.get(dateId);
  if (existing) return existing;
  const p = limit(() => runDate(dateId, llm))
    .catch((e) => console.error(`date ${dateId} failed:`, e.message))
    .finally(() => running.delete(dateId));
  running.set(dateId, p);
  return p;
}

/**
 * Pre-screen and schedule a round.
 * - personId: that person's top-k among people visible to the visitor
 * - no personId: everyone in the demo pool (scripts/admin)
 * Skips finished dates unless force.
 */
export async function startRound(opts: { personId?: string; k?: number; force?: boolean }, llm: Llm, vid: string | null) {
  const people = await analyzedPeople(vid);
  const pairs = pickPairs(people, opts.k ?? 4, opts.personId);
  const ids: string[] = [];
  for (const p of pairs) {
    const d = await scheduleDate(p.aId, p.bId, p.score);
    if (d.status === "done" && !opts.force) continue;
    ids.push(d.id);
  }
  const done = Promise.all(ids.map((id) => startDate(id, llm)));
  return { scheduled: ids.length, pairs: pairs.length, dateIds: ids, done };
}
