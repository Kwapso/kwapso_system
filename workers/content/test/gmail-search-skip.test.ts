// ONE MESSAGE'S REFUSAL IS ONE MESSAGE'S — the fourth instance of one bug, and
// the suite that stops there being a fifth.
//
// `gmailSearch` asks Gmail for ids, then reads each message's headers ten at a
// time through `Promise.all`. `Promise.all` rejects on the FIRST rejection, so
// a single message Gmail would not hand over took the other nine with it, and
// then the page after that, and then the whole mail lane: the throw escaped
// `readGoogleMaterial`, landed in `sweepKinds`' catch, and was recorded as the
// LANE'S failure. What the owner saw was a red sentence under the Bring it in
// button on the knowledge base — "Google wouldn't allow that — this item may
// not be shared with you." — every time he opened the screen, because a stored
// `last_error` survives until the lane next has a completely clean run, and a
// mailbox with one awkward message never has one.
//
// Measured on staging, 9 Sep 2026: all three Google connections carried exactly
// that sentence on their `email:` row, while every other lane was green.
//
// The DRIVE half of this was found and fixed three separate times — the folder
// walk, the file read, the hydration loop — and each fix repaired the instance
// it was reported for and left this one alone. So the suite asserts the rule by
// NAME (`isItemRefusal` / `isConnectionLost`) as well as by behaviour: a loop
// that skips per-item refusals now says so in a word a reader can find.

import { describe, expect, it, vi } from "vitest"

import { gmailSearch, isConnectionLost, isItemRefusal } from "../src/lib/google-api"

/** Gmail, reduced to the two calls this function makes: the id listing, then one
 * header read per id. `fails` decides which of those header reads refuses and
 * with what status — the whole point of the suite is that a refusal is GRADED. */
function stubGmail(
  ids: string[],
  fails: Record<string, number>,
  /** the body Google returns with a failure — the REASON lives in here, and it
   * is what tells a quota refusal from a permission one at the same status. */
  body = "nope"
): { reads: string[] } {
  const reads: string[] = []
  vi.stubGlobal("fetch", async (url: string) => {
    const u = String(url)
    // The id listing. One page, no `nextPageToken`, so the loop stops.
    if (!/\/messages\/[^/?]+/.test(u))
      return new Response(JSON.stringify({ messages: ids.map((id) => ({ id })) }), { status: 200 })
    const id = decodeURIComponent(u.match(/\/messages\/([^/?]+)/)![1])
    reads.push(id)
    const status = fails[id]
    if (status) return new Response(body, { status })
    return new Response(
      JSON.stringify({
        id,
        internalDate: "0",
        snippet: `snippet ${id}`,
        payload: { headers: [{ name: "Subject", value: `subject ${id}` }] },
      }),
      { status: 200 }
    )
  })
  return { reads }
}

describe("gmailSearch — one message's refusal is not the mailbox's", () => {
  it("returns every message it CAN read when one in the batch is forbidden", async () => {
    // Twelve ids, so the read spans two batches of ten and the refusal lands in
    // the first: a fix that only rescued the batch it happened in would still
    // lose the second page, and this is the assertion that notices.
    const ids = Array.from({ length: 12 }, (_, i) => `m${i}`)
    stubGmail(ids, { m3: 403 })

    const out = await gmailSearch("tok", "")

    expect(out.map((m) => m.id).sort()).toEqual(ids.filter((id) => id !== "m3").sort())
  })

  it("skips a message DELETED between the listing and the read (404), rather than failing the lane", async () => {
    // Every list Google answers is a snapshot. A 404 here used to fall into the
    // 502 `google_refused` branch — a sentence about the SERVICE — so the very
    // callers written to tolerate a per-item refusal refused to tolerate it.
    const ids = ["a", "b", "c"]
    stubGmail(ids, { b: 404 })

    expect((await gmailSearch("tok", "")).map((m) => m.id)).toEqual(["a", "c"])
  })

  it("STILL refuses loudly when the token dies mid-batch", async () => {
    // The failure that is worse than the one this suite fixes: a revoked grant
    // tolerated ten at a time comes back as a smaller mailbox, no error, no red
    // anywhere, and an assistant answering from mail it never read.
    stubGmail(["a", "b"], { b: 401 })

    await expect(gmailSearch("tok", "")).rejects.toMatchObject({ code: "google_access_lost" })
  })

  it("STILL refuses loudly on a rate limit or an outage", async () => {
    // A 502 says nothing about whether the message is readable, so swallowing it
    // would move the sweep on past mail it never actually read — silently, and
    // with a clean `last_ok_at` to say so.
    stubGmail(["a", "b"], { b: 429 })

    await expect(gmailSearch("tok", "")).rejects.toMatchObject({ code: "google_refused" })
  })

  it("names the rule rather than spelling it, so a new loop can be seen to have decided", () => {
    expect(isItemRefusal({ code: "google_forbidden" })).toBe(true)
    expect(isItemRefusal({ code: "google_gone" })).toBe(true)
    // The three that must NEVER be swallowed per item.
    expect(isItemRefusal({ code: "google_access_lost" })).toBe(false)
    expect(isItemRefusal({ code: "google_refused" })).toBe(false)
    expect(isItemRefusal(new Error("socket hang up"))).toBe(false)

    expect(isConnectionLost({ code: "google_access_lost" })).toBe(true)
    expect(isConnectionLost({ code: "google_forbidden" })).toBe(false)
  })
})

describe("a 403 is TWO answers, and Google picks the status for both", () => {
  /** Gmail's own shape for a quota refusal. Note the status: 403, not 429. */
  const QUOTA = JSON.stringify({
    error: { code: 403, errors: [{ reason: "rateLimitExceeded", message: "User-rate limit exceeded" }] },
  })

  it("a QUOTA 403 is not a per-item refusal, and stops the pass instead of skipping mail", async () => {
    // THE BUG THIS CLOSES, and it is the third turn of the same screw. The first
    // two fixes were about WHERE a refusal is handled. This is about WHAT it
    // means. Gmail answers a quota problem with 403, exactly like a permission
    // problem — so the skip-and-carry-on rule, which is right for a message that
    // is not shared, silently DROPS MAIL when Google is only asking us to slow
    // down: the sweep skips it, reports a clean pass, and moves its cursor past
    // messages it never read.
    stubGmail(["a", "b", "c"], { b: 403 }, QUOTA)
    await expect(gmailSearch("tok", "")).rejects.toMatchObject({ code: "google_busy" })
  })

  it("and it is not classed as an item refusal, so no loop may swallow it", () => {
    expect(isItemRefusal({ code: "google_busy" })).toBe(false)
    expect(isConnectionLost({ code: "google_busy" })).toBe(false)
  })

  it("says something TRUE to the person, rather than blaming their sharing", async () => {
    // What the owner actually saw, twice, after being told it was fixed:
    // "Google wouldn't allow that — this item may not be shared with you."
    // about his own mailbox. It was never true.
    stubGmail(["a"], { a: 403 }, QUOTA)
    await expect(gmailSearch("tok", "")).rejects.toMatchObject({
      message: expect.stringContaining("slow down"),
    })
  })

  it("a PERMISSION 403 still skips the one item, exactly as before", async () => {
    // The other half must not regress: an ordinary forbidden item is still a
    // per-item fact and the other messages still come back.
    stubGmail(["a", "b", "c"], { b: 403 }, JSON.stringify({ error: { errors: [{ reason: "forbidden" }] } }))
    expect((await gmailSearch("tok", "")).map((m) => m.id)).toEqual(["a", "c"])
  })

  it("an unreadable body falls through to the stricter reading", async () => {
    // Classifying a throw must not throw. An empty or unparsable body reads as
    // a permission refusal, which is the older and narrower of the two.
    stubGmail(["a", "b"], { b: 403 }, "")
    expect((await gmailSearch("tok", "")).map((m) => m.id)).toEqual(["a"])
  })
})

// A KNOWN ID'S HEADER TEACHES NOTHING — documents/COSTS.md §3, 2026-09-10. The
// suite above proves a per-item REFUSAL is safe to skip; this proves a per-item
// READ is safe to skip too, for the one reason gmail gets this and Drive/Calendar
// do not: a message cannot change after it is received, so the only thing its
// header was ever bought for — the date the cursor uses to discard it, on every
// steady-state tick, after the fact — is a fact the database already holds once
// a message has been filed once.
describe("gmailSearch — a known id's header is a call that teaches nothing", () => {
  it("does not fetch the header for a known id, and still returns something for it", async () => {
    const { reads } = stubGmail(["a", "b", "c"], {})

    const out = await gmailSearch("tok", "", undefined, [], new Set(["b"]))

    // THE EFFICIENCY CLAIM: Google was never asked about "b".
    expect(reads.sort()).toEqual(["a", "c"])
    // THE SAFETY CLAIM: "b" is still in the answer — `seen` (knowledge-google.ts)
    // records every id `gmailSearch` returns, and an id silently dropped here
    // would read to `retireVanished` as a message that vanished from the
    // account, which it did not.
    expect(out.map((m) => m.id).sort()).toEqual(["a", "b", "c"])
    const known = out.find((m) => m.id === "b")!
    // A NULL DATE IS THE WHOLE MECHANISM: `moment(null)` is the empty string,
    // which sorts before every real cursor, so a known id is excluded from
    // `wanted` the same way an old one always was — just without paying for
    // its header first.
    expect(known.date).toBeNull()
    expect(known.subject).toBe("")
  })

  it("skips every known id across a page, in one batch or several", async () => {
    const ids = Array.from({ length: 15 }, (_, i) => `m${i}`)
    const { reads } = stubGmail(ids, {})
    const known = new Set(["m0", "m5", "m11", "m14"])

    const out = await gmailSearch("tok", "", undefined, [], known)

    expect(reads.sort()).toEqual(ids.filter((id) => !known.has(id)).sort())
    expect(out.map((m) => m.id).sort()).toEqual([...ids].sort())
  })

  it("still classifies a refusal correctly for the ids it does read", async () => {
    // The known-id skip must not blunt the suite above: a real refusal on an
    // UNKNOWN id in the same batch is still graded, not swallowed by proximity
    // to a skip.
    const QUOTA = JSON.stringify({
      error: { code: 403, errors: [{ reason: "quotaExceeded" }] },
    })
    stubGmail(["a", "b", "c"], { c: 403 }, QUOTA)

    await expect(gmailSearch("tok", "", undefined, [], new Set(["a"]))).rejects.toMatchObject({
      code: "google_busy",
    })
  })

  it("an empty or absent known-ids set changes nothing — every id is read, as before", async () => {
    const { reads } = stubGmail(["a", "b"], {})

    expect((await gmailSearch("tok", "")).map((m) => m.id).sort()).toEqual(["a", "b"])
    expect((await gmailSearch("tok", "", undefined, [], new Set())).map((m) => m.id).sort()).toEqual(["a", "b"])
    expect(reads.sort()).toEqual(["a", "a", "b", "b"])
  })
})
