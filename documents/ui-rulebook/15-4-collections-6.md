# 4. Collections (part 6 of 8)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### K39: in any collection, the one coloured chip is the record's status

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"I have changed my mind
regarding chips. In a database where there are different columns, the one that gets the
chip with the color is always the status. This means that for tickets, we need to find
icons for the ticket type and assign colors to the status."* A list row, a board card or a
record's own head chip row may colour exactly ONE categorical field — its STATUS
(`shared/status-tones.ts`, `shared/app-stages.ts`,
[D17](#d17-a-status-colour-means-one-thing-everywhere-dots-are-always-solid-and-a-department-is-told-apart-by-an-icon-never-a-hue)) —
and every other categorical field draws an ICON or plain text, never a colour. Priority on
tasks is the one already-ruled exception
([K19a](#k19a-priority-has-its-own-four-colours-never-app-stages)) and is named rather than
silently allowed.

**The shape.** Tickets are the worked example: `ticketTypeColour`
(`web/lib/type-colours.ts`) drew a coloured dot for a ticket's TYPE on the list row, the
board card, `TicketChips`, both type pickers and the portal's own row since 2026-09-06 —
retired everywhere a CHIP reads it, replaced by `ticketTypeIconName`
(`shared/ticket-types.ts`), the identical closed-map pattern `storyTypeIconName` already
stands for story type
([K26](#k26-story-type-is-five-words-not-three-and-a-story-now-says-where-it-came-from)):
Issue → `Bug`, Question → `Question`, Extra → `PlusCircle`, Feedback → `ChatCircleText`.
`ticketTypeColour` is NOT deleted — the tickets
dashboard's own chart series is the one reader left, an aggregate view's series colour
being a different domain from a record's own chip.

**AMENDED 17 Sep 2026 — the add-ticket screen's own Type field.** The client's
follow-up ruling, verbatim, over the create dialog: *"On the add ticket screen, remove the
manage choices under type and replace these colors with the icons for each type."* The
colour-to-icon half is this rule, already built and already reaching the create dialog's
own type row (`typeOptions`, `web/components/tickets/help-form-dialog.tsx`) through the
same `ticketTypeIconName` map — nothing further to do there. The new half: the "Manage
dropdowns" signpost (`ManageDropdownsLink`) that sits under the Type field on that one
screen is removed outright, not moved — the vocabulary is still reached from Settings ›
Tickets, the door [B10](#b10-a-modules-settings-have-two-entrances-and-one-page-behind-them)
already names, and a create dialog carries no second entrance to it.

**Tests:** `web/test/status-owns-the-chip.test.ts`, `web/test/ticket-type-icons.test.ts`,
`web-portal/test/ticket-row-type-icon.test.tsx`.

**Status of the 17 Sep amendment: ruled, in build, 17 Sep 2026.**

**Law.** [R86](../RULES.md) (`status-owns-the-chip`).

**AMENDED 18 Sep 2026 — the dot reaches every status/stage picker and every list cell, and
the ticket-type option cards get their spacing and fill fixed.** Four of the client's
rulings, the same 18 Sep 2026 ~06:00 batch, read together:

- *"everywhere where choico component is status/stage add the points."* Any choice/select
  control whose field is a status or a stage — not only the rendered chip this rule already
  governs — draws the same solid dot
  ([D17](#d17-a-status-colour-means-one-thing-everywhere-dots-are-always-solid-and-a-department-is-told-apart-by-an-icon-never-a-hue))
  beside each option's label, so a picker and the chip it sets never disagree about whether
  the colour is there.
- *"when showing status/stage on a list, include the colored dot."* Every list row or table
  cell drawing a status or stage value carries its dot, not only the collection's own chip
  position — a status/stage value is never plain text or an icon alone.
- *"on tikects type, need space between icon and name. also background to the card"* — the
  ticket-type option cards (the create dialog's type picker) gain a gap between the type
  icon and its name, and a card background behind each option, rather than an icon and a
  label sitting bare on the page ground.
- *"for extra, use the regular icon (not filled)"* — the Extra ticket type's icon
  (`PlusCircle` in `ticketTypeIconName`) draws at the REGULAR Phosphor weight, never filled,
  matching the other three type icons.

**Status: ruled, in build, 18 Sep 2026.**

**AMENDED 18 Sep 2026 ~06:40 (Round 17) — a chip's own text is always black ink, and a
linked chip is underlined.** The client's ruling, verbatim: *"why is chip ticket type grey
and not black? all text shhould be black. when its a link make it underlined (for exmaple
the app name)."* This rule already retired the coloured dot from a non-status chip like
ticket type ([K39](#k39-in-any-collection-the-one-coloured-chip-is-the-records-status)
above); the chip's own LABEL text was left at a muted ink by mistake, reading as disabled or
secondary rather than as an ordinary category label. Every chip's text renders at the app's
one ink tone ([D17](#d17-a-status-colour-means-one-thing-everywhere-dots-are-always-solid-and-a-department-is-told-apart-by-an-icon-never-a-hue)'s
`#1A1918`, never a grey step), whether the chip carries a status dot or an icon. The one
exception is a chip that IS a link to another record — the ruling's own example, an app's
name on a ticket carrying that app's chip — which draws its text underlined, still in black
ink, so a reader can tell "this text opens something" apart from an ordinary category label
without reaching for a second colour.

**Status: ruled, in build, 18 Sep 2026 (kit v1.2.116).**

**AMENDED 18 Sep 2026 ~10:30 (Round 18) — every chip and pill carries its leading-mark gap
as a standing rule, dot or icon alike.** The client's ruling, verbatim, over the ticket
list views: *"on ticket list views, its missing the space between icon and name and the
backgorund card. always, make it a rule, for everythng wether its a dot or an icno, for
all chips / pills."* The gap between a chip's leading mark (its status dot, or an icon like
the ticket-type glyph this rule already governs) and its label text — Round 16's earlier
fix for the automations status chip's dot-to-label gap — is widened from a `dot`-only
special case to the badge's own base geometry: `LEADING_MARK_GAP` (`gap-2`, `--space-2`,
8px) sits in `badgeVariants`' own base class list, not behind a `dot ? … : undefined`
ternary, so it draws between ANY two children — dot-led or icon-led alike — and costs
nothing on a label-only badge (a `gap` utility only ever spends space between flex
children). The Badge's own `icon` prop (new) gives an icon-led chip — the ticket-type chip
this rule already names — the same formal slot `dot` already had, so a call site never
hand-rolls an `<Icon/>` + `<span>` pair beside a Badge again; every variant's own fill
(`bg-` declaration) already existed, standing as the "background to the card" half of her
sentence. Shipped in the kit (`shared/ui/components/badge/badge.tsx`, v1.2.118/v1.2.119);
`web/test/badge-dot-gap.test.tsx` and `web/test/chips-are-badges.test.ts` pin it.

**Status: ruled, in build, 18 Sep 2026 (kit v1.2.119).**

**AMENDED 18 Sep 2026 ~12:00 (Round 19) — the type icon's own colour is forced, not left to
the call site.** Two of the client's rulings that session, reviewing the same screenshot
twice: first, over the list view's type column, *"on the cokumn type in the ist viees,
still missing the tex in black and the background card container around it"* — read
against the two fixes already above (black label text, a fill on every variant), this was
the same regression surfacing again on one more screen rather than a new defect, and closed
by the same two rules once that screen's own chip render routed through the Badge
component the other rows already used. Second, over a fresh screenshot the same session,
*"no id ont see it. look in screenshot, type icon is still gray, and the app name (a link)
is not underlined"* — the icon's colour had been left to the call site
(`ticket-chips.tsx`'s own type chip wrote `text-muted-foreground` on its Phosphor glyph
directly), which is backwards for a chip whose whole law is that the FILL carries the
tone and the ink is forced. The Badge's icon slot (`[data-slot="badge-icon"]`) now forces
`[&_svg]:text-foreground` on whatever the caller hands it, outranking any colour class the
call site writes by CSS specificity — the same "charcoal on every accent" law this book
already states for the label, now closing the identical gap over the icon beside it. The
app-name link's underline (named again in the same sentence) was already shipped the
previous round and unaffected by this fix; her "no I still don't see it" was about the icon
colour, confirmed fixed on the next pass. Shipped in the kit (`badge.tsx`, v1.2.119).

**Status: ruled, in build, 18 Sep 2026 (kit v1.2.119).**

**AMENDED 19 Sep 2026 (Round 22) — the status Badge's own fill resolved to the page colour, so
the one chip this rule requires a background on had none.** The client's ruling, verbatim:
*"chips and pills always must have the background card or shape wherever they are. In this
case, I'm talking inside ticket-related stories. The type of ticket and the status need the
card to have a background"* — read over a story's own ticket-type and status chips, both
apparently bare text on the page ground. The type chip already carried its background from the
fixes above; the STATUS chip did not, and not because a call site skipped the Badge component
this whole rule governs — it used `variant="status"` correctly, but that variant's own fill
token resolved to the same value as the surface behind it, so the "background" was there and
invisible. Kit v1.2.128 gives the status variant its own chip-surface fill, distinct from the
page and card grounds around it, closing the gap without touching a single call site. The
contact ticket rows named in the same sweep — plain coloured text standing in for a chip, never
a Badge at all — are moved onto the same component.

**Status: ruled, in build, 19 Sep 2026 (kit v1.2.128).**

**AMENDED 19 Sep 2026 (Round 23) — the chip fill resolved to its ground on the Related-stories
card too; the fix is now every surface, not one.** Read off the same screenshot as
[L31](#l31-a-tickets-footer-sits-on-the-screens-own-bottom-edge-and-the-composer-wears-its-own-colour-full-width)'s
Round 23 amendment above, the "Change"/"Done" chips inside the ticket's Related-stories card
sat bare on the card ground — the identical failure the 19 Sep (Round 22) amendment closed for
the status variant on ONE surface. Kit v1.2.132 rebinds the chip fill token on every surface a
chip can sit on — card, panel, dark ground, rail — one step away from whatever ground it is
drawn against, rather than patched surface by surface as each one surfaces a complaint.
Contrast verified across 14 ground×palette combinations.

**Status: ruled, in build, 19 Sep 2026 (kit v1.2.132).**

**VALIDATED 20 Sep 2026 (Round 30).** Aurora reviewed staging this round and confirmed live:
the status badge's own fill reads distinct from the card ground it sits on.

**Status: validated, 20 Sep 2026 (Round 30).**

---

### K40: the roles matrix toolbar is search, module-name sort and a status facet; every row wears its module's icon; a locked cell is drawn, not captioned

**The rule, three sessions, 14–17 Sep 2026, over Settings › Team › Roles.** *"The toolbar
in roles is kind of broken. Go and fix it."* *"I want you to delete the 'Locked by Policy'
in Module Name. Also, in Module Name, add the icon of the module, and in the toolbar, I
want to be able to sort by Module Name."* *"For how a locked permission should look, I
choose option A: solid gray field."*

**The toolbar.** Search narrows the matrix's ROWS, which are modules, not roles — the
roles are the columns, and a matrix does not hide its own axis. Sort is A→Z / Z→A on the
module's own name, one field (`sortDir`), the `TOOLBAR_SORT_EXEMPT` line this file used to
carry deleted along with it. "Deactivated" moved a second time: off an `actions`-slot
button wired to a disclosure and onto `useFilterBar`'s own status facet
(`roleStatusFacets`), the slot R53 has for exactly this job — its count still rides
`FacetOption.count`, not lost in the move.

**The module icon.** Every row wears the same glyph the rail draws for its module, off
one map (`MODULE_ICON_CONCEPT` in `web/components/team/roles-matrix.tsx`, resolved
through `CONCEPT_ICON`, `web/lib/pages.ts`) rather than derived from `TEAM_SECTIONS`,
because several sections share one permission module (Stories/Sprints/Waves/Tasks/Time
are all `work`) and several modules never reached the rail at all — a derived lookup
would answer some rows and guess at the rest, which is exactly what R36 forbids for a box
on this same grid. A module absent from the map falls back to the settings gear, the same
fallback the Modules wall already uses.

**The locked cell.** "Locked by policy: <role>" is gone from the Module Name column — the
kit's own `lockMarkFor` drew it unconditionally and `aria-hidden`, so hiding it loses
nothing a screen reader was reading anyway. In its place, option A: a locked capability
takes a solid `--surface-quiet` fill of its own (kit v1.2.107, `PermissionMatrix`), not
pressable (`aria-disabled`, no hover, no focus ring), the words moving onto the one
segment they explain as a `title`/`Tooltip` rather than a row-level caption.

**Law.** None registered — `shared/rules/registry.ts`'s `TOOLBAR_SORT_EXEMPT` no longer
names this file; the kit's own `verify/permission-locked/` page (kwapso-design) is the
proof for the locked fill.

---

### K41: Tickets carries a Board view grouped by status, both inside an app and on the general collection

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"In Tickets inside the app, I
want a board view by status. Also add this board view by status in general tickets,
all."* A Board view joins the Tickets view switch in both places tickets are collected —
an app's own Tickets tab, and the team-wide Tickets screen ("all") — one column per ticket
STATUS, the kit `Kanban` [K23](#k23-apps-gallery-and-board-by-stage-never-tiles-or-a-table)
already draws for Apps. This is a second, status-keyed board alongside
`tickets-collection.tsx`'s existing `OpenBoard` (`web/components/tickets/
tickets-collection.tsx`), which groups only the Open facet's own tickets by stage — the
new board is the collection's outer STATUS, not a facet's inner one, and it is offered
wherever the List view already is.

**Status: ruled, in build, 17 Sep 2026.**

**Law.** None registered.

### K42: a tickets list view carries a leading "ID" column, the reference ahead of the title

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"In all tickets list view add
the header ID for the ID and move the ticket on top of the ticket."* The ticket's own
reference gets a column of its own, headed literally **ID**, drawn ahead of the Title
column. Today the reference draws only as a leading `RecordRef` chip inside the `title`
cell (`TICKET_COLUMN_ORDER`, `web/lib/live-resources.ts`; `TicketRowsTable`, `web/
components/tickets/tickets-collection.tsx`), under no header of its own — this rule pulls
it out into its own leading column, with Title following it, on every tab of every
tickets list, general and in-app alike.

**Status: ruled, in build, 17 Sep 2026.**

**Law.** None registered.

**AMENDED 18 Sep 2026 — Raised by and Raised on are two separate columns.** The client's
ruling, verbatim: *"raised separate by and date! not in one together."* The reference stays
its own leading ID column, ahead of Title, as this rule already sets — Raised by and Raised
on ([D19](#d19-raised-on-is-a-fact-under-raised-by-with-the-exact-date-and-how-many-days-ago-in-brackets-never-its-own-chip))
no longer share one combined cell on a tickets list view either: each gets its own column,
so a row's raiser and its raised date can be scanned, sorted and read independently rather
than as one run-on fact.

**Status: ruled, in build, 18 Sep 2026.**

**AMENDED A SECOND TIME, 18 Sep 2026 ~12:00 (Round 19) — the Raised by column carries the
raiser's own face.** The client's ruling, verbatim, reviewing the deployed build: *"on
cokumn raised by i am misisng the avatar."* The top-level Tickets list's own Raised by
column had drawn a name-only `<RecordMark>` since this rule's own first version — `TicketFace`'s
`raiserId`/`raiserName` pair carried no `picture` prop, because `HelpTicket` stores no avatar
URL for a raiser and nothing on this screen had ever read the team's members cache to resolve
one, even though the app record's own Tickets tab (`AppTicketsPanel`, `work-panels.tsx`)
always had, through its own local `memberAvatar` lookup. `memberFace`
(`tickets-collection.tsx`) is the ONE resolver now, the same `.find()`-by-userId shape
`memberAvatar` already used, shared by both call sites rather than kept as two copies of one
lookup; `TicketRowsTable` takes `members` as an optional prop so its raisedBy cell can call
it. This is a face lookup only — never a picker — and `tickets-collection.tsx`'s own read of
the members cache is named in `NOT_A_WORK_PICKER`
([D20](#d20-a-tickets-own-detail-is-one-page-no-tabs-the-stage-ladder-above-a-two-column-body-conversation-two-thirds-stories-work-logs-stakeholders-stacked-beside-it)'s
own `TicketConversationPanel` reads the identical cache for the conversation's own sender
faces, the same reasoning). Proved by rendering rather than by reading the source —
`web/test/ticket-raised-by-avatar-and-app-link.test.tsx` — the same posture this rule's own
`ticket-row-opens-beside.test.tsx` already takes over the same component. The same test also
re-proves the type column's icon ink fix ([K39](#k39-in-any-collection-the-one-coloured-chip-is-the-records-status)'s
own amendment) against a live render, because her same-session sentence named both in one
breath: *"type icon is still gray, and the app name (a link) is not underlined."*

**Status: ruled, in build, 18 Sep 2026.**

### K43: an app's own Tickets tab carries a Queue view for triage, and it draws the standing empty state when there is nothing to triage

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"Inside app tickets, I also
want the queue view for triaging. Empty. Show there's nothing to triage."* An app's own
Tickets tab gains a Queue view, scoped to that app's own tickets, mirroring the general
Tickets triage queue (`TriageQueue`, `TriageStrip`, `web/components/tickets/
triage-queue.tsx`, `triage-strip.tsx`). Where an app has nothing waiting to triage, the
queue draws the collection's own empty register — no toolbar, no boxed "nothing here"
panel floating above one — the same refusal [R50](../RULES.md) already makes for every
other empty collection in the app, read onto this new view rather than given a bespoke
empty state of its own.

**Status: ruled, in build, 17 Sep 2026.**

**Law.** None registered — held to R50 (`empty-toolbar`) like any other collection view.

**AMENDED 17 Sep 2026 — the queue view carries its own Raised fact.** The client's ruling,
verbatim: *"I am not seeing "raised" on the queue view on triage."* The app-scoped Queue
view now draws the same "Raised by" / "Raised on" facts
([D19](#d19-raised-on-is-a-fact-under-raised-by-with-the-exact-date-and-how-many-days-ago-in-brackets-never-its-own-chip))
every other ticket view already carries, so a row waiting to be triaged says who raised it
and when without opening the record.

**Status: ruled, in build, 17 Sep 2026.**

**AMENDED A SECOND TIME, 18 Sep 2026 — the queue view's Raised fact splits too.** The
client's ruling, verbatim: *"raised separate by and date! not in one together."* The Raised
by / Raised on fact this rule's own 17 Sep amendment added to the Queue view follows K42's
same split — raiser and raised date draw as two separate facts rather than one combined
line, on the triage queue as everywhere else a ticket lists Raised by and Raised on
together.

**Status: ruled, in build, 18 Sep 2026.**

### K44: a tickets list inside an app carries Resolved Date and Resolved By

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"On tickets list inside an app,
add columns: Resolved Date, Resolved By."* An app's own Tickets list draws two more facts
than the columns `TICKET_COLUMN_ORDER` already gives a resolved-pinned tab (Title, Type,
App, Raised, Closed) — **Resolved Date** (the existing closing-date fact, named for what a
reader on this screen actually wants to know) and **Resolved By**, who closed it. K32's own
ceiling still applies: at six columns already spoken for on a resolved tab, a seventh goes
on a second line rather than squeezed onto the row's end
([K32](#k32-a-table-row-holds-at-most-six-columns-the-seventh-goes-on-a-second-line-never-squeezed-onto-the-end),
[R82](../RULES.md)).

**Status: ruled, in build, 17 Sep 2026.**

**Law.** None registered — the new columns are held to R82 (`table-column-budget`) like
every other tickets column.

### K45: an app's own Knowledge tab is the general Knowledge collection, scoped to that app

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"In the Knowledge tab,
replicate what we have in the general knowledge. This should just be a gallery with all
the knowledge we have about this, with a toolbar that I can search and filter, blah, blah,
blah, and a button to ask about this. This should open a conversation with the assistant
only about this app."* An app's own Knowledge tab draws the identical shape
[K36](#k36-the-knowledge-collection-centralizes-search-through-the-assistant-a-head-bar-carries-ask-sync-and-gear)
already gives the general Knowledge collection — the same Gallery of source cards, the
same toolbar (search restored, Kind tabs, sort, Gallery/Shape switch), the same head
actions in the same order, Ask · Sync · Settings — narrowed to that one app's own sources.
The Ask button opens a new assistant conversation scoped to this app alone, never the
team-wide knowledge base the general Ask button opens.

**Status: ruled, in build, 17 Sep 2026.**

**Law.** None registered — held to [R48](../RULES.md) (`toolbar-shows-search`) and
[R84](../RULES.md) (`mango-in-title-only`) the same way K36 is.

### K46: an app's own Tabs screen is a gallery with icons, matching Settings' Modules panel; adding a module asks for its icon

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"Inside an app, the tabs
module: I want it to look exactly like the settings modules, this kind of gallery with the
icons. When I add a module, I should be able to select an icon for it."* An app's own Tabs
screen (`web/components/apps/modules-panel.tsx`) draws the identical gallery
[B10](#b10-a-modules-settings-have-two-entrances-and-one-page-behind-them) already gives
Settings' own Modules panel — one card per module, its icon leading, never a plain list.
Adding a module to an app is a form that asks for that module's own icon, picked from the
kit's own icon set ([R39](../RULES.md), `kit-supplies-the-ui`), rather than one assigned
silently or left to a fallback glyph.

**Status: ruled, in build, 17 Sep 2026.**

**Law.** None registered.

### K47: a list row's face is small, and never taller than the row

**The rule.** The client's ruling, 18 Sep 2026 ~06:00, verbatim: *"when avatar/icon on list
view, make the avatar smaller. shoudl not be the cause of more height to the oevrall row."*
A list row's leading face — [G5](#g5-a-record-never-appears-without-its-face)'s
picture/glyph/initial — draws at a smaller size on a LIST row specifically, sized so it
never sets the row's own height; the row's height is whatever its title-plus-meta-line
([K1](#k1-a-collection-row-is-a-title-plus-one-meta-line-and-nothing-else)) already needs,
and the face fits inside that, never the other way round.

**Status: ruled, in build, 18 Sep 2026.**

**Law.** None registered.

### K48: the assistant composer holds one row at rest, at every pane width

**The rule.** The client's ruling, 18 Sep 2026, over a screenshot of the assistant pane at a
narrow width: *"Look at the second screenshot. Now it makes it two rows, and it kind of
breaks. Make sure that it's only one row. Ask about your work. It doesn't break into rows,
and also, as you see in the screenshot, when it's selected, it's not working properly.
Something's off."* An empty composer field was measuring its own placeholder's wrapped
height — "Ask about your work" wraps to two lines at a narrow pane width, and the field grew
to match before a single character existed — and the field carried no floor narrower than its
own min-content width, which is what let the pane narrow enough to wrap the placeholder in the
first place. The "selected... something's off" report was the same bug wearing a different
name: a click focused an already two-row field, nothing about focus itself was broken. Fixed
by construction: an empty field never measures against its own placeholder and is pinned to
the resting one-line height, and the placeholder itself is set never to wrap, at any width.

**Status: ruled, in build, kit v1.2.124.**

**Law.** None registered — a kit-only fix. `components/agent-chat/check-composer.mjs`, wired
into the kit's own `npm run check`.

### K49: the rail's brand mark steps up one more rung, still centred on the strip row

**The rule.** The client's ruling, 18 Sep 2026, over the live rail: *"I want the logo to be
bigger and maybe even a bit lower. I don't know. You tell me, you're the designer, but I
would say it needs to be a bit bigger, just a bit."* One more rung of the icon ladder — the
mark's size steps from the 24px rung to the 28px rung, the next size already admitted on the
ladder, not an invented number. The strip row's own band still centres the mark by
construction — its height and top offset are unchanged — so a taller mark grows from that
same centre in both directions: the bottom edge drops (and the top rises) by half the size
difference, reading as "a bit lower" without touching the law that centres it.

**Status: ruled, in build, kit v1.2.124.**

**Law.** None registered — a kit token step (`compositions/templates/rail.tsx`); the band's
own construction that centres the mark was untouched and needed no re-proof.
