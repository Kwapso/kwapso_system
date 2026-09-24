# 4. Collections (part 1 of 8)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

## 4. Collections

### K1: a collection row is a title plus one meta line, and nothing else

Two lines. The title, and one dot-separated subtitle carrying **at most three** facts.
Cut the rest.

Today `web/components/deep-link/shape.tsx` and `stories-screen.tsx:48-59` build subtitles
of four and five parts, and prefix the reference into the title as well. The reductions:

| Row | Today | Rule |
|---|---|---|
| Ticket (`shape.ts:128-138`) | `ref · description` + type, status, "N of M done", "archived" | title only; subtitle `status · type` |
| Story (`stories-screen.tsx:48-59`) | `ref · title` + status, assignee, due, sprint, ticket ref | title only; subtitle `status · assignee · due` |
| Task (`tasks-screen.tsx:47-56`) | `ref · title` + done, assignee, due | title only; subtitle `assignee · due` |
| Account (`shape.ts:268-271`) | name + type, code, status, parent | name; subtitle `type · status` |
| Meeting (`shape.ts:217-225`) | title + date, account, purpose, whether it has happened | title; subtitle `date · account` |

The reference number moves to the glyph's `title` attribute and to the detail eyebrow
([D4](#d4-the-eyebrow-names-the-type-in-caps-above-the-title)), where it belongs.

Evidence: `A-3.58.53` (contact rows: name plus company, nothing else), `P-4.10.05`
(ticket rows: title plus "Created on 6 August 2026 · Paras Maroo"), `A-4.00.11` (sprint
rows: name plus date range). The one place the old app shows more fields is a **table**,
never a list ([K2](#k2-a-table-is-for-scanning-a-list-is-for-reading)).

**Logo placement in the name cell, 2026-09-15:** For rows that have a logo or mark —
Accounts, Apps, Deliverables — the company logo (or mark) sits to the left of the name,
**inside the same cell**. The logo and name form one unit in the cell's flex row, with the
logo leading (`shape.tsx` `shapeAccountsList`, `name` node + `nameText`).

### K2: a table is for scanning, a list is for reading

If a person needs to compare rows on the same attribute, use `DataTable` with named
column headers. If they need to find one record, use `List`. Do not smuggle table content
into list subtitles, which is what the five-part subtitle above is.

Evidence: `A-4.05.42` (a real table: NAME, TYPE, MODULE, ASSIGNED TO, CREATED ON with
uppercase headers) versus `A-3.58.53` (a real list). Both exist in the old app and they
are never mixed.

**The WORD retired, the SHAPE did not — see [K22](#k22-rows-are-a-list-never-a-banded-table).**
This entry is about the comparing-columns idea, which is still real: named column headers, a
person scanning across a row. What is gone is the SECOND, doubly-boxed shape a row-collection
used to draw by default — a grey, rounded, inset band around the very table this entry is
describing — and the word "table" as anything a person reads on screen. `RecordTable` still
draws named column headers a reader can scan across; it draws them flush and full-width, the
way `A-4.05.42`'s own uppercase-header table always looked, never boxed a second time inside
the card that already holds it. The distinction this entry draws (scanning vs. reading) is
untouched; the box around the scanning shape is what R80 deleted.

### K3: the count lives in the heading, formatted "N adjective plural"

"9 Open Stories". "16 Open Tickets". "21 Active Apps". "1 Open Issues".

This is R16's `formatCount` seam plus `CollectionHeading`
(`web/components/records/collection-heading.tsx`), which already renders the count as a chip
beside the `<h1>`. The change is the wording: the number leads, and the heading names the
filter state it is counting.

Evidence: `A-3.59.37`, `A-3.59.42`, `A-4.05.42`, `A-4.07.02`, `A-4.00.30`.

### K4: a tab that reveals a collection carries the count as a badge, and the heading stands down

Already law (R8, R16) and already arbitrated by
`web/components/records/counted-tabs.tsx`. Restated because the old app is a clean model of it:
"Backlog 11", "Tickets 16", "Ready 1", "Issues 1", "Questions 4", "Requests 24",
"Extras 170".

Evidence: `A-4.00.30`, `A-4.07.02`, `A-4.08.47`.

### K5: rows are separated by a hairline, never boxed individually

One `Card` around the whole collection ([C2](#c2-cards-have-no-border-no-shadow-and-no-hover-animation)),
then `divide-y divide-[--border]` on the row container. No border per row, no gap per row.

Evidence: `A-3.58.53`, `A-3.59.42`, `P-4.10.05`. Note `web-portal/components/ticket-row.tsx:39`
currently boxes each row (`rounded-xl border p-4`), and
`web-portal/components/waiting-on-you.tsx` and `delivery-block.tsx` do the same. Those
three are the migration targets.

### K6: rows group under a plain status heading

`text-lg font-medium`, no chip, no rule, no count.

Evidence: "Ready", "Pending", "In progress", "Blocked", "Scheduled", "Planned",
"Wrapped", "Not started" in `A-4.00.44`, `A-4.05.42`, `A-4.06.45`, `P-4.10.12`.

### K7: the collection toolbar is one row: heading, search, filter, add

Left to right on `sm` and up: `<h1>` with count, then `ml-auto`, then the search input,
then the filter button, then the add button. This is `headerLayout: "inline"`, already
the standard (UI-CONVENTIONS.md §6).

Evidence: `A-3.59.37`, `A-4.05.42`, `A-4.07.02`.

### K8: the filter control is an icon-only button when it has no active filter

> **AMENDED (14 Sep 2026, QA walk finding): the rule below is stale — the shipped filter
> pill has never been icon-only, on purpose, under two dated client rulings.**
> `shared/web/screen-engine/filter-bar.tsx` passes `addFilterLabel = t("Filter")`
> unconditionally to the kit's `KitFilterBar`: the word is always on screen, beside a
> `Badge` carrying the active-filter count. Two verbatim rulings, quoted in the source —
> **2026-09-02**: *"the toolbar shows a count and nothing else"* (the chip wall came off,
> the pill is what was left standing); **2026-09-03**: *"The count design should replicate
> the count design that we have on the top lines, like this Mango round background with no
> border behind the number,"* landed in `b2018c9f`
> (`feat(filter-bar): one container for the filter pill and panel, an always-on mango
> count, kit v1.2.33`), which is also where the label was fixed to the plain, un-numbered
> word "Filter" — the count moved into a real `Badge`, so the label no longer needed to
> fold a number into a sentence. Two dated, sourced rulings beat the undated old-app
> screenshots below; the shipped behaviour is the current one.

Old rule, kept as history: a funnel glyph in a `variant="ghost" size="icon"` button, with
no label, growing a label and a count only once a filter was applied.

Evidence for the old rule: `A-4.00.19`, `A-4.05.45` (bare funnel button beside the search
field) versus `A-3.59.37` (a wider "Filter" dropdown when the screen had facets in play).

### K9: a card grid is used only when the record has an image

Apps, accounts and deliverables have logos or thumbnails, so they may render as
`CardGrid`. Tickets, stories, tasks and sprints do not, so they never do.

Evidence: `A-3.58.58` (customer cards with cover images), `P-4.10.19` (deliverable cards
with video thumbnails) against `A-4.06.45` (stories as a table).

### K10: every collection screen shows a search box, and it is not the screen's choice

**The rule.** *"the toolbar, including the search, should be absolutely everywhere we have
a data view or a collection view. Stop hardcoding this. Just write it as a rule."* A
collection or data view draws its toolbar's search box **by default**. Not because the
screen's author remembered to switch it on — because switching it OFF is the thing you have
to write down and give a reason for.

Two places it can be decided, and both are held: a recipe-driven collection
(`web/lib/screens.ts`) carries `searchable: true`, and a bespoke
`<ToolbarRow>` passes a `search` prop. Either way out is the same named, rot-checked
registry entry, so the exemption list can only shrink.

**Why the default was flipped rather than the two screens fixed.** `searchable` and
`search` were ordinary optional fields, and two screens quietly omitted the second — Tasks'
Calendar tab and the Triage queue each drew a toolbar with a button and no search box,
reasoned only in a comment nothing reads at build time. **An opt-in can be forgotten by
omission, which is exactly what happened; an opt-out has to be written down and given a
reason a reviewer can read.** Note the client's phrasing: she was correcting a narrower
answer already given once.

**The one reason that was left standing has since been superseded**, and it is worth
reading as a lesson rather than a rule: a collection genuinely empty of rows used to keep a
bare toolbar carrying only its create button, on the grounds that a search box over zero
rows can do nothing. That is precisely how a lone create button kept escaping — this rule's
censuses ask whether `search` is PRESENT, never whether `actions` agrees with it. See
[K11](#k11-an-empty-collection-draws-no-toolbar-at-all-not-even-the-add-button), which now
answers that question for the whole row.

**And the half that does not stand on a toolbar at all (11 Sep 2026).** Every clause above
keys on a **tag the fix itself puts there** — a recipe, a `<ToolbarRow>`, a
`<CollectionHeading>` — so a wall of records built by hand is invisible to this rule by
construction. Settings › Modules shipped twelve cards and no search box under a green
build, and became visible to the rule the next day only because the client asked for the
toolbar and the screen gained a `<ToolbarRow>`. **A law you enter by being fixed is a law
that could never have caught you.** So the fourth subject is the **wall**: a component that
renders the kit's `CardGrid` or the kit's `List` over a `.map()` has declared itself a wall
or a register of records, and must draw a search somewhere in itself — a `<ToolbarRow>`, a
`<PagedFind>`, a `<SearchInput>`, or (on the portal) `useDoorSearch`. A wall that **pages**
cannot be excused at all; a bounded one is excused by a `path#Component` line in
`TOOLBAR_EXEMPT`, keyed per component so the next wall in that file cannot inherit a reason
written about a different collection.

**What it deliberately cannot see, and why that is the right trade.** A hand-rolled `<ul>`
is not a wall to this rule, and two real growing registers in the app are drawn that way.
No non-fuzzy predicate reaches them — the fuzzy one files a conversation thread and an
activity feed as data views, and **a false offender in a build gate is worse than a wall
the rule stays quiet about.** If you are building a list of records, reach for the kit part
and you will be told about the search box on the day you ship.

**Law.** [R48](../RULES.md) (`toolbar-shows-search`).

### K11: an empty collection draws no toolbar at all, not even the add button

**The rule.** While a collection holds **zero rows before anything narrows it**, the
toolbar does not exist. `<ToolbarRow>` takes a required `empty` prop and returns nothing
when it is true, **before** search, filters, sort, view or its own `actions` are
considered; `<PagedFind>` takes the equivalent `restingEmpty` for the door-searched half of
the app. The prop is derived from the collection's real row count — never a hardcoded
`{true}`/`{false}`, which is the row answering the question with a constant.

**And one layer down.** A section heading built from a `<div>` and an `<h2>` is not a
`<ToolbarRow>` and was outside the rule by construction, so five sections drew a create
button over an empty collection while the empty state underneath already offered the first
add. `AddButton` (the app's one create-button seam) therefore takes its own `empty` and
opens with the same early return, and every call site either sits inside a toolbar's
`actions` slot — where the row has already answered — or passes `empty` itself.

**One thing outlives the toolbar: its title.** Since the section heading moved inside the
container (C12), the row's empty exit is `if (empty) return heading` rather than
`return null` — otherwise a collection with no rows loses its name along with its controls.
`heading` is `title ? … : null` and nothing else, so the seventeen call sites that pass no
title are byte-identical to the old behaviour, and the check pins what the empty return may
*be* rather than proving its shape on the day somebody read it.

**Where the exceptions are.** `EMPTY_TOOLBAR_EXEMPT` in `shared/rules/registry.ts`, with a
reason each and rot-checked. It has never been empty, and every line in it is an
`empty={false}` written down on purpose. **Read the list, not this sentence.**

**The client's own correction**, after the same shape had recurred eight times over:
*"once again, when empty collection no toolbar at all — fix everywhere and set as a
rule."*

**Law.** [R50](../RULES.md) (`empty-toolbar`).

### K12: the toolbar's slots are the row's, in one order, and sort is a default

**The rule.** `<ToolbarRow>` draws five slots in one fixed order — **search → filters →
sort → view → actions** — and two of them, `sort` and `view`, are structured CONFIGS the
row builds the `<SortControl>` and `<ViewSwitch>` from itself. They are not
`React.ReactNode`: a slot that accepts anything enforces nothing. Nobody else in either
front door builds either control unless they are named in `TOOLBAR_CONTROL_OWNERS`, and
every call site passes a `sort`, or names its enclosing component in `TOOLBAR_SORT_EXEMPT`
with the real reason its rows have no order to offer.

**`view` needs no exemption list**, and that is a property of the control rather than a gap:
`ViewSwitch` draws nothing below two views, so a single-body collection is self-exempting.

**Why it exists.** The client put two of her own screens side by side — *"why the fuck i
still have different toolbar variations??? unify joder"* — and eleven of the eighteen
bespoke toolbars turned out to draw a sort control, **eight of them by handing it to
`search`**, the row's one growing slot, where a prop census cannot see it. That is the
hole: [K10](#k10-every-collection-screen-shows-a-search-box-and-it-is-not-the-screens-choice)
and [K11](#k11-an-empty-collection-draws-no-toolbar-at-all-not-even-the-add-button) ask
whether a prop is PRESENT, and the contents of a node slot are invisible to that question
by construction.

**Law.** [R53](../RULES.md) (`toolbar-slot-set`).

### K13: the gap under a toolbar is one number, and the row pays it

**The rule.** `<ToolbarRow>` carries `--toolbar-content-gap` as its own trailing margin, on
its own root, so every call site gets the right gap for free. **No call site pays it
again**: not by wrapping the row in a `flex-col` that also declares a `gap-*`/`space-y-*`,
and not by passing an `mb-*` of its own. Either is the same number spent twice, which is
how it grows past what it was meant to be.

**The value is shared with the tab strip on purpose.** `--toolbar-content-gap` spends the
same `--space-5` as `--tab-content-gap`, because both are "the gap between a control strip
and the content under it", and a system with one rhythm does not mint a second number for
the same sentence.

**Why it exists.** The client, in the spacing round: *"tehre's wahy too much space between
the toolbar and the contenta"* — on every screen she checked. It had drifted into five
different numbers doing the identical job across fourteen call sites: a wrapping
`flex flex-col gap-2` / `gap-3` / `gap-4` / `gap-6` (7.5px to 22.5px), a `space-y-3`, and a
`className="mb-4"` handed straight to the row. Four mechanisms, no owner.

**Law.** [R49](../RULES.md) (`toolbar-content-gap`).

### K14: the toolbar stays on top while the rows scroll under it, and the pin is the row's

**The rule.** *"on scroll down, i also want the toolbar to be on top all time visible.
everywhere."* Every component that owns a collection toolbar wears ONE class,
`PINNED_TOOLBAR` (`shared/web/pinned-chrome.ts`): sticky against `--pinned-chrome-h`, a
flex **column** so [K13](#k13-the-gap-under-a-toolbar-is-one-number-and-the-row-pays-it)'s
trailing gap sits inside a box that actually PAINTS, and a background of `--pinned-ground`,
the tone it is standing on — published by the ground class itself, so no screen is asked
which. Nobody writes their own offset.

**What it pins BELOW is a property that defaults to zero** and is raised by whatever pins
above it: a collection tab strip, a record screen's strip, or the portal's measured header.
A screen with nothing above its toolbar pins flush at zero and declares nothing.

**The container's own top band pins with the row**, which is her second sentence the same
day: *"when sticky toolbar, include also the top part of the container above it! if not
looks weird."* Pin the row alone and the card's top edge and its top inset both leave with
the scroll, so the bar arrives flush under the tabs, standing on nothing, touching a card
that no longer has a top. **And the band keeps the container's rounded top corners** —
her third sentence: *"When pin, I still want it round. That's exactly what I asked for, so
do whatever you have to do."* A rounded corner is a transparent notch, and the notch is
filled with what is behind the container, so it shows exactly what the real corners show at
rest.

**Two costs, both of them things a browser said and no source read could.**

1. **`position: sticky` is bounded by its own containing block.** A row boxed in furniture
   no taller than itself pins nowhere — 32px of range on the tickets Dashboard, against
   3,011 on Accounts. When that happens the pin moves OUT to the box; it is not fixed at
   the row.
2. **Two pinned toolbars on one collection land in the same band.** A container that
   already holds a pin stands the nested one down — and zeroes its lead and its side
   inset with it, because a rounded band of outside ground in the middle of a panel is a
   hole cut in the paper.

**Law.** [R63](../RULES.md) (`pinned-toolbar`). The one edge radius it draws is R31's own
value on one edge, which is why [T8](#t8-the-two-radii-are-spelled-the-kits-way) names this
position rather than treating it as a breach.

### K15: the two zeros look the same; the add button is the only difference

**The rule.** A collection has two empty states and they are different FACTS. **Resting**:
it holds no rows at all, first run, the screen exists to be filled. **Filtered**: it holds
rows that a search, a tab or a facet has narrowed to none — nothing is wrong, the reader
asked a question with no answer. Each front door draws BOTH through ONE component —
`CollectionEmptyState` (`shared/web/screen-engine/collection-frame.tsx`) on the agency
door, `PortalEmpty` (`web-portal/components/portal-empty.tsx`) on the portal — which takes
a `filtered` prop, swaps the words on it, and **withdraws the create action on it**.
Everything else is drawn identically.

**The subtraction happens inside the component, never at the call site.** A caller hands
its create action over unconditionally and cannot forget to gate it — the same lesson
[K11](#k11-an-empty-collection-draws-no-toolbar-at-all-not-even-the-add-button) learned
about `empty`, one component along. And the title and description are read only at rest,
because "No accounts yet." is a claim about the collection and it is plainly untrue while
somebody is searching it.

**Why it exists.** *"the empty because of filters hosul look the same as empty collection
but the add button."* They did not. The resting zero had a good shared register and the
filtered one had none: of 113 zero-row render sites in the agency app, 34 drew the real
register and **43 were bare grey `<p>` tags** — twelve of them literally the same sentence
copy-pasted into eight files. In every one of those eight the two zeros sat in ONE
component four lines apart, so a reader flipped between two different-looking screens by
typing one letter. The kit's own second register differed in four ways nobody had decided:
a different inset, a different title step, a different body measure — and its fallback
words were English defaults inside the kit, in no catalogue, translated nowhere.

**And the button was wrong in both directions**: on the door-searched half, a search that
matched nothing read as "this collection is empty" and drew *"Add the first"* over a list a
term was hiding.

**Law.** [R62](../RULES.md) (`one-zero-register`).

### K16: on a card that stands for a record, the chip sits above the title

**The rule.** *"in team, adn generlaly in this component write the law, chip on top of
title & bigger images."* On a card that stands for one record, every `<Badge>` opens
**before** the title in source order — and in a card, which is a flex column, source order
IS visual order. The card names its record through the kit's own `<CardTitle>`, not a
hand-rolled `<span>`.

**Why the title part is not optional.** "Above" is a statement about position, and a title
rolled into a bare `<span>` has no position anything can read: `members-gallery.tsx` drew
its member's name exactly that way, so a chip-position census over that file would have
reported a perfectly ordered card while looking at nothing at all. Same move
[K12](#k12-the-toolbars-slots-are-the-rows-in-one-order-and-sort-is-a-default) made when it
took the toolbar's slots off `React.ReactNode`.

**Which cards.** A card that stands for a record is one drawn per row of a collection, and
the test for that is React's own: such a card carries a `key`, and a card that is a panel
around a section does not. The partition comes from a rule that predates this app and that
no author here can quietly redefine.

**Why it is a law.** She had to say it twice — the Kanban card was fixed on its own in
September and the member card shipped the opposite way a day later, green, because nothing
in the build knew the two were the same question.

**Law.** [R65](../RULES.md) (`chip-above-title`).

### K17: the options a control offers are A to Z, in the reader's own language

**The rule.** *"In settings, automations, make sure that in the sort component, in the
modules component, you sort it A to Z. This here, but everywhere in the app, make it a
law."* A CHOICE a control offers — a filter facet's options, a `<Select>`'s items, a
picker's list — is alphabetical, comparing the label a person reads, locale-aware
(`sortedOptions()`, `shared/web/sorted-options.ts`, `localeCompare` against the app's
CURRENT language from `useLanguage()` — never the browser's own locale, and never a plain
`.sort()`). This is a statement about CHOICES, not ROWS: a collection's own records keep
the sort control [K12](#k12-the-toolbars-slots-are-the-rows-in-one-order-and-sort-is-a-default)
already gives them.

**One seam carries the client's own example for free.** Every [K7](#k7-the-collection-toolbar-is-one-row-heading-search-filter-add)
filter facet — declared options or derived from the rows on screen — renders through
`shared/web/screen-engine/filter-bar.tsx`'s own `optionsFor`, the one chokepoint every
facet on both front doors passes through. Sorting its result there is what puts Settings ›
Automations' Module and Status filters — her named example — and Settings › Choices'
beside them, in order, without a second line at either screen's own `filterFacets`
declaration.

**The rest is fixed at the point a control is built**, not where its data happens to be
computed: the array handed straight to a hand-rolled `<Select>`/`<SelectItem>` `.map()`,
or to a picker's `options` prop, opens with `sortedOptions(`.

**The one thing that must NOT sort.** A control whose list is not a naming vocabulary at
all — a size SCALE (Compact→Regular→Large, `shared/web/scale-section.tsx`, the client's
own example of the shape this rule does not touch), a frequency (day→week→month→year), a
step's place in a workflow somebody actually designed, a TEAM's own drag-ordered
vocabulary (an app's stage, a sprint or story type — `selectable_data`, the same
protected order R70 already holds a switch's own visibility to) — is named in
`ORDERED_OPTIONS_OK` (`shared/rules/registry.ts`) with the real reason, reasoned per entry,
rot-checked both ways. **A collection's own "sort by" menu is a different question
entirely** — `CollectionConfig.sortOptions`/`COLLECTION_SORTS` says WHICH FIELD to order a
collection BY ("Newest first", "Priority order"), a designed landing sequence
(`web/lib/collection-sorts.ts`'s own header), and this law does not reach it.

**Law.** [R75](../RULES.md) (`alphabetical-options`).
