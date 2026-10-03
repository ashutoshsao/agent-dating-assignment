import type { LinkedInData, ScrapeStatus } from "@dating/shared";
import { CHROME_UA, decodeEntities, politeFetch } from "./http";

export interface ScrapeResult<T> {
  status: ScrapeStatus;
  data: T | null;
}

type Node = Record<string, any>;

const asArray = <T>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);
const names = (v: unknown): string[] =>
  asArray(v as any)
    .map((x: any) => (typeof x === "string" ? x : x?.name))
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());

export function parseLinkedInHtml(html: string): LinkedInData | null {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const nodes: Node[] = [];
  for (const [, json] of blocks) {
    try {
      const parsed = JSON.parse(json!);
      nodes.push(...asArray(parsed["@graph"] ?? parsed));
    } catch {
      /* ignore malformed block */
    }
  }
  const person = nodes.find((n) => n["@type"] === "Person");
  if (!person?.name) return null;

  const posts = nodes
    .filter((n) => n["@type"] === "Article" || n["@type"] === "DiscussionForumPosting")
    .map((n) => ({ title: n.headline?.trim() || undefined, text: decodeEntities(String(n.text ?? n.headline ?? "")).trim() }))
    .filter((p) => p.text.length > 0)
    .slice(0, 12);

  return {
    name: decodeEntities(person.name),
    headline: [...new Set(names(person.jobTitle))].join(" · ") || undefined,
    about: person.description ? decodeEntities(String(person.description)) : undefined,
    location: person.address?.addressLocality ?? person.address?.addressCountry,
    experience: asArray(person.worksFor)
      .filter((o: any) => o?.name)
      .map((o: any) => ({ org: String(o.name).trim(), startYear: o.member?.startDate ?? undefined })),
    education: names(person.alumniOf).map((school) => ({ school })),
    languages: names(person.knowsLanguage),
    awards: names(person.awards),
    memberships: names(person.memberOf),
    posts,
  };
}

export async function scrapeLinkedIn(profileUrl: string): Promise<ScrapeResult<LinkedInData>> {
  const res = await politeFetch(profileUrl, { "User-Agent": CHROME_UA });
  if (res.status === 404) return { status: "not_found", data: null };
  if (res.status !== 200 || /authwall|login|checkpoint/.test(res.finalUrl)) return { status: "blocked", data: null };
  const data = parseLinkedInHtml(res.body);
  return data ? { status: "ok", data } : { status: "blocked", data: null };
}
