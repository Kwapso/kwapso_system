# Staging knowledge base — D1 recovery bookmarks, 11 Sep 2026

**Why this file exists.** The rebuild's wipe deleted every knowledge row on
staging. `chatMessages` (`workers/content/src/lib/google-api.ts`, ~2412) fetches
ONE page of 50 messages per space, newest first, and never reads
`nextPageToken` — Drive, Gmail and Calendar all paginate; Chat alone does not.
So chat history that ACCUMULATED over weeks, as the filing cursor watermarked
forward, is not re-fetchable by any number of sweeps. The wipe may have
destroyed material this code cannot get back.

**D1 Time Travel is available on this database and is the way back.**

| What | Value |
|---|---|
| Database | `team-01kzwxfd86n0k3rzrbhkmkrwys` (team Kwapso, staging) |
| Bookmark AFTER the wipe + partial rebuild, taken 11 Sep | `00000ee4-00006020-000050e3-4f363115b728e6bab8ce483c0b2e06d7` |
| Wipe completed | ~04:10–04:15 UTC, 11 Sep 2026 (Smoke-team rows recreated by the cron at 04:14:43Z) |

**To go BACK to before the wipe:**
`cf-exec npx wrangler d1 time-travel restore team-01kzwxfd86n0k3rzrbhkmkrwys --timestamp=2026-09-11T04:00:00Z`

**To come FORWARD again to the rebuilt state:**
`cf-exec npx wrangler d1 time-travel restore team-01kzwxfd86n0k3rzrbhkmkrwys --bookmark=00000ee4-00006020-000050e3-4f363115b728e6bab8ce483c0b2e06d7`

Restore AUTO-CONFIRMS without a TTY. Do not run either without the owner's word.

**Pre-wipe counts, for measuring what is actually missing:**
`live_sources 3899 · google 719 (gmail 382, chat 181, drive 90, calendar 66)`
`chunks 10064 · sightings 53 · terms 415488`
