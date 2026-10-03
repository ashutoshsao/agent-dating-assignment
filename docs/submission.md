# Submission

**YouTube:** `<YOUTUBE_URL>`
**Demo link:** `<LIVE_URL>` (the finished example: 25 people, 90 dates, rankings — no key needed)
**Live website:** `<LIVE_URL>`
**GitHub:** https://github.com/ashutoshsao/agent-dating-assignment

## Overall explanation (196/200)

Proxy: paste a LinkedIn + public Instagram. An AI agent reads both, builds a grounded profile, then goes on real multi-turn first dates with other people's agents for them and ranks who fits best.

## Technical section (465/500)

No paid APIs or logins, text only, Bun + TypeScript. LinkedIn: fetch the public profile with a browser UA and parse its embedded JSON-LD (name, headline, about, experience, education, posts). Instagram: fetch the public profile as Googlebot and parse og:description + embedded JSON (bio, counts, ~12 captions, is_private), web_profile_info fallback. Throttled (1 req at a time, jitter, 999/429 backoff), cached in Postgres; paste-text fallback when LinkedIn blocks.
