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

The rulings themselves live in `documents/ui-rulebook/`, one file per topic (or per slice of a
large topic), moved verbatim out of this file so no single document holds the whole book. This
file stays the index: the front matter above, this table, and the rule-count ledger below.

| Topic | File | Gist |
|---|---|---|
| 0. The diagnosis: three findings that explain most of the complaints | [documents/ui-rulebook/01-0-the-diagnosis-three-findings-that-explain.md](ui-rulebook/01-0-the-diagnosis-three-findings-that-explain.md) | The diagnosis: three findings that explain most of the complaints |
| 1. Colour and surface | [documents/ui-rulebook/02-1-colour-and-surface.md](ui-rulebook/02-1-colour-and-surface.md) | Colour and surface — C1–C13 |
| 2. Page layout and width (part 1 of 4) | [documents/ui-rulebook/03-2-page-layout-and-width-1.md](ui-rulebook/03-2-page-layout-and-width-1.md) | Page layout and width — L1–L12 |
| 2. Page layout and width (part 2 of 4) | [documents/ui-rulebook/04-2-page-layout-and-width-2.md](ui-rulebook/04-2-page-layout-and-width-2.md) | Page layout and width — L13–L20 |
| 2. Page layout and width (part 3 of 4) | [documents/ui-rulebook/05-2-page-layout-and-width-3.md](ui-rulebook/05-2-page-layout-and-width-3.md) | Page layout and width — L21–L31 |
| 2. Page layout and width (part 4 of 4) | [documents/ui-rulebook/06-2-page-layout-and-width-4.md](ui-rulebook/06-2-page-layout-and-width-4.md) | Page layout and width — L32–L43 |
| 3. Detail screens (part 1 of 3) | [documents/ui-rulebook/07-3-detail-screens-1.md](ui-rulebook/07-3-detail-screens-1.md) | Detail screens — D1–D16 |
| 3. Detail screens (part 2 of 3) | [documents/ui-rulebook/08-3-detail-screens-2.md](ui-rulebook/08-3-detail-screens-2.md) | Detail screens — D17–D22 |
| 3. Detail screens (part 3 of 3) | [documents/ui-rulebook/09-3-detail-screens-3.md](ui-rulebook/09-3-detail-screens-3.md) | Detail screens — D23 |
| 4. Collections (part 1 of 8) | [documents/ui-rulebook/10-4-collections-1.md](ui-rulebook/10-4-collections-1.md) | Collections — K1–K17 |
| 4. Collections (part 2 of 8) | [documents/ui-rulebook/11-4-collections-2.md](ui-rulebook/11-4-collections-2.md) | Collections — K18–K22 |
| 4. Collections (part 3 of 8) | [documents/ui-rulebook/12-4-collections-3.md](ui-rulebook/12-4-collections-3.md) | Collections — K23–K24 |
| 4. Collections (part 4 of 8) | [documents/ui-rulebook/13-4-collections-4.md](ui-rulebook/13-4-collections-4.md) | Collections — K25–K32 |
| 4. Collections (part 5 of 8) | [documents/ui-rulebook/14-4-collections-5.md](ui-rulebook/14-4-collections-5.md) | Collections — K33–K38 |
| 4. Collections (part 6 of 8) | [documents/ui-rulebook/15-4-collections-6.md](ui-rulebook/15-4-collections-6.md) | Collections — K39–K49 |
| 4. Collections (part 7 of 8) | [documents/ui-rulebook/16-4-collections-7.md](ui-rulebook/16-4-collections-7.md) | Collections — K50–K59 |
| 4. Collections (part 8 of 8) | [documents/ui-rulebook/17-4-collections-8.md](ui-rulebook/17-4-collections-8.md) | Collections — K60–K63 |
| 5. Buttons and actions (part 1 of 8) | [documents/ui-rulebook/18-5-buttons-and-actions-1.md](ui-rulebook/18-5-buttons-and-actions-1.md) | Buttons and actions — B1–B10 |
| 5. Buttons and actions (part 2 of 8) | [documents/ui-rulebook/19-5-buttons-and-actions-2.md](ui-rulebook/19-5-buttons-and-actions-2.md) | Buttons and actions — B11–B17 |
| 5. Buttons and actions (part 3 of 8) | [documents/ui-rulebook/20-5-buttons-and-actions-3.md](ui-rulebook/20-5-buttons-and-actions-3.md) | Buttons and actions — B18–B27 |
| 5. Buttons and actions (part 4 of 8) | [documents/ui-rulebook/21-5-buttons-and-actions-4.md](ui-rulebook/21-5-buttons-and-actions-4.md) | Buttons and actions — B28–B35 |
| 5. Buttons and actions (part 5 of 8) | [documents/ui-rulebook/22-5-buttons-and-actions-5.md](ui-rulebook/22-5-buttons-and-actions-5.md) | Buttons and actions — B36–B40 |
| 5. Buttons and actions (part 6 of 8) | [documents/ui-rulebook/23-5-buttons-and-actions-6.md](ui-rulebook/23-5-buttons-and-actions-6.md) | Buttons and actions — B41–B42 |
| 5. Buttons and actions (part 7 of 8) | [documents/ui-rulebook/24-5-buttons-and-actions-7.md](ui-rulebook/24-5-buttons-and-actions-7.md) | Buttons and actions — B43–B46 |
| 5. Buttons and actions (part 8 of 8) | [documents/ui-rulebook/25-5-buttons-and-actions-8.md](ui-rulebook/25-5-buttons-and-actions-8.md) | Buttons and actions — B47–B49 |
| 6. Forms and dialogs (part 1 of 2) | [documents/ui-rulebook/26-6-forms-and-dialogs-1.md](ui-rulebook/26-6-forms-and-dialogs-1.md) | Forms and dialogs — F1–F17 |
| 6. Forms and dialogs (part 2 of 2) | [documents/ui-rulebook/27-6-forms-and-dialogs-2.md](ui-rulebook/27-6-forms-and-dialogs-2.md) | Forms and dialogs — F18–F19 |
| 7. Typography | [documents/ui-rulebook/28-7-typography.md](ui-rulebook/28-7-typography.md) | Typography — T1–T9 |
| 8. Spacing, and the scale setting | [documents/ui-rulebook/29-8-spacing-and-the-scale-setting.md](ui-rulebook/29-8-spacing-and-the-scale-setting.md) | Spacing, and the scale setting — S1–S8 |
| 9. Mobile | [documents/ui-rulebook/30-9-mobile.md](ui-rulebook/30-9-mobile.md) | Mobile — M1–M8 |
| 10. Copy | [documents/ui-rulebook/31-10-copy.md](ui-rulebook/31-10-copy.md) | Copy — W1–W15 |
| 11. Record type glyphs | [documents/ui-rulebook/32-11-record-type-glyphs.md](ui-rulebook/32-11-record-type-glyphs.md) | Record type glyphs — G1–G6 |
| 12. Density: the glance budget (N1 to N12) (part 1 of 2) | [documents/ui-rulebook/33-12-density-the-glance-budget-n1-to-n12-1.md](ui-rulebook/33-12-density-the-glance-budget-n1-to-n12-1.md) | Density: the glance budget (N1 to N12) — N1–N10 |
| 12. Density: the glance budget (N1 to N12) (part 2 of 2) | [documents/ui-rulebook/34-12-density-the-glance-budget-n1-to-n12-2.md](ui-rulebook/34-12-density-the-glance-budget-n1-to-n12-2.md) | Density: the glance budget (N1 to N12) — N11–N12 |
| 13. The kit, and what counts as using it (U1 to U4) | [documents/ui-rulebook/35-13-the-kit-and-what-counts-as-using-it-u1-to.md](ui-rulebook/35-13-the-kit-and-what-counts-as-using-it-u1-to.md) | The kit, and what counts as using it (U1 to U4) — U1–U4 |
| What the old app did better | [documents/ui-rulebook/36-what-the-old-app-did-better.md](ui-rulebook/36-what-the-old-app-did-better.md) | What the old app did better |
| Do not do | [documents/ui-rulebook/37-do-not-do.md](ui-rulebook/37-do-not-do.md) | Do not do |
| Conflicts to settle before building | [documents/ui-rulebook/38-conflicts-to-settle-before-building.md](ui-rulebook/38-conflicts-to-settle-before-building.md) | Conflicts to settle before building |
| Rulings awaiting implementation | [documents/ui-rulebook/39-rulings-awaiting-implementation.md](ui-rulebook/39-rulings-awaiting-implementation.md) | Rulings awaiting implementation |
| Rule index detail: law cross-reference and history | [documents/ui-rulebook/40-rule-index-detail-law-cross-reference-and.md](ui-rulebook/40-rule-index-detail-law-cross-reference-and.md) | Rule index detail: law cross-reference and history |

---

## Rule index

**272 rules.**

| Section | Rules |
|---|---|
| 1. Colour and surface | C1 to C13 (13) |
| 2. Page layout and width | L1 to L43 (43) |
| 3. Detail screens | D1 to D23 (23) |
| 4. Collections | K1 to K63 (63) |
| 5. Buttons and actions | B1 to B49 (49) |
| 6. Forms and dialogs | F1 to F19 (19) |
| 7. Typography | T1 to T9 (9) |
| 8. Spacing and the scale setting | S1 to S8 (8) |
| 9. Mobile | M1 to M8 (8) |
| 10. Copy | W1 to W15 (15) |
| 11. Record type glyphs | G1 to G6 (6) |
| 12. Density: the glance budget | N1 to N12 (12) |
| 13. The kit, and what counts as using it | U1 to U4 (4) |

The R-number cross-reference and the two historical "what shipped where" tables have moved to
[documents/ui-rulebook/40-rule-index-detail-law-cross-reference-and.md](ui-rulebook/40-rule-index-detail-law-cross-reference-and.md).
