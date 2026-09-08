// THE TWO HALVES OF THE WEEKEND RULE ANSWER THE SAME NUMBER.
//
// `shared/business-days.ts` says the Monday-to-Friday rule twice, in two
// languages, and it has to: the triage queue counts a card's age in Javascript
// because it already has the row, and the tickets dashboard counts a closing
// time in SQL because it must never be handed the rows (R14 — the backlog is a
// growing collection the browser holds page one of). The file's own header
// makes the claim that the two are one sentence written twice. Nothing enforced
// it, and "the same arithmetic, said in SQL" is exactly the kind of claim that
// is true on the day it is written and quietly false four edits later — the
// failure would be a queue card reading "3 days" beside a chart bar reading
// "2 days" for the same ticket, with nothing on either screen saying which one
// to believe.
//
// So both are RUN, over the same instants, and required to agree exactly.
//
// THE INSTANTS ARE CHOSEN, NOT RANDOM, and every one of them is a case that
// separates a correct implementation from a plausible one: spans that start or
// end on a weekend, spans that straddle one, spans that straddle several, the
// Friday-evening-to-Monday-morning case the whole ruling came from, and
// same-instant spans. A random sweep runs beside them, because the cases
// somebody thinks of are the cases somebody has already got right.

import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vitest"

import { workingDaysBetween, workingDaysSql } from "@shared/business-days"

/** Ask SQLite for the working days between two instants, through the very
 * expression the dashboard's own statements are built from. Bound as columns of
 * a one-row table, because `workingDaysSql` interpolates COLUMN NAMES — asking
 * it about `?` would be testing a shape no caller uses. */
function viaSql(from: string, to: string): number {
  const db = new DatabaseSync(":memory:")
  db.exec(`CREATE TABLE t (a TEXT, b TEXT)`)
  db.prepare(`INSERT INTO t (a, b) VALUES (?, ?)`).run(from, to)
  const row = db.prepare(`SELECT ${workingDaysSql("a", "b")} AS d FROM t`).get() as { d: number }
  db.close()
  return Number(row.d)
}

/** An ISO instant, written the way every stamp in this product is stored. */
const at = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(Date.UTC(y, m - 1, d, h, min)).toISOString()

describe("the SQL twin of the weekend rule answers what the Javascript does", () => {
  // September 2026: the 7th is a Monday, so the 11th is a Friday, the 12th a
  // Saturday, the 13th a Sunday and the 14th the next Monday. Written out here
  // once so every case below can be read without a calendar.
  const MON = 7
  const TUE = 8
  const THU = 10
  const FRI = 11
  const SAT = 12
  const SUN = 13
  const NEXT_MON = 14

  const CASES: [string, string, string][] = [
    ["same instant", at(2026, 9, MON, 9), at(2026, 9, MON, 9)],
    ["inside one working day", at(2026, 9, MON, 9), at(2026, 9, MON, 17)],
    ["one working day", at(2026, 9, MON, 9), at(2026, 9, TUE, 9)],
    ["the ruling's own case — Friday evening to Monday morning", at(2026, 9, FRI, 16), at(2026, 9, NEXT_MON, 9)],
    ["Friday morning to Monday evening", at(2026, 9, FRI, 9), at(2026, 9, NEXT_MON, 17)],
    ["Thursday to Saturday — the weekend adds nothing", at(2026, 9, THU, 9), at(2026, 9, SAT, 9)],
    ["Thursday to Sunday — nor does the second weekend day", at(2026, 9, THU, 9), at(2026, 9, SUN, 9)],
    ["raised ON a Saturday", at(2026, 9, SAT, 10), at(2026, 9, NEXT_MON, 12)],
    ["raised ON a Sunday", at(2026, 9, SUN, 10), at(2026, 9, NEXT_MON, 12)],
    ["closed ON a Saturday", at(2026, 9, MON, 10), at(2026, 9, SAT, 23)],
    ["a whole week", at(2026, 9, MON, 9), at(2026, 9, NEXT_MON, 9)],
    ["a fortnight and a bit", at(2026, 9, MON, 9), at(2026, 9, 25, 15)],
    ["across a month boundary", at(2026, 9, 28, 9), at(2026, 10, 9, 9)],
    ["across a year boundary", at(2025, 12, 29, 9), at(2026, 1, 8, 9)],
    ["a hundred calendar days", at(2026, 1, 1, 9), at(2026, 4, 11, 9)],
  ]

  for (const [what, from, to] of CASES) {
    it(what, () => {
      expect(viaSql(from, to), `${from} → ${to}`).toBe(workingDaysBetween(from, to))
    })
  }

  it("…and over four hundred spans nobody chose", () => {
    // A fixed seed, so a failure is reproducible and a green run is not luck.
    let seed = 20260906
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    const start = Date.UTC(2026, 0, 1)
    const disagreements: string[] = []
    for (let i = 0; i < 400; i++) {
      const from = new Date(start + Math.floor(next() * 400 * 86_400_000)).toISOString()
      const to = new Date(Date.parse(from) + Math.floor(next() * 60 * 86_400_000)).toISOString()
      const js = workingDaysBetween(from, to)
      const sql = viaSql(from, to)
      if (js !== sql) disagreements.push(`${from} → ${to}: js ${js}, sql ${sql}`)
    }
    expect(
      disagreements.slice(0, 5),
      "the two halves of the weekend rule have drifted apart — a queue card and a dashboard bar would now report different numbers for the same ticket"
    ).toEqual([])
  })
})
