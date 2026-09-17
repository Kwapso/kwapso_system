// EVERY `fixed*` PARENT-RECORD PROP RENDERS A FACT ROW — AND THE LIST OF WHICH
// FORMS THOSE ARE IS DERIVED, NEVER HAND-KEPT.
//
// The client's ruling, 17 Sep 2026, verbatim: "Keep the fact rows, but make
// sure they appear everywhere." UI-RULEBOOK F5/F12 already names the shape —
// "a field showing the record's own settled value where a control would
// otherwise be" — for the one case her own ruling exempts from the
// form-carries-no-hints census (R81). A form opened FROM a parent record (an
// app's own screen raising a story, a client's own record selling a wave)
// answers one of its own fields before the person sees it, and that field is
// a FACT from then on, never a picker still offering to change it.
//
// A census, not a memory: nine call sites across eight dialogs carried a
// `fixed*` prop on 17 Sep 2026 and drew SIX different shapes for it — the
// panel `story-form-dialog.tsx`'s own App row used, the bare muted text its
// own Ticket row three fields down used, a sentence with no label at all
// outside any `<Field>` (`wave-form-dialog.tsx`, `process-form-dialog.tsx`),
// and two dialogs (`meeting-form-dialog.tsx`, `todo-form-dialog.tsx`) that
// declared the prop and never gated their picker on it at all — a live
// control sitting where a fact belongs. `shared/web/fact-row.tsx`'s `FactRow`
// is the one shape every one of them renders through now.
//
// THIS FILE USED TO HOLD THE POPULATION BY HAND, the same failure mode
// `web/test/staff-preselect-call-sites.test.ts` names for the staff-preselect
// law: a tenth `fixed*` prop on an eleventh dialog next month is invisible to
// a hand-kept list until somebody remembers to add it. So the population is
// DERIVED, off two independent facts the source already states:
//
//   1. WHICH DIALOGS DECLARE A `fixed*` PROP AT ALL. Every exported
//      `function ⋯FormDialog(...)` in web/ whose sole destructured
//      parameter's inline type literal declares a property matching
//      `/^fixed[A-Z]\w*$/` — `fixedApp`, `fixedTicket`, `fixedAccount`,
//      `fixedClient`, `fixedTarget` today; a new dialog's own new name
//      tomorrow, never retyped here.
//
//   2. FOR EACH SUCH PROP, WHETHER THE DIALOG'S OWN JSX GATES A `<FactRow`
//      MOUNT ON IT — a JSX conditional (`cond ? a : b`, `cond && a`) whose
//      TEST expression mentions the prop, with one branch mounting
//      `<FactRow`. One level of indirection is allowed and is not a gap:
//      `story-form-dialog.tsx`'s own App row gates on `derivedApp`, a local
//      value folding in the app implied by a fixed TICKET (CHECKLIST 6.1/
//      T3651) — so a `const X = <expr mentioning the prop>` earlier in the
//      same function body makes `X` count as mentioning the prop too, read
//      off the function's own source rather than assumed.
//
// A dialog matching (1) whose gate for some prop is never found is a real
// finding — a `fixed*` prop the dialog's own signature accepts and its own
// body never turns into a fact — proven below to be a real, live check
// rather than a shape that happens never to fire today.

import { join } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { sourceFiles } from "../../shared/rules/source-scan"

const ROOT = join(import.meta.dirname, "..", "..")

function importsFormShell(source: string): boolean {
  return /from\s+["']@shared\/web\/form-shell["']/.test(source)
}

function isExported(fn: ts.FunctionDeclaration): boolean {
  return fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false
}

/** Every `fixed[A-Z]\w*` prop this dialog's own signature declares, read off
 * the sole destructured parameter's inline type literal — the shape every
 * dialog in this app is written in, the same shape
 * `staff-preselect-call-sites.test.ts` reads `default*Id` off. */
function fixedProps(fn: ts.FunctionDeclaration): string[] {
  const param = fn.parameters[0]
  if (!param?.type || !ts.isTypeLiteralNode(param.type)) return []
  const out: string[] = []
  for (const member of param.type.members) {
    if (
      ts.isPropertySignature(member) &&
      ts.isIdentifier(member.name) &&
      /^fixed[A-Z]\w*$/.test(member.name.text)
    ) {
      out.push(member.name.text)
    }
  }
  return out
}

/** Does `node`'s own source text mention `token` as a whole identifier. */
function mentionsToken(node: ts.Node, token: string): boolean {
  return new RegExp(`\\b${token}\\b`).test(node.getText())
}

/** `token`, plus every local `const X = <expr>` in the function body whose
 * OWN initializer mentions `token` — one level of indirection, named in this
 * file's own header (the `derivedApp` shape). Fixed point after one pass:
 * this app's dialogs nest at most one such alias deep today (checked), so a
 * single pass is enough rather than assumed sufficient. */
function aliasesOf(fn: ts.FunctionDeclaration, token: string): Set<string> {
  const aliases = new Set<string>([token])
  const visit = (n: ts.Node) => {
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.initializer &&
      mentionsToken(n.initializer, token)
    ) {
      aliases.add(n.name.text)
    }
    ts.forEachChild(n, visit)
  }
  visit(fn)
  return aliases
}

function mountsFactRow(node: ts.Node): boolean {
  let hit = false
  const visit = (n: ts.Node) => {
    if (hit) return
    const opening = ts.isJsxSelfClosingElement(n) ? n : ts.isJsxElement(n) ? n.openingElement : undefined
    if (opening && ts.isIdentifier(opening.tagName) && opening.tagName.text === "FactRow") hit = true
    ts.forEachChild(n, visit)
  }
  visit(node)
  return hit
}

/** Is there a JSX conditional in `fn` whose TEST mentions one of `tokens`,
 * with `<FactRow` mounted in one of its branches? */
function hasGatedFactRow(fn: ts.FunctionDeclaration, tokens: Set<string>): boolean {
  let found = false
  const testMentions = (test: ts.Expression) => {
    for (const tok of tokens) if (mentionsToken(test, tok)) return true
    return false
  }
  const visit = (n: ts.Node) => {
    if (found) return
    if (ts.isConditionalExpression(n) && testMentions(n.condition)) {
      if (mountsFactRow(n.whenTrue) || mountsFactRow(n.whenFalse)) found = true
    }
    if (
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
      testMentions(n.left)
    ) {
      if (mountsFactRow(n.right)) found = true
    }
    ts.forEachChild(n, visit)
  }
  visit(fn)
  return found
}

type Finding = { component: string; file: string; prop: string; ok: boolean }

function derivedFindings(files: { path: string; rel: string; source: string }[]): Finding[] {
  const out: Finding[] = []
  for (const f of files) {
    if (!importsFormShell(f.source)) continue
    const tree = ts.createSourceFile(f.path, f.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name && isExported(node)) {
        const props = fixedProps(node)
        for (const prop of props) {
          const ok = hasGatedFactRow(node, aliasesOf(node, prop))
          out.push({ component: node.name.text, file: f.rel, prop, ok })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(tree)
  }
  return out
}

function repoFindings(): Finding[] {
  const files = sourceFiles([join(ROOT, "web")], { extensions: [".tsx"], relativeTo: ROOT, skipTests: true })
  return derivedFindings(files)
}

describe("R79/R81/F5/F12 · every fixed*/parent prop renders a fact row (derived population)", () => {
  it("the derivation finds real dialogs — a walk that finds nothing is not a census", () => {
    const findings = repoFindings()
    expect(
      findings.length,
      "found no exported *FormDialog with a fixed* prop — has the walk gone blind?"
    ).toBeGreaterThanOrEqual(8)
  })

  it("every fixed*/parent prop gates a <FactRow> mount in its own dialog", () => {
    const findings = repoFindings()
    const offenders = findings.filter((f) => !f.ok)
    expect(
      offenders.map((f) => `${f.file}: <${f.component}> declares "${f.prop}" but never gates a <FactRow> on it`),
      'the client\'s ruling, 17 Sep 2026: "Keep the fact rows, but make sure they appear ' +
        "everywhere\" — a fixed*/parent prop must replace its field's control with " +
        "shared/web/fact-row.tsx's <FactRow>, never leave a live picker beside it."
    ).toEqual([])
  })

  it("today's known dialogs are all in the derived population", () => {
    const findings = repoFindings()
    const byKey = new Set(findings.map((f) => `${f.component}.${f.prop}`))
    for (const key of [
      "StoryFormDialog.fixedApp",
      "StoryFormDialog.fixedTicket",
      "TimeFormDialog.fixedTarget",
      "SprintFormDialog.fixedApp",
      "SprintFormDialog.fixedAccount",
      "HelpFormDialog.fixedApp",
      "MeetingFormDialog.fixedApp",
      "WaveFormDialog.fixedClient",
      "ProcessFormDialog.fixedApp",
      "TodoFormDialog.fixedAccount",
    ]) {
      expect(byKey.has(key), `expected the derivation to find ${key}`).toBe(true)
    }
  })

  // ── THE RED PROOF, IN TWO PARTS ─────────────────────────────────────────
  //
  // (a) a dialog that declares a fixed* prop and never gates a <FactRow> on
  //     it is caught — a fixture standing in for exactly the defect
  //     `meeting-form-dialog.tsx` and `todo-form-dialog.tsx` shipped with
  //     before this law existed: the prop feeds a default value or the
  //     submit payload, and the control stays live regardless.
  it("RED PROOF: a fixed* prop with no gated FactRow is caught", () => {
    const offender = `
import { FormShellDialog } from "@shared/web/form-shell"

export function WidgetFormDialog({
  open,
  fixedThing,
}: {
  open: boolean
  fixedThing?: { id: string; name: string }
}) {
  return (
    <FormShellDialog open={open}>
      <Field config={thingField} htmlFor="widget-thing">
        <RecordPicker id="widget-thing" value={fixedThing?.id ?? values.thingId} onChange={set} />
      </Field>
    </FormShellDialog>
  )
}
`
    const fixed = `
import { FormShellDialog } from "@shared/web/form-shell"

export function WidgetFormDialog({
  open,
  fixedThing,
}: {
  open: boolean
  fixedThing?: { id: string; name: string }
}) {
  return (
    <FormShellDialog open={open}>
      <Field config={thingField} htmlFor="widget-thing">
        {fixedThing ? (
          <FactRow id="widget-thing" name={fixedThing.name} />
        ) : (
          <RecordPicker id="widget-thing" value={values.thingId} onChange={set} />
        )}
      </Field>
    </FormShellDialog>
  )
}
`
    const offenderFindings = derivedFindings([
      { path: "/tmp/fixture-offender.tsx", rel: "fixture-offender.tsx", source: offender },
    ])
    expect(offenderFindings).toEqual([
      { component: "WidgetFormDialog", file: "fixture-offender.tsx", prop: "fixedThing", ok: false },
    ])

    const fixedFindings = derivedFindings([
      { path: "/tmp/fixture-fixed.tsx", rel: "fixture-fixed.tsx", source: fixed },
    ])
    expect(fixedFindings).toEqual([
      { component: "WidgetFormDialog", file: "fixture-fixed.tsx", prop: "fixedThing", ok: true },
    ])
  })

  // (b) A GATED PROP HANDLED THROUGH A LOCAL ALIAS ONE LEVEL DEEP IS FOUND
  //     TOO — the `derivedApp` shape `story-form-dialog.tsx` itself uses,
  //     proven here on a fixture so the mechanism is demonstrated rather than
  //     only exercised incidentally by the real file.
  it("a fixed* prop gated through one local alias is found, not just a bare identifier", () => {
    const aliased = `
import { FormShellDialog } from "@shared/web/form-shell"

export function WidgetFormDialog({
  open,
  fixedThing,
  otherThing,
}: {
  open: boolean
  fixedThing?: { id: string; name: string }
  otherThing?: { id: string; name: string }
}) {
  const derivedThing = fixedThing ?? (otherThing ? lookup(otherThing.id) : undefined)
  return (
    <FormShellDialog open={open}>
      <Field config={thingField} htmlFor="widget-thing">
        {derivedThing ? <FactRow id="widget-thing" name={derivedThing.name} /> : <RecordPicker id="widget-thing" />}
      </Field>
    </FormShellDialog>
  )
}
`
    const findings = derivedFindings([
      { path: "/tmp/fixture-aliased.tsx", rel: "fixture-aliased.tsx", source: aliased },
    ])
    expect(findings).toEqual([
      { component: "WidgetFormDialog", file: "fixture-aliased.tsx", prop: "fixedThing", ok: true },
    ])
  })
})
