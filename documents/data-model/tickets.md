### help + help_threads. KEEP (BUILT 2026-06-23, team migration `0004_modules`, two-tier)

**This is the Tickets module.** There is no help section and there is no second
ticket module, one thing, wearing the name it was born with underneath. What a
person or a URL sees says **Tickets**: the sidebar, the heading, the breadcrumb,
the address (`/tickets`, `/t/<teamId>/tickets/<id>`, and `/tickets` in the
portal), the dropdown vocabulary (`Ticket type`, `Ticket status`) and the
glossary. It is not a place to report bugs about the app itself, a ticket is
something an account asked us for.

**Four things stay `help`, deliberately.** Each is data already written down or a
contract already published, so renaming it can only take something away:

| Still `help` | Why it stays |
|---|---|
| the permission module key (`help:read/create/update/delete`) | it is the string sitting in `role_permissions` in every team database, renaming it takes somebody's access away |
| the tables `help` + `help_threads`, and `activity.related_table = 'help'` | renaming orphans every history row already written about a ticket |
| the API paths `/api/content/help*` | they are `PORTAL_DOORS` entries, `PORTAL_VISIBLE_READS/WRITES` keys and R21's derivation input |
| the MCP tool names (`list_help_tickets`, `create_help_ticket`, …) | a published external contract, outside developers call these by name |

The rule, in one line: **what a person or a URL sees says tickets; what the
database and the wire say stays `help`.** The two names meet in exactly one seam,
`MODULE_PERMISSION` in `web/lib/screens.ts` (`tickets: "help"`), and
`web/test/nav.test.ts` fails if it is removed. Do not "finish the rename".

`help` (parent ticket): audit + `help_type` (selectable, and since team
migration `0093` one of exactly FOUR — Issue, Question, Extra, Feedback, the
list being `TICKET_TYPES` in `shared/ticket-types.ts`; Feedback is refused at
the door outside a running Validation sprint), `raised_as_type` (what it
ARRIVED as, written once at the INSERT and never updated), `description`,
`screen_recording_link`, the source screen/record capture, `status` on a FIXED
lifecycle, `resolved`, `resolved_on`, `resolver_id/email/name`.
`help_threads` (messages): audit + `help_id` (the parent ticket),
`tagged_team_member_user_ids` (@mention → email notify), `message_body`. A ticket
with a threaded conversation. (Ticket attachments to R2 `kwapso-help-media`, the
bucket name follows the table, are a deferred hook, see AGENT-MODULES-PLAN.)

**The work engine's ticket** (team migration `0011_ticket_work_engine`, BUILT
2026-08-11. SCOPE ch.07). The same table, grown into the thing the scope
describes; there is no second ticket beside it, and there never will be.

- **The six states.** `status` runs `new` → `triaged` → `scheduled` →
  `in_progress` → `ready` → `resolved`. This line said FIVE for a year after two
  of them shipped, which is the quiet way a document goes wrong: nothing broke,
  and anybody reading it built on a state machine the code had already left
  behind. It said SEVEN until 7 Sep 2026, when the client retired
  `awaiting_validation` — the client's main stakeholder not having said yes yet
  — in one sentence: "kill awaiting_validation". Extras, requests and feedback no
  longer wait for anybody; every ticket opens in `new`. The stage survives in
  `RETIRED_HELP_STATUSES` (`shared/types.ts`) so a ticket that really passed
  through it still reads back correctly on its stage history, and team migration
  `0069` moves any stored row into `new` without touching `help_status_events`.
  `scheduled` is stories existing AND at
  least one of them booked into a sprint — both halves in one read, because
  either alone is a different and wrong sentence — flipped by itself in
  `lib/ready-flip` `scheduledFlip`. **SCOPE ch.07 still shows five and calls
  "planned for sprint 4" a note rather than a state; the code and CHECKLIST 5.3
  are the current answer, and the figure there is the older one.**
- **`new` IS THE PRE-TRIAGE STATE** (owner, 19 Aug 2026). A ticket does not leave
  it until it names a ticket type, a client, an app and who raised it. One rule,
  `shared/triage-readiness.ts`, refused by `markTriaged` (so the agent and MCP
  obey it too) and reported field-by-field on the triage row. No `draft` status
  was added: `new` already meant "raised, nobody has read it", which is the same
  sentence, and what was missing was never the state but the REASON.
- The two old names moved onto the two that mean the same thing: `open` → `new`,
  `reopened` → `triaged`. Reopening still happens, a staff member moves a
  resolved ticket back to `triaged`, it just is not a state of its own any more,
  and there is deliberately no client-side reopen button.
- **`ref`**, the number the client quotes (`BERG-T0412`): the account's own short
  code, a `T`, and a sequence counted PER ACCOUNT. Null when there is nothing to
  build one from (the agency's own tickets carry no account; a client may have no
  code yet). Unique where present.
- **`rank`**, drag-rank, the ONLY priority signal the product has. A sparse text
  key (`shared/workers/rank.ts`), so a drag writes one row and two people
  dragging different rows cannot collide. The list reads `ORDER BY COALESCE(rank,
  id) DESC, id DESC`, which is also the keyset the page is cut on.
- **`locked_at`**, when we first read it. The account owns the wording until
  then (a client may edit and re-rank their own unread ticket, and only their
  own); the first staff touch closes it, and never moves again.
- **`draft_resolution`**, the unsent working text each story's closing note will
  append to. Never sent to a client login.
- **`archived_at` + archiver block**. Put away, available from any state.
  Nothing is deleted; the row drops out of the everyday list and its count, and
  is still reachable by id and in the archive view.
- **`title_de` / `title_en`**, both titles, and neither derived from the other.
  788 of the tickets arriving from Glide exist only in German, so a translation
  SETS the empty one and never overwrites the original.

### help_status_events. BUILT (per-team, team migration `0066_a_ticket_remembers_its_stages`). THE LADDER A TICKET CLIMBED

One row per status transition: `help_id`, `from_status`, `to_status`, the instant
and the creator block. The owner, 2026-09-06, asked for two things — "how long it
sat on each stage" and "how often sth is reopened" — and they are ONE table
rather than two, because they are one fact asked twice: **time in a stage is the
gap between consecutive rows, and a reopen is a transition back out of
`resolved`.** A `reopen_count` column would be a second source of truth for a
fact this table already holds.

- **Every status writer records, and that is a checked census.** Seven of them:
  `createTicket` (the first rung, inside the same script as the ticket's own
  INSERT, so there is no instant in which a ticket has no first stage),
  `setStatus` (which the status door, the resolve door and `bulkSetStatus` all go
  through), `markTriaged`, `bulkSetStatusByFilter`, and the three flips in
  `lib/ready-flip`. It was eight until 7 Sep 2026: `validateTicket` — the
  client's own "yes, go ahead" — went with the `awaiting_validation` stage. The statement is written once, in
  `lib/help-stages.ts`, and `workers/content/test/status-history-has-no-holes.test.ts`
  reads every worker source off disk and fails if a status UPDATE ever appears
  somewhere that does not reach it. A history with holes is worse than none: the
  gap is invisible and the stages either side of it merge into one long one.
- **It is what survives a reopen.** `setStatus` NULLs `resolved_at` and the whole
  resolver block on any move to a non-resolved status — deliberately, since those
  columns mean "the answer that stands NOW" — so before this table a reopen
  erased who answered the ticket and when. The owner blessed the nulling and named
  the remedy: *"Reopening a ticket nulls its closing timestamp, yeah — but keep it
  in activity, like closed on x, reopen on y, closed again on z."*
- **A ticket with no rows reports NOTHING, never zero.** Every ticket that existed
  before this migration has an empty history and cannot be given one; the reader
  answers `recorded: false` and the history rail prints it in words. A ticket
  raised before and moved after has a real sequence that does not start at the
  beginning (`fromCreation: false`), and says so. **Nothing is backfilled** —
  0066 lists the four reasons the activity feed cannot supply the past.
- **Append-only, and the order is `created_at` then `rowid`.** A ULID's low half is
  random, so `id` cannot break a same-millisecond tie; nothing ever deletes from
  here, so no rowid is recycled. Durations go through `shared/business-days.ts`
  (Mon–Fri only).

### help_ratings. BUILT (per-team, team migration `0067_the_client_says_how_we_did`). HOW WE DID

The client's own verdict on a finished request: `help_id`, `score` (1–3, with the
CHECK in the schema), an OPTIONAL `comment`, and the creator block — who said it
and when. The owner, 2026-09-06: *"let's store sentiment (1-3) on the portal for
how did we do it to see if client is happy"*, then *"sentiment they can add a text
(optional)"*.

- **A table and not two columns on `help`**, because "we did badly, and then we
  fixed it" is the most useful thing this data can say and a column cannot say it.
  Nothing here is ever UPDATEd; a change of mind is a NEW row and readers take the
  newest per person as the standing answer.
- **Only on a `resolved` ticket**, enforced at the door (`lib/help-ratings.ts`).
  "How did we do" is past tense; asked mid-flight it measures impatience into the
  same column. A reopen does not take an answer back.
- **The portal is where it is given** (`POST /api/content/help/rating`), the
  account comes from the guard corridor, and the fence is the ticket's own
  (`getTicket`). The READ narrows a client to their own rows — a colleague's
  private "1 out of 3" is a personal statement, not a fact about the ticket the
  way a reply is — and answers the agency with the whole set. There is no
  agency-side dashboard yet, deliberately; a rating writes an activity row, so
  what a client said is readable on the ticket's own history today.

### help_stakeholders. KEEP (BUILT, per-team, team migration `0005_help_stakeholders`). WHO ELSE IS WATCHING A TICKET

The extra STAFF people on one ticket, beside whoever raised and whoever answers
it: one row per (`help_id`, `user_id`), with a UNIQUE pair so adding the same
person twice is a no-op rather than a duplicate (R17 as a constraint). A
stakeholder is a colleague who should see the ticket move — they are read by
`list_help_stakeholders` and added through `add_help_stakeholder`, and the
notify path reads this table for who to tell. Creator block only: a stakeholder
row is a statement, and taking somebody off it is the row going, not a
deactivation ceremony on a join row.

