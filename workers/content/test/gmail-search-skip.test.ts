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
function stubGmail(ids: string[], fails: Record<string, number>): { reads: string[] } {
  const reads: string[] = []
  vi.stubGlobal("fetch", async (url: string) => {
    const u = String(url)
    // The id listing. One page, no `nextPageToken`, so the loop stops.
    if (!/\/messages\/[^/?]+/.test(u))
      return new Response(JSON.stringify({ messages: ids.map((id) => ({ id })) }), { status: 200 })
    const id = decodeURIComponent(u.match(/\/messages\/([^/?]+)/)![1])
    reads.push(id)
    const status = fails[id]
    if (status) return new Response("nope", { status })
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
