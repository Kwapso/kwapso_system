// EVERY `<FileUpload` MOUNT FEEDS THE TILE GRID — AND BUILDS ITS ITEMS THROUGH
// THE ONE SHARED SEAM, NEVER BY HAND.
//
// The kit moved to v1.2.110 (shared/ui/CHANGELOG.md, "OPTION B"): the moment a
// file lands, the zone stops drawing a name-only row and becomes a grid of
// tiles — a picture for an image, the kit's own icon-and-tag for anything
// else. The client's ruling, 17 Sep 2026, verbatim: "I can really see the
// images that I have already uploaded. They don't show only as the name, but I
// also see the image itself, or, if it's a document, a preview."
//
// A tile only ever shows a picture if the call site HANDS ONE OVER — the kit
// draws nothing it wasn't given (`FileUploadItem.preview`'s own doc: "This
// component never creates one itself"). So a `<FileUpload` mount with no
// `files` prop at all is exactly the old row list wearing the new grid's
// clothes: the client's ask unmet, silently, because the component still
// renders. This census catches that.
//
// AND IT IS DERIVED, THE SAME SHAPE `fixed-props-are-fact-rows.test.ts` USES:
// every `<FileUpload` mount is found off the source, not hand-listed, so a
// tenth call site next month is caught rather than invisible until somebody
// remembers to add it to a list here.
//
// TWO CLAUSES:
//   1. EVERY MOUNT PASSES `files`. A caller with nothing to show yet passes an
//      empty array — that is a real, considered answer ("nothing picked, none
//      stored") — but an ABSENT prop is a call site that never asked the
//      question.
//   2. THE ENCLOSING COMPONENT BUILDS THOSE ITEMS THROUGH shared/web/upload-
//      items.ts — `usePickedFileItems` (a picked browser `File`, not yet
//      sent — an object URL preview for an image) or `storedFileToUploadItem`
//      (an already-stored file, R40's own shape — a served URL run through
//      `safeSrc`). A hand-built `{ id, name }` literal is exactly the
//      regression this file exists to catch: it compiles, the tile grid still
//      renders, and it never carries a `preview` or a `type`, so it draws the
//      same bare name-and-icon tile the OLD row already drew. Checked at the
//      COMPONENT level, one level of indirection above the mount itself — the
//      same allowance `fixed-props-are-fact-rows.test.ts` makes for a local
//      alias — because the real call sites build a combined `items`/`fileTiles`
//      const above the JSX and hand it down as one expression, never inline.

import { join } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { sourceFiles } from "../../shared/rules/source-scan"

const ROOT = join(import.meta.dirname, "..", "..")

const HELPER_NAMES = ["usePickedFileItems", "storedFileToUploadItem"]

type Finding = {
  /** File-relative path, and roughly which component/function the mount sits
   * in — a name, not a guaranteed-unique key, only for a readable message. */
  file: string
  component: string
  hasFilesProp: boolean
  usesHelper: boolean
}

/** The nearest enclosing function declaration or `const X = (...) => {}` /
 * `const X = function () {}` — the same "component-level, one alias deep"
 * granularity `fixed-props-are-fact-rows.test.ts` already uses, and the right
 * one here: the real call sites build their combined item list in the
 * COMPONENT body and hand it to a `files=` prop that may sit inside a nested
 * helper (`renderInput` in shared/web/screen-engine/screen-renderer.tsx), not
 * only inline at the mount. */
function enclosingComponent(node: ts.Node): { name: string; text: string } | undefined {
  let n: ts.Node | undefined = node
  while (n) {
    if (ts.isFunctionDeclaration(n) && n.name) {
      return { name: n.name.text, text: n.getText() }
    }
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.initializer &&
      (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))
    ) {
      return { name: n.name.text, text: n.getText() }
    }
    n = n.parent
  }
  return undefined
}

function findFilesProp(opening: ts.JsxOpeningLikeElement): ts.JsxAttribute | undefined {
  for (const attr of opening.attributes.properties) {
    if (ts.isJsxAttribute(attr) && attr.name.getText() === "files") return attr
  }
  return undefined
}

function derivedFindings(files: { path: string; rel: string; source: string }[]): Finding[] {
  const out: Finding[] = []
  for (const f of files) {
    if (!f.source.includes("<FileUpload")) continue
    const tree = ts.createSourceFile(f.path, f.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const visit = (node: ts.Node) => {
      const opening = ts.isJsxSelfClosingElement(node)
        ? node
        : ts.isJsxElement(node)
          ? node.openingElement
          : undefined
      if (opening && ts.isIdentifier(opening.tagName) && opening.tagName.text === "FileUpload") {
        const filesAttr = findFilesProp(opening)
        const enclosing = enclosingComponent(node)
        const component = enclosing?.name ?? "(module scope)"
        const usesHelper = enclosing ? HELPER_NAMES.some((h) => enclosing.text.includes(`${h}(`)) : false
        out.push({
          file: f.rel,
          component,
          hasFilesProp: !!filesAttr,
          usesHelper,
        })
      }
      ts.forEachChild(node, visit)
    }
    visit(tree)
  }
  return out
}

function repoFindings(): Finding[] {
  const files = sourceFiles([join(ROOT, "web"), join(ROOT, "shared", "web")], {
    extensions: [".tsx"],
    relativeTo: ROOT,
    skipTests: true,
  })
  return derivedFindings(files)
}

describe("every <FileUpload mount feeds the tile grid through shared/web/upload-items.ts", () => {
  it("the derivation finds real mounts — a walk that finds nothing is not a census", () => {
    const findings = repoFindings()
    expect(findings.length, "found no <FileUpload mount — has the walk gone blind?").toBeGreaterThanOrEqual(9)
  })

  it("every mount passes a files prop", () => {
    const findings = repoFindings()
    const offenders = findings.filter((f) => !f.hasFilesProp)
    expect(
      offenders.map((f) => `${f.file}: <${f.component}> mounts <FileUpload> with no files prop`),
      "client ruling, 17 Sep 2026: every FileUpload mount must feed the tile grid, " +
        "even an empty array — an absent files prop is a mount that never asked."
    ).toEqual([])
  })

  it("every files prop is built through usePickedFileItems / storedFileToUploadItem", () => {
    const findings = repoFindings()
    const offenders = findings.filter((f) => f.hasFilesProp && !f.usesHelper)
    expect(
      offenders.map((f) => `${f.file}: <${f.component}> builds FileUpload items without shared/web/upload-items.ts`),
      "a hand-built { id, name } item compiles and still renders a tile, but " +
        "carries no preview and no type — the same bare tile the old row already " +
        "drew. Build items through usePickedFileItems (a picked File) or " +
        "storedFileToUploadItem (an already-stored file), never by hand."
    ).toEqual([])
  })

  // ── THE RED PROOF ────────────────────────────────────────────────────────
  it("RED PROOF: a mount with no files prop, and one with a hand-built item, are both caught", () => {
    const noFilesProp = `
import { FileUpload } from "@shared/ui/components/file-upload/file-upload"

export function WidgetDialog({ onPick }: { onPick: (files: File[]) => void }) {
  return <FileUpload onFilesSelected={onPick} />
}
`
    const handBuilt = `
import { FileUpload } from "@shared/ui/components/file-upload/file-upload"

export function WidgetDialog({ pending }: { pending: File[] }) {
  const items = pending.map((f) => ({ id: f.name, name: f.name }))
  return <FileUpload files={items} onFilesSelected={() => {}} />
}
`
    const fixed = `
import { FileUpload } from "@shared/ui/components/file-upload/file-upload"
import { usePickedFileItems } from "@shared/web/upload-items"

export function WidgetDialog({ pending }: { pending: File[] }) {
  const items = usePickedFileItems(pending)
  return <FileUpload files={items} onFilesSelected={() => {}} />
}
`
    const a = derivedFindings([{ path: "/tmp/fixture-a.tsx", rel: "fixture-a.tsx", source: noFilesProp }])
    expect(a).toEqual([{ file: "fixture-a.tsx", component: "WidgetDialog", hasFilesProp: false, usesHelper: false }])

    const b = derivedFindings([{ path: "/tmp/fixture-b.tsx", rel: "fixture-b.tsx", source: handBuilt }])
    expect(b).toEqual([{ file: "fixture-b.tsx", component: "WidgetDialog", hasFilesProp: true, usesHelper: false }])

    const c = derivedFindings([{ path: "/tmp/fixture-c.tsx", rel: "fixture-c.tsx", source: fixed }])
    expect(c).toEqual([{ file: "fixture-c.tsx", component: "WidgetDialog", hasFilesProp: true, usesHelper: true }])
  })
})
