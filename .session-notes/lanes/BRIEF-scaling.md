# BRIEF — lane `scaling` · branch `fix/scaling-95` · worktree `~/kwapso-lanes/scaling`

Read `/Users/alaap_kanchwala_apple/kwapso-lanes/LANE-COMMON.md` first and obey it.

## Goal
`scaling_review` from 87 to ≥95, measured fresh with its SKILL.md. Start from
`.session-notes/reviews/2-structure-remeasure.md` § "scaling_review — 87" — the twelve-dimension
table with penalties. You need ≈ +8.3 weighted points; the levers below sum to more than that.

## The levers, largest first
1. **Dim 12 storage = 59, weight 8 (≈ +2.7).** The presigned direct-to-R2 upload is BUILT AND
   INERT: `shared/workers/presign.ts` reproduces AWS SigV4 and is tested; `presignPut` sits in a
   door nothing calls (`workers/content/src/routes/uploads.ts`, `lib/upload-targets.ts`);
   `R2_ACCESS_KEY_ID` appears only in a comment; 15 `.put(` sites still carry bytes through a
   worker. Wire it end to end for the person-facing upload doors: the browser asks the door
   for a presigned PUT (one key, under the team prefix, the record's id in the key, short
   expiry, content-type and size bound), PUTs straight to R2, then confirms; the door writes
   the reference. R40/R41 stay satisfied (the field is in `STORED_FILES` and rendered).
   **The owner's condition, verbatim: "sure, as long as it does not affect security score"**
   — so no wider grant than one key, and `security_sentry_review`'s relevant criteria must
   not move; say which you checked. Staging secrets: `cf-exec npx wrangler secret put
   R2_ACCESS_KEY_ID --env staging` fed from the Keychain
   (`security find-generic-password -s cf-r2-key-kwapso -w |`), never echoed, never in a
   file. Endpoint/secret names: `cf-r2-endpoint-kwapso`, `cf-r2-secret-kwapso`.
   Also: five tenant key-prefix shapes → ONE, derived in one function (+ the minor).
2. **Dim 2 queries = 76, weight 13 (+1.56).** `TOTAL_COUNT_CAP` is 1,000,000 and no
   maintained counter exists, so every paged screen can pay a million-row bounded scan. The
   owner approved a running tally. The 6 Sep reviewer's objection is the design constraint:
   "ten of eleven growing collections are caller-fenced, so a collection-keyed tally answers a
   question nobody asks." So key the tally by the fence the pager actually uses (team +
   status/owner, whatever `pagedJson`'s callers filter on), maintain it in the SAME write
   (R17: the predicate rides the UPDATE; zero rows moved = no tally change), serve R16's exact
   count from it when the fence matches and from the capped COUNT otherwise, and reconcile
   nightly. Name the screens it serves. The second major (D1 read replication is
   Sessions-API-only; production runs no native team bindings) is Cloudflare's shape — state
   it, do not fake it.
3. **Dim 1 partitioning = 63, weight 12 (+1.44 for the major).** `SPLIT_READS_WIRED = false`,
   `queryModule` has zero callers, cross-shard paging unbuilt — a full team database has no
   automated relief. Wire split reads for real (the mover's relief valve), with a test. The
   blocker-25 yardstick (one tenant at 250,000 people) is one the owner has ruled out
   (single-tenant forever, "never another team"); in the re-measure, argue N/A honestly with
   that ruling quoted — do not hide it.
4. **Dim 9 fan-out = 88 (+0.84).** `REALTIME_SHARDS = 4`, ceiling ~12–20k listeners per team.
   Derive shard count from a measured per-shard ceiling and record the headroom.
5. **Dim 3 contract = 88 (+0.84).** `d1QueryAcross` refuses `LIMIT`/`ORDER BY`/`COUNT` across
   databases; every collection does all three. Implement merge-and-cut across shards.
6. **Dim 10 bulk & lifecycle = 84 (+0.8).** The minor the report names.

## Do not
Deploy production. Change UI. Touch `shared/ui/`. Spend neurons. Weaken any gate.

## Report
The twelve-row table recomputed at your tip; for the upload path a request trace showing
bytes never pass through a worker; the tally's schema and which screens read it; the split-read
call sites; the security criteria you re-checked and their numbers.
