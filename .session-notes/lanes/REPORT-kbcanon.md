# REPORT — kbcanon

Branch: `feat/one-artefact-answers-for-an-event`
Commit: `facde3b1aef12a92e344c134ac73266962eb3587`
Worktree: `/Users/alaap_kanchwala_apple/Desktop/kwapso_cpaa/.worktrees/kbcanon` (per this lane's own instruction, not `~/kwapso-lanes/`)
Precondition checked: `feat/knowledge-sources-know-their-event` is a local branch pointing at the same commit as `origin/main` (`a4d87f64`) — i.e. already fully merged. Confirmed the underlying capability (0d14c51d, "one event, one record — the cross-door fold") is on `main` and a knowledge source CAN already name its event, via the ID join on `transcript_file_id` and the title-derived `eventNamedBy` for notices. Proceeded.

## What changed, and why it's a generalisation and not a new rule

The brief pointed at 8153a8e5 ("a transcript read too early is no longer the
final word") as the shipped precedent: when a calendar entry carries more
than one candidate transcript document, `fromAttachments` reads every one
and keeps the fullest. That fixed **which one file id a meeting quotes**. It
never touched the **other** file ids — the Drive lane mirrors every shared
file into `knowledge_sources` on its own, independent of the meeting hunt,
so the document that *lost* the hunt goes on existing as its own
unrelated-looking `document` source, live and citable, forever.

The fix is one column and a widened `Set`, reusing the existing fold
mechanism verbatim:

- **`meetings.superseded_transcript_ids`** (migration 0070, `workers/tenancy/src/team-schema/migrations.ts`) — comma-joined Drive file ids a hunt for *this* meeting has read words out of and rejected. Populated at the two places `transcript_file_id` is already written:
  - `google-transcript.ts`'s `fromAttachments` now returns `supersededIds` alongside the winner — every other hit it actually read, that held less text.
  - `meetings.ts`'s `captureTranscript` writes those losers on a first capture; `refreshTranscript` unions in the OLD `transcript_file_id` the moment a fuller document replaces it (self-referencing the row's own pre-update columns in the `UPDATE`'s `SET`, so there's no read-then-write window).
- **`knowledge-google.ts`'s `readFoldTargets`** widens the `transcripts` `Set` it already builds — the ID join `folded()` uses to retire a Drive document that IS a meeting's transcript — to also include every id in `superseded_transcript_ids`, gated by the **same** "the meeting really holds words" clause the winner's own entry uses. `folded()` itself is **unchanged**: no new fold logic, a wider set for the one that already exists.

No new table, no new worker, no new door. 7 files touched, 164 insertions.

## Ranking rule per kind, with reasoning

- **Transcript — the fullest wins.** Already proved by 8153a8e5. Untouched here.
- **Notes about a meeting — same rule, finally applied to the losers too.** In this codebase a "notes" document and a "transcript" are the *same artefact* — Gemini's own Meet notes doc, matched by `TRANSCRIPT_NAME` (`/transcript|transkript|notes by gemini/i`) — arriving through the same hunt. So this was never a second rule to invent; it's the first rule's own runner-up finally being acted on. I deliberately **rejected recency as the predicate**: the whole point of 8153a8e5's "captured means WE HAVE WORDS, not WE ARE DONE" is that a *later* document can be the stub (a false start written after an earlier, fuller draft is exactly the shape a Meet-session restart produces), so length decides and recency is never consulted, in either direction.
- **Notifications about an event — evidence, never canonical.** Already correct, and already tested (`google-ingest.test.ts`, "a second door onto something we already hold is folded": a calendar notice folds when the event is held, stays when it's the sole record; "Notes:" mail is never folded; a substring match ("Re: your invitation:") is left alone). No code change. I re-ran this suite to confirm it's still green and added nothing here — a defensible rule already exists and is already locked.

## Proof — before/after, against real staging data, read-only where possible

Measured with a small script mirroring `scripts/kb-bench.mjs`'s own plumbing
(real `retrieve()` imported from the working tree, real Vectorize/D1 over
REST, a real member's guard — no deploy), asking exactly the brief's
question against team "Kwapso" on staging.

**Before** (staging as it stands on `main` today — 8153a8e5 shipped, but this
*specific historical meeting* has never been re-hunted since, because that
fix only repairs a meeting when its own hunt runs again, and this one sits
outside the 6-hour settle window with nobody having pressed "read
transcript"):

```
[2] score=0.016  kind=meeting  source=01M14HETVFZZHD7Q58J4PZJGZH
    title: ⏩ Week planning
    text:  ⏩ Week planning ⏩ Week planning is a meeting of ours, on 2026-09-07.
           What was said in the meeting: 📝 Notes Sep 7, 2026 ⏩ Week planning
           Invited Ishita Goyal Alaap Kanchwala Aurora Thalassa Chilavert
           George Attachments ⏩ …
```
An attendee list and nothing else (1,179 characters — the abandoned
three-second Meet session's stub, exactly as 8153a8e5 describes). The real
73,138-character document (`01M1XRJPPM9XF4YD25D407D4RV`, "…11:28 CEST…") was
**already fully indexed** (88/88 chunks — confirmed by direct read) and is
cited correctly by the three specific questions the commit names, but never
surfaces for this general one.

I could not trigger a *real* re-hunt (no live Google OAuth token in this
sandbox, and no deploy). So I reproduced the after-state by writing exactly
what a real re-hunt would compute — real ids and real text the base already
independently holds — through the shipped `indexSource`, then reverted it
byte-for-byte and re-measured to prove the revert was exact (see "What I
touched on staging" below).

**After** (same source id, now holding the full content; the abandoned
duplicate deactivated by the widened fold):

```
[2] score=0.016  kind=meeting  source=01M14HETVFZZHD7Q58J4PZJGZH
    title: ⏩ Week planning
    text:  ⏩ Week planning ⏩ Week planning is a meeting of ours, on 2026-09-07.
           What was said in the meeting: 📝 Notes Sep 7, 2026 ⏩ Week planning
           Sprint updates and workflow migrations via technical reviews and
           strategic planning. Flu Clinic Spr…
```

The stub sentence is gone; the passage now carries real conversation. The
duplicate Drive document was confirmed deactivated with its index cleared
(`indexSource` returned `{total:0, indexed:0, done:true}`) — it stays a
listed, openable row (Knowledge screen's default list does not filter
`deactivated_at`), it simply can no longer win a slot.

**After reverting**, I re-ran the identical question a third time: the
output was byte-for-byte identical to the "before" run, and the script's own
verification step (`JSON.stringify` comparison of every touched column)
printed `RESTORED EXACTLY.`

## What I touched on staging, and why it was safe

1. Applied migration 0070 (`ALTER TABLE meetings ADD COLUMN
   superseded_transcript_ids TEXT`) to the team's real D1 database — additive,
   nullable, matches what a real deploy of this branch will do first anyway.
   **Left in place** (schema, not data — nothing to revert).
2. Backed up (to a local JSON file) every column of the three rows I was
   about to touch (the meeting, its knowledge_sources mirror, the abandoned
   Drive document), refusing to run a second time over an un-reverted backup.
3. Wrote the "after" state using real ids/text the base already held
   elsewhere, through the shipped `indexSource` (real embeddings, real
   Vectorize upsert/delete against staging's own index) — not a hand-rolled
   reimplementation.
4. Reverted every column from the backup and re-ran `indexSource` again to
   re-derive the original rows bit-for-bit, then asserted the restore against
   the backup programmatically.

No production system was touched. No deploy happened. No Anthropic key was
spent (the only cost was Workers AI embedding calls — the same class of cost
`kb-bench.mjs` itself treats as an ordinary, always-available measurement
cost, distinct from the `--compose` chat calls it gates behind a flag I never
used).

## Tests added, and mutation-proof

- `workers/content/test/google-ingest.test.ts` — two new cases in "a second
  door onto something we already hold is folded": a runner-up named in
  `superseded_transcript_ids` is folded (unless the meeting's own row is
  empty, same safety clause as the winner). Reverting the `Set` widening in
  `knowledge-google.ts` back to its narrow form turns the new "folded too"
  case red.
- `workers/content/test/transcript-end-to-end.test.ts` — extended the two
  existing "fuller of two documents" cases to assert
  `meetings.superseded_transcript_ids` is populated correctly, both on a
  first multi-attachment capture and on a refresh that dethrones the old
  winner (asserted as a membership check, since the refresh's own re-scan of
  the attachment list legitimately re-lists the same rejected id a second
  time — harmless, since the consuming `Set` in `readFoldTargets` dedupes it).
  Dropping either new `SET` clause in `meetings.ts` turns these red.
- `workers/content/test/meetings.test.ts` — one existing fixture updated
  (`supersededIds: []`) after the new required field on `FoundTranscript`
  surfaced a pre-existing gap: this suite's mock of `findTranscript` was
  typed as `Record<string, unknown>`, so TypeScript never caught it missing
  the field, and the real code threw at runtime until I fixed the fixture.

## `npm run check` — green by exit code, itemised

Read unpiped: the background command's own completion notification reported
exit code 0, and I grepped the full log for "fail"/"error" and found nothing.

| workspace | files | tests |
|---|---|---|
| kwapso-auth | 21 | 224 |
| kwapso-tenancy | 76 | 988 |
| kwapso-content | 91 (1 skipped) | 1,186 (3 skipped) |
| kwapso-data-ops | 40 | 427 |
| kwapso-mcp | 13 | 609 |
| kwapso-realtime | 5 | 90 |
| kwapso-gateway | 11 | 100 |
| kwapso-portal-gateway | 2 | 49 |
| kwapso-web | 145 | 1,210 (8 skipped) |
| kwapso-portal-web | 12 | 96 |
| **total** | **417 (1 skipped file)** | **4,990 (12 skipped)** |

The 12 skips are the usual worktree-vs-primary-checkout gap (web export
tripwires needing `REQUIRE_EXPORT=1`, and build-output-dependent splash
tests) — not something this change introduced.

## What I could not move, and the honest reason

- **This specific historical meeting's own content is still the stub on
  real `main`/staging right now.** My change stops a *future* re-hunt's
  loser from lingering in the index; it does not retroactively fix a meeting
  nobody has re-hunted yet. That's squarely 8153a8e5's own repair path
  ("repaired by pressing the meeting's own transcript button, which now
  re-hunts... No repair script: an unrun script is not a control") — a
  decision that commit's author already made and I did not want to
  relitigate by quietly leaving a hand-patched row in place. I reverted my
  simulation rather than leave it "fixed" outside the real mechanism.
- **A general backfill across all of staging's historical duplicates** (the
  `fold-cross-door-duplicates.mjs` pattern) was out of scope: it would need
  either a live re-hunt per meeting (Google OAuth, which I don't have here)
  or a title-based heuristic for documents the calendar-attachment hunt never
  saw, which I judged indefensible without the same two-independent-
  agreements discipline the existing script uses for its two classes. Said
  here rather than shipped speculatively.

## UI/UX/business logic

None changed. No screen, no wording, no permission. Purely an internal
data-model addition and a widened set inside an existing, previously-shipped
retirement mechanism.
