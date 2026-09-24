// AN ACCOUNT GETS A POSITION (migration 0118), Aurora's brief, 23 Sep 2026:
// a real Google map needs a real position per account, geocoded best-effort
// at write time under a server-side `GOOGLE_MAPS_GEOCODE_KEY`, never the
// browser's own `GOOGLE_MAPS_BROWSER_KEY`. Four things must never regress,
// named directly in the brief:
//
//   1. THE GEOCODE NEVER BLOCKS OR FAILS THE WRITE. No key, a network error,
//      a timeout, an address Google cannot resolve, an account always
//      saves, and every one of those leaves `lat`/`lng` `null` rather than
//      raising.
//   2. ONLY RE-GEOCODE WHEN IT IS WORTH IT. `updateAccount` asks Google again
//      only when at least one of the four address fields actually changed.
//   3. A STALE POSITION IS NEVER LEFT UNDER A NEW ADDRESS. When the address
//      changes and the new one cannot be resolved, the OLD `lat`/`lng` are
//      cleared rather than kept.
//   4. THE KEY IS NEVER A LITERAL, and the two Google Maps keys (this file's
//      server-side one, `routes/maps-config.ts`'s browser-facing one) never
//      cross.
//
// The first three are proved through the REAL doors (`POST /api/tenancy/
// accounts` and `/accounts/update`) over the REAL migrated schema, the same
// shape `account-manager.test.ts` and `account-patch.test.ts` already use,
// because the interesting half of this feature is the WIRING: does the
// worker's actual write path call `geocodeAddress`, under the actual
// `GOOGLE_MAPS_GEOCODE_KEY`, and does a failure there actually leave the
// write alone? `geocodeAddress`/`addressChanged` themselves (./lib/
// geocode.ts) are proved directly first, pure, no server needed.

import type { DatabaseSync } from "node:sqlite"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("./d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import worker from "../src/index"
import { buildSpineDb, IDS, makeEnv, req } from "./spine-harness"
import { addressChanged, geocodeAddress } from "../src/lib/geocode"
import { SELECTABLE_GROUPS } from "@shared/selectable-groups"

const ROOT = join(__dirname, "..", "..", "..")

/** The real worker, the real doors, an env that carries whatever this test
 * asks for on top of the ordinary harness, `GOOGLE_MAPS_GEOCODE_KEY` above
 * all, since `makeEnv` (spine-harness.ts) knows nothing about a feature that
 * did not exist when it was written. */
async function call(
  request: Request,
  userId: string,
  extraEnv: Record<string, unknown> = {}
): Promise<{ status: number; text: string }> {
  const base = makeEnv(() => holder.db as DatabaseSync, userId) as unknown as Record<string, unknown>
  const res = await worker.fetch(request, { ...base, ...extraEnv } as never)
  return { status: res.status, text: await res.text() }
}

const accountRow = (id: string) =>
  holder.db!.prepare("SELECT * FROM accounts WHERE id = ?").get(id) as Record<string, unknown>

const okResponse = (lat: number, lng: number) =>
  new Response(JSON.stringify({ status: "OK", results: [{ geometry: { location: { lat, lng } } }] }), { status: 200 })

/** A COUNTRY GOOGLE CANNOT RESOLVE, AND THE TEAM CAN STILL OFFER.
 *
 * The two door cases below are about the GEOCODER giving up, not about the
 * vocabulary, and they were written while an account's country was free text.
 * Since team migration 0120 the write door refuses a country that is not one
 * of the team's current options (`requirePickedAccountValues`,
 * workers/tenancy/src/lib/accounts.ts) -- Aurora's 23 Sep 2026 ruling, "make
 * it a drop down, adjustable on settings", which the country had been ruled
 * into long before and never enforced.
 *
 * SO THE WORD GOES ON THE LIST rather than out of the test. Swapping in a real
 * country would change what these cases are about (Google resolves "Austria"),
 * and dropping the country would stop handing the geocoder an address at all.
 * The pure `geocodeAddress` case further up needs none of this: it never
 * touches a door. */
const NOWHERELAND = "Nowhereland"

function offerNowhereland(): void {
  ;(holder.db as DatabaseSync)
    .prepare(
      `INSERT INTO selectable_data (id, type, value, is_default, created_at, creator_name)
       VALUES (lower(hex(randomblob(16))), ?, ?, 0, datetime('now'), 'Test')`
    )
    .run(SELECTABLE_GROUPS.country, NOWHERELAND)
}

beforeEach(() => {
  holder.db = buildSpineDb()
  offerNowhereland()
})
afterEach(() => vi.unstubAllGlobals())

describe("geocodeAddress, never throws, whatever went wrong", () => {
  it("no key configured: null, and no network call at all", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    const result = await geocodeAddress({}, { street: "1 Main St", postalCode: null, city: null, country: "Austria" })
    expect(result).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("no address fields at all: null, and no network call, nothing to send", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    const result = await geocodeAddress(
      { GOOGLE_MAPS_GEOCODE_KEY: "k" },
      { street: null, postalCode: null, city: null, country: null }
    )
    expect(result).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("a resolved address returns {lat, lng}", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(48.2, 16.37)))
    const result = await geocodeAddress(
      { GOOGLE_MAPS_GEOCODE_KEY: "k" },
      { street: null, postalCode: null, city: null, country: "Austria" }
    )
    expect(result).toEqual({ lat: 48.2, lng: 16.37 })
  })

  it("a network error is caught, never rethrown", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed")
      })
    )
    const result = await geocodeAddress(
      { GOOGLE_MAPS_GEOCODE_KEY: "k" },
      { street: null, postalCode: null, city: null, country: "Austria" }
    )
    expect(result).toBeNull()
  })

  it("a timeout is caught, never rethrown", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw Object.assign(new Error("The operation was aborted"), { name: "TimeoutError" })
      })
    )
    const result = await geocodeAddress(
      { GOOGLE_MAPS_GEOCODE_KEY: "k" },
      { street: null, postalCode: null, city: null, country: "Austria" }
    )
    expect(result).toBeNull()
  })

  it("an address Google could not resolve (ZERO_RESULTS) is null, not a throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "ZERO_RESULTS", results: [] }), { status: 200 })))
    const result = await geocodeAddress(
      { GOOGLE_MAPS_GEOCODE_KEY: "k" },
      { street: null, postalCode: null, city: null, country: "Nowhereland" }
    )
    expect(result).toBeNull()
  })

  it("an HTTP-level failure is null, not a throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })))
    const result = await geocodeAddress(
      { GOOGLE_MAPS_GEOCODE_KEY: "k" },
      { street: null, postalCode: null, city: null, country: "Austria" }
    )
    expect(result).toBeNull()
  })

  it("a malformed body (no lat/lng shape) is null, not a throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "OK", results: [{}] }), { status: 200 })))
    const result = await geocodeAddress(
      { GOOGLE_MAPS_GEOCODE_KEY: "k" },
      { street: null, postalCode: null, city: null, country: "Austria" }
    )
    expect(result).toBeNull()
  })
})

describe("addressChanged, only the four address fields, empty-normalised", () => {
  const base = { street: "a", postalCode: "1", city: "c", country: "AT" }

  it("no change when nothing moved", () => {
    expect(addressChanged(base, { ...base })).toBe(false)
  })

  it("undefined and null both read as absent, a patch that mentions nothing looks unchanged", () => {
    expect(
      addressChanged(
        { street: null, postalCode: null, city: null, country: null },
        { street: undefined as unknown as null, postalCode: null, city: null, country: null }
      )
    ).toBe(false)
  })

  it("a change to any one of the four fields counts", () => {
    expect(addressChanged(base, { ...base, street: "b" })).toBe(true)
    expect(addressChanged(base, { ...base, postalCode: "2" })).toBe(true)
    expect(addressChanged(base, { ...base, city: "d" })).toBe(true)
    expect(addressChanged(base, { ...base, country: "DE" })).toBe(true)
  })
})

describe("createAccount, the geocode never blocks or fails the write", () => {
  it("a network failure still creates the account, lat/lng left null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed")
      })
    )
    const { status, text } = await call(
      req("POST /api/tenancy/accounts", {
        accountType: "entity",
        name: "Padelbase",
        street: "Hauptstraße 1",
        country: "Austria",
      }),
      IDS.staffUser,
      { GOOGLE_MAPS_GEOCODE_KEY: "test-key" }
    )
    expect(status, text).toBe(200)
    const { id } = JSON.parse(text) as { id: string }
    const row = accountRow(id)
    expect(row.lat).toBeNull()
    expect(row.lng).toBeNull()
  })

  it("no key configured still creates the account, and never asks the network at all", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    const { status, text } = await call(
      req("POST /api/tenancy/accounts", {
        accountType: "entity",
        name: "Padelbase",
        street: "Hauptstraße 1",
        country: "Austria",
      }),
      IDS.staffUser
      // no GOOGLE_MAPS_GEOCODE_KEY, the ordinary harness env, unset
    )
    expect(status, text).toBe(200)
    expect(fetchSpy).not.toHaveBeenCalled()
    const { id } = JSON.parse(text) as { id: string }
    const row = accountRow(id)
    expect(row.lat).toBeNull()
    expect(row.lng).toBeNull()
  })

  it("an address Google cannot resolve still creates the account, lat/lng left null", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "ZERO_RESULTS", results: [] }), { status: 200 })))
    const { status, text } = await call(
      req("POST /api/tenancy/accounts", { accountType: "entity", name: "Padelbase", country: NOWHERELAND }),
      IDS.staffUser,
      { GOOGLE_MAPS_GEOCODE_KEY: "test-key" }
    )
    expect(status, text).toBe(200)
    const { id } = JSON.parse(text) as { id: string }
    const row = accountRow(id)
    expect(row.lat).toBeNull()
    expect(row.lng).toBeNull()
  })

  it("a resolved address stores the position on the row", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(48.2, 16.37)))
    const { status, text } = await call(
      req("POST /api/tenancy/accounts", {
        accountType: "entity",
        name: "Padelbase",
        street: "Hauptstraße 1",
        country: "Austria",
      }),
      IDS.staffUser,
      { GOOGLE_MAPS_GEOCODE_KEY: "test-key" }
    )
    expect(status, text).toBe(200)
    const { id } = JSON.parse(text) as { id: string }
    const row = accountRow(id)
    expect(row.lat).toBeCloseTo(48.2)
    expect(row.lng).toBeCloseTo(16.37)
  })

  it("an account with no address at all still creates cleanly, and never asks Google", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    const { status } = await call(
      req("POST /api/tenancy/accounts", { accountType: "entity", name: "No Address Ltd" }),
      IDS.staffUser,
      { GOOGLE_MAPS_GEOCODE_KEY: "test-key" }
    )
    expect(status).toBe(200)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe("updateAccount, only re-geocodes when the address actually changed", () => {
  function seedVictimPosition() {
    holder
      .db!.prepare("UPDATE accounts SET street = ?, country = ?, lat = ?, lng = ? WHERE id = ?")
      .run("Hauptstraße 1", "Austria", 48.2, 16.37, IDS.victimAccount)
  }

  it("an edit that never touches the address never calls Google again, and the position survives", async () => {
    seedVictimPosition()
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    const { status, text } = await call(
      req("POST /api/tenancy/accounts/update", { id: IDS.victimAccount, name: "Bergman S.A. Renamed" }),
      IDS.staffUser,
      { GOOGLE_MAPS_GEOCODE_KEY: "test-key" }
    )
    expect(status, text).toBe(200)
    expect(fetchSpy, "no address field changed, geocoding must not be asked for").not.toHaveBeenCalled()
    const row = accountRow(IDS.victimAccount)
    expect(row.lat).toBeCloseTo(48.2)
    expect(row.lng).toBeCloseTo(16.37)
  })

  it("saving the SAME address back unchanged never calls Google either", async () => {
    seedVictimPosition()
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    const { status, text } = await call(
      req("POST /api/tenancy/accounts/update", {
        id: IDS.victimAccount,
        name: "Bergman S.A.",
        street: "Hauptstraße 1",
        country: "Austria",
      }),
      IDS.staffUser,
      { GOOGLE_MAPS_GEOCODE_KEY: "test-key" }
    )
    expect(status, text).toBe(200)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("a changed address re-geocodes and overwrites the stored position", async () => {
    seedVictimPosition()
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(52.52, 13.405)))
    const { status, text } = await call(
      req("POST /api/tenancy/accounts/update", {
        id: IDS.victimAccount,
        name: "Bergman S.A.",
        street: "Torstraße 1",
        country: "Germany",
      }),
      IDS.staffUser,
      { GOOGLE_MAPS_GEOCODE_KEY: "test-key" }
    )
    expect(status, text).toBe(200)
    const row = accountRow(IDS.victimAccount)
    expect(row.lat).toBeCloseTo(52.52)
    expect(row.lng).toBeCloseTo(13.405)
  })

  it("a changed address Google cannot resolve CLEARS the stale position rather than keeping it", async () => {
    seedVictimPosition()
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "ZERO_RESULTS", results: [] }), { status: 200 })))
    const { status, text } = await call(
      req("POST /api/tenancy/accounts/update", {
        id: IDS.victimAccount,
        name: "Bergman S.A.",
        street: "Nowhere Ave",
        country: NOWHERELAND,
      }),
      IDS.staffUser,
      { GOOGLE_MAPS_GEOCODE_KEY: "test-key" }
    )
    expect(status, text).toBe(200)
    const row = accountRow(IDS.victimAccount)
    expect(row.lat, "the OLD Austrian position must not survive under the NEW, unresolved address").toBeNull()
    expect(row.lng).toBeNull()
  })

  it("a network failure on re-geocode still saves the rest of the edit, position left null", async () => {
    seedVictimPosition()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed")
      })
    )
    const { status, text } = await call(
      req("POST /api/tenancy/accounts/update", {
        id: IDS.victimAccount,
        name: "Bergman S.A.",
        street: "New Street",
        country: "Austria",
      }),
      IDS.staffUser,
      { GOOGLE_MAPS_GEOCODE_KEY: "test-key" }
    )
    expect(status, text).toBe(200)
    const row = accountRow(IDS.victimAccount)
    expect(row.street).toBe("New Street")
    expect(row.lat).toBeNull()
    expect(row.lng).toBeNull()
  })

  it("a from-nothing address on a record that had none before is geocoded", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(1, 2)))
    const { status, text } = await call(
      req("POST /api/tenancy/accounts/update", { id: IDS.victimAccount, name: "Bergman S.A.", street: "First Address" }),
      IDS.staffUser,
      { GOOGLE_MAPS_GEOCODE_KEY: "test-key" }
    )
    expect(status, text).toBe(200)
    const row = accountRow(IDS.victimAccount)
    expect(row.lat).toBeCloseTo(1)
    expect(row.lng).toBeCloseTo(2)
  })
})

describe("the geocode key is never a literal, and the two Google Maps keys never cross", () => {
  const geocodeSrc = readFileSync(join(ROOT, "workers", "tenancy", "src", "lib", "geocode.ts"), "utf8")
  const accountsSrc = readFileSync(join(ROOT, "workers", "tenancy", "src", "lib", "accounts.ts"), "utf8")
  const envSrc = readFileSync(join(ROOT, "workers", "tenancy", "src", "env.ts"), "utf8")
  const mapsConfigSrc = readFileSync(join(ROOT, "workers", "tenancy", "src", "routes", "maps-config.ts"), "utf8")
  // Google Maps/Cloud API keys are shaped `AIza` + 35 more base64url
  // characters, checked for, never assumed absent by eye (the same shape
  // web/test/accounts-map-view.test.tsx already holds the browser key to).
  const KEY_SHAPE = /AIza[0-9A-Za-z_-]{35}/

  it("geocode.ts reads the key off env, and only off env", () => {
    expect(geocodeSrc).toMatch(/env\.GOOGLE_MAPS_GEOCODE_KEY/)
    expect(geocodeSrc).not.toMatch(KEY_SHAPE)
  })

  it("no tracked source this round touches carries a Google Maps key shape", () => {
    for (const src of [geocodeSrc, accountsSrc, envSrc, mapsConfigSrc]) expect(src).not.toMatch(KEY_SHAPE)
  })

  it("the browser-facing maps-config door never reads the server-side geocode key", () => {
    expect(mapsConfigSrc).not.toMatch(/GOOGLE_MAPS_GEOCODE_KEY/)
  })

  it("the server-side geocode path never READS the browser's own key (naming it in prose is fine)", () => {
    expect(geocodeSrc).not.toMatch(/env\.GOOGLE_MAPS_BROWSER_KEY/)
    expect(accountsSrc).not.toMatch(/env\.GOOGLE_MAPS_BROWSER_KEY/)
    expect(geocodeSrc).not.toMatch(/\.GOOGLE_MAPS_BROWSER_KEY\b/)
    expect(accountsSrc).not.toMatch(/\.GOOGLE_MAPS_BROWSER_KEY\b/)
  })
})
