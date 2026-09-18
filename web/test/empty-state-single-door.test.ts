// R88 — EMPTY-STATE SINGLE DOOR (RULES.md, shared/rules/registry.ts). Reads
// source straight off disk, the same posture every rules.test.ts case takes,
// so the law can't be fooled by anything but the real code.
//
// THE SHAPE THIS LAW CLOSES. R50/R84 already make sure a title-row create
// button drawn INSIDE a `<ToolbarRow>`'s own `actions` slot cannot be
// reachable on an empty collection — the row itself returns `heading` (a
// title or nothing) before `actions` is even considered. `AddButton`'s own
// `empty` prop exists for the ONE shape that escapes that row: a title row
// built by hand, outside a `<ToolbarRow>` — and because that prop is
// optional there, a call site could pass a literal `empty={false}` and argue
// "this button should stay reachable at zero rows", which is exactly what
// `help-detail.tsx`'s Related stories and Work logs panels did until the
// client's ruling of 18 Sep 2026 retired the argument outright: "we already
// said on empty state, we only have the first, not the top-right plus
// button. This is a law. Reinforce it everywhere. And then also remove the
// work log header when it's empty."
//
// `EmptyGatedPanel` (web/components/deep-link/screen-bits.tsx) is the one
// shared shell this law lives in — see its own doc comment for the full
// account. Two censuses, the same two-part shape every structural law in
// this file takes: (i) the shell's own central guard cannot be removed
// without this test noticing, and (ii) every OTHER title-row `<AddButton>`
// in the app is inside one, or is named — with a real reason — in
// `EMPTY_STATE_SINGLE_DOOR_EXEMPT`.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { EMPTY_STATE_SINGLE_DOOR_EXEMPT } from "@shared/rules/registry"

const HERE = dirname(fileURLToPath(import.meta.url)) // web/test
const WEB = join(HERE, "..") // web/
const ROOT = join(WEB, "..") // repo root

// Brace-depth-aware scan to one tag's own closing `>`, the exact shape
// web/test/rules.test.ts's own R50 census uses (`ownTag`), copied rather
// than imported because that copy is local to one `it` block there too —
// every structural census in this file set writes its own, on purpose, so a
// change to one law's parsing can never silently retune another's.
function ownTag(src: string, at: number, tagName: string): string {
  let i = at + tagName.length
  if (src[i] === "<") {
    let angleDepth = 0
    while (i < src.length) {
      if (src[i] === "<") angleDepth++
      else if (src[i] === ">") {
        angleDepth--
        i++
        if (angleDepth === 0) break
        continue
      }
      i++
    }
  }
  let braceDepth = 0
  while (i < src.length) {
    const ch = src[i]
    if (ch === "{") braceDepth++
    else if (ch === "}") braceDepth--
    else if (ch === ">" && braceDepth === 0) break
    i++
  }
  return src.slice(at, i + 1)
}

describe("R88 — empty-state single door", () => {
  it("EmptyGatedPanel's own central guard: the header row is gated behind `{!empty &&`", () => {
    const screenBits = stripComments(
      readFileSync(join(WEB, "components/deep-link/screen-bits.tsx"), "utf8")
    )
    const at = screenBits.indexOf("export function EmptyGatedPanel(")
    expect(
      at,
      "R88 — web/components/deep-link/screen-bits.tsx must declare `EmptyGatedPanel`, the one shell a title-row header + create action may pair with a collection that can be empty"
    ).toBeGreaterThan(-1)
    const after = screenBits.indexOf("\nexport ", at + 1)
    const body = screenBits.slice(at, after === -1 ? undefined : after)
    const guardAt = body.indexOf("{!empty && (")
    expect(
      guardAt,
      "R88 — EmptyGatedPanel must open its header block with `{!empty && (` — the central guard every call site leans on instead of gating title/count/action separately"
    ).toBeGreaterThan(-1)
    // AND `children` NEVER MOVES: its own render must sit OUTSIDE that
    // conditional (after the guard's own closing), so a child mounted inside
    // it is never remounted by the header appearing or disappearing.
    const childrenAt = body.indexOf("{children}")
    expect(
      childrenAt,
      "R88 — EmptyGatedPanel must render `{children}`"
    ).toBeGreaterThan(-1)
    expect(
      childrenAt > guardAt,
      "R88 — `{children}` must render after the header's own `{!empty &&` guard closes, so its position in the tree never depends on `empty`"
    ).toBe(true)
  })

  it("every title-row <AddButton> sits inside <EmptyGatedPanel>, or is named in EMPTY_STATE_SINGLE_DOOR_EXEMPT", () => {
    const roots = [WEB, join(ROOT, "web-portal")]
    const offenders: string[] = []
    const exemptUsed = new Set<string>()

    for (const f of sourceFiles(roots, { extensions: [".tsx"], relativeTo: ROOT, skipTests: true })) {
      if (f.rel.endsWith("deep-link/screen-bits.tsx")) continue // declares both AddButton and EmptyGatedPanel
      const src = stripComments(f.source)
      if (!src.includes("<AddButton")) continue

      // Every `<EmptyGatedPanel` tag's own SPAN (its opening tag, brace-depth
      // aware exactly like `ownTag` above — so a nested `<AddButton .../>`
      // inside its `action={…}` prop is INSIDE this span, the shape the two
      // fixed call sites both take).
      const panelSpans: [number, number][] = []
      {
        let from = 0
        for (;;) {
          const at = src.indexOf("<EmptyGatedPanel", from)
          if (at === -1) break
          const tag = ownTag(src, at, "<EmptyGatedPanel")
          panelSpans.push([at, at + tag.length])
          from = at + tag.length
        }
      }

      let from = 0
      for (;;) {
        const at = src.indexOf("<AddButton", from)
        if (at === -1) break
        const tag = ownTag(src, at, "<AddButton")

        // IS IT A TOOLBAR ACTION? R50's own positional read: walk back to the
        // innermost `{` this tag is open inside and look at the attribute
        // name in front of it. That shape already answers R50's own question
        // (a row that has already returned null on an empty collection), so
        // R88 has nothing to add there.
        let depth = 0
        let inSlot = false
        for (let i = at - 1; i >= 0 && !inSlot; i--) {
          const ch = src[i]
          if (ch === "}") depth++
          else if (ch === "{") {
            if (depth > 0) {
              depth--
              continue
            }
            if (/\b(actions|renderActions)\s*=\s*$/.test(src.slice(Math.max(0, i - 40), i))) inSlot = true
          }
        }
        if (inSlot) {
          from = at + tag.length
          continue
        }

        const insideGatedPanel = panelSpans.some(([start, end]) => at >= start && at < end)
        if (!insideGatedPanel) {
          if (f.rel in EMPTY_STATE_SINGLE_DOOR_EXEMPT) exemptUsed.add(f.rel)
          else
            offenders.push(
              `${f.rel}: a title-row <AddButton> outside any <ToolbarRow> \`actions\` slot and outside <EmptyGatedPanel>, and the file is not in EMPTY_STATE_SINGLE_DOOR_EXEMPT`
            )
        }
        from = at + tag.length
      }
    }

    expect(
      offenders,
      `R88 — every title-row <AddButton> either sits inside <EmptyGatedPanel> or is named in EMPTY_STATE_SINGLE_DOOR_EXEMPT:\n  ${offenders.join("\n  ")}`
    ).toEqual([])

    const stale = Object.keys(EMPTY_STATE_SINGLE_DOOR_EXEMPT).filter((k) => !exemptUsed.has(k))
    expect(
      stale,
      `these EMPTY_STATE_SINGLE_DOOR_EXEMPT entries match nothing any more — delete the entry:\n  ${stale.join("\n  ")}`
    ).toEqual([])
  })
})
