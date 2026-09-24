# 3. Detail screens (part 2 of 3)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### D17: a status colour means one thing everywhere, dots are always solid, and a department is told apart by an icon, never a hue

**The rule.** Five of the client's own rulings, 16 Sep 2026, verbatim, read together as one
palette: *"let's always assign gray to archived."* *"let's do red for: apps not started,
tickets new, stories open."* *"For inputs waiting, let's use orange."* *"The departments
have no color, so remove it from here. What they have is an icon."* *"All dots are always
solid, not rings."* `shared/status-tones.ts` is the one file that answers "which of
`Badge`'s six dot tones does this status get" for the ticket (seven stages) and story (four)
lifecycles, read alongside `shared/app-stages.ts` for an app's own stages — never a bespoke
colour picked per screen. One meaning per hue, across every lifecycle this app colours:
**red** (`blocked`) — nothing has happened yet (an app not started, a ticket just raised, a
story nobody has picked up); **orange** — booked in and waiting on somebody (an input the
account owes us draws the kit's own `warning` badge tone, `inputs-screen.tsx`'s
`waitingBadge`, the same orange as `--dot-orange` even though it is spelled through the
Badge tone rather than a `DotTone` literal); **charcoal** (`building`) — actively under way;
**sky** (`review`) — needs a look; **purple** — validation; **green** (`shipped`/`done`) —
finished, closed out or still live and healthy; **grey** (`archived`) — put away, done with,
and ONLY for a record that is really archived, never for one that merely has not started. A department
(`shared/departments.ts`) carries none of these — `DepartmentStyle.color` is deleted, not
merely unread, and a department is told apart by its own Phosphor icon
(`departmentIconName`) instead. Every dot this app draws is a solid fill
(`Badge`'s own `DOT_FILL`, `size-[var(--dot-status)] rounded-pill`) — never a ring, never an
outline standing in for a status.

**Where this reaches today.** `HELP_STATUS_DOT_TONE`/`STORY_STATUS_DOT_TONE`
(`shared/status-tones.ts`) resolve `new`/`open` to `blocked` (red) and archived states to
`archived` (grey); `inputs-screen.tsx`'s `waitingBadge` resolves the Waiting view to
`warning` (orange), Overdue to `destructive`; `shared/departments.ts` exposes `icon` only,
no colour; every dot Badge renders (`variant="status"`) is a filled circle by construction —
there is no ring variant to reach for by mistake.

**App-status ladder rungs, 17 Sep 2026.** The client's ruling on the rung wording, verbatim,
over screenshot "6A": **In audit · In plan · In build · In validation · In refinements · Live · Archived**.
Archived is still the one rung set by hand; every other rung is DERIVED from an app's waves
and sprints. An app reaches Live only after its first Refinements sprint has wrapped — In
validation and In refinements are two distinct rungs, not one, and an app sits in the
earlier of the two until a refinement sprint has actually run. **Colouring of the dots is
still pending her pick** — app stage pills stay coloured the old way meanwhile. **Status:
ruled, not yet built.**

**Law.** None registered — `shared/status-tones.ts` and `shared/departments.ts` are the
mechanism; R32 (`closed-palette`) already forbids a hex/Tailwind-ramp literal standing in
for either, which is the adjacent check that would catch a colour reintroduced by the back
door.

**AMENDED 17 Sep 2026 — the palette itself is ruled, lifecycle by lifecycle.** Nine further
rulings, the same session, read together as the answer this rule's own "Colouring of the
dots is still pending her pick" line was waiting on. First, a correction to `building`/
charcoal: *"charcoal never means in progress."* Charcoal is retired as the in-progress
tone — **in progress now reads black**, the ink tone this rule already calls `#1A1918` —
and no status anywhere in the app may use charcoal to mean under way. Then the governing
statement over the sprint-type lifecycle: *"audit orange, refinements blue, validaton
purple, plan & buid black."* Then, lifecycle by lifecycle, verbatim:

- Tickets: *"tickets: triaged orange, ready blue, in progress black, scheduled purple"*
- Stories: *"stories as it is"* — the existing story palette is unchanged by this ruling.
- Sprints: *"sprints: wapperd complete green, wrapped cancelled gray, running bow black,
  scheduled cominh up purple"* — read as wrapped/complete green, wrapped/cancelled grey,
  running black, scheduled/coming up purple.
- Waves: *"waves: planned purple"*
- Inputs: *"switch inouts to only colored dot, received green"* — read as: Inputs drops
  the badge-tone waiting/overdue treatment named above for a plain coloured dot like every
  other lifecycle here, with received green.
- Contacts: *"contact live green"*
- Accounts: *"account active green dot"*
- Knowledge sources: *"knowelege source in use green dot"*

Read against [R32](../RULES.md)'s closed palette, every one of these is a token the kit
already ships, never a new hex or Tailwind ramp — her own governing line from the same
session, quoted in full under "Colour scheme" in
[Rulings awaiting implementation](#rulings-awaiting-implementation).

**Status: ruled, in build, 17 Sep 2026** — superseding this rule's own "ruled, not yet
built" line above for every lifecycle named here; the app-status ladder's own rungs (the
paragraph above) are not among them and stay pending.

**Cross-reference, 18 Sep 2026 ~06:40 (Round 17).** The client's ruling that a chip's own
text is always black ink, and a linked chip underlined, landed in
[K39](#k39-in-any-collection-the-one-coloured-chip-is-the-records-status)'s own amendment,
not here — recorded there because it is a chip-text ruling and this rule governs the dot's
own tone, not the label ink beside it.

---

### D18: the thread and the reply composer share one column with spacing between them

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"the comment (text entry) bar
is very close to the latest comment, we should give some gap there."* The activity thread
(the stacked replies in `ActivityRail`) and the reply composer box below it share one flex
COLUMN with a guaranteed gap, `gap-[var(--space-5)]`, so that the newest message is never
crowding the input bar.

**Where this reaches today.** `web/components/tickets/help-detail.tsx` mounts the thread
and composer in one flex column with the spacing constant; `web/test/ticket-thread-composer-gap.test.tsx`
asserts the gap renders and measures it at the expected scale.

**Law.** None registered — a spacing decision on an existing component mount.

**Cross-reference, 17 Sep 2026.** The 17 Sep colour rulings (ticket/story/sprint/wave/
input/contact/account/knowledge-source dot colours) landed in
[D17](#d17-a-status-colour-means-one-thing-everywhere-dots-are-always-solid-and-a-department-is-told-apart-by-an-icon-never-a-hue)'s
own amendment above, not here — recorded there because they are a status-colour ruling and
this rule is a spacing one.

### D19: "Raised on" is a fact under "Raised by," with the exact date and how many days ago in brackets — never its own chip

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"On tickets: Remove the 'Raised
On' chip from the QE view, but also from the detail page in the QE view. Add it under
'Raised By' as 'Raised On' and put the date and, in brackets, how many days ago."*

**The mechanism.** The header's chip row (`TicketChips`, `shared/web/ticket-chips.tsx`)
draws exactly three chips now — ref, type, app — never a fourth for the created date; the
same component draws the list row and the board card, so both lose the date chip too. The
Overview facts (`web/components/tickets/help-detail.tsx`) carry a "Raised on" fact
immediately after "Raised by," reading `{date} ({count} days ago)` off `formatDate`/
`daysSince` (`shared/web/format.ts`) — a real date and an exact day count, never a
relative phrase alone.

**Law.** None registered — `web/test/ticket-raised-on.test.tsx` proves the three-chip
count over a real render and reads the source for "Raised on" sitting after "Raised by,"
wired to `daysSince`/`formatDate`.

### D20: a ticket's own detail is one page, no tabs — the stage ladder above a two-column body, conversation two thirds, stories/work logs/stakeholders stacked beside it

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"I want to see, on one single
screen with no tabs, the content of tickets: the stages, the kind of conversation with the
customer, related stories, work logs, stakeholders… We currently, in our legacy system,
have it on one page, and it's very practical. We don't want to change that."* Shown a
decision page with several implementations, her pick: *"For ticket 1 page, I choose to
implement it v1."*

**The mechanism.** The six-tab `TabsView` this screen used to draw (Conversation,
Overview, Related stories, Work logs, Files and links, Stakeholders) is gone —
`RECORD_TABS_SINGLE_PANEL` names `help-detail` as R2's own exemption for a bespoke detail
with no strip — and nothing it drew was deleted, only re-homed: Conversation is
`TicketConversationPanel` in the body; Overview's facts fold into the Stakeholders panel
(she named five things, not six, and Overview was never one of them); Related stories is a
capped preview with a "Show all" opening the same panel in a slide-in; Work logs and
Stakeholders keep their own panels; Files and links moves to the ⋯ menu (B19's own
pattern). `TicketDetailBody` (`web/components/tickets/ticket-detail-body.tsx`) draws the
two-column layout under the stage ladder: the conversation at two thirds beside three
stacked panels at one third, stacking to one column on a phone — her own "right column
stacks under the conversation." The panel region is already paper (R67) — `RecordDetail`
wraps whatever it is handed in one `Card` — so the three side panels are `variant="raised"`
(`bg-card`) rather than the default paper tone, the same raised-on-soft-paper pairing this
book uses everywhere else. The stage ladder itself is unmoved by this rule
([K38](#k38-the-todays-tasks-progress-strip-and-the-ticket-stage-ladder-beside-it-stand-on-the-bare-page-no-container-behind-either)):
it still rides `headerExtra`, above whatever the body draws — a tab strip yesterday, this
body today.

**Law.** None registered — `RECORD_TABS_SINGLE_PANEL` (`shared/rules/registry.ts`) is
R2's own named exemption; `web/test/sections-stand-on-paper.test.ts` covers the panel
tone.

**AMENDED 17 Sep 2026 — the edit affordance moves off the title, Stakeholders is stripped
down, Related Stories gains its own chips, and every story shows.** The client's ruling,
verbatim, over a screenshot of the shipped page: *"The edit button: put it outside, just
the pen. Who to keep in the loop: move it to the edit screen. Add the status chip with the
color after the ID on the title. Remove all of thus from stakehodlers "Pick someone to
keep in the loop … B Blackbox C Chilavert You can add members, but no one is ever removed.
Type Issue App Kwapso System Raised by Max Mustermann Raised on Sep 16, 2026 (1 days ago)
Title Title (English) Ticket and story titles Raised from Screen recording Resolved"
remove "Everyone kept in the loop on this ticket, the person who raised it, your admins,
and anyone mentioned." In the section "Related Stories", also show the type as a chip with
the icon and the color dot for the status. Remove "Show All" because you need to show them
all."* Six changes, read off her own words: the edit action is a bare pencil, outside the
title's own text, never a labelled button; who is kept in the loop is no longer a control
on the detail screen at all — it moves to the record's own edit screen; the title's status
chip carries its colour and sits right after the ticket's ID; the Stakeholders panel drops
the "Pick someone to keep in the loop" picker copy, the illustrative member row and the
explanatory sentence about who is kept in the loop by default, down to the bare list of
names; Related Stories draws each story's own type as a chip — icon plus the colour dot for
that story's status ([K39](#k39-in-any-collection-the-one-coloured-chip-is-the-records-status))
— beside its title; and the panel's own "Show all" is gone, because the panel now lists
every related story rather than a capped preview.

**Status: ruled, in build, 17 Sep 2026.**

**AMENDED A THIRD TIME, 18 Sep 2026 ~06:00 — work log count, stakeholder cards, the story
add button, work-log hours, the conversation's attach button and input container, and the
container structure itself.** Seven further rulings, the same batch, read together:

- *"on ticket detail - for worklog, rmeove the entries count"* — the Work logs panel's own
  entries count is removed; the count stays visible only where the big total already lives,
  never repeated beside the panel heading.
- *"on ticket detail stakeholders, show them like cards (like settings members) and show
  what was before, who raised it and on the loop"* — the Stakeholders panel, stripped down
  to a bare list of names by this rule's first amendment, now draws each stakeholder as a
  member card, the same shape Settings › Team › Members already uses, and restores what
  that stripping removed — who raised the ticket and who is on the loop — carried on the
  cards themselves rather than as the removed prose sentence.
- *"on ticket detail, + button to add a story (not this text button) on the far right"* —
  Related Stories' own add affordance becomes a plain `+` icon button
  ([B3](#b3-the-add-button-is-a-plus-glyph-with-no-text-everywhere)), at the panel's far
  right, replacing the labelled text button.
- *"on work logs, remove the hours just next to the tile (>for that we have the big count).
  also the + button to the right"* — the Work logs panel drops the hours figure sitting next
  to its own title, redundant with the big count the first bullet above keeps, and gains the
  same far-right `+` icon button as Related Stories.
- *"on tickets detail "conversation" i am missing the attach button and the "container"
  background for the text input field, also missing the avatars of the senders"* —
  `TicketConversationPanel`'s reply composer gains an attach button and a card background
  behind the text input, and every message in the thread carries its sender's own face
  ([G5](#g5-a-record-never-appears-without-its-face)).
- *"on ticket detail the conversation shoudl have more height, depending on the height of
  the right column components. they should be, the addition of the three of the right, same
  as conversation"* — the conversation panel's own height is no longer fixed; it matches the
  SUM of the three stacked side panels' heights (Related stories, Work logs, Stakeholders),
  so the two-thirds/one-third split this rule already draws keeps its columns level however
  tall the side stack grows.
- *"the ticket detail is completely worng in temrs of containers. what you have now is one
  big container and smalle runderneath. why did you do 2 levels? no. lets change that.
  remove the "overall" container, make each thing it's own container (like tickets
  dashaboard)"* — the single outer card wrapping the whole two-column body is removed; the
  stage ladder, the conversation panel and each of the three side panels draw as its OWN
  standalone container, the same flat, no-nesting shape
  [K37](#k37-the-toolbar-sits-inside-the-content-card-and-never-in-a-container-of-its-own-tickets-dashboard-drops-its-toolbar-an-apps-dashboard-row-gains-a-third-card-raised-by)
  already settled for the tickets dashboard, never a container inside a container.

**Status: ruled, in build, 18 Sep 2026.**

**AMENDED A FOURTH TIME, 18 Sep 2026 ~06:40 (Round 17) — Files and links is retired from the
⋯ menu outright; attachments live in the conversation.** The client's ruling, verbatim: *"on
tickets, kill this whole files&links in the ... button. fyi those are visible in the
ocnversation itself! the customers cann attach fimages & files. so do we. tahts why i ask of
the attach button on the text input field."* The third amendment's own attach button and
container background on `TicketConversationPanel`'s reply composer is the reason this one
gives: since every file either side attaches now renders inline in the conversation thread,
the "Files and links" entry the first amendment moved into the ⋯ menu (B19's own pattern) is
removed from that menu entirely — not re-homed a second time. A ticket's attachments have
exactly one place they are read: the conversation.

**Status: ruled, in build, 18 Sep 2026.**

**AMENDED A FIFTH TIME, 18 Sep 2026 ~10:30 (Round 18) — the composer becomes the card's own
footer, and attachments are per-message, not a ticket-wide tray.** The client's ruling,
verbatim: *"ticket page: the footer is not on the footer position!! fix that! wtf is his
files inside the ocnversation lol thats not what i meant, i meant that each message can have
images or files, check in the kit because we already biult the ui for that."* Two separate
corrections, read together — see [D21](#d21-a-footer-is-at-the-bottom) for the LAW this
ruling's own first clause becomes once she restates it explicitly the same day:

- **The footer.** `TicketConversationPanel`'s reply composer had been a third flex child
  inside one padded `CardContent`, alongside the thread and a same-day attachments tray —
  `thread`/`attachments`/`composer` stacked with a flex `gap`, each `shrink-0`, which reads
  as "three things in a padded box," not a footer, because `CardContent`'s own inset wraps
  the composer on every side including the bottom. The kit's own `Card` already draws the
  shape this ruling asks for (its own chapter-13 quote: "Header, body, and footer are
  hairline-separated inside one 24px shell — never three stacked cards"): `CardContent` now
  holds only the scrolling THREAD, and `CardFooter` — hairline-separated from the body, no
  fill of its own — holds the composer as the Card's own LAST child, so the panel tone the
  ruling asks the footer to carry is automatic (`Card`'s own `--surface-panel`), not a class
  to add.
- **Per-message files, not a ticket-wide tray.** The SAME day's earlier ruling (this rule's
  fourth amendment, above) had read "attach button on the composer" as "one shared
  files-and-links tray inside the conversation" — a `<HelpAttachmentsPanel>` mounted between
  `thread` and `composer` as an `attachments` prop. Reading the shipped result back, her
  correction is explicit: a ticket-wide list box was never what she asked for. Each MESSAGE
  carries its own images or files, fed from the kit's own `TicketThread` component (already
  built for exactly this, per her "check in the kit"), shipped behind team migration 0105
  (`help_attachments.help_thread_id`). `TicketConversationPanel` itself needed no new slot
  for this — the files ride the `thread` prop it already took — so the `attachments` prop
  this rule's fourth amendment added is deleted outright rather than restored, its one caller
  (`help-detail.tsx`) having nothing left to pass it.

**Status: ruled, in build, 18 Sep 2026.**

**AMENDED A SIXTH TIME, 18 Sep 2026 ~12:00 (Round 19) — no "Stages" title above the ladder,
and stakeholders draw as square tiles, three to a row.** Two of the client's rulings that
session:

- *"inside tikects temove the 'stages' as a title"* — the eyebrow `ticket-stages.tsx` used to
  print above the rail (`<span id={headingId}>{t("Stages")}</span>`, visible, `text-caption`)
  is gone outright — not shrunk, removed, the same "subtraction, not smaller type" reading
  the stage-ladder shrink (K38's own amendment) already took for the stage word and the
  two-line date: the ladder's own fills and dates already say what it is, so a label
  repeating that is the redundancy her "just smaller" goal was always naming. The accessible
  name survives without the visible text — `aria-labelledby` pointed at that span; the
  `<section>` and the scrolling `<div role="group">` now carry `aria-label={t("Stages")}`
  directly, so a screen reader still announces "Stages" on the region with nothing printed
  for a sighted reader.
- *"inside ticket detail, for stakeholders, i want square tiels (lik in members, with text
  under the image). 3 should fit in one row"* — the Stakeholders panel's third amendment
  above had already moved from a bare list of names to member CARDS, but read as a
  HORIZONTAL row (`orientation="horizontal" size="tile"`, face beside the name) rather than
  the square, face-above-name tile Settings › Team › Members actually draws — "cards" was
  read for its shape alone, not "square tiles… like in members." `PersonCard`'s own defaults
  (`orientation="vertical"`, no `size` override) are exactly that tile with nothing
  reinvented, so both props are gone from this call site rather than pinned to a second,
  narrower tile. The grid is `grid-cols-3` at the panel's own width, "3 should fit in one
  row" read literally rather than derived from a container query, narrowing responsively
  below the panel's own breakpoints (`max-[45rem]:grid-cols-2 max-[24rem]:grid-cols-1`) so
  the tiles never crowd on a narrow aside. **Members and Stakeholders share the square band,
  not just its shape.** `PersonCard` (`shared/web/person-card.tsx`) was extracted from
  Settings › Team › Members' own gallery cell the same day, 18 Sep 2026, specifically so the
  Stakeholders panel above could draw the identical tile without a second hand-copied
  `<CardContent>` block — the mark's two seams and the vertical `band`-over-`tile` layout
  moved into the shared component; `members-gallery.tsx` now calls `PersonCard` too, in
  place of the JSX it used to draw by hand. One component, both surfaces, so "like in
  members" is structural rather than a visual echo two files happen to agree on today.

**Status: ruled, in build, 18 Sep 2026.**

### D21: a footer is at the bottom

**The rule.** The client's ruling, 18 Sep 2026, said twice the same session, the second time
naming it a standing law outright. First, over the shipped ticket page: *"ticket page: the
footer is not on the footer position!! fix that!"* — answered the same round (see D20's own
fifth amendment, above, for the mechanism: the composer moved off a third flex child inside a
padded `CardContent` and onto the kit's own `CardFooter`, `Card`'s real last child).
Reviewing the SAME page again roughly ninety minutes later, verbatim: *"but the footer is in
the worng position, above al cointent! dhoudl be at the bottom (this is a law for footer)."*
Her own words make the general case explicit: a footer is not a box styled to look like one
partway down a card, it is whatever sits at the true bottom, with nothing rendered after it.

**The shape.** A "footer" in this app is the kit's own `CardFooter` — hairline-separated from
the body, no fill of its own, drawing whatever tone the `Card` around it already carries — or
the one component this app calls a "composer" today, `ReplyComposer`
(`web/components/tickets/reply-composer.tsx`), wherever it is not already wrapped in a
`CardFooter`. Either one must be the LAST real child of its nearest enclosing card — nothing
rendered after it, ever, on purpose or by accident. A card that has nothing to say after its
footer needs no exemption; a card that genuinely draws a real element below its own footer
(none exist today) would need one, reasoned, in the registry below.

**The check.** A static census, off the disk: every `<CardFooter>`/`<CardFooter />` and every
`<ReplyComposer>`/`<ReplyComposer />` in `web/` is found, its nearest enclosing JSX element is
resolved (walking up through a `{…}` expression or a fragment, the same climb
[K33](#k33-the-gap-above-a-toolbar-equals-the-gap-below-it-the-tab-strip-and-its-card-share-one-gapless-column)'s
own `enclosingBox` already makes for a different law), and that element's own last non-
whitespace child must be, or contain, the footer/composer node — never a sibling drawn after
it. `FOOTER_IS_LAST_EXEMPT` (`shared/rules/registry.ts`) is the reasoned, rot-checked way out;
it opens empty, because the one call site this census can see today
(`TicketConversationPanel`, `web/components/tickets/ticket-detail-body.tsx`) was already fixed
the day this law was written.

**Status: ruled, in build, 18 Sep 2026.**

**AMENDED 19 Sep 2026 (~07:20) — this rule defines the CARD-level footer (the reply composer's position within its own card), distinct from the SCREEN-level footer (the dark band).** Aurora's ruling at ~07:20: *"wtf did yuo do!! / the blackmsection, the foote, shoudl be at the very bottom / why is the write text space full widht?? rewind here / THE FUKING FOOTERRR!"* [L31](#l31-a-tickets-footer-sits-on-the-screens-own-bottom-edge-and-the-composer-wears-its-own-colour-full-width) confused the two: her own ruling, 18 Sep D21, was about a footer's position WITHIN its own card (no element after it, DOM order only). That rule still holds. But she was asking about a different footer — the screen's own dark band, pinned at the page's bottom edge. Both are now named: this row (D21) defines the CARD-LEVEL footer (the reply composer's ordering); [L31](#l31-a-tickets-footer-sits-on-the-screens-own-bottom-edge-and-the-composer-wears-its-own-colour-full-width) defines the SCREEN-LEVEL footer (the dark band at the very bottom).

**Status: clarified, in build, 19 Sep 2026.**

**Law.** None registered in `RULES.md`'s numbered list — a structural UI census on an
existing component seam, the same weight this book gives R83's own toolbar-gap census
before it graduated to R83. `web/test/footer-is-last.test.ts`.

### D22: an empty section draws exactly one door in — no header, no second "+"

**The rule.** The client's ruling, 18 Sep 2026, reading a deployed panel back over her own
earlier one: *"Look at the third screenshot. We already said on empty state, we only have the
first, not the top-right plus button. This is a law. Reinforce it everywhere. And then also
remove the work log header when it's empty."* Her screenshot: the ticket page's Work logs
card, empty, drew a "Work logs" title with a black top-right "+" AND, in the body, the
standing empty state's own "Add the first" — two doors on one zero-row collection.
[R50](../RULES.md)/[R84](../RULES.md) already close the button half everywhere a title row
sits inside a `<ToolbarRow>`; the gap this rule closes is the title row that sits OUTSIDE
one — a panel's own header, drawn by hand rather than by the toolbar. When a section is
confirmed empty, its header — title, count and action together — draws nothing at all, and
the section's own empty state is the one way in.

**The shape.** `EmptyGatedPanel` (`web/components/deep-link/screen-bits.tsx`) is the one
shared shell the law lives in: `empty` true drops the whole header and draws only `children`,
expected to be the panel's own `CollectionEmptyState` — `children`'s position in the returned
tree never moves as `empty` flips, so a child that owns its own "add" dialog is never
remounted by the header appearing or disappearing. The ticket page's Related stories and Work
logs panels, the two this ruling was written over, both moved off a hardcoded `empty={false}`
(the escape hatch that used to argue the "+" should stay reachable at zero rows) onto this
shell.

**Status: ruled, in build, 18 Sep 2026.**

**Law.** [R88](../RULES.md) (`empty-state-single-door`). `web/test/empty-state-single-door.test.ts`.
