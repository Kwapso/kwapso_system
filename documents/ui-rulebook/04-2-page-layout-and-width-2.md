# 2. Page layout and width (part 2 of 4)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### L13: the trail line lives inside the content card, above the head; the Chrome shortcuts are only partly replicated

**The rule.** Two rulings, the same day, the second correcting the first's geometry.
**Morning, verbatim:** *"the breadcrumbs should sit in the background, outside the
container, on top, and on the very far left, have a back and forward arrow."*
**Afternoon, over the shipped result, verbatim:** *"I love the direction that we are
going, but put the breadcrumbs and the navigation inside the container."*

**The mechanism.** `ScreenShell`'s `trail?: React.ReactNode` slot (kit v1.2.104,
corrected the same day in v1.2.105) renders as the card's own first child — above the
collection heading or record head, inside the same paper the rest of the screen stands on
— rather than as a sibling sitting on the bare page ground between the tab strip and the
card. `TrailLine` (`shared/ui/components/breadcrumbs/trail-line.tsx`) reads
`--foreground`/`--ink-tertiary` off the card's own paper (`--surface-raised`) now, not the
spine ink the morning version borrowed — "current bold, earlier quiet" is carried by
weight, never by colour, the same rule this book holds everywhere else. Back and forward
call `back()`/`forward()` (`web/lib/workspace-tabs.ts`), each disabled at whichever end of
the active tab's own `steps` it has reached; clicking an earlier step in the trail itself
calls `jumpTo(index)` — Chrome's long-press-Back menu, without the long-press.

**The Chrome shortcuts, and which ones actually exist.** Built: cmd/ctrl-click and a real
middle-click open beside ([L12](#l12-a-tab-is-a-trail-a-plain-click-or-a-rail-pick-pushes-a-step-onto-it-only-a-deliberate-gesture-opens-a-new-one));
a plain Shift-click or Alt-click is deliberately left to the browser, which is its own way
of replicating them; cmd/ctrl-T opens a new tab, guarded against stealing the letter out
of a focused input, textarea or the Notes editor's own contentEditable
(`web/components/shell/app-shell.tsx`). **Not built, the same status as reopen-closed:**
cmd-[ / cmd-] (Back/Forward from the keyboard), cmd-W (close the active tab) and cmd-1..8
(jump to a tab by position) — as of this writing there is no keydown listener for any of
the three anywhere in `web/` or the kit, so despite standing beside the built four in
conversation they are not live yet.

**Law.** None registered — `verify/trail-line/` (kit) measures the card's own top staying
unmoved by `trail`'s presence and the head moving down by exactly the trail's height plus
the gap; `web/test/workspace-tabs.test.ts` covers `back`/`forward`/`jumpTo` at the store
level.

**AMENDED 17 Sep 2026 — more space above the trail line, a divider under it, and her pick
from the resulting artifact is S3 + D2.** Reviewing the shipped trail line, the client's
ruling, verbatim: *"great Work: Make a bit more space above the breadcrumbs. Reduce the
space between the breadcrumbs and the chips. Maybe we could add a divider line. Create a
main artifact with different visuals."* A spacing-and-divider artifact was built with
several spacing options and several divider treatments; her pick, verbatim: *"For the
Trail Line Designs, for the spacing, do s3. and d2"* — **S3** for the spacing (20px above
the trail line, 8px below it down to the chip row) and **D2** for the divider (the trail
rendered as a search-bar-like field, carrying a ⌘K hint), shipped in kit v1.2.111
(`shared/ui/components/breadcrumbs/trail-line.tsx`; `shared/ui/CHANGELOG.md`'s own
"trail gains air, a hairline divider and a search-bar shell (S3/D2)" entry).

**Status: ruled, in build, 17 Sep 2026 (kit v1.2.111).**

**AMENDED 18 Sep 2026 — a second pass over the same trail line, her pick is T1: symmetric
10px, no hairline, arrows inside the field.** Reviewing the S3+D2 shape above, the client's
ruling, verbatim: *"for the breadrcumbs / search - half of the margin that now is on top,
and exactly same under. no line divider under. inckude the nav. arrows in the colored
background."* Read against S3's own numbers (20px above the trail line, 8px below it down
to the chip row): **half of the margin that now is on top** is 10px, and **exactly same
under** makes the space below it 10px too — the two are no longer different values, the
20/8 split S3 shipped is gone. **No line divider under** retires D2's hairline under the
trail entirely (the search-bar-like field shell itself stays, only its baseline rule is
removed). **Include the nav arrows in the colored background** moves back()/forward() inside
the trail's own tinted field, rather than sitting outside it as a separate pair. Named
**T1** for this pick, shipped in kit v1.2.114
(`shared/ui/components/breadcrumbs/trail-line.tsx`).

**Status: ruled, in build, 18 Sep 2026 (kit v1.2.114). Supersedes S3/D2's spacing and
divider above; the trail-inside-the-card placement and the back/forward mechanism from the
morning/afternoon rulings are untouched.**

**AMENDED 18 Sep 2026 ~06:40 (Round 17) — the trail field and the title share one left
edge, and the search icon and the ⌘K hint are gone from the field entirely.** Two further
rulings, the same session, read together:

- *"look at first screenshot. pils and title are slightliy wider that the topnavbar. should
  not be. they shoul be same width and end at the same point in the left"* — the chip row
  and the record/collection title sit flush with the trail field's own left inset; the
  content card's head band reads the same left edge the trail field already draws from,
  rather than a wider measure of its own, so the trail field, the chips and the title all
  start and end at one shared left point.
- *"on the top navbar, kill the search icon, makes no sense there. also kill the cmd+k"* —
  T1's search-bar-like field shell drops its leading search glyph and its ⌘K hint outright;
  the field keeps the back/forward arrows in the tinted background T1 already moved inside
  it, and reads as the trail line it is, not a search input.

**Status: ruled, in build, 18 Sep 2026 (kit v1.2.116).**

**AMENDED 18 Sep 2026 ~10:30 (Round 18) — the trail's own two gaps split, 10 above and 16
below; the identity chips keep 10 above the title, corrected down from an overshoot.** Her
"ready to review" list that morning carried two spacing corrections in the same sentence,
verbatim: *"change to trail line 10px abpove 16below, from chips to tile only 10."*

- **The trail line itself** — `DENSITY_TRAIL`'s own `pt` above the trail was already
  `--space-2h` (10px, T1's "exactly same" pick, Round 17); this ruling leaves it untouched
  and moves only `TRAIL_GAP`, the gap AFTER the trail down to whatever follows (the chip
  row or the body), from `--space-2h` (10) to `--space-4` (16) — the next rung up the same
  scale, not a new custom property. "Above" and "below" are two different rungs on purpose
  now, not one token read twice the way T1 had it. Shipped in kit v1.2.118/v1.2.119
  (`shared/ui/compositions/templates/screen-shell.tsx`'s own `TRAIL_GAP` constant);
  `web/test/trail-slot-spacing.test.tsx` pins both rungs against the kit source directly.
- **The identity chips' own gap above the title** is a separate span, one level down, not
  drawn by the trail slot at all — this is the "from chips to tile" half of her sentence.
  It had already been corrected the same session, from a first pick of 8px
  (`mb-[var(--space-2)]`, her earlier "t1 and c2" artifact choice) up to the 10px
  (`mb-[var(--space-2h)]`) this ruling names, reading the deployed 8px back and finding it
  undershot. `web/components/records/record-chrome.tsx`'s identity-chips wrapper carries
  the correction; `web/test/record-head-chip-gap.test.ts` pins it structurally off the
  source, the same discipline `record-head-mark.test.tsx` already holds to for this file,
  because jsdom runs no layout engine to measure against.

**Status: ruled, in build, 18 Sep 2026 (kit v1.2.119; record-chrome.tsx). Two different
gaps, corrected in the same ruling, never to be conflated: the trail's own 10/16 split
lives in the kit's `screen-shell.tsx`; the chips-to-title 10px lives app-side in
`record-chrome.tsx`, one level below the trail slot.**

### L14: the assistant column's width is a drag, snapping to three sizes

**The rule.** *"Is it possible that we can, while using the app, adjust the width of the
assistant? If possible, make me an artifact of how this could look."* — client, 16 Sep 2026.
Four variations were mocked (`verify/decisions.html`'s sibling assistant-width artifact:
drag the seam, three fixed sizes, a wide toggle, detach to a tab); her ruling: *"A — drag the
seam, with B's three widths as its snap points."*

**The mechanism.** `ScreenShell` gains `asideWidth?`, `defaultAsideWidth`, `onAsideWidthChange?`,
`asideMinWidth` (320) and `asideMaxWidth` (520) (kit v1.2.91), matching the existing
`asideOpen`/`defaultAsideOpen` controlled/uncontrolled pattern. The aside's own inner-edge
`EdgeHandle` becomes draggable — pointer capture, `cursor-col-resize`, a live width readout
while dragging, arrow keys step ±16px and Home/End jump to the min/max on the focused
handle, a double-click resets to 400 (the middle snap point). [320, 400, 520] — B's own three
widths — are magnetic snap points: a drag that releases within a small tolerance of one
lands on it exactly, and a drag that releases elsewhere keeps the exact pixel value. Below
`md` (the phone's bottom-sheet presentation) nothing changes — width does not apply there.
The content column keeps its own minimum width regardless: the aside's existing viewport
caps (`max-w-[calc(100vw-var(--shell-gutter)*2)]`, `lg:max-w-[40vw]`) still hold, so a wide
drag on a narrow window is capped by the same mechanism that already protected the content
column before this ruling. The aside-width store and its per-person persistence were deleted
on 16 Sep 2026; previously this persisted the chosen width in `localStorage` (try/catch,
matching `web/lib/agent-open.ts`'s own defensiveness), scoped by the signed-in person's id
the same way `workspace-tabs.ts` scopes a shared device's open tabs.

**Assistant width design (16 Sep 2026):** *"can we actually not show anything and make it so that I can grab the left rail of the assistant, and when I hover over there, I see this kind of arrow to move?"* — client. The seam draws nothing at rest; the aside's left edge is the grab area; hover shows the col-resize arrow; snaps and keyboard navigation are unchanged (kit v1.2.93, `RESIZE_SEAM` in screen-shell.tsx).

**Law.** None registered — `shared/ui/compositions/templates/screen-shell.tsx` carries the
drag/snap/keyboard mechanism; app-side persistence testing was deleted on 16 Sep 2026.

### L15: tab strips reorder by drag or keyboard, and pinned tabs stay fixed

**The rule.** *"go with the drag order"* — client, 16 Sep 2026. Content and assistant tab strips reorder by pointer drag or Alt+Arrow keys; pinned History and "+" tabs never move (kit v1.2.95 `onReorder`, workspace-tabs.ts `reorderTab`, agent-conversation-tabs.ts `reorderAgentTab`).

**Law.** None registered — `web/test/workspace-tabs.test.ts` and `web/test/agent-conversation-tabs.test.ts` pin the store-level reorder; `shared/ui/components/breadcrumbs/breadcrumb-folders.tsx`'s own `onReorder` doc pins the drag/keyboard mechanism.

### L16: "Close all tabs" keeps the tab you are on and shuts every other one

> **SUPERSEDED, 17 Sep 2026 — THE CONTROL ITSELF IS GONE.** The client's ruling, verbatim,
> over a screenshot of the shipped control: *"I don't know what it is (this X button that
> you added in the tabs in the main content that closes everything), but no one asked you,
> so delete it."* `onCloseAll`, `closeAllLabel`, `CLOSE_ALL_WRAP`, `CLOSE_ALL` and the
> trailing `<li>` they drew are gone from the kit outright (kit v1.2.106, shipped one day
> after v1.2.92 below) — not deprecated, no dead body left for a later session to trip on
> — and the app's own `closeAllTabs` wiring (`workspace-tabs.ts`, `app-shell.tsx`) went
> with it the same day. Nothing below this line is live; kept as the record of what
> shipped and why it was asked for in the first place.

**The rule.** Chrome's "close other tabs", asked for under the app's own name for it:
a trailing control on the workspace tab strip that closes every open tab except the one
she is standing on, which stays open and stays active — nothing about it moves.

**The mechanism.** `closeAllTabs(keepPath)` (`web/lib/workspace-tabs.ts`) is the one
mutator: it keeps only the tab whose path is `keepPath` — always the tab
`deep-link-screen.tsx` is currently rendering, read live off `currentPath` the same way
`closeWorkspaceTab` already does — and drops every other entry from `tabs` and from
`recency` in one step. `BreadcrumbFolders`' own `onCloseAll` (kit v1.2.92) draws the
control as the strip's last flex child, styled like the per-tab × rather than like a tab
(`CLOSE_ALL_WRAP`/`CLOSE_ALL` in the kit, the `XSquare` glyph in place of the per-tab `X`),
and it is the KIT that decides when there is nothing to close: with one tab open it draws
no control at all, rather than one that would do nothing — `onClose` and `onCloseAll` are
both required for it to appear, and `items.length > 1` besides.

**Why it never has to ask about an unsaved draft.** A tab set is a set of PATHS, not
mounted screens (see `OpenTab`'s own doc, `workspace-tabs.ts`) — this whole app is one
never-unmounting shell (R37), so at any moment exactly one screen is actually on the page:
the one behind the ACTIVE tab. `web/lib/unsaved-changes.ts`'s dirty registry can therefore
only ever hold a draft for that one mounted screen, and this action never closes it — every
OTHER tab it removes was already unmounted, holding nothing but its own remembered path and
label. So `closeAllTabs` calls no guard, asks no confirm, and moves nobody: the same
"background tab, nothing mounted is at risk" fact `closeTab`'s own doc already establishes,
just true of every tab this closes instead of one.

**Law.** None registered — `web/test/workspace-tabs.test.ts` pins the store (keeps the tab
she is on regardless of its position, closes every other one, is a no-op at one tab, and
survives a reload) and `web/test/workspace-tabs-are-wired.test.tsx` pins the wiring (the
control renders when given and hides at one tab, and never touches an unsaved draft on the
kept tab).

### L17: the assistant resizes from its own left edge, never the screen's right one

> **SUPERSEDED, 16 Sep 2026, EVENING — THE RESIZE FEATURE ITSELF IS GONE.** The client's
> ruling, verbatim, over the shipped build: *"Let's forget about the resize. It's a
> disaster. Remove it."* Not disabled — removed: the kit's `ScreenShellProps` drops the
> whole `asideWidth`/`defaultAsideWidth`/`onAsideWidthChange`/`asideMinWidth`/
> `asideMaxWidth`/`asideResizeLabel` API, the invisible `RESIZE_SEAM` grab and its
> hover-reveal `cursor-col-resize` arrow, `EdgeHandle`'s drag logic
> (`dragMoved`/`dragStart`/`nextWidth`, the pointer/keyboard wiring, the `role="slider"`),
> and the four constants + two functions that governed it (`ASIDE_WIDTH_MIN/MAX/DEFAULT/
> SNAP_POINTS`, `clampAsideWidth`, `snapAsideWidth`) — deleted, not kept unused. The aside
> column is back to **one fixed width, `ASIDE_WIDTH` = `23.75rem`** (kit v1.2.100) — the
> same measure the shell drew before L14 ever touched this file. Everything else about the
> aside (open/close, `asideTabs`, `onCloseAll`, `asideHandleOnOpen={false}`) is untouched.
> This rule's own correction (which edge the seam sat on) no longer applies to anything —
> there is no seam. L14's snap-point ruling is retired with it. Kit's own
> `compositions/templates/check-screen-shell.mjs` was REWRITTEN, not deleted: it now
> asserts no trace of the resize feature has come back and that `ASIDE_WIDTH` is still the
> literal `"23.75rem"`.

**The rule, as it stood before 16 Sep 2026 evening.** The client's ruling, 16 Sep 2026, verbatim, over
that's the behavior I want, but right now you put it on the right edge. I want it on the
left one, the one that's between the assistant and the main content, obviously."* The
draggable seam L14 describes is the assistant column's own left/start edge — the boundary
it shares with the main content column — and nowhere else. The kit's `RESIZE_SEAM`
(`screen-shell.tsx`) sits at `start-0` on the aside, never at the screen's own right edge,
which is not a boundary between two panes at all and was never the one she meant to grab.
The 320/400/520 snap points and the hover col-resize arrow L14 already describes are
unchanged by this correction — only which edge answers the drag.

**Law.** None registered — see L14's own account of the mechanism and its test.

### L18: dragging a tab moves it along the strip's own axis, Chrome-style

**The rule.** The client's ruling, 16 Sep 2026, verbatim, over L15's shipped reorder: *"I
like the behavior, but visually it's a bit confusing. Can we drag it instead of freely on
the same edge, only horizontally, so to say? Exactly the same behavior as when dragging
tabs in Google Chrome."* L15's drag let a tab travel off its own strip's axis mid-drag,
which read as a tab coming loose rather than sliding past its neighbours. The corrected
drag is constrained to the strip's own axis — horizontal only, on either the content strip
or the assistant strip — and neighbouring tabs slide live to open the slot the dragged tab
is about to occupy, the same live-reflow Chrome's own tab strip draws. Pinned tabs (History
and "+" on the assistant strip) never move and never open a slot.

**Law.** None registered — `web/test/workspace-tabs.test.ts` and
`web/test/agent-conversation-tabs.test.ts` pin the store-level reorder L15 already
describes; the axis constraint and the live-slide are the kit's own drag mechanism.

**AMENDED 17 Sep 2026 — a tap could no longer open a tab.** The client's ruling, verbatim:
*"after you implemented the drag tabs, I can no longer click them to open them."* Real
clicks on a tab, its ×, or a pinned tab did nothing, on either strip: `setPointerCapture`
(taken on every `pointerdown` of a movable tab, drag or a motionless tap alike, since
nothing tells the two apart until after the gesture) retargets every later pointer event —
and the browser's own DERIVED `click` — to the `<li>` that captured it, never the anchor,
button or × nested inside it. Fixed two ways (kit v1.2.106): a tap that never crosses
`DRAG_MOVE_THRESHOLD_PX` (4px) replays its click directly on the element the pointer went
down on (`drag.originTarget`, captured via `closest("a, button")` so an icon's own SVG,
which has no native `.click()`, is never the target); a real drag is unaffected — it still
reorders and still swallows its own trailing click, and the per-tab × still fires
`onClose`.

### L19: the active tab is always the topmost layer, everywhere a tab strip draws

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"It's correct what you did, but
still, the 'inactive' tabs' shape appears in front of the active one. That's wrong. It
should be behind."* Every tab strip in the app — the content strip's `BreadcrumbFolders`
and the assistant's `AgentTabStrip`, including its compact, icon-only presentation — paints
the active tab above every inactive neighbour, never the reverse: an inactive tab's own
folder shape may not overlap the active tab's edge and read as sitting in front of it.

**Law.** Pinned by the kit's own conformance check on `breadcrumb-folders.tsx`'s z-lift
(`TAB_LIVE`/`TAB_REST`), not a registry law here — `web/test/agent-tab-strip.test.tsx`
asserts the active tab carries the higher z-index in both the content and the assistant
strip's compact form.

**AMENDED 16 Sep 2026, evening, kit v1.2.100 — the fix above was correct and incomplete.**
The client's ruling, verbatim, over a screenshot of the compact assistant strip, after the
first fix had shipped: *"the shape is not behind. That's wrong. The inactive tabs are
overlapping."* The STATIC pair (`TAB_REST`'s `z-0` / `TAB_LIVE`'s `z-[1]`, on the inner
link/button `CrumbShape` draws inside) was genuinely correct for the cases it was checked
against and stayed correct. The gap neither reading could see: `onTabPointerMove`'s own
`drag.others.forEach` writes a bare `style.transform` onto every OTHER movable tab a drag
has moved past — active or not — with no z-index of its own, and a `transform` alone
creates its own stacking context regardless of `z-index`. So the instant the active tab is
merely SHIFTED out of a dragged neighbour's way (never itself dragged, never under the
pointer), its `z-[1]` — on the link — is sealed inside a stacking context the strip's own
comparison can no longer see into, and the outer comparison falls back to DOM order against
a later, untransformed sibling — a pinned tab (History, "+") is *always* later, by design.
That DOM-order tie is "the inactive tab in front," reproduced without the active tab ever
being the one a reader drags. **Fixed by moving the authoritative number from the button to
the `<li>`** — the element that owns the whole silhouette, shoulders included:
`BreadcrumbItem`'s own className now carries `live ? "z-[1]" : "z-0"` directly, on every
tab, so the number survives a bare `transform` no matter which sibling it sits on. Proved
red-then-green in `verify/breadcrumb-folder/` (`tabset-shift-probe`): a real synthetic drag
shifts the active tab without holding it, and the `<li>`'s own z (not the link's) is read
against a trailing pinned tab's — `"1" > "0"` mid-shift, where it used to tie at `"auto"`.

**AMENDED 17 Sep 2026 — status: reported a third time; pending measurement on live page.**
The client reported the same issue on 17 Sep 2026. The fix is in the kit's verify page
(`verify/tabstrip-parity`, kit v1.2.102) and is not reproduced there. The issue is open
until measured against the live app on staging.

**MEASURED 17 Sep 2026 — the icon-only tabs lost their top-left arc.** On the live page, the assistant strip's icon-only tabs are squashed below the silhouette's minimum width, losing the rounded top-left corner that marks the folder shape as a folder and not just a label strip. Kit v1.2.103 gives icon-only tabs the silhouette's minimum width (`--folder-radius-lip` + `--folder-shoulder`). The fix is verified on the page `verify/tabstrip-parity` in kwapso-design.

**FIXED 17 Sep 2026, evening — tabs nest by the shoulder, Chrome's own model (the fourth
report on this exact silhouette).** The client's ruling, verbatim: *"The inactives on the
assistant are overlapping, so they're on top of the active tab, and that's incorrect. They
should be behind."* Measured against live-staging screenshots: every tab stood 4px apart
at rest, so two tabs never shared a pixel — nothing like Chrome, where the NEXT tab's
rounded corner sits UNDER the PREVIOUS tab's shoulder, which is why a shift kept reading as
"the wrong one is in front" no matter which z-index fix landed before this one. The real
fix is a deliberate overlap, not a smaller gap: every tab after the first sits exactly
`--folder-shoulder` under its predecessor (kit v1.2.106), and z-index is no longer flat —
each rest tab gets its own strictly descending number by position (`restZIndex`), so the
earlier (left) tab always outranks a later one, with `isolation: isolate` on the strip's
own `<ol>` keeping the comparison local — a negative `z-index` flex item is unclickable
without it, measured in real Chromium. Proved in `verify/tabstrip-parity/`: the pixel
overlap equals the shoulder on every consecutive pair, across three strip shapes, and
`elementFromPoint` at the shared pixel returns the tab that ought to win.

**AMENDED 18 Sep 2026 ~06:40 (Round 17) — superseded: tabs separated by a gap, not nested by
the shoulder.** The client's ruling, verbatim: *"the top tabs folder, need space betwwen
tehm. right now they merge altogether."* The deliberate shoulder overlap the fix above
shipped — the next tab's rounded corner sitting under the previous tab's shoulder, Chrome's
own model — reads as the tabs merging into one shape rather than as separate tabs, so it is
retired: every tab strip in the app draws a visible gap between consecutive tabs instead,
with no overlapping shoulder. The z-index ordering this rule settled (the active tab always
outranking a shifted neighbour, `<li>`-level, `isolation: isolate` on the strip) is
untouched — only the shoulder-nesting geometry is gone.

**AMENDED 18 Sep 2026 ~13:20 (Round 20) — reported a sixth time; the standard is now
explicit: match the content strip exactly.** The client's ruling, verbatim: *"on the
assistant, the inctove tabds shape is still overlapping with the active one. tahts worng.
shoudl 100% replicate what hapens with main content tabs."* Every fix above has been
argued and proved against the assistant strip's OWN geometry — its own z-index, its own
shoulder-then-gap history — and each round she reports the identical shape again. Her
words this time name the standard directly rather than describing the symptom once more:
the assistant `AgentTabStrip` is not merely SIMILAR to the content `BreadcrumbFolders`
strip, it must be verified AGAINST it, tab for tab. Nothing here supersedes the geometry
the 18 Sep ~06:40 amendment settled (a visible gap, no shoulder-nesting) or the z-index
rule this rule opened with (`<li>`-level, `isolation: isolate`) — both strips already share
the one component (`BreadcrumbFolders`) and the one CSS the kit ships, so a further drift
between them is a call-site difference, not a second geometry to invent. Open until proved
on live staging, strip beside strip, the same `ready-means-deployed` standard the 17 Sep
amendments above were held to.

**Status: reported a sixth time, 18 Sep 2026 (Round 20); open pending a live, side-by-side
proof against the content strip rather than a further isolated fix to the assistant one.**

**VALIDATED 20 Sep 2026 (Round 30).** Aurora reviewed staging this round and confirmed the
assistant strip's inactive tabs live: the shape sits behind the active tab, not in front of it
(closed under [B30](#b30-two-kit-fixes-read-together-the-assistant-strip-and-the-chat-message-menu-v12138v12139)'s
kit v1.2.138 fix).

**Status: validated, 20 Sep 2026 (Round 30).**

### L20: the assistant strip drags conversations only; History and "+" are pinned last and never move

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"Recreate the drag behavior on
the assistant. However, you can only drag chats, not the history or the plus. They are
always at the far right."* L18's Chrome-style pointer drag (follow the pointer 1:1, no
easing, neighbours slide live to open the drop slot) is wired onto `AgentTabStrip`
(`web/components/assistant/agent-tab-strip.tsx`) through the kit's own `onReorder` prop —
the same mechanism the content strip already uses, not a second one. Only a real
conversation tab is a drag source or a landing slot; the pinned History clock and the "+"
both carry `closable: false`, which the kit's own `movableRange()` already reads to stop
the contiguous movable run at the first pinned neighbour — so they need no bookkeeping of
their own to stay put. History sits immediately left of "+", and both sit last, trailing
every conversation tab, on both ends of any drag.

**Law.** None registered — the drag mechanism itself is the kit's (L18's own account and
test); `web/test/agent-tab-strip.test.tsx` pins History/"+" as non-draggable, always-last
tabs on the assistant strip specifically.
