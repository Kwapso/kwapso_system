import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

// THE ERROR STORE ONLY WORKS IF SOMEBODY READS IT.
//
// Two classes of message are console-only, never written down: a transient
// network blip (the browser's generic "Failed to fetch" when a navigation
// cancels an in-flight request) and the browser's own chatter. The one that
// prompted this was "ResizeObserver loop completed with undelivered
// notifications" — harmless by specification, repeats, and it was sitting at the
// top of the store competing for attention with a real database auth failure and
// a real mail-sending failure.
//
// The risk of a filter is the opposite mistake: filtering something real. So
// this checks BOTH directions — the noise is dropped AND an ordinary error still
// gets through. A filter that swallows everything would pass a one-sided test.
//
// The predicates are module-private (they are implementation, not API), so this
// exercises them through the source. If they are ever exported, rewrite this to
// call them.

const LOG = readFileSync(resolve(__dirname, "../../shared/web/log.ts"), "utf8")

/** Rebuild a predicate from its source so the test runs the real regex. */
function predicate(name: string): (e: { name?: string; message: string }) => boolean {
  const at = LOG.indexOf(`function ${name}(`)
  expect(at, `${name} must exist in shared/web/log.ts`).toBeGreaterThan(-1)
  const open = LOG.indexOf("{", at)
  let depth = 0
  let close = open
  for (let i = open; i < LOG.length; i++) {
    if (LOG[i] === "{") depth++
    else if (LOG[i] === "}" && --depth === 0) {
      close = i
      break
    }
  }
  const body = LOG.slice(open + 1, close).replace(/:\s*Error/g, "")
  // eslint-disable-next-line no-new-func
  return new Function("e", body) as (e: { name?: string; message: string }) => boolean
}

const isBrowserNoise = predicate("isBrowserNoise")
const isBenignNetworkError = predicate("isBenignNetworkError")

const dropped = (m: string, n = "Error") =>
  isBrowserNoise({ name: n, message: m }) || isBenignNetworkError({ name: n, message: m })

describe("the error store keeps signal, not chatter", () => {
  it("drops the browser's own noise", () => {
    expect(dropped("ResizeObserver loop completed with undelivered notifications")).toBe(true)
    expect(dropped("ResizeObserver loop limit exceeded")).toBe(true)
  })

  it("drops a transient network blip", () => {
    expect(dropped("Failed to fetch")).toBe(true)
    expect(dropped("Load failed")).toBe(true)
    expect(dropped("anything", "AbortError")).toBe(true)
  })

  it("KEEPS a real failure — the direction that matters more", () => {
    // Every one of these is a row that was actually in the store and actually
    // told us something.
    expect(dropped("Cloudflare D1 API failed: Authentication error")).toBe(false)
    expect(dropped("Resend refused the email (403): domain is not verified")).toBe(false)
    expect(dropped("Cannot read properties of undefined (reading 'id')")).toBe(false)
    // And a message that merely mentions the noise is not the noise.
    expect(dropped("our chart broke while a ResizeObserver loop was running")).toBe(false)
  })

  it("is wired into the one reporting seam, not applied ad hoc", () => {
    // THE SHAPE OF THE GUARD, not one spelling of it. This was pinned as the
    // single line `if (isBenignNetworkError(e) || isBrowserNoise(e)) return` —
    // so adding braces, swapping the two operands (`||` is commutative), or
    // wrapping the condition when a third filter joins it would each have
    // reddened the law while the guard did exactly the same thing. Worse, the
    // pin is stated in the direction where a near-miss is dangerous: it says the
    // filters are consulted, and the whole point is that a real failure still
    // reaches the store.
    //
    // So: find every early-return guard in the file by BALANCING its own
    // parentheses (a `[^)]*` condition stops at the first `)`, which here is
    // `isBenignNetworkError(e`), and require ONE guard that consults both
    // filters and returns. Drop either filter from the condition, or drop the
    // `return` so it stops being a guard, and it goes red.
    const guards: string[] = []
    for (const m of LOG.matchAll(/\bif\s*\(/g)) {
      const open = (m.index as number) + m[0].length - 1
      let depth = 0
      let close = -1
      for (let j = open; j < LOG.length; j++) {
        if (LOG[j] === "(") depth++
        else if (LOG[j] === ")" && --depth === 0) {
          close = j
          break
        }
      }
      if (close === -1) continue
      // The consequent, however it is written: `return`, `{ return }`, or a
      // `return` on the next line.
      if (/^\s*\{?\s*return\b/.test(LOG.slice(close + 1, close + 40)))
        guards.push(LOG.slice(open + 1, close))
    }
    expect(
      guards.length,
      "no early-return guard found in shared/web/log.ts at all — this scan has gone blind"
    ).toBeGreaterThan(0)
    expect(
      guards.some((c) => /isBenignNetworkError\(/.test(c) && /isBrowserNoise\(/.test(c)),
      "reportError must consult BOTH filters in one early return before beaconing"
    ).toBe(true)
  })
})
