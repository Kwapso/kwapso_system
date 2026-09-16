// A STAFF PICKER NEVER OFFERS NOBODY. The client's ruling, 16 Sep 2026,
// verbatim: "Kill the 'nobody' option for staff. If we leave it empty, it's
// not an option. Remove it from tasks and everywhere else. This 'nobody',
// just kill it." This suite is the proof, in three parts:
//
//   1. `StaffPillPicker` itself renders no "Nobody" pill, in either mode, at
//      any `value` — a RENDER test, because the prop pair that used to draw
//      one (`allowNobody`/`nobodyLabel`) being gone from the TYPE is not
//      proof the component draws nothing extra; only mounting it is.
//   2. A CENSUS, off disk, that no file under web/, web-portal/ or shared/
//      still mentions `allowNobody`/`nobodyLabel` in real code (comments
//      stripped, so this file's own header and staff-pill-picker.tsx's
//      explanatory prose about the removal cannot trip it) — the structural
//      half: a caller cannot quietly reintroduce the prop pair even though
//      the component would now ignore it.
//   3. Each of the four owned form dialogs' CREATE branch seeds its
//      single-select field from the signed-in-user prop — "create forms
//      preselect the caller", read off disk rather than trusted to the
//      comment beside it.
//
// PROVEN NOT VACUOUS the manual way this base's own conventions ask for
// (`staff-pill-row.test.ts`'s own header: "measured, 15 Sep 2026 … backed up
// first with `cp`, restored the same way"): before this file was finished, a
// "Nobody" pill was reinstated in a `cp`-backed-up copy of
// shared/web/staff-pill-picker.tsx and re-wired with `allowNobody` on the
// task-assignee call site, both the render test and the census test were
// confirmed to fail red, and both files were restored from the backup.

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { StaffPillPicker } from "@shared/web/staff-pill-picker"

afterEach(cleanup)

const ROOT = join(import.meta.dirname, "..", "..")
const read = (p: string) => readFileSync(join(ROOT, ...p.split("/")), "utf8")

const PEOPLE = [
  { id: "u1", name: "Alaap Kanchwala" },
  { id: "u2", name: "Bergman" },
]

describe('a staff picker never offers "Nobody" (client ruling, 16 Sep 2026)', () => {
  it("mode=\"single\": draws exactly one pill per person, never an extra clearing pill", () => {
    const { container } = render(
      <StaffPillPicker
        ariaLabel="Assignee"
        people={PEOPLE}
        lang="en"
        value="u1"
        onValueChange={() => {}}
      />
    )
    const pills = container.querySelectorAll("[data-pill]")
    expect(pills.length).toBe(PEOPLE.length)
    for (const pill of pills) {
      expect(pill.textContent?.toLowerCase()).not.toMatch(/nobody/)
    }
  })

  it('mode="single": an empty value (an old NULL row before the caller\'s own fallback runs) still draws no "Nobody" pill', () => {
    // The component itself never fabricates a fallback — that is the call
    // site's job (see part 3 below) — so this proves the OTHER half: even
    // handed the one value this ruling was about, StaffPillPicker draws
    // nothing to let a person click their way back to it.
    const { container } = render(
      <StaffPillPicker ariaLabel="Assignee" people={PEOPLE} lang="en" value="" onValueChange={() => {}} />
    )
    const pills = container.querySelectorAll("[data-pill]")
    expect(pills.length).toBe(PEOPLE.length)
    // No pill is selected — that is fine and expected here, this is the raw
    // component with no caller-side fallback wired — but none of them may be
    // a "Nobody" stand-in either.
    for (const pill of pills) {
      expect(pill.textContent?.toLowerCase()).not.toMatch(/nobody/)
    }
  })

  it('mode="multi" stays untouched: empty is a real, legal state (stakeholders, staffed-on) — not a "Nobody" pill', () => {
    const { container } = render(
      <StaffPillPicker
        mode="multi"
        ariaLabel="Stakeholders"
        people={PEOPLE}
        lang="en"
        value={[]}
        onValueChange={() => {}}
      />
    )
    const pills = container.querySelectorAll("[data-pill]")
    expect(pills.length).toBe(PEOPLE.length)
    for (const pill of pills) {
      expect(pill.getAttribute("aria-pressed")).toBe("false")
      expect(pill.textContent?.toLowerCase()).not.toMatch(/nobody/)
    }
  })

  it("the census: no file under web/, web-portal/ or shared/ mentions allowNobody/nobodyLabel in real code", () => {
    const files = sourceFiles([join(ROOT, "web"), join(ROOT, "web-portal"), join(ROOT, "shared")], {
      extensions: [".ts", ".tsx"],
      relativeTo: ROOT,
      skipTests: true,
    })
    const offenders: string[] = []
    for (const f of files) {
      // shared/rules/registry.ts is the one reasoned exception: R79's own LAW
      // TEXT (a string literal, not a comment `stripComments` would catch)
      // names the retired prop pair IN PROSE, quoting what the ruling killed —
      // the same reason this file's own header, above, is safe despite naming
      // them too. It is DATA about the removal, never a live reference to it.
      if (f.rel === "shared/rules/registry.ts") continue
      const src = stripComments(f.source)
      if (/\ballowNobody\b|\bnobodyLabel\b/.test(src)) offenders.push(f.rel)
    }
    expect(
      offenders,
      "these files still mention allowNobody/nobodyLabel outside a comment — the 16 Sep 2026 " +
        "ruling killed the prop pair entirely:\n  " + offenders.join("\n  ")
    ).toEqual([])
  })

  it("the census is provably not vacuous — a synthetic offender is caught", () => {
    const offending = stripComments('<StaffPillPicker value={v} onValueChange={f} allowNobody nobodyLabel="Nobody yet" />')
    expect(/\ballowNobody\b|\bnobodyLabel\b/.test(offending)).toBe(true)
    const compliant = stripComments("<StaffPillPicker value={v} onValueChange={f} />")
    expect(/\ballowNobody\b|\bnobodyLabel\b/.test(compliant)).toBe(false)
  })

  it("create forms preselect the caller: each owned dialog seeds its create branch from the signed-in-user prop", () => {
    const task = read("web/components/work/task-form-dialog.tsx")
    expect(task).toMatch(/assigneeId:\s*defaultAssigneeId,/)

    const story = read("web/components/work/story-form-dialog.tsx")
    expect(story).toMatch(/assigneeId:\s*defaultAssigneeId\s*\?\?\s*"",/)

    const account = read("web/components/accounts/account-form-dialog.tsx")
    expect(account).toMatch(/accountManagerId:\s*defaultAccountManagerId\s*\?\?\s*""/)

    const app = read("web/components/apps/app-form-dialog.tsx")
    expect(app).toMatch(/staffUserIds:\s*defaultStaffUserId\s*\?\s*\[defaultStaffUserId\]\s*:/)
    expect(app).toMatch(/leadUserId:\s*defaultStaffUserId\s*\?\?\s*"",/)
  })

  it("edit forms fall back to the signed-in user only when the stored value is itself empty", () => {
    const task = read("web/components/work/task-form-dialog.tsx")
    expect(task).toMatch(/assigneeId:\s*initial\.assigneeId\s*\|\|\s*defaultAssigneeId/)

    const story = read("web/components/work/story-form-dialog.tsx")
    expect(story).toMatch(/assigneeId:\s*initial\.assigneeId\s*\|\|\s*\(defaultAssigneeId\s*\?\?\s*""\)/)

    const account = read("web/components/accounts/account-form-dialog.tsx")
    expect(account).toMatch(
      /accountManagerId:\s*initial\.accountManagerId\s*\|\|\s*\(defaultAccountManagerId\s*\?\?\s*""\)/
    )

    // AppFormDialog's Lead field is structurally different (it must also be
    // one of the ticked staff), so its fallback chain is the ticked value,
    // then the signed-in user IF staffed, then the first staffed person —
    // never a bare `initial.leadUserId || default`.
    const app = read("web/components/apps/app-form-dialog.tsx")
    expect(app).toMatch(/staffedInOrder\[0\]\?\.id/)
  })
})
