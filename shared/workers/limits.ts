// ONE place for the read/write size caps every worker shares (R14: no unbounded
// list endpoint). A cap is a hard ceiling with a comment at the query — beyond
// it, the screen must move to real server paging (LIMIT ? OFFSET ? + a total).
// WHY: one unbounded read stalls a worker at 100k rows; scale is a law, not a
// per-screen choice — the failure that earned it was a 24,000-row catalogue.

/** Hard cap on any collection list read (rows a screen loads in one go). */
export const LIST_HARD_CAP = 1000

/** Hard cap on a CSV export read — larger than a screen load (an export is a
 * deliberate download), still bounded so one request can't stream a whole shard. */
export const EXPORT_HARD_CAP = 10_000

/** WHERE COUNTING STOPS — the one ceiling on every total this app reports, for a
 * filtered SEARCH and (since R16 was amended on 2026-08-14) for a COLLECTION too.
 *
 * ONE number rather than two, deliberately. A filtered search has always counted
 * exactly to a million and then said "1m+"; the amendment gives a collection total
 * the same ceiling and the same sentence, so there is one place in the product
 * where counting stops instead of two that could drift apart. A door that stopped
 * counting at one number while the badge started hedging at another would produce
 * precisely the output this seam exists to prevent: a total that is quietly wrong
 * and looks exact.
 *
 * It lives HERE, beside the other read ceilings, because both sides need it and
 * neither may own it — `shared/workers/count.ts` bounds the scan with it and
 * `shared/web/format-count.ts` renders the "+" from it. This file is pure
 * constants with no imports, so the browser pays nothing to read it. */
export const TOTAL_COUNT_CAP = 1_000_000

/** Hard cap on a conversation/derived read (a ticket's replies, a chat thread's
 * messages, a per-member progress matrix). */
export const THREAD_HARD_CAP = 500

// ── the platform's own ceiling on one statement ───────────────────────────────
// The caps above are OURS: numbers we chose. This one is D1's, and it is the
// reason a read can be perfectly bounded by the caps above and still fail.

/** Bound parameters D1 accepts in ONE statement (checked against Cloudflare's
 * published D1 limits, 14 Aug 2026). Named here rather than repeated at each
 * door because it is the ceiling the caps above have to fit UNDER: a read capped
 * at LIST_HARD_CAP that then looks its 1,000 ids up with `IN (?, ?, …)` is a
 * bounded read that D1 refuses outright.
 *
 * WHY IT KEPT BEING MISSED: every suite in this repo runs its SQL against local
 * SQLite, whose limit is 999 — a harness ten times MORE permissive than the thing
 * it stands in for, so a statement binding 500 values passes every test and 500s
 * in production. It has, twice (`workers/content/test/d1-parameter-cap.test.ts`
 * records the first). */
export const D1_MAX_BOUND_PARAMS = 100

/** Slice an id list into batches that fit under D1's ceiling, so a lookup over
 * more ids than one statement may carry becomes several statements instead of an
 * error. `reserved` is how many parameters the statement binds BESIDE the ids
 * (a team id, a status) — counted, not guessed, because the ceiling is on the
 * whole statement.
 *
 * The alternative — interpolating the ids through `sqlString` — is what the fence
 * does (shared/workers/account-scope.ts), and it is right there because the SQL
 * is assembled as text anyway. On the core database the house style is a bound
 * `env.DB.prepare(...).bind(...)`, and batching keeps it that way rather than
 * teaching a second habit. */
export function idBatches(ids: string[], reserved = 0): string[][] {
  const size = Math.max(1, D1_MAX_BOUND_PARAMS - reserved)
  const out: string[][] = []
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size))
  return out
}

/** Companies one client login may STAND IN (the portal switcher's list).
 *
 * Different from SCOPE_HARD_CAP, which bounds how far the fence REACHES DOWN from
 * whichever one they are standing in. This bounds how many they can choose
 * between, and it exists for two reasons: the roots read had no LIMIT at all
 * (R14), and the switcher's own lookup binds one parameter per root — so an
 * uncapped set was both an unbounded read and a statement D1 would refuse. Far
 * above "a person belongs to a handful of companies", and under
 * D1_MAX_BOUND_PARAMS with room for the rest of the statement. Past it the set is
 * short in the SAFE direction, like every other fence ceiling: fewer companies,
 * never someone else's. */
export const PORTAL_ROOTS_CAP = 50

// ── bounds on the work a single request or tick may do ───────────────────────
// R14 caps the ROWS a read returns. These cap the WORK a path does: how many
// pages it will pull, how many round-trips it will fan out, how deep it will
// recurse. Same reasoning, other axis — an unbounded loop stalls a worker just as
// surely as an unbounded SELECT, and it does it without a single big query to
// blame.

/** Pages the D1 REST database listing will walk (100 per page → 10,000 databases).
 * The paging loop is `for (;;)` — a door that kept answering "full page" would
 * otherwise spin forever and never return. A ceiling turns "impossible" into
 * "incomplete", which the caller can at least survive. */
export const D1_LIST_PAGE_CAP = 100

/** Team databases the nightly watch will claim as OURS in one tick.
 *
 * THIS CAP FAILS THE OPPOSITE WAY FROM EVERY OTHER ONE IN THIS FILE, which is
 * why it is its own number rather than `LIST_HARD_CAP`. The others bound WORK:
 * hitting them means a screen shows fewer rows and the next tick continues.
 * Hitting this one means a database that IS ours is not recognised as ours, so
 * the growth watch quietly stops watching it — the failure the watch exists to
 * prevent, caused by the watch.
 *
 * So it is sized to the ceiling of the thing it filters (`D1_LIST_PAGE_CAP` ×
 * 100 databases) rather than to a comfortable screenful: a team whose database
 * cannot appear in the listing at all does not need claiming. Reaching it is
 * logged loudly for the same reason. */
export const OWNED_DB_CAP = 10_000

/** Teams one knowledge-sweep tick will visit. The sweep runs every 15 minutes
 * and does a BOUNDED slice per team (INGEST_SOURCES_PER_TICK), so this is the
 * ceiling on the whole tick's work: past it the remaining teams wait for the
 * next one, which starts from each kind's own cursor and loses nothing. A cron
 * that would run for an hour is a cron that gets killed halfway. */
export const CRON_TEAM_CAP = 200

/** Alarm rows one nightly size-check tick will write. The scan itself is cheap
 * (a size field per database), but every ALARMING database costs a core-DB read
 * plus an insert — so the tick's write work is bounded and the rest waits for
 * tomorrow's run, which re-finds them (the check is idempotent per database). */
export const CRON_ALERT_CAP = 50

/** Databases one nightly tick records a GROWTH reading for (`db_growth`).
 *
 * Bounded for the same reason CRON_ALERT_CAP is: the scan is one listing, but each
 * reading is a write, and an estate near the platform's 50,000-database limit would
 * turn a growth watch into the thing that grows. The tick takes the LARGEST this
 * many, because a trend only matters where there is a ceiling to reach — a 4 MB
 * database filling twice as fast as another 4 MB database is not news.
 *
 * Sized above CRON_TEAM_CAP so the watch is never narrower than the estate the
 * crons work through, and well under the alarm ceiling's cost per row (an upsert,
 * no read). */
export const CRON_GROWTH_CAP = 200

/** TEAM DATABASES ONE MIGRATION RUN WILL TOUCH.
 *
 * The migration robot walks every ready team, reads that team's own
 * `_migrations` table and applies whatever is missing — so its work is
 * databases × unapplied migrations, and it had NO ceiling at all: the one bulk
 * path in the product with neither a chunk size nor a bound of any kind. On a
 * large estate that is a worker killed halfway with some databases migrated,
 * some not, and a response nobody ever received to say which.
 *
 * Deliberately smaller than `CRON_TEAM_CAP`, because a migration is not a
 * bounded slice of one team's rows — it is a schema change, several statements
 * per database, and the slowest thing this product ever does per tenant.
 *
 * RESUMING COSTS NOTHING AND NEEDS NO CHECKPOINT, which is why this is a plain
 * cap rather than a cursor: a team already at the latest version is SKIPPED by
 * its own `_migrations` table, so the next run starts where this one stopped by
 * construction. The response says `remaining` so the operator knows to run it
 * again — and running it again when nothing is left is one read per team and no
 * writes. */
export const MIGRATE_TEAMS_PER_RUN = 25

/** Error SIGNATURES one nightly ops digest will name.
 *
 * The digest reads yesterday's rows grouped by signature, so this bounds the
 * lines in an email rather than the work: a night with three hundred distinct
 * new failures is a night where the first twenty tell you everything and the
 * mail nobody can read is the one nobody reads. The count of signatures that
 * did not fit is stated in the message, because a truncated list presented as a
 * complete one is exactly the fault R14 exists to prevent. */
export const OPS_SIGNATURE_CAP = 20

/** Teams one nightly ops digest will name as running out of AI allowance. Same
 * shape and the same reason as OPS_SIGNATURE_CAP, and sized smaller because a
 * list of teams is a list of people somebody has to contact. */
export const OPS_QUOTA_TEAM_CAP = 10

/** Rows the digest's "has this signature been seen before?" read may scan.
 *
 * The question is answered against a WINDOW rather than the whole table on
 * purpose: `error_logs` is the one table built to grow, its retention is 90 days
 * (ERROR_LOG_RETENTION_DAYS), and a comparison against 90 days of history would
 * make the nightly digest the most expensive read in the estate for no extra
 * truth — a signature nobody has seen for a month IS news. Thirty days, capped,
 * and the cap is above what a healthy estate produces so hitting it is itself a
 * signal. */
export const OPS_HISTORY_CAP = 5_000

/** Pending invitations one sign-in sweep will accept in a single pass. Each one is
 * three core-DB writes plus two live pings, and the list is keyed on an EMAIL
 * ADDRESS — anyone may invite any address, so the row count is attacker-influenced.
 * The rest stay pending and are accepted from the invites inbox. */
export const INVITE_SWEEP_CAP = 25

/** ROWS ONE INTERACTIVE CATCH-UP FILES PER KIND, PER PASS.
 *
 * The background tick uses `INGEST_SOURCES_PER_TICK` (25) and should: it runs
 * every fifteen minutes and its job is to stay level, not to catch up.
 *
 * A person PRESSING "bring it in" is a different act. Every pass re-lists the
 * whole of each service before it files anything — a Drive walk of up to a
 * hundred and twenty calls, a mailbox of ten pages — so the listing dominates
 * and 25 rows per pass means paying that cost forty times to file a thousand
 * sources. Four times the slice is a quarter of the listings for the same work,
 * and the writing itself is the cheap half.
 *
 * Still bounded, and bounded by the same reasoning as the tick: it has to fit
 * inside one request with room for the embedding calls each row costs. */
export const INGEST_SOURCES_PER_PRESS = 40

/* ---- How much of the knowledge base ONE PICTURE may draw -------------------- */

/** SOURCE NODES the whole-corpus shape may DRAW (R14).
 *
 * THE ONE READ IN THIS APP THAT LEGITIMATELY WANTS THE WHOLE SET, and it still
 * does not get it. `knowledge` is a `GROWING_COLLECTIONS` row — the sweep only
 * ever adds — so the list beside this picture PAGES, and a cap there would be a
 * slower refusal. A PICTURE CANNOT PAGE. A cursor into a drawing hands somebody
 * the second half of a shape whose first half has scrolled away, which is not an
 * answer to any question a map is asked; `record-map.ts` made that argument first
 * and this is the same one at corpus scale.
 *
 * SO THE CAP FALLS ON THE DOTS AND NEVER ON THE ARITHMETIC. Each cluster is
 * sized and labelled by an EXACT count over the whole corpus (R16, through the
 * one `countCollection` seam), and the nodes drawn inside it are a sample capped
 * here. That is the split that makes a bounded picture honest rather than
 * merely small: the question this screen exists to answer — which clients are
 * dense with knowledge and which are thin — is answered by the counts, which are
 * never capped, while the texture is answered by the dots, which are. A picture
 * that says "450" and draws two hundred of them is right; one that draws all it
 * has and lets the reader infer the size is wrong the moment it is capped at all.
 *
 * 1,500 because this is drawn as SVG, one focusable, clickable element per node
 * — which is what makes a node openable with a keyboard and readable by a screen
 * reader, where a canvas is a picture of a graph with nothing in it. Measured on
 * staging (2026-09-08): the agency's own base is 3,967 live sources, so the
 * picture samples and says so.
 *
 * PAST IT, THE READER NARROWS RATHER THAN PAGES: the same door takes the
 * collection's own `compartment` filter, and one client's material is far under
 * this ceiling — 450 at the largest on staging. That is the paging story, and it
 * is the toolbar the reader already has. */
export const KNOWLEDGE_SHAPE_SOURCES = 1500

/** ANCHOR NODES — accounts, apps and sprints — one picture may draw (R14).
 *
 * SEPARATE FROM THE CAP ABOVE, and it has to be. The anchors are DERIVED from
 * the sources drawn, so bounding only the sources bounds the anchors at the same
 * number, and 1,500 sources each hanging off a different account is 3,000 nodes
 * from a constant that says 1,500. Two constants, so the node total is the sum
 * of two things this file names rather than a product of one of them and the
 * shape of somebody's data.
 *
 * 200 is generous against what an agency has: 134 live accounts, 28 apps and 112
 * sprints on staging. The clusters are ordered by size before it bites, so the
 * ceiling falls on the tail — the thin accounts, which are the ones a reader
 * least needs to pick out of a picture and which the count beside it still
 * reports. */
export const KNOWLEDGE_SHAPE_ANCHORS = 200

/* ---- How much of a mailbox the knowledge base may read --------------------- */

/** PAGES OF MAIL ONE SWEEP LISTS, fifty to a page.
 *
 * Mail used to be fenced to KNOWN CONTACTS — a query built from up to forty
 * addresses already in the team's contact list — which meant an inbox of tens of
 * thousands contributed thirty sources, and every internal thread, every supplier
 * and every conversation with somebody not yet filed as a contact was invisible.
 * The owner's ruling on 20 Aug 2026 was to open it: "I'd read all my emails…
 * full access to all information."
 *
 * IT IS STILL HIS ALONE. Mail is filed on the `private` shelf, which the
 * knowledge base enforces on every read — so opening the net widens what can
 * answer HIS questions and nothing else. That is the property that made this a
 * decision he could take on his own behalf rather than for his team.
 *
 * Ten pages because the cost is a metadata call PER MESSAGE, not per page:
 * five hundred messages is five hundred round trips, batched fifty at a time.
 * Past that a sweep stops being a sweep and becomes a migration. */
export const GMAIL_SWEEP_PAGES = 4

/* ---- How far into somebody's Drive a share actually reaches ---------------- */

/** HOW MANY LISTING CALLS ONE DRIVE WALK MAY SPEND.
 *
 * Until 20 Aug 2026 a named folder meant its DIRECT CHILDREN and one page of
 * fifty, and that is the whole reason the owner's transcripts were not in the
 * knowledge base. Google Meet files a recording as a FOLDER PER MEETING — so his
 * shared `Google Meet` folder contained nothing but subfolders, every one of them
 * excluded by the query, and the folder that looked shared contributed zero
 * documents. Measured: 15 shared folders yielded 54 files.
 *
 * So the walk descends. The budget is in CALLS rather than files because a call
 * is what costs time and quota: a folder of ten files and a folder of five
 * hundred are both one call per page, and the thing that runs away is the number
 * of FOLDERS, which nobody controls. Breadth-first and newest-first, so when the
 * budget does run out it has spent it on the material somebody is most likely to
 * ask about. */
export const DRIVE_WALK_CALL_BUDGET = 120

/** HOW DEEP. A share is a statement about a folder and everything filed under it,
 * which is how a person means it — but a cycle-free tree can still be pathological,
 * and six levels is deeper than any filing anybody defends. */
export const DRIVE_WALK_MAX_DEPTH = 6

/** PAGES PER FOLDER, so a big folder is read rather than sampled. Five pages of
 * fifty is 250 files from one folder; past that the walk moves on rather than
 * spending the whole budget in one place. */
export const DRIVE_PAGES_PER_FOLDER = 5

/** THE CEILING ON ONE LISTING, whatever the shape of the tree. R14's hard cap for
 * this read: a number the worker can hold and the sweep can page through. */
export const DRIVE_WALK_MAX_FILES = 3000

/* ---- Google brings itself in, on a schedule (owner, 19 Aug 2026) ----------- */

/** HOW MANY CONNECTED PEOPLE one team's tick acts as. Every Google read in this
 * app uses ONE PERSON'S OWN connection, so an automatic sweep has to be a loop
 * over people rather than a single team-wide call — there is no team-wide Google
 * credential and deliberately never was. Small, because the loop is per team and
 * the tick is every fifteen minutes: five people is twenty a hour each, which is
 * far more often than anybody's calendar changes. */
export const GOOGLE_SWEEP_PEOPLE_PER_TICK = 5

/** HOW MANY MEETINGS one person's tick tries a transcript for. A try that finds
 * nothing writes nothing and costs one Google round trip, so this is the number
 * that keeps a quiet tick cheap. */
export const TRANSCRIPT_SWEEP_PER_PERSON = 3

/** THE HORIZON — how far back the sweep keeps looking for a transcript.
 *
 * This is the number that stops it hunting forever. A meeting whose transcript
 * never appears (nobody recorded it; Gemini was off; it was a phone call) would
 * otherwise be retried every fifteen minutes for the life of the product, and
 * the cost of that is not the compute, it is that the queue never drains and the
 * newest meetings sit behind a permanent backlog of ones that will never resolve.
 * Fourteen days is well past when Google posts a recording — it is usually
 * minutes and occasionally hours — and past it the manual button on the meeting
 * is still there for the one somebody actually wants. */
export const TRANSCRIPT_HORIZON_DAYS = 14

/** THROWN tries per meeting before the sweep stops selecting it. A quiet
 * "nothing there yet" does not count and retries free until the horizon; this
 * cap is only for a meeting Google actively refuses every tick — eight thrown
 * tries is two hours of refusals, which is a stuck meeting, not a slow one.
 * The manual capture button ignores the counter, so a person can always try. */
export const TRANSCRIPT_ATTEMPT_CAP = 8

/** HOW LONG A TRANSCRIPT MAY STILL BE GROWING after its meeting began.
 *
 * Google writes a Gemini notes document DURING the call, so a document read at
 * 11:30 for a call that runs to 12:00 is a real, readable, complete-looking
 * document holding half a conversation. `transcript_captured_at` used to mean
 * "do not look again", so whatever was written by the moment of the first read
 * was all the base ever held — measured on 2026-09-07, a one-hour meeting whose
 * stored transcript ends "Transcription ended after 00:02:30".
 *
 * Six hours from the meeting's own START, not from the capture: it is the call
 * that decides when its document stops changing, and a window hung off the
 * capture would slide forward every time the sweep looked. Six is well past the
 * longest meeting this app has seen (one hour) plus the minutes Google takes to
 * finish writing, and it is short enough that a re-read is only ever competing
 * with the day's own meetings for the sweep's three slots — a meeting from last
 * week is never selected twice.
 *
 * The cost inside the window is one Drive read per look, and it is bounded twice
 * over: TRANSCRIPT_SWEEP_PER_PERSON caps the looks per tick, and a look that
 * finds no new words counts against TRANSCRIPT_ATTEMPT_CAP, so a document that
 * has settled is left alone after eight quiet tries — two hours at the
 * fifteen-minute tick, the same arithmetic the cap was chosen for. */
export const TRANSCRIPT_SETTLE_HOURS = 6

/** @mentions one help reply may carry. Each mention becomes a row in an `IN (...)`
 * lookup AND an email, so an uncapped list is both an unbounded statement and an
 * unbounded send from a trusted sender. */
export const MENTIONS_LIMIT = 50

/** EVERY MODULE THE TEAM HAS — the sections of every app, read as ONE list.
 *
 * A CAP RATHER THAN A CURSOR. This collection is apps × their sections: 246
 * across 24 apps in the legacy data, median 11 each and 20 at the widest. It
 * does not GROW with use the way tickets or processes do — it is the shape of
 * the software we have built, and it only moves when we build more. (R14: a
 * bounded read says its cap; `app_modules` is deliberately NOT a
 * GROWING_COLLECTIONS row.)
 *
 * READ WHOLE AND FILTERED ON SCREEN, which is why the cap is the team's and not
 * one app's. A ticket form needs the modules of whichever app was just chosen,
 * and re-fetching on every change of a dropdown is a spinner where there should
 * be a list — so the picker holds all of them and narrows locally. That also
 * gives the collection ONE cache key, which is what lets a rename reach every
 * screen showing it through the ordinary row-level live path (R15).
 *
 * 1,000 is four times the agency's whole history at ~90 apps' worth. */
export const APP_MODULE_CAP = 1000

/** Rows the ticket sub-tab tally may return (R14). It is a GROUP BY over
 * (`help_type`, `status`) — two collections that cannot run away, since one is a
 * team's own dropdown vocabulary and the other is the seven-value fixed
 * lifecycle — so the ceiling is generous and exists to make the bound VISIBLE at
 * the query rather than implied by the shape of the data. */
export const TICKET_FACET_CAP = 500

/** Rows ONE grouped read on the Tickets dashboard may return (R14).
 *
 * SMALLER THAN `TICKET_FACET_CAP` ON PURPOSE, and the difference is what the
 * numbers are FOR. A facet tally feeds a badge, and a badge nobody can read is
 * still a correct badge. These five reads feed CHARTS, and every one of them is
 * a chart a person looks at: a bar per client, a bar per system, a cell per
 * (arrived-as, is-now) pair. Past a hundred marks a chart has stopped being a
 * chart, so this is the point at which "bounded" and "legible" are the same
 * ceiling rather than two different ones.
 *
 * FOUR OF THE FIVE GROUP OVER SETS THAT CANNOT RUN AWAY — the team's own ticket
 * vocabulary, the seven-value status lifecycle, and those two crossed with each
 * other. The fifth groups by CLIENT, which grows with the business, so its read
 * is ORDERED (most work first) before it is capped: the first row is the answer
 * to "who has the most", which is the question, and a hundred clients of tail is
 * a chart nobody was going to read to the end of anyway. */
export const TICKET_DASHBOARD_GROUP_CAP = 100

/** Files AND links one ticket may carry (CHECKLIST 5.10). "Several" is the ask,
 * from both front doors; a ceiling turns "several" into something a list can be
 * read to the end of and a count can be trusted. */
export const TICKET_ATTACHMENT_CAP = 50

/** Recorded stage moves ONE ticket's history read may return (R14, team
 * migration 0066).
 *
 * A ticket's ladder has seven rungs and every move up it is a person pressing
 * something or a story closing, so a real ticket carries single figures and a
 * badly behaved one carries dozens. Two hundred is therefore a REFUSAL CEILING
 * rather than a page size: nothing legitimate approaches it, and the read is a
 * summary of one record rather than a collection a screen pages through — which
 * is why this is a cap and not `GROWING_COLLECTIONS` paging. The rows come back
 * OLDEST FIRST because the sequence is the answer ("closed on x, reopen on y,
 * closed again on z") and a sequence read from the wrong end is not one. */
export const TICKET_STAGE_EVENT_CAP = 200

/** Ratings ONE ticket's read may return (R14, team migration 0067).
 *
 * A rating is one sentence from one person about one finished request, and the
 * people who can give one are the contacts on a single account. A ticket at this
 * many is not a ticket anybody is still learning from, so — like the stage cap
 * above — this exists to make the bound visible at the query rather than to page
 * anything. Newest first: the standing answer is the newest row per person, and
 * everything older is the record of how we did at the time. */
export const TICKET_RATING_CAP = 50

/** WHAT A STORY MAY SHOW FOR ITSELF. Smaller than a ticket's fifty on purpose:
 * a ticket accumulates evidence over a conversation that can run for weeks, and
 * a story's attachments are what one person put up to say "come and look". Past
 * this the door refuses in words rather than truncating a list. */
export const STORY_ATTACHMENT_CAP = 20

/** Rows the work-log summary's two grouped reads may return (R14) — time BY
 * PERSON and time BY KIND OF WORK, on one record. Both group over sets that
 * cannot run away: the people are the team's members and the kinds are the
 * team's own dropdown vocabulary. So the ceiling is generous and exists to make
 * the bound VISIBLE at the query rather than implied by the shape of the data —
 * the same argument TICKET_FACET_CAP makes, at the size those two sets actually
 * are. A chart with fifty bars on it is already unreadable; this is the point
 * past which it also stops being bounded. */
export const WORK_LOG_GROUP_CAP = 50

/** Processes one story may link to (CHECKLIST 6.5). "One or more" is the ask; a
 * ceiling is what makes the `IN (...)` proof a bounded statement rather than one
 * with as many placeholders as somebody types. */
export const STORY_PROCESS_CAP = 20

/** Bytes one file attached to a ticket may carry, before base64. The same 10 MB a
 * to-do's evidence gets (routes/todos.ts) — the ask is the same ask, "a photo of
 * the thing I mean", and two different ceilings for the same act is two different
 * refusals a person has to learn. */
export const TICKET_FILE_MAX_BYTES = 10 * 1024 * 1024

/** Bytes one agent chat request may declare. The per-file caps (8 files × ~5 MB)
 * are real, and they were all enforced AFTER `request.json()` had already parsed
 * the whole body — so the caps described what could be imported while the parse
 * described what could be sent, and the parse was 40 MB into a 128 MB isolate.
 * A ceiling is only a ceiling if it is checked BEFORE the expensive step. Sized
 * to fit the caps it guards plus the envelope around them. */
export const AGENT_CHAT_MAX_BYTES = 42 * 1024 * 1024

/** Bytes one attached CSV may carry into a chat import. Named here beside the
 * request ceiling rather than inline at the door, because the two numbers are a
 * pair: the outer one is only correct while it is bigger than 8 × this. */
export const AGENT_FILE_MAX_BYTES = 5_000_000

/** Files one agent chat message may attach. */
export const AGENT_MAX_FILES = 8

// ── translating what a PERSON typed, on demand ───────────────────────────────
// FOUR NUMBERS, AND THEY ARE A SET WITH A PURPOSE: one press of "Translate" is
// ONE unit of the team's AI allowance, so these are what stop a screen with a
// long thread on it turning that promise into a request no model can answer. A
// screen with more text than this translates what fits and leaves the rest in
// the language it was written in, which is the same degradation the whole
// language engine is built on: untranslated is a sentence, a failed request is
// not.
//
// ONE PRESS IS ONE UNIT, AND NO LONGER ONE CALL. It used to be both, and the
// second half was never true of a long source: a 3.3 KB meeting write-up needs
// more than a thousand tokens of answer, and a single call carrying a whole
// screen's worth would have to write tens of thousands. So a press is CUT INTO
// BATCHES here, each one small enough for the model to finish, and the spend
// stays one — which is the half of the promise a person actually feels.

/** Pieces of human-typed text one press of "Translate" may carry. */
export const TRANSLATE_MAX_TEXTS = 40

/** Characters of ONE of those pieces. Longer is truncated rather than refused —
 * a paragraph and a half of somebody's ticket in their own language is more use
 * than a refusal, and the original is always one press away. */
export const TRANSLATE_MAX_CHARS = 4_000

/** Characters ONE model call carries. Equal to the per-piece cap on purpose, so
 * the largest piece the door accepts is always a batch it can also answer —
 * pieces are packed whole and never split, because half a paragraph translated
 * out of context is worse than the paragraph left alone. */
export const TRANSLATE_BATCH_CHARS = 4_000

/** Batches ONE press may make. The ceiling on what a press costs and how long a
 * person waits: six calls of four thousand characters is 24,000 characters of
 * somebody else's writing, more than any real screen holds, and the pieces past
 * it come back as what was typed — and the answer SAYS it was partial, so the
 * screen can tell them rather than quietly showing German. */
export const TRANSLATE_MAX_BATCHES = 6

/** Answer tokens to allow per character of a batch. MEASURED, not guessed: on
 * 2026-08-18 the model spent 0.30 tokens per input character translating German
 * into English, and 0.34 into Thai — the worst of the twenty-nine languages the
 * app speaks, because its script tokenises badly. Doubled, because a ceiling
 * costs nothing unless the model actually reaches it and an answer cut off at
 * the ceiling is the whole fault this exists to prevent. */
export const TRANSLATE_TOKENS_PER_CHAR = 0.7

// ── a file dropped into the knowledge base ───────────────────────────────────
// TWO NUMBERS, AND THEY ARE A PAIR — the same shape as the agent-chat ceiling
// above, and for the same reason it was written: a per-file cap enforced AFTER
// `request.json()` describes what may be stored while the parse describes what
// may be SENT, and the parse is the expensive step. So the door checks the
// envelope against `Content-Length` before it reads a byte, and the file cap
// afterwards, once there is a file to measure.

/** Bytes one uploaded file may carry into the knowledge base.
 *
 * 25 MB is the number the product already teaches: it is the cap on every other
 * upload door, so the sentence a person meets when they pick something enormous
 * is the one they have already met once. It is a ceiling on the FILE, not on the
 * material — a 25 MB scanned PDF may convert to a few hundred kilobytes of text,
 * and a 3 MB spreadsheet may convert to more than the row can hold. The text has
 * its own, separate ceiling (`DOCUMENT_LIMIT_BYTES` in validate.ts), because the
 * two are ceilings on different things: this one is what we will accept and
 * store, that one is what one database row can hold. */
export const KNOWLEDGE_FILE_MAX_BYTES = 25 * 1024 * 1024

/** Bytes one upload REQUEST may declare. A base64 data URL is ~4/3 of the file
 * it carries, so the envelope is the file cap times four thirds plus room for
 * the title, the filing and the JSON around them. Checked against
 * `Content-Length` BEFORE the body is parsed — a cap is only a cap if it is
 * checked before the expensive step. */
export const KNOWLEDGE_UPLOAD_MAX_BYTES = Math.ceil(KNOWLEDGE_FILE_MAX_BYTES * (4 / 3)) + 64 * 1024

// ── the STREAMED upload, and why its ceiling is a different number ────────────
// The caps above bound a file that is BUFFERED: a base64 data URL inside a JSON
// body, which `request.json()` materialises whole before a single validation
// runs. At 25 MB that is ~33 MB of base64, plus the decoded copy, plus the JSON
// string around them — well over 100 MB of a 128 MB isolate, on the request path.
// So 25 MB was never a judgement about files; it was the largest number that fits
// in memory three times. Every upload door in the base wore it for that reason and
// explained it to people as if it described documents.
//
// The streamed door does not buffer. The body goes to R2 as it arrives
// (`put(key, request.body)`), so the isolate holds a window rather than a file
// and the memory ceiling stops being the binding constraint.
//
// WHAT BINDS IT INSTEAD IS THE PLATFORM, and it is worth naming precisely rather
// than discovering: Cloudflare caps the REQUEST BODY a Worker may receive — 100 MB
// on this plan. No amount of streaming gets past that, because the limit is on the
// request, not on our handling of it. The only door past it is a client PUT
// straight to R2 on a presigned URL, which needs an R2 S3 access key and bucket
// CORS (see the report of 17 Aug 2026); that is a different decision with a
// credential in it, and it is not taken here.
//
// So this sits deliberately UNDER the platform wall, with headroom for headers
// and the query string: refused by us, with a sentence a person can act on,
// rather than cut off mid-body by the edge with nothing useful to say.
// ONE NUMBER FOR EVERY STREAMING DOOR — the knowledge base, staff files and
// brand assets. They differ in which bucket they write and in whether the bytes
// are ever served back under their declared type; they do not differ in what the
// platform will carry, and that is the only thing this number is about. A
// constant each would be a chance to raise one and forget the rest.
//
// Decimal megabytes, not binary, because `mb()` renders the refusal by dividing
// by 1,000,000 — so this way the number in the code and the number the person is
// told are the same number. (90 MiB would be refused with the words "94 MB".)
export const STREAM_UPLOAD_MAX_BYTES = 90 * 1_000_000

/** How large a streamed file we will still READ (convert to text for the
 * assistant). Extraction needs the bytes in memory — that is what conversion IS —
 * so it keeps the ceiling the buffered door always had, and it is read back from
 * R2 once, rather than held alongside a base64 copy and a JSON string.
 *
 * Past it the file is STORED AND LISTED and says it was not read, which is the
 * behaviour the knowledge base already has for a file it cannot convert
 * (`unreadableNote`). Storing a 60 MB archive nobody can search is a better
 * answer than refusing it: the alternative is that the material does not exist in
 * the product at all. */
export const KNOWLEDGE_EXTRACT_MAX_BYTES = KNOWLEDGE_FILE_MAX_BYTES

/** How far up the account tree the loop guard will walk. The tree is self-nesting,
 * so the ancestor walk is the only unbounded recursion in the base. Past this depth
 * the guard cannot PROVE a move is ring-free, so it refuses — fails closed, never
 * open. Far deeper than any real org chart. */
export const MAX_ACCOUNT_DEPTH = 64

/** HOW LONG A PROPOSED DANGEROUS ACT STAYS APPROVABLE.
 *
 * The confirm panel exists because some acts are grave enough to stop and ask
 * about — remove a member, revoke an invite, deactivate a record, set a rate.
 * The proposal is stored on the assistant's message and the confirm path runs
 * exactly what was proposed, never what the client sends, which is the half that
 * was already right.
 *
 * What had no bound was TIME. `getPendingProposal` read the most recent
 * assistant message carrying a proposal, `ORDER BY created_at DESC LIMIT 1`,
 * with no floor under it — so "remove Jane Doe", proposed on a Tuesday and never
 * answered, was still one click from running three weeks later. The person
 * clicking would be answering a question they could not see, in a conversation
 * they had forgotten, about a team that had moved on. Nothing was broken; it
 * simply never expired.
 *
 * Thirty minutes: far longer than the 150-second turn deadline, so an ordinary
 * "hang on, let me check" is never punished, and far shorter than a working day,
 * so a proposal cannot outlive the context that produced it. Past it the panel
 * finds nothing to run and says so, which is the same answer it already gives
 * for a proposal somebody else already spent. */
export const AGENT_PROPOSAL_TTL_MS = 30 * 60 * 1000

/** HOW MANY TIMES A SOURCE IS RE-EMBEDDED BEFORE THE SWEEP GIVES UP ON IT.
 *
 * `embed` is best-effort on purpose: an embedding failure must not lose the
 * material, so a failed batch stores NULL vectors, `indexSource` blanks the
 * content hash, and the next sweep picks the source up again. That self-healing
 * is right and it had no floor — a source that fails REPEATABLY was re-read and
 * re-sent to the model every fifteen minutes for ever, writing the same error
 * row each time, until somebody happened to look.
 *
 * Five, and it is per TEXT rather than per source: the counter resets the moment
 * a source's title or body changes (the upsert in knowledge-ingest.ts does it),
 * so a document somebody fixes is tried again immediately and a document nobody
 * touches stops costing a model call every quarter of an hour. Five ticks is
 * seventy-five minutes of a transient Workers AI wobble, which is far longer
 * than any outage this has actually seen.
 *
 * The same shape and the same reasoning as TRANSCRIPT_ATTEMPT_CAP next door. */
export const EMBED_ATTEMPT_CAP = 5

/** Open error rows one "resolve this whole failure" call will look at.
 *
 * The scan cannot be a WHERE clause — the volatile reference inside a message is
 * normalised by a JavaScript regex and SQLite has no REGEXP — so the rows come
 * back and are folded in the worker. 500 is comfortably more than any real
 * signature's open tail (the live store held 5,086 rows across 109 distinct
 * messages on 2026-09-05, and its single largest signature was 1,728 over three
 * weeks, of which the OPEN ones are a fraction), and it is small enough that the
 * read stays one indexed page.
 *
 * Past it the door says `capped: true` and the caller runs it again, rather than
 * reporting a number that reads as "finished". */
export const RESOLVE_SCAN_CAP = 500

// ── the agent's reply ceiling, and the bulk cap DERIVED from it ───────────────
// A cap the model is TOLD but cannot physically EMIT is a promise the runtime
// breaks silently, mid-JSON: the tool call truncates, the turn dies, nothing
// changed. So the two numbers come from ONE place and the relationship below is
// asserted by workers/data-ops/test/reply-ceiling.test.ts.

/** The agent's output budget per model turn (both providers). Raised from 4,096
 * after a downstream run proved a full bulk call doesn't fit under it. */
export const AGENT_MAX_TOKENS = 8192

/** What one id costs the model to emit inside a JSON array: a 26-char ULID plus
 * its quotes, comma and space. ~12 in practice; budgeted generously because the
 * failure it prevents is silent. */
export const TOKENS_PER_EMITTED_ID = 15

/** Everything else in that same reply: the tool-call envelope, the argument
 * names, and the sentence the assistant says alongside the call. */
export const AGENT_REPLY_ENVELOPE_TOKENS = 512

/** Max ids in one bulk write — DERIVED, not hand-picked: it is what the model can
 * actually write at AGENT_MAX_TOKENS. The bulk doors and the agent's tool schemas
 * both declare THIS constant, so the number the model is told, the number the door
 * enforces, and the number that physically fits are one number. */
export const BULK_IDS_LIMIT = Math.floor((AGENT_MAX_TOKENS - AGENT_REPLY_ENVELOPE_TOKENS) / TOKENS_PER_EMITTED_ID)

// ── what one caller may add to the SHARED core database ──────────────────────
// The per-team databases are a tenant's own problem: fill one and you have filled
// YOURS. The core database is everybody's. So every write a signed-in person can
// repeat at will against it carries a ceiling, and — CONCURRENCY.md — the ceiling
// rides the INSERT rather than being read first.

// ── what one CALLER may ask for, per worker, per minute ──────────────────────
// The caps above bound one request's work. This one bounds how many requests one
// person gets, which is the axis nothing covered: every read door in the app was
// unthrottled, and a read of the activity feed or the accounts list is real work
// on a database the whole team shares.

/** Requests one CALLER may make to ONE worker in a minute (shared/workers/rate-limit.ts).
 *
 * CHOSEN FROM THIS APP'S REAL SHAPE, not from a round number. The estate is 20
 * client companies, 104 contacts and 6 staff, and realistic peak concurrency is
 * about 40 sockets (ARCHITECTURE.md §7). The heaviest honest moment a single person
 * produces is a cold open of the app — priming the caches behind a screen is on the
 * order of twenty requests — and then navigation, which is a handful per screen.
 * Somebody working hard, clicking constantly, with a page refreshing behind them,
 * is tens per minute. Not hundreds.
 *
 * So 600 is roughly ten times the busiest real person and about ten requests a
 * second sustained: generous enough that no human and no ordinary screen can reach
 * it — including a screen that is retrying because something is wrong, which is the
 * case that must NOT be throttled, because that person is already having a bad time
 * — and low enough that a loop hits a wall in the first second rather than after it
 * has read a database ten thousand times.
 *
 * PER WORKER, because the binding is per worker: a person's budget on content and
 * their budget on tenancy are separate, which is the honest shape — they are
 * separate databases' worth of work, and a busy Tickets screen should not spend the
 * allowance the Accounts screen needs.
 *
 * The period is 60 seconds because Cloudflare's rate-limiting binding allows 10 or
 * 60 and nothing else; the number here and the `period` in each wrangler.jsonc are
 * the same decision written in two places, which is why every one of them says
 * this constant's name in a comment beside it. */
export const CALLER_REQUESTS_PER_MINUTE = 600

/** Account-activity rows one PERSON may write in an hour. Every identity edit
 * (name, photo, email) appends a row to the shared core database AND pings that
 * person's live channel, so a session alternating its own first name grows the one
 * database every team depends on, for free, from an ordinary signed-in door.
 * Generous for a real person tidying their profile; a wall for a loop. */
export const ACCOUNT_ACTIVITY_PER_HOUR = 60

/** Rows one retention sweep will delete PER TABLE per nightly tick. A DELETE is
 * as unbounded as a SELECT: an estate that has never been swept would otherwise
 * try to remove millions of rows in one statement and time out, night after
 * night, deleting nothing at all. Bounded work catches up over a few nights and
 * always finishes. */
export const RETENTION_DELETE_CAP = 5_000

/** How many BOUNDED deletes one table gets per nightly tick.
 *
 * The cap above bounds one STATEMENT, which is the right unit — a statement is
 * what times out. It is not the right unit for the NIGHT, and the difference is
 * the whole finding: at 5,000 rows a night one table can absorb 5,000 sign-ins a
 * day, and the yardstick this base is built for is a quarter of a million people
 * in ONE tenant, plus every other tenant on the same shared core database. A
 * sweep that removes 5,000 while the day adds 300,000 is not retention, it is
 * arithmetic pointing one way.
 *
 * So the tick runs the same bounded statement up to this many times, stopping
 * early the moment one comes back short (nothing left to take). 40 × 5,000 =
 * 200,000 rows per table per night, per statement none of which is any bigger
 * than the one that already worked — and the loop is what makes "catching up
 * takes a few nights and always finishes" true instead of aspirational. Sized to
 * stay far inside a cron's 15 minutes: forty statements against an indexed
 * predicate is seconds, not minutes. */
export const RETENTION_PASSES_PER_TICK = 40

/** How long the central error log keeps a row.
 *
 * db/core/0012 has described `error_logs` as a "90-day-ish owned history" since
 * the day it was created, and nothing ever deleted a row — so the ninety days
 * was a sentence in a comment rather than a property of the table, and the store
 * that exists to tell you what broke was itself unbounded on the one database
 * every tenant shares. 0019 added a per-caller RATE ceiling, which is a different
 * promise: a rate bounds how fast it fills, a sweep bounds how full it gets.
 *
 * NOT the audit tables. `account_activity`, the team activity feed and the usage
 * ledgers stay forever on purpose (retention.ts: "anything anyone might have to
 * answer for later"). This one is diagnostics, its own comment already named the
 * window, and implementing a documented window is not the same decision as
 * choosing a new one. */
export const ERROR_LOG_RETENTION_DAYS = 90

/** How long a spent or expired sign-in artefact is kept before the sweep takes
 * it. Everything that reads these tables looks back ONE hour (the send budget,
 * the per-address code cap), and a code lives ten minutes — so a day is already
 * far past the last moment any rule can still see the row. */
export const AUTH_RETENTION_HOURS = 24

/** Roles one team may hold. A role is cheap on its own and expensive in company:
 * every one adds a row per module to `role_permissions` (the export's biggest
 * read), a row to the roles list, and an entry to the title lookup two hot member
 * screens do on every open. None of those was capped at the CREATE end, so the
 * size of three reads was set by whoever held `member_roles:create` — the
 * ordinary grant an office manager gets. Far above any real org chart, low enough
 * that the reads it feeds stay reads. */
export const MAX_ROLES_PER_TEAM = 200

/** Per-user ceiling on CREATED teams. Every team provisions a REAL database, so
 * an uncapped create door lets one signed-up person exhaust the platform's
 * database quota. Low on purpose — a person runs a handful of teams, not fifty;
 * the owner raises it per environment with MAX_TEAMS_PER_USER. */
export const MAX_TEAMS_PER_USER = 5

// ── the machine surface's keys (MCP.md) ──────────────────────────────────────
// A personal access token acts AS its owner, in one team, forever — so "forever"
// was the problem: a secret pasted into a CI config outlives the contract, the
// laptop and often the job. Two numbers bound it: how long one lives, and how
// many one person can hold at once.

/** How long a new access token lives before it must be re-issued. Long enough
 * that a working integration isn't churned, short enough that an abandoned
 * secret stops being a key. */
export const MCP_TOKEN_TTL_DAYS = 90

/** Live tokens one person may hold. The cap is what makes a token REACHABLE:
 * the settings list is hard-capped like every list (R14), so an uncapped minter
 * could bury a live token past the cap and never be able to revoke it again. */
export const MAX_ACTIVE_MCP_TOKENS_PER_USER = 10

/** THE ONE numeric env-var parse. Two bugs of the same family live in the obvious
 * spellings, in opposite directions:
 *   • `Number(env.X) || DEFAULT` turns a deliberate **0** into the default — set
 *     the AI allowance to zero and you silently grant the full daily quota.
 *   • `Number(env.X)` with no empty test turns **unset** into 0 — a team cap that
 *     refuses every person their very first team.
 * Both are invisible until someone deliberately chooses the boundary value, which
 * is exactly when it matters. So: unset, empty or unparseable → the fallback;
 * every real number, INCLUDING zero and negatives, is honoured as written. */
export function numberVar(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

/** HOW MANY DATABASE TRIPS A BULK JOB MAY HAVE IN FLIGHT AT ONCE.
 *
 * A bulk write used to be a plain `for` loop: one row at a time, each row a few
 * trips, each trip a round to the database. That is fine when the database is
 * next door and ruinous when it is not — and on 25 Aug 2026 it was not. The
 * per-request timing header put one team-database trip at ~150ms, because the
 * database was in APAC while the workers ran in WEUR (a native binding removes
 * the API round trip, not the distance).
 *
 * At that price, `BULK_IDS_LIMIT` rows × a few trips each is several MINUTES of
 * wall clock, and a Worker is killed long before it finishes. The person sees a
 * spinner and then an error, having half-moved their tickets.
 *
 * TWELVE, and the number is a compromise between two real ceilings rather than a
 * round guess. Too low and the job is still serial; too high and a burst of
 * concurrent statements meets D1's own per-invocation limits — which fails in a
 * way that looks like a database fault rather than a batch that was too eager.
 * It is a WAVE SIZE, not a queue: each wave is awaited before the next starts,
 * so a failure is confined to its wave and the count a person is shown stays
 * true.
 */
export const BULK_CONCURRENCY = 12

// ── WHAT A DOOR IS ALLOWED TO SPEND ──────────────────────────────────────────
//
// WHY THIS IS HERE AND NOT IN A DOCUMENT. On 24 Aug 2026 the owner reported that
// "the first-time loading of collections and details screens is a bit troubling",
// and the honest answer at the time was a shrug: every list door measured
// 1,400–2,200ms, and there was no number that made that a FAILURE rather than an
// opinion. `logIfSlow` had one threshold — 750ms, for every door in the product —
// so a read that took 700ms passed the same test as a bulk import that took 700ms,
// which is the same as having no test.
//
// So: four numbers, one per class of operation, in the same file as every other
// ceiling this app keeps. They are the owner's own "snappy" tier, and they are
// deliberately ambitious — a budget exists to SURFACE what is shaped to be slow,
// not to hand out passes. Every one of them is missed today (see SLOWEST_OPERATION
// below); that is the point of writing them down.
//
// A budget nobody checks is a wish, so `shared/workers/timing.ts` reads these and
// each worker's dispatcher hands it the route's own `kind` — the tag already in
// every ROUTES table — so the door is measured against ITS class rather than
// against one number shared by all of them.

/** THE FOUR NUMBERS. Milliseconds of wall clock for one request, end to end.
 *
 * `delete` is the same figure as `write` and that is a decision, not a copy: this
 * app deactivates rather than deletes (CONVENTIONS.md), so a "delete" IS a write
 * — one UPDATE with the current-status predicate on it (R17). Naming it anyway
 * keeps the four classes the rubric asks about visible, and stops somebody
 * concluding the removal path was never considered.
 *
 * `bulk` is a minute because a bulk job is a thing a person STARTS and comes back
 * to, not a thing they wait on. A minute is also comfortably under the Workers
 * wall-clock ceiling, so a job that breaches this budget is a job at risk of not
 * finishing at all — which is the failure the number is really guarding. */
export const LATENCY_BUDGET_MS = {
  read: 100,
  write: 250,
  delete: 250,
  bulk: 60_000,
} as const

/** The route tag → the budget it is held to. Every ROUTES table already tags each
 * route `read` / `mutation` / `housekeeping`, so the class is DERIVED from the
 * table rather than from a second hand-kept list that could disagree with it.
 *
 * `housekeeping` takes the bulk budget: those are the batch, sweep and import
 * doors — the ones that do many rows' work in one request. A housekeeping door
 * that is slow is a job, not a click. */
export function budgetForKind(kind: "read" | "mutation" | "housekeeping" | undefined): number {
  if (kind === "read") return LATENCY_BUDGET_MS.read
  if (kind === "housekeeping") return LATENCY_BUDGET_MS.bulk
  // A mutation, or a door whose table does not tag it (auth's switch, the MCP
  // surface): held to the WRITE budget, which is the stricter of the two it could
  // be. An untagged door is never quietly given the minute.
  return LATENCY_BUDGET_MS.write
}

/** HOW MANY DATABASE TRIPS ONE DOOR MAY MAKE — the hop budget, on the half of
 * the round trip this side owns.
 *
 * A latency budget alone cannot tell "one heavy query" from "fourteen small
 * ones", and in this app it is always the second: measured 5 Sep 2026, a page of
 * fifty tickets spends 330ms of wall clock on 4ms of database. So the COUNT is
 * the cost model (timing.ts's header makes the same argument at length) and it
 * gets its own ceiling.
 *
 * TWELVE. The busiest door in the product today is raising a ticket, at EIGHT
 * trips — four preflight checks, the reference, the rank, the insert and the
 * activity row — measured, not counted by eye. Twelve leaves room for a door
 * with one more fact to check and turns a door that has quietly grown a loop
 * into a line in the log. A door above it is not necessarily wrong; it is
 * necessarily worth reading.
 *
 * IT IS NOT A CEILING ON TIME. Trips that run TOGETHER cost one wave, so the
 * repair for a door over this budget is usually `shared/workers/parallel.ts`
 * rather than fewer statements — the ticket create still makes its eight and
 * now makes them in five waves. */
export const MAX_D1_TRIPS_PER_DOOR = 12

/** HOW MANY TIMES A COLD SCREEN MAY ASK THE SERVER BEFORE THE RECORD IS ON
 * SCREEN — the hop budget on the OTHER half of the round trip, the one the
 * browser owns.
 *
 * `MAX_D1_TRIPS_PER_DOOR` above bounds door → database. Nothing bounded
 * browser → server, and that is the half a person actually feels: a deep link
 * pasted from an email (R30 builds emails around exactly this) opens on a fresh
 * tab with nothing cached, and on 6 Sep 2026 the process-map screen made
 * FOURTEEN distinct requests before anything rendered — two to learn who was
 * asking and where they stood, four warming caches the screen never read, one
 * for the breadcrumb, one for the screen's overrides, and six for a record whose
 * first paint needs exactly one of them. Every one was a real round trip to a
 * worker and back, in front of a person waiting.
 *
 * FIVE, and the number is the budget round_trip_review already scores against
 * ("the busiest screen costs 5 hops or fewer") — the owner's own bar since the
 * 24 Aug 2026 report that first-time loading of a record screen was "a bit
 * troubling". It is a ceiling on requests BEFORE FIRST PAINT, not on requests:
 * a screen may warm every cache it likes once the person can read the record,
 * and `web/test/cold-screen-hops.test.tsx` counts both sides of that line by
 * rendering the shell cold and stamping each request with whether the record
 * was already on screen when it left. The cold path today is three: the one
 * boot call (identity, team, rights), the screen's overrides, and the record
 * by id. */
export const MAX_REQUESTS_BEFORE_FIRST_PAINT = 5

/** WHAT THE FOUR CLASSES ACTUALLY COST, MEASURED — the other half of a budget.
 *
 * Taken 5 Sep 2026 by `scripts/speed-bench.mjs`, which runs the shipped libs in
 * Node against staging's own team database ("Kwapso": 2,051 tickets, 3,769
 * activity rows, 240 work logs, 125 dropdown values). Medians; the transport leg
 * is laptop → Cloudflare's D1 REST door, which is the same door the workers use
 * and the same leg that dominates every figure here.
 *
 * WHY THESE ARE KEPT IN CODE RATHER THAN IN A DOCUMENT. `speed-bench.mjs` prints
 * each fresh reading BESIDE the one recorded here, so a re-run is a comparison
 * rather than a fresh opinion — which is the difference between a trend and a
 * number somebody once took. Move them when they move, and say when.
 *
 * THE SHAPE OF THE FINDING, in one sentence: the query is not the cost. The same
 * run has D1 reporting single-digit milliseconds for statements whose round trip
 * takes three hundred, so every one of these numbers is a COUNT OF TRIPS
 * multiplied by the distance to the database — which is why the repairs that
 * moved them were all "fewer sequential trips" and none of them was an index. */
export const MEASURED_MS = {
  /** One page of 50 tickets, or one page of work logs: ONE trip each. */
  read: 330,
  /** Raising a ticket that names a client, an app, a module and a contact: 8
   * trips in 5 waves. It was 8 trips in 8 waves and ~2,100–2,600ms until the
   * independent preflight checks were put in waves (shared/workers/parallel.ts);
   * measured before and after, interleaved, on the same rows the same minute. */
  write: 1_570,
  /** Moving a ticket's status — this app deactivates rather than deletes, so
   * this IS the delete class: read the row, UPDATE with R17's predicate on it,
   * write the activity row. 3 trips. */
  delete: 920,
  /** A 1,000-row CSV import — THE SLOWEST OPERATION IN THE PRODUCT, and the only
   * one that misses its budget by more than an order of magnitude. It was 30
   * minutes (1,799ms per row, one row at a time) before the row loop went into
   * waves of `BULK_CONCURRENCY`; 3.2 minutes after (190ms per row). Still over
   * the one-minute budget, and what is left is chunking and a resume point
   * rather than parallelism — see workers/data-ops/src/lib/import-batch.ts. */
  bulk: 192_000,
} as const

/** WHEN. A figure with no date is a figure nobody can argue with. */
export const MEASURED_ON = "2026-09-05"

/* ─────────────────────────── every bulk path, declared ─────────────────────── */

/** WHAT MOVES MANY ROWS, HOW MUCH IT TAKES AT A TIME, AND WHERE THE NEXT RUN
 * PICKS UP.
 *
 * speed_review's third criterion asks four questions of every bulk path — does
 * it chunk, with a stated size; can it resume; what happens to the row that
 * fails; and can whoever started it see how far it got. Twice now that has been
 * scored off a keyword probe, and twice the probe was wrong in BOTH directions:
 * it counted `loadBatch`, `createBatch` and `getBatchView` as bulk paths because
 * the word "batch" is in their names, and it missed the knowledge sweep's own
 * row loop because the cursor that resumes it sits thirty lines above the `for`.
 * A census that a regex derives from names is a census about names.
 *
 * So the answer is DATA, one row per path, and `bulk-waves.test.ts` holds it to
 * the source: every file exists, every function is still in it, and every chunk
 * size names a constant that is really declared. A row for a path that has been
 * deleted or renamed turns the build red, which is the only property that stops
 * a list like this becoming a record of what the app used to do.
 *
 * `chunk: "one statement"` is a real answer and not a gap — a set-shaped UPDATE
 * bounded by a refusal is not improved by being cut into pieces, and saying so
 * here is what stops somebody "fixing" it later.
 *
 * `resume` is where the NEXT run reads its position. Several of these store
 * nothing on purpose: a predicate that re-selects what is left ("still open",
 * "still behind", "not yet swept") is a resume point with no state to get out of
 * step, and it is the better answer wherever it is available. */
export const BULK_PATHS = [
  {
    file: "workers/data-ops/src/lib/import-batch.ts",
    fn: "confirmBatch",
    iterates: "the parsed rows of up to 8 CSV files, in the plan's topological order",
    chunk: "BULK_CONCURRENCY",
    resume: "data_import_batches.cursor_json — {targetKey, rowsDone, report}, written after every settled wave",
    onFailure: "skip the row with a reason; the wave is folded after it settles, never inside it",
    progress: "the import screen polls the batch row and shows rowsDone; Continue resumes it",
  },
  {
    file: "workers/content/src/lib/help.ts",
    fn: "bulkSetStatus",
    iterates: "an explicit list of ticket ids, capped at BULK_IDS_LIMIT",
    chunk: "BULK_CONCURRENCY",
    resume: "the ids themselves — R17's `status <> ?` rides the UPDATE, so re-sending the whole list moves only what is left and writes no duplicate history",
    onFailure: "a missing ticket is counted as skipped; any other database error stops the call rather than being swallowed",
    progress: "the response's changed/skipped counts",
  },
  {
    file: "workers/content/src/lib/help.ts",
    fn: "bulkSetStatusByFilter",
    iterates: "every ticket matching the facets — help GROWS with use",
    chunk: "one statement",
    resume: "the predicate — `status <> ?` means a re-run matches only what has not moved",
    onFailure: "all or nothing, in one statement; past BULK_IDS_LIMIT the door refuses before writing",
    progress: "counted first, so the confirm states the true number; one activity row for the set",
  },
  {
    file: "workers/content/src/index.ts",
    fn: "teamSlice",
    iterates: "teams in the core database, every 15 minutes — GROWS with tenants",
    chunk: "CRON_TEAM_CAP",
    resume: "the rotating window — floor(scheduledTime / everyMs) % windows, deterministic and lap-complete",
    onFailure: "per-team catch to an error_logs row naming the team; the lap continues",
    progress: "a slow lap is recorded once per lap",
  },
  {
    file: "workers/content/src/lib/knowledge-ingest.ts",
    fn: "sweepKind",
    iterates: "each ingest kind's own table — tickets, accounts, apps, stories, meetings, all GROWING",
    chunk: "INGEST_SOURCES_PER_TICK",
    resume: "knowledge_ingest.cursor — a versioned `v<n>|<sortAt>|<id>`, kinds ordered oldest-swept-first so none starves",
    onFailure: "one kind's throw is caught, stamped on knowledge_ingest.last_error, and the sweep goes on",
    progress: "the Sync screen reads listIngestState — per-kind lastRunAt, lastOkAt, lastError",
  },
  {
    file: "workers/content/src/lib/knowledge.ts",
    fn: "indexSource",
    iterates: "the chunks of one source, up to MAX_CHUNKS_PER_SOURCE",
    chunk: "INDEX_CHUNKS_PER_SLICE",
    resume: "knowledge_sources.indexed_chunks beside content_hash — a tick that dies is finished by the next",
    onFailure: "degrade, never abort: a failed embed batch stores null vectors and records one error row",
    progress: "IndexProgress {total, indexed, done}, shown per source on the Sync screen",
  },
  {
    file: "workers/content/src/lib/knowledge-vectors.ts",
    fn: "upsertVectors",
    iterates: "the vector rows of one source",
    chunk: "UPSERT_BATCH",
    resume: "indexSource's content_hash — only stamped once the whole source succeeded, so a lost batch is redone",
    onFailure: "each batch retried once, then thrown so the resumable caller above hears it",
    progress: "the counter it returns, which indexSource turns into IndexProgress",
  },
  {
    file: "workers/content/src/lib/knowledge-google.ts",
    fn: "sweepGoogle",
    iterates: "one person's Drive, Gmail, Calendar and Chat listings — external and unbounded",
    chunk: "INGEST_SOURCES_PER_TICK",
    resume: "the same per-kind knowledge_ingest cursor, keyed per person per service, behind a sync lease",
    onFailure: "per-kind catch, and busy/skipped are returned as distinct answers rather than as silence",
    progress: "the Google sync screen drives it and reads the same per-service rows",
  },
  {
    file: "workers/content/src/lib/knowledge-google.ts",
    fn: "retireVanished",
    iterates: "this person's held knowledge_sources per Google service — GROWS",
    chunk: "RETIRE_PROBES_PER_TICK",
    resume: "none stored — the scan is ORDER BY RANDOM() within RETIRE_SCAN_CAP, so completeness is statistical over ticks rather than exact. Written down because it is the weakest resume in this table: a source can be probed twice before another is probed once.",
    onFailure: "a service whose token fails is skipped; the others are still probed",
    progress: "none beyond the log",
  },
  {
    file: "workers/content/src/lib/google-autopilot.ts",
    fn: "googleAutopilot",
    iterates: "connected people × meetings still waiting for a transcript — both GROW",
    chunk: "GOOGLE_SWEEP_PEOPLE_PER_TICK",
    resume: "the selection predicate advances itself — people ordered by least-recently-used, meetings by attempts under TRANSCRIPT_ATTEMPT_CAP inside TRANSCRIPT_HORIZON_DAYS",
    onFailure: "every failure is collected and recorded per person and per meeting; nothing throws out",
    progress: "error_logs rows only",
  },
  {
    file: "workers/content/src/index.ts",
    fn: "morningDigest",
    iterates: "teams — one email each, daily",
    chunk: "CRON_TEAM_CAP",
    resume: "the rotating window, as the sweep above; nothing is stored, so a tick that dies re-mails that window tomorrow",
    onFailure: "per-team catch to an error_logs row naming the team",
    progress: "log and error_logs",
  },
  {
    file: "workers/content/src/lib/notify.ts",
    fn: "sendToMany",
    iterates: "a recipient list — team members or a client's stakeholders",
    chunk: "SEND_CONCURRENCY",
    resume: "none — a send is not replayable, so the ceiling is the answer: past SEND_FAN_CAP the extras are DROPPED and named in the log rather than queued",
    onFailure: "per-recipient failure recorded to error_logs; one bad address never stops the rest",
    progress: "error_logs rows only",
  },
  {
    file: "shared/workers/retention.ts",
    fn: "sweepCoreRetention",
    iterates: "login_codes, login_sends, sessions and error_logs — all GROW, some from unauthenticated callers",
    chunk: "RETENTION_DELETE_CAP",
    resume: "the predicate re-selects tomorrow; a short pass stops early, and a capped table is recorded",
    onFailure: "per-table catch keeps the partial count and names the table",
    progress: "log, and an error_logs row when a table hit the pass ceiling",
  },
  {
    file: "workers/tenancy/src/lib/sharding.ts",
    fn: "recordGrowth",
    iterates: "every D1 database on the account — GROWS",
    chunk: "CRON_GROWTH_CAP",
    resume: "none stored — the tick takes the LARGEST N every night, which is a deliberate sampling rather than a walk, because a trend only matters where there is a ceiling to reach",
    onFailure: "per-database catch to error_logs; a truncated listing is recorded as its own row",
    progress: "GET /api/tenancy/admin/db-sizes",
  },
  {
    file: "shared/workers/d1-rest.ts",
    fn: "d1ListAllDatabases",
    iterates: "Cloudflare's own D1 listing, 100 to a page",
    chunk: "D1_LIST_PAGE_CAP",
    resume: "none — truncation is RETURNED as `complete: false` and the caller decides, which is why this is not silently short",
    onFailure: "a page that throws ends the listing; the partial is not passed off as whole",
    progress: "the caller's own log",
  },
  {
    file: "workers/tenancy/src/lib/sharding.ts",
    fn: "moveModuleToOwnDatabase",
    iterates: "every row of a module's tables — the largest collection in the product by definition",
    chunk: "COPY_BATCH",
    resume: "team_module_moves — per-table keyset cursors, verified and drained sets, rows copied, and a claim that goes stale after MOVE_CLAIM_STALE_MS",
    onFailure: "refuses rather than leaving a half-emptied source: copy_mismatch and move_drain_incomplete are thrown AND stamped on last_error with the claim released",
    progress: "MoveProgress {movedRows, done, status, copying} per call",
  },
  {
    file: "workers/tenancy/src/routes/admin.ts",
    fn: "migrateTeams",
    iterates: "every ready team behind the latest schema — GROWS with tenants and with schema history",
    chunk: "MIGRATE_TEAMS_PER_RUN",
    resume: "each team's own _migrations table, plus schema_version on the core row — nothing is stored, so nothing can get out of step; the response says `remaining`",
    onFailure: "one unreachable database is named in `failed` and the rest are still migrated",
    progress: "the response: teamsChecked, teamsMigrated, failed, remaining",
  },
  {
    file: "workers/tenancy/src/lib/teams.ts",
    fn: "acceptPendingInvites",
    iterates: "invite_index rows for one email — attacker-influenced, since anyone may invite any address",
    chunk: "INVITE_SWEEP_CAP",
    resume: "the rest stay pending and are accepted from the Invitations inbox; ORDER BY created_at so the oldest never starve",
    onFailure: "a claim that moves zero rows is skipped — the pending status rides the UPDATE",
    progress: "the count returned, plus a live ping per team joined",
  },
  {
    file: "shared/workers/csv.ts",
    fn: "exportTooLarge",
    iterates: "a whole collection, on each of the six export doors",
    chunk: "one statement",
    resume: "none, deliberately — an export is one whole document or it is an error, because a truncated export re-imported is data loss",
    onFailure: "refused at EXPORT_HARD_CAP with a sentence telling the caller how to ask for less",
    progress: "none — it is a synchronous download",
  },
  {
    file: "workers/data-ops/src/routes/admin.ts",
    fn: "postResolveErrorSignature",
    iterates: "open error_logs rows under one folded signature — the one table built to grow",
    chunk: "RESOLVE_SCAN_CAP",
    resume: "re-running it — newest-first with `status = 'open'` riding the UPDATE always makes progress, and `capped: true` says to run it again",
    onFailure: "each id batch is one statement, so there is no partial state to reconcile",
    progress: "the response: updated, scanned, matched, capped",
  },
] as const
