// THE ACCOUNTS DASHBOARD'S OWN MARKS — Aurora's second pass, 23 Sep 2026,
// three rulings about what this tab DRAWS rather than what it counts:
//
//   1. "on accounts oevrview, fix how the kpis cards look, and add the median
//      tenure"
//   2. "make the where as a donut graphic (when hover show)"
//   3. "make the how long weve had this account a line graphic, and when hover
//      show who (like tickets tendency)"
//
// EVERY ONE OF THEM IS INVISIBLE TO A SOURCE SCAN. A donut and a stack of bars
// are both "a chart"; a line and a bar are both an SVG; a figure behind a hover
// and a figure printed at rest are the same words in the same file. So this
// suite MOUNTS the real component over a real payload and reads what a person
// would actually see — the same reasoning
// `web/test/dashboard-says-what-it-left-out.test.tsx` gives for the ticket
// dashboard, and the same way it proves a hover: the readout rides the hit
// area's accessible NAME, so it can be asserted without driving a floating
// panel that only exists once a pointer is in it.

import * as React from "react"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { AccountsDashboard as AccountsDashboardData } from "@/lib/api/tenancy"

const holder = vi.hoisted(() => ({ view: undefined as AccountsDashboardData | undefined }))

vi.mock("@shared/web/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/web/store")>()
  return {
    ...actual,
    useCached: () => ({ data: holder.view, error: undefined, refresh: () => {} }),
  }
})

import { AccountsDashboard } from "@/components/accounts/accounts-dashboard"

afterEach(cleanup)

/** A book with something in every reading: three countries (so the donut has
 * more than one slice and its legend has more than one row), four arrival
 * months (so the line has a real run rather than a lone point), and one month
 * holding more than one company (so "who" is a list). */
const FULL: AccountsDashboardData = {
  activeCount: 14,
  countryCount: 3,
  // 947 days is about 31.1 mean months, so the figure reads "31 months" — a
  // number chosen to sit well away from a rounding boundary, so this test
  // fails on a wrong CONVERSION rather than flickering on one.
  medianTenureDays: 947,
  byCountry: [
    { country: "Spain", n: 7 },
    { country: "Germany", n: 4 },
    { country: "Austria", n: 3 },
  ],
  // HER SECOND ADDITION, 23 Sep 2026: "add metric industry (side of where they
  // are , so in the same row country & industry)". Deliberately a DIFFERENT set
  // of totals from `byCountry` above, so a test that asserted the industry
  // split by reading the country one's figures could not pass.
  byIndustry: [
    { industry: "Insurance", n: 6 },
    { industry: "Insurance Broker", n: 5 },
    { industry: "Shipping and logistics", n: 3 },
  ],
  arrivals: [
    { month: "2023-02", n: 1, names: ["Madrid Co"] },
    { month: "2023-06", n: 3, names: ["Alder Ltd", "Birch Ltd", "Cedar Ltd"] },
    { month: "2024-03", n: 1, names: ["Berlin Co"] },
    { month: "2026-01", n: 2, names: ["Vienna Co", "Wien Co"] },
  ],
}

function show(view: AccountsDashboardData = FULL): HTMLElement {
  holder.view = view
  return render(<AccountsDashboard teamId="t1" lang="en" />).container
}

// ── 1 · THE FIGURES ─────────────────────────────────────────────────────────

describe("the figures row (R97: a count never gets its own card)", () => {
  it("adds the median tenure, in the same unit the picture under it uses", () => {
    show()
    // MONTHS, because the arrivals line's x-axis is one point per calendar
    // month — see `DAYS_PER_MONTH`'s own note in the component. 947 days is
    // 31.1 mean months.
    expect(screen.getByText("31 months"), "the median tenure is not drawn in months").toBeTruthy()
    expect(screen.getByText("Median tenure")).toBeTruthy()
  })

  it("draws no card around any of the three", () => {
    // Her standing rule, R97, verbatim: "when it's a count … it doesn't
    // deserve its own card." The kit's own `<StatGrid>` is a number-and-label
    // CARD by construction, so the register is borrowed and the box is not —
    // the whole point of item 1 being a LOOK fix rather than a new component.
    const container = show()
    const figure = screen.getAllByText("Active accounts")[0]!
    expect(
      figure.closest('[data-slot="card"]'),
      "a figure on the accounts dashboard sits inside a card, which R97 forbids"
    ).toBeNull()
    expect(container.querySelectorAll('[data-slot="stat-grid"]').length).toBe(0)
  })
})

// ── 2 · WHERE THEY ARE, AS A DONUT ──────────────────────────────────────────

describe("where they are is a donut, and the value is behind the hover", () => {
  it("draws the KIT's donut, not a second one by hand", () => {
    const container = show()
    expect(
      container.querySelector('[data-slot="donut"]'),
      "the country split is not drawn through the kit's own `Donut` (shared/ui/components/donut/donut.tsx)"
    ).toBeTruthy()
  })

  it("names every country at rest and keeps the figure for the hover", () => {
    show()
    // AT REST the picture is whole: every country has its own row, with its
    // own colour, and a reader can identify every slice without touching
    // anything. Her "(when hover show)" is about the VALUE.
    for (const row of FULL.byCountry) expect(screen.getByText(row.country)).toBeTruthy()
    // THE FIGURE IS NOT PRINTED AT REST. `getByText` reads rendered TEXT and
    // never an `aria-label`, so this is the honest test of "you do not see the
    // number until you ask for it" — the same distinction
    // `dashboard-says-what-it-left-out.test.tsx` draws for the closing-time
    // readout she moved behind a hover.
    expect(
      screen.queryByText("7 accounts, 50% of the book"),
      "the slice's figure is printed at rest — she asked for it on hover"
    ).toBeNull()
  })

  it("puts the figure on a real, focusable hit area", () => {
    show()
    // A REAL `<button>`, so it is in the tab order and the kit's hover card
    // (Radix) opens on FOCUS as well as on hover — and the whole readout is
    // its accessible NAME, so a screen reader hears the figure whether or not
    // the floating panel ever opens. 7 of 14 is 50%.
    const spain = screen.getByRole("button", { name: /^Spain/ })
    expect(spain.getAttribute("aria-label")).toBe("Spain · 7 accounts, 50% of the book")
    // Austria is 3 of 14 — 21% once rounded, never 20 or 25.
    expect(screen.getByRole("button", { name: /^Austria/ }).getAttribute("aria-label")).toBe(
      "Austria · 3 accounts, 21% of the book"
    )
  })
})

// ── 2b · WHAT THEY DO, BESIDE IT ────────────────────────────────────────────

describe("the industry split sits beside the country one, in one row", () => {
  it("draws a second donut, with its own words and its own figures", () => {
    const container = show()
    // TWO RINGS, not one — the whole of her "side of where they are". A test
    // that only counted legend rows would pass on a single donut with six of
    // them.
    expect(
      container.querySelectorAll('[data-slot="donut"]').length,
      "the accounts dashboard draws only one donut — the industry split is missing or is not a donut"
    ).toBe(2)
    for (const row of FULL.byIndustry) expect(screen.getByText(row.industry)).toBeTruthy()
    // 6 of 14 is 43%. Counted over the INDUSTRY total (14), not the country
    // one, which this fixture keeps deliberately different.
    expect(screen.getByRole("button", { name: /^Insurance ·/ }).getAttribute("aria-label")).toBe(
      "Insurance · 6 accounts, 43% of the book"
    )
    // AND THE NEAR-DUPLICATE STAYS ITS OWN SLICE. "Insurance" and "Insurance
    // Broker" are two live spellings on the real book and may be two real
    // trades; nothing in this app merges them on its own judgement, so the
    // picture must not either.
    expect(
      screen.getByRole("button", { name: /^Insurance Broker/ }).getAttribute("aria-label")
    ).toBe("Insurance Broker · 5 accounts, 36% of the book")
  })

  it("puts the two in ONE row, stacking at the same breakpoint the ticket dashboard uses", () => {
    const container = show()
    // HER WORDS ARE ABOUT THE ROW: "so in the same row country & industry". A
    // grid is the only thing that makes that true at a width and stackable
    // below it, and the breakpoint is the one `tickets-dashboard.tsx` already
    // answers this question with rather than a new one invented here.
    const spain = screen.getAllByText("Spain")[0]!
    const insurance = screen.getAllByText("Insurance")[0]!
    const row = spain.closest(".grid")
    expect(row, "the country split does not sit in a grid row at all").toBeTruthy()
    expect(
      row?.contains(insurance),
      "the country and industry splits are not in the same row — she asked for them side by side"
    ).toBe(true)
    expect(
      row?.className,
      "the pair does not stack into one column below lg, which every panel row on the ticket dashboard does"
    ).toMatch(/\blg:grid-cols-2\b/)
    expect(container.querySelectorAll('[data-slot="split-slice"]').length).toBe(
      FULL.byCountry.length + FULL.byIndustry.length
    )
  })
})

// ── 3 · HOW LONG WE HAVE HAD THEM, AS A LINE ────────────────────────────────

describe("how long we have had them is a line, and the hover says who", () => {
  it("draws a line rather than the bars it replaced", () => {
    const container = show()
    expect(
      container.querySelector('[data-slot="arrivals-line"]'),
      "the arrivals picture draws no line — her ruling was \"make [it] a line graphic\""
    ).toBeTruthy()
    // ONE VERTICAL RULE PER MONTH, behind the mark — `ClosureTrend`'s own
    // furniture. Named with this panel's own slot because the lone-month DOT
    // is also an SVG `<line>`, and a check about the data must never end up
    // counting the furniture.
    expect(container.querySelectorAll('[data-slot="arrivals-month-rule"]').length).toBe(
      FULL.arrivals.length
    )
  })

  it("gives every month a focusable hit area that NAMES the accounts in it", () => {
    show()
    // HER OWN WORD IS "WHO". A month with three companies names all three, in
    // the door's own A→Z order; a month with one names it. The count leads,
    // because it is what says whether the list is the whole month.
    const june = screen.getByRole("button", { name: /^Jun 2023/ })
    expect(june.getAttribute("aria-label")).toBe(
      "Jun 2023 · 3 arrived · Alder Ltd · Birch Ltd · Cedar Ltd"
    )
    const feb = screen.getByRole("button", { name: /^Feb 2023/ })
    expect(feb.getAttribute("aria-label")).toBe("Feb 2023 · 1 arrived · Madrid Co")
  })

  it("says how many it could not name, rather than pretending the list was all of them", () => {
    // The door caps the names per month (`ACCOUNTS_ARRIVAL_NAMES_PER_MONTH`)
    // while `n` stays EXACT, so the two can disagree by design. A panel that
    // silently drew eight names over a count of thirty would be the quiet
    // half-truth R14's caps exist to avoid.
    show({
      ...FULL,
      arrivals: [
        { month: "2025-04", n: 30, names: ["Alder Ltd", "Birch Ltd"] },
        { month: "2025-05", n: 1, names: ["Cedar Ltd"] },
      ],
    })
    expect(screen.getByRole("button", { name: /^Apr 2025/ }).getAttribute("aria-label")).toBe(
      "Apr 2025 · 30 arrived · Alder Ltd · Birch Ltd · and 28 more"
    )
  })

  it("still draws a mark when only one month has arrived", () => {
    // A line needs two points; one month is a DOT rather than nothing, the
    // same answer `ClosureTrend` gives a kind with a single month. A blank
    // plot under a heading reads as "nobody has ever arrived", which is false.
    const view: AccountsDashboardData = {
      ...FULL,
      arrivals: [{ month: "2026-01", n: 2, names: ["Vienna Co", "Wien Co"] }],
    }
    const container = show(view)
    expect(container.querySelector('[data-slot="arrivals-point"]')).toBeTruthy()
    expect(container.querySelector('[data-slot="arrivals-line"]')).toBeNull()
  })
})
