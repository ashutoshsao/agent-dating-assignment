import type { InstagramData } from "@dating/shared";
import { GOOGLEBOT_UA, CHROME_UA, decodeEntities, politeFetch } from "./http";
import type { ScrapeResult } from "./linkedin";
import { instagramUrl } from "./normalize";

const unescapeJson = (s: string): string => {
  try {
    return JSON.parse(`"${s}"`);
  } catch {
    return s;
  }
};

function parseCount(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const m = s.replace(/,/g, "").match(/^([\d.]+)([KMB])?$/i);
  if (!m) return undefined;
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[m[2]?.toUpperCase() as "K" | "M" | "B"] ?? 1;
  return Math.round(Number(m[1]) * mult);
}

export function parseInstagramHtml(html: string, username: string): InstagramData | null {
  const og = html.match(/<meta property="og:description" content="([^"]*)"/)?.[1];
  const ogText = og ? decodeEntities(og) : "";
  const counts = ogText.match(/([\d.,]+[KMB]?) Followers, ([\d.,]+[KMB]?) Following, ([\d.,]+[KMB]?) Posts/i);

  // The embedded profile JSON for the requested user
  const userBlock = html.match(new RegExp(`"username":"${username}"[^]{0,4000}?"biography":"((?:[^"\\\\]|\\\\.)*)"`, "i"));
  const fullName = html.match(new RegExp(`"full_name":"((?:[^"\\\\]|\\\\.)*)"[^{}]{0,200}"username":"${username}"`, "i"))?.[1];
  const isPrivate = /"is_private":true/.test(html) && !/"is_private":false/.test(html);

  const captions = [
    ...new Set(
      [...html.matchAll(/"caption":\{[^{}]*?"text":"((?:[^"\\]|\\.)*)"/g)]
        .map((m) => unescapeJson(m[1]!).trim())
        .filter(Boolean),
    ),
  ].slice(0, 12);

  if (!counts && !userBlock && captions.length === 0) return null;

  return {
    username,
    fullName: fullName ? unescapeJson(fullName) : ogText.match(/from (.+?) \(@/)?.[1],
    bio: userBlock ? unescapeJson(userBlock[1]!) : undefined,
    isPrivate,
    followers: parseCount(counts?.[1]),
    following: parseCount(counts?.[2]),
    postsCount: parseCount(counts?.[3]),
    captions,
  };
}

/** Fallback: the web profile API (often 401 when rate-limited). */
async function scrapeViaApi(username: string): Promise<InstagramData | null> {
  const res = await politeFetch(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
    "User-Agent": CHROME_UA,
    "x-ig-app-id": "936619743392459",
  });
  if (res.status !== 200) return null;
  try {
    const u = JSON.parse(res.body)?.data?.user;
    if (!u) return null;
    return {
      username,
      fullName: u.full_name || undefined,
      bio: u.biography || undefined,
      isPrivate: Boolean(u.is_private),
      followers: u.edge_followed_by?.count,
      following: u.edge_follow?.count,
      postsCount: u.edge_owner_to_timeline_media?.count,
      captions: (u.edge_owner_to_timeline_media?.edges ?? [])
        .map((e: any) => e.node?.edge_media_to_caption?.edges?.[0]?.node?.text)
        .filter(Boolean)
        .slice(0, 12),
    };
  } catch {
    return null;
  }
}

export async function scrapeInstagram(username: string): Promise<ScrapeResult<InstagramData>> {
  const res = await politeFetch(instagramUrl(username), { "User-Agent": GOOGLEBOT_UA });
  if (res.status === 404) return { status: "not_found", data: null };
  let data = res.status === 200 ? parseInstagramHtml(res.body, username) : null;
  if (!data || (!data.bio && data.captions.length === 0 && !data.isPrivate)) {
    data = (await scrapeViaApi(username)) ?? data;
  }
  if (!data) return { status: "blocked", data: null };
  if (data.isPrivate) return { status: "private", data };
  return { status: "ok", data };
}
