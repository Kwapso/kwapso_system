// THE DOT SAT FLUSH AGAINST THE WORD — CLIENT, 17 SEP 2026, over the
// automations status chip: "Validated the colors, but it's missing the space
// between the dot and the word. Fix that."
//
// ROOT CAUSE: `shared/ui/components/badge/badge.tsx`'s dot-to-label gap
// (`gap-2`, the kit's `--space-2` token) lived on the `pill` SIZE step, not on
// the `dot` PROP. `variant="status" dot={…}` with no `size` defaults to
// `size="counter"`, which carries no gap at all — so the dot painted flush
// against the label unless a call site remembered a second prop the doc
// comment only ever called "usual". A census of the app (below) found
// NINETEEN real call sites that had not: the two this ruling names
// (`module-automations.tsx`, `automation-edit-sheet.tsx`) and the contacts
// Portal chip (`deep-link/shape.tsx`), plus fifteen more record-detail chips.
// Three call sites (`apps-screen.tsx` ×2, one of `app-detail.tsx`'s two)
// had remembered `size="pill"` and were the only ones that ever looked right.
//
// FIXED IN THE KIT (kwapso-design/components/badge/badge.tsx, this session):
// the gap moved off `size="pill"` and onto the `dot` prop's own presence
// (`GAP_WITH_DOT`), so it applies at EVERY size. That is a kit change,
// tag-pinned into this app's `shared/ui/` by `scripts/sync-design.mjs` (Alaap
// owns the swap — see the design-kit-pipeline note) and is NOT hand-applied
// here: `web/test/vendored-kit.test.ts` fails the build the moment
// `shared/ui/` is edited outside that door. So this file is RED until the
// next kit sync lands the fix — that is the correct, expected state for a
// kit-owned defect fixed upstream, not a mistake in this test. It turns green
// with no code change in this repo the moment the sync runs; the kit-side fix
// and its own red/green proof (the source diff: `pill`'s class string before
// and after, and `GAP_WITH_DOT` applied unconditionally on `dot`) are recorded
// in kwapso-design/CHANGELOG.md's "Badge's dot-to-label gap" entry.
//
// THE TWO PLACES THE RULING NAMES, rendered exactly as their real call sites
// write them — no size prop, matching the actual bug.

import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Badge } from "@shared/ui/components/badge/badge"

/** The dot and the label must be two children of a row that carries the
 * kit's own gap token (`gap-2`, `--space-2`, 8px) — not touching, and not a
 * bespoke margin a call site invented instead of asking the kit for one. */
function expectDotGap(container: HTMLElement) {
  const badge = container.querySelector('[data-slot="badge"]')
  expect(badge, "the badge itself must render").not.toBeNull()
  const dot = badge!.querySelector('[data-slot="badge-dot"]')
  expect(dot, "the dot must render").not.toBeNull()
  expect(badge!.className.split(/\s+/), "the badge's own row must carry the kit's gap token").toContain("gap-2")
}

describe("the badge dot never sits flush against its label", () => {
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
    expectDotGap(container)
  })

  it("the contacts Portal chip (deep-link/shape.tsx's exact call shape, both states)", () => {
    // shape.tsx:776 and :778, verbatim.
    const shipped = render(
      <Badge variant="status" dot="shipped">
        Portal
      </Badge>,
    )
    expectDotGap(shipped.container)

    const archived = render(
      <Badge variant="status" dot="archived">
        No portal
      </Badge>,
    )
    expectDotGap(archived.container)
  })

  // THE GENERAL LAW, so the next call site that forgets `size="pill"` (there
  // is no more reason to remember it) is covered without a twentieth entry
  // here: a dot at EITHER size gets the gap, and a badge with no dot carries
  // none — `gap-2` on a single flex child does nothing, so there is nothing
  // to assert there beyond "the class is simply absent".
  it("size is irrelevant to the gap — counter (the default) and pill both carry it", () => {
    const counterSize = render(
      <Badge variant="status" dot="review">
        Review
      </Badge>,
    )
    expectDotGap(counterSize.container)

    const pillSize = render(
      <Badge variant="status" size="pill" dot="review">
        Review
      </Badge>,
    )
    expectDotGap(pillSize.container)
  })

  it("a dot-less badge carries no gap class — the token is spent only when there is something to separate", () => {
    const { container } = render(<Badge variant="secondary">Plain</Badge>)
    const badge = container.querySelector('[data-slot="badge"]')
    expect(badge).not.toBeNull()
    expect(badge!.querySelector('[data-slot="badge-dot"]')).toBeNull()
    expect(badge!.className.split(/\s+/)).not.toContain("gap-2")
  })
})
