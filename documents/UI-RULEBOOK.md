# UI-RULEBOOK.md

How screens in this app are arranged, so that a person reading one has less to hold in
their head. This is a **rearrangement** rule book, not a redesign: every rule here is
expressible with the components `shared/ui/` already ships and the tokens the theme
already defines. Nothing in this document asks anyone to change a component — which was
originally because nobody here could (the library was an npm package from another
repository until 2026-08-22), and is now a deliberate scope line: these are arrangement
decisions, and they should hold whatever the reskin does to the lego underneath them.

**Its relationship to the other law books.** [UI-CONVENTIONS.md](UI-CONVENTIONS.md) is
the *enforced* law — it carries the table of every law in `shared/rules/registry.ts` with
`dimension: "ui"`, plus the action-icon mapping; it stays in force and nothing here
contradicts it. This file is the layer above: the arrangement
decisions those laws leave open. Where a rule here would change an enforced law, it says
so out loud and proposes the in-rule route (see [Rule G1](#g1-a-record-type-carries-a-glyph)
and [Conflicts to settle before building](#conflicts-to-settle-before-building)).

**Where the rules come from.** Two sources, cited on every rule:

- The legacy Glide apps the team is leaving, which they liked. Cited as
  `A-3.55.34` (agency screenshots, `~/Downloads/agency app laptop and mobile screenshots/Screenshot 2026-08-17 at 3.55.34 PM.png`)
  and `P-4.10.31` (client portal screenshots, same date, `kwapso portal laptop and mobile screenshots/`).
  One agency file is dated 2026-08-14 and is cited as `A-4.21.24 (08-14)`.
- The brand site `https://kwapso.com`, whose real stylesheet is
  `https://cdn.prod.website-files.com/688b4337fa679990e06aceaa/css/kwapso-2.webflow.shared.57dc3eb31.css`.
  Cited as `brand.css`.

Where a rule is an inference rather than a direct reading, it is marked **(inferred)**.

**Format.** Each rule has an id you can cite in a pull request, one sentence of law,
the concrete implementation, and its evidence.

---

## Contents

- [0. The diagnosis: three findings that explain most of the complaints](#0-the-diagnosis-three-findings-that-explain-most-of-the-complaints)
- [1. Colour and surface](#1-colour-and-surface) (C1 to C13)
- [2. Page layout and width](#2-page-layout-and-width) (L1 to L43)
- [3. Detail screens](#3-detail-screens) (D1 to D23)
- [4. Collections](#4-collections) (K1 to K62)
- [5. Buttons and actions](#5-buttons-and-actions) (B1 to B49)
- [6. Forms and dialogs](#6-forms-and-dialogs) (F1 to F18)
- [7. Typography](#7-typography) (T1 to T9)
- [8. Spacing, and the scale setting](#8-spacing-and-the-scale-setting) (S1 to S7)
- [9. Mobile](#9-mobile) (M1 to M6)
- [10. Copy](#10-copy) (W1 to W15)
- [11. Record type glyphs](#11-record-type-glyphs) (G1 to G6)
- [12. Density: the glance budget](#12-density-the-glance-budget-n1-to-n12) (N1 to N12)
- [13. The kit, and what counts as using it](#13-the-kit-and-what-counts-as-using-it-u1-to-u4) (U1 to U4)
- [What the old app did better](#what-the-old-app-did-better)
- [Do not do](#do-not-do)
- [Conflicts to settle before building](#conflicts-to-settle-before-building)
- [Rule index](#rule-index)

---

## 0. The diagnosis: three findings that explain most of the complaints

Read this before the rules. Three concrete facts in the codebase account for the
majority of what the owner and Aurora reported, and two of them are one-line fixes.

### Finding 1: the card is not pink, it is transparent

The theme is already right. `shared/ui/foundations/tokens/tokens.css` sets
`--card: #f7f2ea` (kw-soft-paper) on `--background: #fffef9` (kw-off-beige). The brand
site independently sets `--color-scheme--dark-background: #f7f2eb` for every card and
`--color-scheme--background: #fffdf8` for the page (`brand.css`, confirmed by computed
style at two viewport widths: `rgb(247,242,235)` on `.bento-hero`, `rgb(255,253,248)` on
`body`). Those are the same two colours to within one unit. **The card colour the owner
is asking for is the token that is already there.** Note the page is warm off-white, not
white; the separation between page and card is about three per cent lightness, and that
near-invisible step is the signature of the brand.

What makes it read pink is two files fighting:

1. ~~The library defines the card surface as fully opaque paper.~~ **CORRECTED
   2026-08-19: it never did, and this line is why a dialog shipped unreadable.**
   `.glass` in the library is
   `background-color: color-mix(in oklch, var(--card) 72%, transparent)` with a
   `backdrop-filter`, and the comment above it reads *"Frosted glass: a
   translucent pane that blurs (refracts) what's behind it."* The quoted brand
   line does not appear in `styles.css` at all. Two further claims in this
   section are also untrue of it: `--card` is `oklch(1 0 0)`,
   not `#f7f2ea`, which appears nowhere in the file. A paragraph of confident
   detail about a dependency, written once and never re-read against it, is how
   `shared/web/library-overrides.css` came to delete the one rule holding a
   dialog together. (The library stopped being a dependency on 2026-08-22 and now
   sits in `shared/ui/`, which makes it cheaper to re-read but no more likely to
   be re-read. The habit is the point, not the address.)
   **What is true now:** `.glass` is still translucent and is still what a CARD
   uses, deliberately. Every FLOATING surface — dialog, sheet, alert-dialog,
   popover, dropdown, hover-card, select, command — is opaque `bg-card` /
   `bg-popover`, which upstream settled in v0.13.0 and the vendored copy carries.
   **Its guard did not come across:** upstream held that with a census test that
   failed the build if a ninth floating surface shipped without an opaque fill,
   and the vendoring copied `registry/`, `lib/` and `styles.css` — not the
   library's own suite. A ninth one is on the person who adds it.
2. `shared/web/library-overrides.css:12-14` then makes it translucent again:
   `.glass { background-color: color-mix(in oklch, var(--card) 94%, transparent); }`
3. `web/app/globals.css:32-56` paints three blurred mango pools (`#fecc6d`) behind
   everything, drifting on 47s and 61s loops (`kw-drift-a`, `kw-drift-b`).

`Card` carried `glass` in its base class
(then `registry/primitives/card/card.tsx`; the kit's paths are `controls/…` since
2026-08-24, and the `glass` default is gone from the vendored kit — the fix is the
first **Done.** row in "The seven files that carry most of it"), so at the time **every card,
dialog, popover, dropdown menu and sheet in the agency app is six per cent see-through
onto a slowly moving orange field.** Warm beige plus a mango bleed reads as pink, and
because the field drifts, the card colour changes while you look at it. That is both the
"pink card" and the "animations" complaint, from one override.

### Finding 2: two thirds of a wide screen is empty margin

`web/components/deep-link/deep-link-screen.tsx:330` is the only width cap in the agency app and it
governs every module screen:

```
className={`mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-xl transition-shadow ...`}
```

`max-w-3xl` is 768px. On the 1283 CSS-pixel laptop the screenshots were taken at, the
main region after the 240px sidebar and `px-4` is about 1043px, so each side gutter is
about 138px. On a 2560-pixel display the gutters are over 700px each. Meanwhile the
Glide app runs edge to edge with roughly a 45px gutter and no cap at all
(`A-4.06.36`, `A-4.05.42`). See [L1](#l1-one-page-container-one-cap).

### Finding 3: nothing in this app has an overflow menu

`MoreHorizontal`, `MoreVertical` and `EllipsisVertical` appear **zero times** across
`web/`, `web-portal/` and `shared/`. `DropdownMenu` is imported in exactly four files,
all of them chrome switchers (`profile-menu.tsx`, `team-switcher.tsx`,
`web-portal/components/account-switcher.tsx`, `shared/web/language-menu.tsx`). So every
action a record has is a visible button, which is why the ticket detail grew six on the
title line plus two below (`web/components/tickets/help-detail.tsx:418-539`). The three-dot menu
is net-new work, and it is the single highest-leverage change in this document. The old
app had one on every record (`A-3.57.42`, `A-4.05.52`, `A-4.07.25`).

---

## 1. Colour and surface

### C1: the page is off-beige, the card is soft paper, and that is the whole surface system

Two surfaces only. The page is `bg-background` (`#fffef9`). Anything raised off it is
`bg-card` (`#f7f2ea`). There is no third tone, no tinted panel, no coloured section.

Evidence: `brand.css` defines exactly two paper values, `--color-scheme--background: #fffdf8`
and `--color-scheme--dark-background: #f7f2eb`, and every card class on the site
(`.blueprint__card`, `.bento-small-item`, `.ab-team__bento`, `.blueprint__workshop-item`,
`.infographic-dashboard`, `.nk-solution__container-wrapper`, `.contact-form__field`) uses
the second one. `styles.css:84,87` already carries both.

### C2: cards have no border, no shadow and no hover animation

> **AMENDED by [N5](#n5-the-surface-step-is-measured-not-assumed) (18 Aug 2026): the card
> KEEPS its border.** The light theme separates page from card by only ΔL\* 3.22, which is
> below the threshold at which the eye reads two surfaces as separate, so a borderless card
> is invisible in light mode. Dark mode separates them by ΔL\* 10.32, which is why the same
> screen reads better there. `shadow-none` stands unchanged. Read N5 before acting on
> this rule.
>
> **AMENDED AGAIN by the design-kit swap (25 Aug 2026): the "no hover animation" clause is
> about a DEFAULT that no longer exists, and `hover-lift-none` is gone.** C2 was written
> against a library whose `Card` carried `hover-lift` in its BASE class — every card lifted
> whether or not lifting meant anything, so the rule was really "turn the default off", and
> `hover-lift-none` was the switch. The kwapso kit inverts that: a card is still by default,
> and lift is opt-in through its own `interactive` prop. So the case C2 was never about — a
> card that IS a link, a draggable card, the copilot launcher — is now the only case that
> lifts, and it lifts because somebody asked for it. Do not reintroduce `hover-lift-none`:
> it is defined in no stylesheet the kit ships, so it reads as a class that does something
> and does nothing.
>
> **AMENDED A THIRD TIME (14 Sep 2026): a card that is a DOOR in a WALL of many at once
> acknowledges the pointer with a FILL, never the kit's `interactive` lift.** Settings'
> module cards and the members gallery both draw `hover:bg-accent motion-hover` rather than
> `interactive` — the client, over the modules wall: *"we are missing a hover state for the
> cards. For example, in settings modules, I would need to see a hover when I hover over a
> card."* `interactive` also grants `motion-hover-lift` (motion.css §13), and a GRID of many
> cards lifting at once is exactly "the page of reacting boxes" this rule exists to
> prevent — the same argument `app-tiles.tsx` had already settled the identical way.
> `--accent` is the same token `interactive` would have reached for (`card.tsx`: "Hover,
> where a card is a target, is `--accent`"), just without the shadow; `motion-hover` is the
> kit's own transition class for the fill alone. The kit's lift stays reserved for a card
> that is genuinely a single, standalone target — a draggable card, the copilot launcher —
> never a wall of many.

```tsx
<Card className="hover-lift-none shadow-none">
```

All three utilities exist today. `Card`'s base class is
`"glass hover-lift rounded-xl border text-card-foreground shadow-sm"`
(`card.tsx:14`); `hover-lift-none` is the library's own documented opt-out
(`styles.css:376-379`). Apply this in `CollectionCard`
(`web/components/deep-link/screen-bits.tsx:32-38`) and it lands on every engine list at
once.

Evidence: a runtime census of all 709 rendered elements on kwapso.com found
**`box-shadow !== none` on zero of them**, and `.bento-hero` computes `border: 0px none`.
The whole site has exactly one border, `1px solid rgba(25,24,23,.15)` on the services
mega-menu panel. Separation between surfaces is achieved purely by tone. In the old app
the deliverable cards (`P-4.10.19`), module tiles (`A-4.00.11`) and roadmap rows
(`P-4.10.12`) are flat filled rectangles with no outline.

### C3: the ambient field never sits behind a content surface

Keep `<AmbientBackground />` mounted once in `web/app/layout.tsx:48`. Do not unmount it
and do not fork it. Instead, **remove the translucency** so it cannot show through:
scope `shared/web/library-overrides.css` to overlays only.

```css
/* Overlays that float free of the page keep the soft surface.
   Cards do not: a card is paper on paper, never a window onto the field. */
[data-slot="dialog-content"],
[data-slot="sheet-content"],
[data-slot="popover-content"],
[data-slot="dropdown-menu-content"] {
  background-color: color-mix(in oklch, var(--card) 94%, transparent);
}
```

This restores the library's opaque `.glass` for `Card` and fixes the pink cast and the
drifting card colour in one edit. See [Finding 1](#finding-1-the-card-is-not-pink-it-is-transparent).

### C4: on a detail screen the ambient shows only in the header band

The header band (see [D2](#d2-the-header-band-is-the-only-ambient-surface-on-the-screen))
is the one region that lets the field through: `bg-transparent`. Everything from the tab
strip down sits on an opaque `bg-background` region so the page reads calm and flat.

```tsx
<div className="bg-background relative z-0">   {/* tabs and below */}
```

Evidence: `A-3.57.42`, `A-3.59.09`, `P-4.10.05`. In every old detail screen the tinted
band stops at the tab underline and the panel below it is plain.

### C5: mango is a fill, never a border and never a gradient

`--primary` (`#fed069`) may fill a primary button, a chip or a selected state. It is
never a gradient on a content surface. Text on mango is always `--primary-foreground`
(`#1a1918`).

**A link is not mango.** The brand site sets `a { color: var(--color-scheme--base); text-decoration: none }`,
so links are plain ink and undecorated; mango is an interaction colour, not a link
colour. The one place mango is allowed as a stroke is a `variant="outline"` primary
button, which the brand site does use (`2px solid #ffd066`, 16 elements, filling solid on
hover), so that single case is permitted.

Evidence: `styles.css:93-97` states this as the brand rule; `--ring` is deliberately ink
(`rgba(26,25,24,0.35)`), not primary, for the same reason. Runtime census of kwapso.com:
mango appears as a background on 11 elements and a border on 16, and as text on 8, all of
them buttons or highlight marks.

### C6: sky, forest and poppy are marks, not backgrounds

`--success` (`#1f9259`), `--destructive` (`#e94a32`) and `--chart-1` (`#89bce6`) colour
text, icons, chart series and badge foregrounds. They never fill a section, a row or a
card.

Evidence: `styles.css:117-121` and `brand.css` (`--color-scheme--forest`, `--red`,
`--sky` appear on marks only).

### C7: status is a badge, never a row tint

A status is a `Badge` with the existing variants (`default`, `secondary`, `outline`,
`destructive`, `success`, `warning`). Never colour the whole row.

Evidence: `A-4.05.42` and `A-4.06.45` show "Change", "Fix", "Feature" and "Scheduled" as
small pale pills inside otherwise plain rows. `Badge` is already the most-used library
primitive in this repo (28 importing files).

### C8: a warning band is amber text on an amber tint, full width, directly under the header

```tsx
<div className="bg-warning/10 text-warning-foreground flex items-start gap-2 rounded-xl px-4 py-3 text-sm">
```

Use `--warning` (`#e8b244`). One band maximum, above the tabs, never inside a tab panel.

Evidence: `A-4.07.25` and `A-4.07.28`, the "This ticket is awaiting resolution since 17
August 2026" band, sitting between the header band and the first content panel.

### C9: an informational callout is muted, not coloured

```tsx
<div className="bg-muted text-foreground flex items-start gap-3 rounded-xl p-4 text-sm">
```

`--muted` is `#efece4`. Reserve colour for status; explanation is grey.

Evidence: `P-4.09.52` (the portal welcome note) and `P-4.10.31` (the "Please fill in all
fields carefully" box at the top of the new-ticket form) are both plain grey boxes with a
small circled information glyph.

### C10: there is one ink, stepped by opacity, not a grey ramp

Text has four values and no more:

| Role | Class | Resolves to |
|---|---|---|
| Everything readable: headings, body, links, nav | `text-foreground` | `#1a1918` |
| Secondary: timestamps, meta lines, footer links, placeholders | `text-muted-foreground` | `#6b6965` |
| Faint: an inactive option, a disabled label | `text-foreground/30` | 30% ink |
| Hairline: the one border colour | `border-[--border]` | `#e8e4dc` |

Do not introduce a fifth grey, and do not reach for `text-neutral-*`, `text-gray-*` or
`text-zinc-*`, which are not in this palette at all.

Evidence: a runtime census of kwapso.com found exactly **four** text colours across 166
text elements: `rgb(25,24,23)` on 132 of them, the inverse `rgb(255,253,248)` on 24 (over
photography), mango on 8 (buttons), and `rgba(25,24,23,0.3)` on 2 (the inactive language
link). The brand site has no grey ramp: `--color-scheme--dark-grey: #bab8b4` is exactly
the ink at 30 per cent over the page, and the one hard-coded grey in the stylesheet,
`#8a8784`, is the ink at 50 per cent over the card. This app's `--muted-foreground`
(`#6b6965`) is the same idea, darkened one step to clear WCAG AA on the card surface
(`styles.css:108-113`); use it rather than an opacity of your own.

### C11: motion is 200ms, one easing curve, and it respects reduced motion

Where a transition is genuinely needed (a hover on an interactive control, a menu
opening, a sticky header collapsing), use `duration-200` and the house curve
`cubic-bezier(.645,.045,.355,1)`. Nothing else animates. No scroll-triggered reveals, no
parallax, no card entrance animation.

The theme already disables `.hover-lift`, `.animate-rise` and `.ss-typing` under
`@media (prefers-reduced-motion: reduce)` (`styles.css:436-448`) and the ambient field is
disabled the same way (`web/app/globals.css:86-91`). Any transition you add joins that
block.

Evidence: kwapso.com uses `cubic-bezier(.645,.045,.355,1)` at `.2s` in five rules and
ships an explicit `prefers-reduced-motion` block. It has **zero** Webflow scroll
interactions (`data-w-id` appears nowhere in the markup), which for a marketing site is a
deliberate restraint worth carrying into a working tool.

### C12: nothing stands on the bare page ground

**The rule.** The client, four times in three days, and by the second one she was asking
for the law:

> *"more members in each row, too much blank space. needs container!! **nothing on top of
> white background, its a rule!**"* (2026-09-09, the Team tab)
>
> *"but give it a container. **once again**, nothing shoudl sit on the white, everything
> contained! (make this a law)"* (2026-09-10, Settings › Integrations)
>
> *"remember in settings modules card, needs container background."* (2026-09-11)
>
> *"i said nothing on white backgorund. remove this text … remove the text directly on
> white background."* (2026-09-11, Integrations again)

A titled section of content — and a **tab panel**, which is titled by its strip rather than
by a heading of its own — stands on paper. It passes in exactly **two shapes**, and they
are one sentence read from either end:

1. **the section IS the box** — it, or something above it in its own file, carries a paper
   fill; or
2. **every body it draws stands in one** — heading outside, content on paper, which is what
   every collection screen in the base already does.

**This is not "every screen's root is a panel".** That version was written first and thrown
away: it is either trivially true, or it forbids the shape the whole app already uses and
she has already approved.

**The clause with the teeth is "every body".** Containment is asked **per branch** — through
fragments, ternaries, `&&` and `.map()` — so a section cannot pass on the strength of the
one branch that happens to have a panel in it. That is the difference between a rule that
catches her bug and one that reports success over it: `access-tokens.tsx` drew its ROWS on
soft paper and its error, its skeleton and its zero on the page, and she was looking at the
branch with nothing in it.

**Four things are deliberately not content**, each a decision rather than a convenience:
the **title block** (a heading is not something that stands on anything, and the create
button rides beside it), an **act** (a lone button or a link — a control is pressed, not
read), an **overlay** (a slide-in is not lying on the page), and anything hidden or
screen-reader-only.

**Prose used to be a fifth, and she overruled it** (2026-09-11). A sentence is exempt only
where it is IN the title block or inside a body that already paints. **A sentence that is
its own body, standing on the page ground beside the box it describes, is content and
fails.** And a section does not leave this rule by deleting its title: the subject is every
`<section>`, because a heading was only ever a proxy for it, and *a law you leave by
deleting your title rewards the wrong fix*.

**Where the title goes, and what happened to the subtitle** (2026-09-11, her ruling on
Ticket settings: *"ticket types should be on top of the searchbar inside the container
without subtitle, make this. **always**"*). A section's title sits **inside its container,
above the toolbar**, and there is no subtitle under it. Both halves are held by a
chokepoint rather than a census, which is why a seventeenth section cannot get this wrong:
`description` is **gone from the data model** — `ModuleSettingsSection`, `SelectableScope`
and `ModuleAutomations` have no such column to declare one in — and the title is a
**string** handed to `<ToolbarRow title>` or to `SettingsSection`, never a heading a call
site positions for itself. The same move R53 makes with the sort control: the row draws it,
the call site hands over the answers.

**The cost, and it is a real one.** Fourteen sections lost a sentence each that explained
what they were for — *"the kinds a ticket can be raised as; each one is a tab on the ticket
list and a filter beside it"* and its thirteen siblings. Nothing on screen says that now.
Where a fact is genuinely needed at the moment of use it belongs **on the control it is
about**, inside the paper — not restored as a subtitle under another name. She said "no
subtitle" twice with a screenshot in front of her; one intervening *"the section
description: no, I want to keep it"* (2026-09-10) is recorded at each deletion site as
weighed and overruled, so the next reader knows it was not simply missed.

**What the walk follows, and what it refuses to** (amendment 5). Deciding "does this
component paint?" by reading its own text reports a false offender the moment a section
stands in a **shared** box instead of spelling the fill itself — which is exactly what the
chokepoint above created. So the walk follows **one** edge: the single element a component
*returns*, transitively. That is a difference in kind from the version this file tried and
threw away, which followed everything a component *renders* and turned every uncontained
zero register green off a fill two files away. Measured on the day it landed, the root walk
changed **exactly one verdict** in the whole census — the false one.

**What it costs, and this is the part to read before you reach for `bg-card`.** In the
light palette `--card`, `--surface-raised`, `--surface-lift`, `--surface-selected` and
`--background` **all resolve to the same colour**. A body painted `bg-card` and standing on
the page was answering "I am contained" at **contrast 1.000**, held up by a hairline and
nothing else. Dark measured a perfectly visible 1.198 the whole time, which is why nobody
caught it by looking. So a container is derived by VALUE, per palette, not by the name of
the token — `bg-card` is a fine container on a panel (the kit's own raised-on-soft-paper
pairing) and is not a container on the PAGE. The kit's own answer for a wall of cards
standing on the page is `tone="panel"`, measured at 1.103 in light and 1.079 in dark.

**A second cost, in the same shape.** Where a fill comes from a `cva`, **the variant the
call site selects decides.** A component whose `tone` defaults to bare answered "I paint"
off a `panel` option declared two lines below it — and that call was the wall she reported.

**The exceptions are a census awaiting her ruling, not a settled list.** The whole client
portal is exempt because it is consistent with ITSELF — stacking titled sections on an
unpainted `<main>` is its visual language, not six oversights, and giving it panels is a
redesign of the client-facing app that belongs in a deliberate pass with her looking at it.
Several agency entries are open questions of the same kind, because she HAS ruled the other
way once, about the module settings pages' own descriptions: *"The section description: no,
I want to keep it."* The two rulings reconcile — keep the words, stop leaving them on the
white — but which she means for each screen is hers. **Read
`UNCONTAINED_SECTION_OK`, not this paragraph.**

**Law.** [R67](../RULES.md) (`sections-stand-on-paper`). This rule is being amended as the
client rules on the screens above; the registry's law text and `RULES.md` carry the running
account, and they are the version to trust over this summary.

### C13: the unsaved-changes bar is warning-orange, and round on all four corners

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"use the orange color in the kit
and make sure the container is round on all corners, because currently two corners are not
round."* Over a screenshot of `UnsavedChangesBar` (B12) sitting under the Settings tab
strip with its bottom two corners square against the panel below it.

**The fix.** The bar keeps its `--warning` tint (already the kit token, not a Tailwind
ramp — R32) and gains `rounded-[var(--radius)]` on all four corners rather than only the
top two, so it reads as one self-contained band regardless of what sits beneath it (kit
v1.2.98).

**Law.** Not a registry law — the kit component itself carries the fix
(`shared/ui/components/unsaved-changes-bar/`), the same way B12's own colour note above it
is enforced by the component and not by an app-side census.

**AMENDED 17 Sep 2026 — sticky under the strip, and a size up.** The client's ruling,
verbatim: *"The 'You haven't saved changes' needs to be floating and visible at all times,
directly under the tabs, even if I'm very down in the scroll. Also, I'm not sure of the
size of this typography. Make sure that this is in the kit because it looks too small."*
Until this ruling `position: sticky` was the app's own decision (R63) and the bar itself
only ever drew the row — which worked while the row's container was already sticky at the
viewport, and did not work inside a scrolling panel (both real call sites, Settings ›
Appearance and Settings › Team › Roles), where the bar scrolled out of view exactly as she
described. The bar's own `bare` ground (the one shape both call sites render) now carries
`position: sticky` itself, pinned directly under the tab strip through two app-supplied
CSS custom properties with a `0px` fallback each (kit v1.2.106) — the component still
names no pixel of its own and still does not know the app's layout. The message steps up
one rung, `text-caption` (13px) to `text-sm` (14px) — the next rung on `Text`'s own ladder,
not two.

---

## 2. Page layout and width

### L1: one page container, one cap

Replace `max-w-3xl` at `web/components/deep-link/deep-link-screen.tsx:330` with:

```tsx
className="mx-auto flex w-full max-w-[1600px] flex-col gap-6"
```

and set the shell gutters at `web/components/shell/app-shell.tsx:373`:

```tsx
<main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 pb-24 sm:px-6 lg:px-10 md:pb-8">
```

Arithmetic, so the change is checkable. At the 1283 CSS-pixel laptop the screenshots use,
the main region is about 1043px. Today: `px-4` then a 768px cap gives a **138px gutter
each side**. After: `sm:px-6` and no cap reached gives a **24px gutter**, a reduction to
roughly one sixth. At 2560px the 1600px cap keeps a comfortable measure instead of a
1300px void. The owner asked for "roughly a tenth"; this is the honest number that also
survives tablet.

Also delete `rounded-xl transition-shadow` from that same string. It rounds and animates
a container that has no surface, which is the only remaining `transition-shadow` in the
app.

Evidence: [Finding 2](#finding-2-two-thirds-of-a-wide-screen-is-empty-margin);
`A-4.06.36`, `A-4.05.42`, `A-4.08.47` all run edge to edge with a small fixed gutter.
And the brand's own answer, measured: `.nk-container` is `max-width: 1920px` with
`padding: 100px 40px 20px`, computing to a **40px** horizontal page padding at every
desktop width. `lg:px-10` is exactly that 40px, and it is exactly the brand's
`--margin--m` token. The app caps tighter than 1920px only because it carries a 240px
sidebar the marketing site does not; if the owner wants it wider still, raise the cap and
change nothing else.

### L2: prose is capped, the page is not

Line length is a property of the text block, not the page. Any paragraph, article body
or description gets `max-w-[72ch]`. Tables, lists, card grids and calendars take the full
container.

Evidence: `A-4.05.52` puts the description in a roughly 840px column beside a narrow
related-record rail, while the story table on the same screen spans the whole width.
(inferred: the exact `72ch` value; Glide's column is fixed pixels.)

### L3: above roughly 1024px, a detail screen is two columns

Main content left, related records right, at about a 2:1 ratio.

```tsx
<div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
```

The right rail holds the related-record cards (see [D8](#d8-a-related-record-is-a-card-not-a-row-of-labels))
and short sub-collections. Below `lg` it stacks, right rail last.

Evidence: `A-4.05.52`, `A-4.06.12`, `A-4.07.25`. Every wide detail screen in the old app
is this shape.

### L4: the collection index screen may be two panes

Where a collection is normally read filtered by one parent (stories by app, tickets by
app), a left selector pane and a right collection pane is allowed at `lg` and above.

Evidence: `A-4.06.36` and `A-4.06.45`, the Planning screen: an App picker on the left,
the Sprints/Tickets/Backlog/Meetings tab strip and its collection on the right.

### L5: the portal keeps its own, narrower cap and larger type

`web-portal/components/portal-shell.tsx:162` stays `max-w-3xl px-5 py-8`. The portal is a
reading surface for one client, not a working surface, and it already sets
`:root { font-size: 17px }` rising to `18px` at `md`
(`web-portal/app/globals.css:25-34`). Do not unify the two caps.

Evidence: `P-4.09.52` and `P-4.10.05` are noticeably narrower and larger-typed than any
agency screen. (inferred: keeping the divergence deliberate rather than accidental.)

### L6: the shell frame never scrolls

The desktop sidebar, the mobile top bar and the mobile bottom tab bar stay fixed; only
`<main>` scrolls. This is already true (`app-shell.tsx:303,345,378`) and is restated here
because [D3](#d3-the-header-and-tabs-stick) adds a second sticky layer inside `<main>`
and the two must not fight. The shell owns `z-20`; the in-content sticky header takes
`z-10`.

### L7: exactly one `<h1>` per screen, and it is the record or collection name

Today `home-screen.tsx`, `settings-screen.tsx` and `invitations-screen.tsx` disagree
(`text-2xl` heading, uppercase `<h2>` labels, and no heading at all respectively), and
`help-detail.tsx:410` renders the ticket title as `<p className="truncate text-sm font-medium">`.
Every screen gets one `<h1>` at the scale set in [T1](#t1-one-heading-scale-per-front-door).

Evidence: `A-4.07.25` gives the ticket the same large title every other record gets.

### L8: a panel that minimises collapses, and a shut panel is shut for the keyboard too

**The rule.** The assistant column closes by COLLAPSING, never by vanishing. Three things
have to be true together, and the third is the one a designer has to remember to ask for:

1. the column stays **mounted** across the open/shut flip. Writing
   `isAsideOpen ? <aside…> : null` throws away the element the exit animation would have
   played on, so there is nothing left to animate;
2. the wrapper that collapses carries `.motion-column-collapse`, a `data-state` bound to
   the open flag, and a `--motion-column-size`
   (`shared/ui/compositions/templates/screen-shell.tsx`,
   `shared/ui/foundations/motion/motion.css`);
3. it also carries **`inert`**, bound to the negation of that flag. A collapsed column is
   zero width and fully transparent and is still in the tab order and the accessibility
   tree. Without `inert`, "closed" is true for the eye and false for a keyboard and a
   screen reader — which is not what the client asked for: *"closed assistant show
   nothing. it's literally only the bar."*

**What it costs, and the trap that earned it.** `.motion-column-collapse` may **not** size
itself with `grid-template-columns` or `fr` units. That is the row-collapse rule with the
axis turned ninety degrees; it reads correctly, it type-checks, it lints, and inside a
flex row it silently does nothing — a flex item's grid is sized under an intrinsic
constraint, and under an intrinsic constraint a `0fr` track is floored at its own base
size instead of resolving to zero. Measured in the verify sandbox, the track never moved
off 356.25px: the panel went fully transparent and kept every pixel of its width. That is
visibly **worse** than the instant disappearance it replaced, and it is only visible to
somebody who measures the settled geometry. The column is sized on `inline-size`.

**Law.** [R51](../RULES.md) (`aside-collapse`).

**Mid-edge close control, 2026-09-15:** When the assistant is OPEN, there is no mid-edge
close control on the right edge of the assistant column. The top-right opener button stays
visible (it never hides), toggling the assistant state. The assistant itself closes only
from its own tab close action (kit v1.2.85 `asideHandleOnOpen`,
`web/components/shell/app-shell.tsx`). This removes ambiguity about what the edge gesture does.

**Assistant strip icon-only tabs (16 Sep 2026):** *"validated, but still gotta fix the shape!"* — client. Icon-only pinned tabs size to the icon, with no 128px text floor (kit v1.2.95 `iconOnly`).

### L9: every section on the team area's strip has a door, or names the screen that took its place

**The rule.** A section that lives on the team area's own strip (`TEAM_SECTIONS` in
`web/lib/pages.ts`, `placement: "tab"`) is reached from exactly one place in the app: the
"This team" list on Settings › Team, which is built from that same table minus the keys it
subtracts. **If you take a section off that list, the capability does not disappear — the
door does.** So the section names the screen that carries its material instead, and that
screen must really make the same door calls the section's own actions made. A section with
`placement: "contextual"` never appears on that list at all, so it needs a literal link
somewhere under `web/` that ends at its segment, or the same written line.

**What it costs.** Only LITERAL paths are visible to the census, so a section reached by a
computed segment reads as unreachable and has to be written down — a reviewer reading a
claim, rather than a build going quiet.

**Why it exists, in one sentence you can check on screen.** The 2026-09-09 Team redesign
left three acts — change a member's role, remove a member, revoke an invitation — on
screens that exactly one thing in the app linked to, and that one link pointed at a
member's RECORD. Somebody with full team-member rights and the wrong commercial right had
no in-app path to any of them, under a green build, with the gallery's own comment telling
the next reader it was fine. And `dropdowns` moved tab → contextual on 2026-09-01: from
that moment nothing in the app opened it, and a screen with an import door, an export and
a record split sat unreachable for ten days.

**Law.** [R64](../RULES.md) (`sections-have-a-door`).

### L10: a screen's title comes from the nav registry, never typed by hand

**The rule.** *"On the page settings accounts, put only the name of the module. You don't
need to put settings. For example, instead of account settings, just accounts. Make sure
you use the name exactly as in the navigation bar. Most of the time, it's a plural."* —
client, 2026-09-14. Every `MODULE_SETTINGS` page's title is `navPageTitle(segment)`
(`web/components/screens/module-settings-screen.tsx`) — a LOOKUP into `TEAM_SECTIONS`
(`web/lib/pages.ts`), the one place a destination's nav word is already decided, since the
sidebar, the team area's own tab strip ([L9](#l9-every-section-on-the-team-areas-strip-has-a-door-or-names-the-screen-that-took-its-place))
and the breadcrumb all read that same table — never a second spelling typed at the settings
page itself. "Ticket settings" and "Account settings" are gone; what is left is "Tickets"
and "Accounts," her own worked example, word for word.

**Throws rather than guessing.** A segment `TEAM_SECTIONS` does not carry is a genuine gap,
not a silent fallback: `navPageTitle` throws, naming the segment, rather than teaching the
lookup to invent something nobody asked for. The one page with no nav word to read
(`"team"`, which never navigated anywhere) states its title as a literal — "Housekeeping" —
with a comment saying why, rather than being taught a fallback that would go stale the day
a second nav-less page appears.

**Nothing censuses this yet.** Unlike [D11](#d11-every-detail-screen-wears-the-same-title-treatment-and-it-comes-from-one-constant),
which a check holds every detail screen to one constant, no check today asks whether every
settings page's title actually IS a `navPageTitle` call rather than a literal string typed
back in agreement with it by hand — this entry states the ruling as she gave it and the
mechanism as it is built, honestly short of a census over every settings page in the app.

### L11: pressing Import opens its own workspace tab, fronted, and never redirects the one you were in

**The rule.** *"Make sure that it opens as a new solo tab on the breadcrumbs, because now
it redirects. In the places where we have import, make sure that's what it does."* —
client, testing Import, 2026-09-14. Every "Import CSV" door, and the generic wizard link on
Home, used to navigate the CURRENT workspace tab straight to the import wizard, so the
collection she pressed it from vanished from the strip until she clicked Back — the "just
redirected me" she was reporting.

**The mechanism.** `openInNewTab` (`web/lib/nav.ts`) is the one door: a SOLO tab is a trail
of one entry, which `visitTrail` (`web/lib/workspace-tabs.ts`, the model behind the
breadcrumb-tab strip) already generalises to on its own terms — no ancestors, one entry,
itself the only and active level. Every import dispatch calls it instead of the plain
`go`/`softNavigate` this section's own `<InAppLink>` inline-interception pattern otherwise
uses. Pressing Import again on the same target fronts the tab already open rather than
opening a second one, and closing it returns to the tab that was open before — the ordinary
tab-strip behaviour [K4](#k4-a-tab-that-reveals-a-collection-carries-the-count-as-a-badge-and-the-heading-stands-down)'s
own model already gives every other tab, extended to this one door.

**Law.** [R74](../RULES.md) (`import-opens-a-tab`).

### L12: a tab is a trail — a plain click or a rail pick pushes a step onto it; only a deliberate gesture opens a new one

**The rule.** Two rulings, eleven days apart, and the second changes what a tab IS.
**2026-09-06, verbatim:** *"regarding the breadcrumbs... would it be possible to
replicate the tab behaviour of chrome? what i mean: i am in a detail app, but i click the
first tab 'apps' see all the apps but the detail where i was stays open / then we'll need
a x icon on the tabs to close them / but the idea is that all tabs i open stay open unless
i close them / is this possible?"* — that built the TAB SET this file still holds.
**17 Sep 2026, verbatim:** *"Unless I do it on purpose to open a new tab, everything
happens on the same tab. This means that I would navigate in the app, and this would just
keep making the breadcrumbs longer. Unless I press Command and click, this would open a
new tab, and the same behavior in Windows, just replicating Google Chrome."* Same
session: *"Yes to Chrome navigation, push the trail on a rail pick."*

**The mechanism.** Until 17 Sep 2026 "opening a tab" and "navigating" were the same
event — every crumb level on a cold address opened its own tab, and clicking deeper
pushed nothing because the trail WAS the URL. A tab is no longer `{path, label}`; it is a
PLACE WITH A PAST — `OpenTab` (`web/lib/workspace-tabs.ts`) now carries `steps:
TrailStep[]` and a `cursor`, Chrome's own back-history model applied per tab instead of
per window. A plain click on an `<InAppLink>` (`web/components/shell/in-app-link.tsx`)
still calls `preventDefault` plus `softNavigate`, and `visitTrail` still owns the push —
but it now reads only the LAST entry of the incoming crumb array (the page just navigated
to) and pushes ONE step with it onto whichever tab is active, rather than minting a tab
per level. A rail pick (`goToSection` in `web/components/shell/app-shell.tsx`) goes
through the identical `navigate` → `softNavigate` → `visitTrail` seam, so it pushes too —
"push the trail on a rail pick" is the same mechanism the ruling already gives every
other click, not a special case. The one exception is the very first call in a freshly
opened tab (no active tab yet, or a cold deep link into an empty scope): there `steps` is
seeded from the whole incoming trail, so landing cold on a nested address still shows the
ancestors above it, and Back still walks out through them — now via the cursor instead of
via a second tab. Identity moved off the path and onto a minted `id`, because two tabs may
now show the exact same path — cmd-clicking the same link twice is Chrome's own "open it
again in a new tab," not "front the one already open" — so the old canonical-key dedupe
(L12's own prior shape) is deleted outright rather than adapted. `MAX_TRAIL_STEPS` (30)
caps one tab's own history, oldest dropped; `MAX_OPEN_TABS` (8, L11's own doc) and its
recency-based eviction are unchanged.

**Only a deliberate gesture opens a second tab.** `openBeside` (`web/lib/workspace-
tabs.ts`) is now the one door a NEW tab is minted through — never `visitTrail`'s default
— and `<InAppLink>` calls it on cmd/ctrl-click (`onClick`) and on a real middle-click
(`onAuxClick`, since a middle-click never reaches `onClick`), inserting the fresh,
one-step tab immediately after the active one (this rule's own insertion order, unchanged)
and fronting it. A plain Shift-click or Alt-click is left to the browser untouched —
save-as, a real new window — because neither is the gesture the ruling names.
`openSoloTab` (L11's own Import door) keeps its own narrower, hand-rolled dedupe,
unaffected by any of this.

**Law.** None registered — `web/test/workspace-tabs.test.ts` and `web/test/nav-memory.
test.ts` pin the store; R37's own census (`web/test/shell-nav.test.ts`) is what makes
`in-app-link.tsx` the only place this behaviour has to be taught.

**AMENDED 17 Sep 2026 — the insertion point is unconditional, and a REUSED tab has to be
repositioned too.** The client's ruling, verbatim: *"When I open a new tab from an
existing tab, every time, it needs to be to the immediate right of the tab that is
active."* A freshly minted tab already landed there (`openBeside`, above); the gap was the
REUSE path — pressing the pinned "+" or cmd/ctrl-T a second time fronts the one already-
open unused `/new` tab ([L24](#l24-a-new-tab-opens-on-a-search-page-never-a-blank-one-one-unused-new-tab-at-most))
rather than opening a second, and until this fix the reused tab's own `touch()` fronted it
wherever it already sat in the array — wherever it happened to land the one time it was
minted — not necessarily beside whichever tab is active now: open "+", switch to a third
tab, press "+" again, and the reused tab surfaced to the ACTIVE tab's left instead of its
right. `moveAdjacentToActive(id)` (`web/lib/workspace-tabs.ts`) is the fix — read
`activeId` before it moves anything, splice the reused tab out and back in immediately
after the (still-correct) active position, then `touch()` fronts it — a no-op when the id
asked for is already the active tab itself (pressing "+" twice in a row before navigating
anywhere else). Every door lands here the same way now: cmd/ctrl-click, a real
middle-click, the pinned "+", cmd/ctrl-T, and a reused unused tab alike.

**Law.** None registered — `web/test/workspace-tabs.test.ts` covers `moveAdjacentToActive`
directly; `web/test/workspace-tabs-are-wired.test.tsx` covers the reuse-and-reposition
case end to end.

**Root-caused and fixed, 17 Sep 2026 — a ticket-row cmd-click was never reaching
`openBeside` at all; it was never Chrome.** The client's report, verbatim: *"the command
that I'm clicking is not opening a new tab. Is this because I'm using it inside of Chrome,
or is it not working"* Reproduced LIVE on `agency-staging.kwapso.app` (Playwright, headless,
the admin test-login door): cmd-clicking a ticket row left the workspace tab strip's own
`<li>` count unchanged (2 before, 2 after) and replaced the address IN PLACE
(`/tickets` → `/tickets/<id>`, same document, same tab) — no in-app tab opened, and no
browser-native tab either, so it was never a Chrome quirk. The real cause: `TicketRowsTable`'s
row (`web/components/tickets/tickets-collection.tsx`) is a plain `<TableRow onClick={() =>
onOpen(w.id)}>` — no `<a href>` anywhere on it, so R37's own census (`shell-nav.test.ts`'s
"in-app-anchors," which reads every raw `<a href="/…">` off disk) could never have caught
it, because there is no anchor to catch. `onOpen` is `onIntent({kind:"open",…})`, whose
"open" case (`deep-link-screen.tsx`) calls `go(path)` directly — a plain function call with
no `MouseEvent` in reach, so no layer downstream of the row could ever have read a held
modifier off it even if it tried. The row is the one place that DOES see the raw click, so
it is now the one place that computes the ticket's own address
(`/t/<teamId>/tickets/<id>`, the same form `RaisedByRow` already hands `<InAppLink>`) and
calls `openBeside` on cmd/ctrl-click or a middle-click, exactly the gesture `<InAppLink>`
already teaches every real anchor — a plain click is unchanged, still `onOpen`, same tab.
Confirmed by a driven render (`web/test/ticket-row-opens-beside.test.tsx`): a plain click
still calls `onOpen` and mints no tab; cmd-click, ctrl-click and a middle-click (`auxclick`,
button 1) each open the row beside the active tab and never call `onOpen`, whether the
click lands on the row's own background or on the title's inner `<Button>`. The same defect
shape — a clickable row with no anchor and no reach to the click event — exists in the
shared `web/components/records/record-table.tsx` (Accounts, Tasks, Waves, Contacts,
Stories, Meetings), left for a dedicated follow-up rather than fixed here: those six
screens are outside this pass's owned files, and each caller's `onRowClick` would need the
same event-forwarding change this file's `TicketRowsTable` just got.

**AMENDED 17 Sep 2026 — a rail pick opens beside the active tab unless its own screen is
already the one showing.** The client's ruling, verbatim: *"without changing anything
else, when I click on something on the navigation bar, it should always open in a new tab
unless it's already open on the main screen. What I mean is, for example, if I go in the
navigation bar to Tickets and then I go inside the ticket, if I click on Tickets again in
the navigation bar, it should open the Tickets screen in a new tab. If I already have the
main ticket screens open, do not open any tab, but open this tab. If, for example, I am in
an app and I click on Tickets, it should open in a new tab. Let me know if this is
clear."* This replaces this rule's own earlier reading of a rail pick — "push the trail on
a rail pick," the sentence two rulings up that made `goToSection` an ordinary push through
`visitTrail` — with a narrower one, now built as `railPick` (`web/lib/workspace-tabs.ts`,
the store's own rail door — `goToSection`, `app-shell.tsx`, is unchanged at every one of its
four call sites, and now hands it the clicked item's own label too): is some open tab's
CURRENT step already that rail destination's own root path, canonicalised exactly as
`openSoloTab` canonicalises (the query string never names a different tab)? If so, the click
activates that tab (`activateTab`, the identical door the strip's own tab click uses) rather
than opening anything. A tab whose current step is DEEPER inside the module — a record, not
the collection — does not count, so the ticket example above opens a new tab. If nothing
qualifies — including when the active tab is on an unrelated screen entirely, or nothing is
open at all — `openBeside` opens the destination AT the module's root, never a recalled
deeper screen: the client's own words are "open the Tickets screen," not wherever she left
off, which retires `nav-memory.ts`'s `sectionClick` as the rail's own door (its export and
its own tests are untouched; nothing calls it from the rail any more).

**Status: shipped, 17 Sep 2026.**

**Law.** None registered — `web/test/workspace-tabs.test.ts`'s `railPick` block covers the
four cases directly (root open → activate; deeper in the module → new tab; a different
module → new tab; nothing open → new tab); `web/test/ticket-row-opens-beside.test.tsx`
covers the cmd-click defect above end to end.

**AMENDED 18 Sep 2026 — the two click grammars this app taught by hand (`InAppLink`
for a real anchor, `rowOpenHandlers` for a row/card with none) are now one function,
and cmd/ctrl-click opens beside IN THE BACKGROUND, not a same-tab navigation too.**
The client's ruling, verbatim, is unchanged from 17 Sep 2026 above — "Unless I press
Command and click, this would open a new tab, and the same behavior in Windows, just
replicating Google Chrome" — but "just replicating Google Chrome" turned out to mean
more than this rule first read it as: Chrome's own grammar leaves focus on the tab she
clicked FROM on a plain cmd/ctrl-click or a middle-click, and only switches her to the
new tab when Shift is added too (cmd/ctrl+Shift-click). `clickGesture`
(`web/lib/row-open.ts`) reads a click into one of `"same" | "beside" | "beside-switch" |
null` and both `InAppLink` and `rowOpenHandlers` now classify through it; `beside` opens
the tab and hands focus straight back to whichever tab was active (`applyClickGesture`,
same file), `beside-switch` opens it and navigates there too.

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

### L32: any choice over a person, a contact, an account or an app shows the same face the lists show

**The rule.** Aurora, verbatim, about the new Raised-by `Select` on the ticket form and page:
*"every time there is an avatar, I want to also see it in the choice component, so I also want
to see the avatars here."* A picker's own row is not exempt from the face law the rest of the
app already carries ([R35](#), "a record never appears without its face"): the photograph where
a record has one, initials on the record's own tone where it does not — and, new here, it shows
in the TRIGGER's own chosen value too, not only the open list.

**Why the trigger needed its own fix.** `SelectItem` already carried an `image` prop, but it
rendered a bare `<img>` with no fallback — the exact silhouette mismatch RULES.md §4.4 already
named for a picker's mark disagreeing with the record's own. And nothing drew a mark in the
trigger at all: Radix clones the chosen option's `ItemText` children into the closed field, and
an `<img>` cloned there would have been a second, unasked-for drawing inside the 44px pill — so
the mark was deliberately kept OUTSIDE `ItemText`, which is exactly what kept it out of the
trigger too.

**The shape.** kwapso-design v1.2.127 gave `SelectItem` and `SelectTrigger` a shared `face`
prop — `{ src, name, tone, shape }` — both rendered through one `SelectFaceMark` helper over the
kit's own `Avatar`/`AvatarImage`/`AvatarFallback` primitive (a real photo-or-initials fallback,
never a bare image). The trigger's face is handed in by the call site, because it already knows
which option is selected (it is what supplies the placeholder text); the mark is keyed on its
own identity so a stale `Avatar` load-status left over from a PRIOR photo selection can never
bleed into a new no-photo one. Wired in this app: the ticket form's and the ticket page's
"Raised by" contact pickers, and the work-logs panel's "Logged by" staff filter (initials only —
the door behind that one carries no photo field yet, an open, named gap rather than a silent
workaround).

**Status: ruled and in build, 19 Sep 2026.**

**Law.** [R90](../RULES.md) (`faces-in-choices`) — scoped to the kit's `<Select>`, since R35
already holds `RecordPicker`/`PickerOption` to this account through a different, structural
mechanism (the TYPE, not a prop). A static census, `web/test/faces-in-choices.test.ts`, detects
a choice over a record by its own options array's field names (`personName`/`contactId`/
`memberId`/`accountId`/`avatar`/`photo`/`initials`) and fails when a `<SelectItem>` inside one
carries no `face=`.

---

### L33: at lg the conversation card stretches to match the side column's stack height; below lg it keeps its floor

**The rule (SUPERSEDED 19 Sep 2026 ~12:15).** Aurora's ruling, 19 Sep 2026 ~10:55, verbatim: *"i want that the conversation has more heugh - use the heig set by the ocmponents on the left column."* On the ticket detail, at the `lg` breakpoint and above, the conversation card (the thread + composer) grows to match the height of the side column's own stack of cards (the stage ladder, stakeholders, assignees, etc.) — the two scrolling independently side by side when either overflows its own container. Below `lg` the card keeps its own floor of 420px (`min-h-[420px]`), as the current layout already does.

**The shape (SUPERSEDED 19 Sep 2026 ~12:15).** At `lg` the conversation cell is `flex-1 min-h-0`, making it claim all remaining vertical space after the top card's content settles, and the card itself is `h-full`, growing its own content to fill that space. The thread inside it is `overflow-y-auto` with a `min-h-0` floor on its container, so it scrolls when taller than the column. The composer is the card's own `CardFooter`, the last child, sitting at the card's own foot as D21 already proves. Below `lg` a media query releases both constraints (`lg:min-h-0` on the cell and container), returning the card to its natural height plus the 420px floor.

**AMENDED 19 Sep 2026 (~12:15) — side column height and scrolling behavior.** Aurora's ruling, verbatim: *"there shoudl be no scrolling to see al right column items<11 expand the height! / scroll only on conversation when taller than right column / is it so hrd to understand me? kmk"* The side column (Related stories, Work logs, Raised by, On the loop) never scrolls and is fully visible; the row is as tall as the side column's natural height; the conversation card matches that height and scrolls inside only when its thread is taller; when the side column is taller than the screen the page scrolls, the band staying pinned last with the panel gap above it; below lg unchanged.

**Status: ruled, in build, 19 Sep 2026.**

**AMENDED 19 Sep 2026 ~13:30–13:40 (Round 27)** — at lg the row is as tall as the right column, which never scrolls; the conversation matches it and the chat scrolls inside it when longer (confirmed by her answer 3, round 27). The two-column row's own height resolves to the side column's content height, never a flex `h-full` on the conversation cell — the side column declares its own natural height and the conversation takes that same height, scrolling only the thread inside the conversation card when the thread is taller than that measure. Below lg the single-column layout applies, with one page scroll and the conversation card keeping its 420px floor.

**Status: amended, in build, 19 Sep 2026.**

**Law.** None registered.

### L34: never need to scroll to see all content

**The rule (R91 `no-nested-scroll`).** Aurora's ruling, 19 Sep 2026 ~13:30–13:40, verbatim: *"never need to scroll to see all content!!! (only exception chat compnents)"* — stated as a standing law to be enforced everywhere. One page scroll only; no scroll area inside a page's content. When a section or component fits its own container, nothing scrolls. When it does not, the section itself becomes a bounded scrolling region with an explicit `overflow-y: auto` / `overflow-x: auto`, never the page scrolling one region and an inner section scrolling another. **Exceptions:** chat components (the conversation thread scrolls inside its card, by this rule's own L31/L33 shape); the rail's own list of sections (pinned height, scrolls on overflow); the assistant pane (one aside scrolling region); true overlays (dialogs, sheets, popovers, listboxes — a modal or a dropdown may scroll internally and holds no relation to the page's own scroll). **Not covered:** horizontal scroll on tables and boards. R91 is a vertical law only, horizontal was never in question.

**AMENDED, 21 Sep 2026: the five pending scrollers and the tables/boards question, both settled.** Five sites (the assistant's History tab, the paused-turn confirm list, the tickets dashboard's chart column, the import wizard's rejected-rows preview, and the meeting transcript preview) were shown to Aurora on a decisions page, one recommendation each, keep or flatten. Her ruling, verbatim: *"confirm"*, she accepts every recommendation. **Kept**, moved from pending to sanctioned in `NO_NESTED_SCROLL_EXEMPT`: the History tab list ("same shape as the rail's own sanctioned list"), the dashboard chart column ("a bounded dashboard widget, not the page itself"), the import preview ("a bounded preview inside one wizard step, the same shape as a dialog body"), and the meeting transcript preview ("a transcript flowing into the page would bury everything else on the record"). **Flattened:** the paused-turn confirm list (`agent-panel.tsx`) no longer scrolls on its own; the page scrolls, and a list longer than five steps is capped by a "Show more" door (L33/R88 style) rather than a second moving region beside the thread's own sanctioned scroll.

Separately, asked whether a table or a kanban board is a sanctioned shape of its own, Aurora's ruling, verbatim: *"like everything else"*, it is not. A table or a board obeys R91 exactly as every other component does, no carve-out: a vertical scroll region inside one is an ordinary offender, caught by a second, narrower census (`findTableBoardOffenders`, same test file) against `TABLE_BOARD_SCROLL_EXEMPT`, empty as of this ruling because no table or board in the app currently scrolls on its own. Horizontal stays exactly as it was: a wide table's or a board's own `overflow-x-auto` is still not this law's subject.

**Status: validated, 21 Sep 2026.** Aurora's "confirm" and "like everything else" close both open items this rule carried.

**Law.** [R91](../RULES.md) (`no-nested-scroll`).

---

### L35: when a main person is chosen, they disappear from the secondary picker over the same pool

**The rule (R92 `main-excludes-secondary`).** Aurora's ruling, 20 Sep 2026, verbatim: *"Generally, always when selecting main/secondary people (staff, contacts, etc.): when I select the main, this person should not be available as secondary. E.g. when I select 'Raised by,' this person should disappear from the 'Keep in the loop' options. Make this law."* Two independent pickers over one shared pool — raised by / keep in the loop, assignee / reviewer, account manager / members, owner / stakeholders — the secondary picker excludes the chosen main's id through `withoutMain()` (`shared/web/without-main.ts`), rather than every call site re-deriving the `.filter()` by hand. **Not this shape:** a "Main X" field chosen FROM an already-narrowed secondary list (`app-form-dialog.tsx`'s "Main stakeholder", picked from the ticked "Stakeholders" checkboxes) — there the main is meant to be a member of the secondary set, the opposite relationship, and this law's own census leaves it alone by field name (`main<Something>Id` is never read as the "picked independently" shape).

**Status: ruled and in build, 20 Sep 2026.**

**Law.** [R92](../RULES.md) (`main-excludes-secondary`) — a source census, `web/test/main-excludes-secondary.test.ts`, pairing a single-value main picker with a `mode="multi"` secondary picker in one file by their shared source array, and requiring the secondary to call `withoutMain(` (or an equivalent exclusion `.filter()`), or be named in `MAIN_EXCLUDES_SECONDARY_EXEMPT`.

---

### L36: every avatar, icon or colour rides beside its text — filters, views and select components alike

**The rule (R93 `visual-accompanies-text`).** Aurora's ruling, 20 Sep 2026, verbatim: *"When selecting a module, also show the module's icon. Make this law: always, if there's a visual (avatar, icon or color), it should always accompany the text everywhere (filters, views, select components…), the only exception being avatars/logos in chips."* Extends L32/R90's own face rule to icons and colours, on an entity that is not a person. Scoped to modules the day this law shipped — the one population this codebase can name without guessing a type from prose: every module array is `AppModule[]` (`shared/types.ts`), carries a real `icon` field, and the module's own gallery card already draws it. A status or ticket/story-type colour already has its own standing rule (K39/R86) and its own picker census, so this rule stays about the module gap her own words named rather than re-litigating that population. **The one named exception is her own:** an avatar or a logo inside a CHIP may still omit it.

**Status: ruled and in build, 20 Sep 2026.**

**Law.** [R93](../RULES.md) (`visual-accompanies-text`) — a source census, `web/test/visual-accompanies-text.test.ts`, over every `<Select>`/`<RecordPicker>` whose options map a module-named source array (in a file that imports `AppModule` from `@shared/types`, so a same-named-but-unrelated array is never caught), requiring the module's own icon (`icon=` on the `<SelectItem>`, or `icon:` in the option literal), or a name in `VISUAL_ACCOMPANIES_TEXT_EXEMPT`.

---

### L37: a record's chips draw in one fixed order — id, status, type, main parent, secondary parent

**The rule (R94 `chip-order`).** Aurora's ruling, 20 Sep 2026, verbatim: *"On story detail, the chips in order: id, status, type, app (underlined), sprint (id, underlined). This must always be the order, everywhere, for other things too: 1 id, 2 status, 3 (if) type, 4 main parent, 5 secondary parent."* One seam, `orderChips()` (`shared/web/chip-order.ts`): every chip is tagged with which of the five kinds it is, and the seam sorts by that tag rather than the order a caller happened to write the JSX in. A kind simply absent from a given record (no type vocabulary, no secondary parent) is left out, never padded. Caught a real, live defect the day this law shipped: `contact-panels.tsx`'s "tickets raised for this contact" row drew the type chip before the status chip, the two swapped from this order, under a green build — fixed by routing the row through `orderChips`.

**Status: ruled and in build, 20 Sep 2026.**

**Law.** [R94](../RULES.md) (`chip-order`) — `orderChips()`'s own unit tests prove the resolved order; a source census, `web/test/chip-order.test.ts`, over every chip row carrying both an id chip (`<RecordRef`) and a status chip (`variant="status"`/`ticketStatusCell(`) within one reading window, requiring an `orderChips(` call, or a name in `CHIP_ORDER_EXEMPT`.

---

### L38: no em dash, anywhere a person reads

**The rule (R95 `no-em-dash`).** Aurora's ruling, 20 Sep 2026, verbatim: *"no em dahses - ABOSLUTLEY NOWHERE. In the ui, in the e-mai,s, in the glossary. They are strictly forbidden. make it law."* No exemptions table — every failure this law finds is fixed at the source. Three surfaces: the translation catalogue and hand-written seed (every language), every JSX text node/`t(...)` argument/visible property reachable from either front door plus `shared/web/`, and every email a worker sends (`shared/workers/email-template.ts` and every derived `sendBrandedEmail(`/`brandedEmail(` site) — and the glossary's own words. En dash (U+2013) is held to the same standard as em dash (U+2014) in prose; a range like "Mon–Fri" is written "Mon to Fri" instead, a numeric range like "10–16" as "10 to 16", and an aside that used to ride a dash takes a comma, a colon or a period, whichever the sentence asks for. Code comments and doc prose carry no obligation.

**Status: ruled and in build, 20 Sep 2026.**

**Law.** [R95](../RULES.md) (`no-em-dash`) — a source census, `web/test/no-em-dash.test.ts`, six censuses (the catalogue, the seed, the front doors' own import closure read at `visitStrings()`'s seven positions, `shared/web/` read the same way directly off disk, the email template plus every derived send site, and the glossary), each stripped of comments first with `stripComments` and each carrying its own tripwire.

**VALIDATED 20 Sep 2026 (Round 30).** Aurora reviewed staging this round and confirmed the law
live: no em dash anywhere a person reads.

**Status: validated, 20 Sep 2026 (Round 30).**

---

### L39: the id chip is black

**The rule (R96 `id-chip-is-black`).** Aurora's ruling, 21 Sep 2026, verbatim: *"id pill must always be black! f..e in backlgoits not black."* Said over the Backlog list, whose standalone ID column drew a story's own reference as plain text, no chip at all. `shared/web/record-ref.tsx` (`RecordRef`) is the one shared id chip register, the kit's own ink fill token pair through `variant="inverse"`, never a literal colour, and it already stands for every record that carries a reference (a ticket, a story, a sprint, an app, a wave, a meeting, an input). Two shapes of the same mistake: a record's reference drawn inside a `Badge` in a quieter tone instead of black, and a standalone `ID` column (her own 20 Sep 2026 ruling adding one to Planned/Backlog) rendered as bare text with no chip around it at all.

**Status: ruled and in build, 21 Sep 2026.** The three Backlog sites this rule was written over — `storyLead()`'s and `ReviewsQueue()`'s own chips, and the standalone `ID` column shared by `PLANNED_BACKLOG_COLUMNS` and `REVIEWS_LIST_COLUMNS` (`web/components/work/stories-screen.tsx`) — now route through the register too: the two badges call `<RecordRef>` directly, and the column wires it through `RecordTable`'s own `TableColumn.render` slot, keyed off the `ref` column, while the shaped row still carries the raw string for search and sort. `ID_CHIP_EXEMPT` carries no entry for `stories-screen.tsx` any more.

**Law.** [R96](../RULES.md) (`id-chip-is-black`), a source census, `web/test/id-chip-is-black.test.ts`, over both front doors plus `shared/web/`: every bare record reference sitting inside a `Badge` that is not `variant="inverse"`, and every standalone `field("ref", "ID")` column, must route through `<RecordRef>` — directly, or through a `render` callback the census recognises by its own wiring shape — or be named in `ID_CHIP_EXEMPT`, keyed by the offending line's own text rather than a line number.

---

### L40: a count never gets its own card

**The rule (R97 `counts-beside-titles`).** Aurora's ruling, 21 Sep 2026, verbatim: *"While it is a rule that when it's a count, unless explicitly said, it doesn't deserve its own card. Just by rule, same as related tickets or related stories or stakeholders: just a count next to the title."* A number that counts things (how many tickets, how many stories, how many stakeholders) never earns a card, a tile or a stat box of its own; it sits beside its panel's own title, in the count register the app already builds for exactly the case she named: `TicketSidePanel`'s own `count` prop (`{title} {count}` on the heading's own line, "Stakeholders 4") and `CollectionHeading`'s own badge, one level up, for a whole screen's own count.

**Status: ruled, and read as open, 21 Sep 2026.** Two shapes found the day this rule was written: the kit's own `<StatGrid>` primitive (a number-and-label card by construction), three call sites, the tickets dashboard's own stat strip, the assistant's metric blocks, and the work-logs summary strip; and a hand-rolled metrics grid, the story page's own "Metrics" panel (cycle time / effort / flow efficiency). Whether a dashboard's own wall of numbers is the "explicitly said" exception her ruling leaves open is not decided here — every `<StatGrid>` site found is named, not removed, reason "pending her word". The story page's own Metrics panel is a known offender another lane owns (it is folding the panel into the Effort card the same session this rule was written); reported rather than fixed here.

**Law.** [R97](../RULES.md) (`counts-beside-titles`), a source census, `web/test/counts-beside-titles.test.ts`, over `web/components` and `web-portal/components`: every `<StatGrid` call site, and every file repeating the app's own KPI-tile value styling (`font-mono text-sm font-semibold`, two or more times in one file) twice or more, must be named in `COUNT_REGISTER_EXEMPT`, keyed by file.

---

### L41: every button is the kit's own height

**The rule (R98 `button-sizes`).** Aurora's ruling, 21 Sep 2026, verbatim, validating the fix to the Knowledge Sync button (`size="sm"` sitting beside toolbar siblings at the kit's own default 40px, K56 above): *"Validated. This is a rule for all buttons, so make sure that I don't find any others like this."* Every button in a toolbar, a page head, a card header or a form foot uses the kit `Button`'s own default size, or `size="icon"` (the same 40px height), never `size="sm"` (32px) or a custom height/padding class.

**Status: ruled and in build, 21 Sep 2026.** Twenty-three call sites across seventeen files carried `size="sm"` in one of the four named surfaces the day this rule was written and were fixed the same session: the `record-calendar`/`record-week`/`record-timeline` "Today" buttons, `filter-bar.tsx`'s "Clear filters", the toolbar `actions=` slots on `account-detail-panels.tsx` and `triage-queue.tsx`, `process-detail.tsx`'s two card-header actions, `read-a-call.tsx`, `wave-phase-days-panel.tsx`'s and `email-change-dialog.tsx`'s form feet, `draft-review.tsx`'s card header, `process-date-slider.tsx`, `triage-strip.tsx`'s page head, `ticket-rating.tsx`'s form foot, `kwapso-screen.tsx`'s panel header, `staff-panel.tsx`'s page head, and `import-screen.tsx`'s two card headers.

**Law.** [R98](../RULES.md) (`button-sizes`), a source census, `web/test/button-sizes.test.ts`, over both front doors plus `shared/web/`: every `<Button` (or a future `<IconButton`) carrying `size="sm"` or a custom `h-`/`py-`/`px-` class, matched past a nested `{…}` expression so an `onClick` arrow's own `=>` never closes the tag early, must sit outside a toolbar, a page head, a card header and a form foot, or be named in `BUTTON_SIZE_EXEMPT`, keyed by `{file, contains}`, the offending Button's own opening-tag text rather than a line number.

---

### L42: no record closes while its own clock is still running

**The rule (R99 `no-close-while-timer-runs`).** Aurora's ruling, 21 Sep 2026, verbatim: *"cannot mark anything as closed (task, story, ticket, whatever) if there's an active time log running."* A story's Done button, a ticket's Close button and a ticket's Archive menu item all ask the same question, whether a timer is running on that record, and are disabled, with the reason *"Stop the timer first,"* while one is. The check lives at the door first (`refuseWhileTimerRuns`, `workers/content/src/lib/work-logs.ts`, `GuardError(409, "timer_running", "Stop the timer first.")`), and the button only reads the same fact back, the shape every mirrored refusal in this app already takes.

**Status: ruled and in build, 21 Sep 2026.** Three doors carry the check: a story's Done (`setStoryStatus`), a ticket's resolve (`setStatus`) and a ticket's archive (`setTicketArchived`). `tasks.ts`'s own Done door already carried this exact check, written inline before the shared helper existed, with its own note asking for the swap the moment it landed; that swap is a known pending site owned by the tasks lane, not made here.

**Law.** [R99](../RULES.md) (`no-close-while-timer-runs`), a source census, `web/test/no-close-while-timer-runs.test.ts`, over `workers/content/src/lib`: every exported function that both compares a status to one of "done", "resolved", "closed" or "completed" and writes a closing column (`status`, `completed_at`, `archived_at`, `resolved`) must call `refuseWhileTimerRuns(`, or be named in the check's own `CLOSE_DOOR_EXEMPT`, keyed by `{file, fn}`, a dated reason and never a line number.

---

### L43: the no-containers experiment, grouped sections lose their box in the tickets module first

**The ruling.** Aurora, verbatim, 21 Sep 2026: *"i am scarde about deploy8nig the o cntainers, is it possible to deploy in tickets module only? i wanna have it there, we review and iterate, and when good ship to the full app and update the ui kit and repo"*

**What changes.** The no-containers change (removing the grouping card box around sections like Assigned to, Related stories, Related tickets, Stakeholders, Effort, Detail and similar sections on detail screens, so they sit on the paper background directly instead of on a raised card) ships to the tickets module first as an experiment, gets reviewed and iterated there, and only then rolls out to the whole app, the UI kit and the repo. Chips, tabs, buttons, tables, toolbars, tiles and the conversation card stay boxed as they are. The No Containers page (five staging screens redrawn) was validated by Aurora on 21 Sep 2026: *"artifact validated, go ahead and deploy tickets when ready"*. Status: design validated, build in the tickets module pending her live review.

**Extended, 21 Sep 2026.** Aurora, verbatim: *"can yo do it also on tickets main?"* The tickets main page follows: the collection frame around the toolbar and the table, board, split or list on every tab, and the Overview chart panels, render plain; the board cards, the rows' washes, the triage well and the error and empty states keep their paper. Still the tickets module only.

**Her review of the live tickets pages, 21 Sep 2026.** Aurora, verbatim:

*"* the search on toolbar needs to have backhogunrd color
* bring abck the color on t stage in board view
* stakeholders raised by design like in the loop (chip like)
* same with assigned to (chiplike)
* on board view the acrds need some kind of border/shape (i like what you did in the artofact - see in screenshot your artifact)
* EVERYWHERE (not only tickets) align the gear settinsvvutton to middle horozotnal of title"*

**Reading it.** The toolbar search takes a fill; the board column head carries the stage colour; Raised by and Assigned to are chips like On the loop; board cards take the kit hairline on a plain ground; the module settings gear centres on the title line on every screen in both apps (a new rule for all modules, not the experiment).

**The rule (R100 `head-actions-centred`).** Her fifth item above, read on its own because it is not scoped to tickets or to this experiment: *"EVERYWHERE (not only tickets) align the gear settinsvvutton to middle horozotnal of title."* Every screen head that draws an action (a module settings gear, an edit pencil, or any other head-mounted control) beside its own title sits on the middle of the title's own line box: `items-center` on the row, never `items-start`/`items-end`/`items-baseline`. A head with a stacked title-plus-subtitle centres the action against the title element alone: split the title onto its own row, away from the subtitle underneath it, rather than centring against the whole two-line block. The kit's own `Title` composition already does this for free, since v1.2.146; this is for the app's own hand-rolled rows that never reached for it. Wired the day this law shipped: `web/components/records/collection-heading.tsx` and `web-portal/components/collection-heading.tsx` (both `action` rows, `items-start`/`items-baseline` → `items-center`), and `web/components/screens/kwapso-screen.tsx` (its title row split from the subtitle underneath it).

**Law.** [R100](../RULES.md) (`head-actions-centred`), a source census, `web/test/head-actions-centred.test.ts`, over `web/components`, `web-portal/components` and `shared/web`: every `<div>`/`<section>` whose `className` carries `flex` (a row, never `flex-col`) and both a title marker (`<h1`, `<Title`, `<Headline`, a bare `{heading}`/`{title}` expression) and an action marker (`ModuleSettingsGear`, a bare `{action}`/`{actions}` expression, `headActions`) in one JSX subtree must also carry `items-center`, or be named in `HEAD_ACTIONS_CENTRED_EXEMPT`, keyed by `{file, contains}`.

**Toolbar rhythm on tickets, 21 Sep 2026.** Aurora, verbatim: *"on tickets, reduce space above and under toolbar to 10px"*. Reading it: on the tickets page the tab strip carries no space of its own below the tabs, so the toolbar sits 10px under the tabs and 10px above the first row.

**Her review of the tickets pages after the toolbar rhythm, 21 Sep 2026.** Aurora, verbatim: *"i really loev the dircteion in which we are going, look sso minimal and clean / but the board component look sso bad :// / please, in artifact go and fix it / also, the ocntent on the main component need a bit more spacing on the sides / i am scraed making this switch will make us have to review all componets!! / for this reason, create an artifact with all components in ui kit that would change (the unchaged do not touch them) and show it to me / do think in ui! so do not just remove the container but make adaptations needed / the goal: make a more minimal clean app / the same spacing thats now before the footer i want above nav and on sides, bring more air"* **Reading it.** The direction is validated. The board needs a real design on the white ground, drawn in a page first. The content pane gets the same air above the nav row and on both sides as it has before the footer band. Before the switch goes app wide, a page inventories every kit component whose look changes under the plain surface, each with the adaptation it needs; unchanged families are left alone. Status: page in progress, decisions pending.

**Her decisions on the Minimal Kit page, 21 Sep 2026.** Aurora, verbatim: *"* board A / * space 6 / go an imlpement tis appwide, also implement the to the bottom edge for main content and assistant like in yur previous artifact / also, make footer not inside a container, but the full row side to side (withing the main content) / use subagents / do think a lot abouot each component, what this minimalising means so that it siill works / do not update the ui repo yet, we will first iterate on this"* **Reading it.** The experiment ends and the plain surface goes app wide: boards take option A (soft paper lanes, white raised cards with the hairline edge, the head inside the lane, a quiet placeholder at the top of an empty lane); the content pane's air is space-6 (24px) above the nav row and on both sides, the same as before the footer band; the main content pane and the assistant reach the viewport bottom with no gutter; the dark footer band spans the pane edge to edge as a full row; the kit changes are committed and tagged locally and synced, not pushed, until she closes the iteration.

**Status, 21 Sep 2026.** App wide, kit v1.2.149 local. The kit side is done and pulled
(`shared/ui/VERSION.json`; its CHANGELOG's top entry is the index to the ten parts). The
app side is done in both front doors: `CollectionCard`, `TicketSidePanel` and
`EmptyGatedPanel` all default to plain, so every module's grouping sections and every
collection frame in `web/` and `web-portal/` render plain without a call site naming it;
the toolbar's painted pill is retired; the collection tab strip's `tight` rhythm is the
only one left; the record footer band spans the pane edge to edge; the boards take the
kit's soft paper lanes by default. The tag is local and unpushed, at her instruction: *"do
not update the ui repo yet, we will first iterate on this"*.

**OVERTURNED under this ruling: K1, the collection panel keeps the card's paper
(2026-08-23).** The kit's own K1 reversal is what gave a collection frame its soft paper
slab in the first place, and every "the frame is the paper" sentence in this rulebook and
in the kit descends from it. It is overturned here rather than edited there: its words
stay exactly as written, because they are the record of what was decided in August and of
why the frame looked the way it did for a month, and a ruling that rewrites the ruling it
replaces leaves nobody able to see that anything changed. What is true after 21 Sep 2026
is this paragraph: a collection's frame paints nothing, and the soft paper the K1 reversal
put there is reachable but unused (`CollectionFrame panel="paper"`, `CollectionCard
surface="boxed"`) for a frame that genuinely stands on off-beige. The same overturning
reaches [R67](../RULES.md) (`sections-stand-on-paper`), whose first sentence was "each
panel stands on paper" and whose surviving clause is now "a section paints the page or the
kit's paper, never a stroke, never a hex".

**Her review of the minimal app, 22 Sep 2026.** Aurora, verbatim:

*"* screenshots: Look at the search bar in the toolbar. It has different distances from the left. Make sure that you make this exactly the same everywhere, by the way. The correct one on the screenshots is the one on status ready.
* Third screenshot: The empty collection now. We need to get rid of the card background.
* Reduce the space for the ID column everywhere. It's too much. And also rename it. I don't want it to be called ID. If it's ID for ticket, call it ticket. If it's ID for story, call it story.
* In the fourth screenshot, on the footer, there should be no white on the sides. Make the black go side to side.
* On the loop still has a background. Remove that in tickets. And everywhere where there is this error
* Fifth screenshot. That's definitely not what you showed me on the artifact. Make sure that you review your artifact, and please correct that. What's wrong is the alignment and margin in the metrics cards, and that the rows below should not have a background.
* 6th screenshot: The latest activity always has to be at the very bottom, and also make it a stripe, not a container. On the other hand, in any kind of screen that requires that the footer displays only one column instead of two, put the record on top and the latest activity on the bottom. On this screen, the whole "Assigned to", details, and deadline should not have a background."*

Reading, item one: the toolbar search field sits at the same left edge everywhere, matched to the status Ready construction (tickets_collection.tsx through paged_find.tsx), never a per screen inset.

Reading, item two: a collection's own empty state stops papering itself, in every ground it can land on, matching the plain page it sits on.

Reading, item three: every table's id column narrows to its own chip width and reads the record's own noun (Ticket, Story, and the rest), never the bare word "ID".

Reading, item four: the record footer's dark band (Latest activity, Record) fills the pane edge to edge, no page gutter left showing white on either side.

Reading, item five: the "On the loop" state and the matching error state drop their paper background in tickets, and on every surface that draws the same shape.

Reading, item six: the metrics cards on the story page take the alignment and margin her artifact showed, and the rows under them stand on no background at all.

Reading, item seven: Latest activity pins as a stripe at the very bottom of the record footer, never inside a container; a footer that must show one column instead of two stacks the record above it and Latest activity below it, and on that one column layout Assigned to, the details, and the deadline stand on no background either.

---

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

**AMENDED 2026-09-22 — the title's SIZE stopped living here, kit v1.2.150.** Until this date
`RECORD_TITLE_TREATMENT` also carried `RECORD_TITLE_SIZE`, a descendant selector forcing the
h1/44 step from outside, because the kit's `Title` primitive had no h1 rung for
`RecordDetail`'s `titleSize` to ask for directly. The client's later, standing typography
ruling caps every screen and record title at 32px, and the kit moved `RecordDetail`'s own
`titleSize` default from h1 to h2 (32px) at the source, so the override's one reason to exist
— reaching a step the kit's default could not reach — was gone; keeping it would have been a
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
the title's line box — `calc(var(--text-3xl) * var(--text-3xl--line-height))`, the h2 step's
own two tokens, the step the kit's `RecordDetail` renders a record's title at by default
since kit v1.2.150 (2026-09-22; this box tracked `--text-4xl`, the h1 step, until then, back
when the app forced h1/44 from outside through the app-side `RECORD_TITLE_SIZE` override,
since removed — [D11](#d11-every-detail-screen-wears-the-same-title-treatment-and-it-comes-from-one-constant)'s
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
pill row, gap, `--text-4xl` line box) and checked every B1 frame against that same line — the
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

---

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

### K18: a record with a face defaults to the gallery; the list is the alternate view

**The rule.** *"for accounts main: use gallery and add table as alternate view. filter by
account manager, country, status. sort by name - in the table columns: name status,
account manager, country."* — client, 14 Sep 2026. **The second body's WORD changed the next
day** — see [K22](#k22-rows-are-a-list-never-a-banded-table): "table" is retired everywhere,
including here, so the switch this entry describes is Gallery/List now, not Gallery/Table.
Nothing else about the rule moved: same second body, same `<RecordTable>`, same four columns.
The general shape: a collection whose records carry a picture or a logo opens on the gallery
(`CardGrid` + `RecordMark`, the same wall `members-gallery.tsx` already composes), offers the
list through `<ToolbarRow>`'s structured `view` slot ([K12](#k12-the-toolbars-slots-are-the-rows-in-one-order-and-sort-is-a-default),
the kit's `ViewSwitch`), and the list's own first column is the record's name carrying its
mark — never a bare label. Accounts is the first screen built to the shape:
`AccountsScreen` (`web/components/accounts/accounts-screen.tsx`) opens on
`view === "gallery"` ("the one on first load"), and its table draws four columns in her own
order — Name · Status · Account manager · Country — with only Name sortable
(`ACCOUNT_SORTS` has no order for the other three).

**Not a law, and the reason is on the record.** The engine's own `display: "gallery"`
(`screen-renderer.tsx`) would be the obvious chokepoint to derive this from — census every
recipe carrying a `picture`/`logoUrl`-shaped field for `display: "gallery"` — but Accounts'
own recipe (`accountsListRecipe`, `web/lib/screens.ts`) sets `display: "list"` and says so
itself: the screen no longer renders through `ScreenRenderer` at all, and `display`,
`leading` and `fields` on that recipe are explicitly VESTIGIAL, "kept in case a team's JSON
override still reads them, never consulted by the live screen." A census built against
`recipe.display` would therefore fail on the very screen the ruling is about — reading a
field the shipped code has already said it ignores is not an honest check, so this stays a
rulebook entry rather than a law until a real registry of host-composed screens exists to
check against instead.

### K19: Tasks — three tabs of your own, and a fourth for everyone's

**The rule.** The client's ruling, 2026-09-15, verbatim: *"For tasks in tab 'Overdue', I
want the board view by priority. This would be the secondary view. The main view would be
a table, and this is my tasks. This is my overdue tasks. Put the table, and the columns
would be: Task / Priority (has a color here) / Deadline / Department / Account / App /
Whatever you think relevant. Filters by priority, by department. For the tab 'Completed',
I want the view table only. Kill the tabs 'List' and 'Calendar' and replace them with a
new tab called 'Planned' or something like this. You choose the word. Here, I would like a
table view to be the main one, and then, as a secondary option, a board by priority and a
calendar by deadline. Also kill upcoming."* Her separate, standing ruling — "replace the
tab 'All' with 'Everyone's'" — reaches this screen too, in the follow-up the same day: the
old six-tab strip's status-agnostic "All tasks" is not retired with List/Calendar/Upcoming,
it is RENAMED and kept as a fourth tab, because it is the one tab that genuinely answers a
different question than the first three (team-wide rather than "this is my tasks").

**The tab strip.** `TASK_TABS`/`EVERYONE_TAB` (`web/components/work/tasks-screen.tsx`) is
now **Overdue · Planned · Completed · Everyone's** — four SERVER views (R14/R16), replacing
the six-tab strip (Overdue/List/Calendar/Completed/Upcoming/All tasks) this screen drew
before. The first three are MINE ("this is my tasks") — they narrow to the caller's own
name at the door unless the caller holds `all_tasks:read`; **Everyone's is the fourth, last
in the strip, and drawn only when the caller holds that same right** (`seesEveryones`) —
a caller who cannot see past their own name at the door would find it answering identically
to the first three tabs combined, so it is not offered. It is the door's own `all` view,
unchanged: no status filter, every task regardless of who has it. **Planned** is the
tester's own word for a precise definition: every OPEN task that is NOT overdue, whether or
not it carries a deadline at all — the exact complement of Overdue among the open ones, and
a strictly wider set than the old "Upcoming" view (dated, not yet due), which never included
an undated task. The door grew a matching `planned` view (`shared/types.ts`'s `TASK_VIEWS`,
`workers/content/src/lib/tasks.ts`'s `viewClause`) rather than relabelling Upcoming, which
stays defined (nothing else asked to lose it).

**The views, per tab, through the toolbar's structured `view` slot** ([K12](#k12-the-toolbars-slots-are-the-rows-in-one-order-and-sort-is-a-default)):
Overdue offers Table + Board by priority, **BOARD DEFAULT** (amended 2026-09-15, third pass —
"the default view on tasks overdue is board"; Planned's own default stays Table, the client
named Overdue alone and the two tabs answer different questions); Planned offers Table
(default) + Board by priority + Calendar by deadline; Completed offers Table only (the kit
still draws a static one-view label, kit v1.2.60, rather than the switch vanishing);
Everyone's offers the same pair Overdue does, Table (default) + Board by priority. All views
within one tab read the SAME search/priority/department-narrowed page — narrowing happens
once, ahead of the view switch, so Table→Board keeps what was typed.

**"TABLE" IS CALLED "LIST" NOW, EVERYWHERE — a later ruling the same evening, verbatim: "I
don't like this table anywhere, so anywhere in the app where you have it, replace it with
list. I don't want to say this again." The word above and everywhere else in this entry is
the SHAPE, unchanged (rows and columns, still `<Table>`/`<RecordTable>`, still literally a
table structurally); what changed is the LABEL a reader sees on the view switch —
`tableViewOption` (tasks-screen.tsx) reads `t("List")` now, value still `"table"` (nothing
stored, keyed or compared by that word changes), the identical word and glyph
(`ListBullets`) `tickets-collection.tsx`'s own view switch already uses for its own `list`
option. Applies to the word on every tab that offers it — Overdue, Planned, Completed's
static one-view label, Everyone's — from the one shared `tableViewOption` object.

**The table's seven columns**, one set for the three MINE tabs (replacing the old
everyday/completed split, since the Priority chip already carries what the two dropped
boolean columns — Important, Urgent — used to): Task, Priority (a coloured chip,
`Badge variant="status" dot={PRIORITY_DOT_TONE[level]}`, `shared/departments.ts` — the
first time anything in the app has coloured a task's priority), Deadline, Department,
Account, App, Who has it (Assignee). Completed adds an eighth, Closed. Status is
deliberately NOT a column: every tab is already a status scope (Overdue/Planned show only
open tasks, Completed only done ones, and Everyone's carries no filter of its own to
narrow it further), so a Status column would repeat one word down every row of whichever
tab is open. **Everyone's reorders rather than adds** (`EVERYONE_COLUMNS`): the same seven
fields, Assignee moved second — right after Task, ahead of Priority — because "whose is
this" is the first question a team-wide scan asks, where on the three MINE tabs it is a
fact about the reader themselves and belongs at the quiet end of the row.

**The board is editable, Everyone's included.** `content.updateTask` already replaces the
two ticks (`important`/`urgent`) that derive `priority`, the same door the edit form writes
through, so a drop sends the task's whole current shape back with the two ticks set for the
column it landed in (`movePriority`, tasks-screen.tsx) — contrast the tickets board
(tickets-collection.tsx's `OpenBoard`), which stays read-only because its stages are
flipped by OTHER events a drag would fight. Gated on `work:update`, on every tab that draws
a board — on Everyone's, that means a reader with the right can correct someone else's
priority from the board, exactly as they already could from that task's own record.

**The filter menu's own quirk, written down rather than hidden.** Priority's four options
are the app's own SCALE — 4→1, the door's own default order — but the shared facet reader
(`useFilterBar`'s `optionsFor`, [K17](#k17-the-options-a-control-offers-are-a-to-z-in-the-readers-own-language))
sorts every facet's options A→Z unconditionally, with no per-facet escape hatch at that one
chokepoint. So the FILTER DROPDOWN reads alphabetically ("Do it now" · "Important" ·
"Urgent" · "Whenever") while the table column and the board columns both read the true
4→1 order — an accepted, R75-driven consequence rather than a bug.

**AMENDED 2026-09-15, SAME DAY, A FEW HOURS LATER — six more rulings over the freshly
shipped strip.** Each is the client's own words.

1. *"On the toolbar, there is an add button with a plus, but there is also one underneath.
   There should only be one, and the correct one is in the toolbar."* The Table view's own
   `<RecordTable useKitPanel>` read the AMBIENT create action `<SectionWithCreate onCreate={…}>`
   publishes downward (`CollectionCreateActionProvider`,
   `shared/web/screen-engine/collection-frame.tsx`) and drew its own icon-only button in its
   ready-state toolbar even with every other kit-panel control switched off. Fixed the way
   `apps-screen.tsx`'s own list body already had to be: the Table render is wrapped in
   `<CollectionCreateActionProvider action={null}>`, so only the screen's own toolbar
   `<AddButton>` remains.
2. *"On overdue tasks, it's only mine, so make sure you filter it to me and remove the
   column 'Who has it'."* Until this the door's `all_tasks:read` gate decided the narrowing
   for EVERY view, so a caller who could see everyone's got everyone's on Overdue/Planned/
   Completed too — the fourth tab bought that reader nothing the first three did not already
   show. `getTasks` (`workers/content/src/routes/todos.ts`) now narrows those three views to
   `assignee_id = caller` UNCONDITIONALLY (`MINE_VIEWS`); `all_tasks:read` decides only whether
   `all` — the door's status-agnostic view, the Everyone's tab — comes back un-narrowed. "Who
   has it" (Assignee) is dropped from `TASK_COLUMNS`/`COMPLETED_COLUMNS` for the identical
   reason Status was already dropped: a column reading the same name (yours) down every row is
   furniture. `EVERYONE_COLUMNS` keeps it, second, right after Task.
3. *"also, add the logos to account and app."* The Account and App cells now draw
   `<RecordMark picture={…} name={…} />` beside the word — the same node `shape.tsx`'s
   `shapeAccountsList` draws for the Accounts table's own Name cell — fed by two fields the
   door did not carry before this pass, `accountLogoUrl`/`appLogoUrl` (`shared/types.ts`'s
   `Task`, joined in `workers/content/src/lib/tasks.ts`'s `TASK_COLS` off
   `accounts.logo_url`/`apps.logo_url`).
4. *"On tasks, on the list, add the sort to the toolbar and add sort by task priority and
   deadline. That's it. Make sure you remove it from the headers."* / *"the default sort is
   always by priority, so top priority on top, and after that, the deadline. I mean, within
   the same priority."* Tasks was `TOOLBAR_SORT_EXEMPT` until this pass — the exemption argued
   the Table view ordered by its own column headers, which R53 [K12](#k12-the-toolbars-slots-are-the-rows-in-one-order-and-sort-is-a-default)
   otherwise requires a reasoned exemption to skip. The exemption is DELETED
   (`shared/rules/registry.ts`) and so is the Table's own header-click sort: no `TableColumn`
   carries a `sort` key any more, so a header renders as plain text and `record-table.tsx`'s
   own `ordered()` is never reached (`if (!by) return rows`). ONE comparator now
   (`compareTasks`, `tasks-screen.tsx`), computed over the raw `Task[]` before the row is
   shaped: the toolbar's `<SortControl>` offers exactly Priority (default, descending — 4→1)
   and Deadline (default, ascending — soonest first), and picking either lands on that field's
   own default direction. TIES are fixed by the PRIMARY field and do not themselves flip with
   the direction toggle: sorting by Priority breaks a tie by deadline ascending, undated last;
   sorting by Deadline breaks a tie by priority descending (the app's own 4→1 scale) — the
   mirror-image sentence the client gave for each.
5. *"The whole 'waiting on clients': remove it from tasks. This is a completely different
   module, and we will put this somewhere else, but remove it from tasks."* The to-do panel,
   its two dialogs and its Open/Done counts are gone from the Tasks screen only — the door
   (`workers/content/src/routes/todos.ts`), the lib (`workers/content/src/lib/todos.ts`), the
   types (`shared/types.ts`'s `TODO_VIEWS`) and the cache key (`todosKey`) are untouched, and
   `TodosPanel` still renders on an account's own record (`account-detail.tsx`) and a contact's
   (`contact-detail.tsx`), each with its own raise/cancel controls — so the door keeps a
   working front door and this was never its only one. Awaiting the new home the client named.
6. *"on the board view for overdue, in the headers, I want to see the color of this priority,
   and the sort inside should be by deadline. On the top, the earliest deadline."* / *"on the
   tasks board view, when empty, don't show anything at this stage, but nothing on this
   priority."* Applied to every tab that draws a board (Overdue/Planned/Everyone's). The kit's
   own `KanbanColumn.dot` takes the identical tone union `PRIORITY_DOT_TONE` already resolves a
   priority to, so the column head carries it directly; the cards inside are sorted deadline
   ascending, undated last, FIXED — independent of whatever the toolbar's own Priority/Deadline
   sort is set to, because the board's within-column order was never that control's question.
   An empty column passes `emptyLabel: ""` so no placeholder sentence draws; the kit's own
   `EmptyRegister` box (also the column's drop target) still occupies the space at rest, which
   is as far as an app-side screen can take the ruling without a kit change — filed as a
   finding rather than patched around `shared/ui/`.

Rulings 2, 4 and 6 apply to Planned and Completed too, not only Overdue (Completed: table
only, still mine, still no "Who has it"); Everyone's keeps the assignee column and reads the
same sort/filters/logos as the three MINE tabs.

**AMENDED AGAIN, SAME EVENING, STILL LATER — "why now don't I see any task on any tab?"**
The unconditional narrowing ruling 2 shipped a few hours earlier had an unintended second
effect: read against the Kwapso team's own staging data, 254 of 259 tasks carry no
`assignee_id` at all, so `assignee_id = caller` left Overdue/Planned/Completed showing
almost nothing for almost anyone — unclaimed work included — not "one reader's tasks
specifically gone missing". The client's own words for the fix: *"a task nobody has is on
my list too."* `getTasks` now narrows those three views to `assignee_id = caller OR
assignee_id IS NULL` (`includeUnassigned`, `workers/content/src/lib/tasks.ts`'s
`TaskFilter`/`taskWhere`/`countTasks`) — an unclaimed task rides every caller's MINE tabs
alongside their own, badges included (R16: `countTasks` takes the identical OR-NULL clause,
never a narrower one than the rows it counts). Scoped to exactly those three views: Everyone's
already shows every row, claimed or not, and a caller who reaches for `all` without
`all_tasks:read` is still narrowed down to their own name only, no unclaimed bonus — the
OR-NULL widening is a MINE-tab question, not a permission grant. The by-id lookup
(`GET /api/content/tasks?id=`) was widened to match — `one.assigneeId === null` reads as
"mine" there too, unconditionally, so a task a MINE tab just showed never 404s one click
later. Proved in `workers/content/test/todos-tasks.test.ts`, describe block "an unassigned
task rides the three MINE views too, not only its own".

**FOUR MORE ITEMS, THE SAME EVENING'S THIRD PASS.** Each the client's own words, each
applied in `web/components/work/tasks-screen.tsx`.

- *"the task list is not correctly aligned. It is missing some width. Just replicate the
  list component as we have it in tickets."* The Table view's own toolbar
  (`<SectionWithCreate useKitPanel={false}>`) already sits inside its own card; nesting
  `<RecordTable useKitPanel>`'s DEFAULT row frame — a second, rounded `bg-surface-panel`
  card (`record-table.tsx`'s `renderItems`) — inside it read as inset and narrower than the
  flush toolbar above. `<RecordTable>` gained an opt-in `frame="bare"` prop (default
  `"panel"`, unchanged everywhere else) that drops the extra card, leaving a plain
  `<Table>` — the identical frame `tickets-collection.tsx`'s `TicketRowsTable` already
  draws for its own tabs. Tasks is the only call site that passes it; the other six
  (Accounts, Contacts, Meetings, and the two settings screens) are untouched.
- *"The default view on tasks overdue is board."* `overdueView`'s `useRemembered` default
  changed from `"table"` to `"board"`. Planned's own default stays Table — the client named
  Overdue alone, and the two tabs answer different questions (Overdue is "what is on fire,
  worst first"; Planned is still the wider list of what is not yet due). A reader who has
  already switched either tab keeps what they chose (`useRemembered` persists per reader
  from the first switch).
- *"adding a chip inside the board component with the app, account, or department, whatever
  is the most detailed… if it has app I only see the app; if only account, the account; if
  only department, department — in a chip on top of the title, like we have it already
  somewhere else."* That "somewhere else" is [K16](#k16-on-a-card-that-stands-for-a-record-the-chip-sits-above-the-title)/R65:
  `KanbanCard.badges` is the exact slot, the same one the tickets board already draws its
  own chip through. **AMENDED 2026-09-16 by client ruling, verbatim: "Replace the chip for
  always the department."** The board chip ALWAYS shows the task's department (plain text,
  no mark); a task with no department shows no chip. App and account no longer appear in the
  board chip — they remain in the list's Account/App columns and the week view's detail
  line, which was simplified to department-only for consistency.
- *"On Everyone's, add the column 'Closed On' or 'Finished On'."* `EVERYONE_COLUMNS` gains
  an eighth column, `closed`, reading the identical row key Completed's own eighth column
  does (`t.completedAt`, blank "—" for a task still open) — labelled "Closed on" rather than
  Completed's plain "Closed", because Everyone's mixes open and done rows where Completed's
  are all done, so the fuller label reads correctly beside a row with no answer yet.
  Overdue/Planned do not gain it: every row there is open by construction, so the column
  would read "—" down every line — the same furniture reasoning Status and "Who has it"
  were already dropped for.

### K19a: Priority has its own four colours, never App Stage's

**The rule.** The client's ruling, 2026-09-15, verbatim, the same day K19's "Priority (has
a color here)" shipped: *"For the priorities: 4: keep the red. 3: use the orange. Urgent:
use the purple. Whenever: use the blue."* Checked against `PRIORITY_LABEL`
(`shared/departments.ts`), never assumed: 4 is "Do it now", 3 is "Important", 2 is
"Urgent", 1 is "Whenever" — so the ruling reads **4 → red · 3 → orange · 2 (Urgent) →
purple · 1 (Whenever) → blue**.

**What shipped first, and why it moved.** `PRIORITY_DOT_TONE` had no existing chip to
reuse, so it borrowed four of `Badge`'s six App Stage lifecycle tones —
`archived`/`review`/`building`/`blocked` — "the only reusable name in reach", not because a
priority is a stage. One borrowing was a real defect, not a style question: `building` is
charcoal, the exact hex `--surface-inverse` is in light, so a priority-3 dot vanished
wherever the two met, and in dark it tripped `Badge`'s `building`-on-mango special case by
accident, painting the whole chip the one colour this system reserves for the brand — one
rank below "Do it now". The artifact at
`claude.ai/code/artifact/895888b7-ca1a-4df0-ae2d-c61b9127fb4e` measures the old mapping
against the new, side by side, with the contrast numbers for each.

**The tokens.** Four new tones, kit v1.2.89 (`shared/ui/foundations/tokens/tokens.css`):

| Priority | Word | Tone | Token | Source |
|---|---|---|---|---|
| 4 | Do it now | `red` | `--dot-red` | `--destructive` (`--kw-poppy` light / `--kw-poppy-lift` dark) |
| 3 | Important | `orange` | `--dot-orange` | `--warning` (`--kw-orange`, admitted 2026-09-02) |
| 2 | Urgent | `purple` | `--dot-purple` | `--kw-lavender` (admitted 2026-09-02, chart series 4) |
| 1 | Whenever | `blue` | `--dot-blue` | `--kw-sky` (the same hex `--info` reaches, under a name that means priority rather than "informational") |

No new hex for any of the four — every one is a colour the kit had already admitted.
`PriorityTone` (`shared/departments.ts`) is a type SEPARATE from `DotTone`
(`shared/app-stages.ts`), not four members bolted onto it — `record-week.tsx` and
`tickets-collection.tsx` each hold an exhaustive `Record<DotTone, …>` over the app-stage
six, and widening `DotTone` would have silently demanded four more entries in both, neither
of which has anything to do with a task's priority. `Badge`'s `dotTone` variant and
`Kanban`'s `KanbanColumnDot` both grew the matching four entries in the kit itself,
additively: none of the four is `building`, so the dark-mode mango special case stays
scoped to that one App Stage tone and can never fire for a priority chip again.

**Not a law.** Like K18, this is an arrangement/vocabulary decision recorded for the next
reader, not a registry check — `shared/departments.ts`'s own comment on `PRIORITY_DOT_TONE`
carries the same ruling and is the source to trust if the two ever disagree.

### K20: calendar views carry no sort

**The rule.** When a collection's active view is a calendar, a week or an agenda, its
toolbar draws no sort control at all — even where the screen still hands `<ToolbarRow>` a
`sort` config, because its OTHER views (Table, Board) genuinely want one. The suppression
lives in the row itself: `<ToolbarRow>` (`web/components/deep-link/screen-bits.tsx`) checks
its `view` slot's active value against `NO_SORT_VIEW_VALUES` (`"calendar" | "week" |
"agenda"`, the same file) and drops the `<SortControl>` it would otherwise build, on every
render, regardless of what `sort` is given. No call site can opt back in by continuing to
pass `sort` once its view lands on one of those three.

**Why it exists.** The client's ruling, 2026-09-15, over the week view design (see
[K12](#k12-the-toolbars-slots-are-the-rows-in-one-order-and-sort-is-a-default), R53, the
sort slot's own law): *"Never put the sort in calendar components. Make this a law. Makes
no sense."* K12 already lets a screen say "my rows have no order to offer" one exemption at
a time (`TOOLBAR_SORT_EXEMPT`) — three of those entries were already a month grid, a
calendar-shaped queue and a grouped pair of lists, the identical argument this law makes.
What changed is that a CALENDAR-SHAPED VIEW no longer gets to make that argument
screen-by-screen: it is a fact about the shape, decided once, centrally, rather than a
decision every future calendar/week/agenda screen has to remember to re-make.

**Law.** [R78](../RULES.md) (`no-sort-in-calendar-views`).

---

### K21: Sprints live inside Waves; no Sprints main page

**The rule.** A sprint has no sidebar destination and no top-level collection screen of
its own. It is planned and opened from the wave it belongs to: wave-detail.tsx's own
Sprints tab lists the sprints already in the package, and its "Plan a sprint" button
(plus "Put a sprint in this wave" for moving one already on the books) is the only door
that creates one. Opening a sprint from there lands at the nested address
`/waves/<waveId>/sprints/<sprintId>`, so its breadcrumb trail reads Wave → Sprint — never
a generic "Sprints" rung in between, the same nested-crumb shape `/apps/<id>/sprints/<id>`
already used. Waves leads the Build section of the sidebar now, first rather than last.

The `sprints` MODULE itself is unchanged: Settings › Modules and the roles matrix still
list it, and its permission right still gates the wave's own Sprints tab. Only the
stand-alone collection screen — the sidebar row, the `/sprints` top-level route, and the
render branch that drew it — is gone.

**Why it exists.** The client's ruling, 2026-09-15, verbatim: *"Regarding sprints and
waves, sprints go inside waves. I would suggest killing the sprints main page completely
and just keeping the waves one on top of the build section on the sidebar."* A wave IS
its sprints — putting one in or taking one out is the only thing that changes what the
package runs between — so a second, parallel place to browse sprints outside their wave
was two doors to the one fact, and the client asked for the redundant one closed rather
than kept in sync.

**Law.** [R64](../RULES.md) (`sections-have-a-door`) — `SECTION_HOSTED_ELSEWHERE.sprints`
(`shared/rules/registry.ts`) is the reasoned line that keeps the census honest about
where the capability lives now.

---

### K22: rows are a list, never a banded table

**The rule.** `RecordTable` (`web/components/records/record-table.tsx`) — the one
row-collection component every screen but Tickets' own bespoke `TicketRowsTable` draws
through — draws exactly ONE shape now: a flush, full-width `<Table>` with plain uppercase
column heads over hairlines, no hover wash on the header row, and nothing wrapping it. It
used to draw a second shape by DEFAULT — that same table boxed a second time in
`overflow-hidden rounded-[var(--radius)] bg-surface-panel`, a grey, rounded, inset card —
and that second box is gone from the component's source entirely, not merely switched off.
Every caller already sits inside ONE surface of its own (a `CollectionCard` from
`<PagedFind>`'s `wrap`, or the kit's own `useKitPanel` collection panel), so the banded
shape was always a redundant, doubly-nested box standing beside Tickets' own flush one —
never a legitimate alternative. The `frame` prop that used to choose between the two shapes
still exists, for source compatibility with the Tasks lane's own pre-existing call site, but
it accepts only the literal `"bare"` now and is never read: no call site can even ask for
the old look at compile time. A view switch that used to offer "Table" as a body offers
"List" instead — Accounts' own Gallery/Table switch is Gallery/List now, with the kit's list
glyph (`ListBullets`) beside it, matching Tickets' own view switch rather than the kit's
plain table icon.

**Why it exists.** The client's ruling, 2026-09-15, verbatim: *"On accounts, I want the
views to be gallery and list. I don't like this table anywhere, so anywhere in the app
where you have it, replace it with list. I don't want to say this again."* Earlier the same
day, about Tasks: *"Just replicate the list component as we have it in tickets. It's
already good there."* `<RecordTable>` had grown an opt-in `frame="bare"` a few hours before
that second ruling, for exactly one caller (`tasks-screen.tsx`, over a screenshot: "the task
list is not correctly aligned, it is missing some width") — proof the banded box was
visible and wrong, patched for the one screen she happened to be looking at. Her later
ruling, read literally, is the opposite of an opt-in: a component that defaults to the
wrong shape and offers an escape hatch is a rule with one way around it per call site that
forgets to ask, which is exactly how six screens ended up drawing the band while one did
not. So the escape hatch is deleted along with the shape it escaped, rather than widened
into six more `frame="bare"` call sites.

**Law.** [R80](../RULES.md) (`rows-are-a-list`) — `web/test/rows-are-a-list.test.ts` reads
`record-table.tsx` off disk for the banded fill and walks every `<RecordTable` mount across
`web/` for a `frame` prop carrying anything other than the literal `"bare"`.

**SETTLED, 16 SEP 2026** — the word for the whole app, not only the screens above: "List"
names this shape, the flush `RecordTable`/`TicketRowsTable` column list, and never
`shared/web/list-compat.tsx`'s two-line row, which Meetings briefly drew under that same
name and the client corrected by name ([B7](#b7-a-view-switch-is-a-labelled-pill-not-a-plus),
this document, carries the ruling verbatim).

---

### K23: Apps — gallery and board by stage, never tiles or a table

**The rule.** The client's ruling, 15 Sep 2026, verbatim: *"For the main screen for the
apps, I want the gallery icon laid out. Make sure you add a chip with the status. I also
want you to add an alternate view board by stage. Include the icon, and in both of them, I
want to see the status. In the gallery, make this a chip, then the title and the subtitle:
the name of the account. In the board, make the icon bigger, and as you have it, the title
and subtitle: account name."* This replaces the Tiles/List pair the 2026-08-31/2026-09-01
rulings put on `AppsScreen` (`web/components/apps/apps-screen.tsx`): Tiles becomes Gallery
(a flat `CardGrid`, K18's own shape) and List is dropped outright rather than kept as a
third view — no law pins it (`web/test/rows-are-a-list.test.ts` (R80/K22) governs
`<RecordTable>`'s own shape and never reached Apps, whose old List body rendered through
the screen ENGINE, `ScreenRenderer`, not `RecordTable` — so its removal answers this brief's
own "remove it unless a law pins it" clause honestly: none did).

**"Status" is the app's own stage.** `AppRow` (`shared/types.ts`) carries no separate status
field — an app's lifecycle IS its `stage` (`shared/app-stages.ts`), the same fact
`app-detail.tsx`'s own three pills already draw a coloured `Badge` off. Both new views draw
`<Badge variant="status" dot={appStageDotTone(app.stage)}>{t(app.stage)}</Badge>`, above the
title in source order ([K16](#k16-on-a-card-that-stands-for-a-record-the-chip-sits-above-the-title)/R65).

**The Gallery** is a flat `CardGrid` of kit `Card`/`CardTitle` cells — `RecordMark`
(`size="band"`, the same size K18's own accounts wall draws), the status chip, the title,
and the account name as a subtitle line. THE SUBTITLE IS A CARD FACT, NOT A PAGE HEAD — R72
(`no-default-subtitles.test.ts`) was amended 2026-09-14 to read the kit's own `CardTitle` as
a heading, so the subtitle is built as a variable and interpolated (`{subtitle}`) rather
than written as a literal prose tag the very next JSX sibling of `<CardTitle>` — the same
escape `accounts-screen.tsx`'s own `accountGalleryBody` already takes for its manager chip.

**The Board** is the kit's `Kanban` (`shared/ui/components/kanban/kanban.tsx`), one column
per stage in the team's own "App stage" vocabulary order (`useAppStages`, exported from
`app-form-dialog.tsx` — the identical team-ordered read that picker already made, never a
second one with its own fallback), plus a trailing "No stage yet" column so an app with none
recorded is never invisible. NEVER A→Z: R75's own `ORDERED_OPTIONS_OK` names the class of
list this is (a lifecycle pipeline read left to right), though no registry line was needed
here — the board's columns are a plain array fed to `<Kanban columns=…>`, never a
`<SelectItem>`/`options=` prop, so R75's own picker census does not reach it. Each column's
dot is the stage's own tone (`appStageDotTone`) when the code recognises the stage, absent
otherwise. Cards carry the status chip, the icon — bigger than the Gallery's
(`RecordMark size="board"`, 80px, the fifth NAMED size in `shared/web/record-mark.tsx`,
added for exactly this call site rather than a className fighting the size prop) — beside
the title (the vendored card draws chips, then title, then description, then `content` LAST
always, with no leading-media slot before the chip row to put a big mark in without
hand-editing the pinned kit, R39), and the account name as `description`. Dragging a card
calls the app's existing update door (`POST /api/tenancy/apps/update`, gated
`processes:update`, the same right the app record's own edit form writes through) with the
minimal patch — `id`, the always-required `name`, and the new `stage` — so a drag can never
silently empty an app's staff, logo or context. `emptyColumns="bare"` (client ruling,
2026-09-15, the same sentence that shipped the Tasks board's own): a team with few apps
across many stages draws no boxed "nothing here" registers, only a thin, still-droppable
zone.

**Not a law**, for the identical reason [K18](#k18-a-record-with-a-face-defaults-to-the-gallery-the-list-is-the-alternate-view)
gives: the engine's own `display: "gallery"`/`"list"` would be the obvious chokepoint to
derive a Gallery-default rule from, but `appsListRecipe` (`web/lib/screens.ts`) sets
`display: "list"` and is explicitly VESTIGIAL — the screen renders through neither branch —
so a census built against `recipe.display` would fail on the very screen this entry is
about. Recorded here for the next reader rather than checked, until a real registry of
host-composed screens exists to check against instead.

**Amendment, 16 Sep 2026 — one flat pill ground, the dot is the only thing that
changes.** The client's ruling, verbatim: *"show me the different colors for
the pills for the status, and make sure that there is a space between the
color dot and the name. Make sure that all the pills have a background,
because currently development does not. All of them should have the same
color background. What changes is the color of their dot."* Two defects, one
app-side and one kit-side, both traced rather than guessed.

*The gap.* Both call sites left `size` unset on `<Badge variant="status">`,
which defaults to `size="counter"` — the 20-tall COUNT chip, with no `gap-*`
of its own — never CH11's 26-tall status-pill geometry (`size="pill"`,
`--control-height-pill`, `gap-2` between the dot and the word). Fixed by
naming the size, not by a space character (R28/R66 both forbid a literal
glyph standing in for a token). `record-chrome.tsx`'s own `IDENTITY_ROW`
already forced this geometry for the record head's own chips by a different
route (`[&_[data-slot=badge]]:gap-2` etc.), which is why the detail screen's
three pills were never part of this complaint.

*The background.* `variant="status"`'s own fill, `--pill-fill`
(`shared/ui/foundations/tokens/tokens.css`), is `var(--card)` — CH11 draws
the status pill sitting on `--sheet`, "the OTHER paper tone from the panel it
sits on" (`badge.tsx`'s own header). Both places this chip renders — the
Gallery's `<Card variant="raised">` and the Kanban board's own card — are
THEMSELVES `bg-card`, so the pill's fill paints the exact colour of the card
underneath it, in both palettes: a background that equals its own container,
`card.tsx`'s own documented failure ("a `--card` box on the page draws
nothing at all") one layer further in. It was invisible on every stage, not
only "Development" — a coloured dot beside it still read as "a chip is here"
for the other five; `building`'s dot is close to the label's own ink, so
Development was the one stage with nothing left to read. Fixed the way
`record-chrome.tsx`'s `IDENTITY_ROW` already fixes the identical collision for
the record head — a local `bg-surface-panel`/`text-foreground` rebind at the
two call sites this screen owns (`STAGE_PILL_PROPS`, `apps-screen.tsx`) —
rather than inside `Card`/`Kanban`, which neither this entry nor this lane
touches.

*The kit bug underneath it — PROPOSED, NOT YET SHIPPED.* Ruling 26's dark
clause puts exactly one tone — `building`, the one this app's own vocabulary
uses for three of its eight stages (Development, Documentation, Iteration) —
on a mango fill with a charcoal label and dot in dark mode, the one stage
whose PILL changes colour at all. That directly contradicts this ruling's
second sentence ("all of them should have the same color background"), so
`badge.tsx`'s `status`+`building` compound variant needs to be retired: every
stage's pill would then share one fill and one label ink in both palettes,
and only `DOT_FILL[dot]` — the plain per-tone dot colour every other stage
already uses unmodified — decides what changes. **Not made this session**: a
second kit lane was tagging v1.2.90 (the assistant strip) at the same time,
and this lane's brief was to wait for that tag, pull, then tag v1.2.91 on top
of it. 25 minutes of polling `git ls-remote --tags origin` never saw v1.2.90
land, so the Badge/tokens edit was not made and the app is still on the kit
pin it started the session on. The app-side fix above (`STAGE_PILL_PROPS`)
already gives every stage pill the same visible background regardless of this
— it forces `bg-surface-panel`, which wins over whatever `badge.tsx` computes
internally — so the client's complaint is fixed on screen either way; what is
still open is retiring the dead-in-practice dark-mode special case at its
source so a future caller of `variant="status"` outside this screen does not
inherit it. Next session: check whether v1.2.90 has landed, pull, make this
edit, tag v1.2.91, sync, and update this paragraph.

---

### K24: Waves — Active/All tabs, T3's segmented timeline, day-chip calendar, and a real list

**The rule.** The Waves main screen carries two tabs, **Active** and **All**
(the client's ruling, 15 Sep 2026, on top of the earlier "sprints go inside
waves" ruling K21 already carries): *"For Waves main screen, we need a
timeline… two tabs: Active: I only want the timeline. All: I want a
timeline, calendar, and list. In Active, I also want the calendar, but the
main one stays the timeline."* Both tabs badge their own exact count (R16 —
`formatCount` over the already-loaded, bounded collection, never a second
round trip for a number already in hand) through the same
`renderFolderTabs`/`CountedAbove` arbitration every other tabbed collection
screen uses. Active offers Timeline (default) and Calendar; All offers
Timeline (default), Calendar and List. The toolbar's slot order is
untouched (R53: search → filters → sort → view → actions) — only the sort
slot's own presence changes: it is withdrawn on Timeline and Calendar and
shown only on List, R78's own law, amended the same day to add `"timeline"`
to `NO_SORT_VIEW_VALUES` (`web/components/deep-link/screen-bits.tsx`) —
*"the timeline is time-ordered too."* `web/components/work/wave-finder.tsx`
(a registered `TOOLBAR_CONTROL_OWNERS` hand-copy of `<ToolbarRow>`, since it
predates that row's own `period`/`view` slots) reads the same set directly.

**T3 — one bar per wave, cut into its own sprints.** *"I choose T3"*, over
three drawn variations (nested rows; the wave as a swimlane; the wave as one
bar segmented by its sprints) — T3 is the segmented-bar reading. Each dated
wave is one row on a week-gridded time axis; its bar is sliced into its own
sprints, IN DATE ORDER, each segment toned by `sprintState` (`upcoming` ·
`running` · `wrapped` — the same three-state derivation the Sprints tab
already reads, exported from `sprints-screen.tsx` rather than re-derived),
labelled with the sprint's own name, and a gap between two sprints (or
before the first / after the last) draws as the wave's own quiet base bar.
A wave with dates but no sprint row this window could find for it (the
defensive edge case, never the ordinary one — a wave's dates ARE derived
from its sprints) draws as one plain, unclickable base-toned bar across its
own range — *"a wave with no sprints is a plain bar."* Today is marked;
prev/next/today controls sit above the grid, `RecordCalendar`'s own shape;
clicking a segment opens `/waves/<id>/sprints/<sprintId>`; clicking the row's
own name opens the wave; on a phone the whole grid scrolls horizontally with
CSS scroll-snap (the artifact's own pick) rather than losing the grid.

**Why a bespoke host (`web/components/records/record-timeline.tsx`) and not
the kit's `Gantt` (CH27.26).** `Gantt` genuinely supports several
non-overlapping bars in one lane, which technically covers "one wave, several
sprint segments" — but three of its own laws are load-bearing and none of
them is this ruling's shape: SIX PERIODS IS A CEILING, NOT A HINT (this
screen wants the whole visible window in view, never stepped six at a
time); THE STEPPER IS THE ONLY WAY TO MOVE, and below 720 the grid is
REPLACED by one row per lane (this ruling asks for prev/next/today on every
width, and a phone that scrolls the grid itself with snap, never a
fallback that drops it); and FIVE FIXED TONES WITH NO NEUTRAL ONE (a gap
segment has no accent to wear, and giving `Gantt` a sixth tone is a kit
change outside this round's authorised scope — the Calendar's span
primitive below, not the Gantt). Reusing `Gantt` here would mean the
timeline is either honest about its own axis and silently breaks the kit's
stated law, or bent to fit a shape the client did not ask for — so this is a
second, bespoke, HOST-COMPOSED component instead, built only from the kit's
own primitives (`Button`, its icons, its colour tokens: `bg-chart-1`,
`bg-chart-2`, `bg-surface-inverse`, the hairline shadow tokens, never a
`border` property), the same category CLAUDE.md already names for
`roles-matrix.tsx`. R39 stays intact — nothing here imports a UI package the
kit does not already carry — and `waves-screen.tsx` is this component's only
caller, the same "one host" pattern the ONE CALENDAR law already keeps for
`record-calendar.tsx`.

**Calendar — multi-day spans since v1.2.90.** Waves and sprints draw as multi-day
spans through `RecordCalendar`, the app's one door into the kit's month
grid (the ONE CALENDAR law) — shipped start-day-only on 15 Sep; spans since v1.2.90, 16 Sep. A wave's own span and its sprints' spans share one colour (the same `accentClass` hash keyed off
the wave's id, for free), a sprint's span carries its wave's name as the
detail line, and clicking either opens the record. A wave or a sprint
that runs three weeks shows as three weeks on the grid through `record-calendar.tsx`'s `expandEntry`, which walks each day from `startsOn` to `endsOn` and caps both ends — the kit's own `CalendarEvent.span` renders the multi-day primitive (`spanId`/`position` on `calendar-view.tsx`), and `waves-screen.tsx` passes `endDay` for waves and sprints alongside `day` and `accent`.

**List — R80's shape, All tab only.** Wave (ref + name) · Account (`RecordMark`,
the same choice-sized mark the account picker already draws) · Sprints (the
exact count, plus up to five small state-toned dots for the sprints inside
it) · Start · End · State (the wave's own active/switched-off, `Badge`).
Through `RecordTable`, which by R80 draws exactly one shape now (flush, no
second banded card) — its own chrome stays off (`searchable`/`sortable`/
`showCount: false` in the `CollectionConfig` handed to it) because
`WaveFinder`'s own search and sort, shown only on this view, already answer
those questions once; a second copy would be the "different toolbar
variations" the client has twice ruled out.

**Law.** [R16](../RULES.md), [R53](../RULES.md), [R78](../RULES.md)
(`no-sort-in-calendar-views`, amended this same day — see its own entry,
[K20](#k20-calendar-views-carry-no-sort)), [R80](../RULES.md)
(`rows-are-a-list`). The T3 timeline's own shape and the tab split are recorded here for the next
reader rather than independently checked — the same "not a law" footing
[K18](#k18-a-record-with-a-face-defaults-to-the-gallery-the-list-is-the-alternate-view)/[K23](#k23-apps-gallery-and-board-by-stage-never-tiles-or-a-table)
stand on, until a registry of host-composed screens exists to hold a bespoke
component's own shape to something checked rather than read. The Calendar's
multi-day span capability is now in place as of v1.2.90, 16 Sep 2026.

**Amendment, 16 Sep 2026 — the app's face, a broken toolbar, a new facet, and
a status pill.** The client, over a screenshot of the shipped screen,
verbatim: *"Great work there. However, what I want in the left column is the
name of the app and the icon. Look at the third screenshot. The container
looks broken. Fix it. I want, in Waves, the filter by sprint type. On waves,
all list: make status a colored pill."* Four changes, each recorded where its
reasoning lives:

1. **The T3 timeline's left column is now the wave's APP**, not the wave —
   an app mark (`AppMark`, or `RecordMark` on the initials tile where no
   single app resolves) beside the app's name, `waves-screen.tsx#waveApp`.
   A `Wave` carries no `appId` of its own (only its sprints do, and they are
   not constrained to agree), so this is DERIVED: the one app every live
   sprint in the wave names, when there is exactly one. The wave's OWN name
   moved to a second, muted line under the app's — always, never onto the bar
   itself, which this brief chose over the letter's other option (a label on
   the bar before the segments) because a T3 segment is 24px tall and already
   carries its own sprint's name; see `TimelineRow.sublabel`'s own header
   (`record-timeline.tsx`) for the fuller account. A wave with no single
   resolvable app draws exactly what it drew before this amendment: its own
   name, on the initials tile.
2. **The broken container was `wave-finder.tsx`'s own track wrapping to a
   second line.** The row's comments already claimed "one row, always" (the
   2026-09-01 ruling); the CSS did not keep the promise — `flex-wrap`, no
   scrolling lane, no pinned action group — so the trailing controls (the
   view switch, the "+") dropped to a second line the moment the lane ran
   out of room, and the outer column's `rounded-pill` (a capsule computed off
   the box's own HEIGHT) stretched around the now-two-line box, reading as a
   corner clipping the wrapped controls. Fixed to the kit `ToolbarRow`'s own
   shape (`shared/ui/components/toolbar-row/toolbar-row.tsx`): `flex-nowrap`
   on the track, a `min-w-0 flex-1 overflow-x-auto` lane around
   search/filters/sort/period, and the actions group pinned outside it with
   `ms-auto shrink-0` — nothing wraps, at any width, so the pill's radius is
   always computed against one line. `web/test/wave-finder-toolbar-is-one-container.test.tsx`
   pins the shape.
3. **A Sprint type facet**, `wave-finder.tsx`'s `WaveQuery.sprintType`. A wave
   carries no `sprintType` column (a wave has no kind; only its sprints do),
   so this is answered as an `EXISTS` over the wave's own LIVE sprints —
   computed at the door (`workers/tenancy/src/lib/waves.ts#listWaves`/
   `countWaves`, both now taking an optional `sprintType`) and mirrored,
   for the sidebar collection, off the sprints already resident in the
   browser (`selectWaves`'s own third argument) rather than a second round
   trip for a bounded collection that does not need one — the same
   "everything that can match is already in front of us" reasoning this
   file's header already gives the other two facets. Options are the team's
   own "Sprint type" vocabulary (`useSprintTypes`), A→Z through the one
   render chokepoint every facet passes (R75).
4. **List's Status column is now a coloured pill**, `Badge variant="status"`
   — the kit's own law, one neutral fill for every state, the state living
   only in the dot. A live wave reads `waveState` (`waves-screen.tsx`), the
   same three-part axis the T3 timeline already draws its bar against —
   planned / running / done, off the wave's own `startsOn`/`endsOn` — dotted
   `review` / `building` / `shipped`, the identical three tones
   `sprint-detail.tsx` already draws a sprint's own status pill with. A
   switched-off wave draws `archived` directly, the tone every other
   deactivated record in the app wears, winning over the temporal read.

**Amendment 2, 16 Sep 2026 — a wave's app is STORED, not derived.** The client,
over the shipped amendment 1 above, read the DERIVED left column back to the
coordinator and corrected it: *"No, now you have the name of the wave. I want
the name of the app."* Amendment 1's `waveApp` answered "the one app every
live sprint in the wave agrees on, when there is exactly one" — recomputed on
every render, never settable, and wrong the moment a wave was sold before any
sprint was planned into it. Team migration **0099** replaces the guess with a
real column:

1. **`waves.app_id`**, nullable, `REFERENCES apps (id)`, plus `idx_waves_app`.
   Nullable is ordinary — a wave sold before anybody decided which system it
   covers is exactly as normal as one with no dates yet.
2. **Backfilled once, idempotently, conservatively.** A wave's `app_id` is
   filled from its own LIVE sprints only where they agree on EXACTLY one app —
   the same "agree on one, or draw nothing" reading amendment 1's `waveApp`
   gave in the browser, now computed once in SQL rather than on every render.
   A value already set (through the door) is never overwritten; a wave whose
   sprints disagree, or have none, is left `NULL` rather than guessed at.
3. **The door carries it end to end.** `Wave` (`shared/waves.ts`) gains
   `appId`/`appName`/`appLogoUrl`, joined in on every read
   (`workers/tenancy/src/lib/waves.ts`, `LEFT JOIN apps` beside the existing
   accounts join). `createWave` accepts `appId` (optional, validated against
   the SAME account the wave is sold to — `assertAppInAccount`, the identical
   pairing `wave-detail.tsx`'s own "Plan a sprint" picker already enforces on
   screen). `updateWave` takes it TRI-STATE, the same "absent key = leave it
   alone" contract `updateAccount`'s own `accountManagerUserId` already keeps:
   omit `appId` to leave the wave's app untouched, send `null`/empty to clear
   it, send an id to set it.
4. **The wave form gets an App picker** (`wave-form-dialog.tsx`) — a
   `RecordPicker` narrowed to the selected/fixed account's own apps, the
   app's own logo as the mark (`face: true`, the identical flag the story
   form's own App row uses), no "Not said" pill withheld — an app is a real
   optional field here, unlike App stage.
5. **The T3 timeline's left column reads `wave.appId` directly.** `waveApp`
   (`waves-screen.tsx`) is now a plain lookup against the loaded `apps` list
   for a live app's logo, falling back to the wave's own denormalised
   `appName`/`appLogoUrl` when the app is not in that list (deactivated, most
   likely) — never a scan of the team's sprints. Unset `appId` falls back to
   exactly what the row drew before amendment 1: the wave's own name, on the
   initials tile.
6. **The All list gets an App column**, the same `AppMark` + name pairing the
   Account column already draws, searchable off the resolved app's name.
7. **A Facet by app**, offered only where the team has apps to filter by —
   cheap, since `Wave.appId` is a real column: `selectWaves` narrows with a
   plain equality (`w.appId === query.appId`), no sprint scan, unlike the
   Sprint type facet beside it.
8. **MCP/agent parity (R19/R22).** `list_waves` gains `appId` as a third query
   filter; `create_wave` and `update_wave` both gain `appId` in their body
   schema and `buildBody`, `update_wave`'s through `sent()` so an empty string
   still clears it over the machine surface the same way it does through the
   form.

**Law.** [R19](../RULES.md), [R22](../RULES.md). The rest of this amendment is
recorded here for the next reader rather than independently checked, the same
footing amendment 1 and the entry above it stand on.

**AMENDED A SECOND TIME, 17 Sep 2026 — the End date is back.** The client's ruling,
verbatim: *"Please also add the end date."* `waveListColumns`
(`web/components/work/waves-screen.tsx`) draws six columns, her exact order — Wave ·
Status · Sprints · Start · End · Account — within R82's own six-column ceiling
([K32](#k32-a-table-row-holds-at-most-six-columns-the-seventh-goes-on-a-second-line-never-squeezed-onto-the-end)):
the App fact stays on the Account cell's own second line rather than claiming a column of
its own, the same eighth-turned-seventh-column shape R82 exists to catch before it ships
again.

**Law.** [R82](../RULES.md) (`table-column-budget`).

### K25: Inputs — the third Accounts tab, three server views, no Mine tab

**The rule.** What we are waiting on a client for gets its own sidebar page,
third in the Accounts group beside Accounts and Contacts — the client's own
ruling, 15 Sep 2026, verbatim: *"Do you remember that we already decided on
the naming for the 'tasks' that we assigned to customers? I would like to
see this in the third section of the accounts section on the sidebar. Find
this name and make me a proposal for how the main screen could look."* The
name was not a new decision — `shared/glossary.ts`'s `todo` entry has read
`{ term: "Input", … }` since 31 Aug 2026 — and the screen is the home the
client asked for when Tasks' own K19 redesign removed the "waiting on
clients" panel from that screen outright: *"This is a completely different
module, and we will put this somewhere else, but remove it from tasks."*
This is somewhere else.

Shown three directions for the main screen (a plain list; grouped by
account with the account manager's own worklist reading; a board by
nudge-state), she chose the first, in her own words: *"the view that I want
is the first one you suggested, I1: just a list… I like the column that
flags how long we are waiting. Also, show the account and add a filter for
account."*

**Three tabs, three SERVER views (R14/R16), no Mine tab.** Waiting (open,
not yet due or carrying no due date at all) · Overdue (open, past its due
date) · Received (done, under the word this screen's tab reads it by — the
identical pile the account/contact panel's own `TodosPanel` still calls
Done, untouched). `TODO_VIEWS` (`shared/types.ts`) carries all five names
now; the door's own `todoViewClause`
(`workers/content/src/lib/todos.ts`) is the one place the split is decided,
so the list and its three badges can never disagree about which row is in
which pile. NO FOURTH TAB for "mine": an input is owed *by* a client *to*
us, so nobody on staff owns one the way they own a task, and a caller-name
column would have nowhere honest to point. What Tasks' own `all_tasks:read`
decides about a task, `all_inputs:read` decides about an input — without
it, a reader sees only the accounts they themselves manage
(`account_manager_user_id`), narrowed at the door
(`getTodos`), never refused.

**The row, R80's shape.** Input (the title) · Account (a real face, R35 —
logo mark + name, the same `<RecordMark picture={…} name={…}/>` pairing
every other list in the app draws for its own Account cell) · Contact (who
completed it, R54 — blank until it has, because a to-do carries no
"addressed to" field before that) · Due · Waiting (days since the input was
raised, `Badge` toned quiet under a week, `warning` past it, `destructive`
on the Overdue tab; blank on Received) · Received on (the Received tab's
own eighth-column shape, blank on the other two — the identical furniture
reasoning K19's own `closed`/Everyone's column already carries one module
along). Through `<PagedFind>` + `<RecordTable>`, the same pairing
`contacts-screen.tsx` draws: search (R14, door-side — Received keeps every
completed input for ever, so a browser search over a loaded page would
answer about the wrong fifty), a facet on Account (the client's own words,
door-side, `accountId`), and the toolbar's own sort (R53) offering Due and
Waiting longest (`TODO_SORTS.waiting`, oldest raised first). "+" is the
existing ask-a-client dialog (`todo-form-dialog.tsx`); the row's own act is
Mark received, the panel's existing `completeTodo` door, offered wherever
completing it would move the row (never on Received itself — R17).

**Two things the design pass drew that the door cannot answer today, said
here rather than faked on screen.** No "Last nudge" column and no "Nudge"
row action: `Todo` (`shared/types.ts`) carries no reminder/nudge timestamp
at all, and neither `workers/content/src/routes/todos.ts` nor the portal's
own to-do surface has a resend-reminder door — a real gap, not an
oversight, the same discipline this file's own K24 entry previously kept about the
Waves calendar's multi-day span (which has since shipped in kit v1.2.90, 16 Sep 2026). And the Account MANAGER facet the I1 mock
also drew is left out for a cheaper reason: this screen has no full
accounts list loaded to build real options from, and a `Todo` row carries
no manager id or name of its own to derive one cheaply the way the Account
facet does (off the rows already on screen, `apps-screen.tsx`'s own idiom).
The door already supports narrowing by it (`accountManagerId`,
`TodoFilter`) — it is what `all_inputs:read`'s own narrowing is built out
of — so the facet is one array entry the day this screen also carries a
company list.

**The permission rename.** The module gating every to-do door was `todos`
since the base's earliest days; this screen renamed it to `inputs`
(team migration `0096_todos_permission_renamed_inputs`,
`shared/team-modules.ts`) — the label had already read "Inputs" since
31 Aug 2026, so the box was the last place still carrying the old word.
Every existing role's grants move with it, untouched (an owner who had
handed a Client role `todos: read + update` now reads `inputs: read +
update` on the exact same role row). `all_inputs` is new, off for every
role but the locked Admin, the identical shape `all_tasks`/`all_stories`
already take.

**Law.** [R14](../RULES.md), [R16](../RULES.md), [R36](../RULES.md)
(`offered-rights` — `inputs`/`all_inputs` join the matrix), [R53](../RULES.md),
[R54](../RULES.md), [R80](../RULES.md) (`rows-are-a-list`). The two
omissions above are recorded here for the next reader rather than a
registry entry, the same footing K24's own Calendar descope stands on.

---

### K26: Story type is five words, not three, and a story now says where it came from

**The rule.** The client's ruling, 15 Sep 2026, verbatim: *"story TYPE changes from
{Fix, Feature, Change} to exactly Data · Tech · Bug · Feature · Change"* — Data is
changing values inside records, Tech is under-the-hood and invisible to users, Bug
is something that should work being broken, missing or wrong, Feature is a
brand-new capability, and Change is the default, modifying something that already
works (copy or email wording is Change; there is no "Content" type). *"And a new
field, Category: Client-requested (default, traces to a client ticket or ask) or
Internal (Kwapso-initiated upkeep)."* And, closing the door on a third dimension
before anybody asked for one: *"Do NOT assign any priority or urgency. Stories do
not have that."*

**The vocabulary, added never swapped.** Team migration `0094_story_type_and_category`
(`workers/tenancy/src/team-schema/migrations.ts`) inserts Data/Tech/Bug as new
PROTECTED `Story type` rows (`is_default = 1`, [R76](../RULES.md)'s own word for
the state) beside the Feature/Change rows migration 0028 already planted, and
DEACTIVATES Fix rather than deleting it — every story that still names it keeps
reading correctly until a separate reclassification lane rewrites them; the door
(`requireActiveSelectableValue`, `workers/content/src/lib/vocabulary.ts`) now
refuses `storyType` on create or update unless it names a currently ACTIVE row,
which is what makes "Fix no longer creatable" true structurally rather than by
convention. A new group, "Story category", is seeded the same protected way with
Client-requested and Internal. `shared/selectable-homes.ts` carries the new
group's home (`{ table: "stories", column: "category" }`) so the vocabulary
census (R-whatever governs it) knows where its words are stored.

**The form.** Type keeps the control it already drew (`RecordPicker`,
`story-form-dialog.tsx`) — the vocabulary underneath it changed, the control did
not, because the words are the team's to rename on the Choices screen exactly as
they were before. Category is new: a two-pill row (`ToggleGroup`/
`ToggleGroupItem`, the kit's own segmented control — "two to four options that
change how the same data is drawn," and Client-requested/Internal is exactly
that shape) defaulting to Client-requested, wrapped in a `shape="group"` `Field`
so the required ring boxes the whole pair rather than one pill
([K12](#k12-the-toolbars-slots-are-the-rows-in-one-order-and-sort-is-a-default)'s
own discipline about a control the Field clones onto). Never hardcoded English:
`categories` is a prop threaded from the live `Story category` vocabulary the
same way `storyTypes` already is, at all five `<StoryFormDialog>` call sites.

**The row and the record.** A story's List row and Board card both carry the
type mark and a small Category chip ([K16](#k16-on-a-card-that-stands-for-a-record-the-chip-sits-above-the-title)'s
own idiom, a quiet secondary badge rather than a second colour). The record
screen shows both Type and Category on its overview, side by side, the same
list the client's ruling put them in. No priority anywhere on a story, in either
place — the ruling's own last sentence, held to by absence rather than a field
nobody draws.

**Amended 2026-09-16.** The client's ruling, verbatim: *"Assign an icon to each
type, and when I'm editing or creating, make it a horizontal pick. Also, the
client requested or internal should be at the very bottom and prefilled. If it
comes from a ticket, it's client requested. If it's created from scratch, it's
prefilled with internal. … Everywhere I'm selecting an app or an account, in
this case, when I'm creating a story, I want to see the icons of the app or the
image of the account on the choice component."*

- **An icon per type, in code, not a column.** The five words are still the
  live `Story type` vocabulary (`selectable_data`, unchanged); only the GLYPH
  moved to code, `shared/story-types.ts` — Data → `Database`, Tech →
  `Wrench`, Bug → `Bug`, Feature → `Sparkle`, Change → `ArrowsClockwise`
  (not `PencilSimple`: CLAUDE.md's own action-icon table already fixes that
  glyph as "edit," and `story-detail.tsx`'s own overflow menu draws it a few
  pixels from where a Change chip would sit). A column was considered and
  rejected the same way the task brief itself flagged: the five types are
  PROTECTED (K26 above, `is_default = 1`), so a closed code map costs nothing
  a migration would have bought, and `shared/ticket-types.ts`/`shared/meeting-
  icons.ts` already carry the identical pattern for their own closed sets.
  The row/card/detail chip is now **icon + word on the same neutral pill**
  `categoryChip` already draws — REPLACING the two-letter text tile, not a
  dot: a colour dot for a type has only ever been a TICKET pattern
  (`web/lib/type-colours.ts`), never a story one.
- **Type is a horizontal pick.** `story-form-dialog.tsx`'s Type field is now
  `RecordPicker layout="row"` — the same idiom the staff row on this form and
  the ticket form's own Type row already draw — carrying the new
  `PickerOption.icon` (`record-picker.tsx`, a React node, additive: every
  caller that only ever set the text `mark` keeps working unchanged).
- **Category, last and prefilled.** Moved from right after Type to the very
  last field on the form. The default now reads the dialog's own `fixedTicket`
  prop — set at exactly the one call site that opens this dialog off a
  ticket's own Related stories tab (`help-detail.tsx`) — Client-requested when
  it is set, Internal otherwise. Still an ordinary default: both pills stay
  live and pressable.
- **App/account marks on the choice components.** The story form's App field
  now passes the app's own `logoUrl` as `picture` (`face: true`, so a logo-less
  app still draws its own initial rather than a blank row) — the same
  `picture`/`face` pair the ticket form's own App row and `accountOption`
  (`web/lib/pickable.ts`) already carry for the identical ruling on 2026-09-07/
  09-09. The task form's App field, which shares `RecordPicker`, got the
  identical targeted fix; its Account field already had one (`accountOption`).
- **The process selector — CORRECTED THE SAME DAY.** An earlier pass at this
  ruling read "kill the whole process selector when creating a story … this
  will come from somewhere else" as removing it from the form outright. The
  client's own correction, minutes later, verbatim: *"stop the agent removing
  the processes from CRUD - keep it!! But make it a dropdown."* So the field
  never left CHECKLIST 6.5's own two facts (`processIds`, `changesNoStep`) —
  only the CONTROL changed, from an always-expanded checkbox stack to the
  kit's own `Select` (an "add a process" trigger; the chosen set renders above
  it as a removable list, the same idiom this file already uses for its own
  attached/pending files), because Radix `Select` commits one value per open
  and "one or more processes" is still real.

**Law.** [R20](../RULES.md) (the door checks the position, never trusts the
body), [R76](../RULES.md) (`protected-is-active`), [R35](../RULES.md).

### K27: Stories — five tabs ported from Tasks, Backlog instead of All

**The rule.** The client's ruling, 15 Sep 2026, verbatim: *"For stories, we need
to recreate a bit of tasks. Stories are inside sprints, so I would need
different tabs where you can see: overdue or the ones you have to do now, the
ones that are active, and for you only / the planned ones that are not in any
active sprint and are somewhere in the future / all / the completed ones /
everyone's. Think about this and make me a proposal."* Shown a design proposal
built on that brief, she answered with one change over its own recommendation:
*"I agree with all you suggested — except use Backlog instead of All."*

**Five tabs, four of them mine unconditionally.** `STORY_TABS`/`EVERYONE_TAB`
(`web/components/work/stories-screen.tsx`) draws **Now · Planned · Backlog ·
Completed · Everyone's** — five SERVER views ([R14](../RULES.md)/[R16](../RULES.md),
`StoryViewName` in `shared/types.ts`), the identical shape
[K19](#k19-tasks--three-tabs-of-your-own-and-a-fourth-for-everyones) already
drew for Tasks one collection over. Now/Planned/Backlog/Completed narrow to
the caller's own name at the door UNCONDITIONALLY (`MINE_VIEWS`,
`workers/content/src/routes/stories.ts`), including a story with no assignee
at all riding along (`includeUnassigned`) — this backlog is old enough that
plenty of it was never claimed by anybody. Everyone's is the fifth tab, last
in the strip, shown only when the caller holds a NEW right, `all_stories:read`
— seeded exactly like `all_tasks:read` (team migration `0095_everyones_stories`,
`shared/team-modules.ts`), off for every role but the locked Admin.

**The predicates.** Now is mine, not done, and either overdue (the sprint's own
end date where there is a sprint, the story's legacy due date where there is
not) or its sprint is RUNNING right now (`sprintState`'s own reading, ported to
SQL — a late sprint stays "running," which is why Now catches it on the other
side of its OR too). Planned is mine, not done, not overdue, and its sprint
either has not started or it has none at all — the future, not yet claimed by a
running block. Backlog is mine, any state — the file's own old comment already
called this the backlog, and the client's correction landed on the same word
for the tab itself. Completed is mine and done. Everyone's narrows nothing at
all.

**The views, per tab** ([K12](#k12-the-toolbars-slots-are-the-rows-in-one-order-and-sort-is-a-default)):
Now offers Board by status (default) + List; Planned offers List (default) +
Board by sprint + Week by due date; Backlog offers List (default) + Board by
status; Completed offers List only; Everyone's offers List (default) + Board by
status. The List view's Sprint column carries the sprint's own name and the
wave it was sold inside as a quiet second line, reading off the sprints this
screen's own create-dialog options already load — no new field on `Story`. A
story with no sprint reads "No sprint," never a blank cell. The Board's status
columns carry `storyStatusDotTone` in the header, the same coloured-dot seam
Tasks' own priority board already reads from `shared/status-tones.ts`; dropping
a card writes through `setStoryStatus`, gated on `work:update`. The Board by
sprint (Planned only) is READ-ONLY — dragging a card there would mean
reassigning the story's sprint, a different write than a status move, and out
of this pass; its columns are the sprints actually present on the loaded page,
plus "No sprint" last, never the fixed four-column status shape. Week carries
no sort control ([K20](#k20-calendar-views-carry-no-sort)).

**The list, R80's shape.** `<RecordTable>` draws the bare shape unconditionally
now ([K22](#k22-rows-are-a-list-never-a-banded-table)), so Stories' own List
never asks for the retired banded frame. Columns per tab: Story (the type mark,
the reference in its own black chip, the title), Category, Status, Sprint — and
Everyone's alone keeps Assignee, second, right after Story, the one tab not
already narrowed to the caller's own name ([K19](#k19-tasks--three-tabs-of-your-own-and-a-fourth-for-everyones)'s
own reasoning for the identical column, one module along). Search and sort
(Order — the drag-rank every story already carries — and Deadline) run over
whichever tab's loaded page is showing, in the toolbar, never a per-column
header click. No door-side facets any more: the flat backlog's old
`COLLECTION_FILTERS.stories`/`<PagedFind>` pairing is retired with the screen
that used it, the narrowing question now belongs to `StoryView` itself.

**Law.** [R14](../RULES.md), [R16](../RULES.md), [R19](../RULES.md) (`stories`
gains a `narrow` declaration on `all_stories:read` — `shared/workers/query-grammar.ts`
— the identical shape `tasks` already carries for `all_tasks:read`),
[R20](../RULES.md), [R36](../RULES.md) (`offered-rights` — `all_stories` joins
the matrix), [R53](../RULES.md), [R78](../RULES.md) (`no-sort-in-calendar-views`
— Week), [R80](../RULES.md) (`rows-are-a-list`).

### K28: Sprint type is the seven with icons; App stage's status is HELD

**The rule, and the correction.** The client's ruling, 16 Sep 2026, verbatim: *"the sprint types are: not started, audit (this is new), plan (the old blueprint), build (the old development), validation, refinements and enhancement (in this order). They will not have colors, but icons. Let's keep colors for status."* The first pass read this onto `shared/app-stages.ts` (team migration 0097) — she said "sprint types," and the two words she named, Blueprint and Development, happened to be two of App stage's own eight values that day, which is what made the misread possible. **Her own correction, the same day, verbatim:** *"No, no, no, no, no. You got this completely wrong. These are the sprint types... status has a color. It's the sprint types that have an icon. You got that wrong. Hold this until we define what the status is from the apps."* And on Waves, the same conversation: *"No, now you have the name of the wave. I want the name of the app."* (K24's own amendment below carries that half.)

**So there are two vocabularies in this entry, not one, and they resolve in opposite directions.**

**Sprint type (the seven words, with their icons) — `shared/sprint-types.ts`, team migration 0098.**

| # | Sprint type | Icon | Old word it replaces |
|---|---|---|---|
| 1 | Not started | `Circle` | new to this vocabulary |
| 2 | Audit | `MagnifyingGlass` | Assessment (renamed); Diagnostic too, only when Assessment is absent |
| 3 | Plan | `Compass` | Planning (renamed) |
| 4 | Build | `Hammer` | Implementation (renamed) |
| 5 | Validation | `CheckCircle` | Validation (kept) |
| 6 | Refinements | `Sliders` | Refinement (renamed) |
| 7 | Enhancement | `TrendUp` | Enhancement (kept) |

Iteration, Foundation, Data Migration, Process Optimization and Training fold into nothing — deactivated, never deleted; a sprint already carrying one of the ten old catalogue words (`SPRINT_TYPE_CATALOGUE`, `workers/tenancy/src/team-schema/seed.ts`) keeps that exact word. Diagnostic's fold is CONDITIONAL, the one genuine branch in the migration: it becomes Audit only when no live row is still spelled Assessment (so the two do not collide into one row); where Assessment is present, Diagnostic deactivates alongside the rest. `selectable_data.position` (the column 0097 added) now carries 1..7 for these rows too — the second vocabulary to use it, never a second column — and `sprints.sprint_type` is rewritten wherever a stored word actually renamed, so a sprint's own history reads the team's current spelling.

Drawn as an icon + word on a NEUTRAL pill, no colour, everywhere a sprint's type shows: the sprint form's own picker (`AppearancePillGroup`, a horizontal pill row, `sprint-form-dialog.tsx`), the sprint detail head, each sprint row on its wave's own Sprints tab, the T3 timeline's segment label and tooltip, and the Waves screen's Sprint type facet. Icons resolved in `web/lib/sprint-type-icon.tsx`, the same split `shared/app-stages.ts` uses for its own mark. Ordinal, not A→Z: registered in R75's `ORDERED_OPTIONS_OK` (`sprint-form-dialog.tsx#sprintTypes`) and `FACET_ORDER_OK` (`wave-finder.tsx#sprintType`).

**App stage — `shared/app-stages.ts`, UNCHANGED by this correction.** The eight words and their order stand exactly as migration 0097 left them (Not started · Audit · Plan · Build · Validation · Refinements · Enhancement · Archived, `selectable_data.position` 1..8) — that half of 0097 was never in question, only which vocabulary its ICON belonged to. **The pill goes back to a coloured DOT** — "status has a color" — never an icon, on the gallery chip, the board card chip, the board-by-stage column heads, and the detail head pill. `AppStage.dotTone` (widened past `Badge`'s own six `DotTone` names to also reach the four `PriorityTone` names, the same combined union `record-calendar.tsx`'s `EntryDotTone` already takes) assigns each of the eight stages a distinct dot — Not started `blocked`, Audit `review`, Plan `purple`, Build `building`, Validation `orange`, Refinements `shipped`, Enhancement `done`, Archived `archived`. **One pair shares an actual pixel: `shipped`/`done` (Refinements/Enhancement) both resolve to `--kw-forest`** — the kit's closed palette (R32) has exactly SEVEN distinct hues across all ten named dot tones, and eight stages cannot each take a hue that does not exist; every other stage below takes a hue none of its seven siblings wears. `AppStageGlyph`/`web/lib/app-stage-icon.tsx` are deleted; the app form's own stage picker keeps its pill row (`AppearancePillGroup`, unchanged in shape) but draws no icon and no colour — a plain word row — because the pill CONTROL survived the correction even though its glyph did not.

**App STATUS ITSELF IS HELD.** The eight words above are not a fresh, considered answer to "what is an app's status" — only the set 0097 happened to leave behind when its icon moved elsewhere. Her own words: *"hold this until we define what the status is from the apps."* A follow-up ruling — what app status means, how many stages it has, and whether it should be inherited from the app's own waves and sprints rather than typed by hand — is still owed, and an artifact is being drawn for it. Until it lands, `shared/app-stages.ts` keeps the 0097 shape and this entry's dot mapping is the interim answer, not the final one.

**Not a law.** Like K26's type-icon binding, this is a vocabulary and icon-code decision recorded here for the next reader rather than independently checked. The seven Sprint type rows and the eight App stage rows are each created by their own migration; `shared/ui/` carries the icons and the dot tokens; no rule census enforces either exact order because the ordering IS the gating rule, through `position` + `PROTECTED` and each migration's own order.

### K29: Meetings — the List view, and emojis stripped from titles

**The rule.** Two parts, both client's ruling, 16 Sep 2026. First: *"meetings List = the Tickets column list"* — the Meetings main screen's List view draws the same columns as the Tickets collection does, a real `<RecordTable>` carrying the app's settled column discipline (R80), with the meeting-specific columns Meetings adds (the type, the purpose, the attendees count, the next action). Second: *"emojis stripped from meeting titles"* — meeting titles may no longer carry emoji, in the data or in the display; any existing row carrying a pictograph is either edited to remove it or the system strips it silently on read (the latter is the approach already taken for other emoji-stripped fields under R66). The meeting's own `notes` field is untouched.

**Not a law.** The column order, the table shape, and the emoji handling are each recorded here for the next reader; no census independently checks them.

### K30: Meetings — the Meeting types block is removed from the main screen

**The rule.** The client's ruling, 16 Sep 2026, implicit in the cleanup: the Meetings main screen previously drew a separate "Meeting types" panel; this is removed, and the meeting type remains a vocabulary choice available only through the Choices module (Meetings › Choices, the same door `shared/selectable-homes.ts` calls home for the `{ table: "meetings", column: "purpose" }` group). Meetings' own type vocabulary is still live (the column stays, the rows stay, the picker stays on the form and in filters), only the dedicated panel on the main screen is gone.

**Not a law.** This is a screen layout descope recorded here for the next reader.

### K31: All Contacts shows a fourth column, whether the contact is in the portal

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"In the All Contacts, add a
column to show if they are in the portal or not."* A fourth column, "Portal" / "No
portal", draws as a kit badge — shown only to a reader holding `portal_users:read`, since a
portal login is exactly the fact that right gates elsewhere in the app — and is unsortable,
the same as the Account and Role columns beside it.

**Law.** None registered — a column addition to an existing `<RecordTable>`, held to R82's
six-column ceiling like any other (see K32).

**AMENDED, 16 Sep 2026, same day — the column is a dot, not a full pill.** Read together
with the automations ruling below (B11): *"For contacts, portal: no portal, same as with
automations. Let's switch the design to the color dot. Portal: make it green, and no
portal: gray."* — and, the same breath, *"All dots are always solid, not rings."* The
Portal column now draws `<Badge variant="status" dot="shipped">` (green, "Portal") for a
live grant and `<Badge variant="status" dot="archived">` (grey, "No portal") for none
(`shapeContactsTable`, `web/components/deep-link/shape.tsx`) — the same shape the
automations status cell below moved to, and the same D17 tone table (`shipped` = green,
`archived` = grey). Still unsortable, still gated on `portal_users:read`, still one column
of the six.

**AMENDED, 17 Sep 2026 — the dot carries its own gap to the label.** The client's ruling,
verbatim: *"Validated the colors, but it's missing the space between the dot and the word.
Fix that."* Kit v1.2.102: the `Badge` component's dot variant carries its own `gap-1`
between the dot and its label, independent of size. `web/test/badge-dot-gap.test.tsx`
asserts every size variant (`sm` / `md` / `lg`) renders the gap consistently.

### K32: a table row holds at most six columns — the seventh goes on a second line, never squeezed onto the end

**The rule.** The client's ruling, 16 Sep 2026, over the Waves List view: *"the right side
of the container in waves is shape wrong. fix it and write the law."* N1 already named the
ceiling in prose — "at most … six in a table row … it does not get squeezed onto the end" —
but until this ruling it was prose, not a check. `waveListColumns`
(`web/components/work/waves-screen.tsx`) broke it silently: the same change that gave the
timeline's left column the wave's own App also gave List a seventh column for it, on a
collection already at six. A seventh column does not overflow the frame — the kit's own
`<Table>` self-scrolls inside its own container (R39) — it SQUEEZES every column, most
visibly at the row's own right end, where Start/End/Status crowd together against the
card's own inset.

**The fix** is N1's own prescription: the App fact rides the Account cell's own second
line, the identical primary-plus-muted-subline shape a collection row's title already draws
one column along (`record-timeline.tsx`'s `TimelineRow.sublabel`), never a seventh column of
its own.

**The check.** A static census reads every literal array in `web/`, `web-portal/` and
`shared/web/` whose elements ALL carry both a `key` and a `label` (the shape
`TableColumn` needs of both) and fails past six entries, unless the array's enclosing
function is named in `TABLE_COLUMN_BUDGET_EXEMPT` with the real reason. A recipe-driven
column list built by `.map()` over a config array (Tasks, Stories, Contacts' own
`contactColumnHeaders`) is out of reach by construction — it is not a literal array of
object literals at all, and its own ceiling is the recipe's `fields` array.

**Law.** [R82](../RULES.md) (`table-column-budget`), `web/test/table-column-budget.test.ts`.

**AMENDED, 16 Sep 2026, same day — the final column order, named exactly.** The client's
ruling, verbatim, over the fixed List view: *"this is the order of the columns that I want:
1. Wave 2. Status 3. Sprints 4. Start 5. Account."* `waveListColumns`
(`web/components/work/waves-screen.tsx`) now returns exactly those five, in that order —
Wave, Status, Sprints, Start, Account — one under the six-column ceiling with room to
spare. **End is dropped** (the sixth column the pre-fix table also carried is gone rather
than kept and squeezed); **App still rides the Account cell's own second line** the way
this rule's own fix above already prescribed, never a column of its own.

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

### K50: the assistant tab strip fits its own pane — no clipped tab, "+" never pushed out of view

**The rule.** The client's ruling, 18 Sep 2026, the fourth time she reported the same shape:
*"Nope, the issue's still there. Please tell me what we need to do to fix this once and for
all, because I'm getting very tired of this topic."* — over the assistant's tab strip with
three or more conversations open. Found: at three-plus conversations the strip overflowed the
pane's own width, so the third tab clipped mid-word and the pinned "+" was pushed past the
visible edge — the strip was drawing every tab at its natural width rather than sharing the
pane's own room between them.

**The fix.** The strip fits the pane it is drawn in rather than growing past it: tabs share
the available width and shrink together before any one of them clips, and "+" stays pinned,
always visible, at the strip's own trailing edge. A tab's own title stays the conversation's
own — never truncated to a generic placeholder to make room.

**Status: ruled, not yet built — kit v1.2.125.**

**Law.** None registered — a kit-only fix.

### K51: the new-tab search field carries one icon, not two

**The rule.** The client's ruling, 18 Sep 2026, validating this round's search fix on the
new-tab page: *"Validated, but now there is the search icon on the right and on the left.
Remove the one on the left inside the text bar, the white one."* `SearchInput`'s own leading
icon is switched off on the new-tab page's search field — the trailing icon, the kit's
standing search glyph, is the only one, matching every other search box in the app.

**Status: ruled, not yet built — kit v1.2.125.**

**Law.** None registered — a kit-only fix.

---

### K52: the expanded rail's width is derived from the widest thing it holds

**The rule.** The client's ruling, 19 Sep 2026, verbatim: *"can we make sidebar less wide? assume knowelegde willbe the lngest word there"* The expanded navigation rail's width is not a hand-set constant; it is a token computed from the widest content it can hold — the longest nav label in the app's own language. In English that is "Knowledge" at the nav font size (measured 72px at the 16px reference → `--rail-label-ch`), plus the icon step, gap, and row padding and rail inset on either side. If the logotype (the icon-28 brand mark plus insets on mobile) is wider, the rail takes that width instead, using `max()` to ensure the logo never shrinks. A label longer than "Knowledge" is truncated with an ellipsis. The collapsed rail's width is unchanged.

**The shape.** kit v1.2.130/131: the expanded rail width is `--rail-width`, computed at the theme level from `--rail-label-ch` and the rail's own `--inset-x` and `--icon-width`, through a `max()` with the logotype's measured width. The app's own nav labels sit in `web/lib/pages.ts` and are read by the kit's own width computation at theme generation time, so no hardcoded constant survives a label change — if somebody edits a nav label in the future, the rail recomputes and the app gets the new width on its own. Was 13rem (208px) before the change.

**Proven:** 1440px desktop (Knowledge label + insets = 104px measured; logo path = 68px; rail width = 104px). No regressions at mobile (`icon` nav only, no labels).

**Status: ruled, in build, 19 Sep 2026.**

**Law.** None registered — a kit-only fix.

### K53: the ticket stage line shows the stage name under each mark, above the date

**The rule.** Aurora's ruling, 19 Sep 2026, verbatim: *"on the stages in tickets, above the
date i need te sateg name!"* Supersedes, for the stage word alone, the 17 Sep clause in
[K38](#k38-the-todays-tasks-progress-strip-and-the-ticket-stage-ladder-beside-it-stand-on-the-bare-page--no-container-behind-either)'s
second amendment — *"don't put the [stage] here"* — nothing else in that amendment changes:
the dots stay at their smaller size, the date stays one line.

**The shape.** The kit's `StatusStepper`
(`shared/ui/components/status-stepper/status-stepper.tsx`) carries a `label` slot per step;
`ticket-stages.tsx` passes each stage's own name back into it, drawn under the mark and above
the date line — the reverse of what K38 collapsed to colour-only. The one stage this app used
to leave unnamed (closed without a resolution) gets a real label for the first time rather than
staying blank now that names render again: **"Waiting on you."**

**Status: ruled, in build, 19 Sep 2026.**

**Law.** None registered — a kit-only fix.

### K54: a message's byline sits under the bubble, and a run from one author carries it once, after the last message

**The rule.** Aurora's ruling, 19 Sep 2026, two sentences the same round: *"on 'chat' in
tickets put the name and time under the message"* and *"and ehn 2 messages from the same
person, only after the last ,essage."* A message bubble's author and time move to directly
under the bubble, at the bubble's own side; when a run of consecutive messages shares one
author, the byline draws once — after the LAST message in that run — rather than once per
bubble, with a tighter gap between the bubbles inside the run than between two different
authors' messages.

**The shape.** kit v1.2.133 gives the thread's message component a `bylinePlacement="below"`
mode: author · time renders under the bubble instead of beside/above it, keyed to the bubble's
own side (left for the other party, right for this account). A run detector groups consecutive
same-author messages and suppresses the byline on every bubble but the run's last, tightening
the inter-bubble gap inside a run relative to the gap between two different authors.

**Status: ruled, in build, 19 Sep 2026 (kit v1.2.133).**

**Law.** None registered — a kit-only fix.

### K55: an avatar draws on every message bubble, not only the run's last — and initials show only when there is no photo

**The rule.** Aurora's ruling, 20 Sep 2026, verbatim: *"On chat, when there are multiple
messages by the same person, keep the name and date only on the bottom one, but show the
avatar for each."* And, the same round, over a ticket thread: *"On chat — and everywhere
there's an avatar — only show initials when there's no avatar. For example, in tickets I
see the initials but should see the avatar image."* Two independent facts about one bubble:
the BYLINE (author + time, K54) collapses to the last message of a run; the AVATAR does not
— it draws on every bubble, keyed off `initials`/`image` alone, never off whether that
bubble carries a byline. And the avatar itself still follows G5's own fallback (picture,
then initial) rather than showing both, or defaulting to initials when a picture exists.

**The shape.** Two independent bugs, one ticket-thread call site (`help-detail.tsx`). First,
`TicketThread`'s own run-suppression had been gating `initials`/`image` to `isLastOfRun`
along with the byline, reading kit v1.2.133's own doc backwards — kit v1.2.136 restates it:
a run's earlier messages "keep their own image/initials even though they carry no
author/time", and `hasAvatar` (`shared/ui/components/ticket-thread/ticket-thread.tsx`) keys
on `initials`/`image` alone. Fixed by passing both on every message, not only the run's
last. Second, every reply's `image` was reading `null` (no photo lookup at all, initials-only
by construction) — now sourced through `memberFace` (`tickets-collection.tsx`'s own seam,
reused rather than rebuilt), the same `members:<teamId>` cache this screen already holds, so
a staff or portal-client sender's real photo shows and initials draw only when `memberFace`
truly has none.

**Status: ruled, in build, 20 Sep 2026.**

**Law.** None new — reinforces [G5](#g5-a-record-never-appears-without-its-face)/R35, a
call-site fix rather than a new rule.

### K56: the Sync button matches its toolbar siblings' height, and the "not synced yet" hint stays in the control's own status slot

**The rule.** Aurora's ruling, 21 Sep 2026, verbatim: *"on knowelegde, the syn button its
to small. unify with law. move the hint not broght in yet."* Two facts about one control,
`GoogleSyncButton` (`web/components/knowledge/google-sync.tsx`). The SIZE: on the knowledge
toolbar the Sync button sits beside the mango Ask button and the settings gear, and both of
those stand at the kit's own default control height; Sync alone was drawing `size="sm"`
(`--control-height-dense`, 32px), the one button in the row not matching its siblings. The
HINT: "Not brought in yet" was never a free-floating toolbar caption to relocate, it already
rendered in the control's own status slot, the same one the "Last brought in …" line takes
once a sync has run; what read as a stray hint sitting beside the button was the size,
`text-xs` next to the button's own `text-sm` label.

**The shape.** `size="sm"` dropped from the Sync button, through the kit Button prop alone,
no custom class, so it reads the kit's standing `--control-height-button` (40px), the same
height the Ask button (no size named) and the gear (`size="icon"`, itself the standing
height) already draw. The status line's own two text-only branches, "Last brought in …" and
its pre-sync fallback "Not brought in yet", both move from `text-xs` to `text-sm`, still in
the exact same ternary slot they already shared, styled alike rather than relocated.

**Status: ruled, in build, 21 Sep 2026.**

**Law.** None new: a call-site fix through the kit's own Button `size` prop; R72's own
point (a control's helper text belongs to the control, not to a heading) is why the hint
stayed in place rather than moving to CollectionHeading's title line.

---

### K57: faces stay visible once selected, kit v1.2.144

**The rule.** Aurora's ruling, 21 Sep 2026, verbatim: *"on choice components, when I have
selected, for example, the app, in the dropdown I see the icon, but I want to continue
seeing it also once it's selected. This app accounts for people everywhere where I select
something with an avatar or an image. Still show it once it's selected, or the icon."*

**The gap.** R90's own kit v1.2.127 face slot only ever showed on a `SelectTrigger` when
the call site passed a `face` prop a SECOND time, by hand, after already resolving which
option was chosen. Nine call sites did that work; every other Select closed back down to a
bare label the instant a face-carrying option was picked.

**The shape.** Kit v1.2.144 (`kwapso-design`): `Select` is now a small wrapping function
component around Radix's own `Root`, carrying a face registry every `SelectItem` populates
with its own `(value, face)` pair as it renders. `SelectTrigger` reads that registry for the
current value and draws the face on its own, no per-call-site prop required, an explicit
`face` still overriding it where one is already given. Works before the list is ever opened
once, because Radix keeps every `SelectItem` mounted (open or shut) the same way it keeps
`SelectValue`'s own text current with no prior open.

**Status: ruled, in build, 21 Sep 2026 (kit `kwapso-design` v1.2.144, synced to
`shared/ui/`; pinned in the kit's own `components/select/check-select.mjs`).**

**Law.** R90 (`faces-in-choices`), amended by this kit tag: the census
(`web/test/faces-in-choices.test.ts`) still asks whether an identity-bearing Select's
options carry `face=`; this rule is what makes the trigger keep showing it afterwards.

**AMENDED 21 Sep 2026, the same day, reviewing it against a screenshot of the app form's
own account field ("Whose system it is: VU Solutions") with no icon on the closed
trigger.** Aurora, verbatim: *"no, look at second screenshot (with VU solutions) icon is
missing there."* The kit fix above closes the gap on the kit's own `<Select>`; the app
form's account field is not one — it is `RecordPicker`
(`web/components/records/record-picker.tsx`), this app's OWN searchable picker, built
before the kit had a face slot at all and never revisited once it grew one. Its closed
trigger carried a parallel, narrower version of the identical bug: a face was drawn only
when the chosen option's own `shape` was `"round"` — a person, told apart from a
client/app's `"square"` by `record-mark.tsx`'s own discriminator — so a person picker's
trigger kept its face and an account or an app picker's did not, silently, since the
gate was never about WHETHER a face existed, only which box it was drawn in. Fixed the
same way the kit fixes its own: the trigger draws whatever face the chosen option
carries — a picture, a glyph or the bare `face` flag through `RecordMark`, in ITS OWN
shape, or the fourth kind of mark (`icon`, a node) where there is no `RecordMark` face —
never gated on `shape` at all. Two accounts/apps censused separately as un-faced options
while looking (`app-form-dialog.tsx`'s own Main stakeholder row carried `shape: "round"`
with no `face: true`, so it drew nothing either) and given one. A phase/wave picker
(`wave-detail.tsx`'s "Put a phase in this wave" row) gained the fourth kind of mark too,
its own type's icon (`SprintTypeGlyph`), the same seam K58 gives a ticket.

**Status: ruled and shipped, 21 Sep 2026 (`web/components/records/record-picker.tsx`,
proved by `web/test/select-trigger-face-persists.test.tsx`'s existing kit-Select suite
plus the widened `web/test/faces-in-choices.test.ts` census, now covering apps, tickets,
phases and waves, not only people/contacts/accounts).**

### K58: ticket pickers show the type icon

**The rule.** Aurora's ruling, 21 Sep 2026, verbatim: *"On every choice component where I
can choose a ticket, show me the type as the icon everywhere."*

**The shape.** `ticketFace(ticket)` (`shared/web/ticket-face.tsx`) builds the `SelectFace`
for a ticket from its own type, through the same map the tickets list already draws
(`ticketTypeIconName`, `shared/ticket-types.ts`): the bug glyph for an Issue, the question
mark for a Question, the regular plus circle for an Extra, the chat bubble for Feedback, and
a neutral ticket glyph for a renamed or untyped ticket rather than a blank option. It reads
through kit v1.2.144's own `SelectFace.icon` variant (K57), so a ticket picker's trigger
keeps the type icon once an option is picked, the same as a face does.

**Status: ruled, in build, 21 Sep 2026 (`shared/web/ticket-face.tsx`); the story form's own
ticket picker (`web/components/work/story-form-dialog.tsx`) is a separate lane's file and
wires the helper on its own turn; a census of `web/components` and `shared/web` on 21 Sep
2026 found no OTHER Select or picker in the app choosing a specific ticket record yet.**

**Law.** R93 (`visual-accompanies-text`): a choice over a record with its own visual draws
that visual beside the text, never text alone; K57/kit v1.2.144 is what keeps it drawn once
chosen.

---

### K59: choices show a Where column and filter, and Added on / Added by, with sort by name and created on

**The rule.** Aurora's ruling, 21 Sep 2026, verbatim: *"everywhere where i edit choices we
need to add a cokumn as for where is taht choiceeee! for exmaple in settibsg sticket: typ
(bug, etc) but in eed to see that 'type'. makes sense no? also have it as a filter. in
choices also show columns added on and added by, and add sort (name, xreated on) this
everywhere where choices."*

**The shape.** One component draws every choices table in the app — the general Settings ›
Choices tab and every per-module Choices panel both mount `SettingsChoicesPanel`
(`web/components/screens/settings-choices-panel.tsx`), scoped or not — so one change reaches
both. A **Where** column (`shared/selectable-where.ts`'s `selectableFieldWords`, derived off
the group-to-table/column map `shared/selectable-homes.ts` already keeps, never a second
list) reads "Tickets: Type", "Stories: Status", "Phases: Type" — the module a group is edited
on beside the field its values fill in. It folds the table's old Module column (module alone)
rather than adding a seventh, and it is drawn even on a scoped, single-module page, because
her own example is written from one ("in settings tickets… I need to see that 'type'"). A
**Where filter** facet reads the same field word, offered only when a reader's visible groups
actually span more than one (a facet with one answer decides nothing). The list door
(`listSelectable`, `workers/tenancy/src/lib/selectable.ts`) already hands back the WHOLE
team vocabulary in one bounded, capped read — never paged, not a `GROWING_COLLECTIONS` entry
— so both the Where and the pre-existing Module/Status filters narrow the already-fetched rows
client-side, the same mechanism the Status facet has always used; R14/R16 (paged/growing
lists) do not apply to this door. **Added on / Added by** fold into one **Added** column
(creator's first name over the date, the same stack shape a record's own footer draws) —
`listSelectable` now selects the audit block (`created_at`/`creator_id`/`creator_name`) on
every row, not only the single-row door, so `SelectableValue.createdAt`/`createdByName` are
never absent from a list read again. **Sort by name** was already the Value column's own
header (`sort: "value"`); **sort by created on** is the new Added column's header
(`sortType: "date"`, comparing the raw instant, never the formatted date).

**VALIDATED 21 Sep 2026.** Aurora reviewed staging this round and confirmed the Choices columns layout: Value with its mark, Status as the second column, Details, Where, Added, Actions, with sort moved to the toolbar.

**Status: validated, 21 Sep 2026** (`shared/selectable-where.ts`,
`web/components/deep-link/shape.tsx`'s `shapeChoicesTable`,
`web/components/screens/settings-choices-panel.tsx`); worker change in
`workers/tenancy/src/lib/selectable.ts`; tests in
`workers/tenancy/test/selectable-where.test.ts` (every seeded group resolves a field word),
`workers/tenancy/test/selectable-doors.test.ts` (the list door's audit block), and
`web/test/shape.test.ts` (the Where/Added cells and the date sort's raw key).

**Law.** R82 (`table-column-budget`): value + where + details + status + added + actions is
six columns, the ceiling itself — Module folded into Where and Added on/Added by folded into
one Added column are what hold the line, so no `TABLE_COLUMN_BUDGET_EXEMPT` entry was needed.
R75 (`sorted-options`): the Where facet's options sort A→Z for free, through
`shared/web/screen-engine/filter-bar.tsx`'s own `optionsFor` chokepoint every facet already
passes through. `sorted-columns-declare-their-type.test.ts`: the Added column's `sortType:
"date"` + raw `sortKey` is what that census requires of any sortable date cell.

**AMENDED the same day, 21 Sep 2026: the Added column splits, and Status folds into Value
instead.** Aurora's ruling, verbatim: *"ok split the who and date added in 2 columns."* The
one folded **Added** cell above did not survive the day it shipped: it is now two real
columns, **Added by** (the creator's face and first name, `RecordMark` drawing the initials
tile alone, since `SelectableValue` carries no picture, the same "no photo field yet" gap the
work-logs panel's own Logged-by filter already carries) and **Added on** (the date alone,
`sortType: "date"` riding the raw instant unchanged from the fold it replaces). Splitting one
column into two put the table at seven, one past R82's ceiling, so something else had to fold.
**Status** is the one that moved: its `<Badge variant="status" dot={…}>` chip now sits beside
the Value cell's own name (a small chip trailing the record's own mark, the identical FOLD
TECHNIQUE the tickets list already uses for its own Closed column, "fold the extra fact onto
an existing column's own second slot", chosen over folding into Details, which reads blank on
most rows already, or into Where, which is already full with two facts of its own). The
toolbar's own three-way Status facet (`statusState`) is untouched, so nothing a reader could
filter by is lost, only the column's own header. Value's own header still reads "Value" and
still sorts by `valueText` alone; the chip beside it is a decoration on the cell, not a second
sort question.

**Law, re-run.** R82: value + where + details + added by + added on + actions is six columns
again, Status's fold (into Value) and Module's fold (into Where, unchanged from the ruling
above) both holding the line, still no `TABLE_COLUMN_BUDGET_EXEMPT` entry needed.
`sorted-columns-declare-their-type.test.ts`: Added on's `sortType: "date"` + raw `sortKey`
(`createdAtRaw`) carries the same law the old Added column held. R90 (`faces-in-choices`) is
read for the PATTERN here rather than enforced on this cell, its own census is scoped to
`<Select>`, never a table column, and R54 (first name only) still governs `addedByText`.

**AMENDED AGAIN, 21 Sep 2026: Status is back to its own column, and Details folds into
Value instead.** Aurora's ruling, verbatim: *"ok, but keep status as its own column!"* The
fold one paragraph up did not survive either: the `<Badge variant="status" dot={…}>` chip
moves back off the Value cell and onto its own `status` column cell, restoring the header
row Value/Where/Status/Added by/Added on/Actions carried before the 21 Sep 2026 evening
reading. Something still has to fold to hold R82's six-column ceiling now that Status has
its seat back, and this time it is **Details** — its own column since 16 Sep 2026 evening —
folding onto the Value cell's own SECOND LINE, muted, rather than beside the name: the value
on the first line, Details underneath it when the row has one, the identical stacking
`tickets-collection.tsx` uses to put a resolver's name over their date in its own Closed
column (and, before her 20 Sep 2026 ruling retired it from that one call site, the way the
same table stacked a raised-on date under the raiser). Details reads as an honest empty cell
on most rows already (this rule's own "shape" paragraph, and `shapeChoicesTable`'s own
header, "THE DETAILS COLUMN") — Sprint type and Story type draw an icon, App stage a dot
tone, and every other seeded type (Industry, Country, the three "labels" groups, and more)
draws nothing at all — so folding it under Value costs a reader less than folding Status
ever did: Status fills a real, filterable word on every row, and Details mostly does not.
The toolbar's own three-way Status facet (`statusState`) is unaffected either way, exactly as
the 21 Sep 2026 fold left it.

**Law, re-run again.** R82: value (with details folded beneath) + where + status + added by +
added on + actions is six columns again — Details' fold (into Value's own second line) and
Module's fold (into Where, unchanged since the first ruling) both holding the line, still no
`TABLE_COLUMN_BUDGET_EXEMPT` entry needed. `sorted-columns-declare-their-type.test.ts`:
Status's restored column reads `sort: "status"` / `searchKey: "statusText"` / `sortKey: (r) =>
r.statusText` — a plain-text comparison, no `sortType` needed, the same shape the column held
before the 21 Sep 2026 fold ever moved it. Tests: `web/test/shape.test.ts` (the status cell
its own node again, and the Value cell's own second line proven present for a type Details
has something to say and absent for one it does not).

**AMENDED YET AGAIN, 21 Sep 2026 (later the same day): the mark moves beside Value, Details
returns as text only, and the header sort moves to the toolbar.** Aurora's ruling, verbatim:
*"no: the icon/color next to the value in first column! details is the next column (however
icon color its not a detail!) make status the second column, the rest ok. remove the sort from
the headers and add it in toolbar!"* Two corrections in one sentence. First, what the previous
reading's Value second line had actually been showing for four of the seeded types (Sprint
type's own glyph, Story type's own glyph, Ticket type's own glyph, App stage's own dot) was
never a DETAIL, it was the same kind of MARK `ChoiceGroupHome.colour`/`.icon` already draw
beside a value's own name, so it moves there now (`choiceValueMark`, deep-link/shape.tsx), a
`Swatch` for a colour/dot tone and an `Icon`/`SprintTypeGlyph` for a glyph, never a second line.
Details returns as its own column, third (after Status, which keeps the second seat the morning
reading above gave it), holding only what is left once the mark is gone: Sprint type's own
day-count `Badge`, the one real case; Story type, Ticket type and App stage had nothing beyond
the mark that just moved out, so their Details cell is now an honest empty one. Second, and
unrelated to the column order: no header sorts any more, every `TableColumn` drops its
`sort`/`sortType`/`sortKey`/`defaultDir`, and a toolbar `SortControl` takes over instead,
offering **Name** (`valueText`) and **Added on** (`createdAtRaw`, the raw instant, never the
formatted string), the same `CollectionConfig.sortable`/`sortOptions` seam Stories' own List
view already drives its toolbar sort through (`shared/web/screen-engine/collection.ts`'s
`selectRows`, executed by `CollectionFrame`, never a second sort engine). And because Added by
and Added on stay split at seven named facts (Value, Status, Details, Where, Added by, Added on,
Actions) the moment Details comes back as its own column, they fold back into one **Added**
cell, creator's face and first name over the date, the exact shape the very first 21 Sep 2026
reading of this rule shipped, before that same-day split, restored rather than reinvented.

**Law, re-run a third time.** R82: value + status + details + where + added + actions is six
columns, Details' return as its own column is paid for by folding Added by/Added on back into
one Added cell, the same six-column accounting the very first 21 Sep 2026 reading held before
the split. `Actions` counts toward the ceiling: `table-column-budget`'s own census
(web/test/table-column-budget.test.ts) asks only whether every element of a `TableColumn[]`
literal carries a `key` AND a `label` property assignment, and this table's own actions column
always has both (`label: ""` included), which is what makes the fold necessary rather than
optional: seven named facts across six seats. `sorted-columns-declare-their-type.test.ts`: no
column declares a `sort` any more, so nothing here is compared in the browser by a header; the
toolbar's two `SortOption`s read `valueText`/`createdAtRaw` directly off the row, the same raw
fields the retired header sort's own `sortKey`s read, never the shaped `value`/`added` cells.
`status-owns-the-chip.test.ts` (R86): App stage's dot moved from a `<Badge variant="status"
dot={…}>` to a `<Swatch colour={…}>` beside the value, so it is a MARK now rather than a second
coloured chip on the row; the census still passes it clean because the `Swatch` reads a local
`stageTone` (named so its own resolved text still says "stage", the census's own oracle).
Tests: `web/test/shape.test.ts` (the mark beside Value for Sprint/Story/Ticket type and App
stage, Details' own text-only cell, and the folded Added cell).

---

### K60: every timer-start button reads "Start", with the stopwatch icon

**The rule.** Aurora's ruling, 21 Sep 2026, verbatim: *"everywhere where there's button to
start timer, rename to just 'start' and change icon for a stopwatch (same as in navbar for
logs)."*

**The shape.** The Logs rail entry's own glyph is `CONCEPT_ICON.time` (`web/lib/pages.ts`),
`"timer"`, the kit's `Timer` Phosphor component, so "the stopwatch" and "the same as the
Logs rail" name one glyph. The app's one shared start/stop toggle, `useRecordTimerAction` /
`RecordTimerButton` (`web/components/shell/timer-bar.tsx`), is what the ticket head and the
story head both read; its "not mine" branch now defaults to `t("Start")` and `<Timer>`
rather than `t("Start timer")` and `<Play>`. The Stop half is untouched on purpose: it has
always drawn `StopCircle`, never `Play`, so it was never in the icon family this ruling
retired. The Stories page's own per-story quick-launch strip (`StartTimerStrip`,
`web/components/work/time-panel.tsx`) took the same glyph swap; its label stays each story's
own title rather than the bare word "Start", since five buttons in a row read alike
otherwise, and the word this ruling names is what the CONTROL says, not what identifies
which record it starts. Task detail's own button is a separate, same-day lane (its own
21 Sep 2026 ruling, "beside the mango Done") wiring a `startLabel`/`startIcon` override on
the same shared control; it inherits this default for free and is not re-touched here.

**VALIDATED 21 Sep 2026.** Aurora reviewed staging this round and confirmed every timer-start button reads "Start" with the stopwatch icon.

**Status: validated, 21 Sep 2026** (`web/components/shell/timer-bar.tsx`,
`web/components/work/time-panel.tsx`); census in `web/test/timer-start-word.test.ts`, which
walks every call site that wires a timer-start control and fails on a leftover "Start timer"
string or `Play` icon, task detail/task form named out (another lane's own file).

**Not a law.** No registry entry, a plain copy/icon rename recorded here for the next
reader, checked only by the census test named above.

---

### K61: the billable flag on work logs is killed, not hidden

**The rule.** Aurora's ruling, 21 Sep 2026, verbatim: *"remove the billable from logs, not
hide, remove."*

**The shape.** `WorkLog.billable` (`shared/types.ts`) is gone, along with every surface that
read or wrote it: the time form's Billable switch (`web/components/work/time-form-dialog.tsx`),
the Logs screen's "not billable" chip (`web/components/work/time-panel.tsx`), the `billable`
field on `log_time`/`update_work_log` on both the web door
(`workers/content/src/routes/work-logs.ts`, `workers/content/src/lib/work-logs.ts`) and the MCP
tool catalogue (`shared/workers/tool-catalog.ts`'s `log_time`), the meeting-capture INSERT that
used to mark every log it wrote billable (`workers/content/src/lib/meetings.ts`), the
`work_logs.billable` facet (`shared/workers/query-grammar.ts`) and the automations census entry
that named it (`shared/automations.ts`, renamed `meetings.time-log`). The column itself is
dropped, not left unmounted: team migration `0115_the_billable_flag_is_killed`
(`workers/tenancy/src/team-schema/migrations.ts`) runs `ALTER TABLE work_logs DROP COLUMN
billable`. No hours summary ever split billable from non-billable time — `totalSeconds`
(`WorkLogSummary`, `shared/types.ts`) was already one total — so nothing there needed changing.

**VALIDATED 21 Sep 2026.** Aurora reviewed staging this round and confirmed billable is gone from work logs entirely, the column included.

**Status: validated, 21 Sep 2026** (`workers/tenancy/src/team-schema/migrations.ts`,
`workers/content/src/lib/work-logs.ts`, `web/components/work/time-form-dialog.tsx`,
`web/components/work/time-panel.tsx`); proven by
`workers/tenancy/test/migration-0115-billable-column-dropped.test.ts` and
`workers/content/test/work-logs.test.ts`.

**Not a law.** No registry entry, a field removal recorded here for the next reader, checked
only by the migration and door tests named above.

---

### K62: the "not live" hint is a compact pill, bottom centre

**The rule.** Aurora's ruling, 21 Sep 2026, verbatim, choosing option A off the side by side
design page over a full width bar: *"for not live implement A Compact pill, bottom centre."*

**The shape.** `LiveStatus` (`shared/web/live-status.tsx`) no longer draws an inline warning
strip above a screen's own content, pushing it down while the socket is out. It is now a
fixed, bottom centred pill in the kit's own toast register: `rounded-pill`, `bg-warning
text-warning-foreground`, the kit's overlay shadow, the cloud icon it already used, one line
("Not updating live right now.", shortened from the old two sentence strip so it reads like a
toast rather than a paragraph), a Refresh action in the toast's own dense light wash button
style, and a small close mark that hides it for this disconnection only (a fresh drop shows it
again). Its base offset is the version toast's own, `var(--space-7)` on a wide screen and
`var(--space-4)` on a phone, the same two tokens `<Toaster>` passes as `offset` and
`mobileOffset`. Two more clearances stack on top through custom properties each shell sets on
its own root wrapper, the same shape `app-shell.tsx`'s own `--shell-top` already uses:
`--live-status-tab-clear` for the phone's own fixed bottom tab bar (agency only, zero at `md`;
the portal's own bottom nav shows at every width, so its wrapper carries no `md` override), and
`--live-status-band-clear`, raised only on a ticket screen through a
`has-[[data-slot=ticket-footer-band]]` selector, so it clears R89's dark Latest activity /
Record band without a prop the component would have no honest way to fill in on its own. Both
shells now mount it as a sibling of the routed screen (`app-shell.tsx`, after `</ScreenShell>`;
`portal-shell.tsx`, after `</main>`) rather than inside the page width column, so it never adds
a box, a height or a width to whatever a screen is showing.

**VALIDATED 21 Sep 2026.** Aurora reviewed staging this round and confirmed the "not live" hint is a compact pill at the bottom centre in both apps, and the design page was deleted at her ask.

**Status: validated, 21 Sep 2026** (`shared/web/live-status.tsx`,
`web/components/shell/app-shell.tsx`, `web-portal/components/portal-shell.tsx`,
`shared/i18n-seed.ts`); proven by `web/test/live-status-pill.test.tsx`.

**Not a law.** No registry entry, a presentation change recorded here for the next reader,
checked only by the test named above.

---

## 5. Buttons and actions

### B1: two visible actions maximum on any title

A record title carries at most **one primary** and **one secondary** button. Everything
else goes into a three-dot menu at the end of the group.

Ranking, when you have to choose which two survive:

1. The action that **moves the record forward** in its lifecycle (Answer, Start, Complete,
   In progress). This is the primary, `variant="default"`.
2. The action a person takes **most often that is not destructive**. Secondary,
   `variant="outline"`.
3. Everything else: Edit, Archive, Deactivate, Translate, Reply by email, Make it a
   story, Move up, Move down, Read the transcript, Take it back out.

Concrete target, `web/components/tickets/help-detail.tsx:418-539`, which is Aurora's seven:

| Action | Line today | Where it goes |
|---|---|---|
| Answer | 434 | primary button |
| Reply by email | 446 | menu |
| Translate | 419 | menu |
| Make it a story | 460 | menu |
| Edit | 471 | menu |
| Archive / Take it back out | 486, 497 | menu, destructive styling |
| Move up / Move down | 520, 530 | menu |

That is one visible button and a menu. `story-detail.tsx` keeps "Start timer" as primary
and "Edit" as secondary, moving "Move up" and "Move down" into the menu.
`sprint-detail.tsx`, `account-detail.tsx`, `app-detail.tsx` and `meeting-detail.tsx`
already have two or fewer and need no change.

Evidence: `A-4.05.52` shows exactly this: one "In progress" primary and a three-dot menu
containing Blocked, Edit, Archive, Delete. `A-3.58.01` shows "Start" plus a menu with
Edit and Delete. `P-4.10.05` shows "Open App" plus "New Ticket" and nothing else.
`A-3.57.42` and `A-4.07.25` show a menu alone.

> **AMENDED (2026-09-17): a third, standalone control is allowed when it is the pen.**
> The client's ruling, reading the deployed ticket detail page, verbatim: *"The edit
> button: put it outside, just the pen."* Edit left the ⋯ menu B1's own table put it in
> and became a standalone icon-only `PencilSimple` button in the title's own actions row
> (`web/components/tickets/help-detail.tsx`, the `actions` block) — never mango
> (`variant="inverse"`, since Close already claims the one primary slot this row is
> allowed), and never counted against the "most often, not destructive" secondary slot
> either, because it is not competing for a rank: it is *always* offered wherever
> `canEdit` is true, the same unconditional posture Files and links kept. The ticket
> title now carries three visible controls — Close (primary, mango), the pen (inverse,
> standalone) and the ⋯ trigger — plus the unrelated timer button, which was never one
> of B1's two counted slots to begin with. **The ceiling is now three where a pen edit
> exists as its own standalone control**, not two: one primary, one pen, and the menu
> trigger. This does not reopen the menu to a third competing action — Translate, Files
> and links, and Archive/Restore stay exactly where B1's original table put them, inside
> the ⋯. Only the pen moved, and only the pen earns the third slot.

### B2: the three-dot menu

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="icon" aria-label="More actions">
      <MoreHorizontal className="size-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem>…</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive">…</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

Every item keeps the icon from the UI-CONVENTIONS.md §4 mapping at `size-3.5`.
Destructive items sit last, after a `DropdownMenuSeparator`, in `text-destructive`, and
still open their confirm step. Only these `DropdownMenu*` names exist; there is no
`DropdownMenuRadioGroup` in this library.

Evidence: `A-4.05.52` (Blocked, Edit, Archive, Delete, with Delete last), `A-4.06.01`
(the same menu on mobile, In progress promoted into it), `A-3.57.48` (Edit, Delete).

### B3: the add button is a plus glyph with no text, everywhere

```tsx
<Button size="icon" onClick={onCreate} aria-label={`New ${nounSingular}`}>
  <Plus className="size-4" />
</Button>
```

`Button` already has `size="icon"` (`size-9`, `rounded-full`), which produces the round
dark button the old app uses. Change `web/components/deep-link/screen-bits.tsx:95-98`,
which is the single seam for every collection add button in the agency app, and
`web-portal/components/tickets-screen.tsx:62`.

The thirteen labels this deletes ("New task", "New story", "New meeting", "New role",
"New account", "Invite", "Raise ticket", "Add a source", "Map a process",
"Start a sprint", "Record an app", "Upload a file", plus the portal's) become the
`aria-label` and the tooltip. That also ends the two competing naming families
("New <noun>" and "<verb> a <noun>").

Evidence: `A-3.55.34`, `A-3.59.42`, `A-4.00.30`, `A-4.00.44`, `A-4.06.12`, `A-4.07.02`,
`A-4.07.11`, `A-4.07.34`. The old app uses a bare plus in every one, on desktop and
mobile, on top-level collections and on sub-collections.

The one exception, historically: the portal's "New Ticket" kept its label, because a
client visits rarely and needs the invitation (`P-4.10.05`, `P-4.10.12`, `P-4.10.19`).

> **AMENDED (2026-08-31): the exception is gone — there is no exception.** The client's own
> ruling, quoted verbatim in the portal's own source: *"+ actions never have a word, they
> are only the + icon."* `web-portal/components/tickets-screen.tsx:100-108` ships the
> portal's create action as the identical icon-only pattern every other add button in the
> app uses — the words become the accessible name and the tooltip, the same seam the
> agency's own `AddButton` draws create actions from — and the labelled button moves to the
> empty state instead (composition 27.21's own carved-out exception: "the only place a
> labelled create button is allowed, because there is no toolbar + to lean on and the
> screen exists to be filled"). A later, dated, sourced ruling beats an undated old-app
> screenshot; there is now exactly ONE shape for a collection's create action across both
> front doors.

### B4: import and export keep their labels and their icons

`Upload` plus "Import CSV", `Download` plus "Export CSV". These are rare, consequential
and not guessable from a glyph.

Evidence: (inferred) the old app has no import surface to copy; this follows from
UI-CONVENTIONS.md §4 and from the same reasoning as the portal exception in B3.

**Exception, 2026-09-15:** The Roles settings screen (`roles-matrix.tsx`) has no import or
export buttons. The client's ruling: *"Kill import and export for permissions settings."*
Permissions are maintained through the matrix UI only, never via bulk CSV operations.

### B5: a full-width outlined button is the pattern for a secondary action inside a panel

```tsx
<Button variant="outline" className="w-full gap-1.5">
  <Plus className="size-4" /> Task
</Button>
```

Evidence: `A-4.07.34` ("+ Task"), `A-4.07.25` ("Translate"), `A-3.59.09` ("Edit"),
`P-4.09.55` (the portal's full-width primary).

### B6: destructive stays red and still confirms

Unchanged from UI-CONVENTIONS.md §4. Moving an action into the menu does not remove its
confirm step.

### B7: a view switch is a labelled pill, not a plus

Calendar / Grid / List switches are `Button` with an icon and a label, filled when active.
Do not make them icon-only; they are modes, not actions.

Evidence: `A-4.08.47` and `A-4.08.56` ("Grid" as a filled dark pill with a grid glyph).

**A view switch's OPTION SET may depend on the tab it sits beside** — Meetings,
2026-09-09 ("calendar as a view") and 2026-09-15 (her tabs/views ruling in full, verbatim):
*"In meetings, the tabs that I would like are: This week / Mine / and: Replace 'All' with
'Everyone's'. The views I want in 'This week' are: Agenda chronological (this is only for
mine, unless I say so, and it's always filtered to mine). Same goes for tasks and meetings.
Again, on 'This week', I want the views: Agenda / Calendar / Table. On the 'Mine' tab, this
shows all of my meetings, past and present. I also want the views: Calendar / Table. On
'Everyone's', I want the views: Table / Calendar."* Three tabs, three DIFFERENT view lists —
This week: Agenda · Calendar · Table; Mine: Calendar · Table; Everyone's: Table · Calendar —
the first named in each is that tab's own default, and the choice is remembered PER TAB, not
in one shared slot, so switching tabs never strands a reader on a body their new tab does not
offer. Still one `ToolbarViewSlot` config (R53's fixed slot order), just built from the open
tab rather than a constant. "List" retired everywhere it appeared here in favour of "Table" —
she asked for Table, not List. SUPERSEDED A FEW HOURS LATER, the next paragraph. "Agenda" is
the kit's own `Agenda`
(`shared/ui/components/agenda/agenda.tsx`, CH19 view 10) drawn through the ONE host wrapper
every calendar/agenda in the app is required to go through (`RecordCalendar` /
`RecordAgenda`, `web/components/records/record-calendar.tsx` — see the "ONE CALENDAR" law,
`web/test/rules.test.ts`'s `one-calendar`), never imported directly by a screen. STILL TRUE.

Evidence: `web/components/meetings/meetings-screen.tsx` (the header block above
`MeetingsScreen` carries her words verbatim and the whole redesign).

**TABLE RETIRED A SECOND TIME, IN FAVOUR OF LIST — 2026-09-15 (evening), tested a few
hours after the AM rebuild above shipped, verbatim:** *"On meetings this week, replace the
view table for list."* / *"On meetings, mine: replace table for list. Same in everyone's."*
Every tab now offers List instead of Table, in the exact same slot her AM ruling gave it
(first-named is still that tab's own default): This week is Agenda · Calendar · List; Mine
is Calendar · List; Everyone's is List · Calendar. The row is one shape on every tab — a
`RecordMark`, the title, and a date · time · meeting type · account detail line — drawn
through `shared/web/list-compat.tsx`'s `List` (the same component every other collection's
list body draws through), never the retired `ScreenRenderer` path this base used before
Table existed and never a second hand-rolled row. Alongside it, the same evening: *"On
meetings, kill the import."* The toolbar's "Import CSV" button, the empty state's own
"Import a list" act and the `onImport` prop that fed both are gone from this screen — the
import DOOR itself is untouched, reachable from Home's own generic "Import" tile.

**WEEK JOINS BESIDE CALENDAR, ON EVERY TAB — the fourth ruling, once the week lane's own
`RecordWeek` (`web/components/records/record-week.tsx`) landed.** Order is now This week:
Agenda · Calendar · Week · List; Mine: Calendar · Week · List; Everyone's: List · Calendar ·
Week — Week always sits immediately after Calendar, first-named still each tab's own
default. Each card carries the meeting's start time as `CalendarEntry.time`, drawn as
`RecordWeek`'s own eyebrow (never a placeholder when a meeting has none). `MeetingsWeek`
(`meetings-screen.tsx`, beside `MeetingsAgenda`) builds the rows straight off the tab's own
loaded page, the same choice Agenda already makes, rather than a dedicated week-scoped door
read — Calendar is the one view with that investment, built for the month grid specifically.

Evidence: `web/components/meetings/meetings-screen.tsx` (the header block's "THE VIEW SLOT
STAYS" paragraph and `MeetingsWeek`'s own doc comment).

**RESOLVED, 16 SEP 2026 — the caution above was right to hold, and the instruction it
declined was right too.** The client confirmed it herself, directly, verbatim: *"Also, the
list view on meetings is completely wrong. I want it exactly like the one in tickets. What
you did is something different. Once again, kill the emojis. Also, when they're in the
name, just remove them, please."* So the `list-compat.tsx` row this section used to describe
is gone, a second time, and this time for good: Meetings' "List" is `RecordTable` in the
tickets shape (R80/K22 — see K22's own note below), the same shape the caution above named
almost exactly — Name · Date · Time · Type (`purposeCell`, the meeting type's own Phosphor
icon beside its name) · Attendees (faces, then a `+N` count past three) · Account
(`accountCell`, a mark and a name) — on every tab that offers it, sort staying in the
toolbar's one `<SortControl>`, no column head clickable, matching Tickets' own
`TicketRowsTable` ("deliberately do not sort"). This settles the word for the whole app:
**"List" names the flush, hairline COLUMN list (R80/K22's shape), never the two-line
`list-compat.tsx` row** — the same settlement K22 itself records, one file below. Titles
arriving from Google Calendar are stripped of every emoji/pictograph at ingest
(`workers/content/src/lib/meetings.ts`'s `titleOf`) and again at display for a row synced
before this ruling shipped (`stripPictographs`, `shared/text-clean.ts`), and the "Meeting
types" link at the foot of the main screen is gone outright — the same day's ruling, "this
should not be there because this is already on the meeting settings" — leaving Settings ›
Meetings › Choices as its one door.

Evidence: `web/components/meetings/meetings-screen.tsx` (the file's own header block carries
the 16 Sep 2026 ruling verbatim), `web/test/sorted-columns-declare-their-type.test.ts`
(`DOOR_ORDERED.when`/`.time`), `shared/text-clean.ts`.

**"Calendar" IS THE MONTH VIEW, ONLY — 2026-09-15, the same AM ruling, read further:**
*"Agenda is a different component than month. Inside the calendar, the whole month
agenda: disable that. When I mean calendar, I mean the month view."* `RecordCalendar`
used to offer its OWN month/agenda switch (a `ToggleGroup` inside the component, on
top of whichever view list above put "Calendar" on the tab) — a phone opened on that
inner agenda by default. That inner switch is gone: `RecordCalendar` draws the month
grid and nothing else, on every device, so picking "Calendar" from a `ToolbarViewSlot`
above always lands on the grid. "Agenda" stays exactly what B7 already says it is — the
kit's `Agenda`, reached through `RecordAgenda`, a genuinely different component reading
a caller-narrowed set of entries day by day — never a mode the calendar itself switches
into. `components/toggle-group` is consequently unreached and carries a
`KIT_COMPONENT_EXEMPT` line (`shared/rules/registry.ts`) rather than a live adoption.

Evidence: `web/components/records/record-calendar.tsx` (file header, "ONE WAY TO READ
ONE MONTH").

### B8: action rows wrap and the group is pushed right with `ml-auto`

Already law (UI-CONVENTIONS.md, C4). Restated because [B1](#b1-two-visible-actions-maximum-on-any-title)
shrinks these rows to two items and the wrap rule must survive the edit.

### B9: pagination is numbered, centred, at the foot of the collection

`Button variant="ghost" size="icon"` for previous and next, numbered pages between.

Evidence: `A-4.06.45`. This app currently uses a "Load more" button
(`web-portal/components/tickets-screen.tsx:88`), which R14's keyset paging supports
either way. (inferred: adopting the old app's numbered form; both satisfy R14.)

### B10: a module's settings have two entrances and one page behind them

**The rule.** *"Does every module get the gear? Only the ones with something to set."* A
module that has something to set gets a settings **gear on its own screen** and a row on
the **Modules tab** in Settings, and those are two doors onto ONE page — because
*"everything around settings should be under settings screen concentrated (and 'quick
access' through the gear in each module) but not in random places across the app."*

Four things follow, and none of them is a per-screen decision:

1. every module named in `MODULE_SETTINGS` has **exactly one** gear mounted in `web/`, and
   every gear mounted names a module that table declares. Both directions, because each
   failure is invisible on its own: a settings page with no gear is a page nobody standing
   on that module can find, and a gear on a module with nothing to set renders nothing for
   ever and looks exactly like a module that has no settings;
2. the Modules panel on `web/components/screens/settings-screen.tsx` spells no module of
   its own — its rows are built from the same table, so they cannot be hand-kept;
3. **the permission is asked once.** `visibleModuleSettings`
   (`web/components/screens/module-settings-screen.tsx`) is the one expression that decides
   whether a module has settings THIS reader may open, and the gear, the page and the tab
   row all ask it. Her sentence, held structurally rather than restated three times: *"a
   reader who may see tickets but not the vocabulary should not be offered a door that
   refuses them."*
4. **inside one module's own page, a tab is drawn only where something is behind it, and
   its badge counts ROWS — the same rule R16 states for every collection in the app, not
   an exception to it.** A module that owns both an Automations section and a Choices
   section gets two tabs; a module with only one kind gets a single tab, never a second,
   empty one beside it — the standing refusal against a control that decides nothing, read
   onto a tab instead of a switch (`module-settings-screen.tsx`, reasoned from
   R36/R50/R61). The badge on each follows R16 through the one `formatCount` seam. The
   Automations count is the module's own row count in the `AUTOMATIONS` registry — a code
   constant rather than a query, but still a count of automations, one row per automation.
   **The Choices count RULED TWICE, one day apart, and the second ruling is the one
   standing.** Client, 2026-09-14, pointing at the two tabs: *"show the total count for
   Automations and for Choice Components categories, not for the amount of choices"* — read
   at the time as GROUPS (categories), never the values inside them. Client, 2026-09-15,
   on seeing what that produces on the Tickets page (a badge reading 1 over a panel
   listing 15 values): *"Even though I can see a lot of active ticket choices, it still
   shows me the choices count as 1… I would rather all badge counts show me the count of
   rows rather than types, so please change it."* The second ruling is broader than the one
   screen it was noticed on — every tab badge in the app, ~25 of them, already counted the
   rows its own panel lists; the Choices badge was the lone exception, and the
   inconsistency was the defect. It now counts VALUES, read off the same cache the panel
   below it already primes (R56 — no second door ask), standing down to no badge at all
   (`formatCount(undefined)`) rather than a possibly-wrong one whenever its source is still
   loading or came back at the door's own hard cap — a wrong number is worse than no
   number, the same refusal R23 and R42 make elsewhere in this app.

**Law.** [R61](../RULES.md) (`module-settings-two-doors`).

### B11: a settings area gets one aggregate tab per cross-module concern

**The rule.** Beside each module's own scoped settings ([B10](#b10-a-modules-settings-have-two-entrances-and-one-page-behind-them)),
Settings draws ONE tab per CROSS-MODULE concern the client asked to see gathered in one
place — every automation in the system, filtered by module and status; every choice value
in the system, together, as a table — never a second, competing home for the same concern.

*Automations*, client, 2026-09-14: *"On Settings, add a tab for Automations and show all
the automations in the system, filtered by module and by status."* One mounting answers
it: the same `ModuleAutomations` (`web/components/screens/module-automations.tsx`) a
module's own settings page mounts with `scope: { kind: "module", segment }` is mounted once
more on the Automations tab with `scope: { kind: "all", modules }`, reading the identical
`AUTOMATIONS` registry and the identical `moduleSettingsIndex(can)` gate — never a second
list built by hand.

*Choices*, client, 2026-09-14, pointing at the Contacts table: *"create a tab in settings
with choices where we see all the choices together… the value itself · module with the
icon · status: active, inactive, and are protected."* `SettingsChoicesPanel`
(`web/components/screens/settings-choices-panel.tsx`) answers it — reading the SAME door
and the SAME cache key (`tenancy.selectable()` under `selectable:<teamId>`) every module's
own `SelectableScreen` already opens, so an edit on a module's own page is seen here live
(R56). It is a NEW component rather than a third mounting of `SelectableScreen`: the shape
asked for is a table with three named columns, not the grouped lists and chip walls
`SelectableScreen` draws. What is shared is the fetch and the door's own idea of what a
value IS; what differs is the presentation.

**The shape repeats even where the component does not.** Automations reuses one component
under a second `scope`; Choices reuses one door under a new presentation component. Both
answer the same brief B10 already answers twice over — a reader who wants the whole
picture across every module never has to open each module's settings page in turn — and
both are gated the identical way B10 already is: `moduleSettingsIndex(can)`, never a second
`can(` call.

**AND THE MODULE-SCOPED HALF IS THE SAME COMPONENT TOO, 15 SEP 2026.** `SettingsChoicesPanel`
took a `scope` prop the day after it shipped — B10's own module-settings page mounted
`SelectableScreen` (the grouped-list/chip-wall editor) for its own "Choices" tab, one editor
for the general table and a different one for every module's own narrowing, which is exactly
the second-editor drift B10's header already refuses ("never a second editor"). `scope`
narrows `modulesWithChoices` to one page's segment, drops the now-redundant Module column and
its filter facet (the page's own tab strip already says which module), and hands the create
dialog that one module's `types` directly rather than asking a question with one answer —
same table, same door, same cache key, two scopes. `SelectableScreen` is retired
(`GONE_ON_PURPOSE`, `shared/rules/registry.ts`).

**A CHOICE THAT IS NOT `selectable_data` GETS ITS OWN ADAPTER, NOT A FORCED FIT.** The
client's ruling on Meetings, same session: *"purpose is a choice component, so make sure you
move it inside meetings, settings, choices. And maybe you find another word for
'purposes.' … Maybe just 'type.'"* Meeting types (`meeting_purposes`, its own table — a
department per row is the one thing a dropdown value cannot carry) cannot be forged into a
`selectable_data` row, so `MeetingTypesPanel` (`web/components/team/internal-screens.tsx`) is
the smallest adapter: the SAME design (a `RecordTable`, one filled create circle, no emoji)
over a different door, mounted from the `meetings` page's own `choices` section
(`ModuleSettingsSection`'s third `kind`, `"meetingTypes"`, beside `"vocabulary"` and
`"automations"`) — sharing the "Choices" TAB with a vocabulary section without sharing its
component. The standalone Purposes screen this replaced is off the Meetings screen's nav
(`SECTION_HOSTED_ELSEWHERE.purposes`, `shared/rules/registry.ts`) — DB table, columns and API
paths unchanged, only the word ("Meeting purpose" → "Meeting type") and the door into the
editor moved.

**Automations status colours, 2026-09-15:** Every automation status draws its own colour,
shared with Choices — **protected** renders as ink (inverse), **active** renders as success,
**inactive** renders as outline (`AUTOMATION_STATUS_VARIANT`, `web/components/screens/automation-edit-sheet.tsx`).
A row in the Automations list opens a DETAIL sheet showing the automation (chip above title,
Edit pencil top-right like a record head, description, module), and tapping Edit swaps the
same sheet to the form mode for editing.

**AMENDED, 16 Sep 2026, same evening — the filled pill above is a dot now.** The client's
ruling, verbatim: *"For automations, let's change the full color pill to also be a dot.
Inactive gets gray, and active gets green."* Read the same session as *"All dots are always
solid, not rings."* The Automations list's status cell (`module-automations.tsx`'s own row
mapper) now draws `<Badge variant="status" dot={AUTOMATION_STATUS_DOT[status]}>` in place of
the filled `AUTOMATION_STATUS_VARIANT` pill: `shipped` (green) for Active, `archived` (grey)
for Inactive — both her exact words — and `building` (charcoal) for Protected, which she did
not name (flagged in `automation-edit-sheet.tsx`'s own header for her next pass, and see
D17). **This is scoped to the Automations LIST only** — the Choices table's own status cell
(`deep-link/shape.tsx`) still draws the untouched filled pill through
`AUTOMATION_STATUS_VARIANT`, a different screen, out of this ruling's reach. K31's Contacts
Portal column moves to the identical dot shape the same session; see K31's own amendment.

**Badge status fill (16 Sep 2026):** *"go for the kit fix"* — client. The `status` variant never drops its neutral fill; the dark-mode "building → mango" clause is gone (kit v1.2.96).

**Badge dot gap (17 Sep 2026):** Kit v1.2.102: the `Badge` component's dot variant carries
its own `gap-1` between the dot and its label, independent of size. Automations and Contacts
both use the dot badge now; both benefit from the unified gap. `web/test/badge-dot-gap.test.tsx`
asserts every size variant (`sm` / `md` / `lg`) renders the gap consistently.

**AMENDED 17 Sep 2026 — Dots like everywhere else.** Choices and meeting-type status now
draw the status dot from `AUTOMATION_STATUS_DOT` — green for active, charcoal for protected
(meeting type only), grey for retired (Choices) or inactive (meeting type). The Choices
table's own status cell (`deep-link/shape.tsx`) and the meeting-type settings panel now draw
`<Badge variant="status" dot={AUTOMATION_STATUS_DOT[status]}>` in place of the filled
`AUTOMATION_STATUS_VARIANT` pill, matching the Automations list's own shape. `web/test/automations.test.ts`
and `web/test/shape.test.ts` assert the dot use.

**Re-explained, 16 Sep 2026, pending her validation.** Both the Automations tab and the
Choices tab above were walked through with her again, over a side-by-side artifact
("Automations and Choices Explained"). Nothing in this section changed as a result — the
walkthrough confirmed the shape rather than correcting it — but she has not yet signed off,
so treat both as awaiting validation rather than closed until she does.

### B12: settings changes preview first and apply on Save, through the pinned bar

**The rule.** *"We need some kind of hint or flag, very visible, probably not at the
bottom, that allows me to save or to restart… however we call it normally in UI, to not
save the changes."* — client, 14 Sep 2026, over a screenshot of Settings › Appearance and
Settings › Team › Roles — both already staged a draft behind a Save button, Roles with no
way to back out at all. Her own design lane built a five-option comparison artifact against
that sentence and she picked the first, **Option A: a quiet band pinned directly under the
tab strip**, reusing the idiom the app's own collection toolbar already pins with (R63)
rather than a fourth kind of sticky chrome.

**The affordance is the kit's `UnsavedChangesBar`** (`shared/ui/components/unsaved-changes-bar/`,
v1.2.82) — `dirty` / `onSave` / `onDiscard` / `saving?`, every string a prop, nothing
rendered at all while `dirty` is false. Adopted on two screens:

- **Settings › Appearance** (`shared/web/appearance-panel.tsx`) — Size, Appearance
  (light/dark) and Background stage a PENDING value each; `AppearancePreview` renders the
  pending three, and nothing outside the tab moves until Save — the real font size, the
  real `data-theme`, the real rail colour all keep showing the SAVED three until she
  presses it. **Save** commits whichever of the three actually changed, in one pass — the
  same two persistence doors (`saveScale`, `saveSpine`) and the same device-local write
  (`applyThemeMode` + `localStorage`) this panel always called, just called once, from one
  place, instead of once per press. **Discard** sets all three pending values back to
  saved; nothing is sent anywhere.
- **Settings › Team › Roles** (`web/components/team/roles-matrix.tsx`) — the whole
  permission grid stages every switch behind Save, the way it has since the matrix
  shipped, but with no way to back out short of un-toggling each cell by hand: the design
  lane's own artifact named it outright, *"there is no Discard control on Roles today."*
  The bottom Save button — invisible on any viewport shorter than the whole matrix, the
  same "probably not at the bottom" complaint the bar exists to answer — is gone; `save()`
  is unchanged, only what calls it moved. **Discard** is new, and it is the draft's own
  reset, not a door call: `discardDraft` rebuilds the same `server` object the
  reconciliation effect already computes — the last-saved value of every active role's
  sheet — and writes it straight back over `draft`.

**Both are inert with nothing staged** (`dirty` false) — a Save that would do nothing is a
lie about state, so the row disables both rather than leaving a press with nothing to
commit.

**The one documented exception, in her own words: *"keep language instant."*** Language is
the fourth section of the Appearance panel and stays wired the way it always was — applied
and persisted the instant a pill is pressed, never staged, never part of `dirty`, untouched
by Discard. Put to her plainly before it shipped that way: the preview shows a chip, a
title and a lorem body, none of which read differently in another language, so staging
Language would show her nothing changing while she waited to press Save — the one control
where "preview it first" has nothing to preview. Recorded here as a decision rather than
left to read as an inconsistency the next reader notices between Language and its
neighbours.

**Switching a Settings tab while a panel is dirty asks first.** The tab strip's own
`onValueChange` is intercepted by one guard (`handleTabChange`,
`web/components/screens/settings-screen.tsx`): when the CURRENT tab is staged and dirty,
the switch does not happen yet — [R59](#f10-a-form-is-a-slide-in-a-warning-is-an-overlay)
(a yes/no warning is the one centred overlay) says this is the kit's `AlertDialog`, never a
second sheet sliding over the first, and the two answers are "Keep editing" (focused by
default, the safe answer) or a destructive "Discard your unsaved changes?" that runs the
tab's own Discard path before switching.

**The navigate-away half, closed 2026-09-15.** Staging a draft behind this bar answers "what
happens if I press Save or Discard" — it does not by itself answer "what happens if I leave
without answering either." Switching the Settings TAB while dirty already asked first
(`settings-screen.tsx`'s own `handleTabChange`); LEAVING Settings altogether — a nav-rail
press, an `<InAppLink>` to a record, closing the Settings tab in the workspace strip, or the
browser's own Back — used to unmount a dirty panel in silence, because none of those seams
had ever heard of the tab guard's private `dirtyTabs` map. `web/lib/unsaved-changes.ts` is
the one registry both now read and feed (`markDirty`/`isDirty`/`anyDirty`), and
`web/lib/nav.ts`'s `guardNavigate` is what asks before ANY navigation is allowed to unmount
whatever is showing — called from `softNavigate` itself and from `go()`
(`deep-link-screen.tsx`, registered as `hostGo`), which is what actually reaches a nav-rail
press or a workspace-tab close, since both call `go` directly rather than through
`softNavigate`. The one dialog (`<UnsavedChangesDialog>`,
`web/components/shell/unsaved-changes-dialog.tsx`) is raised locally by the tab guard and,
for a real navigation, by `<UnsavedChangesDialogHost>` — mounted once in `web/app/layout.tsx`
beside `<Toaster />`, because `guardNavigate` is a plain function with no dialog in hand, the
same shape `toast()` already uses. The browser's own Back is guarded too
(`use-host-nav.ts`'s `useUrlRoute`, which cannot `preventDefault()` a `popstate` and instead
puts the address bar back and asks). Opening a new workspace tab (`openInNewTab`, R74) never
asks — it does not leave the tab you were on — and a `beforeunload` listener covers closing
the browser tab or reloading outright, registered only while something is actually dirty.

**Not a LAW yet, on purpose.** A census could ask "every consumer of the kit's
`<UnsavedChangesBar>` calls `markDirty`" — the shape every other derived rule in this base
takes — but the real wiring is one file removed from the bar itself: `AppearancePanel` and
`RolesMatrix` each render the bar and expose `onDirtyChange`, and it is their CALLER
(`settings-screen.tsx`) that turns a press into a `markDirty` call, through a plain prop with
no marker a source scan can follow back to its origin. With exactly two callers, both wired
by the same hand in the same change, a check built to "derive" that link would really only be
restating two facts this file already asserts in prose — the dishonest shape the brief that
closed this gap warned against, not a rule that could catch a THIRD panel wiring the prop to
a `console.log` instead. Revisit this the day a third staged panel exists: two real call sites
sharing one traceable pattern is what a positional census (R20's own shape) needs to be worth
writing.

**Code.** `shared/web/appearance-panel.tsx` (the staging), `web/lib/unsaved-changes.ts` (the
registry), `web/lib/nav.ts` (the guard), `web/components/shell/unsaved-changes-dialog.tsx`
(the one dialog and its host).

**The bar's colour is warning-tinted, not the container's own tone (2026-09-15).** The client's
ruling, verbatim: *"the 'You have unsaved changes' pinned bar at the top had a different
color. Please implement that because right now it's in the same color as the container,
which makes it not so visible."* The bar renders as `bg-warning/10` plus a warning hairline
(`UnsavedChangesBar`, kit v1.2.84), a distinct warning-tinted band in both light and dark
palettes, never the container's own surface tone. This styling is enforced by the kit
component itself — no app-side law required.

**AMENDED 17 Sep 2026 — the language exception is retired; native names only; a taller,
truer preview.** Three of the client's rulings, one session, all over this same tab.
First, over the panel's own Languages row: *"In Settings > Appearance > Languages, only
put the name of the language in its original language. You don't need to also put it in
German."* Each pill used to carry its own name and its English name beside it wherever
the two differ; the second name is gone. Second, reversing this rule's own documented
exception above: *"Too many descriptions everywhere. Delete these live preview updates as
you press a control, and also delete the language changes right away. ... Actually, I
want everything to wait for the save. Nothing changes right away."* **"Keep language
instant" held for three days and is retired**: `LanguageSection`
(`shared/web/language-section.tsx`) no longer calls `setLang`, no longer calls `save`, no
longer shows its own toast — it is a plain controlled pill row now, `value` the PENDING
language, staged behind Save exactly like Size, Appearance and Background, folded into the
same "Saved."/"That didn't save. Try again." toast the other three already share. Third,
over the panel's own preview card: *"I want the preview ... to be slightly taller ...
represent more of the real look of the app and include more elements inside, not just one
kind of card."* `AppearanceTabPreview` now draws the rail, a two-tab strip, and one card —
a title row, a toolbar bar, a three-row list with a status dot each and one count badge —
inside one paper container, in place of the single kind of card it drew before.

**Tests:** `web/test/settings-appearance.test.tsx`, `web/test/language-switcher.test.tsx`.

**AMENDED AGAIN 17 Sep 2026 — the Appearance preview becomes a full-page artifact, multiple
options, and her pick is P1.** Reviewing the taller preview card above, the client's
ruling, verbatim: *"Good, the language part. However, I'm not happy with the
pre-visualization. Please create an artifact with multiple options and include the whole
settings page, like if it was a screenshot of the full page, not only this component."* A
follow-up artifact was built showing several full-page mock-ups of Settings › Appearance —
not a card-sized preview, the whole screen as it would actually render — and her pick,
verbatim: *"appearance p1"*. `AppearanceTabPreview` is superseded by whichever full-page
layout Option P1 draws; the staging mechanics above (Size/Appearance/Background/Language
behind Save, Discard, the tab-switch guard) are unchanged by this amendment — only what the
preview itself shows changes, from one card to the whole screen.

**Status: ruled, in build, 17 Sep 2026.**

### B13: a protected value is always active — there is no such state as "active, protected"

**The rule.** *"if it's protected, it's always active, so you don't need to put active
protected, just protected."* — client, 14 Sep 2026, over Choices' own status column.
Protection and activity are not two independent flags a reader reconciles by hand: every
screen that shows the state draws ONE word, `Protected`, standing in for the whole thing,
mutually exclusive against `Active`/`Inactive` (`settings-choices-panel.tsx` — its own
header: "every Protected row IS an Active
row, so a second facet asking 'is it protected?' beside a Status facet that already offers
'Protected' as one of its three values" would draw a state that can never match a real
row).

**The door.** `setSelectableActive` already refused to deactivate a protected, active value
(409 `default_value`) before this ruling. The gap was the other order: deactivate a value
first, while it is not yet protected, then protect it, and the row ended up protected AND
inactive with neither door ever having refused either half. `setSelectableDefault`
(`workers/tenancy/src/lib/selectable.ts`) closes it — protecting a value now REACTIVATES it
in the same call, on the same idempotent UPDATE R17 already asks for (a single
current-state predicate, `is_default <> ? OR (protecting AND still deactivated)`), rather
than a second refusal a caller has to route around before protecting something. Migration
`0088_a_pictograph_is_not_a_mark_and_protected_is_always_active` backfills every row the
old two-step gap could already have produced.

**The check.** `workers/tenancy/test/selectable-protected-active.test.ts` already proves
both directions — against a real `node:sqlite` schema rather than a mocked door, because
the invariant lives in a hand-written SQL `UPDATE ... WHERE` predicate a mock would accept
whether or not it was correct. This law is that check's own account, not a second one
written beside it.

**Law.** [R76](../RULES.md) (`protected-is-active`).

### B14: a toolbar button is always a filled circle; the CREATE button is mango; the gear and every other icon button are beige

> **SUPERSEDED ON COLOUR, 16 Sep 2026 evening — the CREATE button is black now, not
> mango.** The client's ruling, verbatim: *"Let's revisit the rule of only one mango
> button per screen. Only mango buttons on the title level. Title means the title
> component on top. Only those can be mango, the others black."* A toolbar is never
> the title component (see B17), so `AddButton` (`web/components/deep-link/
> screen-bits.tsx`) draws `variant="inverse"` now — the SAME beige-adjacent black
> the settings gear already used, not the mango this section's own next paragraph
> describes. The SHAPE below (filled circle, gear and every other icon button
> `secondary`) is unchanged; only the CREATE button's colour moved, from the
> library's bare `default` to `inverse`. Registered as R84.

**The rule, as it stood before 16 Sep 2026.** *"The settings gear should never be mango.
Make it with a beige background."*
— client, 15 Sep 2026, over a screenshot of Tasks' heading where the gear was drawn with the
default mango fill. The CREATE button ("`+`" `AddButton`, `web/components/deep-link/screen-bits.tsx`)
was the one mango control in a toolbar row (`buttonVariants({ size: "icon" })`, the library's
bare `default`). The settings gear and every other toolbar icon button draw `variant:
"secondary"` — the beige filled circle (`--btn-secondary-fill`), the same background the
member page's pencil edit button uses. Every gear mount (module headings, Team toolbar) draws
through this one function (`ModuleSettingsGear`,
`web/components/screens/module-settings-screen.tsx`), so fixing the one function fixes every
toolbar it appears on at once.

**Law.** R84 (`mango-in-title-only`), `web/test/mango-title-only.test.ts` — the CREATE
button's own colour is covered there now. The gear/beige shape one paragraph up is still not
a registry check of its own, for the same reason it never was (a census over every icon-only
`<Button>`/`buttonVariants` call, keyed to whether it sits inside a toolbar, would need to
derive a shape rather than a colour): written down so the next toolbar icon button is built
to this shape from the start.

### B15: on a member's head, Change role sits in the same three-dot menu as Remove

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"Move the change rule also to
the three buttons."* — read as "the three-dot menu," the same menu D6 already sends every
action to beyond a title's first two buttons. "Change role" joins Remove there, sharing
that action's own handler; the row's own dedicated button for changing role (D13's "one
pencil for change") stays where it is — this ruling is about the member's own detail head,
not the row.

**Law.** None registered.

**AMENDED, 16 Sep 2026, same day — the row's own "Change role" button was a second copy of
the same act.** The client's ruling, verbatim, over a screenshot of the row still carrying
its own "Change role" button NEXT TO the ⋯ menu that already held it a second way: *"why is
it then two times? Keep only the button on the three buttons, not behind the edit. It
should only be on the three buttons."* A prior session had added "Change role" to the
three-dot menu ALONGSIDE the row's own button rather than instead of it — read at the time
as "also," which is exactly the "two times" this rules out. `member-screen.tsx`'s
`buttonActions` now excludes BOTH `members.remove` and `members.changeRole` from the row;
neither ever renders as a row button again, and both live only in the ⋯ menu, sharing the
identical handlers the row buttons used to call. D13's own head **edit pencil** (the record's
generic edit affordance, unrelated to Change role) is untouched by this correction — "not
behind the edit" names what she does NOT want duplicated, not what should be removed.

### B16: Settings' top-level strip is Appearance · Members · Roles · Integrations · Modules · Automations · Choices

**The rule, as it stood before 16 Sep 2026, evening.** The client's ruling, verbatim: *"In
settings, split into tabs: members and roles. Roles deserve their own tab."* The first build
read this as a NESTED strip — a "Team" tab still on the outer row, with Members/Roles one
level down inside it.

**AMENDED, same evening — that reading was wrong.** Her correction, verbatim: *"You got this
wrong. I don't want two tabs under Team. Let's replace Team on the top level of tabs with
Members and Roles."* "Team" comes OFF the outer strip entirely, and Members and Roles take
its place, in that order — never a nested strip under either (`no-handrolled-toggles` stays
satisfied the same way: nothing replaces the strip that is gone, because Members and Roles
simply ARE two of the doors on `tabsConfig`). The outer row goes from five tabs to seven:
**Appearance · Members · Roles · Integrations · Modules · Automations · Choices**. Each
panel still owns its own reads, toolbar and dialogs; each of Members/Roles carries its own
R16 count directly on the outer strip. `?tab=team` is kept as an ALIAS, landing on Members —
a saved link or a stale remembered tab still opens the screen rather than rendering nothing.
This screen is still the only door to member management (change role, remove a member,
revoke a pending invite — R64, `sections-have-a-door`); "This team," the list that used to
link into the team area's own screens, is gone (2026-09-14), and those screens are reached
only from here now.

**Law.** None registered — a `TabsView` reshape, held to the library-tabs rule (R3) like any
other collection tab strip.

### B17: mango lives only in the title component; every other button is black

**The rule.** The client's ruling, 16 Sep 2026 evening, verbatim: *"Let's revisit the rule
of only one mango button per screen. Only mango buttons on the title level. Title means the
title component on top. Only those can be mango, the others black."* This retires B14's own
"the CREATE button is mango" (marked superseded above) and every other mango control this
app had scattered across a screen on the strength of the vendored kit's own "one mango per
view" (`shared/ui/docs/RULES.md` §2.5) — that rule capped the COUNT; this one restricts the
POSITION.

**The title component, named.** On a COLLECTION screen it is `CollectionHeading`
(`web/components/records/collection-heading.tsx` and `web-portal/components/
collection-heading.tsx` — same name, same shape on both front doors: the display-m heading
plus its own `action` prop, the screen's one door, deliberately not the toolbar's). On a
bespoke RECORD DETAIL it is `RecordScreen`'s own `actions` prop
(`web/components/records/record-chrome.tsx`, B1: "at most one primary and one secondary
button" share the title's own row). On the five recipe-driven details (`team.detail`,
`members.detail`, `invites.detail`, `brand.detail`, `purposes.detail`) it is the kit's own
`RecordDetail`/`RecordChrome` (`shared/web/screen-engine/screen-renderer.tsx`). Everywhere
else — a toolbar's own create button, a dialog's Save/Create, a sheet's footer, a card, an
empty state's "Add the first," a form — is `variant="inverse"`, the kit's own black
(charcoal fill, off-beige label), the same tone `recordNumber`'s "the black chip is always
the ID" already uses.

**What moved, in one sweep:** the three shared seams — `FormShell`'s `SubmitButton`, every
form on either front door; `screen-bits.tsx`'s `AddButton`, every toolbar create button
(B14, above); `collection-frame.tsx`'s `createActionButton`/`CollectionEmptyState`, every
collection's icon create button and its "Add the first" — and twenty-seven individual
dialogs, sheets, list rows, cards and forms across both front doors.

**Law.** R84 (`mango-in-title-only`), `web/test/mango-title-only.test.ts` — a static census
over every `<Button variant="default">` (stated or omitted, the kit's own mango default),
walked for an ancestor named `CollectionHeading`, `RecordScreen`, `RecordDetail` or
`RecordChrome` (through a JSX prop's own initializer too, so a Button handed to a title
component through `action={…}` still counts), or named in `MANGO_OUTSIDE_TITLE_OK` with the
real reason.

### B18: every Choices table carries a Details column between Name/Module and Status

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"regarding the fact that some
Choices components can have more properties, for example, meeting types have department, but
sprint types have duration. Why don't you add, everywhere where you have Choices on the
module and on the general, an in-between column with details or info or whatever, and
include this from each case."* Both the global Choices table (Settings › Choices) and a
module's own scoped Choices mounting (`settings-choices-panel.tsx`, one component, B11) gain
a **Details** column, sitting between Value/Module and Status — a decoration, never a fact
the table sorts or searches by, the same shape its neighbour `actions` column already takes.
`shapeChoicesTable` (`web/components/deep-link/shape.tsx`) decides what a row's own type
carries; the column only draws the cell already built:

- **Sprint type** — the type's own icon (`sprintTypeIcon`) plus its DURATION
  (`v.standardDays`, a real column the list door already reads) — the client's own example.
- **Story type** — an icon only (`storyTypeIconName`); no duration is ever seeded for a
  story type, so the column does not invent one.
- **App stage** — a dot TONE only (`appStageDotTone`), the same tone D17 tabulates, never a
  colour of its own.
- **Meeting type** — carries its department in its OWN table already (K30's own Department
  column), so it is out of this ruling's reach rather than a second, duplicate Details cell.
- Any Choices type this file has not yet met draws no Details cell — adding one for a type
  that does not exist yet would be dead code, not a decoration.

R82's own ceiling still holds: Value + Module + Details + Status + actions is five columns
on the global table, one under six, and Details is dropped along with Module wherever a
scoped mounting already narrows to one module (its own tab strip names it).

**Law.** [R82](../RULES.md) (`table-column-budget`) governs the column COUNT as it does any
table; the Details cell's own CONTENT is not separately censused — `shapeChoicesTable` is
the one seam, so a fifth Choices type reaching for its own ad hoc cell elsewhere would be
the shape to watch for.

---

### B19: the close button moves to the top, labeled and available when the latest reply is ours

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"Okay, but reduce to close and
make it only available, but still visible at all times, only when the latest answer is from
our side. Make it mango. And put a more appropriate icon for closing."* A **Close** button
sits in the title bar (`RecordChrome`'s own actions slot), labeled "Close", styled mango
(`variant="default"`) per [R84](#b17-mango-lives-only-in-the-title-component-every-other-button-is-black),
and drawn at every open status (new, triaged, scheduled, in progress, ready). It is enabled
ONLY when the newest reply's author is not the client — checked through `latestIsOurs`
(`help-detail.tsx`) — and renders a `CheckCircle` icon per [UI-CONVENTIONS](UI-CONVENTIONS.md).

**Where this reaches today.** `web/components/tickets/help-detail.tsx` reads the latest
reply's author and passes `latestIsOurs` to `RecordChrome`; the title actions mount the
Close button when the ticket is open, disabling it when a client reply is the most recent.
`web/test/ticket-close-moved-to-top.test.tsx` asserts the Close button appears in the title
band, stays visible at all times, and toggles enabled/disabled based on `latestIsOurs`.

**Law.** [R84](../RULES.md) (`mango-in-title-only`), as the title-action ceiling; the
action placement is a structural change to the detail screen layout.

**Cross-reference, 18 Sep 2026 ~06:40 (Round 17).** The ticket detail's own ⋯ menu — the
pattern this rule's own title bar shares its title component with — no longer carries "Files
and links" at all; [D20](#d20-a-tickets-own-detail-is-one-page-no-tabs-the-stage-ladder-above-a-two-column-body-conversation-two-thirds-stories-work-logs-stakeholders-stacked-beside-it)'s
own fourth amendment retires that entry outright, because every attachment now renders
inline in the conversation thread. Recorded there, not here, because it is a menu-contents
ruling and this rule is about the Close button's own placement and styling.

### B20: the edit pencil is never black, even when it is the only button

**The rule.** The client's ruling, 18 Sep 2026 ~06:00, verbatim: *"edit button is never
black (even when it's only one). f.e. in ticket detail the edit buton is black."*
[B17](#b17-mango-lives-only-in-the-title-component-every-other-button-is-black) sends every
button outside a screen's own title component to black `variant="inverse"` by default — the
icon-only edit pencil this book's [D20](#d20-a-tickets-own-detail-is-one-page-no-tabs-the-stage-ladder-above-a-two-column-body-conversation-two-thirds-stories-work-logs-stakeholders-stacked-beside-it)
amendment moved outside the ticket detail's own title is the named exception: an edit action
never renders in that black fill, whether or not another button sits beside it. Its own
icon-only treatment beyond "not black" is otherwise unspecified by this ruling and is a
build decision for whoever implements it.

**Status: ruled, in build, 18 Sep 2026.**

**Law.** [R84](../RULES.md) (`mango-in-title-only`) governs the general black-everywhere-
else case this rule carves an exception out of; the exception itself is not yet separately
registered.

### B21: raised by is a horizontal person card; who to keep in the loop is one horizontal row, the full roster

**The rule.** The client's ruling, 18 Sep 2026, verbatim: *"On ticket raised by, there should
be a dropdown, and who to keep in the loop should be horizonta[l]."* Two fields on the ticket
form, two separate changes. AMENDED 19 Sep 2026 ~10:55: the "dropdown" is now a horizontal person card with the avatar on the left and the contact's name (prefixed with the label "Raised by") stacked on the right, still opening the contacts picker on click.

**Raised by.** Supersedes her own 7 Sep 2026 ruling on the same field ("the raise by, no
dropdown but visible all chips") — said here rather than left to be discovered as a silent
contradiction. The data and the default are unchanged: the same contact options, the same
default (the picked contact, else the account's main one), the same door fence refusing any id
that is not a live contact of this client. The control is now a horizontal card: `<Avatar>`
on the left (the contact's photo or initials), and on the right the name stacked under the
label "Raised by", opening the same contact picker dialog on click. Team members are not
offered here — a colleague is a different table from a contact, and offering one would need
a real schema decision, not a control swap.

**On the loop.** Already a horizontal, wrapping row of pills (`StaffPillPicker`); what changes
is who it draws. Before, a person already on the loop was filtered OUT of the row while
somebody else was being added, so mid-add nobody could see who was already on it. Now the row
always shows the FULL roster, with everyone already on the loop drawn pressed and locked
rather than dropped from the row — the same "row of chips, current members shown, more
addable at the end" shape, and the already-add-only rule (nothing on a ticket is ever removed)
stays: a locked pill carries no "×". **On the loop: unchanged in 19 Sep 2026 amendment.**

**Status: ruled, in build, 18 Sep 2026.**

**Law.** None registered.

### B22: the Accounts door excludes individuals who are a company's own contact

**The rule.** Aurora's ruling, 19 Sep 2026, verbatim: *"why am i seeing ocntacts under
accounts? thats wrong>"* An individual linked to a company as that company's contact
(`account_links`) is not also a row on the Accounts door — that person belongs on Contacts,
and inside the company's own record, not as a peer account in its own right. The Accounts
count and its CSV export narrow the same way, so neither disagrees with what the screen shows.

**The residual.** A standalone individual — one carrying no `account_links` row to any company
— still appears in a `type: "individual"` read, because the link dialog (picking who to attach
to a company) needs the full individual roster to choose from; this is the one place the
exclusion does not apply, named rather than silently inconsistent.

**Status: ruled, in build, 19 Sep 2026.**

**Amendment, 20 Sep 2026 (Round 28): the residual above is gone too. Accounts lists
companies only, no exception.** Aurora's review of the fix above, verbatim: *"no, i still see
contacts udner accounts! f.e. Jonathan Sargent Alexander Kaulich"* A standalone individual
(no `account_links` row to any company) was still reaching the Accounts door through the
`type: "individual"` read the link dialog's own roster needed. That narrowing moves off the
screen and into the door itself: `accountsWhere` (`workers/tenancy/src/lib/accounts.ts`) now
resolves an untyped read to `account_type = 'entity'`, so every one of the Accounts screen's
three tabs (Active, Inactive, All) shows companies only, linked or standalone. Every person,
Jonathan Sargent Alexander Kaulich included, lives on Contacts and nowhere else. The link
dialog keeps its own separate, explicitly-typed read of individuals, unaffected.

**Status: amended, in build, 20 Sep 2026.**

**VALIDATED 20 Sep 2026 (Round 30).** Aurora reviewed staging this round and confirmed live:
Accounts lists companies only, and every person lives on Contacts.

**Status: validated, 20 Sep 2026 (Round 30).**

**Law.** None registered.

### B23: Contacts gets a Gallery/List toggle and its own add door

**The rule.** Aurora's ruling, 19 Sep 2026, verbatim: *"on contacts, add the view gallery and
the button to add."* The Contacts screen gains a Gallery/List view switch, List resting by
default, and a real add door.

**The shape.** Gallery tiles draw as `PersonCard`, each carrying the contact's own account chip
and status dot — the same face-and-status discipline the rest of the app already carries.
"New contact" opens through the existing contact create dialog, its Account picker showing
faces, A→Z ([R75](../RULES.md)). The header's own add button draws only when the collection is
not empty — [R88](#d22-an-empty-section-draws-exactly-one-door-in-no-header-no-second-)'s
empty-state single door standing otherwise: the empty state's own "Add the first" is the only
door when there is nothing yet.

**Status: ruled, in build, 19 Sep 2026.**

**VALIDATED 20 Sep 2026 (Round 30).** Aurora reviewed staging this round and confirmed live:
Contacts carries its Gallery/List toggle and its own add door.

**Status: validated, 20 Sep 2026 (Round 30).**

**Law.** None registered.

### B24: avatars are always a round image, and "Raised by" is a smaller tile

**The rule.** Aurora's ruling, 20 Sep 2026, verbatim: *"Avatars are always a round image
('Raised by' must be a round image too)."* and *"Make 'Raised by' smaller — less height."*

**The shape.** `RecordMark`'s own `shape="round"` is now the one shape every avatar in this
app draws, the Raised-by tile included — the tile's own comment names the specific reason it
needed saying: an earlier squared-corner carve-out on that one tile is gone with it. Height:
the Stakeholders panel's Raised-by tile drops from `PersonCard`'s "band" default
(`size="band"`, 56/72px face, `p-4` padding ≈ 104px total) to `size="row"` (36px face) inside
a tighter `py-3` inset (≈ 60px total) — both kit spacing steps, not hand-picked pixels.

**Status: ruled, in build, 20 Sep 2026.**

**VALIDATED 20 Sep 2026 (Round 30).** Aurora reviewed staging this round and confirmed live:
the Raised-by card is shorter.

**Status: validated, 20 Sep 2026 (Round 30).**

**Law.** None registered.

### B25: the Stakeholders pencil moves to the edit screen only, related stories carry a two-colour progress bar, and a ticket's first message is never an edit field

**The rule.** Three of Aurora's rulings, 20 Sep 2026, verbatim: *"On ticket detail, remove
the pencil from the Stakeholders section (should be only on the edit screen)."*; *"On ticket
detail, on the related-stories card, after all stories show a progress bar with completed
(I'm even thinking: show in progress and completed in the bar — completed as green, the
first part, then the ones in progress in the in-progress color)."*; and *"On add/edit
tickets, we can't edit the first message — it's not a description (that was the old model),
so rather multiple messages under the same ticket."*

**The shape.** The Stakeholders panel (`help-stakeholders.tsx`) draws the Raised-by tile and
the On-the-loop row as plain fact, no `onClick`/`cursor-pointer`, no pencil — editing
`raised_by_contact_id` is reached only from the ticket's own edit screen
(`help-form-dialog.tsx`'s Raised-by field). The related-stories card (`help-detail.tsx`)
draws its progress bar as two layers over the kit's single-fill `<Progress>` primitive
(whose own header forbids a second colour on it): the real bar sized to done + in-progress of
the total, and a `bg-success` `aria-hidden` div absolutely positioned over the DONE fraction
only, reading green, then charcoal, then empty track — hidden entirely at zero related
stories ([R88](#d22-an-empty-section-draws-exactly-one-door-in-no-header-no-second-)). And
the ticket's opening text renders as its own editor only on a raise (`!isEdit`); on an edit,
message one is `TicketThread`'s own first "theirs" bubble, never a field an edit dialog
rewrites in place — the write door still accepts `description` on an edit unchanged, only
this form's own field is retired.

**Status: ruled, in build, 20 Sep 2026.**

**Law.** None registered.

### B26: the triage queue's Raised-by cell carries the raised-on date, and the Closed tab folds Closed-by into the Closed-on cell

**The rule.** Aurora's ruling, 20 Sep 2026, verbatim: *"On tickets triage queue, under
'Raised by' add the raised-on date."* and *"On tickets tab 'Closed,' before 'Closed on' add
'Closed by.'"*

**The shape.** `TriageQueue`'s own `TicketRowsTable` call site takes a new
`raisedByShowsDate` prop, scoped to Triage alone — Open, Closed and All keep the 18 Sep
separation of the date into its own column. **Decided (R82):** the Closed tab is already at
the six-column ceiling (id, title, type, raisedBy, created, closed), so "Closed by" is not
given a seventh column — it follows R82's own prescription for a fact arriving once a table
is at the ceiling, "fold the extra fact onto an existing column's own second line", the
identical technique the raiser cell already uses for its own date. The resolver's face + name
(R35/R54, via `memberFace`) sits above the closed date in the same cell, "Closed by" reading
literally before "Closed on".

**Status: ruled, in build, 20 Sep 2026.**

**Amendment, 20 Sep 2026 afternoon (Round 29): the Triage date under Raised by is gone
again.** Aurora's ruling, verbatim: *"on tickets triage list view remove the dabe from under
the raised by person (we have an own coumn for that!)"* The `raisedByShowsDate` line this rule
added that same morning lasted a matter of hours: the `created` column beside `raisedBy`
already carries the identical date, so the second line
was the exact duplicate she is naming. `TicketRowsTable` no longer carries the prop at all,
never a caller passed `false`, the shape does not exist to turn off. Proved by
`web/test/ticket-raised-by-avatar-and-app-link.test.tsx`'s own "the triage list view never
repeats the raised date under Raised by" block: exactly one date on a row carrying both
`raisedBy` and `created`.

**Status: amended, in build, 20 Sep 2026.**

**VALIDATED 20 Sep 2026 (Round 30).** Aurora reviewed staging this round and confirmed live:
the triage list view carries no date under Raised by.

**Status: validated, 20 Sep 2026 (Round 30).**

**Law.** None registered.

### B27: the stories model round — statuses, tabs, kanban, new fields and icons (12 rulings, one round)

**The rule.** Aurora's 20 Sep 2026 batch, restructuring the Stories model in one pass.
Verbatim, item by item:

1. *"Let's rename the story statuses: Scheduled becomes 'To Do (Selected for Sprint),'
   Completed becomes 'Done,' Open becomes 'Backlog' (the story exists but isn't scheduled
   yet)."* **Her words "Scheduled"/"Completed" had no referent** — the codebase's own status
   keys were never `scheduled`/`completed`, only `open`/`in_progress`/`in_review`/`done`
   (`shared/types.ts`'s `StoryStatus`) — so the rename landed on the keys that actually
   exist: `open` → "Backlog" (`STORY_STATUS_LABEL`, `work-panels.tsx`), `done` unchanged as
   "Done".
2. *"Rename the 'Stories' tab to 'Backlog.'"* — done (`web/lib/pages.ts`'s `stories` nav
   entry now titles "Backlog").
3. *"In stories kanban, the columns are: In Progress, To Do, In Review."* —
   `KANBAN_STATUSES`/`KANBAN_STATUS_LABEL` (`stories-screen.tsx`) now hold exactly these
   three, a deliberately separate word set from `STORY_STATUS_LABEL` (the board answers
   "which column", the ordinary label answers "what kind of thing").
4. *"On stories/new, remove the 'done' column and expand the other three to full width —
   only 3 instead of 4."* — the same `KANBAN_STATUSES` narrowing; Done is off the board.
5. *"On stories 'Planned,' add id as the first column. Same on the 'Backlog' tab."* — done,
   the standalone id column both tabs now share.
6. *"On stories main, add a tab for reviews, views Queue and List. Columns: id, name, type,
   app, who did it, date marked as done. For Queue, same chips as the story detail page
   except sprint … title, description, completed by, completed on."* — done, the Reviews
   tab with its Queue/List views (`stories-screen.tsx`).
7. *"Add an 'acceptance criteria' field to stories (same design as 'Detail')."* — done,
   `story-form-dialog.tsx`/`story-detail.tsx`, team migration 0106.
8. *"Rename story origin 'Internal' to 'Enabler.'"* and *"When a story's origin is Enabler,
   must select a related ticket!"* — done, `story-form-dialog.tsx`'s category field plus its
   required-ticket validation.
9. *"Add a MoSCoW priority field to every story … Render the priority as a colored tag on
   each story card and let users filter and sort the backlog by it."* — done: `MoscowChip`
   (R86 exemption, `COLOURED_CHIP_OK`), filterable and sortable (`stories-screen.tsx`).
10. *"Add 'Spike' to the story Type options"*, *"Rename the 'Tech' story type to 'Chore.'"*
    and *"For Bug, use the bug-beetle icon."* — done, `shared/story-types.ts`'s six-icon map
    (team migration 0106 widens the protected set to six).
11. *"On story detail, the chips in order: id, status, type, app (underlined), sprint (id,
    underlined) … for other things too."* — this is R94/L37 above, already its own row and
    not duplicated here.
12. *"Inside stories and tickets, let's rename 'effort' to 'time log.'"* — **NOT FOUND in
    the tree.** No "Time log"/"Effort" label change turned up in `stories-screen.tsx`,
    `work-panels.tsx` or the ticket detail files this pass searched; still open.
    **AMENDED 20 Sep 2026, same day.** Nothing in the app was ever labelled "Effort": the
    thing she means is the section that lists the hours logged against a record, which the
    app calls Work log(s). The reading: inside a STORY or a TICKET, "Work log" becomes
    "Time log" and "Work logs" becomes "Time logs", the tab label (`story-detail.tsx`), the
    panel title (`help-detail.tsx`), and the matching test assertions
    (`ticket-detail-no-tabs.test.tsx`). The rail entry "Hours" (the whole team's logs screen,
    R85) is a different ruling and stays "Hours", untouched. Task and meeting detail keep
    "Work logs" too; only these two records' own screens said "Effort" to her. Door names,
    the data model and the glossary term ("Work log", `shared/glossary.ts`) are unchanged,
    only the words a person reads on these two screens changed.
    **AMENDED 21 Sep 2026.** Aurora, reviewing the hours section inside a ticket and a story
    that now read "Time logs," verbatim: *"no, we said we call taht effort niside ticket or
    story, no?"* Reverts the 20 Sep amendment above: inside a ticket and inside a story the
    section is called "Effort" again, not "Time logs": the tab label (`story-detail.tsx`),
    the panel title (`help-detail.tsx`), and the matching test assertions
    (`ticket-detail-no-tabs.test.tsx`). The rail entry "Hours" and the task and meeting
    detail tabs are unaffected, unchanged, still "Work logs"/"Hours".

**Status: ruled, mostly in build, 20 Sep 2026. Item 12 (effort to time log) landed same day,
reverted to "Effort" 21 Sep 2026.**

**VALIDATED 20 Sep 2026 (Round 30).** Aurora reviewed staging this round and confirmed live:
the Stories nav entry reads Backlog.

**Status: validated, 20 Sep 2026 (Round 30).**

**Law.** None new beyond R86/R94, both already registered.

### B28: the Phase rename round, the P0000 id, a Sprint Goal field, and the wave lifecycle order (four rulings, one round)

**The rule.** Aurora's 20 Sep 2026 batch, four rulings read together as one vocabulary move
(`shared/sprint-types.ts`'s own header keeps the identical reading). Verbatim, item by item:

1. *"Rename 'sprint' to 'phase.' Also change the id to P0000."* Every user-facing word moves:
   the nav section, the record's own name, every screen that said "Sprint"/"Sprints" now says
   "Phase"/"Phases" (`shared/i18n-strings.json`, `shared/i18n-seed.ts`), and the record's
   reference prefix moves from S0000 to P0000 (team migration 0107, `shared/workers/refs.ts`).
   The glossary's `sprint` key stays, nothing reads the object key as a word, only its `term`
   changes, to "Phase" (`shared/glossary.ts`). Routes, the permission module and the underlying
   `sprints` table are untouched: none of them is a word a person reads.
2. *"Add a 'Sprint Goal' field to each sprint/cycle, a single sentence describing the main
   outcome the cycle is organized around. A Sprint Goal is the 'why' behind a cycle; every
   story in that cycle should support it, and anything that doesn't probably shouldn't be
   included. Display the goal at the top of the sprint board and let users flag which stories
   contribute to it."* (rendered here without the em dash her own message carried, since every
   new row this book adds carries none, R95.) A Phase Goal field, one sentence, shown at the top
   of the phase's board, and a per-story flag for whether it contributes to that goal
   ("Contributes to the phase's goal").
3. *"Rename the sprint type 'Refinement' to 'Revision.'"* and *"Rename the phase 'Validation'
   to 'Pilot.'"* Two of the seven Phase type words move (`shared/sprint-types.ts`'s
   `PHASE_TYPES`).
4. *"Update the Wave lifecycle stages and set the full order as: Audit → Plan → Build → Pilot →
   Revision → Deploy → Hypercare. Audit: assess the current state and gather requirements
   before work is scoped. Plan: scope, prioritize, and schedule the stories for the wave.
   Build: implement the stories. Pilot: the period where the customer uses the app and
   confirms it meets their needs and signs off, before full release. Revision: implement
   changes and adjustments requested by the customer after they have used the release. Deploy:
   release the accepted work to production — includes the release checklist, smoke tests,
   rollout (phased/canary if needed), release notes, and a rollback plan. Hypercare: a short,
   intensive support window immediately after deploy where the team closely monitors the
   release, fixes urgent issues fast, and supports users during adoption."* Her word "customer"
   and "users" are rendered "account"/"the account" wherever they name the party the work is
   for or the people using the release, R34's own glossary-in-copy law reading this help text
   same as any other user-facing sentence. This reorders and narrows the same Phase type
   vocabulary, read from the wave's own side: "Not started" and "Enhancement" drop out of the
   ordered lifecycle (a phase that has not begun yet is simply absent from a wave's board),
   "Deploy" and "Hypercare" are new. The seven definitions are stored as this vocabulary's own
   help text (`shared/sprint-types.ts`'s `PHASE_TYPES[].description`), shown wherever a phase
   type pill's tooltip draws.

**DECIDE, the wave's own stages ARE the Phase type vocabulary; there is no separate "wave
stage" column.** A wave's screen shows each phase inside it through this exact seven (now
narrowed to five ordered plus two retired) words, `shared/waves.ts`'s `WaveSprint.sprintType`:
reading the ruling's item 4 as the SAME vocabulary from the wave's own side rather than as a
second, independent schema column nothing anywhere else defines.

**DECIDE, proposed colours, not yet a ruling: Deploy black, Hypercare grey.** The vocabulary
stays icon-only at every existing pill (`shared/sprint-types.ts`'s own original 16 Sep 2026
header: "they will not have colors, but icons," the client's own words) until Aurora rules on
colour for it directly. Read strictly against her separate 20 Sep 2026 colour statement over
the OLD five words ("audit orange, plan+build black, validation purple, refinements blue"),
this file's own header proposes the two new words she had not yet seen: Deploy takes the same
black (`building`) tone Plan and Build already share, an active, in-progress release rather
than the green "shipped/done" tone that would misread it as finished; Hypercare takes a
deliberately neutral, winding-down grey (`archived`). NOT WIRED IN: R86 and this vocabulary's
own two live call sites (`sprints-screen.tsx`'s status-only chip, `sprint-detail.tsx`'s
uncoloured type pill) both stand on the icons-never-colour ruling today, so the proposed
mapping was never turned into a `PHASE_TYPE_DOT_TONE` export with no reader — a dead export is
worse than no table, and re-deciding the mapping later costs nothing this draft wouldn't also
cost now.

**DECIDED 20 Sep 2026 (Round 30): icons, no colours.** Aurora's ruling, verbatim: *"i am
thinking well do icons instead of colors. colors bekongin status & stages."* The Deploy-black,
Hypercare-grey proposal above is declined: the Phase type vocabulary stays icon-only, as it
already stood; colour belongs to status and to stage alone (R86). `PHASE_TYPE_DOT_TONE` is not
built.

**VALIDATED 20 Sep 2026 (Round 30).** Aurora reviewed staging this round and confirmed live:
the Sprint-to-Phase rename with the P0000 reference id (ruling 1), the seven Phase types
shown with her own definitions wherever the type is picked (ruling 4), and the Phase Goal
field with the story's "contributes to the goal" flag (ruling 2).

**Status: ruled, in build, 20 Sep 2026. The colour DECIDE above is decided, 20 Sep 2026
(Round 30): icons, no colours. Renamed round, Phase types and the Phase Goal field
validated, 20 Sep 2026 (Round 30).**

**Law.** None registered.

### B29: the Store button is gone, the triage-stage head offers the queue's own decision, and the Triaged rung shows a plain date when no span was recorded

**The rule.** Three of Aurora's rulings, 20 Sep 2026, verbatim: *"on tickets triage list view
rmeove the store button"*; *"when ticket is in status triage, also in main screen the visible
buttons shoudl change: same as in queue"*; and *"pls the vokumne at triage makes me crazy. if
a ticket is closed already (al except 15) of course it went through triage (back in the day,
we dont have the date)."*

**The shape.** The Store button an Extra used to wear filed the ticket and did nothing else,
which "Accept" already says honestly, so it is deleted rather than kept as a second word for
the identical action; an Extra now takes the same Accept path every other triage decision
takes (`triageAct`, `web/components/tickets/tickets-collection.tsx`). A ticket's own detail
head, while its status is `new` (the pre-triage state the Triage queue itself holds), now
offers the identical decision a row in that queue offers for its type, Accept/Assign/Plan,
built off the same `triageAct` function and the same `staffedOn` narrowing the queue's own
`peopleFor` applies, so the two surfaces cannot say different things about one ticket
(`inTriageStage`, `web/components/tickets/help-detail.tsx`). And the Triaged rung on a ticket's
own stage rail, when its CURRENT status is `resolved` and no `triaged` span was ever recorded
(stage recording began with team migration 0066, so an older or single-step ticket has none),
now reads the ticket's plain creation date instead of a blank second line that read as "never
triaged" on a ticket that plainly was, since nothing reaches `resolved` without passing
through it (`triagedRungMoment`, `web/components/tickets/ticket-stages.tsx`). Scoped to exactly
the one rung and the one status she named: an open ticket missing an earlier span is a
different, unasked question, and a reopened ticket is too.

**Amended by B31, 20 Sep 2026.** The third quote above ("if a ticket is closed already ... of
course it went through triage") named the same volume complaint Aurora returned to, sharper,
the same day: *"canot be, i still have 428 to trigae but only 15 open?"* Nothing in this row's
own shape actually changed what the Triage tab's badge or the queue's own total COUNTED: only
the Store button, the stage head and the Triaged rung moved. The undercount's real source is
fixed under B31, not here.

**Status: ruled, in build, 20 Sep 2026. The triage-volume complaint quoted above is amended by
B31 the same day.**

**VALIDATED 20 Sep 2026 (Round 30).** Aurora reviewed staging this round and confirmed live:
the Store button is gone, and a ticket's own head, at the triage stage, offers the same
decision the queue offers.

**Status: validated, 20 Sep 2026 (Round 30).**

**Law.** None registered.

### B30: two kit fixes read together, the assistant strip and the chat message menu (v1.2.138/v1.2.139)

**The rule.** Three of Aurora's rulings, 20 Sep 2026, verbatim: *"loos at screenshot. i see the
bottom of th eincactive tabs for the assistant but they shoudl be behind the shape!"*; *"make
the open assistant mango button same size as the one on the sidebar to compress/oen the
sidebar"*; and, on a separate chat-edit-pencil page, *"for chat edit pencil: i like from p1
that its besides and appears when hover, but make it like p4 wth the 3 options menu (edit,
copy/delete)."* All three ship in `shared/ui/`, the kit's own CHANGELOG carries the full
account (`shared/ui/CHANGELOG.md`, v1.2.138/v1.2.139); this row is the pointer, not a second
copy of it.

**v1.2.138, two rulings.** The assistant strip's inactive/"+"/History tabs were painting their
lower ~17px, the folder-tab overlap band, ON TOP of the panel card instead of behind it: an
`isolation: isolate` stacking context on the strip (v1.2.126, still load-bearing for a rest
tab's own click target) always outranked a plain, unpositioned panel, regardless of DOM order.
Fixed by giving the panel the same `relative z-[2]` its main-content counterpart already reads,
nothing in the strip itself touched. Separately, the shut assistant opener (30.47×30.47px, two
18 Sep rulings had fit it to its own band) is unified on the rail's own handle size,
`--control-height-button`, 40×40px, one constant for both controls, knowingly reopening the
band overlap the 18 Sep fit had closed, because a later, more specific ruling on the same
control supersedes the earlier one.

**v1.2.139, the message menu.** `TicketThread` gains a per-message actions menu, drawn only
when a caller passes `actions`: a small round secondary icon button at the bubble's own outer
corner (P1's placement, hidden until hover or focus, always visible on a coarse pointer), whose
trigger opens Edit/Copy/Delete in that order (P4's contents). Edit swaps the bubble for an
inline field seeded from its own text, Copy always fires (a told-you, not a gated action),
Delete is gated and gets no confirmation of its own, that is the caller's job.

**v1.2.143, the face size.** Aurora, on the same message-actions menu: "make the avatar as big
as this button" (the trigger, `size="icon"`, `--control-height-button`, 40px). `TicketThread`
gained `faceSize?: "sm" | "md"`, defaulting to `"sm"` (`Avatar`'s own 24px, `--avatar-sm`), with
`"md"` reading `Avatar size="control"` (40px, `--avatar-control`) instead; `help-detail.tsx`
wired `faceSize="md"` for the chat thread.

**AMENDED 21 Sep 2026, the face size, again.** Aurora, verbatim, on the same 40px chat face:
"idk, still not happy about the size. make them the same size as 'on the loop'." "On the loop"
is `help-stakeholders.tsx`'s own read-only row of stakeholder chips, whose face
(`PersonCard size="choice"` → `RecordMark size="choice"`) draws at 24px, `--avatar-sm`. The kit
already had a `faceSize` value that reads exactly that box, `TicketThread`'s own default
`"sm"`, so no kit change was needed: `help-detail.tsx`'s call moved from `faceSize="md"` (40px)
to `faceSize="sm"` (24px), the same `--avatar-sm` box the "On the loop" chip's own mark draws.

**Status: ruled, in build, 20 Sep 2026.**

**VALIDATED 20 Sep 2026 (Round 30).** Aurora reviewed staging this round and confirmed live:
the assistant strip's inactive tabs sit behind the panel, and the shut opener is 40×40px,
the same size as the rail handle.

**Status: validated, 20 Sep 2026 (Round 30); the chat face size amended 21 Sep 2026 (40px to
24px, matching "On the loop"), via `help-detail.tsx`'s `faceSize` prop only, no kit change.**

**Law.** None registered.

### B31: the triage volume figure excludes resolved and closed tickets everywhere it is counted, and the triage list view draws no per-row buttons

**The rule.** Two of Aurora's rulings, 20 Sep 2026, verbatim. Reviewing staging: *"canot be, i
still have 428 to trigae but only 15 open?"* The number of tickets waiting for triage cannot
exceed the number of open tickets. A resolved or closed ticket never needs triage, whatever its
triage fields say. And, on the same screen's other surface: *"on tickets triage list view have
no buttons at all (rmeov ethe accept/store/all)"* The triage LIST view (the table, not the queue
card view) shows no action buttons per row at all.

**The volume figure.** `needsTriage` (`workers/content/src/lib/triage.ts`) and the door it backs
(`GET /api/content/triage`, `workers/content/src/routes/triage.ts`) already select
`status = 'new' AND archived_at IS NULL` and nothing else: a resolved or archived ticket was
never in the set this door counts, whatever its four readiness fields (type, client, app,
raised-by) say. `workers/content/test/triage.test.ts` now pins exactly that: a ticket aged well
past the three-working-day line, resolved, with every readiness field cleared, leaves both the
list and the total. The 428-vs-15 gap was never in what the door counted; it was in how long a
STALE answer could keep being shown. `TEAM_RESOURCES.help` (`web/lib/live-resources.ts`) dropped
the cached `triage:<team>` answer on a `triage_duty` ping (naming somebody's week) but never on a
`help` ping, so a ticket resolved, closed or put away anywhere other than this exact screen's
own Accept/Assign/Plan left the Triage tab's badge and this queue's own total unmoved until the
ten-minute `MAX_CACHE_AGE_MS` ceiling (`shared/web/store.ts`) caught up on its own. `triageKey(t)`
now rides `help`'s own `deps`, so any ticket write drops the cached triage answer immediately,
the same live-sync guarantee (R15) every other derived count on this screen already carries.

**The list view.** `TriageQueue`'s `triageView === "list"` branch
(`web/components/tickets/triage-queue.tsx`) drew a fifth `decide` column on `TicketRowsTable`
with the row's own Accept/Assign/Plan button (`triageAct`) and a people-row strip beneath it,
opened by the button when the verb needed a person. Both are gone, along with the one piece of
state (`rowPicker`) that only existed to track which row's strip was open. `TicketRowsTable`
draws its `decide` column only when a caller passes one: the table is called with nothing in
that slot now, exactly as it already was on every other tab (Open, Closed, All). The queue's own
one-ticket-at-a-time card view is untouched and keeps its Accept/Assign/Plan decision, its Skip
and its Undo: her ruling names the LIST, not the card.
`web/test/triage-list-view-no-buttons.test.tsx` is new and drives both bodies: the list view's
table carries no button beyond the row's own ordinary title link (identical on every tab), and
the card view still draws its decision and Skip.

**Status: ruled, in build, 20 Sep 2026.**

**FACT, the 428.** Aurora's item 9 above, verbatim, *"canot be, i still have 428 to trigae but
only 15 open?"*, is answered here as fact, not yet as a rule. On the Kwapso team, 428 tickets
sit in status `new`: 320 came in through the Glide import, 103 were raised by Alaap, and 335
are of type Extra, most of them from May to August 2026. A decision is open on what to do with
them; nothing here decides it.

**Law.** None registered.

### B33: a story's own decision surface already asks for no assignee, there was no queue behaviour to replicate

**The rule.** Aurora, verbatim, 20 Sep 2026: *"on sotries, when acce`ting i have to assigna a
perosn right? rpelicate the quee behaviour for all buttons in the detail screen. maybe i am
worng here."*

**The finding.** She is right to have asked and the answer is: no, not on stories. There is no
"Accept" word or concept anywhere in the stories module, and neither of a story's two moves,
"Ready for review" (open/in_progress to in_review) and "Done" (in_review to done), both on the
story detail head, `web/components/work/story-detail.tsx`, ever reads or writes an
`assigneeId`. The door behind both, `setStoryStatus`
(`workers/content/src/lib/stories.ts`), refuses a `done` move to anybody but the app's own team
lead and refuses it while a checklist step is unfinished; it does not ask who the story belongs
to, and a story has never required an assignee at creation either (`story-form-dialog.tsx`'s
own `assigneeField` is `required: false`). The Stories "Reviews" tab's own "Queue" sub-view
(`ReviewsQueue`, `web/components/work/stories-screen.tsx`) is a same-named but unrelated
thing: a read-only list of stories already at `done`, one card each, whose only behaviour is
opening the story's detail screen. It carries no Accept/Assign button of its own, on the card
or in the Reviews List's table columns, so there was no queue decision to replicate onto the
detail head. The board's own drag-to-status write (`moveStatus`, same file) calls the identical
door with the identical two arguments, no assignee, so all three surfaces already agree.
**The behaviour she was recalling is real, just on a different screen.** Tickets' own Triage
Queue opens a people row before accepting an Issue ("Assign") or a Request ("Plan"), and that
queue behaviour was unified onto the ticket detail head the same day, on her own ruling quoted
in `web/components/tickets/tickets-collection.tsx` (see B29 above). That file belongs to a
different lane and is untouched here.

**The shape.** No door or component changed. Inventing an assignee requirement the doors do
not enforce would have been the bug this row exists to avoid. `web/test/story-accept-asks-no-assignee.test.tsx`
is new and drives the story detail head's two buttons end to end, proving neither call carries
an assignee and the "Done" move matches the board's own door call exactly.

**Status: answered, no build change, 20 Sep 2026.**

**Law.** None registered.

### B32: waves get a Settings panel, days per phase type

**The rule.** Aurora, verbatim, 20 Sep 2026: *"on waves i am missing the settings (we'l adjust
the duration of pahses in days)."*

**The shape.** A wave's own Settings panel (`web/components/work/wave-phase-days-panel.tsx`,
drawn on `wave-detail.tsx`'s Overview tab, alongside its other panels) gives whoever holds the
wave update right seven rows, one per `PHASE_TYPES` name (`shared/sprint-types.ts`, the
Wave-lifecycle order: Audit, Plan, Build, Pilot, Revision, Deploy, Hypercare), each with that
type's own icon and a number-of-days field, Save and Cancel underneath. Read only for a caller
without the right.

The days are the wave's own. Team migration 0109 adds `wave_phase_days`
(`workers/tenancy/src/team-schema/migrations.ts`): wave_id, phase_type, days, the creator and
editor audit pair, one row per (wave, phase type) that has actually been set, never seven rows
seeded the moment a wave is sold. A wave with no rows of its own reads placeholder defaults
instead (Audit 5, Plan 5, Build 20, Pilot 10, Revision 10, Deploy 3, Hypercare 10 days), hers to
adjust, said so in the migration's own comment. `POST /api/tenancy/waves/phase-days`
(`workers/tenancy/src/routes/waves.ts`) gates on the same `work:update` right `update_wave`'s
own door takes, validates each row (a phase type this team's own vocabulary carries, a whole
number of days from 1 to 365) and writes an activity row, "Phase days changed," on the wave.
The MCP surface carries the identical capability, `update_wave_phase_days`
(`shared/workers/tool-catalog.ts`, `documents/MCP.md` §3).

**Status: ruled, in build, 20 Sep 2026.**

**Law.** None registered.

---

### B34: a Glossary tab under Knowledge, the app's own words and their definitions

**The rule.** Aurora, verbatim, 20 Sep 2026: *"Add a tab to Knowledge with a glossary, and
craft me an artifact identifying which words we use and their definitions. Choose which
words you think worthy of being there, for example story, wave, acceptance criteria,
ticket, etc. We'll iterate on definitions, but I want to identify the words already; this
will let our users search there, but should be part of the knowledge base and feed the
assistant."*

**The shape.** A Glossary tab sits beside the Knowledge screen's own kind-tab strip (K2),
always drawn, never derived from a count the way the other tabs are, because it has to be
reachable at a zero count to seed itself. Its 54 starting words (`shared/glossary-seed.ts`)
become team-wide `knowledge_sources` rows of a new kind, `glossary`
(`createGlossaryEntry`/`seedGlossaryEntries`, `workers/content/src/lib/knowledge.ts`),
an ordinary knowledge source, listed alphabetically (`KNOWLEDGE_SORTS.title`), searchable
through the same door every other source is, and read by the assistant the same way, one
passage among the rest `ask_knowledge` already returns. Seeded once per team, idempotently,
the first time a person with the knowledge create right opens the tab
(`POST /api/content/knowledge/glossary/seed`); a word is added by hand from the same tab
(`POST /api/content/knowledge/glossary`, and its own MCP tool, `add_glossary_word`,
`shared/workers/tool-catalog.ts`, `documents/MCP.md` §3), corrected and taken away through
the knowledge base's own existing doors, gated by the same `knowledge:create` /
`:update` / `:delete` rights every other source already carries.

**AMENDED 21 Sep 2026 - a preview in the overview, and the off button disabled.** Aurora,
verbatim, reading the tab back: *"good. include a preview of the description in the
overview. disable the off button (only edit)."* Two changes to the row itself
(`web/components/knowledge/glossary-list.tsx`), the tab's own wiring and doors unchanged.
First, each row now draws a one-line, plain-text preview of its own definition under the
word, the first line or the first ~140 characters, whichever comes first, through the
same `richTextPlain` seam every other list/card preview in the app already reads a body
through (`shared/web/rich-text.ts`), never silently clipped (R87's own rule for a title,
read here for a body): an ellipsis marks every cut that left something out. Second, the
row's own "Take this word away" (deactivate) control no longer draws, for anyone, right or
no right: only "Correct this word" (edit) does. The door stays: `content.setKnowledgeActive`
and the confirm flow are unchanged in the file, the same door the record screen's own "Stop
using this" button still calls, gated behind one switch, `GLOSSARY_DEACTIVATE_ENABLED`,
currently off.

**AMENDED AGAIN 21 Sep 2026 - the same card as "All," not a bespoke list.** Aurora, on the
tab's own rows, verbatim: *"But why did you invent this new design? Why don't you use the
kind of square card, same as in all?"* The dl/dt/dd row this section describes above is
gone: the Glossary tab now maps its words through `KnowledgeSourceCard`, the exact component
and `<CardGrid fluid minItemWidth={KNOWLEDGE_CARD_MIN}>` wall the Knowledge screen's "All" tab
already draws (`web/components/knowledge/knowledge-screen.tsx`), never a second card shape for
one kind of source. The word is the card's own title; the definition preview from the
amendment above is its one body line, through a new `preview` prop on `KnowledgeSourceCard`
(`web/components/knowledge/knowledge-source-card.tsx`) that takes the "Last edited" meta
line's slot when a caller hands one over, unset everywhere else. The card offers the exact
actions "All" offers: none drawn on the cell itself, the whole card is the one press target,
which is "edit stays, no deactivate" read structurally rather than restated: pressing a word's
card opens the same correction dialog its row's pencil used to
(`?panel=edit&module=knowledge-glossary`), and no deactivate control exists on this card, or
ever did, so the ruling two paragraphs above holds without anything here re-asking the
question. Search and load-more are unchanged, the tab's own `<PagedFind>`/`<LoadMore>`. The
preview computation itself (`definitionPreview`, formerly private to the row) is the one thing
that survives from `glossary-list.tsx`, now exported for the card call site to read.

**Status: ruled, in build, 21 Sep 2026.**

**Law.** None registered.

---

### B35: a burndown chart per phase, and cycle time read off the same status history

**The rule.** Aurora, verbatim, 20 Sep 2026: *"Add a burndown chart to each sprint/cycle.
A burndown chart plots work remaining (story points or story count) on the Y-axis against
the days of the cycle on the X-axis, with a straight "ideal" line from the starting total
down to zero so the team can see whether they're ahead or behind. Build a visual artifact
that renders this per sprint and updates the remaining-work line each day as stories move
to Completed."*

Asked how cycle time (how long a story sits in each status) should be captured, she ruled:
*"capture this automatically via timestamps on those status changes."* Asked whether any
status history exists for stories today, she corrected herself in the same breath:
*"No status history exists for stories today: actually, it kind of does. In the old
system, we were only using work logs, so when it entered in progress, it's on the start of
the first related work log. Does that make sense?"*

**The shape.** One history table under both asks, the same way `help_status_events` (team
migration 0066) already serves a ticket's stage history: `story_status_events`
(`story_id`, `from_status`, `to_status`, `created_at`, the usual actor triple), team
migration 0110. Every runtime status writer (`setStoryStatus`, `storyProgressFlip` in
`workers/content/src/lib/stories.ts`) records a row the moment it genuinely moves one
(R17: a zero-row move writes no event either). The migration's own BACKFILL reaches for
the fact she named: a story already past `open` gets an `in_progress` event at the start
of its first work log, or its own `created_at` with none; a story at `in_review` or `done`
gets that event too, at `updated_at`.

The chart reads `POST /api/content/stories/burndown` (`{phaseId}`), a GET-style POST
(the phase id travels as a body field): one row per calendar day of the phase, the
REMAINING count (stories whose latest status event at or before that day is not `done`,
a story pulled back out of done counts as remaining again, computed from the latest event
rather than "ever reached done"), the IDEAL straight line from the phase's starting total
to zero on the last day, and the starting total itself. `hasPoints` is false today,
`stories` carries no points column yet, so the series counts stories until one exists, and
the count/points toggle stays off until it does. Drawn on the phase detail
(`sprint-detail.tsx`'s Stories tab, directly under the phase goal band and above the story
list) through the kit's own `Chart` (`type="line"`, two series: the remaining line in ink,
the ideal line in a lighter tone), empty through `EmptyGatedPanel` (R88) when the phase has
no start/end dates or no stories at all.

**Status: ruled, in build, 20 Sep 2026.**

**Law.** None registered.

### B36: the Waves screen's default view drew no door on a team with zero waves

**The defect.** Found by a proof on staging, 20 Sep 2026. A team with no waves at all
lands on the Waves screen's DEFAULT view (Timeline, both tabs,
`waves-screen.tsx`'s own `useRemembered<WaveView>("view", "timeline")`), and had no
way at all to sell the first wave. The toolbar carrying "Sell a wave" was correctly
withdrawn (R50: no toolbar at all over an empty collection), but `RecordTimeline`'s own
`emptyBody`, the body Timeline fell into, is a plain sentence with no door, and
`RecordCalendar`'s `emptyText` carried the identical gap. Only the List view (reachable
from the All tab, never the screen's own default) fell through to `CollectionEmptyState`
and its "Add the first": one working door on a screen with three bodies, none of them
the one a person actually landed on.

**The fix.** R88 (empty-state-single-door) already names the register; this screen just
was not reaching it from two of its three views. `all.length === 0` (the tab/account
scoped collection itself, never the search-narrowed `rows`) is hoisted above the
per-view branches in `waves-screen.tsx`, so Timeline, Calendar and List all draw the
identical `CollectionEmptyState`: title, description, and the one door, gated on the
create right and on there being a client to sell to (`canCreate && clients.length > 0`),
exactly the real-world gate the toolbar's own button already carried. A reader without
the right sees the sentence and no button, R88's own second clause. The toolbar stays
withdrawn (R50, untouched). The FILTERED zero (a search or facet narrowing a non-empty
collection to nothing) is unaffected: Timeline and Calendar keep their own "no match in
this window" sentence, and List's `CollectionEmptyState filtered` still stands, now
provably reachable only when the collection is not the genuinely empty case above.

**Status: fixed, 20 Sep 2026.**

**Law.** R88 (`empty-state-single-door`), reinforced. No new registry entry: the
existing law's own register was simply not wired to two of the screen's three views.

---

### B37: a wave's own stage is read off its active phase

**The rule.** Aurora, verbatim, 21 Sep 2026: *"stage wave: read the active pahse that
sit. makes sense?"* - read literally: a wave carries no stage column of its own
(`shared/waves.ts` - "a wave is a wave"); what a wave row or its head SHOWS as its
stage is the wave's own ACTIVE phase.

**What it decides.** Four cases, in the order she named them: the phase whose start
and end dates contain today is the stage; if none does, the earliest phase that has
neither started nor completed (upcoming) is; if every phase has ended, the wave reads
"Complete"; if the wave carries no phases at all, "No phases yet". Icon only, no
colour - the same ruling that put an icon on a sprint/phase type in the first place
(`shared/sprint-types.ts`): the stage reads the active (or upcoming) phase's own TYPE
through the identical pill a phase already wears on the wave's own Sprints list
(`SprintTypeGlyph`, `web/lib/sprint-type-icon.tsx`).

**Where it is wired.** One shared helper, `shared/wave-stage.ts` (`phaseState`,
`waveStage`), pure and date-only - no `completedAt`/`active` flag decides a phase's
state, only whether its `startsOn`/`endsOn` bracket today. One presentational
component reads it on both sides of the app, `WaveStageMark`
(`web/components/work/waves-screen.tsx`, two variants: `"text"` for the wave row's
own Phases cell and the T3 timeline's sublabel, `"chip"` for the wave head's own chip
row, `wave-detail.tsx`). A deactivated phase never counts - every call site filters
to `s.active` before handing its phases to the helper.

**Status: shipped, 21 Sep 2026.**

**Law.** None registered - an arrangement decision, not a machine-checked law. Proved
by `web/test/wave-stage.test.ts` (the helper's four cases) and
`web/test/wave-stage-mark.test.tsx` (the row and the head, through the one shared
component both draw).

**AMENDED 20 Sep 2026 - two fallbacks, found in the live proof.** The rule above
named four cases for the STAGE and said nothing about what a phase with no TYPE, or
a wave with no DATES of its own, should draw - and the live proof of this same work
found both gaps, on the row and on the head alike.

1. **A typeless active/upcoming phase is still a phase, never a blank chip.**
   `WaveStageMark` read a `null` `sprintType` as `sprintTypeHasGlyph(type)` false and
   `type ? t(type) : ""` - an icon-less `Badge`/span with an EMPTY label, which reads
   as nothing at all, on the row's own Phases cell and on the wave head's own chip
   row. The fallback: the phase's own NAME (every phase carries one; a phase cannot
   be created without it), under the GENERIC phase icon - `CalendarDots`, the same
   Phosphor glyph `CONCEPT_ICON.sprints` gives the Phases nav item (`web/lib/
   pages.ts`) - never the empty label. A phase whose type IS set but is not one this
   app's vocabulary carries a glyph for (a team's own retired or custom word) is
   unaffected: it still reads its own word, with no icon, exactly as before - the
   fallback is for a MISSING type, not an unrecognised one.

2. **The head's own "Runs" line derives from its phases when the wave carries no
   dates of its own.** `waveDates` read only the wave's own `startsOn`/`endsOn` and
   fell straight to "No phases planned yet" the moment either was unset - even with
   a dated phase sitting right there on the Phases tab, because the door's own
   `recalcWaveDates` recalculation can lag a read, or a phase can be attached the
   same moment the screen renders. `waveDates` now takes an optional third argument,
   the wave's own active phases; when the wave itself carries neither date, Runs is
   the EARLIEST phase start to the LATEST phase end (mirroring the door's own
   recalculation), and only when no phase carries a date either does the sentence
   stand. A wave that carries even one of its own two dates is unaffected - the
   phases are read only when the wave itself answers neither.

**Where it is wired.** Both fixes live in the same two functions B37 already names -
`WaveStageMark` and `waveDates` (`web/components/work/waves-screen.tsx`) - so the
row and the head still draw through the one shared component and the one shared
helper; nothing new was built. Proved by `web/test/wave-stage-mark.test.tsx`'s own
new cases: the typeless-phase fallback on both the `"text"` (row) and `"chip"`
(head) variants, plus the same fixture read through `waveListRows` for the row
specifically, and the `waveDates` phase-derivation cases (one date, several phases,
neither date and no phases either).

**VALIDATED 21 Sep 2026.** Aurora reviewed staging this round and confirmed the rule
live, verbatim: *"confirm."*

**Status: validated, 21 Sep 2026.**

---

### B38: "To Do" means scheduled in an active phase, not merely open

**The rule.** Aurora, verbatim, 21 Sep 2026: *"Backlog, To Do: nono, to do means its
scheduled in an active phase."* - a correction over the 20 Sep round (B27) that gave
`open` two unconditional words, "Backlog" on the List and "To Do" on the kanban
column, and never asked whether the story was actually scheduled anywhere.

**What it decides.** The stored statuses are unchanged (`open`/`in_progress`/
`in_review`/`done`). The WORD for an open story is now derived off the same test B37's
own helper answers for a wave: "To Do" when the story sits in a phase active today,
"Backlog" otherwise (no phase, a future phase, or one that has already ended).

**Where it is wired.** One shared label helper, `shared/story-status-word.ts`
(`storyStatusWord`/`openStoryWord`/`storyInActivePhase`), reading `phaseState` off a
`Story`'s own `sprintStartsOn`/`sprintEndsOn` (the second of the two joined beside the
first, 21 Sep 2026, `workers/content/src/lib/stories.ts`). Every screen that draws an
open story's status word now calls it: the Backlog list (`stories-screen.tsx`'s
`shapeStories`), the story detail's chip and its Overview row (`story-detail.tsx`),
the nested Stories panel's own line (`work-panels.tsx`'s `storyLine`), and the kanban
board's own "To Do" column, which now holds only a story whose own phase is active
(`storyBelongsOnKanbanColumn`, `stories-screen.tsx`). **The board decision, said out
loud:** `stories-screen.tsx`'s own board has three fixed columns and no Backlog
column, so an open story outside an active phase is simply left off the board, the
same way a finished story already is - it stays reachable on the List and Backlog
tabs. `work-panels.tsx` never had a stories board at all (List only, through
`PagedPanelBody`), so there was no second board to decide about there; its own facet
now offers "Backlog" and "To Do" as two choices (`backlog`/`to_do`) that map to the
derived rule rather than to a stored value - new virtual words the door itself
resolves (`OpenStoryFacetStatus`, `workers/content/src/lib/stories.ts`:
`status=to_do`/`status=backlog` both narrow to the stored `open` status, told apart by
the same phase-active predicate in SQL).

**AMENDED 21 Sep 2026 - the Backlog TAB gets the identical facet, door-narrowed.** Until
this pass only `work-panels.tsx`'s own nested Stories panel offered Status as a facet,
through `<PagedFind>`'s own door-forwarding; the top-level Backlog tab (`stories-screen.tsx`,
built on `useFilterBar` rather than `PagedFind`) offered Category alone, filtered in the
browser. Aurora's own ruling names the filter itself as the point ("the filter offers them
as two choices"), so the Backlog tab's `facets` array now carries a Status facet too, gated
to that one tab (`view === "backlog"` - Reviews and Now keep whatever facets they already
had, untouched), four choices in that order - Backlog, To Do, In Review, Done, no In
Progress, because the everyday backlog is never the board. Narrowed through the DOOR, never
client side (R14/R16): picking a value changes `storiesQ`'s own cache key
(`storiesKeyForView`, `stories-screen.tsx`) and re-asks `contentApi.stories({ view:
"backlog", status })` from page one, the identical `OpenStoryFacetStatus` words the door
already answers for the nested panel's own facet; `<LoadMore>` carries the same narrowed key
and status forward so paging past page one keeps the same question.

**Status: shipped, 21 Sep 2026.**

**Law.** None registered - an arrangement decision. Proved by
`web/test/story-status-word.test.ts` (the label helper), `web/test/story-status-board.test.ts`
(the List's own cell and the board's own column predicate, plus the nested panel's facet's
five choices), `web/test/stories-backlog-status-facet.test.tsx` (the Backlog tab's own four
choices, in order, gated to that tab, and a live render proving a pick issues a real
`status=to_do` request rather than a client-side filter), and
`workers/content/test/stories.test.ts` (the door's own `to_do`/`backlog` filter, driven end
to end).

---

### B39: MoSCoW is paused

**The rule.** Aurora, verbatim, 21 Sep 2026: *"pause everything to do with moscow, but
remind me at later stages."* Every MoSCoW surface a person can SEE is withdrawn; the
data and the doors are untouched, so nothing here needs re-entering the day she asks
for it back.

**What it narrows.** The MoSCoW tag on a story row/board card and on the record's own
Overview row (`MoscowChip`); the stories screen's own facet and sort option
(filtering/ordering the backlog by priority); and the segmented Must/Should/Could/
Won't control on the story form. `Story.moscow`/`MOSCOW_VALUES` (`shared/types.ts`)
and the `create_story`/`update_story` doors keep accepting and returning the field
exactly as before - an existing story's priority is neither cleared nor hidden from an
edit's own submit, only from every screen that used to SHOW or SET it.

**Where it is wired.** The app's own PARKED mechanism (`shared/rules/registry.ts`,
proved by `web/test/orphan-components.test.ts`): each surface moved out of
`stories-screen.tsx`/`story-detail.tsx`/`story-form-dialog.tsx` into a file of its
own - `web/components/work/moscow-chip.tsx`, `moscow-field.tsx`, `moscow-filters.tsx` - and nothing imports any of the three any more, so the census that catches an
unmounted component proves these are unmounted on purpose rather than by accident.
Three `PARKED` entries (`work/moscow-chip`, `work/moscow-field`,
`work/moscow-filters`) each say in writing where the surface went and how to wire it
back. The MCP tool catalogue's own `moscow` mention (`create_story`/`update_story`'s
field description) is untouched, per her own ruling's shape - the field stays
accepted; `list_stories` never advertised `moscow` as a filter, so there was nothing
to withdraw there.

**Status: shipped, 21 Sep 2026.**

**Law.** None registered - a product pause, not a UI conformance rule. Proved by
`web/test/moscow-parked.test.tsx`: the three files are named in `PARKED` and mounted
nowhere, the story form and the backlog's own row/toolbar carry no trace of the field,
and each moved-out surface still renders correctly when called directly ("parked, not
dead").

---

### B40: who may edit a chat reply on a ticket

**The rule.** Aurora, verbatim, 21 Sep 2026: *"who may edit: A author onñy."* Read as
offered to her (option A, of however many she was shown): the author may edit and delete
their own reply; a person holding the ticket edit right (`help:update`) may DELETE any
reply but never edit someone else's words; a client from the portal may only touch their
own, unchanged from before this ruling.

**What it narrows.** Until this ruling, `help:update` reached both halves: the same
colleague who could take a reply back out could also rewrite it. That is no longer true.
Edit is the author's own fence and nothing else reaches it now; Delete keeps the wider
one it always had, the author or anyone holding the ticket edit right. The chat
edit/copy/delete menu (B30) narrows with it: a colleague holding `help:update` still
sees Copy and Delete on somebody else's reply, never Edit.

**Where it is wired.** The fence itself splits into two functions,
`assertMayEditReply`/`assertMayDeleteReply` (`workers/content/src/lib/help.ts`), one per
door (`POST /api/content/help/reply/update` refuses a non-author outright, in plain
words; `POST /api/content/help/reply/delete` is unchanged). The app's own menu
(`help-detail.tsx`'s `TicketThread` call site) offers `onEditRequest` only to the
author, and `onDelete` to the author or anyone the ticket edit right already governs.
The external surface carries the same split: `update_help_reply` is author only,
`delete_help_reply` keeps the wider fence (`documents/MCP.md` §3).

**Status: ruled, in build, 21 Sep 2026.**

**Law.** None registered. A permission fence, proved at the door
(`workers/content/test/help-reply-actions.test.ts`) and at the app's own wiring
(`web/test/ticket-thread-actions.test.tsx`), not a UI conformance check this book's
registry enforces.

---

### B41: a ticket shows who is on it, inherited from the app when it has none of its own

**The rule.** Aurora, verbatim, 21 Sep 2026: *"both on story detail and ticket detail we
need to see to woh it's ssigned, normally this gets inherited from the app."* Read as: the
ticket page (and, later, the story page) shows one "Assigned to", a single person; when
the record carries no assignee of its own, it reads the app's own answer and says so
("Inherited from &lt;app&gt;"); a person holding the record's edit right can set one on the
record, which overrides the app's.

**Scope shipped this round, stated explicitly (a same-day scope correction).** The ticket
side, in full: the migration, the door, MCP parity, the resolver, and the "Assigned to" row
on `help-stakeholders.tsx`. The story page is **not** touched, it stays a design artifact
for now, on Aurora's own word ("let's continue on artifact for story"), but the resolver is
generic and ready for it the day that lane opens.

**The data-model decision, and why it is narrower than it first reads.** A ticket (`help`)
gets its own `assignee_id`/`assignee_name` pair (team migration 0111), the same audit-pair
shape `stories.assignee_id`/`assignee_name` already keep. The **app does not** gain a second
column. Investigated first: an app already carries exactly one "who owns this system" fact,
`app_staff.is_lead` (team migration 0030), the row `app-detail.tsx`'s own Lead field already
reads and writes. Adding a disconnected `apps.assignee_id` beside it would be two answers to
one question that can disagree the first time the lead changes and the copy does not follow,
the same shape the codebase's own "two dates for one promise" argument (`sprintEndsOn`,
`shared/types.ts`) warns against. So the app's half of
the inheritance reads `app_staff` directly, a correlated subselect (`app_assignee_id` on the
ticket row, exactly like `app_logo`'s own two lines up in `TICKET_COLS`); the app's existing
lead field and its existing door (`AppFormDialog`'s Lead field, `setAppStaff`) are kept
exactly as they are, never touched.

**The resolver.** One function, `effectiveAssignee(record, app)`
(`shared/effective-assignee.ts`): the record's own `assigneeId`/`assigneeName` wins when it
has one; otherwise the app's own answer (its lead, pre-resolved by the caller off the team's
members cache) wins, with `inherited: true` and the app's name for the "Inherited from"
line; with neither, the row reads nobody. Pure and synchronous, both candidates arrive
pre-resolved, so the resolver never touches a database or a members cache itself, which is
what lets the story page read the identical rule later with no changes here.

**Where it is wired.** `workers/tenancy/src/team-schema/migrations.ts` (0111, `help` only).
`workers/content/src/lib/help.ts`: `TICKET_COLS` carries `assignee_id`/`assignee_name` and the
`app_assignee_id` subselect; `toTicket` redacts all three **unconditionally** to a client
login (not `hideEditor`'s own self-view exception, an assignee is always staff, by
construction, so there is no "the assignee is a client" case to carve, SCOPE ch.06's "the
portal shows work status but never which staff member is doing it"); `updateTicket` takes
`assigneeId`, staff only, ignored outright (not refused) for a portal caller, absent means
leave it alone. `shared/workers/tool-catalog.ts`'s `update_help_ticket` widened the same way
for R22/MCP parity. `web/components/tickets/help-stakeholders.tsx`: the "Assigned to" row,
first, drawn exactly like the "Raised by" row beside it, the same horizontal `PersonCard`,
the same `size="row"`, the same card and padding, with the muted "Inherited from &lt;app&gt;"
line (`PersonCard`'s own `secondary` slot) when inherited, a pen where Raised by's own used to
sit before it was retired (20 Sep 2026), opening the kit `Select` (R90 faces) in its place for
whoever holds the ticket edit right, and the row's own empty-state words when a ticket has
neither an assignee nor an app to inherit from. Unlike Raised by, the row is never folded into
the panel's own "just the raiser and your admins" empty state, an assignee can exist with no
stakeholders at all.

**AMENDED 21 Sep 2026 - a way back to inherited.** The ruling shipped the row but not a way
to undo it: once a ticket carried its own assignee, nothing on the page could clear it back
to the app's own answer. The Select's first option is now a real, pickable row - the `NONE`
sentinel (`__none__`) every other "nothing chosen" Select in this app already uses
(`step-form-dialog.tsx`, `meeting-form-dialog.tsx`, `help-form-dialog.tsx`'s own "Raised by"),
never a bare empty string, which Radix reads as nothing selected rather than as an item
somebody actually picked. It reads "Nobody, inherit from the app" when the app has a lead to
fall back to (`appAssigneeId`), and plain "Nobody" when it has none - the row never promises
an inheritance that would not happen. Choosing it writes `assigneeId: null` through the same
door (`content.updateHelp`), and the door tells "clear it" apart from "leave it alone" on the
RAW wire value: `optionalText` alone answers `undefined` for both a missing field and an
explicit `null`, so `updateTicket`'s own `assigneeCleared` (`workers/content/src/lib/help.ts`)
checks `input.assigneeId === null` before the validator ever sees it - R20's own
literal-comparison form, positional like every other check this door already makes. R90
(faces in choices) still governs this row: it carries the kit's own EMPTY face (`face={{ name:
"" }}`, a blank `Avatar`, no photo and no initials to draw) rather than no face at all, because
there is no record behind "nobody" to draw a real one for, and the census only asks whether a
face slot is present.

**AMENDED A SECOND TIME, SAME DAY, 21 Sep 2026 - a different card from Stakeholders.** Aurora,
reading the shipped row back, verbatim: *"nono assigned to on the very top, a different card
from stakeholders!"* The row above had landed INSIDE `HelpStakeholders`, above Raised by, one
`Card` among several in the Stakeholders panel - correct about the POSITION ("on the very top")
and wrong about the CONTAINER. It is now its own top-level `Card`, `AssignedToCard`, exported
from `help-stakeholders.tsx` beside (never inside) `HelpStakeholders`, which carries none of it
any more - no props, no state, no render. Rendered as the FIRST panel in the ticket page's own
right column, above Stories/Time/Stakeholders and everything else: `TicketDetailBody`
(`web/components/tickets/ticket-detail-body.tsx`) gains a new `assignedTo` slot, first in its
own `sidePanels`, with a matching `TICKET_PANEL_ANCHOR.assignedTo`; `help-detail.tsx` builds
`<AssignedToCard>` from the same ticket/app/member facts the Stakeholders panel's own call used
to hand it, through the same `editTicket` courier. Because this card now stands DIRECTLY on the
page ground rather than nested inside another `Card`, it takes `variant="default"` (soft paper)
in place of the `"raised"` it correctly wore while nested - R67's own ground rule
(`ticket-detail-body.tsx`'s header), the same "a raised card standing on its own ground" bug
that file's several rounds already exist to catch, caught here one level up before it shipped.
Everything else about the card, and last amendment's clear-to-inherited option, are unchanged.

**AMENDED A THIRD TIME, 20 Sep 2026 - the clear-to-inherited option was itself a law
violation, corrected.** The second amendment's own "Nobody, inherit from the app" / plain
"Nobody" row put a live pill back into a STAFF PICKER, which R79's own law already forbids:
Aurora's 16 Sep 2026 ruling, verbatim, quoted in full because this is the sentence the second
amendment should have been checked against and was not: *"Kill the 'nobody' option for staff.
If we leave it empty, it's not an option. Remove it from tasks and everywhere else. This
'nobody', just kill it."* `staff-picker-kills-nobody.test.tsx` (the census half, off disk) is
the standing proof that `allowNobody`/`nobodyLabel` cannot come back on `StaffPillPicker`
itself; this card's own `Select` is a different component, so the census could not see the
"Nobody, inherit from the app" row it grew independently, and it shipped, red against the
ruling, under a green build. **The fix is not "no way back", it is "not a picker entry".**
The Select goes back to offering people only (sorted, R75; faced, R90; no Nobody row, at any
`appAssigneeId` state). Clearing the ticket's own assignee back to inherited is now a plain
text button on the card itself, `variant="link"` (the kit's own quiet, boxless action, `.kw-
link`), reading "Use the app's lead", offered only when there is somewhere to fall back TO:
the record carries its own assignee AND the app has a lead. **When the app has no lead, no
clear action is offered at all** - once a ticket or story is assigned, it keeps a person,
which is the other half of the 16 Sep 2026 ruling ("if we leave it empty, it's not an
option") read correctly this time: emptiness is never reachable by a click, not even a click
disguised as "inherit instead of clear". Pressing the button calls the same door,
`onChangeAssignee(null)`, unchanged - the doors already treat `null` as an explicit clear
(`assigneeCleared`, above), so nothing downstream of the click needed to move.

**AMENDED A FOURTH TIME, 21 Sep 2026 - redesigned as the Stakeholders card's own twin.**
Aurora, over a screenshot of the ticket page's Stakeholders card (its title row reading
"Stakeholders" with the count "4" beside it, and inside it the horizontal "Raised by" tile -
a round face on the left, the small-caps eyebrow "RAISED BY" above the name "Marco Hasler"),
verbatim: *"Look at the screenshot with the stakeholders. I wanted the 'Assigned to' to be
like this: the count and the horizontal card. Redesign it."* Validated the same round: *"4.
Validated but redesigned as explained."* `AssignedToCard` no longer draws its own bare `Card`
with a hand-rolled title row - it opens with `<TicketSidePanel>` (`ticket-detail-body.tsx`),
the SAME title-with-count register "Stakeholders" itself renders through
(`help-detail.tsx`'s own `<TicketSidePanel title={t("Stakeholders")}
count={stakeholderBadge}>` call): the title "Assigned to", and a count beside it in the
identical `formatCount` register (R16) - 1 when the record carries its own assignee or
inherits one from the app, 0 (rendered as nothing, never a bare "0") otherwise. Inside it,
the face+name row is drawn by a new, shared `StakeholderTile` (`help-stakeholders.tsx`) - the
SAME component Raised by's own tile now draws itself with, extracted from Raised by's
pre-existing markup rather than copied, so the two tiles cannot drift the way this file's own
header already warns two hand-rolled copies always do: a face on the left, the small-caps
eyebrow over the name on the right. The eyebrow's own words differ from Raised by's - "Assigned
to" when the record carries its own person, "From the app" (a new, seeded string) when it does
not and the app's lead is answering instead, with the app's own name kept on the existing
second, muted line ("Inherited from &lt;app&gt;") rather than folded into the eyebrow itself.
The pen and the Select it opens keep their own position, now `StakeholderTile`'s own `action`
slot, exactly where Raised by's own pen used to sit on its tile before it was retired (this
book's own account above, "THE EDIT PEN IS GONE"); "Use the app's lead" stays a small text-
button action under the tile, offered only when there is somewhere to fall back to. The empty
state, when neither an assignee nor an app lead exists, is the plain words "Nobody yet." inside
the card - the title row above it already says "Assigned to", so the tile's own eyebrow is not
repeated when there is no tile to carry it. The card still stands DIRECTLY on the page ground
(R67): `TicketSidePanel`'s own `Card` is `variant="default"`, unchanged.

**AMENDED A FIFTH TIME, 21 Sep 2026, read-only, editing moved to the ticket's own edit
screen.** Aurora, reading the redesigned card back, verbatim: *"ok, but rmeove the edit
button (this can be editedfrom dtory edit screen). rmeove the 'use the apps lead' text."*
The pen, the Select it opened and the "Use the app's lead" clear button are all gone from
`AssignedToCard`, not merely hidden: no `onClick`, no local picking state, no `Select`, no
clear control. `canEditAssignee`/`onChangeAssignee` are dropped from the component's own
signature, and both callers (`help-detail.tsx`, `story-detail.tsx`) stop passing them the
same turn. The one remaining door onto a ticket's `assigneeId` is `help-form-dialog.tsx`'s
own new "Assigned to" field, placed right after the ticket's App field, the identical kit
`Select` the card's own picker always wore (R90 faces, R75 sorted A to Z), people only, no
Nobody entry, because a staff picker never offers one (her 16 Sep 2026 ruling). It carries no
clear control of its own either, so this form can only set a person, never explicitly clear
one back to inherited: leaving the field untouched sends nothing at all and keeps whatever
the ticket already had, its own assignee or the app's inherited lead. A story's own assignee
is unaffected by this ruling and is still changed from its own edit screen
(`story-form-dialog.tsx`'s "Who's doing it"), which this pass did not touch. The card still
stands DIRECTLY on the page ground (R67), unchanged.

**Status: ruled and shipped (ticket side), 21 Sep 2026, including the separate clear action
and its own top-level card (both since retired by the fifth amendment above), the 21 Sep 2026
redesign as the Stakeholders card's twin, and the 21 Sep 2026 move to read-only with editing
on the ticket's own edit screen. Story side: parked as a design artifact, resolver ready.**

**Law.** None new for the row itself. Governed by the pre-existing R90 (`faces-in-choices`,
the Select's own faces) and R75 (alphabetical options), both proved by the existing app-wide
censuses, now against `help-form-dialog.tsx`'s own "Assigned to" field rather than the
retired card-level Select. **The "no Nobody entry" half is governed by R79**
(`staff-pill-row`, "there is no 'Nobody' pill") read together with
`staff-picker-kills-nobody.test.tsx`'s own header: *"A STAFF PICKER NEVER OFFERS NOBODY"*, a
picker never offers Nobody, which this form's own field still honours by offering people
only. Behaviour proved at the door
(`workers/content/test/ticket-gets-its-own-assignee.test.ts`: set and read back, inherits the
app's lead, the ticket's own assignee wins, a client login cannot set it, and `assigneeId:
null` clears it, never confused with leaving the field out) and at the app's own wiring
(`web/test/help-stakeholders.test.tsx`'s `AssignedToCard` suite: the inherited line, the
own-assignee-wins case, no pen and no Select rendered ever, even when the old gating props
are still passed; a ticket form test proving the "Assigned to" field renders with faces and
submits `assigneeId`; plus its own "HelpStakeholders no longer draws an Assigned to row"
suite, proving the extraction really left, both at render and positionally on the
component's own signature; and its own "TicketDetailBody, Assigned to is the first panel in
the side column" suite, rendering the real layout component and reading the DOM order directly
rather than trusting a prop name) and the resolver itself (`web/test/effective-assignee.test.ts`).

---

### B42: the story detail page, one page, no tabs, with its own Build notes

**The rulings.** Aurora's design review, 21 Sep 2026, over the story-detail-design.html
artifact — a story is what we do, built the same shape the ticket already is. Two verbatim
sentences of hers this round: *"call it build notes"* — the artifact's own third left-column
section (what was built, and how) offered four candidate words, "Solution" recommended; she
named the one actually shipped, never that one. And, the design's own open question ("should
the Done action refuse to close a story with no Solution written, the same way Ready for
review already asks for a note. Yes or No"), answered verbatim: *"yes, canont be marked as don
if thats not filled in, its required."* Read as: a story cannot reach Done while its Build
notes panel is empty, exactly the shape Ready for review's own review-note requirement already
takes. Dated the same round as B41 above, and the ticket's own "Assigned to" card — parked in
B41 as a story-side artifact — is what this round wires up for real: *"the story gets the same
card."*

**AMENDED, 21 Sep 2026 — the Related panels.** Aurora, verbatim: *"in stories if no related
tickets hide that. same for related stories. only in stories."* The Related tickets panel, when
the story has no ticket, renders nothing at all (no title, no empty state); the Related stories
panel, when there are no sibling stories on that ticket, renders nothing at all. This rule
applies only on the story page, never on the ticket page — the ticket page keeps both panels
visible with their content or their empty state. R88 (empty-state single door) already names
this pattern: when a section is empty, its panel's own header and the section's title both
render nothing, and the single door in the body stands in for it. Here, no body exists to show
("No related tickets" never appears, nor "No related stories") — the whole panel vanishes.

**The data model.** Team migration 0112 gives `stories` one new column, `build_notes TEXT` —
the identical storage `detail`/`acceptance_criteria` already use (rich text, sanitised into the
`Notes` editor, list reads null it out the same way those two do, a by-id read keeps it whole).
`Story.buildNotes: string | null` (`shared/types.ts`), read and written through the SAME door
every other story field already rides, `updateStory`/`createStory`
(`workers/content/src/lib/stories.ts`), which replaces every field it reads — an edit that never
mentions `buildNotes` clears it, the identical contract every other field on that door already
keeps. MCP: `update_story` (and `create_story`, for parity) gained `buildNotes` in schema and
`buildBody`, documented in `documents/MCP.md` §3.

**The Done rule, at the door, and mirrored on the button.** `refuseUndocumented(row)`
(`workers/content/src/lib/stories.ts`, read beside `refuseUnstepped`, the identical CHECKLIST
6.5 step-rule shape) refuses `setStoryStatus(id, "done", …)` with a plain message, *"Write the
build notes before marking it done,"* when `build_notes` is empty or whitespace-only — the
refusal is idempotent (R17), reads the row already resolved, never a second query. The story
detail page's own Done head action mirrors the same fact back as its own `disabled` state, with
a tooltip carrying the identical sentence, so a reader sees why before they ever press it — the
door decides, the button only mirrors it, the same split R17 already asks of every status
button in this app.

**Where the images live.** No second attachment table. Build notes' own images ride the SAME
mechanism the story's retired "Files and links" tab already used, `story_attachments`
(`workers/content/src/lib/story-attachments.ts`) — itself "one table along" from
`help_attachments`, the reply body's own mechanism, by that file's own header. The Build notes
sheet (below) reuses the existing, tested `StoryAttachmentsPanel` for the picker; the rendered
(non-empty) panel shows the prose followed by whichever of the story's own attachments are
pictures, inline, the same `hasPreview`/`AttachmentPreview` pair the ticket thread's own message
media well already draws with.

**The page, one page, no tabs.** `web/components/work/story-detail.tsx`, rewritten whole.
`RecordScreen panelVisible={false} footerVisible={false}` draws the head only (chips through
`orderChips` — id, status, type, app, phase — the title, and the head actions: the timer, Edit,
Ready for review, Done); the body renders as its SIBLING, the identical shape `help-detail.tsx`
already takes for `TicketDetailBody` (`RecordScreen`'s own `panelVisible` doc: the kit's panel
region never reads `children` once it is off). The body itself is `RecordDetailBody`
(`web/components/records/record-detail-body.tsx`, new) — the SAME shape
`ticket-detail-body.tsx`'s own `TicketDetailBody` proves across nine rounds of R89's own
live-injection saga (one page scroll, the footer flush at the screen's bottom edge with the
panel gap above it, the side column that never scrolls), extracted for this second caller
rather than hand-copied. `TicketDetailBody` itself stays inlined and unchanged — its own JSX is
read by `web/test/footer-on-the-edge.test.ts` at exact source position, so delegating it to the
shared component would turn a green law red for a refactor that changes no pixel; only the
`useIsAtLeastLg` hook moved, imported rather than duplicated. Left column, in order: Detail,
Acceptance criteria, Build notes — each its own `TicketSidePanel` Card (that component is
purely generic despite its ticket-flavoured name, reused rather than a second wrapper). Right
column, in order: Assigned to (`AssignedToCard`, `help-stakeholders.tsx`, whole, unmodified —
B41's own "the story page reads the identical rule later with no changes" came true), Related
tickets (the ticket this story was born on, `helpOne` by id, the same `RecordRef`/title/status
chip shape a list row anywhere else in this app takes, routed through `orderChips` for id+status
even on a plain row), Related stories (siblings sharing the same ticket, the identical
`sliceKey("stories-ticket", …)` cache `help-detail.tsx`'s own Related stories panel already
reads — the two pages share one list — no progress bar), Phase and wave (the phase, and its own
wave, read off `sprintOne`), Effort (`WorkLogsPanel`, wrapped in the same `EmptyGatedPanel` +
`AddButton` shape `help-detail.tsx` already wears for the identical reason — that panel draws no
title of its own), Metrics. Below `lg`, the side panels stack first, then the main column, then
the band — `RecordDetailBody`'s own built-in order, unchanged from the ticket's.

**Metrics.** Computed in a content door of its own, `getStoryMetrics`
(`POST /api/content/stories/metrics`, `workers/content/src/lib/stories.ts`) — never a column on
the story read, which every OTHER caller of `getStory` would then pay for unasked. Cycle time:
seconds from the story's first work log to the moment it most recently reached Done (or to now,
while it has not), null — "Not started" — with no work log at all. Effort: whole seconds logged,
a discarded timer never counted. Flow efficiency: effort ÷ cycle time as a percentage, null —
"No time log" — while either side of the division is zero. (The exploratory Delivery Metrics
artifact read for wording proposes a richer working-day-based version for a phase-level
dashboard; this panel follows the simpler arithmetic actually specified for it, and only takes
the artifact's two named words, "Not started" and "No time log", for the two undefined states.)

**The Build notes sheet.** `web/components/work/story-build-notes-sheet.tsx`, new — built like
`reply-edit-sheet.tsx`: a title row, the `Notes` rich text editor (the identical editor Detail
and Acceptance criteria already use, never a second control), the image picker below it, Cancel
and Save at the foot. R88's single door while empty: `EmptyGatedPanel` drops the panel's own
title row entirely, and `CollectionEmptyState`'s one "Write the build notes" button is the whole
panel; once written, the pencil — never a second create control — reopens the identical sheet.
Save spreads the story's own current shape (the update door replaces every field) and overrides
only `buildNotes`, the same pattern `work-panels.tsx`'s own `toggleContributesToGoal` already
takes for the identical reason.

**VALIDATED 21 Sep 2026.** Aurora reviewed staging this round and confirmed stories hide Related tickets and Related stories when empty (round 36).

**Status: ruled and shipped, 21 Sep 2026.** Team migration 0112, the door + its Done refusal,
MCP parity, the one-page rewrite, `RecordDetailBody` extracted and reused, the Build notes
sheet, the Metrics door, strings seeded (de/es/ca).

**Law.** None new. Governed by R88 (empty-state single door), R89 (footer on the edge, proved
by construction through the shared `RecordDetailBody`), R91 (no nested scroll), R94 (chip
order), R17 (idempotent transitions, the Done refusal). Behaviour proved at the door
(`workers/content/test/story-build-notes.test.ts`: writing and reading build notes through the
update door, the list/detail split, the Done refusal and its recovery, an update that omits the
field clearing it, and the metrics door against a real work-log fixture) and at the app's own
wiring (`web/test/story-detail.test.tsx`: the panel order in both columns, the Build notes empty
door opening the sheet and the pencil reopening it, Save writing `buildNotes` while the rest of
the record rides along, the Done button disabled with a reason until build notes are filled, the
Assigned to card first with its inherited line, the Metrics figures from a fixture, and no
nested scroll region anywhere on the page).

---

### B43: stories are English only, carry no goal, derive their category, and the Build notes sheet uses the kit's own drop zone

**The rulings.** Aurora, 21 Sep 2026, four verbatim sentences over the story form and the
story page. On translation: *"stories are always in englihs - so remov ethe translate from
there."* On the goal flag: *"Remove the goal from the stories. I don't even know what that
is, but remove it."* On the category: *"The category 'Client Requested' or 'Enabler': don't
put it on the edit screen. You must detect it automatically. If it's related to a ticket,
it's 'Client Requested.' If not, not."* On the Build notes sheet's own image picker: *"On
build nodes, use the already existing component to upload images. Do not invent anything
new. Also, don't show that there's nothing attached."*

**No translate.** `TranslateAction`/`useHumanTranslation` (`translate-human-text.tsx`, the
ticket page's own seam) are gone from `story-detail.tsx` entirely — never unmounted, never
parked, simply not imported: a story's own words are English, full stop, unlike a ticket's.
Every field that used to read `translation.of(...)` (title, detail, acceptance criteria,
build notes) now renders what is actually stored. Translate stays exactly as it was on
tickets and everywhere else.

**No goal, deleted. AMENDED 21 Sep 2026.** First landed as a parked flag: the "contributes
to the phase's goal" checkbox pulled off the story form, the story rows and the story list,
while `Story.contributesToGoal`/`stories.contributes_to_goal` and the create/update doors
kept the field untouched underneath, each UI surface moved to a file of its own
(`work/goal-field.tsx`, `work/goal-row-toggle.tsx`, `work/goal-badge.tsx`) and named in
`PARKED` (`shared/rules/registry.ts`). Aurora, reading that shape back the same day,
verbatim: *"not parked, kill it."* The flag is deleted, not paused: the three component
files are gone, every `PARKED` entry for them is gone, `Story.contributesToGoal` is gone from
`shared/types.ts`, `create_story`/`update_story` no longer accept or return
`contributesToGoal` (`shared/workers/tool-catalog.ts`, `documents/MCP.md` §3), every read and
write of it is gone from `workers/content/src/lib/stories.ts`, and team migration 0114 drops
`stories.contributes_to_goal` from the column itself. The phase's own one-sentence goal
(`sprints.goal_summary`, "Phase goal") is a different fact, untouched by any of this: only
the per-story flag that claimed to serve it is gone.

**Category, derived.** The two-pill Category control is gone from the story form. The
content door now derives it instead of reading it: `deriveCategory(ticketId)`
(`workers/content/src/lib/stories.ts`) answers Client-requested when the resolved
`ticketId` is set and Enabler otherwise, on both `createStory` and `updateStory` —
replacing `refuseEnablerWithNoTicket`, the 20 Sep 2026 rule this inverts: that rule REFUSED
an Enabler story with no ticket; this one is never given a choice to refuse, because there
is no longer a category a caller can choose against the ticket. Re-pointing an existing
story's ticket on an edit re-derives the category the same way — link one and it reads
Client-requested, drop it (an edit that omits `ticketId`, cleared like every other field
this door replaces whole) and it reads Enabler again. Neither `create_story` nor
`update_story` accepts a `category` field on the wire any more (`documents/MCP.md` §3). The
story page shows the derived word as a plain, read-only fact — an uncoloured pill beside
"Category" in the Related tickets panel (R86: the one coloured chip is status) — never a
control.

**The Build notes sheet's own drop zone.** `story-build-notes-sheet.tsx` no longer draws
`StoryAttachmentsPanel` (`work/story-attachments.tsx`, over
`records/record-attachments.tsx`) — a hand-built list-and-upload widget with its own
"Nothing attached yet." empty line, exactly the two things the ruling refuses. It draws
`FileUpload` (`@shared/ui/components/file-upload/file-upload`) instead, the SAME kit drop
zone `reply-composer.tsx`'s Paperclip and `reply-edit-sheet.tsx`'s own Attachments field
already draw through, wired straight to `story_attachments` (the identical door
`story-form-dialog.tsx`'s own file field and the story page's inline preview both read).
Uploads happen the moment a file is picked, never deferred — the story already exists by
the time this sheet opens (R41). `work/story-attachments.tsx` is unmounted and PARKED
(`shared/rules/registry.ts`), not deleted: `records/record-attachments.tsx` it wraps stays
mounted elsewhere (the ticket's own attachments, `reply-composer.tsx`,
`work-logs-panel.tsx`), and the thin story-side wrapper is exactly the shape a future
standalone "Files and links" surface for a story would reach for again.

**VALIDATED 21 Sep 2026.** Aurora reviewed staging this round and confirmed stories are English only, carry no goal, derive their category, and the Build notes sheet uses the kit's own drop zone.

**Status: validated, 21 Sep 2026.** All four surfaces changed; `documents/MCP.md`
and the tool catalogue updated for the derived category and the parked goal field; content
tests covering category derivation on create, on an update that links a ticket, and on an
update that drops one; web tests covering the parked goal surfaces, the absent translate
control, the derived category fact, and the Build notes sheet's own drop zone.

**Law.** None new. Governed by R86 (the one coloured chip is status, for the Category
pill), R41 (a picked file is either sent or refused, never dropped, for the Build notes
sheet's own upload), R28/R33 (the translation catalogue, for every string this round moved
or removed).

**AMENDED, 21 Sep 2026 (the drop zone, proved rather than only claimed).** Aurora, over a
screenshot of the kit's own dashed drop zone (the rounded box, the upload glyph, "Drop
files here", the pill "Choose a file"), reading the shipped round back: *"that's not what
i neant. imeant a compmntet liek inscreenshot."* The mount named above was already the
kit's `FileUpload` (`@shared/ui/components/file-upload/file-upload`), unconditionally
rendered under the Notes editor, with no wrapping `files.length > 0` gate the way
`reply-composer.tsx` takes it (that composer only ever mounts `<FileUpload>` once a tile
already exists, reached instead through its own Paperclip button, so its empty state never
draws the dashed box at all), so the component was already the one in her screenshot, and
the gap was proof, not code: `story-b43-parked.test.tsx`'s own case only greps the source
for `<FileUpload`, and nothing had rendered the sheet and read its own words back. A new
case, `web/test/story-detail.test.tsx` ("draws the kit's own dashed drop zone under the
editor, never an 'Add a file' control"), opens the sheet and asserts "Drop files here" and
the "Choose a file" button are actually on the page, and that neither of
`record-attachments.tsx`'s own two words, "Add a file", "Add a link", the hand-built
widget this ruling already retired, nor a "nothing attached" sentence is.

---

### B44: the Effort card carries its own metrics, and a count sits beside its title like Stakeholders'

**The ruling.** Aurora, verbatim, 21 Sep 2026: *"Include the metrics inside the effort
card. On the effort card, remove the value entries and put the number next to the effort
title, just as you do, for example, for stakeholders."*

**What changed.** The story page's separate "Metrics" panel is gone. Its three lines —
Cycle time, Effort, Flow efficiency — are the Effort card's own body now, and
`WorkLogsPanel`'s own list of rows (the "value entries" the ruling names) is gone from this
page too: the card never mounts `WorkLogsPanel` at all any more. The Effort card's own
title carries the total logged hours as its count, through the SAME title-with-count
register `help-stakeholders.tsx`'s own "Stakeholders 4" already renders through
(`TicketSidePanel title={t("Effort")} count={hoursLabel(...)}`,
`ticket-detail-body.tsx`) — the identical `<h3>{title}{count}</h3>` shape, not a second one
invented for this card. Related tickets and Related stories already carried their own
counts the same way; nothing changed there.

**Logging time still works.** The "Log time" door survives, now a plain `TimeFormDialog`
(`time-form-dialog.tsx`) mounted directly on the story page and opened from the Effort
card's own title-row action, writing through the identical `contentApi.logTime` call
`WorkLogsPanel`'s own `log()` made. A write refreshes the page's existing `refresh()`
(which already re-reads `story:metrics:<id>`), so the card's count and its three lines
catch up the same way every other write on this page does.

**Why not `EmptyGatedPanel`.** The Effort card is no longer a COLLECTION that can hold
zero rows — it always shows three facts, with a textual fallback ("Not started" / "0h" /
"No time log") standing in for none logged rather than an empty-collection state — so
`EmptyGatedPanel` (R88's own shell, built for a header that disappears while a list is
empty) is the wrong register now. The card is the same plain `TicketSidePanel` every other
fact panel on this page already uses, and its own "Log time" `<AddButton>` carries a
reasoned, permanent `empty={false}` (`EMPTY_TOOLBAR_EXEMPT`/`EMPTY_STATE_SINGLE_DOOR_EXEMPT`,
`shared/rules/registry.ts`) — the same reasoning `roles-matrix.tsx`'s own fixed-catalogue
entry already argues: there is no collection here to be empty.

**VALIDATED 21 Sep 2026.** Aurora reviewed staging this round and confirmed effort metric tiles on raised kit cards, with the count beside the title like Stakeholders.

**Status: validated, 21 Sep 2026.** The Metrics panel removed, its three lines
merged into the Effort card, the count wired through the Stakeholders register, the Log
time door rebuilt on `TimeFormDialog` directly, `web/test/story-detail.test.tsx` updated
for the new panel order and the merged card.

**Law.** None new. Governed by R88 (empty-state single door, and the reasoned exemption
this card now carries), R50 (the empty-toolbar census, same exemption), R16 (a collection's
count through one seam — the count here is a computed hours figure through the same
register, not a second one).

**Amended, 21 Sep 2026 (the same day, over the deployed card).** Aurora, verbatim: *"ok,
but i still want to see the individual records of time og! also show avatar of perosn.
bring back the old cards with the metrics inside effort"* and, the same message: *"in
effort card inside stories or tickets, rmeove the + button (we have the start on top!)."*

**What changed, this round.** The rows are back, and they carry a face. A new shared
`EffortCard` (`web/components/work/effort-card.tsx`) replaces both the story page's own
inline card AND the ticket page's `EmptyGatedPanel`-wrapped `WorkLogsPanel`, so the two
draw the identical shape rather than two hand-kept copies of it: the title with the total
hours as its count, the three metric lines, then the individual time log rows — newest
first, each with a face (`RecordMark`/`memberFace`, R35/R90), the name, the date, the
duration and the note — with a load-more door once the list is long (R14, `<LoadMore>`).
The ticket page gets the SAME three metric lines now too, off a new door,
`getTicketMetrics` (`POST /api/content/help/metrics`, `workers/content/src/lib/help.ts`),
computed the identical way `getStoryMetrics` already is — cycle time from the first work
log to the record's own "done" moment (a story's latest `story_status_events` row, a
ticket's own `resolved_at` column directly), effort summed, flow efficiency from the two —
returning `TicketMetrics` (`shared/types.ts`, a plain alias of `StoryMetrics`, since the
two shapes are identical and a real alias is what keeps them from drifting).

**The "+" is gone, everywhere on this card.** Her second sentence retires the "Log time"
door this same entry rebuilt a few paragraphs up: there is no add control on the Effort
card any more, on either page, empty or not. The head's own Start/Stop timer button
(`RecordTimerButton`) is the one way a new row is written now; correcting a row already
on the record stays (the pencil), because correcting one is not adding one.

**R88 applies again, for real.** With the rows back, the card is a genuine collection once
more — the reasoning this entry's own earlier paragraph gave for standing `EmptyGatedPanel`
down ("there is no collection here to be empty") no longer holds, so `EffortCard` IS
`EmptyGatedPanel` again: at zero logged rows the whole header (title, count) drops, and
the body reads one sentence, no door — "No time logged yet." (never "Add the first": there
is nothing left on this card to add from). The `EMPTY_TOOLBAR_EXEMPT`/
`EMPTY_STATE_SINGLE_DOOR_EXEMPT` entries this same round's earlier shape needed for
story-detail.tsx are gone from `shared/rules/registry.ts` along with the button they
excused.

**Status: amended and shipped, 21 Sep 2026.** `EffortCard` extracted and drawn by both
pages; `getTicketMetrics`/`POST /api/content/help/metrics` added, with its own door-level
suite (`workers/content/test/ticket-metrics.test.ts`); `web/test/story-detail.test.tsx` and
`web/test/ticket-detail-no-tabs.test.tsx` updated for the rows, the faces, the metrics, the
count and the missing add button.

**Law.** Governed by R88 (empty-state single door — the card's own shell again, not an
exemption this time), R50 (empty-toolbar, the reasoned entries retired), R14 (paged rows,
`<LoadMore>`), R35/R90 (a record's own face, on every row), R16 (the one count register).

**Amended a third time, 21 Sep 2026 (reviewing the deployed card again).** Aurora, verbatim:
*"remove the pencil. when clicking one detail in slide in, and there have the option to
edit. make the metrics cards inside the container, like in the metrics artifact you did for
me! next to effort show the count of record, not the total hours (that has a metric on
itself)."* And, the same round, from the task review: *"if no time logged yet, hide that
component. when time logged, as i said before, i want to see the avatar in each row."*

**What changed, this round.** Four things, on `EffortCard` alone:

1. **The title's own count is a record count now, not an hour total** — "6", never "6.5h".
   The hours already have a tile of their own (below), so the same figure said twice was
   exactly what her parenthetical objects to. Read off the SAME `workLogs` list door this
   card already calls for its rows — the door's own exact `total` (R14's `pagedJson`, a real
   `COUNT(*)`) — primed into `workLogsTotalKey` (`work-logs-panel.tsx`), the identical
   sidecar a Time tab badge on this record would already read. `recordTimeSummaryKey`'s own
   separate aggregate read is gone from this file: nothing here needs a second door for a
   fact the first one already carried.
2. **The three metric lines are stat tiles now**, drawn through the kit's own `<StatGrid>`
   (`shared/ui/components/stat-grid/stat-grid.tsx`) rather than the hand-rolled three-column
   `font-mono` grid this file drew by hand before — the same primitive
   `work-logs-panel.tsx`'s own Numbers band and `pulse.tsx`'s dashboard already call, read
   off the Delivery Metrics artifact's own tile wording. The middle tile reads "Effort
   hours", not "Effort": the title's own count already answers "Effort" (point 1), so the
   tile answers a different question beside it instead of repeating the word.
   `COUNT_REGISTER_EXEMPT`'s own entry for this file (`shared/rules/registry.ts`) moves from
   "pending her word" to settled — she has now explicitly asked for these three as tiles,
   which R97's own ruling names as the one way out ("unless explicitly said").
3. **No pencil.** A row is a real `<button>` (keyboard reachable): clicking one opens the
   SAME slide-in sheet a pencil used to open — `TimeFormDialog`, already built on
   `FormShellDialog`'s own `Sheet` (R59), the row's own fields, Save/Cancel — through the
   identical `correct()` call the pencil used to make. A row still needs `work:update`
   (`canEdit`) plus a settled, non-discarded entry to be a button at all; correcting a
   still-running or already-discarded row was never offered before and is not being offered
   now, only the door into a correction moved from a small icon onto the row itself.
4. **Zero records draws nothing.** Not `EmptyGatedPanel`'s own header-only drop — the WHOLE
   card, no sentence, no card, nothing at all. The head's own Start/Stop timer button is the
   one way in, and a card that says "No time logged yet." beside a Start button that already
   says the same thing is the component her words ask to hide.

The face on every row (R35/R90) and the load-more door (R14) are unchanged from the previous
amendment; her second sentence this round ("when time logged... i want to see the avatar in
each row") restates what was already shipped rather than asking for something new.

**Status: amended and shipped, 21 Sep 2026.** `EffortCard` updated alone (its test files, and
`TimeFormDialog` reused unmodified); `web/test/story-detail.test.tsx` and
`web/test/ticket-detail-no-tabs.test.tsx` updated for the record count, the stat tiles, the
missing pencil, and the stricter zero-records case.

**Law.** Governed by R88 (amended again by this round, stricter than the shell's own
contract — the whole card, not only its header, drops at zero rows), R97 (a count never gets
its own card — `COUNT_REGISTER_EXEMPT` settled for this file), R35/R90 (a face on every row,
unchanged), R59 (a form slides in, never centres — the row opens the existing sheet rather
than a new modal), R16 (the one count register, now the title's own record count rather than
an hour total).

**Amended a fourth time, 21 Sep 2026 (same day, reviewing the deployed tiles).** Aurora,
verbatim: *"good. add kind of card background behind cards, this is a metric, like in kit."*

**What changed, this round.** The three stat tiles (Cycle time, Effort hours, Flow
efficiency) drew no visible card fill. `StatGrid`'s own `tone` prop only reaches `Card`
variant `default` ("quiet", `bg-surface-panel`), `brand` or `inverse`, never `raised`, and
these tiles sit inside `EmptyGatedPanel`'s own `<Card variant="default">`, so a `default`
tile nested inside a `default` panel painted the identical soft-paper tone over itself
(measured contrast 1.000, the exact pairing `card.tsx`'s own header warns against: "off-beige
over soft paper … only reads as raised when it sits inside a `--surface-panel` band"). Since
`StatGrid` has no prop for the raised tone, each of the three tiles is now its own
`<StatGrid items={[…]} surface="bare">` (the label/value register only, one item, no card of
its own) wrapped by hand in the kit's own `<Card variant="raised">`, the kit's stat markup
inside the kit's card, never a hand-rolled fill, border or radius. The three tiles are
written out one by one rather than `.map()`-ed over an array, because a kit `<Card>` carrying
React's own `key=` reads, to `web/test/rules.test.ts`'s R65 census, as a per-row record card
that owes a chip a `<CardTitle>` to sit above; these three are fixed metrics, not rows, so
naming each by hand keeps them off that census honestly instead of fighting it.

**Status: amended and shipped, 21 Sep 2026.** `EffortCard` updated alone;
`web/test/story-detail.test.tsx` and `web/test/ticket-detail-no-tabs.test.tsx` each gained a
case proving a tile's own figure sits inside a `[data-slot="card"]` ancestor carrying
`data-variant="raised"`.

**Law.** Governed by kit-conformance (no raw borders, no hand-rolled background outside a
kit token or variant), R97 (a count never gets its own card: unaffected, the tiles are
measurements, not counts, and `COUNT_REGISTER_EXEMPT`'s entry for this file already covers
them), R31 (two radii: the kit's own `raised` variant carries `--radius`, nothing new
introduced), R65 (chip above title: the three tiles are named by hand, never keyed, so the
record-card census does not reach them).

---

### B45: backlog tabs reordered, Everyone's renamed to All

**The ruling.** Aurora, verbatim, 21 Sep 2026: *"Reorganize backlog tabs: Now, Planned,
Review, Completed, Backlog, Everyone's. Rename everyone to All."*

**What changed.** `STORY_TABS`/`EVERYONE_TAB` (`web/components/work/stories-screen.tsx`)
draw the same six tabs K27 named, in the order she asked for — **Now · Planned · Review ·
Completed · Backlog · All** — and the sixth tab's own word changed from Everyone's to All.
Nothing else moved: the gate (`all_stories:read`), the predicates, and every tab's own
views and facets stay exactly as K27 and the rulings after it left them.

**Law.** None new. Governed by R53 (the toolbar's slot set is the row's, and its sort slot
is a default) — the tab strip is still `STORY_TABS`/`EVERYONE_TAB` as data, so the strip,
the fetch key and the badge cannot fall out of step.

---

### B46: phase days are working days, the prefill, and the Timeline's expected spans

**The ruling.** Aurora, verbatim, 21 Sep 2026: *"Yes, ship. mind you, all of this is Monday
to Friday, so when I say 5, it's actually a full week, but I, of course, don't count the
weekends. Make sure we can adjust this on the settings in Waves. * the prefill * Audit 5 *
Plan 5 * Build 15 * Pilot 5 * Revision 10 * Deploy 3 * Hypercare 7."*

**What changed.** B32's own placeholder defaults (Audit 5, Plan 5, Build 20, Pilot 10,
Revision 10, Deploy 3, Hypercare 10) are replaced by the seven numbers she named here (Audit
5, Plan 5, Build 15, Pilot 5, Revision 10, Deploy 3, Hypercare 7,
`PHASE_DAY_DEFAULTS`, `shared/waves.ts`), and every one of them, on every wave's own
Settings panel too, is now a WORKING day rather than a calendar one. One shared helper,
`shared/working-days.ts` (`addWorkingDays`, `workingDaysBetween`, `workingDaySpan`,
`isWorkingDay`), Monday through Friday, a weekend start rolling forward to the next
Monday before it counts, is the one arithmetic every day count in this app now reads
through. `wave-phase-days-panel.tsx`'s own unit label reads "working days" instead of
"days," with one line under the seven rows, through `t()`, saying "Monday to Friday,
weekends are not counted."

**The prefill.** `sprint-form-dialog.tsx`'s phase form (`prefillEndDate`) fills the end
date in, still editable, the moment a type is chosen and a start date is in hand, or a
start is picked with a type already chosen: the start plus that wave's own day count for
the type (its `phaseDays` row, off the wave detail door the "Plan a phase" dialog already
holds), falling back to the placeholder default where the wave carries no row of its own.
It never overwrites an end date a person has typed by hand, tracked from the moment their
own pick lands on the end field, not from this effect's own write.

**The Timeline.** `waves-screen.tsx#buildWaveTimelineRows` draws an undated, active
phase's own expected span end to end from the previous phase's end (the wave's own
recorded end once a dated phase exists), or the wave's own start, or today, using that
phase type's day count, toned "expected" (`record-timeline.tsx`), a lighter fill than a
dated phase's real state, and titled with the word "Expected." A wave carrying only
undated phases now reaches the axis at all, where before it was left off entirely. The
wave's own forecast total, `waveExpectedWorkingDays`, sums every active phase's own
working-day length (a dated phase read back as its real span, an undated one off its own
day count) and shows on the wave's own head, a new "Expected length" row on its Overview
tab.

**The burndown's ideal line.** `storyBurndown`'s (`workers/content/src/lib/stories.ts`)
ideal line now falls only on working days, flat across a Saturday or a Sunday inside the
phase, off the same `isWorkingDay` the rest of this ruling reads through.

**VALIDATED 21 Sep 2026.** Aurora reviewed staging this round and confirmed phase days are working days (Monday to Friday), the prefill with the team default phase days, and the Timeline's expected spans, including the Waves main page module settings gear.

**Status: validated, 21 Sep 2026.** Defaults changed, `shared/working-days.ts`
added with its own unit tests, the prefill wired and tested, the Timeline's expected spans
and the wave head's forecast total built and tested, the Settings panel's copy changed and
its test updated, the burndown's ideal line fixed and tested, strings seeded (de/es/ca).

**Law.** None new. Governed by R33 (every extracted position asks for its translation) for
the panel's new unit label and explainer line, and R28 (the translation catalogue) for
every new sentence this ruling adds.

**AMENDED 21 Sep 2026: settings needed a door of its own.** Aurora, verbatim, on the
wave's own phase days: *"missing the settings button in waves to adjust that!!!"* The
Settings panel sat inline on the Overview tab, under "Expected length," and she could not
find it there. It now opens from a gear button in the wave head's own actions row, beside
the "..." overflow trigger, the same fold `shared/web/head-actions.tsx` already gives
`task-detail.tsx` and `help-detail.tsx`, into a slide-in sheet titled "Settings" holding
the same seven rows, the same Monday-to-Friday line, and the same Save and Cancel this
entry already describes. `WavePhaseDaysPanel` (`wave-phase-days-panel.tsx`) is unchanged in
substance; it draws no Card and no "Settings" heading of its own any more, since the sheet
now says that once. The Overview tab keeps "Expected length" and draws the panel nowhere
else. `web/test/wave-phase-days-panel.test.tsx` covers the panel and the new
`WavePhaseDaysSheet`; `web/test/wave-detail.test.tsx` covers the gear opening it.

**AMENDED 21 Sep 2026: the MODULE's own gear was still missing.** Aurora, verbatim: *"i
still dont see the gear button on main page waves."* The gear the amendment above built
opens a single WAVE's own phase days; she meant the Waves MODULE's own main (sidebar)
screen (`waves-screen.tsx`), which — unlike every other module with something to set —
carried no `<ModuleSettingsGear>` at all, R61's own two-door law standing unmet on this one
module since the day the gear pattern shipped. Two things landed together, because R61
holds them to one derivation: **(i)** `waves-screen.tsx`'s own `<CollectionHeading
sectionKey="waves">` gains `action={<ModuleSettingsGear teamId={teamId} segment="waves"
/>}`, the door out, last (and only) control in the action slot. **(ii)** `MODULE_SETTINGS`
(`module-settings-screen.tsx`) gains a `"waves"` entry, one section, a new FOURTH `kind`
(`"phaseDays"`, beside `vocabulary`/`automations`/`meetingTypes`) — a team-WIDE default,
never a `selectable_data` group and never a switch — its own "Phase days" tab, drawn
through `TeamPhaseDayDefaultsPanel` (`wave-phase-days-panel.tsx`), the identical seven-row
`WavePhaseDaysPanel` body the per-wave sheet already draws, now standing on its own `Card`
(R67 — a titled section stands on paper) rather than the sheet's own surface. **A new
wave's per-wave days now start from the team's own default, not the code constant
directly** — `PHASE_DAY_DEFAULTS` (`shared/waves.ts`) is the fallback OF the fallback,
read only where the team has never set one either. Stored in the existing `automations`
table (`workers/tenancy/src/lib/automations-config.ts`), module `"waves"`, reserved key
`"phaseDayDefaults"` — the same shape `setAutomationOverride`'s own `overrides` key
already takes in that column, so no migration was needed. Two new tenancy doors, `GET`/
`POST /api/tenancy/waves/phase-day-defaults` (`work:read`/`work:update`, refusing a portal
caller like every other wave door), and their MCP counterparts,
`get_wave_phase_day_defaults`/`update_wave_phase_day_defaults`. The per-wave Settings
sheet is unchanged — its own row still wins over the team default the moment somebody
sets one. Tested: `workers/tenancy/test/waves.test.ts` (the team default itself, and that a
new wave reads it before the code's placeholder), `web/test/wave-phase-days-panel.test.tsx`
(`TeamPhaseDayDefaultsPanel`), `web/test/module-settings-waves-phase-days.test.tsx` (the
page renders the seven rows and saves), `web/test/waves-screen-settings-gear.test.tsx` (the
module screen's own gear); strings seeded (de/es/ca).

---

### B47: task delete, the tick-off renamed "Done" and made mango, and the form's field order

**The ruling.** Aurora, verbatim, 21 Sep 2026: *"i need delete actino for tasks on the ...
button"*; *"in task the main buton is mark as odne, tick it off. finde shorter
alr¡ternative for the word, and make the button mango"*; *"on task add/edit the priority
setting put it under title. omve deadline above whos doing it."*

**What changed.** The task detail head's "…" menu gains a Delete item, confirmed through
the app's `useConfirm` pattern (`shared/web/use-confirm.tsx`) and a soft delete: `POST
/api/content/tasks/delete` (team migration 0113, `deactivated_at`/`deactivator_*`, the
same shape `delete_help_reply` already gave a reply one module along) — nothing is
removed, the row and its history survive, it stops appearing on every view and every one
of their counts. The main head action is the tick-off, one word, "Done" (matching the
story and ticket states, R34), drawn with the kit `Button`'s default variant (mango,
R84), first in the head actions row and its folded menu, while the task is open; once
done it reads "Reopen" as a secondary. It shows disabled, with a `Tooltip` explaining why,
while a work log against the task has no end — *"cannot mark anything as closed... if
there's an active time log running,"* her same-round ruling, held at the door too
(`setTaskDone` answers 409, "Stop the timer first."). The task add/edit form's field order
is now Title, Priority (right under the title), Deadline, Assigned to (who's doing it),
then the rest (Detail, Department, the App/Account picker the department reveals, the
file).

**Status: ruled and shipped, 21 Sep 2026.** Door, migration, MCP tool (`delete_task`) and
UI built and tested; strings seeded (de/es/ca).

**Law.** None new. Governed by R84 (mango lives only in a screen's own title component's
action slot) and R98 (every button the kit's own default size).

---

### B48: account first on the app form

**The ruling.** Aurora, verbatim, 21 Sep 2026: *"when creating app, first thing should be
to select account."*

**What changed.** `AppFormDialog`'s (`web/components/apps/app-form-dialog.tsx`) two
fields swap places on a NEW app: the account picker ("Whose system it is") is now the
first field on the form, above the name field, and the dialog opens with focus already
on it — `RecordPicker` grew an `autoFocus` prop for this (`web/components/records/
record-picker.tsx`, forwarding the native attribute onto the kit `Button` its trigger
already is). The name field's own `autoFocus` is now conditional on the OTHER branch:
an EDIT never shows the account picker at all (whose system it is cannot be changed once
recorded — see this field's own long-standing comment), so the name field keeps the
dialog's opening focus there, exactly as before. Only one field may hold it at a time.

**Status: ruled and shipped, 21 Sep 2026.** Proved by
`web/test/app-form-account-first.test.tsx`: the account `Field` sits before the name
`Field` in document order on a new app; the dialog opens focused on the account picker's
trigger (`#app-account`), never the name input; and on an edit, where the account field
never renders, the name field carries the opening focus instead.

**Law.** None new. A field-order and focus fix within the existing F-series form rules
(F2/F9, the dialog's own three-row grid).

---

### B49: the task slide-in

**The ruling.** Aurora, verbatim, 21 Sep 2026, over the side-by-side proposal at
`task-slide-in-design.html`: *"implement the slide-in design for tasks, only 1 change:
the start button on the left and the done on the right (keep done yellow). remove the
status chip and replace for priority chip."*

**What changed.** A task no longer opens a full tabbed page. Clicking a row, a board
card, a calendar entry or a week entry opens a slide-in sheet over the task list
(`web/components/work/task-sheet.tsx`), the kit's own `Sheet`/`SheetContent` at the same
`clamp(26.25rem,34vw,40rem)` width every other panel-form settles on — one screen, no
tabs, everything that used to be Overview and Work logs reading top to bottom in a
single scroller. `/t/<teamId>/tasks/<id>` still opens it: the URL's own record id drives
the sheet (`TasksScreen`'s `openTaskId`), so a deep link and a click land on the same
address. The old tabbed detail component, `web/components/work/task-detail.tsx`, is
**deleted, replaced by the sheet** — not kept as a redirect, since a sheet needs no
separate screen to redirect to.

Top to bottom: the title row (the task's title, no status chip, a priority chip instead,
drawn with the kit's `Badge variant="status"` over `PRIORITY_DOT_TONE` — K19a's own
named exception to R86 — and the "…" menu carrying Edit and Delete, always visible,
never folded, because a fixed-width sheet is never wide enough to need
`HeadActionsFoldMenu`'s responsive split); the actions row, **Start on the left, Done on
the right** (the one change Aurora asked for over the proposal, which had drawn Done
first) — Done stays mango (R84), disabled with "Stop the timer first." while the task's
own clock runs (R99's mirror, the identical refusal `task-detail.tsx` carried); Assigned
to, as the read-only Stakeholders-style tile (`PersonCard orientation="horizontal"`, the
same face+chip+name shape `help-stakeholders.tsx`'s `StakeholderTile` draws); Priority
and Deadline as fact rows (`OverviewList`); Description; Work logs (the Effort card
another lane is extracting into `web/components/work` for stories and tickets does not
exist yet, so this mounts `WorkLogsPanel` read-only — `canLog={false}`,
`showAddButton={false}` — until it does); and the dark Latest activity / Record band
(`RecordFooterBand`) at the very end, the sheet's own last element. The sheet scrolls as
one region — the R91 sheet exception, nothing pinned inside it.

**VALIDATED 21 Sep 2026.** Aurora reviewed staging this round and confirmed the task slide-in sheet with Assigned to, Details and Deadline merged into one container.

**Status: validated, 21 Sep 2026.** Proved by `web/test/task-sheet.test.tsx`: the
sheet opens from a row click and from a deep link with no click at all; the section
order top to bottom; the priority chip renders and no status chip does; Start precedes
Done in the actions row's own DOM order; Done disables while a timer runs; Delete sits
in the "…" menu; the footer band is the sheet's own last element. `web/test/
head-actions-fold.test.tsx` and `web/test/head-actions-everywhere.test.ts` are amended
for the retirement of `task-detail.tsx`'s own responsive fold (a sheet has one menu, not
two definitions of one).

**Law.** None new. Governed by R91 (the sheet's own scroller, the law's named overlay
exception), R99 (no record closes while its own clock runs, mirrored in the Done
button's tooltip), R84 (mango lives only in the screen's own title action slot — Done
keeps it, Start is `variant="secondary"`), R98 (the kit's own button sizes, never
`size="sm"`) and K19a (the priority chip's own four colours).

**Amended, 21 Sep 2026.** Aurora, verbatim, reading the sheet back: *"on slide in detail
pages, the ... button must be aligned with title, not with pills. priority is already a
chip, remove it from above deadline. assigned to needs a background, same description,
same deadline. description and deadline same design. bring the pencil icon out of the
..., next to it. if no time logged yet, hide that component. when time logged, as i said
before, i want to see the avatar in each row."*

Five changes to `task-sheet.tsx`. (1) The "…" menu moves off the chips row onto the
title row, right of the title text and vertically centred with it, never with the
priority pill above. (2) Edit leaves the menu for its own icon button (`size="icon"`,
R98), `variant="secondary"`, beside the "…" on that same row — the menu now carries only
Delete. (3) The Priority fact row is gone from the `OverviewList` below: the title row's
own priority chip already says it. (4) Assigned to, Description and Deadline become
three sections of ONE design — each a kit `Card` standing on the panel background, a
small title, the content — the exact shape `TicketSidePanel`
(`web/components/tickets/ticket-detail-body.tsx`) already draws for the ticket's own
side panels, reused here rather than rebuilt; Assigned to keeps its own eyebrow tile
(the Stakeholders-style `PersonCard`) inside its card, and Deadline moves out of the
fact-row list into its own matching card, with "No deadline set." as its own fallback
sentence. (5) The Effort card's own emptiness and its per-row avatar are the shared
`EffortCard`'s (`web/components/work/effort-card.tsx`) own job, owned by another lane —
the sheet only mounts it, unchanged, exactly as before.

**Status: amended and shipped, 21 Sep 2026.** Proved by `web/test/task-sheet.test.tsx`:
the title row holds the title, the Edit pencil and the "…" menu, in that order, aligned
with the title rather than the chips row; the "…" menu opens on Delete alone, no Edit
item; no Priority fact row renders anywhere on the sheet; Assigned to, Deadline and
Description render as three cards of the one `TicketSidePanel` shape, in that order; and
the Effort section is absent when the task carries no logged time.

**Amended again, 21 Sep 2026.** Aurora, verbatim, reading the three-card version back:
*"great work. however merge assigned to details and deadline in the same container
together (in this order)."*

The three matching `TicketSidePanel` cards above (Assigned to, Deadline, Description)
become ONE card — the same `TicketSidePanel` `Card`, called once rather than three
times — holding, in this order: Assigned to (the eyebrow tile, its own "Assigned to"
chip label standing in for a section heading, so none repeats it), Details (the
description, renamed off "Description" now that it sits inside the merged card), then
Deadline. The kit's own `Separator` sits between each of the three parts; no nested
cards. The File row keeps its own place, immediately after the merged card, exactly
where it sat after the old Deadline card.

**Status: amended and shipped, 21 Sep 2026.** Proved by `web/test/task-sheet.test.tsx`:
the merged card renders as ONE kit `Card` (`data-slot="card"`, singular, inside the
wrapper); Assigned to, Details and Deadline sit inside it in that order; exactly two
`Separator`s divide the three parts; and the section order top to bottom stays title
row, Start/Done, the merged card, Effort, the footer band last.

---

## 6. Forms and dialogs

### F1: every submit button says "Submit"

One word, every form, both front doors. This replaces 30 distinct labels currently in
use, including "Save changes" (13 sites), "Add it" (7), "Save" (4), "Create role",
"Add value", "Add source", "Add file", "Add contact", "Add account",
"Add step", "Record it", "Map it", "Start it", "Log it",
"Share it", "Send it", "Send it from kwapso", "Send and resolve", "Send invite",
"Ask and email", "Raise ticket", "Give access", "Save profile", "Email me a code",
"Continue", "Start my own team".

The busy label is "Submitting…" everywhere, replacing "Saving…", "Sending…",
"Creating…", "Adding…", "Sharing…", "Raising…", "Switching on…".

Implement by giving `FormShell` a footer it renders itself rather than by editing 37 call
sites one at a time. The library's own `Form` collection already defaults
`submitLabel: "Submit"` (`shared/ui/components/form/form.tsx`),
so this aligns the host with the library rather than diverging from it.

Evidence: `P-4.10.31` and `P-4.10.36`, the portal's New Ticket form. The button says
**Submit**, with **Cancel** beside it. It is the only form in either old app.

### F2: the dialog is a three-row grid and never spills

This fixes the reported bug directly. `shared/web/form-shell.tsx` currently renders a
flat `flex flex-col` with no height bound, so a tall form pushes past `DialogContent`.

```tsx
<form className="grid max-h-[85dvh] grid-rows-[auto_1fr_auto]" onSubmit={onSubmit}>
  <div className="flex flex-col gap-1.5 px-6 pt-6 pb-4">{title}{subtitle}</div>
  <div className="overflow-y-auto overscroll-contain border-t px-6 py-5">
    <div className="flex flex-col gap-4">{children}</div>
  </div>
  <div className="bg-card flex flex-wrap justify-end gap-2 border-t px-6 py-4">{footer}</div>
</form>
```

`85dvh` rather than `85vh` so the mobile browser chrome does not clip the action row.

Evidence: `P-4.10.31` (desktop: a fixed header, a scrolling body, an action bar pinned at
the bottom of the sheet) and `P-4.10.36` (mobile: the same, as a bottom sheet with a drag
handle and a sticky Cancel/Submit bar).

### F3: the separator becomes the action bar's top edge

The two `<Separator />` elements at `form-shell.tsx:40` and `:42` are replaced by
`border-t` on the two regions that follow them, as in F2. A hairline that is the top edge
of a padded bar can never collide with the button inside it, at any type scale. This
retires the `pt-6` workaround and its 11-line comment at `form-shell.tsx:43-53`, which
documents the collision being fixed here.

Note that `form-shell.tsx` is the only file in either front door importing
`primitives/separator`, so this change removes the app's last use of it. That is correct:
a separator is a divider between peers, and a form's action bar is not a peer of its
fields.

Evidence: `P-4.10.31`, `P-4.10.36`. The old form has no free-standing rule anywhere; the
bar's own edge does the work. Also the code comment cited above, which records the owner
reporting the collision on staging in August 2026.

### F4: Cancel sits beside Submit, and its position flips on mobile

> **AMENDED (2026-08-31): the shipped order is Cancel before Submit, right-aligned, and it
> does not flip on mobile.** The client's own pass over `FormShell`, verbatim: *"on
> add/edit - also put the cancel button there. I know I can click out, but also add it."*
> `FormShell`'s action bar (`shared/web/form-shell.tsx`) draws a real Cancel control for the
> first time, mirroring the kit's own `form.tsx` Cancel call site — `variant="cancel"`,
> rendered, in the file's own words, "BEFORE its submit button" — inside one row,
> `flex items-center justify-end gap-2`, the same order and the same alignment at every
> width. There is no responsive flip in the shipped shell: the old-app evidence below (this
> rule's founding source) described a mobile reversal this shell never drew, and the
> dated, sourced ruling above is the later and more specific fact. Read this note before
> acting on the paragraph beneath it.

Old rule, kept as history: desktop was Submit then Cancel, right-aligned; mobile was
Cancel left, Submit right, both `flex-1`.

Evidence for the old rule: `P-4.10.31` (desktop, Submit then Cancel) and `P-4.10.36`
(mobile, Cancel then Submit, each half-width). The old app deliberately reversed them, so
the destructive-ish option was never under the thumb's resting position on a phone — a
concern the shipped shell answers a different way instead (Cancel is `variant="cancel"`, a
quiet dismissal, never styled as the destructive action).

### F5: a field is label left, requirement right, control below

```tsx
<div className="flex items-baseline justify-between">
  <Label className="font-medium">{label}</Label>
  {required && <span className="text-muted-foreground text-xs">Required</span>}
</div>
```

Evidence: `P-4.10.31`, `P-4.10.36`. Every field in the old form carries "Required" as a
small grey word on the right of its label. This app currently marks required fields with
a `.required-ring` and no words.

**AMENDED 17 Sep 2026 — Fact rows for every form's fixed properties.** The client's ruling,
verbatim: *"Keep the fact rows, but make sure they appear everywhere."* One primitive
component `shared/web/fact-row.tsx` implements the label-left, fact-right layout for every
form's fixed, read-only properties (a record's own story, time, sprint, help, meeting, wave,
process, todo — the parent that opened the edit form). Where a form renders a `fact-row`
component with a `fixed` parent type, the layout is one line (label and value) with no
control, and the value sits inline with the label's own line, never below it like an
editable field. Derived test: `web/test/fixed-props-are-fact-rows.test.ts`.

### F6: a character-limited text field shows its counter under the input, right-aligned

`text-xs text-muted-foreground`, format `0/50`.

Evidence: `P-4.10.31`, `P-4.10.36`.

### F7: a short enumerated choice is a row of chips, not a select

Three to five options with a glyph each become pill buttons. Six or more stay a `Select`.

Evidence: `P-4.10.31`, `P-4.10.36`, the Type field: Request, Question, Issue as three
outlined pills, each with its type glyph. They wrap to two rows on mobile rather than
becoming a dropdown.

### F8: the form's explanatory note is a muted callout at the top, inside the scroll region

Never a floating tooltip, never a subtitle longer than one line.

Evidence: `P-4.10.31` (the "Please fill in all fields carefully…" grey box) and
`P-4.09.52`. See [C9](#c9-an-informational-callout-is-muted-not-coloured).

### F9: a dialog on a phone is a bottom sheet

Below `sm`, use the library `Sheet` with `side="bottom"` and a `rounded-t-3xl` top, not
a centred `Dialog`. Keep `FormShell` inside it unchanged, which keeps R4 satisfied.

Evidence: `P-4.10.36`, `A-3.58.16`. Both old apps present forms as bottom sheets on a
phone, with a drag handle.

### F10: a form is a slide-in; a warning is an overlay

**The rule.** The client, over a screenshot of the "New access token" dialog: *"This should
be a slide-in, like all the other screens. The only ones that are overlays are the
warnings, such as archive or delete, and so on."*

- A surface that **collects** — a form, an editor, a picker — is the kit's `Sheet`. It
  slides in from the inline end on desktop and, below 45rem, becomes the bottom sheet
  capped at 85dvh that [F9](#f9-a-dialog-on-a-phone-is-a-bottom-sheet) asks for.
- A surface that **asks a yes/no question about something that already exists** is an
  `AlertDialog`, centred.

**The rule is written the other way round from how you would read it**, and that is
deliberate: nothing tries to recognise a form, because a pattern that decides what a form
looks like has a hole the week somebody writes one differently. Instead **every centred
overlay** in either front door needs a written reason on file (`CENTRED_DIALOG_OK`). A new
form reaches for a `Dialog`, has no line, and is red on the day it is written. Detecting
the fault directly was tried first and found four of the five live cases — it missed a
picker outright, because a radio group and an onClick that writes is a form with no
`<form>` in it.

**What it costs.** The kit's own `presentation` prop looks like the answer and is not: of
its four values, `overlay` and `responsive` are both CENTRED on a desktop, `sheet` is a
bottom sheet on a 1920 monitor, and `fullscreen` is a page. So a centred overlay is a
finding whatever it carries, and the shape she asked for is a different component.

**And an exemption cannot be used to smuggle the thing back**: an exempt overlay that grows
form machinery — a `<form>`, a `FormShell`, a `<Field>`, an `<Input>` — turns the build red
where it stands.

**Two entries are open questions rather than settled exceptions**: a read-only usage panel
and a record calendar are neither forms nor warnings, and she has ruled on neither.

**Law.** [R59](../RULES.md) (`forms-are-not-overlays`).

---

### F11: staff is picked from a pill row, never a dropdown — and the signed-in user starts selected

**The rule.** The client's ruling, 15 Sep 2026, verbatim: *"On Add Task and generally
absolutely everywhere where we are selecting staff, do the horizontal choices, not the
dropdown. By default, in all of these where I'm selecting staff, always put the user
preselected by default."*

Every field that picks a team member — an assignee, an account manager, an app's staff and
lead, a ticket's stakeholders, who is on triage duty — draws through `StaffPillPicker`
(`shared/web/staff-pill-picker.tsx`), the same pill idiom [F7](#f7-a-short-enumerated-choice-is-a-row-of-chips-not-a-select)
already names, but unconditional: unlike a glyph choice, a staff list is never
"six or more, so fall back to a `Select`" — it wraps to as many lines as it needs and stays
pills whatever the team's size.

- **One person** (an assignee, a lead, an account manager): `role="radiogroup"` of
  `role="radio"` pills. **A staff picker never offers Nobody** — the client's second
  ruling, 16 Sep 2026, verbatim: *"Kill the 'nobody' option for staff. If we leave it
  empty, it's not an option. Remove it from tasks and everywhere else. This 'nobody',
  just kill it."* The component's own `allowNobody`/`nobodyLabel` props are gone, not
  merely unused — there is no click left inside `StaffPillPicker` that can clear a
  single-mode selection.
- **Several people** (an app's staff, a ticket's stakeholders): `role="group"` with
  `aria-pressed` on each pill. Already-set, un-removable people (R54's ADD-ONLY sets) show
  pressed and disabled rather than being left off the row.
- Every pill wears the person's own `RecordMark` (round — a person in their own right,
  never a client/app square) and their **first name alone**: a name disambiguated with an
  email in parens (two colleagues sharing a first name) keeps the face as the
  disambiguator on a pill, not a longer string.
- A→Z by name, locale-aware, called once inside the component — no call site can forget it
  ([K17](#k17-the-options-a-control-offers-are-a-to-z-in-the-readers-own-language)'s own
  seam).

**The default.** On a **create** form, the field opens with the signed-in user's own pill
already selected — `TaskFormDialog`'s pre-existing `defaultAssigneeId`, and the same shape
added to `StoryFormDialog`, `AccountFormDialog` (account manager) and `AppFormDialog`
(staff and lead both). An **edit** form keeps the stored value; the signed-in user is never
substituted for one that is already there — **except** where the stored value is itself
empty (an old row from before this field existed, or from before the 16 Sep 2026 "kill
Nobody" ruling), where the signed-in user is the fallback there too: the killed "Nobody"
pill left no other state for an edit to open on, so `AppFormDialog`'s Lead field falls back
further still, to the first staffed person, when the signed-in user is not themselves
staffed on that app. An **action row that commits on the click** —
`TriageStrip`'s on-duty pick, the triage queue's own "who is picking this up?" rows (already
`RecordPicker`'s `layout="row"`, unaffected by this law) — has no submit step to preselect
into, so nothing there is preselected: a pill that looked already-chosen would be a click
that does nothing.

**Evidence.** The task form's own field ("Who's doing it") was the client's named example;
the account manager field, an app's staff checklist and lead, and a ticket's
`HelpStakeholders` add control were four more dropdowns/checklists this ruling converted
the same day.

**Reiterated, 16 Sep 2026, verbatim:** *"By default, every time they have to assign it to
someone, it needs to preselect the active user. For example, on the add story, it should
preselect the active user at the bottom."* An audit of every create form with a staff field
(task, story, account manager, an app's lead/staff) against every one of its call sites
found the four dialogs themselves already correct — including the story form's own
assignee, which already sits at the bottom of the form and already opens on the signed-in
user — but one CALL SITE had never been wired: `contact-detail.tsx`'s own
`<AccountFormDialog>` (the contact screen's edit dialog for the same account record
`account-detail.tsx`'s edit dialog already gets right) opened with no
`defaultAccountManagerId` at all, so an account with no manager on file opened this dialog
with nobody selected. Fixed the same day, and held down by a second census,
`web/test/staff-preselect-call-sites.test.ts`, over the CALL SITES rather than the dialogs'
own bodies: every `<TaskFormDialog>`/`<StoryFormDialog>`/`<AccountFormDialog>`/`<AppFormDialog>`
mount in `web/` must pass its dialog's `default*Id` prop. Three forms an assignment-shaped
field was checked for and genuinely has none — a ticket (routed through Triage's own
on-duty pick, already an action row this law exempts), a to-do/Input (addressed to a
client's account, never to a team member) and a meeting (no staff-attendee field at all) —
are out of this law's population, not a gap in it.

**Law.** [R79](../RULES.md) (`staff-pill-row`). A static census, `web/test/staff-pill-row.test.ts`:
no `<Select>` and no `<RecordPicker>` without `layout="row"`, on either front door, may be
fed a staff/member list (traced off `useAssignableMembers`/`assignableMembers`/`staffedOn`,
or a value typed `PickablePerson[]`) — including through a local picker-factory closure,
whose own JSX never names the list by its caller's variable.

---

### F12: a form carries no hints

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"You put too many explanations
and hints that are not necessary, especially on the forms, on the create and edit. Please,
can you delete all of that? I will give you a few examples, but I want you to clean it
everywhere. If we need hints, I will tell you explicitly, but by default, there are no
explanations, just the choice, text, or the form components."* Her two named examples were
both `FieldConfig.helpText` sentences: *"The system this work is on. Everything below is
narrowed by it."* (the story form's App field) and *"A recording, a page, a document
somebody can open."* (the story form's and the review dialog's file field). A create/edit
form shows the label and the control, nothing else — the label already says what a field
is.

- No `FieldConfig` object (`{ ...defaultFieldConfig, … }`) may set a non-empty `helpText`.
- No bare `<p>` sitting between a form's fields may hold one static explanatory sentence
  (`{t("…")}`, three words or more, `text-muted-foreground`).

**What survives, on purpose.** A validation/refusal message, shown only on a bad state
(`text-warning`/`text-destructive`, never `text-muted-foreground`); a placeholder that is
the field's own example value; a picker option's own differentiating description (`Choice`'s
`description` prop, telling two options apart — the choice's own words, not an explanation
of the field); and a field showing the record's own settled value where a control would
otherwise be (the "fact, not control" pattern — [F5](#f5-a-field-is-label-left-requirement-right-control-below)'s
own shape, one line with nothing to choose). A loading indicator ("Reading what's
attached…") is a status, not a hint, and is named in `FORM_HINT_OK` rather than taught to
the census as a fourth colour to special-case.

**What it costs.** Forty-nine `helpText` hints and a dozen bare-paragraph captions came out
across both front doors in one sweep — an account's own contacts panel that read "Nobody is
on this account's books yet.", a knowledge source picker that read "Nothing found in your
Google account.", a process step's Role field that explained why it had no roles to offer.
None of it was wrong information; all of it was a sentence the label and the empty control
already said without words.

**Law.** [R81](../RULES.md) (`form-carries-no-hints`). Two static censuses,
`web/test/form-hints.test.ts`, over the same `appFiles()` walk R33's
`wrapped-strings.test.ts` stands on: no `FieldConfig` literal sets a non-empty `helpText`,
and no file that renders a form (imports `FormShell`/`FormShellDialog`) draws a bare `<p>`
whose entire content is one static translated sentence. `FORM_HINT_OK`
(`shared/rules/registry.ts`) is the reasoned, rot-checked way out — empty, and meant to
stay that way, except for the one shape her own ruling names as a real exception: a hint
carrying something the user cannot know otherwise belongs in the CONFIRM dialog that asks
about the action, never the create/edit form beside it.

### F13: every create form with a staff picker preselects the signed-in member — everywhere, not just where it was checked

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"That's still not correct. For
example, on Add Story, I don't see myself preselected. Make sure you fix it everywhere, not
only here."* [F11](#f11-staff-is-picked-from-a-pill-row-never-a-dropdown-and-the-signed-in-user-starts-selected)
already states the rule; this ruling is the correction that the POPULATION it applies to
must be derived, never a hand-list somebody forgot a form on. Every create form with a
single-pick staff picker seeds the signed-in member as its default. The signed-in member is
ALWAYS OFFERED in the pill row even when the chosen app's staffing narrows everyone else out —
that was the actual Add Story gap on the Kwapso team: `staffedOn` (web/lib/members.ts) now
keeps the signed-in member; the story form and the ticket triage row use it.

**The check.** The population is DERIVED, not typed: `web/test/staff-preselect-call-sites.test.ts`
censuses every `*FormDialog` mount carrying a `default*Id` prop and requires it be passed at
every call site, over the call sites rather than the dialogs' own bodies — the shape that
caught `contact-detail.tsx`'s own `<AccountFormDialog>` opening with no
`defaultAccountManagerId`, the one call site among four that had never been wired. The
signed-in member's presence is verified by `web/test/assignable-members.test.ts` and
`web/test/story-form-scopes-to-the-tickets-app.test.tsx`.

**Law.** [R79](../RULES.md) (`staff-pill-row`) — see F11's own account of the census.

### F14: the automation sheet has no close button, and reads Module (with icon) above Description

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"That's kind of good. Remove the
X button to close it and put the module first, and underneath the description."* The
automation edit/view sheet closes by clicking the backdrop or pressing Escape, never a
drawn ✕. Its head reads the Module (with the module's own icon) first, and the Description
sits beneath it — the reverse of the order it shipped in.

**Law.** None registered.

### F15: once an account is chosen, the app field becomes a horizontal pill row of that account's own apps

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"when selecting app in cases
account has been selected first, show horizontal choice componet."* Where a form picks both
an account and an app, choosing the account first turns the app field into a pill row —
that account's own apps, each carrying its mark — instead of the plain picker
(`web/components/records/account-app-picker.tsx`). With no account chosen yet, the field
stays the existing picker; with an account chosen that has no apps of its own, the field
shows nothing and no hint explaining why (R81 — a form carries no hints).

**AMENDED 17 Sep 2026 — the app choice stays optional.** The client's ruling, verbatim:
*"When I'm asking a client for something under which account, it is optional to select an
app. Remember, when we already selected an account, this app choice must be in a
horizontal component."* Confirms the shape above and settles what it left open: the app
field is never required — a form may submit with an account chosen and no app picked —
the horizontal pill row it becomes once an account is chosen is still that same optional
field, never a forced choice.

**Law.** None registered — `AccountAppPicker` is a form field, held to R81 like any other.

### F16: an account picker on any add screen shows the account's icon and name, and nothing else

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"On all add screens, when I'm
picking an account, do only show me the icon and the name, no email or anything else."*
Every create form's account field draws the account's mark and its name, and drops every
other fact a picker option might otherwise carry — an email, a code, a status — the same
face-only reading [R35](../RULES.md) already asks of any record shown anywhere.

**Status: ruled, in build, 17 Sep 2026.**

**Law.** None registered — held to [R35](../RULES.md) (`records-carry-their-face`) like any
other record picker.

### F17: once an account is chosen, who a ticket gets assigned to is a horizontal pill row of that account's own contacts

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"Also, I want to be able to
select who this gets assigned to. Of course, it needs to filter the contacts of this
account, including the avatar and full name, in a horizontal choice component with
pills."* Once an account is chosen on a form that asks a client for something, the
assignee field is a horizontal pill row —
[F11](#f11-staff-is-picked-from-a-pill-row-never-a-dropdown-and-the-signed-in-user-starts-selected)'s
own pattern, read onto a different roster — narrowed to that account's own contacts, each
pill carrying the contact's avatar and full name. With no account chosen yet the field has
no roster to filter and stays the existing picker, the same fallback
[F15](#f15-once-an-account-is-chosen-the-app-field-becomes-a-horizontal-pill-row-of-that-accounts-own-apps)
takes for the app field beside it.

**Status: ruled, in build, 17 Sep 2026.**

**Law.** None registered.

### F18: a title fits one line on a MacBook Air

**The rule.** The client's two rulings, 18 Sep 2026, verbatim: *"for all titles (main,
details, all) i would like to limit the lnght to what would fit in 1 line in a laptiop.
this menas a max charactes for titles in the forms (not sutting it) wdyt? and ow many
cahracters would taht be? consider text size regualr and the monitor size of a
macbook"* — and, shown a side-by-side of three enforcement options: *"for title lenght.
set this limit considering macbook air, enforce with e3."* Every title-shaped field (a
ticket's Title, a story's and a task's "What needs doing", a meeting's "What it is
about", a wave's and a sprint's name, an app's "What it's called", an account's Name, a
knowledge source's "What is it called?", and a to-do's "What we need from them") is
capped at `TITLE_MAX_CHARS` characters — 50 — and a title already longer than that,
written before the ceiling existed, is truncated with an ellipsis wherever it is drawn
on one line rather than rejected.

**The number.** Canvas-measured, not guessed (artifact "Title Length"): how many
characters of regular-weight text fit on ONE LINE, at MacBook Air width (1440×900), in
the app's three one-line title steps — the record heading (64 characters fit), the
collection heading (65), the list title cell (57). The narrowest of the three, rounded
down for a margin (a shorter monitor, a wider character, a translated word running
longer than the English one): 50. One constant for all three rather than three separate
ceilings, because one title moves between all three renderers — a ticket is a record
head on its own screen and a list cell in Tickets — and a field that fits its narrowest
home fits every home.

**E3.** The client's own shorthand from the side-by-side that settled this: the THIRD of
three enforcement options offered — a hard cap in every form (the input's own
`maxLength`, so the 51st character never types) plus an ellipsis fallback for a record
that already exceeded the ceiling before it existed. Not E1 (truncate silently, no cap)
and not E2 (cap only, no fallback for old records).

**The counter.** [F6](#f6-a-character-limited-text-field-shows-its-counter-under-the-input-right-aligned)'s
own format, `0/50`, drawn now through the kit `Field`'s own `count`/`countMax` footer
slot rather than a hand-built line under the input — a NUMBER, not a sentence, so it is
not a hint under [F12](#f12-a-form-carries-no-hints)'s ban.

**What is a title and what is not.** A dropdown VALUE (a Choice) is not a title. A
ROLE's name, a PROCESS's name and a STEP's name are named records of their own, but
outside this ruling's worked examples and the canvas measurement, and are left
uncapped. A PERSON's name is not a title — the client's own distinction, carried into
the law — so the contact-creation field ("Marta Bergman") is untouched.

**Status: ruled, in build, 18 Sep 2026.**

**Law.** [R87](../RULES.md) (`title-length`). A source census over the form field
configs (every `FieldConfig` literal for a title field sets `validation.maxLength` to
`TITLE_MAX_CHARS` and its `<Input>` carries the same `maxLength`) and over the matching
write doors (`requireText`/`optionalText` capped at the same constant, positionally,
R20's own discipline); a render assertion that every one-line title renderer —
`clampRecordHeading` (`shared/web/record-heading.tsx`), `CollectionHeading`, and
`RecordTable`'s own first column — truncates with an ellipsis and keeps the full title
reachable through its `title` attribute.

**AMENDED 18 Sep 2026 — an imported title is kept whole.** Shown the choice between clamping
an imported title on the way in, leaving it uncapped, or refusing it outright, the client's
ruling, verbatim: *"l1."* **I1**: the fifty-character cap binds what a person TYPES — every
title field's `maxLength` and its matching write door stay exactly as ruled above — but a
title that arrives already written somewhere else, from a FILE NAME (a knowledge upload with
no typed title of its own) or from a Google import (Drive, Gmail, Calendar, Chat), is kept
WHOLE on write, uncapped, and is only ever shortened where a one-line renderer already
truncates any other title — never rejected, never clipped at the door.
`postUploadKnowledgeFile` (`workers/content/src/routes/knowledge.ts`) already reads this way:
a caller who posts no `title` falls back to the file's own (uncapped) `fileName` rather than
to a value `TITLE_MAX_CHARS` would have refused — this amendment writes that shape down as the
rule rather than leaving it an accident of the fallback's own order.

**Law.** R87's own amendment (`title-length`), no new rule number.

**AMENDED 21 Sep 2026: an imported KNOWLEDGE title clamps; an imported ticket or story
title still does not.** Aurora's own words, verbatim: *"imported knowledge titles are
clamped on import at 50, imported ticket and story titles stay whole (I1)."* This narrows
the 18 Sep I1 amendment above rather than replacing it: I1's WHOLE-on-write protection now
belongs to a ticket's and a story's own title alone (the `ticket` and `story` kinds in
`INGEST_KINDS`, `workers/content/src/lib/knowledge-ingest.ts`, both left untouched). Every
other title that arrives already written somewhere else and lands in the knowledge base's
own `title` column, a knowledge upload's file-name fallback, every OTHER mirrored kind
(account, contact, app, process, sprint, meeting, todo, task, person, dropdown,
portal_login), a Google import (Drive, Gmail, Calendar, Chat), and the glossary's own
seeded words, now CLAMPS to `TITLE_MAX_CHARS` on the way in instead of being stored whole.
One shared helper, `clampTitle` (`shared/clamp-title.ts`): the first 49 characters plus a
single ellipsis character (U+2026) so the cut is visible, a trailing space trimmed before
the ellipsis, and the cut moved back to a nearby space (within the last 12 characters)
rather than landing mid-word where one exists. The typed form is unmoved by this amendment
either: a person-typed title over the cap is still refused, in words, at the same doors
(`requireText`/`optionalText` against `TITLE_MAX_CHARS`); nobody types their way into a
clamp, they shorten it themselves.

**Law.** R87's own amendment (`title-length`), no new rule number.

---

## 7. Typography

### T1: one heading scale per front door

| Level | Agency (`web/`) | Portal (`web-portal/`) |
|---|---|---|
| Screen title `<h1>` | `text-2xl font-medium tracking-tight` | `text-3xl font-medium tracking-tight` |
| Section `<h2>` | `text-lg font-medium` | `text-lg font-medium` |
| Field group label | `text-xs font-medium uppercase tracking-wide text-muted-foreground` | same |
| Body | `text-sm` | `text-base` |
| Meta | `text-xs text-muted-foreground` | `text-xs text-muted-foreground` |

Note the weight: `font-medium`, not `font-semibold`. The brand loads exactly two weights,
Saans Light 300 and Saans Medium 500 (`styles.css:26-49`, `brand.css`
`--font-styles--heading: Saans`), so `font-semibold` (600) has no face and the browser
synthesises it. There are 26 raw `<h1>` tags in the repo, all `font-semibold`, and the
portal's `<h2>` alternates `font-medium` and `font-semibold` between four files. This
table settles it.

Evidence: a weight census of the brand stylesheet returns `font-weight: 300` in 77 rules
and `500` in 70, and nothing else outside Webflow's own normalize boilerplate. The body
font and the heading font are literally the same token there
(`--font-styles--body` and `--font-styles--heading` both resolve to `Saans, Arial, sans-serif`),
so the entire brand is one family in two weights. A third weight is not a styling
decision, it is a font the library would have to ship.

### T2: `--text-xs` is 14px and that is the floor

`styles.css:216` sets `--text-xs: 0.875rem` and calls it "the kwapso floor". Never write
`text-[11px]` or `text-[10px]`. The two places that do today
(`app-shell.tsx:388`, the mobile tab labels at `text-[11px]`) should move to `text-xs`.

### T3: uppercase is only ever a label, never a title, never a table column head, and never a sentence

`tracking-[0.5px] uppercase` at `text-xs font-medium` marks an eyebrow or a field group.
Nothing longer than three words.

Evidence: `A-3.57.42`, `A-4.05.42`, `A-4.05.52`, `P-4.10.19`. The old app never
uppercases a title. On the brand site `text-transform: uppercase` appears in exactly ten
rules and every one of them is a small label (`.nk-subheading`, `.contact-form__label`,
`.cs-header__back`, the language switcher); the 120px hero headline is sentence case.
Letter-spacing of 0.5px is the house default there, applied in 43 rules and explicitly
reset to `normal` on display sizes, which is why it belongs on labels and not on titles.

**AMENDED 17 Sep 2026 — a table column head is off this list too.** The client's ruling,
verbatim, over the Choices table's Details column: *"why all caps? 'Details' pls."* Her
screenshots the same session showed every table header in the app drawn ALL CAPS — Roles'
MODULE / ADMIN / CLIENT, Contacts' ACCOUNT / ROLE / PORTAL — so the ruling reads as general
rather than one column: a column heading is sentence case, exactly as its call site wrote
the word, never transformed to capitals. `shared/ui/components/table/table.tsx`'s
`TableHead` (the primitive every column head in this app draws through — `RecordTable`,
`screen-renderer.tsx`'s `DataTable` mount, `Matrix`, `PermissionMatrix`) drops `uppercase`
from the `<th>` itself (kit v1.2.108); `data-table.tsx`'s own sortable-header button, which
used to restate the transform because a `<button>` resets an inherited `text-transform`,
drops it too. One app-side echo survived the kit fix and is fixed alongside it:
`roles-matrix.tsx` drew the Roles screen's own ROLE column heads as its own `<button>` (the
kit's `<th>` belongs to `PermissionMatrix`, in a different file, so this app can only hand
it a label) and explicitly restated `uppercase` "to unify with Module" — the old ruling
this one reverses.

**Law.** None registered — `web/test/column-headers-are-sentence-case.test.ts` carries two
censuses (every `<th>`/`<TableHead>` this app writes directly, and the one
`React.ReactNode` column-head label an app file authors for a kit component that draws its
own `<th>`, `roles-matrix.tsx`'s `roleRows[].label`) plus a CSS clause forbidding
`text-transform: uppercase` on any selector under `web/`, `web-portal/` or `shared/web/`.

### T4: numbers and dates are `tabular-nums`

Any column of durations, counts, prices or dates gets `tabular-nums` so the digits line
up.

Evidence: (inferred) from `A-4.06.12`, where the Worklog MEMBER/DURATION columns are
clearly aligned on the digit.

### T5: a long title wraps to two lines and clamps; it never truncates on one

```tsx
<h1 className="line-clamp-2 text-2xl font-medium tracking-tight">{title}</h1>
```

`help-detail.tsx:410` currently uses `truncate` on a single line, which hides the end of
every real ticket title.

Evidence: `A-4.05.52` and `A-4.06.01`, where the story title "Rename field 'Austritt/ÜL-Ende'
to 'DV-Ende' on the placement creation screen" wraps to two lines on desktop and three on
mobile, complete.

### T6: Serrif Condensed is not used in product UI

The second brand face is for taglines and pull quotes on the marketing site. Product
screens are Saans only.

Evidence: `styles.css:20-23` names its purpose; no old-app screenshot shows a serif.

### T7: the radius vocabulary is two values, and the class you write is `rounded-xl`

> **AMENDED by [N9](#n9-two-radii-one-fill-no-shadow) (18 Aug 2026)** with the census: 57
> of the app's 125 radius classes are off-vocabulary, `rounded-lg` alone 48 of them, and
> because every step already computes to 24px **changing all 57 is a visual no-op**.
>
> **AMENDED AGAIN by [T8](#t8-the-two-radii-are-spelled-the-kits-way) (27 Aug 2026),** when
> the kit became canon: the two values did not change and the WORDS did. `rounded-xl` is no
> longer the class you write. Read T8 before you write a corner.

Every Tailwind radius step from `rounded-sm` to `rounded-3xl` resolves to the same
`var(--radius)` = 24px (`styles.css:261-266`). Pills come from `rounded-full`. Since
`rounded-lg`, `rounded-xl` and `rounded-2xl` are literally identical, pick one and write
it everywhere so the source stops implying a hierarchy that does not exist. Use
`rounded-xl`.

One divergence to be aware of and **not** to "fix" unilaterally: the brand site's panel
radius is **10px** (`--radius--radius: 10px`, 40 rendered elements), while the library's
is 24px, recorded as a locked "two radii only" decision in `shared/ui/foundations/tokens/tokens.css` (the
line number this used to cite no longer resolves — read the radius block in that file).
The pill value agrees (the site uses 50px, the library uses `rounded-full`). If the 24px
panels read too soft beside the marketing site, that is a token change in
`shared/ui/foundations/tokens/tokens.css`, made once — and since 2026-08-22 that file is in this repo, so
it is a change this repo makes rather than one it asks for. It is still not a
per-component override in the host.

### T8: the two radii are spelled the kit's way

**AMENDS [T7](#t7-the-radius-vocabulary-is-two-values-and-the-class-you-write-is-rounded-xl)
and [N9](#n9-two-radii-one-fill-no-shadow)**, both of which said "write `rounded-xl`". The
two VALUES are unchanged; the words are the kit's now, and the kit is canon.

**The rule.**

| Shape | Write |
|---|---|
| a rectangular surface | `rounded-[var(--radius)]` |
| a pill | `rounded-pill` |
| one edge of a rectangular surface | the same word on that edge, e.g. `rounded-t-[var(--radius)]` |

Nothing else. **The law constrains the VALUE, never the position** — a directional variant
is one value, one token, one edge of it — so no named step (`rounded-lg`, `rounded-md`,
`rounded-2xl`…) and no bare number that answers to no token may be written in `web/`,
`web-portal/` or `shared/`. `shadow-*` stays at exactly one use.

**Two positions draw a single-edge radius, and both are written down** so that neither
reads as a breach: a **sheet** that meets the bottom of the screen, and (2026-09-10) the
**top band of a pinned toolbar**, which carries its container's own top corners with it
once the container's real top edge has scrolled away
([K14](#k14-the-toolbar-stays-on-top-while-the-rows-scroll-under-it-and-the-pin-is-the-rows);
`shared/web/pinned-chrome.ts` has the measurement).

**The one named exception is `rounded-select` (6px)**, on the mark of a selection control.
Two numbers cannot draw everything: at the box radius a 16px checkbox is a lozenge, and at
the pill radius it is a radio button. The kit rules exactly this and calls it *"the ONE
named exception to the two-radius law: 6px. Nothing else may."* It is data in
`RADIUS_EXCEPTION` with its reason, rot-checked, so an exception nothing uses turns the
build red. The kit names a SECOND (4px on a bar, *"a bar is not a box"*) which is
deliberately **not** defined here until something in this app draws one.

**Bare `rounded` is deliberately outside the rule**: it is 4px here, not 24, doing a
different job on an inline highlight and a 32px thumbnail.

**A third BOX radius is still forbidden.**

**What it cost to say it this way.** The old spelling was correct by IMPORT ORDER rather
than by declaration: Tailwind emits `--radius-lg: 0.5rem`, the kit's `tokens.css` emits
`1.5rem`, and the kit wins on cascade order alone — so 184 corners across both front doors
were right for a reason no check stood under. Reorder the two stylesheets and every card
silently becomes 12px with the suite green.

**Law.** [R31](../RULES.md) (`two-radii`).

---

### T9: citation numbers are offset to prevent overlap with text, and citations stay on

**The rule.** The client's ruling, 16 Sep 2026, verbatim: *"NotebookLM-style per-sentence
numbered citations were removed earlier because the numbers overlapped with text on some
screen sizes. Decision: fix the overlap rather than dropping the feature."* Citation numbers
inline with prose are offset vertically using `relative top-[-0.35em] leading-[0]` instead of
`align-super`, which shifts the number upward without expanding line height, so it clears the
text it annotates. The solution is verified at 375px (narrow mobile, the tightest case) with
three consecutive citations to confirm no overlap across sizes.

**Where this reaches today.** `shared/ui/` kit version v1.2.101 and later carry the offset
CSS on the citation number mark. Client-facing screens that render citations read the mark
through the one seam and render it in-prose. the kit’s own verify page (verify/agent-chat-cite in kwapso-design)
confirms the numbers render offset and do not overlap at 375px width with a three-citation
paragraph.

**Law.** None registered — a CSS offset on an existing citation mark.

---

## 8. Spacing, and the scale setting

### S1: the vertical rhythm is 4, 8, 16, 24, 40

> **AMENDED by [N7](#n7-five-gaps-and-each-one-means-something) (18 Aug 2026),** which
> attaches a MEANING to each of the five steps and drops the `gap-3` line below (S1 named
> the scale and then broke it in its own next sentence). N7 also carries the census: 210 of
> the app's 516 gaps are off-scale, and `gap-6`, the gap that means "these are separate",
> is used eleven times in the whole app. Implement N7's table, not this list.

`gap-1` / `gap-2` / `gap-4` / `gap-6` / `gap-10`. Nothing between them.

- Between fields in a form: `gap-4`
- Between panels on a screen: `gap-6`
- Between major sections: `gap-10`

Evidence: `brand.css` `--margin--s: 10px`, `--base: 20px`, `--m: 40px`, `--l: 60px`,
`--xl: 80px`, `--xxl: 100px`, a doubling scale; its gap census is 10px (44 rules), 20px
(38), 16px (18), 40px (12). Card padding on the brand site is 40px, and section vertical
rhythm is 100px top. The portal already uses `gap-10` between sections
(`web-portal/components/home-screen.tsx:58`, `company-screen.tsx:60`, `impact-screen.tsx:132`).

### S2: horizontal gutters are `px-4 sm:px-6 lg:px-10`

One string, used by the shell and by the header band so they align to the same left edge.
See [L1](#l1-one-page-container-one-cap).

**AMENDED 17 Sep 2026 — the outer gutters step down one rung.** The client's ruling,
verbatim: *"Because adding the breadcrumbs took up considerable screen space, let's reduce
the margin that we have on the sides above and below both the main content and the
assistant. Let's optimize the height. Let's not leave so much blank space there."* Every
block-direction contributor to the gutter around the content column and the aside steps
down exactly one `--space-*` rung (kit v1.2.106): `--shell-gutter` and `--aside-inset`
(kept equal to each other) go from `--space-5` to `--space-4`; the card's own head band,
its trail inset ([L13](#l13-the-trail-line-lives-inside-the-content-card-above-the-head-the-chrome-shortcuts-are-only-partly-replicated))
and its body padding each drop one rung at both densities; the gap between the trail and
the head drops with them. The rail's own gutter is deliberately untouched — the ruling
names "the main content and the assistant," not the rail — so `--rail-inset` stays at
`--space-5` on purpose, a flag for whoever next touches it rather than an oversight.

**AMENDED 18 Sep 2026 ~06:40 (Round 17) — the rail's own gutter is touched too, and both
gaps step down together.** The client's ruling, verbatim: *"reduce the margin between the
super far edge of screen and the side navbar, same as reduce it between side navbar and
main content. keep spacing equa on both sides - but reduce (i'd say to half of what it is,
but i dont see the pixels, just human eye)."* The flag the 17 Sep amendment left for whoever
next touched `--rail-inset` is picked up here: the gap between the viewport's own edge and
the rail, and the gap between the rail and the main content, are read together and kept
equal — the same requirement S2 already holds for the content/aside pair — and both step
down by roughly half their current measure, read by eye rather than to an exact pixel figure
she named. `--rail-inset` moves off `--space-5` for the first time since this rule shipped.

**Status: ruled, in build, 18 Sep 2026 (kit v1.2.116).**

**AMENDED 18 Sep 2026 ~13:20 (Round 20) — the rail brand row aligns to the tab strip's own
band, and a collapsed rail keeps every size.** Two further rulings on the rail, the same
round:

- *"on the sidebar tge logo is way too up!!! make it aligned with text on foler tabs"* — the
  rail's own mark-plus-wordmark lockup (`rail-brand`, `rail.tsx`) sat 10px above the active
  content tab's own label centre, measured live (`verify/shell-chrome/`, 1440×900). Kit
  v1.2.121 first fixed it by COMPUTING a centre from four tokens
  (`--shell-gutter + --folder-lip/2 - --icon-20/2 - --rail-inset`) — correct at the kit's own
  15px harness root, 8.65px off on the live app's 16px root, because one of the four terms
  stood in for the mark's own rendered height rather than for a fact about the tab strip band
  it was reaching for. **Kit v1.2.122 rewrote it to build a BAND instead of a centre:** a new
  token, `--strip-row` (aliased to `--folder-lip`), names the exact box the tab strip's label
  already centres inside; the rail brand row now takes `h-[var(--strip-row)]` and relies on
  its own pre-existing `items-center` to centre the mark inside that box, the same way the
  tab strip centres its label regardless of the label's own line height — two boxes with
  coincident centres BY CONSTRUCTION, not by an offset computed from outside either one.
  Measured after the rewrite: 0.53px off at the kit's 15px root, 0.59px off at the live app's
  16px root — both sub-pixel, both close to identical, which is the actual proof a fix keyed
  to the wrong facts does not give. **Status: ruled, in build, 18 Sep 2026 (kit v1.2.122).**
- *"when contracting sidebar, yuo should not make icons or spaces smaller, keep it as it is,
  just without tetxs"* — collapsing the rail used to shrink each row's own box from
  `--control-height-button` (37.5px at the kit's 15px root) down to `--avatar-md` (30px), an
  8px shrink carried straight through to the row-to-row rhythm; the glyph inside was never
  part of that shrink (`ROW_SHAPE`'s own `[&_svg]:size-[var(--icon-button)]` reads off the
  row, not a now-absent icon wrapper), so what she is naming as "icons or spaces smaller" is
  the row box and the rhythm it sets, not the glyph itself. `ROW_COLLAPSED` (`rail.tsx`) now
  reads the SAME `--control-height-button` token `ROW_EXPANDED` does — one row height, one
  row-to-row rhythm, in both states — and the rail's own collapsed root width widens the same
  8px so the now-larger circle still fits without clipping. Only the destination LABEL leaves
  the layout on collapse; nothing else resizes. **Status: ruled, in build** (kit v1.2.120,
  already in `HEAD` before this session's own sync to v1.2.122).

### S3: card padding is `p-4`, panel padding is `p-6`

`CollectionCard` already uses `p-4` (`screen-bits.tsx:35`). Detail panels use `p-6`, which
matches `CardHeader` and `CardContent` defaults so no override is needed there.

### S4: the scale setting is three steps, and it sets one CSS variable

Add a display preference with three steps, following the language preference exactly:
`shared/web/language-section.tsx` for the settings panel and
`shared/web/language-menu.tsx` for the portal header. Persist it the same way language is
persisted, through `setLanguage` at `web/lib/api/auth.ts:63`, so it follows the person
between devices rather than living in one browser.

| Step | Root font size | Effect |
|---|---|---|
| Compact | `15px` | |
| Comfortable (default) | `16px` agency, `17px` portal | today's values |
| Large | `18px` agency, `19px` portal | |

One variable, set on `<html>`. Because every size token in the theme is in `rem`
(`--text-xs: 0.875rem`, `--text-sm: 0.9375rem`, `--text-base: 1rem`) and every spacing
class is a Tailwind `rem` step, **text and spacing move together from one number**, which
is precisely what the iPhone's setting does. No component takes a size prop and no
component needs one.

Where it lives: `web/components/screens/settings-screen.tsx`, in the Appearance tab —
where, since the client's ruling of 2026-09-10 (*"language shoudl be in settings
somewhere, not in my porfile"*), `LanguageSection` sits beside it again as the fourth
card, under `ScaleSection`, `ThemeSection` and `SpineSection`. In the portal it is in the
header beside `ModeToggle` (`web-portal/components/portal-shell.tsx`), because the portal
has no settings screen by design.

Evidence: (inferred) from the owner's brief. The mechanism is forced by
`web-portal/app/globals.css:25-34`, which already changes the whole portal's size by
setting `:root { font-size }` and nothing else, proving the approach works in this
codebase.

### S5: the scale setting is what makes the locked viewport honest

`web/app/layout.tsx` sets `maximumScale: 1, userScalable: false`. With pinch-zoom
disabled, S4 is the only way a person can make this app bigger. Do not ship the viewport
lock without the setting.

### S6: touch targets stay at 44px on coarse pointers at every scale step

`web-portal/app/globals.css:38-44` already enforces this for `button`, `a[role="button"]`
and `[role="tab"]`. Copy that block into `web/app/globals.css`. At the Compact step the
`rem`-derived height of `size="sm"` drops below 44px, so the floor must be absolute.

### S7: a container's side margin equals the gap it already keeps above its own toolbar — everywhere

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"Finally, can you make the
overall full content inside this container wider, not only the toolbar, but everything?
I'm trying to optimize the usage of space. I would say the margin on the sides should be
the same as the margin you now have on top of the toolbar. That's really ideal. Make sure
that you apply this change absolutely fucking everywhere."*

**The mechanism.** A content container's own side margin is capped at the same measure as
the gap the tab strip already keeps above the toolbar it carries
([K33](#k33-the-gap-above-a-toolbar-equals-the-gap-below-it-the-tab-strip-and-its-card-share-one-gapless-column),
[R83](../RULES.md)) — narrower than the horizontal gutter
[S2](#s2-horizontal-gutters-are-px-4-smpx-6-lgpx-10) otherwise sets. One number governs
both: the vertical gap above a toolbar and the horizontal margin around everything the
container holds, on every container this applies to, everywhere, per her own words — never
a screen's own choice.

**Status: ruled, in build, 17 Sep 2026.**

**Law.** None registered.

---

## 9. Mobile

### M1: mobile is not desktop shrunk

Already locked (ARCHITECTURE.md §6, UI-CONVENTIONS.md §4). Every rule below is an
application of it.

### M2: on a phone the title carries one button and the menu

The primary action stays; the secondary joins the three-dot menu. The menu grows, the row
does not wrap.

Evidence: `A-3.58.16` (the task's "Start" moves into the menu, leaving only the menu),
`A-4.06.01` (the story's "In progress" moves into the menu), `P-4.10.08` and `P-4.10.16`
(the portal keeps "Open App" and folds "New Ticket" into a three-dot). This is the old
app's own collapse rule and it is the reason the two-button limit works at all.

### M3: the tab strip scrolls horizontally, does not wrap, and hides its scrollbar

`overflow-x-auto no-scrollbar` on the `TabsList`. `no-scrollbar` is a library utility
(`styles.css:355-361`), written for exactly this ("used by overflowing tab bars"). The
active tab scrolls into view on mount.

Evidence: `A-4.00.19`, `A-4.00.30`, `A-4.00.44`, `A-4.00.49`. Eight tabs scroll
horizontally on a phone with the active one centred and the neighbours half-visible.

### M4: a two-column detail stacks, main content first

Evidence: `A-4.06.19` versus `A-4.06.12`.

### M5: a two-pane collection becomes a filter control above the list

The left selector pane becomes a single `Select` at the top of the screen.

Evidence: `A-4.06.39` and `A-4.06.49`. The App picker that is a full left column at
desktop becomes one dropdown showing "HORST" with a clear X on a phone.

### M6: the audit footer stays a footer on mobile

It does not become a card and it does not move into a tab. Same `bg-muted` strip, same
`text-xs`, wrapping to two lines.

Evidence: (inferred) from [D7](#d7-the-audit-footer-is-pinned-to-the-bottom-of-the-panel-and-is-grey);
the brand footer at `brand.css` `.nk-footer__bottom-wrapper` keeps its treatment and only
changes direction at the mobile breakpoint (`flex-flow: column`).

---

## 10. Copy

### W1: no em dashes anywhere a person can read

Use a comma, a full stop, a colon or a pair of brackets. In a dot-separated meta line use
` · `. For a date range use "10 August to 22 August 2026", not a dash.

There are about **53** em dashes in user-visible strings today (the ~2,100 total
occurrences are overwhelmingly in code comments, which are not covered by this rule).
Highest counts: `web/components/knowledge/google-connections.tsx` (4),
`web/components/team/access-tokens.tsx` (4), then `time-panel.tsx`,
`staff-profile-dialog.tsx`, `process-detail.tsx`, `meeting-form-dialog.tsx`,
`meeting-detail.tsx`, `knowledge-detail.tsx`, `help-form-dialog.tsx`,
`google-source-dialog.tsx`, `deep-link/write-panels.tsx`, `app-form-dialog.tsx` (2 each).

Representative rewrites:

| Today | Rule |
|---|---|
| `"Couldn't read that image. Try another one."` | `"Couldn't read that image. Try another one."` |
| `"It starts with no access, you'll choose what it can do in the next step."` | `"It starts with no access. You'll choose what it can do next."` |
| `"That file is over 25 MB, please pick a smaller one."` | `"That file is over 25 MB. Please pick a smaller one."` |
| `"Ours, not a client's"` | `"Ours, not a client's"` |
| `"Answered, and emailed to them."` | `"Answered, and emailed to them."` |

Evidence: the old app breaks this rule and it shows. `P-4.09.52`: "We fix most bugs
within 48 hours (Mon–Fri), even faster in urgent cases." `P-4.10.31`: "Feel free to
attach screenshots, a picture is worth a thousand words."

### W2: the empty-value placeholder is an en dash, and it is the one exception

The 73 standalone `"—"` placeholders in `web/components/deep-link/shape.tsx` and elsewhere
are a different construct from prose punctuation. Standardise them on `"–"` (en dash) or,
better, on nothing at all where `hideEmpty` on `DescriptionList` can drop the row instead.
`defaultDescriptionListConfig` already sets `hideEmpty: true`.

### W3: a collection heading names the filter it is showing

"Open tickets", not "Tickets", when the list is filtered. See
[K3](#k3-the-count-lives-in-the-heading-formatted-n-adjective-plural).

### W4: the glossary still wins

R6 is unchanged. Every noun in this document that names a product concept comes from
`shared/glossary.ts`: ticket, story, task, sprint, account, contact, activity, overview,
status, work log, reference number.

### W5: sentence case, including inside the three-dot menu

"Reply by email", not "Reply By Email". Unchanged from UI-CONVENTIONS.md §5, restated
because the new menu is a new surface where the habit can slip.

### W6: no emoji in the words, and none in the data behind them

**The rule.** The client has said it four times. *"i said no emojis. why are there still
emojis? kill them!"* (2026-08-31). *"for type, kill the emojis. this is legacy. in current
system we use colors"* (2026-09-07). *"also kill emojis!!!"* (2026-09-10). No emoji in a
sentence a person reads, in any language, **and none in the data a screen draws** — a
ticket type's mark, a department's mark, a seeded vocabulary row. A mark is data, it sits
in no catalogue and in no `t(...)`, and that is the half a copy sweep cannot see.

**The one exemption is a CLASS, not a list** — her fourth ruling, 2026-09-10: *"Keep emojis
for countries and languages only."* A pictograph passes when it is a **flag** naming a real
region. There is no language pictograph, so a language is drawn by the flag of a country
that speaks it. A lone regional indicator, a pair naming no country, and every other glyph
are still refused.

**What is NOT an emoji, and is not caught.** The typographic dingbats this app and the kit
legitimately draw — a close cross (U+2715), a department's star (U+2605), an arrow
(U+27A4). The line is drawn by the same door that
guards the write (`optionalMark` in `shared/workers/validate.ts`), imported rather than
copied, so the law and the door cannot drift.

**A house rule that comes with it:** in the data files, name a glyph by codepoint
(`String.fromCharCode(0x26a0, 0xfe0f)`), never paste one. Source COMMENTS are deliberately
out of scope — most of the pictographs in this repo's source are the client's own words
quoted beside the change they caused.

**Why it took four rulings.** The August one WAS answered and could not land: every
back-fill statement in the two migrations was guarded `AND mark IS NULL`, so not one of
them could ever have replaced a pictograph. They filled the empty marks and stepped over
exactly the rows the ruling was about.

**Law.** [R66](../RULES.md) (`no-emoji-in-copy`).

### W7: no synonym for a glossary term ever reaches a screen

**EXTENDS [W4](#w4-the-glossary-still-wins)**, which said the glossary wins and was read by
nobody: the glossary check reads the glossary FILE — term present, definition brief, no
duplicates — and not one line of copy. So for a year *"use those words in UI copy; never
invent a synonym"* was enforced by no one, and the app shipped green calling one thing
"Permissions" on the Roles screen and "access rights" on two others, plus "teammate" for a
member and "Portal login" for portal access.

**The rule.** Every user-visible English sentence in either front door is read for a known
synonym of a glossary term. The banned words are DATA (`GLOSSARY_SYNONYMS`), each naming
the term it competes with; a sentence with a reason to keep one is a written, rot-checked
line.

**The list is deliberately NARROW, and that is the design.** A word earns a place only when
it can mean nothing else here — "client" is the relationship, "option" is inside the
glossary's own definition, "request" is an HTTP call on three screens. A rule that flagged
ordinary English would be switched off, and a check that is off is worse than none.

**Two words for one thing is not a typo.** A manager reading "Permissions" on one screen
and "Access right" on the next has to work out whether they are the same thing, every time,
and the answer is not on the screen.

**Law.** [R34](../RULES.md) (`glossary-in-copy`).

### W8: our own people are named by their first name, and nobody else is

**The rule.** *"upwise, when it's staff who records activity, only use the first name, so
not Audora Alasa, only Audora. Do this across all the app. We only record name and surname
for the contacts and the customers."* Two sentences and two populations, and the second is
what makes this a rule rather than a find-and-replace: a client login is an ordinary team
member, so a row a CONTACT authored through the portal carries THEIR name in the same
column ours do — a process comment, a raised ticket, a reply, a completed to-do. Those keep
their full name.

One seam does it, `shared/staff-name.ts`, and it is called **at the render seam, never in a
worker**.

**What it costs, and why the trim is late.** The stored full name is also a search term, a
sort expression and a paging cursor key on work logs, so trimming it in the worker would
change which rows a search finds and where a page boundary falls. The picker that appends
an email to disambiguate has to run that de-duplication on the word the reader actually
sees, because first names collide where full names do not. And the machine surface keeps
the full name: this ruling is about what a PERSON reads.

**And the sentence is where she actually saw it.** The activity feed's visible line is the
stored `description`, a sentence with the actor's name inside it. Shortening the actor
field alone would have changed nothing on the screen she was pointing at — so the seam
rewrites the sentence against that row's OWN actor snapshot, by exact prefix, which also
fixes history rather than only what is written from today.

**Two deliberate residues.** A description naming a SECOND person ("X changed Y's role to
Admin") keeps that person's full name: no column on the row names them, and guessing which
run of characters in a stored sentence is a surname is prose parsing this seam refuses to
do. And **initials are untouched** — an initial is a MARK, not a name
([G5](#g5-a-record-never-appears-without-its-face)), and "AA" is not "Audora Alasa".

**Law.** [R54](../RULES.md) (`staff-names-are-first-names`).

### W9: a savings figure never renders without saying what it is made of

**The rule.** Every screen on either front door that shows a saving renders
`SAVINGS_CAPTION` from `shared/workers/savings.ts`, **word for word**: the times are
estimates we agreed with you, the subtraction is arithmetic.

**Why it is not decoration around the feature but half of it.** The owner named what would
make him abandon this and go back to a spreadsheet — *"the numbers stop being
believable"*. A client who understands that the inputs are agreed and the arithmetic is
arithmetic trusts the figure. One who believes we held a stopwatch stops trusting every
other number in the app the day one of them looks wrong.

**Law.** [R25](../RULES.md) (`savings-caption`).

### W10: every sentence the app says is in the catalogue

**The rule.** `shared/i18n-strings.json` is **exactly** the set of user-visible English
sentences the two front doors say — no more and no less. English is the key, so a sentence
MISSING from the catalogue ships in English to somebody who chose German, silently, on a
screen that looks finished. An entry matching nothing in the app is an ORPHAN: it breaks
nothing today, which is precisely why it rots into a record of what the app used to say
while being paid for on every build. Run `npm run lang` before you commit — extract, then
prune — and both deploy scripts refuse on a stale catalogue.

**Write the whole sentence with a hole in it.** `t("of")` declares a fragment to be copy,
and the shared definition of "what a person reads" refuses a fragment as a non-sentence, so
it is translated nowhere. A sentence with a `{hole}` in it is also the only shape a
translator can reorder.

**What it costs a component author.** A file is walked because a front door **imports** it,
not because of the folder it sits in — so a file under `web/`, `web-portal/` or `shared/`
that says something and that nothing imports is UNREACHABLE and turns the build red too.
That was earned: a relative-time helper in `shared/web/` had been saying "5d ago" in English
to nine call sites on both front doors, beside a German sentence, for a year.

**Law.** [R28](../RULES.md) (`catalogued-strings`).

### W11: and the place it is said asks for its translation

**The rule.** [W10](#w10-every-sentence-the-app-says-is-in-the-catalogue) makes the
catalogue match the code; this makes the code READ the catalogue. Every position that walk
reports must sit inside a `t(...)` call. **Two ways out, and only two.**

1. A `label:` or `helpText:` on an object that spreads a **field config** is translated on
   the way to the screen by `shared/web/field.tsx`. This one exists because `t` is a hook
   and a field config is a module-level constant — those words genuinely cannot be wrapped
   where they are declared. It is held shut by an import ban: no file in either front door
   may import the kit's `Field` directly, so the seam cannot be walked around.
2. A copy TABLE read back through `t` somewhere else, written down with the call that reads
   it and rot-checked.

**Why it exists.** 666 of 2,001 extracted positions were in the catalogue, translated into
every language the app speaks, on every build — and **never asked for**. Every form field
label in the app was among them. The catalogue was current and the screens were English.

**Law.** [R33](../RULES.md) (`wrapped-strings`).

### W12: and the asking is answered, up to a ceiling that only falls

**The rule.** The third translation rule, and the one that closes the loop. A string can be
catalogued ([W10](#w10-every-sentence-the-app-says-is-in-the-catalogue)), wrapped
([W11](#w11-and-the-place-it-is-said-asks-for-its-translation)), and still have no entry for
a translated language — which is the stated fallback: English on screen, a sentence rather
than a bug. So per translated language the count of unanswered strings is **pinned**
(`TRANSLATION_CEILING`) and recomputed fresh on every build for exact equality: a string
shipped past the ceiling fails, and a ceiling left ABOVE the true count after a translation
lands fails too, because a stale pin hides the next regression behind an improvement it
never recorded.

**The pin can fall, and can never rise without the count behind it rising first.** Raising
it is the sanctioned move for accepted debt, in the same change, where a reviewer sees it
move.

**Not a hard zero, on purpose.** A hard zero turns the next ordinary feature branch red the
moment it adds a label, and a build that fires on unrelated work is a build people route
around.

**Law.** [R44](../RULES.md) (`translation-ceiling`).

### W13: no subtitle under a heading, unless she asked

**The rule.** *"In settings, modules: delete this. Generally, I don't like subtitles, so
stop putting them unless I ask."* (2026-09-14, over Settings › Modules' own intro
sentence). She had already said the narrower version twice the same week — *"in ticket
settings (or any other module) no subtilte"* (10 Sep) and *"ticket types should be …
without subtitle, make this. always"* (11 Sep) — and both landed as one-screen fixes. This
is the wider version: a sentence explaining what a heading means, drawn directly beneath
it, is off by default everywhere in the app.

**What counts.** A prose element (`<p>`, `<span>`, `<small>`, `<em>`, `<strong>`) standing
as the very next thing after a heading (`<h1>`–`<h4>`, the kit's `Headline`) — the shape
[C12](#c12-nothing-stands-on-the-bare-page-ground) already names as the "title block", read
here for a different question: not where it stands, but whether it should be there at all.

**What is not a subtitle.** A form field's own helper text ([F](#6-forms-and-dialogs) —
rendered through the kit's `Field`, which has no heading beside it, a label rather than a
title). An empty state's explanation (`CollectionEmptyState`, `PortalEmpty`). The reason a
switched-off automation cannot be turned on, which a settings page is required to show —
see BUILD-A-MODULE.md's automations step. All three answer a different question than "what
is this section for", and all three are real components rather than a bare tag, which is
also how the check tells them apart.

**The way out.** "Unless I ask" is part of the ruling. A reasoned, rot-checked exemption —
`SUBTITLE_OK` in `shared/rules/registry.ts` — names the file and why, the same discipline
[C12](#c12-nothing-stands-on-the-bare-page-ground)'s own `UNCONTAINED_SECTION_OK` uses.

**Not the same law as C12.** C12 asks where a titled section's content stands; a sentence
inside its own title block is exempt from C12 either way. This asks whether the sentence
should exist at all — a boxed subtitle passes C12 and fails this one.

**Law.** [R72](../RULES.md) (`no-default-subtitles`).

### W14: no heading inside a container repeats the tab's own name

**The rule.** *"Please remove the title inside the collection. We will use the title only
at the top."* — client, 2026-09-14, over Settings › Automations. Follow-up, the same day,
over Settings › Team: *"remove members and roles titles too."* A `TabsView` panel is
already named once, by the tab that opens it; a heading inside the panel repeating that
same word is a second, redundant copy — the same "second Appearance" `settings-section.tsx`'s
own header describes, read one screen-height apart rather than side by side, which is what
makes it easy to miss until somebody points at both.

**Three mechanisms, one principle, because no two of the app's settings containers are
built the same way.** Redundant to a sighted reader; still real to a screen reader, so none
of the three simply deletes the heading:

- **Settings › Appearance** — `AppearancePanel` passes `hideTitle` to its `SettingsSection`
  (`shared/web/settings-section.tsx`); the box still labels its `<section>` landmark via
  `aria-label`, it just draws no visible `<Headline>`.
- **Settings › Automations, the aggregate tab** — `ModuleAutomations`'s `title` prop
  (`web/components/screens/module-automations.tsx`) is simply left unpassed on the
  `scope: "all"` mounting; `<ToolbarRow title>` already treats an absent title as "draw
  nothing," so nothing else had to change. The per-module mounting keeps passing a real
  title — the thing that tells its Automations section apart from its Vocabulary one.
- **Settings › Team, Members and Roles** — `sr-only`, not deleted: both collections stack
  inside ONE tab panel already named "Team," so that single name cannot tell a reader which
  of the two stacked collections they are in, the way it can for Automations or
  Integrations, each the only collection on its own tab. A screen reader's heading list
  still reads "Members" then "Roles"; a sighted reader reads nothing extra.

**Distinct from [W13](#w13-no-subtitle-under-a-heading-unless-she-asked)**, which asks
whether a sentence UNDER a heading should exist at all, and from R67's containment (a
titled section OR a headless one both pass, as long as the body stands on paper) — this
asks whether the heading ITSELF is a second copy of a name the panel already carries.

**Whether this is a LAW.** Considered, and left rulebook-only. The honest census — for
every tab panel in a `TabsView` on Settings, no visible heading whose text equals the tab's
own label — would have to reconcile three unrelated mechanisms (a prop that hides and
relabels, a prop that is simply omitted, and a hand-written `sr-only` class) across three
unrelated components, with no shared prop or attribute a scan can key on without
hand-listing every call site. That is exactly the shape of a check that cannot be made to
fail honestly: the day a fourth mechanism is invented the census goes silently blind
instead of red, rather than catching it the way breaking a real law's check is supposed to.
A rulebook entry a person reads before inventing a fourth pattern is the honest tool here;
a hand-list wearing a regex is not.

---

### W15: every rail destination is named in one word

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"Make it a rule that in the
navigation bar, we only have one-word names. For example, 'Knowledge Base': reduce it to
'Knowledge'. We need an alternative for work logs. Propose me multiple."* A DESTINATION is
a link a person can click to land somewhere — every `NAV` entry that carries a real `group`
(not `"none"`) and is not `inRail: false`, and every `TEAM_SECTIONS` row with
`placement: "sidebar"` (`web/lib/pages.ts`) — the same two lists `app-shell.tsx`'s own
`universal`/`sidebarPages` read to draw the rail. Its title, in English, must be exactly
one word: no space, no hyphen. The rail's three group headings (`NAV_GROUP_LABELS`: "My
work", "Build", "Accounts") title a SECTION, never a place a click lands, so they sit in
`RAIL_LABEL_WORDS_OK` with the reason "groups are headings, not destinations; awaiting her
word", rather than being silently measured against a rule that was never asked about them.

**AMENDED 17 Sep 2026 — the group-heading question is answered.** The client's ruling,
verbatim: *"No, the rail group heading can have two words."* The `RAIL_LABEL_WORDS_OK`
exemption's reason changes from "awaiting her word" to "ruled: group headings may carry
two words, 17 Sep 2026" — they are headings, never destinations, and this law was never
about them.

**The shape.** Red the day this law was written: "Knowledge base" (the `knowledge` sidebar
entry) and "Work logs" (the `time` entry) both carried two words. "Knowledge base" →
"Knowledge" everywhere it is a user-facing label ([R6](../RULES.md)/[R34](../RULES.md) —
the glossary term, every `t("Knowledge base")` call site, the translations); the route
(`/knowledge`) and every identifier are unchanged. "Work logs" had no client pick at
first — she asked to be shown alternatives rather than have one chosen silently for her,
and "Hours" shipped as the recommendation while she decided — then she named it, the same
day, verbatim: *"The word for work logs is logs."* So the `time` entry ships "Logs". "Work
logs" itself is untouched everywhere else it is said (the glossary term, and every record's
own tab), because only the RAIL destination is under this law.

**The Accounts group's own order, same session.** The client's ruling, verbatim: *"Okay,
put the tickets into Accounts after Contacts."* The group now reads Accounts · Contacts ·
Tickets · Inputs, in that order (`TEAM_SECTIONS`, `web/lib/pages.ts`) — a destination's own
order inside its group, not covered by the one-word count above, but ruled the same
session and built the same day.

**Superseded the same day.** Reviewing the shipped order, the client's ruling, verbatim:
*"Move it under accounts, on top of contacts."* Tickets moves back above Contacts — the
group now reads Accounts · Tickets · Contacts · Inputs, replacing the Accounts · Contacts
· Tickets · Inputs order in the paragraph above.

**Status: ruled, in build, 17 Sep 2026.**

**Tests:** `web/test/rail-labels-one-word.test.ts`.

**Law.** [R85](../RULES.md) (`rail-labels-one-word`).

---

## 11. Record type glyphs

### G1: a record type carries a glyph

Every ticket, story, task, sprint and roadmap phase shows a small pictograph in the
leading slot of its row and in the header band's square, so the type is readable without
reading.

> **DECIDED, 17 Aug 2026: option 1.** UI-CONVENTIONS.md §5 now reads "no emoji IN COPY"
> and defines a TYPE MARK with four conditions it must meet. The law was changed first,
> deliberately and in writing, exactly as this section asked. **G2 below applies as
> written.** The reasoning is recorded in §5 itself: the owner asked for these twice in
> writing, Aurora asked for the same thing independently, and the agency's legacy data has
> carried a glyph and a colour on every ticket, story and sprint type for years. A rule
> that forbids what the business already does had stopped describing reality.

**Superseded, kept for the record.** UI-CONVENTIONS.md §5 previously said
"**No emoji.** Anywhere. (This is a hard design-language rule.)" and
`shared/rules/registry.ts` pins it. The in-rule route, in order of preference:

1. **Amend UI-CONVENTIONS.md §5** to read "no emoji **in copy**", and add the glyph to
   §4 as a *type mark*, which is what it is: it occupies the slot a kit glyph would,
   it is `aria-hidden`, it never appears inside a sentence, and it is always accompanied
   by the type word in the eyebrow or the column header. Then G2 applies as written.
2. **Or** implement G2 with the kit's own glyphs from `CONCEPT_ICON` (`web/lib/pages.ts`)
   instead, which changes nothing in the law book but gives up the colour that makes a
   type readable at a glance in a long list. *(Fact updated 7 Sep 2026: this option used to
   say "lucide glyphs", which R39 now forbids outright — no file in `web/`, `web-portal/`
   or `shared/web/` may import a UI package. `CONCEPT_ICON`'s values are Phosphor names the
   kit draws through `@shared/ui/foundations/icons`, and the line number is dropped rather
   than corrected because it has already moved once.)*

Do not ship option 1 by quietly writing emoji into components. Change the law first, or
take option 2.

Evidence for the request: `A-4.00.11`, `A-4.05.42`, `A-4.06.45`, `A-4.07.02`, `P-4.10.12`.
The old app puts a coloured pictograph on every row of every work collection and it is
the single fastest read on the screen.

### G2: the mapping, if option 1 is taken

One map, one file, sitting beside `CONCEPT_ICON` in `web/lib/pages.ts`. No emoji appear
in this document, so each glyph is named by its Unicode name and codepoint.

| Record | Glyph | Codepoint |
|---|---|---|
| Ticket, request | Thought balloon | U+1F4AD |
| Ticket, question | Red question mark | U+2753 |
| Ticket, issue | Warning sign | U+26A0 U+FE0F |
| Story, feature | Sparkles | U+2728 |
| Story, change | Twisted rightwards arrows | U+1F500 |
| Story, fix | Bug | U+1F41B |
| Task | Check mark button | U+2705 |
| Sprint, implementation | Gem stone | U+1F48E |
| Sprint, validation | Eyes | U+1F440 |
| Sprint, refinement | Sparkles | U+2728 |
| Sprint, enhancement | Rocket | U+1F680 |
| Sprint, training | Graduation cap | U+1F393 |

Every one of these is read directly off a screenshot: `A-4.05.42` (change, fix),
`A-4.06.45` (feature, change), `A-4.07.02` (issue), `A-4.06.36` (question, request),
`A-3.55.53` and `P-4.10.12` (gem, eyes, sparkles, rocket, graduation cap),
`A-4.00.11` (rocket, graduation cap).

The glyph is rendered as:

```tsx
<span aria-hidden className="shrink-0 text-base leading-none">{RECORD_GLYPH[type]}</span>
```

### G3: in the header band the glyph sits in a rounded square

`size-14 sm:size-[72px] rounded-xl bg-muted grid place-items-center text-3xl`.

Evidence: `A-3.57.42`, `A-3.58.01`, `A-4.05.45`, `A-4.05.52`, `A-4.07.25`. When the
record has a real logo (an app, an account) the logo replaces the glyph in the same
square, `object-contain` per UI-CONVENTIONS.md C5.

### G4: a glyph never carries meaning on its own

Every glyph is paired with its type word somewhere on the same screen: the eyebrow on a
detail, the "TYPE" column or the group heading on a collection. Screen readers get the
word, not the pictograph.

Evidence: `A-4.05.42` shows the glyph in the NAME column and the word in the TYPE column
of the same row.

### G5: a record never appears without its face

**The rule.** Wherever a record or a dropdown value is shown to be **chosen** or
**scanned** — a picker option, a row in a collection, a row in a nested panel inside
another record's screen — it is drawn with its visual beside its name, in this order of
preference:

1. its own picture, where it has one;
2. its type's glyph ([G1](#g1-a-record-type-carries-a-glyph)), where the type has one;
3. its initial, where it has neither.

Never nothing. **And never the glyph written INTO the words** — a pictograph inside a
sentence is the one shape [W6](#w6-no-emoji-in-the-words-and-none-in-the-data-behind-them)
refuses. Two pickers had worked around the missing slot by concatenating an emoji into the
label, which put a pictograph in the search index and on the trigger.

**Where it is actually held, and why that shape.** There is no honest way to look at a piece
of markup and say "this is a record row" — `.map(x => <li>` matches attachments, replies,
comments and steps, none of which are records. So it stands on the three CHOKEPOINTS where
a face is lost instead: the picker option types must DECLARE the visual fields, so a type
cannot drop a picture before any component sees it; every list recipe must name its
`leading` column; and the one shared nested row takes its mark as a **required** prop, with
`null` a real and visible answer.

**Why it is a rule rather than a fix.** A visual is a key identifier, not decoration — the
owner said so three times across two rounds, and each time it was applied where he pointed
and nowhere else. The census then found the real size: **thirty-three** pickers, not one of
which COULD show a visual, because the option type had no field for one; ten of fourteen
list recipes naming no leading column; around twenty nested panels drawing bare words for
records that lead with a glyph on their own screen.

**Law.** [R35](../RULES.md) (`records-carry-their-face`).

**AMENDED 18 Sep 2026 — initials draw only when there is no image.** The client's ruling,
verbatim, over a screenshot of a member card showing a photo with the initials overlaid on
top of it: *"look at first screenshot bug, we see the avatar AND the initials! should not
be, initials only if avatar is empty. implement everywhere."* `RecordMark`'s own fallback
order already reads picture → glyph → initial, but a shipped card drew BOTH the picture and
the initials at once rather than treating the list as an either/or — the initials render
only in the branch where no picture resolves, everywhere `RecordMark` draws a face.

**Status: ruled, in build, 18 Sep 2026.**

**AMENDED A SECOND TIME, 18 Sep 2026 ~06:40 (Round 17) — the account filter shows the
fallback chain, not initials alone.** The client's ruling, verbatim: *"on filter account i
want to see the icons, not only initials."* The account filter's own option list was reading
straight to step 3 of this rule's own fallback order — picture, then type glyph, then
initial — skipping the account's own logo where it has one; the filter now draws the same
three-step chain every other picker and row already honours, so an account with a logo shows
it there too, and only an account with neither a logo nor a resolvable glyph falls back to
its initial.

**Status: ruled, in build, 18 Sep 2026 (filter icons lane).**

### G6: an image fills its box; it is never shrunk to fit inside one

**The rule.** The client, 2026-09-09, blanket and unhedged: *"everywhere for images: do
fill, not fit!"* Every picture either front door draws is `object-cover` — it fills the box
it is given and is CROPPED to it. Never `object-contain`, `object-fill`, `object-none` or
`object-scale-down`, and never a `fit="contain"` handed to the kit's `Image`, which turns
exactly that value into exactly that class.

**The cost is the law, not a bug in it.** A wide wordmark in a small square loses its ends
and shows its middle. What that was weighed against is the aggregate, which is the only
place a fit is ever visible: a contained logo sits smaller, paler and a different SHAPE
than the filled face beside it and the letter tile below it. On staging only 48 of 134
accounts hold a picture at all, so most boxes are a solid letter tile either way.

**One exception, and it names the distinction to reason with.** A ticket ATTACHMENT's
preview, where the picture IS the content — rather than a mark standing for a record whose
name is written beside it.

**And a default is not a choice.** `RecordMark`, which draws almost every picture in the
product, may not grow a `fit` prop again. It had one; its square default was `contain`; and
a default applies to every caller who never made the decision.

**Law.** [R60](../RULES.md) (`image-fills`).

---

## 12. Density: the glance budget (N1 to N12)

The eleven sections above decide what a thing looks like. This one decides **how much of
it may be on screen at once**, and it is the section the rearrangement work executes
against. It exists because the complaint that started this rule book was not "the wrong
colour" or "the wrong button", it was *"looking at so much information in one go is
overwhelming"* and *"it is feeling a bit twisted, like there is too much to do"*.

Those are two different faults and they need two different measures. Too much is a
**count**. Twisted is a **grouping** failure: things that are near each other are not
about each other, so the eye keeps regrouping and never settles. A screen can be twisted
while holding very little, and calm while holding a lot.

### The glance score, and how to compute it

Five measures, twenty points each, one hundred total. Higher is calmer. Nothing here is a
judgement call: every input is a count you can take off the JSX.

**The three things you count.**

| Term | Definition |
|---|---|
| **information unit** | one thing the eye has to decode on its own: a heading, a label-and-value pair (**one** unit, not two), a badge, a button, an avatar or type mark, a standalone number, an input, a date, an icon that carries meaning. A decorative glyph beside its own word is **not** a unit ([G4](#g4-a-glyph-never-carries-meaning-on-its-own)); it rides with the word. |
| **band** | the units that share one horizontal line: a list row, a header band, a toolbar, a status line, one row of a table. Two facts joined by ` · ` on one line are two units on one band. |
| **block** | anything with its own heading, its own container, or `gap-6` or more of air around it: a heading, a card, a panel, a callout, a toolbar, a tab strip, a stat row, a banner. |

**The five measures.**

| # | Measure | What you count | 20 | 16 | 12 | 8 | 4 | 0 |
|---|---|---|---|---|---|---|---|---|
| **H** | horizontal load | units on the busiest band | ≤3 | 4 | 5 | 6 | 7 | ≥8 |
| **H** | *(table row)* | columns in the widest table | ≤4 | 5 | 6 | 7 | 8 | ≥9 |
| **V** | vertical load | blocks between the top of the content region and the first row of primary content | ≤2 | 3 | 4 | 5 | 6 | ≥7 |
| **G** | glance cost | units above the fold: `3 + 2(V−1) + T + min(5, rows) × H`, where `T` is the tabs in the strip | ≤20 | ≤25 | ≤35 | ≤50 | ≤70 | >70 |
| **F** | grouping fidelity | conforming bands ÷ total bands (see below) | 1.0 | ≥0.9 | ≥0.8 | ≥0.7 | ≥0.6 | <0.6 |
| **S** | span utilisation | content width ÷ the width content is allowed to fill, at 1440 | ≥0.90 | ≥0.80 | ≥0.70 | ≥0.60 | ≥0.50 | <0.50 |

**Verdict bands.** 85 and above is *calm*. 70 to 84 is *fine*. 55 to 69 is *busy*. Below
55 is *overwhelming*, and an overwhelming screen is a defect in the same way too much code
is a defect.

**Why these numbers and not others.** They are all taken from rules this book already
made, so the metric cannot disagree with the rest of the document:

- **H ≤ 4** because [D5](#d5-one-status-line-under-the-title-dot-separated-three-facts-maximum)
  already caps a status line at three facts, and a band usually carries a title as well.
  A **table** gets six because its column header labels every cell, which is work the eye
  does not have to repeat, and that is the whole of [K2](#k2-a-table-is-for-scanning-a-list-is-for-reading).
- **V ≤ 3** because [D1](#d1-a-detail-screen-has-exactly-four-regions-in-this-order) says a
  detail screen has four regions and the third one is the content. Header, strip, content.
- **G ≤ 25** is the glance model: the header plus the first five rows. Five, not twelve,
  because past the fifth row a person has stopped glancing and started scanning, and the
  complaint is about the glance.
- **S** measures against *the width content is allowed to fill*, not the viewport. In the
  agency app that is 1120px at 1440 (1440 less the 240px rail less the two 40px gutters);
  in the portal it is the portal's own 768px cap, which is a locked decision
  ([L5](#l5-the-portal-keeps-its-own-narrower-cap-and-larger-type)) and not a failure. A
  door card (sign-in, onboarding, a refusal) has no content to spread, so **S is not
  measured** there and the screen is scored out of 80 and normalised.

**Grouping fidelity, stated so two people get the same number.** Walk every band and every
boundary on the screen. A **band** conforms when every unit on it answers the same question
about the same subject. A **boundary** between two blocks conforms when it carries
**exactly one** grouping cue ([N6](#n6-one-cue-per-boundary-and-the-container-is-earned)).
Zero cues and two cues both fail, and they fail for the same reason: the eye is being told
nothing, or told twice.

**What the app scored when it was measured — 18 Aug 2026, before the density round
§12 now marks Done.** 53 screens measured across both front doors, mean **75.9**
(*fine*): 21 calm, 12 fine, 13 busy, 7 overwhelming. The agency app means 74.4 and the
portal 84.4. The full table, and the work that followed from it, live in
`.session-notes/ui-rearrangement-plan.md` — **a session note, not a repository
document**: `.gitignore` keeps everything under `.session-notes/` except `lanes/`,
so it is on the owner's machine and in no clone. Nothing has re-measured the estate
since that round landed, so these are the before numbers, not today's.

---

### N1: at most four units on a band, six in a table row

The fifth fact moves to a second line, into the three-dot menu, or off the screen. It does
not get squeezed onto the end.

The worst bands as counted on 18 Aug 2026, off the source as it then stood *(fact
updated 26 Aug 2026: the four worst — the 29-pill switcher, the 9-column table and
both 8-fact rows — have since been fixed, and §12's table marks each one **Done**;
these rows stand as the evidence that round was ordered on, not as today's screens)*:

| Band | File | Units |
|---|---|---|
| The language switcher | `shared/web/language-section.tsx:72` | **29** |
| Meetings, `?view=all` table | `web/components/meetings/meetings-screen.tsx:72` | 9 columns |
| A work-log row | `web/components/work/time-panel.tsx` | 8 |
| A process step row | `web/components/process/process-detail.tsx` | 8 |
| A sprint overview row | `web/components/work/sprints-screen.tsx` | 7 |
| A story's work-log row | `web/components/work/story-detail.tsx:214` | 7 |
| A process version row | `web/components/process/process-detail.tsx:287` | 7 |
| The portal's `StepLine` | `web-portal/components/impact-screen.tsx:72` | 7 |

The fix is never a smaller font. It is
[K1](#k1-a-collection-row-is-a-title-plus-one-meta-line-and-nothing-else): a title and one
meta line, and the meta line is three facts. Everything else is on the record, one click
away, and the click is cheaper than the crowd.

### N2: at most three blocks before the primary content

Count from the top of the content region to the first row of the thing the screen is
named after. A collection's primary content is its rows; a record's is the first field of
its open tab.

The standard collection screen stacks **CollectionHeading, PagedFind, action row,
CollectionCard**, which is V=3 and passes. Every screen that fails does so by inserting
something between the heading and the rows:

- **Tickets** puts a TriageStrip, an outer tab strip and an inner tab strip in there
  (`web/components/tickets/tickets-collection.tsx:148-193`). V=6.
- **Sprints** adds a state heading and a kind label above the first row
  (`web/components/work/sprints-screen.tsx:212`). V=5.
- **Processes** puts the whole ImpactPanel, an accordion three levels deep, above the list
  (`web/components/process/processes-screen.tsx:67`). V=4.
- **Knowledge** puts the ask box above the list
  (`web/components/deep-link/collection-content.tsx:461`). V=4.

The rule is not "delete them". It is: **a block that is not the primary content, and not
required to filter it, goes below the primary content.** The person came for the list.

### N3: at most twenty-five units above the fold

This is the rule that says scrolling is free. The owner asked for screens where "users are
more than happy to scroll", and the way to earn that is to make the top of the screen
worth arriving at, not to fit more into it.

`G = 3 + 2(V−1) + T + min(5, rows) × H`. Because `T` (the tabs) is in there, a nine-tab
record detail spends nine of its twenty-five before it has said anything. Account detail
has 8 tabs, App detail has 9. See [N10](#n10-the-control-follows-the-option-count) for
what to do about that.

### N4: every band answers one question

This is the "twisted" rule, and it is the one that does not show up in a count.

A band fails when its units are co-located rather than related. Two live examples:

- **Dropdown values** (`web/components/choices/selectable-screen.tsx:115`) puts a filter bar that
  says "Showing X of Y" on the same band as a search box and a status Select. The count is
  a *result*, the search and the select are *causes*. Three units, one band, two different
  questions.
- **Internal rates**, a card that was removed on 10 Sep 2026 with the internal rate
  tables, put the label, the rate, "Used when unnamed", "Retired", Edit and Retire on
  one row: two facts, two states and two actions, in one left-to-right sweep. The
  example stays because the mistake is a shape, not a file, and the next card built
  in a hurry will make it again.

The repair is always the same shape: split the band by the question it answers. Facts on
one line, state as a badge at the end of that line, actions in the trailing slot or the
menu. Never facts and actions interleaved.

### N5: the surface step is measured, not assumed

**The rule.** Two surfaces read as separate only when their perceptual lightness differs
by **ΔL\* ≥ 8**. A hairline reads as a line only when it differs from **both** surfaces it
divides by **ΔL\* ≥ 4**.

**Why this rule exists.** The owner reported that "the dark mode looks much better than
light mode because the contrast between UI elements is much clearer on dark mode". That is
not a preference, it is arithmetic, and here it is. Measured in a browser against the
tokens the deployed app actually resolves (`shared/brand.ts` overrides `--background`,
`--primary` and `--secondary`; the rest come from `shared/ui/foundations/tokens/tokens.css`):

| Boundary | Light ΔL\* | Dark ΔL\* | Dark advantage |
|---|---|---|---|
| page to card | **3.22** | **10.32** | 3.2× |
| card to hairline | 4.98 | 11.31 | 2.3× |
| page to hairline | 8.20 | 13.51 | 1.6× |

Light: page `oklch(0.99 0.004 95)` = L\* 98.89, card `#f7f2ea` = L\* 95.67, contrast
1.084:1. Dark: page `oklch(0.2 0.004 80)` = L\* 7.28, card `#2c2b2a` = L\* 17.60, contrast
1.280:1.

**What follows from it.** In dark mode the fill step alone (10.32) groups a card, so the
card is legible with no border at all. In light mode the fill step (3.22) is below the
threshold, so **a filled card with no border is invisible in light mode** and the eye gets
no grouping cue from it whatsoever. That is the mechanical reason the same screen feels
tidier in dark: dark mode is doing grouping work that light mode is not.

**AMENDS [C2](#c2-cards-have-no-border-no-shadow-and-no-hover-animation).** C2 said a card
has no border, on the evidence of a runtime census of kwapso.com. That evidence stands for
kwapso.com, which puts four cards on a page inside enormous whitespace. It does not
transfer to a screen holding twelve blocks. **A card keeps `border`; it still keeps `no
shadow` and `hover-lift-none`.** One drawn cue, never two, and the fill is a surface
rather than a drawn cue. If a future theme raises the light page-to-card step past ΔL\* 8,
the border comes off and this amendment is deleted.

**Never hard-code a colour.** Every colour resolves through a token
([C10](#c10-there-is-one-ink-stepped-by-opacity-not-a-grey-ramp)). Two live breaches, both
cheap:

- `web/components/screens/import-screen.tsx` uses `amber-500`, `amber-600`, `emerald-600` and
  `emerald-500` at lines 309, 310, 423, 425, 482, 484. **11 class occurrences, one file,
  the only file in either front door that touches a banned Tailwind ramp.** They mean
  warning and success, and both are tokens already: `text-warning` and `text-success`.
- `shared/departments.ts:33-37` hard-codes `#F4C600`, `#6738E8`, `#B1E847`, `#f584e3` and
  `#C497FE`. Five colours, none of them in kwapso's seven. A department is a mark, so it
  belongs on `--chart-1` to `--chart-5`
  ([C6](#c6-sky-forest-and-poppy-are-marks-not-backgrounds)).

The rest of the hex literals in the repo are legitimate and stay: `shared/brand.ts` is the
branding seam by design, `shared/workers/email-template.ts` is email (no CSS variable
survives an email client), `shared/web/pwa.ts` and `shared/web/splash.ts` are OS-level
theme colours, and `shared/web/google-sign-in.tsx` is Google's own mark.

### N6: one cue per boundary, and the container is earned

**Three cues, and a boundary gets exactly one.**

| Cue | Qualifies when | Written as |
|---|---|---|
| whitespace | ≥24px and nothing else in the gap | `gap-6` |
| a hairline | ΔL\* ≥ 4 from both surfaces ([N5](#n5-the-surface-step-is-measured-not-assumed)) | `border` / `border-t` / `divide-y` |
| a filled surface | it is a container, and it carries the hairline as one unit | `bg-card rounded-xl border p-4` |

Whitespace plus a container is **one** cue, because the container is the boundary. Two
containers with a border between them is two, and that is over-separation.

**When a block gets a container at all.** This is the rule that removes the most clutter,
and it is countable:

> A block earns a container when it holds a **collection of two or more rows** or a **form
> of two or more fields**. Nothing else does.

A heading, a paragraph, a single stat, a single action, a callout, an audit footer: bare on
the page, separated by `gap-6`. When this census was taken the app drew **130 border classes
across 58 files**, plus 6 `divide-y`. The heaviest were `web/components/screens/import-screen.tsx` (9),
`web/components/process/process-detail.tsx` (8), `web-portal/components/impact-screen.tsx` (7),
`web/components/shell/app-shell.tsx` (6) and the internal rate card (5) — that last file was
removed on 10 Sep 2026 with the internal rates, so the two totals above are five classes and
one file high until somebody re-runs the count.
Import's review phase draws a bordered card per step inside a bordered plan inside a
bordered screen, and that is the twisted feeling arriving as geometry.

`<Separator>` is used **zero** times and stays that way: a separator inside a block is a
hairline, and a separator between blocks is `gap-6`. `shadow-*` is used **once**
(`web/components/assistant/agent-host.tsx:45`), on the floating assistant button, which is the one
thing on screen that genuinely hovers. No other shadow ships.

**AMENDED 18 Sep 2026 ~06:40 (Round 17) — the button sits entirely inside the top margin,
never overlapping the content below it.** The client's ruling, verbatim: *"put the open
assistant button completely on the top margin, not liek now that its slightly overlaping
with main content."* `agent-host.tsx`'s floating button is repositioned so its whole
silhouette, including its shadow, sits within the top gutter band above the content card —
never partially over the card or the main content column below it.

**Status: ruled, in build, 18 Sep 2026 (kit v1.2.116).**

### N7: five gaps, and each one means something

**AMENDS [S1](#s1-the-vertical-rhythm-is-4-8-16-24-40),** which named the scale
(4, 8, 16, 24, 40) and then in its own next line used `gap-3` for a row. This is the
version with the meanings attached, and it is the one to implement:

| Class | px | Means |
|---|---|---|
| `gap-1` | 4 | parts of one thing: an icon and its label, a value and its unit |
| `gap-2` | 8 | siblings inside one group: fields in a field group, chips in a row, the buttons of one action group |
| `gap-4` | 16 | rows inside one block: list rows, the mark and the title column of a header band |
| `gap-6` | 24 | **between blocks. This is the gap that says "these are separate."** |
| `gap-10` | 40 | between page sections that each carry their own heading, on a screen with three or more of them |

**Nothing between them, and nothing outside them.** The census says the app does not obey
this today. Of **516 gap classes**: `gap-2` 153, `gap-1.5` **125**, `gap-3` **85**,
`gap-4` 57, `gap-1` 34, and `gap-6` only **11**. So 210 of 516 gaps (40.7%) are off-scale,
and the one gap that means "these are separate" is used eleven times in the whole app.

That single number is the mechanical explanation for "too much in one go". The app is
built almost entirely out of 6px and 12px gaps, which is the spacing of *parts of one
thing*. Everything therefore looks like it belongs to everything else, so the eye has
nowhere to rest and no way to tell where one idea ends and the next begins.

The conversion is mechanical: `gap-1.5` becomes `gap-1` inside a control and `gap-2`
between controls; `gap-3` becomes `gap-2` inside a group and `gap-4` between rows; `gap-5`
and `gap-8` become `gap-6`. `space-y-*` is used twice
(`web/components/shell/install-prompt.tsx:114,128`) and both become `gap-*` on a flex column.

### N8: one width, one set of gutters, and no screen sets its own

**The full horizontal span rule, settled.** The owner named the inconsistency exactly:
*"on many pages, like work logs, tasks, or meetings, we are using a lot of the horizontal
space with minimal padding from the sidebar and the right side of the screen, which is
good. I just don't know why it's not applied to other places."*

Here is why. Work logs, tasks and meetings render through `DeepLinkScreen`, whose one
container is `mx-auto flex w-full max-w-[1600px] flex-col gap-6`
(`web/components/deep-link/deep-link-screen.tsx:336`). At 1440 that is 1120px of content in 1120px
of available room, **S = 100%**. Six screens do not go through it and cap themselves
instead:

| Screen | File | Cap | S at 1440 |
|---|---|---|---|
| Home | `web/components/screens/home-screen.tsx` | `max-w-2xl` (672) | 60% |
| Settings | `web/components/screens/settings-screen.tsx` | `max-w-2xl` | 60% |
| Profile | `web/components/screens/profile-screen.tsx` | `max-w-2xl` | 60% |
| Invitations | `web/components/screens/invitations-screen.tsx` | `max-w-2xl` | 60% |
| Kwapso | `web/components/screens/kwapso-screen.tsx` | `max-w-3xl` (768) | 69% |
| The shell's own loading skeleton | `web/components/shell/app-shell.tsx` | `max-w-2xl` | 60% |

**That census is the BEFORE, and it has been acted on: not one of those six caps is on
disk any more.** The table stays as the evidence the rule was argued from; the line
numbers it used to carry are gone from it, because a line number is a pointer at a cap
that no longer exists there and every one of them had already drifted. Read the file
column as "this screen used to cap itself", not as somewhere to go and look.

The last one is worth its own sentence: the skeleton is 672px wide and the content that
replaces it is 1120px, so **every cold load of the agency app visibly snaps sideways.**

**The rule.** `max-w-[1600px]` lives in exactly one place and no screen sets a width. The
gutters are `px-4 sm:px-6 lg:px-10` and live in exactly one place
([S2](#s2-horizontal-gutters-are-px-4-smpx-6-lgpx-10)), which is also the brand site's own
40px margin. Padding inside is
[S3](#s3-card-padding-is-p-4-panel-padding-is-p-6): card `p-4`, panel `p-6`, dialog through
`FormShell`, and nothing else.

The `max-w-*` values that survive this rule, and the only ones: `max-w-[1600px]` (the one
page container), `max-w-3xl` (the portal's own cap,
[L5](#l5-the-portal-keeps-its-own-narrower-cap-and-larger-type)), `max-w-sm` and
`max-w-md` (door cards and dialogs), and `max-w-[85%]` (a chat bubble). Everything else
goes.

**Prose is capped, the page is not** ([L2](#l2-prose-is-capped-the-page-is-not)). A wide
page does not mean a 1120px line of text: a paragraph inside it still wears its own
measure. Width is for tables, lists and columns, not for sentences.

### N9: two radii, one fill, no shadow

**AMENDS [T7](#t7-the-radius-vocabulary-is-two-values-and-the-class-you-write-is-rounded-xl)**
with the census. Every Tailwind radius step from `sm` to `3xl` resolves to the same 24px in
this theme (`styles.css`: "no component can accidentally drift onto an in-between size"),
so the vocabulary is about the source and not the pixels. Today: `rounded-xl` 58,
**`rounded-lg` 48**, `rounded-full` 8, `rounded-md` 5, `rounded-2xl` 2, `rounded-t-2xl` 1,
`rounded-sm` 1, `rounded-none` 1.

**57 of 125 radius classes are off-vocabulary, and changing every one of them is a visual
no-op**, because they all already compute to 24px. That makes it the cheapest rule in this
document to enforce and the easiest to check.

Write `rounded-xl` for a rectangular surface and `rounded-full` for a pill. Nothing else.

### N10: the control follows the option count

One decision rule for dropdown against pills against tabs against radio. Read the two
questions in order.

**Question one: does the control change the VIEW, or set a VALUE?**

**Question two: how many options, and are they mutually exclusive?**

| Options | Mutually exclusive | Changes the view | Sets a value |
|---|---|---|---|
| 2 to 6 | yes | **tabs** (`TabsView`, [R3](../RULES.md)) | **chips** ([F7](#f7-a-short-enumerated-choice-is-a-row-of-chips-not-a-select)), or **radio** when each option needs a sentence of explanation |
| 7 or more | yes | **a dropdown** that reads as a view switch, with the current view on the trigger | **a `Select`** |
| any | no | **a filter facet** in the collection toolbar ([K7](#k7-the-collection-toolbar-is-one-row-heading-search-filter-add)) | **checkboxes**, up to 5, all visible; a multi-select popover above that |

**And one measurable override that beats both questions: a row of chips or pills that
wraps to a second line at 1440px is a dropdown.** Wrapping is the control telling you it
has outgrown its shape.

**This rule predicted the live case, and the live case has since been fixed.** When it was
written, `shared/web/language-section.tsx` rendered one `Button` per entry in `LANGUAGES`,
and `shared/i18n.ts` holds **29** of them. It sets a value, the options are mutually
exclusive, there are 29, and they wrapped to roughly six rows inside the 672px column the
switcher then sat in. Both tests said **dropdown**, and it was the single worst band in
either front door (H=29, against a budget of 4). It is the library `Select` today, and
`web/test/language-switcher.test.tsx` holds it there — a `Button` import back in that file
turns the build red. The section itself now lives in Settings › Appearance, not on the
profile page (client, 2026-09-10: *"language shoudl be in settings somewhere, not in my
porfile"*).

**The objection in that file's own header comment is real, and the rule answers it.** It
says a dropdown "makes somebody who cannot read the current language hunt for the control
that fixes that". That is true of a dropdown showing a language *code*. So the language
switcher carries a named exception: **its trigger shows the flag and the language's own
name for itself, never a code, and the menu is searchable.** Someone who reads no English
still sees the flag and Deutsch on the trigger, and finds their own name in the list. The
portal already does exactly this (`shared/web/language-menu.tsx`), so this is the two front
doors agreeing rather than a new pattern.

Three more controls meet the same test today, and two of them take the same answer:

- `shared/web/scale-section.tsx:84` renders 3 buttons. **Three is chips. It passes, leave
  it alone.** ([S4](#s4-the-scale-setting-is-three-steps-and-it-sets-one-css-variable))
- `web/components/work/time-panel.tsx:117` renders one button per assigned story, unbounded.
  Past six it is a dropdown.
- `web/components/tickets/tickets-collection.tsx:168-178` builds an inner strip of
  `4 + N ticket types`, so it crosses six the moment a team defines three types. The tab
  strip stops at six and the rest becomes a filter facet, which is what it always was:
  ticket type is a *filter*, not a *view*.

### N11: a glyph on every destination and every collection heading

**EXTENDS UI-CONVENTIONS.md §5 and [G1](#g1-a-record-type-carries-a-glyph).** The owner
wants marks on the main screens, the nav and the collections, not only on detail screens.
Here is what is achievable today without touching the library, and what is not.

**Achievable now:**

- The nav rail already resolves its glyph from `CONCEPT_ICON` in `web/lib/pages.ts:262`.
  Every destination has one; keep it that way, and add the concept there before the screen.
- A tab strip already takes an icon per tab: `TabsView` is given `icon` on every team
  section (`web/components/shell/team-section-nav.tsx:42-59`), and
  [R3](../RULES.md) is written around "icon + count badge". Any strip that
  is missing icons can have them today.
- A **collection heading** may carry its concept glyph beside the title.
  `CollectionHeading` is the host's own component
  (`web/components/records/collection-heading.tsx`), so this is a host change.
- A **group heading** inside a collection may carry the type mark: the sprints overview
  already does it (`web/components/work/sprints-screen.tsx`) through `RecordMark`
  (`shared/web/record-mark.tsx`). The header band no longer draws one — client ruling,
  2026-09-01, "no images on title" — and the `TypeMark` wrapper that used to sit in
  `web/components/records/record-chrome.tsx` for it was deleted on 2026-09-07 once
  nothing rendered it.
- Any **host-composed** row may carry a mark, because the library `List` has the slot:
  `item.leading` (`shared/ui/components/list/list.tsx`). Home and Settings use it
  today.

**Not achievable, and do not work around it:** a **recipe-driven** collection row cannot
carry one. `ScreenRenderer.renderList` maps a row to `{ id, title, subtitle }` and passes
no `leading` (logged as **UI-GAPS #16**). That is every ticket, story and account list plus
the Sprints "All" tab. The only host-side workaround would be to put the glyph inside the
title string, and a pictograph inside a sentence is the one shape §5 refuses. **So the mark
is simply absent there and the word carries the meaning on its own**, until the library
ships the one-line fix.

**AMENDED 17 Sep 2026 — five destinations corrected, over a screenshot of the whole rail.**
The client's ruling, verbatim, five in one pass because "they all look too similar":
Waves → the regular weight, not solid (*"For waves, use the regular, not solid."*); Tasks
→ `ChecksRegular`, Phosphor's plural checks at regular weight, coexisting with the
fill-weight `Checks` two confirm buttons already use (*"For tasks, use the checks in
plural in regular."*); Knowledge → `BookmarkSimple` at fill weight (*"for knowledge, use
bookmark simple in fill solid"* — after a same-day, few-hours-earlier pick of a brain
glyph, see [K36](#k36-the-knowledge-collection-centralizes-search-through-the-assistant-a-head-bar-carries-ask-sync-and-gear));
Contacts → `UserCircle` at fill weight, off `AddressBook` (*"For contacts, use the user
circle in the field."*); Settings' Roles row → `ShieldCheck` (*"For settings rules, use
the shield check in Solid."*). Every one of the five is a single entry in `CONCEPT_ICON`
(`web/lib/pages.ts`) or `SECTION_ICONS` (`web/components/shell/app-shell.tsx`) — one
concept, one icon, whichever file draws it.

### N12: what to do when a screen is over budget, in order

Do these in order and stop when the screen passes. The order is by load removed per unit of
risk.

1. **Widen it.** If S < 0.9, delete the screen's own `max-w-*` ([N8](#n8-one-width-one-set-of-gutters-and-no-screen-sets-its-own)). Zero behaviour change, and on an admin screen it is usually the whole fix.
2. **Split the busiest band.** If H > 4, move facts past the third onto the record and states into a badge at the end of the line ([N1](#n1-at-most-four-units-on-a-band-six-in-a-table-row), [K1](#k1-a-collection-row-is-a-title-plus-one-meta-line-and-nothing-else)).
3. **Move the actions.** Everything past one primary and one secondary goes into the three-dot menu ([B1](#b1-two-visible-actions-maximum-on-any-title), [B2](#b2-the-three-dot-menu)). Never remove the confirm when you move a destructive action.
4. **Push the non-primary blocks below the primary content.** If V > 3, the block that is not the list and not a filter on the list goes under the list ([N2](#n2-at-most-three-blocks-before-the-primary-content)).
5. **Take away containers.** Any block that is not a collection of two or more rows, or a form of two or more fields, loses its border ([N6](#n6-one-cue-per-boundary-and-the-container-is-earned)).
6. **Fix the gaps.** Off-scale gaps to the five values, and `gap-6` between blocks ([N7](#n7-five-gaps-and-each-one-means-something)).
7. **Collapse the control.** Seven or more options, or a wrapping row, becomes a dropdown ([N10](#n10-the-control-follows-the-option-count)).

Only after all seven does anything get deleted. Nothing in this section asks for a feature
to be removed, and none of it needs a library change.

---

## 13. The kit, and what counts as using it (U1 to U4)

The twelve sections above decide how a screen is arranged. This one is about the lego
itself: which parts of the kit this app has taken up, and where a part of the app lives
when you write one. It is the only section here that constrains a FILE rather than a
pixel — which is why it is short, and why every rule in it is a written decision rather
than a taste.

Read it beside "Do not do" [#2](#do-not-do) ("do not re-implement a library primitive
locally"): that line tells you to check before you build, and these three are what make
"we checked" a thing somebody can verify a year later.

### U1: every part of the kit is either reached or has a written reason

**The rule.** The kit at `shared/ui/` ships a set of components and three foundations
(icons, tokens, motion), and **every one of them** resolves to one of two things: an
adoption this app really reaches, or a line saying why not. The owner's instruction:
*"all 118 components should be imported, and if you're not using some, I understand that,
but there should be nothing hard-coded."*

**How many there are is DERIVED and written down nowhere** — `kitInventory()` in
`scripts/kit-coverage.mjs` reads it off the pinned tree, so the number moves with the pin
instead of rotting in four documents.

**"Reached", not "imported", and the difference cost seven real adoptions.** Counting
import lines undercounts in one direction, always by dropping a genuine adoption: six kit
parts reach this app only THROUGH another part it has already adopted (notes through
Comments, folder through Tabs, progress through the file upload), and `motion` reaches both
front doors **only through a CSS `@import`** in their own `globals.css` — a reference no
JavaScript grep can see in either direction, because there is no import line in that
language to miss. So the walk closes over the kit's own cross-references, in both languages
the kit speaks.

**What a reason has to be.** One sentence a non-technical reader can check: no surface in
this app has this shape, or adopting it would break another rule. Each one names a GAP to
fix upstream. The list is rot-checked both ways, so it can only shrink.

**Law.** [R46](../RULES.md) (`component-coverage`).

### U2: every whole-screen composition the kit ships is DECIDED

**The rule.** U1's sibling, one directory level up: the kit's `compositions/` are its
screen-shaped assemblies, and each one is either adopted for real or carries a written
reason — a structural mismatch, a shape this app already assembles from other adopted parts
under a different name, a real gap it should or should never have, or a question left for
the owner.

**Two outcomes are acceptable and one is not.** Adopted, or deliberately not used for a
stated reason. A composition nobody looked at, or hand-rolled screen UI that quietly
duplicates one, is the unacceptable result. The owner's own words: *"make sure that we get
47 out of 47 compositions… if there are some compositions that we don't use, I completely
get that, but flag those… there should be nothing that we have hard-coded unless it's some
kind of composition that does not exist."*

**Why a check rather than a note.** Two lanes had worked through 37 of the 47 by hand, in
prose, with nothing behind it — so the count could regress the moment a kit update landed a
new composition, or the moment somebody hand-rolled a screen that duplicated one, and
nothing would have said so.

**Law.** [R45](../RULES.md) (`composition-coverage`).

### U3: a new component joins a folder, and the folder says what belongs in it

**The rule.** `web/components/` has **no top-level files**: one folder per MODULE
(`tickets/`, `work/`, `accounts/`, `team/`, …) or per KIND (`shell/`, `records/`,
`deep-link/`, `assistant/`, `screens/`). What belongs in each is written **once**, one line
per folder, in `web/components/README.md` — and the permitted set is derived from that
file's own rows, so the paragraph a person reads and the rule a build enforces cannot
disagree, because there is only one of them.

**Three ways to fail**: a component left loose at the top level, a folder nobody described,
and a described folder nobody has.

**The two axes, because neither pair is guessable** and that is exactly why the words exist
and not just the check: `tickets-screen.tsx` sits in `tickets/` because it draws a module,
and `home-screen.tsx` in `screens/` because there is no home module; `collection-heading.tsx`
sits in `records/` because every collection reuses it, and `collection-content.tsx` in
`deep-link/` because only the routing shell renders it.

**One practical consequence for everything else in this book.** Name a component by
BASENAME wherever you can, never by folder path: the source walks recurse, so a law that
finds a screen by name still finds it after a move, while a literal path in a document or a
test has to be moved by hand (UI-CONVENTIONS.md §1).

**Law.** [R57](../RULES.md) (`component-folders`).

### U4: an app-side override targets a token the kit owns, never a class name it happens to emit

**The rule.** The team-chip colour ruling — client, 2026-08-31, pointing at a Contact's
"Contact"/"Can sign in" pills: *"there's a color that you keep getting wrong on the pills.
use this color #F7F2EB (the main token for beige)"* — was correctly made that day and was
DEAD for two weeks without anyone knowing. The fix matched `Badge`'s literal
`bg-surface-quiet` class; a later kit resync (v1.2.13 → v1.2.15) turned that class into
`bg-[var(--badge-quiet-fill, var(--surface-quiet))]`, a custom property with a fallback,
and the old class selector matched nothing from that point on. Every plain badge app-wide
quietly kept drawing the kit's default grey, invisibly, because a dead selector fails
green — nothing asserted the class it targeted still existed. The client re-flagged the
identical colour a second time, Settings › Team, 2026-09-14: *"the chips in team this color
#F7F2EB."*

**The fix moved to the seam.** `[--badge-quiet-fill:var(--surface-panel)]` on `<body>` in
both front doors' root layouts (`web/app/layout.tsx`, `web-portal/app/layout.tsx`) —
`Badge`'s own documented escape hatch, ordinary CSS custom-property inheritance, no class
string to go stale the next time the kit's build changes its generated output.

**The rule is the lesson, not the colour.** A CLASS the kit emits is compiled output and is
nobody's contract; a TOKEN or a custom property the kit documents as an override point is
the contract. An app-side override that matches the former dies silently on the kit's next
resync; one that rebinds the latter survives it — the same seam `IDENTITY_ROW`
(`web/components/records/record-chrome.tsx`) and the tickets triage card already use for a
LOCAL rebind of the identical property.

---

## What the old app did better

Four things Glide got right that this app currently gets wrong. Each is the reason a
whole section above exists.

### 1. It hid the actions people rarely take

`A-4.05.52`: a story detail with one visible button, "In progress", and a three-dot menu
holding Blocked, Edit, Archive and Delete. `A-3.57.42`: a meeting detail with nothing but
a three-dot. `P-4.10.05`: a portal app detail with exactly "Open App" and "New Ticket".

Here, `web/components/tickets/help-detail.tsx:418-539` puts Translate, Answer, Reply by email,
Make it a story, Edit, Archive, Move up and Move down on the same screen region, and the
codebase contains no overflow menu at all. The old app made the primary action obvious by
removing its competitors. See [B1](#b1-two-visible-actions-maximum-on-any-title) and
[B2](#b2-the-three-dot-menu).

### 2. It kept context while you scrolled

`A-4.00.19` compared with `A-4.00.30` and `A-4.00.37`: the header band scrolls away and
the tab strip pins to the top of the viewport, badges intact, so you always know which
record and which tab you are in. Nothing in this app is sticky below the shell chrome,
so scrolling a long ticket loses the title, the tabs and the record entirely. See
[D3](#d3-the-header-and-tabs-stick).

### 3. It put almost nothing in a collection row

`A-3.58.53`: contact rows are a name and a company. `P-4.10.05`: ticket rows are a title
and "Created on 6 August 2026 · Paras Maroo". `A-4.00.11`: sprint rows are a name and a
date range. When more facts were genuinely needed it switched to a table with column
headers (`A-4.05.42`) rather than cramming them into a subtitle.

Here, `web/components/deep-link/shape.tsx` built a ticket subtitle out of four facts and
prefixed the reference into the title as well; `work/stories-screen.tsx` used five. The
result was a wall of text with no shape. *(Fact updated 7 Sep 2026: both are fixed.
`shapeHelpList` is now a title plus two facts — status and kind — and `shapeStories` a
title plus three — status, who has it, when it is due — with the ref, the sprint and the
answered ticket moved onto the record. The diagnosis is kept because it is what the rule
below is FOR.)* See
[K1](#k1-a-collection-row-is-a-title-plus-one-meta-line-and-nothing-else) and
[K2](#k2-a-table-is-for-scanning-a-list-is-for-reading).

### 4. It used the whole screen

`A-4.06.36`, `A-4.05.42`, `A-4.08.47`: content runs edge to edge with a gutter of roughly
45px and no width cap, so a table of nine stories shows five columns without truncating
any of them. This app caps every module screen at 768px
(`web/components/deep-link/deep-link-screen.tsx:330`), so the same table would truncate at column
two while 138px of empty page sits on either side, and over 700px on a large display. See
[L1](#l1-one-page-container-one-cap).

### Honourable mention: the one form said "Submit"

`P-4.10.31` and `P-4.10.36`. One word, with Cancel beside it, in a bar pinned to the
bottom of a scrolling sheet. This app has 31 different words for the same act. See
[F1](#f1-every-submit-button-says-submit) and [F2](#f2-the-dialog-is-a-three-row-grid-and-never-spills).

---

## Do not do

1. **Do not change a component in `shared/ui/` to satisfy a rule in this document.**
   Two reasons now, where this book was written with one. The kit is a PINNED
   dependency since 2026-08-25 — a hand-edit under `shared/ui/` turns the build red
   (`web/test/vendored-kit.test.ts`), and a component change is made upstream in
   `github.com/Kwapso/kwapso-ui-ux`, tagged, and pulled — and, the original reason, this
   is a *rearrangement* rule book: every rule in
   it is implementable from `web/`, `web-portal/` and `shared/` without touching a
   component. If you reach a rule you cannot express that way, stop: either the rule is
   wrong or it belongs in the reskin's own work, and UI-CONVENTIONS.md §1 is where a
   real component change gets decided.
2. **Do not re-implement a library primitive locally** because a prop is missing. Eleven
   library components ship unused already (`Title`, `Headline`, `Text`, `Hint`,
   `Container`, `Spacer`, `Clamp`, `ActionRow`, `RecordDetail`, `DetailView`,
   `CollectionFrame` directly). Check whether the thing you want exists before you build
   it.
3. **Do not invent a prop.** `tone`, `level`, `as` and `size` on anything other than
   `Button` and `Spacer` do not exist. `variant` exists only on `Button`, `Badge`,
   `Title` and the tabs family, and `Button`'s six values are not `Badge`'s six values.
   `surface: "card" | "none"` exists on exactly five components: `List`, `DataTable`,
   `ActivityFeed`, `DescriptionList`, `RecordDetail`.
4. **Do not add a third surface colour.** Two paper tones, `--background` and `--card`,
   and that is the system ([C1](#c1-the-page-is-off-beige-the-card-is-soft-paper-and-that-is-the-whole-surface-system)).
   Likewise do not add a fifth grey, and never reach for Tailwind's `neutral`, `gray`,
   `zinc`, `stone` or `slate` scales: none of them is in this palette
   ([C10](#c10-there-is-one-ink-stepped-by-opacity-not-a-grey-ramp)).
5. **Do not replace a card's border with a shadow.** Flat fill plus one hairline, and
   nothing else. (This item said "do not put a border on a card" until
   [N5](#n5-the-surface-step-is-measured-not-assumed) measured the light theme's
   page-to-card step at ΔL\* 3.22 and found the borderless card invisible there. The
   no-shadow half is unchanged and is not negotiable.)
6. **Do not make a content surface translucent.** The ambient field belongs behind the
   header band, nowhere else ([C3](#c3-the-ambient-field-never-sits-behind-a-content-surface)).
7. **Do not animate a card.** No hover lift, no scale, no shadow transition, no colour
   transition. `hover-lift-none` exists for this.
8. **Do not hand-roll a tab strip or a toggle.** R3 is machine-checked and the check hunts
   `variant={x === y ? … : …}`.
9. **Do not bypass `FormShell`.** R4 is machine-checked. [F2](#f2-the-dialog-is-a-three-row-grid-and-never-spills)
   changes `FormShell` itself, which keeps every call site compliant for free.
10. **Do not write emoji into a component** until UI-CONVENTIONS.md §5 has been amended.
    See [G1](#g1-a-record-type-carries-a-glyph).
11. **Do not write an em dash into a user-visible string.**
12. **Do not add a per-screen width.** One container, one cap
    ([L1](#l1-one-page-container-one-cap)). The four different `max-w-*` values in `web/`
    today are the problem this replaces.
13. **Do not give a component a size prop for the scale setting.** One root font size,
    everything in `rem` ([S4](#s4-the-scale-setting-is-three-steps-and-it-sets-one-css-variable)).
14. **Do not remove a confirm step** when you move a destructive action into the three-dot
    menu.
15. **Do not change the portal's cap or type size to match the agency app.** The
    divergence is deliberate ([L5](#l5-the-portal-keeps-its-own-narrower-cap-and-larger-type)).

---

## Conflicts to settle before building

Five rules here cross something already written down. The first three need the owner's
ruling before they are implemented. The last two are settled, and the row says how.

| Rule | What it crosses | Proposed resolution |
|---|---|---|
| [G1](#g1-a-record-type-carries-a-glyph), [G2](#g2-the-mapping-if-option-1-is-taken) | UI-CONVENTIONS.md §5, "**No emoji.** Anywhere." | Amend §5 to "no emoji in copy" and add the type mark to §4, or fall back to the kit's own glyphs (`@shared/ui/foundations/icons`; "lucide" here until 7 Sep 2026, which R39 forbids). Law changes first, code second. |
| [C3](#c3-the-ambient-field-never-sits-behind-a-content-surface) | UI-CONVENTIONS.md §7, "Surfaces that float over it … use the frosted `.glass`" | **SETTLED 2026-08-19 IN THE LIBRARY, not by an override.** The premise here was wrong twice: the library's comment said the opposite, and the proposed `[data-slot="dialog-content"]` selector matches nothing — `data-slot` appears zero times in the installed registry. Every floating surface is opaque at v0.13.0 and a census enforces it; a card keeps `.glass` on purpose. |
| [F3](#f3-the-separator-becomes-the-action-bars-top-edge) | `shared/web/form-shell.tsx:43-53`, an 11-line comment defending `pt-6` as "the ONE value that governs it everywhere" | The comment documents the exact bug being fixed. Replace the value with a structure that cannot have the bug, and replace the comment with one sentence saying so. |
| [N5](#n5-the-surface-step-is-measured-not-assumed) | [C2](#c2-cards-have-no-border-no-shadow-and-no-hover-animation) and "Do not do" #5, both of which said a card has no border | **SETTLED 18 Aug 2026 by measurement, not by preference.** The light theme's page-to-card step is ΔL\* 3.22, below the threshold at which two flat surfaces read as separate; the dark theme's is 10.32. A borderless card is therefore invisible in light mode, which is exactly the difference the owner reported between the two themes. The card keeps its hairline; the no-shadow rule is untouched. Delete this row and restore C2 the day a theme change raises the light step past ΔL\* 8. |
| [C2](#c2-cards-have-no-border-no-shadow-and-no-hover-animation) — the hover clause | `Card`'s base class, which used to carry `hover-lift`, and `hover-lift-none`, which used to turn it off | **SETTLED 25 Aug 2026 BY THE DEFAULT MOVING, not by a preference changing.** C2's "no hover animation" was a rule about an inherited default: every card lifted, so the rule was to switch it off, and the opt-out was the mechanism. The kwapso kit ships a still card and an `interactive` prop, so the default is already what C2 wanted and the opt-out no longer exists. A card that lifts now does so because a call site asked, which is the case C2 never legislated. Delete this row if a future kit makes lift the default again. |
| [N10](#n10-the-control-follows-the-option-count) | `shared/web/language-section.tsx`, whose header comment argued AGAINST a dropdown at the time (it records the reversal now) | The comment's objection is about a dropdown showing a language CODE, and it is right about that. N10 answers it with a named exception rather than by overruling it: the trigger shows the flag and the language's own name for itself, and the menu is searchable. The portal already ships that control. |

One more, not a conflict but worth a decision: [T1](#t1-one-heading-scale-per-front-door)
moves 26 headings from `font-semibold` to `font-medium` because the brand ships no 600
weight. If the owner prefers the heavier look, the answer is a third font face in the
library, not a synthesised weight in the host.

---

## Rulings awaiting implementation

**Assistant conversations (2026-09-15):** A "+" tab is always visible in the assistant's tab
strip and remains visible even when the assistant is closed. A new conversation opens on a
scope picker first. A pinned clock tab sits ahead of "+", never closable, and opens the
reader's own conversation history — search on top, grouped by last used (Today / Yesterday /
Last week / Earlier), each row a topic plus its created and last-used dates; picking a row
opens that conversation as a tab in the strip. **Status: built** (`web/lib/agent-conversation-
tabs.ts`, `web/components/assistant/agent-tab-strip.tsx`, `agent-scope-picker.tsx`,
`agent-history-tab.tsx`). The old `agent-history-dialog.tsx` sheet and its launcher button are
retired — the pinned clock tab is now the one way to reach a past conversation.

**Assistant tabs, one level (2026-09-15):** the ruling above shipped with the app's own strip
drawn one level BELOW the kit's single, fixed "Assistant" folder tab — a real conversation
strip, but a sub-level under furniture that only ever said "Assistant." The client's ruling,
over a screenshot of exactly that, verbatim: *"You got it completely wrong. The tabs need to
be at the same level as the assistant tab, so it will have no assistant name. We know that's
what it is. Rather, each tab will have the name. Now you create it like a sub-level, but no,
no, it's only one tab level."* The aside has exactly ONE tab level: no tab is named
"Assistant" — the word is now only the landmark's accessible name
(`role="complementary"`'s `aria-label`), never a visible tab — and `AgentTabStrip` (History ·
one tab per open conversation · "+") IS that one level, not a strip nested under it. Closing
follows from the same reading: a conversation tab's × closes that conversation; History and
"+" are furniture and are never closable; closing the LAST conversation tab closes the
assistant column itself, and the top-right opener reopens it with a fresh conversation on the
scope picker rather than resuming what was just closed. **Status: built.** Kit v1.2.88 added
`ScreenShell`'s `asideTabs` prop for exactly this (`shared/ui/compositions/templates/
screen-shell.tsx`) — drawn IN PLACE of the kit's own single fixed tab, in the identical slot
and geometry, so the folder-tab attachment to the card below is unchanged. App-side:
`web/lib/agent-dock.tsx` (`AgentDockTabsSlot` / `useAgentDockTabs`, the tab-level twin of the
existing panel-body dock), `web/components/shell/app-shell.tsx` (`asideTabs={...}` on the one
`ScreenShell` call site), `web/components/assistant/agent-panel.tsx` (the strip portalled
there when docked; the old `mt-[var(--folder-tab-overlap)]` re-base retired outright — it was
solving a nesting problem that no longer exists — and the closing/reopening behaviour above).
`web/test/agent-tab-strip.test.tsx` proves the aside draws exactly one tab strip and that no
tab renders named "Assistant."

**Corrected 16 Sep 2026, three ways, over a screenshot of the built strip beside the main
content strip.** *"The concept is great, but the design is still broken. Make sure that they
look exactly like the tabs in the main content. Also, I want the history tab to be on the left
of the plus, not the very far left. Put it to the left of the plus. Also, now when I click on
the tab, it doesn't close, so restore that behavior."* Three claims, three findings:

1. **Order — a real bug, fixed.** `AgentTabStrip` pinned History at `items[0]`, ahead of every
   conversation tab, reading "put it before the plus tab" as "ahead of everything." It now
   builds `items` as `[...conversations, history, new]` — History sits immediately left of "+"
   and never at the front. `web/lib/agent-conversation-tabs.ts`'s own header comment on the
   pinned clock tab is corrected to match. Tested: `agent-tab-strip.test.tsx`'s "pinned History
   tab" describe block now asserts History's index is `newIndex - 1` and `> 0`, not merely
   first.
2. **Look — not reproducible from source, and not a kit skin.** `ScreenShell`'s `asideTabs`
   slot (kit v1.2.88) draws the caller's node completely unconditionally — same
   `screen-shell-aside-tab` wrapper, same `ASIDE_TAB` geometry, same `--folder-tab-overlap`
   attachment, no kit-added skin around it (`compositions/templates/screen-shell.tsx`, the
   `asideTabs ?? (...)` line). `AgentTabStrip` calls the identical `BreadcrumbFolders` the
   content trail calls, with the same `items`/`activeIndex`/`onClose` shape. Rendering the real
   app component through the real `AgentDockTabsSlot` portal (not a direct `asideTabs` hand-off)
   and reading the DOM back confirms every tab carries `data-slot="breadcrumb-folder-fill"` and
   the kit's `TAB`/`TAB_REST`/`TAB_LIVE` classes, byte-identical to the content strip's own
   markup — and the kit's own demo (`demo/shapes/templates-0.tsx`'s `asideTabs` panel,
   `BreadcrumbFolders` with `onClose`) renders the real folder silhouette in a live browser
   (`<svg data-slot="folder-shape">` with a real, non-empty `viewBox`). No variant, prop, or
   wrapper skin difference was found anywhere in the reachable source. The chip screenshot most
   likely reflects a staging build that predates this round shipping (`ready-means-deployed`) —
   redeploy and re-screenshot before assuming another code path draws it.
3. **Close — not reproducible from source; coverage gap closed.** `web/test/agent-tab-strip.test.tsx`
   previously only ever handed `<AgentTabStrip>` straight to `asideTabs`, which proves the kit
   slot but skips the actual production wiring — `agent-panel.tsx` builds the strip at the root
   and reaches the aside through `createPortal` into `AgentDockTabsSlot`'s published node
   (`web/lib/agent-dock.tsx`). A new describe block, "AgentTabStrip through the real
   AgentDockTabsSlot portal," reproduces that exact shape (a sibling component reading
   `useAgentDockTabs()` and portalling into it) and presses a real conversation tab's × through
   it: `onClose` still fires with that tab's own id. The portal boundary is not where a close
   regression would hide.

**Assistant width and pinned tabs (16 Sep 2026 amendments):** Two further rulings on the same strip and its container shape.

**Width snap points.** The client's ruling, 16 Sep 2026, verbatim: *"assistant width = drag the seam with 320/400/520 snaps."* The assistant column is resizable by dragging its left edge; the drag has three snap points — minimum 320px, middle 400px, maximum 520px — so a writer can coarse-adjust without free-dragging the precise width. When docked (the normal state, inside a `ScreenShell`), the seam sits at the left of the aside and is draggable; when undocked (a modal layering, if implemented), the resize behaviour is not yet specified. The snaps are data, not computed, to allow future tuning without a code change: `ASSISTANT_WIDTH_SNAPS` in `web/lib/agent-dock.tsx` or equivalent.

**Pinned tabs placement, and the paint order client feedback, 16 Sep 2026, with a
screenshot.** Her words: *"on assistant, make sure the history tab and + are behind!"* —
over a screenshot of History and "+" grey-filled over the active Conversation tab's own
right edge. **Status: already correct at the source; not reproducible from a fresh
render.** `breadcrumb-folders.tsx`'s z-lift (added 2026-09-06 for the content strip's own
identical complaint) keys each tab's z-index to whether **it** is the live one — `TAB_LIVE`
(`z-[1]`) when `entry.index === activeCrumb`, `TAB_REST` (`z-0`) otherwise — never to
position in the DOM. So the active conversation tab, which this strip places FIRST (ahead
of the pinned History/"+" pair — the opposite shape from the main content strip, whose
active crumb is always the trail's own LAST item), still paints above both of them:
`z-[1] > z-0` regardless of paint order. Neither pinned tab carries a fill or a `data-slot`
of its own that could stack over a neighbour (`agent-tab-strip.tsx` hands both the ordinary
`TAB_REST` path, same as any background conversation tab), and `activeIndex` reaches the
kit correctly — `tabIndex = tabs.findIndex(...)`, no stale offset survives the 16 Sep
reorder above. **Tested:** `agent-tab-strip.test.tsx`'s "stacking — the active tab paints
above its pinned neighbours" describe block renders the exact reported shape (one active
conversation tab, first, ahead of History and "+") and reads the rendered `className`
back off each crumb, asserting `z-[1]` on the active tab and `z-0` on both pinned
neighbours — then repeats it with a second, background conversation tab open. Both pass
against the current source. Per `ready-means-deployed`: a screenshot proves what is LIVE,
not what the tree contains: this claim held once already for the same client round (see
"Look — not reproducible from source" above, three paragraphs up) because the chip she saw
predated that round's deploy. The likely account here is the same one — redeploy and
re-screenshot before assuming a second code path draws the strip.

**Not laws.** The three snap points and the width ranges are recorded here for the next
reader rather than independently checked. The stacking order IS checked (see above), by a
test rather than by a registry law — no `shared/rules/registry.ts` entry censuses this
strip's z-index the way it censuses e.g. R63's pinned toolbar.

**App status ladder, ruled 16 Sep 2026, not yet built.** Over an artifact ("App Status
Ladder"), the client chose model M2, the lifecycle ladder, with two corrections to it —
verbatim: *"for app status i choose m2, lifecycle ladder. however make sure you add planned
and not started. … when it's in validation and after it has a refinement, it's not yet
built. It's in validation, and then we are refining. … Live is only after the first
refinement sprint."* The DECIDED rungs, in order: Not started · Planned · In audit · In
plan · In build · In validation · In refinements · Live · Archived. Archived is the one rung
set by hand; every other rung is DERIVED from an app's waves and sprints. An app reaches
Live only after its first Refinements sprint has wrapped — In validation and In refinements
are two distinct rungs, not one, and an app sits in the earlier of the two until a
refinement sprint has actually run. **Colouring of the dots is still pending her pick** —
app stage pills stay coloured the old way meanwhile. Status: ruled, not yet built.

**Accounts tabs, ruled 16 Sep 2026, replacement pending.** The client's ruling, verbatim:
*"Accounts tab: drop the companies. It makes sense."* The Companies · All strip on the
Accounts screen is retired. What replaces it is pending her pick from a follow-up artifact
("Accounts Tabs"). Status: ruled, not yet built.

**Colour scheme, ruled 17 Sep 2026 — reconciled into D17. Status: ruled, in build.** The
client's ruling, verbatim: *"Do not invent new colors. Just use the ones that exist in the
kit only. For tickets, stories, everywhere, sprints running, and waves running, use the
blue. Accounts: active green, inactive gray."* [R32](../RULES.md)'s closed palette
(`closed-palette`) is the constraint this already has to fit inside — a token only, never
a hex or a Tailwind ramp. The further rulings the same day — ticket, story, sprint, wave,
input, contact, account and knowledge-source colouring, plus the charcoal-never-means-
in-progress correction — are now reconciled into one written rule:
[D17](#d17-a-status-colour-means-one-thing-everywhere-dots-are-always-solid-and-a-department-is-told-apart-by-an-icon-never-a-hue)'s
own 17 Sep 2026 amendment carries every one of them verbatim. **Status: ruled, in build,
17 Sep 2026.**

**Toolbar on small screens, RULED 17 Sep 2026.** Shown an artifact of the collection
toolbar folding for a phone/tablet width, the client's first ruling, verbatim: *"toolbar
option B, expand the artifact to show me how it looks when I click the three-dot button
and how it looks expanded, with everything: the sort, the filter, the views, everything.
Possible to have the search bar, but also all the buttons there? Just asking."* Option B
itself was chosen from that round — search stays on the row and never shrinks; Filter,
Sort and the view switch fold into one ⋯ button below 48rem container width, on tablet
and phone. Her closing question is now answered: the client's follow-up ruling the same
evening, verbatim, its whole text: *"popover menu."* The three-dot button's open state is
a popover — Filter, Sort and the view switch sit together inside it, opened from the one
⋯ button — never a sheet and never every button spread back out along the search row.

**Status: ruled, in build (kit v1.2.109, in progress), 17 Sep 2026.**

**Law.** None registered.

**Kit upload zone, ruled, artifact
[E19jyAKzRs6hoYdrWtQgTR](https://claude.ai/artifact/E19jyAKzRs6hoYdrWtQgTR).** Shown an
artifact of three upload-zone layouts (A strip+grid, B add tile, C filmstrip), the
client's first ruling, 17 Sep 2026, verbatim: *"I like the status when it's empty, like 'Drop
files here' or 'Choose.' That really works, but when I already drop something, I don't
like that what I dropped is so small and the other remains the same big. Can you create an
artifact with alternatives? My goal would be that the 'Drop files' becomes smaller and
that I can really see the images that I have already uploaded. They don't show only as the
name, but I also see the image itself, or, if it's a document, a preview."* None of the
three shown options was chosen from that first round. The empty-state copy and affordance
("Drop files here" / "Choose") stay as drawn — that half already worked from the start.
What was still open was the FILLED state: the original zone kept the drop target at its
full, empty-state size once a file landed beside it, and a dropped file showed as a
filename rather than an image thumbnail or a document preview. A follow-up artifact of
filled-state alternatives was built and shown the same day, and the client's second
ruling, 17 Sep 2026, verbatim: *"upload zone option B."* Option B is the shrinking
behaviour: once the first file lands, the dashed drop zone stops holding the full,
empty-state footprint and becomes one tile alongside the rest, in a wrapping grid of
thumbnails — an image renders as the image, a document as a preview, never a bare
filename standing in for either.

**Status: ruled, in build (kit v1.2.110, in progress), 17 Sep 2026.**

**Law.** None registered.

**Decisions awaiting further input (17 Sep 2026):**

- **Meeting-type department inheritance — CLOSED, 17 Sep 2026.** Her first words on it:
  *"I would need more consulting to take a decision."* Asked again the same day, her
  closing words: *"The whole meeting department brief, I don't understand what you mean
  here."* Closed without a change: no meeting-type-to-department inheritance is built, and
  the existing rule stands — a department is told apart by its own icon, never a colour or
  an inherited value
  ([D17](#d17-a-status-colour-means-one-thing-everywhere-dots-are-always-solid-and-a-department-is-told-apart-by-an-icon-never-a-hue)).
- **Close-dialog proof pattern.** The client's exact words: *"We will work on this later when we work on the ticket details page."* Deferred to the ticket details work and a future session.

**The app record's Knowledge tab becomes a gallery (17 Sep 2026, not yet numbered/indexed).**
The client's ruling, verbatim, from a consultation: *"In the Knowledge tab, replicate what
we have in the general knowledge. This should just be a gallery with all the knowledge we
have about this, with a toolbar that I can search and filter, blah, blah, blah, and a
button to ask about this. This should open a conversation with the assistant only about
this app."* The tab's own inline "ask a question" box (`AskTheAssistant`) is gone; it now
mounts the SAME shared gallery component the general Knowledge screen does
(`web/components/knowledge/knowledge-screen.tsx`'s `KnowledgeScreen`, parameterised by a
`scope` prop), filtered to this app's own material — a mirror of its own rows plus
anything filed under it by hand (`SourceFilters.appId`,
`workers/content/src/lib/knowledge.ts`). The Ask button opens a NEW assistant conversation
scoped to this app (`AgentTabScope` gained `"app"`, `web/lib/agent-conversation-tabs.ts`),
carrying the app's own id into the retrieval door (`retrieve()`'s new `appId` parameter,
narrowing the READ-BACK only, per R26). Applies R14 (bounded/paged read), R16 (the tab's
badge is now a real server count, not the old "not a collection" exemption — see
`shared/rules/registry.ts`'s `RECORD_TAB_COUNT_EXCEPTIONS`), R48/R50 (the toolbar, search
included, stands down only when the collection is genuinely empty), and R84 (the Ask
button is mango in the general screen's own `CollectionHeading`, and `variant="inverse"`
on the app tab, which has no title component of its own). **Status: shipped, this
session** — not yet folded into the numbered K-series above; a future documentation pass
should give it its own line and cross-reference.

**CLOSED, 18 Sep 2026 (Round 20) — the assistant's attach affordance.** Was: "DECISION
PENDING — the assistant's attach affordance, 13 Sep vs. 18 Sep." The side-by-side artifact
this row called for was built and shown; the client's pick, verbatim, *"assistant a1,"* is
now [L30](#l30-the-assistants-attach-affordance-is-a-paperclip-that-reads-a-file-for-one-conversation-only).
**Artifact:** <https://claude.ai/artifact/Nbwa6qGJTnCiGAaG5YrEgf>.

**CLOSED, 18 Sep 2026 — a title's maximum length.** Was: "DECISION PENDING — a title's
maximum length, computed at N=50." The ceiling this row recorded as computed-but-unwired is
now [F18](#f18-a-title-fits-one-line-on-a-macbook-air): `TITLE_MAX_CHARS = 50`, wired into
every title-shaped field's `maxLength` and live counter, and into the matching write door,
positionally (R20/R87). F18's own status line already reads "ruled, in build, 18 Sep 2026" —
this row is closed rather than restated. **Artifact:**
<https://claude.ai/artifact/TYmJqr1byzjS9oiLosyFaL>.

**CLOSED, 18 Sep 2026 (Round 21) — an imported title's length.** Was: "DECISION PENDING —
imported knowledge titles over 50 (clamp on import / leave / refuse)," open since round 18.
Shown the three options, the client's pick, verbatim, *"l1,"* is now
[F18](#f18-a-title-fits-one-line-on-a-macbook-air)'s own 18 Sep 2026 amendment (I1): the cap
binds what a person types, and a title arriving from a file name or a Google import is kept
whole.

**CLOSED, 18 Sep 2026 (Round 21) — ticket facts shown nowhere.** Was: "DECISION PENDING —
ticket facts now shown nowhere (Raised by/on/from, another language's title, the screen
recording link)," open since round 13 (17 Sep 2026). Asked to confirm whether these facts are
reachable anywhere on the page, the client's ruling, verbatim: *"yes, they do. It shows on the
footer, so do nothing as it is right now."* No change: the record's own audit footer
([D1](#d1-a-detail-screen-has-exactly-four-regions-in-this-order)'s own fourth region) already
carries them.

**STILL OPEN, 18 Sep 2026 (Round 21) — the emails artifact's accuracy.** Shown the "Every
Email Kwapso Sends" artifact, the client's ruling, verbatim: *"not sure they are accurate.
Make sure that you reproduce 100% accuracy."* The page is regenerated straight from the real
templates the app actually sends, rather than hand-summarised copy, so nothing on it can drift
from what a person receives. Not yet re-shown for her sign-off — the row stays open until she
sees the regenerated page.

**STILL PARKED, 19 Sep 2026 (Round 22) — Main Page Views.** Open, unchanged, since at least
round five (16 Sep 2026). Asked again this round, the client's ruling, verbatim: *"Continue
parked."* No artifact shown, no pick made; carried forward exactly as it was — the same answer
as Round 21 (18 Sep 2026): *"continue parked."*

**CLOSED, 19 Sep 2026 (Round 22) — the five untyped Smoke-team stories.** Was: "ANSWERED, WRITE
PENDING HER SIGN-OFF, 18 Sep 2026 (Round 21) — five untyped stories," open since round eight
(16 Sep 2026). The five proposals, read off each story's own content, were handed back for her
sign-off; her ruling this round, verbatim: *"You do it."* Written on the Kwapso staging team:
B0307 Data, B0315 Feature, B0128 Feature, B0025 Change, B0026 Tech.

**VALIDATED IN ROUND 22, 19 Sep 2026.** Six items confirmed live on staging this round: the
assistant tab strip fits its own pane
([K50](#k50-the-assistant-tab-strip-fits-its-own-pane-no-clipped-tab--never-pushed-out-of-view)),
the assistant composer holds one row at rest
([K48](#k48-the-assistant-composer-holds-one-row-at-rest-at-every-pane-width)), the rail's brand
mark ([K49](#k49-the-rails-brand-mark-steps-up-one-more-rung-still-centred-on-the-strip-row)),
the empty-state single door
([D22](#d22-an-empty-section-draws-exactly-one-door-in-no-header-no-second-)), the new-tab
search field's one icon
([K51](#k51-the-new-tab-search-field-carries-one-icon-not-two)), and the imported title's
length (F18's I1 amendment, [F18](#f18-a-title-fits-one-line-on-a-macbook-air)) — her ruling on
the last of these, verbatim: *"Validated."*

---

## Rule index

**267 rules.**

| Section | Rules |
|---|---|
| 1. Colour and surface | C1 to C13 (13) |
| 2. Page layout and width | L1 to L43 (43) |
| 3. Detail screens | D1 to D23 (23) |
| 4. Collections | K1 to K62 (62) |
| 5. Buttons and actions | B1 to B49 (49) |
| 6. Forms and dialogs | F1 to F18 (18) |
| 7. Typography | T1 to T9 (9) |
| 8. Spacing and the scale setting | S1 to S7 (7) |
| 9. Mobile | M1 to M6 (6) |
| 10. Copy | W1 to W15 (15) |
| 11. Record type glyphs | G1 to G6 (6) |
| 12. Density: the glance budget | N1 to N12 (12) |
| 13. The kit, and what counts as using it | U1 to U4 (4) |

### Where each enforced UI law is written down

Every law in `shared/rules/registry.ts` carrying `dimension: "ui"` has an entry in this
book, and `web/test/doc-claims.test.ts` derives that list from the registry and fails the
build if one is missing — so a UI law minted next month cannot ship undocumented. The map
below is for finding one; it is not the source, and the R-number in each rule's own
**Law.** line is what the check reads.

| Law | Rule here | Law | Rule here |
|---|---|---|---|
| R2, R3, R8 | [K4](#k4-a-tab-that-reveals-a-collection-carries-the-count-as-a-badge-and-the-heading-stands-down), [N10](#n10-the-control-follows-the-option-count) | R44 | [W12](#w12-and-the-asking-is-answered-up-to-a-ceiling-that-only-falls) |
| R4 | [F2](#f2-the-dialog-is-a-three-row-grid-and-never-spills), [F9](#f9-a-dialog-on-a-phone-is-a-bottom-sheet) | R45 | [U2](#u2-every-whole-screen-composition-the-kit-ships-is-decided) |
| R6 | [W4](#w4-the-glossary-still-wins) | R46 | [U1](#u1-every-part-of-the-kit-is-either-reached-or-has-a-written-reason) |
| R7 | [F8](#f8-the-forms-explanatory-note-is-a-muted-callout-at-the-top-inside-the-scroll-region) | R48 | [K10](#k10-every-collection-screen-shows-a-search-box-and-it-is-not-the-screens-choice) |
| R16 | [K3](#k3-the-count-lives-in-the-heading-formatted-n-adjective-plural) | R49 | [K13](#k13-the-gap-under-a-toolbar-is-one-number-and-the-row-pays-it) |
| R25 | [W9](#w9-a-savings-figure-never-renders-without-saying-what-it-is-made-of) | R50 | [K11](#k11-an-empty-collection-draws-no-toolbar-at-all-not-even-the-add-button) |
| R28 | [W10](#w10-every-sentence-the-app-says-is-in-the-catalogue) | R51 | [L8](#l8-a-panel-that-minimises-collapses-and-a-shut-panel-is-shut-for-the-keyboard-too) |
| R29 | [N8](#n8-one-width-one-set-of-gutters-and-no-screen-sets-its-own), [L1](#l1-one-page-container-one-cap) | R52 | [D11](#d11-every-detail-screen-wears-the-same-title-treatment-and-it-comes-from-one-constant) |
| R31 | [T8](#t8-the-two-radii-are-spelled-the-kits-way) | R53 | [K12](#k12-the-toolbars-slots-are-the-rows-in-one-order-and-sort-is-a-default) |
| R32 | [N5](#n5-the-surface-step-is-measured-not-assumed), [C10](#c10-there-is-one-ink-stepped-by-opacity-not-a-grey-ramp) | R54 | [W8](#w8-our-own-people-are-named-by-their-first-name-and-nobody-else-is) |
| R33 | [W11](#w11-and-the-place-it-is-said-asks-for-its-translation) | R57 | [U3](#u3-a-new-component-joins-a-folder-and-the-folder-says-what-belongs-in-it) |
| R34 | [W7](#w7-no-synonym-for-a-glossary-term-ever-reaches-a-screen) | R59 | [F10](#f10-a-form-is-a-slide-in-a-warning-is-an-overlay) |
| R35 | [G5](#g5-a-record-never-appears-without-its-face) | R60 | [G6](#g6-an-image-fills-its-box-it-is-never-shrunk-to-fit-inside-one) |
| R38 | [D12](#d12-a-screen-showing-one-record-asks-the-door-for-that-record-never-the-loaded-page) | R61 | [B10](#b10-a-modules-settings-have-two-entrances-and-one-page-behind-them) |
| R39 | [G1](#g1-a-record-type-carries-a-glyph), [U1](#u1-every-part-of-the-kit-is-either-reached-or-has-a-written-reason) | R62 | [K15](#k15-the-two-zeros-look-the-same-the-add-button-is-the-only-difference) |
| R63 | [K14](#k14-the-toolbar-stays-on-top-while-the-rows-scroll-under-it-and-the-pin-is-the-rows) | R64 | [L9](#l9-every-section-on-the-team-areas-strip-has-a-door-or-names-the-screen-that-took-its-place) |
| R65 | [K16](#k16-on-a-card-that-stands-for-a-record-the-chip-sits-above-the-title) | R66 | [W6](#w6-no-emoji-in-the-words-and-none-in-the-data-behind-them) |
| R67 | [C12](#c12-nothing-stands-on-the-bare-page-ground) | R72 | [W13](#w13-no-subtitle-under-a-heading-unless-she-asked) |
| R74 | [L11](#l11-pressing-import-opens-its-own-workspace-tab-fronted-and-never-redirects-the-one-you-were-in) | R75 | [K17](#k17-the-options-a-control-offers-are-a-to-z-in-the-readers-own-language) |
| R77 | [D3](#d3-the-header-and-tabs-stick) | R78 | [K20](#k20-calendar-views-carry-no-sort) |
| R79 | [F11](#f11-staff-is-picked-from-a-pill-row-never-a-dropdown-and-the-signed-in-user-starts-selected) | R80 | [K22](#k22-rows-are-a-list-never-a-banded-table) |
| R82 | [K32](#k32-a-table-row-holds-at-most-six-columns-the-seventh-goes-on-a-second-line-never-squeezed-onto-the-end) | R83 | [K33](#k33-the-gap-above-a-toolbar-equals-the-gap-below-it-the-tab-strip-and-its-card-share-one-gapless-column) |
| R84 | [B17](#b17-mango-lives-only-in-the-title-component-every-other-button-is-black) | R85 | [W15](#w15-every-rail-destination-is-named-in-one-word) |
| R86 | [K39](#k39-in-any-collection-the-one-coloured-chip-is-the-records-status) | R87 | [F18](#f18-a-title-fits-one-line-on-a-macbook-air) |
| R88 | [D22](#d22-an-empty-section-draws-exactly-one-door-in-no-header-no-second-) | R89 | [L31](#l31-a-tickets-footer-sits-on-the-screens-own-bottom-edge-and-the-composer-wears-its-own-colour-full-width) |
| R90 | [L32](#l32-any-choice-over-a-person-a-contact-an-account-or-an-app-shows-the-same-face-the-lists-show) | R91 | [L34](#l34-never-need-to-scroll-to-see-all-content) |
| R92 | [L35](#l35-when-a-main-person-is-chosen-they-disappear-from-the-secondary-picker-over-the-same-pool) | R93 | [L36](#l36-every-avatar-icon-or-colour-rides-beside-its-text--filters-views-and-select-components-alike) |
| R94 | [L37](#l37-a-records-chips-draw-in-one-fixed-order--id-status-type-main-parent-secondary-parent) | R95 | [L38](#l38-no-em-dash-anywhere-a-person-reads) |
| R96 | [L39](#l39-the-id-chip-is-black) | R97 | [L40](#l40-a-count-never-gets-its-own-card) |
| R98 | [L41](#l41-every-button-is-the-kits-own-height) | R99 | [L42](#l42-no-record-closes-while-its-own-clock-is-still-running) |
| R100 | [L43](#l43-the-no-containers-experiment-grouped-sections-lose-their-box-in-the-tickets-module-first) | | |

### The seven files that carry most of it

The original seven, which round one of the feedback (`b1615a7`, 17 Aug 2026) has since
implemented. Kept as the record of what landed and where:

| File | Rules | What changed |
|---|---|---|
| `shared/web/library-overrides.css` | C3, C11 | The `.glass` override deleted outright. Killed the pink and the drift. **Done.** |
| `web/components/deep-link/screen-bits.tsx` | C2, B3, S3 | `CollectionCard` flattened; the add button became an icon. **Done.** |
| `web/components/deep-link/deep-link-screen.tsx` | L1 | One line: `max-w-3xl` became `max-w-[1600px]`. **Done.** |
| `web/components/shell/app-shell.tsx` | L1, S2, T2 | Gutters and the 11px tab labels. **Done.** |
| `shared/web/form-shell.tsx` | F1, F2, F3 | The three-row grid, the pinned action bar, "Submit". **Done.** |
| `web/components/tickets/help-detail.tsx` | B1, B2, L7, T5 | Six buttons became one plus a menu; the title became an `<h1>`. **Done**, via the new `web/components/records/record-chrome.tsx`. |
| `web/components/deep-link/shape.tsx` | K1, W1, W2 | Subtitles dropped to three facts. **Done.** |

### The seven files that carry the density round

Section 12's turn — and, like the table above it, now history: the round landed, and
several of its edits have since hardened into law (R29 holds the width caps out,
R32 the ramp). Every one was ordered, with its exact diff, in
`.session-notes/ui-rearrangement-plan.md` (a session note, in no clone — see § 12's
own note above). Marked as of 26 Aug 2026:

| File | Rules | What changed |
|---|---|---|
| `web/components/screens/*.tsx` (5 files) + `app-shell.tsx:489` | N8 | Delete six `max-w-2xl` / `max-w-3xl` caps. Six screens go from 60% span to 100%, and the cold-load width jump stops. **Done** — and held by R29 (`SCREEN_WIDTH_EXEMPT` is down to one reasoned entry). |
| `shared/web/language-section.tsx` | N1, N10 | 29 pills become one dropdown showing the flag and the native name. Removes the single worst band in either front door. **Done** — it is the library `Select`, and `LANGUAGES` is four. |
| `web/components/work/time-panel.tsx` | N1, N4 | The 8-fact work-log row becomes a title plus a three-fact meta line. **Done.** |
| `web/components/process/process-detail.tsx` | N1, N4, N6 | The 8-fact step row, and three nested bordered containers, become one. **Done.** |
| `web/components/meetings/meetings-screen.tsx` | N1 | The 9-column all-view table drops to six columns. **Done.** |
| `web/components/tickets/tickets-collection.tsx` | N2, N10 | Six blocks before the first ticket become three; the derived type strip becomes a facet. **Done.** |
| `web/components/screens/import-screen.tsx` | N5, N6 | The only file in either app using a banned Tailwind ramp, and the heaviest border user (9). **Done** — and held by R32. |
