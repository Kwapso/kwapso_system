# 2. Page layout and width (part 3 of 4)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### L21: the page body never scrolls sideways

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"there is a certain horizontal
scroll. Kill that. There should be no horizontal scroll."* Every row whose natural width
would overflow its container sits inside its own `overflow-x: auto` viewport, or is pinned
to a registry (`SCROLL_FLOOR_EXEMPT`, `shared/rules/registry.ts`) with a written reason.
The page body's own root `width` is never constrained to grow past the viewport, and no
row carries a `min-w-max` or `min-w-screen` that makes it wider than the container it sits
in. Every table, code block, and overflow-prone row reads its own width constraint from one
source: either it fits, or it scrolls itself.

**Where this reaches today.** Every literal `min-w-max` in `web/`, `web-portal/` and
`shared/web/` is audited: pinned entries carry their reason, and every other one is wrapped
in its own `overflow-x: auto` container. `web/test/rules.test.ts` asserts `scroll-floors`
—  the count of `min-w-max` inside an exempt path — stays equal to the known count; any new
`min-w-max` outside the exemption turns the build red.

**AMENDED 17 Sep 2026 — The tab strip's own scrollbar, not the body.** Measured on staging at 1280 and 1440px viewport widths: the page body carries no overflow. The horizontal scroll the client saw is the tab strip's own internal scrollbar (`overflow-x: auto` on the strip itself, never on the body). Kit v1.2.103 hides the scrollbar on WebKit (Safari) too, where it was still visible; Chromium already hides it. The page body measured no overflow at any tested width and remains correct.

**Mark:** Root cause on staging is now measured (17 Sep 2026); no further action needed.

**AMENDED 18 Sep 2026 ~06:40 (Round 17) — the assistant column still scrolls sideways; kill
it there too.** The client's ruling, verbatim: *"assistant still has cetrain horixotnal
scroll to it. kill taht."* The 17 Sep amendment above measured the page body and the tab
strip's own scrollbar and found neither at fault; the assistant column itself is a third
surface the same `SCROLL_FLOOR_EXEMPT` discipline now reaches — every row inside the
assistant panel (the conversation thread, a reply, an action row) sits inside its own
bounded width or its own `overflow-x: auto` viewport, never wider than the column that
holds it, with no `min-w-max` outside the registry.

**Status: ruled, in build, 18 Sep 2026 (assistant app lane).**

**AMENDED 18 Sep 2026 ~06:40 (Round 17) — only a reply carries a background; an action sits
bare.** The client's ruling, verbatim: *"for assistant, only the "replies" should have the
bacvkground. the "actions" should sit without any container aorund them."* The assistant
conversation draws two kinds of rows: a **reply** (the assistant's own written answer) keeps
its container — the raised card background this book uses for a message; an **action** (a
tool call, a confirm, a step the assistant took) sits directly on the assistant column's own
ground, with no card, no border and no fill of its own, the same "a block earns a container
only when it holds a collection of rows" reading [N6](#n6-one-cue-per-boundary-and-the-container-is-earned)
already applies elsewhere — a single action row is not a collection.

**Status: ruled, in build, 18 Sep 2026 (assistant app lane).**

### L22: activating "+" selects the newest unused conversation

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"On the assistant, when I have a new chat open and I create another new one, if this new one is still unused, just open the already existing one. What I want to avoid is having 10 new unused sessions."* The "+" button that mints a new conversation in the assistant strip does not open it; instead, if a conversation with no thread exists (unused, never replied to), that one is brought to front. The newest such conversation is the one selected, and a second "+" press still names only one conversation so `switchThreadless()` keeps only one per session. Her follow-up report (same session): *"now when I have a new open, I cannot go back to my conversation. Is that a bug? Please fix it. Also, I cannot close the new tab in the assistant."* Two findings: the newly created tab's back-button opened the wrong history panel, and no close button appeared on it. Both are fixed.

**Tests:** `web/test/agent-conversation-tabs.test.ts` and `web/test/agent-panel-tab-wiring.test.tsx` (the latter also guards: switching tabs while the assistant is busy is retried when it frees, and a tab's own thread is never overwritten).

**Law.** None registered.

### L23: a multi-day record on a calendar draws as a span — a capped chip on the first and last day, a thin line between

> **Moved here from L13, 17 Sep 2026**, to make room for the rewritten navigation rules
> above ([L12](#l12-a-tab-is-a-trail-a-plain-click-or-a-rail-pick-pushes-a-step-onto-it-only-a-deliberate-gesture-opens-a-new-one)/[L13](#l13-the-trail-line-lives-inside-the-content-card-above-the-head-the-chrome-shortcuts-are-only-partly-replicated)).
> The content is unchanged.

**The rule.** *"In the calendar, we should see sprints lasting multiple days, so maybe we
need to redesign this component. If so, make an artifact with different variations."* —
client, 16 Sep 2026, over the month grid's own one-chip-one-day shape, which showed a
twelve-day sprint on a single date, indistinguishable from a one-day task. Four variations
were mocked (`verify/decisions.html`'s sibling calendar-spans artifact); her ruling, choosing
from them: *"for calendar, I choose S2, Start-and-end caps."*

**The mechanism.** The kit's `CalendarEvent` gained `span?: { id, position: "start" |
"middle" | "end" | "only" }` (kit v1.2.90). A `start` or `end` day still draws a chip, capped
on the record's own boundary edge and flat on the edge that runs into the next day; a
`middle` day draws no chip at all, only a thin ghost line in the record's own colour, at low
alpha, so a long span does not spend one chip per day of itself. `record-calendar.tsx`'s
`expandEntry` is the one place a host walks `CalendarEntry.day`…`endDay` into these
per-day placements — `RecordCalendar`'s own "ONE CALENDAR" door, so a span on the grid is
never a picture built by a second file. Waves and sprints are the first callers
(`waves-screen.tsx`'s `buildWaveCalendarEntries`): a wave's own `endsOn` and a sprint's own
`endsOn` both ride along as `endDay`, so a sprint's span draws inside its wave's, and the
two stack rather than one hiding the other. The "+N more" day dialog still lists a span once
— it reads one day's own placements, and a record contributes exactly one placement to any
single day. Below `sm:` the compact dots show only the start and end days; a `middle` day
earns no dot, because a dot with no label has nothing to say about a day that is merely
somewhere inside a span already marked by the line above `sm:`.

**Law.** None registered — the kit's own `calendar-view.tsx` carries the shape (see its
header and `CalendarEvent.span`'s own doc); `web/test/rules.test.ts`'s `one-calendar` still
censuses that only `record-calendar.tsx` may import the kit's `calendar-view` directly.

### L24: a new tab opens on a search page, never a blank one — one unused new tab at most

**The rule.** Superseded twice, same day. First, verbatim: *"For the new tab, when it
opens a fresh tab, put here the text that says, 'Alaap, this space is for you.' He will
take care of building this page. He will build a search bar."* Then, over her own
proposal, verbatim: *"For the new tab page, implement 02 in your proposal. However, do
not ask the assistant, just search anything, and instead of search, put an icon there
that means search. Make sure you use elements in the kit."* And, the same day: *"Because
now we have the concept of a new tab in the main content, then also add the plus tab,
like in the assistant. And the same rules as there. You cannot have two new tabs."*

**The mechanism.** `NewTabScreen` (`web/components/shell/new-tab-screen.tsx`) is a search
bar (`SearchInput`), a module scope-chip row underneath it (Tickets/Accounts/Stories/Apps/
Contacts/Knowledge — "People" corrected to "Contacts" to match the glossary, R34), and a
"Recently opened" list read off every OTHER open tab's own trail (`openTabsSnapshot()`),
newest-touched-tab first. Six doors, one question each, no new route: every module already
answers `q` at its own list door (R14), capped at five results per module for display,
never a claim about the collection's real size. The search trigger is an icon-only
button — mango since Round 20, below — and no
hint sentence rides under the title (R81). A pinned "+" sits on the content tab strip,
mirroring the assistant strip's own trailing "+" byte for byte (`iconOnly`,
`closable: false`), and **you cannot have two**: pressing "+" a second time fronts the one
unused new tab already open rather than minting another, the same "unused" reading
`openNewTab` uses elsewhere ([L22](#l22-activating-selects-the-newest-unused-conversation)).
Cmd/ctrl-T opens the same door from the keyboard ([L13](#l13-the-trail-line-lives-inside-the-content-card-above-the-head-the-chrome-shortcuts-are-only-partly-replicated)).

**Law.** None registered — `web/test/new-tab-screen.test.tsx` covers the search/scope/
recent behaviour; `web/test/workspace-tabs-are-wired.test.tsx` covers the one-unused-
new-tab rule.

**AMENDED 17 Sep 2026 — the module scope-chip row is gone; the new tab is search plus
Recently opened, nothing else.** The client's ruling, verbatim: *"Great work. However,
remove the quick access to tickets, accounts, stories, and so on. It's not needed. Just
put the recently opened because, with the quick access, I already have them in the
navigation bar."* The scope-chip row under the search bar (Tickets/Accounts/Stories/Apps/
Contacts/Knowledge) is retired outright, not merely hidden — the same destinations already
sit one click away on the nav rail, and repeating them here was the redundancy her words
name. The new-tab screen is now exactly two things: the search bar, and the "Recently
opened" list read off every other open tab's own trail.

**Status: ruled, in build, 17 Sep 2026.**

**AMENDED 18 Sep 2026 ~13:20 (Round 20) — the search trigger reverses to mango; it is the
page's one and only act.** The client's ruling, verbatim: *"on new page where to, make the
button mango."* This reverses the search trigger's own earlier reasoning above (it shipped
`variant="inverse"`, reasoned as "an icon button beside a bar is not a title-level one"):
`NewTabScreen` has no `CollectionHeading`/`RecordScreen`/`RecordDetail`/`RecordChrome` to
carry a [B17](#b17-mango-lives-only-in-the-title-component-every-other-button-is-black)/R84
title-level action at all, so the search bar's own Go button — beside the "Where to?"
headline, which is bare text, not a title component — is the page's one and only act, the
same "one primary act, title-adjacent" shape R84 protects everywhere else. Rather than
widen `TITLE_TAGS` to treat this row as a fifth title component (which would loosen R84's
census for every OTHER bare-text headline in the app too), the button is named in
`MANGO_OUTSIDE_TITLE_OK` (`shared/rules/registry.ts`) with her words as the reason.

**Status: ruled, in build, 18 Sep 2026.**

### L25: a rest tab gets its own hover fill; the active tab never changes on hover

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"When I'm hovering over a tab
and I'm talking, both in the main container and in the assistant, I want it to have a
hover color apart from the changes in the text that are already there."*

**The mechanism.** A rest tab's hover used to move only the label (ink plus a weight
preview); the paper under it never moved. `CrumbShape` now takes an optional `hoverFill`
(kit v1.2.106): a second folder shape, identical box, stacked on top of the first,
`opacity-0` at rest and `group-hover:opacity-100` — not a straight swap of the base fill,
because the kit's neutral item wash is a 5%-alpha colour meant to be composited over an
opaque layer, not to be one. Only on rest tabs, icon-only included; never on the live tab
— "the active tab does not change on hover" is the line her own words draw between the
two.

**Law.** None registered — kit v1.2.106's own header verifies the hover shape's computed
opacity with a real `page.hover()`, never a synthetic event.

### L26: the nav bar's own name opens no page of its own — it opens the signed-in member's own record

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"I go to the nav bar, on my
name, and to my profile. This page should not exist. It should lead me to the same page
that I arrive at when I go to Settings, Members, and I click on one member."* The
standalone profile screen is retired. Clicking the signed-in person's own name in the nav
bar opens the same member-detail screen that Settings › Members opens for any other
member, addressed by the signed-in person's own id — never a second, bespoke "my profile"
body kept alive beside it.

**Why it is a redirect, not a deletion.** [L9](#l9-every-section-on-the-team-areas-strip-has-a-door-or-names-the-screen-that-took-its-place)'s
own rule for a retired screen applies here too: a page taken away has to say which door
now carries its material. This is that door — the nav bar's name link
(`web/components/shell/profile-menu.tsx`) routes to the member-detail screen
(`web/components/team/member-screen.tsx`) by id, the same
[D12](#d12-a-screen-showing-one-record-asks-the-door-for-that-record-never-the-loaded-page)
rule every other detail screen already follows, rather than the separate
`web/components/screens/profile-screen.tsx` body.

**Status: ruled, in build, 17 Sep 2026.**

**Law.** None registered.

### L27: the tab strip under a screen's title never scrolls vertically

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"sometimes there is a vertical
scroll on the tabs under the title. It should not be like that"* A record or collection
screen's own tab strip — the row directly under the title
([D1](#d1-a-detail-screen-has-exactly-four-regions-in-this-order), [R77](../RULES.md)) —
never grows a vertical scrollbar of its own; whatever forces one today (a tab row taller
than its own fixed height, or a wrapping set of tabs) is a defect against this rule, not a
variant of it.

**The mechanism, measured live rather than guessed.** A headless Playwright read against
`agency-staging.kwapso.app` (a ticket/waves collection strip, Settings, an App detail and an
Account detail — every screen the client named) found `[role=tablist]`'s own `scrollHeight`
sitting exactly 1px above its `clientHeight` on every one of them, with
`getComputedStyle(...).overflowY` reading `"auto"` — not a real overflow of content, a
sub-pixel rounding gap between the flex row's measured height and its own box (a badge, an
icon or a translated label's line-height rounding up half a pixel). THE ROOT CAUSE: the
kit's `TabsList` (`shared/ui/components/tabs/tabs.tsx`, vendored, out of reach here) sets
`overflow-x-auto` and leaves `overflow-y` unset — and the CSS Overflow spec's own
computed-value rule turns an unset "visible" axis into "auto" too the instant its sibling
axis is anything else, so a box a sub-pixel short of its own content became vertically
scrollable, intermittently, wherever the rounding happened to land — "sometimes," her own
word. Fixed at the app's own seam, not the kit: both places this app pins a tab strip
already escape `[role=tablist]` with a descendant selector of their own — `STICKY_TABS`
(`web/components/records/record-chrome.tsx`, the record detail's own strip — App detail,
Account detail) and `STICKY_FOLDER_TABS` (`shared/web/screen-engine/tabs-view.tsx`, a
collection's own strip, drawn through `renderFolderTabs`, which is what Tickets' facet strip
and Settings' own strip both go through) — and both now add
`[&>[role=tablist]]:overflow-y-hidden` on that same selector. Neither strip is ever meant to
scroll on that axis, sub-pixel or not, so the fix needs no exemption list, unlike the
existing horizontal scroll affordance beside it, which is untouched.

**Status: shipped, 17 Sep 2026.**

**Law.** None registered — `web/test/tab-strip-no-vertical-scroll.test.ts` reads both
constants' own source and fails if either one drops the override or re-opens the axis with
a bare `overflow-auto`; proved red against the unmodified constants (the override stripped,
via a `cp` backup) before being proved green again.

---

### L28: the assistant's shut handle fills its own band, and the icon inside it does not grow with it

**The rule, two rulings the same day, 18 Sep 2026.** The resize feature L14/L17 describe is
gone (16 Sep 2026, "let's forget about the resize"); what is left on the aside's own
left/start edge, when the assistant is CLOSED, is a single round button that reopens it —
the "shut handle," drawn in the same corner the assistant's folder tab and the top bar's own
trigger also reach, one of three ways to open it. First ruling, over the shipped size:
correcting an earlier size that overlapped the content card's own top edge by 9.52px. The
fix borrowed `trail-line.tsx`'s own `--control-height-pill` (26px) for the handle, the same
rung that control's neighbouring close chip already used for a different job on the same
band — closing the overlap but leaving 4.48px of unclaimed air around the icon, because a
size built for a DIFFERENT control on the SAME band is still a borrowed number. **Second
ruling, the same day, over that fix:** *"need to be bigger, as big as the space allows
it."* The band itself never moved — it is still exactly `--folder-lip` (30.48px), the gap
between the shell's own gutter and the content card's top edge — what moved is which token
fills it: `size-[var(--folder-lip)]` now sets the handle's own box to the band's FULL height,
zero clearance on any side, rather than a second file's borrowed control size. The glyph
inside does not grow with the box — `HANDLE_HIT`'s `[&_svg]:size-[var(--icon-button)]` stays
fixed at 16px — so growing the button from 26 to 30.48px only grows the air around the mark,
never the mark itself, the same "the label is the whole instruction, the icon is not resized
to fill its own button" discipline this book holds everywhere a fixed glyph sits inside a
variable box.

**The mechanism.** `shared/ui/compositions/templates/screen-shell.tsx`'s own `placement`
ternary on the assistant's `Handle`: open, the button sits at the aside's mid-height on its
own inner edge; shut, it sits in the top-right corner at `top-[var(--shell-gutter)]`,
sized `size-[var(--folder-lip)]` rather than `HANDLE_HIT`'s own default
`size-[var(--control-height-button)]` (the `cn()` merge's last write wins on the same
utility group, so this is a value swap on an existing mechanism, not a new one).

**Status: ruled, in build, 18 Sep 2026 (kit v1.2.119).**

**Law.** None registered — the kit's own `check-screen-shell.mjs` pins the handle's size
against the band it fills.

### L29: the assistant's scope picker offers three real choices, and none of them is a "default"

**The rule.** The client's ruling, 18 Sep 2026 (Round 20), verbatim: *"kill this 'todsays
default' for setting scopo of asistant."* The scope picker's third row (`agent-scope-
picker.tsx`) used to read "Everything (today's default)" — the parenthetical implied a
fourth, auto-inferred state standing apart from the two rows beside it ("This record",
"Knowledge"), when in fact a person is always PICKING one of exactly three rows, "Everything"
included. The label is now bare — "Everything", the same shape as its two siblings — with
nothing about the row's own behaviour changed: it is still one ordinary pick, never an
entry a person "falls into" by doing nothing.

**The mechanism.** `agent-scope-picker.tsx`'s own `t("Everything (today's default)")`
became `t("Everything")`; `agent-panel.tsx`'s `handlePickScope` independently rebuilds the
identical string for the resulting conversation tab's OWN title (the tab strip renders
`tab.label` verbatim), so both call sites carry the fix — a single seam would have been
cleaner, but the string is assembled twice today rather than read from one constant, and
splitting it out is future work, not this ruling's own scope. The stale seed-catalogue row
("Everything (today's default)") is pruned by `npm run lang`.

**Status: ruled, in build, 18 Sep 2026.**

**Law.** None registered — a copy fix, not a structural one; `shared/i18n-strings.json`'s
own extract/prune pair (R28) is what catches a stray re-introduction of the old string.

### L30: the assistant's attach affordance is a paperclip that reads a file for one conversation only

**The rule.** Resolves the "DECISION PENDING — the assistant's attach affordance" row this
book carried since 18 Sep 2026 morning. Asked to choose between four options shown in a
side-by-side artifact (A1 chat-only attach, A2 files filed into Knowledge, A3 a "+" menu, A4
no attach at all — the recommended pick was A2, with A4 as the safe fallback), the client's
own ruling, verbatim: *"assistant a1."* **A1**, not the recommendation: a paperclip button
returns to the composer's leading edge; picking a file shows it as a tile above the pill
("Read for this chat only"); sending the message clears the tile — nothing is filed anywhere,
the attachment lived only for that one turn, in that one conversation. **Artifact:**
<https://claude.ai/artifact/Nbwa6qGJTnCiGAaG5YrEgf>.

**The mechanism.** `use-agent-chat.tsx`'s `addAttachments` gates a picked file three ways
before it is held for the turn — over `AGENT_ATTACH_MAX_FILES`, off `AGENT_ATTACH_MIME`
(images, PDFs, plain text), over `AGENT_ATTACH_MAX_BYTES` — each refusal a toast rather than
a silent drop (`shared/i18n-seed.ts`, 18 Sep 2026: "You can attach up to {count} files.",
the unreadable-kind and too-large sentences beside it). Nothing here writes to Knowledge —
A2's own door stays untouched, so a chat-side attach and a Knowledge upload remain two
separate paths with two different outcomes, the cost the pros/cons in the artifact named
against A1 going in.

**Status: ruled, in build, 18 Sep 2026.**

**Law.** None registered — `web/test/agent-chat-attachments.test.tsx` and
`workers/data-ops/test/agent-attachments.test.ts` cover the mechanism.

### L31: a ticket's footer sits on the screen's own bottom edge, and the composer wears its own colour, full width

**The rule.** The client's ruling, 18 Sep 2026 evening, said twice the same round. First, over
the shipped ticket page: *"On ticket detail, the footer should be at the very bottom. The
position is still fucking wrong. Fix it once and for all."* Then, over a fourth screenshot of
the same page: *"Look at the fourth screenshot. This composer should have a background color
that makes it easy to identify, and also it should be full width of its own container."*
[D21](#d21-a-footer-is-at-the-bottom) already proved a footer is the LAST child of its own
card — DOM order only, nothing about where that card sits on the screen. It was not enough:
the conversation card's own footer was closing hundreds of pixels past the visible screen
body, because the ticket body was sized to the SUM of its own three side panels rather than to
the screen's actual available height.

**The shape.** The ticket detail screen now fills the screen's own height by construction: the
page container's existing `flex-col`/`min-h-full` floor did not need to change, and the ticket
body became that column's own `flex-grow` item, its side column collapsed from three
auto-placed rows into one scrollable cell. The conversation cell's own height now resolves
against a real, definite remainder rather than the side column's content sum, so the
`CardFooter`/composer sits flush with the screen body's true bottom edge at every viewport
height, the side column scrolling independently once it runs taller than the row. The composer
(`ReplyComposer`) now draws a background distinct from the card ground around it — the same
fill the kit's own `Input` paints every ordinary text field with — and spans the full width of
the surface it sits on, never narrower than its own container.

**Status: ruled, in build, 18 Sep 2026.**

**Law.** [R89](../RULES.md) (`footer-on-the-edge`), extending D21's DOM-order proof with the
height-fill/full-bleed shape a card's own position on the screen still needed.
`web/test/footer-on-the-edge.test.ts`.

**AMENDED 19 Sep 2026 (Round 22) — the fix above did not hold at every width; the layout is now
one definition for all of them.** The client's ruling, verbatim, over a fresh screenshot: *"No,
this is still wrong. The footer is currently under the stages and above the content. This is so
wrong. I cannot believe you're so stupid and you cannot fix this."* The 18 Sep fix reached the
screen's true bottom edge at the width it was tested on; at another width the side column (the
stage ladder among its cards) still ran taller than the thread, pushing the composer down below
it rather than pinning it to the screen's own edge. The rule is now stated once, for every
width, rather than patched per screenshot: **at every width the composer is the last thing on
the screen and sits on its own bottom edge.** Below the `lg` breakpoint there is exactly ONE
scrolling region — the side cards, then the thread, in that order — with the composer pinned
OUTSIDE that region, never inside it. Above `lg` the two-column layout applies, side column and
thread scrolling independently as this rule already describes. Opening the assistant panel
narrows the content column but never changes which of the two layouts is showing — the
breakpoint reads the ticket screen's own width, not the assistant's.

**Status: ruled, in build, 19 Sep 2026.**

**AMENDED 19 Sep 2026 (~01:50) — the fix still did not hold; the page container now grows into the pane's bottom padding only when a ticket body is present.** The client's ruling, verbatim, over a fresh screenshot at 1784×981 with the rail collapsed, ticket T3824, two-column layout, the composer ending ~70px above the screen bottom: *"look at screenshpto! thats the footer not being on the very vottom! fix this at once"* The previous amendments applied height constraints and flex logic, but did not account for the shell's own PADDING at the page container's level — `px-4` on mobile, `px-6` at wider viewports — which meant the container's own bottom edge still sat 16 or 24 pixels above the screen body's true edge. The fix is one CSS rule: the page container (`app-shell.tsx`) now carries `has-[[data-slot=ticket-detail-body]] pb-0`, so when a ticket body is mounted the container consumes the shell's bottom padding itself, its own inner bottom edge coinciding exactly with the screen body's bottom edge — nothing more. The composer sits at the container's own `CardFooter` inset from that edge, as it always did. Proved live at 1784px and 1440px (verified: container bottom == screen body bottom on both widths); other pages remain pixel-identical because the selector is narrow.

**Status: ruled, in build, 19 Sep 2026.**

**AMENDED 19 Sep 2026 (Round 23) — rebuilt as one flex column with the composer as its own sticky last child.** The client's ruling, over a fresh screenshot at 1991×842 with the assistant open, first: *"you useless! tell me whats wrong in this image!!!!"*, then: *"NONONO THE PROBLEM IS WHERE THE FOOTER IS!!! SHOULD BE AT THE VERY BOTTOM!"* Every prior amendment patched the container chain that FED the composer's position; none of them made the composer's own position independent of what sat above it. The ticket body is rebuilt as one flex column: a single scrolling region holding everything else (the stage ladder, the two-column body, the thread), and the composer as that column's last child — `flex-none`, `position: sticky` — pinned to the bottom of the screen, never a participant in the scroll above it, at every width and every height. Proven live with a 3,439px-tall thread inside a 218px window with the assistant panel open, the shortest, most adversarial case this rule has been tested against. The sticky offset compensates the pane's own bottom padding through a token, rather than a selector naming one screen's container as the earlier `pb-0` fix did.

**Status: ruled, in build, 19 Sep 2026.**

**AMENDED 19 Sep 2026 (~07:20) — the whole series of amendments chased the wrong element. The law is now redefined to name THE DARK BAND, not the reply composer.** Aurora's ruling, verbatim and dated: *"wtf did yuo do!! / the blackmsection, the foote, shoudl be at the very bottom / why is the write text space full widht?? rewind here / THE FUKING FOOTERRR! / befoe acting,confirm you understood the problem and what will yuo do / also conut how many times i told yuo to fix tihs"* — then: *"go ahead."* 

**The outcome.** For a week, "the footer" on the ticket detail meant two different surfaces to different people: to the developer, the `<CardFooter>` wrapping `ReplyComposer`; to Aurora, the dark band at the very bottom of the ticket page (the kit's `ink` footer well, holding Latest activity + Record, and drawing the background-color the kit calls `--footer-background`). The term had no definition here until 18 Sep 2026, and the two amendments that followed — [Round 22](#amended-19-sep-2026-round-22) and [~01:50](#amended-19-sep-2026-~0150) — followed the wrong target. She said it seven times in sequence, gradually restating it: 18 Sep D21 ("the footer is not on the footer position"); round 21 ("fix it once and for all", referring to a screenshot of the landing); round 22 ("the footer is currently under the stages and above the content"); the 1784px screenshot ("look at screenshpto! thats the footer not being on the very vottom!"); "tell me what's wrong in this image" (round 23); "NONONO THE PROBLEM IS WHERE THE FOOTER IS" (same round); today (19 Sep ~07:20). **She was right every time. The "footer" she was pointing at was the dark band, not the reply composer.** Both are now defined, separately.

**The law now reads: the DARK BAND is the page's footer — the last element, full width, pinned at the bottom of the screen at every width and height. The conversation card and the side cards scroll above it. The reply composer, where it sits inside a card, draws at the card's own width (never full page width), as a card's own footer always does.** Mark the [four prior amendments](#amended-19-sep-2026-round-22) to this row as having chased the wrong element, for the record.

**Status: redefined, in build, 19 Sep 2026.**

**AMENDED 19 Sep 2026 ~10:55 (Round 25)** — the dark band now observes the gap above it from the panel-spacing law. The kit's own footer background keeps a `gap-6` (24px at 16px root) above it through the ticket detail's flex container logic, so the band holds visual separation from the conversation and side card regions above it, never overlapping or sitting flush.

**Status: amended, in build, 19 Sep 2026.**

**AMENDED 19 Sep 2026 ~13:30–13:40 (Round 27)** — the ticket page scrolls as ONE page; the dark band is a normal footer reached at the end of the page; the panel gap above it sits in normal flow, never sticky; the inner scrolling region is gone. Aurora's ruling, verbatim: *"still not!!! there should be double scroll in tickets detail to see the full content! / right cokumn display fully! / is this clear now! / amke this a rule, never need to scroll to see al content!!! (only exception chat compnents) / confirm you understand, or ask me if you dont / actually, ask me 5 questions to verify what you have to do."* The five questions and her answers: *"1. yes / 2. you reache it like normal footer. this is a law / 3. The conversation is exactly as tall as the right column and the chat scrolls inside it when longer. / 5. exceptions like chat, / implement with subagents and deploy"* (question 4, tables and boards, unanswered).

**The outcome.** The ticket page is one scrolling region, not two. The dark band (Latest activity + Record) is reached at the very bottom of the page — where a normal footer sits, at the window's bottom when the page is short, and further down when the page is tall. The panel gap above it (24px from rule S1) sits in normal FLOW above the band, never in a sticky container, and the band itself is not sticky — only the tab strip pins above it. The side column and the conversation region scroll together as one page; there is no separate scrolling region inside the conversation card. The conversation card is exactly as tall as the side column, both measuring their own natural heights at lg, and the row resolves to whichever is taller. The single page scrolls when needed; nothing inside it scrolls of its own.

**Status: ruled, in build, 19 Sep 2026.**

**VALIDATED 20 Sep 2026 (Round 29).** Aurora's own words, reviewing the round-13 list this row's
single-page-scroll fix belongs to, verbatim: *"tickets single page scroll: validated."* The
19 Sep round 27 fix stands, confirmed live.

**Status: validated, 20 Sep 2026.**

---
