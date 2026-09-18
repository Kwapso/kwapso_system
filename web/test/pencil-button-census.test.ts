// R84's AMENDMENT — THE EDIT PEN IS NEVER BLACK OR MANGO, ON ANY SCREEN.
//
// The client's ruling, 18 Sep 2026, verbatim: "edit button is never black
// (even when it's only one). f.e. in ticket detail the edit buton is black."
//
// TWO REAL OFFENDERS THIS LAW WAS WRITTEN FOR, both caught reading the ruling
// back against the running app: `help-detail.tsx`'s standalone Edit pen
// carried `variant="inverse"` (the kit's black fill, reasoned there as "the
// one secondary slot beside the mango Close button" — a reading her ruling
// corrects rather than confirms); `meeting-detail.tsx`'s carried no `variant`
// at all, which is `Button`'s own default, mango. `shared/web/edit-pen-
// button.tsx` (`EditPenButton`) is the one shared, always-`variant="secondary"`
// answer — the kit's own documented shape for an icon-only control
// (button.tsx: "ch26 says an icon-only control is secondary anyway") — and
// every record screen that draws a pen now reaches for it.
//
// THE CENSUS, OFF THE DISK, THE SAME SHAPE `mango-title-only.test.ts` USES
// FOR R84's OWN LAW: every `<Button>` JSX element under `web/components/`
// whose subtree draws a `PencilSimple` glyph is an "edit pen button", and its
// own `variant` may be neither OMITTED (mango, the kit's own default) nor the
// literal string `"inverse"` (the kit's black fill) — every OTHER literal
// (`secondary`, `ghost`, `destructive`, …) passes, and a COMPUTED `variant`
// expression is out of reach by construction and never flagged, the same
// posture `mango-title-only.test.ts` takes on R82-shaped code the walker
// cannot resolve at scan time.
//
// SCOPED TO `web/components/` ONLY, matching the ruling's own instruction
// ("grep PencilSimple across web/components") — a `<Button>` inside
// `shared/web/edit-pen-button.tsx` itself is out of the walk's root, which is
// exactly right: that file IS the one place the variant is decided, once,
// for every caller.
//
// A `PencilSimple` GLYPH USED AS A `RecordAction` MENU ICON (`icon:
// <PencilSimple .../>`, handed to `RecordActionsMenu`) is NOT a `<Button>`
// element at all — the icon prop renders inside a `DropdownMenuItem`, which
// carries no `variant` and is unaffected by this ruling (it was never black
// or mango to begin with). The walk only ever matches a literal `<Button>`
// JSX tag, so these sites are invisible to it by construction, not exempted.

import { join } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

const ROOT = join(import.meta.dirname, "..", "..")
const ROOTS = [join(ROOT, "web", "components")]

type Offender = { rel: string; line: number; kind: "omitted" | "inverse" }

function jsxTagName(node: ts.JsxElement | ts.JsxSelfClosingElement): string {
  const tag = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName
  return tag.getText()
}

/** Whether the variant on a `<Button>`'s own opening tag is an offender —
 * `"omitted"` (no `variant` at all, mango by `Button`'s own default),
 * `"inverse"` (the literal black fill), or `null` (a compliant literal, or a
 * computed expression this static walk cannot resolve — out of reach by
 * construction, R82's own posture, never flagged). */
function offendingVariant(opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement): "omitted" | "inverse" | null {
  const attr = opening.attributes.properties.find(
    (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === "variant"
  )
  if (!attr) return "omitted"
  const init = attr.initializer
  const literal =
    init && ts.isStringLiteral(init)
      ? init.text
      : init && ts.isJsxExpression(init) && init.expression && ts.isStringLiteral(init.expression)
        ? init.expression.text
        : null
  if (literal === null) return null // computed — unreachable statically
  return literal === "inverse" ? "inverse" : null
}

/** Whether a `<Button>` element's own subtree draws a `PencilSimple` glyph
 * anywhere — a direct child, a conditional (`busy ? <Spinner/> :
 * <PencilSimple/>`), or nested one level inside a wrapper span. Walked from
 * the Button's OWN children only (never its attributes), so a `PencilSimple`
 * mentioned only in a sibling comment or an unrelated prop never counts. */
function drawsPencil(el: ts.JsxElement): boolean {
  let found = false
  const visit = (node: ts.Node): void => {
    if (found) return
    if ((ts.isJsxElement(node) && jsxTagName(node) === "PencilSimple") || (ts.isJsxSelfClosingElement(node) && jsxTagName(node) === "PencilSimple")) {
      found = true
      return
    }
    ts.forEachChild(node, visit)
  }
  for (const child of el.children) visit(child)
  return found
}

function censusSource(sf: ts.SourceFile): { line: number; kind: "omitted" | "inverse" }[] {
  const offenders: { line: number; kind: "omitted" | "inverse" }[] = []
  const visit = (node: ts.Node): void => {
    // Only a full `<Button>…</Button>` element can carry a PencilSimple
    // descendant — a self-closing `<Button/>` has no children to search.
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText() === "Button" && drawsPencil(node)) {
      const kind = offendingVariant(node.openingElement)
      if (kind) offenders.push({ line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, kind })
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return offenders
}

function findOffenders(roots: string[]): Offender[] {
  const offenders: Offender[] = []
  for (const f of sourceFiles(roots, { extensions: [".tsx"], relativeTo: ROOT, skipTests: true })) {
    const src = stripComments(f.source, { keepLength: true })
    const sf = ts.createSourceFile(f.path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    for (const o of censusSource(sf)) offenders.push({ rel: f.rel, line: o.line, kind: o.kind })
  }
  return offenders
}

describe("R84's amendment — the edit pen is never black or mango", () => {
  it("no <Button> drawing a PencilSimple glyph carries variant=\"inverse\" or no variant at all, anywhere under web/components", () => {
    const offenders = findOffenders(ROOTS)
    const messages = offenders.map(
      (o) =>
        `${o.rel}:${o.line} — an edit-pen Button (variant ${o.kind}) reads as black/mango. ` +
        `Use shared/web/edit-pen-button.tsx's EditPenButton, or pass variant="secondary" ` +
        `(the kit's own quiet, icon-only answer).`
    )
    expect(offenders, messages.join("\n")).toEqual([])
  })

  // THE RED PROOF — the exact two shapes the client pointed at: black
  // (`inverse`) and unstated (mango by default).
  it("flags a pencil button with variant=\"inverse\" and one with no variant at all", () => {
    const src = `
      function TicketDetail() {
        return (
          <Button variant="inverse" size="icon" onClick={edit} aria-label="Edit">
            <PencilSimple className="size-3.5" />
          </Button>
        )
      }
      function MeetingDetail() {
        return (
          <Button size="icon" onClick={edit} aria-label="Edit">
            <PencilSimple className="size-3.5" />
          </Button>
        )
      }
    `
    const sf = ts.createSourceFile("offenders.tsx", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const offenders = censusSource(sf)
    expect(offenders.map((o) => o.kind).sort()).toEqual(["inverse", "omitted"])
  })

  // THE GREEN PROOF — `secondary`/`ghost` pass; a `PencilSimple` used only as
  // a RecordAction menu icon (never inside a literal `<Button>` tag) is
  // invisible to the walk, not flagged and not exempted.
  it("passes a quiet (secondary/ghost) pencil button, and never sees a menu-icon PencilSimple at all", () => {
    const src = `
      function RecordDetail() {
        const overflow = [
          { key: "archive", label: "Archive", icon: <PencilSimple className="size-3.5" /> },
        ]
        return (
          <>
            <Button variant="secondary" size="icon" onClick={edit} aria-label="Edit">
              <PencilSimple className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={edit} aria-label="Edit">
              <PencilSimple className="size-3.5" />
            </Button>
            <RecordActionsMenu actions={overflow} />
          </>
        )
      }
    `
    const sf = ts.createSourceFile("clean.tsx", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(censusSource(sf)).toEqual([])
  })
})
