// A TIMEOUT AND A REFUSAL ARE DIFFERENT SENTENCES — to the person, not only to the log.
//
// Until 7 Sep 2026 a Google call that did not answer in time rethrew a plain
// Error, so the central catch answered 500 "Something went wrong on our side"
// — the same words a refusal earned — and only the error row could tell the
// two apart. The next move is different ("wait" versus "reconnect" or "check
// sharing"), so the person is now told which it was, and the diagnosis rides
// the refusal as its `detail` for the central catch to record.

import { afterEach, describe, expect, it, vi } from "vitest"

import { GuardError } from "@shared/workers/gating"
import { causeOf } from "@shared/workers/error-log"
import { driveFilesPick } from "../src/lib/google-api"
import { GOOGLE_TIMEOUT_MS } from "../src/lib/google-oauth"

afterEach(() => vi.unstubAllGlobals())

/** Through `driveFilesPick`, which lets the refusal through — `driveFilesById`
 * deliberately drops one stale file rather than failing the other nine. */
async function refusalFrom(thrown: Error): Promise<GuardError> {
  vi.stubGlobal("fetch", () => Promise.reject(thrown))
  try {
    await driveFilesPick("tok")
  } catch (e) {
    expect(e).toBeInstanceOf(GuardError)
    return e as GuardError
  }
  throw new Error("expected a refusal")
}

describe("google did not answer", () => {
  it("a timeout is a 504 with its own sentence, and the detail names the call and the deadline", async () => {
    const e = await refusalFrom(Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }))
    expect(e.status).toBe(504)
    expect(e.code).toBe("google_timeout")
    expect(e.message).toBe("Google didn't answer in time. Try again in a moment.")
    expect(causeOf(e)).toBe(
      `google GET https://www.googleapis.com/drive/v3/files did not answer within ${GOOGLE_TIMEOUT_MS}ms (R11 deadline): The operation was aborted due to timeout`
    )
    // Never the query string — that is where a person's search words live.
    expect(causeOf(e)).not.toContain("fields=")
  })

  it("an unreachable Google is a 502 with a different sentence, and the detail says what the socket said", async () => {
    const e = await refusalFrom(new TypeError("fetch failed"))
    expect(e.status).toBe(502)
    expect(e.code).toBe("google_unreachable")
    expect(e.message).toBe("Google couldn't be reached. Try again in a moment.")
    expect(causeOf(e)).toBe("google GET https://www.googleapis.com/drive/v3/files could not be reached: fetch failed")
  })

  it("the three sentences a person can read are three different sentences", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response("upstream fell over", { status: 502 })))
    const refused = await driveFilesPick("tok").then(
      () => {
        throw new Error("expected a refusal")
      },
      (e) => e as GuardError
    )
    const timedOut = await refusalFrom(Object.assign(new Error("t"), { name: "TimeoutError" }))
    const unreachable = await refusalFrom(new TypeError("fetch failed"))
    expect(new Set([refused.message, timedOut.message, unreachable.message]).size).toBe(3)
  })
})
