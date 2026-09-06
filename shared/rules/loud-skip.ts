// A SKIPPED TEST AND A PASSING TEST PRINT THE SAME COLOUR — so a skip says why.
//
// A TEST module, like seam-scan.ts beside it. Nothing in any worker's or front
// door's src/ imports it, and the bundlers build from src/, so it never ships.
//
// WHAT THIS EXISTS FOR, measured rather than imagined. On 6 Sep 2026 the security
// lane reconciled a nine-test gap between two gates on the SAME commit and found
// it was not the commit: `npm run check` in a `git worktree` runs nine fewer
// tests than the primary checkout, because two suites gate on artefacts a
// worktree can never hold. A worktree materialises only TRACKED files, and
// `glide/normalised.json` is git-ignored (it is customer data), so
// workers/content/test/knowledge-backfill.test.ts had never executed in ANY
// lane's gate — three tests, all fortnight, reporting green every time.
//
// Nobody chose that and nobody could have seen it. `describe.skipIf(false)` is
// not a failure, is not "Failed Suites", and is counted as success by every
// reader of a summary line. It is the sharpest form of the failure this codebase
// keeps re-earning: not a check that gives a wrong answer, but a check that
// could not have given an answer, reporting success.
//
// THIS IS THE NON-BREAKING HALF OF THE REPAIR, deliberately. A skip stays a
// skip; it just stops being silent. The other half — making the absence FAIL
// under the ship gate, with the default inverted so a forgotten flag makes a
// laptop noisy rather than the gate blind — is specified separately and lands
// only when no worktree is left to break by it. The ordering is the whole
// reason the two are apart: inverting today would fail `npm run check` in every
// lane's worktree at once, which is the finding, not the fix.
//
// splash.test.ts's own header already said the sentence this file is named for,
// about its own case, in 2026: "A skipped test and a passing test print the same
// colour on the way to a deploy." It closed that for splash by putting a strict
// re-run on the deploy path. What it could not do from inside one file is make
// the CLASS visible, and the class is what cost us the fortnight.

/** What a reader needs to be told when a suite does not run.
 *
 * Every field is mandatory on purpose. A note that says only "skipped" is the
 * silence this file exists to end, one step louder. */
export type SkipNote = {
  /** The suite, in the words its own describe uses. */
  suite: string
  /** The artefact that is absent, and WHY it can be — a path plus the reason it
   * is not simply missing by accident (git-ignored, a build output, an env var
   * nobody set). */
  missing: string
  /** THE ASSURANCE THAT IS NOW ABSENT, in a sentence about the product rather
   * than about the test. This is the field that matters: whoever reads the line
   * has to understand they are looking at the absence of a guarantee, not at a
   * tidy green. */
  proves: string
  /** How to make it run — a command where one exists, an honest "you cannot,
   * here, and why" where one does not. */
  get: string
  /** `true` when skipping is a DESIGNED mode rather than a gap (splash's
   * `REQUIRE_EXPORT`, which the deploy path sets deliberately). Changes the
   * heading only — the note is still printed, because a reader counting tests
   * deserves to know why the count moved either way. */
  byDesign?: boolean
}

/** Say, on stderr, that a suite did not run — and what that costs.
 *
 * `process.stderr.write`, NOT `console.warn`, and that is not a style choice —
 * it is the difference between this file working and not. Vitest intercepts
 * `console.*` and attaches each line to the test that produced it; a file whose
 * tests ALL skip produces no test, so the line has nothing to hang on and the
 * default reporter drops it. The first version of this function used
 * `console.warn` and printed NOTHING in exactly the case it was written for.
 * Measured 6 Sep 2026 with a three-probe test file: `console.warn` swallowed,
 * `process.stderr.write` and `process.stdout.write` both visible. stderr of the
 * two, because this is a warning and because it survives a pipe — reading a gate
 * through a pipe is how three people here have already been fooled.
 *
 * There is a lesson in that one debugging step worth more than the function: the
 * instrument written to end a silence was itself silent, and only running it
 * showed that. A loud skip that nobody verified is a silent skip with a comment.
 *
 * Called at COLLECTION time, from module scope, next to the `skipIf` it
 * explains — so the two cannot drift apart, and so the line appears whether or
 * not the file contributes a single test. */
export function noteSkip(note: SkipNote): void {
  const heading = note.byDesign
    ? `SKIPPED BY DESIGN — ${note.suite}`
    : `NOT RUN — ${note.suite}`
  process.stderr.write(
    [
      "",
      `  ⚠ ${heading}`,
      `    missing : ${note.missing}`,
      `    unproved: ${note.proves}`,
      `    to run  : ${note.get}`,
      "",
      "",
    ].join("\n")
  )
}
