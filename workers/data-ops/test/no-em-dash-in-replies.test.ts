// R95 REACHES MODEL OUTPUT TOO. "No em dash, anywhere a person reads" is
// enforced by static censuses over the translation catalogue, the two front
// doors' own JSX, and the email templates (web/test/no-em-dash.test.ts and
// its siblings), none of which can see a sentence the ASSISTANT composes at
// runtime. A live reply once wrote the law's own example sentence, verbatim,
// with a real em dash in it: "Hi there! Great to see you [the mark] how can
// I help you today?" This suite proves the other half of the fix: a
// sanitizer that cleans the model's own text before it reaches the client,
// backstopping the system prompt's plain request not to write one at all.
//
// THE FORBIDDEN CHARACTERS ARE NEVER TYPED LITERALLY IN THIS FILE EITHER, for
// the identical reason `shared/workers/model-text.ts` builds them from code
// points rather than pasting the glyph: a file that tests a dash-remover
// should not itself be a place either mark survives.

import { describe, expect, it } from "vitest"

import { stripForbiddenDashes } from "@shared/workers/model-text"
import { SYSTEM } from "../src/lib/agent"

const EN_DASH = String.fromCharCode(0x2013)
const EM_DASH = String.fromCharCode(0x2014)

describe("stripForbiddenDashes", () => {
  it("rewrites the exact greeting the law was written about, comma for the spaced em dash", () => {
    const greeting = `Hi there! Great to see you ${EM_DASH} how can I help you today?`
    expect(stripForbiddenDashes(greeting)).toBe("Hi there! Great to see you, how can I help you today?")
  })

  it("rewrites a spaced en dash the same way as a spaced em dash", () => {
    const said = `Nobody's raised anything yet ${EN_DASH} the queue is empty.`
    expect(stripForbiddenDashes(said)).toBe("Nobody's raised anything yet, the queue is empty.")
  })

  it("rewrites a numeric range to a plain hyphen with no added space, for both marks", () => {
    expect(stripForbiddenDashes(`The wave ran 2024${EN_DASH}2026.`)).toBe("The wave ran 2024-2026.")
    expect(stripForbiddenDashes(`The wave ran 2024${EM_DASH}2026.`)).toBe("The wave ran 2024-2026.")
  })

  it("leaves ordinary text with no forbidden mark untouched", () => {
    const plain = "Three tickets are still open, two are triaged, and one is resolved."
    expect(stripForbiddenDashes(plain)).toBe(plain)
  })

  it("falls back to a plain hyphen for a mark with neither a digit nor a space beside it", () => {
    // A shape this function's two named rules do not cover on their own
    // (letters hard against the mark on both sides) still may not survive.
    expect(stripForbiddenDashes(`co${EN_DASH}worker`)).toBe("co-worker")
  })

  it("cleans every occurrence in one longer reply, not only the first", () => {
    const reply = `Done ${EM_DASH} three tickets closed. Ran 2024${EN_DASH}2025, then paused ${EM_DASH} nothing else moved.`
    expect(stripForbiddenDashes(reply)).toBe(
      "Done, three tickets closed. Ran 2024-2025, then paused, nothing else moved."
    )
  })

  it("returns an empty or undefined-ish string unchanged rather than throwing", () => {
    expect(stripForbiddenDashes("")).toBe("")
  })
})

describe("the system prompt asks the assistant never to write one, in plain words", () => {
  it("carries an instruction naming both the em dash and the en dash", () => {
    // `SYSTEM` (agent.ts) is the joined prompt, one string, not the array of
    // lines it is built from, so the instruction is found by its own
    // sentence rather than by indexing a line.
    const idx = SYSTEM.toLowerCase().indexOf("em dash")
    expect(idx, "no sentence in the system prompt mentions an em dash at all").toBeGreaterThanOrEqual(0)
    // The instruction sentence itself, isolated by its surrounding periods,
    // so the "carries neither forbidden mark" check below is scoped to the
    // one sentence rather than the whole multi-thousand-character prompt
    // (which legitimately carries em dashes elsewhere, in its OWN prose
    // about the assistant's behaviour, R95's own code-comment exemption
    // read the other way: this is machine-facing instruction text, not a
    // sentence a person reads).
    const before = SYSTEM.lastIndexOf(".", idx)
    const after = SYSTEM.indexOf(".", idx)
    const sentence = SYSTEM.slice(before + 1, after + 1).trim()
    expect(sentence.toLowerCase()).toContain("en dash")
    // THE INSTRUCTION ITSELF CARRIES NEITHER FORBIDDEN MARK: telling the
    // model never to write one, in a sentence that writes one, is the exact
    // failure this whole fix exists to close.
    expect(sentence).not.toMatch(new RegExp(`[${EN_DASH}${EM_DASH}]`))
  })
})
