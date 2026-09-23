// GEOCODING AN ACCOUNT'S ADDRESS, turning a stored postal address into a
// real `{lat, lng}`, once, at write time, server-side, under
// `GOOGLE_MAPS_GEOCODE_KEY` (env.ts's own header says why that must never be
// the browser's own `GOOGLE_MAPS_BROWSER_KEY`). See
// `web/components/accounts/account-map.ts`'s header for the full decision
// this file is the write half of: a real map needs a real position per
// account, not a country's own centroid standing in for every company
// inside it (nine of the Kwapso team's own fourteen active companies are in
// Austria).
//
// `createAccount`/`updateAccount` (`./accounts.ts`) are the only two callers.
// Both await this INLINE, in the same request the account write happens in,
// never deferred, never a queue, because there is nothing to defer to:
// `geocodeAddress` NEVER THROWS. Every failure path below resolves to
// `null` rather than rejecting, so the caller never needs a try/catch of its
// own and the account write always completes, whether or not a position
// came back. Geocoding is best-effort furniture around the record, the same
// posture this codebase already takes with the knowledge base's embeddings
// and the nightly growth alarm, never a gate in front of anything.

import type { Env } from "../env"

const GEOCODE_ORIGIN = "https://maps.googleapis.com/maps/api/geocode/json"

// R11: bounded, like every external hop in this codebase. `notify.ts`'s own
// 15s ceiling on a branded email is the closest sibling: a real third party
// at the other end, allowed to fail, never allowed to hold the request that
// already committed its real write. A GEOCODE has no "record already
// committed" moment to protect (it runs BEFORE the insert/update below), but
// it still must not hang the request indefinitely, a slow Google is a
// reason to skip the position, never a reason to make an account create
// take minutes.
const GEOCODE_TIMEOUT_MS = 8_000

export type GeocodeAddressFields = {
  street: string | null
  postalCode: string | null
  city: string | null
  country: string | null
}

export type GeocodedPosition = { lat: number; lng: number }

/** The same join `account-map.ts`'s own `fullAddress` builds client-side for
 * the overlay card, one formula for "an account's full address", reused
 * rather than reinvented, so the string this file sends Google is the exact
 * string a reader would see if they opened the same account's card. */
function fullAddress(fields: GeocodeAddressFields): string {
  return [fields.street, fields.postalCode, fields.city, fields.country].filter(Boolean).join(", ")
}

/** Turn a stored address into `{lat, lng}`, or `null` on ANY failure, never
 * a thrown error, so `createAccount`/`updateAccount` can `await` this
 * in-line with no try/catch of their own.
 *
 * FOUR WAYS THIS RETURNS `null`, EACH ONE DELIBERATE AND EACH ONE ASKED FOR
 * BY NAME IN THE BRIEF THAT SHIPPED IT:
 *
 *   1. NO KEY CONFIGURED (`env.GOOGLE_MAPS_GEOCODE_KEY` unset): geocoding is
 *      simply not offered on this environment, exactly like the browser
 *      key's own absent-key register (`routes/maps-config.ts`). No network
 *      call is made at all.
 *   2. NO ADDRESS TO GEOCODE (every one of the four fields blank): nothing
 *      to send, so nothing is sent.
 *   3. A NETWORK ERROR OR TIMEOUT: `fetch` itself throws (DNS, TLS, or the
 *      `AbortSignal.timeout` above firing) or answers with a non-2xx status.
 *      Caught below, never rethrown.
 *   4. GOOGLE ANSWERED AND COULD NOT RESOLVE IT: the response's own `status`
 *      is anything other than `"OK"` (`"ZERO_RESULTS"` for an address it
 *      cannot find, `"REQUEST_DENIED"`/`"OVER_QUERY_LIMIT"`/`"INVALID_
 *      REQUEST"` for a key, billing or shape problem, the Geocoding API's
 *      own documented vocabulary), or the response body does not carry the
 *      `lat`/`lng` shape this function expects. Every one of these means "we
 *      do not have a position for this address", which is a fact about the
 *      address, never a reason to refuse the write that is about to happen
 *      alongside it. */
export async function geocodeAddress(
  env: Pick<Env, "GOOGLE_MAPS_GEOCODE_KEY">,
  fields: GeocodeAddressFields
): Promise<GeocodedPosition | null> {
  const key = env.GOOGLE_MAPS_GEOCODE_KEY
  if (!key) return null // 1: not configured on this environment

  const address = fullAddress(fields)
  if (!address) return null // 2: nothing to send

  const url = new URL(GEOCODE_ORIGIN)
  url.searchParams.set("address", address)
  // TAKEN FROM CONFIGURATION, NEVER A LITERAL. The only place in this file a
  // Google Maps key is read. Proved by
  // workers/tenancy/test/accounts-geocode.test.ts, "the geocode key is never
  // a literal".
  url.searchParams.set("key", key)

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS) })
    if (!res.ok) return null // 3: an HTTP-level failure
    const body = (await res.json()) as {
      status?: string
      results?: { geometry?: { location?: { lat?: unknown; lng?: unknown } } }[]
    }
    if (body.status !== "OK") return null // 4: Google's own "could not resolve"
    const location = body.results?.[0]?.geometry?.location
    if (typeof location?.lat !== "number" || typeof location?.lng !== "number") return null // 4: malformed shape
    return { lat: location.lat, lng: location.lng }
  } catch {
    return null // 3: a network error, a timeout, or a response body that was not JSON
  }
}

/** WHETHER IT IS WORTH ASKING AGAIN: true only when at least one of the four
 * address fields the geocoder reads has actually changed between the stored
 * row and the write in front of it.
 *
 * `createAccount` never calls this (an account is always born with a fresh
 * address, or none, either way there is nothing to compare against);
 * `updateAccount` calls it once, against the PATCHED next-value, before
 * spending a network call and a few hundredths of a cent on an address that
 * did not move. Compared as empty-string-normalised so `null` ("never set")
 * and `undefined` ("the caller said nothing about it") read the same as an
 * absent field on either side: a patch that mentions three of four address
 * fields and leaves the database's own value for the fourth must not look
 * "changed" purely because `undefined !== null` as raw values. */
export function addressChanged(before: GeocodeAddressFields, after: GeocodeAddressFields): boolean {
  const norm = (v: string | null | undefined) => v ?? ""
  return (
    norm(before.street) !== norm(after.street) ||
    norm(before.postalCode) !== norm(after.postalCode) ||
    norm(before.city) !== norm(after.city) ||
    norm(before.country) !== norm(after.country)
  )
}
