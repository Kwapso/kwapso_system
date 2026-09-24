# 12. Density: the glance budget (N1 to N12) (part 1 of 2)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

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
