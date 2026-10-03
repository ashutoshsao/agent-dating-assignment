export class InvalidUrlError extends Error {}

function parseUrl(input: string): URL {
  const raw = input.trim();
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new InvalidUrlError(`Not a URL: ${input}`);
  }
}

export function normalizeLinkedIn(input: string): string {
  const url = parseUrl(input);
  if (!/(^|\.)linkedin\.com$/i.test(url.hostname)) throw new InvalidUrlError("Not a LinkedIn URL");
  const slug = url.pathname.match(/^\/in\/([^/?#]+)/i)?.[1];
  if (!slug) throw new InvalidUrlError("LinkedIn URL must be a profile (/in/<name>)");
  return `https://www.linkedin.com/in/${decodeURIComponent(slug).toLowerCase()}`;
}

const IG_RESERVED = new Set(["p", "reel", "reels", "explore", "stories", "accounts", "tv", "direct"]);

export function normalizeInstagram(input: string): string {
  const raw = input.trim();
  if (/^@?[a-z0-9._]{1,30}$/i.test(raw)) return raw.replace(/^@/, "").toLowerCase();
  const url = parseUrl(raw);
  if (!/(^|\.)instagram\.com$/i.test(url.hostname)) throw new InvalidUrlError("Not an Instagram URL");
  const user = url.pathname.split("/").filter(Boolean)[0];
  if (!user || IG_RESERVED.has(user.toLowerCase()) || !/^[a-z0-9._]{1,30}$/i.test(user)) {
    throw new InvalidUrlError("Instagram URL must be a profile (instagram.com/<username>)");
  }
  return user.toLowerCase();
}

export const instagramUrl = (username: string) => `https://www.instagram.com/${username}/`;
