// Everything the tenancy worker is given from outside.
export type Env = {
  /** THIS REQUEST'S DEFERRER, set by the dispatcher on a per-request shallow
   * copy of this env — how `publishChange` stops holding the response (owner's
   * ruling, 6 Sep 2026). The reasoning, the provenance and why it cannot live on
   * the shared `env` itself are all in shared/workers/parallel.ts.
   *
   * Optional because a cron tick and the test suites have no request to hang
   * work on; absent means the ping is awaited exactly as it was before. */
  DEFER?: (work: Promise<unknown>) => void
  /** THIS REQUEST'S NAME, set on the same per-request shallow copy — the id the
   * public door minted, re-read off the `x-request-id` header and never minted
   * again (shared/workers/trace.ts). `publishChange` and `sendBrandedEmail` read
   * it off `env` and put it on the failure rows they write, so a live-layer ping
   * or an email that did not go out joins the click that ordered it. Nothing
   * else reads it, and nothing gates on it.
   *
   * On the env rather than in the signature for the same reason `DEFER` is:
   * neither seam takes a `Request`, and 190 call sites already pass `env` (186
   * publish + 4 mail, counted 7 Sep 2026).
   *
   * Optional because a cron tick has no request — it puts the TICK's id here
   * instead (`tickId`) — and the suites hand a bare `env`; absent means the row
   * lands exactly as it did before, with nothing to join on. */
  TRACE?: string

  /** The global core database (users, teams, team_members, invite_index). */
  DB: D1Database
  /** The auth worker — used to answer "who is making this request?". */
  AUTH: Fetcher
  /** The realtime worker — pinged after a write so open screens refresh live. */
  REALTIME: Fetcher
  /** Team logos (uploaded), served by the gateway at /media/<team>/logo/<ulid>
   * (`/media/teams/<id>/…` for one written before 7 Sep 2026). */
  MEDIA: R2Bucket

  /** Cloudflare account id (plain var) — for creating/querying team DBs. */
  CF_ACCOUNT_ID: string
  /** THE UUID OF THE DATABASE `DB` ABOVE IS BOUND TO, spelled out.
   *
   * A D1 binding does not expose its own id, and the nightly growth watch has to
   * recognise core in a listing of the whole Cloudflare ACCOUNT — core is the
   * one database that is ours but is in no team row, and the most important one
   * to watch (it is the only one strangers can grow, and its ceiling takes the
   * whole product down rather than one tenant).
   *
   * Set per env in wrangler vars, three lines from the binding it names, and
   * `workers/tenancy/test/db-ownership.test.ts` reads BOTH out of that file and
   * refuses to let them drift. Optional in the type only so a test env need not
   * set it; unset means core is simply not claimed, which loses a reading and
   * can never claim somebody else's database by mistake. */
  CORE_DATABASE_ID?: string
  /** The public WEB origin the SPA is served on (the gateway's public URL),
   *  used for links in outbound emails. Set per env in wrangler vars. */
  PUBLIC_APP_URL?: string
  /** The client portal's origin. Tenancy sends exactly one email to a
   * CLIENT — the portal welcome — and that link must never carry the
   * agency's hostname (R30 · shared/workers/record-link.ts). */
  PUBLIC_PORTAL_URL?: string
  /** Comma-separated addresses that receive the nightly growth alarm. Optional:
   *  unset means nobody is mailed, and the cron RECORDS that rather than going
   *  quiet (ARCHITECTURE §7 — an alarm nobody receives is just a table). */
  ALERT_TO?: string

  // Secrets (wrangler secret put):
  /** API token scoped to Account → D1 → Edit. Without it, team databases
   *  can't be created or queried — bootstrap fails with a clear message. */
  CF_D1_TOKEN?: string
  /** Protects the migrate-all-team-DBs maintenance endpoint. */
  ADMIN_KEY?: string
  /** Shared secret sent to auth's /internal/send-email (must match auth's
   * INTERNAL_KEY). Defense-in-depth alongside workers_dev:false. */
  INTERNAL_KEY?: string
  /** Per-user ceiling on CREATED teams (each provisions a database). The owner's
   * override: set it higher per environment; unset falls back to the code default. */
  MAX_TEAMS_PER_USER?: string
  /** Workers AI — reading a call into a proposed process map
   *  (lib/process-extract.ts). OPTIONAL: without it that ONE door refuses with a
   *  503 that says so, rather than throwing at the top of somebody's call notes. */
  AI?: Ai
  /** Swap the cheap model without a code change. Same var name as data-ops and
   *  content, so one setting moves the whole cheap path. */
  WORKERS_AI_MODEL?: string
  /** The free daily AI allowance — MUST match data-ops and content, or one
   *  allowance is enforced at two different heights. */
  AGENT_FREE_DAILY?: string
  /** WHICH ENGINE THE ASSISTANT RUNS ON — read here only to PRICE what it spent.
   * Tenancy makes no model call; the nightly ops digest reads the tokens
   * `agent_usage_log` recorded and turns them into money, and it cannot do that
   * without knowing which rate card applies. Unset means the digest reports
   * tokens and says "unpriced" rather than guessing a rate — and
   * `no-quiet-downgrade.test.ts` reads every wrangler config off disk and fails
   * the build if any of them names an engine the code does not, so this second
   * mention can never drift away from data-ops' pin. */
  AGENT_MODEL?: string
  AGENT_NO_DAILY_CAP?: string

  /** GOOGLE MAPS — the browser-side JavaScript API key that draws the real map
   * on the accounts screen (Aurora's ruling, 23 Sep 2026: "build with the
   * google maps api", replacing the kit's own tile-less plate). NOT secret
   * the way every other value in this section is: once the map loads, this
   * key is visible in the browser's own network tab, the same way it would
   * be in any product built on this API. The fence that actually matters is
   * the Google Cloud Console's own HTTP referrer restriction, scoped to this
   * app's own origins, with the Maps JavaScript API enabled and billed on
   * that project alone — not keeping the value out of a response, which
   * cannot be done and is not the control. Set with `wrangler secret put`
   * anyway, matching `GOOGLE_CLIENT_ID` above: neither value is ever
   * committed, and one habit for every Google credential here is one fewer
   * thing to remember.
   *
   * Read by exactly one door, `routes/maps-config.ts`'s `getMapsConfig`
   * (`GET /api/tenancy/config/maps`), which hands the browser a ready-to-use
   * SCRIPT URL rather than the bare key spelled anywhere in the front end's
   * own source — the same shape `workers/auth/src/lib/google.ts`'s
   * `buildGoogleStart` already uses for "Continue with Google": the
   * credential is composed into a URL server-side, once, in one place.
   *
   * UNSET = the map view's own honest empty register ("Connect Google Maps
   * to see accounts here"), never a broken plate and never a crash — see
   * `web/components/accounts/google-account-map.tsx`. */
  GOOGLE_MAPS_BROWSER_KEY?: string

  /** GOOGLE MAPS, the SERVER-SIDE Geocoding API key, migration 0118's own
   * write half: `workers/tenancy/src/lib/geocode.ts`'s `geocodeAddress`,
   * called from `lib/accounts.ts`'s `createAccount`/`updateAccount`, turns a
   * stored `street`/`postalCode`/`city`/`country` into `{lat, lng}` under
   * this key, once, at write time.
   *
   * A DIFFERENT CREDENTIAL FROM `GOOGLE_MAPS_BROWSER_KEY` ABOVE, ON PURPOSE.
   * That one is HTTP-referrer-restricted and safe to expose to a browser,
   * while this one is a plain server secret, never sent to a browser at
   * all: a Geocoding API call from the browser would need the Geocoding API
   * enabled on the SAME key the map's tiles use, widening what a leaked
   * browser key could spend on somebody else's behalf, for no benefit over
   * the identical lookup done once, server-side
   * (`web/components/accounts/account-map.ts`'s own header has the full
   * argument). Google's own guidance is that a server key and a browser key
   * should never be the same credential wearing two different restrictions,
   * and `geocode.ts` never reads `GOOGLE_MAPS_BROWSER_KEY`, nor does this
   * door read `GOOGLE_MAPS_GEOCODE_KEY`, proved by
   * `workers/tenancy/test/accounts-geocode.test.ts`, "the two Google Maps
   * keys never cross".
   *
   * UNSET = geocoding is simply not offered on this environment: every write
   * still succeeds, `lat`/`lng` stay `NULL`, and the map falls back to a
   * country centroid, the same honest degrade an absent
   * `GOOGLE_MAPS_BROWSER_KEY` already gives the plate itself. Set with
   * `wrangler secret put`, matching `GOOGLE_MAPS_BROWSER_KEY` above. */
  GOOGLE_MAPS_GEOCODE_KEY?: string
}
