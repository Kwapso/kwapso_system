// kwapso GATEWAY — the one front door. Serves the app's screens (static
// assets), uploaded media from R2, and passes every /api request to the right
// worker behind it. Same address for screens and brains = login cookies just
// work everywhere. This is also where the MCP front desk will live.

// The four things BOTH front doors do identically — refuse a write another site
// started, serve an uploaded file (with its key validated at the boundary and its
// security headers), record a client crash, and answer their own crash without
// leaking a raw 1101. One implementation, so a hardening change cannot reach one
// door and miss the other.
import {
  recordClientError,
  recordGatewayCrash,
  refuseForeignOrigin,
  serveMedia,
  isRead,
} from "@shared/workers/front-door"
import { isMaintenancePath, maintenanceCaller } from "@shared/workers/gating"
import { fail } from "@shared/workers/http"
import { requestId, stampTrace } from "@shared/workers/trace"
import { stampOrigin } from "@shared/workers/origin"

/** The top-level module pages that are CLIENT-RESOLVED SHELLS: /stories is a real
 * static file, but /stories/<id> is the same shell with the id read off
 * window.location, so any depth under one of these must be served the module's
 * own shell instead of the 404 page.
 *
 * IT IS EXPORTED BECAUSE IT IS HALF A CONTRACT. The other half is
 * `assets.run_worker_first` in wrangler.jsonc: that field is an ARRAY, and an
 * array means every path NOT listed skips this Worker entirely and is answered by
 * the asset layer. So a module named here but missing there never reaches the
 * loop below — the asset layer 404s /tickets/<id> before we see it, which is
 * exactly what a tester hit when they shared a ticket link. The list stood at two
 * prefixes, one of them a `/help/*` that is not even a URL segment in this app,
 * while this loop had grown to fifteen modules. test/shell-routing.test.ts reads
 * both off disk and holds them together. */
export const SHELL_MODULES = [
  "accounts", "contacts", "tickets", "knowledge", "processes",
  // THE WORK ENGINE'S FOUR. `work` became `stories` when the sprints moved
  // out to a page of their own — the segment follows the heading, because a
  // URL that disagrees with the title on the page is a cost paid for ever.
  "stories", "sprints", "waves", "apps", "tasks",
  // TIME — the destination a work log never had. No records of its own (a
  // row of time is only ever read in a list of its neighbours), but it is
  // forwarded like the rest so the shell survives a reload at any depth.
  "time",
  // Meetings. A sidebar page with records of its own, so it needs the shell
  // at every depth for the same reason the four above it do.
  "meetings",
  // The agency's own housekeeping. `purposes` is here even though it is a
  // CONTEXTUAL section rather than a sidebar one: it still has records with
  // their own URLs, and a deep link that 404s on reload is a deep link whether
  // or not the nav rail offers it. `processes` above is here for exactly the
  // same reason, and became contextual on the same day.
  "brand", "purposes",
]

type Env = {
  ASSETS: Fetcher
  AUTH: Fetcher
  TENANCY: Fetcher
  REALTIME: Fetcher
  CONTENT: Fetcher
  DATAOPS: Fetcher
  MCP: Fetcher
  MEDIA: R2Bucket
  LEARNING_MEDIA: R2Bucket
  /** the agency's own files — brand assets, staff photos, certificate PDFs. */
  INTERNAL_MEDIA: R2Bucket
  /** shared secret for auth's /internal/* doors (same value as auth/tenancy/content). */
  INTERNAL_KEY?: string
  /** THE MAINTENANCE DOORS' OWN SPEED LIMIT — see `guardMaintenance` below.
   *
   * OPTIONAL for the reason every limiter binding here is optional
   * (shared/workers/rate-limit.ts): an environment without it behaves exactly as
   * this door did before the limiter existed, which is what makes the binding
   * safe to add after the code that reads it. */
  MAINTENANCE_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> }
}

/** HOW MANY MAINTENANCE CALLS ONE ADDRESS MAY MAKE A MINUTE.
 *
 * Sized off what the doors are actually FOR, not off a feeling. Every caller in
 * the estate is a runbook or a script making a handful of calls: BOOTSTRAP.md
 * makes two, OPERATIONS.md's error-log read is one, and the three seed/smoke
 * scripts make one `create-team` each. Twelve a minute is several times the
 * busiest real use and is five orders of magnitude below what an unthrottled
 * door offers a guesser.
 *
 * The number lives here rather than in shared/workers/limits.ts because it is a
 * property of THIS door — the only door in the product with no session behind
 * it — and limits.ts is owned by every worker at once. */
const MAINTENANCE_CALLS_PER_MINUTE = 12

export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    // THE NAME IS GIVEN HERE, at the door, once — this is the only place on the
    // agency side that knows a request has begun. Everything below forwards it,
    // and every worker behind it re-reads the same id instead of minting its
    // own, so one failing click is one query in `error_logs` rather than eight
    // rows nobody can line up. See shared/workers/trace.ts.
    // …AND THE SURFACE IS GIVEN HERE TOO, at the same door and for the same
    // reason (shared/workers/origin.ts). Four surfaces act as the same person
    // through the same gated doors, so the activity row could not say which one
    // did — and this is the only place on the agency side that knows. It SETS
    // rather than merges: whatever a browser put in the header is replaced
    // before any worker behind this reads it.
    const traced = stampOrigin(stampTrace(request, requestId(request)), "app")
    try {
      return await handle(traced, env, ctx)
    } catch (e) {
      return recordGatewayCrash(traced, env.AUTH, "gateway", env.INTERNAL_KEY, e)
    }
  },
} satisfies ExportedHandler<Env>

/** `ctx` is threaded down for TWO reasons now: the media doors write the object
 * they just served into the colo's cache, and the maintenance throttle writes
 * its refusal into the error store — both riding the request's own lifetime
 * rather than delaying the answer. Optional, so a test that calls the door with
 * two arguments still exercises exactly the path it always did (the throttle
 * awaits its record instead, so nothing is silently dropped in a test). */
async function handle(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url)

    // CROSS-SITE WRITES DIE HERE, in front of every forward below — the session
    // cookie is SameSite=Lax, and "site" is kwapso.app, which we share with a
    // third-party app on portal.kwapso.app. See refuseForeignOrigin: a browser
    // always announces itself on a non-GET, and a script never does.
    const foreign = refuseForeignOrigin(request)
    if (foreign) return foreign

    // THE MAINTENANCE DOORS ARE PUBLISHED HERE, SO THEY ARE THROTTLED HERE.
    // In front of every forward below, for the same reason the CSRF check is.
    const tooMany = await guardMaintenance(request, env, pathname, ctx)
    if (tooMany) return tooMany

    if (pathname.startsWith("/api/auth/")) return env.AUTH.fetch(request)
    if (pathname.startsWith("/api/tenancy/")) return env.TENANCY.fetch(request)
    // Content modules (Learning, Tickets) and data-ops (import + the AI agent).
    if (pathname.startsWith("/api/content/")) return env.CONTENT.fetch(request)
    if (pathname.startsWith("/api/data-ops/")) return env.DATAOPS.fetch(request)
    // The MCP front desk: token management (session-gated) + the MCP endpoint
    // itself (bearer-token-gated JSON-RPC) — ARCHITECTURE "gateway / MCP".
    if (pathname.startsWith("/api/mcp/")) return env.MCP.fetch(request)
    if (pathname === "/mcp") return env.MCP.fetch(request)
    // Live channels (WebSocket upgrade + health) → the realtime switchboard.
    if (pathname.startsWith("/api/realtime")) return env.REALTIME.fetch(request)

    // Client error beacon → console + the central error_logs table (the shared
    // seam does the session verification; see shared/workers/front-door.ts).
    if (pathname === "/api/log/client" && request.method === "POST")
      return recordClientError(request, env.AUTH, "web", env.INTERNAL_KEY)

    if (pathname.startsWith("/api/")) {
      return fail(404, "not_found", "No such API.")
    }

    // A RANGE, IF THEY ASKED FOR ONE. Read once for all three buckets below: an
    // attachment may be a 25 MB video, and without this a player's seek re-fetched
    // the whole object from byte zero. serveMedia decides what a range means; this
    // only hands it the header.
    const range = request.headers.get("Range")

    // THE COLO'S OWN COPY OF AN UPLOADED FILE. `Cache-Control: …immutable` has
    // been on these responses from the start and reached one browser each: a
    // Worker-BUILT response does not enter Cloudflare's cache unless it is put
    // there. Passed as a pair — the request to key on, and this request's own
    // lifetime to finish the write in — and absent when the runtime hands us no
    // `ctx`, in which case serveMedia simply does what it always did.
    const edge = ctx ? { request, waitUntil: (w: Promise<unknown>) => ctx.waitUntil(w) } : undefined

    // ── Uploaded media: a CAPABILITY URL, on purpose ───────────────────────
    // No session, no membership check — a recorded, deliberate decision whose
    // reasoning (and the fork warning that goes with it) lives on serveMedia in
    // shared/workers/front-door.ts, which also validates the key at the boundary.

    // THE BYTES THAT OUTLIVED THEIR MODULE. Learning was purged on 17 Aug 2026,
    // but its 41 articles had already been indexed into the knowledge base and
    // their bodies still name the images and clips that were uploaded with them.
    // Nothing writes to this bucket any more — the upload doors went with the
    // module — and this route stays so that what was written before it can still
    // be read. Same serving shape as /media/* below; just a different bucket,
    // matched first since it's a more specific prefix.
    if (pathname.startsWith("/media/learning/") && isRead(request.method))
      return serveMedia(env.LEARNING_MEDIA, pathname, "/media/learning/", range, request.method, edge)

    // The agency's own files — brand assets, staff photos, certificate PDFs.
    // Its own bucket, matched before the generic prefix for the same reason the
    // one above is: a more specific prefix has to win, or every internal URL
    // would be looked up in the wrong bucket and 404.
    //
    // ON THE AGENCY DOOR ONLY. The client portal serves no /media/internal/ path
    // at all, so a capability URL that leaked into a client's hands would have
    // nowhere to be redeemed — which is the same shape as the API refusal one
    // layer up, said in routing instead of in a gate.
    if (pathname.startsWith("/media/internal/") && isRead(request.method))
      return serveMedia(env.INTERNAL_MEDIA, pathname, "/media/internal/", range, request.method, edge)

    // Uploaded files (profile photos, team logos). URLs carry ?v= for cache
    // busting, so the file itself can be cached hard.
    if (pathname.startsWith("/media/") && isRead(request.method))
      return serveMedia(env.MEDIA, pathname, "/media/", range, request.method, edge)

    // Deep-link tree: /t/<teamId>/<module>/<id>/… is ONE client-resolved screen.
    // Static export emits a single shell (t.html), so serve it for ANY /t/* depth
    // (the browser keeps the real URL; web/app/t/[[...path]] parses it client-side
    // and re-checks permissions — see SCREEN-ENGINE-PLAN §10). Without this, an
    // unknown /t/* path would hit the 404 page.
    if (pathname.startsWith("/t/")) {
      // Fetch the CLEAN path (/t), not /t.html — Static Assets canonicalizes
      // .html → clean URL with a 307, which would otherwise leak to the client.
      const shell = new URL(request.url)
      shell.pathname = "/t"
      return env.ASSETS.fetch(new Request(shell, request))
    }

    // Top-level module pages (/accounts, /tickets, /knowledge) are ALSO client-resolved
    // deep-link shells (their own clean URLs, active team from context). Serve the
    // module's shell for any sub-path (e.g. /accounts/<id>); the bare /accounts is a
    // real static file served below.
    for (const mod of SHELL_MODULES) {
      if (pathname.startsWith(`/${mod}/`)) {
        const shell = new URL(request.url)
        shell.pathname = `/${mod}`
        return env.ASSETS.fetch(new Request(shell, request))
      }
    }

    // Static screens/assets. Long-cache headers for the content-hashed
    // /_next/static/** files are set in web/public/_headers — Workers Static
    // Assets serves matching files BEFORE this Worker runs, so per-asset headers
    // must live in _headers, not here.
    return env.ASSETS.fetch(request)
}

/**
 * A SPEED LIMIT ON THE MAINTENANCE DOORS, AND A RECORD OF WHO TRIED.
 *
 * IT LIVES BELOW `handle`, AND THAT IS LOAD-BEARING. `cross-site.test.ts` proves
 * the CSRF check runs before anything is forwarded by reading SOURCE POSITION —
 * the offset of `refuseForeignOrigin` against the first `env.<X>.fetch(` in the
 * file — because it cannot run the worker to find out. `recordMaintenanceRefusal`
 * below contains an `env.AUTH.fetch(`, so with this block above `handle` the law
 * went red on a file whose runtime order was never wrong. Declarations hoist, so
 * the position costs nothing and the check keeps its meaning. Do not move it up.
 *
 * WHY IT IS HERE AND NOT IN `adminGuard`. The exposure is created by this file:
 * `/api/tenancy/*` and `/api/data-ops/*` are forwarded BY PREFIX, so the eight
 * `x-admin-key` doors — which roll DDL across every team database, seed tenants,
 * relocate a module, and read the whole cross-tenant error log with its stack
 * traces — answer on the public internet. `adminGuard` was the entire gate: two
 * lines, no throttle, no lockout, and no record that anybody had ever tried. An
 * attacker could guess the key at whatever rate Cloudflare allows, for ever,
 * uncounted and unlogged, and the only thing bounding the damage was a secret
 * the code cannot inspect.
 *
 * THE OWNER CHOSE THIS SHAPE over moving the doors to their own hostname: 16
 * scripts and 10 documents call them at the public address (BOOTSTRAP.md,
 * OPERATIONS.md, BUILD-A-MODULE.md, seed-staging, smoke-staging,
 * verify-virtual-rows…), so moving them breaks the documented way to stand the
 * product up — and a control that breaks the ordinary path is a control someone
 * switches off.
 *
 * IT CHARGES EVERY MAINTENANCE CALL, not only the failures. Cloudflare's limiter
 * checks and consumes in one call, so "only charge a wrong key" would mean
 * refusing the request AFTER the budget was already blown — a beat too late.
 * Charging every call is simpler and costs the honest caller nothing at twelve a
 * minute (see the constant: the busiest real runbook makes two).
 *
 * KEYED ON THE ADDRESS, which is all a door with no session has. A caller who
 * sends no `CF-Connecting-IP` lands in the shared "unknown" bucket — the worst
 * bucket to be in, never an exemption — the same fail-toward-refusing bargain
 * auth's login-code ledger already makes.
 *
 * FAILS OPEN IF THE LIMITER IS ABSENT OR UNWELL, and the reasoning is
 * rate-limit.ts's, unchanged: a broken safety valve must not become an outage,
 * and an environment without the binding behaves exactly as this door did
 * before. What does NOT fail open is the key itself — `adminGuard` still
 * refuses, and still refuses outright when no key is configured.
 *
 * AND IT WRITES THE ATTEMPT DOWN. A throttle without a record turns a loud
 * attack into a quiet one: the guesser is slowed and nobody ever learns it
 * happened. Every refusal goes to the central error store through the same
 * internal pipe the crash reporter uses — where `logError` is already capped per
 * bucket per hour, so the record of a flood cannot itself become the flood, and
 * where it never throws and never changes the response. It rides `waitUntil`
 * when there is a context, so the refusal is not held up by its own bookkeeping.
 */
async function guardMaintenance(
  request: Request,
  env: Env,
  pathname: string,
  ctx?: ExecutionContext
): Promise<Response | null> {
  if (!isMaintenancePath(pathname)) return null
  const limiter = env.MAINTENANCE_LIMIT
  if (!limiter) return null // not configured: today's behaviour, exactly
  const caller = maintenanceCaller(request)
  let allowed: boolean
  try {
    allowed = (await limiter.limit({ key: `maintenance:${caller}` })).success
  } catch (e) {
    console.error(
      `maintenance limiter unavailable, request allowed through (fail open): ${e instanceof Error ? e.message : String(e)}`
    )
    return null
  }
  if (allowed) return null

  const note = recordMaintenanceRefusal(env, caller, request.method, pathname)
  if (ctx) ctx.waitUntil(note)
  else await note
  return fail(
    429,
    "too_many_requests",
    `That's more than ${MAINTENANCE_CALLS_PER_MINUTE} maintenance calls in a minute from one address. Wait a minute and try again.`
  )
}

/** The attempt, in the one store that outlives a log tail.
 *
 * Best-effort by contract, like every other write through this pipe: a door that
 * cannot report is still a door that must answer. The IP is the whole point of
 * the row — "somebody at 203.0.113.9 hit the maintenance doors 400 times" is the
 * sentence nobody could have written before — and it is the only caller
 * identifier there is, because these doors carry no session. */
async function recordMaintenanceRefusal(
  env: Env,
  caller: string,
  method: string,
  pathname: string
): Promise<void> {
  await env.AUTH.fetch("https://internal/internal/log-error", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": env.INTERNAL_KEY ?? "" },
    body: JSON.stringify({
      source: "gateway",
      place: `${method} ${pathname}`,
      message: `maintenance door throttled: ${caller} exceeded ${MAINTENANCE_CALLS_PER_MINUTE} calls a minute. Repeated rows here are somebody guessing the maintenance key — rotate ADMIN_KEY and check the address.`,
    }),
  }).catch(() => null)
}
