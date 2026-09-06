// WHEN THE SIGN-IN SERVICE IS UNREACHABLE, READ THE SESSION ROW OURSELVES.
//
// The owner's ruling, 2026-09-05: keep people working for a few minutes if the
// sign-in service goes down. `documents/RESILIENCE.md` § "The recommendation,
// now taken" carries the whole argument; this is the part that runs.
//
// ── IT IS NOT A CACHE, AND THAT IS THE DESIGN ───────────────────────────────
//
// The 2026-08-14 review proposed a short-lived signed copy of `/api/auth/me`.
// That was refused. A cached identity is stale BY CONSTRUCTION: it cannot see a
// session that has since expired, a member who has since been deactivated, or a
// sign-out — so it buys availability with exactly the accuracy the permission
// spine exists to have. And it fails where it is most needed, on a cold isolate
// that has never seen the caller.
//
// This reads the same row auth reads, live. No staleness, no grace window to
// tune, and a cold isolate answers as well as a warm one.
//
// ── WHY THIS DOES NOT MAKE A SECOND SESSION SYSTEM ──────────────────────────
//
// THREE PROPERTIES, and each one is load-bearing:
//
//  1 · READ-ONLY, so auth is still the only master. `getSessionUser` in the auth
//      worker also WRITES — it slides the expiry forward, stamps `last_seen_at`,
//      and DELETES a row it finds expired. Nothing here does any of those.
//      ARCHITECTURE §3's "one session system, one master" is a statement about
//      the WRITER, and it still holds. During an outage a session simply stops
//      sliding, which is the correct behaviour: nothing should be kept alive by
//      a worker that cannot reach the thing that owns it.
//
//  2 · ONLY ON THE FAILURE PATH. `whoAmI` calls this from the `catch` that used
//      to throw 503 outright. A healthy system never reaches it and behaves
//      byte-for-byte as before, so nothing about normal operation is traded.
//
//  3 · RIGHTS WERE NEVER THE PROBLEM. `whoAmI` answers only WHO. Every
//      permission decision — `requireMember`, `requireRight`, the account fence
//      — already reads the core database directly and is untouched by an auth
//      outage. So this restores identity and changes nothing about what that
//      identity may do. A member deactivated mid-outage is still refused, by the
//      same clause as always.
//
// ── THE COST, STATED ────────────────────────────────────────────────────────
//
// Session resolution now exists in two places. Two copies of one rule drift, and
// a drift here is not loud: a fallback that has fallen behind auth either
// refuses everybody during the one outage it exists for, or accepts somebody
// auth would not. `workers/auth/test/session-fallback-matches.test.ts` reads both
// off disk and fails the build when they disagree — including the canary that
// this file contains no write at all, which is what keeps property 1 true.
//
// It does NOT survive the core database being unreachable. Nothing in the
// product does, and a fallback for that would be the cached identity this
// design just refused. If core is down the app is down; that is the honest
// boundary of this mitigation.

// `D1Database` is IMPORTED, not ambient. `shared/` is compiled by the two WEB
// workspaces as well as by the workers, and only the workers declare Cloudflare's
// globals — so a bare `D1Database` here typechecks in five projects and fails in
// two. Same reason `gating.ts` imports it, one file along.
import type { D1Database } from "@cloudflare/workers-types"

import type { SessionUser } from "../types"
import { readSessionToken } from "./session-cookie"

/** What this needs of an environment: the core database, and nothing else. It is
 * a subset of `GatingEnv`, declared separately so this file does not import the
 * seam that imports it. */
type CoreEnv = { DB: D1Database }

/** The columns a `SessionUser` is built from, joined to the session that
 * presented them. Deliberately the same shape auth's own read returns, so the
 * two can be compared. */
type Row = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  image_url: string | null
  onboarding_completed_at: string | null
  current_team_id: string | null
  language: string | null
  scale: string | null
  spine: string | null
  deactivated_at: string | null
  expires_at: string
  team_pin: string | null
}

/**
 * Resolve the caller from the session row, or null.
 *
 * NULL MEANS "NOT SIGNED IN" and reads as a 401, exactly as a healthy auth's
 * `null` does — a session that is absent, expired, or belongs to a deactivated
 * user is genuinely not a caller, and saying so is not a degradation.
 *
 * It THROWS nothing: a database failure is the caller's to interpret, and
 * `whoAmI` turns it back into the same `503 auth_unavailable` it always threw,
 * so that sentence lives in exactly one place.
 */
export async function sessionFromCore(
  request: Request,
  env: CoreEnv
): Promise<SessionUser | null> {
  // Both names, prefixed first — the migration's ordering is a security
  // property, so it is the shared helper's job and never restated here.
  const token = readSessionToken(request)
  if (!token) return null

  const tokenHash = await sha256Hex(token)
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.image_url,
            u.onboarding_completed_at, u.current_team_id, u.language, u.scale, u.spine,
            u.deactivated_at, s.expires_at, s.team_pin
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?`
  )
    .bind(tokenHash)
    .first<Row>()
  if (!row) return null

  // EXPIRY IS HONOURED AND THE EXPIRED ROW IS LEFT ALONE. Auth deletes it here;
  // this does not, because deleting is a write and property 1 above is the whole
  // reason this is safe. An expired row that outlives the outage is tidied by
  // auth on its next read — the retention sweep and `getSessionUser` both do it.
  if (row.expires_at <= new Date().toISOString()) return null
  if (row.deactivated_at !== null) return null

  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    imageUrl: row.image_url,
    onboardingComplete: row.onboarding_completed_at !== null,
    // A PINNED SESSION STILL OVERRIDES, because the pin is what makes a machine
    // caller act in its token's team rather than the human's current one. Auth
    // does this in `getSessionUser`; a fallback that skipped it would quietly
    // move an MCP caller into whatever team the person behind the token last
    // opened in the app.
    currentTeamId: row.team_pin ?? row.current_team_id ?? null,
    pinnedTeamId: row.team_pin ?? null,
    language: row.language ?? null,
    scale: row.scale ?? null,
    spine: row.spine ?? null,
  }
}

/** SHA-256, hex — the same digest auth hashes a session token with.
 *
 * Restated rather than imported for the reason the MCP bridge's cookie note used
 * to give and no longer needs to: one worker does not reach into another's
 * source. Unlike the cookie name, this is not a value that can drift into being
 * WRONG — it is a named, standard algorithm, and the test that compares this
 * file with auth's own reader checks that both still name SHA-256 rather than
 * trusting that they do. */
async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")
}
