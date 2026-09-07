// A TICKET'S STAGE HISTORY — every move along the ladder, as a row.
//
// THE CLIENT, 2026-09-06: "we need record on category when it arrived vs the
// category we assigned / also how long it sat on each stage / also how often sth
// is reopened". Team migration 0066 is the table and carries the argument for
// its shape; this file is the two halves of the promise — the WRITER every
// status move goes through, and the ONE reader that turns rows into a sequence.
//
// ── WHY THE WRITER IS A SEAM AND NOT SIX INSERTS ────────────────────────────
//
// There are EIGHT places in this codebase that move a ticket's `status`:
// `createTicket` (the initial state), `setStatus` (which the single-status door,
// the resolve door and `bulkSetStatus` all go through), `validateTicket`,
// `markTriaged`, `bulkSetStatusByFilter`, and the three flips in
// `lib/ready-flip.ts` (`readyFlipForTicket`, `scheduledFlip`, `progressFlip`).
// A history missing any ONE of them is worse than no history at all: the gap is
// invisible, the durations either side of it silently merge into one long stage,
// and every number computed from it looks exactly as finished as a true one. So
// the statement is written ONCE, here, and `workers/content/test/status-history-
// has-no-holes.test.ts` reads every worker source off disk and fails the build
// if a status UPDATE ever appears in a function that does not reach this seam.
//
// ── IT IS NOT BEST-EFFORT, AND THAT IS THE DIFFERENCE FROM `logActivity` ─────
//
// `logActivity` swallows its own failures on purpose — a lost sentence in a feed
// is a smaller harm than a refused write. This does NOT swallow, and the reason
// is the paragraph above: a lost row here is not a missing sentence, it is a
// wrong NUMBER, delivered with no sign that anything went missing. A caller that
// cannot record the move gets the failure, loudly, and a person can press the
// button again (every one of those writers carries R17's predicate, so the retry
// moves zero rows and simply re-reports).
//
// ── AND IT IS WRITTEN AFTER THE MOVE, NEVER BEFORE ──────────────────────────
//
// The two are separate statements against the REST door, so one of them can land
// without the other. Written FIRST, a failed UPDATE would leave a PHANTOM event
// — a move recorded that never happened, which is a lie the reader cannot detect
// and which would put a duration in a chart out of nothing. Written LAST, the
// worst case is a HOLE: something real that went unrecorded. 0066's whole ethic
// is that an omission is honest and an invention is not, so the order is not
// negotiable. `createTicket` is the one writer that escapes the choice entirely,
// because its INSERT is already a script and the event rides inside it.
//
// ── THE `from_status` RACE, STATED ──────────────────────────────────────────
//
// Every caller reads the ticket, then moves it with R17's predicate riding the
// UPDATE — the read-then-write shape the whole module uses. So the status the
// caller OBSERVED can, in principle, be one a concurrent writer has already
// moved on from. It costs almost nothing here and it is worth saying why: the
// durations come from consecutive rows' `to_status` and timestamps, never from
// `from_status`, and the concurrent writer records its own row too, so the
// SEQUENCE stays complete either way. `from_status` is load-bearing in exactly
// one place — the FIRST recorded row, which has no predecessor to read a stage
// off — and the reader below prefers the previous row's `to_status` wherever
// there is one, for precisely that reason.

import { d1ExecScript, d1Query, sqlString, type D1Rest } from "@shared/workers/d1-rest"
import { type Actor } from "@shared/workers/activity"
import { type MemberGuard } from "@shared/workers/gating"
import { ulid } from "@shared/workers/id"
import { TICKET_STAGE_EVENT_CAP } from "@shared/workers/limits"
import { workingDaysBetween } from "@shared/business-days"
import type { HelpStatus, TicketStageEvent, TicketStageHistory, TicketStageSpan } from "@shared/types"

/** ONE MOVE, AS A STATEMENT — the single place the row's shape is written down.
 *
 * A STRING rather than an executed write, so `createTicket` can carry it inside
 * the same script as the ticket's own INSERT (one transaction, no window in
 * which a ticket exists with no first stage) while every other caller runs it on
 * its own afterwards. Values go through `sqlString` because a script cannot take
 * bound parameters, and every one of them is server-owned: the id is minted
 * here, the instant is ours, the actor comes from the guard corridor, and the
 * two statuses are values the code already validated against `HELP_STATUSES`
 * before it moved anything. Nothing off a request body reaches this line. */
export function statusEventStatement(
  actor: Actor,
  ticketId: string,
  from: string | null,
  to: string,
  at: string
): string {
  return `INSERT INTO help_status_events (id, help_id, from_status, to_status, created_at, creator_id, creator_email, creator_name)
VALUES (${sqlString(ulid())}, ${sqlString(ticketId)}, ${sqlString(from)}, ${sqlString(to)}, ${sqlString(at)}, ${sqlString(actor.id)}, ${sqlString(actor.email)}, ${sqlString(actor.name)});`
}

/** Record ONE move. Called immediately after the UPDATE that made it, and only
 * when that UPDATE really moved a row (R17: a zero-row move is not an event, and
 * recording one would put a stage of zero seconds into every re-run). */
export async function recordStatusEvent(
  cfg: D1Rest,
  guard: MemberGuard,
  actor: Actor,
  ticketId: string,
  from: string | null,
  to: string,
  at: string
): Promise<void> {
  await d1ExecScript(cfg, guard.databaseId, statusEventStatement(actor, ticketId, from, to, at))
}

/** Record MANY moves — the set-shaped bulk's half of the promise.
 *
 * ONE STATEMENT PER ROW, generated from the array rather than written as a
 * multi-row `VALUES`, because SQLite compiles a multi-row VALUES as a COMPOUND
 * SELECT and D1 refuses one past five terms (the scar is in
 * workers/tenancy/test/d1-compound-cap.test.ts). Chunked because a set-shaped
 * move is capped at `BULK_IDS_LIMIT` rows and a single script of five hundred
 * statements is a request nobody has measured; the chunk is awaited before the
 * next starts, exactly as `bulkSetStatus` awaits its waves and for the same
 * reason — a failure stays inside one chunk instead of scattering across the
 * batch. */
export async function recordStatusEvents(
  cfg: D1Rest,
  guard: MemberGuard,
  actor: Actor,
  moves: { ticketId: string; from: string | null; to: string }[],
  at: string
): Promise<void> {
  const CHUNK = 50
  for (let i = 0; i < moves.length; i += CHUNK) {
    const script = moves
      .slice(i, i + CHUNK)
      .map((m) => statusEventStatement(actor, m.ticketId, m.from, m.to, at))
      .join("\n")
    if (script) await d1ExecScript(cfg, guard.databaseId, script)
  }
}

/** ONE TICKET'S SEQUENCE, and the honest empty answer.
 *
 * NOT FENCED ITSELF, and that is deliberate rather than an omission: the only
 * door that reaches this resolves the ticket through the fenced `getTicket`
 * first and refuses a portal caller besides (SCOPE ch.06 — the client's side has
 * no activity feed at all, and a stage history naming who moved what is the same
 * disclosure in a tidier shape). The ticket id this is handed has therefore
 * already been decided about; adding a second, weaker fence here would suggest
 * the caller need not have done that.
 *
 * R14: `TICKET_STAGE_EVENT_CAP` rides the read, and the rows come back OLDEST
 * FIRST because the sequence IS the answer.
 *
 * ── WHAT A TICKET WITH NO ROWS REPORTS ──────────────────────────────────────
 *
 * `recorded: false`, and every caller must render that as words rather than as
 * numbers. Every ticket that existed before 0066 has an empty history and cannot
 * be given one; "0 days in each stage" would be a measurement nobody took
 * wearing the clothes of one that was. `reopens` is null for the same reason —
 * "never reopened" and "we have no record" are two different facts and there is
 * no honest way to spell them the same. */
export async function readTicketStages(
  cfg: D1Rest,
  guard: MemberGuard,
  ticketId: string
): Promise<TicketStageHistory> {
  const rows = await d1Query<{
    id: string
    from_status: string | null
    to_status: string
    created_at: string
    creator_name: string | null
  }>(
    cfg,
    guard.databaseId,
    // R14: hard cap, said here. See TICKET_STAGE_EVENT_CAP for why this is a
    // refusal ceiling rather than a page size.
    //
    // THE TIE-BREAK IS `rowid`, AND IT IS NOT DECORATION. `created_at` has
    // millisecond resolution, so two moves on one ticket inside the same
    // millisecond sort equal — and a SEQUENCE with a tie in it is a sequence
    // with two orders, which is the one thing this read may not hand back.
    // `id ASC` cannot break it: a ULID's low half is random (shared/workers/
    // id.ts), so within a millisecond it says nothing about order at all, and it
    // reversed a resolve and the reopen after it the first time this was tested.
    // The rowid IS the insertion order, and it is safe to lean on here for a
    // reason that is enforced rather than assumed: nothing ever deletes from
    // this table, so no rowid is ever freed to be handed out again — the last
    // case in workers/content/test/status-history-has-no-holes.test.ts fails the
    // build if an UPDATE or a DELETE of a recorded move is ever written.
    `SELECT id, from_status, to_status, created_at, creator_name
       FROM help_status_events WHERE help_id = ?
      ORDER BY created_at ASC, rowid ASC LIMIT ${TICKET_STAGE_EVENT_CAP}`,
    [ticketId]
  )

  const events: TicketStageEvent[] = rows.map((r) => ({
    id: r.id,
    fromStatus: (r.from_status as HelpStatus | null) ?? null,
    toStatus: r.to_status as HelpStatus,
    at: r.created_at,
    byName: r.creator_name,
  }))

  if (events.length === 0)
    return { recorded: false, fromCreation: false, events: [], spans: [], reopens: null }

  // WHERE THE RECORDING STARTS. A ticket raised before 0066 and moved after it
  // has a REAL sequence that does not begin at the beginning: its first row
  // names a stage whose START nothing recorded. `fromStatus === null` is the
  // creation row's own signature (0066: there was nothing before it), so this is
  // the whole test, and the screen says the earlier stages are not recorded
  // rather than drawing a first stage that begins where the tape does.
  const fromCreation = events[0].fromStatus === null

  // THE STAGES, AS GAPS. A stage is what the ticket became at one event until it
  // became something else at the next — so the durations come from consecutive
  // rows and never from `from_status`, which is what makes them immune to the
  // race the header describes. The LAST event opens a stage that has not closed,
  // so its `to` is null and its length is measured to NOW, on the server, beside
  // the rows: a browser with the tab open all week must not be the thing that
  // decides how old something is.
  //
  // WORKING DAYS, through the one seam (`shared/business-days.ts`). The owner,
  // twice and with emphasis: "the time counts monday-friday! saturday and sunday
  // do not count towards how long it took! very very important!"
  const now = new Date().toISOString()
  const spans: TicketStageSpan[] = events.map((e, i) => {
    const to = events[i + 1]?.at ?? null
    return {
      status: e.toStatus,
      from: e.at,
      to,
      workingDays: workingDaysBetween(e.at, to ?? now),
    }
  })

  // A REOPEN IS A TRANSITION BACK OUT OF `resolved`, and it is DERIVED rather
  // than counted into a column of its own — 0066 says why a second source of
  // truth for one fact is worse than the arithmetic.
  //
  // The previous event's `to_status` is preferred over this event's own
  // `from_status` wherever there is a previous event, because the first is a
  // fact this table recorded at the time and the second is what a caller
  // observed a moment before it wrote. They agree except under the race in the
  // header; where they can differ, the recorded one wins.
  let reopens = 0
  for (let i = 0; i < events.length; i++) {
    const cameFrom = i > 0 ? events[i - 1].toStatus : events[i].fromStatus
    if (cameFrom === "resolved" && events[i].toStatus !== "resolved") reopens++
  }

  return { recorded: true, fromCreation, events, spans, reopens }
}
