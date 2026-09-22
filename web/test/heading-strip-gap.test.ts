// @vitest-environment node
//
// THE GAP ABOVE A FOLDER TAB STRIP IS ONE TOKEN, NEVER A PER-SCREEN LITERAL.
// Aurora, verbatim, 22 Sep 2026: "can we reduce the spacing above the folder
// tabs? there's too much."
//
// MEASURED: the gap came entirely from a plain `gap-*` utility on each
// screen's own wrapper column — `<CollectionHeading>` (or, on the three
// bespoke main screens that carry no `<CollectionHeading>`, a bare
// `<Headline>`) and the folder-tab-bearing body as that wrapper's own two
// children — and it disagreed screen by screen: `gap-6` (24px) on ten
// screens against `gap-4` (16px) on four. `renderFolderTabs`'s own strip
// (`shared/web/screen-engine/tabs-view.tsx`) contributes nothing above
// itself (R83's second amendment already settled that), so every pixel
// measured was this wrapper's own literal.
//
// FIXED: `--heading-strip-gap` (`web/app/globals.css`, `var(--space-4)`,
// 16px — the smaller of the two numbers in use, per her "too much" ruling)
// is the one place this seam is decided now. Every wrapper reads
// `gap-[var(--heading-strip-gap)]`, never a bare `gap-4`/`gap-6`.
//
// THE CENSUS, so a fifteenth screen cannot re-spend a literal here unnoticed.
// A CANDIDATE is a `<div>`/`<section>` whose own `className` carries BOTH
// `flex-col` (a column, so its `gap` is vertical rhythm between stacked
// children, the shape this seam is) and a bare `gap-4` or `gap-6` TOKEN
// (never `gap-[var(--heading-strip-gap)]`, and never a fractional/dense
// step this law is not about) — and whose own JSX SUBTREE (this element and
// everything inside it, read off the real syntax tree the same way
// `head-actions-centred.test.ts`/R48/R67 already do, so a nested, unrelated
// `gap-4` several layers below a heading and a tab strip elsewhere in the
// same huge screen file cannot fool a plain text window) carries BOTH:
//
//   · A HEAD MARKER — `<CollectionHeading` or `<Headline`, the two shapes a
//     screen's own head takes (a collection's counted heading, or the three
//     bespoke main screens' bare page title).
//   · A FOLDER-TAB MARKER — `renderFolderTabs(`, `folderTabs={`,
//     `<SectionWithCreate`, or `tabs={{` (a `FolderTabStrip` built inline,
//     the shape every real call site takes; a variable handed to `tabs`
//     rather than an object literal is not this law's concern, since this
//     census cannot tell a `FolderTabStrip` variable from any other node).
//
// A row carrying both without the token is a finding. `HEADING_STRIP_GAP_EXEMPT`
// is the reasoned way out, keyed by `{file, contains}` (the offending
// element's own opening-tag text, never a line number, the shape
// `HEAD_ACTIONS_CENTRED_EXEMPT`/`BUTTON_SIZE_EXEMPT`/`ID_CHIP_EXEMPT`
// already take), empty on the day this law shipped: every wrapper the sweep
// found was fixed, not exempted.

import { join } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { sourceFiles } from "@shared/rules/source-scan"

const REPO_ROOT = join(__dirname, "..", "..")

const ROOTS = [
  join(REPO_ROOT, "web", "components"),
  join(REPO_ROOT, "web-portal", "components"),
  join(REPO_ROOT, "shared", "web"),
]

const HEAD_RE = /<CollectionHeading\b|<Headline\b/
const FOLDER_TABS_RE = /renderFolderTabs\(|folderTabs=\{|<SectionWithCreate\b|tabs=\{\{/
const BARE_GAP_RE = /(^|\s)gap-[46](\s|$)/

/** Reasoned exemptions, keyed by `{file, contains}` — the census's own
 * opening-tag text, never a line number (`never-key-an-exemption-by-line`).
 * Empty on the day this law shipped. */
export const HEADING_STRIP_GAP_EXEMPT: { file: string; contains: string; why: string }[] = []

function classNameOf(opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement): string {
  const parts: string[] = []
  for (const a of opening.attributes.properties) {
    if (!ts.isJsxAttribute(a) || a.name.getText() !== "className") continue
    const collect = (n: ts.Node) => {
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) parts.push(n.text)
      ts.forEachChild(n, collect)
    }
    if (a.initializer) collect(a.initializer)
  }
  return parts.join(" ")
}

function hasClass(className: string, cls: string): boolean {
  return new RegExp(`(^|\\s)${cls}(\\s|$)`).test(className)
}

interface Finding {
  rel: string
  contains: string
}

function candidatesIn(sf: ts.SourceFile, rel: string): Finding[] {
  const out: Finding[] = []
  const visit = (node: ts.Node): void => {
    if (ts.isJsxElement(node)) {
      const tag = node.openingElement.tagName.getText(sf)
      if (tag === "div" || tag === "section") {
        const className = classNameOf(node.openingElement)
        if (hasClass(className, "flex-col") && BARE_GAP_RE.test(className)) {
          const text = node.getText(sf)
          if (HEAD_RE.test(text) && FOLDER_TABS_RE.test(text)) {
            out.push({ rel, contains: node.openingElement.getText(sf) })
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return out
}

function findings(): Finding[] {
  const out: Finding[] = []
  for (const f of sourceFiles(ROOTS, { extensions: [".tsx"], relativeTo: REPO_ROOT, skipTests: true })) {
    const sf = ts.createSourceFile(f.path, f.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    out.push(...candidatesIn(sf, f.rel))
  }
  return out
}

function excused(rel: string, contains: string) {
  return HEADING_STRIP_GAP_EXEMPT.find((e) => e.file === rel && contains.includes(e.contains))
}

function stillOpen(all: Finding[], rel: string, contains: string): boolean {
  return all.some((f) => f.rel === rel && f.contains.includes(contains))
}

describe("heading-strip-gap — the gap above a folder tab strip is the shared token", () => {
  it(
    'no <div>/<section> carrying a head marker and a folder-tab marker in one flex-col column spends a bare gap-4/gap-6. ' +
      'Aurora, verbatim, 22 Sep 2026: "can we reduce the spacing above the folder tabs? there\'s too much."',
    () => {
      const found = findings()
      const unexempt = found.filter((f) => !excused(f.rel, f.contains))
      expect(
        unexempt,
        "these wrappers carry a head marker (<CollectionHeading/<Headline) and a folder-tab marker " +
          "(renderFolderTabs(/folderTabs={/<SectionWithCreate/tabs={{) with a bare gap-4/gap-6 instead of " +
          "gap-[var(--heading-strip-gap)]. Read the token's own comment in web/app/globals.css, or name the " +
          "row in HEADING_STRIP_GAP_EXEMPT with the reason:\n  " +
          unexempt.map((f) => `${f.rel}  ${f.contains.split("\n")[0].slice(0, 100)}`).join("\n  ")
      ).toEqual([])
    }
  )

  it("HEADING_STRIP_GAP_EXEMPT names only real, still-open findings", () => {
    const all = findings()
    const stale = HEADING_STRIP_GAP_EXEMPT.filter((e) => !stillOpen(all, e.file, e.contains))
    expect(
      stale,
      "these HEADING_STRIP_GAP_EXEMPT entries no longer match a real finding. Fixed, or the source moved on, " +
        "delete the entry:\n  " + stale.map((e) => `${e.file}  ${e.contains}`).join("\n  ")
    ).toEqual([])
  })

  it("an exemption's contains matches only one current finding in its file", () => {
    const all = findings()
    const ambiguous: string[] = []
    for (const e of HEADING_STRIP_GAP_EXEMPT) {
      const hits = all.filter((f) => f.rel === e.file && f.contains.includes(e.contains))
      if (hits.length > 1) ambiguous.push(`${e.file}  "${e.contains}" matches ${hits.length} findings`)
    }
    expect(
      ambiguous,
      "a HEADING_STRIP_GAP_EXEMPT entry excuses more than one site, make it specific:\n  " + ambiguous.join("\n  ")
    ).toEqual([])
  })

  // PROVEN NOT VACUOUS, against synthetic source only — the same shape
  // `head-actions-centred.test.ts`'s own last two cases take.
  it("catches a synthetic heading+tabs wrapper spending a bare gap-6", () => {
    const synthetic = [
      "function X() {",
      "  return (",
      '    <div className="flex flex-col gap-6">',
      '      <CollectionHeading sectionKey="x" total={total} />',
      "      <SectionWithCreate folderTabs={{ config, value, onValueChange }}>{children}</SectionWithCreate>",
      "    </div>",
      "  )",
      "}",
      "",
    ].join("\n")
    const sf = ts.createSourceFile("synthetic.tsx", synthetic, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const found = candidatesIn(sf, "synthetic.tsx")
    expect(found.length).toBe(1)
    expect(found[0].contains).toContain("gap-6")
  })

  it("does not flag the same wrapper once it reads the token", () => {
    const synthetic = [
      "function X() {",
      "  return (",
      '    <div className="flex flex-col gap-[var(--heading-strip-gap)]">',
      '      <CollectionHeading sectionKey="x" total={total} />',
      "      <SectionWithCreate folderTabs={{ config, value, onValueChange }}>{children}</SectionWithCreate>",
      "    </div>",
      "  )",
      "}",
      "",
    ].join("\n")
    const sf = ts.createSourceFile("synthetic.tsx", synthetic, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(candidatesIn(sf, "synthetic.tsx")).toEqual([])
  })

  it("does not flag a head+tabs wrapper that is not a column (no flex-col)", () => {
    const synthetic = [
      "function X() {",
      "  return (",
      '    <div className="flex gap-6">',
      '      <CollectionHeading sectionKey="x" total={total} />',
      "      <SectionWithCreate folderTabs={{ config, value, onValueChange }}>{children}</SectionWithCreate>",
      "    </div>",
      "  )",
      "}",
      "",
    ].join("\n")
    const sf = ts.createSourceFile("synthetic.tsx", synthetic, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(candidatesIn(sf, "synthetic.tsx")).toEqual([])
  })
})
