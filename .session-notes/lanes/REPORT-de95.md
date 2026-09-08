# REPORT — lane `de95` · branch `fix/dead-end-95-second`

**Tip measured:** `11a3d7f24ff49fdcc76ecf006d952fa7ae822992` (one commit on `origin/main` = `d2e50c8f`)
**Worktree:** `/Users/alaap_kanchwala_apple/kwapso-lanes/de95`
**Gate:** `npm run check` → **EXIT=0**, unpiped. Per-workspace lines in §7, with an honest note
about the load-induced flakes I had to chase before it came back clean.

**`dead_end_review`: 90 → 95.** Σ 9,537 / 100 → 95.37 → **95**. Gate criterion (1) = 100 ≥ 40, no cap.

**One criterion moved DOWN** — ownership, 95 → 90 — because this lane found two API-only gaps
larger than the one it closed. That is the honest arithmetic and it is in the table rather than in
a footnote. The margin above the target is 0.37 of a point, and §5.2 names the one judgement call
that would take it to 94 if a stricter reader made it differently.

---

## 1 · The criteria table at my tip

| # | Criterion | Method | Wt | Before | **After** | w×s | Basis, measured at this tip |
|---|---|---|---|---|---|---|---|
| 1 | endpoints **(gate)** | defect | 16 | 100 | **100** | 1600 | Unchanged by this lane. §2.1 |
| 2 | permissions | coverage | 14 | 75 | **75** | 1050 | Probe section VOID (grid 8×4 vs the code's 22×4); censused the source instead. Deliberately not moved. §2.2 |
| 3 | fields | defect | 12 | 100 | **100** | 1200 | 8 `unfillableUserFacing` candidates, 8 re-opened, 8 false positives, each with its write named. §2.3 |
| 4 | readers | defect | 12 | 63 | **100** | 1200 | The lane's job. All 110 write-only candidates censused by hand; the three real ones fixed. §3 |
| 5 | oneway | defect | 11 | 97 | **100** | 1100 | 5 candidates, 5 immutable by design, and all 5 now say so in the schema. §5.1 |
| 6 | screens | defect | 11 | 97 | **97** | 1067 | `MailReplyDialog`, scored minor(3). The one call that could go the other way. §5.2 |
| 7 | ownership | coverage | 8 | 95 | **90** | 720 | **DOWN.** Its 5-point dock is fixed; two bigger API-only gaps took its place. §4 |
| 8 | flags | coverage | 6 | 100 | **100** | 600 | `flagsSeen: []`. Zero feature flags exist. Vacuous, and said so. |
| 9 | edges | coverage | 6 | 95 | **100** | 600 | The token's three states now have a render test, mutation-proved. §5.3 |
| 10 | declared | coverage | 4 | 85 | **100** | 400 | The 15-point hole was that every register in this repo is about DOORS. `NO_SCREEN_FIELD` closes it. §4 |

```
16×100 + 14×75 + 12×100 + 12×100 + 11×100 + 11×97 + 8×90 + 6×100 + 6×100 + 4×100
= 1600 + 1050 + 1200 + 1200 + 1100 + 1067 + 720 + 600 + 600 + 400
= 9,537 / 100 = 95.37 → 95
```

Before, for comparison — the independent measurement at `d2e50c8f`, reconstructed from the brief's
Σ 9,010 and confirmed by arithmetic (1600+1050+1200+756+1067+1067+760+600+570+340 = 9,010):
`1=100, 2=75, 3=100, 4=63, 5=97, 6=97, 7=95, 8=100, 9=95, 10=85` → **90**.

**Delta +527.** Criterion 4 contributed +444, criterion 10 +60, criteria 5 and 9 +33 and +30, and
criterion 7 gave back −40.

---

## 2 · The criteria I did NOT move, and why

### 2.1 Criterion 1 — endpoints, 100, unchanged

The brief said the independent pass scored this clean and told me not to invent a finding. I
re-checked rather than took it on trust, and I agree.

The probe reports 79 unreachable of 263 declared. Both buckets are candidates, not findings:

- **49 "reachable from server code only"** — internal service-to-service, which is what they are for.
- **30 "no reference anywhere"** — I read all 30. They are: the `/api/*/admin/*` owner-key doors
  (each already a line in `OWNER_KEY_DOORS` naming the script or runbook that runs it, with that
  file re-read by the check); `/internal/send-email`, `/internal/log-error`, `/internal/mcp-session`
  (worker-to-worker); `/mcp` itself (the external surface); the four `sendFile` upload doors and the
  two `record-counts` doors, whose paths are built in the api layer rather than at the call site;
  Google's own redirect chain (`/google/start`, `/callback`, `/pick`, `/drive/thumbnail`); and
  `/accounts`, `/members`, `/teams`, `/media/users/<ulid>` — path fragments, not doors.

The stronger evidence is the repo's own two censuses, which derive from each worker's `ROUTES`
table rather than from a literal grep: `doors-have-controls` and `reads-have-a-way-in` in
`web/test/reachable-screens.test.ts`. Both green, with exactly one reasoned `NO_SCREEN_READ` line
in the whole app. Zero doors where a human was meant to get there and cannot.

### 2.2 Criterion 2 — permissions, 75, deliberately unmoved

**The probe's permission section is VOID at this tip and I did not score from it.** The SKILL's own
step 2 says to check the grid first: it reports `8 modules x 4 rights = 32`, and the code has 22
modules (`TEAM_MODULES`, `shared/team-modules.ts`) × 4 = 88 boxes. Enum discovery has misfired, so
its `dead: 10` and its one `shownButUnenforced` (`teams:read`) are artefacts of a grid missing
fourteen modules.

Censused the source instead. R36 (`offered-rights`, `web/test/rules.test.ts`) does exactly this
check machine-side — offered from `MODULE_OFFERED_RIGHTS`, consulted DERIVED from four independent
places (literal `requireRight`/`gated` pairs, MCP `TOOL_GATES`, `ACTIVITY_GATE_MAP`, import
`TARGETS`), failing both ways. Green.

The one real defect is **not in the app**. `web/components/team/role-detail.tsx:201` passes each
module's true `rights` array; the pinned kit v1.2.63's `PermissionModule` ignores the prop and draws
four boxes per module. The app's two guards keep the extras honest — `held` never lists an unoffered
right, and pressing one changes nothing — which is materially weaker than the rubric's "a user
toggling it believes something changed", but the box is still drawn.

**It needs the kit tag the design lead has not merged, and LANE-COMMON forbids touching
`shared/ui/`.** The brief told me not to chase it, and I did not. I keep the independent
measurement's 75 rather than raising a criterion in my own favour on a judgement call where an
independent reader went lower.

### 2.3 Criterion 3 — fields, 100

Eight `unfillableUserFacing` candidates, all eight re-opened, all eight false positives of the same
construction: the probe matches a literal `INSERT INTO … ;` inside a 700-character window, so a long
column-list INSERT — and every insert built by the `insertRow` helper — reads as "never written".
The writes, named:

| candidate | actually written at |
|---|---|
| `agent_usage.period` | `shared/workers/credits.ts:129` |
| `agent_usage_log.credits` | `shared/workers/credits.ts` (the usage-log insert) |
| `error_logs.place`, `error_logs.stack` | `shared/workers/error-log.ts:133` |
| `account_links.relationship` | `workers/tenancy/src/lib/accounts.ts:1078` (`insertRow`) |
| `google_connections.scopes` | `workers/content/src/lib/google.ts:359` |
| `process_step_revisions.removed` | `workers/tenancy/src/lib/processes.ts:1839` |
| `process_drafts.payload` | `workers/tenancy/src/lib/process-drafts.ts:329` |

Zero real findings.

---

## 3 · Criterion 4 — the lane's job

### 3.1 The probe field the last three rounds leaned on cannot report anything

Verified in `~/.claude/skills/dead_end_review/assets/probe.mjs`, lines 152–162:

```js
const inClient = w.test(clientSrc)
const structural = STRUCTURAL.test(c)
const row = { table: t, column: c, file, userFacing: inClient && !structural }
if (!inIns && !inUpd) unfillable.push(…)
else if (!inSql && !inClient) writeOnly.push({ ...row, verdict: 'written but never read back' })
```

`writeOnly` is appended only when `!inClient`. `userFacing` is `inClient && !structural`. The
intersection is empty **by construction**, so `columns.writeOnlyUserFacing` reads 0 in every
codebase there is. A number that can only ever be zero is worse than no number, because it reads as
an all-clear. The brief was right and I confirmed it in the source.

**A second probe defect, not previously catalogued:** `isClient` is
`/^(web|app|frontend|ui|client|pages|components)\//`, which does not match `web-portal/`. The entire
client portal — one of this product's two front doors — is treated as server code by every
`userFacing` judgement the probe makes.

### 3.2 The hand census

110 write-only candidates at my tip (114 at `d2e50c8f`). Grouped and resolved:

| group | count | verdict |
|---|---|---|
| `editor_id` / `editor_email` on 48 tables | 96 | false positive — the shared audit block, read back as `editedByName` on the record footer |
| other audit blocks (`resolver_*`, `completer_*`, `canceller_*`, `discarder_*`, `invite_logs.*`) | 12 | false positive — same, camelCase reads |
| `help.source_screen` | 1 | false positive — rendered as "Raised from" on the ticket's Overview |
| `photo_url`, `expires_on`, `week_start`, `changes_no_step`, `content_type` (×2), `purpose_id`, `story_id` (×3), `related_table`, `related_row_id` | 12 | false positive — each reaches a `.tsx` under its camelCase name (grep counts recorded) |
| `token_hash` (×2), `lease_key`, `next_no` (×2) | 5 | internal by design, and all five ARE read back — `RETURNING next_no` (`shared/workers/refs.ts:71`), `RETURNING lease_key` (`sync-lease.ts:45`) |
| `files_json`, `plan_json`, `report_json`, `overall_status` (×2) | 5 | false positive — read through the interpolated `COLS` const at `workers/data-ops/src/lib/import-batch.ts:40` and mapped to `status`/`report`, which the import screen draws |
| **`help.screen_recording_link`, `stories.reviewer_id`, `stories.reviewer_name`, `agent_credits.lifetime_granted`** | **4** | **the three real findings — fixed, below** |

**Criterion 4 = 100.** Every remaining candidate either reaches a person by its camelCase name on a
screen, or is read back by the server for a decision it makes.

### 3.3 A number I will NOT claim as evidence

The probe's `writeOnly` count fell 114 → 110 at my tip, and **three of those four left the list
because I wrote their snake_case names in my own explanatory comments.** `clientSrc` is every file
under `web/` including comments, so `// help.screen_recording_link has been settable since…` is, to
the probe, a client reference. This is the catalogued trap "rule tests read your comments", arriving
from the other direction. The honest evidence for the fixes is the rendered JSX and the canaried
check in §4, not that number.

### 3.4 What a person now sees, and where

**(a) `help.screen_recording_link` — HIGH, and a person lost data they supplied.**

Before, at `d2e50c8f`:
`git grep -n screenRecordingLink d2e50c8f -- 'web/**/*.tsx' 'web-portal/**/*.tsx'` returns
**0 lines**. Confirmed by running it. The value was settable on `create_help_ticket` and
`update_help_ticket` (`shared/workers/tool-catalog.ts:746, 782`), validated
(`optionalText(input.screenRecordingLink, "Screen recording link", TEXT_LIMITS.link)`), stored
(`help.ts:1020`, `:1131`), SELECTed in `TICKET_COLS` (`help.ts:212`), mapped (`:124`), typed
(`shared/types.ts:358`), and named on the assistant's confirm panel as "Screen recording"
(`shared/workers/confirm-payload.ts:91`). So a person could hand the assistant a Loom link, read it
back on the yes/no panel, press yes — and never see it again.

Now: a row on the ticket's Overview tab, **directly beneath "Raised from"**, the sibling the same
door writes one line away (`web/components/tickets/help-detail.tsx`). It is a real link —
`safeHref(ticket.screenRecordingLink)`, `target="_blank"`, `rel="noreferrer noopener"`, a
`MonitorPlay` glyph and the label "Open the recording" — the same treatment `task-detail.tsx` and
`staff-panel.tsx` give theirs, which is R40's discriminator (an `href`, never a form value). Blank
when there is no recording, which is this screen's own stated convention, so the record's shape does
not change between tickets.

**Not added to the client portal.** Its ticket screen (`web-portal/components/ticket-screen.tsx`)
has no fact list at all — description, status band, attachments, conversation — and a client's own
recordings arrive through the attachments lane (CHECKLIST 5.10, `add-link-dialog.tsx`). A one-row
fact list there would be new furniture on a screen whose narrowness is deliberate.

**(b) `stories.reviewer_id` / `reviewer_name` — HIGH. I chose RENDER, not REMOVE.**

The brief asked me to pick with evidence. Here is all of it, including the evidence against my
choice.

*For removing:* CHECKLIST 6.10 — the product's one ruling on the word — reads "**DONE**, the team
lead, refused at the door", and the door that implements it (`refuseDoneByAnybodyElse`,
`workers/content/src/lib/stories.ts:562`) resolves the reviewer from `appStaff(...).leadUserId` and
consults **nothing** on the story row. `DATA-MODEL.md` does not mention the column. No import target
writes it. And I measured staging read-only: **0 of 329 stories carry a reviewer** (and 0 of 2,051
tickets carry a screen recording; core `agent_credits` holds 0 rows).

*For rendering:* the rubric I am being measured by lists **removing a capability as Tier 3, never
do, recommend only**, and lists "build the screen that reads what is currently written and never
shown" as the Tier 2 repair for exactly this criterion. A lane that deletes capability while scoring
itself with a rubric that forbids deleting capability is scoring its own work. Removal also costs
two tool schemas, two `buildBody`s, the door's validate/insert/update/activity-diff, two payload
types and a query-grammar filter, plus R19/R22/R27/R43 walks — a large diff to take away a
capability nobody asked to have taken away.

*What I did:* one conditional row on `web/components/work/story-detail.tsx`, present **only when a
story has a reviewer**:

```tsx
...(story.reviewerName ? [{ label: t("Who reviews it"), value: story.reviewerName }] : []),
```

Conditional is the decision, and the reason is 6.10: the Done button stays the app team lead's, so a
name here says who is expected to LOOK, never who may close it. An unconditional row printing "—" on
all 329 stories would announce a concept the screens do not offer, which is a second dead end
pointing the other way. **Nothing was removed.**

*The Tier 3 recommendation I am NOT taking on the owner's behalf:* decide whether a per-story
reviewer is a concept this product wants. If it is, it needs a picker on the story form and a
sentence saying how it relates to the team lead's Done button. If it is not, `reviewerId` comes off
`create_story`/`update_story` and off the door, and `NARROWED_BODY_FIELDS` is the seam for the R22
consequence. Either way it is a product call.

**(c) `agent_credits.lifetime_granted` — MEDIUM.**

`git grep -n lifetime_granted d2e50c8f` returned **four lines and not one of them a read**: the
schema, the DATA-MODEL sentence, and the two halves of one INSERT…ON CONFLICT. The schema comment
said `-- total ever granted (for admin view)` and `DATA-MODEL.md:209` repeated the promise. No admin
view exists.

It is not decoration: a balance is spent down, so the moment a team has used its credits nothing
anywhere records what they were ever given. The reader it always had is the operator running the
top-up. So `grantCredits` now reads the column back and returns `{ balance, lifetimeGranted }`
(`shared/workers/credits.ts`), and `POST /api/data-ops/admin/grant-credits` answers with it
(`workers/data-ops/src/routes/agent.ts:175`). Both promises corrected to describe the column instead
of a screen (`db/core/0010_agent_credits.sql`, `documents/DATA-MODEL.md`).

Locked by `workers/data-ops/test/lifetime-granted.test.ts` — three cases, mutation-proved twice:
narrowing the SELECT back to `balance` fails case 1; dropping `lifetimeGranted` from the handler's
`json({…})` fails case 3.

---

## 4 · The durable half — the field census, and the three gaps it found on its first run

`web/test/reachable-screens.test.ts` gains a fifth invariant, **`written-fields-are-shown`**,
+144 lines including the register and the essay saying what it is for.

**Why it belongs there.** Every reachability census in this repo walks doors. Invariant 3 asks
whether a write door has a button; invariant 4 whether a read door has an asker. A door can pass
both while a FIELD it stores reaches nobody, because the door is pressed all day for its other
fields. All three findings above lived in exactly that gap, green under all four invariants.

**Both ends derived, nothing hand-listed.**
- The fields come from `SHARED_TOOLS` by **running** each POST tool's `buildBody` over a probe input
  built from its own schema — the technique R22 stands on, for the same reason (what a tool forwards
  is a fact about the function, not about the text of it). 152 fields today.
- The screens are every `.tsx` under `web/components`, `web/app`, `web-portal/components`,
  `web-portal/app`. **Deliberately `.tsx` only:** `web/lib/api/content.ts:171` has carried
  `reviewerId?: string` in its payload type the whole time nothing filled it, so counting the api
  layer as a reader is precisely the widening that hid one of the three.
- Two ways a field is reached: its own name, or — for a `<x>Id` — its `<x>Name` sibling, because
  this app stores a reference as an id/name pair and screens show the name.
- A field whose every write tool sits on a door already named in `NO_CONTROL` is **skipped**, not
  counted twice: that door's want of a control is a decision written down one census up. (This is
  what keeps `afterId`/`beforeId` out — `POST /api/content/help/rank` already carries the owner's
  17 Aug 2026 ruling there.)
- The way out is `NO_SCREEN_FIELD`, rot-checked in both directions and requiring a reason over 60
  characters.

**Canaried four ways, each one run and each one red:**

| canary | result |
|---|---|
| revert both screen fixes | `expected [ 'reviewerId', 'screenRecordingLink' ] to deeply equal []` |
| add a `NO_SCREEN_FIELD` line for `description`, which screens plainly show | `NO_SCREEN_FIELD names fields that are shown now … delete these lines: description` |
| blind the tool census (`if (true) continue`) | `the written-field census found almost nothing — it has gone blind: expected 0 to be greater than 100` |
| blind the screen scan | guarded by `toBeGreaterThan(10000)`, the same shape invariants 3 and 4 use |

**It found three more on its first run — all older than this lane, none invented, none quietly
fixed.** They are `NO_SCREEN_FIELD` lines now, labelled as gaps rather than dressed up as decisions:

1. **`commercialsVisible` — the most expensive dead end in the product today.**
   `accounts.commercials_visible` decides whether a client sees what they were charged. That is the
   owner's own ruling, quoted verbatim in the door: *"value for everyone, prices only for the
   accounts he switches on"* (`workers/tenancy/src/routes/processes.ts:778`). `pricesVisibleFor`
   reads it inside the account fence and drops the whole `prices` key from the portal's Impact
   response when it is off. **The column defaults to 0 and no screen on either front door offers the
   switch.** So the answer is no, for every account ever created, unless somebody asks the assistant
   to flip it through `update_account`.
   *Not fixed here on purpose:* the fix is a checkbox plus a decision about WHICH right may tick it —
   `accounts:edit` gates the door today, `commercials:read` is the money gate — and that is a
   permission question, which is the owner's and not a review lane's.
2. **`appRestriction`.** A portal login can be narrowed to named apps inside a client's world;
   `grant_portal_access` forwards it, the door validates every id against that account, and
   `accountScope` reads `app_restriction` back on every portal request. The agency's own grant panel
   calls `tenancy.grantPortalAccess(accountId, personAccountId, notify)` and has no field for it.
   The narrowing exists, is enforced, and can only be set by asking the assistant.
3. **`timezone`.** Stored on an account, shown nowhere, and the account form already says in its own
   comment that it does not carry it. Minor: nothing reads it to decide anything yet.

These three are why criterion 7 went **down**, 95 → 90. Its middle clause is "where a capability is
API-only, that is a **stated decision** rather than an omission" — two of these are now stated, but
stated as omissions, which is honest and is not the same as decided. 40 + 20/30 + 30 = 90.
Criterion 10 went **up**, 85 → 100, for the mirror reason: the 15-point hole was that every register
in this repo is about doors and none about fields, and that is closed.

---

## 5 · The three smaller criteria

### 5.1 Criterion 5 — oneway, 97 → 100

Five candidates, all five re-opened, all five genuinely immutable by design. Two already carried the
reason (`agent_messages.content`'s "if a message ever needs to CHANGE, append a new row";
`knowledge_terms.term`, which is half of the table's primary key). The rubric's minor severity is
"a value genuinely fixed by design, **wanting only a note**" — so I wrote the three notes, in
`workers/tenancy/src/team-schema/migrations.ts`, comments only, **no SQL changed**:

- `google_connections.service` — not a property of a connection, it is which connection this is; it
  rides the live unique index and the consent it was granted under.
- `google_sources.service` — says which Google API `external_id` is an id in; an edit points the same
  id at a different API.
- `client_tool_prices.cents` — the table's whole point is that a price is DATED. A new price is a new
  row with a later `effective_on`; editing this one silently restates every map already drawn.

The tenancy suite builds real team databases from these migrations: 74 files / 968 tests, green.

### 5.2 Criterion 6 — screens, 97, and the one call that could go the other way

22 orphans. 21 are Next app-router entries, false positives by construction. The 22nd is
`MailReplyDialog` — a finished dialog nothing mounts.

I scored it **minor(3)**, not high(15), and here is the reasoning so a reader can disagree with it:
it is a rot-checked `PARKED` line in `web/test/orphan-components.test.ts` that **interlocks** with
`NO_CONTROL`'s reasoned exemption for `POST /google/gmail/trash` — the two name each other and must
be deleted together. It is written down and cross-referenced, not forgotten. Mounting it is Tier 2
(where does the button go, which right gates it) and deleting it is Tier 3.

**If a stricter reader scores it high(15), criterion 6 is 85 and the total is 9,405 → 94.05 → 94.**
That is the whole sensitivity of this measurement, and it is why I am reporting the margin rather
than just the number.

### 5.3 Criterion 9 — edges, 95 → 100

The 5-point dock was that an access token's expired and revoked badges render at
`web/components/team/access-tokens.tsx:174–180` and nothing proved it. Those are the two states a
person meets on their worst day — *why has my script stopped?* — and both are states the code enters
with nobody pressing anything.

`web/test/token-states-render.test.tsx` renders `AccessTokensSection` with three tokens (live,
expired-by-the-calendar, and revoked-AND-long-expired) and asserts exactly one Active, one Expired
and one Revoked badge, plus the matching clause for each ("works until", "expired ", "never used").
One render, one set of assertions — the cache behind that screen is a module singleton and a second
mount puts two copies of every row in the document, which cost me one debugging cycle.

**Mutation-proved:** reordering the branch so `hasExpired` is tested before `revokedAt` makes the
revoked token read "Expired" — `expected [ …(2) ] to have a length of 1 but got 2`. Restored, green.

---

## 6 · Every file touched, and why

| file | why |
|---|---|
| `web/components/tickets/help-detail.tsx` | crit 4 — renders `screenRecordingLink` as a `safeHref` link beside "Raised from" |
| `web/components/work/story-detail.tsx` | crit 4 — renders `reviewerName`, conditionally, per CHECKLIST 6.10 |
| `shared/workers/credits.ts` | crit 4 — `grantCredits` reads `lifetime_granted` back and returns it |
| `workers/data-ops/src/routes/agent.ts` | crit 4 — the grant door answers with `lifetimeGranted` |
| `db/core/0010_agent_credits.sql` | crit 4/10 — **comment only**; the "for admin view" promise replaced by what the column is actually for. No SQL changed; a comment cannot re-run differently, and this file already carried an inline comment inside the same `CREATE TABLE` |
| `documents/DATA-MODEL.md` | crit 4/10 — the same promise, corrected |
| `web/test/reachable-screens.test.ts` | crit 10 — the fifth invariant + `NO_SCREEN_FIELD` |
| `workers/data-ops/test/lifetime-granted.test.ts` | new — locks (c), mutation-proved twice |
| `web/test/token-states-render.test.tsx` | new — crit 9, mutation-proved |
| `workers/tenancy/src/team-schema/migrations.ts` | crit 5 — three immutability notes, **comments only** |
| `shared/i18n-strings.json` | R28 — `node scripts/i18n-extract.mjs`, +3 |
| `shared/rules/registry.ts` | R44 — `TRANSLATION_CEILING` 213 → 216 in all three, with the reason written out |

12 files, +481 / −14.

**Three new English strings**, all inside `t(...)` at their position (R33), none a fragment (R28),
none a glossary synonym (R34): "Screen recording", "Open the recording", "Who reviews it".
**Not translated** — `scripts/i18n-translate.mjs` spends the owner's own key, so the ceiling rises by
exactly three with the reason recorded, the way the 4 and 5 Sep entries do.

`shared/ui/` untouched. No deploy. No neurons spent. The only network calls I made were three
read-only D1 `SELECT COUNT(*)` queries against staging (the 0/329, 0/2051 and 0-rows figures above),
run from the registered project folder so `cf-credentials` resolved the Kwapso account, with the
token piped from the Keychain and never echoed.

### What changed in UI / UX / business logic — the owner must be told

1. **A ticket's Overview has one more row, "Screen recording".** Blank on all 2,051 staging tickets,
   because none has ever carried one. A clickable link when one exists.
2. **A story's Overview gains "Who reviews it" — only on stories that have a reviewer.** Zero of 329
   staging stories do, so no screen in the app looks different today.
3. **`POST /api/data-ops/admin/grant-credits` now answers with `lifetimeGranted` as well as
   `balance`.** An owner-key door: no session reaches it and no screen reads it.

Nothing else. No permission changed, no door gained or lost a capability, nothing was deleted.
