// R1 — THE LIVE-SYNC SEAM FOR AUTH. New on 6 Sep 2026, beside the gating seam,
// and the last of the eight workers to have one.
//
// CLAUDE.md has named this worker's position for a year — "auth's user-channel
// publishes … are the reviewed exceptions" — and nothing checked it. A reviewed
// exception nothing checks is an exception that grows, and this one had two ways
// to grow quietly: a new door could be added with no broadcast at all, or the
// user-channel publish could disappear from lib/profile.ts and the "exception"
// would then describe a worker that publishes nothing whatsoever.
//
// WHY EVERY WRITE HERE IS HOUSEKEEPING. Auth holds no team rows. Every door
// changes the CALLER'S OWN identity — their session, their address, their
// display name, their language, their density — so there is no team channel to
// ping. What DOES need telling is the caller's other tabs, and that goes out on
// the USER channel (publishUserChange) from lib/profile.ts, which is a different
// broadcast to a different audience and is why `mutation` would be the wrong tag
// rather than a missing one.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { publishSeam } from "@shared/rules/seam-scan"
import { stripComments } from "@shared/rules/source-scan"
import { ROUTES } from "../src/index"
import { doorSource } from "./doors"

const SRC = join(__dirname, "..", "src")

publishSeam({
  name: "auth",
  routes: ROUTES,
  src: SRC,
  minRoutes: 14,
  // No team-visible row exists on this worker — see the header. The tripwire
  // still demands a populated table carrying a non-GET route.
  requiresMutation: false,
  housekeeping: [
    // The front of the building: a login code, a session, a new user row. There
    // is nobody signed in to tell, by definition.
    "POST /api/auth/email/start",
    "POST /api/auth/email/verify",
    "POST /api/auth/admin/test-login",
    // The caller's own identity. The tabs that care are told on the USER
    // channel from lib/profile.ts — asserted below.
    "POST /api/auth/email/change/start",
    "POST /api/auth/email/change/verify",
    "POST /api/auth/profile",
    "POST /api/auth/language",
    "POST /api/auth/scale",
    "POST /api/auth/spine",
    "POST /api/auth/logout",
    // Service-binding doors. An email leaving the building and an error row in
    // the core DB are not things any screen watches.
    "POST /internal/send-email",
    "POST /internal/log-error",
    "POST /internal/mcp-session",
  ],
})

describe("live-sync seam (auth): the reviewed exception is still the truth", () => {
  it("declares no mutation — a team-visible write here needs a decision first", () => {
    const mutations = Object.entries(ROUTES).filter(([, d]) => d.kind === "mutation")
    expect(
      mutations.map(([r]) => r),
      "a mutation on auth means a row somebody ELSE can see, and auth holds no team rows. " +
        "If that changed, publish it on the right channel and delete this assertion"
    ).toEqual([])
  })

  // THE OTHER HALF, and the one that would have rotted silently: "auth publishes
  // on the user channel instead" is only an exception while auth still does it.
  // Delete the publishUserChange calls from lib/profile.ts and every assertion
  // above still passes — the doors would just quietly stop reaching the caller's
  // other tabs, which is exactly the class of failure R1 exists to catch.
  it("the identity writes still reach the caller's own other tabs", () => {
    const profile = stripComments(readFileSync(join(SRC, "lib", "profile.ts"), "utf8"))
    const publishes = (profile.match(/publishUserChange\(/g) ?? []).length
    expect(
      publishes,
      "lib/profile.ts is where auth's user-channel broadcast lives. Every setter that changes what a " +
        "person sees about themselves must tell their other tabs, or the exception in CLAUDE.md " +
        "describes a worker that publishes nothing at all"
    ).toBeGreaterThanOrEqual(4)
  })

  it("no door publishes on a TEAM channel — auth has no team row to announce", () => {
    const doors = stripComments(doorSource())
    expect(
      /(?<![A-Za-z0-9_$.])publishChange\s*\(/.test(doors),
      "a team-channel publish in an auth door means auth grew a team-visible row. That is a real " +
        "change: classify the route as a mutation and re-read this suite"
    ).toBe(false)
  })
})
