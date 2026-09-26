### apps + processes + process_versions + process_steps + process_comments. KEEP (BUILT 2026-08-11, team migration `0013_process_maps_and_money`). THE PROCESS MAP

**App → Process → Step**, and the versions cut over them (SCOPE ch.02). An **App**
is the built system, the thing with its own address and its own stage; a client
wanting dispatch fixed, served by a driver app and a back-office screen, is TWO
rows. A **Process** is a way of working inside one. A **Step** is one part of it,
and it carries the two numbers every savings figure in the app is computed from:
how long it takes each time, and how often it happens.

**Version 1 is the pre-kwapso baseline**, how the work was done before we touched
anything, and it is written WITH the process, because a process with no baseline
can never produce a saving and would report zero for ever while looking healthy.
Later versions are cut **by hand, from the button, and only there** (owner,
24 Aug 2026; migration `0051_a_version_is_cut_by_hand`). An earlier design had a
completing sprint cut one automatically (`cut_from_sprint_id`), and nothing was
ever wired to do it — the parameter, the column and its index existed and only
tests used them, so the decision was purged rather than switched off. The R17
shape survives the purge: a version cut is a transition that is an INSERT, the
predicate cannot ride a WHERE, so the unique index on `(process_id, version_no)`
is what refuses the second of two quick presses, and the door answers the loser
`alreadyCut: true` rather than an error.

**`process_steps.step_key` is the identity that makes a saving a SUBTRACTION**
rather than a name match: the row id belongs to one version, the key is the same
step across all of them, and a cut copies it forward. A step that STOPS happening
is carried forward with its frequency intact and its time at zero (`removed_at`),
deleting the row would drop it out of the baseline join and report no saving at
all for the work we removed entirely, which is the largest saving there is.

**Only the NEWEST version's steps can be written.** A baseline that can be edited
after the fact is a saving anybody can dial up, and every figure this app shows a
client is a subtraction from one. The predicate rides both writes' `UPDATE`
rather than sitting in front of them, so a version cut mid-request cannot leave a
check true and the write wrong. `removeStep` did not carry it until 2026-08-17,
the write that sets a duration to ZERO, and so the one that would have
manufactured the largest saving the app can report. Nothing but the absence of a
screen had been keeping callers off it; the process detail's version selector is
exactly the screen that would have arrived. A button is not a permission.

Every table carries `account_id`, denormalised on purpose: the fence is then the
same one clause the accounts list uses, with no join for the next reader to
forget. An app's account is written once at creation and there is no move-app
door, moving one would silently republish a whole map, its savings and its
conversation into somebody else's portal.

**`apps.logo_url` (team migration `0037_app_logo`)** is the client's own mark, and
it is the one column here whose absence was VISIBLE. The apps screen is a wall of
tiles precisely because an app is the record a person recognises by sight, and
every tile drew the same stage glyph, because there was nowhere to put a logo.
Twenty-six of the twenty-eight apps that came across from Glide carry one
(`glide/RECONCILIATION.md`), so the rows were waiting for the column rather than
the other way round; `scripts/glide-visuals.mjs` is what carried them.

It holds a `/media/<teamId>/apps/<ulid>` path and never the picture: the door
takes a data URL, `storeImageDataUrl` (`shared/workers/image.ts`, the same seam
`accounts.logo_url` has used since 0024) puts the bytes in R2, and the row keeps
the path. Storing the data URL instead would be wrong three ways over, and
`workers/tenancy/test/app-logo.test.ts` holds all three: `safeSrc` refuses a
`data:` scheme so nothing would render, a bounded list read whole would carry a
megabyte of base64, and the door's png/jpeg/webp allow-list is what keeps an SVG
— a script running on the app's own origin — out of the bucket. ONE image column,
not two: an account has a logo and a cover because a company record has a
masthead, and an app is only ever a square.

`process_comments` is the conversation on a map: one of the six things a contact
can do (SCOPE ch.06), and a conversation rather than an edit, it changes no
duration and cuts no version. A STAFF comment carrying `explains_step_key` is the
explanation attached to a step that got slower; the client's own screen shows the
regression either way (no filter hides one) and shows our explanation beside it.

### app_staff + app_stakeholders. KEEP (BUILT 2026-08-17, team migration `0030_app_staff_and_stakeholders`). WHO IS ON AN APP

The two answers an app tile could not give: who runs it on OUR side and who owns
it on THEIRS. `app_staff` is our people — `user_id` plus `is_lead`, so "who do I
ask" has one name — and `app_stakeholders` is the client's people, `contact_id`
pointing at the person's own `accounts` row (a stakeholder is a contact you
already have, never a new record) plus `is_main`, the one whose confirmation a
ticket's retired `awaiting_validation` stage used to wait on. Both carry the full audit block
and deactivate rather than delete, so "who USED to run this" stays answerable.

### app_attachments. KEEP (BUILT 2026-09-23, team migration `0118_an_app_gets_a_files_tab`, T3850). WHAT AN APP SHOWS FOR ITSELF

The Files tab. `story_attachments` one table along, and the same shape for the
same reasons — `kind` is `file` or `link`, with a `label`, the `url`, and
`content_type` + `size_bytes` when there are bytes behind it. Deactivated,
never deleted. The one real difference from its story twin: this table's own
READ is fenced rather than refused (`workers/tenancy/src/lib/
app-attachments.ts`'s `appAttachmentFence`, the same two clauses `appsWhere`
gives the apps list — the account fence, and the app restriction beside it) —
a client reads their own apps' files in the portal's Impact accordion. Every
WRITE still refuses a portal caller outright: an app is the agency's own
record of what we built, not a client's to author.

### app_modules. KEEP (BUILT 2026-08-20, team migration `0048_app_modules`). THE SECTIONS OF A BUILT SYSTEM

What a ticket says it is ABOUT: an app's own divisions (Settings, Documents,
Tasks), so tickets group by the part of the software they concern. `app_id` names
the system, `account_id` is copied on for the fence, and the row carries `name`,
a `mark` (the glyph shown beside it), `name_de`, a `description` and a `benefit`.
It is deliberately NOT a process: a process is a way of WORKING and belongs to
the account's world; a module is a division of the software we built. A ticket's
`module_id` must belong to the app its `app_id` names, and the door checks it.

### process_step_tools + the six step columns. KEEP (BUILT 2026-08-24, team migrations `0053_a_step_names_its_role_and_its_tools` + `0054_the_audit_module_finished`). WHAT A STEP IS MADE OF

The audit round's answer to "a step is a name and two numbers, and a saving
needs more than that". `0053` gives a step its ROLE — `client_role_id`, who at
the client does this work — and a join table, `process_step_tools`, for the
tools it touches, keyed `(version_id, step_key)` so the pair survives a version
cut, with `account_id` carried so the fence applies to this row and not only to
the step it hangs off. `0054` then adds five more columns to `process_steps`:
`client_tool_id` (the ONE tool on the step, backfilled from the join table's
oldest row), `frequency_period` (day / week / month / year — how often, in the
period somebody actually says it in, which is what lets a savings sum normalise
honestly), `role_cents_per_hour` (what an hour of that role cost WHEN THIS WAS
RECORDED — frozen, because a rate corrected in 2027 must not move a figure a
client agreed in 2026), and `branch_label` + `loops_back_to` (forks, the words
on them, and the way back). The same migration puts `audit_date` on `processes`,
the day a map's savings are measured FROM.

### process_step_revisions. KEEP (BUILT 2026-08-24, team migration `0054_the_audit_module_finished`). THE MAP, ON ANY DAY

The step across TIME: keyed by `step_key` (the identity a version cut copies
forward, not the per-version row id) plus `effective_on`, the day this
description of the step started being true. One description of one step per day
— saying it twice on one day is a correction, not a second truth. Each row
freezes the step's whole shape (name, position, the two numbers,
`frequency_period`, role, frozen `role_cents_per_hour`, tool, branch, loop) and
a `removed` flag meaning the work stopped happening on that date — never a
delete, because a removed step is the largest saving there is and deleting it
would report none. This is what lets a map be read AS OF a date and cost that
date correctly. Deleted only when a mistaken step is deleted with them (the one
hard-delete door, see `apps + processes` above and CONVENTIONS.md).

### process_links. KEEP (BUILT 2026-08-24, team migration `0054_the_audit_module_finished`). ONE MAP, CONNECTED TO ANOTHER

The last step of one map is very often the first step of another, and this row
says so: `from_process_id` → `to_process_id`, unique per pair, with a `note` in
the team's own words ("hands over to"). LOOSE by ruling — connecting two maps
alters no duration and no saving on either side, so the door does not gate it
like an edit to the numbers. Creator block only, and DISCONNECTING deletes the
row: the connection is a statement, not a record.

### process_drafts. KEEP (BUILT 2026-08-24, team migration `0054_the_audit_module_finished`). WHAT THE EXTRACTION PROPOSES, BEFORE ANYBODY AGREES

A call we held (`source_meeting_id`) or text somebody pasted (`source_text`),
read by a model into a proposed map or a proposed revision of one
(`process_id` null = a new map). The proposal itself is a JSON `payload`,
deliberately NOT normalised into the real tables: a draft that lived in
`process_steps` would be indistinguishable from the record the moment anybody
read it wrong, and "the draft is not the record" is the sentence this table
exists to keep true. `status` walks proposed → applied / discarded, and applying
one is a PERSON reviewing and confirming — always, no exception, which is also
why the draft doors are deliberately off the machine surface (MCP.md's
`TOOLLESS_DOORS` carries the reasoning).

### account_rates. REMOVED (BUILT 2026-08-11, migration `0013`; DROPPED 2026-09-10, migration `0078`). THE LAST OF THE THREE RATE CARDS

**No rate card is left in this product. There were three that morning, and the
separation between them was the security control.**

- `account_rates` — what an ACCOUNT IS CHARGED per hour, by kind of work. One
  live line per (account, kind of work), held by a partial unique index. Four
  rows on staging when it went.
- `internal_rates` — what an hour of our own work cost us.
- `internal_role_rates` — what an hour of a named ROLE was worth, added by
  migration `0031_role_rate_card` (2026-08-17): `role_name` + `cents_per_hour` +
  the audit block, written by the one `set_role_rate` door, where the role name
  was the key so add, re-price and retire were one act.

**All three went on 10 Sep 2026, in two rulings an hour apart.** First the
agency's own two were removed, and the margin computed from them was removed
with them, along with the library they lived in, their doors and their tools.
The ruling: "kill the whole internal rates thing. will develop this in the future
much much more but for now i iwanna wipe it clean" (migration `0077`). Then the client-facing card: **"The whole account rates also killed
it"** (migration `0078`, which drops this table). With it went `lib/rates.ts`,
the four `/api/tenancy/rates*` doors, three agent/MCP tools, `set_record_active`'s
`account_rate` record. The Rates tab on every client's record was removed too.
So was the `prices.rates` projection on the client's own value door, and so was
the "Money given back, every month" panel that multiplied saved hours by the
card's first live line.

**WHAT DID NOT GO, and this is the paragraph to read first.** The money on the
SPRINT is untouched — `sprints.sold_price_cents`, what a block of work was
actually sold for, which is where the real revenue has always lived. So is the
CLIENT'S OWN side: `client_roles.cents_per_hour` and `client_tool_prices`, what
their people and software cost THEM, which is what every saving is multiplied by.
Retiring the rate card removed what we CHARGE per hour as a stored card; it
removed nothing about what has been sold or what a process is worth.

The doctrine is worth keeping on the page now that the tables are gone, because
it is the reasoning the next money feature will have to answer to. All three
cards were the same shape, a label and a rate, which was exactly the danger: one
table with a `kind` column would have put the numbers a single forgotten
predicate apart, and the wrong one of them was the one figure SCOPE said a client
must never see under any flag, ever. A door that read the charged card was
unable to return an internal rate, because the internal rate was not in the table
it named. The same split ran through the code — one library for the charged card
against a second that held the internal money and nothing else — and that is what
**Law R24** checked: no door the client portal opened could reach the internal
file. **R24's inbound half was retired with the internal tables on 10 Sep 2026.**
Its whole doctrine was "structural, not conditional", and after that removal no
money figure in the base was structurally fenced: every one that reaches a client
reaches them because a CONDITION let it — the per-account price-visibility
switch, the main-stakeholder fence on a step's role rate, or a scope test on an
app's running cost. Retiring the account rate card an hour later did not change
that doctrine; it did shrink what the switch governs, which is now exactly one
figure (`prices.soldCents`, what a client has bought) rather than two. (R24, not
R23. R23 is the knowledge base's citation law. This paragraph used to name the
wrong one, which pointed anybody tracing the guarantee at a law that has nothing
to do with it.)

`internal_rates.is_default` (at most one, by partial unique index) was the rate
the margin applied to logged time whose kind of work was not yet named; it went
with its table. Tool costs are still a COLUMN on the app
(`tool_cost_cents_per_month`) rather than a table: what a system costs us to keep
running is one number about one system. **That column survived the removal and
nothing reads it for money any more.** The margin was its only reader. It is
deliberately left in place, holding whatever has been entered, because the
client's ruling was "for now" and promised the idea will be developed much
further — but until that work is specified it is a stored number with no
consumer, and anybody costing an app should know that.

