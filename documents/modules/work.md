# Work

## What it is

The work engine is what the agency actually **does** about a ticket, and the
block that work was sold inside. A **Story** is one piece of work, carrying
who's doing it and by when, and it lives in a **Phase** (the glossary's own
word for what the code and the URL call a "sprint" — `shared/glossary.ts`
`sprint: { term: "Phase", … }`); several Phases sold together are a **Wave**,
told apart by its name and its dates alone; a **Task** is the agency's own
internal admin, not an account's delivery; and a **Work log** is one row of
time, who, what they worked on, and how long, in whole seconds. Stories,
Phases, Waves and Tasks are four nouns over **one permission**, `work` — they
are one right and four things a person can do or see with it
(`web/lib/screens.ts`'s `MODULE_PERMISSION` comment: "Stories, sprints and
tasks all gate on `work` — they are one permission and three nouns … and a
WAVE is the package those sprints were sold inside. Same permission … and TIME
is the fourth noun on the same permission"). A **To-do** (now **Input**) is a
different module (`inputs`) even though it shares the work engine's shape,
because it is aimed at the client rather than the agency.

## Screens

| Screen | Kind | Route / deep link |
|---|---|---|
| Backlog (`stories.list`) | list, paged | `/t/<teamId>/stories` |
| Story detail | bespoke (`story-detail.tsx`, status stepper + time logged) | `/t/<teamId>/stories/<id>` |
| Phases (`sprints.list`) | list, bounded | `/t/<teamId>/sprints`, contextual under an app |
| Phase detail | bespoke (`sprint-detail.tsx`, backlog + Complete button) | `/t/<teamId>/sprints/<id>` |
| Waves | bespoke, no recipe at all (`waves-screen.tsx`, `wave-detail.tsx`) | `/t/<teamId>/waves` |
| Tasks (`tasks.list`) | list, paged | `/t/<teamId>/tasks` |
| Logs / Time (`time`) | bespoke (`time-screen.tsx`, `work-logs-panel.tsx`) | `/t/<teamId>/time` |

There is no `waves.list`/`waves.detail` entry in `BASE_RECIPES` at all — Waves
is entirely host-composed, unlike Tasks and the Backlog, which register a list
recipe purely to carry the module gate and resolve at
`resolveRecipe("tasks.list", …)`, while every field the screen actually draws
is built by hand.

## Doors

Stories, Phases (sprints) and Tasks/Time are served by
`workers/content/src/index.ts`; Waves are served by `workers/tenancy/src/index.ts`
(a different worker, same `work` gate). Every one of these doors refuses a
client login at the door (R21): a story names the staff member doing the work,
which the portal never shows — a client's view of a story is a count on their
own ticket.

| Route | Does |
|---|---|
| `GET /api/content/stories` | list stories, paged (`work:read`) |
| `POST /api/content/stories` | create a story (`work:create`) |
| `POST /api/content/stories/update` | edit a story (`work:update`) |
| `POST /api/content/stories/status` | move a story's status, incl. Done (`work:update`) |
| `GET /api/content/sprints` | list sprints/Phases (`work:read`) |
| `POST /api/content/sprints` | create a Phase (`work:create`) |
| `POST /api/content/sprints/update` | edit a Phase (`work:update`) |
| `POST /api/content/sprints/complete` | complete / reopen a Phase (`work:update`) |
| `GET /api/content/work-logs`, `/summary`, `/running` | read time, its totals and its live timers (`work:read`) |
| `POST /api/content/work-logs`, `/start`, `/stop`, `/update` | log or time work (`work:update`) |
| `GET /api/content/tasks` | list tasks, paged (`work:read`) |
| `POST /api/content/tasks`, `/update`, `/done`, `/delete` | create/edit/close/remove a task (`work:create`/`work:update`) |
| `GET /api/tenancy/waves`, `/one` | list / read one Wave (`work:read`) |
| `POST /api/tenancy/waves`, `/update`, `/active`, `/sprint`, `/phase-days` | create/edit/(de)activate a Wave, attach a Phase, set its phase-day defaults (`work:update`) |

## Business rules

- A story cannot move to Done while its own timer (or anyone's timer on that
  story) is still running — `refuseWhileTimerRuns(cfg, guard, { table: "stories", id })`
  in `workers/content/src/lib/stories.ts`'s `setStoryStatus` — `R99`
- A task cannot be marked done while a timer on it is running — the same
  `refuseWhileTimerRuns(cfg, guard, { table: "tasks", id })` call, in
  `workers/content/src/lib/tasks.ts` — `R99`
- A story's status move is idempotent: `UPDATE … WHERE status <> ?` rides the
  write, so re-marking an already-done story done writes no second history
  row — inline-commented `R17` in `workers/content/src/lib/stories.ts` — `R17`
- A Phase's Complete/reopen is idempotent on its own current state:
  `UPDATE sprints SET completed_at = … WHERE id = ? AND completed_at IS [NOT ]NULL`
  in `setSprintComplete` — `R17`
- A story's/task's/Phase's/Wave's reference (e.g. `BERG-B0412`) is minted once
  through `canonicalRef` and never rewritten — `UNIQUE` partial indexes
  `idx_stories_ref`, `idx_sprints_ref`, `idx_tasks_ref`, `idx_waves_ref` (all
  `WHERE ref IS NOT NULL`) — `R55`
- Two Phases whose dates overlap inside one Wave are reported, never
  refused — `documents/DATA-MODEL.md` § *waves* — `unenforced` (a deliberate
  choice, not a gap: "the overlap is real, and a door that said no would be
  enforcing a rule nobody agreed to")
- Stories, Tasks and Work logs are collections that only grow, so each pages
  by key rather than capping — `stories`, `tasks`, `workLogs` are all
  `GROWING_COLLECTIONS` entries; Phases (`sprints`) are deliberately NOT, since
  a Phase grows at the speed of contracts, not clicks, so a hard cap is an
  honest answer — `R14`
- A Wave carries a `name` unique per account among its active rows — `UNIQUE`
  partial index `idx_waves_name ON waves (account_id, name) WHERE deactivated_at IS NULL`
- A running timer is unique per person, per target: parallel timers on
  different work are a real day and are allowed, the same person on the same
  work twice is refused by the database — partial `UNIQUE` index
  `idx_work_logs_running ON work_logs (user_id, target_table, target_id) WHERE ended_at IS NULL`
- A work log attaches only to a story, a ticket or a task — never a to-do,
  never an account on its own — the allow-list `WORK_LOG_TARGETS`
  (`workers/content/src/lib/work-logs.ts`) is deliberately NOT a database
  `CHECK` (SQLite can't alter one without rebuilding the table) — `unenforced`
  at the database layer, held only by the worker's own allow-list
- A story detail and a task detail read a record past the loaded page by its
  own ID rather than `.find()`-ing it out of a cached, paged list — `R38`
- Every non-GET route on Stories/Phases/Tasks/Time/Waves opens with the shared
  gate before touching a row — `workers/content/test/gating-seam.test.ts`
  (content-served doors) — `R10`
- Every mutation across the work engine calls `publishChange` so an open list
  and an open record patch just the changed row —
  `workers/content/test/publish-seam.test.ts` — `R1`
- Every body field these doors read is validated positionally at the
  boundary — `workers/content/test/validate.test.ts` — `R20`
- A story's, a Phase's, a Wave's, a Task's and a Work log's cross-module
  activity all resolve through `ACTIVITY_GATE_MAP` to `work` (Work logs gate on
  the same module as the work they're against; a Task is "our own admin," so
  it gates with the rest of the work engine) — `R18`

## Edge cases

- `todos`/Inputs were renamed away from Work on 15 Sep 2026 (team migration
  `0096`) — the table name (`todos`) is unchanged, but the URL segment, the
  permission module and the `ACTIVITY_GATE_MAP` entry all moved to `inputs`;
  don't assume every `todos`-named symbol still means Work.
- `stories.ticket_id` is nullable, and four out of five stories in the real
  history stand on their own with no ticket behind them
  (`documents/DATA-MODEL.md` § *stories + sprints*).
- `step_key` + `changes_no_step` are a required pair before a story can be
  marked done — "nobody filled this in" and "we looked, and it changes no
  step" are different answers the savings math has to tell apart.
- A task's own calendar view (`record-calendar.tsx`) still draws a
  library-composed `"+N more"` overflow with no click-through of its own
  (`documents/UI-GAPS.md` #30) — the host works around it by composing the
  overflow as one more clickable event per day.

## Open issues

- Sorting a story's own panelled, paged sub-collections (its logged time) has
  no control on the door yet the way the top-level lists do
  (`documents/BASE-IMPROVEMENTS.md` #33a).
- The work-logs panel's Logged-by staff filter carries initials only, no
  photo, in its face-in-choices picker — a named, open gap, not yet a door
  that returns one (R90's own note in `shared/rules/registry.ts`).
