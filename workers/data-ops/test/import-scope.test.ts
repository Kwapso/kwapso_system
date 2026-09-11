// A MODULE'S SETTINGS PAGE IMPORTS ITS OWN GROUPS, AND THE DOOR IS WHAT SAYS SO.
//
// ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
//
// The client retired Settings › Choices on 11 Sep 2026 and said where its two
// doors went: *"each module's settings page gets its own import and export for
// its own groups… nothing sits outside Settings."* So Settings › Tickets has an
// Import CSV button, and the promise that button makes is that it adds TICKET
// TYPES.
//
// THE ONLY PLACE THAT PROMISE CAN BE KEPT IS THE DOOR. A wizard that filtered
// its own upload would be a promise kept by the caller, which is the same thing
// as no promise at all: `POST /api/data-ops/import/batch/confirm` would still
// accept a whole multi-table file from anything that asked, and the narrowing
// would be a sentence in a component rather than a fact about the app. That is
// the same substitution R40 catches one layer down (a file that reaches R2 and
// no person) and the same one R64 catches one layer up.
//
// FOUR THINGS ARE PINNED HERE, and each one is a different way the scope could
// go quietly missing:
//
//   i.   BOTH doors compute it. `confirm` starts a run and `continue` resumes
//        one, and a resume that forgot to pass the scope would finish a narrowed
//        import unnarrowed — the widening nobody would ever see, because it
//        happens on the leg after the one somebody watched.
//   ii.  It is VALIDATED positionally (R20): `Array.isArray` before anything
//        indexes it, `requireText` on every element. A cast is not a check, and
//        `["Ticket type", 7]` reaching the run loop's `.trim()` is a 500 from a
//        string anyone can send.
//   iii. A scoped run REFUSES a target that cannot be narrowed, and refuses it
//        BEFORE the batch is claimed — the claim is one-way, so a refusal after
//        it would leave the batch stuck on `running` for a file the caller can
//        still legitimately run from the Import screen.
//   iv.  The row test reads the TARGET'S OWN declaration (`scopeColumn`) rather
//        than naming `selectable_data` in the engine. The next vocabulary target
//        adds one line and is covered; a literal would have to be found.
//
// SOURCE OFF DISK, which is this worker's own idiom for the import engine
// (`import-waves.test.ts`, `import-resume.test.ts`, `import-idempotency.test.ts`
// all read the same file the same way) and for the same stated reason: there is
// no harness that runs a batch end to end, because every row of one is a door
// hop into another worker.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { stripComments } from "@shared/rules/source-scan"
import { TARGETS } from "../src/lib/targets"

/** COMMENTS OFF, and it is not a nicety — it is a bug this file already had.
 *
 * Both source files argue about `scopeColumn` and `body.groups` at length in
 * prose, right beside the code that does the work. The first draft of the
 * "refused BEFORE the claim" assertion below located the refusal by the first
 * occurrence of `scopeColumn` in the file, and a mutation that moved the whole
 * `if (scope)` block to after the claim went GREEN: the block moved, its
 * explanatory comment stayed where it was, and the check found the word in the
 * comment. A census that reads prose measures prose. */
const ENGINE = stripComments(readFileSync(join(__dirname, "..", "src", "lib", "import-batch.ts"), "utf8"))
const DOORS = stripComments(readFileSync(join(__dirname, "..", "src", "routes", "import.ts"), "utf8"))

/** `confirmBatch`'s own body — anchored on its declaration and on the terminal
 * write that closes a batch, the same two anchors `import-waves.test.ts` uses.
 * Throwing rather than returning "" is deliberate: an empty string would make
 * every assertion below vacuously true. */
function confirmBody(): string {
  const from = ENGINE.indexOf("export async function confirmBatch")
  const to = ENGINE.indexOf("overall_status = 'complete'")
  if (from < 0 || to < 0 || to <= from)
    throw new Error("import-batch.ts no longer has the shape this reads — teach this check the new one")
  return ENGINE.slice(from, to)
}

describe("a scoped import can only write the groups it was started for", () => {
  it("the vocabulary target declares the column a scope is read from", () => {
    expect(
      TARGETS.selectable_data?.scopeColumn,
      "selectable_data no longer declares `scopeColumn`, so a scoped run cannot tell which group a row is in — and `confirmBatch` would refuse every scoped import as unscopable, which is a settings page whose Import button never works"
    ).toBe("type")
    // AND THE ENGINE READS THE DECLARATION, not the table's name. A literal here
    // would be the run loop knowing about one table, and the next vocabulary
    // target would look supported and silently not be.
    expect(
      confirmBody(),
      "the run loop names a table instead of asking the target — `def.scopeColumn` is how a target says it can be narrowed"
    ).toMatch(/def\.scopeColumn/)
  })

  it("both doors compute a scope and hand it to the engine", () => {
    // Written as two separate assertions rather than a count, because the
    // failure they guard is asymmetric: confirm without a scope is a button that
    // never narrows (visible immediately), continue without one is a run that
    // narrows on the first leg and not on the second (visible to nobody).
    for (const handler of ["postBatchConfirm", "postBatchContinue"]) {
      const at = DOORS.indexOf(`export async function ${handler}`)
      expect(at, `${handler} is gone from routes/import.ts`).toBeGreaterThan(-1)
      const body = DOORS.slice(at, DOORS.indexOf("\n}\n", at))
      expect(
        body,
        `${handler} calls confirmBatch without a group scope. A run started from a module's settings page would write every group in the file — and on \`postBatchContinue\` that widening happens on the leg nobody is watching`
      ).toMatch(/confirmBatch\([^)]*importGroupScope\(body\)|importGroupScope\(body\)[\s\S]*confirmBatch\(/)
    }
  })

  it("the scope is validated positionally, not cast (R20)", () => {
    const at = DOORS.indexOf("function importGroupScope")
    expect(at, "importGroupScope is gone — the two doors are validating the scope somewhere else, or not at all").toBeGreaterThan(-1)
    const fn = DOORS.slice(at, DOORS.indexOf("\n}\n", at))
    expect(
      fn,
      "`body.groups` is not put through Array.isArray before anything indexes it. R20 is positional: a truthiness guard is not a type check and a cast is not a check at all"
    ).toMatch(/Array\.isArray\(body\.groups\)/)
    expect(
      fn,
      "the ELEMENTS are not validated. `[\"Ticket type\", 7]` passes Array.isArray and then reaches the run loop's .trim() as a 500 — every element belongs in requireText's first argument"
    ).toMatch(/requireText\(/)
  })

  it("an absent scope is an UNSCOPED run, and an empty one is refused", () => {
    const at = DOORS.indexOf("function importGroupScope")
    const fn = DOORS.slice(at, DOORS.indexOf("\n}\n", at))
    expect(
      fn,
      "a missing `groups` no longer means null. Every caller written before this existed — the generic Import screen, the assistant, MCP — sends no scope, and defaulting them to one would break an import that has always worked"
    ).toMatch(/=== undefined[\s\S]*return null/)
    expect(
      fn,
      "an empty list is not refused. `groups: []` is a run allowed to write nothing, which nobody means on purpose — reading it as either 'no scope' or 'every group' is a guess, and one of the guesses widens"
    ).toMatch(/length === 0/)
  })

  it("a scoped run refuses a target it cannot narrow — before the claim", () => {
    const body = confirmBody()
    const refusal = body.indexOf("scopeColumn")
    const claim = body.indexOf("overall_status = 'planned'")
    expect(refusal, "a scoped run no longer checks whether its targets can be narrowed at all").toBeGreaterThan(-1)
    expect(claim, "the one-way claim has moved — teach this check the new anchor").toBeGreaterThan(-1)
    expect(
      refusal,
      "the unscopable-target refusal happens AFTER the batch is claimed. The claim is one-way (planned → running, never back), so refusing after it strands the batch on `running` for a file that is still perfectly runnable from the Import screen"
    ).toBeLessThan(claim)
  })

  it("a row in another group is SKIPPED WITH A REASON, never dropped and never written", () => {
    const body = confirmBody()
    const at = body.indexOf("scope && def.scopeColumn")
    expect(
      at,
      "the row-level scope test is gone. Refusing the whole file when a target is unscopable is only half of it: a `selectable_data` file can legitimately carry several groups, and the ones this page does not own are the rows that must not be written"
    ).toBeGreaterThan(-1)
    const test = body.slice(at, at + 700)
    expect(
      test,
      "an out-of-scope row is not reported as skipped. A silently dropped row looks exactly like an import that worked, and the rejection list is the thing a person downloads to fix their file"
    ).toMatch(/skipped: true/)
    // …and BEFORE the write. Order is the whole property here.
    expect(
      body.indexOf("scope && def.scopeColumn"),
      "the scope test sits after writeRow — the row is written and then judged"
    ).toBeLessThan(body.indexOf("await writeRow("))
  })
})
