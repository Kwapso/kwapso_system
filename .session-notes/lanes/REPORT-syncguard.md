# REPORT — syncguard (fix/one-file-cannot-kill-a-sync)

Commit: `aae6a92a` on `fix/one-file-cannot-kill-a-sync`, pushed to
`origin/fix/one-file-cannot-kill-a-sync`. Base: `origin/main` at `96a8f829`
(precondition checked before starting — met).

This lane was not a review-score chase; it was a named bug fix with an exact
scope. Reporting against that scope rather than a criteria table.

## The bug, as measured

`workers/content/src/lib/google-read.ts` called `driveFileText()` inside two
loops with no `try`/`catch` around the call:

- `readGoogleMaterial`'s Drive listing loop, ~line 460 (old):
  `text: request.withText ? await driveFileText(env, token, file.id) : ""`
- `hydrateText`'s per-item hydration loop, ~line 648 (old):
  `? await driveFileText(env, token, item.externalId)`

Tracing what can actually throw out of `driveFileText` (in
`workers/content/src/lib/google-api.ts`): the download-refusal case (403 on
the bytes themselves) was already fixed to return `""` on 26 Aug 2026, but
`driveReadable`'s own metadata call (`ask(fileId)`, unguarded), a Google
timeout, a network failure, and any other non-2xx (`google_refused`, 502) all
still throw straight out of `driveFileText`. Any one of those, hit on any
file in a loop of N, aborted the whole loop — every file after it was never
read, and the loop had nothing that named which file caused it.

The precedent this copies is `google-api.ts`'s Drive folder walk (~line
434–461, "ONE FOLDER'S REFUSAL IS SWALLOWED. A DEAD CONNECTION IS NOT."):
catch at the call site, let `google_access_lost` (401 — the connection is
dead) rethrow and abort everything, swallow anything else because it's a
fact about that one item, not the connection.

## The fix

Both call sites in `google-read.ts` now wrap the `driveFileText` (and, for
`hydrateText`, `gmailMessage`) call:

```ts
try {
  text = await driveFileText(env, token, file.id)
} catch (e) {
  if ((e as { code?: string })?.code === "google_access_lost") throw e
  const reason = e instanceof Error ? e.message : String(e)
  console.error(`google drive file "${name}" (${file.id}) skipped: ${reason}`)
  skipped.push({ title: name, reason })
}
```

- `google_access_lost` still throws and aborts the whole read — a dead token
  swallowed once per file would make the sweep come back looking like a
  clean, empty success, which the codebase already treats as the worse
  failure (see the identical reasoning in `google-api.ts`).
- Anything else is skipped: the file/item is kept in the result (in
  `readGoogleMaterial`, with `text: ""`; in `hydrateText`, with whatever text
  it already had), and named — both in a `console.error` line (the existing
  convention for a Google refusal in this codebase, see
  `google-drive-text.test.ts`'s identical assertion on the 401 path) and in a
  new `skipped: GoogleSkip[]` on each function's return value (`GoogleSkip =
  { title, reason }`).

`readGoogleMaterial` gained a fourth field on its return object
(`skipped`); `hydrateText`'s return changed from `GoogleItem[]` to `{ items,
skipped }`. The one caller of `hydrateText`
(`workers/content/src/lib/knowledge-google.ts`) was updated to destructure
the new shape; the one caller of `readGoogleMaterial` there already
destructures only `{ items }`, so it needed no change. No other caller of
either function exists in the repo (checked with `git grep`).

## Files touched, and why

- [workers/content/src/lib/google-read.ts](../Desktop/kwapso_cpaa/workers/content/src/lib/google-read.ts) —
  the fix itself: `GoogleSkip` type, both call sites guarded, both return
  shapes carry `skipped`.
- [workers/content/src/lib/knowledge-google.ts](../Desktop/kwapso_cpaa/workers/content/src/lib/knowledge-google.ts) —
  one-line change to destructure `hydrateText`'s new `{ items, skipped }`
  return instead of a bare array. Behaviour unchanged (a skip was already
  going to be logged inside `hydrateText` itself); this is just keeping the
  caller compiling against the new signature.
- [workers/content/test/google-read-skip.test.ts](../Desktop/kwapso_cpaa/workers/content/test/google-read-skip.test.ts) —
  new test file, four tests (below).

Nothing in `shared/ui/` touched. No deploy. No UI/UX or business-logic change
— this is internal retrieval-lane resilience; the only thing a person
downstream would ever see differently is that a sync finishes instead of
coming back empty, and that Workers Logs now name the file it skipped.

## The tests, and the canary

`workers/content/test/google-read-skip.test.ts`, four tests:

1. `readGoogleMaterial` — three-file slice, the **middle** file's
   `driveFileText` throws a `GuardError(403, "google_forbidden", …)`. Asserts:
   - all three files still appear in `items` (the file BEFORE and the file
     AFTER the refusal both keep their real text — this is the regression:
     before the fix, the file after was never reached at all).
   - the refused file's `text` is `""`.
   - `result.skipped` has exactly one entry, `{ title: "The one Google
     refuses", reason: <the GuardError's message> }`.
   - a `console.error` line names the file by title.
2. `readGoogleMaterial` — the same middle file instead throws
   `GuardError(409, "google_access_lost", …)`. Asserts the whole call
   **rejects** with `{ code: "google_access_lost" }` — a dead connection
   still stops the run.
3. `hydrateText` — same shape as (1), against the hydration loop directly:
   asserts the item after the refusal is still hydrated, the refused item
   keeps its prior text, `skipped` names it, and the log names it.
4. `hydrateText` — same shape as (2): a 401 still rejects the whole call.

**Mutation proof (asked for explicitly in the brief):** `git stash push --
workers/content/src/lib/google-read.ts workers/content/src/lib/knowledge-google.ts`,
re-ran the same test file — tests 1 and 3 (the two "skips the refused middle
file/item" tests) went **red** with the original unguarded throw escaping;
tests 2 and 4 (the 401 tests) stayed green, since that behaviour was already
correct before this fix. `git stash pop` restored the fix; re-ran, all four
green again. This confirms the two new "regression" tests actually exercise
the fix and are not vacuously passing.

Test run in isolation (`npx vitest run --config ../../vitest.workers.config.ts
test/google-read-skip.test.ts`, from `workers/content/`):
```
Test Files  1 passed (1)
     Tests  4 passed (4)
```

## `npm run check`

Read by exit code, unpiped: `npm run check > /tmp/gate-syncguard.log 2>&1;
echo EXIT=$?` → **EXIT=0**.

Per-workspace `Test Files` / `Tests` lines, itemised from that log (10/10
workspaces green):

| Workspace | Test Files | Tests |
|---|---|---|
| kwapso-auth | 21 passed (21) | 224 passed (224) |
| kwapso-tenancy | 75 passed (75) | 982 passed (982) |
| kwapso-content | 91 passed \| 1 skipped (92) | 1175 passed \| 3 skipped (1178) |
| kwapso-data-ops | 40 passed (40) | 422 passed (422) |
| kwapso-mcp | 13 passed (13) | 599 passed (599) |
| kwapso-realtime | 5 passed (5) | 90 passed (90) |
| kwapso-gateway | 11 passed (11) | 100 passed (100) |
| kwapso-portal-gateway | 2 passed (2) | 49 passed (49) |
| kwapso-web | 142 passed (142) | 1202 passed \| 8 skipped (1210) |
| kwapso-portal-web | 12 passed (12) | 96 passed (96) |

`kwapso-content`'s 1175 includes the four new tests from
`google-read-skip.test.ts` (not independently measured against `main`'s own
baseline count in this session — the four tests themselves are verified
directly, above, including the mutation canary). The 1-file/3-test skip in
`kwapso-content` and the
8-test skip in `kwapso-web` match LANE-COMMON's documented "a worktree gate
is 9 tests thinner" note (git-ignored `glide/normalised.json` and
`web/out`), not a regression I introduced — I did not run `npm run build` in
this worktree since the brief named no splash/export concern.

Lint and `tsc --noEmit` across all eleven `-p` targets ran as part of the
same `check` invocation before the test phase and produced no output (a
clean run prints nothing between the `lint`/`test` headers), consistent with
exit 0.

## What I did not change, and why

- Did not touch `driveFileText` itself (`google-api.ts`) — its own
  behaviour (403→"", 401→throw+log) is correct and already locked by
  `google-drive-text.test.ts`; the brief's bug is specifically that its
  callers had no catch, not that the function itself is wrong.
- Did not touch `gmailMessage`'s own internals, only wrapped its call site
  inside `hydrateText`'s existing ternary — the brief named `driveFileText`
  at two line numbers, but the second call site's ternary also covers a
  Gmail read failing mid-slice with the identical "kills everything after
  it" shape, so I guarded the whole expression rather than leaving Gmail
  half-protected in the same loop.
- Did not add a `skipped` surface to any UI/settings screen — nothing in the
  brief or `RULES.md` asked for one, and the existing convention for a
  Google-side failure the person needs to act on is `console.error` +
  Workers Logs (see the 30 Aug 2026 incident write-up in `google-api.ts`
  itself); the `skipped` array on the return value is the additional,
  directly-testable surface the brief's "collect... and surface" line calls
  for, available to any future caller without a schema or table change.

## Grep gotcha check

Ran `file <path>` on both touched source files before grepping them — both
are plain UTF-8, no control-byte trap. Cross-checked findings with `git
grep` in addition to `grep` throughout, per LANE-COMMON's warning.
