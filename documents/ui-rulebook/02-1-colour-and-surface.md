# 1. Colour and surface

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

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
