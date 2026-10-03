# Milestone 6 — BYOK, Visitor Isolation, Vercel

> Spec-driven: contract for M6. Finish, verify, then deploy (M5 wrap-up).

## Goal
The public site costs the owner nothing and can't be abused: browsing the finished demo needs no key; anything that calls an LLM uses the **visitor's own key**. Visitors' people are private to them and date the shared demo pool. Deploys on Vercel + Neon.

## BYOK
- Web: **Settings dialog** (key icon in header) → `apiKey`, `baseURL` (default `https://api.deepseek.com/v1`), `model` (default `deepseek-chat`). Any OpenAI-compatible Chat Completions endpoint works. Stored in `localStorage` only. "Test key" button.
- Sent per request as headers: `x-llm-key`, `x-llm-base-url`, `x-llm-model`.
- Server: builds a model per request (`createOpenAI({ baseURL, apiKey }).chat(model)`), passes it down (`analyzePerson`, `runDate`, `startRound`). Key is never stored or logged.
- No key → `401 { error: "llm_key_required" }` → web opens the Settings dialog.
- `baseURL` must be `https://`, not localhost / private IP literal (no SSRF into the host).
- Server env key is only a fallback when `ALLOW_SERVER_KEY=1` (local dev/scripts). Production has no `DEEPSEEK_API_KEY`.
- `POST /api/llm/check` → 1-token ping with the visitor's key.

## Visitor isolation
- Web generates a random visitor id (`crypto.randomUUID()`, `localStorage`) → header `x-visitor-id` on every request.
- `Person.ownerId String?` — `null` = demo pool (the 25). Uniqueness becomes `(linkedinUrl, ownerId)`.
- Visible people for a visitor = demo pool ∪ own. Applies to: people list/get, dates list/get, rankings, round pairing.
- Pasting links of a demo person returns the demo person (cached, no LLM spend).
- Visitor's people date only visible people; demo people's rankings show visitor rows only to that visitor.

## Vercel
- `apps/api/src/app.ts` exports the Express app; `index.ts` listens (local).
- `api/index.js` (Vercel function) re-exports a bundle built by `bun build` at build time (`apps/api/dist/app.js`).
- `vercel.json`: build = prisma generate + api bundle + web build; output `apps/web/dist`; rewrites `/api/*` → function, everything else → `index.html`; `maxDuration: "max"`.
- Long work after responding (dates) is kept alive with `waitUntil` from `@vercel/functions`.
- Live date view: polling is primary (functions don't share memory); SSE bus still works locally.
- `/health` → `/api/health`.

## Todos
- [x] Per-request LLM (`llm.ts`): `resolveModel(req)`, URL guard, `LlmKeyRequiredError`
- [x] Thread model through analyze / date / round; scripts use server key
- [x] `/api/llm/check`
- [x] Prisma `ownerId` + migration (local + Neon); people service scoping; dates/rankings scoping
- [x] Web: settings dialog, headers, 401 → dialog, visitor id
- [x] `app.ts` split, Vercel function + bundle, `vercel.json`, `waitUntil`
- [x] Verify bundle runs under Node locally; full flow with a key in the browser; without a key demo still browsable

## Done when
- No server key: demo fully browsable; paste flow asks for a key; with a key it works end to end
- Two different visitor ids don't see each other's people
