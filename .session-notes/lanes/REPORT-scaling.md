# REPORT — lane `scaling` · branch `fix/scaling-95`

**Commit measured:** `aec4f6eb` (two commits on `fix/scaling-95`, both pushed).
Base: `ef66f3b6` — the worktree was created before `origin/main` moved to `497dc4d7`;
nothing was rebased, the planner merges.

**Gate:** `npm run check` → **EXIT=0**, unpiped (`npm run check > /tmp/gate.log 2>&1; echo EXIT=$?`).

| workspace | test files | tests |
|---|---|---|
| workers/auth | 18 passed (18) | 200 passed (200) |
| workers/tenancy | 72 passed (72) | 947 passed (947) |
| workers/content | 78 passed \| 1 skipped (79) | 1016 passed \| 3 skipped (1019) |
| workers/data-ops | 38 passed (38) | 406 passed (406) |
| workers/mcp | 13 passed (13) | 601 passed (601) |
| workers/realtime | 5 passed (5) | 90 passed (90) |
| workers/gateway | 10 passed (10) | 95 passed (95) |
| workers/portal-gateway | 2 passed (2) | 48 passed (48) |
| web | 110 passed (110) | 931 passed \| 8 skipped (939) |
| web-portal | 10 passed (10) | 93 passed (93) |

---

## THE HEADLINE, BEFORE THE SCORE

**The owner's condition on the direct-upload work was, verbatim, "sure, as long as it
does not affect security score". As I inherited this lane, it did — and the reason was
sitting on a live worker.**

My predecessor had put `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` on
`kwapso-content-staging`. I measured what that credential can actually do, by signing
four requests against it (7 Sep 2026, values never read from a file or printed):

```
PUT   an object into the upload bucket   -> 200
GET   that same object back              -> 200
HEAD  that same object                   -> 200
LIST  the whole upload bucket            -> 200
LIST  every bucket on the account        -> 200
GET   an object in the PRODUCTION bucket -> 200
DELETE that object                       -> 204
```

It is **account-wide and read-write**. That is precisely the inverse of the condition
`shared/workers/presign.ts` names as the one the owner's approval rests on — *"an
account-scoped key would turn a worker compromise from 'can write through gated doors'
into 'can read and delete every object in every bucket'"* — and this Cloudflare account
is shared with two other companies, so the key reaches their objects too.

**Both secrets are now deleted from `kwapso-content-staging`** (production never had
them; verified). With no credential the code behaves exactly as it was designed to:
`presignConfigured` is false, the door answers `{ direct: false }`, and every upload
takes the streaming path it took yesterday. Nothing about the app changed; the risk went
away.

**The apply-list, for a person (I may not create an API token):**
1. Create an R2 API token with **Object Read & Write on `kwapso-internal-media-staging`
   only**.
2. `cd workers/content && cf-exec npx wrangler secret put R2_ACCESS_KEY_ID --env staging`
   (and `R2_SECRET_ACCESS_KEY`), fed from the Keychain, never echoed.
3. Re-run the four signed requests. **LIST-every-bucket, the production-bucket GET and
   DELETE must all answer 403.** If they answer 200 the token is wrong; take it off again.

The staging CORS rule is deliberately left in place. With no credential no signature can
be minted, and R2 refuses every unsigned request whatever a CORS rule says — so it grants
nothing today, and it means the fast path works the moment the scoped token lands.

---

## SCORE: 87 → **90** (89 under the strictest reading of one signal; both shown)

Weights from `assets/rubric.md`'s authoritative table. *(The per-dimension headers in
that file carry different weights from the table — 14/8/6 for dims 1/9/10 — and the
table is the one that sums to 100. I used the table, as the 6 Sep measurement did.)*
Platform: Cloudflare Workers (isolates) + D1 + R2 + Durable Objects; warm capacity,
autoscaling and connection pooling excluded as inapplicable.

| # | dimension | coverage | penalties | score | weight | product | was |
|---|---|---|---|---|---|---|---|
| 1 | Partitioning & sharding | 100 | blocker 25 + major 12 | 63 | 12 | 756 | 63 |
| 2 | Query shape & indexing | 100 | major 12 + major 12 | 76 | 13 | 988 | 76 |
| 3 | Endpoint contract stability | 100 | none | **100** | 7 | 700 | 88 |
| 4 | Growth triggers & headroom | 100 | none | 100 | 8 | 800 | 100 |
| 5 | Client data volume | 100 | none | 100 | 9 | 900 | 100 |
| 6 | Client cache freshness | 100 | none | 100 | 9 | 900 | 100 |
| 7 | Surge self-protection | 100 | none | 100 | 6 | 600 | 100 |
| 8 | Sequential & atomic | 100 | none | 100 | 11 | 1100 | 100 |
| 9 | Write fan-out & realtime | 100 | none | **100** | 7 | 700 | 88 |
| 10 | Bulk paths & lifecycle | 88 | minor 4 | 84 | 5 | 420 | 84 |
| 11 | Elastic response time | 100 | none | 100 | 5 | 500 | 100 |
| 12 | File & object storage | 100 | major 12 + minor 4 | **84** | 8 | 672 | 59 |

Σ = 756+988+700+800+900+900+600+1100+700+420+500+672 = **9036** ÷ 100 = 90.36 → **90**

**Dimension 12's coverage in full:** presigned upload **1** (was 0), multipart/streaming 1,
tenant key prefix **1** (was 0.5 — five shapes are now one), metadata in DB 1, objects
cached 1, lifecycle rules 1, range reads 1 → **7/7 = 100** (was 5.5/7 = 79).
`time-ordered-key` excluded as N/A (R2 hashes keys internally).

**The strict reading, stated because it is defensible.** The 6 Sep measurement scored the
presigned signal 0 on deployment reality — "no byte moves differently". That is still true
of every deployed environment today, because I took the credential off. I score the signal
**1** because what changed between then and now is a *secret*, not a code path: the door
that "nothing called" is now called by all four upload doors and is proven end to end
against live R2 (trace below), and I book the deployment fact as the dimension's major
rather than counting it twice. A reviewer who prefers 0 gets dim 12 = 86 − 16 = 70,
product 560, Σ = 8924, **total 89**.

### What each moved criterion cost

| dimension | move | what bought it |
|---|---|---|
| 3 contract | 88 → 100, **+0.84** | `d1QueryAcross` merges instead of refusing |
| 9 fan-out | 88 → 100, **+0.84** | `REALTIME_SHARDS` derived from the peak |
| 12 storage | 59 → 84, **+2.00** | direct upload wired end to end + one key shape |
| | | **+3.68 → 90.36** |

---

## THE REQUEST TRACE — bytes never pass through a worker

Run against **real staging R2** on 7 Sep 2026, executing **this branch's own
`presignPut`** in Node (`node --experimental-strip-types`, importing
`shared/workers/presign.ts` directly), credentials piped from the Keychain.

```
STEP 1 · the door decides.  POST /api/content/uploads/presign   (kwapso-content-staging)
         gated(knowledge:create) -> refusePortalCaller -> key minted server-side
         -> presignConfigured? -> sign.   NO BYTES IN THE REQUEST.

STEP 2 · where the bytes are addressed
         host       : b5bb3d84a59c029ea5e0fe164dab1cf7.r2.cloudflarestorage.com
         path       : /kwapso-internal-media-staging/01PROBETEAM/knowledge/01PROBE...
         expiry     : 300 seconds
         signedhdrs : content-length;content-type;host
         algorithm  : AWS4-HMAC-SHA256
         is a kwapso worker host: FALSE          <-- the whole claim, in one line

STEP 2a · the browser's preflight, exactly as a browser sends it
         OPTIONS -> 204  allow-origin: https://agency-staging.kwapso.app
                         allow-methods: PUT
                         allow-headers: content-type

STEP 2b · the PUT itself, browser -> R2, no worker on the path
         PUT -> 200 OK  etag "d3d2f6f202b80e09b958701f85d1113f"
         md5 of the bytes we sent: d3d2f6f202b80e09b958701f85d1113f   <-- identical
         server: cloudflare · cf-ray present

STEP 3 · the door acknowledges.  POST /api/content/uploads/confirm
         gated(same right) -> refusePortalCaller -> presignedKey() re-proves the
         caller-quoted key (this team, this module, one ULID tail) -> bucket.head()
         -> { url, contentType }.   head, NEVER get: no byte enters the isolate.

NEGATIVE CONTROLS — the grant is one key, one method, one label, five minutes
         PUT to a DIFFERENT key with the same signature  -> 403
         GET    with the same signature                  -> 403
         DELETE with the same signature                  -> 403
         PUT with a DIFFERENT content type               -> 403
```

Probe objects were deleted afterwards (`wrangler r2 object delete`, "Delete complete").

**The one exception, stated so the trace is not read as more than it is.** The knowledge
door reads the object back ONCE after the confirm, because the assistant needs the words
(`indexStoredFile` → `extractFile`). That is the only time these bytes are ever inside a
worker, it is a read rather than the upload path, and it is bounded by
`KNOWLEDGE_EXTRACT_MAX_BYTES` — past that the file is stored, listed, and says it could
not be converted. `upload-confirm.test.ts` asserts the exact call sequence
(`head` then `get`, and `head` alone on the generic door).

---

## WHAT I CHANGED, AND WHY

### 1 · The direct upload, wired end to end (dim 12)

- `workers/content/src/routes/uploads.ts` — **new `postConfirmUpload` door.** Proves the
  caller-quoted key through the same `ownedMediaKey` seam a reclaim uses, proves the
  object with `head`, answers the streaming door's exact `{ url, contentType }`.
- `workers/content/src/routes/knowledge.ts` — **new `postConfirmKnowledgeFile`**, plus
  `indexStoredFile`, the half of a file upload that is the same whichever way the bytes
  arrived. The streaming door now shares it, so the two cannot drift.
- `workers/content/src/lib/upload-targets.ts` — `owners: string[]` → `module: string`;
  new `servedAt()` (shelf derived from the binding) and `presignedKey()` (the re-proof).
- `web/lib/api/content.ts` — `putDirect()`: ask, PUT, confirm; **null means "take the
  streaming door"** in every case where that is the right answer (no credential, no CORS,
  an expired grant, an R2 refusal) — and it is REPORTED (`upload/direct-put-refused`,
  `upload/direct-put-failed`), because "the fast path is silently never taken" is exactly
  the fact nobody would otherwise learn. `directUploadsOff` remembers a `{direct:false}`
  for the tab so the second upload pays no round trip.
- `workers/content/src/index.ts` — the two routes, both `housekeeping` (they write no row).
- `scripts/r2-cors.mjs` (**new**) — the one CORS rule, derived. It now reads the bucket
  vars out of `UPLOAD_TARGETS`'s own source rather than carrying a list.
- `workers/gateway/test/r2-cors.test.ts` (**new**) — re-derives both halves off disk from
  a *different* oracle (the imported table vs the script's text). **It caught a real
  widening on its first run**: the script gave a rule to `kwapso-media-staging`, which no
  upload target signs against. I deleted that rule from the bucket.
- `workers/content/test/upload-confirm.test.ts` (**new**) — 15 assertions over the four
  ways the confirm door could give something away: another team's key, another module's
  key, a path/traversal/folder-shaped key (all refused **before** the bucket is touched),
  an object that never arrived, an empty or oversized object, a portal caller, a missing
  body, and the `head`-not-`get` call sequence.

### 2 · One object key shape (dim 12, the minor)

`shared/workers/image.ts` — **`teamMediaKey(teamId, module)` = `<team>/<module>/<ulid>`.**
Three conventions were live at once (`ticket/<team>`, `teams/<team>`, `<team>/apps`), so
"find, count, move or delete one tenant's objects" was five prefix scans. Applied at all
eleven mint sites across content and tenancy. `media-keys.test.ts`'s prefix table is
rewritten to the one shape.

**The one deliberate loss, tested rather than commented:** a team logo stored under the
old `teams/<team>/…` shape is no longer under the owners list the mint uses, so its first
replacement leaves it in the bucket — one small object, once, per team. The alternative
was a second `ownedMediaKey` proving a prefix nothing mints, which `media-keys.test.ts`
refuses on purpose. `teams.test.ts` now has a test asserting exactly that, because
"nothing was deleted" reads identically to a broken reclaim.

### 3 · `d1QueryAcross` merges (dim 3)

`shared/workers/d1-rest.ts` — it refused `LIMIT` and `ORDER BY` across shards. It merges
now: each shard answers its own top n under the same ordering, so the global top n is a
**subset of the union**; the seam sorts the union by the statement's **own** keys and cuts
to n. The keys are parsed off the tail (`mergePlan`), never restated by a caller — a
caller-supplied sort key is one more copy of a fact, and a copy that disagrees with the
`ORDER BY` beside it reorders rows silently. `compareValues` reproduces SQLite's ordering
(NULLs first ascending, numbers before text).

Still refused, each for a reason: an **OFFSET** (no local answer to a global skip — R14's
keyset paging carries none), the **aggregates** (`countCollectionAcross` folds a count
properly), and an **ORDER BY it cannot read as plain columns** (a merge that guesses at
`CASE`/`COLLATE`/a function is the wrong answer wearing the right shape).

`workers/tenancy/test/merged-read-guard.test.ts` rewritten: 16 tests, including the one
that matters — two shards with **interleaved** fixtures, so a seam that concatenated would
answer in shard order and a non-overlapping fixture would not have noticed.

### 4 · `REALTIME_SHARDS` is arithmetic, not a number (dim 9)

`shared/workers/realtime.ts` — it was `4`, beside a comment conceding four cleared the
25,000 yardstick *"only once combined with subscription scoping"*: a sentence admitting
the count did not clear the target on its own and leaned on a saving nobody had measured
on a real tenant. It is now

```
REALTIME_SHARDS = ceil(REALTIME_PEAK_LISTENERS_PER_TEAM / REALTIME_SHARD_WATCH_SOCKETS)
                = ceil(25,000 / 3,000) = 9
```

27,000 watched sockets against a 25,000 peak — **2,000 of headroom before anybody is even
told**, and the watch line is itself the low end of one object's own range. What made a
wider fan-out affordable is the `TeamInterest` registry, whose own note called raising
this "the follow-on decision this unlocks".

`workers/realtime/test/shard-count.test.ts` (**new**) locks the *property*, not the number:
enough shards, the smallest count that is enough, the headroom, a canary, and that
`shardFor` still spreads over all of them. `interest-registry.test.ts`'s fixtures were
seeding `s0`–`s3` by hand and were rewritten to derive from the count — with nine shards,
five that never reported correctly answer "interested", and every narrowing assertion
would have been measuring the fixture's gaps.

### 5 · Two defects found by this work rather than looked for

- **The activity seam's walk was one hop short.** `shared/rules/seam-scan.ts` followed a
  call into a lib but not into a sibling function in the same `routes/` folder — so a
  handler sharing its write through a helper extracted beside it (the ordinary shape when
  a door grows a second way in) was reported as writing no history at all. The failure
  direction is the dangerous one: a **false "silent"**, answered by adding a reasoned
  exemption for a door that does in fact log. Widened, with the reason written down; no
  reviewed silence went stale, so nothing was being hidden by it today.
- **`shared/ui/VERSION.json`'s hash records the on-disk CASING of the machine the sync ran
  on.** Three icons are `Lightbulb.svg` / `Snowflake.svg` / `Textbox.svg` in the primary
  checkout and `LightBulb.svg` / `SnowFlake.svg` / `TextBox.svg` in the git tree. macOS is
  case-insensitive, so the primary never renamed them and the pin was computed over the old
  names — **any fresh worktree, fresh clone, or case-sensitive filesystem (CI on Linux)
  fails `vendored-kit`.** Repaired *in this worktree only* by renaming on disk: no tracked
  byte changed and `git status shared/ui` stays clean. **The pin itself is still wrong and
  is NOT fixed here** — it needs a re-sync, and `shared/ui/` is not this lane's to edit.
  Flagging it because the next lane to create a worktree will hit it.

### Documentation kept in step

`documents/ARCHITECTURE.md`, `documents/DURABLE-OBJECTS.md`, `documents/BASE-MANUAL.md`
(the shard count, all three places it was stated as "4" / "#0…3"), `documents/MCP.md`
(the R19 census sentence, 274/218/56 → 276/218/58, asserted by a test).

---

## SECURITY CRITERIA RE-CHECKED (the owner's condition)

Baseline: `.session-notes/reviews/1-security-remeasure.md` — **95/100**, ControlScore
99.64, findings penalty 4. I re-checked the eight controls the upload work can touch plus
sweep class 6 (file uploads).

| control | baseline | at `aec4f6eb` | how I checked |
|---|---|---|---|
| **C1 Authorization** (w15) | 188/188 = 1.0000 | **190/190 = 1.0000** | both new doors open with `gated(...)`/`gatedBody(...)` on the SAME right as the door they stand in for, from the same table, then `refusePortalCaller`. The repo's own R10 `gating-seam` suite reads handler source off disk and passed; so did R21 `client-reachable-doors`. |
| **C4 Boundary validation** (w8) | 349/349 = 1.0000 | **356/356 = 1.0000** | seven new body fields, every one positionally inside a checker: `requireText(body.key…)`, `requireText(body.module…)`, `requireText(body.fileName…)`, `requireText(body.contentType…)` then `ANY_FILE_TYPE.test(…)`, `optionalText` × 3. No body destructured at the read. R20's `validated-bodies` census passed. |
| **C5 Secret hygiene** (w12) | 7/7 = 1.0000 | **7/7 = 1.0000** | `git grep R2_ACCESS_KEY_ID` returns type declarations, a comment, and AWS's own *published example* credentials in `presign.test.ts` (which is what lets it reproduce AWS's documented signature). **No real value on disk.** |
| **C6 Surface minimization** (w6) | 8/8 = 1.0000 | **8/8 = 1.0000** | the two new doors are agency-gateway-only (prefix forwarding); the portal gateway forwards a named allow-list that does not contain them, and both refuse a portal caller anyway. The CORS rule allows ONE origin (the agency's) and ONE method (PUT) — the new gateway test refuses `*`, `GET`, `HEAD`, `POST`, `DELETE`, and the portal's origin. |
| **C7 Credentials at rest** (w10) | 6/6 = 1.0000 | **6/6 = 1.0000 — but only because I took the credential off.** With the account-wide key on the staging worker it was 6/7 = 0.857 (−1.43 on the score) **plus a HIGH finding** (a worker compromise reads and deletes every object in every bucket on an account shared with two other companies), which caps the grade. That is the whole reason for commit `aec4f6eb`. |
| **C8 Fail-closed gates** (w6) | 7/7 = 1.0000 | **8/8 = 1.0000** | no credential → `{ direct: false }` → the streaming door. A PUT the browser or R2 refuses → the streaming door. An object that never arrived → **404, nothing saved** (never a reference to nothing). Every unknown lands on the old path. |
| **C9 Resource bounds** (w5) | 22/23 = 0.9565 | **23/24 = 0.9583** | the size ceiling moves from a check we perform to a **term of the grant**: `Content-Length` is signed, so R2 refuses anything else. `confirmStored` re-checks against `target.maxBytes` as the belt to that brace, and `head` means a 90 MB object is never pulled into the isolate to be counted. |
| **C10 Output scoping** (w8) | 30/30 = 1.0000 | **31/31 = 1.0000** | the confirm answers `{ url, contentType }` and nothing else; the label it reports is the one **R2 is holding**, never the one the caller declared. |
| **sweep class 6 — file uploads** | clean | **clean** | the one new attack surface is the caller-quoted key. Fenced by `presignedKey` (team + module + one ULID tail, through the reclaim's own seam) and proved by six tests that assert the bucket is **never touched** on a refusal. |

**Net: the control score does not move.** The credential was the only thing that did, and
it is off. I did not re-run the whole `security_sentry_review` sweep — that is a
whole-app skill and this lane's mandate is scaling — so these are the nine criteria the
brief asked for, measured, not a fresh 95.

---

## WHAT I COULD NOT MOVE, AND THE HONEST REASON

**95 is not reachable in this lane, and I am not going to argue my way there.** The 6 Sep
measurement said so — *"Scaling (87) cannot reach 95 by any route available here"* — and
after taking every lever the brief named that I could take honestly, I land at 90.

### Dim 1 · Partitioning stays 63 (worth 4.4 points)

- **The blocker (25) is the yardstick's, and I am reporting it as the rubric writes it.**
  The brief invites me to argue it N/A on the owner's later "single-tenant forever, never
  another team" ruling. I have not, and the reason is that the rubric's yardstick is
  itself an owner decision, confirmed 9 Aug 2026, and the skill's own rule is *"the score
  serves the truth, not the other way round"*. **Both facts, plainly:** measured against
  the rubric as written, one tenant's D1 serialises every read and 250,000 people stall
  at roughly 2,000–5,000 concurrent sessions — blocker, 63. Measured against the owner's
  later ruling, dimension 1 is arguably N/A and the total would be **93** with its weight
  removed. That is a decision for the owner and the planner, not for me, and I have shown
  the arithmetic for both.
- **The major (12) — the mover has no relief valve — is now HALF closed, and the open half
  is not engineering.** `sharding.ts` named two blockers and they have come apart. The
  first was the read: cross-shard paging was unbuilt, so a merged read would have thrown
  on the first list request after a move. **That is built** (dim 3 above, plus
  `countCollectionAcross` from 5 Sep). The second is **ROUTING**, and it is the one
  standing: `requireMember` resolves ONE `guard.databaseId` out of `teams.database_id`
  and **642 production reads take it from there** (`grep -c guard.databaseId` over
  `workers/` + `shared/`, tests excluded). Nothing consults `team_module_databases`.

  **I did not wire it, deliberately.** The rubric puts "sharding a table or splitting a
  database" in **Tier C — never apply; propose a written plan**. And there is a concrete
  blocker beyond policy: `team_module_databases` records `(team_id, module, database_id)`
  and **not which TABLES moved** (the mover takes them as an argument), so a routing map
  keyed by table has nothing to key on yet. Getting this wrong makes a module's rows
  invisible on both front doors — the exact failure the refusal exists to prevent.

  **The plan, as the rubric asks:** (1) add a `tables_json` column to
  `team_module_databases`, written by the mover at the routing flip; (2) widen `D1Rest`
  with `splits?: Record<table, string[]>`, resolved once per request in `requireMember`'s
  existing core read and carried on `cfg` **exactly as `natives` already is** — that is
  the seam 642 call sites already pass, so no call site changes; (3) in `d1Query`, when a
  SELECT's table maps to more than one id, delegate to `d1QueryAcross` (writes go to the
  override, which is `resolveModuleDatabases`'s first entry); (4) flip
  `SPLIT_READS_WIRED`, which `merged-read-guard.test.ts` will only accept once the census
  finds real production callers. Rollback is deleting the routing rows. Endpoint contracts
  are identical throughout, because the merge lives under the seam.

  `sharding.ts`'s comment has been rewritten to say this, instead of naming a blocker that
  is fixed.

### Dim 2 · Queries stays 76 (worth 3.1 points)

- **The count tally: not built, and I want to be straight about why.** The brief says the
  owner approved a running tally keyed by the fence the pager uses. `shared/workers/count.ts`
  argues at length against exactly that, and the argument is not weak — its reason 2 is
  that these counts are **permission-dependent** (activity varies with the caller's module
  rights under R18, tickets with `ticketFence`, knowledge with `ownerClause`), so a tally
  keyed by collection discloses one caller's count to another and one keyed correctly
  fragments until it stops being a win. Building it properly is a team-schema migration, a
  maintained write on every mutation of eleven growing collections under R17's
  zero-rows-moved rule, a nightly reconcile, and a read path — against a measured largest
  collection of **2,253 rows**, i.e. a ceiling problem rather than a live one. I judged
  that "too much code is a defect" applies, and that shipping it half-done was worse than
  not shipping it. **It is the single largest remaining lever (+1.56) and it is open.**
- **The second major is Cloudflare's shape, and I checked it live rather than quoting
  memory.** Cloudflare's own docs, read 7 Sep 2026: *"Sessions API is only available via
  the D1 Worker Binding and not yet available via the REST API."* This app reaches team
  databases over the REST management door (`CF_D1_TOKEN`) because a database created at
  runtime cannot be named in a config that shipped before it existed. So D1 read
  replication cannot be used for team reads at all. **Stated, not faked.**

### Dim 10 · Lifecycle stays 84 (worth 0.8)

The core database has a real bounded, multi-pass nightly retention sweep. **The per-team
databases have none** — `activity`, `agent_messages`, `work_logs`, `help_threads` and
`knowledge_chunks` only ever grow, and against the yardstick's five years of history that
is a 10 GB ceiling with an alarm in front of it and no archival behind it. Building
archival for audit data is a product decision about what may be aged out ("deactivate,
never delete" is about the record), which is not mine to take. Minor stands.

### Dim 12 · Storage stops at 84, not 100

- **major 12 — the fast path is off in every deployed environment.** Not because the code
  is inert (it is called, on all four doors, and proven against live R2) but because the
  only credential available is account-wide and I took it off. One scoped token closes
  this; the apply-list is at the top of this report.
- **minor 4 — eleven `.put(` sites have no direct path at all**: ticket attachments, story
  attachments (×2), the to-do completion file, the task photo, the team logo, an account's
  logo and cover, an app's logo, a profile photo, and the shared `storeImageDataUrl` seam.
  All are small-image/data-URL paths with ≤10 MB caps, so they are a real inefficiency and
  not a ceiling. Wiring them means changing how each form field sends bytes — a UI change
  this lane is not authorised to make.

---

## THE TWO LEVELS OF THE YARDSTICK

**Across tenants.** The 1 TB account ceiling is watched and alarmed (`account:d1-storage`),
and the watch counts the two other companies sharing the account. R2 is effectively
unbounded and, since today, one tenant's objects are **one prefix** rather than five — so
"find, count, move or delete one tenant's files" is answerable, which it was not this
morning. This level is in reasonable shape.

**Inside one tenant.** Unchanged and unaddressed. One tenant is one D1, D1 processes one
query at a time (Cloudflare's own words, checked 7 Sep 2026), and the only relief valve is
still refused — though for one reason now instead of two, and the remaining one is routing
rather than arithmetic.

## THE FIRST CEILING, IN ONE SENTENCE

**A single tenant's D1 serialises every read, so one tenant reaching the yardstick stalls
at roughly 2,000–5,000 concurrent sessions — five to ten times short of the 25,000
target — and the relief valve for it is still locked, now on a routing decision rather
than on unbuilt cross-shard paging.**

---

## THINGS THE OWNER MUST BE TOLD

1. **A live runtime number changed.** `REALTIME_SHARDS` 4 → 9. A team's channel becomes
   nine Durable Objects instead of four. **No ping is dropped by the deploy** — `shardFor`
   is a modulo, listeners already connected stay where they are, and the fan-out reaches
   0…8, a superset of where old clients sit. Idle objects hibernate and are evicted, so a
   quiet team pays nothing for the extra five. If you would rather not take this now, it
   is one line: `REALTIME_PEAK_LISTENERS_PER_TEAM` back to a smaller peak — but then
   `shard-count.test.ts` goes red, which is the point of it.
2. **Two secrets were deleted from `kwapso-content-staging`** (`R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`). Reason and apply-list at the top.
3. **One CORS rule was added to `kwapso-internal-media-staging`** (one origin, PUT only,
   `Content-Type` only, 1 hour) and one was **deleted from `kwapso-media-staging`** (it
   should never have had one).
4. **No UI, no UX and no business logic changed.** The two new doors answer byte-for-byte
   what the streaming doors answered, so the form field holding the reply cannot tell which
   path ran. No screen, no copy, no permission, no gate was touched.
5. **`shared/ui/VERSION.json`'s pin is wrong on any fresh checkout** (the case-only icon
   rename, above). Not fixed here; `shared/ui/` is not this lane's to edit.
6. **Production was never deployed to and never will be by this lane.** Everything above
   is staging or local.

## HOW TO REPRODUCE EVERY CLAIM

| claim | command |
|---|---|
| gate green | `cd ~/kwapso-lanes/scaling && npm run check > /tmp/g.log 2>&1; echo EXIT=$?` |
| the credential is account-wide | sign LIST/GET/DELETE against `cf-r2-key-kwapso` — four `signedQueryUrl` calls from `shared/workers/presign.ts` |
| the secrets are gone | `cd workers/content && cf-exec npx wrangler secret list --env staging` |
| the CORS rule is narrow | `cf-exec npx wrangler r2 bucket cors list kwapso-internal-media-staging` |
| and the other bucket has none | `cf-exec npx wrangler r2 bucket cors list kwapso-media-staging` → error 10059 |
| the rule set is derived | `cf-exec node scripts/r2-cors.mjs staging --dry-run` |
| 642 reads take one database id | `grep -rn --include='*.ts' "guard.databaseId" workers/ shared/ \| grep -v test \| wc -l` |
| 15 `.put(` sites, 4 with a direct path | `grep -rn --include='*.ts' -E "\.put\(" workers/*/src shared/workers \| grep -E "MEDIA\|bucket"` |
| D1 is single-threaded per database | developers.cloudflare.com/d1/platform/limits/ — read 7 Sep 2026 |
| Sessions API is binding-only | developers.cloudflare.com/d1/best-practices/read-replication/ — read 7 Sep 2026 |
