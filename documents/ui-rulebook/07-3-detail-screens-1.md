# 3. Detail screens (part 1 of 3)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### D1: a detail screen has exactly four regions, in this order

1. **Breadcrumb bar** (sticky, dark, from the shell)
2. **Header band**: type mark, eyebrow, title, status line, at most two buttons
3. **Tab strip** (sticky, on plain background)
4. **Tab panel**, and pinned at the very bottom of the panel, the **audit footer**

Nothing else may sit between 2 and 3.

Evidence: `A-3.57.42`, `A-3.59.09`, `A-4.05.45`, `A-4.05.52`, `P-4.10.05`, `P-4.10.12`.
The shape is identical on every record type in both old apps. The one permitted
exception is a warning band between 2 and 3 ([C8](#c8-a-warning-band-is-amber-text-on-an-amber-tint-full-width-directly-under-the-header), `A-4.07.25`).

### D2: the header band is the only ambient surface on the screen

```tsx
<header className="flex flex-wrap items-start gap-4 px-4 pt-6 pb-8 sm:px-6 lg:px-10">
```

Transparent, so the ambient field shows. Its layout is: a 56px (mobile) to 72px (desktop)
rounded square holding the type glyph or logo, then a column with the eyebrow, the title
and the status line, then the action group pushed right with `ml-auto`.

Evidence: `A-3.59.09` (app detail), `A-4.05.45` (sprint detail), `A-4.05.52` (story
detail), `A-4.07.25` (ticket detail), `P-4.10.05` (portal app detail). Same band, five
record types, two apps.

### D3: the header and tabs stick

> **SUPERSEDED IN PART, 3 Sep 2026 — the header does NOT collapse any more.** The
> client, on the live app: *"when I scroll down, the whole compressed title is
> useless, so remove that. When I scroll down, what is at the top should be only
> the tabs, if there are tabs, on the same line as the whole eyebrow."* The
> collapsed line this section describes was built (`web/components/
> condensed-title.tsx`) and is now deleted. What survives is the second half:
> **the tab strip pins, and it is the only thing that does** — on a record detail
> screen (`STICKY_TABS`, record-chrome.tsx) and on a main/collection screen
> (`STICKY_FOLDER_TABS`, shared/web/screen-engine/tabs-view.tsx), both at
> `top: 0` now that nothing sits above them. A screen with no tabs pins nothing.
> The IntersectionObserver sentinel below is no longer used by anything.

On scroll, the header band collapses to a single sticky line (glyph at 28px, title at
`text-sm font-medium`, breadcrumb trail visible) and the tab strip pins directly under
it. The full title, the eyebrow and the status line scroll away.

```tsx
<div className="bg-background sticky top-0 z-10 border-b">
  {/* collapsed title line, then the TabsView */}
</div>
```

Detect the collapse with an `IntersectionObserver` on a zero-height sentinel placed at the
bottom of the full header band. No library change: `TabsView` takes a `className`.

Evidence: compare `A-4.00.19` (header full, tabs at y≈653) with `A-4.00.30` and
`A-4.00.37` (header scrolled away, the same tab strip pinned at y≈494 with the tab labels
and badges intact). The tabs demonstrably stick in the old app.

> **AMENDED 2026-09-15 — A MAIN SCREEN DRAWING ITS OWN PANEL CONTENT OWNS THE
> SAME SEAM, EVEN THOUGH IT LOOKS LIKE A RECORD DETAIL'S SHAPE.** The client's
> ruling, over Settings specifically: *"When I scroll down in settings, the
> tabs do not stay pinned at the top. Make sure you fix this here and
> everywhere else. Should be the same behavior when scrolling down: the tab
> should stay visible."* `settings-screen.tsx` drew `<TabsView config={…}
> value={tab} onValueChange={…} renderPanel={(panel) => …}>` — ONE `<Tabs>`
> root holding both the tablist and every panel's `TabsContent` — with no
> `className` at all, so the strip scrolled away with the page. Handing that
> same root `STICKY_FOLDER_TABS` (above) would not have fixed it: unlike
> `STICKY_TABS`, `STICKY_FOLDER_TABS` is not scoped to `[role=tablist]` alone,
> so a `<Tabs>` root that also wraps the panel would pin the PANEL along with
> the strip — sticking the whole screen's content to the top of the
> scrollport the moment it engaged, which is worse than the bug it fixes. The
> real fix is the split every collection screen already draws: the strip
> renders through `renderFolderTabs` as a SIBLING of its panel, and the panel
> is a plain function called for the current tab, never a `TabsContent`
> inside the sticky root. Two other main screens drew the identical bare
> shape — `screens/kwapso-screen.tsx` and `screens/module-settings-screen.tsx`
> — and were named as a known, dated gap in `TAB_STRIP_PIN_EXEMPT`
> (`shared/rules/registry.ts`) rather than silently left for a narrower
> census to stop seeing; both were split the same way within the day
> (`kwapso-screen.tsx` by this law's own lane, `module-settings-screen.tsx`
> by the Choices lane), and both lines came back out — the client's
> "everywhere else" read literally.
>
> **Law.** [R77](../RULES.md) (`tab-strips-pin`). A static census: every
> `<TabsView` mount in `web/` and `web-portal/` either is reached through
> `renderFolderTabs` (so no literal `<TabsView` text names it at all) or
> carries `STICKY_FOLDER_TABS`/`STICKY_TABS` in its own `className`, or is
> named in `TAB_STRIP_PIN_EXEMPT` with a reason — today, four nested view
> switches and one route-navigation strip, none of them a screen's own
> labelling strip.

### D4: the eyebrow names the type, in caps, above the title

> **REVERSED, 3 Sep 2026 — there is no eyebrow anywhere in the app.** The client:
> *"I want you to remove the eyebrow on the title on main screens. Remove that
> eyebrow, kill it."* A detail screen's full header had already lost its eyebrow
> on 1 Sep (the breadcrumb above it names the record type instead); the prop that
> kept it alive existed only for the condensed bar D3 above describes, and both
> went on 3 Sep. A main screen's own eyebrow — the nav-section word — went with
> the same ruling: the rail already shows that word above the screen's own row.
> `RecordScreen` has no `eyebrow` prop any more; do not re-add one from this
> section. The `.nk-subheading` type style below is still the app's label style,
> reached by table column heads and other small caps labels.

```tsx
<p className="text-muted-foreground text-xs font-medium tracking-[0.5px] uppercase">
  {typeLabel}{ref ? ` ${ref}` : ""}
</p>
```

"MEETING", "TASK", "APP PRODUCTION", "REQUEST #3512", "CHANGE #3182", "ROADMAP". The
reference number joins the eyebrow, not the title.

The brand site has exactly one label style and this is it: `.nk-subheading` is Saans 500
at 12px on 18px, uppercase, letter-spacing 0.5px. `text-xs` (14px, the theme floor) plus
`font-medium` (500) plus `tracking-[0.5px]` is that style expressed in this theme.

Evidence: `A-3.57.42`, `A-3.58.01`, `A-3.59.09`, `A-4.05.52`, `A-4.07.25`, `P-4.10.05`.
Note the old app puts the type and the number together (`CHANGE #3182`) and leaves the
title as pure prose. This app used to prefix the ref into the title string, which is why
titles read as noise. *(Fact updated 7 Sep 2026: fixed, and this rule is what fixed it.
`shapeHelpList` in `web/components/deep-link/shape.tsx` now sets `name` to the title
alone — `truncate(richTextPlain(t.description))` — and the ref leads the eyebrow on the
record's own screen, which is where D4 puts it.)*

### D5: one status line under the title, dot-separated, three facts maximum

```tsx
<p className="text-muted-foreground text-sm">{parts.join(" · ")}</p>
```

"Scheduled · Assigned to Ishita". "Active · 10 August to 22 August 2026". "In progress".

Evidence: `A-4.05.45`, `A-4.05.52`, `A-4.07.25`. Never more than three parts in any old
screenshot.

### D6: a title carries at most two buttons; everything else goes in the three-dot menu

The full rule and the ranking are in [B1](#b1-two-visible-actions-maximum-on-any-title).

### D7: the audit footer is pinned to the bottom of the panel and is grey

"Created by X on DATE" and "Last edited by Y on DATE" leave the Overview tab and become a
footer strip at the end of every tab panel.

```tsx
<footer className="bg-muted text-muted-foreground mt-8 flex flex-wrap gap-x-6 gap-y-1
                   rounded-xl px-4 py-3 text-xs">
  <span>Created by {createdBy} on {createdAt}</span>
  <span>Last edited by {updatedBy} on {updatedAt}</span>
</footer>
```

Evidence for the treatment: `brand.css` `.nk-footer { background-color: var(--color-scheme--dark-background); }`,
which is the *same* beige as every card, sitting straight on the page with no rule or
divider above it, and `.footer-credits { font-size: 12px; font-weight: 300; }`. Its link
items carry `opacity: .5` deliberately. The brand's own footer is the paper tone, small,
light and faded, which is exactly the register an audit line needs: present, findable,
and never competing with the record. Evidence for the
content and the move: `A-4.07.25` currently shows "Created on / Created by" as the last
two rows of the Input panel, and `P-4.10.05` compresses the same two facts into a single
subtitle line, "Created on 6 August 2026 · Paras Maroo".

Today the audit block is assembled by `web/lib/audit-overview.ts` and rendered into
Overview. Move the call site, keep the function.

### D8: a related record is a card, not a row of labels

```tsx
<a className="bg-card flex items-center gap-3 rounded-xl p-4">
  {logo}
  <div className="min-w-0">
    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">APP</p>
    <p className="truncate font-medium">HORST</p>
  </div>
  <ChevronRight className="text-muted-foreground ml-auto size-4" />
</a>
```

Evidence: `A-3.59.09` ("CUSTOMER / Kwapso"), `A-4.05.45` ("APP / HORST"), `A-4.05.52`
("APP / HORST", "MODULE / Besetzungen"), `A-4.00.30`. Uppercase relationship name,
bold value, chevron only when it navigates.

### D9: a sub-collection inside a detail gets a heading and one icon-only button

Worklog, Tasks, Backlog and Stories inside a record each render as `text-lg font-medium`
plus a single icon button in the top right.

Evidence: `A-4.06.12` (Worklog with a stopwatch button, Tasks with a plus button),
`A-4.07.34` (Backlog with a plus button).

### D10: field labels inside a panel are small caps grey; a field group is a description list

```tsx
<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">DESCRIPTION</p>
```

For label-and-value pairs use the library `DescriptionList` with
`{ ...defaultDescriptionListConfig, columns: 2, surface: "none" }`. Hairline separators
between rows, no card, no border around the group.

Evidence: `A-3.57.42`, `A-3.58.01`, `A-4.05.52` ("TICKET", "DESCRIPTION", "BUILD NOTES",
"SCREENSHOTS", "MEMBER", "DURATION"). `DescriptionList` already ships with exactly this
config shape.

### D11: every detail screen wears the same title treatment, and it comes from one constant

**The rule.** The 80% title-to-actions split and the head's own container query are ONE
exported string, `RECORD_TITLE_TREATMENT` in `shared/web/record-heading.tsx`. This app
draws a record detail two ways — the hand-composed `*-detail.tsx` screens through
`RecordScreen` (`web/components/records/record-chrome.tsx`) and the recipe-driven ones
through `renderDetail` (`shared/web/screen-engine/screen-renderer.tsx`) — and **both** apply
that exact constant and import it from that file. No call site passes a `titleSize` of its
own.

**AMENDED 2026-09-22: the title's SIZE stopped living here, kit v1.2.150.** Until this date
`RECORD_TITLE_TREATMENT` also carried `RECORD_TITLE_SIZE`, a descendant selector forcing the
h1/44 step from outside, because the kit's `Title` primitive had no h1 rung for
`RecordDetail`'s `titleSize` to ask for directly. The client's later, standing typography
ruling caps every screen and record title at 32px, and the kit moved `RecordDetail`'s own
`titleSize` default from h1 to h2 (32px) at the source, so the override's one reason to exist
: reaching a step the kit's default could not reach: was gone; keeping it would have been a
second, competing answer to a question the kit now answers correctly. `RECORD_TITLE_SIZE` is
removed, and `RECORD_TITLE_TREATMENT` carries only the split and the container query below.

**Why a constant and not a class.** The 44px title was a real fix for a real correction
(*"title on main screens still way too small!"*) and it was written as a PRIVATE constant
inside the first of the two paths. The second path never saw it and fell through to the
kit's own `h3` default, so five recipe details — the team's own landing screen among them —
set a record's name at 24px while thirteen sibling screens set it at 44px. A 20px step,
and every pixel of it lands on the tab strip below, which is the height the client was
actually pointing at. Nothing was red and nothing could have been: a default on one path
and a class on the other is not a contradiction any type or any test can see, and neither
file names the other. Contrast the tab-strip gap, which was uniform on both paths the whole
time, because it had been made a token rather than a class in one file.

**The standing instruction behind it**, which the client has now given three times:
*"i dont want you to hardcode fixes for single pages, but to state rules about
components."*

**Law.** [R52](../RULES.md) (`record-title-treatment`).

### D12: a screen showing one record asks the door for that record, never the loaded page

**The rule.** A screen that shows ONE record out of a collection that PAGES must read that
record **by id** — a dedicated per-record door, or a `<module>:one:<id>` cache key beside
the list. Never `find` over the cached list, which holds only the prefix that has been
loaded. The by-id key then has to reach a live listener like any other key, or a status
change patches the list and leaves the open record showing yesterday.

**What it costs.** Nothing, on a BOUNDED collection: where page one IS the collection
(apps, member roles), a `find` is honest and the rule does not reach it.

**Why it exists.** The owner opened a ticket from the triage queue and was told *"That
ticket no longer exists."* It existed — number 1,030 of 1,820 on staging — and the whole
lookup was a `find` over the newest fifty rows. Every ticket past the cursor was
unreachable by direct link, from an email button, from a bookmark, and the screen made the
most alarming claim available to it on a collection whose entire point is that it grows.
The door had accepted an id the whole time.

**Law.** [R38](../RULES.md) (`details-ask-the-door`).

### D13: member detail head carries a role chip above the title, with one pencil for change

**The rule.** The client's ruling, 2026-09-15: *"role chip above the title, actions = Change
role + a visible pencil, Remove in the ⋯ menu; the footer draws both sections (Record +
Latest activity) like every record."* A member's detail screen (`web/components/team/member-screen.tsx`)
renders the role as a **chip positioned above the title** (following [K16](#k16-on-a-card-that-stands-for-a-record-the-chip-sits-above-the-title)).
The primary action is "Change role" with a visible pencil icon, and a destructive "Remove"
action lives in the three-dot menu. The footer draws TWO sections: one for record fields and
one for Latest activity, the same layout every detail record uses — never a custom footer
for the member screen alone.

**Law.** Not yet a registry check. Written to establish the shape.

### D14: the record head carries the record's mark inline with the title (B1), title height unchanged

**The rule.** The client's ruling, 2026-09-15: *"For cover and logo, I choose B1. Apply this
on apps, accounts, and team members."* B1 is Component B, variation B1 of the artifact
(https://claude.ai/code/artifact/ab68749e-6970-4fc1-a7f6-eb220c7f2900): the account/app's
logo, or the team member's avatar, sits **inline left of the title, on the title's own
line** — never a row of its own above or below it, and never a second image alongside
D8's related-record cards. `RecordScreen`'s `mark` prop (`web/components/records/record-chrome.tsx`)
is what draws it, through `RecordMark`/`AppMark` exactly as every list row and tile already
does (G3).

**Title height is unchanged, by construction, not by eye.** The mark's own box is sized to
the title's line box: `calc(var(--text-3xl) * var(--text-3xl--line-height))`, the h2 step's
own two tokens, the step the kit's `RecordDetail` renders a record's title at by default
since kit v1.2.150 (2026-09-22; this box tracked `--text-4xl`, the h1 step, until then, back
when the app forced h1/44 from outside through the app-side `RECORD_TITLE_SIZE` override,
since removed: [D11](#d11-every-detail-screen-wears-the-same-title-treatment-and-it-comes-from-one-constant)'s
own section has the account) — never a pixel figure picked to look right on one screen. The
row is `items-center gap-3` (the kit's `--space-3`),
so the row's own height is the title's line-box height and nothing taller sits beside it to
push it open. [D13](#d13-member-detail-head-carries-a-role-chip-above-the-title-with-one-pencil-for-change)'s
role chip stays exactly where it was: above the title, untouched — the mark sits beside the
title itself, one level down from the chip row, never merged into it.

**Narrow on purpose.** The ruling names three record kinds, not "everywhere" — every other
`*-detail.tsx` screen still on the pre-2026-09-01 `mark={appStageMark(...)}` /
`mark={kindMark}` shape (a bare glyph string, not a picture) stays exactly as inert as the
2026-09-01 ruling ("under no case — images on title. remove it everywhere") left it: `mark`
only draws when a caller hands it a real node, never a string — the discriminator
`RecordScreen`'s own doc comment on the prop explains in full.

Evidence: the artifact's own Reference section, built when the title still sat at h1/44,
computed the title's line-box height as the sum of the kit's stack (breadcrumb, band inset,
pill row, gap, `--text-4xl` line box) and checked every B1 frame against that same line: the
account, the app and the team-member mocks all landed on it. That arithmetic is history now
that the title itself sits at h2/32 (see the amendment above); the live construction is
identical, only the two tokens it reaches for moved with the title.

**Law.** Not yet a registry check. Enforced by `web/test/record-head-mark.test.tsx`
(the title's own wrapper carries an identical class with or without a mark; the mark is a
sibling inside the title's own row, never a row of its own; the box is read off source as
derived from `--text-3xl`/`--text-3xl--line-height`, never a literal pixel value; a string
`mark` stays inert).

**AMENDED 18 Sep 2026 — the chip row above the title moves in, her pick is C2 (8px).** The
client's ruling, verbatim: *"reduc the space between chips and title."* The identity chips
row that sits above the title (D13's role chip, and every other record's plain identity
pills) had been carrying `mb-[var(--space-4)]` (16px) under it since the 2026-09-01 ruling
that first gave the pill row its own gap from the title. A side-by-side artifact was built
per this book's own working agreement, and her pick, verbatim, was *"t1 and c2"* — **C2**
named as half of the gap that was live that day, i.e. half of 16px. The chip row now spends
`mb-[var(--space-2)]` (8px), not `--space-4`, above the title — `record-chrome.tsx`'s own
header comment carries the ruling in full. Enforced by
`web/test/record-head-chip-gap.test.ts`.

### D15: a calendar span within a detail screen uses S2's horizontal gutters

**The rule.** The client's ruling, 16 Sep 2026: *"calendar spans = S2 start-and-end caps."* A calendar drawn inside a detail screen (where it appears — the Waves timeline, the Sprints view, the Inputs week, the Stories week) applies the same horizontal gutter that S2 sets for the detail screen's own horizontal extent: `px-4 sm:px-6 lg:px-10` on the calendar container, so its left and right edges align with the detail screen's own content, and the calendar grid or day cells do not over-extend into the gutter dead space. The calendar component itself (`RecordCalendar` or `RecordTimeline`) inherits these class restrictions from its container, not from the detail shell's own S2 rule — the component can be reused in other contexts where S2 does not apply.

**Calendar hover card (16 Sep 2026):** *"when I hover over the card in the calendar, it expands and I see what it is"* — client. Hover (300 ms) or focus opens a card with title, kind, dates; tap on touch (kit v1.2.94 `renderEventCard`, record-calendar.tsx).

**Not a law.** This is a layout consistency decision recorded here for the next reader, same as K24's Calendar span implementation (shipped start-day-only on 15 Sep; spans since v1.2.90, 16 Sep).

### D16: a record's cover is a band above the head, on accounts and members

> **RETIRED, 16 Sep 2026, same session.** The client's ruling, verbatim, reversing her own
> C1 pick above: *"I changed my mind. Let's remove this completely."* The cover band is gone
> from both screens — `RecordScreen`/`RecordChrome` no longer take a `cover` prop at all
> (`record-chrome.tsx`'s own removal note), and neither `account-detail.tsx` nor
> `member-screen.tsx` renders one above the head any more. **What stays:** migration 0102's
> `staff_profiles.cover_url` column, and the accounts table's own equivalent — the data
> survives even though no head band reads it that way, and `account-detail.tsx`'s
> pre-existing Overview-tab `RecordCover` still reads `account.coverUrl` lower on the page,
> unrelated to this ruling. Nothing else about B1 (the record's mark inline with the title,
> client ruling 2026-09-15, applied on apps, accounts and team members) is touched — that
> stands on its own and is not what got removed here.

**The rule, as it stood before removal.** The client's ruling, 16 Sep 2026, choosing from a
mocked artifact: *"For the cover, let's try C1. I want this for accounts and members."* A
cover band renders above the B1 head (the record's mark inline with the title) on an
account's and a member's own detail screen: a fixed-height band, `object-cover` (R60 —
never shrunk to fit), a quiet tint fill and no placeholder image when the record carries no
cover.

**The mechanism, as it stood.** `RecordCoverBand`, drawn through the kit's own banner slot.
Set the same way the logo/avatar already is, from the record's own edit door — no separate
upload surface. `staff_profiles.cover_url` was added by migration 0102; the accounts
table's own equivalent column followed the same shape.

**Law.** None registered — the band was never censused, and neither is its absence.
