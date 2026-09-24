# 3. Detail screens (part 3 of 3)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### D23: below its own breakpoint, a ticket head's buttons fold into the "…" menu, aligned to the chip row

**The rule.** Shown an artifact of the narrow ticket head, the client's ruling, verbatim, over
the first screenshot: *"Look at the first screenshot. It looks completely broken. Create an
artifact with different versions of how we can do it for smaller screens, because like this,
it cannot be. It looks so broken."* Her pick off the side-by-side, verbatim: *"h3, and aign
the menu to the chips."* H3 — "actions fold into the menu": below the breakpoint, Close,
Start/Stop timer and Edit leave their own standalone buttons and join the overflow menu
already there, so only the "…" trigger survives beside the title; above the breakpoint
nothing changes, the wide row draws exactly what it always has. The "…" trigger itself sits
on the chip row's own line, at its right end, and the menu opens aligned to that same edge —
"align the menu to the chips" made literal.

**The shape.** A container query against the record head's own title row, not the viewport —
the kit's own convention. Two renders of the same action list are always in the tree (the wide
row of buttons, and a flat, normalized item list feeding the folded menu); CSS alone decides
which one a reader sees. `shared/web/head-actions.tsx` (`HeadActionsFoldMenu`,
`HEAD_ACTIONS_ROW_CLASS`) is the shared seam — ticket detail is the first screen wired to it;
task and story detail, which draw the identical inline row of a primary button, a timer button
and the edit pen, are named as the next screens onto it, not rebuilt in this round.

**Status: ruled, in build, 18 Sep 2026.**

**Law.** None registered — a structural fold over an existing action row, the same weight this
book gives R83's own toolbar-gap census before it graduated to a law.

**AMENDED 19 Sep 2026 (Round 22) — the fold is not a ticket-only rule; it is every screen's own
head, at the same breakpoint.** The client's ruling, verbatim: *"Yes, but this is not only for
tickets. This is for everywhere in the app on smaller screens."* This rule's fold was wired to
the ticket head alone; `HeadActionsFoldMenu`'s own container query now governs every record
head in the app, not one screen's own instance of it. The threshold itself is restated as one
number rather than a per-screen guess: **44rem**, sized to the actions row plus a **20rem title
floor** — below it the actions fold into the "…" menu the way this rule already describes, and
the heading itself, which previously only wrapped, now actually truncates (`block truncate`)
rather than pushing the fold point wider than 44rem on a long title. A sweep of every screen at
three widths — 1440px with the assistant open, 1024px, and 760px — found the fold holding
everywhere, and two unrelated gaps beside it: no scrim renders under the assistant overlay
between 721 and 1023px wide (kit v1.2.129), and the rail's last item sits behind the profile
card at a 768px-tall viewport (kit v1.2.129). Everything else on the sweep was clean.

**Status: ruled, in build, 19 Sep 2026 (kit v1.2.129) — the two sweep findings above are open,
not yet fixed.**

**The rule (R101 `toolbar-search-edge`).** Her first item below, read on its own because it names
a defect across the whole app rather than one screen: *"Look at the search bar in the toolbar. It
has different distances from the left. Make sure that you make this exactly the same everywhere,
by the way. The correct one on the screenshots is the one on status ready."* Every bespoke
collection toolbar's search field starts at the content edge, the same seam on every screen: the
track carries no horizontal inset utility of its own, and the column around it paints no fill and
no radius either, the same subtraction, made the same day, for the same reason. `<PagedFind>`'s
own row already drew it this way; `<ToolbarRow>` and `<WaveFinder>` still carried the old
painted-pill shape from before `CollectionCard`'s default flipped to plain (this section, above),
fixed the day this law shipped.

**Law.** [R101](../RULES.md) (`toolbar-search-edge`), a source census, `web/test/toolbar-search-edge.test.tsx`,
over the app's three bespoke collection-toolbar rows: the track carries no horizontal inset
utility of its own and the column around it paints no fill and no radius of its own, or the
finding is named in `TOOLBAR_SEARCH_EDGE_EXEMPT`, keyed by `{file, expression}`.

**The rule (R102 `id-column-noun`).** Her third item below, read alongside R96 and R101: *"the id
column narrow and named after the record."* Every table column whose cells render a record's own
reference through `<RecordRef>` (R96) sits at `w-px` under the table's own auto layout, as narrow
as the chip inside it, and its header is the record's own noun (Ticket, Story, Task, Wave, Phase,
App, Account, Contact, Input, Meeting), never the bare word "ID". `stories-screen.tsx`'s own
Planned/Backlog and Reviews columns already draw it this way, and `tickets-collection.tsx`'s
hand-rolled table carries the identical shape.

**Law.** [R102](../RULES.md) (`id-column-noun`), a source census, `web/test/id-column-noun.test.ts`,
over `web/components`, `shared/web/screen-engine` and `web/lib/screens.ts`: every standalone id
column config whose cell renders `<RecordRef` must carry `w-px` and a header from the noun list,
or be named in `ID_COLUMN_NOUN_EXEMPT`, keyed by `{file, expression}`.

**Her answers on the minimal fixes, 22 Sep 2026.** Aurora, verbatim:

*"1. validated. make this a rule or law
2. ok, but need a bit more spacing over it (like it was with the card)
3. great. make this a rule
4. validated
5. look screenshot. its not correct, the contact is touching the border.
6. there are 3 stiles of titles here adn that does not make sense: unify!! assigend to, details
and deadline the three look different! i Definitely think it makes sense thys grey color, the
rest you decide. also the assigned to person make it a chip, like in stories and put the title
above."*

1. Read as Law R101 (`toolbar-search-edge`): the toolbar search sits at one left edge everywhere,
   registered in RULES.md, the registry, CLAUDE.md's own law walk sentence, and this book.
2. Read as the empty state's own spacing: `CollectionEmptyState` carries `space-6` (24px) above
   and below its text again, the air the card used to give, flush left, still no fill.
3. Read as Law R102 (`id-column-noun`): the id column is `w-px`, as narrow as its chip, and its
   header is the record's own noun, never "ID".
4. Read as no change needed: already shipped and confirmed correct.
5. Read as the kit lane's own item, the Effort tiles; not carried in this entry.
6. Read as `task-sheet.tsx`'s own merged section: one grey uppercase eyebrow label above each of
   Assigned to, Details and Deadline, and the assignee renders as the story page's own loop chip
   (`PersonCard orientation="horizontal" size="choice"`), its eyebrow above it.

**Five more laws, read off the same round.** Items 2 and 6 above, and the 21/22 Sep rulings
already read into this section (the no-containers empty-collection reading, the "stakeholders...
chip like" correction, the footer-band mechanics, the Effort card's own alignment), each earn
their own R-number, the same way R100 to R102 did above: a census over the disk, an exemption
table keyed by `{file, expression}` (or, where the exemption is a whole file rather than one
finding, by `{file}` alone), never a line number.

**The rule (R103 `empty-register-on-the-page`).** Her item 2 above, read alongside R62's own
two-zero register and the no-containers ruling this section already carries: an empty or
filtered-empty register (`CollectionEmptyState` on the agency door, `PortalEmpty` on the portal)
draws no card and no paper fill. Text sits on the page ground, the same `--space-6` (24px) top
inset both registers already carry, with its one door in (R88) beside it, never a second box
painted around it. Neither register may sit inside a painted `<Card>` (the kit's own `default`
variant, unless the call site says `variant="plain"`), inside any element carrying a literal
`bg-surface-panel`/`bg-card` fill, or inside an `<EmptyGatedPanel surface="boxed">` branch: the
shell's own default is `"plain"` (R88's own construction), so painting it is always a deliberate
override.

**Law.** [R103](../RULES.md) (`empty-register-on-the-page`), a source census,
`web/test/empty-register-on-the-page.test.ts`, over `web/components`, `web-portal/components` and
`shared/web/screen-engine`: every `<CollectionEmptyState>`/`<PortalEmpty>` mount, its ancestor
chain read for a non-plain Card or a literal fill class, and every `<EmptyGatedPanel
surface="boxed">` read directly, or the finding named in `EMPTY_REGISTER_EXEMPT`, keyed by `{file,
expression}`, rot-checked both ways. A parallel lane owns the last offenders under
`web/components`/`web-portal/components`; this census reports what it still finds there rather
than exempting a file that lane is mid-editing.

**The rule (R104 `people-as-chips`).** The 21 Sep 2026 correction over the live tickets pages,
read together with item 6 above: *"stakeholders raised by design like in the loop (chip like)"*
and *"same with assigned to (chiplike)."* A person or a group of people inside a record section
(Raised by, Assigned to, On the loop, stakeholders, a group's members) renders as `PersonCard`
chips under a plain eyebrow label, never inside a tile or a card: the shape
`help-stakeholders.tsx` and `task-sheet.tsx` already draw. This is the RECORD-SECTION reading of a
person; a GALLERY of people-as-records (Settings members, a contacts grid) still draws its own
per-record `<Card>` (R65), a different shape entirely.

**Law.** [R104](../RULES.md) (`people-as-chips`), a source census, `web/test/people-as-chips.test.ts`,
over `web/components/tickets`, `work`, `apps` and `accounts`: every `<PersonCard>` whose ancestor
chain reaches a `<Card>` of any variant is a finding, unless its whole file is named in
`PEOPLE_AS_CHIPS_EXEMPT` with the reason "a per-record card in a grid":
`accounts/contacts-screen.tsx`'s own gallery is exempt on exactly that reading.

**The rule (R105 `sheet-fact-labels`).** Her item 6 above, read in full: every fact label inside a
sheet (Assigned to, Details, Deadline and their siblings) shares the eyebrow register,
`text-micro`, uppercase, muted, placed above its own content, and the sheet's own sections carry
no background. `task-sheet.tsx`'s merged section is the shape: one class list,
`text-micro text-muted-foreground uppercase`, on every label, Details' old bold `<h3>` and
Deadline's old `OverviewList` dt/dd pair both retired for it.

**Law.** [R105](../RULES.md) (`sheet-fact-labels`), a source census, `web/test/sheet-fact-labels.test.ts`,
over every file under `web/components` that draws a literal `<SheetContent`: every eyebrow-shaped
label (`uppercase` + `text-muted-foreground`) must share the identical class list with every other
one in that same file (`task-sheet.tsx`'s own three asserted against the canonical string
directly, a tripwire against the census matching nothing), or named in `SHEET_FACT_LABEL_EXEMPT`,
keyed by `{file, expression}`.

**The rule (R106 `footer-band-home`).** The general shape behind D21/L31, kit v1.2.155: every
record page fills the shell's footer slot (`ScreenFooterSlot`, `web/components/shell/
footer-slot.tsx`) exactly once, and no body renders the ink band inline; a sheet renders the band
as a stripe (`RecordFooterBand stripe`), the sheet body's own last child outside the scroller.
Aurora, 22 Sep 2026: *"the footer ... has to be at the very bottom, and also make it a stripe, not
a container."* One column stacks Record above Latest activity, the kit's own fixed order from the
round-22 ruling this section already carries.

**Law.** [R106](../RULES.md) (`footer-band-home`). `web/test/footer-on-the-edge.test.ts` and
`web/test/task-sheet.test.tsx` are registered as this law's checks. `RECORD_FOOTER_SLOT_EXEMPT`
names `shared/web/screen-engine/screen-renderer.tsx`, the recipe-driven detail path, shared with
the portal, which has no footer slot. Decision pending.

**The rule (R107 `effort-tiles`).** Her item 5 above, read as the kit lane's own item over the
Effort card: *"look screenshot. its not correct, the contact is touching the border."* The
Effort section's metric tiles span the section in a three-column grid with the kit's 16px gap,
their left edge on the title's edge, each tile a Card default with the kit's own content inset,
and the log rows below carry no fill, separated by the kit `Separator`.

**Law.** [R107](../RULES.md) (`effort-tiles`). `web/test/effort-card.test.tsx`'s own existing
cases (the three-column `gap-4` grid, the tiles' own Card default, the log rows' no-fill plain
list, the one-Separator-between-rows shape) are registered as this law's check.

**The rule (R108 `section-title-one-style`).** Her ruling, 22 Sep 2026, over a screenshot of a
ticket record: *"look at screenshot. i want that we have 1 single deign for titles. make it like
in tasks 'assignd to, details, deadline' so evetything in tickets/stories that are titles
(assigned to, pahse and wave, effort, stakeholders, related tickets, related stories...) make the
chnage here and everywhee else. what we are changing is the sytle of the title of a section.
implement and write the rule."* A record section's TITLE (Assigned to, Category, Phase and wave,
Effort, Stakeholders, Related tickets, Related stories and every sibling) now adopts the one style
the task sheet already uses for its fact labels, R105's own canonical class,
`text-micro text-muted-foreground uppercase`, never `text-sm font-medium`. Two shared hosts carry
every ticket and story call site at once, `TicketSidePanel` (`web/components/tickets/
ticket-detail-body.tsx`) and its twin `EmptyGatedPanel` (`web/components/deep-link/
screen-bits.tsx`); three hand-rolled siblings drew a title in a shape of their own and were fixed
the same way, `meeting-detail.tsx`, `client-org-panel.tsx` and `stakeholders-panel.tsx`. The
heading stays a real heading element with its own `id`, so the existing labelled-by wiring keeps
working, only the STYLE moved. Her screenshot also showed the consequence: the Assigned to SECTION
was titled "Assigned to" and then repeated "ASSIGNED TO" a second time as an inner eyebrow above
the person chip, once the section title itself is the eyebrow, that inner label duplicates its own
heading. Where an inner fact label repeats its section title word for word, the inner label is
deleted and the section title kept, `AssignedToCard` (`help-stakeholders.tsx`) drops its own inner
chip for the ticket's own assignee; "From the app" survives, because it says something the title
does not. Where the inner label says something different (a section with several facts, each with
its own label, Stakeholders' own "Raised by"/"On the loop", the merged Phase/Wave facts), both
stay.

**Law.** [R108](../RULES.md) (`section-title-one-style`). A tripwire over `TicketSidePanel`'s and
`EmptyGatedPanel`'s own title lines, plus a source census, `web/test/section-title-one-style.test.ts`,
over every file in `web/components` and `web-portal/components` for a literal `<h2`/`<h3`/`<h4`
carrying both `text-sm` and `font-medium` (the old shape), or named in `SECTION_TITLE_EXEMPT`,
keyed by `{file, expression}`, rot-checked both ways.

**Three earlier rulings, not yet law, now amended in with their own numbers.** All three were
already built and already read into this book before today; none of them mint a new R-number,
they graduate under the numbers they already carry. The toolbar's 10px rhythm on every module is
[R83](../RULES.md) (`toolbar-lead-gap`, amended 21 Sep 2026, above in this section). The id column's
narrow width and record-noun header is [R102](../RULES.md) (`id-column-noun`, above). The
toolbar's search-field edge is [R101](../RULES.md) (`toolbar-search-edge`, above).

---
