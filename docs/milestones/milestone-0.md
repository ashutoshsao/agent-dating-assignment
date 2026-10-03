# Milestone 0 — Foundation & Scaffold

> Spec-driven: this file is the contract for M0. Finish every todo, verify, then write `milestone-1.md`.

## Goal
A running monorepo: web talks to API, API talks to Postgres and DeepSeek. No features yet.

## Product summary (north star for all milestones)
Paste a LinkedIn + public Instagram → an agent reads both → profile page (needs, hobbies, interests, values, traits, with evidence) → agents go on simulated dates with other agents → each side debriefs privately → mutual-fit rankings per person.

## Stack (locked)
| Layer | Choice |
|---|---|
| Runtime / package manager | Bun (workspaces) |
| Web | Vite + React + TS + Tailwind + shadcn/ui, React Router, TanStack Query |
| API | Express on Bun, SSE for live dates |
| DB | Postgres 17 (Docker locally on :5434, Neon in prod) + Prisma 7 |
| Validation / types | Zod in `packages/shared` |
| LLM | AI SDK (`ai` + `@ai-sdk/openai`) → `createOpenAI({ baseURL: DeepSeek }).chat('deepseek-chat')` — Chat Completions only, never the Responses API |
| Avatars | DiceBear (generated from name — real photos are never stored or shown) |
| Deploy | Vercel (web), Render (API), Neon (DB) |

## Data policy
- Real people and real public links; text data only (bio, headline, experience, captions).
- Profile photos are never downloaded or displayed; DiceBear avatar instead.
- Raw scrape JSON is gitignored; only derived personas are seeded.

## Layout
```
apps/web          Vite React app
apps/api          Express API
packages/shared   Zod schemas + types
docs/milestones   milestone-N.md specs
```

## Todos
- [x] `git init`, root `package.json` with Bun workspaces (`apps/*`, `packages/*`), `.gitignore`, `.env.example`
- [x] `packages/shared`: package setup, export a placeholder `HealthSchema` (Zod)
- [x] `apps/api`: Express + TS on Bun, `GET /health` → `{ ok, db, llm }`, CORS for web origin
- [x] Prisma 7 in `apps/api`: `prisma.config.ts`, schema with `Person` model stub, first migration against Neon
- [x] DeepSeek client `apps/api/src/llm.ts` via AI SDK `.chat()`; `/health` does a 1-token ping
- [x] `apps/web`: Vite React TS, Tailwind, shadcn init, React Router + TanStack Query, home page showing `/health` status
- [x] Root scripts: `bun dev` runs web + api together; `bun run typecheck`
- [x] README stub: what it is, how to run

## Done when
- `bun install && bun dev` starts both apps
- Home page shows `db: ok`, `llm: ok`
- `bun run typecheck` passes

## Upcoming milestones (each gets its own file when started)
1. Scraping — Instagram + LinkedIn ingestion, caching, paste-text/PDF fallback
2. Analysis agent — persona extraction with evidence, profile page
3. Dating engine — pre-screen, multi-turn dates streamed over SSE, private debriefs
4. Rankings — mutual scores, per-person ranking page
5. Seed 25 people, polish UI, deploy, record video
