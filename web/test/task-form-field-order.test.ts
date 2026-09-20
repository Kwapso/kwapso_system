// TASK FORM FIELD ORDER — Aurora's 21 Sep 2026 ruling, verbatim: "on task
// add/edit the priority setting put it under title. omve deadline above whos
// doing it."
//
// Two moves, read as one order: Priority moves from near the bottom to right
// under Title, and Deadline moves above Assigned to (who's doing it). The
// rest — Detail, Department, the App/Account picker the department reveals,
// and the file — keep their old relative order, now after the first four.
//
// READ OFF THE SOURCE, never imported and executed: `task-form-dialog.tsx`
// pulls in browser-only kit components a Vitest node environment cannot
// load, the same reason `title-length.test.ts` (one law along) reads its
// own form files this way rather than mounting them.

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = join(__dirname, "..", "..")
const FILE = "web/components/work/task-form-dialog.tsx"
const source = readFileSync(join(ROOT, ...FILE.split("/")), "utf8")

/** Each field's own `htmlFor`/`id`, in the order Aurora's ruling names them.
 * The App/Account pair is one step (the department's own second field, only
 * one of the two ever renders), so it is checked as "not before Department"
 * rather than pinned to an exact index. */
const EXPECTED_ORDER = ["task-title", "task-important", "task-due", "task-assignee", "task-detail", "task-department"]

describe("the task form's field order follows the 21 Sep 2026 ruling", () => {
  it("Title, Priority, Deadline, Assigned to, then the rest — Priority is right under Title", () => {
    const positions = EXPECTED_ORDER.map((id) => {
      const at = source.indexOf(`"${id}"`)
      expect(at, `${id} should appear in ${FILE}`).toBeGreaterThan(-1)
      return at
    })
    for (let i = 1; i < positions.length; i++) {
      expect(
        positions[i],
        `${EXPECTED_ORDER[i]} should come after ${EXPECTED_ORDER[i - 1]} in ${FILE} — the field order is Title, Priority, Deadline, Assigned to, then the rest`
      ).toBeGreaterThan(positions[i - 1])
    }
  })

  it("the App and Account fields (the department's own second field) still sit after Department", () => {
    const departmentAt = source.indexOf('"task-department"')
    const appAt = source.indexOf('"task-app"')
    const accountAt = source.indexOf('"task-account"')
    expect(departmentAt).toBeGreaterThan(-1)
    expect(appAt).toBeGreaterThan(-1)
    expect(accountAt).toBeGreaterThan(-1)
    expect(appAt).toBeGreaterThan(departmentAt)
    expect(accountAt).toBeGreaterThan(departmentAt)
  })

  it("the file field is still last", () => {
    const fileAt = source.indexOf('"task-file"')
    const lastOfTheRest = Math.max(
      source.indexOf('"task-department"'),
      source.indexOf('"task-app"'),
      source.indexOf('"task-account"')
    )
    expect(fileAt).toBeGreaterThan(-1)
    expect(fileAt).toBeGreaterThan(lastOfTheRest)
  })
})
