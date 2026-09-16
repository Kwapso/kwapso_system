// R83 — A TAB STRIP AND WHAT IT LABELS SHARE ONE GAPLESS COLUMN.
//
// The client's ruling, 16 Sep 2026: "reduce the spacing above ALL TOOLBARS.
// i want it exactly as its currently below, make it like that above."
//
// `<ToolbarRow>` already pays its own trailing gap to what sits below it,
// once, as its own baked-in `mb-[var(--toolbar-content-gap)]` (R49) — the
// BELOW number, `--toolbar-content-gap`, `--space-5`. The ABOVE number is
// the identical value, `--tab-content-gap` (web/app/globals.css: "one
// value, not a new one … the same '--space-5' both already spend"), paid by
// the tab strip above the toolbar as ITS OWN trailing
// `pb-[var(--tab-content-gap)]` (`STICKY_FOLDER_TABS`,
// shared/web/screen-engine/tabs-view.tsx) — so the two tokens were already
// equal, and every screen but one spent each exactly once.
//
// `paged-find.tsx`, `tickets-collection.tsx`, `kwapso-screen.tsx`,
// `settings-screen.tsx` (twice), `module-settings-screen.tsx` and
// `screen-bits.tsx`'s own `SectionWithCreate` all wrap a
// `renderFolderTabs(…)` call and the card/panel it labels in a column
// carrying NO `gap-*` of its own — `paged-find.tsx`'s own comment states the
// rule in as many words: "this column has nothing to say about it either
// way and must not grow a `gap-*` of its own — that would be a second
// opinion about one number."
//
// `waves-screen.tsx` was the one call site that disagreed: its
// `renderFolderTabs(…)` call and the `<CollectionCard>` beneath it sat
// directly inside the screen's own OUTER `flex flex-col gap-6` column,
// alongside the page heading — a PER-SCREEN WRAPPER spending a second,
// unrelated 24px on top of the strip's own 20px, above the toolbar and
// nowhere else. Fixed by giving the strip and its card their own inner
// `flex w-full flex-col` (no `gap-*`), the same shape the other six call
// sites already draw.
//
// THE CENSUS, OFF THE DISK: every `renderFolderTabs(` call whose immediate
// JSX parent element (fragments walked through — a fragment paints no box,
// the same transparency R49's own census gives it) carries a `gap-*` or
// `space-y-*` utility in its `className` is a caller paying the strip's own
// number a second time, unless the file is named in
// `TOOLBAR_LEAD_GAP_EXEMPT` (shared/rules/registry.ts) with the real reason.

import { join } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { TOOLBAR_LEAD_GAP_EXEMPT } from "@shared/rules/registry"

const ROOT = join(import.meta.dirname, "..", "..")
const ROOTS = [join(ROOT, "web"), join(ROOT, "web-portal")]

/** A `gap-*`/`space-y-*` Tailwind utility, spent as an actual class name
 * rather than merely discussed — `\b` on both ends so `gap-6` does not match
 * inside `bg-6` or a longer arbitrary token, and the scale/arbitrary-value
 * tail (`gap-6`, `gap-[1.5rem]`, `gap-x-4`) is accepted the same way R49's
 * own `mb-*` census accepts either spelling. `gap-px` is EXCLUDED on
 * purpose: a 1px gap does not double-pay a 20px token, and `gap-px` is the
 * spelling `<ToolbarRow>`'s own pinned box (screen-bits.tsx) already wears
 * for an unrelated reason (R63) — a census that flagged it would be a false
 * offender on furniture this law has nothing to say about. */
const GAP_UTILITY = /\bgap(?:-x|-y)?-(?!px\b)[\w[\].%()-]+|\bspace-y-[\w[\].%()-]+/

/** The `className` attribute's own text on a JSX opening tag/self-closing
 * element — the raw expression, unevaluated (a string literal, a `cn(...)`
 * call, a template) — or `""` when there is none. Reading the RAW text
 * rather than resolving it is deliberate and matches this repo's other
 * `className` censuses (`toolbar-content-gap`'s own `classNameMatch`,
 * rules.test.ts): every real call site in this population spells its class
 * list as a plain string or a `cn("a", "b")` call, both of which carry the
 * utility name in the SOURCE TEXT even before any evaluation, so a text
 * search over the attribute's own span is exact for this population without
 * needing to actually run `cn`. */
function classNameText(opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement, sf: ts.SourceFile): string {
  for (const attr of opening.attributes.properties) {
    if (!ts.isJsxAttribute(attr)) continue
    if (attr.name.getText(sf) !== "className") continue
    return attr.initializer ? attr.initializer.getText(sf) : ""
  }
  return ""
}

/** The JSX element that is the direct BOX around `call` — walking up through
 * `JsxExpression` (the `{…}` the call sits inside) and any `JsxFragment` in
 * between (a fragment paints no box, so the box a gap would double-pay is
 * whatever real element is the next one up), and stopping the moment
 * anything else is found (a conditional, a `.map()`, an arrow function body
 * — this call is not a plain JSX child in that shape, and this census would
 * rather stay quiet than guess). `undefined` when no such box exists. */
function enclosingBox(call: ts.CallExpression): ts.JsxElement | undefined {
  let cur: ts.Node | undefined = call.parent
  while (cur) {
    if (ts.isJsxElement(cur)) return cur
    if (ts.isJsxExpression(cur) || ts.isJsxFragment(cur)) {
      cur = cur.parent
      continue
    }
    return undefined
  }
  return undefined
}

type Offender = { rel: string; line: number; cls: string }

/** Every `renderFolderTabs(` call whose immediate box double-pays the gap. */
function findOffenders(roots: string[]): Offender[] {
  const offenders: Offender[] = []
  for (const f of sourceFiles(roots, { extensions: [".tsx"], relativeTo: ROOT, skipTests: true })) {
    const src = stripComments(f.source, { keepLength: true })
    if (!src.includes("renderFolderTabs(")) continue
    const sf = ts.createSourceFile(f.path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "renderFolderTabs"
      ) {
        const box = enclosingBox(node)
        if (box) {
          const cls = classNameText(box.openingElement, sf)
          if (GAP_UTILITY.test(cls)) {
            offenders.push({
              rel: f.rel,
              line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
              cls,
            })
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return offenders
}

describe("R83 — a tab strip and what it labels share one gapless column", () => {
  it("toolbar-lead-gap: no renderFolderTabs( call sits inside a gapped box with the card/panel it labels, or is named in TOOLBAR_LEAD_GAP_EXEMPT", () => {
    const offenders = findOffenders(ROOTS)
    const used = new Set<string>()
    const unexempt: string[] = []
    for (const o of offenders) {
      if (o.rel in TOOLBAR_LEAD_GAP_EXEMPT) {
        used.add(o.rel)
        continue
      }
      unexempt.push(
        `${o.rel}:${o.line} — the box around this renderFolderTabs( call carries className="${o.cls}": the strip already pays --tab-content-gap as its own trailing padding, so this gap-*/space-y-* pays it again above the toolbar. Move the strip and its card into their own gapless column, or name "${o.rel}" in TOOLBAR_LEAD_GAP_EXEMPT with the real reason.`
      )
    }
    expect(unexempt, unexempt.join("\n")).toEqual([])

    const stale = Object.keys(TOOLBAR_LEAD_GAP_EXEMPT).filter((k) => !used.has(k))
    expect(
      stale,
      `these TOOLBAR_LEAD_GAP_EXEMPT entries match no double-paid gap any more — delete them:\n  ${stale.join("\n  ")}`
    ).toEqual([])
  })

  // THE RED PROOF — waves-screen.tsx's own pre-fix shape, replayed from a
  // fixture: the strip and the card sitting directly inside the outer
  // `gap-6` column with the heading, exactly as it shipped on 16 Sep 2026.
  it("waves-screen.tsx's own pre-fix shape (strip + card inside the outer gap-6 column) is exactly what this census flags", () => {
    const preFix = `
      function WaveCollection() {
        return (
          <div className="flex flex-col gap-6">
            {heading}
            {renderFolderTabs({ config: tabsConfig, value: tab, onValueChange: setTab })}
            <CollectionCard>
              <WaveFinder />
            </CollectionCard>
          </div>
        )
      }
    `
    const sf = ts.createSourceFile("waves-screen.tsx", preFix, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const found: Offender[] = []
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "renderFolderTabs"
      ) {
        const box = enclosingBox(node)
        if (box) {
          const cls = classNameText(box.openingElement, sf)
          if (GAP_UTILITY.test(cls)) found.push({ rel: "waves-screen.tsx", line: 0, cls })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
    expect(found.length, "the pre-fix fixture's renderFolderTabs( sits inside the gap-6 column").toBe(1)
    expect(found[0]!.cls).toContain("gap-6")
  })

  it("the post-fix shape (strip + card in their own gapless inner column) passes clean", () => {
    const postFix = `
      function WaveCollection() {
        return (
          <div className="flex flex-col gap-6">
            {heading}
            <div className="flex w-full flex-col">
              {renderFolderTabs({ config: tabsConfig, value: tab, onValueChange: setTab })}
              <CollectionCard>
                <WaveFinder />
              </CollectionCard>
            </div>
          </div>
        )
      }
    `
    const sf = ts.createSourceFile("waves-screen.tsx", postFix, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const found: Offender[] = []
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "renderFolderTabs"
      ) {
        const box = enclosingBox(node)
        if (box) {
          const cls = classNameText(box.openingElement, sf)
          if (GAP_UTILITY.test(cls)) found.push({ rel: "waves-screen.tsx", line: 0, cls })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
    expect(found.length, "the post-fix fixture's renderFolderTabs( sits inside the gapless inner column").toBe(0)
  })
})
