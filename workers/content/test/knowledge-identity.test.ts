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
  teamVisible,
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

// ── THE DENORMALISED FAST PATH, AND THE PROOF IT CANNOT CHANGE THE ANSWER ────
//
// Once two people's rows are one source, the fence cannot be a column: one
// `owner_user_id` cannot hold a set, and it is COPIED onto `knowledge_chunks`
// and `knowledge_terms` so that stage one of retrieval is a single-table read.
//
// So the stored fact becomes the ANSWER rather than the owner: `team_visible`,
// true when any live sighting is on the team's shelf. A chunk with it set needs
// no join at all; only private material pays for one.
//
// That is an optimisation over a permission decision, which is the most
// expensive place to be approximately right — so the equality below is the
// point of this block. `teamVisible(…) || <I have a live sighting>` must equal
// `readableBy(…)` for every shape a source can be in, or the fast path is a
// fence with a hole in it.

describe("teamVisible, and the fast path built on it", () => {
  const gone = (s: Sighting): Sighting => ({ ...s, goneAt: "2026-09-10T09:00:00.000Z" })

  it("is true when somebody has put it on the team's shelf", () => {
    expect(teamVisible([sighting(AURORA, "team")])).toBe(true)
    expect(teamVisible([sighting(AURORA, "private"), sighting(ALEX, "team")])).toBe(true)
  })

  it("is false when every shelf is private, which is the whole calendar fold", () => {
    expect(teamVisible([sighting(AURORA, "private"), sighting(ALEX, "private")])).toBe(false)
    expect(teamVisible([])).toBe(false)
  })

  it("goes FALSE again when the last team sighting is retired", () => {
    // The staleness that appears with no code change and no deploy: a stored
    // flag left true here is material still answering for everybody after the
    // only person who shared it stopped.
    expect(teamVisible([gone(sighting(AURORA, "team")), sighting(ALEX, "private")])).toBe(false)
  })

  it("goes TRUE when a private shelf is moved to the team's", () => {
    // The other direction, and the harmless one — a stale flag here costs a
    // colleague an answer they should have had, rather than leaking one.
    expect(teamVisible([sighting(AURORA, "private")])).toBe(false)
    expect(teamVisible([sighting(AURORA, "team")])).toBe(true)
  })

  it("makes the fast path EXACTLY the fence, for every shape a source can be in", () => {
    const people = [AURORA, ALEX]
    const shelves = ["private", "team"] as const
    // Every combination of two people, two shelves and present/retired — 81
    // shapes, which is the whole space for two sightings.
    const all: Sighting[][] = []
    for (const a of [null, ...shelves.flatMap((s) => [sighting(AURORA, s), gone(sighting(AURORA, s))])])
      for (const b of [null, ...shelves.flatMap((s) => [sighting(ALEX, s), gone(sighting(ALEX, s))])])
        all.push([a, b].filter((x): x is Sighting => x !== null))
    expect(all.length).toBeGreaterThan(20)
    for (const sightings of all)
      for (const me of [...people, "01J8ZZSTRANGER0000000000AA"]) {
        const fast = teamVisible(sightings) || liveSightings(sightings).some((s) => s.userId === me)
        expect(
          fast,
          `the fast path disagrees with the fence for ${JSON.stringify(sightings)} read by ${me}`
        ).toBe(readableBy(sightings, me))
      }
  })
})
