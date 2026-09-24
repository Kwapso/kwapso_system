# Meetings

## What it is

A **Meeting** is a conversation the agency had or is about to have, with what
it meant to cover and what was decided (`shared/glossary.ts` `meeting`). It is
its own permission module, `meetings` — the URL segment IS the module — because
what is being permissioned is the notes, not the taxonomy of why the agency
meets (that's `delivery`/Purposes, a separate module). A meeting's agenda and
notes are the two things nothing else in the app holds; its own logged time
lives on a separate Work log, joined to nothing on purpose, because a meeting
is not a timesheet.

## Screens

| Screen | Kind | Route / deep link |
|---|---|---|
| Meetings list (`meetings.list`) | list, paged/calendar toggle | `/t/<teamId>/meetings` |
| Meeting detail | bespoke (`meeting-detail.tsx`, agenda + notes + transcript + attendees) | `/t/<teamId>/meetings/<id>` |

There is no `meetings.detail` recipe: two of the detail's three tabs are prose
somebody wrote (the agenda, and the notes afterwards) and its header carries
the one button in this module that reaches outside the app (opening the event
in Google Calendar), which no engine block draws.

## Doors

Served by `workers/content/src/index.ts`, gated with `gated(request, env,
"meetings", "read"/…)` in `workers/content/src/routes/meetings.ts`. Every door
refuses a client login (R21): a meeting's notes are the agency's own record,
written for itself and often about the client rather than for them.

| Route | Does |
|---|---|
| `GET /api/content/meetings` | list meetings, paged (`meetings:read`) |
| `POST /api/content/meetings` | create a meeting (`meetings:create`) |
| `POST /api/content/meetings/update` | edit a meeting (`meetings:update`) |
| `POST /api/content/meetings/transcript` (write) | claim a transcript, and log the room's own people's time (`meetings:update`) |
| `GET /api/content/meetings/transcript` | read the transcript text (own door: up to ~1MB) (`meetings:read`) |
| `GET /api/content/meetings/people` | resolve the invitation against the address book (own door: two databases) (`meetings:read`) |
| `POST /api/content/meetings/sync-calendar` | bring Google Calendar in, one way, with a resumable cursor (`meetings:update`) |
| `POST /api/content/meetings/active` | (de)activate — cancel is `deactivated_at`, never a status flag (`meetings:update`) |

## Business rules

- Transcript capture is idempotent: the write rides
  `transcript_captured_at IS NULL`, so a second hunt that finds the same
  transcript writes nothing a second time — inline-commented `R17` in
  `workers/content/src/lib/meetings.ts` — `R17`
- A meeting is recognised as the same one across repeated calendar sweeps by
  its `google_event_id`, which is `UNIQUE` (partial, `WHERE google_event_id IS
  NOT NULL`) — `idx_meetings_event`, so one calendar event can never become two
  meetings however many times the sweep runs — a database constraint (`idx_meetings_event`)
- A meeting's own `status`/`held_at` flags are retired and read by nothing:
  whether a meeting happened is derived from its own `starts_at` against the
  clock, never a column somebody has to remember to tick —
  `documents/DATA-MODEL.md` § *meetings* — `unenforced` (a design decision, not
  a machine-checked one; nothing currently reads the two dead columns, but
  nothing refuses a write to them either)
- A transcript hunt that throws stops retrying once it crosses
  `TRANSCRIPT_ATTEMPT_CAP` (8) tries, so one meeting Google keeps refusing
  cannot loop the sweep forever — `workers/content/test/transcript-gives-up.test.ts`
- The meetings list is a collection that only grows (an event, once it
  happens, is never curated away) so it pages by key rather than capping —
  `meetings` is a `GROWING_COLLECTIONS` entry — `R14`
- A meeting detail screen reads a meeting past the loaded page by its own ID
  (the `inPage`/`meeting:one:<id>` pattern), not by `.find()`-ing it out of a
  cached, paged list — `R38`
- A meeting's `notes` column is the one field in this module no sync ever
  touches: Google owns the words of a row it authored, kwapso owns the words
  of a row it authored — `documents/DATA-MODEL.md` § *meetings* — `unenforced`
  (a written invariant about which sync path writes which column, held by
  code review rather than a constraint)
- Every non-GET meetings route opens with the shared `gated` wrapper before it
  reads a body or touches a row — `workers/content/test/gating-seam.test.ts` — `R10`
- Every meetings mutation calls `publishChange` so an open list and an open
  record patch just the changed row — `workers/content/test/publish-seam.test.ts` — `R1`
- Every body field a meetings door reads is validated positionally at the
  boundary — `workers/content/test/validate.test.ts` — `R20`
- A meeting's cross-module activity resolves through `ACTIVITY_GATE_MAP` to its
  own module, `meetings` — `R18`
- A transcript arriving writes a Work log for every one of the agency's own
  people who was in the room, one door because it is one moment, and that
  write is the same idempotent `transcript_captured_at IS NULL` predicate
  above — `R17`

## Edge cases

- Nothing writes back to Google from this app: the four calendar write doors
  that used to exist are gone (18 Aug 2026); every `google_*` column is a
  read-only mirror, refreshed only by the sweep
  (`documents/DATA-MODEL.md` § *meetings*).
- `from_calendar` decides what a re-sync may overwrite — a meeting typed here
  and a meeting read in off somebody's calendar are not the same kind of row,
  and the sync must not clobber a kwapso-authored meeting's own words.
- The calendar sweep does a live window (a fortnight back, four weeks on)
  every call, plus a resumable 90-day slice of a five-years-back-to-a-year-ahead
  walk, tracked on `google_connections.calendar_swept_through` — forward-only,
  so a slow walk can never leave a gap behind it.
- "Stories from a transcript" is not built: the knowledge-base half of that
  flow was deliberately left to the work-engine's own lane
  (`documents/BASE-IMPROVEMENTS.md` § *what was deliberately not built*).

## Open issues

- The meetings list's calendar view shares the same library `"+N more"`
  overflow gap as Tasks and Sprints (`documents/UI-GAPS.md` #30) — closed
  app-side by composing the overflow as its own clickable event, still open
  in the vendored kit.
- Sorting the meetings list's calendar/agenda toggle has no independent
  control from the plain list's sort (R78 forbids a sort control on calendar
  views entirely; the two view modes on this screen are not yet reconciled
  in one documented statement) — `unenforced`.
