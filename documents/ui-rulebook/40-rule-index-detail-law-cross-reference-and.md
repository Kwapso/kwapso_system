# Rule index detail: law cross-reference and history

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

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
| R100 | [L43](#l43-the-no-containers-experiment-grouped-sections-lose-their-box-in-the-tickets-module-first) | R101 | [L43](#l43-the-no-containers-experiment-grouped-sections-lose-their-box-in-the-tickets-module-first) |
| R102 | [L43](#l43-the-no-containers-experiment-grouped-sections-lose-their-box-in-the-tickets-module-first) | R103 | [L43](#l43-the-no-containers-experiment-grouped-sections-lose-their-box-in-the-tickets-module-first) |
| R104 | [L43](#l43-the-no-containers-experiment-grouped-sections-lose-their-box-in-the-tickets-module-first) | R105 | [L43](#l43-the-no-containers-experiment-grouped-sections-lose-their-box-in-the-tickets-module-first) |
| R106 | [L43](#l43-the-no-containers-experiment-grouped-sections-lose-their-box-in-the-tickets-module-first) | R107 | [L43](#l43-the-no-containers-experiment-grouped-sections-lose-their-box-in-the-tickets-module-first) |
| R108 | [L43](#l43-the-no-containers-experiment-grouped-sections-lose-their-box-in-the-tickets-module-first) | R109 | [S8](#s8-every-screen-carries-the-apps-content-inset-and-none-gets-its-own-number) |

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
