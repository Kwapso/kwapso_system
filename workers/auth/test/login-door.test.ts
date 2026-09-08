// The login-code doors, source-locked (seam-test style — reads the real code off
// disk). Three security invariants that must never regress:
//   1. A login code appears NOWHERE but the user's inbox — no echo field, no
//      config var that could re-enable one, in any environment. Automated tests
//      sign in through the ADMIN test-login door instead (staging-only secret).
//   2. Every secret-guarded door FAILS CLOSED when its secret is unset.
//   3. The attempt cap is ATOMIC — the limit check and the increment are one
//      statement, so concurrent guesses can't each read a stale count.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { doorSource } from "./doors"

import { sourceFiles } from "@shared/rules/source-scan"

const SRC = join(__dirname, "..", "src")
const ROOT = join(__dirname, "..", "..", "..")
// Every door on the worker, index.ts + routes/, sorted and stable — the
// handler-boundary slices below read it exactly as they read index.ts when all
// eighteen handlers lived there. See test/doors.ts.
const index = doorSource()
const emailChange = readFileSync(join(SRC, "lib", "email-change.ts"), "utf8")
const loginCodes = readFileSync(join(SRC, "lib", "login-codes.ts"), "utf8")

const authSources = (): string[] =>
  sourceFiles(SRC, { extensions: [".ts"] }).map((f) => f.source)

/** A SQL statement matched by its TOKENS, with any whitespace between them.
 *
 * WHY: these statements were pinned as literal strings, single spaces and all,
 * so wrapping one across two lines — which changes nothing about what the
 * database is asked — broke the law that guards it. That is not hypothetical
 * here: `UPDATE login_codes SET attempts = attempts + 1 …` was already wrapped
 * at some point and its matcher had to grow a lone `\s+` to survive; the
 * consume statement two lines down, and email-change's, are the same shape and
 * were one reformat from the same red. Every gap is `\s+` now, so the law
 * asserts the STATEMENT (these tokens, in this order) and stops asserting its
 * layout. Every other character is still exact: reorder a clause, drop
 * `consumed_at IS NULL`, or swap a `?` and it goes red as before. */
const sqlShape = (statement: string): RegExp =>
  new RegExp(
    statement
      .trim()
      .split(/\s+/)
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("\\s+")
  )

/** The source between two named handlers, with BOTH bounds proved to exist.
 *
 * WHY THE PROOF: `src.slice(a, src.indexOf(marker))` looks safe and is not —
 * `indexOf` returns -1 when the marker is gone and `slice(a, -1)` does not
 * throw, it hands back almost the whole door surface. The census then finds its
 * token in some OTHER handler and the check passes while saying nothing about
 * the one it names. Rename the closing handler (routine) and these slices go
 * quiet in exactly that way, so the bounds are asserted rather than assumed.
 * A failure here means the door list moved, not that a law broke. */
const between = (from: string, to: string): string => {
  const start = index.indexOf(from)
  const end = index.indexOf(to)
  expect(start, `${from} must exist on the door surface`).toBeGreaterThan(-1)
  expect(end, `${to} must exist on the door surface and follow ${from}`).toBeGreaterThan(start)
  return index.slice(start, end)
}

/** A named function's OWN body, brace-balanced — the pattern `catchBodyOf` in
 * data-ops/test/error-seam.test.ts already uses, and for the reason its comment
 * gives. Groups are chained because a TypeScript signature may put an object
 * return type between the parameters and the body; the last group before the
 * chain ends is the body. */
const bodyOf = (name: string): string | null => {
  const at = index.indexOf(`function ${name}`)
  if (at === -1) return null
  let i = at
  let body: string | null = null
  for (;;) {
    const open = index.indexOf("{", i)
    if (open === -1) return body
    let depth = 0
    let close = -1
    for (let j = open; j < index.length; j++) {
      if (index[j] === "{") depth++
      else if (index[j] === "}" && --depth === 0) {
        close = j
        break
      }
    }
    if (close === -1) return body
    body = index.slice(open + 1, close)
    const next = index.slice(close + 1).search(/\S/)
    if (next === -1 || index[close + 1 + next] !== "{") return body
    i = close + 1
  }
}

describe("no login code ever leaves through anything but the inbox", () => {
  it("the echo path AND its config var are gone from the auth worker", () => {
    for (const src of authSources()) expect(src).not.toContain("DEV_ECHO_CODES")
    // The var can't be re-enabled by configuration either.
    const wrangler = readFileSync(join(SRC, "..", "wrangler.jsonc"), "utf8")
    expect(wrangler).not.toContain("DEV_ECHO_CODES")
  })

  it("the send doors' success responses carry no code field", () => {
    // emailStart returns a bare ok — the code variable never reaches json().
    const start = between("async function emailStart", "async function adminTestLogin")
    // The BARE ok, spacing-tolerant. Pinned as the literal `return json({ ok:
    // true })`, this law failed on a reformat that put the object on its own
    // line — the response is identical, the check is not. What must hold is
    // that the success response's payload is `ok: true` and nothing beside it,
    // so that is what is written: the braces and the one property, any
    // whitespace, and nothing between `true` and the close.
    expect(start).toMatch(/return json\(\s*\{\s*ok:\s*true\s*,?\s*\}\s*\)/)
    // NEGATIVE laws are the ones that must not be spacing-sensitive: pinned as
    // `json\(\{`, a reformat that breaks the line after `json(` would make this
    // stop matching the very shape it forbids and the law would pass over a
    // code-echoing response. `\s*` between the paren and the brace; `[^}]*`
    // already crosses newlines, so the property may sit on any line of the
    // object.
    expect(start, "emailStart must never place a code in its response").not.toMatch(/json\(\s*\{[^}]*code/i)
    // The email-change start door likewise.
    const changeStart = between("async function emailChangeStart", "async function emailChangeVerify")
    expect(changeStart).toMatch(/return json\(\s*\{\s*ok:\s*true\s*,?\s*\}\s*\)/)
    expect(changeStart).not.toMatch(/json\(\s*\{[^}]*code/i)
    expect(emailChange).not.toContain("devCode")
  })

  it("the web client has no code-toast path left", () => {
    const files = [
      { path: join(ROOT, "web", "components", "auth-card.tsx"), rel: "auth-card.tsx" },
      {
        path: join(ROOT, "web", "components", "email-change-dialog.tsx"),
        rel: "email-change-dialog.tsx",
      },
      // The WHOLE API client, not the one file it used to be: the door lists live
      // one per worker under web/lib/api/ now, and a code-echoing call could be
      // declared in any of them.
      ...sourceFiles(join(ROOT, "web", "lib", "api"), { extensions: [".ts"] }),
    ]
    expect(files.length, "the scan must see the client's files").toBeGreaterThan(4)
    for (const f of files)
      expect(readFileSync(f.path, "utf8"), `${f.rel} must not reference devCode`).not.toContain(
        "devCode"
      )
  })

  it("the admin test-login door exists, shares the mint, and FAILS CLOSED", () => {
    const door = between("async function adminTestLogin", "async function emailVerify")
    // Fails closed on its OWN secret — deliberately NOT the shared ADMIN_KEY
    // maintenance key, which an operator sets on other workers in BOTH
    // environments (one mistyped directory would otherwise arm impersonation).
    expect(door).toContain("!env.TEST_LOGIN_KEY ||")
    expect(door, "the impersonation door must never share the maintenance key's name").not.toContain("env.ADMIN_KEY")
    // …and refuses outright on production, so the isolation is structural
    // rather than a sentence in a runbook.
    expect(door).toContain('env.ENVIRONMENT === "production"')
    // Same mint as the real send door — TTL/throttle/hashing can never drift.
    expect(door).toContain("mintLoginCode(")
    const start = between("async function emailStart", "async function adminTestLogin")
    expect(start).toContain("mintLoginCode(")
  })
})

describe("every internal door fails closed", () => {
  it("send-email, log-error and mcp-session all refuse when INTERNAL_KEY is unset", () => {
    for (const fn of ["internalSendEmail", "internalLogError", "internalMcpSession"]) {
      // THE HANDLER'S OWN BODY, not the next 600 characters after its name.
      // A character window is wrong in both directions on a fail-closed law.
      // The guard sits about 300 characters in today, so doubling the comment
      // above it — routine on a security handler, and this one already carries
      // four lines of reasoning — reddens the build over prose. And these three
      // handlers are neighbours in routes/internal.ts: shrink what sits between
      // them and the window reaches the NEXT handler's guard, at which point a
      // door that had lost its own would still pass. Brace-balanced, it can be
      // neither.
      const body = bodyOf(fn)
      expect(body, `${fn} must exist`).not.toBeNull()
      expect(body, `${fn} must fail closed (!env.INTERNAL_KEY || …)`).toMatch(
        /!env\.INTERNAL_KEY\s*\|\|/
      )
    }
  })
})

describe("the attempt cap is atomic", () => {
  it("login verify spends a try in the same statement that checks the budget", () => {
    // The cap and the spend are ONE statement (CONCURRENCY.md) — the check moved
    // from index.ts into the mint's own file, but it may never move back apart.
    expect(loginCodes).toMatch(
      sqlShape("UPDATE login_codes SET attempts = attempts + 1 WHERE id = ? AND consumed_at IS NULL AND ${ATTEMPTS_LEFT}")
    )
    // The burstable read-then-check gate is gone from both files.
    expect(index).not.toMatch(/row\.attempts >= MAX_CODE_ATTEMPTS/)
    expect(loginCodes).not.toMatch(/row\.attempts >= MAX_CODE_ATTEMPTS/)
  })

  // EARNED: the cap used to be one shared pool, so anyone who knew an email
  // address could burn five junk tries and lock its owner out of the product.
  it("the budget asks WHO is spending it — on both write paths", () => {
    // Two lanes, chosen inside the statement: all five for the address the code
    // was sent to, a small share for anyone else. A flat `attempts < ?` here is
    // the lockout, restored.
    expect(loginCodes).toMatch(
      sqlShape("attempts < (CASE WHEN sent_ip = ? THEN ? ELSE ? END)")
    )
    // Both halves carry it: charging a wrong guess AND consuming a right one —
    // or a brute-forcer who finally lands on the digits walks in past the cap.
    const spends = loginCodes.match(/\$\{ATTEMPTS_LEFT\}/g) ?? []
    expect(spends.length, "the charge and the consume must both carry the budget").toBe(2)
    // …and the consume carries `consumed_at IS NULL` too, exactly as the charge
    // above does. This line used to pin the statement WITHOUT it — a green test
    // holding a real race in place: the SELECT filtered on consumed_at and the
    // write didn't, so two verifies of one correct code both passed and ONE code
    // minted TWO sessions (double-submit.test.ts runs that race).
    expect(loginCodes).toMatch(
      sqlShape("UPDATE login_codes SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL AND ${ATTEMPTS_LEFT}")
    )
  })

  it("the verify door owns no copy of the rules — it calls the one seam", () => {
    const door = between("async function emailVerify", "async function emailChangeStart")
    expect(door).toContain("verifyLoginCode(")
    expect(door, "the caller is named, so the try is charged to them").toContain("clientIp(request)")
    expect(door, "no second copy of the attempt cap may grow here").not.toContain("attempts")
  })

  it("email-change verify uses the same atomic pattern", () => {
    expect(emailChange).toMatch(
      sqlShape("UPDATE email_change_codes SET attempts = attempts + 1 WHERE id = ? AND attempts < ? AND consumed_at IS NULL")
    )
    expect(emailChange).not.toMatch(/row\.attempts >= MAX_CODE_ATTEMPTS/)
  })
})
