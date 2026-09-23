// ACCOUNTS ON THE PLATE — turning a page of `Account` rows into the kit
// `Map`'s own two arrays, PURE, so this can be proved without rendering a
// screen (`web/test/accounts-map-view.test.tsx` calls it directly).
//
// Aurora's ruling, 23 Sep 2026, verbatim: "for accounts/active add a map
// view." `shared/ui/components/map/map.tsx`'s own header is the spec this
// file follows: the list is never dropped ("a map is paired with the records
// in view, never shown alone"), and a record without a position is counted
// in words rather than silently missing ("a map that silently omits two
// accounts is a map that lies about the size of the business").
//
// SEVERAL ACCOUNTS, ONE COUNTRY. The real Kwapso team measured it: nine of
// its fourteen active companies are Austria. The kit's own `MapPin`/`MapItem`
// contract is one id per pin and one matching id per list row ("Matches a
// list item's id, so selecting in one marks the other"), so a pin standing
// for MULTIPLE accounts would have no single id to answer that contract with,
// and clicking it would have to pick one of several records to open on the
// caller's behalf — which is not this file's decision to make. The answer
// here is ONE PIN PER ACCOUNT, every time: accounts sharing a country are
// placed in a small ring around that country's own centroid (`jitter`,
// below) rather than stacked on one point or folded into a single pin. Every
// pin still opens its own account, and the RING is what tells a reader "more
// than one company here" — orientation the map's own header reserves for
// pins, while the exact names stay the list's job ("Pins are for
// orientation; the list is for reading, selecting and opening"). THE RING
// WIDENS AS THE GROUP GROWS (see `jitter`'s own header) — a fixed radius was
// checked against nine points and found illegible before this shipped.
//
// GROUPED BY THE STORED SPELLING, NOT THE RESOLVED COUNTRY. "Austria" (9
// rows) and "Österreich" (1 row, `./country-centroids.ts`'s own alias
// table) place at the SAME centroid but are two separate groups here, each
// with its own ring sized off its own count — the nine-account "Austria"
// group's own ring (radius ≈6.6 plate points), and the one-account
// "Österreich" group with no ring at all, sitting exactly on the shared
// centroid. Not an oversight: a lone centre dot inside a wider ring reads as
// clearly distinct from the ring around it, and it is what falls out of the
// simplest correct code — grouping by the RESOLVED country instead would
// mean every group first resolving its own canonical name (a second call
// through the alias table this file does not otherwise need), to draw a
// picture that, for any distribution this team's own data has shown so far,
// looks the same either way.
import type { MapItem, MapPin, MapPinStatus } from "@shared/ui/components/map/map"
import type { Account } from "@shared/types"

import { countryPosition } from "./country-centroids"

export type AccountMapPlacement = {
  /** One pin per PLACEABLE account — never fewer, never a pin standing for
   * more than one row. */
  pins: MapPin[]
  /** EVERY account, placeable or not — "the list is always beside it", and
   * an account this table cannot place is still a row a reader can open. */
  items: MapItem[]
  /** How many of `items` hold no pin — the map's own `missingLabel` sentence
   * is built from this by the caller, in the caller's own words (the count is
   * data; the sentence is copy, and copy is translated where it is said). */
  missingCount: number
}

/** How far apart two ADJACENT pins on the ring must land, in plate
 * percentage points, to stay individually clickable rather than reading as
 * one smear. Checked against the pin's own real footprint
 * (`shared/ui/components/map/map.tsx`): a bare dot with no capsule is
 * `size-[0.5625rem]` (9px) wearing a `<button>` no bigger than itself — no
 * padding, no larger hit area — so two dots any closer than roughly their
 * own width apart are no longer two separate targets. At the kit's own
 * narrowest plate width for a two-body layout (720px total, minus the
 * list's fixed 250px column and its 16px gap — the numbers `map.tsx`'s own
 * `min-[45rem]:grid-cols-[1fr_15.625rem]` and `gap-4` name — leaves roughly
 * 450px of plate, so 1 plate point ≈ 4.5px), 4.5 points is ≈20px: the 9px
 * dot plus about 11px of clear edge-to-edge air on both sides, comfortable
 * for a mouse and workable for a coarse touch pointer. */
const MIN_PIN_SEPARATION = 4.5

/** The ring's own ceiling — past this, "wide enough to separate nine pins"
 * stops meaning "still reads as one country's own cluster." Nineteen
 * companies across a handful of countries was the brief's own estimate; the
 * real Kwapso team measured nine in Austria alone (of fourteen active
 * companies total) — the ring this constant was chosen against. */
const MAX_RING_RADIUS = 10

/** The ring a country's own accounts stand in when there is more than one,
 * in PLATE PERCENTAGE POINTS, WIDENING AS THE GROUP GROWS rather than
 * holding one fixed radius. A fixed radius was the first draft, and it does
 * not hold: evenly spacing nine points (Austria's own real count on the
 * Kwapso team) around a circle of radius 2.5 puts adjacent dots roughly 1.7
 * points apart — under their own 9px footprint at ordinary plate widths, so
 * the nine would visually merge into a blob rather than read as nine
 * clickable companies. The fix is standard circle geometry, not a branch per
 * group size: for `total` points evenly spaced on a circle of radius `R`,
 * the chord between two ADJACENT points is `2 · R · sin(π / total)` — solved
 * the other way round, for the SEPARATION this file wants
 * (`MIN_PIN_SEPARATION`), `R = separation / (2 · sin(π / total))`. That
 * grows with `total` on its own (more points need more room to keep the same
 * gap between them), capped at `MAX_RING_RADIUS` so a hypothetically huge
 * cluster does not sprawl into a neighbouring country's own visual space.
 * Deterministic — keyed by the account's own index within the group and the
 * group's own size, never `Math.random()` — so the same team, the same
 * accounts, draw the same ring on every render and the pins never appear to
 * jump. One account needs no ring at all: it sits exactly on the centroid. */
function jitter(index: number, total: number): { dx: number; dy: number } {
  if (total <= 1) return { dx: 0, dy: 0 }
  const halfAngle = Math.PI / total
  const radius = Math.min(MAX_RING_RADIUS, MIN_PIN_SEPARATION / (2 * Math.sin(halfAngle)))
  const angle = (2 * Math.PI * index) / total
  return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius }
}

/** Sky, forest, poppy — never mango, the map's own law ("a pin is a state,
 * not the brand"). This screen offers the map on the Active tab only (her
 * own words), so every account handed here is ordinarily already live — the
 * dot is `forest` for one that is, `neutral` for the rare row that reads
 * this function directly with something else on it (the archived/inactive
 * tabs, or a future caller), rather than a colour this file would have to
 * invent one for. */
function pinStatus(account: Account): MapPinStatus {
  return account.active ? "forest" : "neutral"
}

/** `Account[]` → the plate's own two arrays, in ONE pass so `items.length`
 * and `pins.length + missingCount` can never drift apart (the invariant
 * `web/test/accounts-map-view.test.tsx` locks). */
export function placeAccountsOnMap(accounts: Account[]): AccountMapPlacement {
  // GROUPED FIRST, so `jitter` knows each account's `index`/`total` within
  // its own country before any pin is built — the ring has to see the whole
  // group at once, not one row at a time.
  const byCountry = new Map<string, Account[]>()
  for (const account of accounts) {
    const position = countryPosition(account.country)
    if (!position) continue
    const key = account.country as string // countryPosition already refused null/blank
    const group = byCountry.get(key)
    if (group) group.push(account)
    else byCountry.set(key, [account])
  }

  const pins: MapPin[] = []
  for (const group of byCountry.values()) {
    const position = countryPosition(group[0].country)
    // Never null here — every account in `group` already resolved a
    // position above, and every account in one group shares one country.
    if (!position) continue
    group.forEach((account, index) => {
      const { dx, dy } = jitter(index, group.length)
      pins.push({
        id: account.id,
        name: account.name,
        status: pinStatus(account),
        x: Math.min(99, Math.max(1, position.x + dx)),
        y: Math.min(99, Math.max(1, position.y + dy)),
      })
    })
  }

  // EVERY ROW, PLACEABLE OR NOT — the map's own law, "a map that silently
  // omits two accounts is a map that lies about the size of the business."
  const items: MapItem[] = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    meta: account.country || undefined,
  }))

  const missingCount = accounts.length - pins.length

  return { pins, items, missingCount }
}
