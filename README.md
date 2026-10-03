# Proxy — agents that date for you

Paste someone's **LinkedIn** and **public Instagram**. Their AI agent reads both, builds a grounded profile (needs, hobbies, interests, values, personality), then **goes on first dates with other people's agents on their behalf** and reports back. Every person gets a ranking of who fits them best — based on dates that actually happened.

**Live:** `<LIVE_URL>` · **Video:** `<YOUTUBE_URL>`

The live site ships with a finished example: **25 real people, 90 agent-to-agent dates, full rankings** — browsable without a key.

---

## How it works

```
LinkedIn (public)  ─┐
                    ├─► Scrape (text only) ─► Analysis agent ─► Profile page
Instagram (public) ─┘                          3 steps + evidence check
                                                        │
                                                        ▼
                       Pre-screen (no LLM) ─► top-4 matches per person
                                                        │
                                                        ▼
               Matchmaker picks venue ─► 10-turn date ─► twist at turn 5
               each turn: private thought · message · interest 0–10
                                                        │
                                                        ▼
               Private debrief per agent (score, chemistry, values, lifestyle,
               would-see-again, report to their person)
                                                        │
                                                        ▼
               mutual = 10·√(scoreA·scoreB)  ─►  Rankings per person
```

### 1. Reading a person (analysis agent)
`apps/api/src/agents/analyze.ts`
1. **LinkedIn reader** — career arc, ambition, work style, what they post about.
2. **Instagram reader** — lifestyle, hobbies, humor, tone of voice; separates their own voice from sponsored content.
3. **Synthesizer** — builds the persona: `needs` (what they need from a partner, with the inference explained), `hobbies`, `interests`, `values`, personality (traits + Big Five), lifestyle, looking for, dealbreakers, ideal first date, and the agent's **voice** (how it should speak as them).
4. **Evidence check** — every claim carries short quotes from the sources; each quote is matched verbatim against the scraped text and marked ✓. Across the demo, nearly all quotes verify (e.g. 33/33, 50/50, 67/68) — the analysis is grounded, not invented.

The reading streams live to the profile page.

### 2. Dating on their behalf
`apps/api/src/agents/date.ts`
- **Who dates whom:** an LLM-free pre-screen (interest/value overlap, Big Five complementarity, social energy, dealbreaker hits) picks each person's top 4. 25 people → 90 dates instead of 300.
- **Matchmaker** picks a venue that suits both (bookstore café, Cubbon Park walk, sunrise hike…).
- **10 turns.** Each agent speaks *as* its person, in their voice, and only knows its own person's private profile plus the other's public intro. Every turn returns a private **thought** (what it noticed, what to probe next, how it maps to its person's needs), the **message**, and an **interest** score. Agents are told to be honest — a pleasant but mismatched date should go nowhere.
- **Twist at turn 5:** a narrator drops a small real-world moment (a dog, rain, a song) to reveal character.
- **Debriefs:** each agent privately scores the date *against its own person's needs and dealbreakers* and writes a note to its human ("Ankur, she respected that you told the truth about the living room…"). Scores often disagree — that's the point.

### 3. Rankings
`apps/api/src/rankings.ts` — for each person, everyone they dated ranked by **mutual score** (geometric mean, so one-sided interest ranks low), a "mutual" badge when both would go again, then not-yet-dated people by estimated fit with a "send on date" action.

---

## Scraping stack (LinkedIn + Instagram only)

No paid APIs, no logins, text only.

| Source | Method |
|---|---|
| **LinkedIn** | `fetch` of the public profile page with a desktop browser UA; parse the embedded **JSON-LD** (`Person`: name, headline, about, location, experience, education, languages, awards; plus recent posts/articles). |
| **Instagram** | `fetch` of the public profile page as Googlebot (how Instagram serves crawlers); parse `og:description` (followers/following/posts) and embedded JSON (full name, bio, `is_private`, ~12 recent captions). Fallback: `web_profile_info` endpoint. Private accounts are rejected. |

Polite by design: one LinkedIn request at a time with 2.5–3.5s jitter, backoff on HTTP 999/429, every result cached in Postgres. LinkedIn rate-limits datacenter IPs, so the form has a **paste-text fallback** (status `manual`) — the person's own profile text, still only from those two sources.

**Privacy:** profile photos are never downloaded or shown — avatars are generated (DiceBear "notionists", seeded by username). Raw scrape HTML is not committed.

---

## Bring your own key (BYOK)

Browsing the finished example costs nothing. Creating agents and sending them on dates runs on the **visitor's own key** (DeepSeek by default, or any OpenAI-compatible Chat Completions endpoint). The key lives in the browser (`localStorage`), is sent per request in a header, and is never stored or logged. Base URLs must be public `https` hosts (no SSRF).

**Visitor isolation:** each browser gets an anonymous id. People you add are yours (only you see them); they date the shared demo pool. The 25 demo people and their 90 dates are read-only.

---

## Stack

Bun workspaces · **Web:** Vite, React, TypeScript, Tailwind, shadcn/ui, TanStack Query, motion · **API:** Express 5 (one Vercel function, bundled with `bun build`) · **DB:** Postgres (Neon) + Prisma 7 · **LLM:** AI SDK (`@ai-sdk/openai`, Chat Completions) → DeepSeek · **Validation:** Zod schemas shared between web and API.

DeepSeek rejects JSON-schema structured output, so `generateJson` puts the Zod schema in the prompt, validates the reply, and repairs once on failure.

```
apps/api      Express API, agents, scrapers, Prisma
apps/web      React app
packages/shared  Zod schemas + DTOs
api/          Vercel function entry
docs/milestones  spec-driven milestones (M0–M6)
```

## Run locally

```bash
bun install
bun run db:up                                  # Postgres 17 in Docker on :5434
cp apps/api/.env.example apps/api/.env         # DEEPSEEK_API_KEY for scripts
bun run db:migrate
bun dev                                        # web :5173 · api :3001

# rebuild the demo dataset (25 people in data/people.json)
cd apps/api
bun scripts/scrape.ts && bun scripts/analyze.ts && bun scripts/round.ts
bun test
```

## Development process

Spec-driven: each milestone was written as `docs/milestones/milestone-N.md` (goal, contract, todos, done-when) before it was built — scaffold → scraping → analysis → dates → rankings → BYOK & deploy.
