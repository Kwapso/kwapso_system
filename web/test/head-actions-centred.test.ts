// @vitest-environment node
//
// R100, THE GEAR SETTINGS BUTTON ALIGNS TO THE MIDDLE HORIZONTAL OF THE TITLE,
// EVERYWHERE. Aurora, verbatim, 21 Sep 2026, reviewing the deployed tickets
// module (UI-RULEBOOK.md L43): "EVERYWHERE (not only tickets) align the gear
// settinsvvutton to middle horozotnal of title."
//
// THE KIT'S OWN `Title` COMPOSITION ALREADY DOES THIS, since v1.2.146 — every
// screen drawn through `RecordDetail`/`RecordChrome`/`screen-renderer.tsx`/
// `collection-frame.tsx` centres its action on the title line for free. This
// law is about the app's OWN hand-rolled rows: a `<div>`/`<section>` a
// component wrote itself, carrying a title beside an action, that never
// reached for the kit's composition and drew the line by hand instead —
// exactly the two shapes the client's own review found (`web/components/
// records/collection-heading.tsx`'s `action` row, `items-start`; `web/
// components/screens/kwapso-screen.tsx`'s title+pencil+gear row, also
// `items-start`, and stacked over a subtitle besides) plus a third the same
// sweep turned up (`web-portal/components/collection-heading.tsx`'s own
// `action` row, `items-baseline`).
//
// THE CENSUS, so a fourth one is never left for her to find. A CANDIDATE is a
// `<div>`/`<section>` whose own `className` carries `flex` as a class TOKEN,
// never `flex-col` (a column stack has no "beside the title" question — this
// law is about the CROSS axis of a ROW), and never `items-center` already,
// whose own JSX SUBTREE (this element and everything inside it, read off the
// real syntax tree rather than a text window — the same move R48/R67 already
// make, so a `{…}` expression or a nested nephew element can't fool a plain
// regex into reading past this element's own closing tag) carries BOTH:
//
//   · A TITLE MARKER — `<h1`, `<Title` (the kit composition, for a hand-rolled
//     row built beside a call to it rather than through it), `<Headline`, or
//     a bare `{heading}`/`{title}` expression (a variable holding the title
//     node, the shape both `CollectionHeading`s take).
//   · AN ACTION MARKER — `ModuleSettingsGear` (mounted directly), a bare
//     `{action}`/`{actions}` expression (a prop the row forwards, the same
//     shape both `CollectionHeading`s take), or `headActions`.
//
// A ROW CARRYING BOTH WITHOUT `items-center` is a finding, exactly the shape
// every `<CollectionHeading action={…}>` caller inherits its fix from one
// seam through, and `kwapso-screen.tsx`'s own restructure (the title split
// onto its own row, away from the subtitle) proves the other half of the law:
// a stacked title-plus-subtitle centres the action against the title ALONE,
// which this census cannot verify by itself (it cannot tell "this row also
// holds a subtitle" from "this row is the title alone") — that half is read,
// not derived, the same way `sections-stand-on-paper.test.ts`'s own header
// says a structural census proves the SHAPE was reached for, not the pixel
// result. `HEAD_ACTIONS_CENTRED_EXEMPT` is the reasoned, rot-checked way out,
// keyed by `{file, contains}` (the offending row's own opening-tag text,
// never a line number, the same shape `BUTTON_SIZE_EXEMPT`/`ID_CHIP_EXEMPT`
// already take), empty on the day this law shipped: every row the sweep found
// was fixed, not exempted.
//
// EXTENDED 22 SEP 2026 - RULING ONE, THE SAME CENTRING BUG IN A SHAPE THE
// CENSUS ABOVE COULD NOT SEE. Aurora, verbatim: "on detail screens, the title
// buttons need to be alignes with the title! currently they are slightly
// abovem thats wrong." Measured: the head actions row sat 17-18px above the
// title text's own optical centre, identically on every detail screen - and
// the check above passed, because it is LITERALLY TRUE that the row is
// centred against the heading BOX; the box was the bug. `web/components/
// records/record-chrome.tsx` used to pack the identity-chip pill row INSIDE
// the same node it handed the kit's `title` prop (`titleBlock`, above
// `identityChips` as its own flex-col FIRST child, the real heading second),
// so `Title`'s own `items-center` row - which the census above exists to
// require everywhere else - measured a composite of pills-plus-heading
// rather than the heading's own line. Fixed the kit's own way, not an app
// hack: `RecordDetail` gained a real `aboveTitle` slot (kit v1.2.158, a
// plain SIBLING of `<Title>`, the identical shape `meta` already is for a
// row BELOW), and the pills now ride there instead of inside `title`.
//
// THE SECOND CENSUS, so `title` can never again become a dumping ground for
// content that belongs beside it rather than inside it. A CANDIDATE is any
// `title={…}` JSX attribute (read off the real syntax tree, not a text
// window, the same discipline as the census above) on `<RecordChrome`/
// `<RecordDetail` - the two components whose `title` prop feeds straight
// into the kit's `Title` composition, so anything but the heading itself
// inside it reopens exactly this bug. Its own subtree is read for a CHIP
// MARKER (`<Badge`, `RecordRef`, `identityChips` - the shapes an identity
// row actually takes) and a HEADING MARKER (`clampRecordHeading(`, `<h1`,
// `<Title`, `<Headline`). A finding is a chip marker appearing BEFORE the
// first heading marker in the attribute's own source text - a block sibling
// ABOVE the title text, packed inside the title node rather than passed
// through `aboveTitle` beside it. `TITLE_CHIP_ABOVE_EXEMPT` is the reasoned
// way out, same `{file, contains}` shape, empty the day this shipped.
//
// PROVEN BY PUTTING THE CHIPS BACK: the last two cases below restore the
// PRE-FIX shape of `record-chrome.tsx`'s own `titleBlock` as a synthetic
// fixture and watch the extended census fail, then prove the current,
// fixed shape (chips passed through `aboveTitle`, `title` holding only the
// heading/subtitle) passes clean - the same proof-of-red discipline the
// last two cases of the FIRST census already use.

import { join } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { sourceFiles } from "@shared/rules/source-scan"
import { HEAD_ACTIONS_CENTRED_EXEMPT } from "@shared/rules/registry"

const REPO_ROOT = join(__dirname, "..", "..")

const ROOTS = [
  join(REPO_ROOT, "web", "components"),
  join(REPO_ROOT, "web-portal", "components"),
  join(REPO_ROOT, "shared", "web"),
]

const TITLE_RE = /<h1\b|<Title\b|<Headline\b|\{heading\}|\{title\}/
const ACTION_RE = /ModuleSettingsGear|\{action\}|\{actions\}|headActions/

interface Finding {
  rel: string
  contains: string
}

/** Every string literal anywhere inside this element's `className` — a
 * `cn(...)`/ternary/`cva` call included, not only a plain string — the same
 * helper `sections-stand-on-paper.test.ts` and `table-column-budget`'s own
 * census already carry under this exact name and shape. */
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

/** Walks a parsed file (or a synthetic one, for the proof-of-red tests below)
 * for every `<div>`/`<section>` row this law reaches. */
function candidatesIn(sf: ts.SourceFile, rel: string): Finding[] {
  const out: Finding[] = []
  const visit = (node: ts.Node): void => {
    if (ts.isJsxElement(node)) {
      const tag = node.openingElement.tagName.getText(sf)
      if (tag === "div" || tag === "section") {
        const className = classNameOf(node.openingElement)
        if (
          hasClass(className, "flex") &&
          !hasClass(className, "flex-col") &&
          !hasClass(className, "items-center")
        ) {
          const text = node.getText(sf)
          if (TITLE_RE.test(text) && ACTION_RE.test(text)) {
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
  return HEAD_ACTIONS_CENTRED_EXEMPT.find((e) => e.file === rel && contains.includes(e.contains))
}

function stillOpen(all: Finding[], rel: string, contains: string): boolean {
  return all.some((f) => f.rel === rel && f.contains.includes(contains))
}

describe("R100, the gear settings button aligns to the middle horizontal of the title", () => {
  it(
    'no <div>/<section> carrying a title marker and an action marker in one flex row is missing items-center, unnamed. ' +
      'Aurora, verbatim, 21 Sep 2026: "EVERYWHERE (not only tickets) align the gear settinsvvutton to middle horozotnal of title."',
    () => {
      const found = findings()
      const unexempt = found.filter((f) => !excused(f.rel, f.contains))
      expect(
        unexempt,
        "these rows carry a title marker (<h1/<Title/<Headline/{heading}/{title}) and an action marker " +
          "(ModuleSettingsGear/{action}/{actions}/headActions) in one flex row with no items-center. Add " +
          "items-center (centred on the title element alone if the row also holds a subtitle), or name the " +
          "row in HEAD_ACTIONS_CENTRED_EXEMPT with the reason:\n  " +
          unexempt.map((f) => `${f.rel}  ${f.contains.split("\n")[0].slice(0, 100)}`).join("\n  ")
      ).toEqual([])
    }
  )

  it("HEAD_ACTIONS_CENTRED_EXEMPT names only real, still-open findings", () => {
    const all = findings()
    const stale = HEAD_ACTIONS_CENTRED_EXEMPT.filter((e) => !stillOpen(all, e.file, e.contains))
    expect(
      stale,
      "these HEAD_ACTIONS_CENTRED_EXEMPT entries no longer match a real finding. Fixed, or the source moved " +
        "on, delete the entry:\n  " + stale.map((e) => `${e.file}  ${e.contains}`).join("\n  ")
    ).toEqual([])
  })

  it("an exemption's contains matches only one current finding in its file", () => {
    const all = findings()
    const ambiguous: string[] = []
    for (const e of HEAD_ACTIONS_CENTRED_EXEMPT) {
      const hits = all.filter((f) => f.rel === e.file && f.contains.includes(e.contains))
      if (hits.length > 1) ambiguous.push(`${e.file}  "${e.contains}" matches ${hits.length} findings`)
    }
    expect(
      ambiguous,
      "a HEAD_ACTIONS_CENTRED_EXEMPT entry excuses more than one site, make it specific:\n  " + ambiguous.join("\n  ")
    ).toEqual([])
  })

  // PROVEN NOT VACUOUS, against synthetic source only — the same shape
  // `button-sizes.test.ts`'s own last two cases take.
  it("catches a synthetic title+gear row missing items-center", () => {
    const synthetic = [
      "function X() {",
      "  return (",
      '    <div className="flex items-start justify-between gap-3">',
      "      <Headline as=\"h1\">{title}</Headline>",
      "      <ModuleSettingsGear teamId={teamId} segment=\"x\" />",
      "    </div>",
      "  )",
      "}",
      "",
    ].join("\n")
    const sf = ts.createSourceFile("synthetic.tsx", synthetic, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const found = candidatesIn(sf, "synthetic.tsx")
    expect(found.length).toBe(1)
    expect(found[0].contains).toContain("items-start")
  })

  it("does not flag the same row once it carries items-center", () => {
    const synthetic = [
      "function X() {",
      "  return (",
      '    <div className="flex items-center justify-between gap-3">',
      "      <Headline as=\"h1\">{title}</Headline>",
      "      <ModuleSettingsGear teamId={teamId} segment=\"x\" />",
      "    </div>",
      "  )",
      "}",
      "",
    ].join("\n")
    const sf = ts.createSourceFile("synthetic.tsx", synthetic, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(candidatesIn(sf, "synthetic.tsx")).toEqual([])
  })

  it("does not flag a column stack (flex-col) — this law is about a row's cross axis", () => {
    const synthetic = [
      "function X() {",
      "  return (",
      '    <div className="flex flex-col items-start gap-3">',
      "      <Headline as=\"h1\">{title}</Headline>",
      "      <ModuleSettingsGear teamId={teamId} segment=\"x\" />",
      "    </div>",
      "  )",
      "}",
      "",
    ].join("\n")
    const sf = ts.createSourceFile("synthetic.tsx", synthetic, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(candidatesIn(sf, "synthetic.tsx")).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────
// R100's SECOND CENSUS - a `title={…}` node may carry nothing above its own
// heading. See this file's header comment, "EXTENDED 22 SEP 2026", for the
// full account.
// ─────────────────────────────────────────────────────────────────────────

import { TITLE_CHIP_ABOVE_EXEMPT } from "@shared/rules/registry"

const TITLE_HOST_TAGS = new Set(["RecordChrome", "RecordDetail"])
const CHIP_MARKER_RE = /<Badge\b|RecordRef|identityChips/
const HEADING_MARKER_RE = /clampRecordHeading\(|<h1\b|<Title\b|<Headline\b/

interface TitleFinding {
  rel: string
  contains: string
}

/** Every `const <name> = <initializer>` in the file, by name - LAST
 * declaration wins, a deliberately simple heuristic that is enough for a
 * single-component census. A `title={…}` attribute almost never holds an
 * inline JSX literal in this codebase (`record-chrome.tsx`'s own
 * `titleBlock` is a `const` built earlier in the function and referenced by
 * NAME at the call site), so resolving the identifier back to what it was
 * actually BUILT FROM is what makes this census see real code rather than
 * only a synthetic fixture that happens to inline the JSX. */
function constDeclarationsIn(sf: ts.SourceFile): Map<string, string> {
  const decls = new Map<string, string>()
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      decls.set(node.name.text, node.initializer.getText(sf))
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return decls
}

/** Every `title={…}` JSX attribute on a title-host tag, whose own subtree -
 * the attribute's initializer expression, or, when that expression is a
 * bare identifier, the `const` it was built from (see `constDeclarationsIn`)
 * - carries a chip marker BEFORE the first heading marker: a block sibling
 * above the title text, packed inside the node the kit centres `actions`
 * against. */
function titleChipCandidatesIn(sf: ts.SourceFile, rel: string): TitleFinding[] {
  const out: TitleFinding[] = []
  const decls = constDeclarationsIn(sf)
  const visit = (node: ts.Node): void => {
    if (
      (ts.isJsxElement(node) && TITLE_HOST_TAGS.has(node.openingElement.tagName.getText(sf))) ||
      (ts.isJsxSelfClosingElement(node) && TITLE_HOST_TAGS.has(node.tagName.getText(sf)))
    ) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node
      for (const attr of opening.attributes.properties) {
        if (!ts.isJsxAttribute(attr) || attr.name.getText() !== "title") continue
        if (!attr.initializer || !ts.isJsxExpression(attr.initializer) || !attr.initializer.expression) continue
        const expr = attr.initializer.expression
        const text = ts.isIdentifier(expr) ? (decls.get(expr.text) ?? expr.getText(sf)) : expr.getText(sf)
        const chipAt = text.search(CHIP_MARKER_RE)
        if (chipAt === -1) continue
        const headingAt = text.search(HEADING_MARKER_RE)
        if (headingAt === -1 || chipAt < headingAt) {
          out.push({ rel, contains: attr.getText(sf).slice(0, 120) })
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return out
}

function titleChipFindings(): TitleFinding[] {
  const out: TitleFinding[] = []
  for (const f of sourceFiles(ROOTS, { extensions: [".tsx"], relativeTo: REPO_ROOT, skipTests: true })) {
    const sf = ts.createSourceFile(f.path, f.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    out.push(...titleChipCandidatesIn(sf, f.rel))
  }
  return out
}

function titleChipExcused(rel: string, contains: string) {
  return TITLE_CHIP_ABOVE_EXEMPT.find((e) => e.file === rel && contains.includes(e.contains))
}

function titleChipStillOpen(all: TitleFinding[], rel: string, contains: string): boolean {
  return all.some((f) => f.rel === rel && f.contains.includes(contains))
}

describe("R100 (amended), a title node carries nothing above its own heading", () => {
  it(
    'no title={…} attribute on <RecordChrome>/<RecordDetail> carries a chip marker before its first heading marker, unnamed. ' +
      'Aurora, verbatim, 22 Sep 2026: "on detail screens, the title buttons need to be alignes with the title! currently they are slightly abovem thats wrong."',
    () => {
      const found = titleChipFindings()
      const unexempt = found.filter((f) => !titleChipExcused(f.rel, f.contains))
      expect(
        unexempt,
        "these title={…} attributes carry a chip marker (<Badge/RecordRef/identityChips) before their first " +
          "heading marker (clampRecordHeading(/<h1/<Title/<Headline) - pass the chip row through aboveTitle " +
          "instead (kit v1.2.158), or name the attribute in TITLE_CHIP_ABOVE_EXEMPT with the reason:\n  " +
          unexempt.map((f) => `${f.rel}  ${f.contains}`).join("\n  ")
      ).toEqual([])
    }
  )

  it("TITLE_CHIP_ABOVE_EXEMPT names only real, still-open findings", () => {
    const all = titleChipFindings()
    const stale = TITLE_CHIP_ABOVE_EXEMPT.filter((e) => !titleChipStillOpen(all, e.file, e.contains))
    expect(
      stale,
      "these TITLE_CHIP_ABOVE_EXEMPT entries no longer match a real finding. Fixed, or the source moved on, " +
        "delete the entry:\n  " + stale.map((e) => `${e.file}  ${e.contains}`).join("\n  ")
    ).toEqual([])
  })

  // PROVEN NOT VACUOUS - the last two cases restore the PRE-FIX shape and
  // watch the census fail, then prove the CURRENT, fixed shape passes clean.
  it("catches a synthetic titleBlock with the chip row packed back inside title", () => {
    const synthetic = [
      "function X() {",
      "  const titleBlock = (",
      '    <span className="flex min-w-0 flex-col">',
      '      <span className="mb-[var(--space-2h)]">{identityChips}</span>',
      '      <span className="flex min-w-0 flex-col gap-[var(--space-1h)]">',
      "        {titleLine}",
      "        {subtitleLine}",
      "      </span>",
      "    </span>",
      "  )",
      "  return <RecordChrome title={titleBlock} actions={actions} />",
      "}",
      "",
    ].join("\n")
    const sf = ts.createSourceFile("synthetic.tsx", synthetic, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const found = titleChipCandidatesIn(sf, "synthetic.tsx")
    expect(found.length).toBe(1)
  })

  it("does not flag the current, fixed shape - chips via aboveTitle, title holding only the heading", () => {
    const synthetic = [
      "function X() {",
      "  const aboveTitleNode = <span className=\"mb-[var(--space-2h)]\">{identityChips}</span>",
      "  const titleBlock = (",
      '    <span className="flex min-w-0 flex-col gap-[var(--space-1h)]">',
      "      {titleLine}",
      "      {subtitleLine}",
      "    </span>",
      "  )",
      "  return <RecordChrome aboveTitle={aboveTitleNode} title={titleBlock} actions={actions} />",
      "}",
      "",
    ].join("\n")
    const sf = ts.createSourceFile("synthetic.tsx", synthetic, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(titleChipCandidatesIn(sf, "synthetic.tsx")).toEqual([])
  })
})
