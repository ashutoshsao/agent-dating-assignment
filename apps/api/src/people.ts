import type { AnalysisTraceStep, Persona, CreatePersonInput, InstagramData, LinkedInData, PersonDTO, ScrapeStatus } from "@dating/shared";
import { prisma } from "./db";
import { instagramUrl, normalizeInstagram, normalizeLinkedIn } from "./scrapers/normalize";
import { scrapeLinkedIn, type ScrapeResult } from "./scrapers/linkedin";
import { scrapeInstagram } from "./scrapers/instagram";
import { ForbiddenError, visibleTo } from "./visitor";

export class InstagramPrivateError extends Error {}

type PersonWithSources = NonNullable<Awaited<ReturnType<typeof getPersonRow>>>;

function getPersonRow(id: string) {
  return prisma.person.findUnique({ where: { id }, include: { sources: true, analysis: true } });
}

export function toDTO(p: Omit<PersonWithSources, "analysis"> & { analysis?: PersonWithSources["analysis"] }): PersonDTO {
  const li = p.sources.find((s) => s.kind === "linkedin")?.data as LinkedInData | null | undefined;
  return {
    id: p.id,
    name: p.name,
    linkedinUrl: p.linkedinUrl,
    instagramUrl: p.instagramUrl,
    avatarSeed: p.avatarSeed,
    status: p.status,
    owned: p.ownerId !== null,
    headline: li?.headline ? [...new Set(li.headline.split(" · "))].join(" · ") : undefined,
    sources: p.sources.map((s) => ({
      kind: s.kind,
      status: s.status,
      data: s.data as LinkedInData | InstagramData | null,
      fetchedAt: s.fetchedAt.toISOString(),
    })),
    persona: (p.analysis?.persona as Persona | undefined) ?? undefined,
    trace: (p.analysis?.trace as AnalysisTraceStep[] | undefined) ?? undefined,
  };
}

const slugToName = (url: string) =>
  url
    .split("/in/")[1]!
    .replace(/-[0-9a-f]{6,}$/i, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/** Apply pasted text as a fallback when scraping didn't produce data. */
function withManual<T extends { manualText?: string }>(
  res: ScrapeResult<T>,
  text: string | undefined,
  empty: () => T,
): ScrapeResult<T> {
  if (!text?.trim()) return res;
  if (res.status === "ok" && res.data) return { ...res, data: { ...res.data, manualText: text.trim() } };
  return { status: "manual", data: { ...(res.data ?? empty()), manualText: text.trim() } };
}

/**
 * Scrape a person into the visitor's space (ownerId) or the demo pool (ownerId null, scripts only).
 * Links that match a demo person return the demo person as-is: no scraping, no LLM spend.
 */
export async function scrapePerson(input: CreatePersonInput & { force?: boolean }, ownerId: string | null): Promise<PersonDTO> {
  const linkedinUrl = normalizeLinkedIn(input.linkedinUrl);
  const username = normalizeInstagram(input.instagramUrl);
  const igUrl = instagramUrl(username);

  if (ownerId) {
    const demo = await prisma.person.findFirst({ where: { linkedinUrl, ownerId: null }, include: { sources: true, analysis: true } });
    if (demo) return toDTO(demo);
  }
  const existing = await prisma.person.findFirst({ where: { linkedinUrl, ownerId }, include: { sources: true } });
  const cachedOk =
    existing && existing.sources.length === 2 && existing.sources.every((s) => s.status === "ok" || s.status === "manual");
  if (existing && cachedOk && !input.force && !input.linkedinText && !input.instagramText) return toDTO(existing);

  const [liRaw, igRaw] = await Promise.all([scrapeLinkedIn(linkedinUrl), scrapeInstagram(username)]);
  if (igRaw.status === "private") throw new InstagramPrivateError("Instagram profile is private");

  const li = withManual<LinkedInData>(liRaw, input.linkedinText, () => ({
    name: slugToName(linkedinUrl), experience: [], education: [], languages: [], awards: [], memberships: [], posts: [],
  }));
  const ig = withManual<InstagramData>(igRaw, input.instagramText, () => ({ username, isPrivate: false, captions: [] }));

  const name = li.data?.name ?? (ig.data as InstagramData | null)?.fullName ?? slugToName(linkedinUrl);
  const ok = (s: ScrapeStatus) => s === "ok" || s === "manual";

  const status = ok(li.status) && ok(ig.status) ? "scraped" : "error";
  const person = existing
    ? await prisma.person.update({ where: { id: existing.id }, data: { name, instagramUrl: igUrl, status } })
    : await prisma.person.create({ data: { name, linkedinUrl, instagramUrl: igUrl, avatarSeed: username, status, ownerId } });

  for (const [kind, res] of [["linkedin", li], ["instagram", ig]] as const) {
    const data = (res.data ?? undefined) as any;
    await prisma.source.upsert({
      where: { personId_kind: { personId: person.id, kind } },
      create: { personId: person.id, kind, status: res.status, data },
      update: { status: res.status, data, fetchedAt: new Date() },
    });
  }
  return toDTO((await getPersonRow(person.id))!);
}

export async function listPeople(vid: string | null): Promise<PersonDTO[]> {
  const rows = await prisma.person.findMany({
    where: visibleTo(vid),
    include: { sources: true, analysis: true },
    orderBy: [{ ownerId: { sort: "desc", nulls: "last" } }, { createdAt: "asc" }],
  });
  // List view: summary only — full personas are fetched per profile
  return rows.map((p) => {
    const { sources, trace, persona, ...dto } = toDTO(p);
    return { ...dto, summary: persona?.summary };
  });
}

export async function getPerson(id: string, vid: string | null): Promise<PersonDTO | null> {
  const row = await getPersonRow(id);
  if (!row || (row.ownerId !== null && row.ownerId !== vid)) return null;
  return toDTO(row);
}

/** Only the visitor who added a person may spend tokens on them; demo people are read-only. */
export async function getOwnedPerson(id: string, vid: string | null) {
  const row = await prisma.person.findUnique({ where: { id } });
  if (!row || (row.ownerId !== null && row.ownerId !== vid)) return null;
  if (row.ownerId === null || !vid) throw new ForbiddenError("Demo profiles are read-only — add your own person to try this.");
  return row;
}
