// AN ACCOUNT'S COUNTRY AND INDUSTRY ARE PICKED, NEVER TYPED — Aurora, 23 Sep
// 2026, of the industry, verbatim: "make it a drop down, adjustable on
// settings."
//
// THE FAILURE THIS SUITE EXISTS FOR IS A SILENT ONE. The form has offered an
// "Industry" picker since it was built and the country's picker is older than
// that, so on screen both fields already looked like dropdowns — while the
// WRITE DOOR took free text the whole time. Nothing about that is visible: a
// text column accepting text is not a bug anybody can see, and the damage only
// shows up in aggregate, as "Insurance" beside "Insurance Broker" and
// "Osterreich" beside "Austria" on the live book. A source scan cannot tell a
// closed door from an open one either; only calling it can.
//
// SO EVERY TEST HERE CALLS THE REAL FUNCTION against a real SQLite database
// running the real migration ledger, the same harness `accounts.test.ts` uses.
// Two halves, and they only work together:
//
//   1. team migration 0120 SEEDS the two groups from what the columns already
//      hold, so no stored row is stranded on a word the picker cannot offer;
//   2. `createAccount` / `updateAccount` REFUSE a word that is not one of the
//      team's current options.
//
// Closing the door without the seed would make every pre-existing account
// uneditable, which is why the order is asserted rather than assumed.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("./d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import { SELECTABLE_GROUPS } from "@shared/selectable-groups"
import { createAccount, updateAccount } from "../src/lib/accounts"
import { TEAM_MIGRATIONS } from "../src/team-schema"
import { buildSpineDb, IDS } from "./spine-harness"

const cfg = { accountId: "a", apiToken: "t" } as never
const actor = { id: IDS.staffUser, email: "staff@kwapso.app", name: "Staff" }
const guard = { userId: IDS.staffUser, teamId: IDS.team, roleId: IDS.adminRole, databaseId: "db_team" }
const staff = { kind: "staff" } as const

const db = () => holder.db as DatabaseSync

/** THE MIGRATION'S OWN SQL, read out of the shipped ledger rather than
 * re-typed here — a test that copies the statement it is checking proves only
 * that the copy works. */
const SEED_0120 = () => {
  const found = TEAM_MIGRATIONS.find((m) => m.version.startsWith("0120_"))
  if (!found) throw new Error("team migration 0120 is not in TEAM_MIGRATIONS")
  return found.sql
}

/** A dropdown row in the state this test wants it in — straight in, never
 * through a door, so what is asserted is what the QUERY sees rather than what
 * another door happens to allow.
 *
 * AN UPSERT, BECAUSE THE FIXTURE ALREADY HAS A VOCABULARY. `buildTeamSeed`
 * gives a newborn team five industries and a list of countries of its own
 * (`INTERNAL_VOCABULARY`, workers/tenancy/src/team-schema/seed.ts) — which is
 * itself the point this suite is about: the group has always EXISTED, it was
 * the door that was open. A plain INSERT here would trip the unique index on
 * any word the seed already carries.
 *
 * WRITTEN IN TWO STATEMENTS RATHER THAN AS `ON CONFLICT`, because the index is
 * PARTIAL — `(type, value) WHERE deactivated_at IS NULL` (team migration 0104)
 * — and SQLite refuses an upsert target it cannot match to a full constraint.
 * That partiality is a real property of the schema and not an accident: an
 * active row and a retired row may share a word, which is exactly the state
 * the "does not revive" case below is about. */
function seedOption(group: string, value: string, retired = false): void {
  const at = retired ? "2026-09-01" : null
  const existing = db()
    .prepare("SELECT id FROM selectable_data WHERE type = ? AND value = ? LIMIT 1")
    .get(group, value) as { id: string } | undefined
  if (existing) {
    db().prepare("UPDATE selectable_data SET deactivated_at = ? WHERE id = ?").run(at, existing.id)
    return
  }
  db()
    .prepare(
      `INSERT INTO selectable_data (id, type, value, is_default, created_at, creator_name, deactivated_at)
       VALUES (lower(hex(randomblob(16))), ?, ?, 0, datetime('now'), 'Test', ?)`
    )
    .run(group, value, at)
}

/** An account row with a stored word, straight in, for the same reason — this
 * is the pre-migration world the seed has to rescue. */
function seedAccountWith(id: string, name: string, industry: string | null, country: string | null): void {
  db()
    .prepare(
      `INSERT INTO accounts (id, account_type, name, industry, country, created_at, creator_id)
       VALUES (?, 'entity', ?, ?, ?, '2024-01-01', ?)`
    )
    .run(id, name, industry, country, IDS.staffUser)
}

const optionsIn = (group: string): string[] =>
  (
    db()
      .prepare("SELECT value FROM selectable_data WHERE type = ? AND deactivated_at IS NULL ORDER BY value")
      .all(group) as { value: string }[]
  ).map((r) => r.value)

/** What the team seed already put in the Industry group, read off the FIXTURE
 * rather than typed here — a list copied into a test rots the day the seed
 * changes and reports success while it rots. */
let SEEDED_INDUSTRIES: string[] = []

beforeEach(() => {
  holder.db = buildSpineDb()
  SEEDED_INDUSTRIES = optionsIn(SELECTABLE_GROUPS.industry)
})

// ── THE SEED ────────────────────────────────────────────────────────────────

describe("team migration 0120 seeds the two groups from what is already stored", () => {
  it("makes every stored word an option, and strands nothing", () => {
    seedAccountWith("VOC_A", "Alpha", "Insurance", "Austria")
    seedAccountWith("VOC_B", "Beta", "Insurance Broker", "Österreich")
    seedAccountWith("VOC_C", "Gamma", "Insurance", "Spain")
    // A BLANK IS NOT A WORD. Neither a NULL nor a run of spaces becomes a
    // dropdown row — an empty option is one nobody could ever mean to pick.
    seedAccountWith("VOC_D", "Delta", null, "   ")
    seedAccountWith("VOC_E", "Epsilon", "   ", null)
    // Padding is trimmed on the way into the vocabulary, so a stray space
    // cannot mint a second spelling of a word that is already there.
    seedAccountWith("VOC_F", "Zeta", "  Insurance  ", null)

    db().exec(SEED_0120())

    // THE BASELINE FIRST. A newborn team is seeded with five industries of its
    // own, so this test asserts what the MIGRATION added rather than a magic
    // total that would drift the day the seed list changes.
    const industries = optionsIn(SELECTABLE_GROUPS.industry)
    // BOTH NEAR-DUPLICATES SURVIVE, SEPARATELY. "Insurance" and "Insurance
    // Broker" may be two real trades and a migration is the worst place to
    // guess — it runs once, per team, with nobody watching. Merging them is an
    // ordinary rename on the Choices screen, which rewrites the stored words
    // too; this asserts the migration does NOT make that decision.
    expect(industries).toContain("Insurance")
    expect(industries).toContain("Insurance Broker")
    // AND NOTHING THE COLUMNS DID NOT HOLD. The blanks above minted no option,
    // and the padded "  Insurance  " minted no second spelling: everything the
    // migration added beyond the team's own seed is one of the two real words.
    expect(industries.filter((w) => !SEEDED_INDUSTRIES.includes(w))).toEqual([
      "Insurance",
      "Insurance Broker",
    ])

    const countries = optionsIn(SELECTABLE_GROUPS.country)
    for (const word of ["Austria", "Österreich", "Spain"]) expect(countries).toContain(word)
    // AND THE TWO SPELLINGS OF ONE COUNTRY ARE LEFT ALONE TOO, for the same
    // reason and by the same rule.
    expect(countries.filter((c) => c === "Austria" || c === "Österreich")).toHaveLength(2)

    // NOTHING IS STRANDED: every non-blank stored word is now offerable.
    const stored = (
      db()
        .prepare(
          `SELECT DISTINCT TRIM(industry) AS w FROM accounts WHERE industry IS NOT NULL AND TRIM(industry) <> ''`
        )
        .all() as { w: string }[]
    ).map((r) => r.w)
    for (const word of stored) expect(industries).toContain(word)
  })

  it("re-runs without inserting anything twice", () => {
    seedAccountWith("VOC_A", "Alpha", "Insurance", "Spain")
    db().exec(SEED_0120())
    const once = optionsIn(SELECTABLE_GROUPS.industry).length
    db().exec(SEED_0120())
    expect(optionsIn(SELECTABLE_GROUPS.industry).length, "the seed is not idempotent").toBe(once)
  })

  it("does not revive a word the team retired on purpose", () => {
    // `NOT EXISTS` matches on (type, value) whatever the row's state, so a
    // deactivated option stays deactivated — quietly reviving it from a column
    // would undo a decision somebody made on the Choices screen.
    seedOption(SELECTABLE_GROUPS.industry, "Insurance", true)
    seedAccountWith("VOC_A", "Alpha", "Insurance", null)
    db().exec(SEED_0120())
    expect(optionsIn(SELECTABLE_GROUPS.industry)).not.toContain("Insurance")
    const rows = db()
      .prepare("SELECT COUNT(*) AS n FROM selectable_data WHERE type = ? AND value = ?")
      .get(SELECTABLE_GROUPS.industry, "Insurance") as { n: number }
    expect(rows.n, "the retired row was duplicated rather than left alone").toBe(1)
  })
})

// ── THE DOOR ────────────────────────────────────────────────────────────────

describe("the write door refuses a word that is not one of the team's options", () => {
  it("lets a real option through and refuses an invented one, on create", async () => {
    seedOption(SELECTABLE_GROUPS.industry, "Insurance")
    seedOption(SELECTABLE_GROUPS.country, "Spain")

    const id = await createAccount(cfg, guard, staff, actor, {}, {
      accountType: "entity",
      name: "Picked Co",
      industry: "Insurance",
      country: "Spain",
    })
    expect(id).toBeTruthy()

    await expect(
      createAccount(cfg, guard, staff, actor, {}, {
        accountType: "entity",
        name: "Typed Co",
        industry: "Insurance Brokerage",
      }),
      "the door accepted an industry nobody put on the list — this is the hole that let the spellings drift"
    ).rejects.toThrow(/Industry isn't one of the team's current options/)

    await expect(
      createAccount(cfg, guard, staff, actor, {}, {
        accountType: "entity",
        name: "Typed Co",
        country: "Österreich",
      }),
      "the door accepted a country nobody put on the list"
    ).rejects.toThrow(/Country isn't one of the team's current options/)

    // AND A REFUSED CREATE LEAVES NOTHING BEHIND — the check runs before the
    // id, the geocode and the INSERT.
    const rows = db().prepare("SELECT COUNT(*) AS n FROM accounts WHERE name = 'Typed Co'").get() as {
      n: number
    }
    expect(rows.n, "a refused create still wrote a row").toBe(0)
  })

  it("clearing a picked field is always allowed", async () => {
    seedOption(SELECTABLE_GROUPS.industry, "Insurance")
    const id = await createAccount(cfg, guard, staff, actor, {}, {
      accountType: "entity",
      name: "Picked Co",
      industry: "Insurance",
    })
    await updateAccount(cfg, guard, staff, actor, id, {}, { name: "Picked Co", industry: null })
    const row = db().prepare("SELECT industry FROM accounts WHERE id = ?").get(id) as {
      industry: string | null
    }
    expect(row.industry).toBeNull()
  })

  it("keeps a record editable after its own word is retired, but will not let anybody SET it", async () => {
    // THE TRAP THIS CLOSES. Retiring a word on the Choices screen is a real
    // decision and must stop the word being set — but an account already
    // holding it is not a record anybody should have to relabel before they
    // may correct its phone number. So the door compares against the STORED
    // value before it compares against the group.
    seedOption(SELECTABLE_GROUPS.industry, "Insurance")
    const id = await createAccount(cfg, guard, staff, actor, {}, {
      accountType: "entity",
      name: "Picked Co",
      industry: "Insurance",
    })
    db()
      .prepare("UPDATE selectable_data SET deactivated_at = datetime('now') WHERE type = ? AND value = ?")
      .run(SELECTABLE_GROUPS.industry, "Insurance")

    // An edit that re-sends the unchanged word goes through.
    await updateAccount(cfg, guard, staff, actor, id, {}, {
      name: "Picked Co",
      industry: "Insurance",
      phone: "+34 600 000 000",
    })
    const row = db().prepare("SELECT phone FROM accounts WHERE id = ?").get(id) as { phone: string }
    expect(row.phone, "an edit was refused over a field it did not change").toBe("+34 600 000 000")

    // An edit that says nothing about the field goes through too.
    await updateAccount(cfg, guard, staff, actor, id, {}, { name: "Picked Co Renamed" })

    // A DIFFERENT retired word is still refused: this is the leniency of an
    // unchanged value, not of a deactivated option.
    seedOption(SELECTABLE_GROUPS.industry, "Shipping and logistics", true)
    await expect(
      updateAccount(cfg, guard, staff, actor, id, {}, {
        name: "Picked Co Renamed",
        industry: "Shipping and logistics",
      })
    ).rejects.toThrow(/Industry isn't one of the team's current options/)
  })
})
