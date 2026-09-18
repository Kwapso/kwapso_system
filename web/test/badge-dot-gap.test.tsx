// THE DOT SAT FLUSH AGAINST THE WORD — CLIENT, 17 SEP 2026, over the
// automations status chip: "Validated the colors, but it's missing the space
// between the dot and the word. Fix that."
//
// ROOT CAUSE (17 Sep): `shared/ui/components/badge/badge.tsx`'s dot-to-label
// gap (`gap-2`, the kit's `--space-2` token) lived on the `pill` SIZE step,
// not on the `dot` PROP. `variant="status" dot={…}` with no `size` defaults
// to `size="counter"`, which carried no gap at all — so the dot painted
// flush against the label unless a call site remembered a second prop the
// doc comment only ever called "usual". A census of the app found NINETEEN
// real call sites that had not.
//
// WIDENED THE NEXT DAY — CLIENT, 18 SEP 2026, over the ticket list views,
// verbatim: "its missing the space between icon and name and the
// backgorund card. always, make it a rule, for everythng wether its a dot
// or an icno, for all chips / pills." The kit's fix moved past `GAP_WITH_DOT`
// (a `dot ? … : undefined` ternary) to `LEADING_MARK_GAP` — `gap-2`, unconditional,
// in `badgeVariants`' own BASE class list — so it draws between ANY two
// children, dot-led (`dot` prop) or icon-led (the new `icon` prop), and costs
// nothing on a label-only badge (a `gap` utility only ever spends space
// BETWEEN flex children). See badge.tsx's own header law for both rulings.
//
// FIXED IN THE KIT (kwapso-design/components/badge/badge.tsx). Tag-pinned
// into this app's `shared/ui/` by `scripts/sync-design.mjs` (Alaap owns the
// swap — see the design-kit-pipeline note) and NOT hand-applied here:
// `web/test/vendored-kit.test.ts` fails the build the moment `shared/ui/` is
// edited outside that door. `LEADING_MARK_GAP` itself is a private constant
// in badge.tsx (not exported), so this file asserts its OUTPUT — the
// rendered `gap-2` class — rather than importing the name; that is the same
// arm's-length relationship every other kit-conformance test in this repo
// keeps with the vendored source.
//
// THE TWO PLACES THE 17 SEP RULING NAMES, rendered exactly as their real
// call sites write them — no size prop, matching the actual bug.

import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Badge } from "@shared/ui/components/badge/badge"

/** The leading mark (dot or icon) and the label must be two children of a
 * row that carries the kit's own gap token (`gap-2`, `--space-2`, 8px) —
 * not touching, and not a bespoke margin a call site invented instead of
 * asking the kit for one. */
function expectLeadingMarkGap(container: HTMLElement) {
  const badge = container.querySelector('[data-slot="badge"]')
  expect(badge, "the badge itself must render").not.toBeNull()
  expect(badge!.className.split(/\s+/), "the badge's own row must carry the kit's gap token").toContain("gap-2")
}

describe("the badge's leading mark never sits flush against its label", () => {
  it("the automations status chip (module-automations.tsx / automation-edit-sheet.tsx's exact call shape)", () => {
    // `<Badge variant="status" dot={AUTOMATION_STATUS_DOT[status]}>{statusWord}</Badge>`
    // — module-automations.tsx:231, automation-edit-sheet.tsx:397. Written
    // out rather than imported: importing automation-edit-sheet.tsx pulls in
    // the whole sheet's data/hook graph for one constant, and the shape under
    // test is the Badge call, not the status map.
    const { container } = render(
      <Badge variant="status" dot="building">
        On
      </Badge>,
    )
    expectLeadingMarkGap(container)
  })

  it("the contacts Portal chip (deep-link/shape.tsx's exact call shape, both states)", () => {
    // shape.tsx:776 and :778, verbatim.
    const shipped = render(
      <Badge variant="status" dot="shipped">
        Portal
      </Badge>,
    )
    expectLeadingMarkGap(shipped.container)

    const archived = render(
      <Badge variant="status" dot="archived">
        No portal
      </Badge>,
    )
    expectLeadingMarkGap(archived.container)
  })

  // THE 18 SEP RULING'S OWN EXAMPLE: an icon-led chip, `shared/web/
  // ticket-chips.tsx`'s ticket-type chip's exact shape — a Phosphor glyph
  // handed in through the `icon` prop rather than as a plain child.
  it("the ticket-type icon chip (ticket-chips.tsx's exact call shape)", () => {
    const { container } = render(
      <Badge variant="secondary" icon={<span aria-hidden data-testid="type-glyph" />}>
        Bug
      </Badge>,
    )
    expectLeadingMarkGap(container)
    expect(container.querySelector('[data-testid="type-glyph"]'), "the icon must render").not.toBeNull()
  })

  // THE GENERAL LAW, so the next call site that leads with a dot OR an icon
  // is covered without a growing list here: `LEADING_MARK_GAP` is
  // UNCONDITIONAL now — it lives in `badgeVariants`' own base class list,
  // not behind a `dot ? … : undefined` ternary — so it draws at EITHER size,
  // with EITHER kind of leading mark, and a label-only badge (nothing to
  // separate) still carries the class harmlessly, because a `gap` utility
  // only ever spends space between flex children.
  it("size is irrelevant to the gap — counter (the default) and pill both carry it", () => {
    const counterSize = render(
      <Badge variant="status" dot="review">
        Review
      </Badge>,
    )
    expectLeadingMarkGap(counterSize.container)

    const pillSize = render(
      <Badge variant="status" size="pill" dot="review">
        Review
      </Badge>,
    )
    expectLeadingMarkGap(pillSize.container)
  })

  // THIS FLIPS FROM THE 17 SEP VERSION OF THIS TEST ON PURPOSE. Under
  // `GAP_WITH_DOT` the class was applied only when `dot` was truthy, so a
  // plain badge carried none. Under `LEADING_MARK_GAP` (18 Sep) the class
  // sits in `badgeVariants`' own BASE list unconditionally — it is cheaper
  // to always draw a gap utility that only affects a SECOND flex child than
  // to keep re-deriving "does this call site have a leading mark" — so a
  // label-only badge now carries `gap-2` too, doing nothing visually because
  // there is nothing after it to separate from.
  it("a mark-less badge still carries the gap class — unconditional now, harmless with one child", () => {
    const { container } = render(<Badge variant="secondary">Plain</Badge>)
    const badge = container.querySelector('[data-slot="badge"]')
    expect(badge).not.toBeNull()
    expect(badge!.querySelector('[data-slot="badge-dot"]')).toBeNull()
    expect(badge!.className.split(/\s+/)).toContain("gap-2")
  })
})
