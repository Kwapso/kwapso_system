// THE INTERNAL DOORS — reached ONLY by another worker over a service binding
// (env.AUTH.fetch), never by the gateway and never from a browser. Not under
// /api/, and this worker sets workers_dev:false + preview_urls:false, so there
// is no public route to any of them.
//
// EVERY ONE FAILS CLOSED: an unset INTERNAL_KEY refuses every caller rather
// than waving them through, because a half-finished bootstrap must not run with
// the doors open.
//
// Lifted out of index.ts on 6 Sep 2026 with nothing changed but the file and the
// `export` keyword — see index.ts for why the shape moved.

import { fail, json } from "@shared/workers/http"
import { logError } from "@shared/workers/error-log"
import { requireText, optionalText, TEXT_LIMITS } from "@shared/workers/validate"

import type { Env } from "../env"
import { createPinnedSession } from "../lib/sessions"
import { sendEmail } from "../lib/email"

/** Internal (service-binding only): mint a short-lived TEAM-PINNED session for a
 * verified MCP token. The mcp worker has already verified the token hash; this
 * door re-verifies the user is an ACTIVE member of the pinned team, then mints. */
export async function internalMcpSession(request: Request, env: Env): Promise<Response> {
  // FAIL CLOSED: minting a session is the highest-blast internal door, so unlike
  // send-email it refuses outright when INTERNAL_KEY isn't configured (a fresh
  // bootstrap must set the secret BEFORE the MCP bridge can work).
  if (!env.INTERNAL_KEY || request.headers.get("x-internal-key") !== env.INTERNAL_KEY)
    return fail(403, "forbidden", "Bad internal key.")
  // Validated even though the caller proved itself with INTERNAL_KEY. This is
  // the highest-blast internal door in the product — it mints a session — and
  // "a trusted caller cannot send rubbish" is an assumption, not a guarantee.
  const body = (await request.json().catch(() => ({}))) as { userId?: unknown; teamId?: unknown }
  const userId = requireText(body.userId, "User", TEXT_LIMITS.short)
  const teamId = requireText(body.teamId, "Team", TEXT_LIMITS.short)
  const member = await env.DB.prepare(
    "SELECT id FROM team_members WHERE team_id = ? AND user_id = ? AND deactivated_at IS NULL"
  )
    .bind(teamId, userId)
    .first()
  if (!member)
    return fail(403, "not_a_member", "That account is no longer an active member of the token's team.")
  const { token } = await createPinnedSession(env, userId, teamId)
  return json({ token })
}

/** Internal (service-binding only): send a branded email composed by another
 * worker (e.g. tenancy's invite email). */
export async function internalSendEmail(request: Request, env: Env): Promise<Response> {
  // FAIL CLOSED: every internal door refuses every caller while its secret is
  // unset — a half-finished bootstrap must not run with the doors open. (This
  // used to wave callers through when INTERNAL_KEY was missing.)
  if (!env.INTERNAL_KEY || request.headers.get("x-internal-key") !== env.INTERNAL_KEY)
    return fail(403, "forbidden", "Bad internal key.")
  // Validated for the same reason internalMcpSession is (R20): the INTERNAL_KEY
  // proves the caller is a worker, not that its payload is well-formed — and
  // this door AIMS AN EMAIL from the product's verified sender.
  const m = (await request.json().catch(() => ({}))) as {
    to?: unknown
    subject?: unknown
    html?: unknown
    text?: unknown
  }
  const sent = await sendEmail(env, {
    to: requireText(m.to, "Recipient", TEXT_LIMITS.short),
    subject: requireText(m.subject, "Subject", TEXT_LIMITS.short),
    html: optionalText(m.html, "Body", TEXT_LIMITS.long) ?? "",
    text: optionalText(m.text, "Body", TEXT_LIMITS.long) ?? "",
  })
  return json({ sent })
}

/** Internal (service-binding only): record a CLIENT-side error into the central
 * error_logs table. Same defense-in-depth key as send-email; every field is
 * capped inside logError, and a bad body is simply dropped (a log endpoint must
 * never become an error source itself). */
export async function internalLogError(request: Request, env: Env): Promise<Response> {
  // FAIL CLOSED (same rule as send-email): no secret configured = no callers.
  if (!env.INTERNAL_KEY || request.headers.get("x-internal-key") !== env.INTERNAL_KEY)
    return fail(403, "forbidden", "Bad internal key.")
  const b = (await request.json().catch(() => ({}))) as {
    source?: unknown
    place?: unknown
    message?: unknown
    stack?: unknown
    url?: unknown
    userId?: unknown
    teamId?: unknown
    requestId?: unknown
  }
  // Type-checked field by field rather than put through requireText, because
  // this door DROPS rubbish instead of refusing it (R20 is satisfied by an
  // explicit runtime check, not only by the text seam). A log endpoint that
  // answers 400 teaches a broken client to report its breakage as a second
  // error — it must never become an error source itself. logError caps every
  // length; this decides every type.
  const message = typeof b.message === "string" ? b.message : ""
  if (message)
    await logError(env.DB, {
      source: typeof b.source === "string" ? b.source : "web",
      place: typeof b.place === "string" ? b.place : "unknown",
      message,
      stack: typeof b.stack === "string" ? b.stack : undefined,
      url: typeof b.url === "string" ? b.url : undefined,
      // WHO the gateway's session check named — the bucket logError's hourly
      // ceiling charges the row to, and the only reason a client beacon can be
      // bounded per person at all. It arrives from the gateway, never from the
      // browser's body; a caller who reached this door already holds INTERNAL_KEY
      // and could write anything, so there is nothing further to prove here.
      userId: typeof b.userId === "string" ? b.userId : undefined,
      // The team, off the same verified /me answer the gateway resolved the
      // userId from — never off the browser's body (same provenance rule).
      teamId: typeof b.teamId === "string" ? b.teamId : undefined,
      // The thread back to the click. Like `userId`, it arrives from the DOOR
      // (off the `x-request-id` header it stamped) and never from the browser's
      // body — a beacon that could name its own request id could staple a
      // client crash onto somebody else's trace. Type-checked here, capped in
      // logError. See shared/workers/trace.ts.
      requestId: typeof b.requestId === "string" ? b.requestId : undefined,
    })
  return new Response(null, { status: 204 })
}
