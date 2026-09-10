# REPORT — kbmap · feat/the-map-draws-the-knowledge-base

**Commit** `f7671fe0`, branched from `origin/main` at `a828ab6f`, pushed.
**Worktree** `<project>/.worktrees/kbmap` (left in place). Nothing deployed.

---

## 1 · BLOCKER — STAGING CANNOT RUN EITHER PHASE MIGRATION (already messaged)

Measured read-only against both staging team D1s, schema-conjunction proved first:

| | Kwapso team | Smoke team |
|---|---|---|
| `_migrations` rows matching `007*` | **none** | **none** |
| core `teams.schema_version` | `0069_the_stage_the_client_retired` | same |
| `knowledge_sources.event_id` (0070) | ABSENT | ABSENT |
| `knowledge_sources.event_id_from` (0070) | ABSENT | ABSENT |
| `meetings.superseded_transcript_ids` (0071) | **PRESENT** | ABSENT |

So both migrations are merged in code and applied to **neither** database, and the
Kwapso team has 0071's column **without its ledger row**. I do not know how it got
there and did not guess.

**What happens on the next migrate run** (read off `workers/tenancy`: `migrateTeams`
computes `missing = TEAM_MIGRATIONS − _migrations`, then
`for (const m of missing) await applyMigration(...)`, and `applyMigration` has no catch):
0070 applies and stamps; 0071 then runs
`ALTER TABLE meetings ADD COLUMN superseded_transcript_ids TEXT` → **duplicate column
name** → throws. The per-team catch skips that team with a reason and other teams are
unaffected (good), but `schema_version` is never stamped and **it repeats for ever** —
nothing drops the column or stamps 0071. Manual fix required: either insert the 0071
row into `_migrations`, or drop the column and let it re-apply. **I changed nothing.**
The Smoke team will migrate cleanly.

This is why the event numbers below are *predicted* rather than *measured*, and I have
labelled every figure accordingly.

---

## 2 · WHAT WAS WRONG, WHICH IS NOT QUITE WHAT THE BRIEF SAID

`RECORD_EDGES` had **no edge with `knowledge_sources` at either end**. So the map could
not draw a knowledge source at all — opening it on one answered "nothing is linked to
this" about a row that is by construction a copy of something.

That was invisible because the Connections tab stands on the source's **origin row**,
not on the source. That works for the thirteen origin tables that are real rows here,
and cannot work for the four that name an external system. Those four have no local row
to stand on, so the tab was hidden — correctly, given the edges that existed.

**One correction to the brief, from reading migration 0070 rather than the summary:**
`knowledge_sources.event_id` is *Google's own calendar event id*, not a foreign key to
`meetings.id` (0070's own words: "GOOGLE'S OWN calendar event id and nothing else"). The
local join is `meetings.google_event_id = knowledge_sources.event_id`. That is the one
part of this job that was not a data line.

---

## 3 · EVERY EDGE ADDED, AND THE FENCE RULE GOVERNING IT

All four have `knowledge_sources` as the near end. **The fence rule is unchanged and
applies to every one**: `edgesFor` keeps an edge only when `readable` holds BOTH ends, so
an edge whose far end the caller may not read is **absent** — not greyed, not counted.

| edge | far key | far module | what it means |
|---|---|---|---|
| `event_id` → `meetings` | **`google_event_id`** | `meetings` | "came out of" |
| `account_id` → `accounts` | `id` | `accounts` | "is filed under" |
| `app_id` → `apps` | `id` | `processes` | "is about" |
| `sprint_id` → `sprints` | `id` | `work` | "is about" |

**`ticket_id` is deliberately excluded.** 2,050 of its 2,053 live uses hold the source's
own `origin_row_id` — the source *is* the mirror of that ticket — so the line says "this
is a copy of that", which is a sentence about the mirroring machinery rather than about
the business. Read backwards it is worse: every one of those 2,050 tickets would gain a
permanent extra node on its own map. Pinned by a test so the column being right there
does not invite it back without the argument.

### The shape change, and why the backward reading is the dangerous half

`RecordEdge` gains an optional `toColumn` (absent = `id`). The alternative was a second
column holding the meeting's own id, which 0070 refused in advance for a reason that
still holds — a second spelling of a fact is a second place for it to drift.

Standing on a meeting, the sources that came out of it **do not carry that meeting's
id**; they carry the Google event id it stores. So the far key is resolved by a subquery
inside the same statement (one round trip, one moment), and **the R16 `COUNT` carries the
identical predicate**. A count that dropped it would have answered confidently about
`event_id = <the meeting's row id>`, which is zero. That is asserted as a *difference*
(delete one sibling, the total falls by exactly one) so the meeting's other edges cannot
make it pass by accident.

---

## 4 · ACTIVITY_GATE_MAP — UNCHANGED, AND IT NEVER NEEDED TO CHANGE

**No permission moved. No role gains anything.** Verified: `knowledge_sources`,
`meetings`, `accounts`, `apps` and `sprints` are *all already* keys of
`ACTIVITY_GATE_MAP` (`knowledge`, `meetings`, `accounts`, `processes`, `work`). The trap
in your brief — widening the gate map to make the map draw more — never arose, because
every endpoint these edges touch was already gated. R36's asked-but-unoffered half was
never in play. `shared/rules/registry.ts` is not in the diff.

The tab's fallback is gated on `knowledge`, which is **the same right the map door is
already gated on**, so it widens no surface either.

---

## 5 · THE CLIENT SIDE — I DID NOT DUPLICATE IT, BUT IT HAD TO MOVE

Your point 3 said the gate must widen with the work, "check it, do not assume". It did.

`mapDrawable` is kept and still wins: a mirrored source shows its **origin row's**
neighbourhood, which is richer than its own and is the record somebody came looking for.
What changed is the *else* — it now falls back to `{ table: "knowledge_sources", id: item.id }`
instead of hiding the tab. The permanent-400 branch and its no-retry sentence are
untouched and still correct (the door still 400s for a bad table; that path is now
unreachable from this screen, which is what its own comment already claimed).

**One existing test asserted the opposite** — "a source mirrored from outside this
database (an email) gets no Connections tab at all". It was right for the world
connections_fix_1 shipped into and is wrong now. I **replaced** it rather than deleting
it, and the replacement pins the thing a reader cannot see: *which record the map stands
on*. That is the regression that would otherwise ship silently.

### Render test per state (`web/test/knowledge-connections-tab.test.tsx`, 9 assertions)

| state | asserted |
|---|---|
| mirrored, drawable origin | tab shown; door asked for `("accounts", "ACC-DRAWABLE")` |
| **email (`google_gmail`)** | tab shown; door asked for `("knowledge_sources", "SRC-GMAIL")`; **never** for `google_gmail` |
| typed note, no origin | tab shown; stands on itself |
| nothing attached | the kit's own "Nothing is linked to this yet.", not a failure |
| *(kept)* loading / failed+retry / empty / real neighbourhood / permanent 400 | unchanged |

---

## 6 · WHAT IT IS ACTUALLY WORTH — MEASURED, AND PREDICTED WHERE IT MUST BE

Read-only against the Kwapso staging DB. **Live rows only** (your census counted all
rows including deactivated — 1,335/4,867 on that basis today, consistent with your
1,313/4,838 a day earlier; live is 809/3,981).

**Reach today, needing no migration** — the four external kinds:

| origin_table | live | has account | has app | still bare |
|---|---|---|---|---|
| `google_gmail` | 525 | 245 | 0 | 280 |
| `google_chat` | 149 | 0 | 0 | 149 |
| `google_drive` | 80 | 0 | 0 | 80 |
| `google_calendar` | 55 | 44 | 0 | 11 |
| **total** | **809** | **289** | 0 | **520** |

So **289 of 809** draw a real neighbourhood the moment this merges. The other 520 get an
honest empty register instead of a hidden tab. There are **zero** typed notes on staging,
so the 809 are the whole population my fallback newly serves.

**The event edge, predicted** by running 0070's own `UPDATE` predicates as `SELECT`s
(nothing written):

| route | sources | draws an edge |
|---|---|---|
| `origin` (a calendar entry names its own event) | 55 | **1** |
| `meeting` (a mirrored meeting knows its event) | 40 | **40** |
| `mail` (base64 `eid` in a Google notice) | not computable in SQL | — (the backfill script owns it) |

Sibling fan-out: **67 distinct events, 23 of them with more than one artefact, biggest 3.**

**This is smaller than the framing implied and I am saying so.** In particular, route
`origin` yields 55 event ids of which **only 1 matches a meeting we actually hold** — an
`event_id` that points at no `meetings` row draws nothing, so 54 of those sources gain a
column and no edge. The edge is still worth adding: it costs one line plus one optional
field, and it is the only path that material has. But it is ~41 sources and 23 events
today, not 1,313.

---

## 7 · `npm run check` — EXIT 0, read unpiped

```
npm run check > /tmp/kbmap-gate.log 2>&1; echo EXIT=$?   →   EXIT=0
```

| workspace | Test Files | Tests |
|---|---|---|
| auth | 21 passed (21) | 224 passed (224) |
| tenancy | 77 passed (77) | 991 passed (991) |
| content | 92 passed \| 1 skipped (93) | 1204 passed \| 3 skipped (1207) |
| data-ops | 40 passed (40) | 427 passed (427) |
| mcp | 13 passed (13) | 609 passed (609) |
| realtime | 5 passed (5) | 90 passed (90) |
| gateway | 11 passed (11) | 100 passed (100) |
| portal-gateway | 2 passed (2) | 49 passed (49) |
| web | 145 passed (145) | 1215 passed \| 8 skipped (1223) |
| portal-web | 12 passed (12) | 96 passed (96) |

Vitest names only failures, so I re-ran both changed suites with the JSON reporter and
listed every assertion by name: `record-map.test.ts` **19 passed** (was 10),
`knowledge-connections-tab.test.tsx` **9 passed** (was 7). A suite that fails to load
reports green.

**Mutation-proved** — each reverted, run, seen red, restored:

| mutation | caught by |
|---|---|
| `toColumn` ignored (the old `o.id` join) | siblings · google-id-not-row-id · R16 count · per-module subtraction (5 red) |
| count drops the far-key subquery | "counts the same question it lists" (1 red) |
| far-end fence dropped from `edgesFor` | 5 red, including the pre-existing absent-not-counted test |
| tab fallback removed | email · typed note · empty-but-reached (3 red) |

---

## 8 · UI/UX AND BUSINESS-LOGIC CHANGES (the owner must be told)

- The Connections tab is now offered on **every** knowledge source. Previously it was
  hidden for the four external kinds. For 520 of the 809 it will currently say "Nothing
  is linked to this yet."; that is a deliberate trade — an honest empty answer instead of
  a missing tab — and the alternative is available if you disagree (gate the tab on the
  source having at least one anchor, which is one condition in `mapTarget`).
- A meeting's own map now also lists the knowledge sources that came out of that call.
  That is new content on an existing screen.
- No permission, no gate map, no schema, no door signature changed.

## 9 · WHAT I COULD NOT DO

- **Measure the event edge for real** — `event_id` does not exist on staging (§1). Every
  event figure in §6 is predicted from 0070's own predicates, and labelled as such.
- **A screenshot against real data** — same cause: the column the feature turns on is not
  there, so a live screen would show the account/app half only. I did not fake one.
- I did not fix the migration drift. It is a production-shaped decision (drop a column vs
  hand-stamp a ledger row) and it is yours, not a lane's.

---
---

# ADDENDUM — after the migration ran (commit `aed79bdb`)

The planner stamped the 0071 ledger row and rolled the migrations
(`teamsMigrated: 2, failed: []`). I verified both team DBs independently: 0070 and
0071 now in `_migrations`, `event_id` present, `schema_version` at 0071. **Every
number below is measured, not predicted.** §6 above is superseded.

## A · A DEFECT IN MY FIRST COMMIT, FOUND BY THE REAL DATA

Standing on a call, the event edge gathered **58 live artefacts and 404 retired
ones** — a seven-to-one wall of exactly the duplicates the knowledge base folds
away, drawn as though they were the record. The feature would have made the
problem it was built beside look worse. One meeting showed 9 retired artefacts
against 1 live.

**The map has never filtered a retired row, and that was invisible rather than
correct.** Across every table these edges touch:

| retired rows | tables |
|---|---|
| 0 | apps, accounts, sprints, waves, processes, deliverables, meeting_purposes |
| 5 / 1 / 2 | meetings / portal_users / account_links |
| **886** | **knowledge_sources** |

886 of the 894 retired rows in the whole map sit in one table, so the missing
clause had almost nothing to act on until an edge pointed at the one table that
retires in bulk (726 of the 851 event-carrying sources are retired, every one
stamped by `kwapso`, not a person).

**Fixed uniformly, not as a special case** — "a row the app has retired is not a
neighbour" is general, and applying it everywhere changes at most 8 rows elsewhere,
each correctly. The focus is exempt (opening a retired record is deliberate).
`RETIRABLE` is data, **rot-checked against the schema in both directions** off a
real database built from the migrations, with its own blindness tripwire. The R16
count carries the identical clause, built once in `liveOnly`.

Mutation-proved: dropping `knowledge_sources` from `RETIRABLE`, dropping the clause
from the count alone, and blinding the rot check's PRAGMA each turn the right tests red.

## B · MEASURED NUMBERS (Kwapso team, staging)

| | live rows | all rows |
|---|---|---|
| knowledge sources | 3,981 | 4,867 |
| carrying an `event_id` | **125 (3.1%)** | 851 (17.5%) |

**The planner's 17.5% is arithmetically right and counts retired rows: 726 of the
851 are retired.** The figure a reader experiences is 3.1%.

Of the 125 live, **58 resolve to a meeting we hold** — which is what actually draws
an edge:

| route | live | draws an edge |
|---|---|---|
| `meeting` | 40 | 40 |
| `mail` | 30 | 17 |
| `origin` | 55 | **1** |

Route `origin` is the striking one: a calendar entry names its own event 55 times
and only once does that event match a `meetings` row we hold. **An `event_id` that
resolves to no meeting draws nothing**, so fill rate and reach are different
numbers and only the second one is the feature.

Sibling fan-out over calls we can stand on: **43 calls gather at least one artefact,
7 gather more than one, the biggest gathers 9.**

The four external kinds, live: gmail 525 (17 now reach a call, 245 an account),
chat 149 (0 / 0), drive 80 (0 / 0), calendar 55 (1 / 44). **289 of 809 draw a real
neighbourhood; 520 still show an honest empty register.** Chat and Drive gain
nothing yet — Google states no event on either, which is 0070's own documented gap.

## C · PROVED THROUGH THE SHIPPED CODE PATH, AND ON SCREEN

`neighbourhood()` run in Node against staging (real REST transport, a real member's
guard, nothing deployed):

- busiest call → 10 nodes, 9 links, total 9, all "came out of"
- a Google email → "came out of *Kwapso CPAA - Feedback*", "is filed under *aWs*"
- the same email with `meetings` denied → the call is **absent**, total falls 2 → 1

Screenshot at `~/kwapso-lanes/shots-kbmap/email.png`: a source chipped "From an
email" with a **Connections tab badged 2**, drawing the call and the account, with
the clickable sentences underneath. That source had no tab at all before this branch.

## D · THE HALF THAT NO PERSON CAN REACH — please read before merging

**`knowledge-detail.tsx` is the only screen in the app that draws the relationship
map.** One call site, confirmed by census. A meeting's tabs are *Agenda & notes ·
In the calendar · Overview · Work logs* — **there is no Connections tab on a
meeting.**

So the sibling gathering — the "→ its siblings" half of the brief, the case where
"Strategy Session w kwapso" pulls together 9 artefacts none of which is a row in
this database — **exists in the data and in the door and is reachable by no
person.** Clicking the call from a source's map lands on the meeting screen, which
has no map. It is a dead end in the R40 sense: everything works except the last
step, the only one anybody experiences.

**I did not add that tab.** It is a new UI surface on a screen I was not asked to
touch, and the client rules tabs (they killed Activity tabs app-wide two days ago).
The cost if you want it: a tab entry plus `useCached(recordMapKey("meetings", id))`
plus `<RelationshipMap>` in `meeting-detail.tsx` — existing seams only, no door, no
permission, no new law. Say the word and it is a small commit; I would rather ask
than decide a tab for the client.

What *is* delivered and visible: a source's own neighbourhood, which is the thing
the four external kinds never had.

## E · WHAT STILL STANDS

Smallest shape (one optional `toColumn`, not a join language) · fence proved for
the new edge type specifically, in both directions and mutation-proved ·
`ACTIVITY_GATE_MAP` untouched · nothing deployed · `npm run check` **EXIT=0**
unpiped, content now 1208 passed | 3 skipped.


---
---

# ADDENDUM 2 — the meeting's Connections tab (commit `15ea9b87`)

The owner ruled "yes ofc". §D above is closed: the dead end is gone.
Branched fresh off the merged `origin/main` (`66ddd22e`); `aed79bdb` is in it.

## A · WHAT SHIPPED

A fifth tab on the meeting detail, drawn from existing seams only — no door, no
permission, no new law, `ACTIVITY_GATE_MAP` untouched.

**R2 is satisfied by construction, not by luck.** I read `record-detail-tabs`
before adding anything: the meeting detail already draws the library `TabsView`
and is not in `RECORD_TABS_SINGLE_PANEL`, so a fifth tab neither trips the census
nor quietly satisfies it for the wrong reason. The Activity tab stays retired and
history still reaches through the ink footer's rail.

**The panel is extracted, not copied.** Its four states were written inside
`knowledge-detail.tsx` when that was the only caller, and two of them are bug
fixes with their own suites (a failed read that used to sit as a loading skeleton
for ever; a permanent 400 that used to offer a retry which could only refuse
again). A copy is how a fix comes to live on one screen and not the other — so
`<ConnectionsPanel>` is one component and each screen passes its own words in.
The knowledge suite's 9 assertions still pass unchanged, which is what makes the
extraction safe rather than hopeful.

## B · THE EMPTY CASE — designed, and it changed the component

Measured first: **268 of 460 live meetings** have no account, no app, no purpose
and no artefacts. So the majority reading of this tab is the empty one.

The old branch put the kit's register **underneath** a 26rem empty plate, a
"0 connected" badge and three zoom buttons that moved a single dot — the one
useful sentence below the fold on a laptop. An inert control is worse than an
absent one: it invites a press that does nothing. The map now answers the empty
case **before it draws any chrome**, and both screens benefit (520 of the 809
external-kind sources land there too).

Each screen says its own sentence. A call's names what *would* fill it without
blaming Google for a blank that also covers a meeting with no client and no
purpose: *"Nothing is filed against this call yet. Emails, chat logs and
transcripts join a call when Google says which event they belong to. The client,
the system and the reason we met show here too, once they are set."*

See `shots-kbmap/meeting-empty.png` — sentence and explanation above the fold, no
dead canvas. And `shots-kbmap/meeting-busy.png` — "Strategy Session w kwapso",
badge **9**, nine artefacts radiating, none of them a row in this database.

## C · R16 AND R15

**R16** — the badge is the door's exact `total` through the one `formatCount`
seam, which renders nothing at zero, so a call with no connections shows a plain
word rather than a record advertising it has none. Asserted *against the drawing*,
not merely present: badge says one neighbour → the picture draws one.

**R15 — a real gap I had left open.** `knowledge`'s registry entry dropped the
shape family but not the record-map family. A source now sits on **two** maps —
its own and the meeting's — so a source gaining an event id (the sweep does this
unattended), being retired as a duplicate, or being renamed changes a picture
keyed by a record id the ping has never heard of. Every other collection whose
rows appear on a map already dropped that family; knowledge did not, because
until the map could draw a knowledge source there was nothing of its to be stale.
Fixed.

## D · THE ROUND TRIP — the assertion this lane turns on

Against real staging data, through the shipped code path (branch's map door in
Node, everything else proxied to staging, nothing deployed):

```
STEP 1  open the Google email's Connections tab
        the call, as a real link: /t/<team>/meetings/01M0B03EN4TDW1BXMVATT4FQWN
STEP 2  click it → landed on that path, heading "Kwapso CPAA - Feedback"
STEP 3  Connections tab on the meeting: true, badge "Connections 2"
        artefacts drawn: 2 — including the email we arrived from
```

The busiest call draws **9**. A unit test pins the href on the sentence a reader
clicks, so the gate protects the hop rather than trusting a one-off browser run.

## E · MUTATIONS PROVED

| mutation | caught by |
|---|---|
| remove the tab entry | all 7 meeting tests |
| fall back to the generic empty sentence | the empty-case test |
| badge drawn nodes instead of the door's `total` | both R16 tests |
| drop `meetings` from `RECORD_PATH` | the round-trip href test |

## F · ONE REASONING ERROR, RECORDED

A gate run failed in `ticket-names-its-client.test.tsx` — a suite unrelated to my
change. I removed my new test file, the suite passed, and I concluded my file
caused it. **That was wrong.** I had a Next dev server and a proxy competing for
CPU at the time; with those stopped, the full web suite passes *with* my file
(1224 passed). The vitest config's own header documents exactly this failure mode
under load. The lesson is the one this repo keeps relearning: a control that
changes two things at once proves neither.

Also worth flagging: a background-task notification reported *"completed (exit
code 0)"* for a gate run whose real exit was **1** — the 0 was the trailing
`echo`'s. Read `EXIT=` out of the log, never the notification.

## G · `npm run check` — EXIT 0, unpiped

| workspace | Test Files | Tests |
|---|---|---|
| auth | 21 (21) | 224 |
| tenancy | 77 (77) | 991 |
| content | 93 \| 1 skipped (94) | 1217 \| 3 skipped |
| data-ops | 40 (40) | 427 |
| mcp | 13 (13) | 609 |
| realtime | 5 (5) | 90 |
| gateway | 11 (11) | 100 |
| portal-gateway | 2 (2) | 49 |
| web | 146 (146) | 1224 \| 8 skipped |
| portal-web | 12 (12) | 96 |

Seven new sentences extracted and translated into all three languages;
`TRANSLATION_CEILING` unmoved. `shared/ui/` untouched. Nothing deployed.
