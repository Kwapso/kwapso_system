// ACCOUNTS' THIRD VIEW, THE MAP — now a REAL Google map. Aurora's first
// ruling, 23 Sep 2026, shipped the kit's own tile-less plate; her second, the
// same day, replaced it: "ok but, there's no actual map lol, how do we get a
// google map there? remove the side panel, when i click in one i want a
// slight little overlay card with name and loogo and full adress (including
// ountry) then if i click there it takes me to detail screen." — and,
// choosing between the options laid out for her, "build with the google
// maps api."
//
// Five things must never regress, named directly in THIS round's own brief:
//
//   1. THE KEY IS NEVER A LITERAL. `GOOGLE_MAPS_BROWSER_KEY` is read off
//      `env` in exactly one worker file and nowhere else spells a Google
//      Maps key.
//   2. THE ABSENT-KEY STATE RENDERS. No key configured is an honest,
//      readable register — never a broken plate, never a crash.
//   3. A PIN CLICK OPENS THE CARD, AND THE CARD OPENS THE RECORD. Her own
//      two-step interaction, proved end to end against a faked Google Maps
//      SDK (nothing here can load the real one in a test).
//   4. AN ACCOUNT THE MAP CANNOT PLACE STILL APPEARS SOMEHOW — not as a row
//      in a list any more (she asked for that removed), but as a count the
//      caption under the map never omits.
//   5. THE PLATE NEVER INVENTS A POSITION. A country this app has no
//      centroid for (typo, unmatched vocabulary, or simply absent) must
//      never silently manufacture one — that is a guess wearing a fact's
//      clothes, exactly as it was under the old plate.
//
// `placeAccountsOnMap` (`web/components/accounts/account-map.ts`) is where
// (1)/(4)/(5) live, proved directly — no need to mount the whole screen to
// reach a bug that lives in one pure function. `GoogleAccountsMap`
// (`web/components/accounts/google-account-map.tsx`) is where (2)/(3) live,
// proved against a faked `window.google.maps` (a real script cannot load in
// a test environment). A last section is a WIRING CENSUS over
// `accounts-screen.tsx` itself, keyed by the expressions it must contain
// rather than a line number (this repo's own rule — a `file:line` key rots
// on the first edit above it).

import { cleanup, fireEvent, render, waitFor, within, act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { placeAccountsOnMap, type GeocodedAccount } from "@/components/accounts/account-map"
import { countryCentroid, countryPosition, COUNTRY_CENTROIDS } from "@/components/accounts/country-centroids"
import { GoogleAccountsMap } from "@/components/accounts/google-account-map"

afterEach(cleanup)

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")

const t = (english: string, vars?: Record<string, unknown>) =>
  vars ? english.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? "")) : english

/** The minimum an `Account` needs for these two files — every OTHER field on
 * the real type is irrelevant to placement, so it is left off rather than
 * faked, the same narrowing `accounts-screen-gallery.test.tsx`'s own
 * `COMPANIES` fixture already uses one screen over. */
function account(over: Partial<GeocodedAccount> & { id: string; name: string }): GeocodedAccount {
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
  } as unknown as GeocodedAccount
}

describe("countryCentroid/countryPosition — turning a country into a position (unchanged this round)", () => {
  it("places every seeded team's own six countries somewhere real", () => {
    for (const name of ["Germany", "Austria", "Switzerland", "Spain", "Andorra", "United Kingdom"]) {
      expect(countryCentroid(name), `${name} should resolve`).not.toBeNull()
    }
  })

  it("refuses to place null, blank, or an unmatched country — never a guess", () => {
    expect(countryCentroid(null)).toBeNull()
    expect(countryCentroid(undefined)).toBeNull()
    expect(countryCentroid("")).toBeNull()
    expect(countryCentroid("   ")).toBeNull()
    expect(countryCentroid("Narnia")).toBeNull()
  })

  it("matches case-insensitively — the one realistic typo, not a fuzzy guess", () => {
    expect(countryCentroid("germany")).toEqual(COUNTRY_CENTROIDS.Germany)
    expect(countryCentroid("GERMANY")).toEqual(COUNTRY_CENTROIDS.Germany)
  })

  it("resolves a local-language spelling to the same centroid as its English name", () => {
    expect(countryCentroid("Österreich")).toEqual(COUNTRY_CENTROIDS.Austria)
  })

  it("the table itself stays small — this is a placeholder, not a gazetteer", () => {
    expect(Object.keys(COUNTRY_CENTROIDS).length).toBeLessThan(120)
  })

  it("still projects onto a flat 0–100 plate too — countryPosition is kept, just unused by the real map", () => {
    const position = countryPosition("Germany")
    expect(position!.x).toBeGreaterThanOrEqual(0)
    expect(position!.x).toBeLessThanOrEqual(100)
  })
})

describe("placeAccountsOnMap — a real position per account, the plate never invents one", () => {
  it("accounts for EVERY row in pins + missingCount — the one arithmetic that must never drift", () => {
    const accounts = [
      account({ id: "a1", name: "Bergman S.A.", country: "Germany" }),
      account({ id: "a2", name: "No Country Ltd", country: null }),
      account({ id: "a3", name: "Typo GmbH", country: "Germnay" }),
      account({ id: "a4", name: "Geocoded AG", lat: 48.2, lng: 16.37 }),
    ]
    const placement = placeAccountsOnMap(accounts)
    expect(placement.totalCount).toBe(4)
    expect(placement.pins.length + placement.missingCount).toBe(4)
  })

  it("PLACES ONLY the accounts a geocode or a country could resolve, one pin per account", () => {
    const accounts = [
      account({ id: "a1", name: "Bergman S.A.", country: "Germany" }),
      account({ id: "a2", name: "No Country Ltd", country: null }),
      account({ id: "a3", name: "Typo GmbH", country: "Germnay" }),
    ]
    const placement = placeAccountsOnMap(accounts)
    expect(placement.pins.map((p) => p.id)).toEqual(["a1"])
    expect(placement.missingCount).toBe(2)
  })

  it("AN ACCOUNT THE MAP CANNOT PLACE STILL APPEARS SOMEHOW — as a count, never dropped in silence", () => {
    // No pin (no lat/lng, no resolvable country) — but the arithmetic proves
    // it is still COUNTED, which is what `google-account-map.tsx` turns into
    // the caption under the plate (see the render test below).
    const accounts = [account({ id: "ghost", name: "Nowhereland Ltd", country: "Nowhereland" })]
    const placement = placeAccountsOnMap(accounts)
    expect(placement.pins).toHaveLength(0)
    expect(placement.missingCount).toBe(1)
    expect(placement.totalCount).toBe(1)
  })

  it("a GEOCODED account uses its own stored lat/lng, exactly, marked non-approximate", () => {
    const accounts = [account({ id: "a1", name: "Bergman S.A.", country: "Germany", lat: 52.52, lng: 13.405 })]
    const placement = placeAccountsOnMap(accounts)
    expect(placement.pins).toHaveLength(1)
    expect(placement.pins[0]).toMatchObject({ lat: 52.52, lng: 13.405, approximate: false })
  })

  it("a geocoded account never joins its ungeocoded countrymates' ring", () => {
    const accounts = [
      account({ id: "geo", name: "Exact GmbH", country: "Germany", lat: 50, lng: 10 }),
      account({ id: "cent", name: "Approx GmbH", country: "Germany" }),
    ]
    const placement = placeAccountsOnMap(accounts)
    const exact = placement.pins.find((p) => p.id === "geo")!
    const approx = placement.pins.find((p) => p.id === "cent")!
    expect(exact.approximate).toBe(false)
    expect(exact).toMatchObject({ lat: 50, lng: 10 })
    expect(approx.approximate).toBe(true)
    // The centroid-fallback pin sits AT Germany's own centroid (a lone
    // account in its group needs no ring — see account-map.ts's header).
    expect(approx.lat).toBeCloseTo(COUNTRY_CENTROIDS.Germany.lat, 5)
    expect(approx.lng).toBeCloseTo(COUNTRY_CENTROIDS.Germany.lng, 5)
  })

  it("null/undefined lat or lng (not both) still falls back to the country centroid", () => {
    const accounts = [account({ id: "a1", name: "Half Geocoded", country: "Spain", lat: 40, lng: null })]
    const placement = placeAccountsOnMap(accounts)
    expect(placement.pins[0].approximate).toBe(true)
  })

  it("builds the full address the same way account-detail.tsx's own overview panel does", () => {
    const accounts = [
      account({
        id: "a1",
        name: "Bergman S.A.",
        street: "Hauptstraße 1",
        postalCode: "1010",
        city: "Wien",
        country: "Austria",
      }),
    ]
    const placement = placeAccountsOnMap(accounts)
    expect(placement.pins[0].address).toBe("Hauptstraße 1, 1010, Wien, Austria")
  })

  it("an account with only a country still gets an address string, built from what it has", () => {
    const accounts = [account({ id: "a1", name: "Bare Ltd", country: "Spain" })]
    const placement = placeAccountsOnMap(accounts)
    expect(placement.pins[0].address).toBe("Spain")
  })

  it("an account with no address fields at all AND no country gets an empty address, never a crash", () => {
    // No country means no pin either (nothing to place it by) — reached
    // through the exact-lat/lng path instead, so an address can still be
    // built (or, here, be genuinely empty) without a country deciding it.
    const accounts = [account({ id: "a1", name: "Bare Ltd", lat: 10, lng: 10 })]
    const placement = placeAccountsOnMap(accounts)
    expect(placement.pins[0].address).toBe("")
  })

  it("is deterministic — the same accounts draw the same pins on every call", () => {
    const accounts = [
      account({ id: "a1", name: "One", country: "Germany" }),
      account({ id: "a2", name: "Two", country: "Germany" }),
    ]
    expect(placeAccountsOnMap(accounts).pins).toEqual(placeAccountsOnMap(accounts).pins)
  })

  it("several accounts sharing a country each get their OWN pin, spread in a ring of degrees, never stacked", () => {
    const accounts = [
      account({ id: "a1", name: "Bergman S.A.", country: "Germany" }),
      account({ id: "a2", name: "Aardvark GmbH", country: "Germany" }),
      account({ id: "a3", name: "Kessler AG", country: "Germany" }),
    ]
    const placement = placeAccountsOnMap(accounts)
    expect(placement.pins).toHaveLength(3)
    expect(new Set(placement.pins.map((p) => p.id)).size).toBe(3)
    const germany = COUNTRY_CENTROIDS.Germany
    for (const pin of placement.pins) {
      // Within the ring's own ceiling (3°) of Germany's own centroid — a
      // few dozen kilometres, not a different country.
      expect(Math.abs(pin.lat - germany.lat)).toBeLessThan(3.01)
      expect(Math.abs(pin.lng - germany.lng)).toBeLessThan(3.01)
    }
    const positions = new Set(placement.pins.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`))
    expect(positions.size).toBe(3)
  })

  it("keeps nine pins in one country individually distinguishable, not an overlapping blob", () => {
    // Real, measured distribution: nine of the Kwapso team's own fourteen
    // active companies are Austria.
    const accounts = Array.from({ length: 9 }, (_, i) =>
      account({ id: `austria-${i}`, name: `Company ${i}`, country: "Austria" })
    )
    const placement = placeAccountsOnMap(accounts)
    expect(placement.pins).toHaveLength(9)

    const MIN_PIN_SEPARATION_DEG = 0.35 // mirrors account-map.ts's own constant
    let closest = Infinity
    for (let i = 0; i < placement.pins.length; i++) {
      for (let j = i + 1; j < placement.pins.length; j++) {
        const a = placement.pins[i]
        const b = placement.pins[j]
        closest = Math.min(closest, Math.hypot(a.lat - b.lat, a.lng - b.lng))
      }
    }
    expect(closest).toBeGreaterThanOrEqual(MIN_PIN_SEPARATION_DEG - 0.001)
  })

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
    expect(placement.totalCount).toBe(14)
    expect(placement.pins).toHaveLength(13)
    expect(placement.missingCount).toBe(1)

    const aliasPin = placement.pins.find((p) => p.id === "at-alias")!
    expect(aliasPin.lat).toBeCloseTo(COUNTRY_CENTROIDS.Austria.lat, 5)
    expect(aliasPin.lng).toBeCloseTo(COUNTRY_CENTROIDS.Austria.lng, 5)
  })
})

/* ─────────────────────────── THE FAKE GOOGLE MAPS SDK ─────────────────────
 * Nothing here can load the real Maps JavaScript API in a test environment
 * (it is a live, billed, network-loaded script) — so this is a small,
 * faithful stand-in for the four pieces of it `google-account-map.tsx`
 * actually calls: `Map`, `Marker`, `InfoWindow`, `LatLngBounds`. Every method
 * on it is real Maps JS API surface; nothing here invents a method the
 * component does not call in production. */
type Handler = () => void

class FakeMarker {
  static instances: FakeMarker[] = []
  handlers: Record<string, Handler> = {}
  options: Record<string, unknown>
  constructor(options: Record<string, unknown>) {
    this.options = options
    FakeMarker.instances.push(this)
  }
  addListener(event: string, handler: Handler) {
    this.handlers[event] = handler
  }
  setMap() {
    /* no-op for the fake */
  }
}

class FakeInfoWindow {
  static instances: FakeInfoWindow[] = []
  content: Node | null = null
  opened = false
  closeSpy = vi.fn()
  handlers: Record<string, Handler> = {}
  constructor() {
    FakeInfoWindow.instances.push(this)
  }
  setContent(node: Node) {
    this.content = node
  }
  open() {
    this.opened = true
  }
  close() {
    this.opened = false
    this.closeSpy()
  }
  addListener(event: string, handler: Handler) {
    this.handlers[event] = handler
  }
}

class FakeLatLngBounds {
  extend() {
    /* no-op for the fake */
  }
}

class FakeMap {
  handlers: Record<string, Handler> = {}
  addListener(event: string, handler: Handler) {
    this.handlers[event] = handler
  }
  setCenter() {
    /* no-op */
  }
  setZoom() {
    /* no-op */
  }
  fitBounds() {
    /* no-op */
  }
}

function installFakeGoogleMaps() {
  FakeMarker.instances = []
  FakeInfoWindow.instances = []
  ;(window as unknown as { google: unknown }).google = {
    maps: { Map: FakeMap, Marker: FakeMarker, InfoWindow: FakeInfoWindow, LatLngBounds: FakeLatLngBounds },
  }
}

function uninstallFakeGoogleMaps() {
  delete (window as unknown as { google?: unknown }).google
}

/** Simulates the `<script>` tag `google-account-map.tsx`'s own loader
 * injects finishing its load — jsdom never actually fetches it, so the test
 * fires the `onload` it registered by hand, exactly as a real network load
 * would once the SDK is ready (the fake `window.google` above stands in for
 * what that real load would have defined). */
async function resolveMapsScript() {
  await waitFor(() => {
    const script = document.head.querySelector<HTMLScriptElement>('script[src^="https://maps.googleapis.com"]')
    expect(script).not.toBeNull()
  })
  const script = document.head.querySelector<HTMLScriptElement>('script[src^="https://maps.googleapis.com"]')!
  await act(async () => {
    script.onload?.(new Event("load"))
    await Promise.resolve()
    await Promise.resolve()
  })
}

const examplePin = {
  id: "acc-1",
  name: "Bergman S.A.",
  logoUrl: null,
  address: "Hauptstraße 1, 1010, Wien, Austria",
  lat: 48.2,
  lng: 16.37,
  approximate: false,
}

describe("GoogleAccountsMap — the absent-key state renders, honestly", () => {
  beforeEach(uninstallFakeGoogleMaps)

  it("draws the kit's own empty register when no key is configured, never a broken plate", () => {
    const { getByText, container } = render(
      <GoogleAccountsMap
        pins={[]}
        missingCount={0}
        totalCount={0}
        scriptUrl={null}
        t={t}
        onOpenAccount={vi.fn()}
      />
    )
    expect(getByText("Connect Google Maps to see accounts here.")).toBeTruthy()
    // And it never even asked the network for the SDK.
    expect(document.head.querySelector('script[src^="https://maps.googleapis.com"]')).toBeNull()
    expect(container.querySelector('[data-state="empty"]')).not.toBeNull()
  })

  it("draws the kit's own loading register while the door has not answered yet", () => {
    const { container } = render(
      <GoogleAccountsMap
        pins={[]}
        missingCount={0}
        totalCount={0}
        scriptUrl={undefined}
        t={t}
        onOpenAccount={vi.fn()}
      />
    )
    expect(container.querySelector('[data-state="loading"]')).not.toBeNull()
  })
})

describe("GoogleAccountsMap — a pin click opens the card, and the card opens the record", () => {
  beforeEach(installFakeGoogleMaps)
  afterEach(uninstallFakeGoogleMaps)

  it("clicking a marker opens an overlay card with the account's name, logo mark and full address", async () => {
    const onOpenAccount = vi.fn()
    render(
      <GoogleAccountsMap
        pins={[examplePin]}
        missingCount={0}
        totalCount={1}
        scriptUrl="https://maps.googleapis.com/maps/api/js?key=test-key"
        t={t}
        onOpenAccount={onOpenAccount}
      />
    )
    await resolveMapsScript()
    await waitFor(() => expect(FakeMarker.instances).toHaveLength(1))

    await act(async () => {
      FakeMarker.instances[0].handlers.click()
    })

    const infoWindow = FakeInfoWindow.instances[0]
    expect(infoWindow.content).not.toBeNull()
    const card = within(infoWindow.content as HTMLElement)
    expect(card.getByText("Bergman S.A.")).toBeTruthy()
    expect(card.getByText("Hauptstraße 1, 1010, Wien, Austria")).toBeTruthy()

    // The card itself opens the record — her second click.
    fireEvent.click(card.getByText("Bergman S.A."))
    expect(onOpenAccount).toHaveBeenCalledWith("acc-1")
  })

  it("the card's own close button dismisses it WITHOUT opening the record", async () => {
    const onOpenAccount = vi.fn()
    render(
      <GoogleAccountsMap
        pins={[examplePin]}
        missingCount={0}
        totalCount={1}
        scriptUrl="https://maps.googleapis.com/maps/api/js?key=test-key"
        t={t}
        onOpenAccount={onOpenAccount}
      />
    )
    await resolveMapsScript()
    await waitFor(() => expect(FakeMarker.instances).toHaveLength(1))
    await act(async () => {
      FakeMarker.instances[0].handlers.click()
    })

    const infoWindow = FakeInfoWindow.instances[0]
    const card = within(infoWindow.content as HTMLElement)
    fireEvent.click(card.getByLabelText("Close"))

    expect(infoWindow.closeSpy).toHaveBeenCalled()
    expect(onOpenAccount).not.toHaveBeenCalled()
  })

  it("marks an approximate (country-centroid) pin's card so a reader is never told a guess is a fact", async () => {
    render(
      <GoogleAccountsMap
        pins={[{ ...examplePin, approximate: true }]}
        missingCount={0}
        totalCount={1}
        scriptUrl="https://maps.googleapis.com/maps/api/js?key=test-key"
        t={t}
        onOpenAccount={vi.fn()}
      />
    )
    await resolveMapsScript()
    await waitFor(() => expect(FakeMarker.instances).toHaveLength(1))
    await act(async () => {
      FakeMarker.instances[0].handlers.click()
    })
    const card = within(FakeInfoWindow.instances[0].content as HTMLElement)
    expect(card.getByText("Approximate location")).toBeTruthy()
  })
})

describe("GoogleAccountsMap — an ungeocodable account still appears somehow, as an honest count", () => {
  beforeEach(installFakeGoogleMaps)
  afterEach(uninstallFakeGoogleMaps)

  it("says exactly how many of how many are shown when some accounts have no pin", () => {
    const { getByText } = render(
      <GoogleAccountsMap
        pins={[examplePin]}
        missingCount={1}
        totalCount={2}
        scriptUrl="https://maps.googleapis.com/maps/api/js?key=test-key"
        t={t}
        onOpenAccount={vi.fn()}
      />
    )
    expect(getByText("1 of 2 accounts are shown on the map — 1 could not be placed.")).toBeTruthy()
  })

  it("says every account is shown, with no caveat, when nothing is missing", () => {
    const { getByText } = render(
      <GoogleAccountsMap
        pins={[examplePin]}
        missingCount={0}
        totalCount={1}
        scriptUrl="https://maps.googleapis.com/maps/api/js?key=test-key"
        t={t}
        onOpenAccount={vi.fn()}
      />
    )
    expect(getByText("All 1 accounts are shown on the map.")).toBeTruthy()
  })
})

describe("the key is never a literal", () => {
  const mapsConfigSrc = readFileSync(join(ROOT, "workers", "tenancy", "src", "routes", "maps-config.ts"), "utf8")
  const googleMapSrc = readFileSync(join(ROOT, "web", "components", "accounts", "google-account-map.tsx"), "utf8")
  // Google Maps/Cloud API keys are shaped `AIza` + 35 more base64url
  // characters — checked for, never assumed absent by eye.
  const KEY_SHAPE = /AIza[0-9A-Za-z_-]{35}/

  it("the worker door reads the key off `env`, and only off `env`", () => {
    expect(mapsConfigSrc).toMatch(/env\.GOOGLE_MAPS_BROWSER_KEY/)
    expect(mapsConfigSrc).not.toMatch(KEY_SHAPE)
  })

  it("the browser component never carries a key literal of its own", () => {
    expect(googleMapSrc).not.toMatch(KEY_SHAPE)
    // It only ever forwards whatever `scriptUrl` it was handed — it never
    // builds a `maps.googleapis.com` URL of its own with a `key=` on it.
    expect(googleMapSrc).not.toMatch(/[?&]key=/)
  })

  it("no tracked source anywhere in the repo carries a Google Maps key shape", () => {
    // A last, broad net over the three files this round actually touches —
    // narrower than a whole-repo grep (slow, and not this lane's to police
    // every other file), but wide enough that a key pasted into any of them
    // by mistake still fails the build.
    for (const src of [
      mapsConfigSrc,
      googleMapSrc,
      readFileSync(join(ROOT, "web", "components", "accounts", "account-map.ts"), "utf8"),
      readFileSync(join(ROOT, "web", "components", "accounts", "accounts-screen.tsx"), "utf8"),
      readFileSync(join(ROOT, "web", "lib", "api", "tenancy.ts"), "utf8"),
      readFileSync(join(ROOT, "workers", "tenancy", "src", "env.ts"), "utf8"),
    ]) {
      expect(src).not.toMatch(KEY_SHAPE)
    }
  })
})

describe("accounts-screen.tsx — the real map is wired from one placement, offered only where she asked", () => {
  const src = readFileSync(join(ROOT, "web", "components", "accounts", "accounts-screen.tsx"), "utf8")

  it("imports the real map component and the pure placement function, never a second copy of either", () => {
    expect(src).toMatch(
      /import\s*\{\s*GoogleAccountsMap\s*\}\s*from\s*"@\/components\/accounts\/google-account-map"/
    )
    expect(src).toMatch(/import\s*\{\s*placeAccountsOnMap\s*\}\s*from\s*"@\/components\/accounts\/account-map"/)
    // The kit's own plate is retired at this call site — the real map
    // supplies its own tiles now (google-account-map.tsx's own header).
    expect(src).not.toMatch(/import\s*\{\s*Map\s*\}\s*from\s*"@shared\/ui\/components\/map\/map"/)
  })

  it("computes ONE `mapPlacement` and feeds `<GoogleAccountsMap>` from it — pins and counts cannot drift apart", () => {
    const at = src.indexOf("const mapPlacement =")
    expect(at, "the one placement call").toBeGreaterThan(-1)
    expect(src.slice(at, at + 200)).toMatch(/placeAccountsOnMap\(rows\)/)

    // The literal, real JSX call site — never the header prose, which quotes
    // `` `<GoogleAccountsMap>` `` (immediately closed, no newline) when
    // explaining the wiring in words a few hundred characters earlier.
    const callAt = src.indexOf("<GoogleAccountsMap\n")
    expect(callAt, "the <GoogleAccountsMap> call site").toBeGreaterThan(-1)
    const block = src.slice(callAt, callAt + 500)
    expect(block).toMatch(/pins=\{mapPlacement\.pins\}/)
    expect(block).toMatch(/missingCount=\{mapPlacement\.missingCount\}/)
    expect(block).toMatch(/totalCount=\{mapPlacement\.totalCount\}/)
    expect(block).toMatch(/scriptUrl=\{mapsConfigQ\.data\?\.scriptUrl\}/)
  })

  it("never hands the map a hand-built pins array — the one and only reader of `.pins` is the JSX prop above", () => {
    const pinsAssignments = src.match(/pins=\{[^}]*\}/g) ?? []
    expect(pinsAssignments).toEqual(["pins={mapPlacement.pins}"])
  })

  it("fetches the maps config door only while the map is actually the body on screen", () => {
    const at = src.indexOf("const mapsConfigQ =")
    expect(at, "the one config fetch").toBeGreaterThan(-1)
    expect(src.slice(at, at + 200)).toMatch(/effectiveView === "map" \? "maps-config" : null/)
    expect(src.slice(at, at + 200)).toMatch(/tenancy\.mapsConfig\(\)/)
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
