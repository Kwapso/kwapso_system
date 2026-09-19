// R89 "footer-on-the-edge" — THE FOOTER IS AT THE SCREEN'S OWN BOTTOM, NOT
// MERELY ITS CARD'S. CLIENT RULING, 18 SEP 2026, VERBATIM: "On ticket
// detail, the footer should be at the very bottom. The position is still
// fucking wrong. Fix it once and for all."
//
// D21 (`web/test/footer-is-last.test.ts`) already proves a `<CardFooter>`/
// `<ReplyComposer>` is the LAST child of its own enclosing card — DOM order,
// nothing about where that card itself sits on the screen. That was not
// enough: measured live on staging (T0001, headless Playwright,
// `${SCRATCH}/footer-measure.json`, BEFORE this law's fix) the conversation
// card's footer closed at y=1298 against the screen body's own y=884 at
// 1440×900 — a footer that was correctly LAST inside a card floating 414px
// past the visible screen.
//
// RE-PROVEN LIVE, 18 SEP 2026 EVENING — THE FIRST LANDING DID NOT HOLD.
// Re-measured live against a real ticket with a real conversation
// (`${SCRATCH}/reproof10-results.json` item 5): the conversation card still
// closed 526px past the screen body at 1440×900, and the composer form was
// still 271px wide. THREE separate gaps, all in the same construction:
// (1) `app-shell.tsx`'s page container used `min-h-full`, a FLOOR a
// `height:auto` block grows past the moment content exceeds it — not the
// cap the whole `flex-1 min-h-0` chain below it needs to actually
// distribute space; fixed to `h-full` (a real, definite height).
// (2) With that column finally definite, `RecordChrome` (the ticket's own
// head, rendered as a SIBLING of `TicketDetailBody` because
// `help-detail.tsx` passes `panelVisible={false}`) was ALSO claiming
// `flex-1 min-h-0`, so the column's real height split 50/50 between the
// head and the grid instead of the head taking its own content height;
// fixed with `record-chrome.tsx`'s own `HEAD_ONLY` (`flex-none`), wired off
// `panelVisible` directly. (3) The conversation card's `min-h-[420px]`
// (a below-`lg` floor for the stacked case) outlived the breakpoint it was
// written for and pinned the card 48px past the grid's own real row once
// the row had a genuine, sometimes-smaller-than-420px height to offer;
// released with `lg:min-h-0`, the same pattern `tickets-dashboard.tsx`
// already uses for its own stacked floors. This law now checks all three,
// live-proven together (`${SCRATCH}/footer-fix-proof.json`): the card's
// footer sits flush with the screen body's own bottom inset at 1440×900,
// 1280×800 and 1024×768, the side column scrolls independently, and two
// other screens (the tickets dashboard, an account detail) render
// pixel-identical before/after this construction.
//
// THE COMPOSER'S OWN HALF — Aurora's screenshot 4, verbatim: "This composer
// should have a background color that makes it easy to identify, and also
// it should be full width of its own container." Measured live before the
// fix: the composer's own `background-color` and the conversation card's
// were the SAME `rgb(247,242,235)` (`--surface-panel`) — no contrast at
// all — and the composer's own rendered width was 271px against a 769px
// footer. The `<form>` itself always carried `w-full` (that half was never
// the bug); the bug was its PARENT — the div `reply-composer.tsx` hands
// `CardFooter` as `composer` — having no width claim of its own inside
// `CardFooter`'s flex ROW, so the form's `w-full` was 100% of an already
// shrink-to-fit box. Fixed by giving that wrapper `w-full` too. Checked
// here: both divs' `w-full`, and the SAME background class the kit's own
// `Input` paints every ordinary text field with (`input.tsx`'s own
// `inputVariants`) — read off that file directly, never hand-typed here, so
// a future kit change re-proves parity rather than silently drifting from
// it.
//
// A SOURCE SCAN, LIKE EVERY OTHER STRUCTURAL LAW IN THIS BASE (D21,
// R63, R83): these three files are this law's whole subject, so there is
// nothing a census over `web/` gains by widening past them — a future
// second construction of a full-height record body is exactly what a
// widened version of this check should grow to cover, not guessed at here.
//
// BELOW-LG RE-FIX, 19 SEP 2026 — Aurora, verbatim, on the LG fix above:
// "No, this is still wrong. The footer is currently under the stages and
// above the content. … I cannot believe you're so stupid and you cannot
// fix this." Her window narrows to ~730–1000px with the assistant open,
// but `lg:` here is a plain viewport media query with no `container-type`
// upstream of it (confirmed live this session,
// `${SCRATCH}/footer-below-lg-before.json`), so that never crosses `lg`;
// the genuinely broken widths are real sub-1024px viewports — 760×900
// (rail collapsed) reproduced her sentence exactly live, before this
// re-fix: the conversation card (composer inside it) closed 434px past
// the visible screen, with the side panels starting AFTER it. Fixed with
// a real `useIsAtLeastLg()` breakpoint hook (`ticket-detail-body.tsx`'s
// own header has the full account of why a CSS-only `lg:`/`max-lg:` pair
// on one tree cannot hold the composer, one stateful control, in two DOM
// homes at once) rather than widening this test's own three-file scope —
// the below-lg tree lives in the SAME file, so no new file joins the
// census.
//
// ROUND 22B RE-FIX, 19 SEP 2026 — "BOTTOM EDGE" NAMES THE CARD, NOT A GAP
// NEAR IT. Aurora, over a screenshot at 1784×981 (rail collapsed): "look
// at screenshot! that's the footer not being on the very bottom! fix this
// at once." Every earlier proof in this file measured the wrong
// reference: it asked whether the flex chain's own `h-full` box (app-
// shell.tsx's page container) reached ITS OWN bottom, never whether that
// bottom coincided with `[data-slot="screen-shell-body"]` — the vendored,
// pinned pane the whole chain sits inside, and the box a footer's bottom
// edge actually has to answer to. Measured live before this fix
// (`${SCRATCH}/r22-footer-dump-out.json`): the conversation card's own
// `CardFooter` closed at y=941 while the pane itself closed at y=965 — a
// further 24px of nothing under an already-correct 32px card inset,
// because `h-full` floors the page container to the pane's CONTENT-box
// height, and a content box by definition excludes the pane's own
// `padding-bottom` (`DENSITY_BODY`, screen-shell.tsx, `py-[var(--space-5)]
// lg:py-[var(--space-6)]`) — correct margin below every OTHER screen's
// content, and exactly the "page inset" R89 now forbids under a footer
// that is supposed to be flush. `shared/ui/` cannot be hand-edited to drop
// that padding for one screen (R39), so app-shell.tsx's own page container
// grows INTO it instead, only where a ticket body is present:
// `has-[[data-slot=ticket-detail-body]]:h-[calc(100%+var(--space-5))]` /
// `lg:has-[...]:h-[calc(100%+var(--space-6))]` — proved live before
// touching source (`${SCRATCH}/r22-footer-inject-out.json`): container
// bottom 965.00 against the pane's own 965.00 at 1784×981, 884.00/884.00
// at 1440×900, and `/accounts`/the tickets dashboard pixel-identical with
// and without the rule (neither renders a `ticket-detail-body`, so
// `:has()` never matches). The below-lg pinned `<CardFooter>` needed no
// separate check: `data-slot="ticket-detail-body"` marks BOTH of
// `TicketDetailBody`'s own trees, so the same rule already reaches it.

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
  const composer = read("web/components/tickets/reply-composer.tsx")
  const inputSource = read("shared/ui/components/input/input.tsx")

  it("app-shell.tsx's own page container is a flex column with a DEFINITE height (h-full, not min-h-full)", () => {
    // The ONE div app-shell.tsx wraps `{children}` in (R29's own page
    // container) — found the same way R51's own aside-dock check finds a
    // named block, by its own distinguishing classes rather than a line
    // number, so an edit above it in the file never rots this key.
    const at = shell.indexOf("mx-auto flex w-full max-w-none")
    expect(at, "app-shell.tsx must still draw its one R29 page container as a flex box").toBeGreaterThan(-1)
    const tag = shell.slice(Math.max(0, at - 200), at + 400)
    expect(tag.includes("flex-col"), "the page container must be a flex COLUMN — TicketDetailBody grows against it").toBe(
      true
    )
    // RE-PROOF, 18 Sep 2026 evening: `min-h-full` is a FLOOR a height:auto
    // block grows past the instant real content exceeds it, so a `flex-1
    // min-h-0` chain below it never gets a real budget to distribute — live
    // on staging this div measured 1312px against a 785px pane. `h-full`
    // (a definite height) is what makes the whole chain below it work; the
    // literal class string (the same one `at`/`tag` were found from) is
    // pinned both ways so a regression back to the floor turns this red
    // rather than silently un-fixing the law.
    const classStringStart = shell.lastIndexOf('"', at)
    const classStringEnd = shell.indexOf('"', at)
    const classString = shell.slice(classStringStart + 1, classStringEnd)
    expect(
      /(^|\s)h-full(\s|$)/.test(classString),
      "the page container must carry a DEFINITE h-full, not a min-h-full floor — see this file's own R89 re-proof note"
    ).toBe(true)
    expect(
      classString.includes("min-h-full"),
      "min-h-full must not come back on this div — it is a floor, not the cap the flex-1/min-h-0 chain below it needs"
    ).toBe(false)
  })

  it("app-shell.tsx's page container opts OUT of the pane's own bottom inset when a ticket body is present (round 22b)", () => {
    // ROUND 22B RE-FIX, 19 Sep 2026. `h-full` (pinned by the test above)
    // floors the page container to `[data-slot="screen-shell-body"]`'s own
    // CONTENT-box height, which by definition excludes that pane's own
    // `padding-bottom` (DENSITY_BODY, screen-shell.tsx, vendored — R39, not
    // editable here). That padding is correct everywhere else and is
    // exactly the "page inset" R89 now forbids under the ticket record's
    // own footer, so the container grows INTO it — but ONLY where a
    // ticket body actually renders (`:has([data-slot="ticket-detail-body"])`),
    // never on an ordinary screen.
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

  it("record-chrome.tsx stops the head competing with a sibling body for the column's growth", () => {
    // `HEAD_ONLY` — re-proof, 18 Sep 2026 evening. With app-shell's page
    // container finally definite, RecordChrome's own `flex-1 min-h-0`
    // (FOOTER_TO_BOTTOM) split the column's real height 50/50 with
    // TicketDetailBody instead of taking only its own content height.
    const headOnlyAt = chrome.indexOf("const HEAD_ONLY")
    expect(headOnlyAt, "record-chrome.tsx must declare a HEAD_ONLY constant for the no-panel case").toBeGreaterThan(-1)
    const headOnlyLine = chrome.slice(headOnlyAt, chrome.indexOf("\n", headOnlyAt))
    expect(headOnlyLine.includes("flex-none"), "HEAD_ONLY must be flex-none — the head takes its own content height, never a share of the column").toBe(
      true
    )
    // Wired off `panelVisible` directly, not a second prop — the caller
    // that turns the panel off is already declaring that something else
    // now owns the column's growth.
    const wireAt = chrome.indexOf("panelVisible ? FOOTER_TO_BOTTOM : HEAD_ONLY")
    expect(
      wireAt,
      "RecordChrome's own className must switch between FOOTER_TO_BOTTOM and HEAD_ONLY off panelVisible"
    ).toBeGreaterThan(-1)
  })

  it("ticket-detail-body.tsx picks its tree with a real lg breakpoint hook, not a CSS-only class pair", () => {
    // R89 BELOW-LG RE-FIX, 19 Sep 2026. Proven live this session
    // (`${SCRATCH}/footer-below-lg-inject.json`) that a single `lg:`/base
    // class pair cannot hold the composer as ONE instance in two different
    // DOM homes across the breakpoint — so `TicketDetailBody` decides with
    // a real media query, the same `useSyncExternalStore` + `matchMedia`
    // shape `web/lib/use-is-phone.ts` already banks for this exact class of
    // "a phone needs a different TREE, not a resized one" decision.
    expect(body.includes("useSyncExternalStore"), "must decide its tree with useSyncExternalStore, the same house pattern use-is-phone.ts uses").toBe(
      true
    )
    expect(body.includes('"(min-width: 64rem)"'), "the lg threshold must be Tailwind's own 64rem (1024px), matching the lg: classes below").toBe(
      true
    )
    const hookAt = body.indexOf("function useIsAtLeastLg")
    expect(hookAt, "must declare its own useIsAtLeastLg hook").toBeGreaterThan(-1)
    const useAt = body.indexOf("useIsAtLeastLg()", body.indexOf("export function TicketDetailBody"))
    expect(useAt, "TicketDetailBody must call useIsAtLeastLg() to pick its own branch").toBeGreaterThan(-1)
  })

  it("at lg, TicketDetailBody's own root fills the remaining screen height with a 2fr/1fr grid, unchanged", () => {
    const fnAt = body.indexOf("export function TicketDetailBody")
    expect(fnAt).toBeGreaterThan(-1)
    const at = body.indexOf('data-slot="ticket-detail-body"', fnAt)
    expect(at, 'TicketDetailBody must mark its own root data-slot="ticket-detail-body" — R89 reads this file by it').toBeGreaterThan(
      -1
    )
    // The LG branch's own root — the FIRST such marker after the function
    // start, since the JS branch means there are now two, one per tree.
    const rootTag = body.slice(at, body.indexOf(">", at))
    expect(rootTag.includes("grid"), "the lg tree's own root must be a grid").toBe(true)
    expect(rootTag.includes("grid-cols-[2fr_1fr]"), "the lg tree's own root must split 2fr/1fr — no lg: prefix needed, JS already gated this branch to lg").toBe(
      true
    )
    expect(rootTag.includes("flex-1"), "the lg tree's own root must grow (flex-1) against app-shell's own flex column").toBe(true)
    expect(rootTag.includes("min-h-0"), "the lg tree's own root must allow itself to shrink below its own content height (min-h-0)").toBe(
      true
    )

    const convAt = body.indexOf("TICKET_PANEL_ANCHOR.conversation", at)
    expect(convAt, "the conversation anchor div must still exist in the lg tree").toBeGreaterThan(-1)
    const convTag = body.slice(body.lastIndexOf("<div", convAt), body.indexOf(">", convAt) + 1)
    expect(convTag.includes("h-full"), "the lg conversation cell must carry h-full").toBe(true)
    expect(convTag.includes("min-h-0"), "the lg conversation cell must carry min-h-0").toBe(true)

    // The side column — ONE cell, not three separate grid rows (see this
    // file's own header for why three auto tracks cannot stretch the way one
    // can) — must scroll independently once its three panels are taller than
    // the row.
    const sideAt = body.indexOf("overflow-y-auto", at)
    expect(sideAt, "the lg side-panel column must be independently scrollable (overflow-y-auto)").toBeGreaterThan(-1)
    const sideTag = body.slice(body.lastIndexOf("<div", sideAt), body.indexOf(">", sideAt) + 1)
    expect(sideTag.includes("h-full"), "the lg side-panel column must match the conversation cell's own height (h-full)").toBe(
      true
    )
    expect(sideTag.includes("flex-col"), "the lg side-panel column must stack its three panels in a flex column").toBe(true)
  })

  it("below lg, the side panels and the thread share ONE scrolling region, and the composer is the root's own pinned last child", () => {
    // R89 BELOW-LG RE-FIX, 19 Sep 2026. Proven live this session
    // (`${SCRATCH}/footer-below-lg-inject.json`) that TWO separate
    // `flex-1 min-h-0` regions crush to zero on a tight budget (a real
    // ticket's head alone ate ~74% of the space available at 760×900) — so
    // this is ONE region, never two competing ones.
    const fnAt = body.indexOf("export function TicketDetailBody")
    const lgReturnAt = body.indexOf("if (isAtLeastLg)", fnAt)
    expect(lgReturnAt, "TicketDetailBody must branch on isAtLeastLg").toBeGreaterThan(-1)
    const belowLgAt = body.indexOf("return (", body.indexOf("}", lgReturnAt))
    expect(belowLgAt, "must render a second, below-lg return").toBeGreaterThan(lgReturnAt)
    const belowLgTree = body.slice(belowLgAt, body.indexOf("\n}\n", belowLgAt))

    const rootAt = belowLgTree.indexOf('data-slot="ticket-detail-body"')
    expect(rootAt, "the below-lg tree must also carry data-slot=\"ticket-detail-body\"").toBeGreaterThan(-1)
    const rootTag = belowLgTree.slice(rootAt, belowLgTree.indexOf(">", rootAt))
    expect(rootTag.includes("flex-col"), "the below-lg root must be a flex column").toBe(true)
    expect(rootTag.includes("flex-1") && rootTag.includes("min-h-0"), "the below-lg root must fill the remaining screen height too, unconditionally now").toBe(
      true
    )

    // ONE scrolling wrapper, holding stories, then time, then stakeholders,
    // then the conversation anchor LAST — her own "above the content"
    // complaint, answered by DOM order.
    const scrollAt = belowLgTree.indexOf("overflow-y-auto")
    expect(scrollAt, "the below-lg tree must have exactly one scrolling wrapper").toBeGreaterThan(-1)
    const storiesAt = belowLgTree.indexOf("TICKET_PANEL_ANCHOR.stories")
    const timeAt = belowLgTree.indexOf("TICKET_PANEL_ANCHOR.time")
    const stakeholdersAt = belowLgTree.indexOf("TICKET_PANEL_ANCHOR.stakeholders")
    const convAt = belowLgTree.indexOf("TICKET_PANEL_ANCHOR.conversation")
    expect(scrollAt, "the scrolling wrapper must open before the side panels").toBeLessThan(storiesAt)
    expect(storiesAt).toBeLessThan(timeAt)
    expect(timeAt).toBeLessThan(stakeholdersAt)
    expect(
      stakeholdersAt,
      "the conversation anchor must come AFTER all three side panels below lg — her own complaint, inverted"
    ).toBeLessThan(convAt)

    // The composer — the kit's own <CardFooter>, never a hand-rolled
    // look-alike — must be the LAST real element in the below-lg tree,
    // shrink-0 (flex-none) so it never shares the scrolling wrapper's
    // flex-1 budget.
    const footerAt = belowLgTree.lastIndexOf("<CardFooter")
    expect(footerAt, "the below-lg tree must render the composer through the kit's own CardFooter").toBeGreaterThan(convAt)
    const footerTag = belowLgTree.slice(footerAt, belowLgTree.indexOf(">", footerAt))
    expect(footerTag.includes("shrink-0"), "the pinned CardFooter must be shrink-0 (flex-none) — never a share of the scrolling budget").toBe(
      true
    )
    expect(
      footerTag.includes("bg-surface-panel"),
      "the pinned CardFooter must carry its own bg-surface-panel fill — outside any Card, it has no ground to inherit"
    ).toBe(true)
    // Nothing may render after this CardFooter inside the below-lg root —
    // D21's own "last child" test, restated positionally for this branch.
    const afterFooter = belowLgTree
      .slice(belowLgTree.indexOf("</CardFooter>", footerAt) + "</CardFooter>".length)
      .replace(/<\/div>\s*\)\s*$/, "")
      .trim()
    expect(afterFooter, "nothing may render after the pinned CardFooter in the below-lg tree").toBe("")
  })

  it("TicketConversationPanel's own Card fills its (lg-only) cell and CardFooter is its last child (D21)", () => {
    const at = body.indexOf("function TicketConversationPanel")
    expect(at).toBeGreaterThan(-1)
    const closeCard = body.indexOf("</Card>", at)
    expect(closeCard, "TicketConversationPanel must render a closing </Card>").toBeGreaterThan(-1)
    const fn = body.slice(at, closeCard)
    // R89 BELOW-LG RE-FIX, 19 Sep 2026: this component is LG-ONLY now (the
    // below-lg tree builds its own footer-less thread card instead, and
    // pins the SAME composer element outside it) — so its own Card needs
    // no `lg:` prefix and no below-lg floor (`min-h-[420px]`) any more; a
    // floor for a case this component no longer renders is dead weight.
    expect(fn.includes("h-full"), "TicketConversationPanel's own Card must carry h-full").toBe(true)
    expect(fn.includes("min-h-[420px]"), "TicketConversationPanel's own Card must NOT keep a below-lg floor it no longer needs").toBe(
      false
    )
    const contentAt = fn.indexOf("<CardContent")
    const footerAt = fn.indexOf("<CardFooter")
    expect(contentAt, "must render <CardContent").toBeGreaterThan(-1)
    expect(footerAt, "must render <CardFooter").toBeGreaterThan(-1)
    expect(contentAt, "CardContent (the thread) must come before CardFooter (the composer)").toBeLessThan(footerAt)
    // CardFooter must be the LAST thing before </Card> — nothing rendered
    // after it inside the card (D21's own red proof, restated positionally
    // for this one call site).
    expect(
      fn.slice(footerAt + "<CardFooter".length, fn.lastIndexOf("</CardFooter>") + "</CardFooter>".length).length,
      "there is exactly one CardFooter to close"
    ).toBeGreaterThan(0)
    const afterFooter = fn.slice(fn.lastIndexOf("</CardFooter>") + "</CardFooter>".length).trim()
    expect(afterFooter, "nothing may render between CardFooter and the Card's own closing tag").toBe("")
  })

  it("the reply composer pill is full width and matches the kit's own Input background, by construction", () => {
    // Derived, not hand-typed: the kit's own text-field background class,
    // read straight off input.tsx's `inputVariants`. If the kit ever repoints
    // its own field colour this line re-reads the new one and this law keeps
    // asking the same question of a moving target, rather than silently
    // comparing the composer to a colour the kit no longer paints.
    const m = inputSource.match(/"bg-(\S+)\s+text-foreground"/)
    expect(m, "shared/ui/components/input/input.tsx must still paint its base fill as `bg-<token> text-foreground`").not.toBe(
      null
    )
    const inputBgClass = `bg-${m![1]}`

    const at = composer.indexOf('data-slot="reply-composer"')
    expect(at, 'ReplyComposer must mark its pill data-slot="reply-composer"').toBeGreaterThan(-1)
    // The tag's own closing `>` — NOT a naive `indexOf(">", at)`, which would
    // stop at the `=>` inside this tag's own `onSubmit={(event) => {…}}`
    // arrow function, well before `className` is ever reached. JSX
    // formatting puts a multi-line opening tag's own `>` alone on its line,
    // so that is what this looks for instead.
    const afterStart = composer.slice(composer.lastIndexOf("<form", at))
    const closeRel = afterStart.search(/\n\s*>/)
    expect(closeRel, "the <form ...> opening tag must close on its own line").toBeGreaterThan(-1)
    const formTag = afterStart.slice(0, closeRel)
    expect(formTag.includes("w-full"), "the composer pill must carry w-full — full width of its own footer, not a shrink-to-fit pill").toBe(
      true
    )
    expect(
      formTag.includes(inputBgClass),
      `the composer pill must paint its own ground with the SAME class the kit's Input uses (${inputBgClass}), not a new colour — ` +
        `it must also differ from the conversation card's own ground (--surface-panel) so it reads as a distinct field`
    ).toBe(true)
    expect(
      formTag.includes("bg-surface-panel"),
      "the composer must not stand on the SAME ground as the card it sits inside (bg-surface-panel) — that is exactly the no-contrast bug this law fixes"
    ).toBe(false)
  })

  it("the composer's own wrapping div also claims full width, not just the form inside it (re-proof)", () => {
    // RE-PROOF, 18 Sep 2026 evening. The <form> above always carried
    // w-full — that was never the bug. The bug was ITS PARENT: the div
    // ReplyComposer returns is the sole child CardFooter (a flex ROW)
    // renders as `composer`, and a row's child shrinks to its own content
    // unless it claims width — so the form's own w-full was 100% of an
    // already shrink-to-fit box. Live on staging this measured 271px wide
    // inside a 769px footer. Found positionally: the function's own
    // `return (` up to the <form ...> tag this file's other test already
    // locates, which brackets exactly the one wrapping div and nothing
    // past it.
    const returnAt = composer.indexOf("export function ReplyComposer")
    expect(returnAt, "reply-composer.tsx must still export ReplyComposer").toBeGreaterThan(-1)
    const formAt = composer.indexOf('data-slot="reply-composer"', returnAt)
    expect(formAt, "ReplyComposer must render the data-slot=\"reply-composer\" form").toBeGreaterThan(-1)
    // The FIRST `<div` after `return (`, not the last one before the form —
    // the pending-reply bubble and the attach-tile grid are also `<div>`s,
    // rendered BETWEEN the wrapper and the form, so lastIndexOf from the
    // form would land on one of those instead of the wrapper.
    const returnParenAt = composer.indexOf("return (", returnAt)
    expect(returnParenAt, "ReplyComposer must render from a return (...) block").toBeGreaterThan(-1)
    const wrapperAt = composer.indexOf("<div", returnParenAt)
    expect(wrapperAt, "ReplyComposer's own root must be a <div> wrapping the composer form").toBeGreaterThan(returnParenAt)
    expect(wrapperAt, "the wrapper <div> must come before the composer form in source").toBeLessThan(formAt)
    const wrapperTagEnd = composer.indexOf(">", wrapperAt)
    const wrapperTag = composer.slice(wrapperAt, wrapperTagEnd)
    expect(
      /(^|\s)w-full(\s|")/.test(wrapperTag),
      "ReplyComposer's own wrapping div must carry w-full — CardFooter is a flex row and shrinks a childless-width child to its own content"
    ).toBe(true)
  })
})
