// ONE IDENTITY PER REAL-WORLD THING — the gate's own arithmetic, with no
// database and no Google in it.
//
// These are unit tests because the rule they hold down is a rule about STRINGS.
// A source's identity decides whether the file two colleagues both named is one
// row or two, and the fault it replaces was a single interpolation:
// `${item.ownerUserId}:${item.externalId}`. Nothing about that needs a schema to
// be wrong, so nothing about it needs one to be tested.

import { describe, expect, it } from "vitest"

import {
  googleIdentity,
  identityKey,
  liveSightings,
  readableBy,
  recordIdentity,
  sightedExternalId,
  stillLive,
  uploadIdentity,
  type Sighting,
} from "../src/lib/knowledge-identity"

/** Two colleagues, and one thing they can both see. */
const AURORA = "01J8ZZAURORA0000000000000A"
const ALEX = "01J8ZZALEX00000000000000AA"

describe("the person is never in the identity", () => {
  it("gives two people who named the same Drive folder ONE identity", () => {
    const hers = googleIdentity("drive", "1AbCdEfGhIjKlMnOpQrStUvWxYz")
    const his = googleIdentity("drive", "1AbCdEfGhIjKlMnOpQrStUvWxYz")
    expect(identityKey(hers)).toBe(identityKey(his))
    expect(hers.originRowId).not.toContain(AURORA)
    expect(hers.originRowId).not.toContain(ALEX)
  })

  it("does the same for a calendar event and a chat thread", () => {
    expect(identityKey(googleIdentity("calendar", "742htcuo_20260904T100000Z"))).toBe(
      identityKey(googleIdentity("calendar", "742htcuo_20260904T100000Z"))
    )
    expect(identityKey(googleIdentity("chat", "spaces/AAA/threads/BBB"))).toBe(
      identityKey(googleIdentity("chat", "spaces/AAA/threads/BBB"))
    )
  })

  it("keeps the four Google services apart under one external id", () => {
    const keys = new Set(
      (["drive", "gmail", "calendar", "chat"] as const).map((s) => identityKey(googleIdentity(s, "same")))
    )
    expect(keys.size).toBe(4)
  })

  it("refuses an empty external id rather than filing everything under one row", () => {
    expect(() => googleIdentity("drive", "")).toThrow()
    expect(() => googleIdentity("drive", "   ")).toThrow()
  })
})

describe("an upload is its bytes", () => {
  it("gives the same bytes the same identity, so a second upload is a duplicate", () => {
    expect(identityKey(uploadIdentity("9f2b1c0d4e5a6b7c"))).toBe(identityKey(uploadIdentity("9f2b1c0d4e5a6b7c")))
  })

  it("gives different bytes different identities", () => {
    expect(identityKey(uploadIdentity("9f2b1c0d4e5a6b7c"))).not.toBe(identityKey(uploadIdentity("0000000000000000")))
  })

  it("never collides with a Google row that happens to carry the same string", () => {
    expect(identityKey(uploadIdentity("abc"))).not.toBe(identityKey(googleIdentity("drive", "abc")))
  })
})

describe("an app record keeps the identity it already had", () => {
  it("is the table and the row, unchanged", () => {
    expect(recordIdentity("help_tickets", "01J8ZZTICKET")).toEqual({
      originTable: "help_tickets",
      originRowId: "01J8ZZTICKET",
    })
  })
})

describe("reading a legacy row back", () => {
  it("recovers the thing from `<userId>:<externalId>`", () => {
    expect(sightedExternalId(`${AURORA}:1AbCdEf`)).toBe("1AbCdEf")
  })

  it("recovers an external id that itself contains colons", () => {
    expect(sightedExternalId(`${AURORA}:spaces/A:B/threads/C:D`)).toBe("spaces/A:B/threads/C:D")
  })

  it("leaves a row that carries no person alone", () => {
    expect(sightedExternalId("1AbCdEf")).toBe("1AbCdEf")
  })
})

/** The old world, for the equivalence below: one row per person, each carrying
 * `owner_user_id` — null for the team's shelf, the person's id for their own. */
function legacyReadable(rows: { ownerUserId: string | null }[], me: string): boolean {
  return rows.some((r) => r.ownerUserId === null || r.ownerUserId === me)
}

const sighting = (userId: string, shelf: "private" | "team"): Sighting => ({ userId, shelf })

describe("the fence, once the rows are one row", () => {
  it("is exactly the union of the rows it replaces", () => {
    const cases: Sighting[][] = [
      [],
      [sighting(AURORA, "private")],
      [sighting(AURORA, "team")],
      [sighting(AURORA, "private"), sighting(ALEX, "private")],
      [sighting(AURORA, "private"), sighting(ALEX, "team")],
      [sighting(AURORA, "team"), sighting(ALEX, "team")],
    ]
    for (const sightings of cases) {
      const legacy = sightings.map((s) => ({ ownerUserId: s.shelf === "team" ? null : s.userId }))
      for (const me of [AURORA, ALEX, "01J8ZZSTRANGER0000000000AA"])
        expect(readableBy(sightings, me)).toBe(legacyReadable(legacy, me))
    }
  })

  it("lets a colleague's private sight of a thing stay private", () => {
    expect(readableBy([sighting(AURORA, "private")], ALEX)).toBe(false)
  })

  it("lets one person's team shelf answer for everybody, as it always did", () => {
    expect(readableBy([sighting(AURORA, "private"), sighting(ALEX, "team")], "01J8ZZSTRANGER0000000000AA")).toBe(true)
  })

  it("answers nobody once every sighting is gone", () => {
    const gone = [{ ...sighting(AURORA, "team"), goneAt: "2026-09-10T09:00:00.000Z" }]
    expect(readableBy(gone, AURORA)).toBe(false)
  })
})

describe("a source lives while somebody can still see it", () => {
  it("stays live while one sighting remains", () => {
    expect(
      stillLive([
        { ...sighting(AURORA, "team"), goneAt: "2026-09-10T09:00:00.000Z" },
        sighting(ALEX, "team"),
      ])
    ).toBe(true)
  })

  it("retires when the last sighting goes", () => {
    expect(stillLive([{ ...sighting(AURORA, "team"), goneAt: "2026-09-10T09:00:00.000Z" }])).toBe(false)
    expect(stillLive([])).toBe(false)
  })

  it("hands back only the sightings that are still there", () => {
    const live = sighting(ALEX, "private")
    expect(liveSightings([{ ...sighting(AURORA, "team"), goneAt: "2026-09-10T09:00:00.000Z" }, live])).toEqual([live])
  })
})
