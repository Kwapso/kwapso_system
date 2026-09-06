// TOKEN MANAGEMENT — the three doors the SETTINGS SCREEN uses, never a bearer
// token itself. See routes/mcp.ts for why these are exported functions in a
// routes/ folder rather than arms of a switch.

import { fail, json } from "@shared/workers/http"
import { GuardError, whoAmI } from "@shared/workers/gating"
import { requireText, TEXT_LIMITS } from "@shared/workers/validate"
import { requestId } from "@shared/workers/trace"

import type { Env } from "../env"
import { createToken, listTokens, revokeToken } from "../lib/tokens"
import { dropCachedSession } from "../lib/bridge"
import { requireStaff } from "../lib/staff"

/** The signed-in caller (session cookie via the gateway) — token management is a
 * HUMAN action from the app, never available to a bearer token itself. */
export async function requireUser(request: Request, env: Env) {
  const user = await whoAmI(request, env)
  if (!user) throw new GuardError(401, "signed_out", "Not signed in.")
  return user
}

export async function getTokens(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env)
  const rows = await listTokens(env, user.id)
  return json({
    tokens: rows.map((t) => ({
      id: t.id,
      label: t.label,
      teamId: t.team_id,
      createdAt: t.created_at,
      // A token expires (0016). The screen shows the deadline, so "active" on
      // this list means usable — not merely un-revoked.
      expiresAt: t.expires_at,
      lastUsedAt: t.last_used_at,
      revokedAt: t.revoked_at,
    })),
  })
}

export async function postToken(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env)
  if (!user.currentTeamId)
    return fail(409, "no_team", "Pick a team first, a token is pinned to one team.")
  // A CLIENT LOGIN MINTS NOTHING. They are a team member by construction, so
  // "signed in" was never the question — see lib/staff.ts. Asked with the
  // caller's OWN cookie, before the label is even read.
  await requireStaff(env, request.headers.get("Cookie") ?? "", requestId(request))
  const body = (await request.json().catch(() => ({}))) as { label?: unknown }
  const label = requireText(body.label, "Name", TEXT_LIMITS.short)
  const { row, secret } = await createToken(env, user.id, user.currentTeamId, label)
  // The ONE time the secret leaves the server.
  return json({
    token: {
      id: row.id,
      label: row.label,
      teamId: row.team_id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    },
    secret,
  })
}

export async function postRevoke(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env)
  // R20, properly. This used to be a cast plus `if (!body.id)` — the two shapes
  // the law names as NOT checks. A truthiness guard passes `{}`, `[]` and `1`,
  // and an object then reaches D1's `.bind()` in revokeToken, which raises a type
  // error: a 500 and a global error_logs row, per request, from any session. The
  // RAW_BODY_EXEMPT line that covered this said "an unrecognised value refuses
  // rather than reaching anything", which was true of a wrong STRING and false of
  // a wrong TYPE — the distinction the law exists for.
  const body = (await request.json().catch(() => ({}))) as { id?: unknown }
  const id = requireText(body.id, "Token", TEXT_LIMITS.short)
  await revokeToken(env, user.id, id)
  dropCachedSession(id)
  return json({ ok: true })
}
