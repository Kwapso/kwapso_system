# 7. Typography

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

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
