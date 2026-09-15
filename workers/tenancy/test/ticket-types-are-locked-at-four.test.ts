// THE `Ticket type` GROUP IS CLOSED, AND CLOSED AT THE DOOR.
//
// The owner's ruling, 15 Sep 2026: a ticket is an Issue, a Question, an Extra or
// a piece of Feedback. *"Remove all other options. Just get rid of them, delete
// them completely."* `shared/ticket-types.ts` argues out why THIS vocabulary is
// a lock while every other one in `selectable_data` is a starting list — three
// things (the colours, the client's fixed reading order, and Feedback's own
// Validation-sprint rule) are keyed on these four words and cannot be keyed on
// an arbitrary set.
//
// TWO HALVES, because either alone is a hole:
//
//   · THE SEED plants exactly the four, with their marks. A newborn team that
//     started with five would need the migration to fix a database that was
//     correct ten seconds earlier.
//   · THE DOOR refuses a fifth. The Choices screen stands its add button down
//     for this group (`create: false`), and that is a courtesy — the agentic
//     importer and the machine surface reach `createSelectable` with no form in
//     front of them at all.
//
// AND THE CLAUSE THAT IS EASY TO OVERSHOOT: renaming stays allowed. A team may
// call an Extra whatever it calls an Extra, and `updateSelectable` carries every
// record with the rename. A lock that also froze the wording would be a
// different and much larger decision, and it is not the one that was made.

import { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("./d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import { TEAM_MIGRATIONS } from "../src/team-schema"
import { DEFAULT_SELECTABLE } from "../src/team-schema/seed"
import { createSelectable, listSelectable, updateSelectable } from "../src/lib/selectable"
import { GuardError } from "../src/lib/permissions"
import { TICKET_TYPES, TICKET_TYPE_GROUP } from "@shared/ticket-types"

const cfg = { accountId: "a", apiToken: "t" } as never
const guard = { userId: "ME", teamId: "TEAM", roleId: "ROLE", databaseId: "db" }
const actor = { id: "U1", email: "ana@kwapso.com", name: "Ana" }

describe("the seed plants exactly the four", () => {
  const seeded = DEFAULT_SELECTABLE.filter((v) => v.type === TICKET_TYPE_GROUP)

  it("four rows, in the client's own reading order, each with its mark", () => {
    // DERIVED FROM `TICKET_TYPES` RATHER THAN RETYPED. A hand-written expected
    // list here would be a third copy of the four words, which is the exact
    // shape that let a five-word vocabulary ship under a four-column dashboard
    // on 6 Sep 2026 — the seed said one thing and `web/lib/type-colours.ts` said
    // another, and nothing compared them.
    expect(seeded.map((v) => ({ value: v.value, mark: v.mark }))).toEqual(
      TICKET_TYPES.map((t) => ({ value: t.value, mark: t.mark }))
    )
  })

  it("and neither Request nor Requirements is among them", () => {
    const words = seeded.map((v) => v.value)
    expect(words).not.toContain("Request")
    expect(words).not.toContain("Requirements")
  })

  it("every mark is a short code, never a pictograph (R66)", () => {
    // The seed half of the ruling. `optionalMark` guards the write door and
    // cannot see a list a migration plants, which is why R66 censuses this file
    // separately — and why this assertion is worth having twice.
    for (const v of seeded) {
      expect(typeof v.mark, `${v.value} must carry a mark`).toBe("string")
      expect(v.mark as string).toMatch(/^[A-Z]{1,2}$/)
    }
  })
})

describe("the door refuses a fifth", () => {
  beforeEach(() => {
    const db = new DatabaseSync(":memory:")
    for (const m of TEAM_MIGRATIONS) db.exec(m.sql)
    holder.db = db
  })

  async function refusal(fn: () => Promise<unknown>): Promise<GuardError> {
    try {
      await fn()
    } catch (err) {
      return err as GuardError
    }
    throw new Error("expected a refusal, got none")
  }

  it("a new word in the group is a clean 400 with a sentence a person can act on", async () => {
    const err = await refusal(() =>
      createSelectable(cfg, guard, actor, TICKET_TYPE_GROUP, "Complaint", "CO")
    )
    expect(err).toBeInstanceOf(GuardError)
    expect(err.status, "bad input is a 400, never a 500 (R20)").toBe(400)
    expect(err.code).toBe("locked_group")
    // The sentence has to say what the four ARE and that renaming is still
    // open, or a person meets a refusal with nothing to do about it.
    expect(err.message).toContain("Issue")
    expect(err.message).toContain("Feedback")
    expect(err.message).toContain("rename")
  })

  it("and nothing is written — the refusal is before the first statement", async () => {
    await refusal(() => createSelectable(cfg, guard, actor, TICKET_TYPE_GROUP, "Complaint"))
    const rows = await listSelectable(cfg, guard)
    expect(rows.some((r) => r.value === "Complaint")).toBe(false)
  })

  it("under a stray capital or a trailing space on the GROUP name", async () => {
    // `createSelectable` trims the group before it compares, so " Ticket type "
    // is the same group. A caller that got past the lock by typing a space would
    // land its row in the real group, because the same trim writes it.
    const err = await refusal(() => createSelectable(cfg, guard, actor, " Ticket type ", "Complaint"))
    expect(err.code).toBe("locked_group")
  })

  it("even for a word that IS one of the four — one row each, no duplicates", async () => {
    // A second "Issue" is not a fifth kind, but it is a second row: two tabs,
    // two marks, one word. The lock refuses it first; `createSelectable`'s
    // duplicate guard would have refused it second.
    const err = await refusal(() => createSelectable(cfg, guard, actor, TICKET_TYPE_GROUP, "Issue"))
    expect(err.code).toBe("locked_group")
  })

  it("but ANOTHER group still grows normally", async () => {
    // The lock is one group's. A check that reached the rest would close the
    // Choices screen for the whole product — Sprint types, Story types,
    // Industries, Countries.
    const id = await createSelectable(cfg, guard, actor, "Sprint type", "Discovery", "DI")
    expect(typeof id).toBe("string")
    const rows = await listSelectable(cfg, guard)
    expect(rows.some((r) => r.type === "Sprint type" && r.value === "Discovery")).toBe(true)
  })

  it("and RENAMING one of the four is untouched", async () => {
    // The clause the lock must not overshoot. The four are seeded by the
    // migrations this fixture ran, so the row is really there.
    const rows = await listSelectable(cfg, guard)
    const extra = rows.find((r) => r.type === TICKET_TYPE_GROUP && r.value === "Extra")
    expect(extra, "the migrations must have left an Extra row to rename").toBeDefined()
    await updateSelectable(cfg, guard, actor, (extra as { id: string }).id, "Zusatz")
    const after = await listSelectable(cfg, guard)
    expect(after.some((r) => r.type === TICKET_TYPE_GROUP && r.value === "Zusatz")).toBe(true)
  })
})
