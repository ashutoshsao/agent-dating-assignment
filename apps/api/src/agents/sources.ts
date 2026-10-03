import type { InstagramData, LinkedInData } from "@dating/shared";

/** Flatten scraped LinkedIn data into the plain text the agent reads. */
export function linkedinText(d: LinkedInData | null | undefined): string {
  if (!d) return "(no LinkedIn data)";
  const lines = [
    `Name: ${d.name}`,
    d.headline && `Headline: ${d.headline}`,
    d.location && `Location: ${d.location}`,
    d.about && `About: ${d.about}`,
    d.experience.length && `Experience: ${d.experience.map((e) => (e.startYear ? `${e.org} (since ${e.startYear})` : e.org)).join("; ")}`,
    d.education.length && `Education: ${d.education.map((e) => e.school).join("; ")}`,
    d.languages.length && `Languages: ${d.languages.join(", ")}`,
    d.awards.length && `Awards: ${d.awards.join("; ")}`,
    d.memberships.length && `Memberships: ${d.memberships.join("; ")}`,
    d.posts.length && `Recent posts/articles:\n${d.posts.map((p) => `- ${p.text}`).join("\n")}`,
    d.manualText && `Pasted profile text:\n${d.manualText}`,
  ];
  return lines.filter(Boolean).join("\n");
}

export function instagramText(d: InstagramData | null | undefined): string {
  if (!d) return "(no Instagram data)";
  const lines = [
    `Username: @${d.username}`,
    d.fullName && `Display name: ${d.fullName}`,
    d.bio && `Bio: ${d.bio}`,
    d.followers != null && `Followers: ${d.followers.toLocaleString("en-US")} · Following: ${d.following ?? "?"} · Posts: ${d.postsCount ?? "?"}`,
    d.captions.length && `Recent post captions:\n${d.captions.map((c) => `- ${c.replace(/\s+/g, " ").slice(0, 600)}`).join("\n")}`,
    d.manualText && `Pasted profile text:\n${d.manualText}`,
  ];
  return lines.filter(Boolean).join("\n");
}
