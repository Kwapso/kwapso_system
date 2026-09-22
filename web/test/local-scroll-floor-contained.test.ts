// A LOCAL HORIZONTAL SCROLLER'S OWN FLOOR MUST NOT REACH THE PAGE. Measured
// live against staging, 22 Sep 2026, chasing Aurora's report: "i see a small
// horizotnal scroll within the main content at the bottom, shoudl not be."
// `web/app/globals.css`'s "THE PAGE DOES NOT SCROLL SIDEWAYS. EVER." rule
// holds at the true root (`html`/`body` carry `overflow-x: clip`) — this bug
// lived one layer in, on `[data-slot="screen-shell-body"]` itself (the kit's
// main-content pane), which computes `overflow-x: auto` on its own the
// moment its sibling `overflow-y: auto` is set and nothing says otherwise
// (the same CSS pairing `app-shell.tsx`'s own rail-content comment already
// names for the rail's vertical list: "a lone `overflow-y-auto` quietly
// becomes `overflow-y-auto overflow-x-auto`"). So the whole pane grows a
// horizontal scrollbar the instant anything inside it is even a few pixels
// wider than available, and unlike the true root, nothing there clips it.
//
// THE SHAPE, traced to its exact cause by a live descendant walk
// (`getBoundingClientRect` on every node under the pane, at 1280x800 and
// 760x900 against T0001 on staging) rather than by reading source first:
// `web/components/tickets/ticket-stages.tsx` deliberately floors its own
// stage ladder wider than it may have room for —
// `style={{ minWidth: calc(N * STAGE_COLUMN) }}` on the kit's
// `StatusStepper` — and wraps it in a `min-w-0 overflow-x-auto` div
// specifically so the ladder scrolls LOCALLY rather than growing an
// ancestor ("so a flex ancestor cannot let this box grow to its content
// instead of clipping it," that wrapper's own comment). The wrapper's own
// `min-w-0` broke the chain for ITSELF; the `<section>` one level further
// out (the ladder's own top-level element) carried no `min-w-0` of its own,
// so ITS automatic minimum width was still the ladder's full floor, and
// that reached `screen-shell-body` as 155-180px of real, visible horizontal
// scroll at 760px. Fixed by adding `min-w-0` to that `<section>`.
//
// THE CENSUS: every JSX element in `web/` or `web-portal/` carrying an
// inline `style` whose `minWidth` is a COMPUTED value (a template literal or
// any non-literal expression — a plain number/string `minWidth` is an
// ordinary fixed box, not a "this may be wider than its own parent, on
// purpose" floor) is walked up its own JSX ancestor chain for the nearest
// `overflow-x-auto`/`overflow-x-scroll` wrapper (the local scroller the
// floor is meant to stay inside), and THAT wrapper's own next JSX ancestor
// must carry `min-w-0` — the exact link that was missing here. Nothing is
// flagged when the styled element carries no such wrapper in its ancestor
// chain at all: this census is about a floor escaping ITS OWN local
// scroller, not a blanket "every wide thing needs min-w-0" rule. Keyed by
// `<file>#<the minWidth expression's own text>`, never a line number.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { LOCAL_SCROLL_FLOOR_EXEMPT } from "@shared/rules/registry"

const ROOT = join(import.meta.dirname, "..", "..")

const ROOTS = [
  join(ROOT, "web", "components"),
  join(ROOT, "web-portal", "components"),
  join(ROOT, "shared", "web"),
]

type Offender = { key: string; rel: string; line: number; expr: string }

/** Every `<Tag ...>`/`<Tag ... />` opening whose parent-chain walk this file
 * needs. `.parent` is populated because every `ts.createSourceFile` call
 * below passes `setParentNodes: true` (the fourth positional argument). */
function jsxAncestors(node: ts.Node): (ts.JsxElement | ts.JsxSelfClosingElement)[] {
  const out: (ts.JsxElement | ts.JsxSelfClosingElement)[] = []
  let p: ts.Node | undefined = node.parent
  while (p) {
    if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p)) out.push(p)
    p = p.parent
  }
  return out
}

function openingOf(el: ts.JsxElement | ts.JsxSelfClosingElement): ts.JsxOpeningElement | ts.JsxSelfClosingElement {
  return ts.isJsxElement(el) ? el.openingElement : el
}

/** The literal `className` text on one JSX opening tag — a plain string or a
 * no-substitution template only (the same "read the source text" posture
 * `no-nested-scroll.test.ts`'s own `classNameLiterals` takes, narrowed to a
 * single literal since this law only ever needs to ask "does this tag's own
 * class list contain token X", never to reconstruct a conditional one). */
function classNameText(opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement): string {
  const attr = opening.attributes.properties.find(
    (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === "className",
  )
  if (!attr?.initializer) return ""
  const init = attr.initializer
  const expr = ts.isJsxExpression(init) ? init.expression : init
  if (!expr) return ""
  const texts: string[] = []
  const visit = (n: ts.Node): void => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      texts.push(n.text)
      return
    }
    // A template literal WITH a substitution (`` `min-w-0 ${x}` ``) is a
    // `TemplateExpression`, never a `NoSubstitutionTemplateLiteral` — its
    // static text lives on `.head` and each `.templateSpans[i].literal`
    // instead, and neither is a StringLiteral either, so the check above
    // silently drops it unless collected here. This is exactly the shape
    // `ticket-stages.tsx`'s own scrolling wrapper uses
    // (`` `min-w-0 overflow-x-auto pb-[var(--space-2)] ${SMALLER_DOT}` ``) —
    // missing this once made the real bug invisible to this very census.
    if (ts.isTemplateExpression(n)) {
      texts.push(n.head.text)
      for (const span of n.templateSpans) texts.push(span.literal.text)
      return
    }
    n.forEachChild(visit)
  }
  visit(expr)
  return texts.join(" ")
}

function isLocalHScroller(opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement): boolean {
  const cls = classNameText(opening)
  return cls.includes("overflow-x-auto") || cls.includes("overflow-x-scroll")
}

function hasMinWZero(opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement): boolean {
  return classNameText(opening).includes("min-w-0")
}

/** A `style={{ minWidth: <expr> }}` object property whose value is NOT a
 * plain literal — the "this floor is computed, and deliberately may exceed
 * a fixed size" signal. A literal `minWidth: 40` or `minWidth: "2rem"` is an
 * ordinary fixed box and not this law's subject. */
function computedMinWidthProps(sf: ts.SourceFile): ts.PropertyAssignment[] {
  const out: ts.PropertyAssignment[] = []
  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAssignment(node) &&
      (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
      node.name.getText(sf).replace(/["']/g, "") === "minWidth"
    ) {
      const v = node.initializer
      const isPlainLiteral =
        ts.isNumericLiteral(v) || ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v)
      if (!isPlainLiteral) out.push(node)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return out
}

function findOffendersInFile(sf: ts.SourceFile, rel: string): Offender[] {
  const offenders: Offender[] = []
  for (const prop of computedMinWidthProps(sf)) {
    // The styled element itself is the nearest enclosing JSX element/self-
    // closing element above this `style={{...}}` property.
    const ancestors = jsxAncestors(prop)
    const scrollerIdx = ancestors.findIndex((el) => isLocalHScroller(openingOf(el)))
    if (scrollerIdx === -1) continue // no local scroller wraps this floor at all -- not this law's subject
    const container = ancestors[scrollerIdx + 1]
    if (!container) continue // the scroller is the outermost JSX in the file -- nothing further out to check
    if (hasMinWZero(openingOf(container))) continue // the link held
    const expr = prop.initializer.getText(sf)
    offenders.push({
      key: `${rel}#${expr}`,
      rel,
      line: sf.getLineAndCharacterOfPosition(prop.getStart(sf)).line + 1,
      expr,
    })
  }
  return offenders
}

function findOffenders(): { offenders: Offender[]; fileCount: number } {
  const files = sourceFiles(ROOTS, { extensions: [".tsx"], skipTests: true, relativeTo: ROOT })
  const offenders: Offender[] = []
  for (const file of files) {
    const stripped = stripComments(file.source, { keepLength: true })
    const sf = ts.createSourceFile(file.path, stripped, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    offenders.push(...findOffendersInFile(sf, file.rel))
  }
  return { offenders, fileCount: files.length }
}

describe("a local horizontal scroller's own floor must not reach the page", () => {
  it("every computed style minWidth wrapped in a local overflow-x scroller has min-w-0 one level further out, or is named in LOCAL_SCROLL_FLOOR_EXEMPT", () => {
    const { offenders, fileCount } = findOffenders()
    // THE BLINDNESS TRIPWIRE — same shape every source census here carries: a
    // walk over nothing reports "clean" in the same words as a walk over the
    // real tree.
    expect(
      fileCount,
      `only ${fileCount} files were walked under web/components, web-portal/components and shared/web — a root ` +
        "has moved and this census is looking at nothing",
    ).toBeGreaterThan(150)

    const used = new Set<string>()
    const unexempt: string[] = []
    for (const o of offenders) {
      if (o.key in LOCAL_SCROLL_FLOOR_EXEMPT) {
        used.add(o.key)
        continue
      }
      unexempt.push(
        `${o.rel}:${o.line} — a computed \`minWidth\` (key: "${o.key}") sits inside a local \`overflow-x-auto\` ` +
          "scroller whose own next JSX ancestor carries no `min-w-0`, so the floor can bleed past its scroller " +
          "into `[data-slot=\"screen-shell-body\"]` itself and become a real, page-visible horizontal scroll.",
      )
    }
    expect(
      unexempt,
      unexempt.join("\n") +
        "\n\nAdd `min-w-0` to the scroller's own parent element (breaks the automatic-minimum-size chain at the " +
        "point it escapes), or name the key above in LOCAL_SCROLL_FLOOR_EXEMPT (shared/rules/registry.ts) with " +
        "the real reason the bleed is fine there.",
    ).toEqual([])

    const stale = Object.keys(LOCAL_SCROLL_FLOOR_EXEMPT).filter((k) => !used.has(k))
    expect(
      stale,
      `these LOCAL_SCROLL_FLOOR_EXEMPT entries match no offender any more — delete them:\n  ${stale.join("\n  ")}`,
    ).toEqual([])
  })

  // ── RED PROOF — the exact shape the real bug took ──────────────────────────
  it("catches a computed minWidth whose local scroller's own parent has no min-w-0 (the real bug's shape)", () => {
    const before = `
      function stages() {
        return (
          <section className="flex flex-col gap-3" aria-label="Stages">
            <div className="min-w-0 overflow-x-auto pb-2">
              <StatusStepper style={{ minWidth: \`calc(\${n} * \${STAGE_COLUMN})\` }} />
            </div>
          </section>
        )
      }
    `
    const sf = ts.createSourceFile("fixture-bug.tsx", before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const offenders = findOffendersInFile(sf, "fixture-bug.tsx")
    expect(offenders.length).toBe(1)
    expect(offenders[0].expr).toContain("STAGE_COLUMN")
  })

  // ── GREEN PROOF — the real fix's own shape ─────────────────────────────────
  it("draws nothing once the scroller's own parent carries min-w-0 (the real fix's shape)", () => {
    const after = `
      function stages() {
        return (
          <section className="flex min-w-0 flex-col gap-3" aria-label="Stages">
            <div className="min-w-0 overflow-x-auto pb-2">
              <StatusStepper style={{ minWidth: \`calc(\${n} * \${STAGE_COLUMN})\` }} />
            </div>
          </section>
        )
      }
    `
    const sf = ts.createSourceFile("fixture-fixed.tsx", after, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(findOffendersInFile(sf, "fixture-fixed.tsx")).toEqual([])
  })

  it("draws nothing for a computed minWidth with no local overflow-x scroller wrapping it at all", () => {
    const after = `
      function wide() {
        return (
          <div className="flex flex-col">
            <div style={{ minWidth: \`calc(\${n} * 4px)\` }}>{children}</div>
          </div>
        )
      }
    `
    const sf = ts.createSourceFile("fixture-no-scroller.tsx", after, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(findOffendersInFile(sf, "fixture-no-scroller.tsx")).toEqual([])
  })

  it("draws nothing for a plain literal minWidth (an ordinary fixed box, not a deliberate floor)", () => {
    const after = `
      function fixed() {
        return (
          <section className="flex flex-col">
            <div className="overflow-x-auto">
              <div style={{ minWidth: 200 }}>{children}</div>
            </div>
          </section>
        )
      }
    `
    const sf = ts.createSourceFile("fixture-literal.tsx", after, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(findOffendersInFile(sf, "fixture-literal.tsx")).toEqual([])
  })

  it("every LOCAL_SCROLL_FLOOR_EXEMPT pin still describes a real offender", () => {
    const files = sourceFiles(ROOTS, { extensions: [".tsx"], skipTests: true, relativeTo: ROOT })
    const byRel = new Map(files.map((f) => [f.rel, f]))
    for (const key of Object.keys(LOCAL_SCROLL_FLOOR_EXEMPT)) {
      const rel = key.split("#")[0]
      const file = byRel.get(rel)
      expect(
        file,
        `LOCAL_SCROLL_FLOOR_EXEMPT names "${key}", but ${rel} is not under web/components, web-portal/components ` +
          "or shared/web any more",
      ).toBeTruthy()
      if (!file) continue
      const stripped = stripComments(readFileSync(file.path, "utf8"), { keepLength: true })
      const sf = ts.createSourceFile(file.path, stripped, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      const offenders = findOffendersInFile(sf, rel)
      expect(
        offenders.some((o) => o.key === key),
        `LOCAL_SCROLL_FLOOR_EXEMPT's "${key}" matches no offender any more — delete it`,
      ).toBe(true)
    }
  })

  // ── THE REAL FILE, PROVEN LIVE — proof of red, then restored from a copy ────
  // Not a fixture: `ticket-stages.tsx` itself, read straight off disk, so a
  // regression that drops its own `min-w-0` is what this test actually
  // watches, the same discipline `no-nested-scroll.test.ts`'s own
  // "agent-panel.tsx" test takes.
  it("web/components/tickets/ticket-stages.tsx — the real file — carries the fix", () => {
    const rel = "web/components/tickets/ticket-stages.tsx"
    const path = join(ROOT, rel)
    const stripped = stripComments(readFileSync(path, "utf8"), { keepLength: true })
    const sf = ts.createSourceFile(path, stripped, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(
      findOffendersInFile(sf, rel),
      "ticket-stages.tsx's own stage-ladder <section> must keep min-w-0, or its fixed-width StatusStepper " +
        "floor bleeds past its local overflow-x-auto scroller into screen-shell-body's own horizontal scroll " +
        "(Aurora, 22 Sep 2026: \"i see a small horizotnal scroll within the main content at the bottom\").",
    ).toEqual([])
  })
})
