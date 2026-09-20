// R91 — NO NESTED SCROLL: ONE PAGE SCROLL ONLY. Aurora, verbatim, 19 Sep 2026
// ~13:30-13:40: "amke this a rule, never need to scroll to see al content!!!
// (only exception chat compnents)" — stated as a standing law to be enforced
// everywhere. Asked directly whether the rail and the assistant pane are
// exceptions too, her answer, verbatim: "exceptions like chat,".
//
// A SCREEN SCROLLS AS ONE PAGE. No element inside a page's own content may be
// a vertical scroll container — `overflow-y: auto`/`scroll` (the Tailwind
// classes `overflow-y-auto`/`overflow-auto`/`overflow-y-scroll`/
// `overflow-scroll`, or a `max-h-*` paired with one of them) — to reveal
// content that does not fit. The four sanctioned shapes, straight off the
// law's own exception list (`shared/rules/registry.ts`, R91): a CHAT
// component's own thread (the ticket conversation's `CardContent`, `Agent
// Chat`'s own thread), the RAIL's own nav list, the ASSISTANT PANE (one
// aside scrolling region), and a true OVERLAY's body (a dialog, a sheet, a
// popover, a select listbox, a command menu). Everything else that scrolls
// on its own inside a page is a nested scroll region this law forbids —
// unless named, with a real reason, in `NO_NESTED_SCROLL_EXEMPT`.
//
// HORIZONTAL SCROLL IS NOT THIS LAW'S SUBJECT. `overflow-x-auto` on a table
// or a board is a deliberately open question (her question 4, Round 27) and
// this census does not touch it — a `className` carrying only `overflow-x-
// auto` (no vertical scroll class beside it) draws nothing here.
//
// THE CENSUS READS THE SOURCE, NOT THE RENDERED PAGE — the same posture every
// structural law in this file set takes. It walks every JSX element's own
// `className` (a plain string, a template literal, or any string literal
// reachable through a `cn(...)` call or a ternary — the same "read the
// source text" posture `chips-are-badges.test.ts`'s own `classAttrText`
// takes) for the four vertical-scroll tokens, over `web/components` and
// `shared/web` — the two directories `shared/ui/` (the vendored kit, out of
// this law's reach) sits outside of. Keyed by the SOURCE EXPRESSION — the
// class-list string itself — never a line number, because a file:line key
// rots on every edit above it; `NO_NESTED_SCROLL_EXEMPT` is rot-checked both
// ways, so a stale entry (naming an expression the file no longer carries)
// fails the build exactly as a missing one does.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { NO_NESTED_SCROLL_EXEMPT } from "@shared/rules/registry"

const ROOT = join(import.meta.dirname, "..", "..")

const ROOTS = [join(ROOT, "web", "components"), join(ROOT, "shared", "web")]

/** The four Tailwind spellings of "this scrolls vertically on its own" this
 * law names. `overflow-auto` is checked as a literal substring rather than a
 * word-boundary regex on purpose: `overflow-x-auto` does not contain it as a
 * contiguous run of characters (the `-x-` sits between `overflow` and
 * `auto`), so a plain `includes` never mistakes the horizontal class for the
 * one this law is about — proved in the file's own red-proof tests below. */
function isVerticalScrollClass(cls: string): boolean {
  return (
    cls.includes("overflow-y-auto") ||
    cls.includes("overflow-y-scroll") ||
    cls.includes("overflow-scroll") ||
    cls.includes("overflow-auto")
  )
}

type Offender = { key: string; rel: string; line: number; cls: string }

/** Every plain string / no-substitution-template literal reachable under
 * `node` — a `className` attribute's own initializer, whatever shape it
 * takes (`"…"`, `` `…` ``, `cn("…", cond && "…")`, `cond ? "…" : "…"`). This
 * census only needs to know what CLASSES a tag carries, never how it
 * computed them — the same "read the source, don't run it" posture
 * `chips-are-badges.test.ts`'s `classAttrText` takes, generalised to reach
 * every literal a `cn(...)` call or a ternary can hold rather than reading
 * the attribute's raw text as one blob (which would key an exemption on an
 * un-parseable, multi-line blob instead of the one class-list string that
 * actually offends). */
function stringLiteralsIn(node: ts.Node): ts.StringLiteralLike[] {
  const out: ts.StringLiteralLike[] = []
  const visit = (n: ts.Node): void => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      out.push(n)
      return // a string literal has no children worth descending into
    }
    n.forEachChild(visit)
  }
  visit(node)
  return out
}

function classNameLiterals(
  opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
): ts.StringLiteralLike[] {
  const attr = opening.attributes.properties.find(
    (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === "className",
  )
  if (!attr?.initializer) return []
  const init = attr.initializer
  const expr = ts.isJsxExpression(init) ? init.expression : init
  if (!expr) return []
  return stringLiteralsIn(expr)
}

function findOffendersInFile(sf: ts.SourceFile, rel: string): Offender[] {
  const offenders: Offender[] = []

  const visit = (node: ts.Node): void => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node
      for (const lit of classNameLiterals(opening)) {
        const cls = lit.text
        if (!isVerticalScrollClass(cls)) continue
        offenders.push({
          key: `${rel}#${cls}`,
          rel,
          line: sf.getLineAndCharacterOfPosition(lit.getStart(sf)).line + 1,
          cls,
        })
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sf)
  return offenders
}

/** `style={{ overflowY: "auto" }}` / `overflow: "scroll"` — the non-Tailwind
 * escape hatch. Nothing in `web/components` or `shared/web` uses it as of
 * 19 Sep 2026 (this app draws every scroll region through a Tailwind class),
 * but the law names "an explicit `overflow-y: auto`" without restricting it
 * to Tailwind, so this text-level check stands ready rather than being
 * silently out of scope. Read off the STRIPPED source, same as every other
 * census here, so a comment discussing the old shape never counts. */
const INLINE_OVERFLOW_STYLE = /overflow(?:Y)?\s*:\s*["'`](auto|scroll)["'`]/g

function findInlineStyleOffenders(source: string, rel: string): Offender[] {
  const offenders: Offender[] = []
  let m: RegExpExecArray | null
  INLINE_OVERFLOW_STYLE.lastIndex = 0
  while ((m = INLINE_OVERFLOW_STYLE.exec(source))) {
    const before = source.slice(0, m.index)
    const line = before.split("\n").length
    offenders.push({ key: `${rel}#${m[0]}`, rel, line, cls: m[0] })
  }
  return offenders
}

function findOffenders(): { offenders: Offender[]; fileCount: number } {
  const files = sourceFiles(ROOTS, { extensions: [".tsx", ".ts"], skipTests: true, relativeTo: ROOT })
  const offenders: Offender[] = []
  for (const file of files) {
    const stripped = stripComments(file.source, { keepLength: true })
    if (file.path.endsWith(".tsx")) {
      const sf = ts.createSourceFile(file.path, stripped, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      offenders.push(...findOffendersInFile(sf, file.rel))
    }
    offenders.push(...findInlineStyleOffenders(stripped, file.rel))
  }
  return { offenders, fileCount: files.length }
}

describe("R91 — no nested scroll (one page scroll only, chat/rail/assistant/overlay excepted)", () => {
  it("no vertical-scroll class/style outside the sanctioned shapes, or it is named in NO_NESTED_SCROLL_EXEMPT", () => {
    const { offenders, fileCount } = findOffenders()
    // THE BLINDNESS TRIPWIRE — same shape every source census here carries: a
    // walk over nothing reports "clean" in the same words as a walk over the
    // real tree.
    expect(
      fileCount,
      `only ${fileCount} files were walked under web/components and shared/web — a root has moved and this ` +
        "census is looking at nothing",
    ).toBeGreaterThan(150)

    const used = new Set<string>()
    const unexempt: string[] = []
    for (const o of offenders) {
      if (o.key in NO_NESTED_SCROLL_EXEMPT) {
        used.add(o.key)
        continue
      }
      unexempt.push(`${o.rel}:${o.line} — a vertical-scroll expression outside the sanctioned shapes (key: "${o.key}").`)
    }
    expect(
      unexempt,
      unexempt.join("\n") +
        "\n\nEither remove the nested scroll (let the page scroll instead), or name the key above in " +
        "NO_NESTED_SCROLL_EXEMPT (shared/rules/registry.ts) with the real reason — a chat thread, the rail's " +
        "nav list, the assistant pane, or a true overlay (dialog/sheet/popover/listbox/command menu) only.",
    ).toEqual([])

    const stale = Object.keys(NO_NESTED_SCROLL_EXEMPT).filter((k) => !used.has(k))
    expect(
      stale,
      `these NO_NESTED_SCROLL_EXEMPT entries match no offending scroller any more — delete them:\n  ${stale.join("\n  ")}`,
    ).toEqual([])
  })

  // ── RED PROOFS ────────────────────────────────────────────────────────────

  it("catches a plain overflow-y-auto scroll box", () => {
    const before = `
      function panel() {
        return <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      }
    `
    const sf = ts.createSourceFile("fixture-plain.tsx", before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const offenders = findOffendersInFile(sf, "fixture-plain.tsx")
    expect(offenders.length).toBe(1)
    expect(offenders[0].cls).toContain("overflow-y-auto")
  })

  it("catches overflow-y-auto reached through a cn(...) call", () => {
    const before = `
      function panel() {
        return <div className={cn("flex-1", scrolls && "min-h-0 overflow-y-auto")}>{children}</div>
      }
    `
    const sf = ts.createSourceFile("fixture-cn.tsx", before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const offenders = findOffendersInFile(sf, "fixture-cn.tsx")
    expect(offenders.length).toBe(1)
    expect(offenders[0].cls).toBe("min-h-0 overflow-y-auto")
  })

  it("catches overflow-y-auto reached through a ternary", () => {
    const before = `
      function list() {
        return (
          <CommandList className={phone ? "max-h-none flex-1 overflow-y-auto overscroll-contain" : "overscroll-contain"} />
        )
      }
    `
    const sf = ts.createSourceFile("fixture-ternary.tsx", before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const offenders = findOffendersInFile(sf, "fixture-ternary.tsx")
    expect(offenders.length).toBe(1)
    expect(offenders[0].cls).toContain("overflow-y-auto")
  })

  it("catches a max-h-* box paired with overflow-y-scroll", () => {
    const before = `
      function preview() {
        return <div className="max-h-96 overflow-y-scroll rounded-[var(--radius)]">{body}</div>
      }
    `
    const sf = ts.createSourceFile("fixture-maxh.tsx", before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const offenders = findOffendersInFile(sf, "fixture-maxh.tsx")
    expect(offenders.length).toBe(1)
  })

  it("catches an inline overflowY:auto style", () => {
    const offenders = findInlineStyleOffenders('const s = { overflowY: "auto" }', "fixture-style.ts")
    expect(offenders.length).toBe(1)
  })

  // ── GREEN PROOFS ──────────────────────────────────────────────────────────

  it("draws nothing for a plain block with no overflow class at all", () => {
    const after = `
      function panel() {
        return <div className="flex flex-col gap-4">{children}</div>
      }
    `
    const sf = ts.createSourceFile("fixture-none.tsx", after, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(findOffendersInFile(sf, "fixture-none.tsx")).toEqual([])
  })

  // NOT THIS LAW'S SUBJECT — horizontal scroll on a table/board is her open
  // question 4 (Round 27), and `overflow-x-auto` alone must never be mistaken
  // for the vertical class this law is about (the two share the word
  // "overflow" but are not substrings of one another).
  it("leaves a bare overflow-x-auto (horizontal, not covered by this law) alone", () => {
    const after = `
      function board() {
        return <div className="flex gap-4 overflow-x-auto pb-2">{columns}</div>
      }
    `
    const sf = ts.createSourceFile("fixture-x.tsx", after, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(findOffendersInFile(sf, "fixture-x.tsx")).toEqual([])
  })

  it("every NO_NESTED_SCROLL_EXEMPT pin still describes a real offender", () => {
    const files = sourceFiles(ROOTS, { extensions: [".tsx", ".ts"], skipTests: true, relativeTo: ROOT })
    const byRel = new Map(files.map((f) => [f.rel, f]))
    for (const key of Object.keys(NO_NESTED_SCROLL_EXEMPT)) {
      const rel = key.split("#")[0]
      const file = byRel.get(rel)
      expect(
        file,
        `NO_NESTED_SCROLL_EXEMPT names "${key}", but ${rel} is not under web/components or shared/web any more`,
      ).toBeTruthy()
      if (!file) continue
      const stripped = stripComments(readFileSync(file.path, "utf8"), { keepLength: true })
      let offenders: Offender[] = findInlineStyleOffenders(stripped, rel)
      if (file.path.endsWith(".tsx")) {
        const sf = ts.createSourceFile(file.path, stripped, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
        offenders = offenders.concat(findOffendersInFile(sf, rel))
      }
      expect(
        offenders.some((o) => o.key === key),
        `NO_NESTED_SCROLL_EXEMPT's "${key}" matches no offender any more — delete it`,
      ).toBe(true)
    }
  })
})
