# 0. The diagnosis: three findings that explain most of the complaints

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

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
