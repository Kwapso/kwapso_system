// THE SIGN-IN SERVICE IS DOWN. CAN PEOPLE KEEP WORKING?
//
// Its sibling `session-fallback-matches.test.ts` compares the fallback's SOURCE
// with auth's, which catches drift and proves nothing about behaviour. This one
// drives `whoAmI` with the auth binding THROWING, against the real core
// migrations in SQLite, and asks the four questions the owner's ruling turns on:
//
//   · a live session keeps working                     — the mitigation itself
//   · an EXPIRED one still does not                    — no availability bought with accuracy
//   · a DEACTIVATED member still does not              — the same
//   · a session that was never presented still 401s    — null, not a 503
//
// And the fifth, which is the one that makes the whole design safe to have:
// when CORE is unreachable too, the seam still throws the 503 it always threw,
// because at that point nothing can honestly say who is asking.
//
// Driven through the SHIPPED `whoAmI` rather than calling `sessionFromCore`
// directly — the catch that reaches it is the thing being tested, and a test
// that called the fallback by hand would pass with the wiring removed.

import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vitest"

import { whoAmI, GuardError, type GatingEnv } from "@shared/workers/gating"
import { SESSION_COOKIE, LEGACY_SESSION_COOKIE } from "@shared/workers/session-cookie"
import { join } from "node:path"

import { sourceFiles } from "@shared/rules/source-scan"

import { d1, migration } from "./core-sqlite"

/** Every core migration filename, in the order the runner applies them.
 *
 * Through the shared walker rather than a `readdirSync` of my own — the law is
 * about not hand-rolling a directory walk, and it applies to a `.sql` tree for
 * the same reason it applies to a `.ts` one. Sorted by NAME, which is the order
 * the migration runner uses, so `0028` really does land after `0001`. */
function coreMigrations(): string[] {
  return sourceFiles(join(__dirname, "..", "..", "..", "db", "core"), {
    extensions: [".sql"],
    skipTests: false,
  })
    // The last path segment, without `basename` — this workspace's type set
    // does not expose it, and a split is the same answer.
    .map((f) => f.rel.split("/").pop() as string)
    .sort()
}

/** The same digest the fallback and auth both use, so the fixture stores what a
 * real sign-in would have stored. */
async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

const DAY = 24 * 60 * 60 * 1000
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString()

async function coreWith(opts: {
  expiresAt: string
  deactivatedAt?: string | null
  teamPin?: string | null
}): Promise<{ db: DatabaseSync; token: string }> {
  const db = new DatabaseSync(":memory:")
  // EVERY core migration, in order, rather than the handful this read happens to
  // name. A fixture that applies a convenient subset is a fixture that passes
  // while the real schema has moved underneath it — and the columns here
  // (`current_team_id`, `language`, `scale`, `spine`, `team_pin`) arrived across
  // five separate migrations, which is exactly how a subset goes stale.
  for (const m of coreMigrations()) db.exec(migration(m))

  const token = "a-real-looking-session-token"
  db.prepare(
    `INSERT INTO users (id, email, first_name, last_name, current_team_id, language, created_at, updated_at, deactivated_at)
     VALUES ('U1', 'ana@kwapso.test', 'Ana', 'Beck', 'T1', 'de', ?, ?, ?)`
  ).run(iso(0), iso(0), opts.deactivatedAt ?? null)
  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, last_seen_at, team_pin)
     VALUES ('S1', 'U1', ?, ?, ?, ?, ?)`
  ).run(await sha256Hex(token), iso(-DAY), opts.expiresAt, iso(-DAY), opts.teamPin ?? null)
  return { db, token }
}

/** An env whose AUTH binding is DOWN — every call throws, which is what a
 * service binding to an unhealthy worker does. */
function envWithAuthDown(db: DatabaseSync | null): GatingEnv {
  return {
    AUTH: {
      fetch: async () => {
        throw new Error("service binding unreachable")
      },
    },
    DB: db ? d1(db) : { prepare: () => { throw new Error("core unreachable") } },
    CF_ACCOUNT_ID: "acct",
    CF_D1_TOKEN: "tok",
  } as unknown as GatingEnv
}

const requestWith = (cookie: string) =>
  new Request("https://api.kwapso.test/api/content/tickets", { headers: { Cookie: cookie } })

describe("when the sign-in service is down", () => {
  it("a live session keeps working, and comes back whole", async () => {
    const { db, token } = await coreWith({ expiresAt: iso(10 * DAY) })
    const user = await whoAmI(requestWith(`${SESSION_COOKIE}=${token}`), envWithAuthDown(db))
    expect(user, "auth was down and the caller was refused — the mitigation did nothing").toBeTruthy()
    expect(user!.id).toBe("U1")
    expect(user!.email).toBe("ana@kwapso.test")
    // The whole SessionUser, not a stub: a field that goes null mid-outage is a
    // person whose app silently changes language or forgets which team they are in.
    expect(user!.firstName).toBe("Ana")
    expect(user!.currentTeamId).toBe("T1")
    expect(user!.language).toBe("de")
  })

  it("the LEGACY cookie name still resolves, because the migration is still running", async () => {
    const { db, token } = await coreWith({ expiresAt: iso(10 * DAY) })
    const user = await whoAmI(requestWith(`${LEGACY_SESSION_COOKIE}=${token}`), envWithAuthDown(db))
    expect(
      user,
      "somebody who has not made a request since the __Host- deploy would be signed out by " +
        "the very outage this is supposed to carry them through"
    ).toBeTruthy()
    expect(user!.id).toBe("U1")
  })

  it("an EXPIRED session is still refused — availability is not bought with accuracy", async () => {
    const { db, token } = await coreWith({ expiresAt: iso(-DAY) })
    const user = await whoAmI(requestWith(`${SESSION_COOKIE}=${token}`), envWithAuthDown(db))
    expect(user, "an expired session was accepted because auth happened to be down").toBeNull()
  })

  it("a DEACTIVATED member is still refused", async () => {
    const { db, token } = await coreWith({ expiresAt: iso(10 * DAY), deactivatedAt: iso(-DAY) })
    const user = await whoAmI(requestWith(`${SESSION_COOKIE}=${token}`), envWithAuthDown(db))
    expect(user, "a deactivated member got in through the outage door").toBeNull()
  })

  it("a pinned session still lands in its token's team, not the human's current one", async () => {
    const { db, token } = await coreWith({ expiresAt: iso(10 * DAY), teamPin: "T_TOKEN" })
    const user = await whoAmI(requestWith(`${SESSION_COOKIE}=${token}`), envWithAuthDown(db))
    expect(user!.pinnedTeamId).toBe("T_TOKEN")
    expect(
      user!.currentTeamId,
      "an MCP caller was moved into whatever team the person behind the token last opened"
    ).toBe("T_TOKEN")
  })

  it("no cookie is 'not signed in' (null), never a 503", async () => {
    const { db } = await coreWith({ expiresAt: iso(10 * DAY) })
    const user = await whoAmI(requestWith("something_else=x"), envWithAuthDown(db))
    expect(user).toBeNull()
  })

  it("a session the database does not hold is null, not an error", async () => {
    const { db } = await coreWith({ expiresAt: iso(10 * DAY) })
    const user = await whoAmI(requestWith(`${SESSION_COOKIE}=not-a-real-token`), envWithAuthDown(db))
    expect(user).toBeNull()
  })

  it("and when CORE is down too, it still says auth_unavailable rather than signing anybody out", async () => {
    // The honest boundary of the mitigation. Both ends unreachable means nothing
    // can say who is asking, and the one thing it must NOT do is answer null —
    // which callers turn into a 401 that signs a healthy session out.
    let thrown: unknown
    try {
      await whoAmI(requestWith(`${SESSION_COOKIE}=x`), envWithAuthDown(null))
    } catch (e) {
      thrown = e
    }
    expect(thrown, "both stores were down and the seam answered instead of refusing").toBeInstanceOf(
      GuardError
    )
    expect((thrown as GuardError).status).toBe(503)
    expect((thrown as GuardError).code).toBe("auth_unavailable")
  })
})
