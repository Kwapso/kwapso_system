// ONE READER FOR THE SESSION COOKIE, AND THE NAME IN EXACTLY ONE PLACE.
//
// Three clauses over one invariant, merged here on 6 Sep 2026 out of two laws
// written independently, from opposite directions, by two lanes who did not know
// about each other:
//
//   A · no door calls `readCookie(<anything>, SESSION_COOKIE)` — the READ FORM
//   B · the literal and its legacy twin appear only in the one seam — the NAME
//   C · `readSessionToken` really tries both names — the SEAM ITSELF
//
// They were `workers/auth/test/session-read-seam.test.ts` (A and C, over auth's
// doors) and this file (B, over the whole app). One topic, one owner: two
// censuses on one invariant is the rot a registry exists to prevent, and the
// pair had already begun to disagree — moving the constants into
// `shared/workers/session-cookie.ts` broke that file's clause C, which asserted
// the reader lives in `lib/sessions.ts`, while leaving the property it cared
// about perfectly intact.
//
// NEITHER WAS SUFFICIENT ALONE, and the boundary was measured rather than
// argued. Their A caught `readCookie(request, …)` and `readCookie(req, …)` and
// was BLIND to the raw literal written out on any door they had not named by
// hand — the literal is not how the bug they were chasing was spelled. B closes
// exactly that. And their C is stronger than anything B can say: B proves the
// name lives in one file, C proves the FUNCTION there tries both spellings, and
// a reader that tried only the new one would satisfy B completely.
//
// ── THE FAILURE THIS EXISTS FOR, AND WHY IT NEEDS A TEST ────────────────────
//
// ── THE FAILURE THIS EXISTS FOR, AND WHY IT NEEDS A TEST ────────────────────
//
// The `__Host-` rename left the literal hand-written in three places: auth's
// pair of constants and a third copy in the MCP bridge that mints the cookie for
// the machine surface. Nothing compared them. A fourth was about to be added by
// the sign-in fallback in the gating seam, because shared code cannot import
// from a worker and so had no constant to reach for.
//
// What makes it worth a test rather than a tidy-up is the SHAPE of the failure.
// The legacy name is still read, for one session lifetime, and then that
// fallback is deleted. A copy that spells the wrong name does not break on the
// day it is written — it keeps working while the estate still holds legacy
// cookies, and stops finding sessions when they drain. No exception, no failing
// test, no deploy to correlate it with: sign-in simply stops working for people
// weeks after anybody touched it. A guard that quietly stops guarding, on a
// timer, is exactly the shape a green build cannot see.
//
// So: ONE file may write the string. Everything else imports it.
//
// DERIVED, not a hand-kept list — the census walks the disk. An exemption is a
// line in EXPECTED below with a reason, and there is deliberately only one.

import { describe, expect, it } from "vitest"
import { join } from "node:path"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

const ROOT = join(__dirname, "..", "..")

/** The one file allowed to write either name out. */
const HOME = "shared/workers/session-cookie.ts"

/** Test fixtures and ops scripts legitimately name the cookie: a smoke script
 * mints one against a real environment, and a test builds a request header by
 * hand. They are not the product's own copies of the constant, and holding them
 * to it would make the law fire on work that cannot import from `shared/`
 * (a `.mjs` ops script) — which is how a check becomes one people route around.
 * The PRODUCT's own source is what this walks, and `sourceFiles` skips tests. */
const WALKED = ["shared", "workers", "web/lib", "web/components", "web-portal"]

function filesWritingTheName(): string[] {
  const out: string[] = []
  for (const dir of WALKED) {
    for (const f of sourceFiles(join(ROOT, dir), {
      extensions: [".ts", ".tsx"],
      skipTests: true,
      relativeTo: ROOT,
    })) {
      // The bare legacy name is a substring of the prefixed one, so one pattern
      // catches both spellings and a copy cannot hide behind the prefix.
      if (/["'`]__Host-kwapso_session["'`]|["'`]kwapso_session["'`]/.test(f.source)) out.push(f.rel)
    }
  }
  return [...new Set(out)].sort()
}

describe("the session cookie's name lives in one file", () => {
  it("only the shared seam writes the literal", () => {
    const writers = filesWritingTheName()
    expect(
      writers,
      "the session cookie's name is written out somewhere other than its one home. Import " +
        `SESSION_COOKIE / readSessionToken from ${HOME} instead. During the legacy migration a ` +
        "second copy does not fail on the day it is wrong — it fails weeks later, when the " +
        "estate drains, with nothing to point at."
    ).toEqual([HOME])
  })

  it("the seam really holds both names — so the rule is guarding something", () => {
    // A guard that passes because the thing it guards has moved is not a guard.
    // If the constants leave this file, the census above would go green by
    // finding nothing anywhere, which is the one way it could rot silently.
    const home = sourceFiles(join(ROOT, "shared", "workers"), {
      extensions: [".ts"],
      skipTests: true,
      relativeTo: ROOT,
    }).find((f) => f.rel === HOME)
    expect(home, `${HOME} is gone — the census above now proves nothing`).toBeTruthy()
    expect(home!.source).toContain('"__Host-kwapso_session"')
    expect(home!.source).toContain('"kwapso_session"')
  })

  it("nobody resolves a caller from the PREFIXED name alone — the ordering cannot be bypassed", () => {
    // THE OTHER HALF, AND THE ONE THE CENSUS ABOVE CANNOT SEE.
    //
    // The test above catches a re-written LITERAL. It does not catch a
    // re-written CALL, and that is the shape the regression actually took: a
    // handler that reads `readCookie(request, SESSION_COOKIE)` instead of
    // `readSessionToken(request)` spells no literal at all, imports from the
    // right place, and passes every assertion above — while silently dropping
    // every person the `__Host-` migration has not reached yet. They are signed
    // out, on a door that looks correct, for as long as the legacy fallback
    // is still meant to be carrying them.
    //
    // So the property is not "which name" but "BOTH NAMES, IN ORDER". Reading
    // both is the ordering itself and is fine. Reading only the prefixed one is
    // the bypass.
    //
    // PER LINE, NOT PER FILE — and this granularity is the whole check, found by
    // canarying rather than by reasoning. The first draft asked whether the FILE
    // also read the legacy name, and `sessions.ts` does: `destroySession`
    // legitimately reads both, to kill the row behind every token a browser
    // presented. So replaying the exact regression into `getSessionUser` in that
    // same file left the census GREEN — the honest read one function away was
    // covering for the bypass. A check that cannot fail on the bug it was
    // written for is worse than no check, because it is quoted as cover.
    //
    // Both legitimate readers pair the two names in ONE expression:
    //   `readCookie(req, SESSION_COOKIE) ?? readCookie(req, LEGACY_SESSION_COOKIE)`
    //   `[readCookie(req, SESSION_COOKIE), readCookie(req, LEGACY_SESSION_COOKIE)]`
    // so the line is the honest unit, and a prefixed read alone on its line is
    // the thing that has no honest form.
    const offenders: string[] = []
    for (const dir of WALKED) {
      for (const f of sourceFiles(join(ROOT, dir), {
        extensions: [".ts", ".tsx"],
        skipTests: true,
        relativeTo: ROOT,
      })) {
        if (f.rel === HOME) continue // the seam IS the ordering
        const src = stripComments(f.source)
        src.split("\n").forEach((line, i) => {
          if (!/readCookie\s*\([^,)]+,\s*SESSION_COOKIE\s*\)/.test(line)) return
          if (/readCookie\s*\([^,)]+,\s*LEGACY_SESSION_COOKIE\s*\)/.test(line)) return
          offenders.push(`${f.rel}:${i + 1}`)
        })
      }
    }
    expect(
      offenders,
      "these read the session cookie by its PREFIXED name only. Call readSessionToken(request) " +
        "instead — it tries the prefixed name first and falls back to the legacy one, which is " +
        "the whole migration. Reading only the prefixed name signs out everybody who has not " +
        "made a request since the __Host- deploy, on a door that otherwise looks right."
    ).toEqual([])
  })

  it("the readers import it rather than restating it", () => {
    // The two workers that had their own copy. Named, because "nobody writes the
    // literal" is also true of a file that stopped reading the cookie at all,
    // and that would be a real regression this census cannot see.
    for (const rel of ["workers/auth/src/lib/sessions.ts", "workers/mcp/src/lib/bridge.ts"]) {
      const f = sourceFiles(join(ROOT, "workers"), {
        extensions: [".ts"],
        skipTests: true,
        relativeTo: ROOT,
      }).find((x) => x.rel === rel)
      expect(f, `${rel} is gone`).toBeTruthy()
      expect(
        f!.source,
        `${rel} no longer imports the cookie name from the shared seam — either it stopped ` +
          "using the session cookie (a bigger change than this test) or it has its own copy again"
      ).toContain("@shared/workers/session-cookie")
    }
  })

  /* ── CLAUSE C, and the door-level half of A, carried over from the law this
        one absorbed. Both are things B cannot say. ──────────────────────── */

  it("C · readSessionToken really tries BOTH names, or the seam is a rename not a migration", () => {
    // B proves the name lives in one file. It cannot prove the READER there
    // tries both spellings — a `readSessionToken` that had quietly dropped the
    // legacy fallback would satisfy every assertion above, and would sign out
    // everybody the migration has not reached. That is the bug the absorbed law
    // was written for, one file further down than where it first appeared.
    const seam = sourceFiles(join(ROOT, "shared", "workers"), {
      extensions: [".ts"],
      skipTests: true,
      relativeTo: ROOT,
    }).find((f) => f.rel === HOME)
    expect(seam, `${HOME} is gone`).toBeTruthy()
    const at = seam!.source.indexOf("export function readSessionToken")
    expect(at, `readSessionToken must be declared in ${HOME}`).toBeGreaterThan(-1)
    const body = seam!.source.slice(at, at + 400)
    expect(body, "the prefixed name").toContain("SESSION_COOKIE")
    expect(
      body,
      "and the legacy one — a reader that tries only the new name is the bug this law exists for"
    ).toContain("LEGACY_SESSION_COOKIE")
  })

  it("A · the email-change door in particular reads through the seam", () => {
    // NAMED, because this is the door the whole thing was found on. It uses the
    // caller's own token to decide which session to KEEP while signing the
    // others out, so an empty token there fails OPEN: `signOutOtherSessions`
    // matches no rows, nobody is signed out, and the door still answers 200.
    // The general clause above would catch a `readCookie(…, SESSION_COOKIE)`
    // here; this catches the door quietly ceasing to read a token at all.
    const doors = sourceFiles(join(ROOT, "workers", "auth", "src", "routes"), {
      extensions: [".ts"],
      skipTests: true,
      relativeTo: ROOT,
    })
    expect(doors.length, "auth's routes/ must hold its handlers").toBeGreaterThanOrEqual(4)
    const withIt = doors.find((f) => f.source.includes("export async function emailChangeVerify"))
    expect(withIt, "emailChangeVerify must be an exported handler under routes/").toBeTruthy()
    const at = withIt!.source.indexOf("export async function emailChangeVerify")
    expect(
      withIt!.source.slice(at, at + 900),
      "this door decides which session to KEEP when it signs the others out. The token it reads " +
        "is the whole of that decision, and it must come through readSessionToken"
    ).toContain("readSessionToken(request)")
  })

  it("the patterns can actually see the mistakes they look for", () => {
    // THE CANARY THIS SUITE NEEDS MOST: every clause above is a search for an
    // ABSENT string, and a pattern that cannot match returns the same clean zero
    // as a codebase that is correct.
    const READ_FORM = /readCookie\s*\([^,)]+,\s*SESSION_COOKIE\s*\)/
    expect(READ_FORM.test("const token = readCookie(request, SESSION_COOKIE)")).toBe(true)
    // THE PARAMETER'S NAME IS NOT THE RULE — carried over verbatim from the
    // absorbed law, which found this by reading its own canary's output rather
    // than by anything failing. A pattern pinned to `request` walks straight
    // past `lib/sessions.ts`, three lines from the seam, which calls it `req`.
    expect(READ_FORM.test("const token = readCookie(req, SESSION_COOKIE)")).toBe(true)
    expect(READ_FORM.test("const token = readCookie(c.req, SESSION_COOKIE)")).toBe(true)
    expect(READ_FORM.test("const token = readSessionToken(request)")).toBe(false)
    // A DIFFERENT COOKIE IS A DIFFERENT QUESTION. The OAuth state cookie is read
    // by name on purpose; this rule is about the SESSION cookie alone.
    expect(READ_FORM.test("const c = readCookie(request, OAUTH_COOKIE)")).toBe(false)

    // And the literal census's own pattern, which is the half their law was
    // blind to: a raw name on a door nobody listed by hand.
    const LITERAL = /["'`]__Host-kwapso_session["'`]|["'`]kwapso_session["'`]/
    expect(LITERAL.test('const SESSION_COOKIE = "__Host-kwapso_session"')).toBe(true)
    expect(LITERAL.test('readCookie(request, "kwapso_session")')).toBe(true)
    expect(LITERAL.test("import { SESSION_COOKIE } from \"@shared/workers/session-cookie\"")).toBe(false)
  })
})
