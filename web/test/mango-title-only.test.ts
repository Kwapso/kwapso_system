// R84 — MANGO LIVES ONLY IN THE TITLE COMPONENT; EVERY BUTTON OFF IT IS BLACK.
//
// The client's ruling, 16 Sep 2026 evening, verbatim: "Let's revisit the rule
// of only one mango button per screen. Only mango buttons on the title level.
// Title means the title component on top. Only those can be mango, the
// others black."
//
// THE TITLE COMPONENT, named rather than assumed. On a collection screen it
// is `CollectionHeading` (web/components/records/collection-heading.tsx and
// web-portal/components/collection-heading.tsx — same name, same shape on
// both front doors, its own `action` prop the screen's one door). On a
// bespoke record detail it is `RecordScreen`'s own `actions` prop
// (web/components/records/record-chrome.tsx, B1: "at most one primary and
// one secondary button" share the title's own row). On the five
// recipe-driven details that draw through the OTHER path (team.detail,
// members.detail, invites.detail, brand.detail, purposes.detail), it is the
// kit's own `RecordDetail`/`RecordChrome`
// (shared/web/screen-engine/screen-renderer.tsx). Four names, and only four —
// RULES.md's own row for R84 says why each one earns its place.
//
// THE CENSUS, OFF THE DISK: every JSX `<Button>` whose `variant` is the
// mango one — `variant="default"` (the kit's own name for the brand fill:
// button.tsx's own comment, "the ONE brand fill"), stated OR OMITTED, since
// `default` is `Button`'s own default variant — is walked up its ancestor
// chain. The walk crosses a JSX attribute's own initializer, not only a
// JSX element's children, so a Button handed to a title component through a
// prop (`action={<Button .../>}`) counts as inside it exactly the way a
// literal child does; that is how the census stays honest about
// `CollectionHeading`'s and `RecordScreen`'s own action slots without
// hand-listing every file that fills them. A Button whose `variant` is a
// COMPUTED expression (`action.variant`, a ternary, a lookup table) is out
// of reach by construction, stated rather than exempted — the same posture
// R82 takes on a recipe-built column list, because a rule that reads source
// cannot resolve what only runs at render.
//
// THE EXEMPTION TABLE, `MANGO_OUTSIDE_TITLE_OK` — reasoned, rot-checked both
// ways, keyed `${file}#${enclosing function}` (never by line: a file:line key
// rots on every edit above it). Two lines on the day this law shipped, both
// the assistant strip, owned by a different lane.

import { join } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { MANGO_OUTSIDE_TITLE_OK } from "@shared/rules/registry"

const ROOT = join(import.meta.dirname, "..", "..")
const ROOTS = [join(ROOT, "web"), join(ROOT, "web-portal"), join(ROOT, "shared", "web")]

/** The four names a Button may sit under and still be mango — RULES.md's own
 * R84 row names each one and why. */
const TITLE_TAGS = new Set(["CollectionHeading", "RecordScreen", "RecordDetail", "RecordChrome"])

type Offender = { key: string; rel: string; line: number; kind: "omitted" | "literal" }

/** The nearest enclosing named function — the same "room" every other
 * per-function exemption key in this repo uses since R74 (rules.test.ts's own
 * `enclosingName`, re-read here because this law lives in its own file). A
 * module-level Button with no enclosing function keys on the file itself. */
function enclosingFunctionName(node: ts.Node, sf: ts.SourceFile): string {
  for (let cur: ts.Node | undefined = node; cur; cur = cur.parent) {
    if (ts.isFunctionDeclaration(cur) && cur.name) return cur.name.getText(sf)
    if (
      (ts.isArrowFunction(cur) || ts.isFunctionExpression(cur)) &&
      ts.isVariableDeclaration(cur.parent) &&
      ts.isIdentifier(cur.parent.name)
    )
      return cur.parent.name.getText(sf)
  }
  return "module"
}

function jsxTagName(el: ts.JsxElement | ts.JsxSelfClosingElement): string {
  const tag = ts.isJsxElement(el) ? el.openingElement.tagName : el.tagName
  return tag.getText()
}

/** `undefined` when the variant is absent (mango, implicit) or a literal
 * `"default"` (mango, explicit) is the classification this census wants;
 * any OTHER literal is not mango, and a non-literal expression is out of
 * reach by construction (R82's own posture) — both return `null`, meaning
 * "not an offender, and not because it passed the title test". */
function mangoKind(opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement): "omitted" | "literal" | null {
  const variantAttr = opening.attributes.properties.find(
    (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === "variant"
  )
  if (!variantAttr) return "omitted"
  const init = variantAttr.initializer
  if (init && ts.isStringLiteral(init)) return init.text === "default" ? "literal" : null
  if (init && ts.isJsxExpression(init) && init.expression && ts.isStringLiteral(init.expression)) {
    return init.expression.text === "default" ? "literal" : null
  }
  // A computed variant (`action.variant`, a ternary, a lookup) — out of reach
  // by construction, never flagged.
  return null
}

/** Every mango `<Button>` NOT nested under a title component, across `roots`. */
function findOffenders(roots: string[]): Offender[] {
  const offenders: Offender[] = []
  for (const f of sourceFiles(roots, { extensions: [".tsx"], relativeTo: ROOT, skipTests: true })) {
    const src = stripComments(f.source, { keepLength: true })
    const sf = ts.createSourceFile(f.path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    let titleDepth = 0

    const visit = (node: ts.Node): void => {
      const isTitleEl =
        (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) && TITLE_TAGS.has(jsxTagName(node))
      if (isTitleEl) titleDepth++

      const isButtonEl =
        (ts.isJsxElement(node) && node.openingElement.tagName.getText() === "Button") ||
        (ts.isJsxSelfClosingElement(node) && node.tagName.getText() === "Button")
      if (isButtonEl) {
        const opening = ts.isJsxElement(node) ? node.openingElement : node
        const kind = mangoKind(opening)
        if (kind && titleDepth === 0) {
          const name = enclosingFunctionName(node, sf)
          offenders.push({
            key: `${f.rel}#${name}`,
            rel: f.rel,
            line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
            kind,
          })
        }
      }

      ts.forEachChild(node, visit)
      if (isTitleEl) titleDepth--
    }
    visit(sf)
  }
  return offenders
}

describe("R84 — mango lives only in the title component", () => {
  it("mango-in-title-only: no <Button variant=\"default\"> (stated or omitted) outside CollectionHeading/RecordScreen/RecordDetail/RecordChrome, or named in MANGO_OUTSIDE_TITLE_OK", () => {
    const offenders = findOffenders(ROOTS)
    const used = new Set<string>()
    const unexempt: string[] = []
    for (const o of offenders) {
      if (o.key in MANGO_OUTSIDE_TITLE_OK) {
        used.add(o.key)
        continue
      }
      unexempt.push(
        `${o.rel}:${o.line} — mango Button (variant ${o.kind}) outside a title component ` +
          `(key: "${o.key}"). Switch to variant="inverse", move it inside ` +
          `CollectionHeading/RecordScreen/RecordDetail/RecordChrome's own action(s) prop, ` +
          `or name "${o.key}" in MANGO_OUTSIDE_TITLE_OK with the real reason.`
      )
    }
    expect(unexempt, unexempt.join("\n")).toEqual([])

    const stale = Object.keys(MANGO_OUTSIDE_TITLE_OK).filter((k) => !used.has(k))
    expect(
      stale,
      `these MANGO_OUTSIDE_TITLE_OK entries match no offending Button any more — delete them:\n  ${stale.join("\n  ")}`
    ).toEqual([])
  })

  // THE RED PROOF — a primary (mango) button inside a dialog, the exact shape
  // this law exists to catch: no title component anywhere in sight.
  it("a primary button inside a dialog, with no title component in sight, is exactly what this census flags", () => {
    const dialog = `
      function ConfirmDialog() {
        return (
          <Dialog>
            <DialogContent>
              <DialogFooter>
                <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button onClick={onSave}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      }
    `
    const sf = ts.createSourceFile("confirm-dialog.tsx", dialog, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const offenders: { line: number; kind: string }[] = []
    let titleDepth = 0
    const visit = (node: ts.Node): void => {
      const isTitleEl =
        (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) && TITLE_TAGS.has(jsxTagName(node))
      if (isTitleEl) titleDepth++
      const isButtonEl =
        (ts.isJsxElement(node) && node.openingElement.tagName.getText() === "Button") ||
        (ts.isJsxSelfClosingElement(node) && node.tagName.getText() === "Button")
      if (isButtonEl) {
        const opening = ts.isJsxElement(node) ? node.openingElement : node
        const kind = mangoKind(opening)
        if (kind && titleDepth === 0) {
          offenders.push({ line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, kind })
        }
      }
      ts.forEachChild(node, visit)
      if (isTitleEl) titleDepth--
    }
    visit(sf)
    expect(offenders.length, "the Save button (variant omitted, so mango) is the one offender").toBe(1)
    expect(offenders[0].kind).toBe("omitted")
  })

  // THE GREEN PROOF, two shapes. (1) The same dialog's Save button recoloured
  // to the kit's black — no offender. (2) A mango button legitimately inside
  // CollectionHeading's own `action` prop — reached through a JSX attribute
  // initializer, not a JSX child, and still recognised as "inside the title".
  it("a black (inverse) button in the same dialog, and a mango button inside CollectionHeading's action prop, both pass clean", () => {
    const fixed = `
      function ConfirmDialog() {
        return (
          <Dialog>
            <DialogContent>
              <DialogFooter>
                <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button variant="inverse" onClick={onSave}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      }

      function AccountsScreen() {
        return (
          <CollectionHeading
            sectionKey="accounts"
            total={total}
            action={
              <Button size="icon" aria-label="Module settings" onClick={openSettings}>
                <Gear />
              </Button>
            }
          />
        )
      }
    `
    const sf = ts.createSourceFile("confirm-dialog-fixed.tsx", fixed, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const offenders: number[] = []
    let titleDepth = 0
    const visit = (node: ts.Node): void => {
      const isTitleEl =
        (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) && TITLE_TAGS.has(jsxTagName(node))
      if (isTitleEl) titleDepth++
      const isButtonEl =
        (ts.isJsxElement(node) && node.openingElement.tagName.getText() === "Button") ||
        (ts.isJsxSelfClosingElement(node) && node.tagName.getText() === "Button")
      if (isButtonEl) {
        const opening = ts.isJsxElement(node) ? node.openingElement : node
        const kind = mangoKind(opening)
        if (kind && titleDepth === 0) offenders.push(sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1)
      }
      ts.forEachChild(node, visit)
      if (isTitleEl) titleDepth--
    }
    visit(sf)
    expect(offenders, "neither button is an offender: one is inverse, the other sits inside CollectionHeading's action prop").toEqual([])
  })
})
