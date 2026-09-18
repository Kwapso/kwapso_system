// BUILD-5 §J follow-up, 18 Sep 2026 — the owner's ruling, verbatim: "whatever
// gets shared through Google Calendar or email regarding call transcripts
// should be synced to the knowledge base, and by default, the right is that
// the team owns it. That can, of course, be changed later."
//
// `isCallNotesEmail` is the classifier that decides whether one gmail thread
// gets that default flipped from the ordinary "a mailbox is nobody's team
// material" rule. It is the whole decision — `readGoogleMaterial`'s own
// `shelf:` line is a one-token ternary on its answer — so this proves the
// classifier directly rather than standing up the full Gmail-read harness a
// second time.

import { describe, expect, it } from "vitest"

import { isCallNotesEmail } from "../src/lib/google-read"

describe("isCallNotesEmail — a Meet-notes email defaults to the team, ordinary mail does not", () => {
  it("is true for the real shape (Ishita's Team Assembly notes, read off staging D1 before this shipped)", () => {
    expect(
      isCallNotesEmail(
        'Notes: "🧡 Team Assembly" Aug 19, 2026',
        'Notes from "🧡 Team Assembly"\n\nThese notes have been sent to invited guests in your organization. Open meeting notes\n\nThe content was auto-generated on August 19, 2026, 5:08 PM IST and may contain errors.'
      )
    ).toBe(true)
  })

  it("is true on the snippet's auto-generated sentence alone, when the org sentence is out of range", () => {
    expect(
      isCallNotesEmail(
        'Notes: "Weekly sync" Sep 3, 2026',
        "This content was auto-generated on September 3, 2026 and may contain errors."
      )
    ).toBe(true)
  })

  it("is false for an ordinary personal email, even one that says the word notes", () => {
    expect(
      isCallNotesEmail(
        "My notes from today",
        "Hey, just wanted to jot down a few thoughts before I forget them."
      )
    ).toBe(false)
  })

  it("is false when only the subject matches — the snippet must confirm it, or a human-written 'Notes: \"...\"' subject would false-positive", () => {
    expect(
      isCallNotesEmail('Notes: "Book club" Sep 3, 2026', "Hey all, here's what I thought of chapter three.")
    ).toBe(false)
  })

  it("is false when only the snippet matches — a forwarded notice ABOUT one is not itself the notes", () => {
    expect(
      isCallNotesEmail(
        "Fwd: check this out",
        "Someone sent me notes that were auto-generated on Sep 3, 2026 for a meeting I wasn't even on."
      )
    ).toBe(false)
  })

  it("is case- and quote-mark tolerant on the subject prefix (Gmail can normalise curly quotes either way)", () => {
    expect(
      isCallNotesEmail(
        'notes: “Standup” Sep 3, 2026',
        "auto-generated on September 3, 2026"
      )
    ).toBe(true)
  })
})
