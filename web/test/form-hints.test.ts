// R81 — A FORM CARRIES NO HINTS.
//
// The client's ruling, 16 Sep 2026, verbatim: "You put too many explanations
// and hints that are not necessary, especially on the forms, on the create
// and edit. Please, can you delete all of that? I will give you a few
// examples, but I want you to clean it everywhere. If we need hints, I will
// tell you explicitly, but by default, there are no explanations, just the
// choice, text, or the form components." Two examples, both `FieldConfig`
// `helpText` sentences: "The system this work is on. Everything below is
// narrowed by it." (the story form's App field) and "A recording, a page, a
// document somebody can open." (the story form's and the review dialog's
// file field). Both, and forty-seven more like them across both front doors,
// are gone — a create/edit form shows the label and the control, nothing
// else, because the label already says what the field is.
//
// TWO CENSUSES, over the SAME parsed walk `field-config-keys.test.ts` and
// `wrapped-strings.test.ts` (R33) already stand on (`appFiles()`,
// scripts/lib/i18n-source.mjs) — so this law cannot disagree with either
// about what a file is or what a `FieldConfig` looks like.
//
//   1. NO NON-EMPTY `helpText` ON A FIELD CONFIG. The same POSITIONAL
//      signature `field-config-keys.test.ts` already reads: an object
//      literal that SPREADS `...defaultFieldConfig` (or a field config built
//      from one). A `helpText` property on that shape, set to anything other
//      than the empty string, is a hint. This is the mechanism that carried
//      BOTH of the client's own examples, and it is the one this law can
//      prove red simply by putting either sentence back (see the test below,
//      which does exactly that from a fixture rather than the live source).
//
//   2. NO BARE `<p>` HINT PARAGRAPH, in a file that renders a form (imports
//      `FormShell`/`FormShellDialog` — R4's own marker for "this is a form").
//      Narrow by construction, the same discipline `isFieldConfigWord` uses:
//      a `<p>` whose entire content is ONE static translated sentence
//      (`{t("…")}`, three words or more, nothing else interpolated) and whose
//      class carries `text-muted-foreground` — the exact shape every
//      instructional caption removed by this law's own change had, and nothing
//      else. It does NOT catch a `<p>` that renders a record's own settled
//      VALUE (`{fixedApp.name}`, `{stops.join(", ")}` — more than one child,
//      because a value is data glued to words, never one bare sentence) or a
//      validation/status line coloured `text-warning`/`text-destructive`
//      (kept on purpose — see below) or a `<Text>`/other element (R70's
//      protected-automation reason renders through `<Text>`, never `<p>`, and
//      is a different fact entirely: why a row CANNOT be switched, not how to
//      fill in a field — untouched by this law on both counts).
//
// WHAT SURVIVES, ON PURPOSE, and is not a gap in the census:
//   • a validation/refusal message, shown only on a bad state (`text-warning`
//     or `text-destructive`, never `text-muted-foreground`) — the door's own
//     composed sentence, or a client-side echo of the same rule;
//   • a placeholder that is the field's own example value (an `Input`'s
//     `placeholder`, untouched — this law reaches rendered text, not attribute
//     hints already excluded by CLAUDE.md's placeholder convention);
//   • a picker OPTION's own differentiating description (`Choice`'s
//     `description` prop, an `EVENT_KINDS` entry) — the choice's own words,
//     telling two options apart, never an explanation of the field itself;
//   • a field showing the record's OWN SETTLED VALUE where a control would
//     otherwise be (`settledAppField`'s "fact, not control" pattern,
//     `fixedApp.name`/`fixedClient.name`/"Current role: X") — data, not hint.
//
// `FORM_HINT_OK` (shared/rules/registry.ts) is the reasoned, rot-checked way
// out for the one case her own ruling names as a real exception: a hint that
// carries something the user cannot know otherwise (an irreversible action's
// consequence) belongs in the CONFIRM dialog that asks about it, and nowhere
// else. EMPTY on the day this law shipped, and meant to stay that way —
// every hint the inventory found was either removed outright or turned out,
// on inspection, to already be one of the four kept shapes above.

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { FORM_HINT_OK } from "../../shared/rules/registry"
import { ROOT, appFiles } from "../../scripts/lib/i18n-source.mjs"

// ── CENSUS 1 — NO NON-EMPTY helpText ON A FIELD CONFIG ─────────────────────

type HelpTextOffence = { file: string; line: number; text: string }

const isFieldConfigSpread = (obj: ts.ObjectLiteralExpression): boolean =>
  obj.properties.some(
    (p) => ts.isSpreadAssignment(p) && /[Ff]ieldConfig\b/.test(p.expression.getText())
  )

/** Every `helpText` set on a `FieldConfig` literal, with what it was set TO —
 * `""` is fine (the type's own default), anything else — a string, a
 * template, a ternary — is a hint somebody wrote for a reader. */
function helpTextCensus(files: { path: string; tree: ts.SourceFile }[]): HelpTextOffence[] {
  const offences: HelpTextOffence[] = []
  for (const { path, tree } of files) {
    const file = relative(ROOT, path)
    const visit = (node: ts.Node) => {
      if (ts.isObjectLiteralExpression(node) && isFieldConfigSpread(node)) {
        for (const prop of node.properties) {
          if (!ts.isPropertyAssignment(prop)) continue
          const name = prop.name
          if (!ts.isIdentifier(name) || name.text !== "helpText") continue
          const isEmptyString = ts.isStringLiteral(prop.initializer) && prop.initializer.text === ""
          if (isEmptyString) continue
          const { line } = tree.getLineAndCharacterOfPosition(prop.getStart(tree))
          offences.push({ file, line: line + 1, text: prop.getText(tree) })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(tree)
  }
  return offences
}

// ── CENSUS 2 — NO BARE <p> HINT PARAGRAPH IN A FORM FILE ───────────────────

type ParagraphOffence = { file: string; line: number; text: string }

/** Markers for "this file is a form" — R4's own (every form/dialog renders
 * through the shared FormShell) plus, since 2026-09-17, the kit's
 * `UnsavedChangesBar`: a Settings tab staged behind Save/Discard is a form in
 * every way this law cares about (a label, a control, nothing else between
 * them) even though it never imports `FormShell` — she said so directly,
 * over Settings › Appearance: "too many descriptions everywhere ... delete
 * these live preview updates as you press a control." One panel draws the
 * bar today (`web/components/team/roles-matrix.tsx`); it carried no
 * bare-`<p>` hint at the time this marker widened, so the second clause
 * below extends the census's REACH without moving its own goalposts.
 * `shared/web/appearance-panel.tsx` was the other caller until 22 Sep 2026,
 * when its own pending/Save shape (and the bar with it) was removed — see
 * that file's own header; this marker still names the import rather than the
 * file, so nothing here needed to change when it stopped applying to it. */
const FORM_FILE_MARKERS = ["@shared/web/form-shell", "@shared/ui/components/unsaved-changes-bar/unsaved-changes-bar"]

/** Does this file render a form at all? See `FORM_FILE_MARKERS` above. */
function importsFormShell(tree: ts.SourceFile): boolean {
  let found = false
  const visit = (node: ts.Node) => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      FORM_FILE_MARKERS.includes(node.moduleSpecifier.text)
    ) {
      found = true
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return found
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

function hasMutedForeground(className: string): boolean {
  return /\btext-muted-foreground\b/.test(className)
}

/** A `<p ...>` element's JSX children, ignoring the class attribute. Returns
 * the meaningful (non-whitespace) children so "one child" means one real
 * node, not one node plus a stray newline JsxText. */
function meaningfulChildren(children: ts.NodeArray<ts.JsxChild>): ts.JsxChild[] {
  return children.filter((c) => !(ts.isJsxText(c) && c.text.trim() === ""))
}

/** Is this JSX child exactly `{t("a plain sentence")}` — a call to the
 * identifier `t` with a single plain string literal argument? A BRAND/vars
 * second argument, a template literal, or anything computed is NOT this
 * shape — those are DATA (a person's name, a count, a door's own composed
 * sentence), never a static hint a developer typed. */
function isPlainTCall(child: ts.JsxChild): string | null {
  if (!ts.isJsxExpression(child) || !child.expression) return null
  const expr = child.expression
  if (!ts.isCallExpression(expr)) return null
  if (!ts.isIdentifier(expr.expression) || expr.expression.text !== "t") return null
  if (expr.arguments.length !== 1) return null
  const arg = expr.arguments[0]
  if (!ts.isStringLiteral(arg)) return null
  return arg.text
}

/** Is this node a PROP VALUE (`subtitle={<p>…</p>}`, `title={…}`) rather than
 * a rendered CHILD? Walk up to the nearest `JsxAttribute`/`JsxElement`
 * boundary: a `<p>` reached through an attribute is a dialog's own
 * title/subtitle (FormShell's own words about the WHOLE form, R72's subject,
 * not this law's), never a sentence sitting between fields. */
function isInsideJsxAttribute(node: ts.Node): boolean {
  let cur: ts.Node | undefined = node.parent
  while (cur) {
    if (ts.isJsxAttribute(cur)) return true
    if (ts.isJsxElement(cur) || ts.isJsxFragment(cur)) return false
    cur = cur.parent
  }
  return false
}

function paragraphCensus(files: { path: string; tree: ts.SourceFile }[]): ParagraphOffence[] {
  const offences: ParagraphOffence[] = []
  for (const { path, tree } of files) {
    if (!importsFormShell(tree)) continue
    const file = relative(ROOT, path)
    const visit = (node: ts.Node) => {
      if (
        ts.isJsxElement(node) &&
        ts.isIdentifier(node.openingElement.tagName) &&
        node.openingElement.tagName.text === "p" &&
        !isInsideJsxAttribute(node)
      ) {
        const classAttr = node.openingElement.attributes.properties.find(
          (a) =>
            ts.isJsxAttribute(a) &&
            ts.isIdentifier(a.name) &&
            a.name.text === "className" &&
            a.initializer &&
            ts.isStringLiteral(a.initializer)
        ) as ts.JsxAttribute | undefined
        const className = classAttr?.initializer && ts.isStringLiteral(classAttr.initializer) ? classAttr.initializer.text : ""
        if (hasMutedForeground(className)) {
          const kids = meaningfulChildren(node.children)
          if (kids.length === 1) {
            const sentence = isPlainTCall(kids[0])
            if (sentence !== null && wordCount(sentence) >= 3) {
              const { line } = tree.getLineAndCharacterOfPosition(node.getStart(tree))
              offences.push({ file, line: line + 1, text: sentence })
            }
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(tree)
  }
  return offences
}

const exempt = (file: string): boolean => file in FORM_HINT_OK

describe("R81 · a form carries no hints", () => {
  const files = appFiles()

  it("the walk found real form files — a census that finds nothing is not a census", () => {
    expect(files.length, "appFiles() found nothing — has the walk gone blind?").toBeGreaterThan(100)
  })

  it("form-hints: no FieldConfig literal sets a non-empty helpText", () => {
    const offences = helpTextCensus(files).filter((o) => !exempt(o.file))
    expect(
      offences.map((o) => `${o.file}:${o.line} ${o.text}`),
      "a form field carries a hint. The client's ruling, 16 Sep 2026: forms show the label and the control, " +
        "nothing else — delete the helpText, or, for the one sanctioned exception (an irreversible action's " +
        "consequence the user cannot know otherwise), move it into the CONFIRM dialog and name the file in " +
        "FORM_HINT_OK (shared/rules/registry.ts) with the reason."
    ).toEqual([])
  })

  it("form-hints: no bare <p> hint paragraph sits between a form's fields", () => {
    const offences = paragraphCensus(files).filter((o) => !exempt(o.file))
    expect(
      offences.map((o) => `${o.file}:${o.line} "${o.text}"`),
      "a bare paragraph explains a form rather than showing a value, a validation state, or an option's own " +
        "words. Delete it, or name the file in FORM_HINT_OK with the reason (none are on file today)."
    ).toEqual([])
  })

  // ── THE RED PROOF ─────────────────────────────────────────────────────────
  //
  // Not "delete a line and watch a pre-existing suite go red" — a FIXTURE, so
  // this file proves its own census actually FIRES rather than merely
  // existing beside code that happens to be clean today. Both of the client's
  // own two examples, verbatim, fed through the same two functions the real
  // censuses above call — a temp file rather than a mutation of live source,
  // so this test cannot itself leave a hint behind if it fails halfway.
  it("RED PROOF: re-adding either of the client's own two example hints is caught", () => {
    const dir = mkdtempSync(join(tmpdir(), "form-hints-red-"))
    try {
      const fixturePath = join(dir, "fixture-form-dialog.tsx")
      const fixture = `
import { Field } from "@shared/web/field"
import { FormShellDialog } from "@shared/web/form-shell"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"

const appField = {
  ...defaultFieldConfig,
  label: "App",
  required: true,
  helpText: "The system this work is on. Everything below is narrowed by it.",
}

export function FixtureFormDialog() {
  return (
    <FormShellDialog open onOpenChange={() => {}} onSubmit={() => {}}>
      <Field config={appField} htmlFor="fixture-app">
        <input id="fixture-app" />
      </Field>
      <p className="text-muted-foreground text-sm">
        {t("A recording, a page, a document somebody can open.")}
      </p>
    </FormShellDialog>
  )
}
`
      writeFileSync(fixturePath, fixture, "utf8")
      const source = readFileSync(fixturePath, "utf8")
      const tree = ts.createSourceFile(fixturePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      const fixtureFiles = [{ path: fixturePath, tree }]

      const helpTextHits = helpTextCensus(fixtureFiles)
      expect(
        helpTextHits.map((h) => h.text),
        "the helpText census did not catch the client's own first example — it has gone blind"
      ).toEqual([expect.stringContaining("The system this work is on")])

      const paragraphHits = paragraphCensus(fixtureFiles)
      expect(
        paragraphHits.map((h) => h.text),
        "the bare-<p> census did not catch the client's own second example — it has gone blind"
      ).toEqual(["A recording, a page, a document somebody can open."])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
