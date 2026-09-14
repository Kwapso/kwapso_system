// PROTECTED MEANS ACTIVE — the client's ruling, 14 Sep 2026: "also, the
// status: if it's protected, it's always active." Run against a REAL schema
// (the same `node:sqlite` + `TEAM_MIGRATIONS` harness `selectable-doors.test.ts`
// uses), because both directions of this invariant are enforced in a hand-written
// SQL `UPDATE ... WHERE` predicate and a mocked `d1Query` would accept a broken
// one just as happily as a correct one (that file's own header names this exact
// trap).
//
// TWO DIRECTIONS, TWO DIFFERENT DOORS:
//   · deactivate a PROTECTED value → `setSelectableActive` already refused this
//     (a 409 `default_value` GuardError) before this change; this file locks
//     that in as a regression guard.
//   · protect a DEACTIVATED value → `setSelectableDefault` used to leave
//     `deactivated_at` untouched, so a value could end up protected AND
//     inactive with no door ever having refused either half. Fixed here to
//     REACTIVATE on protect, in the same idempotent UPDATE (R17): a single
//     current-state predicate (`is_default <> ? OR (protecting AND still
//     deactivated)`) rather than a refusal, because "if it's protected, it's
//     always active" reads as a fact the data keeps, not a second error a
//     caller has to route around before protecting something.

import { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("./d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import { TEAM_MIGRATIONS } from "../src/team-schema"
import { setSelectableActive, setSelectableDefault } from "../src/lib/selectable"

const cfg = { accountId: "a", apiToken: "t" } as never
const guard = { userId: "ME", teamId: "TEAM", roleId: "ROLE", databaseId: "db" }
const actor = { id: "U1", email: "ana@kwapso.com", name: "Ana" }

const PROTECTED_ACTIVE = "01JPROTECTEDACTIVE000000"
const PLAIN_ACTIVE = "01JPLAINACTIVE0000000000"
const PROTECTED_DEACTIVATED = "01JPROTECTEDDEACT0000000"

beforeEach(() => {
  const db = new DatabaseSync(":memory:")
  for (const m of TEAM_MIGRATIONS) db.exec(m.sql)
  db.exec(`
    INSERT INTO selectable_data (id, type, value, is_default, created_at, creator_id, creator_email, creator_name)
      VALUES ('${PROTECTED_ACTIVE}', 'Ticket type', 'Protected And Active', 1,
              '2026-05-01T09:00:00.000Z', 'U1', 'ana@kwapso.com', 'Ana');
    INSERT INTO selectable_data (id, type, value, is_default, created_at, creator_id, creator_email, creator_name)
      VALUES ('${PLAIN_ACTIVE}', 'Ticket type', 'Plain And Active', 0,
              '2026-05-01T09:00:00.000Z', 'U1', 'ana@kwapso.com', 'Ana');
    -- A ROW THE DOOR SHOULD NEVER BE ABLE TO PRODUCE ON ITS OWN — the exact
    -- shape the OLD reverse door left behind (deactivate while unprotected,
    -- then protect) and the shape 0088's migration reactivates on sight.
    -- Written directly because this file is proving the DOOR now closes the
    -- gap that produced it, not re-deriving it through two calls.
    INSERT INTO selectable_data (id, type, value, is_default, deactivated_at, deactivator_name, created_at, creator_id, creator_email, creator_name)
      VALUES ('${PROTECTED_DEACTIVATED}', 'Ticket type', 'Protected But Deactivated', 1,
              '2026-06-01T09:00:00.000Z', 'System',
              '2026-05-01T09:00:00.000Z', 'U1', 'ana@kwapso.com', 'Ana');
  `)
  holder.db = db
})

function row(id: string) {
  return (holder.db as DatabaseSync)
    .prepare("SELECT is_default, deactivated_at FROM selectable_data WHERE id = ?")
    .get(id) as { is_default: number; deactivated_at: string | null }
}

describe("a protected value cannot be deactivated (regression guard)", () => {
  it("refuses to deactivate a protected, active value — 409 default_value", async () => {
    await expect(setSelectableActive(cfg, guard, actor, PROTECTED_ACTIVE, false)).rejects.toMatchObject({
      status: 409,
      code: "default_value",
    })
    // Refused means untouched.
    expect(row(PROTECTED_ACTIVE)).toMatchObject({ is_default: 1, deactivated_at: null })
  })

  it("still deactivates an ordinary, unprotected value", async () => {
    const changed = await setSelectableActive(cfg, guard, actor, PLAIN_ACTIVE, false)
    expect(changed).toBe(true)
    expect(row(PLAIN_ACTIVE).deactivated_at).not.toBeNull()
  })
})

describe("protecting a value always makes it active (the new half)", () => {
  it("protecting an already-deactivated value reactivates it in the SAME call", async () => {
    const changed = await setSelectableDefault(cfg, guard, actor, PROTECTED_DEACTIVATED, true)
    expect(changed).toBe(true)
    const after = row(PROTECTED_DEACTIVATED)
    expect(after.is_default).toBe(1)
    expect(after.deactivated_at, "protected must mean active — the door reactivated it").toBeNull()
  })

  it("clears the deactivator audit columns when it reactivates", async () => {
    await setSelectableDefault(cfg, guard, actor, PROTECTED_DEACTIVATED, true)
    const r = (holder.db as DatabaseSync)
      .prepare("SELECT deactivator_id, deactivator_email, deactivator_name FROM selectable_data WHERE id = ?")
      .get(PROTECTED_DEACTIVATED) as Record<string, unknown>
    expect(r.deactivator_id).toBeNull()
    expect(r.deactivator_email).toBeNull()
    expect(r.deactivator_name).toBeNull()
  })

  it("protecting an already-protected, already-active value is a true no-op (R17)", async () => {
    const changed = await setSelectableDefault(cfg, guard, actor, PROTECTED_ACTIVE, true)
    expect(changed, "zero rows moved — already protected and already active").toBe(false)
  })

  it("un-protecting does NOT deactivate — the two flags are not coupled that direction", async () => {
    const changed = await setSelectableDefault(cfg, guard, actor, PROTECTED_ACTIVE, false)
    expect(changed).toBe(true)
    const after = row(PROTECTED_ACTIVE)
    expect(after.is_default).toBe(0)
    expect(after.deactivated_at, "taking protection off must not touch active state").toBeNull()
  })

  it("protecting a plain active value just protects it (no reactivation work to do)", async () => {
    const changed = await setSelectableDefault(cfg, guard, actor, PLAIN_ACTIVE, true)
    expect(changed).toBe(true)
    expect(row(PLAIN_ACTIVE)).toMatchObject({ is_default: 1, deactivated_at: null })
  })
})
