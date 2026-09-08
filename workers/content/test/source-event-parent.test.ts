// AN EVENT PARENT IS READ, NEVER INFERRED.
//
// A knowledge source may say which call it came from. What decides that is the
// question this suite exists to keep answered: only Google's own statement of
// which event — never a title that looks similar, never a time that is close,
// never an embedding. A wrong grouping is worse than none, because it makes the
// base answer confidently from the wrong artefact, which is the exact failure
// that opened this work (migration `0070_a_source_says_which_call_it_is_from`
// carries the measurement).
//
// The strings below are REAL, taken off staging on 8 Sep 2026 — the Padelbase
// call the owner complained about, and the artefacts that competed with it.
// A synthetic eid would prove the decoder decodes; these prove it decodes what
// Google actually sends, and that the artefacts that say nothing get nothing.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { calendarEventIdInText } from "../src/lib/google-api"

const ROOT = join(__dirname, "..", "..", "..")

/** The "Accepted:" notice for `Padelbase: Review`, 8 Sep 2026, as Google wrote
 * it. Its `eid` is base64url of "<eventId> <calendarId>". */
const ACCEPTED_MAIL = `Padelbase: Review
Tuesday Sep 8, 2026 ⋅ 5pm – 5:30pm
India Standard Time - Kolkata

Reply for alaap@kwapso.com and view more details
https://calendar.google.com/calendar/event?action=VIEW&eid=MmE3Mm4wMmI1ZzlkMWg3MTZuNnJyOGJxYXIgYWxhYXBAa3dhcHNvLmNvbQ&ctz=Asia%2FKolkata&hl=en&es=1
`

/** The event id the calendar lane files that same call under — the tail of its
 * `origin_row_id`. The two must be the SAME STRING or the column groups nothing. */
const PADELBASE_EVENT_ID = "2a72n02b5g9d1h716n6rr8bqar"

/** The "Notes:" mail for the same call. It is the one that carries the minutes
 * and it names no event at all — no eid, no Meet link, only the title in quotes.
 * 121 of these on staging and not one of them states an event. */
const NOTES_MAIL = `Notes from “Padelbase: Review”

These notes have been sent to invited guests in your organization.

Open meeting notes

The content was auto-generated on September 8, 2026, 5:46 PM IST and may
contain errors.
`

/** The Gemini notes DOCUMENT for the same call — the 43,913-byte artefact that
 * should have answered the owner's question. It names no event either. */
const GEMINI_DOC = `✍️ Quick notes
Padelbase: Review

Sep 8, 2026
Alaap Kanchwala Chilavert George

Attachments Padelbase: Review
Meeting records Transcript
`

describe("calendarEventIdInText reads Google's own statement", () => {
  it("decodes the eid Google writes into an acceptance notice", () => {
    expect(calendarEventIdInText(ACCEPTED_MAIL)).toBe(PADELBASE_EVENT_ID)
  })

  it("returns exactly what the calendar lane files the same call under", () => {
    // The calendar source's `origin_row_id` is `<readerUserId>:<googleEventId>`.
    const originRowId = `01KZTWXJA3DZW6WDXK4JH2ETNA:${PADELBASE_EVENT_ID}`
    expect(calendarEventIdInText(ACCEPTED_MAIL)).toBe(
      originRowId.slice(originRowId.indexOf(":") + 1)
    )
  })

  it("drops the calendar id — two guests share the EVENT, not the calendar", () => {
    const forChilavert = ACCEPTED_MAIL.replace(
      "MmE3Mm4wMmI1ZzlkMWg3MTZuNnJyOGJxYXIgYWxhYXBAa3dhcHNvLmNvbQ",
      "MmE3Mm4wMmI1ZzlkMWg3MTZuNnJyOGJxYXIgY2hpbGF2ZXJ0QGt3YXBzby5jb20"
    )
    expect(calendarEventIdInText(forChilavert)).toBe(PADELBASE_EVENT_ID)
    expect(calendarEventIdInText(forChilavert)).toBe(calendarEventIdInText(ACCEPTED_MAIL))
  })

  it("says nothing about the notes mail, which states nothing", () => {
    expect(calendarEventIdInText(NOTES_MAIL)).toBeNull()
  })

  it("says nothing about the Gemini notes document, which states nothing", () => {
    // THE FINDING THIS LOCKS: the artefact that holds the answer carries no
    // event id anywhere Google put it. Measured over all 80 live Drive sources
    // on staging — none carries a calendar link, an eid or a Meet link. If a
    // future lane starts placing these, it must be because a NEW statement of
    // Google's was read (the event's own `attachments[]`), never because this
    // began matching on a title.
    expect(calendarEventIdInText(GEMINI_DOC)).toBeNull()
  })

  it("says nothing about ordinary mail, a bare calendar link, or rubbish", () => {
    expect(calendarEventIdInText("🎾 Deine Padelbase-Woche: 3 freie Plätze")).toBeNull()
    expect(calendarEventIdInText("https://calendar.google.com/calendar/")).toBeNull()
    expect(calendarEventIdInText("")).toBeNull()
    // Valid base64 that decodes to something with no event id in it must not
    // become a parent: noise that parses is the dangerous kind.
    expect(calendarEventIdInText("calendar.google.com/calendar/event?eid=IA")).toBeNull()
  })
})

describe("migration 0070 groups by an id and by nothing else", () => {
  const sql = (() => {
    const src = readFileSync(
      join(ROOT, "workers", "tenancy", "src", "team-schema", "migrations.ts"),
      "utf8"
    )
    const at = src.indexOf('version: "0070_a_source_says_which_call_it_is_from"')
    expect(at, "migration 0070 is not in the ledger").toBeGreaterThan(-1)
    const open = src.indexOf("sql: `", at) + "sql: `".length
    const close = src.indexOf("\n`,", open)
    return src.slice(open, close)
  })()

  /** The statements, without the prose that explains them. */
  const runs = sql.replace(/--[^\n]*/g, "")

  it("adds both columns and an index that skips the nulls", () => {
    expect(sql).toContain("ADD COLUMN event_id TEXT")
    expect(sql).toContain("ADD COLUMN event_id_from TEXT")
    expect(sql).toContain("WHERE event_id IS NOT NULL")
  })

  it("never reads a TITLE — the whole point of the law it obeys", () => {
    // `eventNamedBy` in lib/knowledge-google.ts groups a notice to an event by
    // comparing titles. That is the inference this column exists to replace, and
    // a backfill that reached for it would fill the base with confident wrong
    // parents that nothing downstream could tell from right ones.
    //
    // THE COMMENTS ARE STRIPPED FIRST, and that is not a loophole — it is the
    // difference between what runs and what explains it. The migration's own
    // prose says "an ID join, never a title one", and a scan that could not tell
    // an example from an instance would forbid the sentence that states the
    // rule. Migration 0069 learned this against a status word and left the
    // warning; this is the same lesson, one law over.
    expect(runs).not.toMatch(/\btitle\b/i)
    expect(runs).not.toMatch(/\bLIKE\b/)
  })

  it("is idempotent — a rerun over a placed row changes nothing (R17)", () => {
    // Both backfills ride `event_id IS NULL`, so a second run moves zero rows
    // rather than re-deciding a parent a later, better route had set.
    const updates = runs.match(/UPDATE knowledge_sources[\s\S]*?;/g) ?? []
    expect(updates.length).toBe(2)
    for (const u of updates) expect(u).toContain("event_id IS NULL")
  })
})
