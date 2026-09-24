// @vitest-environment node
//
// A PHOTOGRAPH ALWAYS BEATS INITIALS. Aurora's ruling, 23 Sep 2026, verbatim:
// *"on choices adde by show avatar, not initials. make this a rule, but not
// only for this case but always: where there's avatar show it- only initials
// when avatar is empty."*
//
// She found it on one screen — the Choices table's "Added by" cell — and
// generalised it herself, in the same sentence, before anybody could scope it
// to that screen. So this is a census over EVERY place a person's mark is
// drawn, not a fix to the cell she happened to be looking at.
//
// ── WHY A CALL-SITE CENSUS AND NOT A COMPONENT CHECK ────────────────────────
//
// `RecordMark` has ALWAYS drawn a photograph when it is given one and fallen
// back to an initial when it is not (shared/web/record-mark.tsx, its whole
// state machine). The component was never the defect, and a check that read
// the component would have been green on the very day she filed this. The
// defect is upstream of it every single time: a CALL SITE that could have
// reached the photograph and did not ask for it.
//
// All four found on the day this shipped were that shape, and not one of them
// was a missing fact:
//
//   · `shapeChoicesTable`'s Added-by cell (deep-link/shape.tsx) — the door
//     had been SELECTING `selectable_data.creator_id` since the Added columns
//     landed, with a comment naming this exact use ("the id is what a future
//     face would resolve through"), and `toValue` dropped it on the floor.
//   · the Kanban card's assignee (work/stories-screen.tsx) — `membersById`
//     was already in scope a few hundred lines up, built for the Assignee
//     facet, whose own comment says that list carries "a picture `Story` rows
//     themselves do not". The card never asked it.
//   · the app stakeholders checklist AND its Main stakeholder picker
//     (apps/app-stakeholders-fields.tsx) — `AccountLink.personLogoUrl` has
//     carried the contact's face the whole time, and BOTH callers flattened
//     it away in their own `.map` before it could arrive.
//
// A component-level check sees none of that. Only reading the call sites does.
//
// ── HOW "CAN REACH IT" IS MADE DECIDABLE ────────────────────────────────────
//
// "Can this expression reach a photograph?" is not a question a source census
// can answer in general — the answer lives in a door, a cache and a type, one
// import graph away. So the burden is INVERTED, the way R29/R60/R96 already
// invert theirs: a person's mark drawn with NO picture is a FINDING, and the
// only way out is a `PHOTO_UNREACHABLE` line SAYING why the photograph cannot
// be got from where that call site stands. That turns an unanswerable question
// into an answerable one, and it puts the answer where the next reader will
// find it instead of in a comment nothing reads at build time.
//
// It is rot-checked BOTH ways, so the list can only shrink: an entry naming a
// call site that now passes a picture has outlived its subject, and an entry
// naming an expression no file contains any more is a lie the census would
// otherwise step over.
//
// ── WHAT COUNTS AS A PERSON'S MARK ──────────────────────────────────────────
//
// `<RecordMark shape="round">` — `shape="round"` IS the app's own declaration
// that this is "a person in their own right" (record-mark.tsx's header, R31's
// two radii). A `square` mark is a company, an app, an asset: a thing, which
// has a logo rather than a photograph and is out of this ruling's scope.
// `<PersonCard>` is a person by its own name and needs no shape test.
//
// COMMENTS ARE STRIPPED FIRST, through the repo's ONE stripper
// (`shared/rules/strip-comments.mjs`, re-exported by `source-scan.ts`) rather
// than a second hand-rolled tokeniser — `web/test/source-scan.test.ts` holds
// that line, and it is the right one: a regex that thinks `accept="image/*"`
// opens a comment quietly shortens the source a law is reading and the law
// passes on what it cannot see. This file's subject matter is quoted at length
// in the comments of the very files it walks — `member-screen.tsx`,
// `help-form-dialog.tsx` and `accounts-screen.tsx` all describe a
// `<RecordMark … shape="round" />` in prose — and a census that counted those
// would report four findings that are not code and miss any real one in the
// noise.

import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

const WEB = new URL("../", import.meta.url).pathname

/** A call site that draws a person's mark with NO photograph, because the
 * photograph genuinely cannot be reached from where it stands. Keyed by
 * `{file, contains}` — a fragment of the call site's own text, never a line
 * number, which rots on every edit above it.
 *
 * EMPTY IS NOT THE GOAL HERE, unlike most of this repo's exemption tables. A
 * person with no photograph on file is the ordinary case, and some records
 * genuinely have no person behind them yet at all. What the table is for is
 * making the DIFFERENCE explicit: "this person has no picture" (fine, the
 * mark falls back) versus "this screen never went and got the picture" (the
 * defect). */
const PHOTO_UNREACHABLE: { file: string; contains: string; why: string }[] = [
  {
    file: "components/deep-link/shape.tsx",
    contains: "<RecordMark name={i.email} shape=\"round\" />",
    why:
      "AN INVITATION IS NOT A PERSON YET. `shapeInvitesList` draws a pending invite, whose only " +
      "identity is the email it was sent to — there is no user row, no `image_url`, and nothing " +
      "to resolve one through until somebody accepts. The mark falls back to the email's own " +
      "first letter, which is the whole of what is known. This line stops being exempt the day " +
      "an invite carries an accepted user id.",
  },
  /* THE MEETING ATTENDEES' ENTRY IS PAID, 23 Sep 2026, and this is the record
   * of it rather than a silent deletion.
   *
   * WHAT IT SAID. The entry named `components/meetings/meeting-detail.tsx`'s
   * `<PersonCard key={g.email}`, on the reasoning that a Google Calendar guest
   * is an email address and not a record: the chip beside each name already
   * said which of them we RECOGNISE, "so the lookup exists and the FACE is the
   * half it does not carry back". It closed, in the photo lane's own words,
   * "REPORTED, not excused permanently — this line should go the day that map
   * carries a picture."
   *
   * WHY IT IS GONE. That day is today, for the half that was ever reachable.
   * The link the meetings screen resolves carries `memberUserId`, which is a
   * real user id, so a COLLEAGUE's photograph is one `memberFace` lookup
   * against the members cache every other staff face in this app already reads
   * — no door change. That call site passes `picture=` now, which means this
   * census no longer produces it as a finding at all, and an exemption for a
   * finding that does not exist is one that would step over a REAL finding
   * moving into the same file later. That is this table's own rot rule, and it
   * is why the line could not simply be reworded in place.
   *
   * WHAT IS STILL MISSING, SO NOBODY READS THIS AS "DONE". A CLIENT CONTACT's
   * own photograph is still not drawn: `MeetingPersonLink` (shared/types.ts)
   * carries the account's id and name and no contact id and no logo, so there
   * is nothing on this side to resolve one through. Closing it is a change to
   * the `meetingPeople` door, not to a call site, which is why it is not a
   * line in a table about call sites. The call site's own comment carries the
   * same sentence, next to the code that would change.
   *
   * AND THE `external` FLAG RIDES ON BOTH POPULATIONS ALREADY — a guest linked
   * to a client's account is marked from outside whether or not there is a
   * photograph to grey, so the day an outside person's initials TILE is given
   * its own treatment, that list needs no second pass. */
]

/** Every `<Tag …>` occurrence in `src`, returned with its full opening tag
 * text. Brace depth is tracked so a `{ticket.raiserIsClient ? a : b}` value
 * containing a `>` does not end the tag early. */
function openingTags(src: string, tag: string): string[] {
  const out: string[] = []
  const re = new RegExp(`<${tag}(?=[\\s/>])`, "g")
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    let i = m.index + m[0].length
    let depth = 0
    while (i < src.length) {
      const c = src[i]
      if (c === "{") depth++
      else if (c === "}") depth--
      else if (c === ">" && depth === 0) break
      i++
    }
    out.push(src.slice(m.index, i + 1))
  }
  return out
}

type Finding = { rel: string; tag: string }

/** An exemption matches a finding when it names the same FILE and its
 * `contains` fragment appears in that call site's own text. Whitespace is
 * normalised on both sides, so a line the formatter rewraps tomorrow does not
 * silently unpin its own exemption — the failure mode a line number has, one
 * layer up. */
function matches(f: Finding, e: { file: string; contains: string }): boolean {
  const relFromWeb = "components/" + f.rel
  return relFromWeb === e.file && f.tag.includes(e.contains.replace(/\s+/g, " "))
}

function personMarksWithoutAPhotograph(): Finding[] {
  const findings: Finding[] = []
  for (const f of sourceFiles(WEB + "components", { extensions: [".tsx"] })) {
    const code = stripComments(f.source)
    for (const tag of openingTags(code, "RecordMark")) {
      if (!/shape=["{]?"?round/.test(tag)) continue
      if (/\bpicture=/.test(tag)) continue
      findings.push({ rel: f.rel, tag: tag.replace(/\s+/g, " ") })
    }
    for (const tag of openingTags(code, "PersonCard")) {
      if (/\bpicture=/.test(tag)) continue
      findings.push({ rel: f.rel, tag: tag.replace(/\s+/g, " ") })
    }
  }
  return findings
}

describe("R111 — a photograph always beats initials", () => {
  it("every person's mark in web/components asks for a photograph, or says why it cannot reach one", () => {
    const unexcused = personMarksWithoutAPhotograph().filter(
      (f) => !PHOTO_UNREACHABLE.some((e) => matches(f, e))
    )
    expect(
      unexcused,
      "R111 (Aurora, 23 Sep 2026: \"where there's avatar show it- only initials when avatar is " +
        "empty\") — these call sites draw a PERSON's mark and never ask for their photograph, so " +
        "everybody with a picture on file gets a letter tile instead. Pass `picture={…}` (the " +
        "face is almost always one lookup away — see this file's header for the four that were), " +
        "or name the call site in PHOTO_UNREACHABLE with the reason the photograph cannot be got " +
        "from where it stands:\n  " +
        unexcused.map((f) => `${f.rel}  ${f.tag}`).join("\n  ")
    ).toEqual([])
  })

  it("PHOTO_UNREACHABLE names only call sites that still draw a person with no photograph", () => {
    const live = personMarksWithoutAPhotograph()
    const rotted = PHOTO_UNREACHABLE.filter(
      (e) => !live.some((f) => matches(f, e))
    )
    expect(
      rotted,
      "these PHOTO_UNREACHABLE entries name a call site that no longer exists, or that now passes " +
        "a `picture` — the exemption has outlived its subject and would step over a real finding " +
        "that moved into the same file. Delete it:\n  " +
        rotted.map((e) => `${e.file}  ${e.contains}`).join("\n  ")
    ).toEqual([])
  })

  it("the census can see a real offender (tripwire: it is not passing by matching nothing)", () => {
    // A census that silently stopped matching would pass this whole suite while
    // proving nothing — the exact failure `check-avatar.mjs` §5a hit in the kit
    // the same day, where a clause was satisfied by its own documentation. So
    // the parser is run against a synthetic file and must FIND the offender.
    // THE COMMENT MARKER IS ASSEMBLED, NOT TYPED. A literal `//` line inside
    // this template would be a real comment sitting in this file's own source,
    // and `web/test/source-scan.test.ts`'s meta-check — "no line that plainly
    // IS a comment survives the stripper" — would read it as one and go red.
    // It is right to: a law that can be satisfied by prose in the file it is
    // scanning is exactly the failure that check exists for.
    const commented = "/" + "/ <RecordMark name={decoy} shape=\"round\" /> — prose, must be ignored"
    const sample = `
      ${commented}
      const a = <RecordMark picture={m.photo} name={m.name} shape="round" />
      const b = <RecordMark name={m.name} shape="round" size="choice" />
      const c = <RecordMark picture={a.logoUrl} name={a.name} />
    `
    const code = stripComments(sample)
    const round = openingTags(code, "RecordMark").filter((t) => /shape=["{]?"?round/.test(t))
    expect(round).toHaveLength(2)
    expect(round.filter((t) => !/\bpicture=/.test(t))).toHaveLength(1)
  })
})
