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
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
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
    // Spain names MORE accounts than the door's own per-slice cap would, so
    // the "and N more" clause is exercised rather than assumed: 7 in the
    // slice, 2 named.
    {
      country: "Spain",
      n: 7,
      accounts: [
        { id: "a1", name: "Madrid Co", logoUrl: "/media/madrid.png" },
        { id: "a2", name: "Sevilla Co", logoUrl: null },
      ],
    },
    { country: "Germany", n: 4, accounts: [{ id: "a3", name: "Berlin Co", logoUrl: null }] },
    { country: "Austria", n: 3, accounts: [{ id: "a4", name: "Wien Co", logoUrl: null }] },
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

describe("the figures row (R97, with her own explicit exception)", () => {
  it("adds the median tenure, in the same unit the picture under it uses", () => {
    show()
    // MONTHS, because the arrivals line's x-axis is one point per calendar
    // month — see `DAYS_PER_MONTH`'s own note in the component. 947 days is
    // 31.1 mean months.
    expect(screen.getByText("31 months"), "the median tenure is not drawn in months").toBeTruthy()
    expect(screen.getByText("Median tenure")).toBeTruthy()
  })

  it("gives each figure Effort's own card background, and no stroke", () => {
    // Aurora, 23 Sep 2026: "the cards kpi need some kind of background, like
    // effort." Effort's tiles are `<Card variant="default">` around a bare
    // `<StatGrid>` (`web/components/work/effort-card.tsx`), so this asserts
    // the SAME two components rather than a third treatment that merely looks
    // similar.
    const container = show()
    const figure = screen.getAllByText("Active accounts")[0]!
    const card = figure.closest('[data-slot="card"]')
    expect(card, "a KPI figure has no card around it — she asked for a background like Effort").not.toBeNull()
    expect(
      container.querySelectorAll('[data-slot="stat-grid"]').length,
      "the figures are not drawn through the kit's own stat register"
    ).toBe(3)
    // AND IT IS A TONE, NOT A BOX. The kit's §2.8 (her own "by rule no borders
    // nowhere in the kit") forbids a container told from its ground by a
    // stroke, which is the one way a reader could answer "give it a
    // background" wrongly. `variant="default"` is soft paper; anything that
    // draws a hairline shadow or a border here would be the refused shape.
    expect(card?.className ?? "", "the KPI card is drawn as a stroke, which the kit's §2.8 refuses").not.toMatch(
      /\bborder(-|\b)|shadow-\[/
    )
    // Each tile is its OWN card — three figures, three cards, the shape Effort
    // draws rather than one card holding a row of numbers.
    expect(container.querySelectorAll('[data-slot="card"]').length).toBe(3)
  })
})

// ── 2 · WHERE THEY ARE, AS A DONUT, AND WHO IS IN THE SLICE ────────────────

describe("where they are is a donut, and the hover says which accounts", () => {
  it("draws the KIT's donut, not a second one by hand", () => {
    const container = show()
    expect(
      container.querySelector('[data-slot="donut"]'),
      "the country split is not drawn through the kit's own `Donut` (shared/ui/components/donut/donut.tsx)"
    ).toBeTruthy()
    // ONE RING ONLY NOW. Industry is a bar chart since her 23 Sep ruling, so a
    // second donut on this tab would be the old shape left behind.
    expect(container.querySelectorAll('[data-slot="donut"]').length).toBe(1)
  })

  it("names every country at rest and keeps the figure for the hover", () => {
    show()
    for (const row of FULL.byCountry) expect(screen.getByText(row.country)).toBeTruthy()
    // `getByText` reads rendered TEXT and never an `aria-label`, so this is the
    // honest test of "you do not see the number until you ask for it".
    expect(
      screen.queryByText("7 accounts, 50% of the book"),
      "the slice's figure is printed at rest — she asked for it on hover"
    ).toBeNull()
  })

  it("puts the figure on a real, focusable hit area", () => {
    show()
    // 7 of 14 is 50%; Austria is 3 of 14, which is 21% once rounded.
    expect(screen.getByRole("button", { name: /^Spain/ }).getAttribute("aria-label")).toBe(
      "Spain · 7 accounts, 50% of the book"
    )
    expect(screen.getByRole("button", { name: /^Austria/ }).getAttribute("aria-label")).toBe(
      "Austria · 3 accounts, 21% of the book"
    )
  })

  it("shows WHICH accounts, with name and face, only once a slice is active", () => {
    // Her second ruling of the pair, verbatim: "when hover in donut in
    // country, show which aacounts with name adn logo". At rest the readout is
    // empty; hovering a slice fills it.
    const container = show()
    const readout = () => container.querySelector('[data-slot="country-accounts"]')!
    expect(readout().textContent?.trim(), "the accounts are listed before anything is hovered").toBe("")

    fireEvent.mouseEnter(screen.getByRole("button", { name: /^Spain/ }))
    expect(screen.getByText("Madrid Co")).toBeTruthy()
    expect(screen.getByText("Sevilla Co")).toBeTruthy()
    // THE FACE IS THE APP'S OWN, not a second fallback: `RecordMark` draws the
    // picture where there is one and the letter tile where there is not.
    const img = readout().querySelector("img")
    expect(img, "the account with a logo draws no picture").not.toBeNull()
    expect(readout().textContent, "the company with no logo draws no letter tile").toContain("S")

    // AND IT SAYS WHAT IT COULD NOT SHOW. The door caps the faces per slice
    // while `n` stays exact, so 7 in the slice and 2 named is "and 5 more".
    expect(readout().textContent).toContain("and 5 more")

    // Germany names one of its four, so it says so too.
    fireEvent.mouseLeave(screen.getByRole("button", { name: /^Spain/ }))
    fireEvent.mouseEnter(screen.getByRole("button", { name: /^Germany/ }))
    expect(readout().textContent).toContain("Berlin Co")
    expect(readout().textContent).toContain("and 3 more")
  })

  it("says nothing extra for a country whose slice names everything", () => {
    // THE OTHER HALF OF THE SAME CLAUSE, and it needs its own book: a slice
    // whose `n` equals the number of names it carries must not print a
    // dangling "and 0 more".
    const container = show({
      ...FULL,
      byCountry: [{ country: "Austria", n: 2, accounts: [
        { id: "a1", name: "Wien Co", logoUrl: null },
        { id: "a2", name: "Graz Co", logoUrl: null },
      ] }],
    })
    fireEvent.mouseEnter(screen.getByRole("button", { name: /^Austria/ }))
    const text = container.querySelector('[data-slot="country-accounts"]')!.textContent ?? ""
    expect(text).toContain("Wien Co")
    expect(text).toContain("Graz Co")
    expect(text, "a fully named slice still prints an \"and N more\" tail").not.toContain("more")
  })

  it("empties the readout again when the pointer leaves", () => {
    const container = show()
    const spain = screen.getByRole("button", { name: /^Spain/ })
    fireEvent.mouseEnter(spain)
    fireEvent.mouseLeave(spain)
    expect(
      container.querySelector('[data-slot="country-accounts"]')!.textContent?.trim(),
      "the slice's accounts stay on screen after the pointer has gone"
    ).toBe("")
  })
})

// ── 2b · WHAT THEY DO, AS BARS, BESIDE IT ──────────────────────────────────

describe("the industry split is a bar chart beside the country donut", () => {
  it("draws bars, not a second donut", () => {
    // Aurora, 23 Sep 2026: "make industry a bar chart." Country stays a donut;
    // they still share the row.
    const container = show()
    expect(
      container.querySelector('[data-slot="industry-bars"]'),
      "the industry split is not a bar chart"
    ).toBeTruthy()
    expect(container.querySelectorAll('[data-slot="industry-bar"]').length).toBe(
      FULL.byIndustry.length
    )
    for (const row of FULL.byIndustry) expect(screen.getByText(row.industry)).toBeTruthy()
    // THE COUNT IS ON THE ROW, not behind a hover: a bar has somewhere to
    // write it, which a slice does not.
    expect(screen.getAllByText("6").length).toBeGreaterThan(0)
    // AND THE NEAR-DUPLICATE STAYS ITS OWN BAR. "Insurance" and "Insurance
    // Broker" are two live spellings and may be two real trades; nothing in
    // this app merges them on its own judgement.
    expect(screen.getByText("Insurance")).toBeTruthy()
    expect(screen.getByText("Insurance Broker")).toBeTruthy()
  })

  it("puts the two in ONE row, stacking at the same breakpoint the ticket dashboard uses", () => {
    const container = show()
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
    expect(container.querySelectorAll('[data-slot="split-slice"]').length).toBe(FULL.byCountry.length)
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
