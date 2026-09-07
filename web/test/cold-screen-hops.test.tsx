// WHAT A COLD DEEP LINK COSTS BEFORE THE RECORD IS ON SCREEN — counted, and
// held to a budget.
//
// A person arrives from an email (R30 builds emails around exactly this), on a
// fresh tab, at `/t/<team>/processes/<id>`. Nothing is cached. Measured on
// 6 Sep 2026 that screen made FOURTEEN distinct requests before anything
// rendered: two to find out who they were and where they stood, four to warm
// caches the screen was not going to read, one for the screen's own overrides,
// one for the breadcrumb's name, and six for a record screen whose first paint
// needs one of them. `MAX_D1_TRIPS_PER_DOOR` had bounded the server half of a
// round trip for a week by then; the browser half had no number at all.
//
// This is the browser half's number, and the census that holds it. The whole
// shell is rendered cold with `fetch` stood in for, and every request is
// stamped with whether the record was ALREADY ON SCREEN when it left. That
// stamp is the whole discriminator: a request that leaves after the person can
// read the record is a request the person never waited for.
//
// TWO ASSERTIONS, in opposite directions, because a count can be gamed in
// either. The cold path must fit under the budget — and the work that was moved
// off it must STILL HAPPEN afterwards, or "fewer requests before paint" is
// indistinguishable from "the prewarm was deleted".

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import * as React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { MAX_REQUESTS_BEFORE_FIRST_PAINT } from "@shared/workers/limits"
import type { ActiveContext, PermissionValue, ProcessDetail, SessionUser } from "@shared/types"

const TEAM = "T1"
const PROCESS = "P1"
const NAME = "Invoice run"
const PATH = `/t/${TEAM}/processes/${PROCESS}`

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => PATH,
}))

// The sockets are not the subject. Nothing here opens one.
vi.mock("@shared/web/realtime", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@shared/web/realtime")>()),
  useRealtime: () => {},
  useUserRealtime: () => {},
}))

/* -------------------------------- fixtures -------------------------------- */

const ALL = { read: true, create: true, edit: true, delete: true }
const user: SessionUser = {
  id: "u1",
  email: "aurora@kwapso.com",
  firstName: "Aurora",
  lastName: "Thalassa",
  imageUrl: null,
  onboardingComplete: true,
  currentTeamId: TEAM,
  pinnedTeamId: null,
  language: null,
  scale: null,
  spine: null,
}
const permissions: PermissionValue = {
  processes: ALL,
  accounts: ALL,
  apps: ALL,
  help: ALL,
  work: ALL,
  meetings: ALL,
  member_roles: ALL,
  invites: ALL,
  selectable_data: ALL,
  teams: ALL,
}
const team = { id: TEAM, name: "Kwapso", logoUrl: null, roleId: "r1", dbStatus: "ready" }
const ctx: ActiveContext = {
  team,
  role: { id: "r1", title: "Admin" },
  memberCount: 3,
  teams: [team],
  user,
  permissions,
}
const detail: ProcessDetail = {
  process: {
    id: PROCESS,
    appId: "A1",
    appName: "Dispatch",
    accountId: "ACC1",
    name: NAME,
    description: null,
    roleName: null,
    roleId: null,
    auditDate: "2026-01-01",
    versionCount: 1,
    stepCount: 0,
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  versions: [
    {
      id: "V1",
      processId: PROCESS,
      versionNo: 1,
      label: null,
      isBaseline: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      createdByName: null,
    },
  ],
  steps: [],
  shownVersionId: "V1",
  shownStepCount: 0,
  commentsTotal: 0,
  saving: null,
  savingsCaption: "",
  auditDate: "2026-01-01",
  asOf: null,
  revisionDates: ["2026-01-01"],
  links: [],
}
const paged = <T,>(rows: T, extra: Record<string, unknown> = {}) => ({
  ...rows,
  ...extra,
  total: 0,
  totalCapped: false,
  hasMore: false,
  nextCursor: null,
})

/** What each door answers. Anything not named answers an empty object, and is
 * still COUNTED — an unexpected door on the cold path is exactly what this file
 * exists to notice. */
function answer(path: string): unknown {
  if (path.startsWith("/api/auth/me")) return { user }
  if (path.startsWith("/api/tenancy/active")) return ctx
  if (path.startsWith("/api/tenancy/my-permissions")) return { permissions }
  if (path.startsWith("/api/tenancy/config/screens")) return { screens: {} }
  if (path.startsWith("/api/tenancy/roles")) return { roles: [], total: 0 }
  if (path.startsWith("/api/tenancy/invites")) return { invites: [], total: 0 }
  if (path.startsWith("/api/tenancy/selectable")) return { values: [], total: 0 }
  if (path.startsWith("/api/tenancy/processes/detail")) return detail
  if (path.startsWith("/api/tenancy/processes/comments")) return { comments: [], total: 0 }
  if (path.startsWith("/api/tenancy/processes")) return paged({ processes: [] })
  if (path.startsWith("/api/tenancy/client-roles")) return { roles: [] }
  if (path.startsWith("/api/tenancy/client-tools")) return { tools: [] }
  if (path.startsWith("/api/tenancy/activity")) return paged({ activity: [] })
  if (path.startsWith("/api/content/meetings")) return paged({ meetings: [] }, { weekTotal: 0 })
  return {}
}

/* -------------------------------- the spy ---------------------------------- */

type Seen = { path: string; afterPaint: boolean }
let seen: Seen[] = []

function painted(): boolean {
  return document.body.textContent?.includes(NAME) ?? false
}

beforeEach(() => {
  seen = []
  window.history.replaceState({}, "", PATH)
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const path = typeof input === "string" ? input : input instanceof URL ? input.pathname + input.search : input.url
      // STAMPED AT DEPARTURE. Whether the person could already read the record
      // when this request left is the only fact the budget is about.
      seen.push({ path, afterPaint: painted() })
      return new Response(JSON.stringify(answer(path)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/** A COLD tab. The session is a module-level cache and the row store is a
 * module-level Map, so a fresh module graph is the only honest cold start. */
async function coldShell() {
  vi.resetModules()
  const [{ DeepLinkScreen }, store] = await Promise.all([
    import("@/components/deep-link/deep-link-screen"),
    import("@shared/web/store"),
  ])
  store.clearCache()
  return DeepLinkScreen
}

const distinct = (rows: Seen[]) => [...new Set(rows.map((r) => r.path))]

describe("a cold deep link to a record", () => {
  it(`asks the server at most ${MAX_REQUESTS_BEFORE_FIRST_PAINT} times before the record is on screen`, async () => {
    const DeepLinkScreen = await coldShell()
    render(<DeepLinkScreen />)
    await screen.findByText(NAME, {}, { timeout: 10_000 })

    const before = distinct(seen.filter((r) => !r.afterPaint))
    // The doors are NAMED in the failure, so the next reader sees which ones
    // were on the cold path rather than only how many. Measured 7 Sep 2026 the
    // list is three: the one boot call (identity, team and rights together), the
    // screen's own recipe overrides, and the record read by id.
    expect(
      before.length,
      `before first paint (${before.length}): ${before.join(", ")}`
    ).toBeLessThanOrEqual(MAX_REQUESTS_BEFORE_FIRST_PAINT)
  })

  it("and nothing is asked TWICE on the way to that paint", async () => {
    // The other way a hop count is gamed: split one door's answer across two
    // requests, or mount the same loader twice, and each of them is "one hop".
    const DeepLinkScreen = await coldShell()
    render(<DeepLinkScreen />)
    await screen.findByText(NAME, {}, { timeout: 10_000 })
    const before = seen.filter((r) => !r.afterPaint).map((r) => r.path)
    const twice = before.filter((p, i) => before.indexOf(p) !== i)
    expect(twice, "a door asked twice before the record could be read").toEqual([])
  })

  it("the record itself is read by id on that path (R38), not found in a list", async () => {
    const DeepLinkScreen = await coldShell()
    render(<DeepLinkScreen />)
    await screen.findByText(NAME, {}, { timeout: 10_000 })
    const before = distinct(seen.filter((r) => !r.afterPaint))
    expect(before.some((p) => p.startsWith(`/api/tenancy/processes/detail`) && p.includes(PROCESS))).toBe(true)
    // …and the record's own COLLECTION is not read to draw one record.
    expect(before.some((p) => p === "/api/tenancy/processes" || p.startsWith("/api/tenancy/processes?"))).toBe(false)
  })

  it("the work moved off the cold path is still done — afterwards", async () => {
    // THE ASSERTION IN THE OPPOSITE DIRECTION, and the reason this file has one.
    // "Fewer requests before paint" and "the prewarm was deleted" are the same
    // number. Every door that used to be on the cold path must still be asked
    // once the person can read the record.
    const DeepLinkScreen = await coldShell()
    render(<DeepLinkScreen />)
    await screen.findByText(NAME, {}, { timeout: 10_000 })
    await waitFor(
      () => {
        const after = distinct(seen.filter((r) => r.afterPaint))
        for (const door of [
          // the team-wide prewarm and the badge counts
          "/api/tenancy/roles",
          "/api/tenancy/invites",
          "/api/tenancy/selectable",
          // the record's own secondary panels
          "/api/tenancy/processes/comments",
          "/api/tenancy/client/roles",
          "/api/tenancy/client/tools",
          // …and the Activity tab, which is a tab and not a first paint
          "/api/tenancy/activity",
        ])
          expect(after.some((p) => p.startsWith(door)), `${door} is still asked, after the paint`).toBe(true)
      },
      { timeout: 10_000 }
    )
  })
})
