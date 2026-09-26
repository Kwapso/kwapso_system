### member_roles + role_permissions. KEEP (built; we split Glide's WIDE → TALL)
Glide `Member roles` was WIDE: `Identity/Title`, `Description`, `Is default`,
then **24 boolean columns** = 6 modules × {read,create,update,delete}. Modules:
**Teams, Team members, Member roles, Learning, Help, Selectable data**, the six
our `TEAM_MODULES` (`shared/team-modules.ts`) STARTED as. Five of them are still
there unchanged (the module a person now reads as **Tickets** is still keyed
`help`, because that string sits in every role's permission sheet); `learning`
was retired on 17 Aug 2026 with the module it named, which is the tall sheet
working as designed, a module leaves by dropping rows, and no other role's
permissions moved. The list has grown well past those six since, the customer
spine, the knowledge base, the work engine, the agency's own housekeeping and the
three Google switches all added rows, never columns, which is the whole point of
the tall sheet. Read the list in that file. We store the 24 booleans as a TALL `role_permissions` sheet
(role × module × 4 bits) so a new module = new rows, not new columns. `is_default`
flags the seeded Admin (locked) + Viewer. Roles are **edit-live + deactivate-only,
never delete** (holders keep the role). Q4 RESOLVED (see Resolutions): Admin
locked; Viewer is a normal editable role.

### selectable_data. KEEP (built, per-team)
Real data: audit block + `type`, `value`, `is_default`. Per-team dropdown
values, seeded from Base v3 defaults on team creation.

**Four optional columns of enrichment (team migration `0025`).** `mark`,
`name_de`, `description` and `standard_days`, every one nullable, and empty on
almost every group. They arrived when the Delivery method page was retired on
17 Aug 2026: a programme was never anything but "the kind of block this sprint
is", which is the question the **sprint type** already answers, so the two were
one idea wearing two names. What the ten programmes carried and the sprint type
did not is now carried by the sprint type itself, the `mark` somebody
recognises it by, the German `name_de` the agency already uses with its German
clients, the `description` that says what the block includes, and
`standard_days`, how long one normally runs. That is what lets a sprint read
"Implementation, 21 days".

They sit **on `selectable_data` rather than on a sprint-type table**, because a
sprint type is a dropdown value and a table for it would be a second vocabulary
seam beside the one that already exists. Three of the four are meaningful well
beyond sprint types: a mark is what a type mark renders, a description is what a
picker's hint line shows, and a curated foreign label is what an agency writes
once for a client who reads another language. `standard_days` is the only narrow
one, and it is a number nobody else has to look at. The starting values live in
`SPRINT_TYPE_CATALOGUE` (`workers/tenancy/src/team-schema/seed.ts`), a starting
vocabulary like the ticket types, editable on the team's own Dropdown values
screen, and both the seed and the migration are pick-or-create, so a team that
already has "Implementation" keeps its own row, its own id and its own history
and simply gains the enrichment. `standard_days` is a suggestion, never a rule:
a sprint's real dates are the ones somebody agreed with the client. `name_de` is
the ONE curated label carried over from the legacy catalogue, because those
words were already in front of German clients; every other language comes from
the translation layer, which is why there is no third label column.

**Duplicates retired, never deleted (team migration `0026`).** `createTeam`
applies every migration and THEN runs the seed. Several migrations back-fill a
default vocabulary into existing teams and guard themselves with `WHERE NOT
EXISTS`, because they have to be safe against a team that already has the value.
The seed did not, because when it was written it ran into an empty table, so a
team born before the seed was guarded got 26 of those values twice, and every
picker offered each word twice. The seed is guarded now; `0026` is the other
half, for the teams that already were. A dropdown value is referenced by its
STRING everywhere in this app (a ticket's `help_type` holds the word
"Question", not a row id), so two live rows reading the same (type, value) are
indistinguishable to every reference in the database and there is no count to
compare, the OLDEST row survives, ties broken by id, which is the row every
earlier reference was looking at anyway. The losers are **deactivated, never
deleted**: each keeps its id, its audit block and its history, shows greyed on
the Dropdown values screen with an Activate button, and says `System` as its
deactivator. Running it twice is a no-op.

**Every pictograph swept out of `mark`, and protected made to imply active
(team migration `0088`, 2026-09-14).** R66 (CLAUDE.md) records four client
rulings against emoji in this app; the fifth is the one that reaches EXISTING
data: "kill all the emojis… also, the status: if it's protected, it's always
active." Two independent fixes, one migration:

- **The pictograph sweep.** `optionalMark` (`shared/workers/validate.ts`) has
  refused a pictograph at the write door since 2026-08-31, but migrations `0034`
  and `0044` each guarded their own back-fill `AND mark IS NULL` — so neither
  one could ever have replaced a mark that already held a pictograph, they only
  filled the empty ones. `0088` is unguarded: it walks every character of every
  `mark` (a `WITH RECURSIVE` walk, not an 8-way `UNION`, because D1's
  compound-SELECT ceiling is five terms) against codepoint ranges hand-derived
  from `optionalMark`'s own regex — the two must be kept in step by hand,
  since SQL cannot call TypeScript — and NULLs the match. The one exemption is
  R66's own class: a well-formed FLAG (a pair of Regional Indicator codepoints)
  is left alone, even though `optionalMark` itself still refuses a new one at
  the door.
- **The reactivation, narrowed to the rows a PERSON produced.** A row both
  `is_default = 1` (protected) and carrying a `deactivated_at` is possible
  because `setSelectableDefault` never touched `deactivated_at` before this
  change — a person could deactivate a value while unprotected, then protect
  it. But `is_default = 1` is also the seeded/starting-vocabulary flag, and
  several EARLIER migrations deliberately deactivate a starting value on
  purpose and leave `is_default` untouched (`0026`'s duplicate retirement,
  `0034`/`0044`'s retired ticket and story words, `0042`'s "Account status"
  group) — a bare `WHERE is_default = 1 AND deactivated_at IS NOT NULL` would
  have reactivated every one of those, undoing four separate rulings. So the
  migration also requires `deactivator_id IS NOT NULL`: every migration in
  this ledger writes a `deactivator_name` but leaves `deactivator_id` at its
  column default (NULL, no actor to point at), while a person deactivating
  through `setSelectableActive` always writes a real one. That discriminator
  is what actually gets reactivated (`deactivated_at`, `deactivator_*`
  cleared), so the invariant the Choices screen now displays ("Protected"
  implies active) is true for every team from the moment this ships, without
  resurrecting a word the client already asked retired. The door
  (`workers/tenancy/src/lib/selectable.ts`) closes the gap going forward:
  protecting a value now reactivates it in the same idempotent `UPDATE` if it
  was deactivated — unconditionally, because a door call is always a person
  acting on one row they chose, never a bulk sweep.

**A ticket is one of FOUR kinds, and every other option deleted (team migration
`0093`, 2026-09-15).** The owner's ruling, verbatim: *"Remove all other options.
Just get rid of them, delete them completely. From staging and production."* The
four are Issue, Question, Extra and Feedback, and they live in ONE place —
`TICKET_TYPES` in `shared/ticket-types.ts` — read by the seed, by this migration,
by the door that locks the group and by `web/lib/type-colours.ts`, which derives
the client's fixed reading order from it rather than restating it.

- **A HARD DELETE, and it is the exception this ledger otherwise never makes.**
  `0026` retires a duplicate, `0034` retires a word — both deactivate, because a
  retired row still explains a historical ticket that says the word. The owner
  was told that and ruled for deletion twice in one sentence. What makes it safe
  rather than merely obeyed is that `help.help_type` stores the WORD and not a
  foreign key: deleting the vocabulary row cannot orphan a ticket, and a ticket
  still carrying a retired word reads the neutral colour and sorts to the end of
  the order (`ticketTypeColour`'s own ruling), exactly as it always did.
- **Request folds into Extra, on BOTH columns.** `help.help_type` AND
  `help.raised_as_type`, derived from `VOCABULARY_HOMES` rather than typed into
  the migration — the same argument `shared/selectable-homes.ts` makes about a
  rename: a SPELLING changing is not a recategorisation anybody performed, and
  carrying only `help_type` would have manufactured 961 of them on staging in the
  one chart that reports them. Matched the way every vocabulary word in this app
  is matched (trimmed, lower-cased, one trailing "s" tolerated), because the
  column holds a team's own word.
- **Requirements went as a word AND as code.** The kept-but-never-shown
  machinery — `TICKET_TYPE_KEPT_FOR_MIGRATION` and its four readers, the list
  clause, the write refusal, the `query_records` exclusion — was eighty lines
  protecting ZERO rows, counted read-only across every ready team before a line
  was changed. `shared/types.ts` carries the full account where the code used to
  be.
- **Feedback comes back, with a condition.** It was retired by `0034`; `0093`
  re-plants or reactivates it. `createTicket` and `updateTicket` refuse it unless
  a **Validation sprint is running on the ticket's app** — the predicate is
  `sprintIsRunning` (`shared/sprint-state.ts`), which the sprints board reads
  too, so the screen and the door cannot disagree about "running" (an overrun
  still counts; a cancelled block does not). It refuses a MOVE INTO the kind and
  never a row already in it.
- **The group is LOCKED at four.** `createSelectable` refuses a fifth `Ticket
  type` with a `locked_group` 400, and the Choices screen stands its add button
  down for that group (`create: false`). **Renaming is untouched** — a team may
  call an Extra whatever it calls an Extra, and `updateSelectable` carries every
  record with it.
- **Idempotent, genuinely.** Every statement moves zero rows on a second pass,
  including the normalising `UPDATE`, whose guard uses `IS NOT` rather than `<>`
  so a NULL mark really does compare.

