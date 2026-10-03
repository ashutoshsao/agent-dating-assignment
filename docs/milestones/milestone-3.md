# Milestone 3 — The Agents Date

> Spec-driven: contract for M3. Finish, verify, then write `milestone-4.md`.

## Goal
Agents go on real, multi-turn first dates on their person's behalf, with private reasoning, a live interest meter, and a private debrief to their person. Watchable live.

## Who dates whom
- **Pre-screen** (no LLM, instant): `fit(a,b)` = interests/values/hobbies token overlap (Jaccard) + Big Five complementarity (similar agreeableness/conscientiousness, |Δ| small) + lifestyle (socialEnergy, pace) − dealbreaker-keyword hits.
- Each person dates their **top 4** by pre-screen → unique pairs (~60 for 25 people). The pool is open — everyone can match with everyone.

## Date protocol
1. **Matchmaker** (1 call) → `{ venue, setting, why }` chosen from both personas (e.g. both like nature → sunrise hike).
2. **Conversation**: 10 turns, alternating (A opens). Each turn an agent returns:
   `{ thought, message, interest: 0–10, wantsToLeave: boolean }`
   - `thought` = private reasoning ("She wants a slower life — probe how she feels about my startup hours")
   - agents speak *as* their person (persona.voice), pursue their person's **needs**, probe **dealbreakers**, stay honest (don't invent facts beyond the persona)
   - each agent only sees its own persona + the transcript, never the other's persona
3. **Twist** at turn 5: matchmaker narrator injects one small real-world moment (rain starts, a shared favourite song plays) that reveals character.
4. Ends after 10 turns, or early if an agent sets `wantsToLeave` twice.
5. **Debriefs** (one per agent, private, parallel):
   `{ score: 0–10, chemistry, valuesAlignment, lifestyleFit (0–10 each), wouldSeeAgain, highlights[], concerns[], reportToPerson }`
   — `reportToPerson` is the note the agent writes to its human ("Ankur, she lit up when…").

## Scoring
- `mutual = 10 · √(scoreA · scoreB)` → 0–100. Geometric mean punishes one-sided matches.

## DB
- `Date`: `id, aId, bId, status (scheduled|live|done|error), venue Json, prescreen Float, mutual Float?, createdAt`
- `Turn`: `id, dateId, idx, speakerId? (null = narrator), message, thought?, interest?`
- `Debrief`: `id, dateId, personId, score, data Json` — unique `(dateId, personId)`

## Live delivery
- In-memory event bus keyed by dateId. `GET /api/dates/:id/stream` (EventSource): replays stored turns, then live events: `venue`, `turn`, `debrief`, `done`.
- `POST /api/dates` `{ aId, bId }` → create + start a date
- `POST /api/rounds` `{ personId? }` → pre-screen + run dates (all people, or just one person's top 4) with concurrency 6
- `GET /api/dates` → list (people, status, mutual, venue)
- `GET /api/dates/:id` → full date

## Web
- `/dates` — date board: live dates pulse, finished ones show mutual score; "Run a dating round" button
- `/dates/:id` — the date: venue card, two avatars with live interest meters, chat bubbles, each agent's private thought shown as a muted aside under its message, the narrator twist as a centred line, and at the end both debrief cards side by side + mutual score
- Profile page: "Send on dates" button → runs that person's round

## Todos
- [x] Shared schemas: `Venue`, `TurnOutput`, `DebriefOutput`, DTOs + `DateEvent`
- [x] Prisma `Date`, `Turn`, `Debrief` + migration
- [x] `agents/prescreen.ts`
- [x] `agents/date.ts`: matchmaker, turn loop, twist, debriefs, persistence, events
- [x] `bus.ts` + routes `routes/dates.ts`
- [x] Script `scripts/round.ts` (full round over all analyzed people)
- [x] Web: `/dates`, `/dates/:id` live view, profile "Send on dates"

## Done when
- A date runs end to end live in the browser with thoughts, meters, twist and debriefs
- Full round over all analyzed people finishes without errors
