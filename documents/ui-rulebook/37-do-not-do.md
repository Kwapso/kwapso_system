# Do not do

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

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
