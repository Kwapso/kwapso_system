// THE FRONT OF THE BUILDING — the email sign-in pair, the non-production test
// door, and the two halves of changing your address.
//
// THESE DOORS HAVE NO CALLER YET. That is the whole reason auth's gating seam
// needs its own vocabulary: `requireRight` asks what your role allows, and on a
// sign-in door there is nobody to have a role. What protects them instead is a
// THROTTLE (mintLoginCode / verifyLoginCode charge the address and the caller's
// IP) and, for the test door, two independent secrets plus an outright refusal
// in production. Each is named in test/gating-seam.test.ts with its reason.
//
// Lifted out of index.ts on 6 Sep 2026 with nothing changed but the file and the
// `export` keyword.

import { fail, json } from "@shared/workers/http"
import { requireText, TEXT_LIMITS } from "@shared/workers/validate"

import type { Env } from "../env"
import { isValidEmail, normalizeEmail, sendLoginCode } from "../lib/email"
import { clientIp, mintLoginCode, verifyLoginCode } from "../lib/login-codes"
import { TEST_LOGIN_BUCKET } from "../lib/constants"
import { startEmailChange, verifyEmailChange } from "../lib/email-change"
import { createSession, getSessionUser, readSessionToken } from "../lib/sessions"
import { sha256Hex } from "../lib/crypto"
import { findOrCreateUserByEmail, toSessionUser } from "../lib/users"

/** Step 1 of email login: create + send a 6-digit code. The response NEVER
 * carries the code — a login code appears nowhere but the user's inbox, in any
 * environment (the old staging echo was deleted; tests use adminTestLogin).
 * The ONE unauthenticated door that sends mail and writes rows, so the send is
 * charged to the caller (clientIp) as well as to the address. */
export async function emailStart(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown }
  const email = normalizeEmail(requireText(body.email, "Email", TEXT_LIMITS.short))
  if (!isValidEmail(email))
    return fail(400, "invalid_email", "Enter a valid email address.")

  const minted = await mintLoginCode(env, email, clientIp(request))
  if ("error" in minted) return fail(minted.status, minted.error, minted.message)

  const sent = await sendLoginCode(env, email, minted.code)
  if (sent) return json({ ok: true })
  // No email key configured → refuse rather than stranding the user.
  return fail(503, "email_not_configured", "Email sending isn't set up yet.")
}

/** NON-PRODUCTION ONLY: mint a login code through the SAME path as the real send
 * door (hashed at rest, same TTL, same per-hour throttle) and return it ONCE
 * instead of emailing — the sign-in door for automated tests now that no code is
 * ever echoed anywhere. Its holder can sign in as ANY account on the
 * environment, so it carries two independent locks (below) and production has
 * neither. See OPERATIONS.md § secrets. */
export async function adminTestLogin(request: Request, env: Env): Promise<Response> {
  // TWO independent locks, because this door's holder can sign in AS ANYONE:
  //  1. its OWN secret. It deliberately does NOT reuse ADMIN_KEY — that name is
  //     the maintenance key OPERATIONS.md tells an operator to set on tenancy and
  //     data-ops in BOTH environments, so sharing it would turn one mistyped
  //     `wrangler secret put` directory into universal impersonation.
  //  2. the environment itself. Even if the secret were somehow set on
  //     production, the code refuses — the isolation is structural, not a
  //     sentence in a runbook.
  if (env.ENVIRONMENT === "production") return fail(403, "forbidden", "Not available.")
  if (!env.TEST_LOGIN_KEY || request.headers.get("x-admin-key") !== env.TEST_LOGIN_KEY)
    return fail(403, "forbidden", "Not available.")
  const body = (await request.json().catch(() => ({}))) as { email?: unknown }
  const email = normalizeEmail(requireText(body.email, "Email", TEXT_LIMITS.short))
  if (!isValidEmail(email))
    return fail(400, "invalid_email", "Enter a valid email address.")
  // Charged to the test door's OWN bucket, not to the machine's address. This
  // door sends no mail, so it is not what the caller budgets are guarding — and
  // sharing them meant running the smoke suite twice in an hour locked the smoke
  // suite out of the product it was checking.
  const minted = await mintLoginCode(env, email, TEST_LOGIN_BUCKET)
  if ("error" in minted) return fail(minted.status, minted.error, minted.message)
  // Returned exactly once, to the TEST_LOGIN_KEY holder; the normal verify door
  // consumes it like any other code (attempt cap + TTL apply unchanged).
  return json({ ok: true, code: minted.code })
}

/** Step 2 of email login: check the code, create the session. Unauthenticated and
 * keyed on the address alone — anyone who knows an email can post junk here — so
 * the try is charged to the CALLER (clientIp) as well as to the code, and a
 * stranger's wrong guesses can't spend the tries of the person who asked for it.
 * See verifyLoginCode for the two lanes and why. */
export async function emailVerify(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string
    code?: string
  }
  const email = normalizeEmail(requireText(body.email, "Email", TEXT_LIMITS.short))
  const code = requireText(body.code, "Code", TEXT_LIMITS.short)
  if (!isValidEmail(email) || !/^\d{6}$/.test(code))
    return fail(400, "invalid_input", "Enter your email and the 6-digit code.")

  const checked = await verifyLoginCode(env, email, code, clientIp(request))
  if ("error" in checked) return fail(checked.status, checked.error, checked.message)

  const { user, isNew } = await findOrCreateUserByEmail(env, email)
  if (user.deactivated_at !== null)
    return fail(403, "deactivated", "This account is deactivated.")

  const { setCookie } = await createSession(env, user.id)
  return json({ user: toSessionUser(user), isNew }, 200, { "Set-Cookie": setCookie })
}

/** Email change, step 1: send a 6-digit code to the NEW email (signed-in only). */
export async function emailChangeStart(request: Request, env: Env): Promise<Response> {
  const user = await getSessionUser(env, request)
  if (!user) return fail(401, "signed_out", "Not signed in.")

  const body = (await request.json().catch(() => ({}))) as { email?: string }
  const r = await startEmailChange(env, user, requireText(body.email, "Email", TEXT_LIMITS.short))
  if ("error" in r) return fail(r.status, r.error, r.message)
  // Never a code in the response — same law as login (inbox only).
  return json({ ok: true })
}

/** Email change, step 2: verify the code, switch the email, log + secure it. */
export async function emailChangeVerify(request: Request, env: Env): Promise<Response> {
  const user = await getSessionUser(env, request)
  if (!user) return fail(401, "signed_out", "Not signed in.")

  const body = (await request.json().catch(() => ({}))) as {
    email?: string
    code?: string
  }
  // Keep THIS device signed in when we drop the others.
  // `readSessionToken`, not `readCookie(SESSION_COOKIE)`: during the `__Host-`
  // migration a browser may still be presenting the legacy name, and an empty
  // token here makes `signOutOtherSessions` return 0 without signing anybody out
  // — turning the security half of an email change into a no-op, silently.
  const token = readSessionToken(request)
  const currentTokenHash = token ? await sha256Hex(token) : ""
  const r = await verifyEmailChange(
    env,
    user,
    requireText(body.email, "Email", TEXT_LIMITS.short),
    requireText(body.code, "Code", TEXT_LIMITS.short),
    currentTokenHash
  )
  if ("error" in r) return fail(r.status, r.error, r.message)
  return json({ user: r.user })
}
