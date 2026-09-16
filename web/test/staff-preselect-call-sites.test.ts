// EVERY CALL SITE OF A STAFF-PRESELECTING DIALOG ACTUALLY PRESELECTS.
//
// The client's ruling, 16 Sep 2026, verbatim: "By default, every time they
// have to assign it to someone, it needs to preselect the active user. For
// example, on the add story, it should preselect the active user at the
// bottom." The dialogs themselves already carry this — their CREATE branch
// seeds the field from a `default*Id` prop and their EDIT branch falls back
// to it only when the stored value is itself empty
// (`web/test/staff-picker-kills-nobody.test.tsx`'s own "create forms
// preselect the caller" / "edit forms fall back…" tests prove that CONTRACT,
// reading the dialogs' own source). But a contract nobody is required to
// honour is not a preselection — it is a prop a caller can forget, and one
// did: `contact-detail.tsx`'s own `<AccountFormDialog>` (the contact
// screen's edit dialog for the same account record `account-detail.tsx`
// already gets right) opened with no `defaultAccountManagerId` at all, so an
// account with no manager on file opened this dialog with NOBODY selected —
// the exact state the 16 Sep 2026 "kill Nobody" ruling says cannot exist.
//
// So this is the OTHER half of the proof, over every CALL SITE rather than
// over the four dialogs' own bodies: every `<TaskFormDialog`,
// `<StoryFormDialog`, `<AccountFormDialog` and `<AppFormDialog` mount in
// web/ passes the prop its dialog uses to preselect. A census, not a
// render — the four dialogs' own internal fallback is already proven
// elsewhere; what was missing was proof a caller actually hands the value
// in.

import { join } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { sourceFiles } from "../../shared/rules/source-scan"

const ROOT = join(import.meta.dirname, "..", "..")

/** Which dialog needs which prop, to preselect the signed-in user. */
const REQUIRED_PROP: Record<string, string> = {
  TaskFormDialog: "defaultAssigneeId",
  StoryFormDialog: "defaultAssigneeId",
  AccountFormDialog: "defaultAccountManagerId",
  AppFormDialog: "defaultStaffUserId",
}

type Mount = { file: string; line: number; component: string; hasProp: boolean }

function findMounts(source: string, path: string, rel: string): Mount[] {
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const out: Mount[] = []
  const visit = (node: ts.Node) => {
    const opening = ts.isJsxSelfClosingElement(node)
      ? node
      : ts.isJsxElement(node)
        ? node.openingElement
        : undefined
    if (opening && ts.isIdentifier(opening.tagName) && opening.tagName.text in REQUIRED_PROP) {
      const component = opening.tagName.text
      const wantedProp = REQUIRED_PROP[component]
      const hasProp = opening.attributes.properties.some(
        (a) => ts.isJsxAttribute(a) && ts.isIdentifier(a.name) && a.name.text === wantedProp
      )
      const { line } = tree.getLineAndCharacterOfPosition(opening.getStart(tree))
      out.push({ file: rel, line: line + 1, component, hasProp })
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return out
}

function allMounts(): Mount[] {
  const files = sourceFiles([join(ROOT, "web")], { extensions: [".tsx"], relativeTo: ROOT, skipTests: true })
  return files.flatMap((f) => findMounts(f.source, f.path, f.rel))
}

describe("R79/R81 · every staff-preselecting dialog is actually preselected at its call site", () => {
  it("the census found real mounts — a walk that finds nothing is not a census", () => {
    expect(
      allMounts().length,
      "found no <TaskFormDialog>/<StoryFormDialog>/<AccountFormDialog>/<AppFormDialog> mounts — has the walk gone blind?"
    ).toBeGreaterThanOrEqual(10)
  })

  it("every mount passes its dialog's default*Id prop", () => {
    const missing = allMounts().filter((m) => !m.hasProp)
    expect(
      missing.map((m) => `${m.file}:${m.line} <${m.component}> is missing ${REQUIRED_PROP[m.component]}`),
      "a form that assigns staff must preselect the signed-in user (client ruling, 16 Sep 2026) — " +
        "pass the dialog's default*Id prop, read off useSessionUserId() (see account-detail.tsx or " +
        "contact-detail.tsx for the shape)."
    ).toEqual([])
  })

  // ── THE RED PROOF ─────────────────────────────────────────────────────────
  it("RED PROOF: a mount with the prop omitted is caught", () => {
    const missing = `
export function Screen() {
  return <AccountFormDialog open onOpenChange={() => {}} members={[]} initial={INITIAL} />
}
`
    const present = `
export function Screen() {
  return (
    <AccountFormDialog
      open
      onOpenChange={() => {}}
      members={[]}
      defaultAccountManagerId={myUserId ?? ""}
      initial={INITIAL}
    />
  )
}
`
    const missingHits = findMounts(missing, "/tmp/fixture-missing.tsx", "fixture-missing.tsx")
    expect(missingHits).toHaveLength(1)
    expect(missingHits[0].hasProp).toBe(false)

    const presentHits = findMounts(present, "/tmp/fixture-present.tsx", "fixture-present.tsx")
    expect(presentHits).toHaveLength(1)
    expect(presentHits[0].hasProp).toBe(true)
  })
})
