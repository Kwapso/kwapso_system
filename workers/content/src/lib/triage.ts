// TRIAGE (.plans/BUILD-1 §6) — whose week it is, and what has been sitting.
//
// TWO SENTENCES, and the second one is the whole design:
//   • "One named person is on triage duty, and it is visible whose week it is."
//   • "A ticket sitting in New for three days appears on a needs-triage list and
//     in the morning digest. INTERNAL NUDGE ONLY — nothing client-facing, no SLA
//     promise."
//
// That second clause is why nothing here ever reaches a client. A ticket that has
// been sitting is our failure, not their business, and telling them about it
// would turn an internal prompt into a promise we never made. The digest goes to
// the person on duty; the list is a screen only staff can open.

import { triageGaps, type TriageGap } from "@shared/triage-readiness"
import { ticketTypeKeptForMigrationExcludedSql } from "@shared/types"
import { d1ExecScript, d1Query, sqlString, type D1Rest } from "@shared/workers/d1-rest"
import { logActivity, type Actor } from "@shared/workers/activity"
import { ulid } from "@shared/workers/id"
import { GuardError, type MemberGuard } from "@shared/workers/gating"
import { LIST_HARD_CAP } from "@shared/workers/limits"
import { workingDaysAgo, workingDaysBetween } from "@shared/business-days"

/** How long a ticket may sit unread before it is somebody's problem out loud.
 * Three days is the owner's number, and it is deliberately not an SLA: nothing
 * client-facing reads it, and no promise anywhere depends on it. */
export const TRIAGE_AFTER_DAYS = 3

/** THE MONDAY a date falls in, as an ISO date. The rota's key, computed in one
 * place so a duty set on Wednesday and a digest read on Friday agree about which
 * week they are talking about.
 *
 * ISO weeks start on Monday, and so does the working week this rota describes —
 * `getUTCDay()` returns 0 for Sunday, which would otherwise put Sunday in the
 * week that is about to start rather than the one just ending. */
export function weekStart(at: Date): string {
  const d = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()))
  const dayFromMonday = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dayFromMonday)
  return d.toISOString().slice(0, 10)
}

export type TriageView = {
  /** whose week it is, or null when nobody has been named yet */
  onDuty: { userId: string; userName: string | null; weekStart: string } | null
  /** the tickets that have been sitting in `new` past the threshold, each
   * carrying WHAT IS STILL MISSING before it may be triaged (shared/triage-
   * readiness.ts). The gaps ride the row rather than being worked out on the
   * screen, because the DOOR refuses by the same function — a queue that drew
   * its own conclusion could offer a button the door would reject. */
  waiting: {
    id: string
    ref: string | null
    description: string
    createdAt: string
    days: number
    missing: TriageGap[]
    /** The four readiness fields themselves, so the queue can open an edit form
     * already filled in rather than fetching the ticket back one row at a time.
     * They are read for `missing` anyway — carrying them costs nothing. */
    helpType: string | null
    accountId: string | null
    appId: string | null
    /** …and the SECTION, which is not a readiness gap (a ticket about no app has
     * no section to name) but is carried for the same reason as the four above:
     * the queue opens a prefilled edit form, and a form that shows "no module"
     * on a ticket that has one is telling somebody something untrue. */
    moduleId: string | null
    raisedByContactId: string | null

    /* ── WHAT THE CARD SHOWS (2026-09-06) — the queue became a SITTING ────────
     *
     * Until today this list was a stack of one-line rows, and a line has room
     * for a reference and a truncated description and nothing else. The client
     * ruled a card that hands over one ticket at a time, and named what is on
     * it: the number, the type, THE CLIENT, THE PERSON WHO RAISED IT WITH THEIR
     * AVATAR, then the title, then the words.
     *
     * NAMES AND FACES RIDE THE ROW (R35). The alternative was to send back ids
     * and let the screen resolve them against the caches it happens to hold —
     * and that is not a choice between two working designs, it is a choice
     * between a right answer and a wrong one: `accounts` is a
     * GROWING_COLLECTIONS list (R14), so the cache the screen holds is PAGE ONE,
     * and a card for a ticket raised by the fifty-first client would have shown
     * a blank chip. `record-picker.tsx`'s own header tells that story about a
     * picker built the same way ("offered the newest fifty companies and
     * silently had no opinion about the rest").
     *
     * A CONTACT IS AN ACCOUNT ROW, which is why both faces come out of one
     * table: `raised_by_contact_id` points at `accounts` (an
     * `accountType: "individual"` row), exactly as `TICKET_COLS` in
     * `lib/help.ts` already resolves the same id for the ticket list. Same
     * subselect, same table, same answer — one read, not five. */
    /** The client's own name and logo, for the client chip. Null on the
     * agency's own tickets, which genuinely have no client. */
    accountName: string | null
    accountLogo: string | null
    /* ── AND THE APP AND THE SECTION'S OWN FACES (2026-09-06, round nine) ─────
     *
     * The client read the card back and moved four facts off the chip line and
     * under the description — "client, app, module and author" — and ruled that
     * all four are LINKS she can navigate from, each wearing its own face. Two
     * of those faces already rode this row (the client's logo, the raiser's
     * avatar). The other two did not, and there were exactly two ways to get
     * them.
     *
     * THE WAY NOT TAKEN: resolve `appId` and `moduleId` in the browser against
     * the `apps` and `app_modules` caches the triage screen already holds. It
     * would have worked TODAY and it is the same mistake, one table along, that
     * the paragraph above this one is a record of — a screen resolving an id
     * against a cache is a screen betting the row it wants is in the window that
     * cache happens to hold. `apps` is bounded today; the day it is not, a card
     * for a ticket on the two-hundredth app draws a blank chip and nothing goes
     * red. R35's own sentence is the rule here — a record never appears without
     * its face — and the face is the DOOR's to hand over, exactly as
     * `TICKET_COLS` (lib/help.ts) has handed over `app_name`, `module_name` and
     * `module_mark` for every ticket in the list since modules existed. Two more
     * correlated subselects on a read that was already happening; the queue
     * stops guessing.
     *
     * THE FILTER ABOVE THE CARD IS THE SAME COLUMN, READ ONCE MORE. The toolbar
     * now offers "filter by app", and its options are built from these very
     * rows — so the words in the dropdown and the words on the card come from
     * one answer and cannot disagree. That is the reason the app's NAME is here
     * and not only its logo: a facet whose labels were resolved in the browser
     * would be the page-one bug wearing a dropdown. */
    /** The system this was raised about, and the mark a person recognises it by
     * (`apps.logo_url`, a `/media/…` path we host). Null when nobody has said
     * which app — which is one of the four readiness gaps, so the card already
     * explains the hole rather than hiding it. */
    appName: string | null
    appLogo: string | null
    /** WHICH SECTION OF THAT APP, with the emoji that rides beside its name
     * everywhere else it is drawn (`app_modules.mark`). A section is NOT a
     * readiness gap — a ticket about no app has no section to name — so null
     * here is ordinary and the meta block simply leaves the line out. */
    moduleName: string | null
    moduleMark: string | null
    /** WHO ASKED, and their face. Null until somebody has said who — which is
     * one of the four readiness gaps, so a card missing this is a card whose
     * Accept is refused anyway, and the empty chip is the honest picture. */
    raisedByContactName: string | null
    raisedByContactLogo: string | null
    /** BOTH TITLES, never one standing in for the other — `HelpTicket`'s own
     * ruling, and the reason is the same here: 788 tickets from Glide exist
     * only in German, and a card that showed `titleEn ?? ""` would have named
     * those "". The screen chooses; the door carries both. */
    titleDe: string | null
    titleEn: string | null
  }[]
  /** R16: the exact server count of those, over the same question */
  total: number
  /** IS THIS CALLER THE ONE ON DUTY (CHECKLIST 5.11: "only the person on duty
   * sees what is waiting to be triaged")? Answered by the door rather than
   * computed in the browser from `onDuty.userId`, because it decides whether
   * `waiting` is populated at all — a screen that filtered a list it had already
   * been handed would be a curtain, not a rule. Admins count as on duty, or a
   * week nobody was named for would be a week nobody could triage. */
  yours: boolean
}

/** Who is on triage duty for the week containing `at`. */
export async function dutyFor(
  cfg: D1Rest,
  guard: MemberGuard,
  at: Date
): Promise<TriageView["onDuty"]> {
  const week = weekStart(at)
  const rows = await d1Query<{ user_id: string; user_name: string | null }>(
    cfg,
    guard.databaseId,
    `SELECT user_id, user_name FROM triage_duty WHERE week_start = ? LIMIT 1`, // R14: one row by key
    [week]
  )
  return rows[0] ? { userId: rows[0].user_id, userName: rows[0].user_name, weekStart: week } : null
}

/** THE NEEDS-TRIAGE LIST: tickets nobody has read yet, past the threshold, oldest
 * first — because the oldest is the one that has been ignored longest, which is
 * the only ordering this list can honestly have.
 *
 * NO ACCOUNT FENCE, and there must not be one: every door that reaches this
 * refuses a client login (routes/triage.ts). A client seeing "your request has
 * been sitting untouched for four days" is the SLA promise §6 says we are not
 * making. */
export async function needsTriage(
  cfg: D1Rest,
  guard: MemberGuard,
  at: Date
): Promise<{ waiting: TriageView["waiting"]; total: number }> {
  // WORKING DAYS, NOT CALENDAR ONES — client, 2026-09-06: "the time counts
  // monday-friday! saturday and sunday do not count towards how long it took!
  // very very important!"
  //
  // This read `at - TRIAGE_AFTER_DAYS * 86_400_000`, so every weekend pushed
  // two free days onto every ticket. Measured over 4,704 raise/now pairs across
  // a fortnight: 89% of spans reported a larger number than the working truth,
  // the worst by four days, and 9% crossed this very line while under three
  // working days — a queue she reads every morning, calling work overdue that
  // had had two days of attention available.
  //
  // `workingDaysAgo` is the exact inverse of the `workingDaysBetween` used for
  // the `days` figure below (there is a test asserting the round trip), so the
  // line this cutoff draws and the number each card shows can never disagree.
  const cutoff = workingDaysAgo(at, TRIAGE_AFTER_DAYS).toISOString()
  // …AND THE KIND THAT IS KEPT BUT NEVER SHOWN IS NOT IN THIS QUEUE EITHER.
  //
  // The client's ruling of 6 Sep 2026 (kept in full beside the test itself,
  // `TICKET_TYPE_KEPT_FOR_MIGRATION` in shared/types.ts): the requirements rows
  // stay in the database for a migration into another one, and stop appearing
  // anywhere in the Tickets experience. This queue is part of that experience —
  // it is a list of tickets, with a count beside it, on a screen a person opens
  // every morning — so a requirements ticket sitting in `new` would have shown
  // up here as work somebody is being nagged to do on a kind of ticket the
  // product no longer has.
  //
  // BUILT ONCE AND SPENT TWICE, on the rows and on the total, for the reason the
  // ticket list builds its WHERE once: a queue of four under a badge reading
  // five is R16's failure in the smallest space it can happen in. The predicate
  // comes from the one shared definition rather than being spelled here, so this
  // file and lib/help.ts cannot come to disagree about what the word is — and it
  // is written this way round, rather than importing lib/help.ts's own clause,
  // because lib/help.ts already imports `TRIAGE_AFTER_DAYS` from here and a
  // cycle between the two would be a real one.
  //
  // A ticket with NO kind is NOT excluded, and that matters more here than
  // anywhere: "nobody has said what kind this is" is one of the four readiness
  // gaps this queue exists to chase. `ticketTypeKeptForMigrationExcludedSql`
  // COALESCEs for exactly that reason.
  const notKept = ticketTypeKeptForMigrationExcludedSql("help_type")
  const rows = await d1Query<{
    id: string
    ref: string | null
    description: string
    created_at: string
    help_type: string | null
    account_id: string | null
    app_id: string | null
    module_id: string | null
    raised_by_contact_id: string | null
    account_name: string | null
    account_logo: string | null
    app_name: string | null
    app_logo: string | null
    module_name: string | null
    module_mark: string | null
    raised_by_contact_name: string | null
    raised_by_contact_logo: string | null
    title_de: string | null
    title_en: string | null
  }>(
    cfg,
    guard.databaseId,
    // `archived_at IS NULL`: a ticket somebody deliberately put away is not one
    // nobody has looked at.
    //
    // The four readiness columns come back with the row so the queue can say
    // WHY a ticket cannot move. Four more columns on a capped read, not a
    // second query.
    //
    // …AND SIX MORE SINCE 2026-09-06, for the same reason and by the same
    // means: the queue draws a CARD now, and a card names the client, the
    // person who asked and the ticket's title. Four correlated subselects and
    // two plain columns on a read that was already happening — the shape
    // `TICKET_COLS` in `lib/help.ts` has used since tickets started paging, and
    // the alternative (ids back, names resolved in the browser) is the R14
    // page-one bug written up on the type above.
    //
    // `accounts` TWICE, once for each id, because a CONTACT is an account row:
    // the ticket's `account_id` is the company and its `raised_by_contact_id` is
    // a person, and both live in the one table this product keeps people and
    // companies in ("Account: a company or a person you work with, both live in
    // the same list").
    `SELECT id, ref, description, created_at, help_type, account_id, app_id, module_id, raised_by_contact_id,
            title_de, title_en,
            (SELECT a.name FROM accounts a WHERE a.id = help.account_id) AS account_name,
            (SELECT a.logo_url FROM accounts a WHERE a.id = help.account_id) AS account_logo,
            (SELECT ap.name FROM apps ap WHERE ap.id = help.app_id) AS app_name,
            (SELECT ap.logo_url FROM apps ap WHERE ap.id = help.app_id) AS app_logo,
            (SELECT m.name FROM app_modules m WHERE m.id = help.module_id) AS module_name,
            (SELECT m.mark FROM app_modules m WHERE m.id = help.module_id) AS module_mark,
            (SELECT a.name FROM accounts a WHERE a.id = help.raised_by_contact_id) AS raised_by_contact_name,
            (SELECT a.logo_url FROM accounts a WHERE a.id = help.raised_by_contact_id) AS raised_by_contact_logo
       FROM help
      WHERE status = 'new' AND archived_at IS NULL AND created_at < ? AND ${notKept}
      ORDER BY created_at ASC LIMIT ${LIST_HARD_CAP}`, // R14 hard cap
    [cutoff]
  )
  const counted = await d1Query<{ n: number }>(
    cfg,
    guard.databaseId,
    `SELECT COUNT(*) AS n FROM help WHERE status = 'new' AND archived_at IS NULL AND created_at < ? AND ${notKept}`,
    [cutoff]
  )
  return {
    waiting: rows.map((r) => ({
      id: r.id,
      ref: r.ref,
      description: r.description,
      createdAt: r.created_at,
      days: workingDaysBetween(r.created_at, at),
      missing: triageGaps({
        helpType: r.help_type,
        accountId: r.account_id,
        appId: r.app_id,
        raisedByContactId: r.raised_by_contact_id,
      }),
      helpType: r.help_type,
      accountId: r.account_id,
      appId: r.app_id,
      moduleId: r.module_id,
      raisedByContactId: r.raised_by_contact_id,
      accountName: r.account_name,
      accountLogo: r.account_logo,
      appName: r.app_name,
      appLogo: r.app_logo,
      moduleName: r.module_name,
      moduleMark: r.module_mark,
      raisedByContactName: r.raised_by_contact_name,
      raisedByContactLogo: r.raised_by_contact_logo,
      titleDe: r.title_de,
      titleEn: r.title_en,
    })),
    total: counted[0]?.n ?? 0,
  }
}

/** Name the person on duty for a week.
 *
 * ONE STATEMENT, upsert-shaped, because "one named person" is a promise the
 * database keeps rather than a check code makes: two admins naming two people for
 * the same week at the same instant must end with one name, not two rows and a
 * screen that shows whichever it read first. */
export async function setDuty(
  cfg: D1Rest,
  guard: MemberGuard,
  actor: Actor,
  week: string,
  person: { userId: string; userName: string }
): Promise<void> {
  await d1ExecScript(
    cfg,
    guard.databaseId,
    `INSERT INTO triage_duty (id, week_start, user_id, user_name, created_at, creator_id, creator_email, creator_name)
VALUES (${sqlString(ulid())}, ${sqlString(week)}, ${sqlString(person.userId)}, ${sqlString(person.userName)}, ${sqlString(new Date().toISOString())}, ${sqlString(actor.id)}, ${sqlString(actor.email)}, ${sqlString(actor.name)})
ON CONFLICT(week_start) DO UPDATE SET user_id = excluded.user_id, user_name = excluded.user_name,
  updated_at = excluded.created_at, editor_id = ${sqlString(actor.id)}, editor_email = ${sqlString(actor.email)}, editor_name = ${sqlString(actor.name)};`
  )
  await logActivity(cfg, guard.databaseId, actor, {
    type: "Triage duty set",
    description: `${actor.name} put ${person.userName} on triage duty for the week of ${week}`,
    relatedTable: "triage_duty",
    relatedRowId: week,
  })
}

/** An ISO date (a Monday) off a request, or a clean 400. The rota is keyed by
 * week, so a date in the middle of one is snapped to its Monday rather than
 * refused — a person picking Wednesday means that week. */
export function requireWeek(raw: string | undefined): string {
  if (!raw) return weekStart(new Date())
  const ms = Date.parse(raw)
  if (!Number.isFinite(ms)) throw new GuardError(400, "invalid_input", "That isn't a date.")
  return weekStart(new Date(ms))
}

/** WHO LOGGED NOTHING LAST WEEK — the weekly nudge (.plans/BUILD-1 §5), asked as
 * one question rather than as one email per person.
 *
 * Deliberately a LIST handed to the person on duty rather than a mail to each
 * person who missed. A nudge that arrives in everybody's inbox every Monday
 * whether or not it is deserved is a nudge people filter, and the whole product
 * has exactly two emails it is allowed to send outside the building precisely
 * because that is what happens to the third one. Inside the building the same
 * reasoning applies with less at stake, so: one message, to one person, naming
 * who to go and ask.
 *
 * `members` comes from the CORE database (the team's own membership); this file
 * only knows the team database, so the caller hands it over. */
export async function loggedNothingLastWeek(
  cfg: D1Rest,
  guard: MemberGuard,
  at: Date,
  members: { userId: string; name: string }[]
): Promise<string[]> {
  if (!members.length) return []
  const thisMonday = weekStart(at)
  const from = new Date(Date.parse(thisMonday) - 7 * 86_400_000).toISOString()
  const rows = await d1Query<{ user_id: string }>(
    cfg,
    guard.databaseId,
    // One row per person who logged ANYTHING in the window — the answer is the
    // complement, computed in memory over a member list that is already bounded.
    `SELECT DISTINCT user_id FROM work_logs
      WHERE discarded_at IS NULL AND started_at >= ? AND started_at < ?
      LIMIT ${LIST_HARD_CAP}`, // R14 hard cap
    [from, thisMonday]
  )
  const logged = new Set(rows.map((r) => r.user_id))
  return members.filter((m) => !logged.has(m.userId)).map((m) => m.name)
}
