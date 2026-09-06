import type { Env } from "../env"
import { randomToken, sha256Hex } from "./crypto"
import { ulid } from "@shared/workers/id"
import type { UserRow } from "./users"

/** THE COOKIE NAME, AND WHY IT CARRIES `__Host-`.
 *
 * `SameSite=Lax` is same-SITE, and "site" is the registrable domain —
 * kwapso.app, which this product SHARES with a live third party (the legacy
 * Glide portal on portal.kwapso.app; the portal gateway's own config says so).
 * `refuseForeignOrigin` closed one half of what that means: a page over there
 * cannot make a WRITE ride this cookie. It says nothing about the other half. A
 * related host can also SET a cookie for `.kwapso.app`, and `readCookie` below
 * returns the FIRST match in the header — so an injected `kwapso_session` that
 * predates the victim's own would be the one read, and the victim would be
 * quietly signed in AS THE ATTACKER. Everything they then typed, uploaded or
 * created would land in the attacker's account. That is session fixation, and it
 * is the exact attack `__Host-` exists for: a browser refuses to accept a
 * `__Host-` cookie that carries a `Domain`, so no other host on the site can
 * write one. The three preconditions (Secure, Path=/, no Domain) were already
 * true here — only the name was missing.
 *
 * THE LEGACY NAME IS STILL READ, and that is a migration, not a hedge. Every
 * signed-in person holds `kwapso_session` today; accepting only the new name
 * would sign every one of them out on deploy, at which point somebody reverses
 * the change. So the prefixed name is written and is read FIRST — a victim who
 * has been migrated cannot be overridden by an injected legacy cookie, because
 * the prefixed one wins before the fallback is consulted.
 *
 * THE WINDOW IS REAL AND IT IS THE RESIDUAL RISK: somebody who has not made a
 * request since the deploy still holds only the legacy name and is still
 * fixable until they do. Sessions slide and every sign-in mints the new name, so
 * it drains on its own. `destroySession` closes the nastiest corner of it —
 * see its own note. DELETE the fallback (and this paragraph) once the estate has
 * been through one full session lifetime, 30 days after this ships.
 *
 * `INSECURE_COOKIE=1` keeps the bare name, because a browser will not accept a
 * `__Host-` cookie without `Secure` and local dev is http. */
export const LEGACY_SESSION_COOKIE = "kwapso_session"
export const SESSION_COOKIE = "__Host-kwapso_session"

/** The name this environment WRITES. Reading is a different question — see
 * `readSessionToken`, which accepts both. */
function cookieName(env: Env): string {
  return env.INSECURE_COOKIE === "1" ? LEGACY_SESSION_COOKIE : SESSION_COOKIE
}

/** THE SESSION TOKEN THIS REQUEST PRESENTS, prefixed name first.
 *
 * The ORDER is the security property, not a tidiness preference: a browser that
 * holds both — a migrated victim plus a cookie some other host on the site
 * injected — must resolve to its own. */
export function readSessionToken(req: Request): string | null {
  return readCookie(req, SESSION_COOKIE) ?? readCookie(req, LEGACY_SESSION_COOKIE)
}
const SESSION_DAYS = 30
/** When less than this many days remain, the session quietly extends itself. */
const SLIDE_THRESHOLD_DAYS = 15
/** last_seen_at is coarse presence, not analytics — only re-stamp it this often
 * (skips a write on the hottest authenticated read path). */
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000

const days = (n: number) => n * 24 * 60 * 60 * 1000

/** `SameSite=Lax` IS NOT THE CROSS-SITE DEFENCE — say it here, because this line
 * is where a reader goes looking for one. "Site" means the registrable domain,
 * kwapso.app, which we share with a live third-party app on portal.kwapso.app
 * (it resolves to Glide's edge, and the portal gateway's own config says so). A
 * page there is same-SITE, so this cookie rides its form POSTs happily. What
 * actually stops them is `refuseForeignOrigin` in shared/workers/front-door.ts,
 * which both gateways run in front of every non-GET they forward. Lax is kept
 * for what it IS good at — keeping the cookie off third-party GET embeds. */
function buildCookie(env: Env, value: string, maxAgeSeconds: number): string {
  const secure = env.INSECURE_COOKIE === "1" ? "" : "; Secure"
  // `Path=/` and no `Domain` are not stylistic here — they are two of the three
  // things a browser REQUIRES before it will accept a `__Host-` cookie at all
  // (the third is `Secure`, above). Change any of them and the cookie is
  // silently rejected, which reads as "sign-in does nothing".
  return `${cookieName(env)}=${value}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAgeSeconds}`
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("Cookie")
  if (!header) return null
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=")
    if (k === name) return rest.join("=")
  }
  return null
}

/** Log a user in: store a hashed session row, hand the browser the cookie. */
export async function createSession(
  env: Env,
  userId: string
): Promise<{ setCookie: string }> {
  const token = randomToken()
  const now = new Date()
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      ulid(),
      userId,
      await sha256Hex(token),
      now.toISOString(),
      new Date(now.getTime() + days(SESSION_DAYS)).toISOString(),
      now.toISOString()
    )
    .run()
  return { setCookie: buildCookie(env, token, days(SESSION_DAYS) / 1000) }
}

/** A short-lived session PINNED to one team, minted for a verified MCP token
 * (the internal bridge — never from a browser). /me answers with the pinned
 * team, so every downstream door acts in the TOKEN's team regardless of the
 * human's current app team. 60 minutes, never slid (see getSessionUser); the
 * mcp worker re-verifies the token itself on every call, so revocation bites
 * immediately even while a minted session is still alive. */
export async function createPinnedSession(
  env: Env,
  userId: string,
  teamId: string
): Promise<{ token: string }> {
  const token = randomToken()
  const now = new Date()
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, last_seen_at, team_pin)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      ulid(),
      userId,
      await sha256Hex(token),
      now.toISOString(),
      new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      now.toISOString(),
      teamId
    )
    .run()
  return { token }
}

/** Who is making this request? null = nobody (or an expired/deactivated user). */
export async function getSessionUser(
  env: Env,
  req: Request
): Promise<UserRow | null> {
  const token = readSessionToken(req)
  if (!token) return null

  const tokenHash = await sha256Hex(token)
  const row = await env.DB.prepare(
    `SELECT s.id AS session_id, s.expires_at, s.last_seen_at, s.team_pin, u.*
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?`
  )
    .bind(tokenHash)
    .first<
      UserRow & { session_id: string; expires_at: string; last_seen_at: string; team_pin: string | null }
    >()
  if (!row) return null

  const now = new Date()
  if (row.expires_at <= now.toISOString()) {
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?")
      .bind(row.session_id)
      .run()
    return null
  }
  if (row.deactivated_at !== null) return null

  // An MCP-minted session is PINNED: it acts in the token's team, not the
  // human's current app team — the whole gating chain downstream just works.
  if (row.team_pin) row.current_team_id = row.team_pin

  // Slide the expiry forward while the session is actively used. A pinned
  // (MCP) session is deliberately short-lived — never slid.
  const slide =
    row.team_pin == null &&
    new Date(row.expires_at).getTime() - now.getTime() <
    days(SLIDE_THRESHOLD_DAYS)
  // last_seen_at needs no sub-minute precision — skip the write on the hottest
  // read path unless the stamp is stale (or the expiry is being slid anyway).
  const seenStale =
    now.getTime() - new Date(row.last_seen_at).getTime() > LAST_SEEN_THROTTLE_MS
  if (slide || seenStale) {
    await env.DB.prepare(
      slide
        ? "UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?"
        : "UPDATE sessions SET last_seen_at = ? WHERE id = ?"
    )
      .bind(
        ...(slide
          ? [
              now.toISOString(),
              new Date(now.getTime() + days(SESSION_DAYS)).toISOString(),
              row.session_id,
            ]
          : [now.toISOString(), row.session_id])
      )
      .run()
  }

  return row
}

/** Sign out every OTHER device for this user, keeping the current session
 * (identified by its token hash). Used after a sensitive change (e.g. email
 * change) so a lost/hijacked device can't keep a foothold. Returns the count. */
export async function signOutOtherSessions(
  env: Env,
  userId: string,
  keepTokenHash: string
): Promise<number> {
  if (!keepTokenHash) return 0 // never wipe everything by accident
  const res = await env.DB.prepare(
    "DELETE FROM sessions WHERE user_id = ? AND token_hash != ?"
  )
    .bind(userId, keepTokenHash)
    .run()
  return res.meta.changes ?? 0
}

/** Log out: forget the session row and blank the cookie. */
export async function destroySession(
  env: Env,
  req: Request
): Promise<{ setCookie: string }> {
  // EVERY TOKEN THIS BROWSER PRESENTED, not just the one that authenticated it.
  //
  // The blanking header below can only clear ONE name, and during the `__Host-`
  // migration a browser may be carrying two. Clearing the prefixed one and
  // leaving a LIVE legacy cookie behind is the worst version of this: the next
  // request falls back to it — and if that cookie was injected by another host
  // on the site, signing out would hand the person to the attacker rather than
  // away from them. So logging out destroys the session ROW behind every token
  // presented, which is what makes the leftover cookie inert whatever the
  // browser does with it. Deleting by hash means an unknown token costs one
  // no-op statement and gives nothing away.
  const tokens = [readCookie(req, SESSION_COOKIE), readCookie(req, LEGACY_SESSION_COOKIE)]
  for (const token of tokens) {
    if (!token) continue
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(await sha256Hex(token))
      .run()
  }
  return { setCookie: buildCookie(env, "", 0) }
}
