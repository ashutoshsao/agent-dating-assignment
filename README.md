# Agentic Dating

Each person is represented by an AI agent that reads their public LinkedIn + Instagram, builds a profile (needs, hobbies, interests, values), and goes on dates with other agents on their behalf. Every person gets a ranked list of best fits.

## Run locally
```bash
bun install
bun run db:up            # Postgres 17 in Docker on :5434
cp apps/api/.env.example apps/api/.env   # add DEEPSEEK_API_KEY
bun run db:migrate
bun dev                  # web :5173, api :3001
```

## Stack
Bun workspaces · Vite + React + Tailwind + shadcn/ui · Express · Prisma 7 + Postgres · AI SDK (Chat Completions) → DeepSeek

## Development
Spec-driven: each milestone is specified in `docs/milestones/milestone-N.md` before it is built.

## Data policy
Avatars are generated (DiceBear); real profile photos are never stored or shown. Raw scraped data is not committed.
