// THE ACCOUNTS DASHBOARD DOOR, against a real SQLite database running the real
// migration — the same harness `accounts.test.ts` proves the customer spine's
// other invariants against.
//
// Her ruling, 23 Sep 2026, struck four things from a design and left three:
// how many active companies there are and how many countries they sit in,
// where they are by country, and when they arrived, off each company's own
// `created_at`. This file proves those are counted honestly (active only,
// entity only, a country nobody set is not a row) and that the three strikes
// she did NOT reverse never ride along in the shape the door hands back.
//
// TENURE CAME BACK THE SAME DAY, by her own later word over the built screen:
// "add the median tenure" and "when hover show who". So this file also proves
// the two things that reversal bought — a TRUE median (odd, even, one, none)
// and the NAMES behind each arrival month — against the same real database.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("./d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import { readAccountsDashboard } from "../src/lib/accounts"
import { buildSpineDb, IDS } from "./spine-harness"

const cfg = { accountId: "a", apiToken: "t" } as never
const guard = { userId: IDS.staffUser, teamId: IDS.team, roleId: IDS.adminRole, databaseId: "db_team" }
const staff = { kind: "staff" } as const

const db = () => holder.db as DatabaseSync

/** One more account, straight into the fixture's own team database — never
 * through a door, so the test proves what the QUERY counts rather than what
 * another door happens to validate on the way in. */
function seedAccount(row: {
  id: string
  type: "entity" | "individual"
  name: string
  country?: string
  createdAt: string
  deactivatedAt?: string
  archivedAt?: string
}): void {
  db()
    .prepare(
      `INSERT INTO accounts (id, account_type, name, country, created_at, creator_id, deactivated_at, archived_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      row.id,
      row.type,
      row.name,
      row.country ?? null,
      row.createdAt,
      IDS.staffUser,
      row.deactivatedAt ?? null,
      row.archivedAt ?? null
    )
}

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("readAccountsDashboard", () => {
  it("counts active companies only, groups by country and by arrival month", async () => {
    // THE FIXTURE'S OWN BASELINE — `spine-harness.ts`'s `buildSpineDb` already
    // seeds four ACTIVE ENTITY accounts (Bergman S.A., Bergman Workshop,
    // Bergman Marine, Delaval Group), none carrying a country, all created
    // "2026-01-01". Read once, before this test adds anything, so the
    // assertions below are about what THIS test seeded rather than a magic
    // number that silently drifts if the shared fixture ever grows another
    // account.
    const before = await readAccountsDashboard(cfg, guard, staff)
    expect(before.countryCount, "the shared fixture's own accounts should carry no country").toBe(0)

    seedAccount({ id: "DASH_ES1", type: "entity", name: "Madrid Co", country: "Spain", createdAt: "2023-02-15" })
    seedAccount({ id: "DASH_ES2", type: "entity", name: "Sevilla Co", country: "Spain", createdAt: "2023-06-01" })
    seedAccount({ id: "DASH_DE1", type: "entity", name: "Berlin Co", country: "Germany", createdAt: "2024-03-10" })
    // NO COUNTRY SET — counts toward `activeCount`, never toward
    // `countryCount`/`byCountry` (her strike on a missing-field readout: a
    // blank field is silently outside the question, never named).
    seedAccount({ id: "DASH_NOCOUNTRY", type: "entity", name: "Nowhere Co", createdAt: "2024-05-05" })
    // INACTIVE — never counted anywhere on this tab.
    seedAccount({
      id: "DASH_INACTIVE",
      type: "entity",
      name: "Inactive Co",
      country: "Spain",
      createdAt: "2023-01-01",
      deactivatedAt: "2026-02-01",
    })
    // ARCHIVED — never counted anywhere on this tab, her stronger state.
    seedAccount({
      id: "DASH_ARCHIVED",
      type: "entity",
      name: "Archived Co",
      country: "Spain",
      createdAt: "2023-01-01",
      archivedAt: "2026-02-01",
    })
    // A PERSON, NOT A COMPANY — never counted on this tab either, the same
    // `account_type = 'entity'` partition the everyday Accounts list draws.
    seedAccount({ id: "DASH_PERSON", type: "individual", name: "Someone", country: "Spain", createdAt: "2024-01-01" })

    const after = await readAccountsDashboard(cfg, guard, staff)

    // FOUR NEW ACTIVE COMPANIES, never the inactive one, the archived one or
    // the person: ES1, ES2, DE1, NOCOUNTRY.
    expect(after.activeCount).toBe(before.activeCount + 4)

    // TWO COUNTRIES, SPAIN BUSIEST FIRST — NOCOUNTRY sits in neither row.
    expect(after.countryCount).toBe(2)
    expect(after.byCountry).toEqual([
      { country: "Spain", n: 2 },
      { country: "Germany", n: 1 },
    ])

    // ONE ROW PER MONTH AN ACTIVE COMPANY ARRIVED IN, oldest first — the
    // fixture's own baseline contributes "2026-01": 4 (unaffected by anything
    // this test seeded, since a real month bucket only grows), and every
    // month this test seeded shows up with exactly one company in it,
    // NOCOUNTRY included — arrivals asks nothing about country.
    const byMonth = new Map(after.arrivals.map((r) => [r.month, r.n]))
    expect(byMonth.get("2023-02")).toBe(1)
    expect(byMonth.get("2023-06")).toBe(1)
    expect(byMonth.get("2024-03")).toBe(1)
    expect(byMonth.get("2024-05")).toBe(1)
    expect(byMonth.get("2026-01")).toBe(before.activeCount)
    // NEVER 2023-01 — both accounts created that month (INACTIVE, ARCHIVED)
    // are excluded from the active fence, so the bucket never opens at all.
    expect(byMonth.has("2023-01")).toBe(false)
    // Oldest first.
    const months = after.arrivals.map((r) => r.month)
    expect(months).toEqual([...months].sort())
  })

  it("splits the book by industry the same way it splits it by country", async () => {
    // Aurora, 23 Sep 2026: "add metric industry (side of where they are , so in
    // the same row country & industry)". The same fence, the same clause, one
    // column along — so the two can never disagree about which accounts they
    // are counting.
    seedAccount({ id: "IND_1", type: "entity", name: "Broker One", createdAt: "2024-01-01" })
    seedAccount({ id: "IND_2", type: "entity", name: "Broker Two", createdAt: "2024-01-02" })
    seedAccount({ id: "IND_3", type: "entity", name: "Shipper", createdAt: "2024-01-03" })
    seedAccount({ id: "IND_BLANK", type: "entity", name: "Unsaid", createdAt: "2024-01-04" })
    // INACTIVE — outside this reading as it is outside every other one here.
    seedAccount({
      id: "IND_OUT",
      type: "entity",
      name: "Gone",
      createdAt: "2024-01-05",
      deactivatedAt: "2026-02-01",
    })
    const set = (id: string, industry: string) =>
      db().prepare("UPDATE accounts SET industry = ? WHERE id = ?").run(industry, id)
    set("IND_1", "Insurance")
    set("IND_2", "Insurance")
    set("IND_3", "Shipping and logistics")
    set("IND_BLANK", "   ")
    set("IND_OUT", "Insurance")

    const data = await readAccountsDashboard(cfg, guard, staff)
    // BUSIEST FIRST, an industry nobody set is not a row, and the inactive
    // company's own word is counted nowhere.
    expect(data.byIndustry).toEqual([
      { industry: "Insurance", n: 2 },
      { industry: "Shipping and logistics", n: 1 },
    ])
  })

  it("names who arrived in each month, bounded, with the exact count beside them", async () => {
    // Three companies in ONE month, so the month's own `names` is a list
    // rather than a single entry, and A→Z rather than insertion order.
    seedAccount({ id: "WHO_C", type: "entity", name: "Cedar Ltd", createdAt: "2025-04-02" })
    seedAccount({ id: "WHO_A", type: "entity", name: "Alder Ltd", createdAt: "2025-04-20" })
    seedAccount({ id: "WHO_B", type: "entity", name: "Birch Ltd", createdAt: "2025-04-11" })
    // AND ONE THE FENCE MUST NOT NAME — an archived company in the same
    // month. The hover must never be the one place a hidden record surfaces.
    seedAccount({
      id: "WHO_ARCHIVED",
      type: "entity",
      name: "Aardvark Ltd",
      createdAt: "2025-04-01",
      archivedAt: "2026-02-01",
    })

    const data = await readAccountsDashboard(cfg, guard, staff)
    const april = data.arrivals.find((r) => r.month === "2025-04")
    expect(april, "the month three active companies arrived in has no row at all").toBeDefined()
    expect(april?.n, "the month's count is not the three active companies").toBe(3)
    expect(april?.names, "the month names the wrong companies, or in the wrong order").toEqual([
      "Alder Ltd",
      "Birch Ltd",
      "Cedar Ltd",
    ])
    // EVERY month carries the field, even one whose companies all came from
    // the shared fixture — a screen reading `names` must never meet
    // `undefined`.
    for (const row of data.arrivals) expect(Array.isArray(row.names)).toBe(true)
  })

  it("takes a TRUE median tenure — odd, even, one, and none", async () => {
    // A BOOK THIS TEST OWNS OUTRIGHT. The shared fixture seeds four active
    // companies of its own; the median is a statement about the WHOLE active
    // book, so it can only be asserted exactly once this test is the only
    // thing in it.
    const clearBook = () =>
      db().prepare(`UPDATE accounts SET deactivated_at = '2026-01-02' WHERE deactivated_at IS NULL`).run()

    /** The same arithmetic `julianday('now') - julianday(created_at)` does,
     * done here independently rather than by re-running the door's own SQL —
     * a check that computes the answer the same way as the thing it checks
     * proves only that the code is self-consistent. Both are UTC. */
    const daysSince = (iso: string) => (Date.now() - Date.parse(`${iso}T00:00:00Z`)) / 86_400_000
    /** Loose enough to survive the seconds between the door's `now` and this
     * line, tight enough that a mean-instead-of-median (which would be off by
     * hundreds of days on these fixtures) can never slip through. */
    const CLOSE = 0.05

    // NONE — `null`, and never 0. "There is no middle of nothing" is a value
    // a screen can branch on; 0 would read as "we have had them no time".
    clearBook()
    const none = await readAccountsDashboard(cfg, guard, staff)
    expect(none.activeCount).toBe(0)
    expect(none.medianTenureDays).toBeNull()

    // ONE — the single account's own tenure, not half of it and not null.
    seedAccount({ id: "MED_1", type: "entity", name: "One Ltd", createdAt: "2024-01-01" })
    const one = await readAccountsDashboard(cfg, guard, staff)
    expect(one.activeCount).toBe(1)
    expect(one.medianTenureDays).toBeCloseTo(daysSince("2024-01-01"), 1)

    // ODD — three accounts, the answer is the MIDDLE one. The mean of the
    // three would be a different number (the oldest is far older than the
    // other two), which is what makes this a real median test rather than a
    // test two implementations would both pass.
    seedAccount({ id: "MED_2", type: "entity", name: "Two Ltd", createdAt: "2025-06-01" })
    seedAccount({ id: "MED_3", type: "entity", name: "Three Ltd", createdAt: "2019-01-01" })
    const odd = await readAccountsDashboard(cfg, guard, staff)
    expect(odd.activeCount).toBe(3)
    expect(odd.medianTenureDays).toBeCloseTo(daysSince("2024-01-01"), 1)
    const oddMean = (daysSince("2024-01-01") + daysSince("2025-06-01") + daysSince("2019-01-01")) / 3
    expect(
      Math.abs((odd.medianTenureDays ?? 0) - oddMean),
      "the median equals the mean of the three, so this fixture cannot tell them apart"
    ).toBeGreaterThan(1)

    // EVEN — four accounts, the answer is the MEAN OF THE TWO MIDDLES, which
    // is the definition rather than a convenience. Neither middle on its own
    // is the answer, and this fixture is chosen so all three candidates are
    // far apart.
    seedAccount({ id: "MED_4", type: "entity", name: "Four Ltd", createdAt: "2022-01-01" })
    const even = await readAccountsDashboard(cfg, guard, staff)
    expect(even.activeCount).toBe(4)
    // Tenures oldest-first: 2019, 2022, 2024, 2025. The two middles are the
    // 2022 and the 2024 rows.
    const twoMiddles = (daysSince("2022-01-01") + daysSince("2024-01-01")) / 2
    expect(even.medianTenureDays).toBeCloseTo(twoMiddles, 1)
    expect(Math.abs((even.medianTenureDays ?? 0) - daysSince("2022-01-01"))).toBeGreaterThan(CLOSE)
    expect(Math.abs((even.medianTenureDays ?? 0) - daysSince("2024-01-01"))).toBeGreaterThan(CLOSE)

    // AND IT IS COUNTED THROUGH THE SAME FENCE AS EVERY OTHER FIGURE HERE —
    // an inactive company with a wildly different tenure must not move it.
    seedAccount({
      id: "MED_OUT",
      type: "entity",
      name: "Gone Ltd",
      createdAt: "1999-01-01",
      deactivatedAt: "2026-02-01",
    })
    const fenced = await readAccountsDashboard(cfg, guard, staff)
    expect(fenced.activeCount).toBe(4)
    expect(fenced.medianTenureDays).toBeCloseTo(twoMiddles, 1)
  })

  it("hands back exactly the surviving questions, and nothing she left struck", async () => {
    const data = await readAccountsDashboard(cfg, guard, staff)
    // A STRUCTURAL PROOF, not a word search: the shape itself carries no
    // field for a city or a portal-reach column to hide inside — the door
    // never asked the database for them (see `readAccountsDashboard`'s own
    // header), so there is nothing here for a screen to accidentally draw.
    // `medianTenureDays` IS on this list, and it is the one strike she
    // reversed the same day ("add the median tenure"); the other three stand.
    expect(Object.keys(data).sort()).toEqual([
      "activeCount",
      "arrivals",
      "byCountry",
      "byIndustry",
      "countryCount",
      "medianTenureDays",
    ])
  })
})
