# Milestone 1 — Scraping (LinkedIn + Instagram)

> Spec-driven: this file is the contract for M1. Finish every todo, verify, then write `milestone-2.md`.

## Goal
Given a LinkedIn URL and a public Instagram URL, fetch both profiles' text data, cache it in Postgres, and expose it via the API. Free, no API keys.

## Findings (probed 2026-10-03)
| Source | Method | Result |
|---|---|---|
| LinkedIn | `GET linkedin.com/in/<slug>` with desktop Chrome UA | 200, `<script type="application/ld+json">` with `@graph` → `Person` node (`name`, `jobTitle`, `description`, `worksFor[]`, `alumniOf[]`, `address`, `awards`, `knowsLanguage`, `memberOf`) + post/article nodes |
| Instagram API | `i.instagram.com/api/v1/users/web_profile_info` | 401 `require_login` (IP-rate-limited) — fallback only |
| Instagram HTML | `GET instagram.com/<user>/` with Googlebot UA | 200, `og:description` (followers/following/posts), embedded JSON with `full_name`, `biography`, `is_private`, ~12 `"caption":{"text":...}` |

## Data contract (`packages/shared`)
```ts
LinkedInData = {
  name, headline /* jobTitle */, about /* description */, location,
  experience: { org, startYear? }[], education: { school }[],
  languages: string[], awards: string[], memberships: string[],
  posts: { title?, text }[]          // other @graph nodes, text only
}
InstagramData = {
  username, fullName, bio, isPrivate,
  followers?, following?, postsCount?,
  captions: string[]                 // up to 12, deduped
}
ScrapeStatus = "ok" | "blocked" | "private" | "not_found" | "manual"
```
Profile image URLs are discarded at parse time — never stored.

## DB (Prisma)
- `Person`: `id, name, linkedinUrl @unique, instagramUrl @unique, avatarSeed, status (pending|scraped|analyzed|error)`
- `Source`: `id, personId, kind (linkedin|instagram), status ScrapeStatus, data Json, rawExcerpt String?, fetchedAt` — unique on `(personId, kind)`

## API
- `POST /api/people` `{ linkedinUrl, instagramUrl, linkedinText?, instagramText? }`
  → validate + normalize URLs (400 on bad URLs) → upsert Person → scrape both → returns Person + Sources
  - IG private → 422 `{ error: "instagram_private" }` (public profiles only)
  - Scrape blocked + manual text given → Source with `status: "manual"`, data from pasted text
- `GET /api/people` → list (id, name, headline, avatarSeed, status)
- `GET /api/people/:id` → Person + Sources
- `POST /api/people/:id/rescrape` → refresh both sources

## Todos
- [ ] Shared Zod schemas: `LinkedInData`, `InstagramData`, `ScrapeStatus`, `CreatePersonInput`
- [ ] URL normalization: `normalizeLinkedIn(url) → https://www.linkedin.com/in/<slug>`, `normalizeInstagram(url) → username`
- [ ] `apps/api/src/scrapers/linkedin.ts`: fetch + JSON-LD parse; detect authwall/redirect → `blocked`; 404 → `not_found`
- [ ] `apps/api/src/scrapers/instagram.ts`: Googlebot HTML parse (og meta + embedded JSON); fallback to `web_profile_info`; `is_private` → `private`
- [ ] Polite fetching: concurrency 2 (`p-limit`), 1–2s jitter, 1 retry with backoff
- [ ] Prisma: `Person` + `Source` models, migration
- [ ] Routes above in `apps/api/src/routes/people.ts`
- [ ] Batch script `apps/api/scripts/scrape.ts`: reads `data/people.json` (`[{ linkedinUrl, instagramUrl }]`), scrapes all, skips cached unless `--force`
- [ ] Find 25 real people with a LinkedIn + public Instagram (founders, creators, tech folks with active public presence on both) → `data/people.json`
- [ ] Unit tests (`bun test`) for both parsers against saved HTML fixtures (fixtures gitignored under `data/raw`, tests skip if absent)

## Done when
- `POST /api/people` with 3 real link pairs returns populated LinkedIn + Instagram data
- A private Instagram returns 422; a garbage URL returns 400
- `bun scripts/scrape.ts` scrapes all 25 with ≥ 23 `ok` sources each side (rest via manual text)
- `bun test` and `bun run typecheck` pass
