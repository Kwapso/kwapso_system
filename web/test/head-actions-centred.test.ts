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
