// kwapso AUTH worker — every login-related action lives here, each as its own
// small handler under routes/ (these become MCP-catalogued actions via the
// gateway later).
//
//   POST /api/auth/email/start          { email }        -> sends a 6-digit code
//   POST /api/auth/email/verify         { email, code }  -> logs in (sets cookie)
//   GET  /api/auth/google/start                          -> bounce to Google
//   GET  /api/auth/google/callback                       -> back from Google, logs in
//   POST /api/auth/email/change/start   { email }        -> code to the NEW email
//   POST /api/auth/email/change/verify  { email, code }  -> switch email + log it
//   GET  /api/auth/me                                    -> who am I?
//   GET  /api/auth/activity                              -> my account history (name/photo/email)
//   POST /api/auth/logout                                -> forget me
//   GET  /api/auth/health                                -> is this worker alive?
//
// WHY THERE IS A ROUTES TABLE HERE NOW (6 Sep 2026). This worker routed with a
// `switch (route)` and kept eighteen handlers in this one file, and its siblings
// have not for a long time. The cost was not readability — it was that R1 (every
// mutation publishes) and R10 (every write gates) are enforced by a scanner that
// walks a ROUTES table and a routes/ directory, so auth was the ONE worker with
// neither a publish-seam suite nor a gating-seam one. Two load-bearing laws were
// enforced on six workers out of eight, and the two they missed are the surface
// every request in the product passes through and the machine surface in front
// of it. Same doors, same order, same behaviour; the shape is now the one the
// seam suites can read, and both suites now exist.
//
// AUTH'S GATES ARE A DIFFERENT KIND OF QUESTION, which is why its gating-seam
// suite passes its own vocabulary to the shared scanner rather than the domain
// workers' `requireRight`. Three classes, each named in that suite with its
// reason: the sign-in doors, which run BEFORE any caller exists and are held by
// throttles; the internal doors, which are held by a fail-closed INTERNAL_KEY
// over a service binding; and everything else, which is identity-gated on the
// caller's own session.

import { fail, json } from "@shared/workers/http"
import { healthBody } from "@shared/workers/config-health"
import { GuardError, identityFor } from "@shared/workers/gating"
import { recordWorkerError } from "@shared/workers/error-log"
import { requestId } from "@shared/workers/trace"
import { beginRequest, countedDb, logIfSlow, withTiming } from "@shared/workers/timing"
import { afterResponse, canDefer, deferrerFor } from "@shared/workers/parallel"
import type { Env } from "./env"
import { internalLogError, internalMcpSession, internalSendEmail } from "./routes/internal"
import {
  adminTestLogin,
  emailChangeStart,
  emailChangeVerify,
  emailStart,
  emailVerify,
} from "./routes/sign-in"
import { googleCallback, googleStart } from "./routes/google"
import { activity, language, logout, me, profile, scale, spine } from "./routes/me"

/**
 * Every door on this worker, tagged with the class it answers to.
 *
 *   • "read"        — a GET; changes nothing, broadcasts nothing.
 *   • "mutation"    — a write other clients can see, so it MUST broadcast a ping.
 *   • "housekeeping" — the reviewed deny-list: a write that intentionally
 *                      broadcasts NOTHING.
 *
 * THIS WORKER HAS NO MUTATIONS, and CLAUDE.md has said so for a year without
 * anything checking it ("auth's user-channel publishes … are the reviewed
 * exceptions"). Every write here changes the CALLER'S OWN identity — their
 * session, their address, their display name, their language — and the one
 * broadcast that matters, a profile change reaching the caller's other tabs,
 * goes out on the USER channel from lib/profile.ts rather than a team one.
 * There is no team row here to tell a team about.
 */
type RouteKind = "read" | "mutation" | "housekeeping"
type Handler = (request: Request, env: Env) => Promise<Response>
export const ROUTES: Record<string, { handler: Handler; kind: RouteKind }> = {
  // ── the front of the building: no caller exists yet ────────────────────────
  "POST /api/auth/email/start": { handler: emailStart, kind: "housekeeping" },
  "POST /api/auth/email/verify": { handler: emailVerify, kind: "housekeeping" },
  // "Continue with Google" — the SECOND way to prove the SAME identity, never a
  // second identity. Both halves are GET because Google's flow is a browser
  // redirect: see lib/google.ts.
  "GET /api/auth/google/start": { handler: googleStart, kind: "read" },
  "GET /api/auth/google/callback": { handler: googleCallback, kind: "read" },
  // NON-PRODUCTION test door (its OWN TEST_LOGIN_KEY secret, fails closed, and
  // refused outright when ENVIRONMENT is "production"): mints a normal login
  // code and returns it ONCE, so automated tests can sign in without any code
  // ever being echoed by the real send door.
  "POST /api/auth/admin/test-login": { handler: adminTestLogin, kind: "housekeeping" },

  // ── the caller's own identity ──────────────────────────────────────────────
  "POST /api/auth/email/change/start": { handler: emailChangeStart, kind: "housekeeping" },
  "POST /api/auth/email/change/verify": { handler: emailChangeVerify, kind: "housekeeping" },
  "GET /api/auth/me": { handler: me, kind: "read" },
  "GET /api/auth/activity": { handler: activity, kind: "read" },
  "POST /api/auth/profile": { handler: profile, kind: "housekeeping" },
  "POST /api/auth/language": { handler: language, kind: "housekeeping" },
  "POST /api/auth/scale": { handler: scale, kind: "housekeeping" },
  "POST /api/auth/spine": { handler: spine, kind: "housekeeping" },
  "POST /api/auth/logout": { handler: logout, kind: "housekeeping" },

  // ── internal: service binding only, never routed publicly ──────────────────
  // Other workers send branded emails THROUGH auth (it owns the Resend key).
  "POST /internal/send-email": { handler: internalSendEmail, kind: "housekeeping" },
  // The gateway forwards CLIENT error beacons here so web errors land in the
  // same central error_logs table the workers write to.
  "POST /internal/log-error": { handler: internalLogError, kind: "housekeeping" },
  // The mcp worker bridges a verified personal access token to a short-lived
  // session PINNED to the token's team (ARCHITECTURE: the MCP front desk).
  "POST /internal/mcp-session": { handler: internalMcpSession, kind: "housekeeping" },
}

export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url)
    const route = `${request.method} ${pathname}`
    beginRequest(request)
    // …and this request's own lifetime, so work the caller does not need can
    // outlive the answer instead of delaying it (shared/workers/parallel.ts).
    canDefer(request, ctx)

    try {
      // What this worker cannot work without, answered by NAME (config-health.ts).
      // Outside the table on purpose, like data-ops's and mcp's: a probe that
      // must answer while a binding is missing cannot be dispatched through
      // machinery that depends on those bindings.
      if (route === "GET /api/auth/health")
        return json(healthBody("auth", env, ["DB", "RESEND_API_KEY", "INTERNAL_KEY"]))
      const def = ROUTES[route]
      if (!def) return fail(404, "not_found", "No such auth action.")
      // Measured on the way out (timing.ts), and this worker in particular:
      // EVERY request in the product passes through auth to have its session
      // verified, and until 5 Sep 2026 auth emitted no timing at all. The 24 Aug
      // reading put `/api/auth/me` at ~280ms against a ~90ms transport floor, so
      // ~190ms of every request in the app was session work with no shape to it.
      // The route's OWN tag now decides which budget it answers to; before the
      // table there was no kind to read, so the METHOD had to stand in for it.
      // A per-request copy carrying this request's deferrer, exactly as the
      // sibling workers do — auth publishes on the USER channel (a profile edit,
      // an email change, a forced sign-out), and those pings held the response
      // for the same reason every other one did.
      // …and this request's NAME, so a user-channel ping that did not go out
      // leaves a row that joins the click that caused it (trace.ts).
      // …and the CORE database counted, so the slow-door line below can see the
      // trips this worker actually makes. `beginD1Timing` only ever saw the D1
      // REST door, so a native `env.DB` statement was invisible and a worker that
      // makes nothing but those printed "0 D1 trips" (timing.ts, `countedDb`).
      const res = await def.handler(request, { ...env, DEFER: deferrerFor(request), TRACE: requestId(request), DB: countedDb(request, env.DB) })
      logIfSlow(request, route, def.kind, env.DB)
      return withTiming(request, res, def.kind)
    } catch (e) {
      // A refusal is an ANSWER, not a crash. Every sibling worker maps this
      // first; auth did not, so the moment its handlers started validating,
      // every intended 400 would have become a 500 — and a 500 on the
      // unauthenticated sign-in door writes a row to the GLOBAL core database
      // per request. The two changes only make sense together.
      if (e instanceof GuardError) {
        // A REFUSAL THAT KNOWS WHY IS NOT AN ORDINARY 4xx (gating.ts `detail`):
        // the caller's answer is unchanged and the cause stops being console-only.
        // The same branch every sibling worker carries — auth's was the odd one
        // out, so a diagnosed refusal on a sign-in door recorded nothing.
        if (e.detail)
          await recordWorkerError(env.DB, "auth", `${request.method} ${new URL(request.url).pathname}`, e, requestId(request), identityFor(request))
        return fail(e.status, e.code, e.message)
      }
      // THE CONSOLE LINE CARRIES THE SAME NAME AS THE ROW. Sixty-eight
      // `console.*` sites in this codebase and not one of them named a request,
      // which made the live tail and `error_logs` two stores with no join between
      // them: `db/core/0020` exists to let one failing click be one query, and the
      // half a developer actually watches could not be filtered by it. This is the
      // highest-traffic of those sites — every unexpected crash in the worker
      // passes through it — so it is the one worth the two extra fields.
      console.error(`auth worker error:`, requestId(request), `${request.method} ${new URL(request.url).pathname}`, e)
      // Record the crash in the central error log (core DB) — best-effort, and
      // now literally "never blocks the response": it rides `waitUntil`, so the
      // 500 goes out while the row is written and the row is still guaranteed to
      // land. Clean GuardError refusals never reach here. WHOSE crash it was is
      // read off the request (`noteIdentity` in lib/sessions.ts, the moment the
      // session row resolves) — the same WeakMap `teamContext` fills elsewhere.
      afterResponse(request, recordWorkerError(env.DB, "auth", `${request.method} ${new URL(request.url).pathname}`, e, requestId(request), identityFor(request)))
      return fail(500, "internal", "Something went wrong on our side. Try again.")
    }
  },
} satisfies ExportedHandler<Env>
