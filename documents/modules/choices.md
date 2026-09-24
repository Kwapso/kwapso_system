<!--
  documents/modules/choices.md — the Choices module. Shape follows
  agent_skills/lean_foundation/templates/module-doc.md.
-->
# Choices

## What it is

Choices are "the options behind your team's dropdowns, like Ticket types
and Phase types" (`shared/glossary.ts`, `dropdownValues`). Every module that
stores a categorical value on a record (a ticket's type, a story's type, a
sprint's phase type, and so on) draws its options from this one shared
vocabulary table, `selectable_data`, rather than each module inventing its
own. A value can be **Protected** ("something you can see but not switch
off. You can take the protection off a choice yourself; on an automation it
never comes off") — the same word now also covers an automation with no
switch at all, which is why the definition says the shared fact first and
the difference second. There is no `/dropdowns` screen any more: the module
is reached from each module's own Settings page now (R61's "two doors"), or
from the general Settings › Choices tab that shows every group at once.

## Screens

| Screen | Kind | Route / deep link |
|---|---|---|
| Settings › Choices (general, all groups) | bespoke panel | `/settings?tab=choices` (`web/components/screens/settings-choices-panel.tsx`) |
| A module's own Choices tab (scoped to that module's groups) | bespoke panel | `/settings/<segment>` (`web/components/screens/module-settings-screen.tsx`, `SettingsChoicesPanel` with a `scope`) |
| "Manage choices" link (from a form's own dropdown) | signpost | jumps to `/settings/<segment>` (`web/components/choices/manage-dropdowns-link.tsx`) |
| Add / edit a value | form dialog | `web/components/choices/selectable-form-dialog.tsx` |

The screen that once held the team's WHOLE vocabulary in one wall
(`/t/<teamId>/dropdowns`) was retired 11 Sep 2026 — the client's ruling,
"implement this module settings across app … end goal kill the big tab
'choice options'." The permission module `selectable_data` is unchanged and
still gates every write door and settings page listed above.

## Doors

Selectable-data (Choices) doors are served by `workers/tenancy/src/index.ts`
(`ROUTES`, from line 362) — verified by grepping `selectable` across every
worker's `ROUTES` table; the task's suggestion that this module is served by
`workers/content` does not hold, it is a tenancy-worker door.

| Route | Does |
|---|---|
| `GET /api/tenancy/selectable` | list values — `selectable_data:read` |
| `GET /api/tenancy/selectable/export` | export as CSV — `selectable_data:read` |
| `POST /api/tenancy/selectable` | create a value — `selectable_data:create` |
| `POST /api/tenancy/selectable/update` | rename / re-describe a value — `selectable_data:update` |
| `POST /api/tenancy/selectable/active` | deactivate / reactivate a value — `selectable_data:update` |
| `POST /api/tenancy/selectable/default` | protect / unprotect a value (`is_default`) — `selectable_data:update` |

## Business rules

- Protected always means active: there is no state "active, protected =
  no". `setSelectableDefault` reactivates a value in the same idempotent
  UPDATE as protecting it, and `setSelectableActive` already refused to
  deactivate a protected, active value — `R76`, proven by
  `workers/tenancy/test/selectable-protected-active.test.ts`.
- A value's `mark` can never hold an emoji — the write door
  (`optionalMark`) refuses one on both create and update, and an existing
  value's mark is left untouched on a rejected update rather than partially
  applied — `R66`, proven by `workers/tenancy/test/selectable-mark-no-emoji.test.ts`
  ("refuses a mark containing an emoji with a 400, and writes nothing",
  "refuses an emoji on an existing value's mark, and leaves the old mark in
  place").
- The glossary is the dictionary the screens speak: the word "Protected"
  (not "Default", not "Locked") is the one this module's screens are
  required to use, and a competing synonym for a glossary term is refused
  app-wide — `R6` / `R34`.
- The Ticket type group is locked at exactly four values (Issue, Question,
  Extra, Feedback); `createSelectable` refuses a fifth with a `locked_group`
  400, and the Choices screen stands its own add button down for that group
  — proven by `workers/tenancy/test/ticket-types-are-locked-at-four.test.ts`.
  Renaming an existing one of the four is untouched — a team may call
  "Extra" whatever it wants.
- A deactivated value is never a dead end: `listSelectable` always surfaces
  deactivated rows (it never filters itself to active-only), so a Choices
  screen can always offer a way back — proven by
  `workers/tenancy/test/selectable-reactivatable.test.ts` ("dropdown values
  stay reactivatable (not a dead end)").
- A dropdown value is referenced by its STRING everywhere in the app (a
  ticket's `help_type` holds the word "Question", never a row id), so
  `selectable_data` carries no `UNIQUE (type, value)` constraint at the
  database level — a genuine gap the app has hit in practice: team
  migration `0026` had to retire real duplicate rows a pre-fix seed had
  created, deactivating (never deleting) the newer of any tie so every
  existing reference kept pointing at a live row —
  `documents/DATA-MODEL.md` § `selectable_data`. This uniqueness is
  `unenforced` at the database layer; the seed is guarded now
  (`WHERE NOT EXISTS`) but a future write path that skips the same guard
  could reintroduce the duplicate shape.
- A field-words resolver (`selectableFieldWords`) answers, without throwing,
  for every group the team's own seed declares — proven by
  `workers/tenancy/test/selectable-where.test.ts` ("every seeded group that
  stores a word somewhere answers at least one field").
- Every switch on the permission matrix decides something: `selectable_data`'s
  four permission-matrix boxes (read/create/update/delete) must each be
  consulted by a real door or import target, the same derived
  offered-vs-consulted census every module answers to — `R36`.
- A cross-module read (the team activity feed) refuses a client-portal
  login this module's history outright: `selectable_data` is fenced `null`
  in `PORTAL_ACTIVITY_FENCE` ("the agency's dropdown vocabulary — app
  furniture, and none of it is the client's") — `R18`.

## Edge cases

- Every pictograph already sitting in existing `mark` data was swept out by
  team migration `0088` (a `WITH RECURSIVE` walk of codepoint ranges,
  because SQLite has no built-in Unicode class test) — two earlier
  migrations (`0034`, `0044`) had each guarded their own back-fill
  `AND mark IS NULL`, so neither one could ever have replaced a mark that
  already held an emoji; they only filled the empty ones
  (`documents/DATA-MODEL.md` § `selectable_data`).
- The same migration had to distinguish a person's own deactivation from a
  migration's own back-filled deactivation (`deactivator_id IS NOT NULL`)
  before reactivating a "protected but inactive" row, so it would not
  silently undo four separate, deliberate earlier rulings that had
  deactivated a starting value on purpose.

## Open issues

- No database-level uniqueness backs a (type, value) pair — a repeat of the
  team migration `0026` duplicate-seeding bug is architecturally possible
  if a future write path bypasses the application-level dedupe. A plausible
  candidate for either a `UNIQUE` index (with the same reference-by-string
  caveat DATA-MODEL.md already names) or a locked regression test.
- `documents/BASE-IMPROVEMENTS.md` and `documents/EDGE-CASES.md` were
  checked for Choices-specific open items beyond what is cited above; none
  named this module further at the time of writing.
