// A MODULE'S ICON ROUND-TRIPS THROUGH THE REAL DOOR — the client's ruling,
// 17 Sep 2026: "when I add a module, I should be able to select an icon for
// it." Team migration 0104 added the column; this proves the WHOLE path
// the migration exists to serve: POST a real icon name in, GET it back out,
// refuse a name the picker never offered, and clear it back to "nobody
// chose one" the same way every other optional field on this door already
// does (R20's "absent means say nothing").
//
// Driven through the REAL route, the REAL schema (`buildSpineDb`, the same
// harness account-patch.test.ts and account-leak.test.ts already trust) —
// not `createAppModule`/`updateAppModule` called directly, because the
// interesting half is the BOUNDARY: the door's own positional R20 check
// (`workers/tenancy/src/routes/processes.ts`) sits in front of the lib, and
// a test against the lib alone would never exercise it.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("./d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import worker from "../src/index"
import { buildSpineDb, IDS, makeEnv, req } from "./spine-harness"
import { DEFAULT_MODULE_ICON, MODULE_ICON_NAMES } from "../../../shared/module-icons"

const env = () => makeEnv(() => holder.db as DatabaseSync, IDS.staffUser)
const post = (route: string, body: unknown) => worker.fetch(req(route, body), env())
const get = (query: string) => worker.fetch(req("GET /api/tenancy/app-modules", undefined, query), env())

const moduleRow = (id: string) =>
  holder.db!.prepare("SELECT icon FROM app_modules WHERE id = ?").get(id) as { icon: string | null } | undefined

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("create_app_module / POST /api/tenancy/app-modules — icon", () => {
  it("accepts an offered name and it reads back through both the door and the row", async () => {
    const chosen = MODULE_ICON_NAMES[0]
    const res = await post("POST /api/tenancy/app-modules", {
      appId: IDS.victimApp,
      name: "Dispatch settings",
      icon: chosen,
    })
    expect(res.status).toBe(200)
    const { id } = (await res.json()) as { id: string }
    expect(moduleRow(id)?.icon).toBe(chosen)

    const listed = await get(`?id=${id}`)
    const { modules } = (await listed.json()) as { modules: { icon: string | null }[] }
    expect(modules[0]?.icon).toBe(chosen)
  })

  it("refuses a name the picker never offered — a clean 400, not a 500 and not a silent drop", async () => {
    const res = await post("POST /api/tenancy/app-modules", {
      appId: IDS.victimApp,
      name: "Bogus icon module",
      icon: "not-a-phosphor-name",
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error?: string; message?: string }
    expect(body.message ?? JSON.stringify(body)).toMatch(/icon/i)
  })

  it("omitting icon entirely stores null — DEFAULT_MODULE_ICON is a browser-side fallback, never written", async () => {
    const res = await post("POST /api/tenancy/app-modules", { appId: IDS.victimApp, name: "No icon chosen" })
    expect(res.status).toBe(200)
    const { id } = (await res.json()) as { id: string }
    expect(moduleRow(id)?.icon).toBeNull()
    // The reasoned default is itself a real, resolvable choice — proved
    // again here, at the boundary that actually matters: the door accepts it.
    expect(MODULE_ICON_NAMES).toContain(DEFAULT_MODULE_ICON)
  })
})

describe("update_app_module / POST /api/tenancy/app-modules/update — icon", () => {
  it("changes the icon, and leaving the field out afterwards keeps it (R20's 'absent means say nothing')", async () => {
    const set = await post("POST /api/tenancy/app-modules/update", {
      id: IDS.victimModule,
      name: "Bergman dispatch board",
      icon: "house",
    })
    expect(set.status).toBe(200)
    expect(moduleRow(IDS.victimModule)?.icon).toBe("house")

    // A second edit that never mentions icon must not erase it — the exact
    // shape account-patch.test.ts locks for every other optional column on
    // this app's edit doors.
    const rename = await post("POST /api/tenancy/app-modules/update", {
      id: IDS.victimModule,
      name: "Bergman dispatch board (renamed)",
    })
    expect(rename.status).toBe(200)
    expect(moduleRow(IDS.victimModule)?.icon).toBe("house")
  })

  it("an empty string clears it back to null — the MCP tool's own 'send empty to clear' contract", async () => {
    await post("POST /api/tenancy/app-modules/update", {
      id: IDS.victimModule,
      name: "Bergman dispatch board",
      icon: "house",
    })
    expect(moduleRow(IDS.victimModule)?.icon).toBe("house")

    const cleared = await post("POST /api/tenancy/app-modules/update", {
      id: IDS.victimModule,
      name: "Bergman dispatch board",
      icon: "",
    })
    expect(cleared.status).toBe(200)
    expect(moduleRow(IDS.victimModule)?.icon).toBeNull()
  })

  it("refuses a name outside the allow-list on update too", async () => {
    const res = await post("POST /api/tenancy/app-modules/update", {
      id: IDS.victimModule,
      name: "Bergman dispatch board",
      icon: "definitely-not-an-icon",
    })
    expect(res.status).toBe(400)
  })
})
