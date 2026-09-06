// kwapso MCP worker — the external machine surface (ARCHITECTURE: the MCP front
// desk). This file is the SWITCHBOARD:
//
//   POST /mcp                    -> the MCP endpoint (JSON-RPC 2.0 over HTTP):
//                                   initialize · tools/list · tools/call.
//                                   Auth: `Authorization: Bearer <token>` — a
//                                   personal access token, verified on EVERY
//                                   request, bridged to a team-pinned session.
//
// THIS SURFACE IS THE AGENCY'S, not its clients'. A client-portal login is an
// ordinary team member by construction, so "signed in" never distinguished them
// — both doors that hand out power (minting a token, and acting with one) ask
// tenancy which kind of caller this is first. See lib/staff.ts.
//   GET  /api/mcp/tokens         -> the signed-in caller's tokens (never hashes)
//   POST /api/mcp/tokens         -> create one (label; pinned to the CURRENT team;
//                                   the secret is returned ONCE)
//   POST /api/mcp/tokens/revoke  -> revoke one of the caller's own tokens
//   GET  /api/mcp/health
//
// THE LIVE-SYNC SEAM (CACHING.md "Every mutation publishes"): the token routes are
// housekeeping — a token row is CALLER-PRIVATE bookkeeping in the core DB (the
// settings screen refetches synchronously after each action; no other member can
// see it), the same reviewed class as auth's session rows. Tool calls themselves
// mutate nothing here — the REAL doors they forward to publish their own pings.
//
// WHY THERE IS A ROUTES TABLE HERE NOW (6 Sep 2026). This worker used to route
// with a `switch (route)` and keep its handlers in this file. Nothing was wrong
// with the routing; what was wrong is that the two laws every other worker is
// held to — R1 (every mutation publishes) and R10 (every write gates) — are
// enforced by a scanner that walks a ROUTES table and a routes/ directory, so
// this surface could only be checked by a private regex that parsed its own
// switch. A private copy of a security check is one check and one thing that
// looks like it. Same doors, same order, same behaviour; the shape is now the
// one the seam suites can read.

import { fail, json } from "@shared/workers/http"
import { healthBody } from "@shared/workers/config-health"
import { GuardError } from "@shared/workers/gating"
import { recordWorkerError } from "@shared/workers/error-log"
import { requestId } from "@shared/workers/trace"
import { beginRequest, logIfSlow, withTiming } from "@shared/workers/timing"
import { afterResponse, canDefer } from "@shared/workers/parallel"
import type { Env } from "./env"
import { handleMcp } from "./routes/mcp"
import { getTokens, postToken, postRevoke } from "./routes/tokens"

/**
 * Every door on this worker, tagged with the class it answers to.
 *
 *   • "read"        — a GET; changes nothing, broadcasts nothing.
 *   • "mutation"    — a write other clients can see, so it MUST broadcast a ping.
 *   • "housekeeping" — the reviewed deny-list: a write that intentionally
 *                      broadcasts NOTHING.
 *
 * THIS WORKER HAS NO MUTATIONS, and that is a statement rather than an
 * oversight. `POST /mcp` writes nothing here at all: it forwards a tool call to
 * a REAL door on content or tenancy, and that door gates, writes and publishes
 * its own ping on the way through. The two token writes change a row only the
 * caller can ever see, in the core DB, on a screen that refetches synchronously
 * — the same reviewed class as auth's session rows (CLAUDE.md, R1's exceptions).
 */
type RouteKind = "read" | "mutation" | "housekeeping"
type Handler = (request: Request, env: Env) => Promise<Response>
export const ROUTES: Record<string, { handler: Handler; kind: RouteKind }> = {
  // The machine surface itself. Housekeeping: it publishes nothing because it
  // writes nothing — every write it causes happens behind a gated door that
  // publishes for itself.
  "POST /mcp": { handler: handleMcp, kind: "housekeeping" },
  "GET /api/mcp/tokens": { handler: getTokens, kind: "read" },
  // Caller-private token rows: see the note on this table.
  "POST /api/mcp/tokens": { handler: postToken, kind: "housekeeping" },
  "POST /api/mcp/tokens/revoke": { handler: postRevoke, kind: "housekeeping" },
}

export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url)
    const route = `${request.method} ${pathname}`
    // The wall clock starts here — see timing.ts. The MCP surface emitted no
    // timing at all until 5 Sep 2026, which meant the one surface an OUTSIDE
    // developer measures us by was the one we could not measure ourselves.
    beginRequest(request)
    // …and this request's own lifetime, so work the caller does not need can
    // outlive the answer instead of delaying it (shared/workers/parallel.ts).
    canDefer(request, ctx)
    try {
      // What this worker cannot work without, answered by NAME (config-health.ts).
      // Outside the table for the same reason data-ops keeps its health door
      // outside: a probe that must answer while a binding is missing cannot be
      // dispatched through machinery that depends on those bindings.
      if (route === "GET /api/mcp/health")
        return json(healthBody("mcp", env, ["DB", "AUTH", "CONTENT", "TENANCY", "INTERNAL_KEY"]))
      const def = ROUTES[route]
      if (!def) return fail(404, "not_found", "No such MCP action.")
      const res = await def.handler(request, env)
      // The route's OWN tag decides which budget it answers to (limits.ts) —
      // one place a route's class is declared, and the measurement follows it.
      // Before the table, the METHOD decided, which put `POST /mcp` and a token
      // revoke on the same budget though one carries a whole tool call.
      logIfSlow(request, route, def.kind, env.DB)
      return withTiming(request, res, def.kind)
    } catch (e) {
      if (e instanceof GuardError) return fail(e.status, e.code, e.message)
      // THE CONSOLE LINE CARRIES THE SAME NAME AS THE ROW. Sixty-eight
      // `console.*` sites in this codebase and not one of them named a request,
      // which made the live tail and `error_logs` two stores with no join between
      // them: `db/core/0020` exists to let one failing click be one query, and the
      // half a developer actually watches could not be filtered by it. This is the
      // highest-traffic of those sites — every unexpected crash in the worker
      // passes through it — so it is the one worth the two extra fields.
      console.error(`mcp worker error:`, requestId(request), `${request.method} ${new URL(request.url).pathname}`, e)
      afterResponse(request, recordWorkerError(env.DB, "mcp", `${request.method} ${pathname}`, e, requestId(request)))
      return fail(500, "internal", "Something went wrong on our side. Try again.")
    }
  },
} satisfies ExportedHandler<Env>
