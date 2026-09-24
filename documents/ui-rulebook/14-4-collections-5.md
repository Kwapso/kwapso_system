# 4. Collections (part 5 of 8)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### K33: the gap above a toolbar equals the gap below it — the tab strip and its card share one gapless column

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"reduce the spacing above ALL
TOOLBARS. i want it exactly as its currently below, make it like that above."* [K13](#k13-the-gap-under-a-toolbar-is-one-number-and-the-row-pays-it)
already made the gap BELOW a toolbar one number the row itself pays,
`--toolbar-content-gap`. The gap ABOVE is the identical value under a second name,
`--tab-content-gap` — both spend the same `--space-5` — paid by the tab strip above the
toolbar as its own trailing `pb-[var(--tab-content-gap)]` (`STICKY_FOLDER_TABS`,
`shared/web/screen-engine/tabs-view.tsx`). Every screen but one already spent each value
exactly once: `paged-find.tsx`, `tickets-collection.tsx`, `kwapso-screen.tsx`,
`settings-screen.tsx` (twice), `module-settings-screen.tsx` and `screen-bits.tsx`'s own
`SectionWithCreate` all wrap a `renderFolderTabs(…)` call and the card it labels in a
column carrying no `gap-*` of its own — `paged-find.tsx`'s own comment states the rule:
"this column has nothing to say about it either way and must not grow a `gap-*` of its own
— that would be a second opinion about one number."

**The one call site that disagreed.** `waves-screen.tsx`'s `renderFolderTabs(…)` call and
the `<CollectionCard>` beneath it sat directly inside the screen's own outer
`flex flex-col gap-6` column, alongside the page heading — a per-screen wrapper spending a
second, unrelated 24px on top of the strip's own 20px, above the toolbar and nowhere else.
Fixed by giving the strip and its card their own inner `flex w-full flex-col` (no `gap-*`),
the shape the other six call sites already draw, with the heading staying in the outer
`gap-6` where a real, single gap belongs.

**The check.** A static census fails any `renderFolderTabs(` call whose immediate JSX
parent (fragments walked through) carries a `gap-*`/`space-y-*` utility, unless the file is
named in `TOOLBAR_LEAD_GAP_EXEMPT` with the real reason.

**Law.** [R83](../RULES.md) (`toolbar-lead-gap`), `web/test/toolbar-lead-gap.test.ts`.
**AMENDED 16 Sep 2026, same day, measured on staging:** the wrapper census above was not the whole gap — a `<CollectionCard>` hosting a toolbar as its first child ALSO spent `CardContent`'s own leading inset on top of the strip's `pb-[var(--tab-content-gap)]`. Tasks measured 52px above the toolbar against 20px below; Settings › Team › Members and Contacts measured 44px above against 20px below. Fixed once in `web/app/globals.css`: `.pinned-strip + [data-slot="card"]` zeroes both the card's real `padding-top` and the R63 `--pinned-lead` property together, so above = below = 20px on every screen. Proved by `web/test/toolbar-lead-gap-card.test.tsx`.

**AMENDED A SECOND TIME, 16 Sep 2026, evening, by the client's own reaction to the
flush-zero fix.** Her ruling, verbatim: *"I'm not happy about this. It doesn't look good.
Can we do an in-between with what it was and what it is now? Also, make sure it's the same
on every page. I don't understand how task was 52 and setting and contacts were 44. It
should be the fucking same everywhere."* Flush-zero (above = below = 20px) proved the
double-payment was gone and was never itself the target — the law now is: **above a
toolbar = `--toolbar-lead-gap` (32px, the scale's own `--space-7`) on every screen; below =
20px (`--toolbar-content-gap`, untouched)**, the in-between she asked for. One new token,
`--toolbar-lead-gap: var(--space-7)` (`web/app/globals.css`, beside `--tab-content-gap`/
`--toolbar-content-gap`). The strip above a toolbar still pays `--tab-content-gap` (20px) as
its own trailing padding; the card pays only what is left,
`calc(var(--toolbar-lead-gap) - var(--tab-content-gap))` (12px), on both
`[data-slot="card-content"]`'s real `padding-top` and the R63 `--pinned-lead` property
beside it — the same two-halves-together reasoning as the first amendment, now paying a
remainder rather than zero. `web/test/toolbar-lead-gap-card.test.tsx` proves the token, the
exact `calc()` on both properties, and every `renderFolderTabs(` call site the rule
reaches, off the disk rather than a hand-typed list.

**AMENDED A THIRD TIME, 18 Sep 2026 — reviewed app-wide.** The client's ruling, verbatim:
*"on app / tickets the space above the toolbar is huge and inocrrect!!! review
app-wide!"* An app's own record tabs (Tickets inside an app, and any sibling record-tab
toolbar reached through `renderFolderTabs(`) still show the gap this rule already fixed on
the general collection screens — the same `--toolbar-lead-gap` above / `--toolbar-content-
gap` below treatment is being reviewed across every `renderFolderTabs(` call site app-wide,
not only the ones this rule's own census already covered, so a record's own tab strip
cannot drift back to the pre-fix spacing.

**Status: ruled, in build, 18 Sep 2026.**

**AMENDED A FOURTH TIME, 18 Sep 2026 ~10:30 (Round 18) — the 32/20 split shrinks to 10 above
and 10 below, both above the toolbar and above a record detail's own strip, and the beige
container's missing roundness is fixed.** Two of the client's rulings the same session, read
together:

- *"toolbar iss till worng in many many. palce! for exmaple in tickets / waiting, open,
  ready..... the beige cotainer is missing the roundness and theres too muvh space above
  toolbar search"* — on Tickets' own status-tab screens, `renderFolderTabs(tabs)` is called
  OUTSIDE `<PagedFind>` (`tickets-collection.tsx` passes no `tabs` prop), and
  `paged-find.tsx`'s own return unconditionally wraps its card in one extra, gapless
  `<div className="flex w-full flex-col">` — invisible to the eye but a real DOM node
  between `.pinned-strip` and the card, so `.pinned-strip + [data-slot="card"]`'s plain
  adjacent-sibling selector matched nothing across it. This rule's own third amendment
  above was therefore never firing on precisely the screens she named, and
  `CollectionCard`'s hardcoded `--pinned-lead`/`--pinned-inset-x` pair (16–32px, a stale
  app-side override that no longer agreed with the kit's own `CardContent` inset) applied
  instead — the band's rounded `::before` was drawn at a corner that was not where the
  card's real border box actually sat, reading as a square edge instead of a rounded one.
  `.pinned-strip + * > [data-slot="card"]:first-child` now reaches through that one wrapper
  the same descendant-selector shape the nested-tab-pane rule already uses for
  `PagedPanelBody`'s own flow div, so the toolbar-lead rule fires on every screen ruling 6
  named, corner included.
- *"too much!!!! i liked more the thinner verison from before! the 10pc above and below,
  both in main and details."* Supersedes the second amendment's 32px-above/20px-below
  split outright: `--toolbar-lead-gap` now spells the card's own leading `padding-top`
  DIRECTLY, no `calc()` remainder against the strip's own `pb-[var(--tab-content-gap)]` any
  more, at `--space-2h` (10px) — "the 10pc above," one of the scale's own admitted
  half-steps. `--toolbar-content-gap` (below the toolbar) drops to the same `--space-2h`
  (10px) too — "and below," matching above for the first time since this rule's very first
  ruling asked for exactly that shape. "Both in main and details" reaches a record's own
  inner tab strip (`STICKY_TABS`, `record-chrome.tsx`) the identical way, paying the SAME
  `--toolbar-lead-gap` token rather than a second number for the same relationship one
  screen kind over.
- *"review sping aboe toolbar everyhwere. f.e. in app / phases its completey off."* (21 Sep
  2026). A staging census found four sites this ruling's own fix never reached, because each
  drew its toolbar through a shape none of R83's selectors were written to key on: (1) App
  detail's Phases tab (`SprintsPanel`, `work-panels.tsx`) draws the vendored kit's own
  `<CollectionFrame>` (`useKitPanel`), whose `data-slot="collection-frame-toolbar"` sits
  inside `data-slot="collection-frame-panel"` with no `[data-slot="card"]` anywhere above it
  for the existing rules to reach, fixed by naming the panel directly in
  `web/app/globals.css`, both `--pinned-lead` and the real `padding-top`, without touching
  the kit or `work-panels.tsx`. (2) App detail's Stories and Tickets tabs measured 0px above
  on staging, but the code (`data-tab-pane`, `tabs-view.tsx`) and the nested-tab-pane rule
  were already correct: the census had been read against a deploy behind the commit it was
  measured at, not a real code gap. (3) Account detail's Contacts panel never used
  `CollectionCard` at all, a hand-rolled `bg-surface-panel p-4` lookalike with no
  `data-slot="card"` for anything to reach, fixed by routing it through the real
  `CollectionCard` and retargeting that component's own default lead from the old
  16/32px ladder to `--toolbar-lead-gap`, flat at every width. (4) Work logs
  (`time-panel.tsx`, the toolbar `time-screen.tsx` itself never draws) measured 24px above:
  an ordinary inter-panel `gap-6` between the Hours summary box and the toolbar standing in
  for the law's lead by coincidence, fixed by giving that one gap the token instead.
  `web/test/toolbar-lead-gap-card.test.tsx`'s own R83 self-check now derives every
  `PINNED_TOOLBAR`-wearing `data-slot` off the disk and fails the build the day a fifth shape
  draws a toolbar through a slot nobody wrote a rule for.

**Status: ruled, in build, 18 Sep 2026, extended 21 Sep 2026 (`web/app/globals.css`,
`web/components/deep-link/screen-bits.tsx`, `web/components/accounts/account-detail.tsx`,
`web/components/work/time-panel.tsx`).**

**DECISION B, 21 Sep 2026: the space under a detail page's own tab strip is the SAME 10
above, 10 below every other toolbar reads, in every tabbed record.** Aurora, choosing
between the two shapes drawn side by side: the toolbar under a detail page's own tab strip
(an app's own Phases, Stories, Tickets tabs; an account's Contacts panel and its other
tabbed panels) sits 10px under the strip, exactly this rule's "10 above and below, both in
main and details." Round 18's own fix above already made the nested card's own lead pay the
whole `--toolbar-lead-gap` (10px), cancelled at rest by `PINNED_TOOLBAR`'s own mt/pt peek the
identical way a top-level toolbar's lead cancels, so a live, unscrolled reading of 0px above
was already correct there. What that round never reached was one level up: `STICKY_TABS`
(`web/components/records/record-chrome.tsx`) puts `gap-[var(--space-6)] lg:gap-[var(--space-7)]`
on the kit's own `<Tabs>` root, the flex gap between the tab strip and its `TabsContent`
sibling, so the card's correctly cancelled 10px still sat under an untouched 24px below `lg`
and 32px at `lg` and up, on top of a card that already measured 0px at rest, nothing here had
ever named or reached. Fixed in `web/app/globals.css`: a new rule zeroes that flex gap, but
only when the ACTIVE tab pane's own leading card hosts a collection toolbar as its first
child (`[data-slot="tabs"]:has(> [data-tab-pane][data-state="active"] [data-slot="card"]
:first-child > [data-slot="card-content"] > [data-slot="toolbar-row-pin"]:first-child)`),
so a pane that starts with anything else (fact rows, prose) keeps its ordinary gap. Proved by
`web/test/toolbar-lead-gap-card.test.tsx`.

**Status: ruled, in build, 21 Sep 2026 (`web/app/globals.css`,
`web/test/toolbar-lead-gap-card.test.tsx`).**

### K34: the Accounts collection strip is Active · Inactive · All, defaulting to Active

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"For account status, let's keep
active, inactive, and all."* The Accounts collection's own tab strip narrows to exactly
those three — Active, Inactive, All — the same three-state shape (a partition, its
complement, and the unfiltered whole) other collections in the app already draw, opening on
**Active** by default. Held to the same `{ field: "archived", label: "Status", options:
ACCOUNT_STATUS }` facet the strip already read from (`accounts-screen.tsx`), so a filter a
reader sets elsewhere in the app agrees with the strip rather than arguing with it.

**Law.** None registered — a tab-strip content change on an existing `TabsView` mounting,
held to the library-tabs rule (R3) like any other.

---

### K35: a record's title is always the record's title field, never its description

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"Tickets and stories inside
the details screen and all other collections are actually displaying the description instead
of the title."* The ticket detail head and every record's face in a collection row displays
the TITLE field, not the description. When no title exists, the description may fall back
as a display convenience, but the seam always prefers title-first.

**Where this reaches today.** Every detail screen reaches through the one `ticketTitle()`
seam (`shared/web/ticket-chips.tsx`), which checks the title field first and falls back
to description if the title is empty — a translation-aware read. The collection row chip
reads the same field. `web/test/ticket-title-seam.test.tsx` pins the behaviour, running
every path that reads a description as fallback in `help-detail.tsx` and verifying it only
activates when title is absent.

**Law.** None registered — a read-path selection on an existing component seam.

---

### K36: the knowledge collection centralizes search through the assistant; a head bar carries Ask, Sync, and gear

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"Remove KB search bar, convert
KB view to archive/source-manager, centralize search through assistant. The gear should be
on the very far right. this 'Bring it in' should be changed to 'Sync'. Add a Mango button
that says something like 'Ask' or 'Assistant', and this should open a new chat on the
assistant. it's missing the toolbar. Make it like the dashboard, so that it has its own
container background."*

**AMENDED 17 Sep 2026.** The client's follow-up ruling, verbatim: *"The ask button and the sync are correct. However, remove the whole modal 'Ask a question'. On the first screenshot also, can we change the icon of the knowledge base? I was thinking a brain. Also add the search to the toolbar. It's missing."* The Ask-a-question modal is gone (the head's mango Ask button is the one way to ask); the toolbar search is restored (PagedFind default, no longer in the exemption); the icon went to **Brain** everywhere (app-shell SECTION_ICONS, pages CONCEPT_ICON, tabs-view TAB_ICONS) — **superseded a few hours later the same day**, see below.

**The shape.** The knowledge collection draws NO search box in a separate field; searching happens through the assistant thread instead. Facets and the List/Shape view controls sit in a toolbar inside a `CollectionCard` with its own background, the same layout and container as the dashboard. Head actions above the toolbar: **Ask** (mango, `variant="default"`, opens a new assistant conversation scoped to the knowledge base) · **Sync** · **Settings** (gear, last). The search sits in the toolbar itself, not exempt.

**Tests:** `web/test/knowledge-search-restored.test.tsx`, `web/test/knowledge-head.test.tsx`.

**Where this reaches today.** The knowledge listing is named in `TOOLBAR_EXEMPT` with the
ruling as its reason, and [R48](../RULES.md) (`toolbar-shows-search`) covers the exemption.
`PagedFind` passes `search={false}` to silence the search input. The facet and view rows
stay on the toolbar to filter/shape the material the assistant cites. `web/test/knowledge-head.test.tsx`
asserts the Ask, Sync, and gear actions appear above the toolbar, the toolbar renders without
search, and the list and view controls stay inside one `CollectionCard`.

**AMENDED A SECOND TIME, 17 Sep 2026 — the icon moved again, K2 by kind, and the card
shrinks.** A rail-wide correction, the same day, a few hours after the Brain pick above:
*"for knowledge, use bookmark simple in fill solid."* The icon is **BookmarkSimple**, fill
weight, everywhere Brain had just landed — see [N11](#n11-a-glyph-on-every-destination-and-every-collection-heading)
for the other four rail glyphs corrected the same pass. From a consultation, verbatim:
*"Knowledge page K2 by kind."* Tabs are now All, then one tab per source KIND the data
actually has, each with its own exact count (R16); the Kind facet leaves the toolbar, the
strip replaces it, and compartment/active, search, sort and Gallery · Shape all stay
exactly where the first amendment left them. The same session, verbatim: *"On the
knowledge base, I want the cards smaller, so I want to see at least four in one row. Also,
the edit button is deleted from the card. It should just be on the detail page."*
`KnowledgeSourceCard` draws four facts, not six — mark, title, kind, one meta line — small
enough that four fit across a row; compartment, app, sharing, pieces and sightings are
gone from the card and stay fully readable on the record's own Overview tab. The edit
pencil is gone, not moved: it already existed on the record's own title (2026-08-31
ruling, "edit, only the pencil icon"), so nothing it did is now unreachable, only
reachable in one place instead of two.

**Tests:** `web/test/knowledge-kind-tabs.test.tsx`, `web/test/knowledge-gallery-card.test.tsx`,
`web/test/knowledge-source-card.test.tsx`.

**Law.** [R48](../RULES.md) (`toolbar-shows-search`), as the exemption; [R84](../RULES.md)
(`mango-in-title-only`), as the Ask button's styling.

**AMENDED A THIRD TIME, 17 Sep 2026 — the kind-tab names shrink to one word each.** The
client's ruling, verbatim: *"Good work. However, the names of the tabs are too long.
Instead of "From a meeting," say "Meetings," and so on. In all the cases, just make the
names shorter."* Every kind tab (All, plus one per source kind) now reads as its shortest
recognisable form — "From a meeting" becomes "Meetings" — and every other kind tab drops
its own descriptive framing the same way, down to the bare kind name.

**Status: ruled, in build, 17 Sep 2026.**

---

### K37: the toolbar sits inside the content card and never in a container of its own; Tickets › Dashboard drops its toolbar; an app's Dashboard row gains a third card, "Raised by"

**The rule, in three parts, all 17 Sep 2026.**

1. **The uniform gap.** Over a screenshot of Tickets › Dashboard, verbatim: *"Look
   at the second screenshot. It is a mess, the space between and after the
   toolbar. Really, it's too much before, so go and uniform this
   abso-freaking-everywhere, please."* The toolbar of any collection screen sits
   as the first row inside the same card as its content — or, where a tab shows
   several cards, inside the first one — with `--toolbar-lead-gap` above and
   `--toolbar-content-gap` below (K33/R83); it never draws a second, separate
   container of its own. Measured on Tickets › Dashboard before this pass: the
   toolbar sat in its own `<Card>` with a `p-4 pb-0 lg:pb-0` inset (16/32px)
   below the tab strip, a `pb-4` (16px) gap, then the first panel's own card —
   three pieces of furniture where every other tab draws one.

2. **No toolbar on Dashboard at all.** A same-day follow-up ruling, verbatim:
   *"Remove the toolbar from the tickets dashboard."* Superseding part 1 for
   this one tab specifically: the Dashboard tab (both the Tickets screen's own
   and the app record's Tickets › Dashboard view) now draws no search, no
   filters and no create button — the toolbar this rule's first part was about
   uniforming is gone outright, on both hosts. Every other collection tab keeps
   its own toolbar (R48); this is the one named exception.

3. **"Raised by."** The same session, over the app's own Tickets › Dashboard
   row: *"put the open work and raised at the same level. They take up too much
   space."* — "The open work" and "Raised as, then triaged as" moved from two
   stacked full-width panels into one `lg:grid-cols-3` row, each panel a third
   of the width. Then, verbatim: *"I want a rank list with bars in total, not
   the last 30 days, and yes, put the faces."* — the row's third column is
   "Raised by": the app's top five ticket raisers (contacts, by
   `raised_by_contact_id`), ranked highest-count-first, each row a face, a
   name, the count, and a share bar; a footer names the whole population
   ("of {total} · {people} people"), never just the five drawn.

**The shape.** `web/components/tickets/tickets-dashboard.tsx` draws no
`<ToolbarRow>` at all any more — the search/facet/create-button plumbing that
used to feed one is gone with it, and `<TicketsDashboard>` no longer accepts
`standsOn`/`viewSlot`/`actions`. The List↔Dashboard switch and "Raise a
ticket" still reach a reader through the List view's own toolbar
(`work-panels.tsx`). `readTicketDashboard` (workers/content/src/lib/help.ts)
gained a tenth grouped read, `raisedByContact`: a top-five ranked list (SQL
`ORDER BY n DESC LIMIT 5`) plus the whole-population `total`/`people`
aggregate, never derived from the five rows on screen. The React component
re-sorts its own rows rather than trusting the door's order silently.

**Tests:** `web/test/tickets-dashboard-no-toolbar.test.tsx` (no `<ToolbarRow>`
on disk; ranking order, the top-five cut, the whole-population footer, and a
face on screen, over a real render); `web/test/toolbar-lead-gap-card.test.tsx`'s
third census (a `CardContent`/`CollectionCard` whose only real content is a
toolbar reference, derived off the disk — the shape this pass's own bug was);
`web/test/dashboard-says-what-it-left-out.test.tsx`, updated for the toolbar's
removal.

**Where this reaches today.** No `TOOLBAR_EXEMPT` registry line was added for
the Dashboard's own toolbar removal: none of R48's five censuses reach a
component that draws no `<ToolbarRow>` at all, is not a `BASE_RECIPES` entry
and draws no `CardGrid`/`List` wall, so an exemption entry here would match
nothing and fail R48's own rot-check the moment it landed. This K-entry is
the ruling's written record instead, the house convention for a UI ruling
that needs no new machine-checked exemption.

**Law.** [R83](../RULES.md) (`toolbar-lead-gap`), extended by the new census
in `toolbar-lead-gap-card.test.tsx`; [R48](../RULES.md) (`toolbar-shows-search`),
whose census cannot see the Dashboard's own removed toolbar, which is why this
entry exists; [R50](../RULES.md) (`empty-toolbar`), unaffected — the
Dashboard's own empty state (`ticketTotal === 0`) is unchanged.

---

### K38: the Today's-tasks progress strip, and the ticket stage ladder beside it, stand on the bare page — no container behind either

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"In Tasks, the
Today's Task Progress view should have no container behind it, and this is
exactly the position for reference that I want the ticket progress to be."*
Two labelled `<section>`s, one per record type, both bare: `tasks-screen.tsx`'s
"Today's tasks" strip (between the heading and the tab strip, on every Tasks
tab) and `ticket-stages.tsx`'s stage ladder (on `RecordScreen`'s
`headerExtra`, above a ticket's own tab strip) — the second named as the
position the first should match. Neither carries a heading of its own (R67's
subject after its own 2026-09-11 amendment dropped the heading requirement);
both are named by `aria-label` instead, and both used to carry
`bg-surface-panel`/`bg-card` as R67's own default before this ruling
overruled it for these two, specifically.

**The shape.** `tasks-screen.tsx`'s `progressBar` lost `rounded-[var(--radius)]
bg-surface-panel p-4` outright — `KpiProgress` and the caption beneath it are
now the section's only content, no fill, no radius, no inset.

**Tests:** `web/test/sections-stand-on-paper.test.ts` (R67's own census, proved
red then green against this file — removing the registry line reintroduces
the failure).

**Where this reaches today.** `web/components/work/tasks-screen.tsx` is named
in `UNCONTAINED_SECTION_OK` (`shared/rules/registry.ts`) with this ruling as
the reason, immediately beside `web/components/tickets/ticket-stages.tsx`'s
own entry for the same words — the two are cross-referenced in the registry's
own comments as one ruling landing in two files.

**Law.** [R67](../RULES.md) (`sections-stand-on-paper`), as the named
exemption.

**AMENDED 17 Sep 2026 — the tab strip it stood "above" is gone; the ladder's own position
is not.** [D20](#d20-a-tickets-own-detail-is-one-page-no-tabs-the-stage-ladder-above-a-two-column-body-conversation-two-thirds-stories-work-logs-stakeholders-stacked-beside-it)
retired the ticket detail's tab strip outright — the same `headerExtra` slot this rule
names still carries the ladder, now above `TicketDetailBody`'s two-column layout rather
than above a `TabsView`. Nothing about the rule above changes: still bare, still full
width, still no heading of its own.

**AMENDED A SECOND TIME, 17 Sep 2026 — the stages themselves go, the dots shrink, and the
date collapses to one line.** The client's ruling, verbatim: *"in the ticket stages,
remove the stages. Make the dots smaller, and the date should take only one line. Unless
it's a different year, just put the month, the day, and the hour in 24-hour format. Only
put the hour, not the minutes, and don't put the steel here. We can see the colors. My
whole goal is that this component is just smaller"* The stage LABELS are gone from the
ladder — the colour of each dot already says which stage it is, so a caption under it is
redundant with what the client just called out. Each dot draws smaller than before. The
date under a dot is one line, never two: `{month} {day}, {hour}` in 24-hour time, minutes
dropped, and the year appended only when it differs from the current one — read the same
way [T4](#t4-numbers-and-dates-are-tabular-nums) already reads every date/number in this
book. The whole point, in her own words, is that this component gets smaller, not
differently arranged. The shrink is app-side sizing, not a kit change: the kit's own
`StatusStepper` (`shared/ui/components/status-stepper/status-stepper.tsx`) carries no size
prop of its own to ask for a smaller dot, so `ticket-stages.tsx` reaches the kit's next
`--control-height-*` step down (26px → 20px) on its own wrapper instead — the same evening
as, and unrelated to, kit v1.2.111's trail/tab-strip/card-inset sync (L13, above) landing
in `shared/ui`.

**Status: ruled, in build, 17 Sep 2026.**

---
