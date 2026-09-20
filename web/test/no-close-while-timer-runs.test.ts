// R99, "no-close-while-timer-runs." Aurora's ruling, verbatim, 21 Sep 2026:
// "cannot mark anything as closed (task, story, ticket, whatever) if there's
// an active time log running." The shared door-side check is
// `refuseWhileTimerRuns` (workers/content/src/lib/work-logs.ts); this file is
// the CENSUS that keeps every door honest about calling it, the same shape
// R17's idempotent-transitions scan takes in web/test/rules.test.ts (a
// source-scan against the real files, never a hand-kept list of doors).
//
// SCOPE, AND WHY IT IS BOUNDED HERE. `work_logs.target_table` can only ever
// be one of `WORK_LOG_TARGETS` (stories, help, tasks, meetings), all four of
// them tables `workers/content` owns. No other worker's records can carry a
// running timer at all, so a close door anywhere else is out of this law's
// reach by construction. `workers/content/src/lib/*.ts` is therefore the
// whole universe this census walks, not a folder somebody chose but the
// folder the fact rules out everywhere else.
//
// THE CENSUS, IN TWO STEPS, NEITHER OF THEM HAND-LISTED:
//   1. a CANDIDATE close door is an exported function whose body (comments
//      stripped, so a sentence describing the rule cannot satisfy the check
//      that enforces it) contains BOTH a JS-level strict-equality/ternary
//      comparison against one of the four words her ruling names, "done",
//      "resolved", "closed", "completed", written as a DOUBLE-quoted string
//      literal, which is how this codebase always spells a JS value (a SQL
//      literal is always single-quoted here, `'done'`, so this alone throws
//      out every read-side filter, every SELECT and every WHERE clause built
//      from a view name, the exact distinction R28's own extractor leans on
//      between a translated sentence and a database word), AND an UPDATE
//      statement that actually SETS a closing-shaped column (`status`,
//      `completed_at`, `archived_at`, `resolved`), which is what tells
//      `updateTask` (tasks.ts) apart from `setTaskDone` beside it: the first
//      refuses to edit an ALREADY-done task and never itself sets one done;
//      the census's own SET-clause requirement is what keeps that refusal
//      from being mistaken for the closing write it is guarding against.
//   2. a candidate PASSES when its own body contains a call to
//      `refuseWhileTimerRuns(`. One that does not is either a real gap, and
//      the build goes red, or it belongs in `CLOSE_DOOR_EXEMPT` below, keyed
//      by the FUNCTION'S OWN NAME beside its file (never a line number,
//      which rots on the next edit above it), with a dated, real reason.
//      Rot-checked both ways: an entry naming a function this walk no
//      longer finds, or one that has since picked up the call itself, fails
//      the build too, so the list can only ever be exactly the true gaps.

import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

const HERE = dirname(fileURLToPath(import.meta.url)) // web/test
const ROOT = join(HERE, "..", "..") // repo root
const LIB_DIR = join(ROOT, "workers", "content", "src", "lib")

const CLOSING_WORD = /"(done|resolved|closed|completed)"/
const CLOSING_COLUMN = /\b(status|completed_at|archived_at|resolved)\s*=/

/** Does this function body carry an UPDATE that actually sets one of the
 * columns this app closes a record through? Windowed off every `UPDATE `
 * this body contains, rather than the whole body, so a closing comparison
 * sitting beside an UNRELATED update (reading `completed_at` in a SELECT two
 * screens away in the same file, say) cannot satisfy it by proximity alone.
 * `updateTask`'s own UPDATE (account_id, title, assignee...) is exactly the
 * shape this is built to see through. */
function hasClosingUpdate(body: string): boolean {
  let idx = -1
  while ((idx = body.indexOf("UPDATE ", idx + 1)) !== -1) {
    const window = body.slice(idx, idx + 700)
    if (/\bSET\b/.test(window) && CLOSING_COLUMN.test(window)) return true
  }
  return false
}

/** Every exported function in a file, as its own slice, the same "run to
 * the next top-level export" window `web/test/rules.test.ts`'s own
 * `readerBodies` and the R17 writer-body check take, generalised here to
 * every export rather than only `count*`/`list*`/`search*`. */
function exportedFunctionBodies(src: string): { name: string; body: string }[] {
  const starts = [...src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)]
  return starts.map((m, i) => {
    const next = i + 1 < starts.length ? starts[i + 1].index : undefined
    return { name: m[1], body: src.slice(m.index, next) }
  })
}

/** A candidate close door: the literal word AND a closing UPDATE, both in
 * the SAME function. Computed once, off disk, and read by both the offender
 * scan below and the exemption rot-check, so the two can never disagree
 * about what counts as a candidate. */
function closeDoorCandidates(): { file: string; fn: string; body: string }[] {
  const out: { file: string; fn: string; body: string }[] = []
  for (const f of sourceFiles(LIB_DIR, { extensions: [".ts"], relativeTo: ROOT })) {
    const stripped = stripComments(f.source)
    for (const { name, body } of exportedFunctionBodies(stripped)) {
      if (!CLOSING_WORD.test(body)) continue
      if (!hasClosingUpdate(body)) continue
      out.push({ file: f.rel, fn: name, body })
    }
  }
  return out
}

/** KNOWN GAPS, each a real reason and a date, never a line number (that
 * rots on the next edit above it), a {file, fn} pair instead, which only
 * rots when the function itself is renamed or removed, and the rot-check
 * below catches that too. */
const CLOSE_DOOR_EXEMPT: { file: string; fn: string; why: string }[] = [
  {
    file: "workers/content/src/lib/help.ts",
    fn: "bulkSetStatusByFilter",
    why:
      "Dated 21 Sep 2026. This door's own `resolved` branch is DEAD CODE from every " +
      "route: `refuseDirectResolve(body.toStatus)` runs at the one route that calls " +
      "it (routes/help.ts, POST /help/bulk-status-by-filter) before this function is " +
      'ever reached. Answering a client is `/help/resolve`\'s job alone (CHECKLIST ' +
      '5.6, `refuseDirectResolve`\'s own header). A set-shaped bulk can never legally ' +
      'carry `toStatus: "resolved"` down to this function, so a timer guard here ' +
      "would guard a branch nothing can reach.",
  },
  {
    file: "workers/content/src/lib/stories.ts",
    fn: "setSprintComplete",
    why:
      "Dated 21 Sep 2026. A SPRINT (phase) is not a thing time can be logged " +
      "against: `WORK_LOG_TARGETS` (work-logs.ts) names stories, help, tasks and " +
      "meetings only, so `work_logs.target_table = 'sprints'` can never match a row " +
      "and `refuseWhileTimerRuns` would be permanent, silent dead code here. Aurora's " +
      'ruling names "task, story, ticket"; a sprint is none of the three, and the ' +
      "stories inside it already carry their own guard (`setStoryStatus`, this same " +
      "file).",
  },
]

describe("R99, no-close-while-timer-runs", () => {
  it("every close door in workers/content/src/lib calls refuseWhileTimerRuns, or is a reasoned, dated exemption", () => {
    const candidates = closeDoorCandidates()
    const offenders = candidates
      .filter((c) => !c.body.includes("refuseWhileTimerRuns("))
      .filter((c) => !CLOSE_DOOR_EXEMPT.some((e) => e.file === c.file && e.fn === c.fn))
      .map((c) => `${c.file}:${c.fn}`)
    expect(
      offenders,
      `close door(s) with no running-timer guard and no exemption (R99): ${offenders.join(", ")}`
    ).toEqual([])
  })

  it("CLOSE_DOOR_EXEMPT only ever holds a REAL, STILL-OPEN gap, never a line number, never a stale entry", () => {
    const candidates = closeDoorCandidates()
    for (const e of CLOSE_DOOR_EXEMPT) {
      const found = candidates.find((c) => c.file === e.file && c.fn === e.fn)
      expect(
        found,
        `${e.file}:${e.fn}, exempted, but this walk no longer finds it as a close-door candidate at all (renamed, removed, or no longer matches; the exemption is stale and should be deleted)`
      ).toBeTruthy()
      expect(
        found?.body.includes("refuseWhileTimerRuns("),
        `${e.file}:${e.fn}, exempted as a pending gap, but it now calls refuseWhileTimerRuns. Delete this exemption.`
      ).toBe(false)
      expect(e.why.length, `${e.file}:${e.fn}, every exemption needs a real reason`).toBeGreaterThan(20)
    }
  })

  // A CONTROL FOR THE CONTROL, proving the census can actually fail, the same
  // reason `a-green-check-may-measure-nothing` names for every law here: a
  // check that has never gone red might be measuring nothing at all.
  it("the census is not vacuous, it finds the doors this law was written for", () => {
    const names = closeDoorCandidates().map((c) => `${c.file}:${c.fn}`)
    expect(names).toContain("workers/content/src/lib/stories.ts:setStoryStatus")
    expect(names).toContain("workers/content/src/lib/help.ts:setStatus")
    expect(names).toContain("workers/content/src/lib/tasks.ts:setTaskDone")
  })
})
