// R10 — THE GATING SEAM FOR AUTH. New on 6 Sep 2026, and the last worker to get
// one: until today R10 and R1 were enforced on six of eight workers, and the two
// they missed were the surface EVERY request in the product passes through and
// the machine surface in front of it. Nothing was found broken when this landed.
// That is not the same as nothing being at risk — a law enforced on six workers
// is a law with two places to ship an ungated door, and this file closes one.
//
// AUTH'S GATES ARE A DIFFERENT KIND OF QUESTION, so this suite hands the shared
// scanner its own vocabulary rather than the domain workers' `requireRight`.
// `requireRight` asks what your ROLE allows. Every door here asks who you are,
// and the sign-in doors cannot even ask that — there is nobody yet.
//
// Three classes, and every route on the worker is in exactly one:
//
//   1. IDENTITY-GATED — resolves the caller's session first and writes only the
//      row that session names. This is auth's own `whoAmI`: the other workers
//      ask auth over a binding, auth reads its own cookie (`getSessionUser`).
//   2. INTERNAL — reachable only by another worker over a service binding, held
//      by a fail-closed INTERNAL_KEY. Not under /api/, and this worker sets
//      workers_dev:false + preview_urls:false, so nothing public can route here.
//   3. OPEN — the front of the building. A sign-in door has no caller to gate,
//      and what bounds it is a THROTTLE (login-codes.ts charges the address AND
//      the caller's IP in the same statement) rather than a permission. Each is
//      named in OPEN below with what actually holds it, and the shared seam
//      ratchets the list: a door that later gains a gate must lose its line.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { gatingSeam } from "@shared/rules/seam-scan"
import { stripComments } from "@shared/rules/source-scan"
import { ROUTES } from "../src/index"
import { doorSource } from "./doors"

const SRC = join(__dirname, "..", "src")

/** THE GATES ON THIS WORKER.
 *
 * `getSessionUser` is auth's own identity oracle — the function the other seven
 * workers reach through `whoAmI` over a binding. `destroySession` is the same
 * question asked destructively: it reads the caller's OWN session cookie and
 * deletes the row that cookie names, which is why signing out needs no separate
 * gate (you can only ever destroy the session you presented). And the
 * INTERNAL_KEY comparison is the service-binding gate, matched as the
 * fail-closed SHAPE it is written in rather than as a bare mention of the name,
 * so a handler that merely READS env.INTERNAL_KEY does not read as gated. */
const AUTH_GATES =
  /(?<![A-Za-z0-9_$.])(?:getSessionUser|destroySession)\s*\(|!env\.INTERNAL_KEY \|\|/

/** The doors that verify nothing, because there is nothing yet to verify — and
 * what bounds each one instead. */
const OPEN: Record<string, string> = {
  "POST /api/auth/email/start":
    "the front of the building: no caller exists yet. Bounded by mintLoginCode, which charges the send to the address AND to the caller's IP, and it never returns the code",
  "POST /api/auth/email/verify":
    "the other half of the same door. Bounded by verifyLoginCode's atomic attempt cap, which spends a try in the same statement that checks the budget (CONCURRENCY.md)",
  "POST /api/auth/admin/test-login":
    "non-production only, and doubly locked: its OWN TEST_LOGIN_KEY secret (never the shared ADMIN_KEY) and an outright refusal when ENVIRONMENT is production. It mints through the same throttled path as the real send door",
  // FOUND BY THIS SUITE ON ITS FIRST RUN, which is the argument for the suite.
  // The Google pair looks like one door and is two: the CALLBACK proves identity
  // (a signed state cookie plus Google's own token signature) and the START
  // proves nothing at all, because nothing has happened yet. What bounds it is
  // an allow-list, and its own comment already said why that allow-list is
  // load-bearing — it just had nothing asserting the check was still there.
  "GET /api/auth/google/start":
    "a browser redirect out to Google, before any identity exists. Bounded by resolveFrontDoor, which requires the caller to be standing at one of OUR two hostnames — deriving the redirect_uri without that check would make this an open redirect that hands out a session cookie",
}

gatingSeam({
  name: "auth",
  routes: ROUTES,
  src: SRC,
  minRoutes: 14,
  // Every write here changes the CALLER'S OWN identity, never a row a team can
  // see — see the note on the ROUTES table. The tripwire still demands a
  // populated table carrying a non-GET route.
  requiresMutation: false,
  gates: AUTH_GATES,
  openRoutes: OPEN,
})

/* What a generic scan cannot ask, kept beside the worker it is about. */

describe("gating-seam (auth): the three classes are real, not just declared", () => {
  const routes = readFileSync(join(SRC, "routes", "internal.ts"), "utf8")

  it("every internal door fails CLOSED — an unset key refuses, never waves through", () => {
    const src = stripComments(routes)
    for (const fn of ["internalSendEmail", "internalLogError", "internalMcpSession"]) {
      const at = src.indexOf(`export async function ${fn}(`)
      expect(at, `${fn} must exist in routes/internal.ts`).toBeGreaterThan(-1)
      const body = src.slice(at, at + 600)
      expect(
        body,
        `${fn} must open with the fail-closed shape (!env.INTERNAL_KEY || …) — a half-finished bootstrap must not run with the doors open`
      ).toContain("!env.INTERNAL_KEY ||")
    }
  })

  it("no internal door is reachable under /api/ (only a binding can call one)", () => {
    for (const route of Object.keys(ROUTES)) {
      if (!route.includes("/internal/")) continue
      expect(
        route.includes("/api/"),
        `${route} is an internal door and must not sit under /api/, or the gateway could route it publicly`
      ).toBe(false)
    }
  })

  // THE CLASSES PARTITION THE TABLE. Without this, a new door could be in none
  // of them and the suite above would still pass — the shared seam only checks
  // the non-GETs, and a GET that reads somebody's account history is exactly the
  // door that must not slip through unnamed.
  it("every route is identity-gated, internal, open, or a named read", () => {
    const doors = stripComments(doorSource())
    const unclassified: string[] = []
    for (const [route, def] of Object.entries(ROUTES)) {
      if (OPEN[route]) continue
      if (route.includes("/internal/")) continue
      const at = doors.indexOf(`export async function ${def.handler.name}(`)
      expect(at, `handler ${def.handler.name} (${route}) must exist under routes/`).toBeGreaterThan(-1)
      const next = doors.indexOf("\nexport async function ", at + 1)
      const body = doors.slice(at, next === -1 ? undefined : next)
      // The Google pair is the one remaining shape: a browser redirect that
      // proves identity through a signed OAuth state cookie and Google's own
      // token signature, then MINTS the session rather than reading one.
      const isGoogleFlow = /oauthCookie\(|verifyGoogleIdToken\(/.test(body)
      if (!AUTH_GATES.test(body) && !isGoogleFlow) unclassified.push(`${route} (${def.handler.name})`)
    }
    expect(
      unclassified,
      `these doors are in none of auth's three gate classes. Resolve the session (getSessionUser), " +
       "make it internal, or name it in OPEN with what actually bounds it: ${unclassified.join(", ")}`
    ).toEqual([])
  })

  // The OPEN register above says what bounds each unguarded door. A reason in a
  // comment is a sentence; these three lines are the check. Written because the
  // suite's first run found `google/start` in no class at all, and the honest
  // fix — naming it OPEN — is worth nothing unless the thing that actually
  // holds it is pinned too.
  it("each open door still carries the bound its reason claims", () => {
    const doors = stripComments(doorSource())
    const bodyOf = (fn: string) => {
      const at = doors.indexOf(`export async function ${fn}(`)
      expect(at, `${fn} must exist under routes/`).toBeGreaterThan(-1)
      const next = doors.indexOf("\nexport async function ", at + 1)
      return doors.slice(at, next === -1 ? undefined : next)
    }
    expect(bodyOf("emailStart"), "the send door is bounded by the mint's throttle").toContain("mintLoginCode(")
    expect(bodyOf("emailVerify"), "the verify door is bounded by the atomic attempt cap").toContain("verifyLoginCode(")
    const test = bodyOf("adminTestLogin")
    expect(test, "the test door has its OWN secret").toContain("!env.TEST_LOGIN_KEY ||")
    expect(test, "…and refuses production outright").toContain('env.ENVIRONMENT === "production"')
    expect(
      bodyOf("googleStart"),
      "google/start is an open redirect the moment resolveFrontDoor stops guarding the origin"
    ).toContain("resolveFrontDoor(")
  })

  it("the health door is the only route answered above the table", () => {
    const index = stripComments(readFileSync(join(SRC, "index.ts"), "utf8"))
    const early = index.slice(0, index.indexOf("const def = ROUTES[route]"))
    expect(early).toContain("GET /api/auth/health")
    expect((early.match(/route === "/g) ?? []).length, "only the health probe may answer above the table").toBe(1)
  })
})
