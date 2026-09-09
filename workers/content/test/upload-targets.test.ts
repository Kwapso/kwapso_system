// A SIGNED UPLOAD MAY NOT BE LOOSER THAN THE DOOR IT STANDS IN FOR.
//
// `UPLOAD_TARGETS` restates, as data, four decisions each streaming door makes
// while the bytes go past: who may upload, where the object lands, how big it
// may be, and what label it is stored under. Restating anything is how two
// copies come to disagree, and here a disagreement is not cosmetic — a table
// entry with a wider `accepts`, a bigger `maxBytes` or a laxer `stored` is a
// door somebody can walk through that the original refuses.
//
// So every entry is held to the door it mirrors, read off that door's own
// source. And one of these tests is load-bearing for a law in another file:
// `media-keys.test.ts` admits the presign door's spread key mint on the
// explicit promise that this file proves the spread can only ever produce a
// prefix that table already describes.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { UPLOAD_TARGETS, uploadTarget } from "../src/lib/upload-targets"
import { INLINE_SAFE_UPLOAD, ANY_FILE_TYPE, NEUTRALISED_CONTENT_TYPE } from "@shared/workers/image"
import { STREAM_UPLOAD_MAX_BYTES } from "@shared/workers/limits"

const ROUTES = join(__dirname, "..", "src", "routes")
const doorSrc = (f: string) => readFileSync(join(ROUTES, `${f}.ts`), "utf8")

/** The door each entry mirrors — the file whose streaming upload it replaces. */
const MIRRORS: Record<string, string> = {
  knowledge: "knowledge",
  deliverables: "deliverables",
  staff: "staff",
  brand: "brand-assets",
}

describe("every upload target mirrors a real door", () => {
  it("covers every entry, so this suite cannot go quiet by the table shrinking", () => {
    expect(Object.keys(UPLOAD_TARGETS).sort()).toEqual(Object.keys(MIRRORS).sort())
    expect(Object.keys(UPLOAD_TARGETS).length).toBeGreaterThan(3)
  })

  it("THE KEY PREFIX IS ONE A STREAMING DOOR ALREADY MINTS", () => {
    // THE LOAD-BEARING ONE. `media-keys.test.ts` cannot see through the presign
    // door's `teamMediaKey(guard.teamId, target.module)` — a variable is opaque
    // to a text scan — so it admits that mint on the promise made here: every
    // entry's module spells a prefix some door already writes literally, and
    // therefore one that table already describes. A new entry inventing a
    // prefix fails HERE, which is the only reason the admission over there is
    // not a hole.
    for (const [name, target] of Object.entries(UPLOAD_TARGETS)) {
      const literal = `teamMediaKey(guard.teamId, "${target.module}")`
      expect(
        doorSrc(MIRRORS[name]).includes(literal),
        `${name}'s module (${target.module}) is not a prefix ` +
          `${MIRRORS[name]}.ts mints literally. Either the door changed its key shape, or this ` +
          "entry invented a prefix nothing describes — and media-keys.test.ts is admitting the " +
          "presign door's mint on the promise that this cannot happen."
      ).toBe(true)
    }
  })

  it("accepts no wider a set of types than its door does", () => {
    // Read off the door's own source rather than restated here: the point is
    // that the two agree, and a second copy of the expectation would only prove
    // this file agrees with itself.
    for (const [name, target] of Object.entries(UPLOAD_TARGETS)) {
      const src = doorSrc(MIRRORS[name])
      const doorTakesAnything = src.includes("ANY_FILE_TYPE.test(contentType)")
      const doorTakesInlineOnly = src.includes("INLINE_SAFE_UPLOAD.test(contentType)")
      expect(
        doorTakesAnything || doorTakesInlineOnly,
        `${MIRRORS[name]}.ts no longer checks a declared type against either rule — this entry ` +
          "is mirroring a decision that has moved"
      ).toBe(true)
      expect(
        target.accepts,
        `${name} accepts a different set of types from the door it mirrors — a presign must ` +
          "never open a door the upload itself would refuse"
      ).toBe(doorTakesAnything ? ANY_FILE_TYPE : INLINE_SAFE_UPLOAD)
    }
  })

  it("stores under a label that is inline-safe or neutralised — never a raw risky type", () => {
    // THE INVARIANT THE WHOLE DESIGN RESTS ON, checked over the types that
    // matter rather than asserted. `mediaHeaders` serves an object under its
    // stored label on the app's OWN origin, so a stored `text/html` is stored
    // XSS. Signing this value is what keeps the rule true once the bytes stop
    // passing through us — but it only helps if the value itself is right.
    const risky = ["text/html", "image/svg+xml", "application/xhtml+xml", "text/xml"]
    for (const [name, target] of Object.entries(UPLOAD_TARGETS))
      for (const declared of risky) {
        if (!target.accepts.test(declared)) continue // the door refuses it outright
        expect(
          target.stored(declared),
          `${name} would store a ${declared} upload under its own label. It must be neutralised — ` +
            "an object served back on the app's origin under a renderable label is stored XSS, " +
            "and signing the header only pins whatever value this function returns"
        ).toBe(NEUTRALISED_CONTENT_TYPE)
      }
  })

  it("keeps an inline-safe type readable where its door does", () => {
    // The other direction, so "neutralise everything" is not a passing answer:
    // a screenshot on a staff profile should open in a tab rather than land in
    // Downloads, and the doors that only accept inline-safe types say so.
    expect(UPLOAD_TARGETS.staff.stored("image/png")).toBe("image/png")
    expect(UPLOAD_TARGETS.brand.stored("image/png")).toBe("image/png")
    // …and knowledge is deliberately stricter than the shared helper.
    expect(UPLOAD_TARGETS.knowledge.stored("image/png")).toBe(NEUTRALISED_CONTENT_TYPE)
  })

  it("carries no bigger a ceiling than the streaming door it replaces", () => {
    for (const [name, target] of Object.entries(UPLOAD_TARGETS)) {
      expect(
        target.maxBytes,
        `${name}'s ceiling is not the streaming ceiling — a presigned PUT bypasses every byte ` +
          "count we do, so this number IS the limit"
      ).toBeLessThanOrEqual(STREAM_UPLOAD_MAX_BYTES)
      expect(doorSrc(MIRRORS[name])).toContain("STREAM_UPLOAD_MAX_BYTES")
    }
  })

  it("resolves a caller's module by table lookup, and nothing else", () => {
    // R20, positionally: the caller's string is a KEY into a table, never a
    // value that reaches a bucket, a key segment or a permission.
    expect(uploadTarget("knowledge")).toBe(UPLOAD_TARGETS.knowledge)
    expect(uploadTarget("nope")).toBeNull()
    expect(uploadTarget("")).toBeNull()
    expect(uploadTarget(null)).toBeNull()
    expect(uploadTarget(undefined)).toBeNull()
    // Prototype keys are not entries — `hasOwnProperty` rather than `in`.
    expect(uploadTarget("constructor")).toBeNull()
    expect(uploadTarget("__proto__")).toBeNull()
    expect(uploadTarget("toString")).toBeNull()
  })
})
