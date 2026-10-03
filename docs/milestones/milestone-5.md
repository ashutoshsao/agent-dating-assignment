# Milestone 5 — 25+ People, Deploy, Video, Submission

> Spec-driven: contract for M5 (final).

## Goal
The finished example (25+ real people, all dated, all ranked) is live, a public repo explains it, and the video shows it end to end.

## People
- `data/people.json` holds the link pairs (29 candidates; 19 fully scraped, 10 pending LinkedIn).
- LinkedIn returns HTTP 999 once an IP is rate-limited → finish scraping from a fresh network:
  `cd apps/api && bun scripts/scrape.ts ../../data/people.json && bun scripts/analyze.ts && bun scripts/round.ts`

## Deploy (all free tiers)
| Piece | Host | Notes |
|---|---|---|
| DB | Neon Postgres | `prisma migrate deploy`; local data copied with `pg_dump` → `psql` |
| API + Web | Vercel (one project) | `vercel.json`: Express bundled into one function, Vite build served statically; env `DATABASE_URL` only (BYOK — see M6) |

- Live site = Demo link: the seeded example is browsable without typing; graders can also paste their own links.
- LinkedIn from datacenter IPs may 999 → the form's paste-text fallback keeps it usable.

## Repo / docs
- README: what it is, architecture diagram (text), how the agent analyzes, how dates work, scoring, scraping stack, data policy, run locally, milestone docs.

## Video (≤ 3:00)
1. 0:00–0:15 hook + home page
2. 0:15–0:55 paste a LinkedIn + Instagram → live agent reading → profile page (needs, hobbies, interests, evidence popovers)
3. 0:55–1:55 a live date: venue, turns, agent thoughts, twist, debriefs, mutual score
4. 1:55–2:35 date board (59+ dates) → rankings, best couples, one person's ranked list
5. 2:35–3:00 how it works (pipeline) + close

## Submission text
- 200-char overall explanation
- ≤ 500-char technical section (scraping stack)

## Todos
- [x] Finish remaining LinkedIn scrapes → analyze → round (needs fresh network)
- [x] `vercel.json`, env for prod
- [x] Neon DB + data migration
- [x] Deploy API + web, smoke test paste flow on prod
- [x] README + submission text
- [x] Public GitHub repo push
