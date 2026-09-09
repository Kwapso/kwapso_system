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

/** ONE SHAPE FOR A TOKEN ON A LIST, so the three doors that answer with the list
 * cannot drift into three shapes of it. */
function summaries(rows: Awaited<ReturnType<typeof listTokens>>) {
  return rows.map((t) => ({
    id: t.id,
    label: t.label,
    teamId: t.team_id,
    createdAt: t.created_at,
    // A token expires (0016). The screen shows the deadline, so "active" on
    // this list means usable — not merely un-revoked.
    expiresAt: t.expires_at,
    lastUsedAt: t.last_used_at,
    revokedAt: t.revoked_at,
  }))
}

export async function getTokens(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env)
  return json({ tokens: summaries(await listTokens(env, user.id)) })
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
    // …AND THE LIST IT NOW BELONGS TO. The screen used to create a token and
    // then ask for the whole list back — two sequential round trips to learn
    // something this door already knew, which is the same shape
    // `saveRolePermissions` had until 6 Sep 2026. The rows are already in hand.
    tokens: summaries(await listTokens(env, user.id)),
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
  // The list AFTER the revocation, for the same reason the create door answers
  // with it: the screen's next act was always to ask for exactly this.
  return json({ ok: true, tokens: summaries(await listTokens(env, user.id)) })
}
