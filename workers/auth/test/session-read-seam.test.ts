// EVERY DOOR THAT READS THE CALLER'S SESSION READS IT THROUGH THE ONE SEAM.
//
// ── WHY THIS FILE EXISTS, AND IT IS NOT THE REASON YOU EXPECT ────────────────
//
// The `__Host-` migration (5 Sep 2026) renamed the session cookie and left
// `readSessionToken` as the ONE reader that tries the new name and then the
// legacy one. One door had been reading the raw cookie by name —
// `emailChangeVerify`, which uses the caller's own token to decide which session
// to KEEP when it signs the others out. Reading `SESSION_COOKIE` directly there
// meant that during the migration a browser still presenting the legacy name
// handed back an empty token, `signOutOtherSessions` matched nothing, and the
// security half of an email change became a silent no-op. The door still
// answered 200. That was fixed.
//
// THE FIX WAS GUARDED BY NOTHING, and that is what this file is for. Proved on
// 6 Sep 2026 by reverting it and running the whole repository: 4,254 passed,
// exit 0, identical to the clean run. Not one test in eight workers and two
// front doors could tell the two spellings apart.
//
// It came up because this lane's restructure moved that handler into routes/ and
// the rebase raised a textual conflict there — the planner's worry was that
// resolving it wrongly would silently reinstate the regression. It would have.
// A conflict is a lucky accident though: it only happens when two people edit
// the same lines. The next person to touch this door gets no conflict and no
// test, so the guard has to be the test rather than the luck.
//
// WHY A SOURCE SCAN RATHER THAN A BEHAVIOURAL ONE. The failure is a door reading
// the RIGHT cookie by the WRONG route — both spellings compile, both return a
// string, and the difference only shows against a browser mid-migration, which is
// not a thing a unit test has. What can be proved is the seam: one reader, and
// no door going around it.

import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

const SRC = join(__dirname, "..", "src")

/** Every door, comment-stripped. Doors live under routes/ since 6 Sep 2026; the
 * walk is a directory rather than a filename so the next move cannot blind it. */
function doors(): { rel: string; code: string }[] {
  return sourceFiles(join(SRC, "routes"), { extensions: [".ts"] }).map((f) => ({
    rel: f.rel,
    code: stripComments(f.source),
  }))
}

describe("the session cookie has one reader", () => {
  it("the scan can see the doors at all (an empty walk passes everything below)", () => {
    const found = doors()
    expect(found.length, "auth's routes/ must hold its handlers").toBeGreaterThanOrEqual(4)
    expect(
      found.some((f) => f.code.includes("emailChangeVerify")),
      "the door this suite is about must be among them"
    ).toBe(true)
  })

  it("no door reads SESSION_COOKIE by name — that is what readSessionToken is for", () => {
    const offenders = doors()
      .filter((f) => /readCookie\s*\(\s*\w+\s*,\s*SESSION_COOKIE\s*\)/.test(f.code))
      .map((f) => f.rel)
    expect(
      offenders,
      "a door reading the session cookie by name gets NOTHING from a browser still presenting the " +
        "legacy name, and an empty token fails open rather than closed: signOutOtherSessions matches " +
        "no rows and signs nobody out, while the door still answers 200. Use readSessionToken, which " +
        "tries both names: " + offenders.join(", ")
    ).toEqual([])
  })

  it("the email-change door in particular reads through the seam", () => {
    const signIn = doors().find((f) => f.rel.endsWith("sign-in.ts"))
    expect(signIn, "routes/sign-in.ts must exist").toBeDefined()
    const at = (signIn as { code: string }).code.indexOf("export async function emailChangeVerify")
    expect(at, "emailChangeVerify must be an exported handler there").toBeGreaterThan(-1)
    const body = (signIn as { code: string }).code.slice(at, at + 900)
    expect(
      body,
      "this door decides which session to KEEP when it signs the others out. The token it reads is " +
        "the whole of that decision"
    ).toContain("readSessionToken(request)")
  })

  // THE CANARY, and this suite needs one more than most: it is a search for an
  // absent string, and a pattern that cannot match returns the same clean zero
  // as a codebase that is correct. Both spellings are checked against literals,
  // so the regex is proved to discriminate rather than assumed to.
  it("the pattern can actually see the mistake it is looking for", () => {
    const RE = /readCookie\s*\(\s*\w+\s*,\s*SESSION_COOKIE\s*\)/
    expect(RE.test("const token = readCookie(request, SESSION_COOKIE)")).toBe(true)
    // THE PARAMETER'S NAME IS NOT THE RULE. This pattern originally pinned the
    // literal `request`, which is what every handler under routes/ happens to
    // call it — and `lib/sessions.ts` calls the same argument `req` three lines
    // from the seam. A door written with `req` would have walked straight past a
    // check that looked correct. Found by reading the canary's own output rather
    // than by anything failing, which is the only way a too-narrow pattern is
    // ever found: it goes green.
    expect(RE.test("const token = readCookie(req, SESSION_COOKIE)")).toBe(true)
    expect(RE.test("const token = readSessionToken(request)")).toBe(false)
    // The OAuth state cookie is a different cookie and is read by name on
    // purpose — the rule is about the SESSION cookie only.
    expect(RE.test("const cookie = readCookie(request, OAUTH_COOKIE)")).toBe(false)
  })

  it("readSessionToken really does try both names (or the seam is a rename, not a migration)", () => {
    const sessions = stripComments(
      sourceFiles(join(SRC, "lib"), { extensions: [".ts"] }).find((f) => f.rel.endsWith("sessions.ts"))
        ?.source ?? ""
    )
    const at = sessions.indexOf("export function readSessionToken")
    expect(at, "readSessionToken must live in lib/sessions.ts").toBeGreaterThan(-1)
    const body = sessions.slice(at, at + 400)
    expect(body, "the new name").toContain("SESSION_COOKIE")
    expect(
      body,
      "and the legacy one — a reader that tries only the new name is the bug this door had, moved one file down"
    ).toContain("LEGACY_SESSION_COOKIE")
  })
})
