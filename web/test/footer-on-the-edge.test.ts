// R89 "footer-on-the-edge" — ROUND 24, THE CORRECTION, 19 Sep 2026. Every
// earlier round (kept in this file's own git history, and in
// `ticket-detail-body.tsx`'s own header) chased "the footer" meaning the
// TICKET'S REPLY COMPOSER. Aurora, this round, over her own screenshot,
// verbatim: "the black section, the footer, should be at the very bottom /
// why is the write text space full width?? rewind here / THE FUKING
// FOOTERRR!" THE FOOTER IS THE BLACK BAND — the dark card holding LATEST
// ACTIVITY (the recent rows + "Add a note") and RECORD (Created by / Last
// edited by), the kit's own CH27.8 ink footer — never the composer.
//
// THE LAW NOW READS, FINAL FORM: the ticket's dark band (Latest activity +
// Record) is the page's footer — the last element, pinned at the bottom of
// the screen at every width and height; the conversation and side cards
// scroll above it; the reply composer sits at the conversation card's foot.
//
// THE FIX, IN TWO PARTS: (1) `record-chrome.tsx` exports `RecordFooterBand`,
// a SECOND call to the kit's `RecordDetail` with nothing but the footer's
// own props (no title/hero/tabs, `panelVisible={false}`), so the only
// region that renders is the footer card — DOM order between it and
// `TicketDetailBody` is decided by where each is CALLED, and
// `RecordFooterBand` is called INSIDE `TicketDetailBody`, as its own last
// child, rather than inside `RecordScreen`'s one call (which now passes
// `footerVisible={false}` so the same card never draws twice). (2)
// `TicketConversationPanel` — retired in round 23 — is UN-RETIRED, exactly
// its round-22 shape (`git show d1167183`): `Card` → `CardContent` (the
// thread, scrolling) → `CardFooter` (the composer, `Card`'s own last
// child, D21), at every width, because the BAND is what now guarantees
// "always visible at the bottom," not the composer needing a second,
// below-`lg` home outside any card.
//
// BOUNDED BY CONSTRUCTION, NOT BY `sticky` ALONE — live injection this
// round (40 thread bubbles + 6 activity rows, 1991×842 and 1440×842 with
// the assistant open, against T0001, DOM-moved and class-patched live
// before touching source, `${SCRATCH}/band-proof.json`) found a sticky
// band riding on an UNBOUNDED scrolling region rides DOWN with it the
// instant that region's content outgrows the viewport
// (`ticketBody.clientHeight` measured 7px, the thread's own `[role="log"]`
// never actually capping — `scrollHeight === clientHeight`, growing rather
// than scrolling). Fixed by binding every link in the chain FIRST: `h-full
// min-h-0` (at `lg`, a grid cell already at 100% of its row) or `flex-1
// min-h-0` (below `lg`, a stack item sharing the column with the side
// panels' own natural height) on the conversation cell, `h-full min-h-0`
// on `TicketConversationPanel`'s own `Card`, and `min-h-0 overflow-y-auto`
// added to its `CardContent` (the ONE true scroller) — so the scrolling
// region is bounded BY CONSTRUCTION and the band's own position falls out
// of that bound. `position: sticky`, carrying round 23's own negative,
// padding-compensated `bottom` offset, stays on the band as
// BELT-AND-BRACES ONLY, never the primary mechanism.
//
// Proved live at 1800×978 (rail expanded), 1991×842 (assistant open),
// 1440×900, 1280×800 and 760×900 (rail collapsed), plus the 40-bubble/
// 6-row stress at 1991×842 and 1440×842: the band's bottom sits flush with
// the pane's own bottom edge (0px) at every width `md:` (768px) and above,
// the thread scrolls inside the card (not the page) at every width
// including under stress, and the composer's own rendered width equals the
// card's inner width. Below `md` (760×900), the app's own PRE-EXISTING,
// unrelated `pb-24 md:pb-0` mobile bottom-chrome reservation on
// `app-shell.tsx`'s page container (measured identical on the untouched
// round-23 composer before this round) leaves a 96px gap against the
// pane's raw border box — not a regression this round introduced, and the
// band still sits flush with the page's own real content edge.
//
// `app-shell.tsx`'s own `has-[[data-slot=ticket-detail-body]]:h-[calc(…)]`
// growth rule (round 22b) and `record-chrome.tsx`'s own `HEAD_ONLY` wiring
// (18 Sep 2026 evening) are BOTH UNCHANGED and still load-bearing — see
// this file's own git history for their full accounts — so both are still
// censused below, unmodified, alongside the new round-24 shape.

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = join(__dirname, "..", "..")

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8")
}

describe("R89 — footer-on-the-edge", () => {
  const shell = read("web/components/shell/app-shell.tsx")
  const chrome = read("web/components/records/record-chrome.tsx")
  const body = read("web/components/tickets/ticket-detail-body.tsx")
  const helpDetail = read("web/components/tickets/help-detail.tsx")

  it("app-shell.tsx's own page container is a flex column with a DEFINITE height (h-full, not min-h-full)", () => {
    // Unchanged since 18 Sep 2026 evening — round 24 touches WHAT is pinned
    // inside `[data-slot=ticket-detail-body]`, never the chain that gives
    // that root a real, definite height budget to grow against.
    const at = shell.indexOf("mx-auto flex w-full max-w-none")
    expect(at, "app-shell.tsx must still draw its one R29 page container as a flex box").toBeGreaterThan(-1)
    const tag = shell.slice(Math.max(0, at - 200), at + 400)
    expect(tag.includes("flex-col"), "the page container must be a flex COLUMN — TicketDetailBody grows against it").toBe(
      true
    )
    const classStringStart = shell.lastIndexOf('"', at)
    const classStringEnd = shell.indexOf('"', at)
    const classString = shell.slice(classStringStart + 1, classStringEnd)
    expect(
      /(^|\s)h-full(\s|$)/.test(classString),
      "the page container must carry a DEFINITE h-full, not a min-h-full floor"
    ).toBe(true)
    expect(
      classString.includes("min-h-full"),
      "min-h-full must not come back on this div — it is a floor, not the cap the flex-1/min-h-0 chain below it needs"
    ).toBe(false)
  })

  it("app-shell.tsx's page container opts OUT of the pane's own bottom inset when a ticket body is present (round 22b, unchanged)", () => {
    const at = shell.indexOf("mx-auto flex w-full max-w-none")
    expect(at, "app-shell.tsx must still draw its one R29 page container as a flex box").toBeGreaterThan(-1)
    const tagEnd = shell.indexOf(">", at)
    const tag = shell.slice(Math.max(0, at - 400), tagEnd)
    expect(
      tag.includes("has-[[data-slot=ticket-detail-body]]:h-[calc(100%+var(--space-5))]"),
      "below lg the container must grow by exactly the pane's own below-lg bottom padding (--space-5) when a ticket body is present"
    ).toBe(true)
    expect(
      tag.includes("lg:has-[[data-slot=ticket-detail-body]]:h-[calc(100%+var(--space-6))]"),
      "at lg the container must grow by exactly the pane's own lg bottom padding (--space-6) when a ticket body is present"
    ).toBe(true)
  })

  it("record-chrome.tsx stops the head competing with a sibling body for the column's growth (unchanged)", () => {
    const headOnlyAt = chrome.indexOf("const HEAD_ONLY")
    expect(headOnlyAt, "record-chrome.tsx must declare a HEAD_ONLY constant for the no-panel case").toBeGreaterThan(-1)
    const headOnlyLine = chrome.slice(headOnlyAt, chrome.indexOf("\n", headOnlyAt))
    expect(headOnlyLine.includes("flex-none"), "HEAD_ONLY must be flex-none — the head takes its own content height, never a share of the column").toBe(
      true
    )
    const wireAt = chrome.indexOf("panelVisible ? FOOTER_TO_BOTTOM : HEAD_ONLY")
    expect(
      wireAt,
      "RecordChrome's own className must switch between FOOTER_TO_BOTTOM and HEAD_ONLY off panelVisible"
    ).toBeGreaterThan(-1)
  })

  it("record-chrome.tsx exports RecordFooterBand, a second call to the kit's RecordDetail carrying only the footer's own props", () => {
    const fnAt = chrome.indexOf("export function RecordFooterBand")
    expect(fnAt, "record-chrome.tsx must export RecordFooterBand — the second, footer-only RecordDetail call").toBeGreaterThan(-1)
    const fnEnd = chrome.indexOf("\n}\n", fnAt)
    const fnBody = chrome.slice(fnAt, fnEnd)
    expect(fnBody.includes("<RecordDetail"), "RecordFooterBand must call the kit's own RecordDetail directly").toBe(true)
    expect(fnBody.includes("panelVisible={false}"), "RecordFooterBand's own RecordDetail call must turn the panel off — no title/hero/tabs are passed either, so the panel is the only region that could otherwise draw").toBe(
      true
    )
    // NO title/band props, no hero — so `hasBand`/`hasHero` read false inside
    // the kit's own RecordDetail and only the footer region (region 4)
    // renders.
    expect(fnBody.includes("title="), "RecordFooterBand must not pass a title — that would draw a second band region").toBe(false)
    expect(fnBody.includes("hero="), "RecordFooterBand must not pass a hero — that would draw a second hero region").toBe(false)
    // THE FLUSH BOTTOM EDGE — R31's own named exception for a surface that
    // meets the screen's true bottom, cropped from outside since the kit's
    // own footer Card carries no prop to narrow its radius to one edge.
    expect(fnBody.includes("overflow-hidden"), "RecordFooterBand must crop the kit's own four-corner-radius footer card").toBe(true)
    expect(fnBody.includes("rounded-t-[var(--radius)]"), "the crop must leave only the TOP radius, R31's own named exception for a flush bottom edge").toBe(true)
  })

  it("record-chrome.tsx's RecordScreen carries a footerVisible passthrough, forwarded to the kit's RecordChrome", () => {
    const propAt = chrome.indexOf("footerVisible?: boolean")
    expect(propAt, "RecordScreen's own prop type must declare footerVisible").toBeGreaterThan(-1)
    const defaultAt = chrome.indexOf("footerVisible = true,")
    expect(defaultAt, "footerVisible must default to true — every existing caller keeps its own footer unless it opts out").toBeGreaterThan(-1)
    const forwardAt = chrome.indexOf("footerVisible={footerVisible}")
    expect(forwardAt, "RecordScreen must forward footerVisible straight to the kit's own RecordChrome/RecordDetail").toBeGreaterThan(-1)
  })

  it("help-detail.tsx switches RecordScreen's own footer off and builds the real one from RecordFooterBand instead", () => {
    // THE MAIN CALL, NOT THE LOADING/ERROR/EMPTY SKELETON'S OWN
    // `<RecordScreen>` (three earlier, smaller calls this file also
    // renders, plus a prose mention in this file's own header comment) —
    // found by the LAST real `panelVisible={false}` in the file.
    const panelVisibleAt = helpDetail.lastIndexOf("panelVisible={false}")
    expect(panelVisibleAt, "help-detail.tsx's main RecordScreen call must still pass panelVisible={false}").toBeGreaterThan(-1)
    const screenAt = helpDetail.lastIndexOf("<RecordScreen", panelVisibleAt)
    expect(screenAt, "help-detail.tsx must still render RecordScreen").toBeGreaterThan(-1)
    // `<TicketDetailBody\n` — not a bare `<TicketDetailBody` — this file's
    // own leading comment (unchanged, above the RecordScreen call) mentions
    // "`<TicketDetailBody>`" in prose first.
    const bodyAt = helpDetail.indexOf("<TicketDetailBody\n", screenAt)
    expect(bodyAt, "help-detail.tsx must still render TicketDetailBody after RecordScreen").toBeGreaterThan(screenAt)
    const screenSlice = helpDetail.slice(screenAt, bodyAt)
    expect(screenSlice.includes("footerVisible={false}"), "the RecordScreen call must switch its own footer off — round 24's whole point is that copy sits in the wrong DOM place").toBe(
      true
    )
    const bodyTail = helpDetail.slice(bodyAt)
    expect(bodyTail.includes("<RecordFooterBand"), "TicketDetailBody's own footer prop must be built from RecordFooterBand").toBe(true)
    expect(
      bodyTail.indexOf("<RecordFooterBand") < bodyTail.indexOf("thread={"),
      "footer must be wired before thread/composer in the call, matching this file's own prose order"
    ).toBe(true)
  })

  it("TicketDetailBody's own root is a flex column whose exactly two children are the scrolling region and the pinned band", () => {
    const fnAt = body.indexOf("export function TicketDetailBody")
    expect(fnAt).toBeGreaterThan(-1)
    const at = body.indexOf('data-slot="ticket-detail-body"', fnAt)
    expect(at, 'TicketDetailBody must mark its own root data-slot="ticket-detail-body" — R89 reads this file by it').toBeGreaterThan(
      -1
    )
    const rootTag = body.slice(at, body.indexOf(">", at))
    expect(rootTag.includes("flex-col"), "the root must be a flex column").toBe(true)
    expect(rootTag.includes("flex-1"), "the root must grow (flex-1) against app-shell's own flex column").toBe(true)
    expect(rootTag.includes("min-h-0"), "the root must allow itself to shrink below its own content height (min-h-0)").toBe(
      true
    )

    // THE BAND — this component's own last child now, marked
    // data-slot="ticket-footer-band", never a bare <CardFooter> (round 23's
    // shape, retired).
    const bandAt = body.indexOf('data-slot="ticket-footer-band"', at)
    expect(bandAt, "the root's own pinned band must exist, marked data-slot=\"ticket-footer-band\"").toBeGreaterThan(-1)
    const bandTagStart = body.lastIndexOf("<div", bandAt)
    const bandTag = body.slice(bandTagStart, body.indexOf(">", bandAt))
    expect(bandTag.includes("sticky"), "the band must carry sticky — the belt-and-braces half of round 24's fix").toBe(true)
    expect(
      bandTag.includes("bottom-[calc(-1*var(--space-5))]") && bandTag.includes("lg:bottom-[calc(-1*var(--space-6))]"),
      "the band's sticky offset must be the round-23 negative, padding-compensated bottom, not bottom-0"
    ).toBe(true)
    expect(bandTag.includes("bottom-0"), "bottom-0 must NOT appear — it reintroduces the 24px gap round 23 already fixed").toBe(false)
    expect(bandTag.includes("flex-none"), "the band must be flex-none — never a share of the scroll region's budget").toBe(
      true
    )
    expect(bandTag.includes("w-full"), "the band must be w-full — full content width").toBe(true)

    // Nothing may render after the band inside the root — D21's own "last
    // child" rule, restated positionally for the root itself.
    const fnEnd = body.indexOf("\n}\n", fnAt)
    const afterBand = body
      .slice(body.indexOf("</div>", bandAt) , fnEnd)
    // The band's own closing </div> is immediately followed by the root's
    // own closing </div>) — nothing else in between but whitespace.
    const betweenBandCloseAndRootClose = afterBand.slice("</div>".length)
    const nextRealTagAt = betweenBandCloseAndRootClose.search(/\S/)
    expect(
      betweenBandCloseAndRootClose.slice(nextRealTagAt, nextRealTagAt + 6),
      "the band's own closing tag must be followed immediately by the root's own closing tag — nothing renders after the band"
    ).toBe("</div>")
  })

  it("TicketConversationPanel is UN-RETIRED — the composer nests inside its own Card's CardFooter again, at every width", () => {
    const fnAt = body.indexOf("export function TicketConversationPanel")
    expect(fnAt, "TicketConversationPanel must be restored, round 24 ('rewind here')").toBeGreaterThan(-1)
    const fnEnd = body.indexOf("\n}\n", fnAt)
    const fnBody = body.slice(fnAt, fnEnd)
    expect(fnBody.includes("<CardContent"), "the thread must render inside CardContent").toBe(true)
    expect(fnBody.includes("<CardFooter"), "the composer must render inside CardFooter, the card's own last child").toBe(true)
    expect(fnBody.indexOf("<CardContent")).toBeLessThan(fnBody.indexOf("<CardFooter"))
    expect(fnBody.includes("h-full min-h-0"), "the Card must be bounded (h-full min-h-0) so its own CardContent can actually cap and scroll the thread, rather than growing unbounded").toBe(
      true
    )
    expect(fnBody.includes("overflow-y-auto"), "CardContent must be the one true scroller (min-h-0 overflow-y-auto)").toBe(true)

    // BOTH branches of TicketDetailBody must call it — never a per-width
    // duplicate shape.
    const callCount = (body.match(/<TicketConversationPanel\b/g) || []).length
    expect(callCount, "TicketConversationPanel must be called exactly once, by the shared `conversation` const both branches render").toBe(1)
  })

  it("at lg, the scroll region is a bounded 2fr/1fr grid pairing the conversation (first/left) with the side panels (second/right)", () => {
    const fnAt = body.indexOf("export function TicketDetailBody")
    const isAtLeastLgAt = body.indexOf("isAtLeastLg ? (", fnAt)
    expect(isAtLeastLgAt, "TicketDetailBody must branch its scroll region on isAtLeastLg").toBeGreaterThan(-1)
    const lgBranchEnd = body.indexOf(") : (", isAtLeastLgAt)
    expect(lgBranchEnd, "must render a ternary with a below-lg branch after it").toBeGreaterThan(isAtLeastLgAt)
    const lgBranch = body.slice(isAtLeastLgAt, lgBranchEnd)

    expect(lgBranch.includes("grid"), "the lg branch's own scroll-region child must be a grid").toBe(true)
    expect(lgBranch.includes("grid-cols-[2fr_1fr]"), "the lg branch must split 2fr/1fr").toBe(true)
    expect(lgBranch.includes("items-stretch"), "the lg branch's grid must stretch its cells to the row's own height — bounded, not natural-height (round 24 needs the conversation cell definite)").toBe(true)
    expect(lgBranch.includes("h-full"), "the lg branch's grid must carry h-full so its cells resolve to a real height").toBe(true)

    const threadAt = lgBranch.indexOf("conversation")
    const sideAt = lgBranch.indexOf("sidePanels")
    expect(threadAt, "the lg branch must render the conversation").toBeGreaterThan(-1)
    expect(sideAt, "the lg branch must render the side panels").toBeGreaterThan(-1)
    expect(threadAt, "the conversation must come first/left in the 2fr/1fr grid").toBeLessThan(sideAt)
  })

  it("below lg, the scroll region stacks the side panels THEN the conversation — her own 'above the content' complaint, answered by DOM order", () => {
    const fnAt = body.indexOf("export function TicketDetailBody")
    const belowLgBranchAt = body.indexOf(") : (", body.indexOf("isAtLeastLg ? (", fnAt))
    expect(belowLgBranchAt, "must render a below-lg branch").toBeGreaterThan(-1)
    const branchEnd = body.indexOf(")}", belowLgBranchAt)
    const belowLgBranch = body.slice(belowLgBranchAt, branchEnd)

    expect(belowLgBranch.includes("flex-col"), "the below-lg branch's own scroll-region child must be a flex column (stacked)").toBe(true)
    expect(belowLgBranch.includes("h-full"), "the below-lg stack must itself be bounded (h-full min-h-0) so the conversation's own flex-1 has a real budget").toBe(true)
    const sideAt = belowLgBranch.indexOf("sidePanels")
    const threadAt = belowLgBranch.indexOf("conversation")
    expect(sideAt, "the below-lg branch must render the side panels").toBeGreaterThan(-1)
    expect(threadAt, "the below-lg branch must render the conversation").toBeGreaterThan(-1)
    expect(sideAt, "the side panels must come before the conversation below lg — her own complaint, inverted").toBeLessThan(threadAt)
  })

  it("the conversation cell takes h-full min-h-0 at lg but flex-1 min-h-0 below lg — a grid cell is not a stack item", () => {
    const fnAt = body.indexOf("export function TicketDetailBody")
    const conversationConstAt = body.indexOf("const conversation = (", fnAt)
    expect(conversationConstAt, "TicketDetailBody must build one shared `conversation` const").toBeGreaterThan(-1)
    const conversationConstEnd = body.indexOf("const sidePanels = (", conversationConstAt)
    const constBody = body.slice(conversationConstAt, conversationConstEnd)
    expect(constBody.includes("isAtLeastLg"), "the conversation anchor's own className must branch on isAtLeastLg, not reuse one string for both cell shapes").toBe(
      true
    )
    expect(constBody.includes("h-full min-h-0"), "the lg branch of the anchor's className must be h-full min-h-0").toBe(true)
    expect(constBody.includes("flex-1 min-h-0"), "the below-lg branch of the anchor's className must be flex-1 min-h-0 (a stack item sharing the column with the side panels), never h-full (which would claim 100% on top of their own natural height)").toBe(
      true
    )
  })

  it("the ONE scrolling region wrapping both per-width branches is flex-1 min-h-0 overflow-y-auto, and is the root's other child besides the band", () => {
    const fnAt = body.indexOf("export function TicketDetailBody")
    const returnAt = body.indexOf("return (", fnAt)
    const rootAt = body.indexOf('data-slot="ticket-detail-body"', returnAt)
    const scrollAt = body.indexOf("overflow-y-auto", rootAt)
    expect(scrollAt, "TicketDetailBody's own root must wrap a single overflow-y-auto scroll region").toBeGreaterThan(-1)
    const scrollTagStart = body.lastIndexOf("<div", scrollAt)
    const scrollTag = body.slice(scrollTagStart, body.indexOf(">", scrollAt))
    expect(scrollTag.includes("flex-1"), "the scroll region must be flex-1").toBe(true)
    expect(scrollTag.includes("min-h-0"), "the scroll region must be min-h-0").toBe(true)
    expect(scrollTag.includes("overflow-y-auto"), "the scroll region must be overflow-y-auto").toBe(true)

    const fnEnd = body.indexOf("\n}\n", fnAt)
    const rootBody = body.slice(body.indexOf(">", rootAt), fnEnd)
    const bandCount = (rootBody.match(/data-slot="ticket-footer-band"/g) || []).length
    expect(bandCount, "exactly one band in the root").toBe(1)
  })
})
