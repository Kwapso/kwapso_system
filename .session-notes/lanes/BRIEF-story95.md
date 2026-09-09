# BRIEF — lane `story95` · branch `fix/story-95` · worktree `~/kwapso-lanes/story95`

Read `/Users/alaap_kanchwala_apple/kwapso-lanes/LANE-COMMON.md` first and obey it, including the
per-lane scratchpad rule at the end.

## Goal
`story_checks_out_review` from **90 back to ≥95**, measured fresh with
`~/.claude/skills/story_checks_out_review/SKILL.md`.

**This score FELL, 96 → 90, and four of the six new penalties were caused by this round's own
merges.** The code moved and the documents did not follow. Almost every fix below is a sentence.

## The two HIGH findings — 3.5 points between them

1. **The realtime shard count contradicts itself across five documents, and one sentence
   contradicts itself internally (worth ~2.1).** Code: `shared/workers/realtime.ts:104` —
   `REALTIME_SHARDS = ceil(25_000 / 3_000) = 9`.
   - Says **9**: `ARCHITECTURE.md:216, :597`; `DURABLE-OBJECTS.md:61-63, :83`.
   - Says **four**: `ARCHITECTURE.md:217` (`team:<id>#0…3`, in the SAME SENTENCE as a "9 since
     7 Sep 2026" parenthetical); `DURABLE-OBJECTS.md:36` (the DO addressing table — "five per
     team (four `TeamChannel` shards + one `TeamInterest`)"); `DURABLE-OBJECTS.md:41`
     ("~50,000 team-side instances (four channel shards…)" — now 100,000);
     `BASE-MANUAL.md:34`; and **`BASE-MANUAL.md:534-535`, which reads "four shard instances,
     `team:<id>#0…8`" — the word and the range disagree inside one sentence.**
   - Why HIGH: `DURABLE-OBJECTS.md` §1's table is the normative addressing reference. Anyone
     addressing `#0…3` reaches 4 of 9 shards and silently misses 5/9 of listeners.
   - **Prefer naming the constant over hard-coding a new number** — `REALTIME_SHARDS` is derived,
     so a document that says "9" will rot the next time the peak changes.
2. **`ARCHITECTURE.md:696` tells its reader the app does NOT upload directly to R2, on the day
   the browser started doing exactly that (worth ~1.2).** The row reads
   "| Base64 uploads through the worker (**not presigned direct-to-R2**) | … |" in the
   "dimensions still held down" table. Shipped and routed since 7 Sep:
   `POST /api/content/uploads/presign`, `/uploads/confirm`, `knowledge/upload-confirm`, plus
   `upload-stream` doors on knowledge, deliverables, brand-assets and staff.
   **Zero-canary from the measurement:** across 240,001 words of corpus, `upload-stream` = 0,
   `uploads/presign` = 0, `upload-confirm` = 0, and `presign` = 1 — that one hit being the row
   that says the opposite.
   **The house convention is one row below it:** "~~The module mover is one non-resumable
   request~~ **RESUMED 2026-08-17**". Strike this row the same way and name the doors.
   **CAVEAT YOU MUST HANDLE:** the presign credential is on NO deployed environment, so the
   path is built and inert. Say that — "shipped, and off until a scoped credential exists" —
   rather than claiming a live capability. Do not overcorrect into a second false statement.

## The four smaller ones

3. **MEDIUM — the golden path teaches an address the conventions forbid.**
   `UI-CONVENTIONS.md:140` says "`web/components/` has **no top-level files**";
   `BUILD-A-MODULE.md:43` and `:655` tell the reader to create
   `web/components/note-detail.tsx` / `web/components/<module>-detail.tsx`. Fix the golden path
   to name a folder. **Then close it for good:** `web/test/source-scan.test.ts` asserts *>100
   nested* files but never *zero top-level* — add that assertion.
4. **MEDIUM — the public-surface guarantee has a fourth flow nobody described.**
   `OPERATIONS.md:423` says "Public surface (LOCKED): only the two gateways are public". Since
   7 Sep a browser PUTs bytes straight to `<account>.r2.cloudflarestorage.com` on a signed URL.
   The literal sentence is not falsified (only the two gateway *workers* are public), but no
   document names the mechanism that holds the promise — the key-minting fence, whose own
   comment calls it "a security boundary, not a convenience" because "a caller who chose their
   own key could presign a PUT over another team's object". One paragraph in that section.
5. **MEDIUM — `web/components/temp/` does not exist and three places send readers there.**
   `OPERATIONS.md:682`, `UI-GAPS.md:4` (states it as the live convention), `UI-GAPS.md:155`.
6. **MEDIUM — R44 in `RULES.md` says the translation ceiling is 0 in all three languages.**
   `shared/rules/registry.ts:769` is `{de: 213, es: 213, ca: 213}`. The law-book tells a reader
   the app is fully translated; 213 sentences per language ship in English. Correct the sentence;
   **do not run `scripts/i18n-translate.mjs`.**
7. **MINORS, cheap:** `README.md:427-444`'s four test figures are stale again (content is
   80 files/1035 tests, not 70/933; web is 115/958, not —/849) AND its load-bearing claim of
   "eight `it.skipIf(!REQUIRED)` rows in `splash.test.ts`" is now **two**. The measurement's
   advice is right: **delete the concrete counts and keep the exit-0 rule and the skip
   structure** — counts cannot stay true. Also `UI-CONVENTIONS.md:151` says the fold was "148
   flat files" where `CLAUDE.md:316` says 128 flat → 148 total; git says CLAUDE.md is right.
   `NEEDS-A-SPEC.md:99-100` names two deleted files as "Files:";
   `web/components/deep-link/shape.ts` should be `shape.tsx` (`BUILD-A-MODULE.md:649`,
   `UI-RULEBOOK.md:510, :1757`); `COMPOSITION-MISMATCHES.md:259` names a deleted file.

## One more, found by a different measurer — fix it here
**`EMPTY_TOOLBAR_EXEMPT` is NOT empty and never has been** (2 entries at `30102296`, 3 today at
`shared/rules/registry.ts:1335-1342`). Three places claim it is: two prior review reports and
**`CLAUDE.md`'s own R50 entry, which says "empty today"**. Fix CLAUDE.md.

## Do not
Touch `shared/ui/`. Deploy. Spend neurons. Run the translation script. Change code except for the
one `source-scan.test.ts` assertion in item 3. **Do not invent a correction you have not verified
against the source** — this review's whole subject is documents that confidently say false things.

## Report
The eleven-criterion table recomputed at your tip with arithmetic; for every sentence changed,
the file, the line, what it said and what it says now; `npm run check` exit code unpiped.
Write `/Users/alaap_kanchwala_apple/kwapso-lanes/REPORT-story95.md` AND return its full text.
