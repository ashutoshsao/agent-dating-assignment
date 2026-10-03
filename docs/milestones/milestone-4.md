# Milestone 4 — Rankings

> Spec-driven: contract for M4. Finish, verify, then write `milestone-5.md`.

## Goal
For every person, a ranked list of who fits them best — grounded in the dates their agent actually went on.

## Ranking rule
For person P, every other analyzed person Q gets a row:
1. **Dated** (date status `done`): ranked by `mutual` (desc), tie-break by P's own score. Shows P's score, Q's score, both `wouldSeeAgain`, P's agent's report, link to the date.
2. **Not dated yet**: ranked after dated ones by pre-screen fit, labelled "estimated", with a "Send on this date" action.

Mutual match = both `wouldSeeAgain`.

## API
- `GET /api/rankings` → `[{ person, matches: RankRow[] }]` for all analyzed people
- `GET /api/rankings/:personId` → one person's list
- `POST /api/rounds { personId }` (from M3) powers "Send on dates"

## Web
- `/rankings` — left: people list; right: selected person's ranking (rank #, avatar, mutual ring, both scores, "mutual match" badge, report excerpt, link to the date). Top: "Best couples" strip (top 5 mutual).
- Profile page: "Their best matches" (top 3) + "Send on dates" button.

## Todos
- [x] `rankings.ts` service + routes
- [x] Shared `RankRow` / `RankingDTO`
- [x] `/rankings` page
- [x] Profile: top matches + Send on dates

## Done when
- Every analyzed person has a full ranked list; clicking a row opens the date
