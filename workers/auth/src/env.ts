// Everything the auth worker is given from outside (bindings, vars, secrets).
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
   * neither seam takes a `Request`, and 190 call sites already pass `env`.
   *
   * Optional because a cron tick has no request — it puts the TICK's id here
   * instead (`tickId`) — and the suites hand a bare `env`; absent means the row
   * lands exactly as it did before, with nothing to join on. */
  TRACE?: string

  DB: D1Database
  /** Profile photos (and other uploads) — served by the gateway at /media/*. */
  MEDIA: R2Bucket
  /** The live switchboard — auth publishes identity events (account activity,
   * profile, forced sign-out) to a user's OWN channel. */
  REALTIME: Fetcher

  /** The AGENCY app's public address — used in login emails and redirects. */
  APP_ORIGIN: string
  /** The CLIENT PORTAL's public address. Auth serves both front doors, and Google
   * sign-in has to bounce a person back to the one they came from — so the two
   * origins are named here and NOTHING else is ever redirected to. See
   * lib/google.ts `frontDoors`. */
  PORTAL_ORIGIN: string
  /** Verified-sender from-address for transactional email
   * (e.g. "noreply@updates.kwapso.com"). */
  EMAIL_FROM: string

  // Secrets (wrangler secret put) — optional until the user provides them.
  RESEND_API_KEY?: string
  /** Google sign-in's OAuth client id (the `kwapso-signin` app — basic scopes
   * only; the Drive/Gmail/Calendar app is a DIFFERENT client and must never be
   * used here). Not secret in itself — it rides the redirect URL — but kept
   * beside the secret so both are set together and neither is committed. Unset =
   * no Google button; the email-code path is unaffected. */
  GOOGLE_CLIENT_ID?: string
  /** Google sign-in's client secret. Without it the code exchange fails, so the
   * start door refuses up front rather than bouncing someone to Google and back
   * into an error. */
  GOOGLE_CLIENT_SECRET?: string
  /** STAGING ONLY — gates the /api/auth/admin/test-login door (mints a login
   * code and returns it once, so automated tests can sign in now that codes are
   * never echoed anywhere). The holder can sign in as ANY account on the
   * environment: NEVER set this on the production auth worker. Fails closed
   * when unset — production simply has no test door. */
  /** Owner-only maintenance key (shared name across workers — NEVER the
   * test-login door's key; see TEST_LOGIN_KEY). */
  ADMIN_KEY?: string
  /** The test-login door's OWN secret. Its holder can sign in as any account, so
   * it is set on NON-PRODUCTION environments only — and the door additionally
   * refuses outright when ENVIRONMENT is "production". */
  TEST_LOGIN_KEY?: string
  /** Which environment this worker is: "production" | "staging" | … Set as a var
   * in wrangler.jsonc, so it ships with the deploy and can't be forgotten. */
  ENVIRONMENT?: string
  /** Shared secret guarding /internal/send-email (defense-in-depth alongside
   * workers_dev:false). When set, the route rejects callers lacking the header. */
  INTERNAL_KEY?: string

  /** "1" only in local dev (.dev.vars) — lets the cookie work on http://localhost. */
  INSECURE_COOKIE?: string
}
