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
//
// ROUND 26, THE MARGIN CORRECTION, 19 Sep 2026 — Aurora, reading the round-24
// page back, verbatim: "ok, now the footer is at the bottom, but there's a
// law about how much margin there must be above!!! add the space!!" The
// band's own flush bottom edge (round 24, unchanged) was already correct;
// what was missing was the ordinary panel gap ABOVE it — the same `gap-6`
// (24px at the 16px root, `documents/UI-RULEBOOK.md` S1/N7, "between panels
// on a screen: gap-6") every other pair of stacked panels already carries.
// `ticket-detail-body.tsx`'s own root now carries `gap-6` itself, between
// its two children (the scrolling region and the band) — by TOKEN, never a
// hand-numbered offset — asserted below alongside the existing root census.
//
// ROUND 27, THE SIDE COLUMN NEVER SCROLLS, 19 Sep 2026 — Aurora, over the
// live page: "there should be no scrolling to see all right column items —
// expand the height!" / "scroll only on conversation when taller than
// right column." Round 24's `lg` grid forced the ROW to fill the whole
// scrolling region (`h-full min-h-0` on the grid AND on the side column,
// `overflow-y-auto` on the side column) — so a short ticket showed the side
// column scrolling inside its own little box while the conversation card
// sat mostly empty beside it. Backwards: the side column's three cards are
// what a person needs to see in FULL every time; the conversation is what
// varies wildly. Rebuilt by construction: the grid and the side column both
// drop `h-full`/`min-h-0` (grid) and `h-full`/`min-h-0`/`overflow-y-auto`
// (side column) — content-sized now, like any ordinary block, so the row
// resolves to the side column's own natural height. The conversation CELL
// drops `h-full` for `relative min-h-0` — no height class of its own, sized
// only by the grid's own `items-stretch`. And `TicketConversationPanel`'s
// `Card` takes a new `fill="absolute"` at `lg` (`position: absolute; inset:
// 0`, see that component's own header) — taken OUT of flow so the cell
// contributes ZERO intrinsic height back to the grid's own auto-track
// sizing, which is what keeps a long thread from dragging the row (and the
// side column with it) taller. `ticket-detail-body.tsx`'s own header
// carries the full account and the live proof numbers
// (`${SCRATCH}/row-proof.json`).
//
// ROUND 28, ONE PAGE SCROLL, NO INNER SCROLLBAR, 19-20 Sep 2026 — a
// dark-theme screenshot showed a SECOND scrollbar inside the ticket page,
// above the band: rounds 24-27's own "ONE SCROLLING REGION" wrapper
// (`flex-1 min-h-0 overflow-y-auto`) was a real `overflow:auto` box bounded
// to whatever height the flex chain above it resolved to, so it scrolled
// its OWN content once that content needed more room — restated as the
// standing R91 (`no-nested-scroll`, "never need to scroll to see al
// content!!!"). Fixed by REMOVING the bound rather than moving it: the
// ROOT drops `min-h-0` (keeps `flex-1` — flexbox's own automatic minimum
// size floors it to its own content, past the leftover space, without a
// literal `min-h-full`'s blindness to the sibling head, which FAILED the
// short-page proof by exactly the head's own height); the REGION drops
// `flex-1`/`min-h-0`/`overflow-y-auto` entirely, content-sized like the
// side column already was; the BAND drops `sticky` and its negative bottom
// offset for `mt-auto`; and `app-shell.tsx`'s own
// `has-[[data-slot=ticket-detail-body]]` growth rule is RETIRED, since
// nothing here is sticky any more. `ticket-detail-body.tsx`'s own header
// carries the full account and the live proof numbers
// (`${SCRATCH}/onescroll-proof2.json`, after a failed `min-h-full`
// candidate in `${SCRATCH}/onescroll-proof.json`).

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"

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

  it("app-shell.tsx's page container carries NO ticket-specific growth any more (round 28 retired it — the ticket band reaches flush through its own real content, not this rule)", () => {
    const at = shell.indexOf("mx-auto flex w-full max-w-none")
    expect(at, "app-shell.tsx must still draw its one R29 page container as a flex box").toBeGreaterThan(-1)
    const tagEnd = shell.indexOf(">", at)
    const tag = shell.slice(Math.max(0, at - 400), tagEnd)
    expect(
      tag.includes("has-[[data-slot=ticket-detail-body]]"),
      "the ticket-specific has-[[data-slot=ticket-detail-body]] growth rule must stay GONE — round 28 retired it for T0001, which overflows this div's h-full ceiling on its own real content"
    ).toBe(false)
  })

  it("app-shell.tsx's page container grows PAST the pane's reserved bottom padding whenever a RecordDetailBody footer band is present (22 Sep 2026 — a short story/knowledge source does not overflow the h-full ceiling on its own, so mt-auto alone lands 24px short; the exact calc() round 28 retired for tickets, narrowed to a marker only RecordDetailBody's own footer wrapper carries)", () => {
    const at = shell.indexOf("mx-auto flex w-full max-w-none")
    const tagEnd = shell.indexOf(">", at)
    const tag = shell.slice(Math.max(0, at - 800), tagEnd)
    expect(
      tag.includes("has-[[data-slot=record-footer-band]]:h-[calc(100%+var(--space-5))]"),
      "the below-lg growth rule must be keyed to record-footer-band (RecordDetailBody's own footerDataSlot default) — reaching story-detail.tsx and knowledge-detail.tsx, never the ticket page's own, separately-marked ticket-footer-band"
    ).toBe(true)
    expect(
      tag.includes("lg:has-[[data-slot=record-footer-band]]:h-[calc(100%+var(--space-6))]"),
      "the lg growth rule must exist too, matching DENSITY_BODY's own comfortable-density reserved padding-bottom at that breakpoint"
    ).toBe(true)
    // NEVER RE-KEYED TO THE TICKET'S OWN MARKER — that would double up with
    // T0001's already-proved natural-overflow flush (harmless on its own,
    // but a sign this rule drifted back onto the exact case round 28 showed
    // needs no help) and would miss the whole point: the ticket page is
    // deliberately UNTOUCHED by this rule.
    expect(tag.includes("has-[[data-slot=ticket-detail-body]]:h-[calc")).toBe(false)
    expect(tag.includes("has-[[data-slot=ticket-footer-band]]:h-[calc")).toBe(false)
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
    // COMMENTS STRIPPED — this function's own note quotes the two classes it
    // no longer carries (`overflow-hidden rounded-t-[var(--radius)]`), which
    // is the house discipline for an overturned argument and is exactly what
    // a raw `includes` would then find. `keepLength` so the slice arithmetic
    // above and every offset below still line up.
    const fnBody = stripComments(chrome.slice(fnAt, fnEnd), { keepLength: true })
    expect(fnBody.includes("<RecordDetail"), "RecordFooterBand must call the kit's own RecordDetail directly").toBe(true)
    expect(fnBody.includes("panelVisible={false}"), "RecordFooterBand's own RecordDetail call must turn the panel off — no title/hero/tabs are passed either, so the panel is the only region that could otherwise draw").toBe(
      true
    )
    // NO title/band props, no hero — so `hasBand`/`hasHero` read false inside
    // the kit's own RecordDetail and only the footer region (region 4)
    // renders.
    expect(fnBody.includes("title="), "RecordFooterBand must not pass a title — that would draw a second band region").toBe(false)
    expect(fnBody.includes("hero="), "RecordFooterBand must not pass a hero — that would draw a second hero region").toBe(false)
    // THE FLUSH BOTTOM EDGE, AND THE FULL-ROW BAND — BOTH THE KIT'S OWN NOW
    // (v1.2.149, 21 Sep 2026). This used to assert the opposite: an
    // `overflow-hidden rounded-t-[var(--radius)]` crop, applied from outside,
    // because the kit's footer Card carried no prop to narrow its radius to
    // one edge. It does now — `rounded-[var(--radius-pane-edge)]`, a declared
    // token the shell's body rebinds to `0px` — and the band ALSO pulls itself
    // out to the pane's edge with `-mx-[var(--pane-inset-x,0px)]` under
    // Aurora's ruling "make footer not inside a container, but the full row
    // side to side (withing the main content)". A crop on the element
    // immediately around it would clip exactly that escape, so the two
    // classes are now FORBIDDEN here rather than required. Both directions
    // are asserted: the app must not re-round the band and must not clip it.
    expect(
      fnBody.includes("overflow-hidden"),
      "RecordFooterBand must NOT crop — overflow:hidden here clips the band's own -mx escape to the pane edge"
    ).toBe(false)
    expect(
      fnBody.includes("rounded-t-[var(--radius)]"),
      "RecordFooterBand must NOT re-round the band — the kit squares it against the pane through --radius-pane-edge, and keeps its box radius outside a pane through the same token's own fallback"
    ).toBe(false)
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
    // ROUND 28 — min-h-0 is GONE. Without it, flexbox's own "automatic
    // minimum size" (min-height's initial value, `auto`) floors the root to
    // its own CONTENT height once that exceeds the leftover space after the
    // head — which is what lets the page grow past the fold and scroll as
    // ONE region, instead of the root being clamped to a budget an inner
    // `overflow-y-auto` region then had to scroll on its own.
    expect(
      rootTag.includes("min-h-0"),
      "the root must NOT carry min-h-0 any more (round 28) — the automatic minimum size is what lets it grow past its own leftover-space floor instead of clamping and needing an inner scrollbar"
    ).toBe(false)
    expect(
      rootTag.includes("gap-6"),
      "the root must carry gap-6 — round 26's panel gap between the scrolling region and the band, the same token every other pair of stacked panels uses"
    ).toBe(true)

    // THE BAND — this component's own last child now, marked
    // data-slot="ticket-footer-band", never a bare <CardFooter> (round 23's
    // shape, retired).
    const bandAt = body.indexOf('data-slot="ticket-footer-band"', at)
    expect(bandAt, "the root's own pinned band must exist, marked data-slot=\"ticket-footer-band\"").toBeGreaterThan(-1)
    const bandTagStart = body.lastIndexOf("<div", bandAt)
    const bandTag = body.slice(bandTagStart, body.indexOf(">", bandAt))
    // ROUND 28 — sticky is GONE. The band is an ordinary flow child now;
    // `mt-auto` is what pushes it to the root's own bottom edge when
    // content is short (the root's own leftover space, per above), and it
    // simply follows the region in normal flow when content is tall.
    expect(bandTag.includes("sticky"), "sticky must NOT appear on the band any more (round 28) — the band is normal flow, mt-auto").toBe(false)
    expect(
      bandTag.includes("bottom-[calc(-1*var(--space-5))]") || bandTag.includes("lg:bottom-[calc(-1*var(--space-6))]"),
      "the round-23 negative, padding-compensated bottom offset must be GONE — nothing needs to reach past the pane's own padding any more"
    ).toBe(false)
    expect(bandTag.includes("bottom-0"), "bottom-0 must not appear either — the band is not positioned at all").toBe(false)
    expect(bandTag.includes("mt-auto"), "the band must carry mt-auto — the ordinary flex 'footer at the bottom of a short page' trick, round 28").toBe(true)
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
    // ROUND 27 — the Card's OWN sizing is now a `fill` prop, not one
    // hand-typed className: `"block"` (default, below lg) still resolves
    // to the original `h-full min-h-0`; `"absolute"` (lg) resolves to
    // `absolute inset-0`, taken out of flow so the card contributes no
    // intrinsic height back to its grid cell (`ticket-detail-body.tsx`'s
    // own header has the full account).
    expect(fnBody.includes('fill?: "absolute" | "block"'), "TicketConversationPanel must declare a fill prop, round 27").toBe(true)
    expect(fnBody.includes("absolute inset-0"), "the absolute branch must be absolute inset-0").toBe(true)
    expect(fnBody.includes("h-full min-h-0"), "the block branch (below lg) must still be h-full min-h-0, unchanged").toBe(
      true
    )
    expect(fnBody.includes("overflow-y-auto"), "CardContent must be the one true scroller (min-h-0 overflow-y-auto)").toBe(true)

    // BOTH branches of TicketDetailBody must call it — never a per-width
    // duplicate shape.
    const callCount = (body.match(/<TicketConversationPanel\b/g) || []).length
    expect(callCount, "TicketConversationPanel must be called exactly once, by the shared `conversation` const both branches render").toBe(1)
  })

  it("at lg, the scroll region is a CONTENT-SIZED 2fr/1fr grid pairing the conversation (first/left) with the side panels (second/right) — round 27, no h-full/min-h-0 on the grid", () => {
    const fnAt = body.indexOf("export function TicketDetailBody")
    const isAtLeastLgAt = body.indexOf("isAtLeastLg ? (", fnAt)
    expect(isAtLeastLgAt, "TicketDetailBody must branch its scroll region on isAtLeastLg").toBeGreaterThan(-1)
    const lgBranchEnd = body.indexOf(") : (", isAtLeastLgAt)
    expect(lgBranchEnd, "must render a ternary with a below-lg branch after it").toBeGreaterThan(isAtLeastLgAt)
    const lgBranch = body.slice(isAtLeastLgAt, lgBranchEnd)

    expect(lgBranch.includes("grid"), "the lg branch's own scroll-region child must be a grid").toBe(true)
    expect(lgBranch.includes("grid-cols-[2fr_1fr]"), "the lg branch must split 2fr/1fr").toBe(true)
    expect(lgBranch.includes("items-stretch"), "the lg branch's grid must stretch its cells to the row's own height").toBe(true)
    // ROUND 27 — an explicit-height grid with one `auto` row would let
    // `align-content`'s own default `stretch` hand that row the FULL
    // container height regardless of content, which is exactly what forced
    // the side column's own internal scrollbar (the bug this round fixes).
    // The grid's own tag — not the whole branch string, which also
    // contains the side wrapper's className a few lines down — must not
    // carry either class.
    const gridTagStart = lgBranch.indexOf("<div")
    const gridTagEnd = lgBranch.indexOf(">", gridTagStart)
    const gridTag = lgBranch.slice(gridTagStart, gridTagEnd)
    expect(gridTag.includes("h-full"), "the grid's own tag must NOT carry h-full any more (round 27)").toBe(false)
    expect(gridTag.includes("min-h-0"), "the grid's own tag must NOT carry min-h-0 any more (round 27) — content-sized, like any ordinary block").toBe(false)

    const threadAt = lgBranch.indexOf("conversation")
    const sideAt = lgBranch.indexOf("sidePanels")
    expect(threadAt, "the lg branch must render the conversation").toBeGreaterThan(-1)
    expect(sideAt, "the lg branch must render the side panels").toBeGreaterThan(-1)
    expect(threadAt, "the conversation must come first/left in the 2fr/1fr grid").toBeLessThan(sideAt)

    // THE SIDE WRAPPER — natural height, never scrolling (round 27, the
    // whole point of this round: "there should be no scrolling to see all
    // right column items").
    const sidePanelsAt = lgBranch.indexOf("{sidePanels}")
    expect(sidePanelsAt, "the lg branch must render {sidePanels}").toBeGreaterThan(-1)
    const sideWrapperTagStart = lgBranch.lastIndexOf("<div", sidePanelsAt)
    const sideWrapperTagEnd = lgBranch.indexOf(">", sideWrapperTagStart)
    const sideWrapperTag = lgBranch.slice(sideWrapperTagStart, sideWrapperTagEnd)
    expect(sideWrapperTag.includes("flex-col"), "the side wrapper must still be a flex column").toBe(true)
    expect(sideWrapperTag.includes("gap-6"), "the side wrapper must still carry the panel gap between its three cards").toBe(true)
    expect(sideWrapperTag.includes("h-full"), "the side wrapper must NOT carry h-full any more — natural height, round 27").toBe(false)
    expect(sideWrapperTag.includes("min-h-0"), "the side wrapper must NOT carry min-h-0 any more, round 27").toBe(false)
    expect(sideWrapperTag.includes("overflow-y-auto"), "the side wrapper must NOT carry overflow-y-auto any more — it never scrolls, round 27's whole point").toBe(false)
  })

  it("below lg, the scroll region stacks the side panels THEN the conversation — her own 'above the content' complaint, answered by DOM order", () => {
    const fnAt = body.indexOf("export function TicketDetailBody")
    const belowLgBranchAt = body.indexOf(") : (", body.indexOf("isAtLeastLg ? (", fnAt))
    expect(belowLgBranchAt, "must render a below-lg branch").toBeGreaterThan(-1)
    const branchEnd = body.indexOf(")}", belowLgBranchAt)
    const belowLgBranch = body.slice(belowLgBranchAt, branchEnd)

    expect(belowLgBranch.includes("flex-col"), "the below-lg branch's own scroll-region child must be a flex column (stacked, for the gap-6 token only)").toBe(true)
    // The JSX CHILD EXPRESSIONS, braces and all — never the bare words,
    // which round 25's own explanatory comment (prose, ahead of the real
    // markup) also happens to use, and a bare substring search cannot tell
    // apart from the actual `{sidePanels}`/`{conversation}` children.
    const sideAt = belowLgBranch.indexOf("{sidePanels}")
    const threadAt = belowLgBranch.indexOf("{conversation}")
    expect(sideAt, "the below-lg branch must render the side panels").toBeGreaterThan(-1)
    expect(threadAt, "the below-lg branch must render the conversation").toBeGreaterThan(-1)
    expect(sideAt, "the side panels must come before the conversation below lg — her own complaint, inverted").toBeLessThan(threadAt)
  })

  // ROUND 25, 19 Sep 2026 — `reproof15-results.json` state F (760×900, rail
  // collapsed) caught what round 24's five other states could not: the
  // below-lg wrapper was `h-full min-h-0`, a BOUNDED stack, with the
  // conversation cell as a `flex-1 min-h-0` sibling of the three
  // natural-height side-panel divs — a real flex-shrink fight. Once the
  // panels' own combined natural height exceeded the stack's budget,
  // `flex-1`'s zero flex-basis meant the conversation absorbed the ENTIRE
  // deficit and measured a true 0px height (proved live,
  // `conversationCardRect.top === conversationCardRect.bottom`). Fixed by
  // removing the budget entirely below lg (normal flow, content-sized,
  // scrolled by the ONE region this whole tree already sits inside) and
  // giving the conversation cell a floor (`min-h-[60vh]`) instead of a flex
  // share.
  it("below lg, the stack carries no height budget to fight over — no h-full/min-h-0/flex-1 on the wrapper or its side-panel children", () => {
    const fnAt = body.indexOf("export function TicketDetailBody")
    const belowLgBranchAt = body.indexOf(") : (", body.indexOf("isAtLeastLg ? (", fnAt))
    const branchEnd = body.indexOf(")}", belowLgBranchAt)
    const belowLgBranch = body.slice(belowLgBranchAt, branchEnd)

    const wrapperTagStart = belowLgBranch.indexOf("<div")
    const wrapperTagEnd = belowLgBranch.indexOf(">", wrapperTagStart)
    const wrapperTag = belowLgBranch.slice(wrapperTagStart, wrapperTagEnd)
    expect(wrapperTag.includes("h-full"), "the below-lg wrapper must NOT carry h-full — that was the bounded budget the conversation cell lost the fight over").toBe(false)
    expect(wrapperTag.includes("min-h-0"), "the below-lg wrapper must NOT carry min-h-0 either — it is normal flow now, sized to its own content").toBe(false)
    expect(wrapperTag.includes("flex-1"), "the below-lg wrapper itself must NOT carry flex-1 — it is not a flex item competing for space, it is the scroll region's one normal-flow child").toBe(false)
  })

  it("the conversation cell takes relative min-h-0 at lg (round 27 — stretched by the grid, no height class of its own) but min-h-[60vh] below lg (a content floor, never a flex share)", () => {
    const fnAt = body.indexOf("export function TicketDetailBody")
    const conversationConstAt = body.indexOf("const conversation = (", fnAt)
    expect(conversationConstAt, "TicketDetailBody must build one shared `conversation` const").toBeGreaterThan(-1)
    // Stop at the const's OWN closing paren, not at `const sidePanels = (` —
    // the comment block between the two (round 27's own side-column note)
    // says "h-full" in PROSE, which would otherwise leak into a substring
    // check meant to read the actual JSX only.
    const conversationConstEnd = body.indexOf("\n  )\n", conversationConstAt)
    expect(conversationConstEnd, "must find the conversation const's own closing paren").toBeGreaterThan(conversationConstAt)
    const constBody = body.slice(conversationConstAt, conversationConstEnd)
    expect(constBody.includes("isAtLeastLg"), "the conversation anchor's own className must branch on isAtLeastLg, not reuse one string for both cell shapes").toBe(
      true
    )
    // ROUND 27 — `relative min-h-0`, NOT `h-full min-h-0`: the cell carries
    // no height class of its own at all, because it is `items-stretch` on
    // the grid (unchanged) that resolves its height, to whatever the row
    // resolved to (the side column's own natural height). `relative` is
    // what lets the Card inside it (`fill="absolute"`) resolve `inset-0`
    // against THIS cell's own bounds.
    expect(constBody.includes("min-w-0 relative min-h-0"), "the lg branch of the anchor's className must be min-w-0 relative min-h-0").toBe(true)
    expect(constBody.includes("h-full"), "h-full must NOT appear on the conversation cell any more — round 27, it contributes no height of its own so the row can resolve to the side column's").toBe(
      false
    )
    expect(constBody.includes("min-h-[60vh]"), "the below-lg branch of the anchor's className must be a min-h-[60vh] FLOOR — a sensible minimum the card is sized against, never squeezed to zero").toBe(
      true
    )
    expect(constBody.includes("flex-1 min-h-0"), "flex-1 min-h-0 must NOT appear on the conversation cell any more — that was the sibling-fight shape round 25 replaced (it lost every fight to the side panels' own natural height and measured 0px live at 760x900)").toBe(
      false
    )
    // ROUND 27 — the fill prop wiring: absolute at lg, block below it.
    expect(constBody.includes('fill={isAtLeastLg ? "absolute" : "block"}'), "TicketConversationPanel must be called with fill branching on isAtLeastLg").toBe(true)
  })

  it("ROUND 28 — the region wrapping both per-width branches is a plain, content-sized block (NO flex-1/min-h-0/overflow-y-auto), and is the root's other child besides the band", () => {
    const fnAt = body.indexOf("export function TicketDetailBody")
    const returnAt = body.indexOf("return (", fnAt)
    const rootAt = body.indexOf('data-slot="ticket-detail-body"', returnAt)
    const rootTagEnd = body.indexOf(">", rootAt)
    // The region is the root's own FIRST child div, right after the root's
    // own opening tag closes.
    const regionTagStart = body.indexOf("<div", rootTagEnd)
    const regionTagEnd = body.indexOf(">", regionTagStart)
    const regionTag = body.slice(regionTagStart, regionTagEnd)
    expect(
      regionTag.includes("overflow-y-auto"),
      "the region must NOT carry overflow-y-auto any more (round 28) — it is the inner scrollbar Aurora's dark-theme screenshot caught"
    ).toBe(false)
    expect(regionTag.includes("flex-1"), "the region must NOT carry flex-1 any more (round 28) — content-sized, like the side column already was").toBe(false)
    expect(regionTag.includes("min-h-0"), "the region must NOT carry min-h-0 any more (round 28)").toBe(false)

    const fnEnd = body.indexOf("\n}\n", fnAt)
    const rootBody = body.slice(rootTagEnd, fnEnd)
    const bandCount = (rootBody.match(/data-slot="ticket-footer-band"/g) || []).length
    expect(bandCount, "exactly one band in the root").toBe(1)

    // NEITHER `TicketDetailBody`'s own root NOR its region wrapper carries
    // overflow-y-auto any more — the ONE remaining scroller (the thread's
    // own CardContent, R91's named exception) lives inside
    // `TicketConversationPanel`, a SEPARATE function this component only
    // ever CALLS (never inlines), so it can never appear in this slice.
    // Comments stripped first — this file's own prose mentions
    // "overflow-y-auto" many times describing history, which a raw
    // substring count would wrongly catch.
    const rootBodyStripped = stripComments(rootBody, { keepLength: true })
    const overflowMatches = rootBodyStripped.match(/overflow-y-auto/g) || []
    expect(
      overflowMatches.length,
      "TicketDetailBody's own JSX (root + region) must carry NO overflow-y-auto at all — the thread's scroller lives in a separate function it merely calls"
    ).toBe(0)
  })
})

// R89, GENERALISED TO RecordDetailBody — 22 Sep 2026 finding. Measured live
// on staging: a thin proof story and a short knowledge source (both drawn
// through story-detail.tsx / knowledge-detail.tsx calling the shared
// `RecordDetailBody`) already reach the pane's edges left/right — the kit's
// own `-mx-[var(--pane-inset-x,0px)]` escape on the footer Card (v1.2.149)
// covers that, unconditionally, for any caller — but land 24px SHORT at the
// bottom (876px against a 900px pane at 1440×900), because `mt-auto` only
// reaches `RecordDetailBody`'s own root, and that root's height is capped by
// the ordinary `h-full` chain at exactly `DENSITY_BODY`'s reserved
// `padding-bottom` (screen-shell.tsx) short of the pane's true edge, UNLESS
// the record's own content is tall enough to overflow that ceiling on its
// own (T0001 always is; a thin story or a short knowledge source is not).
// The fix is the app-shell.tsx growth rule censused above, keyed to
// `record-footer-band` — `RecordDetailBody`'s own `footerDataSlot` default —
// so it reaches every caller of the shared shape without touching the
// ticket page's own, separately-marked band.
describe("R89 — RecordDetailBody's own footer band matches TicketDetailBody's construction, and stays on the marker app-shell.tsx's growth rule keys off", () => {
  const recordBody = read("web/components/records/record-detail-body.tsx")
  const ticketBody = read("web/components/tickets/ticket-detail-body.tsx")
  const knowledgeDetail = read("web/components/knowledge/knowledge-detail.tsx")
  const storyDetail = read("web/components/work/story-detail.tsx")

  it("RecordDetailBody's root and footer wrapper carry the IDENTICAL classes TicketDetailBody's own root and band do", () => {
    expect(
      recordBody.includes('className="flex min-w-0 flex-1 flex-col gap-6"'),
      "the root must be the same flex column, flex-1, no min-h-0, gap-6 — TicketDetailBody's own round-28 shape"
    ).toBe(true)
    expect(
      ticketBody.includes('data-slot="ticket-detail-body"\n      className="flex min-w-0 flex-1 flex-col gap-6"'),
      "TicketDetailBody's own root must still carry the same string, so the two constructions can never silently drift apart"
    ).toBe(true)
    expect(
      recordBody.includes('className="flex-none mt-auto w-full"'),
      "the footer wrapper must be flex-none, mt-auto, w-full — the identical 'push to the root's own bottom edge' trick"
    ).toBe(true)
    expect(
      ticketBody.includes('className="flex-none mt-auto w-full"'),
      "TicketDetailBody's own band must still carry the identical class string"
    ).toBe(true)
  })

  it("footerDataSlot defaults to record-footer-band — the exact marker app-shell.tsx's growth rule reads", () => {
    expect(recordBody).toMatch(/footerDataSlot\s*=\s*"record-footer-band"/)
  })

  it("TicketDetailBody's own band keeps its OWN, separate marker — never record-footer-band — so app-shell.tsx's growth rule cannot double up on a page that already reaches flush through natural overflow", () => {
    expect(ticketBody).toContain('data-slot="ticket-footer-band"')
    expect(ticketBody).not.toContain('data-slot="record-footer-band"')
  })

  it("neither knowledge-detail.tsx nor story-detail.tsx overrides RecordDetailBody's own footerDataSlot away from the shared default", () => {
    // Overriding it would silently opt a screen OUT of the app-shell.tsx
    // growth rule (which reads the literal data-slot value), so the census
    // is positional: no `footerDataSlot=` prop on either call at all, never
    // an assertion about what value it would carry if one existed.
    expect(knowledgeDetail).not.toMatch(/\bfooterDataSlot=/)
    expect(storyDetail).not.toMatch(/\bfooterDataSlot=/)
  })
})
