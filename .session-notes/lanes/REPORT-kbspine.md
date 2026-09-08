# REPORT — kbspine (phase 1 of four: a source knows its parents)

Branch `feat/knowledge-sources-know-their-event`, commit **b2cc2d32**, off `main` a4d87f64.
Worktree `<project>/.worktrees/kbspine` (`.gitignore` already covered `.worktrees/` — no folder outside the project).

`npm run check` → **EXIT=0**, read unpiped.

---

## PHASE 1a — THE CENSUS, BEFORE ANY CODE

All figures are **one pass** against the staging Kwapso team `727537f7-653d-4114-af23-332d1aae0f90`
(2026-09-08T13:47Z), so they agree with each other. Database proved by schema conjunction
(`knowledge_sources`, `knowledge_chunks`, `internal_rates`, `google_sources`) — 11 of 16 databases on
this account belong to other companies. **4,842 rows, 3,967 live.**

### 1. Every distinct `origin_table`, with a count — the earlier claim is REFUTED

| origin_table | kind | live |
|---|---|---:|
| help | ticket | 2,050 |
| google_gmail | email | 518 |
| stories | story | 333 |
| tasks | task | 256 |
| google_chat | message | 148 |
| accounts | account | 134 |
| meetings | meeting | 115 |
| sprints | sprint | 112 |
| account_links | contact | 89 |
| google_drive | document | 80 |
| google_calendar | event | 55 |
| apps | app | 28 |
| selectable_data | dropdown | 17 |
| processes | process | 16 |
| users | person | 10 |
| portal_users | portal_login | 5 |
| todos | todo | 1 |

An earlier census suggested most sources are types nothing else in the app knows about. **That is
wrong.** 801 of 3,967 (20%) come from outside the app — the four Google lanes. The other 3,166 (80%)
mirror tables this app owns, and every one of those `origin_table` values is a real table here.

Deactivated rows (875) are dominated by exactly the noise this work is about: 350 meetings, 235
calendar entries, 218 mails, 41 chat, 21 documents.

### 2. Does a Gemini notes document carry a readable calendar event id? — **NO. Not in any field, and not in its text.**

This is the question the owner asked and I did not know. The answer:

- Its `origin_row_id` is `<readerUserId>:<driveFileId>` — a **Drive file id**, never an event id.
- Its **title** carries the event's name and start time (`Padelbase: Review - 2026/09/08 17:00 IST -
  Notes by Gemini`) and nothing machine-readable.
- Its **body** carries no event reference: of 101 Drive sources, **0** contain `calendar.google.com`,
  `eid=`, `/calendar/event` or even `meet.google.com`. The doc's own text says *"Attachments … Meeting
  records Transcript"* — words, not ids.
- The **only** place Google states this link is the calendar event's own `attachments[]` array, which
  is a live Calendar call rather than a stored column. The app already reads it (`google-transcript.ts`
  route 1) and stores the result as `meetings.transcript_file_id`.

**And that route does not currently reach these documents.** Measured with exact suffix equality
(a Drive id can contain `_`, which is a `LIKE` wildcard — `LIKE` invents hits here):

- 36 live meetings hold a `transcript_file_id`; **all 36** were found by route `attachment`, 0 by
  `drive`, 0 by `mail`.
- 20 of those files exist as a Drive knowledge source — **and all 20 of those source rows are
  deactivated**. Live Drive sources named by an event's attachment: **0 of 80.**

The Drive folder sweep and the event's attachment list are seeing **different files**. This is not a
theory — see the week-planning cluster below.

*(I first ran this join with `LIKE` and got 20 and 0 from two queries that should have agreed. I did
not report either until exact equality explained the difference. Both numbers turned out true and
about different things.)*

### 3. Does a calendar-notification email carry one? — **It depends entirely on which notification, and the split is the finding.**

| title family | rows | carry an `eid` | carry a Meet link |
|---|---:|---:|---:|
| `Invitation:` | 88 | **88** | 87 |
| `Updated invitation:` | 43 | **43** | 42 |
| `Accepted:` | 97 | **96** | 94 |
| `Declined:` | 1 | **1** | 1 |
| `Canceled event:` | 6 | **0** | 6 |
| `Problem with the notes:` | 6 | **0** | 0 |
| **`Notes:`** (holds the MINUTES) | **121** | **0** | **0** |

Where it is present it is in the **body**, in a line Google's own robot writes:

```
https://calendar.google.com/calendar/event?action=VIEW&eid=MmE3Mm4wMmI1ZzlkMWg3MTZuNnJyOGJxYXIgYWxhYXBAa3dhcHNvLmNvbQ&…
```

`eid` is base64url of `"<eventId> <calendarId>"`. **I proved the decode is identity, not resemblance**:
it yields `2a72n02b5g9d1h716n6rr8bqar`, which is byte-for-byte the id the calendar lane files the same
call under in its `origin_row_id`. Across the whole base: 239 mails carry one, 239 of 239 decode
cleanly, **224 (93.7%)** name an event the base already holds. The 15 that do not are real events
outside any window we ever read.

**The `Notes:` mail — the one carrying the minutes — states nothing.** Only the event's title in quotes.

### 4. The two clusters, and which of them Google's ids WOULD group

**Padelbase: Review, 8 Sep 2026** (Google event `2a72n02b5g9d1h716n6rr8bqar`):

| artefact | bytes | groupable? |
|---|---:|---|
| `google_calendar` × 2 (two readers' sight) | 18 | ✅ `origin` — id is its own `origin_row_id` |
| `Invitation:` mail | 1,589 | ✅ `mail` — eid in body |
| `Updated invitation:` mail | 1,637 | ✅ `mail` |
| `Accepted:` mail × 2 | 1,308 | ✅ `mail` |
| `Canceled event:` mail (the prior slot) | 1,070 | ❌ no eid |
| **Gemini notes document** | **43,913** | ❌ **nothing** |
| `Notes:` mail × 2 | 2,701 | ❌ **nothing** |
| 7 × `🎾 Deine Padelbase-Woche` marketing mail | 2,944 | ❌ — and correctly so: a stray thread, account parent only |

**⏩ Week planning, 7 Sep 2026** — this is the owner's exact complaint, visible in the data:

| artefact | bytes / chars | Google file id |
|---|---:|---|
| Gemini notes (the real one) | **73,156** | `1DQUz56XChXPsIeP9ShiexU8vtUmCRfJ7` |
| Gemini notes (the accidental joiner) | **1,107** | `14_UjInpYJ2rPvVDAKIPJ_EvuUe12hMx9` |
| `meetings` row, `transcript_found_by=attachment` | tlen **1,095** | `1xzt7sZZEHvasVvKwN_B3ziFvHhYmciFjXsznIt6oH7I` |
| 3 × `Notes:` mail | 3,700 | — |
| `meetings` knowledge source | 1,193 | — |

There are **three** Gemini documents for one call. The calendar event attached a **third** id that is
neither of the two the Drive sweep filed, and the meeting captured **1,095 characters** from it. The
73,156-byte transcript is related to nothing. That is the whole bug, in ids.

### 5. The verdict the brief asked for

**Google's ids CAN group the RSVP traffic and CANNOT group the artefacts that hold the answer.**

I did **not** fall back to inference. The Gemini documents and the 121 `Notes:` mails keep a NULL. A
title match would place every one of them — and would also merge the 91 identically-titled instances of
a recurring series, which is precisely how the base would start answering confidently about the wrong
half-hour.

**Worth flagging: the app already does this.** `eventNamedBy` in `knowledge-google.ts` groups a
calendar notice to an event **by comparing titles**, and uses it to *retire* sources. Google's own id
was in those same bodies the whole time. I have not changed that fold — it decides what is searched,
which is phase 2 — but it is the strongest argument for the column, and the next lane should replace
it.

### 6. Account / app — already correct, so I added no column

The brief expects the migration to add "the account/app it belongs to". **Both have been on
`knowledge_sources` since migrations 0012 and 0020**, and of every mirrored source, the number whose
`account_id` disagrees with the row it mirrors is **0** — across `help`, `stories`, `tasks`, `meetings`,
`sprints`, `apps`, `processes`. (`accounts` has no `account_id` column; it *is* the account.)

So I deliberately added no second spelling. The gaps that look like a knowledge-base failure are not
one: `google_drive` 0/80 and `google_chat` 0/148 have no account because **all 13 shared Google
containers have `google_sources.account_id` unset** — nobody has said which client those folders and
spaces belong to. That is data entry, not code, and inventing it would be exactly the inference banned
here. `meetings` 48/460 is the same shape.

---

## PHASE 1b — THE COLUMNS

Team migration **`0070_a_source_says_which_call_it_is_from`** (`workers/tenancy/src/team-schema/migrations.ts`).
Added in the **migration only** — `team-schema.ts` has no `CREATE TABLE` for this table at all, and
adding it in both places is the duplicate-column error that reddens hundreds of tests.

```sql
ALTER TABLE knowledge_sources ADD COLUMN event_id TEXT;
ALTER TABLE knowledge_sources ADD COLUMN event_id_from TEXT;
CREATE INDEX idx_knowledge_sources_event ON knowledge_sources (event_id) WHERE event_id IS NOT NULL;
```

Partial index, because the column is NULL on most rows by design (the ruling of 0061: an index nothing
reads is a write cost with no reader).

`event_id_from` names which of Google's statements was read — the same job
`meetings.transcript_found_by` does beside it, because the three routes do not prove the same thing.

**The backfill.** Two routes run in the migration; the third cannot, because SQLite has no base64.

| route | where the migration runs it | rows it places (of the whole table) | live |
|---|---|---:|---:|
| `origin` — the calendar entry IS the event | migration, `substr(origin_row_id, instr(…,':')+1)` | **290 of 290** calendar sources | 55 |
| `meeting` — `meetings.google_event_id` | migration, id join | **315 of 465** meeting sources | 40 |
| `mail` — Google's `eid=` | `scripts/backfill-source-events.mjs` | **239 of 736** mail sources | 28 |

**844 rows placed. 495 distinct events after backfill.**

**What could NOT be placed — the finding, not a failure:**

| | rows | why |
|---|---:|---|
| `google_drive` (87 of them Gemini notes) | **101** | Google states no event on the document. 0 mention a calendar link, an eid or a Meet link. |
| `google_chat` | **189** | Google states no event on a chat message. |
| gmail `Notes:` | **121** | Carry the **minutes** and state nothing but the title. |
| gmail `Canceled event:` | **6** | A Meet link, no eid. |
| gmail `Problem with the notes:` | **6** | Nothing. |
| meeting sources with no Google event | **150** | Typed by hand; there is no event. |
| every non-Google in-app mirror (tickets, stories, tasks, …) | ~3,100 | Correctly parentless — an event is OPTIONAL, and account/app is their universal parent. |

**Nothing was applied to staging.** Applying migrations is the owner's gated step (`--env staging`,
realtime-first order); the counts above are the script's own dry run, which computes exactly what it
would write by reading. Run to apply:

```bash
node --experimental-transform-types scripts/backfill-source-events.mjs --apply
```

**The column will not rot.** The write path carries it too, so new rows arrive parented rather than
depending on a script somebody ran once: the calendar lane sets it from the item's `externalId`, the
meetings kind from `google_event_id`, and the mail lane decodes the `eid` after hydration through
`calendarEventIdInText`. The upsert uses `COALESCE(excluded.event_id, knowledge_sources.event_id)` —
an event is **learned and never unlearned**, so a later sweep of a different lane cannot blank an id a
backfill correctly read.

---

## THE LAWS I WALKED, AND WHAT EACH DEMANDED

| law | demanded |
|---|---|
| **R1 publish** | **Nothing.** No non-GET route was added or changed. The sweep's own upsert already sits behind `publishChange` in its callers; the two new columns ride it. |
| **R10 gate** | **Nothing.** No route added. The backfill script is an operator tool, not a door, and it refuses `--production`. |
| **R14 bounded reads** | The backfill pages 500 rows at a time keyed forward on `id`, stated in a comment at the statement. A one-page read of a paged door is how a census answers a confident zero. The migration's two UPDATEs are set-based, not slices. |
| **R16 exact counts** | **Nothing** — no collection, no screen, no count seam touched. |
| **R17 idempotent transitions** | Both backfills ride `event_id IS NULL`, and so does the script's UPDATE. A rerun moves zero rows and cannot re-decide a parent a better route already placed. Locked by a test that runs the backfill twice. |
| **R18 ACTIVITY_GATE_MAP** | **Nothing** — no activity row is written. Deliberate: parenting a source is not a thing a person did. |
| **R23 cited answers** | Unchanged. `knowledgeAnswer` still decides `found` / `passages` / `citations` in one seam, and every citation still identifies its source by `id`. No door assembles a response by hand. Nothing in the answer path reads the new column. |
| **R26 the vector fence** | **The load-bearing one, and the answer is explicitly "nothing moved".** The vector carries nine metadata keys and the tenth is deliberately spare; `event_id` is **not** a tenth. `METADATA_INDEXES` is untouched, so the index is not rewritten. Every call still passes `namespace: guard.teamId`, built in one function from the guard. The index is still asked for ids and scores only (`returnValues:false`, `returnMetadata:"none"`) and every passage is still read back out of the team's own database under the caller's own fence. **Grouping has not become a second, weaker fence — it is not a fence at all yet, because nothing reads it.** |
| **R42 declared readers** | **Nothing.** `source-readers.ts` is untouched; no new file type is accepted. |
| **R27 described contracts** | Checked and deliberately empty: no tool description names `event_id`. Nothing is exposed on the machine surface in phase 1. |
| **R28 / R33 / R34 / R44 translation** | **Nothing** — not one user-visible sentence was added. All new text is comments, SQL, a script and two tests. |
| **R58 named paths** | `scripts/backfill-source-events.mjs` exists (it is named in the migration's own prose). |

---

## FILES TOUCHED

| file | why |
|---|---|
| `workers/tenancy/src/team-schema/migrations.ts` | Migration 0070: two columns, one partial index, two backfills. **Migration only** — never the `CREATE TABLE`. |
| `workers/content/src/lib/google-api.ts` | `calendarEventIdInText` beside `documentIdInText` — decodes Google's own `eid`. Declines rather than guesses. |
| `workers/content/src/lib/knowledge-google.ts` | Calendar lane states its event id from `externalId`; new `statedEvent` applies the mail decode after hydration, riding `slice` the way the fold and the mojibake mend do. |
| `workers/content/src/lib/knowledge-ingest.ts` | `IngestRow.eventId` / `.eventIdFrom`; both on the one upsert seam under `COALESCE`; the meetings kind reads `m.google_event_id`. |
| `workers/tenancy/test/migration-source-events.test.ts` | **new** — runs the backfill against real SQLite and asserts what it placed. |
| `workers/content/test/source-event-parent.test.ts` | **new** — the decoder against real staging strings, and the migration's SQL against a title match. |
| `workers/content/test/knowledge-coverage.test.ts` | Two digests **re-pinned at their current versions**, with the reason. |
| `scripts/backfill-source-events.mjs` | **new** — the `mail` route. Staging-only, dry by default, pages, proves the database first, imports the app's own reader rather than redefining it. |
| `documents/DATA-MODEL.md` | Records the two columns, the three routes, and what stays NULL. |

## TESTS, AND HOW I PROVED THEM

Both suites are mutation-proved. **Two of my first three mutations were incoherent and I nearly
reported a test as proved against them:**

- Decoder keeps the calendar id → **3 failed** ✅
- Migration's meetings EXISTS switched to a title join → **1 failed** (content suite) ✅
- Same mutation, tenancy behaviour suite → **passed**. The mutation had only changed one of the two
  join sites (the `SET` sub-select still joined on id), so nothing behaved differently.
- Fixture then also wrong: my "typed by hand" meeting had a unique title, so a title join changed
  nothing either. Rewrote M2 to **share M1's title with no Google event** — the recurring-series
  case, 91 identically-titled instances on staging.
- Coherent mutation (both join sites) against the fixed fixture → **1 failed**, `S3` given a parent
  Google never stated ✅. Restored → green.

## `npm run check` — EXIT=0, unpiped

| workspace | Test Files | Tests |
|---|---|---|
| auth | 21 passed (21) | 224 passed (224) |
| tenancy | 77 passed (77) | 991 passed (991) |
| content | 92 passed, 1 skipped (93) | 1,193 passed, 3 skipped (1,196) |
| data-ops | 40 passed (40) | 427 passed (427) |
| mcp | 13 passed (13) | 609 passed (609) |
| realtime | 5 passed (5) | 90 passed (90) |
| gateway | 11 passed (11) | 100 passed (100) |
| portal-gateway | 2 passed (2) | 49 passed (49) |
| web | 145 passed (145) | 1,210 passed, 8 skipped (1,218) |
| portal-web | 12 passed (12) | 96 passed (96) |

Tenancy +1 file / +3 tests, content +1 file / +9 tests. The skips are the two suites a worktree cannot
run (`glide/normalised.json`, `web/out`) plus web's usual 8.

**The migration really executed**, not merely compiled: `spine-harness.ts` runs every `TEAM_MIGRATIONS`
entry into `node:sqlite`, so its SQL ran inside 991 tenancy tests and 1,193 content tests.

## UI / UX / BUSINESS LOGIC — WHAT THE OWNER MUST BE TOLD

- **No UI or UX change.** Not one screen, component, string or style.
- **One business-logic change, and it is additive:** the sweep now stores an event id on a source
  where Google states one. Nothing reads it yet — not the search, not a screen, not a tool — so no
  answer, ranking or citation changes on this branch. What is searched is phase 2.
- **Two reader digests re-pinned at their current versions rather than bumped.** The meeting reader's
  `summary` and `body` builders are byte for byte what they were; a bump would have re-read 465
  meeting sources to rewrite none of them. This check has now been a false alarm five times and I have
  left the reasoning where the next person meets it.

## WHAT I COULD NOT MOVE, AND THE HONEST REASON

1. **The Gemini notes document still has no parent — the artefact that actually holds the answer.**
   Google states the link only in the calendar event's `attachments[]`, which needs a live Calendar
   read. The route exists (`google-transcript.ts` route 1) and today it names a *different* document
   from the one the Drive sweep filed — 0 of 80 live Drive sources overlap. Placing these means
   walking every event's attachment list and matching Drive file ids, which is a new sweep behaviour
   and outside phase 1. **It is the single highest-value thing left**, and it is still "read, never
   infer".
2. **The 121 `Notes:` mails have no parent.** Google states nothing on them. Unless a new Google
   surface is read, a NULL is the only honest answer.
3. **The `google_sources.account_id` gap (13 of 13 containers unset)** is why 228 Google sources have
   no client. A person must say which client a folder or space belongs to. Not mine to invent.
4. **Nothing was applied to staging.** Migrations are the owner's gated step.
5. **I did not touch `eventNamedBy`'s title-match fold**, though it is the inference this work exists
   to replace, because it decides what is retired and therefore what is searched.

## FOR PHASE 2, FROM THIS MEASUREMENT

- The event's `attachments[]` is the one honest route to the Gemini documents. It is worth its own lane.
- `meetings.transcript_file_id` for week planning points at a **1,095-character** stub. Grouping alone
  will not fix that: something has to prefer the longest artefact in a group. That is a phase-2
  decision and it now has ids to make it with.
- Adding `event` to the vector metadata is the tenth and last slot, and Vectorize does not index
  retrospectively — it means a full re-index. Decide it deliberately.
