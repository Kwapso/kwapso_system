# 12. Density: the glance budget (N1 to N12) (part 2 of 2)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

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
