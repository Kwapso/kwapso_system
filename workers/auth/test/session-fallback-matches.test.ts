// THE FALLBACK MUST STILL AGREE WITH THE MASTER.
//
// `whoAmI` resolves the caller from the session row when the auth worker is
// unreachable (documents/RESILIENCE.md § "The recommendation, now taken"). That
// is safe for three reasons, and this file is what keeps two of them true.
//
// ── THE COST THE DESIGN ACCEPTED ────────────────────────────────────────────
//
// Session resolution now exists in two places: `getSessionUser` in this worker,
// which is the master, and `sessionFromCore` in `shared/workers/`, which is the
// fallback. Two copies of one rule drift. A drift here is NOT loud — it shows up
// only during the one outage the fallback exists for, and then in one of two
// directions, both bad:
//
//   · the fallback has fallen BEHIND — it refuses everybody, so the mitigation
//     does nothing on the one day it was built for, and nobody finds out until
//     that day;
//   · the fallback is more PERMISSIVE — it accepts a caller auth would refuse,
//     which is a permission hole that only opens while the fence is already
//     degraded.
//
// So the two are read off disk and compared. Not the whole implementation —
// that would be a test that fails on every edit and gets deleted — but the four
// decisions that make the two answers the same answer.
//
// ── AND THE CANARY THAT KEEPS "ONE MASTER" TRUE ─────────────────────────────
//
// The fallback is safe to exist at all because it is READ-ONLY: auth alone
// mints, slides and destroys a session. `getSessionUser` writes in three ways
// (slides the expiry, stamps `last_seen_at`, deletes an expired row). If the
// fallback ever grows one of those, ARCHITECTURE §3's "one session system, one
// master" stops being true and nothing else in the codebase would notice. The
// last test here is that assertion, and it is the one worth keeping if the
// others ever become a nuisance.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { stripComments } from "@shared/rules/source-scan"

const ROOT = join(__dirname, "..", "..", "..")
const MASTER = join(ROOT, "workers", "auth", "src", "lib", "sessions.ts")
const FALLBACK = join(ROOT, "shared", "workers", "session-fallback.ts")

const master = readFileSync(MASTER, "utf8")
const fallback = readFileSync(FALLBACK, "utf8")

describe("the session fallback agrees with auth, its master", () => {
  it("both files exist and are the ones being compared", () => {
    // A comparison against a file that has moved is a comparison that passes
    // for the wrong reason.
    expect(master).toContain("export async function getSessionUser")
    expect(fallback).toContain("export async function sessionFromCore")
  })

  it("both resolve the caller from the SAME lookup column", () => {
    // The token is hashed and matched on `token_hash`. If auth ever changed
    // what it stores or what it matches on, a fallback still asking the old
    // question would refuse every caller during an outage.
    for (const [name, src] of [
      ["auth", master],
      ["the fallback", FALLBACK && fallback],
    ] as [string, string][])
      expect(src, `${name} no longer looks a session up by token_hash`).toMatch(
        /WHERE\s+s\.token_hash\s*=\s*\?/
      )
  })

  it("both hash the token with the same named algorithm", () => {
    // Not a value that can drift into being subtly wrong — it is a named,
    // standard digest — but a fallback hashing differently would match nothing,
    // which is the silent-refusal direction.
    expect(master, "auth's hash is no longer SHA-256").toMatch(/sha256|SHA-256/)
    expect(fallback, "the fallback's hash is no longer SHA-256").toContain('"SHA-256"')
  })

  it("both refuse an expired session and a deactivated user", () => {
    // The two refusals that make the fallback no more permissive than auth. If
    // auth gains a THIRD refusal this test will not catch it on its own — which
    // is why the comparison below counts them.
    expect(fallback, "the fallback stopped checking expiry").toMatch(/expires_at\s*<=/)
    expect(fallback, "the fallback stopped checking deactivated_at").toMatch(
      /deactivated_at\s*!==\s*null/
    )
    expect(master).toMatch(/expires_at\s*<=/)
    expect(master).toMatch(/deactivated_at\s*!==\s*null/)
  })

  it("both honour a pinned session, so a machine caller lands in its token's team", () => {
    // `team_pin` is what makes an MCP caller act in the token's team rather than
    // whatever team the human behind it last opened. A fallback that dropped it
    // would move that caller somewhere else mid-outage — silently, and into a
    // team they may legitimately hold rights in, which is the worst version.
    expect(master, "auth stopped applying team_pin").toContain("team_pin")
    expect(fallback, "the fallback stopped applying team_pin").toContain("team_pin")
  })

  it("BOTH NAME THE SAME COLUMNS on the user, so the two answers are the same shape", () => {
    // A `SessionUser` field auth returns and the fallback does not is a field
    // that becomes null mid-outage — a person's language reverting to English,
    // or worse, `currentTeamId` going null and the app deciding they are in no
    // team at all.
    const fields = [
      "first_name",
      "last_name",
      "image_url",
      "onboarding_completed_at",
      "current_team_id",
      "language",
      "scale",
      "spine",
    ]
    const missing = fields.filter((f) => !fallback.includes(f))
    expect(
      missing,
      "the fallback does not read every column a SessionUser is built from — those fields " +
        "would go null the moment the fallback answered"
    ).toEqual([])
  })

  it("THE FALLBACK NEVER WRITES — the property 'one master' rests on", () => {
    // THE CANARY, and the one to keep if the rest ever become a nuisance.
    //
    // Auth writes in three ways while reading a session: it slides the expiry,
    // it stamps last_seen_at, and it deletes a row it finds expired. Every one
    // of those is correct FOR AUTH and forbidden here — a worker that cannot
    // reach the thing that owns a session must not be extending it.
    //
    // Comments are stripped first, or this file's own prose about auth's writes
    // would be read as writes (the same strip R20's census does, for the same
    // reason).
    const code = stripComments(fallback)
    for (const verb of [/\bINSERT\s+INTO\b/i, /\bUPDATE\s+\w+\s+SET\b/i, /\bDELETE\s+FROM\b/i])
      expect(
        verb.test(code),
        `the fallback contains a ${verb.source} — it must be READ-ONLY, or auth is no longer ` +
          "the only thing that mints, slides or destroys a session (ARCHITECTURE §3)"
      ).toBe(false)

    // And the master really does write, so this test is comparing against
    // something rather than asserting a property of an empty set.
    const masterCode = stripComments(master)
    expect(
      /\bUPDATE\s+sessions\s+SET\b/i.test(masterCode) || /\bDELETE\s+FROM\s+sessions\b/i.test(masterCode),
      "auth no longer writes while resolving a session — if that is deliberate, this canary " +
        "has nothing left to contrast with and the read-only claim above is now trivial"
    ).toBe(true)
  })

  it("the fallback reads the cookie through the shared seam, not its own literal", () => {
    // The migration's ordering (prefixed name first) is a security property and
    // belongs in one place. A fallback with its own copy would be the fourth,
    // and would silently stop finding sessions when the legacy name is removed.
    expect(fallback).toContain("readSessionToken")
    expect(
      /["'`]kwapso_session["'`]/.test(fallback),
      "the fallback writes the cookie name out instead of importing it"
    ).toBe(false)
  })
})
