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
//
// ROUND 23 RE-FIX, 19 SEP 2026 — THE COMPOSER IS PINNED AT THE BOTTOM OF
// THE SCREEN AT EVERY WIDTH AND HEIGHT; EVERYTHING ELSE SCROLLS ABOVE IT.
// Aurora, over a screenshot at 1991×842 with the assistant panel OPEN —
// every earlier amendment's own proof widths tested the assistant closed,
// or open at a ~900px-tall viewport, never open AND short: "THE PROBLEM IS
// WHERE THE FOOTER IS!!! SHOULD BE AT THE VERY BOTTOM!" Rather than chase
// the flex chain onto a fifth combination, this round makes the composer's
// own position invariant to it: `TicketDetailBody`'s two per-width trees
// (`useIsAtLeastLg()`, unchanged) now differ ONLY in the DOM order of the
// ONE scrolling region above the composer — the composer itself is pulled
// fully OUTSIDE that region, a single `<CardFooter>` common to both trees,
// the root's own last child, `flex-none` so it never shares the scroll
// region's budget, and `sticky bottom-0` as a second, independent
// mechanism: if the flex chain above it ever resolves wrong again, sticky
// positioning (which answers to the nearest SCROLLING ancestor,
// `[data-slot="screen-shell-body"]`, not to this file's own arithmetic)
// still keeps it on screen. `TicketConversationPanel` — the component that
// used to bundle the thread and the composer inside one `Card` at `lg` —
// is retired: the thread's own footer-less card is now built identically
// in both trees.

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

  it("TicketDetailBody's own root is a flex column whose exactly two children are the scrolling region and the pinned composer", () => {
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

    // ROUND 23 — the composer no longer lives inside either per-width tree:
    // it is the ROOT's own last child, common to both. Found positionally,
    // once, after the root's own opening tag, by the `<CardFooter` JSX tag
    // that opens a real `className={cn(` prop expression — not a bare
    // `<CardFooter`, because this file's own doc comments (above, prose)
    // also contain the literal substring "`<CardFooter>`" and sit between
    // the root's opening tag and the real element.
    const footerAt = body.indexOf("<CardFooter\n", at)
    expect(footerAt, "the root's own composer CardFooter must exist").toBeGreaterThan(-1)
    const footerTag = body.slice(footerAt, body.indexOf(">", body.indexOf("className={cn(", footerAt)))
    expect(footerTag.includes("sticky"), "the composer must carry sticky — the belt-and-braces half of round 23's fix").toBe(true)
    // NOT a plain "bottom-0" — measured live this session, sticky's offset
    // anchors to the nearest scrolling ancestor's PADDING edge, so
    // `bottom-0` clamps the footer 24px short of the pane's true bottom at
    // `lg` (the exact padding app-shell.tsx's own `has-[...]` growth hack
    // exists to let the flow position grow past). The negative offset
    // cancels that padding so the two agree.
    expect(
      footerTag.includes("bottom-[calc(-1*var(--space-5))]") && footerTag.includes("lg:bottom-[calc(-1*var(--space-6))]"),
      "the composer's sticky offset must be the NEGATIVE padding-compensated bottom, not bottom-0 — see this file's own header for the live-measured 24px gap bottom-0 leaves at lg"
    ).toBe(true)
    expect(footerTag.includes("bottom-0"), "bottom-0 must NOT reappear — it silently reintroduces the 24px gap this round fixed").toBe(false)
    expect(footerTag.includes("flex-none"), "the composer must be flex-none — never a share of the scroll region's budget").toBe(
      true
    )
    expect(footerTag.includes("w-full"), "the composer must be w-full — full width of the content column").toBe(true)
    expect(
      footerTag.includes("bg-surface-panel"),
      "the composer must carry its own bg-surface-panel fill — outside any Card, it has no ground to inherit"
    ).toBe(true)

    // Nothing may render after this CardFooter inside the root — D21's own
    // "last child" rule, restated positionally for the root itself.
    const fnEnd = body.indexOf("\n}\n", fnAt)
    const afterFooter = body
      .slice(body.indexOf("</CardFooter>", footerAt) + "</CardFooter>".length, fnEnd)
      .replace(/<\/div>\s*\)\s*$/, "")
      .trim()
    expect(afterFooter, "nothing may render after the pinned CardFooter in TicketDetailBody's own root").toBe("")
  })

  it("TicketConversationPanel is retired — the composer no longer nests inside any per-width Card", () => {
    // ROUND 23, 19 Sep 2026. The component that used to bundle the thread's
    // CardContent and the composer's CardFooter inside one Card at `lg` has
    // zero remaining reason to exist once the composer is pulled fully
    // outside the scrolling region at every width.
    expect(
      body.includes("function TicketConversationPanel"),
      "TicketConversationPanel must be retired, not merely unused — the thread's own footer-less card is built inline in both trees now"
    ).toBe(false)
  })

  it("at lg, the scroll region is a 2fr/1fr grid pairing the thread (first/left) with the side panels (second/right)", () => {
    const fnAt = body.indexOf("export function TicketDetailBody")
    const isAtLeastLgAt = body.indexOf("isAtLeastLg ?", fnAt)
    expect(isAtLeastLgAt, "TicketDetailBody must branch its scroll region on isAtLeastLg").toBeGreaterThan(-1)
    const lgBranchEnd = body.indexOf(") : (", isAtLeastLgAt)
    expect(lgBranchEnd, "must render a ternary with a below-lg branch after it").toBeGreaterThan(isAtLeastLgAt)
    const lgBranch = body.slice(isAtLeastLgAt, lgBranchEnd)

    expect(lgBranch.includes("grid"), "the lg branch's own scroll-region child must be a grid").toBe(true)
    expect(lgBranch.includes("grid-cols-[2fr_1fr]"), "the lg branch must split 2fr/1fr — no lg: prefix needed, JS already gated this branch to lg").toBe(
      true
    )

    const threadAt = lgBranch.indexOf("threadCard")
    const sideAt = lgBranch.indexOf("sidePanels")
    expect(threadAt, "the lg branch must render the thread card").toBeGreaterThan(-1)
    expect(sideAt, "the lg branch must render the side panels").toBeGreaterThan(-1)
    expect(threadAt, "the thread must come first/left in the 2fr/1fr grid").toBeLessThan(sideAt)
  })

  it("below lg, the scroll region stacks the side panels THEN the thread — her own 'above the content' complaint, answered by DOM order", () => {
    // R89 BELOW-LG RE-FIX, 19 SEP 2026. Proven live that session
    // (`${SCRATCH}/footer-below-lg-inject.json`) that TWO separate
    // `flex-1 min-h-0` regions crush to zero on a tight budget — round 23
    // keeps this branch's own DOM order unchanged; only the composer's
    // position (proved in the root-level test above) moved.
    const fnAt = body.indexOf("export function TicketDetailBody")
    const belowLgBranchAt = body.indexOf(") : (", body.indexOf("isAtLeastLg ?", fnAt))
    expect(belowLgBranchAt, "must render a below-lg branch").toBeGreaterThan(-1)
    const branchEnd = body.indexOf(")}", belowLgBranchAt)
    const belowLgBranch = body.slice(belowLgBranchAt, branchEnd)

    expect(belowLgBranch.includes("flex-col"), "the below-lg branch's own scroll-region child must be a flex column (stacked)").toBe(true)
    const sideAt = belowLgBranch.indexOf("sidePanels")
    const threadAt = belowLgBranch.indexOf("threadCard")
    expect(sideAt, "the below-lg branch must render the side panels").toBeGreaterThan(-1)
    expect(threadAt, "the below-lg branch must render the thread card").toBeGreaterThan(-1)
    expect(sideAt, "the side panels must come before the thread below lg — her own complaint, inverted").toBeLessThan(threadAt)
  })

  it("the ONE scrolling region wrapping both per-width branches is flex-1 min-h-0 overflow-y-auto, and is the root's ONLY other child besides the composer", () => {
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

    // Exactly one scroll region and one CardFooter between the root's own
    // opening tag and TicketDetailBody's closing brace — proves the root
    // has no third child sneaking in.
    const fnEnd = body.indexOf("\n}\n", fnAt)
    const rootBody = body.slice(body.indexOf(">", rootAt), fnEnd)
    const scrollCount = (rootBody.match(/overflow-y-auto/g) || []).length
    // `<CardFooter\n` — not a bare `<CardFooter` — for the same reason as
    // the test above: this file's own doc comments mention
    // "`<CardFooter>`" as prose inside the function body too.
    const footerCount = (rootBody.match(/<CardFooter\n/g) || []).length
    expect(scrollCount, "exactly one overflow-y-auto scroll region in the root").toBe(1)
    expect(footerCount, "exactly one CardFooter (the composer) in the root").toBe(1)
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
