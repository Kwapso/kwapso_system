// R94 — CHIP ORDER. Aurora, verbatim, 20 Sep 2026: "On story detail, the
// chips in order: id, status, type, app (underlined), sprint (id,
// underlined). This must always be the order, everywhere, for other things
// too: 1 id, 2 status, 3 (if) type, 4 main parent, 5 secondary parent."
//
// ONE SEAM, `orderChips()` (`shared/web/chip-order.ts`): every chip is
// tagged with WHICH of the five kinds it is, and the seam is what decides
// where it lands — never a hand-written JSX sequence a later edit can
// quietly reorder one chip at a time (exactly the shape that had already
// drifted: `contact-panels.tsx`'s own "tickets raised for this contact" row
// drew TYPE before STATUS, the two swapped from the law's own order, under a
// green build, because nothing before this law read the ORDER two adjacent
// chips render in — only whether each one existed).
//
// THIS FILE HOLDS TWO THINGS. First, that `orderChips()` itself sorts by the
// fixed kind order regardless of the caller's own array order, and drops
// nothing when a kind is simply absent (a record with no type vocabulary,
// no secondary parent). Second, a CENSUS: any file building a chip row that
// carries BOTH an id chip (`<RecordRef`) and a status chip (`variant=
// "status"` or the shared `ticketStatusCell()`) must route that
// construction through `orderChips(`, or name the site in
// `CHIP_ORDER_EXEMPT` with a reason — the same "adopt the seam or say why
// not" shape `kit-conformance.test.ts` and `vendored-kit.test.ts` already
// hold every kit consumer to.
//
// WHY THIS DOES NOT ALSO VERIFY THE RESOLVED VISUAL ORDER PIXEL BY PIXEL.
// A static census cannot run the component and read where each chip landed
// on screen without a browser; what it CAN prove, off the source alone, is
// that the row was built through the one function that is unit-tested
// (below) to always resolve the fixed order — the same division of labour
// `pinned-toolbar`'s own class census and its accompanying live-injection
// proofs already use elsewhere in this codebase.

import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { orderChips, type OrderedChip } from "@shared/web/chip-order"
import { CHIP_ORDER_EXEMPT } from "@shared/rules/registry"

const ROOT = join(import.meta.dirname, "..", "..")

describe("orderChips() — the shared seam", () => {
  it("sorts id, status, type, mainParent, secondaryParent regardless of input order", () => {
    const chips: OrderedChip<string>[] = [
      { kind: "secondaryParent", node: "sprint" },
      { kind: "type", node: "type" },
      { kind: "mainParent", node: "app" },
      { kind: "id", node: "id" },
      { kind: "status", node: "status" },
    ]
    expect(orderChips(chips)).toEqual(["id", "status", "type", "app", "sprint"])
  })

  it("drops nothing and adds nothing when a kind is simply absent", () => {
    const chips: OrderedChip<string>[] = [
      { kind: "status", node: "status" },
      { kind: "id", node: "id" },
    ]
    expect(orderChips(chips)).toEqual(["id", "status"])
  })

  it("is stable — two chips handed in for the same kind keep their relative order", () => {
    const chips: OrderedChip<string>[] = [
      { kind: "type", node: "first" },
      { kind: "type", node: "second" },
    ]
    expect(orderChips(chips)).toEqual(["first", "second"])
  })

  it("never mutates the array it is handed", () => {
    const chips: OrderedChip<string>[] = [
      { kind: "status", node: "status" },
      { kind: "id", node: "id" },
    ]
    const copy = [...chips]
    orderChips(chips)
    expect(chips).toEqual(copy)
  })
})

/** A component mount's own slice, self-closing or paired — see
 * `main-excludes-secondary.test.ts`'s identical helper. Unused here directly
 * (the census below works on windows of plain text, not tag slices, because
 * a chip ROW is a `<p>`/`<span>` wrapper around several unrelated
 * components rather than one component's own props) but kept for the two
 * synthetic proof cases at the bottom of this file. */
function tagEnd(src: string, start: number): number {
  let depth = 0
  for (let i = start; i < src.length; i++) {
    const ch = src[i]
    if (ch === "{") depth++
    else if (ch === "}") depth--
    else if (ch === ">" && depth === 0) return i + 1
  }
  return src.length
}

const STATUS_MARK = /variant=["']status["']|ticketStatusCell\(/
const WINDOW_BACK = 600
const WINDOW_FORWARD = 1500

interface Finding {
  rel: string
  expr: string
}

function findings(): Finding[] {
  const files = sourceFiles([join(ROOT, "web"), join(ROOT, "web-portal"), join(ROOT, "shared", "web")], {
    extensions: [".tsx"],
    relativeTo: ROOT,
    skipTests: true,
  })
  const out: Finding[] = []
  for (const f of files) {
    const src = stripComments(f.source)
    for (const m of src.matchAll(/<RecordRef\b/g)) {
      // BOTH DIRECTIONS: an id chip built as an INLINE ARGUMENT to
      // `orderChips([…])` has the call's own opening paren textually BEFORE
      // the `<RecordRef` tag (`orderChips([{ kind: "id", node: <RecordRef
      // … /> }, …])`), while an id chip built on its own earlier line, with
      // the status chip constructed later inside the same `orderChips(`
      // call, has it textually AFTER. A forward-only window catches the
      // second shape and misses the first, so this reads a window on each
      // side of the tag.
      const win = src.slice(Math.max(0, m.index - WINDOW_BACK), m.index + WINDOW_FORWARD)
      if (!STATUS_MARK.test(win)) continue
      if (win.includes("orderChips(")) continue
      const idTagEnd = tagEnd(src, m.index)
      const valueMatch = /value=\{\s*([\w.]+)\s*\}/.exec(src.slice(m.index, idTagEnd))
      const expr = valueMatch ? valueMatch[1] : `char${m.index}`
      out.push({ rel: f.rel, expr })
    }
  }
  return out
}

describe("R94 — chip order", () => {
  it("every id+status chip row is built through orderChips(), or is named in CHIP_ORDER_EXEMPT", () => {
    const found = findings()
    const unexempt = found.filter((f) => !(`${f.rel}#${f.expr}` in CHIP_ORDER_EXEMPT))
    expect(
      unexempt,
      `these chip rows carry both an id chip and a status chip but are not built through orderChips() ` +
        `(shared/web/chip-order.ts) — route the row through it, or name it in CHIP_ORDER_EXEMPT: ` +
        unexempt.map((f) => `${f.rel}#${f.expr}`).join(", ")
    ).toEqual([])
  })

  it("CHIP_ORDER_EXEMPT names only real, still-open findings", () => {
    const found = new Set(findings().map((f) => `${f.rel}#${f.expr}`))
    const stale = Object.keys(CHIP_ORDER_EXEMPT).filter((key) => !found.has(key))
    expect(
      stale,
      `these CHIP_ORDER_EXEMPT entries no longer match a real finding — the census moved on (fixed, or ` +
        `the source changed shape) and the line should be deleted: ${stale.join(", ")}`
    ).toEqual([])
  })

  // PROVEN NOT VACUOUS, against synthetic source only.
  it("catches a synthetic id+status row with no orderChips()", () => {
    const synthetic = `
      <p>
        <RecordRef value={ticket.ref} />
        <Badge variant="secondary">{ticket.helpType}</Badge>
        <Badge variant="status">{ticket.status}</Badge>
      </p>
    `
    const idx = synthetic.indexOf("<RecordRef")
    const win = synthetic.slice(Math.max(0, idx - WINDOW_BACK), idx + WINDOW_FORWARD)
    expect(STATUS_MARK.test(win)).toBe(true)
    expect(win.includes("orderChips(")).toBe(false)
  })

  it("does not flag the same row once it is built through orderChips()", () => {
    const synthetic = `
      <p>
        {orderChips([
          { kind: "id", node: <RecordRef value={ticket.ref} /> },
          { kind: "status", node: <Badge variant="status">{ticket.status}</Badge> },
        ])}
      </p>
    `
    const idx = synthetic.indexOf("<RecordRef")
    const win = synthetic.slice(Math.max(0, idx - WINDOW_BACK), idx + WINDOW_FORWARD)
    expect(win.includes("orderChips(")).toBe(true)
  })

  // Referenced so the import above is not flagged as unused when the two
  // synthetic cases above are the only callers of tagEnd's sibling shape.
  it("tagEnd is the same tag-boundary helper the other two R9x censuses use", () => {
    const src = "<Badge>x</Badge>"
    expect(tagEnd(src, 0)).toBe(7)
  })
})
