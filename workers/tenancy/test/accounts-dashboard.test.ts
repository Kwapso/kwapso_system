// THE ACCOUNTS DASHBOARD DOOR, against a real SQLite database running the real
// migration — the same harness `accounts.test.ts` proves the customer spine's
// other invariants against.
//
// Her ruling, 23 Sep 2026, struck four things from a design and left three:
// how many active companies there are and how many countries they sit in,
// where they are by country, and when they arrived, off each company's own
// `created_at`. This file proves the SURVIVING three are counted honestly
// (active only, entity only, a country nobody set is not a row) and that the
// STRUCK four never ride along in the shape the door hands back.

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

  it("hands back exactly the three surviving questions, and nothing she struck", async () => {
    const data = await readAccountsDashboard(cfg, guard, staff)
    // A STRUCTURAL PROOF, not a word search: the shape itself carries no
    // fourth or fifth field for a city, a tenure figure or a portal-reach
    // column to hide inside — the door never asked the database for them
    // (see `readAccountsDashboard`'s own header), so there is nothing here
    // for a screen to accidentally draw.
    expect(Object.keys(data).sort()).toEqual(["activeCount", "arrivals", "byCountry", "countryCount"])
  })
})
