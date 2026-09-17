// @vitest-environment node
//
// A HAND-ROLLED STATUS DOT NEVER SHIPS — A DOT IS DRAWN THROUGH THE ONE SEAM,
// `<Badge variant="status" dot={tone}>`, AND NOTHING ELSE.
//
// ── WHERE THIS CAME FROM ─────────────────────────────────────────────────
//
// The client, 17 Sep 2026, over the app's Tickets tab: "I noticed that when
// I go into the tickets tab inside an app, there is still the space between
// the point and the type missing, and also they are missing the background
// card. Make sure that you apply rules, not just specific hard-coded fixes,
// to all the feedback I'm giving you."
//
// AT THE START OF THIS SESSION the component drawing that gap was
// `AppTicketsPanel` (`web/components/work/work-panels.tsx`), the app-detail
// record's own Tickets tab, list view, Type column:
//
//   <Badge variant="secondary" size="pill">
//     <Swatch colour={ticketTypeColour(ticket.helpType)} />
//     {ticket.helpType ?? "—"}
//   </Badge>
//
// A `Badge` with NO `dot` prop, and a hand-placed dot span (`Swatch`) as an
// ordinary child instead — so `badge.tsx`'s own `GAP_WITH_DOT` (kit v1.2.102,
// "the dot and the label must be two children of a row that carries the
// kit's own gap token") was never spent: the gap kit v1.2.102 fixed lives on
// the `dot` PROP's own presence, and this call site never passed one. The
// identical shape was written out at three more call sites reachable from a
// ticket (`tickets-collection.tsx`'s own Type column, `triage-queue.tsx`'s
// sitting tally, `shared/web/ticket-chips.tsx`'s `typeDot`), all four
// confirmed by reading the source at the start of this session.
//
// WHAT CHANGED UNDER THIS SESSION, BY A DIFFERENT LANE: R86 ("in any
// collection, the one coloured chip is the record's status" — the client's
// own ruling, same day) retired the ticket TYPE's colour altogether in
// favour of an icon (`ticketTypeIconName`, `@shared/ticket-types`) and moved
// the COLOUR onto STATUS instead, across every one of the four files named
// above. That is a stronger fix than a gap patch — there is no longer a dot
// on that column to have a gap at all — and `web/test/status-owns-the-chip.
// test.ts` (R86) is this repo's own proof it landed. It does not, on its
// own, prove the GAP RULE holds everywhere a dot legitimately still ships
// (STATUS itself, a priority chip, a portal status chip, tomorrow's tenth
// call site) — that is a different law, and this file is it.
//
// ── THE RULE ──────────────────────────────────────────────────────────────
//
// A status (or any other closed-vocabulary state this app colours with a
// dot — STATUS, STAGE, priority) is drawn ONLY through the kit's own seam,
// `<Badge variant="status" dot={tone}>` (or, at minimum, `<Badge dot={tone}>`
// — `variant` is a separate decision `badge-dot-gap.test.tsx` already
// covers). `badge.tsx`'s `GAP_WITH_DOT` is spent the moment `dot` is passed,
// at either size, so a call site that uses the real prop can never ship the
// gap this law is about — `badge-dot-gap.test.tsx` is the proof of THAT
// half, and this census's own job is the other one: does anything in
// `web/` or `web-portal/` draw a dot BESIDE a word WITHOUT going through
// that prop at all.
//
// TWO SHAPES, both read off the source rather than hand-listed:
//
//   (a) A `<Badge …>` with NO `dot` attribute, holding a hand-placed dot
//       child — literally `<Swatch …/>`, or a bare `<span>`/`<div>` whose own
//       classes are the dot's own signature (`rounded-pill`/`rounded-full`
//       plus a small fixed square: `size-1.5`…`size-3`, `size-[7px]`,
//       `size-[var(--dot-status)]`, or the twin `h-*`/`w-*` spelling) —
//       beside a text/word sibling, with no `gap-*` utility anywhere on the
//       Badge's own className to separate them.
//   (b) The identical dot signature standing OUTSIDE any `<Badge>` at all,
//       as a JSX sibling of a text-bearing element inside one parent that
//       carries no `gap-*`/`space-x-*` of its own — the shape `EntryDot`
//       (`record-week.tsx`) and `Swatch` (`record-ref.tsx`'s own
//       `REF_LEADS_NAME`, `type-key` in `tickets-dashboard.tsx`) all avoid by
//       wrapping themselves in a gapped row.
//
// A parent that itself carries the gap — `REF_LEADS_NAME`, a hand-written
// `gap-1.5`/`gap-2` row, `RowList`'s own `<li>` — is not a violation of
// either shape: the dot and the word ARE separated, just not through
// `Badge`'s own `dot` prop. That is a legitimate, established, DIFFERENT
// vocabulary this app already uses for a non-status dot (a ticket TYPE's own
// colour, before R86; a facet's leading mark) and this file does not
// relitigate it — `HAND_ROLLED_DOT_OK` is the reasoned, rot-checked way out
// for a shape this narrow census cannot tell apart from a real offender.
//
// ── WHY A SEPARATE FILE, NOT AN EXTENSION OF `badge-dot-gap.test.tsx` ──────
//
// `badge-dot-gap.test.tsx` renders three fixed call shapes through
// `@testing-library/react` and asserts the CLASS the kit's own component
// produces — it proves the SEAM works, and is red exactly when the kit
// regresses. This file never renders anything: it reads every `.tsx` under
// `web/components` and `web-portal/components` (never `shared/ui/`, which is
// vendored and pinned, and never a test fixture) and asks whether a CALL
// SITE reached for the seam at all. The two are complementary, the same
// split `R28`/`R33` take for "the catalogue is right" vs "the code reads
// it".

import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { sourceFiles } from "@shared/rules/source-scan"
import { HAND_ROLLED_DOT_OK } from "@shared/rules/registry"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")

const DIRS = [join(ROOT, "web", "components"), join(ROOT, "web-portal", "components")]

type Parsed = { rel: string; tree: ts.SourceFile }

function parse(): Parsed[] {
  const out: Parsed[] = []
  for (const dir of DIRS)
    for (const f of sourceFiles(dir, { extensions: [".tsx"], relativeTo: ROOT, skipTests: true }))
      out.push({ rel: f.rel, tree: ts.createSourceFile(f.path, f.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX) })
  return out
}

function tagName(node: ts.Node): string | null {
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText()
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText()
  return null
}

function attributesOf(node: ts.Node): ts.JsxAttributes | null {
  if (ts.isJsxElement(node)) return node.openingElement.attributes
  if (ts.isJsxSelfClosingElement(node)) return node.attributes
  return null
}

function hasAttribute(node: ts.Node, name: string): boolean {
  const attrs = attributesOf(node)
  if (!attrs) return false
  return attrs.properties.some((p) => ts.isJsxAttribute(p) && p.name.getText() === name)
}

/** Every string literal anywhere inside this element's `className` — a
 * `cn(...)`/ternary/plain string are all read, the same move `classNameOf`
 * makes in `sections-stand-on-paper.test.ts`. */
function classNameOf(node: ts.Node): string {
  const attrs = attributesOf(node)
  if (!attrs) return ""
  const parts: string[] = []
  for (const a of attrs.properties) {
    if (!ts.isJsxAttribute(a) || a.name.getText() !== "className") continue
    const collect = (n: ts.Node) => {
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) parts.push(n.text)
      ts.forEachChild(n, collect)
    }
    if (a.initializer) collect(a.initializer)
  }
  return parts.join(" ")
}

const HAS_GAP = /(^|\s)(gap|space-x|space-y)-/
/** `rounded-pill`/`rounded-full`, paired with a small fixed square — the
 * dot's own signature, read off every real dot this app draws today
 * (`Swatch`, `EntryDot`, `badge.tsx`'s own `DOT_FILL` span): `size-1.5`
 * through `size-3`, a bracketed literal (`size-[7px]`, `size-[var(--dot-
 * status)]`), or the twin `h-*`/`w-*` spelling `record-week.tsx`'s calendar
 * list still writes in one place. */
const ROUNDED = /(^|\s)rounded-(pill|full)(\s|$)/
const SMALL_SQUARE =
  /(^|\s)size-(1\.5|2|2\.5|3|\[[^\]]+\])(\s|$)|(^|\s)h-(1\.5|2|2\.5|3|\[[^\]]+\])(\s|$).*(^|\s)w-(1\.5|2|2\.5|3|\[[^\]]+\])(\s|$)/
function looksLikeDot(node: ts.Node): boolean {
  const cls = classNameOf(node)
  return ROUNDED.test(cls) && SMALL_SQUARE.test(cls)
}

/** Direct JSX children of an element — unwrapped one level through `{…}`
 * (a bare expression, `&&`, or a parenthesised JSX literal), which is enough
 * to read `{typeDot}`/`{cond && <Swatch/>}` as the dot child it is without
 * pulling in the full ternary/`.map()` machinery `sections-stand-on-paper.
 * test.ts` needs for a much larger population. AN EXPRESSION THIS UNWRAP
 * DOES NOT RECOGNISE (`{label}`, a bare identifier — the single commonest
 * shape a Badge's own word takes) IS STILL A CHILD: it is pushed as the
 * `JsxExpression` node itself rather than silently dropped, so `isWordChild`
 * below can still call it a word. Dropping it was this file's own first
 * bug, caught by its own fixture. */
function directChildren(node: ts.JsxElement): ts.Node[] {
  const out: ts.Node[] = []
  for (const c of node.children) {
    if (ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c) || ts.isJsxText(c)) {
      out.push(c)
      continue
    }
    if (!ts.isJsxExpression(c) || !c.expression) continue
    let e: ts.Expression = c.expression
    while (ts.isParenthesizedExpression(e)) e = e.expression
    if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) e = e.right
    if (ts.isJsxElement(e) || ts.isJsxSelfClosingElement(e)) out.push(e)
    else out.push(c) // an opaque `{expr}` — still a real child, just not a JSX one
  }
  return out
}

/** Is this child a plausible "word" — text this dot is meant to sit beside?
 * A JSX text node with real characters, `{expr}` (a Badge's own label is
 * almost always exactly this shape), or a JSX ELEMENT that carries real text
 * SOMEWHERE in its own subtree — never a bare self-closing decoration (the
 * scatter chart's own tail/median marks in `tickets-dashboard.tsx` are all
 * self-closing `<span>`s with no text, and are not "a word" just because
 * they are not shaped like a dot). */
function isWordChild(node: ts.Node): boolean {
  if (ts.isJsxText(node)) return node.text.trim().length > 0
  if (ts.isJsxExpression(node)) return true
  if (ts.isJsxSelfClosingElement(node)) return false
  if (ts.isJsxElement(node)) {
    const t = tagName(node)
    if (t === "Swatch" || looksLikeDot(node)) return false
    let hasText = false
    const walk = (x: ts.Node) => {
      if (hasText) return
      if (ts.isJsxText(x) && x.text.trim().length > 0) {
        hasText = true
        return
      }
      if (ts.isJsxExpression(x) && x.expression) {
        hasText = true
        return
      }
      ts.forEachChild(x, walk)
    }
    walk(node)
    return hasText
  }
  return false
}

type Offender = { rel: string; line: number; text: string }

describe("a hand-rolled status dot never ships — the seam is `<Badge dot={…}>`", () => {
  const files = parse()
  const offenders: Offender[] = []
  let badgesSeen = 0
  let bareDotsSeen = 0

  for (const f of files) {
    const visit = (node: ts.Node) => {
      // ── SHAPE (a) — a Badge with no `dot` prop, holding a hand-placed dot ──
      if (ts.isJsxElement(node) && tagName(node) === "Badge") {
        badgesSeen++
        if (!hasAttribute(node, "dot")) {
          const kids = directChildren(node)
          const dotChild = kids.find((k) => tagName(k) === "Swatch" || looksLikeDot(k))
          const wordChild = kids.find((k) => k !== dotChild && isWordChild(k))
          if (dotChild && wordChild && !HAS_GAP.test(classNameOf(node))) {
            const line = f.tree.getLineAndCharacterOfPosition(node.getStart()).line + 1
            offenders.push({
              rel: f.rel,
              line,
              text: `<Badge> with no \`dot\` prop holds a hand-placed dot (<${tagName(dotChild) ?? "…"}>) beside a word, and carries no gap utility of its own`,
            })
          }
        }
      }
      // ── SHAPE (b) — the same dot signature, standing outside any Badge ──
      if ((ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) && looksLikeDot(node)) {
        bareDotsSeen++
        let insideBadge = false
        for (let p: ts.Node | undefined = node.parent; p; p = p.parent)
          if (tagName(p) === "Badge") {
            insideBadge = true
            break
          }
        if (!insideBadge && ts.isJsxElement(node.parent)) {
          const parent = node.parent
          const siblings = directChildren(parent)
          const hasWordSibling = siblings.some((s) => s !== node && isWordChild(s))
          if (hasWordSibling && !HAS_GAP.test(classNameOf(parent))) {
            const line = f.tree.getLineAndCharacterOfPosition(node.getStart()).line + 1
            offenders.push({
              rel: f.rel,
              line,
              text: "a dot-shaped span sits beside a word outside any <Badge>, in a parent with no gap utility of its own",
            })
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(f.tree)
  }

  it("the census measures something (a blind scan reports all clear exactly like a passing one)", () => {
    expect(files.length, "the walk over web/components + web-portal/components found nothing").toBeGreaterThan(100)
    expect(badgesSeen, "no <Badge> was found anywhere — the census has gone blind to shape (a)'s whole population").toBeGreaterThan(20)
    expect(bareDotsSeen, "no dot-shaped span was found anywhere — the census has gone blind to shape (b)'s whole population").toBeGreaterThan(2)

    // A FIXTURE THIS TEST OWNS, so the red/green proof does not depend on the
    // app happening to still contain an offender (the same reasoning
    // `sections-stand-on-paper.test.ts` gives for its own owned fixtures) —
    // the real census above is clean today precisely because the concurrent
    // R86 rework already fixed the one this law was written about.
    const fixtureA = ts.createSourceFile(
      "fixture-a.tsx",
      `function FixtureBadgeNoGap() {
         return (
           <Badge variant="secondary" size="pill">
             <Swatch colour={colour} />
             {label}
           </Badge>
         )
       }`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    )
    const fixtureB = ts.createSourceFile(
      "fixture-b.tsx",
      `function FixtureBareDotNoGap() {
         return (
           <span className="flex items-center">
             <span aria-hidden className="size-2 rounded-pill bg-[var(--dot-blocked)]" />
             {label}
           </span>
         )
       }`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    )
    const fixtureFindings: Offender[] = []
    for (const tree of [fixtureA, fixtureB]) {
      const f = { rel: tree.fileName, tree }
      const visit = (node: ts.Node) => {
        if (ts.isJsxElement(node) && tagName(node) === "Badge" && !hasAttribute(node, "dot")) {
          const kids = directChildren(node)
          const dotChild = kids.find((k) => tagName(k) === "Swatch" || looksLikeDot(k))
          const wordChild = kids.find((k) => k !== dotChild && isWordChild(k))
          if (dotChild && wordChild && !HAS_GAP.test(classNameOf(node))) fixtureFindings.push({ rel: f.rel, line: 0, text: "a" })
        }
        if ((ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) && looksLikeDot(node) && ts.isJsxElement(node.parent)) {
          let insideBadge = false
          for (let p: ts.Node | undefined = node.parent; p; p = p.parent)
            if (tagName(p) === "Badge") {
              insideBadge = true
              break
            }
          if (!insideBadge) {
            const siblings = directChildren(node.parent)
            const hasWordSibling = siblings.some((s) => s !== node && isWordChild(s))
            if (hasWordSibling && !HAS_GAP.test(classNameOf(node.parent))) fixtureFindings.push({ rel: f.rel, line: 0, text: "b" })
          }
        }
        ts.forEachChild(node, visit)
      }
      visit(f.tree)
    }
    expect(
      fixtureFindings.map((x) => x.rel),
      "the owned fixture (a Badge with no `dot` prop wrapping a bare <Swatch/> and a label, and a bare dot span beside a word outside any Badge) produced no findings — either `looksLikeDot`, `directChildren` or the gap check stopped resolving this shape"
    ).toEqual(["fixture-a.tsx", "fixture-b.tsx"])
  })

  it("hand-rolled-status-dot: every dot beside a word goes through `<Badge dot={…}>`, or says why not", () => {
    const unexplained = offenders.filter((o) => !(`${o.rel}:${o.line}` in HAND_ROLLED_DOT_OK))
    expect(
      unexplained.map((o) => `${o.rel}:${o.line} — ${o.text}`),
      "a status (or any other closed-vocabulary state this app colours with a dot) is drawn ONLY through the " +
        "kit's own seam, `<Badge variant=\"status\" dot={tone}>` — badge.tsx's own `GAP_WITH_DOT` is spent the " +
        "moment `dot` is passed, at either size, which is the whole reason a call site through the real prop " +
        "can never ship this gap. Route it through `dot`, add the missing `gap-2`/`gap-1.5` to the row that " +
        "already separates the dot from the word, or name `file:line` in HAND_ROLLED_DOT_OK with the real reason:"
    ).toEqual([])

    const claimed = new Set(offenders.map((o) => `${o.rel}:${o.line}`))
    const stale = Object.keys(HAND_ROLLED_DOT_OK).filter((k) => !claimed.has(k))
    expect(
      stale,
      "these HAND_ROLLED_DOT_OK entries match nothing any more — the dot is gapped (or gone), so delete the entry:"
    ).toEqual([])
  })
})
