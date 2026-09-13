// THE READ CEILING MAY NOT SIT BELOW THE ROW CEILING.
//
// `capToRow` (lib/knowledge-files.ts) is the one place in this app that cuts a
// document, and its whole point is that it SAYS SO — its own header states the
// rule as "never silently trimmed", not "never trimmed", and it writes the
// sentence a person reads on the row (`transcript_note` on a meeting,
// `file_note` on a knowledge source).
//
// It can only do that job if it is handed the document. For a Google source it
// was not. `driveFileText` (lib/google-api.ts) cut the text to 100,000
// characters BEFORE `capToRow` ever saw it — fifteen times below the row's own
// 1.5 MB ceiling — so `capToRow` was handed a short document every time, found
// it comfortably under the limit, and returned `note: null`. The honest cut sat
// downstream of the silent one and could not fire.
//
// MEASURED ON STAGING, 13 Sep 2026, after the owner said the transcripts "seem
// to get cut off at a weird point": ten live sources at 99,994-99,998
// characters, every one ending mid-word — four meeting transcripts and the six
// Gemini notes documents that mirror them. The 11 September Jourfix is 410 KB
// in Drive and was 100 KB here. `transcript_note` NULL, `file_note` NULL. The
// screen, the reader and the exam all believed they held the whole meeting.
//
// SO THIS IS THE INVARIANT, NOT THE NUMBER. It does not pin 1.5 MB; it pins the
// RELATIONSHIP — whatever the read keeps must be at least what a row can keep,
// or there is a cut nobody is told about. Read off disk, because the constant is
// module-private and the thing worth protecting is the line of code, not a value
// this test could just as easily assert against itself.
//
// WHY CHARACTERS AGAINST BYTES IS THE SAFE DIRECTION: a character is never fewer
// than one byte, so reading `DOCUMENT_LIMIT_BYTES` characters always hands
// `capToRow` at least as much as it can possibly keep. Erring the other way is
// the bug above.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { capToRow } from "../src/lib/knowledge-files"
import { DOCUMENT_LIMIT_BYTES } from "@shared/workers/validate"

const ROOT = join(__dirname, "..", "..", "..")
const GOOGLE_API = join(ROOT, "workers", "content", "src", "lib", "google-api.ts")

describe("one ceiling, and it is the one that speaks", () => {
  const source = readFileSync(GOOGLE_API, "utf8")

  it("the Drive read cap IS the row ceiling — not a smaller number of its own", () => {
    const line = /^const DRIVE_TEXT_CAP = (.+)$/m.exec(source)
    expect(line, "google-api.ts must declare DRIVE_TEXT_CAP on one line").not.toBeNull()
    // A literal here is the regression: any number spelled out is a second
    // ceiling, and a second ceiling is one `capToRow` cannot report on.
    expect(
      line![1].trim(),
      "DRIVE_TEXT_CAP must BE the row ceiling, not a literal that happens to match it today"
    ).toBe("DOCUMENT_LIMIT_BYTES")
  })

  it("mail keeps its own, smaller cap — a sweep reads many messages at once", () => {
    // The one deliberate exception, and it must stay deliberate: if the mail
    // read ever goes back to borrowing DRIVE_TEXT_CAP, one tick holds fifty
    // times more text than one file read does.
    expect(source, "MAIL_TEXT_CAP must exist as its own constant").toMatch(
      /^const MAIL_TEXT_CAP = \d[\d_]*$/m
    )
    expect(
      /readMailText\(payload\)\.slice\(0, MAIL_TEXT_CAP\)/.test(source),
      "the mail body must be cut by MAIL_TEXT_CAP, never by the file cap"
    ).toBe(true)
  })

  it("MUTATION PROOF — capToRow stays silent below the ceiling and speaks above it", () => {
    // Below: nothing was cut, so there is nothing to say. This is the state
    // every truncated source was in, wrongly — which is why the pair matters
    // more than either half.
    const short = capToRow("a".repeat(100_000))
    expect(short.note).toBeNull()
    expect(short.text?.length).toBe(100_000)

    // Above: cut, and SAID. If this ever returns null the rule at the top of
    // this file is gone and nothing else in the repo would notice.
    const long = capToRow("a".repeat(DOCUMENT_LIMIT_BYTES + 50_000))
    expect(long.text?.length).toBeLessThan(DOCUMENT_LIMIT_BYTES + 50_000)
    expect(long.note, "a cut document must carry the sentence that says it was cut").toBeTruthy()
  })
})
