// THREE FAILURES ON THIS WORKER THAT A PERSON MET AND THE STORE NEVER HEARD OF.
//
// Every one of them was already handled — a friendly redirect, a `.catch`, a
// `return` — and handled is not the same as recorded. ERROR-HANDLING.md's rule
// is never-swallow, and a `console.error` keeps a failure for exactly as long as
// somebody is watching the tail, which on all three of these is nobody: they are
// the failures where nothing crashes.
//
//   1. THE GOOGLE SIGN-IN CALLBACK. It catches, prints, and RETURNS a 302 to
//      /login?error=google_failed. A return is not a throw, so the worker's
//      central catch — which records everything else on this worker — never sees
//      it. An expired GOOGLE_CLIENT_SECRET fails every Google sign-in in the
//      product and left no row anywhere.
//   2. THE "YOUR SIGN-IN EMAIL WAS CHANGED" NOTICE. Best-effort on purpose (the
//      change already happened), console-only by accident. The address that just
//      lost the account is the one that was not warned.
//   3. THE ACCOUNT-ACTIVITY WRITE. The person's own security history; a run of
//      failures is a hole in the feed people are told to check.
//
// Held against REAL SQLite with the REAL core migrations, like error-row.test.ts
// beside it, so a row that the assertion says landed is a row the database
// accepted.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Env } from "../src/env"
import { OAUTH_COOKIE } from "../src/lib/google"
import { googleCallback } from "../src/routes/google"
import { logAccountActivity } from "../src/lib/account-activity"
import { d1 } from "./core-sqlite"

const CORE = join(__dirname, "..", "..", "..", "db", "core")
const migration = (name: string) => readFileSync(join(CORE, name), "utf8")

function coreDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:")
  db.exec(migration("0012_error_logs.sql"))
  db.exec(migration("0019_error_log_bound.sql"))
  db.exec(migration("0020_error_request_id.sql"))
  return db
}

type Row = { source: string; place: string; message: string; stack: string | null; user_id: string | null }
const rows = (db: DatabaseSync): Row[] =>
  db.prepare("SELECT source, place, message, stack, user_id FROM error_logs ORDER BY rowid").all() as Row[]

const ORIGIN = "https://app.kwapso.test"

function authEnv(db: DatabaseSync): Env {
  return {
    DB: d1(db),
    APP_ORIGIN: ORIGIN,
    PORTAL_ORIGIN: "https://portal.kwapso.test",
    EMAIL_FROM: "noreply@kwapso.test",
    GOOGLE_CLIENT_ID: "1234567890-kwapsosignin.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "a-secret-google-would-have-accepted-yesterday",
  } as unknown as Env
}

/** The browser coming back from Google with a state that matches its cookie —
 * everything before the token exchange is correct, so the only thing that can
 * fail is the exchange itself. Which is the real-world case: the handshake is
 * right and Google says no. */
function callbackRequest(): Request {
  return new Request(`${ORIGIN}/api/auth/google/callback?code=4/real-looking-code&state=st4te`, {
    headers: { Cookie: `${OAUTH_COOKIE}=st4te.the-pkce-verifier` },
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("1 · the Google sign-in callback: the person is told, and so is the store", () => {
  it("an expired client secret is a ROW, not just a redirect", async () => {
    // What a rotated or expired GOOGLE_CLIENT_SECRET actually looks like from
    // here: Google answers the token exchange with a 401 and the exchange throws.
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.stubGlobal("fetch", async () => new Response("invalid_client", { status: 401 }))
    const db = coreDb()

    const res = await googleCallback(callbackRequest(), authEnv(db))

    // THE PERSON'S SIDE IS UNCHANGED. This is the half that must not move: a
    // failed sign-in still bounces to the sign-in screen with a reason, and the
    // one-shot state cookie is still cleared.
    expect(res.status).toBe(302)
    expect(res.headers.get("Location")).toBe(`${ORIGIN}/login?error=google_failed`)

    // AND THE STORE'S SIDE EXISTS AT ALL, which it did not before.
    const written = rows(db)
    expect(written, "the callback recorded nothing — the person saw an error and the store saw a quiet day").toHaveLength(1)
    expect(written[0].source).toBe("auth")
    expect(written[0].place).toBe("GET /api/auth/google/callback")
    expect(written[0].message).toMatch(/401/)
    expect(written[0].stack, "a stack, so the failing claim can be found").toBeTruthy()
  })

  it("Google being unreachable records too — the same row, a different cause", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.stubGlobal("fetch", async () => {
      throw new Error("Network connection lost.")
    })
    const db = coreDb()

    await googleCallback(callbackRequest(), authEnv(db))

    expect(rows(db)).toHaveLength(1)
    expect(rows(db)[0].message).toMatch(/Network connection lost/)
  })

  it("a REFUSAL before the handshake is still not a row — this table is for the unexpected", async () => {
    // The door's own guards (no code, no state, a state that does not match its
    // cookie) are ordinary refusals and are answered, not recorded. Recording
    // them would bury the rows that matter under the rows that do not, which is
    // error-log.ts's stated contract — and this door is unauthenticated, so
    // anyone could fill the table by clicking a malformed link.
    const db = coreDb()
    const res = await googleCallback(
      new Request(`${ORIGIN}/api/auth/google/callback?code=x&state=mismatched`, {
        headers: { Cookie: `${OAUTH_COOKIE}=st4te.the-pkce-verifier` },
      }),
      authEnv(db)
    )
    expect(res.status).toBe(302)
    expect(rows(db), "a bad link from a stranger must not be able to write to the core database").toHaveLength(0)
  })
})

describe("2 · the email-change notice: the address that lost the account", () => {
  /** The whole verify flow, over real SQLite with the real migrations: a user, a
   * live change code, two devices signed in, and the mail service refusing. Only
   * the outbound HTTP door and the live channel are stubbed — everything the
   * module does to the database is done for real, so what is on trial is the
   * `.catch`, not a re-statement of it. */
  async function verifyWithARefusingMailService() {
    const db = new DatabaseSync(":memory:")
    db.exec(migration("0001_core_auth.sql"))
    db.exec(migration("0005_email_change.sql"))
    db.exec(migration("0007_account_activity.sql"))
    db.exec(migration("0012_error_logs.sql"))
    db.exec(migration("0019_error_log_bound.sql"))
    db.exec(migration("0020_error_request_id.sql"))

    const now = new Date()
    const at = (ms: number) => new Date(now.getTime() + ms).toISOString()
    db.prepare(
      "INSERT INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)"
    ).run("usr_1", "old@kwapso.test", at(0), at(0))
    // Two devices: the one doing the change, and the one it will sign out.
    for (const [id, hash] of [["s1", "keep-me"], ["s2", "drop-me"]])
      db.prepare(
        "INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(id, "usr_1", hash, at(0), at(86_400_000), at(0))

    const code = "123456"
    const newEmail = "new@kwapso.test"
    const { sha256Hex } = await import("../src/lib/crypto")
    db.prepare(
      "INSERT INTO email_change_codes (id, user_id, new_email, code_hash, attempts, expires_at, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)"
    ).run("ecc_1", "usr_1", newEmail, await sha256Hex(`${code}:${newEmail}`), at(600_000), at(0))

    // The mail service refuses. Nothing else is faked: this is the failure the
    // `.catch` exists for, and the change itself must still go through.
    vi.stubGlobal("fetch", async () => new Response("unprocessable", { status: 422 }))
    vi.spyOn(console, "error").mockImplementation(() => {})

    const door = d1(db)
    const env = {
      DB: { ...door, batch: async (stmts: { run(): Promise<unknown> }[]) => Promise.all(stmts.map((x) => x.run())) },
      RESEND_API_KEY: "test-key",
      EMAIL_FROM: "noreply@kwapso.test",
      APP_ORIGIN: ORIGIN,
      REALTIME: { fetch: async () => new Response("{}", { status: 200 }) },
    } as unknown as Env

    const { verifyEmailChange } = await import("../src/lib/email-change")
    const user = db.prepare("SELECT * FROM users WHERE id = 'usr_1'").get() as never
    const out = await verifyEmailChange(env, user, newEmail, code, "keep-me")
    return { db, out, newEmail }
  }

  it("the change still goes through — a failed notice must never undo it", async () => {
    const { db, out, newEmail } = await verifyWithARefusingMailService()
    expect(out, "the verify answered a failure").not.toHaveProperty("error")
    expect(
      (db.prepare("SELECT email FROM users WHERE id = 'usr_1'").get() as { email: string }).email
    ).toBe(newEmail)
  })

  it("…and the undelivered security warning is a row, filed against the person", async () => {
    const { db } = await verifyWithARefusingMailService()
    const notice = rows(db).filter((r) => r.place === "email-change/changed-notice")
    expect(
      notice,
      "somebody's account moved and the address that lost it was never warned — and nothing recorded that"
    ).toHaveLength(1)
    expect(notice[0].source).toBe("auth")
    expect(notice[0].user_id, "filed against the person, so 'whose notice failed' is one query").toBe("usr_1")
    expect(notice[0].message).toMatch(/NOT delivered/)
    expect(
      notice[0].message,
      "an old email address is exactly what should not sit in a diagnostics table"
    ).not.toMatch(/@kwapso\.test/)
  })
})

describe("3 · the account-activity write: the person's own security history", () => {
  it("a broken write is recorded against the person and never throws to the caller", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const db = coreDb()
    // The core database with `account_activity` MISSING — which is what an
    // unapplied migration, a renamed table or a broken predicate looks like from
    // inside this function. `error_logs` is there, so the recorder can still work.
    const env = authEnv(db)

    await expect(
      logAccountActivity(env, "usr_2", { type: "email_changed", description: "Changed your sign-in email" }),
      "a failed history note must never undo the change it describes"
    ).resolves.toBeUndefined()

    const written = rows(db)
    expect(written, "the account feed went quiet and nothing said so").toHaveLength(1)
    expect(written[0].source).toBe("auth")
    expect(written[0].place).toBe("account-activity")
    expect(written[0].user_id).toBe("usr_2")
  })
})
