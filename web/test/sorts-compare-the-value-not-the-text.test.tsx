// A DATE COLUMN ORDERS BY THE DATE, NOT BY THE ALPHABET.
//
// ── THE BUG THIS IS ────────────────────────────────────────────────────────────
//
// A table cell holds a string shaped for a READER and a sort answers a question
// about a FACT, and for a date those two are not the same value. Compare the
// cells and "14 Apr 2025", "22 Dec 2025", "3 Jan 2026" come back in that order —
// April, December, January — which is a real answer to the wrong question, and
// it is delivered in silence: the rows move, the header's arrow lights, and
// nothing on the screen distinguishes a sort that worked from one that sorted
// the alphabet. `table-header-sorts.test.tsx` is the file about a control that
// does NOTHING; this is the file about a control that does the WRONG THING,
// which is the harder half to see and the reason it went eight months unfixed
// (UI-GAPS #32(a), open since August).
//
// ── WHY THESE FOUR DATES ──────────────────────────────────────────────────────
//
// The fixture is the whole test. "14 Apr 2025 / 22 Dec 2025 / 3 Jan 2026" is a
// tempting set and it proves NOTHING in English, because the alphabet and the
// calendar happen to agree on it; a comparator that read the words would pass.
// So the four rows below are chosen so that the calendar order, the ENGLISH text
// order and the GERMAN text order are three DIFFERENT sequences:
//
//   row      raw            en cell          de cell
//   Winter   2024-12-22     Dec 22, 2024     22. Dez. 2024
//   Early    2025-03-02     Mar 2, 2025      2. März 2025
//   Late     2025-03-11     Mar 11, 2025     11. März 2025
//   Next     2026-01-09     Jan 9, 2026      9. Jan. 2026
//
//   by the calendar   Winter · Early · Late · Next
//   by the en text    Winter · Next · Early · Late
//   by the de text    Early · Next · Late · Winter
//
// Two rows inside one month are what break the German half (the day number
// leads there, so "11. März" and "2. März" sort by their first character), and
// the December/January pair is what breaks the English half. Any comparison
// that reaches for the rendered text gets one of the two languages wrong at
// best, and this app ships four (`shared/i18n.ts`).
//
// ── AND THE CONTROL CASE IS IN HERE TOO ───────────────────────────────────────
//
// Every case below has a twin that declares NO `sortType` and NO `sortKey` over
// the identical cells, and asserts it produces the WRONG order — the one the
// alphabet gives. A test that only pins the right answer cannot tell you the
// seam is what produced it; this pair can. If somebody deletes `sortType` from
// `record-table.tsx` and makes text the only comparison again, the twin goes
// green and the real one goes red, and the diff says exactly what was lost.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { RecordTable, type TableColumn } from "@/components/record-table"
import { BASE_RECIPES, withDataDrivenCollection } from "@/lib/screens"
import { formatDate } from "@shared/web/format"
import type { Language } from "@shared/i18n"

afterEach(cleanup)

/** The four rows, as the door hands them over: a name and a raw instant. Midday
 * UTC on purpose — `formatDate` reads the LOCAL calendar day, so a midnight
 * fixture would roll onto the day before in any timezone west of Greenwich and
 * this suite would be measuring the machine it runs on (`web/test/format.test.ts`
 * makes the same choice, for the same reason). */
const DAYS = [
  { id: "1", name: "Winter", at: "2024-12-22T12:00:00.000Z" },
  { id: "2", name: "Early", at: "2025-03-02T12:00:00.000Z" },
  { id: "3", name: "Late", at: "2025-03-11T12:00:00.000Z" },
  { id: "4", name: "Next", at: "2026-01-09T12:00:00.000Z" },
]

/** …shaped the way a screen shapes them: the cell is the WARM date in the
 * reader's own language, the raw instant rides alongside under its own key and
 * is drawn by nobody. That pairing is the seam; the rest of this file is what
 * it buys. The rows are handed over in a deliberately unhelpful order (not the
 * calendar's, not the alphabet's) so no assertion below can pass by accident. */
const shaped = (lang: Language) =>
  DAYS.map((d) => ({ id: d.id, name: d.name, when: formatDate(d.at, lang), at: d.at }))

/** The column pair under test. `when` displays one thing and compares another —
 * `sortType: "date"` says what it is, `sortKey` says where the value is. */
const DATED: TableColumn[] = [
  { key: "name", label: "Row", sort: "name" },
  { key: "when", label: "When", sort: "when", sortType: "date", sortKey: (row) => row.at },
]

/** The same table with the seam taken away — the shape every column in this app
 * had before today. Same cells, same rows, and it is here to FAIL in the useful
 * direction: it demonstrates the defect rather than describing it. */
const UNDECLARED: TableColumn[] = [
  { key: "name", label: "Row", sort: "name" },
  { key: "when", label: "When", sort: "when" },
]

function renderTable(columns: TableColumn[], rows: Record<string, unknown>[]) {
  // Several cases below mount the SAME table twice — once with the seam and
  // once without — to compare the two answers inside one assertion, so the
  // previous mount has to go before the next one arrives or `getByRole` finds
  // two "When" headers and fails on the ambiguity rather than on the order.
  cleanup()
  render(
    <RecordTable
      columns={columns}
      rows={rows}
      config={
        withDataDrivenCollection(BASE_RECIPES["meetings.list"], [{ id: "1", name: "x" }])
          .collection as never
      }
    />
  )
}

/** The first cell of every rendered row, top to bottom — what a person sees down
 * the page, which is the only fact any of this is about. */
const rowOrder = () =>
  Array.from(document.querySelectorAll("tbody tr")).map(
    (tr) => tr.querySelector("td")?.textContent ?? ""
  )

const header = (label: string) => screen.getByRole("button", { name: new RegExp(`^${label}`) })

/** Ascending by the named column, from a fresh mount. */
function sortedBy(columns: TableColumn[], rows: Record<string, unknown>[], label: string) {
  renderTable(columns, rows)
  fireEvent.click(header(label))
  return rowOrder()
}

const CHRONOLOGICAL = ["Winter", "Early", "Late", "Next"]

describe("a date column orders by the date", () => {
  it("English: chronologically, and NOT the order the words are in", () => {
    const got = sortedBy(DATED, shaped("en"), "When")
    expect(got).toEqual(CHRONOLOGICAL)
    // The assertion that makes the one above mean something. If these two were
    // the same list the fixture would be proving nothing at all — see the
    // header's table.
    expect(got, "the fixture has stopped being a fixture — pick dates whose calendar and alphabet disagree").not.toEqual(
      sortedBy(UNDECLARED, shaped("en"), "When")
    )
  })

  it("…and comparing the words instead gives a different, wrong list", () => {
    expect(sortedBy(UNDECLARED, shaped("en"), "When")).toEqual([
      "Winter", // Dec 22, 2024
      "Next", // Jan 9, 2026
      "Early", // Mar 2, 2025  — before "Mar 11" because the comparison is numeric-aware
      "Late", // Mar 11, 2025
    ])
  })

  it("German: the SAME rows in the SAME order, because the comparison never reads the words", () => {
    // The whole locale argument in one assertion. The cells are different
    // strings in a different language — proved on the next line, so this cannot
    // pass by quietly rendering English — and the answer does not move.
    expect(sortedBy(DATED, shaped("de"), "When")).toEqual(CHRONOLOGICAL)
    expect(formatDate(DAYS[1].at, "de"), "the German fixture is not German").not.toBe(
      formatDate(DAYS[1].at, "en")
    )
  })

  it("…while comparing the words gives a THIRD list in German — the same code, a different answer", () => {
    // This is what "locale-dependent" costs, spelled out: a comparison on the
    // rendered text does not merely get the order wrong, it gets it wrong
    // DIFFERENTLY per language, so no one fixture and no one reviewer can see
    // it. Spanish and Catalan are two more.
    const de = sortedBy(UNDECLARED, shaped("de"), "When")
    expect(de).not.toEqual(CHRONOLOGICAL)
    expect(de).not.toEqual(sortedBy(UNDECLARED, shaped("en"), "When"))
  })

  it("reverses on the second press, still by the date", () => {
    renderTable(DATED, shaped("de"))
    fireEvent.click(header("When"))
    fireEvent.click(header("When"))
    expect(rowOrder()).toEqual([...CHRONOLOGICAL].reverse())
  })
})

describe("a row with no date", () => {
  // A blank has to land at ONE END and stay there, both directions. Scattered is
  // the failure mode that matters: `new Date(null)` is a `NaN`, and a `NaN` in a
  // comparator does not sort a row to the bottom — it makes that row compare
  // "not less and not greater" against everything, so the list it lands in is
  // whatever the sort algorithm's partitioning happened to do. That looks like a
  // shuffled list rather than like a bug.
  const withGap = () => [
    ...shaped("en"),
    { id: "5", name: "Someday", when: "—", at: null },
    { id: "6", name: "Broken", when: "—", at: "not a date" },
  ]

  it("sits at the bottom ascending", () => {
    expect(sortedBy(DATED, withGap(), "When")).toEqual([...CHRONOLOGICAL, "Someday", "Broken"])
  })

  it("…and at the bottom descending too, because a screen of em-dashes is not an answer", () => {
    renderTable(DATED, withGap())
    fireEvent.click(header("When"))
    fireEvent.click(header("When"))
    expect(rowOrder()).toEqual([...[...CHRONOLOGICAL].reverse(), "Someday", "Broken"])
  })

  it("an unparseable date is missing, not zero — 1970 would sort it FIRST", () => {
    // The subtle half of the case above. `Date.parse("not a date")` is NaN and
    // `Number(NaN || 0)` is the kind of tidying that puts a row at 1 Jan 1970 —
    // top of the list, ahead of every real date, looking like data rather than
    // like an empty cell.
    expect(sortedBy(DATED, withGap(), "When")[0]).toBe("Winter")
  })
})

describe("rows the column cannot tell apart keep the order they arrived in", () => {
  // Stability. `Array.prototype.sort` has been required to be stable since
  // ES2019, and this is the assertion that says the table is relying on that on
  // purpose: the same list sorted the same way twice looks the same twice, and
  // a person scanning it does not have to re-find their place.
  const sameDay = [
    { id: "1", name: "First", when: "Mar 2, 2025", at: "2025-03-02T09:00:00.000Z" },
    { id: "2", name: "Second", when: "Mar 2, 2025", at: "2025-03-02T09:00:00.000Z" },
    { id: "3", name: "Third", when: "Mar 2, 2025", at: "2025-03-02T09:00:00.000Z" },
  ]

  it("ascending", () => {
    expect(sortedBy(DATED, sameDay, "When")).toEqual(["First", "Second", "Third"])
  })

  it("…and descending, which is the direction that catches a reversed tie", () => {
    renderTable(DATED, sameDay)
    fireEvent.click(header("When"))
    fireEvent.click(header("When"))
    expect(rowOrder(), "equal rows were flipped by the direction, not left alone").toEqual([
      "First",
      "Second",
      "Third",
    ])
  })
})

describe("a number column compares the number", () => {
  // The same defect one type along, and the one that bites soonest: a count, a
  // padded reference or money rendered as text. `10` before `9` is the classic,
  // and the table's TEXT comparison is numeric-aware so it survives that one on
  // its own — the case it cannot survive is a number wearing a currency symbol
  // and a thousands separator, where the separator means one thing in English
  // and the opposite in German.
  const MONEY: TableColumn[] = [
    { key: "name", label: "Row", sort: "name" },
    { key: "cost", label: "Cost", sort: "cost", sortType: "number", sortKey: (row) => row.cents },
  ]
  const PLAIN: TableColumn[] = [
    { key: "name", label: "Row", sort: "name" },
    { key: "cost", label: "Cost", sort: "cost" },
  ]
  const rows = [
    { id: "1", name: "Small", cost: "€90.00", cents: 9_000 },
    { id: "2", name: "Big", cost: "€1,240.00", cents: 124_000 },
    { id: "3", name: "Middle", cost: "€800.00", cents: 80_000 },
  ]

  it("cheapest first, whatever the cell says", () => {
    expect(sortedBy(MONEY, rows, "Cost")).toEqual(["Small", "Middle", "Big"])
  })

  it("…and comparing the cell puts €1,240 below €90, silently", () => {
    // "1,240.00" reads as one-point-two to a numeric-aware text comparison, so
    // the most expensive row sorts as the cheapest. Nothing about the screen
    // says so: the rows moved and the column is full of money.
    expect(sortedBy(PLAIN, rows, "Cost")).toEqual(["Big", "Small", "Middle"])
  })
})
