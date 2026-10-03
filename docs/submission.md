# Submission

**YouTube:** `<YOUTUBE_URL>`
**Demo link:** `<LIVE_URL>` (the finished example: 25 people, 90 dates, rankings — no key needed)
**Live website:** `<LIVE_URL>`
**GitHub:** https://github.com/ashutoshsao/agent-dating-assignment

## Overall explanation (198/200)

Each person gets an AI agent that reads their LinkedIn and Instagram, then goes on first dates with the other agents for them. After each date both agents score it, and that sets everyone's ranking.

## Technical section (497/500)

I didn't use any paid scraping API. For LinkedIn, I fetch the public profile page with a normal browser user agent and read the JSON-LD block LinkedIn embeds for search engines: headline, about, jobs, schools and recent posts. For Instagram, I fetch the public profile the way Googlebot does, which returns the bio, follower counts and about 12 recent captions. Requests go one at a time with pauses and are cached in Postgres. If LinkedIn blocks a request, you can paste the profile text instead.
