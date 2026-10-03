import type { DatePersonDTO, DebriefOutput, Persona, RankingDTO, RankRow } from "@dating/shared";
import { prisma } from "./db";
import { prescreen } from "./agents/prescreen";

const dedupe = (h?: string) => (h ? [...new Set(h.split(" · "))].join(" · ") : undefined);

export async function computeRankings(onlyFor?: string): Promise<RankingDTO[]> {
  const [people, dates] = await Promise.all([
    prisma.person.findMany({
      where: { status: "analyzed" },
      include: { analysis: true, sources: { where: { kind: "linkedin" }, select: { data: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.date.findMany({ include: { debriefs: true } }),
  ]);

  const card = (p: (typeof people)[number]): DatePersonDTO => ({
    id: p.id,
    name: p.name,
    avatarSeed: p.avatarSeed,
    headline: dedupe((p.sources[0]?.data as { headline?: string } | null)?.headline),
  });
  const persona = (p: (typeof people)[number]) => p.analysis!.persona as unknown as Persona;
  const dateFor = (x: string, y: string) => dates.find((d) => (d.aId === x && d.bId === y) || (d.aId === y && d.bId === x));

  return people
    .filter((p) => !onlyFor || p.id === onlyFor)
    .map((p) => {
      const rows: Omit<RankRow, "rank">[] = people
        .filter((q) => q.id !== p.id)
        .map((q) => {
          const d = dateFor(p.id, q.id);
          const estimate = Math.round(100 * prescreen(persona(p), persona(q)));
          const mine = d?.debriefs.find((x) => x.personId === p.id);
          const theirs = d?.debriefs.find((x) => x.personId === q.id);
          const dated = d?.status === "done" && d.mutual != null;
          return {
            other: card(q),
            dated,
            dateId: d?.id,
            dateStatus: d?.status,
            mutual: dated ? d!.mutual! : undefined,
            myScore: mine?.score,
            theirScore: theirs?.score,
            iWouldSeeAgain: (mine?.data as DebriefOutput | undefined)?.wouldSeeAgain,
            theyWouldSeeAgain: (theirs?.data as DebriefOutput | undefined)?.wouldSeeAgain,
            report: (mine?.data as DebriefOutput | undefined)?.reportToPerson,
            estimate,
          };
        })
        .sort((x, y) => {
          if (x.dated !== y.dated) return x.dated ? -1 : 1;
          if (x.dated) return y.mutual! - x.mutual! || (y.myScore ?? 0) - (x.myScore ?? 0);
          return y.estimate - x.estimate;
        });
      return { person: card(p), matches: rows.map((r, i) => ({ ...r, rank: i + 1 })) };
    });
}
