// THE EXPLANATION A PERSON'S MISSING LINK LEAVES BEHIND HAS TO NAME THE SERVICE.
//
// Every caller of `sendEmail` hands what it throws to `note()` in
// shared/workers/notify.ts, which writes it into `error_logs` as the whole
// answer to "did the invite reach her?". A REFUSAL has always named Resend and
// its status. A hung socket threw the raw abort — "The operation was aborted
// due to timeout" — which names no service, no deadline, and reads the same as
// any other abort in the system. Same failure shape, and the same fix, as the
// D1 REST door's (workers/content/test/d1-retry.test.ts).

import { afterEach, describe, expect, it, vi } from "vitest"

import { sendEmail } from "../src/lib/email"
import type { Env } from "../src/env"

const ENV = { RESEND_API_KEY: "rk_test", EMAIL_FROM: "hello@example.com" } as unknown as Env
const MSG = { to: "someone@example.com", subject: "Your invite", html: "<p>hi</p>", text: "hi" }

afterEach(() => vi.unstubAllGlobals())

/** The one send, with the global fetch replaced. The seam is the fetch's own
 * failure branch, never the network. */
const fetchThrows = (e: unknown) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw e
    })
  )

describe("a send that never happened says why, in Resend's name", () => {
  it("a hung socket says it timed out and quotes the deadline", async () => {
    fetchThrows(Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }))
    const thrown = await sendEmail(ENV, MSG).catch((e: Error) => e)
    expect(thrown).toBeInstanceOf(Error)
    expect((thrown as Error).message).toMatch(/^Resend did not answer within \d+ms \(R11 deadline\)/)
    expect((thrown as Error).message, "the socket's own words are kept").toMatch(/aborted due to timeout/)
  })

  it("an unreachable Resend says THAT instead, and does not claim a deadline it never hit", async () => {
    fetchThrows(new TypeError("Network connection lost."))
    const thrown = await sendEmail(ENV, MSG).catch((e: Error) => e)
    expect((thrown as Error).message).toBe("Resend could not be reached: Network connection lost.")
  })

  it("a refusal is unchanged — it already named the service and the status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("domain not verified", { status: 403 })))
    const thrown = await sendEmail(ENV, MSG).catch((e: Error) => e)
    expect((thrown as Error).message).toBe("Resend refused the email (403): domain not verified")
  })

  it("the three sentences a diagnosis reads are three different sentences", async () => {
    const said: string[] = []
    for (const e of [
      Object.assign(new Error("aborted"), { name: "TimeoutError" }),
      new TypeError("Network connection lost."),
    ]) {
      fetchThrows(e)
      said.push(((await sendEmail(ENV, MSG).catch((x: Error) => x)) as Error).message)
    }
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })))
    said.push(((await sendEmail(ENV, MSG).catch((x: Error) => x)) as Error).message)
    expect(new Set(said).size, "three failures, three sentences").toBe(3)
  })
})
