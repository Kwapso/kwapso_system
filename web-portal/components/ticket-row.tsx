"use client"

// One ticket, as a row — shared by Home (the newest few) and Tickets (all of
// them), so the same ticket never looks like two different things.
//
// What it shows: its NUMBER, what you asked, where it stands, and when. What it
// does NOT show: who at the agency has it. "The portal shows work status but
// never which staff member is doing it" (SCOPE ch.06) — so there is no assignee
// here, and there is nowhere for one to be added by accident later.
//
// ── WHY THE NUMBER IS HERE, ON THE CLIENT'S SIDE (7 Sep 2026) ──────────────
//
// It is a change to what a client sees, so it is argued rather than assumed.
//
// WHAT CH.06 ACTUALLY WITHHOLDS is STAFF ROUTING AND ATTRIBUTION — the assignee
// on this row, the activity feed on the ticket screen (`PORTAL_ACTIVITY_EXEMPT`),
// the creator and editor names on a deliverable. Every one of those answers
// "who inside the agency is doing this", which is the sentence the chapter
// writes. A reference answers "WHICH REQUEST ARE WE TALKING ABOUT", and it is
// the same string on both sides of the fence: `shared/workers/refs.ts` mints it
// team-wide with no account code in it, so it names no other client and leaks
// nothing about our routing. It is not the kind of fact ch.06 is about.
//
// THE PORTAL ALREADY DOES THIS, and has for as long as Inputs have had numbers:
// `waiting-on-you.tsx` and `sent-to-us.tsx` both print a to-do's `I####` to the
// client. So the question was never "may a client see one of our references" —
// it was already answered yes — but "why can they see the number of the thing WE
// asked THEM for, and not the number of the thing they asked US for."
//
// AND THE SEARCH ALREADY MATCHED IT. The portal's own ticket search goes to the
// same door the agency's does (`ticketWhere`, workers/content/src/lib/help.ts),
// whose clause LIKEs `ref` — so a client could always FIND a ticket by its
// number and could never LEARN one, except by a member of staff quoting it in a
// reply. A key with no keyhole on the screen is the worst of the three states.
//
// WHAT IS STILL NOT HERE, deliberately: the APP the ticket sits on. The agency's
// own four-chip line carries it (`shared/web/ticket-chips.tsx`) and this row does
// not, because which internal system a request was routed onto is exactly the
// kind of fact ch.06 keeps on our side of the fence. The number travels; the
// routing does not.

import Link from "next/link"

import { Badge } from "@shared/ui/components/badge/badge"
import { Clamp } from "@shared/ui/components/clamp/clamp"
import { CaretRight } from "@shared/ui/foundations/icons"

import type { HelpTicket } from "@shared/types"
import { formatRelative } from "@shared/web/format"
import { useLanguage } from "@shared/web/language"
import { RecordRef, REF_LEADS_NAME } from "@shared/web/record-ref"
import { richTextPlain } from "@shared/web/rich-text"

/** Plain words for each state, and a colour that means the same thing every time.
 *
 * ALL SIX, and the record type is what makes that a promise rather than an
 * intention: `Record<HelpTicket["status"], …>` means a seventh state added to
 * HELP_STATUSES fails the type check here instead of rendering `undefined` in a
 * badge. It already caught two — `awaiting_validation` and `scheduled` arrived
 * with CHECKLIST 5.13 and 5.3 and this map still held the old five. It caught a
 * third going the other way, which is the same guarantee read backwards: when
 * the client retired `awaiting_validation` on 7 Sep 2026 this map still held
 * "Waiting for your go-ahead", and the type check said so.
 *
 * C7: a status is a BADGE. It is a fact about the request, never a control — the
 * one thing a client can DO about a state lives on the ticket screen as its own
 * button (CHECKLIST 5.2, 5.13), and there is nowhere here for a second one to be
 * added by accident.
 *
 * The labels are ENGLISH KEYS, translated where they are drawn (`t(label)`) — a
 * translated string in a module-level constant would be frozen in the language
 * the tab loaded in. */
export const STATUS_WORDS: Record<
  HelpTicket["status"],
  { label: string; variant: "secondary" | "default" | "success" | "outline" | "warning" }
> = {
  // THE CLIENT'S WORDS, not ours. "Triaged" is our word for having read and
  // sorted it; what it means to them is that a person here has looked at it.
  // "Scheduled" is our word for it having a place in a block of work; to them it
  // is booked in. And "Ready" is our word for every piece of work being done — to
  // them it is us about to come back with an answer. SCOPE ch.06: the portal
  // shows work status, and it says it the way the person reading it would.
  //
  // NO AMBER LEFT, AND THAT IS THE RETIREMENT SHOWING THROUGH. "Waiting for your
  // go-ahead" led this map and was the one entry drawn in the attention colour,
  // because it was the one state where nothing moved until the person reading
  // the screen did something. The stage is retired (shared/types.ts,
  // `HELP_STATUSES`) and no surviving state asks anything of the reader — every
  // one of the six below is a report on where their request stands. A client's
  // ticket now starts at "With us" the moment they raise it.
  new: { label: "With us", variant: "secondary" },
  triaged: { label: "Looked at", variant: "secondary" },
  scheduled: { label: "Booked in", variant: "secondary" },
  in_progress: { label: "Being worked on", variant: "default" },
  ready: { label: "Almost there", variant: "default" },
  resolved: { label: "Done", variant: "success" },
}

export function TicketRow({ ticket }: { ticket: HelpTicket }) {
  const { t, lang } = useLanguage()
  const status = STATUS_WORDS[ticket.status]
  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className="hover:bg-accent/50 motion-hover flex flex-wrap items-center gap-2 rounded-[var(--radius)] bg-surface-panel p-4"
    >
      <div className="flex min-w-0 flex-1 basis-[12rem] flex-col gap-2">
        {/* THE NUMBER LEADS WHAT WAS ASKED — the same black chip, from the same
            component, that the agency app draws for the same ticket. Two
            renderings of one mark is how the two front doors would start
            disagreeing about it. A ticket raised without a client reference
            draws no chip and the row is exactly what it was. */}
        <span className={REF_LEADS_NAME}>
          <RecordRef value={ticket.ref} />
          <Clamp lines={2} collapsible={false}>{richTextPlain(ticket.description)}</Clamp>
        </span>
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={status.variant}>{t(status.label)}</Badge>
          {/* HOW MUCH WORK IS ON IT, and nothing else about that work
              (.plans/BUILD-1 §7: "stories as a COUNT only — never the titles").
              Both numbers, because "3 pieces of work, 1 done" is a picture and
              "3 pieces of work" is a shrug. Absent when there is none, rather
              than a "0 of 0" that reads as neglect on a request somebody
              answered without needing to build anything.

              ONE PHRASE, NOT TWO. It used to read "3 pieces of work, 1 done" —
              two numbers a sentence apart, which is two things on a band that
              already carries a state and a date (N1). "1 of 3 done" is the same
              picture in one unit, and it is the phrasing the sprint rows on the
              other front door already use, so a count reads the same way
              wherever somebody meets it. */}
          {ticket.storyCount > 0 && (
            <span>
              {t("{done} of {total} done", {
                done: ticket.doneStoryCount,
                total: ticket.storyCount,
              })}
            </span>
          )}
          <span>{formatRelative(ticket.updatedAt ?? ticket.createdAt, t, lang)}</span>
        </div>
      </div>
      <CaretRight className="text-muted-foreground size-4 shrink-0" />
    </Link>
  )
}
