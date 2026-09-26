### stories + sprints. KEEP (BUILT 2026-08-12, team migration `0014_stories_and_sprints`). WHAT WE DO

A ticket is what an account ASKS FOR. A **story** is one piece of work WE do
about it, and it is **the only place an assignee and a due date live**, a ticket
deliberately has neither and derives its picture from its stories
(.plans/BUILD-1 §2).

- **Stories have no type.** The owner settled it: the ticket carries the type,
  and the process step carries the classification that matters. There is no
  column for one and no door that accepts one.
- **`ticket_id` is nullable.** Four out of five stories in the real history stand
  on their own, with no request behind them.
- **`step_key` + `changes_no_step` are a PAIR, and one of them is required before
  a story can be marked done.** Two columns rather than one nullable one, because
  "nobody filled this in" and "we looked, and it changes no step" are different
  answers and the savings maths has to be able to tell them apart. It is a step
  KEY rather than a step id: a key is the same step across every version of a
  map, and a story outlives the version it was written against.
- **`title` is not in SCOPE's field list** and was added anyway: a piece of work
  with no name cannot be read in a list, assigned, or said out loud on a call.

A **sprint** is the block of delivery work sold to one account. It carries
`sold_price_cents`, **whole cents**, which settled the one open contract between
this build and the money lane (`workers/tenancy/src/lib/work-engine.ts` used to
probe `sqlite_master` for which of two spellings had shipped). `completed_at` is
a MOMENT rather than a status word, because the version cut on the money side
keys off exactly that.

### story_attachments + story_processes. KEEP (BUILT 2026-08-19 + 2026-08-17, team migrations `0045_a_story_shows_its_work` + `0028_ticket_and_story_facts`). WHAT A STORY CARRIES

Two small tables that hang off a story. **`story_attachments`** is its files and
links — `kind` is `file` or `link`, with a `label`, the `url`, and
`content_type` + `size_bytes` when there are bytes behind it; a screenshot of
the work is the ordinary row. Deactivated, never deleted, so "what was attached
when we agreed this" survives (`add_story_link` is the machine half; the FILE
half is a screen action, the same bytes-not-prose ruling as everywhere else on
the machine surface). **`story_processes`** is the join saying which process
maps a piece of work touches — creator block only, a statement rather than a
record, which is what lets the impact screen walk from the work done to the maps
it changed.

### waves. KEEP (BUILT 2026-08-24, team migration `0054_the_audit_module_finished`). WHAT A CLIENT BOUGHT

A **wave** is several sprints sold together — the package, where a sprint is the
block inside it. It carries a `name` (unique per account among active rows), a
`goal`, and NO price: what a wave costs is deliberately out of this module's
first version. `starts_on` / `ends_on` are DERIVED from the sprints inside it
and STORED so a list does not recompute them per row — recalculated whenever a
sprint is added, moved or removed. The join is one column the same migration
puts on the sprint, `sprints.wave_id`, written by the one `set_sprint_wave` door
(tenancy's single-column write on a content-owned table — the ownership split is
recorded in RESILIENCE.md §2). Two sprints whose dates overlap are REPORTED and
never refused: the overlap is real, and a door that said no would be enforcing a
rule nobody agreed to.

### work_logs + work_prefs. KEEP (BUILT 2026-08-12, team migration `0015_work_logs`). THE ROW OF TIME

**A timer is a work log with no end yet.** There is no second table, no session
object and no state machine: starting is one insert, stopping is one update, and
the header asks "what am I running?" with one indexed read. That shape is what
pays for the owner's own acceptance bar, "logging time takes too many clicks"
was the single thing he named as most likely to make him abandon this.

- **It attaches to a story, a ticket or a task, and nothing else.** Never a to-do
  (that is the client's time, not ours) and never an account on its own (a figure
  with no work behind it is one nobody can check). The allow-list is
  `WORK_LOG_TARGETS` in `workers/content/src/lib/work-logs.ts`, **there is
  deliberately no CHECK constraint**, because a CHECK would be a second copy only
  SQLite can see, and in SQLite it cannot be altered without rebuilding the
  largest table here.
- **One partial unique index on (user, target) WHERE `ended_at IS NULL`.**
  Parallel timers on different work are a real day and are allowed; the same
  person on the same work twice is a double count nobody would spot in a total,
  so the database refuses it rather than a check a race slips past.
- **`discarded_at` is how a runaway timer is binned** without deleting anything.
  The row and the name of whoever binned it survive; every sum subtracts it.
- **`kind` is nullable on purpose.** A work log was one day going to name its
  kind of work; the margin was going to group by it, and until 10 Sep 2026 an
  unnamed kind was charged at the default internal rate by the library that
  held our own money. Both were removed that day, along with the internal rate
  cards themselves, so `kind` stays on the table with nothing grouping by it.

`work_prefs` is one row per person and today one column: whether starting a timer
stops the ones they already have running. **Off by default**, a setting that
silently stopped your other work would be discovered by losing an hour.

### todos + tasks. KEEP (BUILT 2026-08-12, team migration `0016_todos_and_tasks`). THE OTHER TWO NOUNS

**Two tables, not one with a `kind` column**, and the reason is the one that
split the rate cards back when there were three of them: they are the same SHAPE
and opposite AUDIENCES. A **to-do**
is aimed at the client and appears in their portal; a **task** is our own admin
and must never leave the building. One table with a flag would put both a
forgotten `WHERE` clause apart, and the wrong one of them is a list of the
agency's internal chores rendered on a customer's screen.

- `todos.account_id` is **NOT NULL**, a to-do with no client is aimed at nobody,
  and that column is what the fence reads. It is the ONE row in the work engine a
  client login writes to: they complete it and attach one file.
- Raising one **emails them**. It is one of only two things in the whole product
  that reach a customer's inbox (the other is a ticket resolution).
- `tasks.account_id` is nullable and usually null. **Work logs attach to a task**
  and never to a to-do, forty minutes on our own VAT return costs us what forty
  minutes of delivery costs us.

### triage_duty. KEEP (BUILT 2026-08-12, team migration `0017_triage_duty`). WHOSE WEEK IT IS

A rota keyed by the **Monday**, with a unique index on the week. "One named
person is on triage duty, and it is visible whose week it is" (.plans/BUILD-1 §6)
has no answer if two rows claim a week, and a check in code is a check two
simultaneous writers race past. A row per week rather than a flag on a member,
because "whose week was it when this was missed?" has to survive.

### meetings. KEEP (BUILT, per-team, team migration `0021_meetings`). WHAT WAS AGREED IN THE ROOM

The one noun the legacy import had nowhere to put. Glide held 350 meetings and the
reconciliation folded every one into a **work log**, because a work log was the only
row carrying a date, a duration and a client. That kept the hours and threw the
meeting away: a work log answers *"how long did that take"* and has no field that
can answer *"what did we agree in March"*.

- **`agenda` and `notes` are the two things nothing else in the app holds**, and
  they are why this is a record rather than a column on something else.
- **`notes` HAS NO SCREEN ANY MORE (23 Sep 2026), and it still has its column.**
  Aurora: *"on meetings: rmeove notes (we have transcript for that)"*. The open
  field, its Save button and the word itself are gone from the meetings UI; the
  COLUMN, every row in it, the read and write doors and the knowledge sweep that
  ingests it are all untouched. The meeting's edit form no longer carries the
  field at all, so `meeting-detail.tsx`'s own save hands the row's stored value
  straight back to the update door, which REPLACES what it is given and would
  otherwise have blanked it on the first edit. The text itself is not left
  stranded either: team migration `0121_meeting_notes_become_the_agenda` folds it
  into the agenda, behind a backup table (below).
- **Time still goes on a work log**, and the two are joined by nothing on purpose,
  a meeting is not a timesheet, and a meeting that ran long is two facts, not one.
- **`purpose_id`** points at the `meeting_purposes` taxonomy (§ *the agency's own
  housekeeping*), so "why did we meet" is a dropdown value rather than a fifth
  spelling typed into a title.
- **`status` and `held_at` are kept and mean nothing (18 Aug 2026).** They held a
  meeting's `scheduled` / `held` flag, and the flag is retired: a meeting's own
  `starts_at` already says whether it has happened, so a column somebody had to
  tick was a second source of truth for a question the clock answers, and the two
  disagreed in both directions (a March meeting nobody ticked read as upcoming for
  ever; one ticked on Monday morning left the day it belonged to). Nothing reads
  either column now. They survive because they record what people ticked while the
  idea existed, which is the same reason nothing here is ever deleted. Cancelling
  was never one of the words: it is `deactivated_at`, like every other retirement
  here, so "didn't we have a call in March?" is answerable either way.
- **`google_event_id` is how the sweep recognises an entry it already has.** It is
  UNIQUE (partial, so the majority of rows with no entry are not competing for one
  NULL), which is what stops one calendar event becoming two meetings however many
  times the sweep runs. It was invented for a "put it in my calendar" button that
  no longer exists; the idempotence outlived the write it was invented for.
- **The `google_*` columns are a MIRROR of the calendar event** (team migration
  `0035_calendar_depth_and_file_shares`): the join link, the organiser, the guest
  list and what each person answered (`google_attendees_json`), whatever is
  attached (`google_attachments_json`), the status, the zone, the repeat rule, and
  `google_synced_at` saying when all of that was last true. They exist because the
  alternative is that a meeting can only say who was in the room to the one person
  whose connection pushed it, live, one call per meeting — a record of a
  conversation with the conversation left out. **Nothing writes to Google, from
  here or from anywhere**: the four calendar write doors that used to are gone
  (18 Aug 2026), so Google's calendar is the source and every one of these columns is
  a copy of it.
- **`from_calendar` decides what a re-sync may overwrite.** Two kinds of meeting
  carry an event id and they are not the same record: one was typed here, the other
  was read IN off somebody's calendar. Google owns the words of a row it authored,
  kwapso owns the words of a row it authored, and `notes` is never touched by any
  sync — it is the one column in this module that only a person writes.
- **`google_connections.calendar_swept_through` is how far the whole-calendar walk
  has read** (team migration `0038_calendar_one_way`). The sweep does two windows:
  a LIVE one every call (a fortnight back, four weeks on) and one ninety-day SLICE
  of the wider window — five years back to a year ahead — resuming from this
  moment. Forward-only, so it cannot leave a gap behind it, and it stops at the
  last entry actually read when a slice holds more than one bounded read will walk.
  It sits on the CONNECTION because the walk is one person's own calendar read with
  one person's own token. NULL means "never walked", read as the floor.
- **`transcript_text` is what was SAID, kept here rather than fetched.** That is
  what makes it readable by every colleague whose role can read meetings instead
  of only by whoever holds the Drive connection — and it is what makes it
  answerable **without a second ingestion path**: text in a column is swept by the
  ordinary `meeting` ingest kind, on the cron, in the client's own compartment,
  with no Google token in sight. It is cut to what one row may hold and
  `transcript_note` says so when it was, the same rule (and the same words) a
  knowledge file uses. `transcript_found_by` records which of the three hunts
  found it — the calendar entry's own attachment, a shared Drive folder, or a
  notice from Google in the mail — because the three do not prove the same thing.
- **`transcript_attempts` (`0055_transcript_gives_up`, 26 Aug 2026)** is the
  autopilot's give-up counter. A hunt that THROWS increments it; a quiet
  "nothing there yet" stays free to retry until the horizon passes. Past
  `TRANSCRIPT_ATTEMPT_CAP` (8, `shared/workers/limits.ts`) the sweep stops
  selecting the meeting, so one meeting Google keeps refusing cannot eat the
  tick's budget every quarter hour forever — the cap is the SWEEP's selection
  rule, not a refusal on the door, so a person pressing the read button can
  still try.

**Why it is its own permission module and not four more rights on `delivery`.**
`meeting_purposes` is a TAXONOMY of why we meet, a settled list somebody curates
once a year. A meeting is a record that accumulates forever. Sharing one permission
row would mean granting the right to read every note ever taken in order to let
somebody see the list of purposes.
### meeting_notes_backup. KEEP (BUILT 2026-09-23, per-team, team migration `0121_meeting_notes_become_the_agenda`). WHAT THE NOTES SAID BEFORE THEY MOVED

One row per meeting that held notes on the day the merge ran: `meeting_id`, the
`notes` exactly as stored, `saved_at`, and `merged_at` once that meeting's text
had been folded into its agenda.

- **It exists because nothing regenerates that text.** `meetings.notes` is the one
  column in the module no sync ever writes (team migration
  `0035_calendar_depth_and_file_shares` says so in its own note), and measured on
  the live staging base, 75 of 458 meetings carried notes against 4 carrying an
  agenda. Moving three quarters of a module's prose with no way back is not a
  migration anybody should have to trust.
- **It is the undo.** A restore is one statement against this table; nothing in the
  migration ever deletes from it, so the pre-merge text survives the merge
  indefinitely. `meetings.notes` is not cleared either, so there are deliberately
  two copies.
- **`merged_at` is what makes the migration re-runnable.** The merge only touches
  meetings whose backup row says `merged_at IS NULL`, and sets it in the same run,
  so a second run appends nothing. The alternative guard, asking whether the agenda
  already contains the notes, is a substring test over prose, and prose repeats
  itself.


### work_log_kinds_backup. KEEP (BUILT 2026-09-24, per-team, team migration `0122_hand_typed_work_log_kinds_are_wiped`). THE KINDS OF WORK PEOPLE TYPED, BEFORE THEY WERE WIPED

One row per work log whose `kind` was cleared: `work_log_id`, the `kind` exactly
as stored, the `target_table` it sat on, `saved_at`, and `cleared_at` once that
log had actually been wiped.

- **It exists because Aurora ruled the words away, and a ruling is not a reason
  to lose them.** She made the kind of work automatic on 23 Sep 2026 ("on logs
  this kind of work shoudl not be manual, but automatic to where it was
  created"), which left the hand-typed words showing on no screen, and then ruled
  on them the next day: "wipe them". The column and its schema stay; only the
  hand-typed VALUES go. Deactivate-never-delete, applied to a value rather than a
  row.
- **It is the undo.** One statement against this table puts every word back:
  `UPDATE work_logs SET kind = (SELECT b.kind FROM work_log_kinds_backup b WHERE
  b.work_log_id = work_logs.id) WHERE id IN (SELECT work_log_id FROM
  work_log_kinds_backup)`. Nothing in the migration ever deletes from it.
- **ONE SET IS SPARED AND IS DELIBERATELY NOT IN HERE: `target_table = 'meetings'
  AND kind = 'Meeting'`.** That literal is `MEETING_LOG_KIND`, which the
  transcript capture stamps on every meeting log it writes; but a person could
  type the same word themselves on a meeting (the meeting's own Logs panel opens
  the log dialog with the meeting fixed as the target), so no column in
  `work_logs` tells a captured row from a hand-typed one. The ambiguity is
  resolved by the asymmetry: sparing costs a handful of invisible words, wiping
  costs the capture's own de-duplication guard, and a guard that stops matching
  let a re-capture add 18.25 hours across 21 work logs that nobody worked on
  2026-08-31. `target_table` IS the discriminator everywhere else, so a
  hand-typed "Meeting" on a story, a ticket or a task is wiped like any other
  word.
- **`cleared_at` is what makes the migration re-runnable.** The wipe only touches
  logs whose backup row says `cleared_at IS NULL`, and sets it in the same run,
  so a second run moves zero rows and a word somebody deliberately puts back
  afterwards is never wiped again.

