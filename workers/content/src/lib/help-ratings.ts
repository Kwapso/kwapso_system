// HOW DID WE DO — the client's own answer, on a ticket we have finished.
//
// THE OWNER, 2026-09-06: "let's store sentiment (1-3) on the portal for how did
// we do it to see if client is happy", and then "sentiment they can add a text
// (optional)". Team migration 0067 is the table and carries the argument for its
// shape; this file is the door's own half of it — the three rulings that decide
// WHO may answer, WHEN, and HOW MANY TIMES, all enforced here rather than by the
// screen that happens to draw the control today.
//
// ── ONLY ON A RESOLVED TICKET ───────────────────────────────────────────────
//
// "How did we do" is a question in the PAST TENSE about work that is finished.
// Asked on a ticket still in progress it measures something else entirely — how
// a person feels about waiting — and that answer would land in the same column,
// under the same heading, with nothing afterwards able to separate the two. So
// the door refuses a rating on anything that is not `resolved`, in words.
//
// A REOPEN DOES NOT TAKE THE ANSWER BACK. A ticket answered, rated 1, reopened
// and answered again keeps the 1 and can gain a second row. That is the whole
// point of the shape: the useful sentence this data can say is "we did badly and
// then we fixed it", and only a row per answer can say it.
//
// THE RATING IS NOT REFUSED TO STAFF, and that is the same reading `validate`
// already makes one door along (CHECKLIST 5.13): the answer sometimes arrives by
// phone and somebody here types it in. The row records WHO wrote it, so a later
// reader can tell a client's own words from a relayed summary — which is a
// distinction the alternative (an anonymous score) could never recover.
//
// ── MANY ANSWERS, ONE STANDING ONE ──────────────────────────────────────────
//
// Nothing here UPDATEs. A person who changes their mind writes a new row, and
// the newest row per person is what the portal shows them back. The obvious
// alternative — UNIQUE (help_id, creator_id) with an upsert — answers "what do
// they think now" perfectly and destroys "what did they think then" in order to,
// which is exactly the record the owner asked to keep.
//
// ── THE FENCE ───────────────────────────────────────────────────────────────
//
// `getTicket`, the same fence `stakeholders.ts` stands on and for the same
// reason: a rating is a PROPERTY of a ticket, so whether the ticket is theirs to
// ask about is the only question, and it is already answered by one fenced read.
// A ticket outside the fence is not there, and a rating on it is a 404 rather
// than a 403 — "not yours" must never confirm that a ticket exists.
//
// And one narrowing on top of it, on the READ only: a portal caller is answered
// with THEIR OWN rows and nobody else's. A colleague's private "1 out of 3" is
// not a fact about the ticket the way a reply is; it is a personal statement,
// and the account fence is the wrong instrument for it. Staff see the whole set,
// because reading what a client said is the entire reason the fact is stored.

import { logActivity, type Actor } from "@shared/workers/activity"
import { type AccountScope } from "@shared/workers/account-scope"
import { d1ExecScript, d1Query, sqlString, type D1Rest } from "@shared/workers/d1-rest"
import { GuardError, type MemberGuard } from "@shared/workers/gating"
import { ulid } from "@shared/workers/id"
import { TICKET_RATING_CAP } from "@shared/workers/limits"
import type { TicketRating } from "@shared/types"

import { getTicket } from "./help"

/** THE SCALE, WRITTEN DOWN ONCE. Three points because the owner said three, and
 * the schema's own CHECK constraint holds the same three (0067) — this is the
 * door's copy of that floor, so a 4 is a clean 400 with a sentence rather than a
 * constraint violation surfacing as a 500. */
const RATING_SCORES = [1, 2, 3] as const

type RatingRow = {
  id: string
  help_id: string
  score: number
  comment: string | null
  created_at: string
  creator_id: string | null
  creator_name: string | null
}

const toRating = (r: RatingRow): TicketRating => ({
  id: r.id,
  ticketId: r.help_id,
  score: r.score as 1 | 2 | 3,
  comment: r.comment,
  createdAt: r.created_at,
  byId: r.creator_id,
  byName: r.creator_name,
})

/** SAY HOW WE DID. Appends a row; never touches one.
 *
 * `comment` is OPTIONAL in the real sense and nothing below may pretend
 * otherwise: a score with no words is a complete rating, said in full, and there
 * is no branch here that refuses one, warns about one or asks again. The owner's
 * second message added the text as an extra, not as a second half. */
export async function rateTicket(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  actor: Actor,
  ticketId: string,
  score: number,
  comment: string | null
): Promise<TicketRating> {
  // The fence first, and it decides whether the ticket EXISTS for this caller
  // before anything else is judged — so a client probing ids learns nothing from
  // the difference between "not yours" and "not finished yet".
  const ticket = await getTicket(cfg, guard, scope, ticketId)
  if (!ticket) throw new GuardError(404, "help_not_found", "That ticket doesn't exist.")

  if (!(RATING_SCORES as readonly number[]).includes(score))
    throw new GuardError(400, "invalid_input", "A rating is 1, 2 or 3.")

  // WHEN IT MAY BE GIVEN, enforced at the door rather than by the screen. The
  // header says why the tense of the question is the rule.
  if (ticket.status !== "resolved")
    throw new GuardError(
      409,
      "not_resolved",
      "We can ask how we did once this one is answered. It's still open."
    )

  const id = ulid()
  const now = new Date().toISOString()
  await d1ExecScript(
    cfg,
    guard.databaseId,
    // INSERT and never UPDATE — 0067's whole shape. The values are server-owned
    // (a minted id, our own instant, the actor off the guard corridor) except
    // the two the caller supplied, and both of those were checked above: the
    // score against `RATING_SCORES`, the comment through the validation seam at
    // the door.
    `INSERT INTO help_ratings (id, help_id, score, comment, created_at, creator_id, creator_email, creator_name)
VALUES (${sqlString(id)}, ${sqlString(ticketId)}, ${score}, ${sqlString(comment)}, ${sqlString(now)}, ${sqlString(actor.id)}, ${sqlString(actor.email)}, ${sqlString(actor.name)});`
  )

  // THE AGENCY'S READ, TODAY, WITH NO NEW SCREEN. There is no sentiment
  // dashboard yet and building one is a separate design question — but "the
  // agency must be able to read what a client said" is not a thing to defer, and
  // the ticket's own Activity tab is where the agency already reads everything
  // else that happened to a request. The client's side has no activity feed at
  // all (PORTAL_ACTIVITY_EXEMPT), so this sentence is ours and stays ours.
  //
  // The SCORE is in the sentence and the comment is not: the words are the
  // client's own and belong where they were written, not paraphrased into a log
  // line that a feed will one day truncate.
  await logActivity(cfg, guard.databaseId, actor, {
    type: "Ticket rated",
    description: `${actor.name} rated ${ticket.ref ?? "a ticket"} ${score} out of 3${comment ? ", with a comment" : ""}`,
    relatedTable: "help",
    relatedRowId: ticketId,
  })

  return {
    id,
    ticketId,
    score: score as 1 | 2 | 3,
    comment,
    createdAt: now,
    byId: actor.id,
    byName: actor.name,
  }
}

/** WHAT WAS SAID ABOUT THIS TICKET, and what THIS caller said.
 *
 * R14: `TICKET_RATING_CAP` rides the read, newest first — the standing answer is
 * the newest row per person and everything under it is the record of how we did
 * at the time.
 *
 * The portal narrowing is in the STATEMENT rather than applied to the rows
 * afterwards, so there is no moment at which a colleague's answer has been
 * fetched into a response a redaction step could forget to remove. */
export async function readTicketRatings(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  ticketId: string
): Promise<{ ratings: TicketRating[]; mine: TicketRating | null }> {
  const ticket = await getTicket(cfg, guard, scope, ticketId)
  if (!ticket) throw new GuardError(404, "help_not_found", "That ticket doesn't exist.")

  const own = scope.kind === "portal" ? " AND creator_id = ?" : ""
  const ownParams = scope.kind === "portal" ? [guard.userId] : []
  const rows = await d1Query<RatingRow>(
    cfg,
    guard.databaseId,
    // NEWEST FIRST, and the tie-break is `rowid` for the reason the stage
    // history's is (lib/help-stages.ts says it at length): `created_at` is
    // millisecond-resolution and a ULID's low half is random, so two answers
    // inside one millisecond have no order without it — and "which of these is
    // the standing one" is the whole question this read answers. Nothing ever
    // deletes from this table, so no rowid is ever handed out twice.
    `SELECT id, help_id, score, comment, created_at, creator_id, creator_name
       FROM help_ratings WHERE help_id = ?${own}
      ORDER BY created_at DESC, rowid DESC LIMIT ${TICKET_RATING_CAP}`,
    [ticketId, ...ownParams]
  )
  const ratings = rows.map(toRating)
  return { ratings, mine: ratings.find((r) => r.byId === guard.userId) ?? null }
}
