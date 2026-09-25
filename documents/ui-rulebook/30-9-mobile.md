# 9. Mobile

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

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

### M7: the phone look (client ruling, 25 Sep 2026)

Alaap approved this for the agency app first; the portal follows after review. Nothing is
added, removed or redesigned: only padding, scale and layout change below `sm`.

- The content card runs edge to edge: no outer gutter, no card radius, no card inset.
- The page title steps down one size.
- The toolbar is one row: search takes the free width, the other controls go icon-only.
- Tab strips scroll sideways (M3), never wrap.
- Dialogs open as full-height sheets.
- Every tap target is at least 44px.

The tier lives in the design kit (Kwapso/kwapso-ui-ux), so every app that re-pulls the kit
gets it; app-only fixes live in `web/` and `shared/web/screen-engine/`.

Evidence: (client) Alaap's "Yes" to the six-point phone plan, 25 Sep 2026.
