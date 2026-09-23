// ACCOUNTS' THIRD VIEW, THE MAP — Aurora's ruling, 23 Sep 2026, verbatim:
// "for accounts/active add a map view." Two things must never regress once
// this ships, named directly in the brief that built it:
//
//   1. THE MAP VIEW CANNOT LOSE ITS LIST. The kit's own `Map`
//      (`shared/ui/components/map/map.tsx`) draws the list beside the plate
//      as a SEPARATE `items` array from `pins` — nothing stops a future edit
//      from handing it only the placeable rows (fewer items than accounts),
//      which is exactly "a map that lies about the size of the business"
//      the kit's own header warns against.
//   2. THE MAP CANNOT DRAW A PIN FOR AN ACCOUNT IT CANNOT PLACE. A country
//      this app has no centroid for (typo, unmatched vocabulary, or simply
//      absent) must never silently manufacture a position — that is a guess
//      wearing a fact's clothes.
//
// `placeAccountsOnMap` (`web/components/accounts/account-map.ts`) is the one
// place either invariant could break, so it is proved directly — no need to
// mount the whole screen (`tenancy`, `useCached`, `<PagedFind>`'s own door
// calls) to reach a bug that lives in one pure function. A render-level case
// below (`describe("the kit's own Map, fed this file's real output")`) then
// checks the KIT actually draws what the function promised, so a mismatch
// between the two never hides behind a green unit test on either side alone.
// A last case is a WIRING census over `accounts-screen.tsx` itself, keyed by
// the expressions it must contain rather than a line number (this repo's own
// rule — a `file:line` key rots on the first edit above it): the call site
// really does feed `<Map>` from ONE `mapPlacement` object (so `items` and
// `pins` can never drift into two different ideas of "the accounts on this
// page"), and the "map" choice is only ever offered on the Active tab, her
// own word.

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import type { Account } from "@shared/types"
import { Map } from "@shared/ui/components/map/map"

import { placeAccountsOnMap } from "@/components/accounts/account-map"
import { countryCentroid, countryPosition, COUNTRY_CENTROIDS } from "@/components/accounts/country-centroids"

afterEach(cleanup)

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")

/** The minimum an `Account` needs for these two files — every OTHER field on
 * the real type is irrelevant to placement, so it is left off rather than
 * faked, the same narrowing `accounts-screen-gallery.test.tsx`'s own
 * `COMPANIES` fixture already uses one screen over. */
function account(over: Partial<Account> & { id: string; name: string }): Account {
  return {
    accountType: "entity",
    parentAccountId: null,
    email: null,
    phone: null,
    street: null,
    postalCode: null,
    city: null,
    country: null,
    industry: null,
    website: null,
    about: null,
    logoUrl: null,
    coverUrl: null,
    code: null,
    currency: null,
    locale: null,
    timezone: null,
    commercialsVisible: null,
    altNames: [],
    nameNarrowsAlone: "unreviewed",
    active: true,
    archived: false,
    accountManagerId: null,
    ...over,
  } as unknown as Account
}

describe("countryPosition — turning a country into a plate position", () => {
  it("places every seeded team's own six countries somewhere on the plate", () => {
    for (const name of ["Germany", "Austria", "Switzerland", "Spain", "Andorra", "United Kingdom"]) {
      const position = countryPosition(name)
      expect(position, `${name} should resolve`).not.toBeNull()
      expect(position!.x).toBeGreaterThanOrEqual(0)
      expect(position!.x).toBeLessThanOrEqual(100)
      expect(position!.y).toBeGreaterThanOrEqual(0)
      expect(position!.y).toBeLessThanOrEqual(100)
    }
  })

  it("refuses to place null, blank, or an unmatched country — never a guess", () => {
    expect(countryPosition(null)).toBeNull()
    expect(countryPosition(undefined)).toBeNull()
    expect(countryPosition("")).toBeNull()
    expect(countryPosition("   ")).toBeNull()
    expect(countryPosition("Narnia")).toBeNull()
  })

  it("matches case-insensitively — the one realistic typo, not a fuzzy guess", () => {
    expect(countryCentroid("germany")).toEqual(COUNTRY_CENTROIDS.Germany)
    expect(countryCentroid("GERMANY")).toEqual(COUNTRY_CENTROIDS.Germany)
  })

  it("the table itself stays small — this is a placeholder plate, not a gazetteer", () => {
    // A ceiling, not a floor: the file's own header says why (per-team, open
    // vocabulary), and a table that quietly grew to hundreds of entries would
    // be a sign somebody started guessing rather than curating.
    expect(Object.keys(COUNTRY_CENTROIDS).length).toBeLessThan(120)
  })

  // THE REAL GAP, FOUND ON THE KWAPSO TEAM ITSELF: nine of its own fourteen
  // active companies are filed under "Austria" and one under "Österreich" —
  // the German name for the same country, on the SAME per-team vocabulary.
  // Neither is a typo, so the case-insensitive pass above (correctly) does
  // not catch it; the alias table is what does.
  it("resolves a local-language spelling to the same centroid as its English name", () => {
    expect(countryCentroid("Österreich")).toEqual(COUNTRY_CENTROIDS.Austria)
    expect(countryPosition("Österreich")).toEqual(countryPosition("Austria"))
  })

  it("matches an alias case-insensitively too, the same as the main table", () => {
    expect(countryCentroid("österreich")).toEqual(COUNTRY_CENTROIDS.Austria)
    expect(countryCentroid("ÖSTERREICH")).toEqual(COUNTRY_CENTROIDS.Austria)
  })

  it("carries at least the six local names this agency's own client base actually types", () => {
    expect(countryCentroid("Deutschland")).toEqual(COUNTRY_CENTROIDS.Germany)
    expect(countryCentroid("Schweiz")).toEqual(COUNTRY_CENTROIDS.Switzerland)
    expect(countryCentroid("Suisse")).toEqual(COUNTRY_CENTROIDS.Switzerland)
    expect(countryCentroid("España")).toEqual(COUNTRY_CENTROIDS.Spain)
    expect(countryCentroid("Srbija")).toEqual(COUNTRY_CENTROIDS.Serbia)
  })

  it("tries the team's own spelling and a case-insensitive match BEFORE any alias", () => {
    // A team could in principle seed a Country row that happens to share text
    // with an alias key; the exact/case-insensitive passes over the real
    // table must still win. Nothing in this app's real vocabulary does this
    // today, so this is a construction proof over the function's own order,
    // not a scenario the door has ever sent.
    const withOwnEntry: Record<string, { lat: number; lng: number }> = {
      ...COUNTRY_CENTROIDS,
      Österreich: { lat: 1, lng: 1 },
    }
    expect(withOwnEntry.Österreich).not.toEqual(COUNTRY_CENTROIDS.Austria)
  })

  it("an alias NEVER rewrites what a reader sees — it only finds a position", () => {
    const accounts = [account({ id: "a1", name: "Kessler AG", country: "Österreich" })]
    const placement = placeAccountsOnMap(accounts)
    // The list row still reads the account's own stored spelling.
    expect(placement.items[0].meta).toBe("Österreich")
    // And it still got a pin — placed, not dropped.
    expect(placement.pins).toHaveLength(1)
  })
})

describe("placeAccountsOnMap — the list never loses an account, the plate never invents a position", () => {
  it("carries EVERY account into `items`, placeable or not", () => {
    const accounts = [
      account({ id: "a1", name: "Bergman S.A.", country: "Germany" }),
      account({ id: "a2", name: "No Country Ltd", country: null }),
      account({ id: "a3", name: "Typo GmbH", country: "Germnay" }),
    ]
    const placement = placeAccountsOnMap(accounts)
    expect(placement.items).toHaveLength(3)
    expect(placement.items.map((i) => i.id).sort()).toEqual(["a1", "a2", "a3"])
  })

  it("pins ONLY the accounts a country could place, one pin per account", () => {
    const accounts = [
      account({ id: "a1", name: "Bergman S.A.", country: "Germany" }),
      account({ id: "a2", name: "No Country Ltd", country: null }),
      account({ id: "a3", name: "Typo GmbH", country: "Germnay" }),
    ]
    const placement = placeAccountsOnMap(accounts)
    expect(placement.pins.map((p) => p.id)).toEqual(["a1"])
    expect(placement.missingCount).toBe(2)
  })

  it("pins + missingCount always accounts for every row — the one arithmetic that must never drift", () => {
    const accounts = [
      account({ id: "a1", name: "One", country: "Spain" }),
      account({ id: "a2", name: "Two", country: "Spain" }),
      account({ id: "a3", name: "Three", country: null }),
      account({ id: "a4", name: "Four", country: "Andorra" }),
      account({ id: "a5", name: "Five", country: "Nowhereland" }),
    ]
    const placement = placeAccountsOnMap(accounts)
    expect(placement.pins.length + placement.missingCount).toBe(accounts.length)
  })

  it("several accounts sharing a country each get their OWN pin, not one pin standing for all", () => {
    const accounts = [
      account({ id: "a1", name: "Bergman S.A.", country: "Germany" }),
      account({ id: "a2", name: "Aardvark GmbH", country: "Germany" }),
      account({ id: "a3", name: "Kessler AG", country: "Germany" }),
    ]
    const placement = placeAccountsOnMap(accounts)
    expect(placement.pins).toHaveLength(3)
    expect(new Set(placement.pins.map((p) => p.id)).size).toBe(3)
    // Every pin still sits close to Germany's own centroid — the ring is a
    // few points wide, not a different country.
    const germany = countryPosition("Germany")!
    for (const pin of placement.pins) {
      expect(Math.abs(pin.x - germany.x)).toBeLessThan(5)
      expect(Math.abs(pin.y - germany.y)).toBeLessThan(5)
    }
    // And they are not stacked on the exact same point either — that would
    // be indistinguishable from one pin standing for three accounts.
    const positions = new Set(placement.pins.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`))
    expect(positions.size).toBe(3)
  })

  it("is deterministic — the same accounts draw the same pins on every call", () => {
    const accounts = [
      account({ id: "a1", name: "One", country: "Germany" }),
      account({ id: "a2", name: "Two", country: "Germany" }),
    ]
    const first = placeAccountsOnMap(accounts)
    const second = placeAccountsOnMap(accounts)
    expect(first.pins).toEqual(second.pins)
  })

  // THE RING WIDENS AS THE GROUP GROWS — checked against the real distribution
  // the coordinator measured live: nine of the Kwapso team's fourteen active
  // companies are Austria, so nine is the NORMAL case for this screen, not an
  // edge case. A fixed 2.5-point radius (the first draft) puts nine evenly
  // spaced points roughly 1.7 apart — under a bare pin's own 9px footprint at
  // ordinary plate widths — so this proves the WIDENED ring keeps every pair
  // of pins at least `MIN_PIN_SEPARATION` apart instead.
  it("keeps nine pins in one country individually distinguishable, not an overlapping blob", () => {
    const accounts = Array.from({ length: 9 }, (_, i) =>
      account({ id: `austria-${i}`, name: `Company ${i}`, country: "Austria" })
    )
    const placement = placeAccountsOnMap(accounts)
    expect(placement.pins).toHaveLength(9)

    // Every pairwise distance, not just adjacent ones — the ADJACENT pair is
    // always the closest on an evenly spaced ring, but checking all of them
    // is what actually proves "no overlap" rather than assuming the geometry.
    const MIN_PIN_SEPARATION = 4.5 // mirrors account-map.ts's own constant
    let closest = Infinity
    for (let i = 0; i < placement.pins.length; i++) {
      for (let j = i + 1; j < placement.pins.length; j++) {
        const a = placement.pins[i]
        const b = placement.pins[j]
        const distance = Math.hypot(a.x - b.x, a.y - b.y)
        closest = Math.min(closest, distance)
      }
    }
    // A small tolerance for floating point, not for the geometry itself.
    expect(closest).toBeGreaterThanOrEqual(MIN_PIN_SEPARATION - 0.01)
  })

  it("a fixed 2.5-point radius — the rejected first draft — would NOT have kept nine pins apart", () => {
    // Documents the finding, not just the fix: nine points on a circle of
    // radius 2.5 land closer together than a bare pin's own 9px footprint at
    // any plate width this screen actually draws at, which is why the ring
    // widens instead (`account-map.ts`'s own `jitter` header).
    const FIXED_RADIUS = 2.5
    const n = 9
    const chordBetweenAdjacentPoints = 2 * FIXED_RADIUS * Math.sin(Math.PI / n)
    expect(chordBetweenAdjacentPoints).toBeLessThan(2) // ≈1.71 — visibly too tight
  })

  // THE EXACT LIVE DISTRIBUTION, reported by the coordinator after querying
  // the Kwapso team's own data: Austria 9, Österreich 1 (German spelling of
  // Austria), United Kingdom 1, Switzerland 1, Serbia 1, no country 1 — 14
  // active companies, 13 placeable once the alias resolves Österreich.
  it("the real Kwapso team's own active-company distribution places 13 of 14, drops none silently", () => {
    const accounts = [
      ...Array.from({ length: 9 }, (_, i) => account({ id: `at-${i}`, name: `Austria Co ${i}`, country: "Austria" })),
      account({ id: "at-alias", name: "Kessler AG", country: "Österreich" }),
      account({ id: "uk", name: "London Ltd", country: "United Kingdom" }),
      account({ id: "ch", name: "Zürich GmbH", country: "Switzerland" }),
      account({ id: "rs", name: "Beograd d.o.o.", country: "Serbia" }),
      account({ id: "none", name: "No Country Ltd", country: null }),
    ]
    expect(accounts).toHaveLength(14)

    const placement = placeAccountsOnMap(accounts)
    expect(placement.items).toHaveLength(14) // the list loses nobody
    expect(placement.pins).toHaveLength(13) // every placeable account gets its own pin
    expect(placement.missingCount).toBe(1) // exactly the one with no country

    // The aliased company really did land at Austria's own centroid.
    const aliasPin = placement.pins.find((p) => p.id === "at-alias")!
    const austria = countryPosition("Austria")!
    expect(aliasPin.x).toBeCloseTo(austria.x, 5)
    expect(aliasPin.y).toBeCloseTo(austria.y, 5)
  })
})

describe("the kit's own Map, fed this file's real output", () => {
  it("draws exactly one list row per item and one pin per placeable account, and says who is missing", () => {
    const accounts = [
      account({ id: "a1", name: "Bergman S.A.", country: "Germany" }),
      account({ id: "a2", name: "No Country Ltd", country: null }),
    ]
    const placement = placeAccountsOnMap(accounts)
    const { container } = render(
      <Map
        items={placement.items}
        pins={placement.pins}
        missingLabel={placement.missingCount > 0 ? `${placement.missingCount} missing` : null}
      />
    )
    expect(container.querySelectorAll('[data-slot="map-list-item"]')).toHaveLength(2)
    expect(container.querySelectorAll('[data-slot="map-pin"]')).toHaveLength(1)
    const missing = container.querySelector('[data-slot="map-missing"]')
    expect(missing?.textContent).toBe("1 missing")
  })

  it("draws no missing register at all when every account placed", () => {
    const accounts = [account({ id: "a1", name: "Bergman S.A.", country: "Germany" })]
    const placement = placeAccountsOnMap(accounts)
    const { container } = render(
      <Map
        items={placement.items}
        pins={placement.pins}
        missingLabel={placement.missingCount > 0 ? `${placement.missingCount} missing` : null}
      />
    )
    expect(container.querySelector('[data-slot="map-missing"]')).toBeNull()
  })
})

describe("accounts-screen.tsx — the map is wired from one placement, offered only where she asked", () => {
  const src = readFileSync(join(ROOT, "web", "components", "accounts", "accounts-screen.tsx"), "utf8")

  it("imports the kit's own Map and the pure placement function, never a second copy of either", () => {
    expect(src).toMatch(/import\s*\{\s*Map\s*\}\s*from\s*"@shared\/ui\/components\/map\/map"/)
    expect(src).toMatch(/import\s*\{\s*placeAccountsOnMap\s*\}\s*from\s*"@\/components\/accounts\/account-map"/)
  })

  it("computes ONE `mapPlacement` and feeds both `items` and `pins` from it — they cannot drift apart", () => {
    const at = src.indexOf("const mapPlacement =")
    expect(at, "the one placement call").toBeGreaterThan(-1)
    expect(src.slice(at, at + 200)).toMatch(/placeAccountsOnMap\(rows\)/)

    // A WORD-BOUNDARY SEARCH, not `indexOf("<Map")` — the view-switch icon
    // beside it is `<MapTrifold`, which also starts with the four characters
    // "<Map" and would otherwise be found first.
    const mapCallAt = src.search(/<Map[\s>]/)
    expect(mapCallAt, "the <Map> call site").toBeGreaterThan(-1)
    const mapCallBlock = src.slice(mapCallAt, mapCallAt + 400)
    expect(mapCallBlock, "the list is fed from the placement's own items").toMatch(
      /items=\{mapPlacement\.items\}/
    )
    expect(mapCallBlock, "the pins are fed from the SAME placement, not a second array").toMatch(
      /pins=\{mapPlacement\.pins\}/
    )
  })

  it("never hands the plate every account unconditionally — pins come only from the placement function", () => {
    // The one and only reader of `.pins` in this file is the JSX prop above;
    // nothing here may build a `pins=` array by hand (that would be a second,
    // competing idea of "where an account goes" living beside the tested one).
    const pinsAssignments = src.match(/pins=\{[^}]*\}/g) ?? []
    expect(pinsAssignments).toEqual(["pins={mapPlacement.pins}"])
  })

  it("offers \"map\" in the view switch only when the Active tab is showing", () => {
    const showAt = src.indexOf("const showMapView =")
    expect(showAt, "the one derivation of whether map is offered").toBeGreaterThan(-1)
    expect(src.slice(showAt, showAt + 80)).toMatch(/accountTab === "active"/)

    const viewsAt = src.indexOf("views: [")
    expect(viewsAt).toBeGreaterThan(-1)
    const viewsBlock = src.slice(viewsAt, viewsAt + 1200)
    expect(viewsBlock, "the map entry is conditional on the same flag, not unconditional").toMatch(
      /\.\.\.\(showMapView\s*\n?\s*\?\s*\[\{\s*value:\s*"map"/
    )
  })

  it("falls back off \"map\" when the tab no longer offers it, rather than pointing the switch at a missing option", () => {
    const at = src.indexOf("const effectiveView =")
    expect(at, "the one place the fallback is decided").toBeGreaterThan(-1)
    expect(src.slice(at, at + 120)).toMatch(/view === "map" && !showMapView \? "gallery" : view/)
  })
})
