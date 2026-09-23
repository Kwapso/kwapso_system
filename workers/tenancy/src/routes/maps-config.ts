// Maps config — the ONE new worker route Aurora's 23 Sep 2026 ruling needed
// ("build with the google maps api", replacing the accounts map's blank
// plate — `web/components/accounts/accounts-screen.tsx`'s own header has the
// whole account). It turns `GOOGLE_MAPS_BROWSER_KEY` into something a browser
// can use, following the exact shape `workers/auth/src/lib/google.ts`'s
// `buildGoogleStart` already uses for "Continue with Google": the credential
// is composed into a URL SERVER-SIDE, once, and the browser receives the
// finished URL rather than assembling one from a bare value anywhere in the
// front end's own source. `env.ts`'s own comment on `GOOGLE_MAPS_BROWSER_KEY`
// says why this one cannot be hidden the way an OAuth client secret is — the
// Cloud Console's own HTTP referrer restriction is the real fence, not this
// door declining to answer.
//
// GEOCODING IS DELIBERATELY NOT HERE. Turning an account's address into a
// real position is a write-time concern on the account record, described in
// full in `web/components/accounts/account-map.ts`'s own header and stopped,
// on purpose, at the boundary of an unminted migration — see that file.

import { refusePortalCaller } from "@shared/workers/account-scope"
import { json } from "@shared/workers/http"
import { teamContext } from "../context"
import type { Env } from "../env"

/** Google's own script origin — named here so the door's one URL-building
 * block reads as a sentence rather than a literal a reviewer has to check
 * against Google's docs by hand. */
const MAPS_SCRIPT_ORIGIN = "https://maps.googleapis.com/maps/api/js"

/** ANY MEMBER — the same gate `getScreens`/`getAutomations` already use
 * (`./config.ts`): whether the map is switched on is an agency-side
 * operational fact, not account data, so there is no per-right narrowing to
 * ask for. `refusePortalCaller` still stands (R21): the accounts module, and
 * therefore its map view, is not a screen the client portal draws, so a
 * config door for a screen the portal cannot reach says so AT THE DOOR
 * rather than by omission. */
export async function getMapsConfig(request: Request, env: Env): Promise<Response> {
  const { cfg, guard } = await teamContext(request, env)
  await refusePortalCaller(cfg, guard)

  const key = env.GOOGLE_MAPS_BROWSER_KEY
  // UNSET = null, not an empty string and not a thrown error — the browser's
  // own honest degraded state (google-account-map.tsx) reads this the same
  // way every other optional credential here degrades: the feature is not
  // offered, and nothing else in the product changes.
  if (!key) return json({ scriptUrl: null })

  const url = new URL(MAPS_SCRIPT_ORIGIN)
  // TAKEN FROM CONFIGURATION, NEVER A LITERAL — `env.GOOGLE_MAPS_BROWSER_KEY`
  // is the only place this value is read in the whole product; nothing here
  // or in the browser's own code spells a key. Proved by
  // `web/test/accounts-map-view.test.tsx`, "the key is never a literal".
  url.searchParams.set("key", key)
  // Google's own recommended loading mode — a fixed string, not
  // configuration, so it needs no var of its own.
  url.searchParams.set("loading", "async")
  url.searchParams.set("v", "weekly")
  return json({ scriptUrl: url.toString() })
}
