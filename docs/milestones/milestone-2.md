# Milestone 2 — Analysis Agent + Profile Page

> Spec-driven: contract for M2. Finish, verify, then write `milestone-3.md`.

## Goal
Each person's agent reads their LinkedIn + Instagram and produces a grounded persona. The reading is visible (streamed steps), and the result shows on a profile page.

## Constraint found
DeepSeek rejects AI SDK `Output.object` (`response_format: json_schema` unavailable). → `generateJson(schema, …)` helper: Zod → JSON Schema in the prompt, parse text, Zod-validate, 1 repair retry feeding the error back.

## Agent pipeline (3 steps, each streamed as an event)
1. **LinkedIn reader** → notes: career arc, ambition, work style, what they post about, quotes.
2. **Instagram reader** → notes: lifestyle, hobbies, aesthetics, tone of voice, what they celebrate, quotes from bio/captions.
3. **Synthesizer** → `Persona` (below), combining both notes and the raw text.

Then **evidence check**: every evidence quote is matched (normalized substring) against the source text and marked `verified: true|false`. Unverified quotes are kept but flagged in the UI. This keeps the analysis honest.

## Persona (shared Zod schema)
```ts
Evidence = { source: "linkedin" | "instagram", quote: string, verified?: boolean }
Trait    = { label: string, detail: string, evidence: Evidence[] }

Persona = {
  summary: string                      // 2–3 sentences, who they are
  needs: Trait[]                       // what they need from a partner/relationship
  hobbies: Trait[]
  interests: Trait[]
  values: Trait[]
  personality: {
    traits: Trait[]
    bigFive: { openness, conscientiousness, extraversion, agreeableness, neuroticism } // 0–100
    communicationStyle: string
    humor: string
  }
  lifestyle: { pace: string, socialEnergy: "introvert"|"ambivert"|"extrovert", workLifeBalance: string, location?: string }
  lookingFor: string[]                 // green flags in a partner
  dealbreakers: string[]
  idealFirstDate: string
  conversationTopics: string[]
  voice: { tone: string, quirks: string[], sampleLine: string }  // how the agent speaks on dates
  caveats: string                      // limits of inferring from public profiles
}
```

## DB
- `Analysis`: `personId @unique, persona Json, trace Json (step notes), model, createdAt`
- `Person.status` → `analyzed` on success

## API
- `POST /api/people/:id/analyze` → SSE stream: `step` events `{ step: "linkedin"|"instagram"|"synthesis"|"evidence", status: "start"|"done", notes? }`, final `persona` event
- `GET /api/people/:id` includes `persona` + `trace` when present
- `POST /api/people` (from M1) unchanged; web chains scrape → analyze

## Web
- `/` — paste form (LinkedIn + Instagram, optional paste-text fallback) + grid of people (DiceBear avatar, name, headline, status)
- `/people/:id` — profile page: header (avatar, name, headline, source links + scrape status), "Agent reading" timeline (live while analyzing, from trace afterwards), summary, needs, hobbies, interests, values (chips with evidence popovers, ✓ verified), personality (Big Five bars, communication, humor), lifestyle, looking for / dealbreakers, ideal first date, agent voice sample

## Todos
- [x] `generateJson` helper with repair retry (`apps/api/src/llm.ts`)
- [x] Shared `Persona` schema + DTO additions
- [x] Prisma `Analysis` model + migration
- [x] `apps/api/src/agents/analyze.ts`: 3-step pipeline + evidence check, emits events via callback
- [x] SSE helper + `POST /api/people/:id/analyze`
- [x] Batch script `scripts/analyze.ts` (concurrency 4, skip analyzed unless `--force`)
- [x] Web: home (form + grid), profile page, live analysis timeline
- [x] Run analysis for all scraped people

## Done when
- Paste links in the UI → scrape → live reading steps → full profile page
- ≥ 70% of evidence quotes verified across the 25
- typecheck passes
