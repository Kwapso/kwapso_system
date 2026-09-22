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
//
// ROUND 29, THE NEGATIVE-MARGIN CORRECTION, 22 Sep 2026 — the round-22
// `has-[[data-slot=record-footer-band]]:h-[calc(100%+…)]` growth rule
// (censused two paragraphs above this one, in git history) reached the
// pane's true bottom edge ONLY at `scrollTop=0`. Live DOM proof against the
// knowledge source this was reported against: scrolling the pane to its
// own `scrollHeight` (how a person actually reaches the bottom) measured
// `el.scrollHeight === el.clientHeight + padding-bottom` — `DENSITY_BODY`'s
// reserved bottom padding, counted a SECOND time — because growing a
// descendant's own `height` past its scrolling ancestor's content-box edge
// is, by definition, scrollable overflow, and a scrolling ancestor with
// `padding-bottom` reserves that padding again after any overflow it
// detects (Chromium's own documented behaviour). The calc's own +20/24px
// growth bought exactly that much new, illusory scroll room instead of
// closing the gap, so scrolling to the end dragged the already-flush band
// back UP by the same amount — reproducing the live bug exactly.
//
// THE GROWTH RULE MOVED, RETIRED HERE, ADDED IN `record-detail-body.tsx`
// INSTEAD: a fixed, NEGATIVE `margin-bottom` on the div carrying
// `data-slot="record-footer-band"` (`mb-[calc(var(--space-5)*-1)]
// lg:mb-[calc(var(--space-6)*-1)]`) reaches the identical pixel without
// enlarging any box's own measured `height`, so the scrolling ancestor's
// overflow/padding accounting never sees it — proved live,
// `el.scrollHeight === el.clientHeight` afterwards (zero phantom scroll
// room), flush at `scrollTop=0` AND unchanged after scrolling to the
// pane's own end, and proved harmless on genuinely tall content (a real
// story, B0002, already overflowing the ceiling on its own): identical
// flush result with and without the margin. `app-shell.tsx`'s page
// container goes back to a bare `h-full`, censused below alongside the
// (unchanged) absence of the retired ticket-only rule.

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

  it("app-shell.tsx's page container carries NO record-footer-band growth rule either any more (round 29 retired it — reaching past the pane's own padding via an explicit height() registers as real scrollable overflow, and the pane's overflow:auto reserves that padding a SECOND time once it detects any, undoing the growth the instant the pane is scrolled to its own end; the fix moved to record-detail-body.tsx's own footer wrapper, a negative margin that never enlarges a measured height)", () => {
    const at = shell.indexOf("mx-auto flex w-full max-w-none")
    expect(at, "app-shell.tsx must still draw its one R29 page container as a flex box").toBeGreaterThan(-1)
    const tagEnd = shell.indexOf(">", at)
    const tag = shell.slice(Math.max(0, at - 800), tagEnd)
    expect(
      tag.includes("has-[[data-slot=record-footer-band]]:h-[calc"),
      "the below-lg growth rule must stay GONE — round 29 moved the fix to record-detail-body.tsx's own negative margin, which never registers as overflow of screen-shell-body's own padding"
    ).toBe(false)
    expect(
      tag.includes("lg:has-[[data-slot=record-footer-band]]:h-[calc"),
      "the lg growth rule must stay gone too, for the same reason"
    ).toBe(false)
    // NEITHER TICKET MARKER EVER BELONGED HERE, ROUND 22 THROUGH 29 ALIKE —
    // the ticket page reaches flush through its own real, natural content
    // overflow (round 28) and was never meant to double up with any growth
    // rule keyed to a RecordDetailBody marker.
    expect(tag.includes("has-[[data-slot=ticket-detail-body]]:h-[calc")).toBe(false)
    expect(tag.includes("has-[[data-slot=ticket-footer-band]]:h-[calc")).toBe(false)
  })

  // "ON THE FOOTER, THERE SHOULD BE NO WHITE ON THE SIDES. MAKE THE BLACK GO
  // SIDE TO SIDE." — Aurora's ruling, 22 Sep 2026. A live ancestor walk on
  // staging found app-shell.tsx's own R29 page container as the clipper: the
  // record footer band escapes its own pane padding with
  // `-mx-[var(--pane-inset-x)]` (record-chrome.tsx's `RecordFooterBand`) to
  // reach the pane's TRUE left/right edges, and this div's own
  // `overflow-x-clip` cut that escape off at ITS edge instead — 24px short
  // on both sides, on every record footer, not only tickets'. Removed from
  // the page container's own class string; what still guards sideways
  // bleed: `html`/`body` carry the real backstop (`overflow-x: clip`,
  // web/app/globals.css), and a table or board that genuinely scrolls
  // sideways owns its own `overflow-x: auto` box (R91's sanctioned
  // scrollers) rather than depending on an ancestor to clip it.
  it("app-shell.tsx's page container no longer carries overflow-x-clip on its own class string", () => {
    const at = shell.indexOf("mx-auto flex w-full max-w-none")
    expect(at, "app-shell.tsx must still draw its one R29 page container as a flex box").toBeGreaterThan(-1)
    const classStringStart = shell.lastIndexOf('"', at)
    const classStringEnd = shell.indexOf('"', at)
    const classString = shell.slice(classStringStart + 1, classStringEnd)
    expect(
      classString.includes("overflow-x-clip"),
      "the page container must not clip its own horizontal overflow any more — that clipped the record footer band's -mx-[var(--pane-inset-x)] escape short of the pane's true edges"
    ).toBe(false)
  })

  it("no element between screen-shell-body and a record body in app-shell.tsx carries overflow-x-clip, overflow-x-hidden, overflow-hidden or overflow-clip", () => {
    const openTagAt = shell.indexOf("<ScreenShell")
    expect(openTagAt, "app-shell.tsx must still render the kit's ScreenShell").toBeGreaterThan(-1)
    const closeAt = shell.indexOf("</ScreenShell>", openTagAt)
    expect(closeAt, "app-shell.tsx must still close ScreenShell").toBeGreaterThan(openTagAt)
    const childrenAt = shell.indexOf("{children}", openTagAt)
    expect(childrenAt, "app-shell.tsx must still render {children} inside ScreenShell — the one page container every record body sits inside").toBeGreaterThan(
      openTagAt
    )
    expect(childrenAt, "{children} must sit before ScreenShell's own closing tag").toBeLessThan(closeAt)
    // THE CHILDREN REGION ONLY — from the opening tag's own closing `>`
    // (the boundary between ScreenShell's PROPS, like header/trail/
    // breadcrumb, which may style themselves however they like, and its
    // CHILDREN, the one page container this app owns) through to
    // `{children}` itself. Comments stripped first: this file's own long
    // note on why the clip was removed names the forbidden classes in
    // prose, which a raw substring search would otherwise catch as a false
    // positive.
    const propsEnd = shell.lastIndexOf(">", childrenAt)
    expect(propsEnd, "must find ScreenShell's own opening tag's closing >").toBeGreaterThan(openTagAt)
    const ancestry = stripComments(shell.slice(propsEnd, childrenAt), { keepLength: true })
    for (const forbidden of ["overflow-x-clip", "overflow-x-hidden", "overflow-hidden", "overflow-clip"]) {
      expect(
        ancestry.includes(forbidden),
        `no element between screen-shell-body and a record body may carry ${forbidden} — html/body's own overflow-x:clip (web/app/globals.css) is the real backstop, and a table/board that genuinely scrolls sideways owns its own overflow-x:auto box (R91) rather than depending on an ancestor to clip it; this was exactly what clipped the record footer band's -mx-[var(--pane-inset-x)] escape short of the pane's true edges`
      ).toBe(false)
    }
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

  it("record-chrome.tsx's RecordScreen keeps footerVisible, and spends it on the shell's footer SLOT rather than on the kit's own region 4", () => {
    const propAt = chrome.indexOf("footerVisible?: boolean")
    expect(propAt, "RecordScreen's own prop type must still declare footerVisible").toBeGreaterThan(-1)
    const defaultAt = chrome.indexOf("footerVisible = true,")
    expect(defaultAt, "footerVisible must still default to true, every existing caller keeps its own band unless it opts out").toBeGreaterThan(-1)
    // 22 Sep 2026, kit v1.2.155. Region 4 of the kit's own RecordDetail sits
    // INSIDE the shell body's padded stack, which is the one place the band
    // may no longer be, so this call switches it off UNCONDITIONALLY, never
    // a passthrough of this component's own prop.
    expect(
      chrome.includes("footerVisible={footerVisible}"),
      "RecordScreen must NOT forward footerVisible into the kit any more, region 4 draws inside the padded stack, which is what put paper under the band"
    ).toBe(false)
    expect(
      chrome.includes("footerVisible={false}"),
      "RecordScreen's own RecordChrome call must pass footerVisible={false} unconditionally"
    ).toBe(true)
    // AND THE PROP IS SPENT, not merely accepted: the band goes into the
    // shell's own footer slot, gated on this component's own footerVisible.
    const slotAt = chrome.indexOf("<ScreenFooterSlot>")
    expect(slotAt, "RecordScreen must fill ScreenShell's own footer slot").toBeGreaterThan(-1)
    const slotEnd = chrome.indexOf("</ScreenFooterSlot>", slotAt)
    const slotBody = chrome.slice(slotAt, slotEnd)
    expect(slotBody.includes("footerVisible ?"), "the slot's own contents must be gated on RecordScreen's footerVisible").toBe(true)
    expect(slotBody.includes("<RecordFooterBand"), "the slot must hold the same RecordFooterBand every other record page builds").toBe(true)
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

  it("TicketDetailBody's own root is a flex column, and the band leaves it for the shell's footer slot", () => {
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
      "the root must carry gap-6, round 26's panel gap, the same token every other pair of stacked panels uses"
    ).toBe(true)

    // 22 SEP 2026, kit v1.2.155, THE BAND IS NOT A CHILD OF THIS ROOT ANY
    // MORE. It goes through `<ScreenFooterSlot>`, which portals it into the
    // node the kit renders OUTSIDE the body's padded stack, as the `mt-auto`
    // last child of a `min-h-full` column. Until then this page carried its
    // own `flex-none mt-auto w-full` wrapper and its own marker, reaching the
    // bottom of a box that itself stopped `DENSITY_BODY`'s own reserved
    // `padding-bottom` short of the pane: 24px of paper under the band at
    // every desktop width, 115px at 760 tall, measured by paint.
    expect(
      body.includes('data-slot="ticket-footer-band"'),
      "this page's own footer-band marker must be GONE, there is no wrapper of its own left here to name"
    ).toBe(false)
    expect(
      body.includes('className="flex-none mt-auto w-full"'),
      "this page must carry no mt-auto footer wrapper of its own, the wrapper that carries mt-auto is the kit's screen-shell-footer now"
    ).toBe(false)
    const slotAt = body.indexOf("<ScreenFooterSlot>{footer}</ScreenFooterSlot>", fnAt)
    expect(slotAt, "the band must be handed to ScreenShell's own footer slot").toBeGreaterThan(-1)

    // Nothing may render after the slot inside the root, D21's own "last
    // child" rule, restated positionally for the root itself.
    const fnEnd = body.indexOf("\n}\n", fnAt)
    const afterSlot = body.slice(slotAt + "<ScreenFooterSlot>{footer}</ScreenFooterSlot>".length, fnEnd)
    const nextRealTagAt = afterSlot.search(/\S/)
    expect(
      afterSlot.slice(nextRealTagAt, nextRealTagAt + 6),
      "the slot must be followed immediately by the root's own closing tag, nothing renders after the band"
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

  it("ROUND 28, the region wrapping both per-width branches is a plain, content-sized block (NO flex-1/min-h-0/overflow-y-auto), and is the root's other child besides the footer slot", () => {
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
    // THE ROOT'S OTHER CHILD IS THE SLOT, NOT A BAND, 22 Sep 2026, kit
    // v1.2.155. The band left this box entirely (see this suite's own
    // "TicketDetailBody's own root is a flex column" case), so what the
    // region is a sibling of is `<ScreenFooterSlot>`, which renders a portal
    // and adds no box of its own here at all.
    const slotCount = (rootBody.match(/<ScreenFooterSlot>/g) || []).length
    expect(slotCount, "exactly one footer slot in the root").toBe(1)

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

// R89, ROUND 30, 22 Sep 2026, THE BAND LEAVES EVERY BODY FOR THE SHELL'S
// OWN FOOTER SLOT, AND THE THREE ESCAPES ARE DELETED.
//
// THE MEASUREMENT THAT ENDED THE ARGUMENT. By paint on staging, with the
// band's SIDES already flush on every page and state (v1.2.151/v1.2.153):
// the ticket T0001 carried a 24px paper strip under the band at every
// desktop width and 115px at 760 tall; a knowledge source carried between
// 62 and 198px; a story was flush at desktop and 96px short at 760. Three
// pages, three different numbers, one cause, the band was rendering INSIDE
// the shell body's padded, scrolling stack, and every fix so far had been
// an attempt to escape that box rather than to leave it.
//
// THE THREE ESCAPES, ALL RETIRED. (1) A page-container growth rule, retired
// the day it shipped: growing a box past a scrolling ancestor's content edge
// IS overflow, and Chromium then reserves that ancestor's padding-bottom a
// second time, so scrolling to the pane's end dragged the band back up by
// exactly the amount it had been grown. (2) A fixed NEGATIVE `margin-bottom`
// on `RecordDetailBody`'s own footer wrapper, keyed to its default marker: it
// reached the pixel, and it was a number derived from a padding this app does
// not own, on a box the kit moved under it once already (v1.2.153). (3) The
// ticket page's own `flex-none mt-auto w-full` wrapper and marker, which
// reached the bottom of a box that itself stopped short of the pane.
//
// WHAT REPLACES THEM IS STRUCTURE. `ScreenShell`'s own footer SLOT (kit
// v1.2.155) renders inside the one scroller and OUTSIDE the padded stack, as
// the `mt-auto` last child of a `min-h-full` column: a short record's band
// lands on the pane's own bottom edge, a long record's after its content, and
// nothing measures anything. `app-shell.tsx` mounts the host and provides it
// through `FooterSlotProvider`; a page reaches it with `<ScreenFooterSlot>`
// from any depth, because it is a portal rather than a prop.
describe("R89 round 30, every record body hands its band to the shell's footer slot, and the escapes are deleted", () => {
  const recordBody = read("web/components/records/record-detail-body.tsx")
  const ticketBody = read("web/components/tickets/ticket-detail-body.tsx")
  const knowledgeDetail = read("web/components/knowledge/knowledge-detail.tsx")
  const storyDetail = read("web/components/work/story-detail.tsx")
  const helpDetail = read("web/components/tickets/help-detail.tsx")

  it("RecordDetailBody's root carries the IDENTICAL classes TicketDetailBody's own root does", () => {
    expect(
      recordBody.includes('className="flex min-w-0 flex-1 flex-col gap-6"'),
      "the root must be the same flex column, flex-1, no min-h-0, gap-6 — TicketDetailBody's own round-28 shape"
    ).toBe(true)
    expect(
      ticketBody.includes('data-slot="ticket-detail-body"\n      className="flex min-w-0 flex-1 flex-col gap-6"'),
      "TicketDetailBody's own root must still carry the same string, so the two constructions can never silently drift apart"
    ).toBe(true)
  })

  it("neither body draws the band any more, both hand it to ScreenShell's own footer slot", () => {
    // 22 Sep 2026, kit v1.2.155. Both files used to end with the band as
    // their own `flex-none mt-auto w-full` last child; `RecordDetailBody`
    // additionally carried a fixed NEGATIVE bottom margin, gated on its
    // default marker, to reach past the pane's own reserved padding. All of
    // it is deleted: the slot the kit renders outside the padded stack has
    // nothing to escape from, so there is no number here to keep in step
    // with a padding this app does not own.
    expect(
      ticketBody.includes('className="flex-none mt-auto w-full"'),
      "TicketDetailBody must carry no footer wrapper of its own"
    ).toBe(false)
    expect(
      recordBody.includes('"flex-none mt-auto w-full"'),
      "RecordDetailBody must carry no footer wrapper of its own"
    ).toBe(false)
    expect(
      recordBody.includes("reachesPaneFloor"),
      "the negative-margin escape must be gone, gate and all, the slot has no padding under it to reach past"
    ).toBe(false)
    expect(
      /className=\{[\s\S]{0,200}mb-\[calc\(var\(--space/.test(recordBody),
      "no negative bottom margin may survive in a className, a number derived from a padding the kit can move under it"
    ).toBe(false)
    expect(ticketBody.includes("<ScreenFooterSlot>"), "TicketDetailBody must hand the band to the shell's footer slot").toBe(true)
  })

  it("RecordDetailBody declares no footer prop at all, a caller reaches the slot itself, from wherever it is", () => {
    expect(
      /\bfooter:\s*React\.ReactNode/.test(recordBody),
      "the footer prop must be gone: there is nothing for this component to thread, because ScreenFooterSlot portals from any depth"
    ).toBe(false)
    expect(
      /footerDataSlot\s*=/.test(recordBody),
      "footerDataSlot must be gone with the wrapper it named"
    ).toBe(false)
  })

  it("the ticket, story and knowledge pages each fill the slot exactly once, with RecordFooterBand", () => {
    for (const [name, src] of [
      ["help-detail.tsx", helpDetail],
      ["story-detail.tsx", storyDetail],
      ["knowledge-detail.tsx", knowledgeDetail],
    ] as const) {
      expect(src.includes("<RecordFooterBand"), `${name} must still build the band from RecordFooterBand`).toBe(true)
    }
    // help-detail.tsx hands its band to `TicketDetailBody`'s own `footer`
    // prop, and THAT component renders the slot, one hop, because the
    // ticket's body is the thing that owns where its own regions sit. The
    // story and knowledge pages have no such body of their own and render
    // the slot directly, as a sibling of their `<RecordDetailBody>` call.
    expect(ticketBody.includes("<ScreenFooterSlot>"), "ticket-detail-body.tsx renders the slot for the ticket page").toBe(true)
    for (const [name, src] of [
      ["story-detail.tsx", storyDetail],
      ["knowledge-detail.tsx", knowledgeDetail],
    ] as const) {
      const slotAt = src.indexOf("<ScreenFooterSlot>")
      expect(slotAt, `${name} must render ScreenFooterSlot itself`).toBeGreaterThan(-1)
      const slotBody = src.slice(slotAt, src.indexOf("</ScreenFooterSlot>", slotAt))
      expect(slotBody.includes("<RecordFooterBand"), `${name}'s slot must hold the band`).toBe(true)
      expect(src.indexOf("<ScreenFooterSlot>", slotAt + 1), `${name} must fill the slot exactly once`).toBe(-1)
    }
  })

  it("neither knowledge-detail.tsx nor story-detail.tsx hands RecordDetailBody a footer of its own", () => {
    // The prop is gone from the component (above); this is the census on the
    // other side of the call, so a screen cannot quietly reintroduce a band
    // inside the padded stack by handing one down.
    expect(knowledgeDetail).not.toMatch(/\bfooterDataSlot=/)
    expect(storyDetail).not.toMatch(/\bfooterDataSlot=/)
    for (const [name, src] of [
      ["knowledge-detail.tsx", knowledgeDetail],
      ["story-detail.tsx", storyDetail],
    ] as const) {
      const callAt = src.indexOf("<RecordDetailBody")
      expect(callAt, `${name} must still call RecordDetailBody`).toBeGreaterThan(-1)
      const call = src.slice(callAt, src.indexOf("/>", callAt))
      expect(call.includes("footer="), `${name}'s RecordDetailBody call must pass no footer`).toBe(false)
    }
  })
})
