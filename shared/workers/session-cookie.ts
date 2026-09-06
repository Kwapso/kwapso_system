// THE SESSION COOKIE'S NAME, IN ONE PLACE — because it was in three, and one of
// them is on a thirty-day clock.
//
// ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
//
// The `__Host-` rename (see the block below, carried over from
// workers/auth/src/lib/sessions.ts where this reasoning was written) left the
// literal hand-written in three places: auth's pair of constants, and a third
// copy in workers/mcp/src/lib/bridge.ts that mints the cookie for the machine
// surface. Nothing compared them. A fourth was about to be added by the
// sign-in fallback in `gating.ts`, which is what made the shape visible: shared
// code cannot import from a worker, so a fallback living in `shared/` had no
// constant to reach for and would have written the name out again.
//
// THE FAILURE THAT MADE IT URGENT is specific and quiet. The migration below
// keeps the LEGACY name readable for one session lifetime and then it goes
// away. A copy that spells the legacy name — or that spells the prefixed one
// but is never updated when the fallback is deleted — does not break on the day
// it is wrong. It keeps working until the estate drains, and then stops finding
// sessions, with a green build and nothing to point at. A guard that quietly
// stops guarding, on a timer, is the worst shape available; the only defence is
// that there is one copy to change.
//
// `shared/workers/` rather than beside auth because the readers are on three
// different workers (auth resolves the session, mcp mints one, the gating seam
// falls back to reading one) and only shared code is reachable from all three.
// Auth remains the only thing that MINTS, SLIDES or DESTROYS a session — this
// file holds a name and two pure functions, not a session system.

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
 * been through one full session lifetime, 30 days after this ships. */
export const LEGACY_SESSION_COOKIE = "kwapso_session"
export const SESSION_COOKIE = "__Host-kwapso_session"

/** The name an environment WRITES. Reading is a different question — see
 * `readSessionToken`, which accepts both.
 *
 * Takes the FLAG rather than the env, so this file stays free of any one
 * worker's `Env` type: three workers hold three different ones and none of them
 * belongs in `shared/`. `INSECURE_COOKIE=1` keeps the bare name, because a
 * browser will not accept a `__Host-` cookie without `Secure` and local dev is
 * http. */
export function sessionCookieName(insecure: boolean): string {
  return insecure ? LEGACY_SESSION_COOKIE : SESSION_COOKIE
}

/** One named cookie out of a request's `Cookie` header, or null. */
export function readCookie(req: { headers: { get(name: string): string | null } }, name: string): string | null {
  const header = req.headers.get("Cookie")
  if (!header) return null
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=")
    if (k === name) return rest.join("=")
  }
  return null
}

/** THE SESSION TOKEN THIS REQUEST PRESENTS, prefixed name first.
 *
 * The ORDER is the security property, not a tidiness preference: a browser that
 * holds both — a migrated victim plus a cookie some other host on the site
 * injected — must resolve to its own. */
export function readSessionToken(req: { headers: { get(name: string): string | null } }): string | null {
  return readCookie(req, SESSION_COOKIE) ?? readCookie(req, LEGACY_SESSION_COOKIE)
}
