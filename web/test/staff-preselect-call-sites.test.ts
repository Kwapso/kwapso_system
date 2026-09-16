// EVERY CREATE FORM WITH A STAFF PICKER SEEDS THE SIGNED-IN USER — AND THE
// LIST OF WHICH FORMS THOSE ARE IS DERIVED, NEVER HAND-KEPT.
//
// The client's ruling, 16 Sep 2026, verbatim: "That's still not correct. For
// example, on Add Story, I don't see myself preselected. Make sure you fix it
// everywhere, not only here." And, the same day, the sharper restatement this
// suite is built on: "By default, every time they have to assign it to
// someone, it needs to preselect the active user."
//
// THIS FILE USED TO HOLD THE POPULATION BY HAND:
//
//   const REQUIRED_PROP: Record<string, string> = {
//     TaskFormDialog: "defaultAssigneeId",
//     StoryFormDialog: "defaultAssigneeId",
//     AccountFormDialog: "defaultAccountManagerId",
//     AppFormDialog: "defaultStaffUserId",
//   }
//
// which is exactly the shape her ruling refuses: a FIFTH dialog that grows a
// staff/owner/organiser picker tomorrow is invisible to this census until
// somebody remembers to add its name here — and "somebody remembers" is the
// failure mode Add Story itself just proved out, on a form whose own dialog
// body already carried the fallback correctly. So the population is now
// DERIVED, off two independent facts the source already states:
//
//   1. WHICH DIALOGS CARRY A STAFF PICKER AT ALL. Every exported
//      `function ⋯FormDialog(...)` in web/ whose JSX body mounts
//      `<StaffPillPicker` in its SINGLE-PICK shape (`mode` absent, or
//      `mode="single"` — the component's own default, and the one shape
//      where exactly one pill can be "the preselected one"; `mode="multi"`
//      is a roster, R79's own text about it: "no pill pressed is not a
//      'Nobody' option, it is nobody having been pressed yet").
//
//   2. WHICH PROP EACH ONE ASKS A CALLER TO PASS. Read off the dialog's OWN
//      parameter type — the `default⋯Id` property its signature declares
//      (`defaultAssigneeId`, `defaultAccountManagerId`, `defaultStaffUserId`
//      today; a new dialog's own new name tomorrow), never retyped here.
//
// A dialog matching (1) with no such prop in its own signature is a finding
// in its own right — a staff picker with nothing for a caller to preselect
// it FROM — proven below to be a real, live check rather than a shape that
// happens never to fire today.
//
// THEN, AS BEFORE, THE CALL-SITE CENSUS: every mount of a dialog in the
// derived population, anywhere in web/, must pass that dialog's own prop.
// `web/test/staff-picker-kills-nobody.test.tsx`'s own "create forms preselect
// the caller" tests already prove each dialog's BODY honours the prop when
// it is given one; this is the other half, over every CALLER instead.

import { join } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { sourceFiles } from "../../shared/rules/source-scan"

const ROOT = join(import.meta.dirname, "..", "..")

/** `mode` reads as SINGLE-PICK when it is absent (the component's own
 * default) or the string literal `"single"`. `"multi"` — a roster field like
 * an app's staff checklist or a ticket's stakeholders — is deliberately
 * excluded: R79's own text says why nobody pressed is not a state this
 * ruling is about. A `mode` this scan cannot read literally (a variable, a
 * ternary) is treated as NOT provably single — there is none in the app
 * today (checked: every `<StaffPillPicker` mount's `mode` is either absent
 * or a bare string literal), so a false negative here would be new, not
 * hidden. */
function isSingleModeMount(opening: ts.JsxOpeningLikeElement): boolean {
  const modeAttr = opening.attributes.properties.find(
    (a): a is ts.JsxAttribute => ts.isJsxAttribute(a) && ts.isIdentifier(a.name) && a.name.text === "mode"
  )
  if (!modeAttr || !modeAttr.initializer) return true
  const init = modeAttr.initializer
  if (ts.isStringLiteral(init)) return init.text === "single"
  if (ts.isJsxExpression(init) && init.expression && ts.isStringLiteral(init.expression)) {
    return init.expression.text === "single"
  }
  return false
}

/** Does this node's subtree mount a single-pick `<StaffPillPicker`? Walks the
 * whole subtree (a dialog's JSX return, typically), not just its immediate
 * children — the mount can sit inside a `<Field>`, a fragment, a conditional. */
function hasSingleStaffPillPicker(node: ts.Node): boolean {
  let found = false
  const visit = (n: ts.Node) => {
    if (found) return
    const opening = ts.isJsxSelfClosingElement(n) ? n : ts.isJsxElement(n) ? n.openingElement : undefined
    if (
      opening &&
      ts.isIdentifier(opening.tagName) &&
      opening.tagName.text === "StaffPillPicker" &&
      isSingleModeMount(opening)
    ) {
      found = true
      return
    }
    ts.forEachChild(n, visit)
  }
  visit(node)
  return found
}

/** The `default⋯Id` prop THIS dialog's own signature declares — read off its
 * sole destructured parameter's inline type literal, the shape every dialog
 * in this app is written in (`{ a, b, c }: { a: X; b: Y; c: Z }`). Undefined
 * when the parameter is not that shape, or declares no such property. */
function defaultIdProp(fn: ts.FunctionDeclaration): string | undefined {
  const param = fn.parameters[0]
  if (!param?.type || !ts.isTypeLiteralNode(param.type)) return undefined
  for (const member of param.type.members) {
    if (
      ts.isPropertySignature(member) &&
      ts.isIdentifier(member.name) &&
      /^default[A-Z]\w*Id$/.test(member.name.text)
    ) {
      return member.name.text
    }
  }
  return undefined
}

function isExported(fn: ts.FunctionDeclaration): boolean {
  return fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false
}

/** IS THIS A FORM AT ALL — the R4 marker R81's own `form-carries-no-hints`
 * census already stands on (`imports FormShell/FormShellDialog`). Without it
 * the derivation also catches `triage-queue.tsx`'s "who is picking this up?"
 * action row: a single-pick `<StaffPillPicker>` with nothing to preselect
 * INTO, because a click there commits immediately rather than filling a
 * draft a dialog later submits — R79's own text carves this shape out by
 * name ("an action row that commits on the click has no submit step to
 * preselect into"). A form is a `FormShell`/`FormShellDialog` renderer; an
 * action row is not, and this is the one fact on disk that tells them apart. */
function importsFormShell(source: string): boolean {
  return /from\s+["']@shared\/web\/form-shell["']/.test(source)
}

type DialogSpec = { component: string; file: string; requiredProp: string }

/** THE WHOLE DERIVATION: every exported dialog carrying a single-pick staff
 * picker, paired with the prop its own signature asks a caller to pass — and,
 * separately, every one that carries the picker but declares no such prop
 * (a real finding, not swallowed). */
function derivedDialogs(): { specs: DialogSpec[]; undeclaredProp: string[] } {
  const files = sourceFiles([join(ROOT, "web")], { extensions: [".tsx"], relativeTo: ROOT, skipTests: true })
  const specs: DialogSpec[] = []
  const undeclaredProp: string[] = []
  for (const f of files) {
    if (!importsFormShell(f.source)) continue
    const tree = ts.createSourceFile(f.path, f.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name && isExported(node) && hasSingleStaffPillPicker(node)) {
        const prop = defaultIdProp(node)
        if (prop) {
          specs.push({ component: node.name.text, file: f.rel, requiredProp: prop })
        } else {
          undeclaredProp.push(
            `${f.rel}: <${node.name.text}> mounts a single-pick StaffPillPicker but its own ` +
              "signature declares no default*Id prop to preselect it from"
          )
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(tree)
  }
  return { specs, undeclaredProp }
}

type Mount = { file: string; line: number; component: string; hasProp: boolean }

function findMounts(source: string, path: string, rel: string, required: Map<string, string>): Mount[] {
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const out: Mount[] = []
  const visit = (node: ts.Node) => {
    const opening = ts.isJsxSelfClosingElement(node)
      ? node
      : ts.isJsxElement(node)
        ? node.openingElement
        : undefined
    if (opening && ts.isIdentifier(opening.tagName) && required.has(opening.tagName.text)) {
      const component = opening.tagName.text
      const wantedProp = required.get(component) as string
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

function allMounts(required: Map<string, string>): Mount[] {
  const files = sourceFiles([join(ROOT, "web")], { extensions: [".tsx"], relativeTo: ROOT, skipTests: true })
  return files.flatMap((f) => findMounts(f.source, f.path, f.rel, required))
}

describe("R79/R81 · every staff-preselecting dialog is actually preselected at its call site (derived population)", () => {
  it("the derivation finds real dialogs — a walk that finds nothing is not a census", () => {
    const { specs } = derivedDialogs()
    expect(
      specs.length,
      "found no exported *FormDialog with a single-pick <StaffPillPicker> — has the walk gone blind?"
    ).toBeGreaterThanOrEqual(4)
  })

  it("no dialog mounts a single-pick StaffPillPicker without declaring its own default*Id prop", () => {
    const { undeclaredProp } = derivedDialogs()
    expect(undeclaredProp).toEqual([])
  })

  it("the derivation finds today's four dialogs with today's four prop names — a fixed point this file no longer types by hand", () => {
    const { specs } = derivedDialogs()
    const byComponent = new Map(specs.map((s) => [s.component, s.requiredProp]))
    expect(byComponent.get("TaskFormDialog")).toBe("defaultAssigneeId")
    expect(byComponent.get("StoryFormDialog")).toBe("defaultAssigneeId")
    expect(byComponent.get("AccountFormDialog")).toBe("defaultAccountManagerId")
    expect(byComponent.get("AppFormDialog")).toBe("defaultStaffUserId")
  })

  it("every mount of a derived dialog passes its own default*Id prop", () => {
    const { specs } = derivedDialogs()
    const required = new Map(specs.map((s) => [s.component, s.requiredProp]))
    const missing = allMounts(required).filter((m) => !m.hasProp)
    expect(
      missing.map((m) => `${m.file}:${m.line} <${m.component}> is missing ${required.get(m.component)}`),
      "a form that assigns staff must preselect the signed-in user (client ruling, 16 Sep 2026) — " +
        "pass the dialog's default*Id prop, read off useSessionUserId() (see account-detail.tsx or " +
        "contact-detail.tsx for the shape)."
    ).toEqual([])
  })

  // ── THE RED PROOF, IN TWO PARTS ─────────────────────────────────────────
  //
  // (a) a call site missing the prop is caught, for a dialog the DERIVATION
  //     itself found — not a name typed into this test by hand, so the proof
  //     covers the whole pipeline rather than only the second half of it.
  it("RED PROOF: a mount missing the derived prop is caught", () => {
    const { specs } = derivedDialogs()
    const required = new Map(specs.map((s) => [s.component, s.requiredProp]))
    const story = specs.find((s) => s.component === "StoryFormDialog")
    if (!story) throw new Error("StoryFormDialog not found by the derivation — fix the test setup first")

    const missing = `
export function Screen() {
  return <StoryFormDialog open onOpenChange={() => {}} members={[]} apps={[]} />
}
`
    const present = `
export function Screen() {
  return (
    <StoryFormDialog
      open
      onOpenChange={() => {}}
      members={[]}
      apps={[]}
      ${story.requiredProp}={myUserId ?? ""}
    />
  )
}
`
    const missingHits = findMounts(missing, "/tmp/fixture-missing.tsx", "fixture-missing.tsx", required)
    expect(missingHits).toHaveLength(1)
    expect(missingHits[0].hasProp).toBe(false)

    const presentHits = findMounts(present, "/tmp/fixture-present.tsx", "fixture-present.tsx", required)
    expect(presentHits).toHaveLength(1)
    expect(presentHits[0].hasProp).toBe(true)
  })

  // (b) THE DERIVATION ITSELF SEES A BRAND NEW DIALOG WITH NO NAME TYPED
  //     ANYWHERE — the whole point of "derived, not a hand list": a fixture
  //     source file standing in for a future form nobody has told this test
  //     about, proving the census would have caught it on day one.
  it("RED PROOF: a brand-new dialog with a staff picker is found without being named anywhere in this file", () => {
    const fixtureSource = `
export function WidgetFormDialog({
  open,
  onOpenChange,
  people,
  defaultWidgetOwnerId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  people: StaffPillPerson[]
  defaultWidgetOwnerId?: string
}) {
  return (
    <StaffPillPicker
      ariaLabel="Owner"
      people={people}
      lang={lang}
      value={value}
      onValueChange={set}
    />
  )
}
`
    const tree = ts.createSourceFile("/tmp/fixture-widget.tsx", fixtureSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const found: DialogSpec[] = []
    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name && isExported(node) && hasSingleStaffPillPicker(node)) {
        const prop = defaultIdProp(node)
        if (prop) found.push({ component: node.name.text, file: "fixture-widget.tsx", requiredProp: prop })
      }
      ts.forEachChild(node, visit)
    }
    visit(tree)
    expect(found).toEqual([{ component: "WidgetFormDialog", file: "fixture-widget.tsx", requiredProp: "defaultWidgetOwnerId" }])
  })

  // (c) A ROSTER FIELD (`mode="multi"`) IS NOT PART OF THIS POPULATION — an
  // app's staff checklist has no single pill to preselect, and including it
  // would demand a prop that answers a question the field never asks.
  it("a mode=\"multi\" mount alone does not enter the population", () => {
    const fixtureSource = `
export function ChecklistFormDialog({ open }: { open: boolean; defaultCrewId?: string }) {
  return <StaffPillPicker mode="multi" ariaLabel="Crew" people={people} lang={lang} value={value} onValueChange={set} />
}
`
    const tree = ts.createSourceFile("/tmp/fixture-multi.tsx", fixtureSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    let matched = false
    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name && isExported(node) && hasSingleStaffPillPicker(node)) matched = true
      ts.forEachChild(node, visit)
    }
    visit(tree)
    expect(matched).toBe(false)
  })
})
