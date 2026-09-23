// ACCOUNTS ON A REAL MAP — turning a page of `Account` rows into the pins a
// real Google Map draws, PURE, so this can be proved without rendering a
// screen (`web/test/accounts-map-view.test.tsx` calls it directly).
//
// Her ruling, 23 Sep 2026, over the map view this replaced (the kit's own
// tile-less plate, shipped the same day off her earlier "add a map view"
// ask): "ok but, there's no actual map lol, how do we get a google map
// there? remove the side panel, when i click in one i want a slight little
// overlay card with name and loogo and full adress (including ountry) then
// if i click there it takes me to detail screen." Then, choosing between the
// options laid out for her: "build with the google maps api". Four things
// changed and are recorded here because this file is where three of them
// land (the fourth, the interaction, lives in
// `web/components/accounts/google-account-map.tsx`):
//
// MIGRATION 0118 HAS LANDED. `lat`/`lng` are now real, nullable columns on
// `accounts` (`workers/tenancy/src/team-schema/migrations.ts`), geocoded
// best-effort at write time by `workers/tenancy/src/lib/geocode.ts`, under
// the server-side `GOOGLE_MAPS_GEOCODE_KEY`, and `shared/types.ts`'s own
// `Account` carries both fields now, so `GeocodedAccount` below is a plain
// alias rather than a local intersection type standing in for a column the
// wire did not send yet.
//
//   1. A REAL MAP, NOT A PLATE. `shared/ui/components/map/map.tsx` draws no
//      tiles and expects `x`/`y` PERCENTAGES across a flat plate — the right
//      shape for the kit's own artifact, the wrong one once the plate is an
//      actual, pannable Google Map. A real map takes `lat`/`lng` directly and
//      does its own projection, so this file stopped computing a percentage
//      and started computing a POSITION — the same job `countryCentroid`
//      (`./country-centroids.ts`) already did for the old plate, just handed
//      to the map unprojected instead of squeezed through `countryPosition`'s
//      equirectangular box. `country-centroids.ts` itself did not have to
//      change: it already answered in `{ lat, lng }`.
//   2. THE LIST IS GONE. Her own words: "remove the side panel." The kit's
//      `Map` pairs a plate with a list BECAUSE a flat, tile-less plate is
//      illegible on its own — its own header's argument, quoted in the
//      previous round's build. A real, zoomable Google Map does not share
//      that illegibility, and she asked for it gone regardless.
//   3. IT DOES NOT LIE ABOUT WHO IS MISSING, JUST NOT AS A LIST. The kit's own
//      map doc is right that a map silently dropping rows "lies about the
//      size of the business" — and losing the list does not repeal that, so
//      `missingCount` still rides on every `AccountMapPlacement`, and
//      `google-account-map.tsx` turns it into one honest sentence under the
//      plate ("N of M accounts are shown…") instead of a list of names. The
//      exact tradeoff is hers, made in the same message: she is not told to
//      re-derive who the missing ones are, only that some exist and how many.
//   4. A GEOCODED POSITION BEATS A COUNTRY GUESS, WHEN THERE IS ONE. See
//      `GeocodedAccount` below for the decision, and the header of
//      `workers/tenancy/src/routes/maps-config.ts` for the one worker route
//      this round actually shipped alongside it.
//
// ── THE GEOCODING DECISION, AND WHERE IT STOPS ───────────────────────────────
//
// A real map needs a real position per account, not a country's own centroid
// standing in for every company inside it — nine pins on top of each other in
// Austria is not what "a real Google map" was asked for. That means turning an
// account's own STORED ADDRESS (`street`, `postalCode`, `city`, `country` —
// `shared/types.ts`) into `{ lat, lng }`, which means calling a geocoding
// service, which costs a network round trip and (for Google's Geocoding API)
// a small amount of money per lookup.
//
// DOING IT IN THE BROWSER, ON EVERY RENDER, IS WRONG — three separate reasons,
// not one: (a) COST — this screen can render many times in a session (every
// tab switch back to Active, every reload), and geocoding the same fourteen
// addresses over and over spends money for an answer that does not change
// between calls; (b) LATENCY — a browser call adds a network round trip PER
// ACCOUNT to the critical path of painting the map, on top of the Maps script
// itself loading; (c) THE KEY — geocoding from the browser would need the
// Geocoding API enabled on the SAME key the map's tiles use, widening what an
// HTTP-referrer-restricted browser key can spend on somebody else's behalf if
// it ever leaked, for no benefit over doing the same lookup once, server-side,
// under a key that never reaches a browser at all.
//
// THE SHIPPED SHAPE: geocode once, at WRITE time, and store the result on the
// account row. When an account is created, or its address fields change, the
// door that writes it (`workers/tenancy/src/lib/accounts.ts`'s
// `createAccount`/`updateAccount`, through `workers/tenancy/src/lib/
// geocode.ts`'s `geocodeAddress`) calls Google's Geocoding API server-side,
// under a SEPARATE, non-browser-restricted secret (`GOOGLE_MAPS_GEOCODE_KEY`,
// distinct from `GOOGLE_MAPS_BROWSER_KEY`, because Google's own guidance is
// that a server key and a browser key should never be the same credential
// wearing two different restrictions), and stores `{ lat, lng }` on the row.
// A failed or empty lookup (no key configured, a network error or timeout,
// bounded per R11, or an address Google's own service could not resolve)
// leaves them `NULL` and never fails the account write itself: geocoding is
// best-effort furniture around the record, not a gate in front of it, the
// same posture this codebase already takes with the knowledge base's
// embeddings and the nightly growth alarm. Reading a STORED value at render
// time (rather than a service at render time) is exactly `CACHING.md`'s own
// cache-first shape, applied to a fact that is expensive to compute and
// cheap to store. Re-geocoding is skipped entirely when none of the four
// address fields changed (`addressChanged`, `geocode.ts`): an edit to the
// name, the logo, the currency costs nothing extra here, and neither does
// saving the same address back unchanged.
//
// THIS FILE READS THAT SHAPE DIRECTLY NOW. `lat`/`lng` are plain,
// non-optional fields on `shared/types.ts`'s own `Account` (migration 0118),
// so `GeocodedAccount` below is kept only as the name every caller of
// `placeAccountsOnMap` already imports, not because it still widens anything.
//
//   • The migration (`workers/tenancy/src/team-schema/migrations.ts`,
//     `0118_an_account_gets_a_position`) adds `lat REAL`/`lng REAL`, both
//     nullable. `NULL` is the honest "not geocoded yet, or the address
//     could not be resolved" state, exactly the signal this file already
//     treated a missing position as before the migration existed.
//   • `workers/tenancy/src/lib/accounts.ts`'s `createAccount` and
//     `updateAccount` geocode best-effort, under `GOOGLE_MAPS_GEOCODE_KEY`
//     (`workers/tenancy/src/env.ts`).
//   • A ONE-TIME BACKFILL for the accounts that predate the column
//     (`scripts/backfill-account-geocode.mjs`, the same size call
//     `scripts/backfill-ticket-raisers.mjs` already made for its own
//     one-time job): this team measured fourteen active accounts on
//     23 Sep 2026, so a maintenance script rather than a recurring cron is
//     the right size for the job (R4).
//
// A STORED POSITION CAN DRIFT. A client's registered address can move after
// it was last geocoded, and nothing re-asks Google on a schedule, the same
// choice this codebase already makes for a company logo or a cached page:
// the position is refreshed the next time the record itself is edited (any
// save that changes `street`/`postalCode`/`city`/`country` re-geocodes,
// `accounts.ts`'s own `addressChanged` guard), or by re-running the backfill
// script with `--force`, which re-asks Google for every account with an
// address on file regardless of what it already stored. There is no cron:
// fourteen accounts do not justify a recurring job, and staff already edit a
// record when its address changes for a reason of their own.
//
// ── THE FALLBACK, KEPT ON PURPOSE ────────────────────────────────────────────
//
// "Keep the country centroid and alias work as the fallback for an account
// whose address cannot be geocoded, so the view degrades rather than losing a
// client", her brief's own instruction. So every account without a geocoded
// position (no address on file, one Google's own service could not resolve,
// or simply not geocoded yet) still gets a pin, at its country's own
// centroid, exactly as before the real map existed (see `jitterDegrees` for
// how several accounts sharing one country stay individually clickable
// rather than stacking into one blob). An account with neither a geocoded
// position NOR a placeable country is the only one that goes uncounted as a
// pin, and even it is not lost: `missingCount` carries it, honestly, to the
// caption under the map.
import type { Account } from "@shared/types"

import { countryCentroid } from "./country-centroids"

/** `Account` itself, now that `lat`/`lng` live on the shared type (migration
 * 0118), kept as a named export so every existing caller of
 * `placeAccountsOnMap` keeps importing the same name, and so a reader of this
 * file's own signatures still sees "this is about a GEOCODED account", not
 * merely "an account". */
export type GeocodedAccount = Account

/** One pin the map actually draws. `address` is built once, here, off the
 * SAME four fields and the SAME join `account-detail.tsx`'s own overview
 * panel already uses (`[street, postalCode, city, country].filter(Boolean)
 * .join(", ")`) — one formula for "an account's full address", not a second
 * one invented for the map. */
export type AccountMapPin = {
  id: string
  name: string
  logoUrl: string | null
  /** The full postal address, country included, exactly as her brief asked
   * for the overlay card — `""` when the account has none on file. */
  address: string
  lat: number
  lng: number
  /** `true` when this position is a country's own centroid standing in for
   * the account's real address (no geocoded `lat`/`lng` stored yet, or the
   * address could not be resolved) — carried through to the overlay card and
   * the marker's own look, so a reader is never told an approximation is a
   * fact. */
  approximate: boolean
}

export type AccountMapPlacement = {
  /** One pin per PLACEABLE account — never fewer, never a pin standing for
   * more than one row. */
  pins: AccountMapPin[]
  /** How many accounts hold neither a geocoded position nor a placeable
   * country — the honest count the caption under the map is built from. */
  missingCount: number
  /** Every account handed in, placeable or not — what "N of M" divides by. */
  totalCount: number
}

/** The account's own full postal address, one line, country included — the
 * same expression `account-detail.tsx`'s overview panel already builds
 * (`where`, over `account`), reused rather than reinvented so the overlay
 * card never disagrees with the record screen about what "the address"
 * reads. */
function fullAddress(account: Pick<Account, "street" | "postalCode" | "city" | "country">): string {
  return [account.street, account.postalCode, account.city, account.country].filter(Boolean).join(", ")
}

/** How far apart two ADJACENT ring pins must land, in DEGREES, so a reader
 * zoomed to a country's own extent can still tell them apart. Chosen off
 * Austria — the real, measured case (nine of the Kwapso team's fourteen
 * active companies) — at roughly 575km across: 0.35° is ≈35–39km at this
 * latitude, visibly spread across a country that size without reading as a
 * different city or region than the centroid it rings. */
const MIN_PIN_SEPARATION_DEG = 0.35

/** The ring's own ceiling, in degrees — past this a "wider ring for more
 * pins" stops meaning "still reads as one country's own cluster" and starts
 * meaning "a different part of the map". ≈330km at the equator, comfortably
 * inside every country this table (`./country-centroids.ts`) actually names. */
const MAX_RING_RADIUS_DEG = 3

/** The ring a country's own ungeocoded accounts stand in when there is more
 * than one, in DEGREES, widening as the group grows — the exact geometry
 * `account-map.ts`'s previous, plate-percentage version used
 * (`R = separation / (2 · sin(π / total))`, capped), carried over unit for
 * unit into degree space now that the thing being ringed is a real map and
 * not a flat plate. One account needs no ring: it sits exactly on the
 * centroid. Deterministic — keyed by the account's own index within the
 * group and the group's own size, never `Math.random()` — so the same
 * accounts draw the same pins on every render. */
function jitterDegrees(index: number, total: number): { dLat: number; dLng: number } {
  if (total <= 1) return { dLat: 0, dLng: 0 }
  const halfAngle = Math.PI / total
  const radius = Math.min(MAX_RING_RADIUS_DEG, MIN_PIN_SEPARATION_DEG / (2 * Math.sin(halfAngle)))
  const angle = (2 * Math.PI * index) / total
  return { dLat: Math.sin(angle) * radius, dLng: Math.cos(angle) * radius }
}

/** `GeocodedAccount[]` → the real map's own pins, in ONE pass so `pins.length
 * + missingCount` can never drift from `totalCount` (the invariant
 * `web/test/accounts-map-view.test.tsx` locks). */
export function placeAccountsOnMap(accounts: GeocodedAccount[]): AccountMapPlacement {
  const pins: AccountMapPin[] = []
  // GROUPED BY COUNTRY, so `jitterDegrees` knows each ungeocoded account's
  // `index`/`total` within its own country before any of that country's pins
  // are built — the ring has to see the whole group at once, not one row at
  // a time. Only accounts WITHOUT a stored geocode enter this path; a
  // geocoded account never needs a ring, because it is not sharing a
  // centroid with anyone.
  const byCountry = new Map<string, GeocodedAccount[]>()

  for (const account of accounts) {
    if (typeof account.lat === "number" && Number.isFinite(account.lat) &&
        typeof account.lng === "number" && Number.isFinite(account.lng)) {
      pins.push({
        id: account.id,
        name: account.name,
        logoUrl: account.logoUrl,
        address: fullAddress(account),
        lat: account.lat,
        lng: account.lng,
        approximate: false,
      })
      continue
    }
    const centroid = countryCentroid(account.country)
    if (!centroid) continue // no geocode, no placeable country — counted below, never guessed
    const key = account.country as string // countryCentroid already refused null/blank
    const group = byCountry.get(key)
    if (group) group.push(account)
    else byCountry.set(key, [account])
  }

  for (const group of byCountry.values()) {
    const centroid = countryCentroid(group[0].country)
    // Never null here — every account in `group` already resolved a centroid
    // above, and every account in one group shares one country.
    if (!centroid) continue
    group.forEach((account, index) => {
      const { dLat, dLng } = jitterDegrees(index, group.length)
      pins.push({
        id: account.id,
        name: account.name,
        logoUrl: account.logoUrl,
        address: fullAddress(account),
        lat: centroid.lat + dLat,
        lng: centroid.lng + dLng,
        approximate: true,
      })
    })
  }

  return { pins, missingCount: accounts.length - pins.length, totalCount: accounts.length }
}
