// A FOOTER IS AT THE BOTTOM — CLIENT RULING, 18 SEP 2026, VERBATIM, TWICE
// THE SAME SESSION.
//
// First, over the shipped ticket page: "ticket page: the footer is not on
// the footer position!! fix that!" `TicketConversationPanel` had drawn
// `thread`/`attachments`/`composer` as three flex children stacked inside
// ONE padded `CardContent` — which reads as "three things in a box," not a
// footer, because the card's own inset wraps the composer on every side
// including the bottom. Fixed the same round: `CardContent` now holds only
// the scrolling thread, and the kit's own `CardFooter` — hairline-separated
// from the body, no fill of its own — holds the composer as `Card`'s own
// LAST child (see `ticket-detail-body.tsx`'s own header comment for the
// full account).
//
// Reviewing the SAME page again, ~90 minutes later, the client named it a
// standing law rather than a one-off fix: "but the footer is in the worng
// position, above al cointent! dhoudl be at the bottom (this is a law for
// footer)." UI-RULEBOOK.md D21 records the law; this file is its check.
//
// THE CENSUS, OFF THE DISK, positional like every other structural law in
// this base: every `<CardFooter>`/`<CardFooter />` and every
// `<ReplyComposer>`/`<ReplyComposer />` (the one component this app calls a
// "composer" today — `web/components/tickets/reply-composer.tsx`) is found,
// and its nearest enclosing JSX element (walking up through a `{…}`
// expression or a fragment, exactly the way `toolbar-lead-gap.test.ts`'s own
// `enclosingBox` already does for a different law) must have that node as
// its own LAST real child — the last one that is not pure whitespace JSX
// text. A `<ReplyComposer>` that already sits inside a `<CardFooter>` is
// covered twice, harmlessly: the inner check passes because `CardFooter`
// itself has no sibling after it, and the outer `CardFooter` check is what
// actually proves the shape this law cares about.
//
// `FOOTER_IS_LAST_EXEMPT` (shared/rules/registry.ts) is the reasoned,
// rot-checked way out for a footer that genuinely is not its own screen's
// bottom-most element — a card nested inside a larger scrolling region, say
// — never for one that is merely inconvenient to move. It opens empty: the
// one call site this census can see today was already fixed the day this
// law was written.

import { join } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { FOOTER_IS_LAST_EXEMPT } from "@shared/rules/registry"

const ROOT = join(import.meta.dirname, "..", "..")
const WEB = join(ROOT, "web")

/** The names this census treats as "a footer" — the kit's own footer slot,
 * and the app's one reply composer. Never widened by a string match (a
 * variable named `footer` proves nothing); only a real JSX tag name counts. */
const FOOTER_TAGS = new Set(["CardFooter", "ReplyComposer"])

function isWhitespaceText(node: ts.JsxChild): boolean {
  return ts.isJsxText(node) && node.text.trim() === ""
}

/** The nearest real JSX box around `node` — walking up through a `{…}`
 * expression (a ternary, `&&`, or a plain interpolation) and any fragment in
 * between, the identical climb `toolbar-lead-gap.test.ts`'s own
 * `enclosingBox` already makes for a different law, because neither one
 * paints a box of its own and the box a "last child" question is really
 * about is the next real element up. `undefined` when the walk runs off the
 * top of a JSX tree entirely (a bare fragment at the file's own root, say) —
 * this census would rather stay quiet than guess at a "card" that isn't
 * there. */
function enclosingBox(node: ts.Node): ts.JsxElement | ts.JsxFragment | undefined {
  let cur: ts.Node | undefined = node.parent
  while (cur) {
    if (ts.isJsxElement(cur) || ts.isJsxFragment(cur)) return cur
    if (ts.isJsxExpression(cur)) {
      cur = cur.parent
      continue
    }
    return undefined
  }
  return undefined
}

/** The box's own last REAL child — its `children` array, with pure-
 * whitespace JSX text (the newlines/indentation between JSX siblings)
 * filtered out first, so "last" means the last thing that actually paints
 * or evaluates to something, never a trailing blank line in the source. */
function lastRealChild(box: ts.JsxElement | ts.JsxFragment): ts.JsxChild | undefined {
  const real = box.children.filter((c) => !isWhitespaceText(c))
  return real[real.length - 1]
}

/** Does `outer` span `inner` — `inner` is `outer` itself, or sits somewhere
 * inside it (the shape a footer takes when it is wrapped in a `{cond &&
 * …}` before it reaches its box's own children array). */
function spans(outer: ts.Node, inner: ts.Node): boolean {
  return outer.getFullStart() <= inner.getStart() && inner.getEnd() <= outer.getEnd()
}

type Offender = { rel: string; line: number; tag: string }

function tagNameOf(node: ts.JsxElement | ts.JsxSelfClosingElement): string {
  const nameNode = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName
  return nameNode.getText()
}

function findOffenders(): Offender[] {
  const offenders: Offender[] = []
  for (const f of sourceFiles([WEB], { extensions: [".tsx"], relativeTo: ROOT, skipTests: true })) {
    const src = stripComments(f.source, { keepLength: true })
    if (!/CardFooter|ReplyComposer/.test(src)) continue
    const sf = ts.createSourceFile(f.path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const visit = (node: ts.Node): void => {
      if (
        (ts.isJsxElement(node) && FOOTER_TAGS.has(tagNameOf(node))) ||
        (ts.isJsxSelfClosingElement(node) && FOOTER_TAGS.has(tagNameOf(node)))
      ) {
        const tag = tagNameOf(node)
        const box = enclosingBox(node)
        if (box) {
          const last = lastRealChild(box)
          const ok = last !== undefined && spans(last, node)
          if (!ok) {
            offenders.push({
              rel: f.rel,
              line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
              tag,
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

describe("D21 — a footer is at the bottom", () => {
  it("footer-is-last: every CardFooter/ReplyComposer is the last real child of its enclosing card, or is named in FOOTER_IS_LAST_EXEMPT", () => {
    const offenders = findOffenders()
    const used = new Set<string>()
    const unexempt: string[] = []
    for (const o of offenders) {
      if (o.rel in FOOTER_IS_LAST_EXEMPT) {
        used.add(o.rel)
        continue
      }
      unexempt.push(
        `${o.rel}:${o.line} — <${o.tag}> is not the last real child of its enclosing card. "A footer is at the bottom" (client ruling, 18 Sep 2026) — move it after every other child, or name "${o.rel}" in FOOTER_IS_LAST_EXEMPT with the real reason.`
      )
    }
    expect(unexempt, unexempt.join("\n")).toEqual([])

    const stale = Object.keys(FOOTER_IS_LAST_EXEMPT).filter((k) => !used.has(k))
    expect(
      stale,
      `these FOOTER_IS_LAST_EXEMPT entries match no offender any more — delete them:\n  ${stale.join("\n  ")}`
    ).toEqual([])
  })

  // THE RED PROOF — the shipped bug this law was written about: the composer
  // sitting BEFORE another sibling inside the same card, exactly the shape a
  // future regression would take (a stray "help text" or a second panel
  // added after the footer by mistake).
  it("a footer with something rendered after it inside the same card is exactly what this census flags", () => {
    const preFix = `
      function TicketConversationPanel({ thread, composer }) {
        return (
          <Card variant="default">
            <CardContent>{thread}</CardContent>
            <CardFooter>{composer}</CardFooter>
            <div className="p-2 text-xs">{helperText}</div>
          </Card>
        )
      }
    `
    const sf = ts.createSourceFile("fixture.tsx", preFix, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const found: Offender[] = []
    const visit = (node: ts.Node): void => {
      if (
        (ts.isJsxElement(node) && FOOTER_TAGS.has(tagNameOf(node))) ||
        (ts.isJsxSelfClosingElement(node) && FOOTER_TAGS.has(tagNameOf(node)))
      ) {
        const box = enclosingBox(node)
        if (box) {
          const last = lastRealChild(box)
          const ok = last !== undefined && spans(last, node)
          if (!ok) found.push({ rel: "fixture.tsx", line: 0, tag: tagNameOf(node) })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
    expect(found.length, "the pre-fix fixture's CardFooter has a sibling after it").toBe(1)
    expect(found[0]!.tag).toBe("CardFooter")
  })

  // THE POST-FIX SHAPE — `ticket-detail-body.tsx`'s own real shape today:
  // `CardContent` (the thread) then `CardFooter` (the composer), nothing
  // after it.
  it("the post-fix shape (CardFooter as the card's own last child) passes clean", () => {
    const postFix = `
      function TicketConversationPanel({ thread, composer }) {
        return (
          <Card variant="default" className="flex h-[min(78vh,760px)] min-h-[420px] flex-col lg:h-full">
            <CardContent className="min-h-0 flex-1 overflow-y-auto p-4">{thread}</CardContent>
            <CardFooter className="shrink-0 p-4">{composer}</CardFooter>
          </Card>
        )
      }
    `
    const sf = ts.createSourceFile("fixture.tsx", postFix, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const found: Offender[] = []
    const visit = (node: ts.Node): void => {
      if (
        (ts.isJsxElement(node) && FOOTER_TAGS.has(tagNameOf(node))) ||
        (ts.isJsxSelfClosingElement(node) && FOOTER_TAGS.has(tagNameOf(node)))
      ) {
        const box = enclosingBox(node)
        if (box) {
          const last = lastRealChild(box)
          const ok = last !== undefined && spans(last, node)
          if (!ok) found.push({ rel: "fixture.tsx", line: 0, tag: tagNameOf(node) })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
    expect(found.length, "the post-fix fixture's CardFooter is the card's own last child").toBe(0)
  })

  // ROT PROOF — the real, unmodified file passes this census today. The
  // composer's own CardFooter is TicketDetailBody's own root's last child
  // now (round 23, R89) rather than nested inside a per-width
  // TicketConversationPanel (retired) — the census is generic over tag
  // names, so this proof still holds regardless of which component wraps it.
  it("ticket-detail-body.tsx's own real composer CardFooter passes clean", () => {
    const offenders = findOffenders().filter((o) => o.rel === "components/tickets/ticket-detail-body.tsx")
    expect(offenders, JSON.stringify(offenders)).toEqual([])
  })
})
