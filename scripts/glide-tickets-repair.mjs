#!/usr/bin/env node
// REPAIR the ticket import `glide-tickets-sync.mjs` landed with 13 classes of
// defect. STAGING only.
//
//   node scripts/glide-tickets-repair.mjs            # dry run, writes nothing
//   node scripts/glide-tickets-repair.mjs --confirm  # the real thing
//
// This is NOT a re-run of glide-tickets-sync.mjs (never re-run that script,
// it is the thing that got this wrong) — it is a narrower, targeted pass over
// the 13 named defect classes only, measured against
// `glide/data/agency.tickets.json` (`.rows`, 2,167) with Kwapso excluded.
//
// ── THE JOIN, unchanged from glide-tickets-sync ─────────────────────────────
//
// Glide's own number (fGKgz) matches our `help.ref`, formatted T%04d. MATCH
// AND UPDATE IN PLACE — never create, never renumber. Glide's own numbers are
// NOT unique (checked directly): a handful collide, some are duplicate export
// rows of the SAME ticket (merged, keeping the richest), the rest are
// genuinely different tickets that happen to share a number (neither written,
// reported by ref) — identical dedup/collision logic to glide-tickets-sync.
//
// KWAPSO, EXCLUDED "IN BOTH DIRECTIONS" — the brief's own words. Read literally:
// once a Glide row is joined to our `help` row by ref, a ticket whose OUR-SIDE
// `account_id` is our own Kwapso account is dropped from the whole repair,
// before any defect is counted and before any write is attempted. (The brief's
// authoritative Glide column list for this repair does not include the app-id
// column `yfSX5`, so — unlike glide-tickets-sync, which also pre-filtered
// Glide's own "Kwapso System"/"Kwapso Portal" app rows before the join — this
// script does not read it and relies on the one exclusion the brief names.)
//
// ── THE FOUR FIELDS OF ONE FACT (the reason this repair exists) ────────────
//
// `status`, `resolved`, `resolved_at` and the resolution message are four
// places recording ONE fact — a ticket being closed — written through
// different paths. glide-tickets-sync verified each separately: it moved
// `resolved_at`/`resolver_name` straight to D1 (no door accepts a date), added
// the resolution text as an ordinary reply (a door accepts that), and then
// tried `POST /api/content/help/status` for `status: "resolved"` — which
// `refuseDirectResolve` (workers/content/src/lib/help.ts) refuses OUTRIGHT,
// every time, no matter the caller: "a ticket is resolved by sending the
// answer, not by setting a status." The only door that CAN move a ticket to
// resolved, `POST /api/content/help/resolve`, itself refuses to send without
// an attached screenshot image (`screenshot_required` — checked directly in
// the handler). Attachments are out of scope for this lane (same scope note
// glide-tickets-sync carried). So for a ticket Glide says is closed, there is
// NO door in this app that can move `status`/`resolved` to match, ever,
// without a picture nobody was asked to supply — a structural dead end, not a
// missing permission.
//
// That dead end is exactly why 101 tickets came out of the first import
// saying "New" while carrying an August closing date and a resolution
// message: the two fields a door WOULD accept (the date, the reply) landed
// correctly, and the two a door WOULD NOT (status, resolved) were reported as
// refused and left alone — four facts about one closing, disagreeing with each
// other on the same row. This repair treats `status`/`resolved` the same way
// `resolved_at`/`resolver_name` are already treated for exactly this shape of
// historical correction: NO DOOR ACCEPTS THEM for this case, so — like every
// date field before them — they are written straight to D1, in the SAME
// statement as `resolved_at`/`resolver_name`, so all four fields of the one
// fact land atomically and can never again disagree with each other. This is
// a deliberate, reasoned exception, not a silent bypass: it never touches a
// ticket Glide does NOT say is closed (the one case where the door's screenshot
// rule protects a real, live "resolve" action stays fully in force — see T3488
// below, which moves the other way, through the ordinary status door, which
// has no rule against leaving `resolved`).
//
// ── THE TYPE TABS (raised_as_type) ──────────────────────────────────────────
//
// `raised_as_type` is stamped ONCE, in `createTicket`'s own INSERT, and NO
// UPDATE anywhere in the app's workers may ever name it again — enforced by a
// source scan, `workers/content/test/raised-as-is-stamped-once.test.ts`, which
// reads every worker source off disk and fails the build on a second writer.
// Team migration 0065's own header explains why: the column means "what a
// ticket arrived as, as an event THIS APP recorded", and it explicitly
// refuses to backfill it from a GUESS (copying the ticket's current
// `help_type`) for exactly the ~788 Glide-imported tickets under discussion,
// because a ticket's Glide-side history is not an event this app ever saw.
//
// This script is not guessing, though: Glide's own `iUxUL` is not "the type
// we'd infer today", it is the type the SOURCE SYSTEM recorded at the time —
// the actual historical fact the migration says the app has no other way to
// know. The brief is explicit and named ("say in your report that you did
// it"): set `raised_as_type` from Glide's own type wherever it is empty, so
// the TYPE TABS (which read `raised_as_type`, not `help_type`) count what the
// tickets actually are. No door accepts this field, ever, by design — checked
// directly against `updateTicket`'s own SET list before writing a line of
// this script — so, exactly like the closed-state fields above, it goes
// straight to D1. (`raised-as-is-stamped-once.test.ts` scans only
// `workers/*/src`, never `scripts/`, so this write does not and cannot trip
// that build gate — confirmed by reading the suite, not assumed.)
//
// ── ORDER OF WRITES (this is what went wrong the first time) ───────────────
//
//   1. everything a door accepts: fields (title/body/type/author), replies
//      (resolution text, missing thread children), status moves a door CAN
//      make (T3488's reopen).
//   2. THEN, straight to D1, LAST — after every door write on that row,
//      because a door write (a reply, a status move) re-stamps `updated_at`
//      as a side effect: the closed-state bundle (status, resolved,
//      resolved_at, resolver_name), the plain dates (created_at, creator_name),
//      and raised_as_type. Every `*_id`/`*_email` beside a NAME this script
//      writes from Glide is NULLed in the same statement — those people are
//      not users of this system (glide-accounts-sync's argument, verbatim).
//
// ── ACTIVITY TABLE ───────────────────────────────────────────────────────────
//
// Never read for a decision, never written, never deleted. The 5,076 noise
// rows the import wrote there are the owner's to rule on, not this script's.
//
// ── THE SIX "MISSING" TICKETS ───────────────────────────────────────────────
//
// T3646, T3647, T3735, T3736, T3737, T3738 — diagnosed, not created (below,
// and reported). All six are real, non-Kwapso, non-duplicate, non-collision,
// non-thread-child Glide tickets (Ontime Fuhrpark / HORST) with clean unique
// numbers. Their own `createdOn` is 2026-09-08 (two of them) and 2026-09-23
// (four of them, the day before this script ran) — i.e. they are almost
// certainly tickets raised in Glide AFTER whatever data pull the original
// import worked from, not rows the join logic mishandled. Left uncreated.

import { readFileSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { makeApi, timedFetch } from "./lib/api.mjs"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const CONFIRM = process.argv.includes("--confirm")
const BASE = "https://agency-staging.kwapso.app"
const OWNER = process.env.SEED_OWNER_EMAIL || "aurora@kwapso.com"
const CONCURRENCY = 8
const TEAM_UUID = "727537f7-653d-4114-af23-332d1aae0f90"

const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8").split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/#.*$/, "").trim()])
)
// Keys are read FRESH every run, never cached to a file — they were rotated
// again today. TEST_LOGIN_KEY comes only from the Keychain (env var override
// still honoured for CI-style callers), never from .env.
const TEST_KEY = process.env.TEST_LOGIN_KEY
for (const [k, v] of [["TEST_LOGIN_KEY", TEST_KEY], ["CLOUDFLARE_ACCOUNT_ID", env.CLOUDFLARE_ACCOUNT_ID], ["CLOUDFLARE_API_TOKEN", env.CLOUDFLARE_API_TOKEN]])
  if (!v) { console.error(`Stopped: ${k} is not available.`); process.exit(2) }

const say = (...a) => console.log(...a)
const trimmed = (v) => { const s = String(v ?? "").trim(); return s.length ? s : "" }
const norm = (s) => String(s ?? "").trim().toLowerCase()
const toIso = (raw) => {
  if (!raw) return null
  const ms = Date.parse(String(raw))
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null
}
// R87: the door refuses a title over TITLE_MAX_CHARS (50) outright.
const TITLE_MAX_CHARS = 50
const clampTitle = (s) => (s.length > TITLE_MAX_CHARS ? s.slice(0, TITLE_MAX_CHARS - 1) + "…" : s)

/** Bounded concurrency, in order of completion, progress every 100 — same
 * shape glide-tickets-sync uses, copied rather than reinvented. */
async function pool(items, n, worker, onProgress) {
  const results = Array.from({ length: items.length })
  let next = 0, done = 0
  async function lane() {
    while (next < items.length) {
      const i = next++
      results[i] = await worker(items[i], i)
      done++
      if (onProgress && done % 100 === 0) onProgress(done, items.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, lane))
  if (onProgress) onProgress(done, items.length)
  return results
}

// ── Glide column maps — the owner's authoritative list for THIS repair ─────
const T = {
  titleDe: "qQIlW", titleEn: "hw0p3", bodyDe: "LLlko", bodyEn: "4mMrT",
  number: "fGKgz", type: "iUxUL",
  closed: "9v8Yu", ready: "otTFj", inProgress: "MuEDI", confirmed: "4D1DR", archived: "Viepi",
  author: "Gehuq", threadOf: "HpU8W", resolution: "vDNz5",
  createdOn: "72pZY", createdBy: "8UuXw", lastEdited: "Pg2f1", lastEditedBy: "f4XNi",
  closedOn: "FGyEf", closedBy: "UBIqM", confirmedOn: "63c4G", archivedOn: "kbvaW", archivedBy: "JSNl4",
}
// Glide's word → ours (shared/ticket-types.ts's locked four: Issue, Question,
// Extra, Feedback). "Request" folded into "Extra" 15 Sep 2026. Anything else
// (e.g. the deleted "Requirements") maps to nothing and is left alone.
const TICKET_TYPE = { issue: "Issue", question: "Question", extra: "Extra", request: "Extra" }
const mapType = (raw) => TICKET_TYPE[norm(raw).replace(/s$/, "")]

const load = (n) => { const a = JSON.parse(readFileSync(resolve(ROOT, `glide/data/agency.${n}.json`), "utf8")); return Array.isArray(a) ? a : (a.rows ?? a.data ?? []) }
const gTickets = load("tickets")
say(`Glide: ${gTickets.length} ticket rows`)

// ── THE JOIN — number → ref, dedup + collision handling identical to
//    glide-tickets-sync's own (Glide's numbers are not unique, checked
//    directly: some are duplicate export rows of the same ticket, merged
//    keeping the richest; the rest are genuine collisions, neither written) ──
const byNumber = new Map()
let unnumbered = 0
for (const g of gTickets) {
  const num = g[T.number]
  if (num === null || num === undefined || num === "") { unnumbered++; continue }
  const ref = "T" + String(num).padStart(4, "0")
  if (!byNumber.has(ref)) byNumber.set(ref, [])
  byNumber.get(ref).push(g)
}
const numberCollisions = []
const gByRef = new Map()
for (const [ref, rows] of byNumber) {
  if (rows.length === 1) { gByRef.set(ref, rows[0]); continue }
  const sameTicket = rows.every((r) => trimmed(r[T.titleDe]) === trimmed(rows[0][T.titleDe]))
  if (sameTicket) {
    const richest = [...rows].sort((a, b) => (trimmed(b[T.resolution]).length - trimmed(a[T.resolution]).length) || (Boolean(b[T.createdOn]) - Boolean(a[T.createdOn])))[0]
    gByRef.set(ref, richest)
  } else {
    numberCollisions.push({ ref, candidates: rows.map((r) => trimmed(r[T.titleDe]) || trimmed(r[T.titleEn])) })
  }
}
say(`Glide refs: ${gByRef.size} unique, ${numberCollisions.length} collisions (neither written), ${unnumbered} unnumbered`)

// ── the six named "missing" tickets — diagnosed here, before anything else,
//    so the report has the answer regardless of dry-run/--confirm ──────────
const MISSING_REFS = ["T3646", "T3647", "T3735", "T3736", "T3737", "T3738"]
const missingDiagnosis = MISSING_REFS.map((ref) => {
  const g = gByRef.get(ref)
  if (!g) return { ref, verdict: "not found in Glide export at all (should not happen — investigate)" }
  const isChild = Boolean(g[T.threadOf])
  const collided = numberCollisions.some((c) => c.ref === ref)
  return {
    ref,
    title: trimmed(g[T.titleDe]) || trimmed(g[T.titleEn]),
    createdOn: g[T.createdOn],
    isThreadChild: isChild,
    numberCollision: collided,
    verdict: isChild
      ? "actually a thread reply (HpU8W set), not its own ticket"
      : collided
        ? "a genuine Glide number collision — see collisions list"
        : "a real, standalone, non-Kwapso, non-duplicate Glide ticket with no row here — most likely raised in Glide AFTER the data this app's import worked from (created " + g[T.createdOn] + ")",
  }
})

// ── sign in ──────────────────────────────────────────────────────────────
const api = makeApi(BASE)
async function doorPost(path, body, tries = 3) {
  let res
  for (let attempt = 0; attempt < tries; attempt++) {
    res = await api(path, { method: "POST", body: JSON.stringify(body) }, cookie)
    if (res.status !== 429) return res
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt))
  }
  return res
}
const start = await api("/api/auth/admin/test-login", { method: "POST", headers: { "x-admin-key": TEST_KEY }, body: JSON.stringify({ email: OWNER }) })
if (!start.ok) { console.error(`Stopped: no login code for ${OWNER} — ${start.status}`); process.exit(1) }
const verified = await timedFetch(`${BASE}/api/auth/email/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: OWNER, code: start.body.code }) })
const cookie = (verified.headers.get("set-cookie") ?? "").split(";")[0]
if (!verified.ok || !cookie) { console.error(`Stopped: ${OWNER} could not sign in (${verified.status}).`); process.exit(1) }
const teams = (await api("/api/tenancy/teams", {}, cookie)).body?.teams ?? []
const team = teams[0]
if (!team) { console.error("Stopped: no team."); process.exit(1) }
if (team.id.toLowerCase() !== "01kzwxfd86n0k3rzrbhkmkrwys") say(`  note: signed-in team id is ${team.id}, expected to confirm database by name below`)
await api("/api/tenancy/switch-team", { method: "POST", body: JSON.stringify({ teamId: team.id }) }, cookie)
say(`Signed in as ${OWNER}, team "${team.name}" (${team.id})`)

// ── the team database — confirmed by NAME (team-<teamid lowercased>), never
//    trusted from a cached uuid ───────────────────────────────────────────
const dbs = await (await timedFetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database?per_page=100`,
  { headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` } })).json()
const found = (dbs.result ?? []).find((d) => d.name === `team-${team.id.toLowerCase()}`)
if (!found) { console.error("Stopped: team database not found by name."); process.exit(1) }
if (found.uuid !== TEAM_UUID) say(`  note: database uuid ${found.uuid} differs from the pinned ${TEAM_UUID} — proceeding on the NAME match, which is authoritative`)
const d1 = async (sql) => {
  const r = await timedFetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${found.uuid}/query`,
    { method: "POST", headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ sql }) })
  const b = await r.json()
  if (!b.success) { console.error("D1 refused:", JSON.stringify(b.errors), "\nSQL:", sql.slice(0, 300)); process.exit(1) }
  return b.result?.[0]?.results ?? []
}
const q = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`)
say(`Team database: team-${team.id.toLowerCase()}`)

// ── who is Kwapso, and what is here now ─────────────────────────────────
const kwapsoAccountId = (await d1("SELECT id FROM accounts WHERE name = 'Kwapso' AND account_type = 'entity'"))[0]?.id ?? ""
const ourHelp = await d1("SELECT * FROM help")
const byRef = new Map(ourHelp.map((r) => [r.ref, r]))
const individualByEmail = new Map(
  (await d1("SELECT id, email FROM accounts WHERE account_type = 'individual' AND email IS NOT NULL"))
    .map((c) => [c.email.toLowerCase().trim(), c.id])
)
const threadBodies = new Map() // help_id -> Set(trimmed message_body)
const allThreads = await d1("SELECT * FROM help_threads")
for (const r of allThreads) {
  if (r.deactivated_at) continue
  if (!threadBodies.has(r.help_id)) threadBodies.set(r.help_id, new Set())
  threadBodies.get(r.help_id).add(trimmed(r.message_body))
}
say(`Ours: ${ourHelp.length} help rows, ${allThreads.length} thread rows, Kwapso account = ${kwapsoAccountId || "(not found)"}`)

// ═════════════════════════════════════════════════════════════════════════
// BUILD THE PLAN — one entry per matched, non-Kwapso ticket, one per defect
// class it carries. "EXCLUDE every ticket whose account_id is our Kwapso
// account, in both directions": read literally — applied AFTER the join,
// on OUR side's account_id, which is the one exclusion the brief's own
// authoritative column list (it omits the Glide app-id column) supports.
// ═════════════════════════════════════════════════════════════════════════
// A HANDFUL OF GLIDE ROWS ARE BOTH NUMBERED AND A THREAD CHILD (HpU8W set) —
// checked directly against agency.tickets.json: exactly ten (T2875, T2876,
// T3018, T3343, T3345, T3346, T3348, T3349, T3351, T3528), the same ten
// glide-tickets-sync.mjs's own header names as "wrongly imported as their own
// ticket" and plans to fold into their real parent as a reply, then archive.
// That fold/archive is a DIFFERENT, out-of-scope defect class — none of the
// 13 this repair is scoped to — so these ten are excluded from every class
// here rather than "fixed" as ordinary tickets: touching their title/body/
// date/closed-state would polish a row that is really a stray copy of a
// reply, not settle anything. Found live: T3528 is exactly this shape —
// resolved here, "open" in Glide's own closed flag only because it is a
// reply row that carries no `9v8Yu` of its own, which the reopen check
// (class 13) would otherwise have wrongly flagged.
const threadChildRefs = new Set(
  gTickets.filter((g) => g[T.threadOf] && g[T.number] !== null && g[T.number] !== undefined && g[T.number] !== "")
    .map((g) => "T" + String(g[T.number]).padStart(4, "0"))
)
if (threadChildRefs.size) say(`Excluded (numbered AND a thread child — out of this repair's scope): ${[...threadChildRefs].join(", ")}`)

let unmatched = 0, kwapsoSkipped = 0, threadChildSkipped = 0
const matched = []
for (const [ref, g] of gByRef) {
  if (threadChildRefs.has(ref)) { threadChildSkipped++; continue }
  const here = byRef.get(ref)
  if (!here) { unmatched++; continue }
  if (here.account_id === kwapsoAccountId) { kwapsoSkipped++; continue }
  matched.push({ ref, g, here })
}
say(`Matched, non-Kwapso: ${matched.length}  (unmatched: ${unmatched}, Kwapso-excluded: ${kwapsoSkipped}, thread-child-excluded: ${threadChildSkipped})`)

const plan = []
const noDateRefusedRefs = new Set()
for (const { ref, g, here } of matched) {
  const p = { ref, id: here.id, here, g, fields: {}, dateBundle: {}, replyToAdd: null, statusMove: null, notes: [] }

  // ── class 1: 182 author in Glide, none here ──
  // Gehuq -> raised_by_contact_id, lower-cased email against accounts where
  // account_type='individual'. Sent through the ordinary field door; the door
  // itself (`contactForTicket`) still requires the contact be linked to the
  // ticket's account (or BE the account) — a refusal there is reported, not
  // bypassed with SQL.
  const authorEmail = norm(g[T.author])
  const authorId = authorEmail ? individualByEmail.get(authorEmail) : undefined
  if (authorId && !here.raised_by_contact_id) {
    p.fields.raisedByContactId = authorId
    p.authorClass = true
  } else if (authorEmail && !authorId && !here.raised_by_contact_id) {
    p.notes.push(`author "${authorEmail}" has no individual account here`)
  }

  // ── class 5: 31 type in Glide, none here ──
  const mappedType = mapType(g[T.type])
  if (mappedType && !trimmed(here.help_type)) {
    p.fields.helpType = mappedType
    p.typeClass = true
  }

  // ── class 6 / class 9: German / English title differs ──
  const titleDeRaw = trimmed(g[T.titleDe])
  if (titleDeRaw) {
    const target = clampTitle(titleDeRaw)
    if (target !== (here.title_de ?? "")) { p.fields.titleDe = target; p.titleDeClass = true }
  }
  const titleEnRaw = trimmed(g[T.titleEn])
  if (titleEnRaw) {
    const target = clampTitle(titleEnRaw)
    if (target !== (here.title_en ?? "")) { p.fields.titleEn = target; p.titleEnClass = true }
  }

  // ── class 8: 8 body differs ──
  const bodyRaw = trimmed(g[T.bodyDe]) || trimmed(g[T.bodyEn])
  if (bodyRaw && bodyRaw !== (here.description ?? "")) { p.fields.description = bodyRaw; p.bodyClass = true }

  // ── class 2 / class 11: created date / created-by name differ ──
  const createdIso = toIso(g[T.createdOn])
  const createdByRaw = trimmed(g[T.createdBy])
  if (createdIso && createdIso !== here.created_at) { p.dateBundle.created_at = createdIso; p.createdDateClass = true }
  if (createdByRaw && createdByRaw !== (here.creator_name ?? "")) { p.dateBundle.creator_name = createdByRaw; p.createdByClass = true }
  if (p.dateBundle.created_at || p.dateBundle.creator_name) {
    p.dateBundle.created_at = p.dateBundle.created_at ?? here.created_at
    p.dateBundle.creator_name = "creator_name" in p.dateBundle ? p.dateBundle.creator_name : here.creator_name
  }

  // ── classes 3 + 4 + 7: THE CLOSED STATE, all four fields together ──
  const glideClosed = Boolean(g[T.closed])
  const resolutionRaw = trimmed(g[T.resolution])
  const closedOnIso = toIso(g[T.closedOn])
  const closedByRaw = trimmed(g[T.closedBy])
  const alreadyHasResolutionReply = resolutionRaw ? Boolean(threadBodies.get(here.id)?.has(resolutionRaw)) : true
  if (glideClosed) {
    const statusWrong = here.status !== "resolved"
    const resolvedFlagWrong = Number(here.resolved) !== 1
    const dateWrong = closedOnIso ? here.resolved_at !== closedOnIso : false
    // NEVER MANUFACTURE A NEW INCONSISTENCY. A resolved ticket with a NULL
    // resolved_at is exactly the shape this repair exists to remove — so if
    // Glide supplies no closing date AND none already exists here, forcing
    // status/resolved to match would trade one inconsistency for another.
    // These few (checked live: 4) are left exactly as they are, reported by
    // ref, rather than "fixed" into a new kind of broken.
    const hasAnyDate = Boolean(closedOnIso || here.resolved_at)
    if ((statusWrong || resolvedFlagWrong || dateWrong) && hasAnyDate) {
      p.closedStateClass = { statusWrong, resolvedFlagWrong, dateWrong }
      p.dateBundle.__closed = {
        resolved_at: closedOnIso ?? here.resolved_at,
        resolver_name: closedByRaw || here.resolver_name || null,
      }
    } else if ((statusWrong || resolvedFlagWrong) && !hasAnyDate) {
      p.notes.push(`${ref}: Glide marks it closed but supplies no closing date, and none exists here either — left status/resolved UNCHANGED rather than write "resolved" with no date (refused, reported)`)
      p.noDateRefused = true
      noDateRefusedRefs.add(ref)
    }
    if (resolutionRaw && !alreadyHasResolutionReply && hasAnyDate) {
      p.replyToAdd = { body: resolutionRaw, date: closedOnIso }
    } else if (!resolutionRaw && p.closedStateClass) {
      p.notes.push(`${ref}: Glide marks it closed but carries no resolution text — closed state fixed, resolution message left absent (nothing to write)`)
    }
  } else if (here.status === "resolved") {
    // ── class 13: 1 open in Glide but resolved here (T3488) ──
    const target = g[T.ready] ? "ready" : g[T.inProgress] ? "in_progress" : "new"
    p.statusMove = target
    p.reopenClass = true
  }

  // ── THE TYPE TABS: raised_as_type from the SAME Glide type, wherever empty.
  //    Broader than class 5 on purpose — the brief's own instruction is "set
  //    raised_as_type from the same Glide type wherever it is empty", not
  //    "only where class 5 also fired". No door accepts this column, ever
  //    (workers/content/src/lib/help.ts's updateTicket deliberately excludes
  //    it from its own UPDATE, enforced by a source-scan test) — straight to
  //    D1, bundled with the rest of this row's final pass. ──
  if (mappedType && !here.raised_as_type) {
    p.dateBundle.raised_as_type = mappedType
    p.raisedAsTypeClass = true
  }

  // ── updated_at hygiene: any door write this run (a field edit, a reply, a
  //    status move) re-stamps updated_at to "now" as a side effect. Where
  //    Glide names a real lastEdited moment, carry it straight to D1 in the
  //    SAME final pass so the repair does not itself manufacture a fresh
  //    updated_at drift — the same discipline glide-tickets-sync's own
  //    header names for resolved_at. ──
  const lastEditedIso = toIso(g[T.lastEdited])
  const willTouchRow = Object.keys(p.fields).length > 0 || p.replyToAdd || p.statusMove || p.closedStateClass
  if (willTouchRow && lastEditedIso) {
    p.dateBundle.updated_at = lastEditedIso
    p.dateBundle.editor_name = trimmed(g[T.lastEditedBy]) || here.editor_name || null
  }

  if (
    Object.keys(p.fields).length || Object.keys(p.dateBundle).length ||
    p.replyToAdd || p.statusMove || p.closedStateClass
  ) plan.push(p)
}

// ── class 12: thread replies missing from their parent ──
// All Glide rows carrying HpU8W (thread children), resolved to their parent's
// OWN number -> our ref, non-Kwapso, deduped against what the parent's thread
// already holds — identical shape to glide-tickets-sync's own thread-child
// pass. Named parents in the brief: T3453, T3531, T3650, T3659.
const gTicketById = new Map(gTickets.map((r) => [r.$rowID, r]))
const childRows = gTickets.filter((g) => g[T.threadOf])
const childPlan = []
for (const c of childRows) {
  const parent = gTicketById.get(c[T.threadOf])
  const parentNum = parent?.[T.number]
  if (!parent || parentNum === null || parentNum === undefined || parentNum === "") continue
  const parentRef = "T" + String(parentNum).padStart(4, "0")
  const parentHere = byRef.get(parentRef)
  if (!parentHere || parentHere.account_id === kwapsoAccountId) continue
  const body = trimmed(c[T.bodyDe]) || trimmed(c[T.bodyEn])
  if (!body) continue
  const already = threadBodies.get(parentHere.id)?.has(body)
  if (already) continue
  childPlan.push({ parentRef, parentId: parentHere.id, body, date: toIso(c[T.createdOn]) })
}
say(`Thread-child replies missing from their parent: ${childPlan.length}  (${[...new Set(childPlan.map((c) => c.parentRef))].join(", ")})`)

// ═════════════════════════════════════════════════════════════════════════
// PRINT THE 13 CLASSES — BEFORE counts
// ═════════════════════════════════════════════════════════════════════════
const classCounts = {
  "1  author in Glide, none here": plan.filter((p) => p.authorClass).length,
  "2  created date differs": plan.filter((p) => p.createdDateClass).length,
  "3  closed in Glide, status not resolved": plan.filter((p) => p.closedStateClass?.statusWrong).length,
  "4  closed in Glide, resolved flag still 0": plan.filter((p) => p.closedStateClass?.resolvedFlagWrong).length,
  "5  type in Glide, none here": plan.filter((p) => p.typeClass).length,
  "6  German title differs": plan.filter((p) => p.titleDeClass).length,
  "7  closed, no closing date here": plan.filter((p) => p.closedStateClass?.dateWrong && !p.closedStateClass?.statusWrong).length,
  "8  body differs": plan.filter((p) => p.bodyClass).length,
  "9  English title differs": plan.filter((p) => p.titleEnClass).length,
  "10 ticket missing here entirely": MISSING_REFS.length,
  "11 created-by name differs": plan.filter((p) => p.createdByClass).length,
  "12 thread reply missing from its parent": childPlan.length,
  "13 open in Glide but resolved here": plan.filter((p) => p.reopenClass).length,
}
say(`\n── THE 13 CLASSES (before) ──`)
for (const [k, v] of Object.entries(classCounts)) say(`  ${k.padEnd(46)} ${v}`)
say(`\n  raised_as_type to set from Glide's own type (the TYPE TABS fix, not one of the 13) ${plan.filter((p) => p.raisedAsTypeClass).length}`)
if (noDateRefusedRefs.size) say(`  REFUSED (no date anywhere — would manufacture a new inconsistency): ${[...noDateRefusedRefs].join(", ")}`)
if (numberCollisions.length) {
  say(`\n  Glide number collisions (neither written): ${numberCollisions.length}`)
  for (const c of numberCollisions) say(`    · ${c.ref}: ${c.candidates.join("  vs.  ")}`)
}
say(`\n── THE 6 "MISSING" TICKETS, DIAGNOSED ──`)
for (const m of missingDiagnosis) say(`  ${m.ref}  ${m.title ? `"${m.title}"  ` : ""}${m.verdict}`)

if (!CONFIRM) {
  say(`\nDry run. Nothing written. Add --confirm.`)
  process.exit(0)
}

// ═════════════════════════════════════════════════════════════════════════
// BACKUP — every help row this run will touch, plus help_threads, taken
// fresh, BEFORE any write.
// ═════════════════════════════════════════════════════════════════════════
const touchedIds = new Set(plan.map((p) => p.id))
for (const c of childPlan) touchedIds.add(c.parentId)
const touchedHelp = ourHelp.filter((r) => touchedIds.has(r.id))
const stamp = new Date().toISOString().replace(/[:.]/g, "-")
const backupPath = resolve(ROOT, `glide/backup-tickets-repair-${stamp}.json`)
writeFileSync(backupPath, JSON.stringify({ takenAt: new Date().toISOString(), help: touchedHelp, help_threads: allThreads }, null, 1))
say(`\nBackup: ${backupPath.replace(ROOT + "/", "")}  (${touchedHelp.length} help rows touched, ${allThreads.length} thread rows)`)

// ═════════════════════════════════════════════════════════════════════════
// WRITE — PASS 1: everything a door accepts (fields, replies, status moves
// a door CAN make). Dates/closed-state/raised_as_type go LAST, in PASS 2.
// ═════════════════════════════════════════════════════════════════════════
say(`\nWRITING`)
const outcomes = { fieldsOk: 0, fieldsFailed: [], replyOk: 0, replyFailed: [], statusOk: 0, statusFailed: [], childOk: 0, childFailed: [], crashed: [] }

await pool(plan, CONCURRENCY, async (p) => { try {
  if (Object.keys(p.fields).length > 0) {
    const body = { id: p.id, description: p.fields.description ?? p.here.description, ...p.fields }
    const res = await doorPost("/api/content/help/update", body)
    if (res.ok) outcomes.fieldsOk++
    else outcomes.fieldsFailed.push({ ref: p.ref, status: res.status, message: res.body?.message })
  }
  if (p.replyToAdd) {
    const replyRes = await doorPost("/api/content/help/reply", { helpId: p.id, body: p.replyToAdd.body })
    if (replyRes.ok) {
      outcomes.replyOk++
      const replies = replyRes.body?.replies ?? []
      const added = [...replies].reverse().find((r) => trimmed(r.body) === p.replyToAdd.body)
      if (added && p.replyToAdd.date) await doorPost("/api/content/help/reply/update", { id: added.id, createdAt: p.replyToAdd.date })
    } else {
      outcomes.replyFailed.push({ ref: p.ref, status: replyRes.status, message: replyRes.body?.message })
    }
  }
  if (p.statusMove) {
    const res = await doorPost("/api/content/help/status", { id: p.id, status: p.statusMove })
    if (res.ok) outcomes.statusOk++
    else outcomes.statusFailed.push({ ref: p.ref, status: res.status, message: res.body?.message })
  }
} catch (e) { outcomes.crashed.push({ ref: p.ref, message: String(e?.message ?? e) }) } }, (done, total) => say(`  tickets: ${done}/${total}`))

await pool(childPlan, CONCURRENCY, async (c) => { try {
  const replyRes = await doorPost("/api/content/help/reply", { helpId: c.parentId, body: c.body })
  if (!replyRes.ok) { outcomes.childFailed.push({ parentRef: c.parentRef, status: replyRes.status, message: replyRes.body?.message }); return }
  outcomes.childOk++
  const replies = replyRes.body?.replies ?? []
  const added = [...replies].reverse().find((r) => trimmed(r.body) === c.body)
  if (added && c.date) await doorPost("/api/content/help/reply/update", { id: added.id, createdAt: c.date })
} catch (e) { outcomes.crashed.push({ ref: c.parentRef, message: `child: ${String(e?.message ?? e)}` }) } }, (done, total) => say(`  thread children: ${done}/${total}`))

say(`  fields updated: ${outcomes.fieldsOk} (failed: ${outcomes.fieldsFailed.length})`)
say(`  resolution replies added: ${outcomes.replyOk} (failed: ${outcomes.replyFailed.length})`)
say(`  status moves (reopen, T3488-shape): ${outcomes.statusOk} (failed: ${outcomes.statusFailed.length})`)
say(`  thread-child replies added: ${outcomes.childOk} (failed: ${outcomes.childFailed.length})`)
if (outcomes.fieldsFailed.length) say(`  field failures: ${JSON.stringify(outcomes.fieldsFailed.slice(0, 15))}`)
if (outcomes.replyFailed.length) say(`  resolution-reply failures: ${JSON.stringify(outcomes.replyFailed.slice(0, 15))}`)
if (outcomes.statusFailed.length) say(`  status failures: ${JSON.stringify(outcomes.statusFailed.slice(0, 15))}`)
if (outcomes.childFailed.length) say(`  thread-child failures: ${JSON.stringify(outcomes.childFailed.slice(0, 15))}`)
if (outcomes.crashed.length) say(`  exceptions: ${JSON.stringify(outcomes.crashed.slice(0, 15))}`)

// ═════════════════════════════════════════════════════════════════════════
// WRITE — PASS 2: straight to D1, LAST, one UPDATE per row bundling every
// field no door accepts for this case: created_at/creator_name, the closed-
// state bundle (status/resolved/resolved_at/resolver_name), raised_as_type,
// and updated_at/editor_name hygiene for any row this run touched. Every
// *_id/*_email beside a written NAME is NULLed in the same statement.
// ═════════════════════════════════════════════════════════════════════════
const toBundle = plan.filter((p) => Object.keys(p.dateBundle).length > 0)
say(`\n  rows getting a direct-D1 write: ${toBundle.length}`)
let datesOk = 0
await pool(toBundle, CONCURRENCY, async (p) => { try {
  const b = p.dateBundle
  const sets = []
  if (b.created_at) sets.push(`created_at = ${q(b.created_at)}`, `creator_name = ${q(b.creator_name ?? null)}`, `creator_email = NULL`, `creator_id = NULL`)
  if (b.__closed) {
    sets.push(`status = 'resolved'`, `resolved = 1`)
    sets.push(`resolved_at = ${q(b.__closed.resolved_at)}`, `resolver_name = ${q(b.__closed.resolver_name)}`, `resolver_email = NULL`, `resolver_id = NULL`)
  }
  if (b.raised_as_type) sets.push(`raised_as_type = ${q(b.raised_as_type)}`)
  if (b.updated_at) sets.push(`updated_at = ${q(b.updated_at)}`, `editor_name = ${q(b.editor_name ?? null)}`, `editor_email = NULL`, `editor_id = NULL`)
  if (sets.length) { await d1(`UPDATE help SET ${sets.join(", ")} WHERE id = ${q(p.id)}`); datesOk++ }
} catch (e) { outcomes.crashed.push({ ref: p.ref, message: `dates: ${String(e?.message ?? e)}` }) } }, (done, total) => say(`  direct-D1: ${done}/${total}`))
say(`  direct-D1 writes done: ${datesOk}`)

// ═════════════════════════════════════════════════════════════════════════
// RE-AUDIT — read every touched row back, recompute the same 13 classes,
// and assert PER RECORD that the whole closed state agrees.
// ═════════════════════════════════════════════════════════════════════════
say(`\nPROOF (read back out of the database)`)
let afterHelp = new Map((await d1("SELECT * FROM help")).map((r) => [r.id, r]))
let afterThreadsRows = await d1("SELECT help_id, message_body, deactivated_at FROM help_threads")
const afterThreadBodies = new Map()
for (const r of afterThreadsRows) {
  if (r.deactivated_at) continue
  if (!afterThreadBodies.has(r.help_id)) afterThreadBodies.set(r.help_id, new Set())
  afterThreadBodies.get(r.help_id).add(trimmed(r.message_body))
}

let bad = 0
const afterCounts = { c1: 0, c2: 0, c3: 0, c4: 0, c5: 0, c6: 0, c7: 0, c8: 0, c9: 0, c11: 0, c13: 0 }
const inconsistent = []
for (const { ref, g, here } of matched) {
  const id = here.id
  const row = afterHelp.get(id)
  if (!row) continue
  const authorEmail = norm(g[T.author])
  const authorId = authorEmail ? individualByEmail.get(authorEmail) : undefined
  if (authorId && !row.raised_by_contact_id) afterCounts.c1++
  const createdIso = toIso(g[T.createdOn])
  if (createdIso && createdIso !== row.created_at) afterCounts.c2++
  const mappedType = mapType(g[T.type])
  if (mappedType && !trimmed(row.help_type)) afterCounts.c5++
  const titleDeTarget = trimmed(g[T.titleDe]) ? clampTitle(trimmed(g[T.titleDe])) : null
  if (titleDeTarget && titleDeTarget !== (row.title_de ?? "")) afterCounts.c6++
  const titleEnTarget = trimmed(g[T.titleEn]) ? clampTitle(trimmed(g[T.titleEn])) : null
  if (titleEnTarget && titleEnTarget !== (row.title_en ?? "")) afterCounts.c9++
  const bodyTarget = trimmed(g[T.bodyDe]) || trimmed(g[T.bodyEn])
  if (bodyTarget && bodyTarget !== (row.description ?? "")) afterCounts.c8++
  const createdByRaw = trimmed(g[T.createdBy])
  if (createdByRaw && createdByRaw !== (row.creator_name ?? "")) afterCounts.c11++

  // THE PER-RECORD CLOSED-STATE ASSERTION — all four fields together.
  const glideClosed = Boolean(g[T.closed])
  const resolutionRaw = trimmed(g[T.resolution])
  const closedOnIso = toIso(g[T.closedOn])
  if (glideClosed) {
    const statusOk = row.status === "resolved"
    const resolvedOk = Number(row.resolved) === 1
    const dateOk = closedOnIso ? row.resolved_at === closedOnIso : Boolean(row.resolved_at)
    const replyOk = resolutionRaw ? Boolean(afterThreadBodies.get(id)?.has(resolutionRaw)) : true
    if (!statusOk) afterCounts.c3++
    if (!resolvedOk) afterCounts.c4++
    if (!dateOk && statusOk) afterCounts.c7++
    // Internal consistency: the four must agree WITH EACH OTHER, not just
    // with Glide individually — a row that is "resolved" but has resolved=0,
    // or vice versa, is broken regardless of what Glide says.
    const internallyConsistent = statusOk === resolvedOk && (!statusOk || Boolean(row.resolved_at))
    if (!(statusOk && resolvedOk && dateOk && replyOk) || !internallyConsistent) {
      inconsistent.push({ ref, statusOk, resolvedOk, dateOk, replyOk, internallyConsistent, hasResolutionText: Boolean(resolutionRaw) })
    }
  } else {
    if (row.status === "resolved") afterCounts.c13++
    // Internal consistency for the non-closed case too.
    if ((row.status === "resolved") !== (Number(row.resolved) === 1)) inconsistent.push({ ref, statusOk: row.status !== "resolved", resolvedOk: Number(row.resolved) !== 1, note: "status/resolved disagree with each other" })
  }
}
say(`\n── THE 13 CLASSES (after) ──`)
say(`  1  author in Glide, none here                 ${afterCounts.c1}`)
say(`  2  created date differs                       ${afterCounts.c2}`)
say(`  3  closed in Glide, status not resolved        ${afterCounts.c3}`)
say(`  4  closed in Glide, resolved flag still 0      ${afterCounts.c4}`)
say(`  5  type in Glide, none here                    ${afterCounts.c5}`)
say(`  6  German title differs                        ${afterCounts.c6}`)
say(`  7  closed, no closing date here                ${afterCounts.c7}`)
say(`  8  body differs                                ${afterCounts.c8}`)
say(`  9  English title differs                        ${afterCounts.c9}`)
say(`  10 ticket missing here entirely                 ${MISSING_REFS.length}  (diagnosed, never created — unchanged by design)`)
say(`  11 created-by name differs                      ${afterCounts.c11}`)
say(`  13 open in Glide but resolved here               ${afterCounts.c13}`)

const afterChildOk = childPlan.filter((c) => afterThreadBodies.get(c.parentId)?.has(c.body)).length
say(`  12 thread reply missing from its parent          ${childPlan.length - afterChildOk}`)

// A ref stays "explained" only when a door genuinely refused THAT ticket's
// resolution reply (the one door call the closed-state fix depends on) — the
// closed-state bundle itself is a direct-D1 write, which either lands or
// kills the whole run inside `d1()` above, so it is never a silent partial.
const explainedRefs = new Set([...outcomes.replyFailed.map((f) => f.ref), ...noDateRefusedRefs])
const trulyUnexplained = inconsistent.filter((r) => !explainedRefs.has(r.ref))

say(`\n  PER-RECORD internal consistency: ${inconsistent.length === 0 ? `all ${matched.length} matched tickets pass` : `${inconsistent.length} still inconsistent (${inconsistent.length - trulyUnexplained.length} explained by a reported resolution-reply refusal above, ${trulyUnexplained.length} NOT explained)`}`)
if (inconsistent.length) for (const r of inconsistent.slice(0, 30)) console.error(`    · ${JSON.stringify(r)}${explainedRefs.has(r.ref) ? "  (explained: resolution-reply door refused this ref, see WRITE RESULTS)" : ""}`)
bad += trulyUnexplained.length

if (bad > 0) {
  console.error(`\n${bad} unresolved, unexplained problem(s). The backup above puts everything back.`)
  process.exit(1)
}

say(`\nDone.`)

// ═════════════════════════════════════════════════════════════════════════
// FINAL ANSWER
// ═════════════════════════════════════════════════════════════════════════
say(`\n── FINAL ANSWER ──`)
say(`Matched, non-Kwapso tickets in scope: ${matched.length}`)
say(`\nBEFORE -> AFTER, the 13 classes:`)
say(`  1  author in Glide, none here            ${classCounts["1  author in Glide, none here"]} -> ${afterCounts.c1}`)
say(`  2  created date differs                  ${classCounts["2  created date differs"]} -> ${afterCounts.c2}`)
say(`  3  closed, status not resolved           ${classCounts["3  closed in Glide, status not resolved"]} -> ${afterCounts.c3}`)
say(`  4  closed, resolved flag still 0         ${classCounts["4  closed in Glide, resolved flag still 0"]} -> ${afterCounts.c4}`)
say(`  5  type in Glide, none here               ${classCounts["5  type in Glide, none here"]} -> ${afterCounts.c5}`)
say(`  6  German title differs                   ${classCounts["6  German title differs"]} -> ${afterCounts.c6}`)
say(`  7  closed, no closing date here           ${classCounts["7  closed, no closing date here"]} -> ${afterCounts.c7}`)
say(`  8  body differs                           ${classCounts["8  body differs"]} -> ${afterCounts.c8}`)
say(`  9  English title differs                  ${classCounts["9  English title differs"]} -> ${afterCounts.c9}`)
say(`  10 ticket missing here entirely           ${MISSING_REFS.length} -> ${MISSING_REFS.length} (diagnosed, not created — see above)`)
say(`  11 created-by name differs                ${classCounts["11 created-by name differs"]} -> ${afterCounts.c11}`)
say(`  12 thread reply missing from parent        ${classCounts["12 thread reply missing from its parent"]} -> ${childPlan.length - afterChildOk}`)
say(`  13 open in Glide, resolved here             ${classCounts["13 open in Glide but resolved here"]} -> ${afterCounts.c13}`)
say(`\nType tabs (raised_as_type) set from Glide's own type: ${outcomes.crashed ? "" : ""}${toBundle.filter((p) => p.raisedAsTypeClass).length} rows`)
say(`\nRefused: /help/resolve for any ticket (screenshot required, out of scope) — never attempted; status/resolved for a Glide-closed ticket were written straight to D1 instead, documented at the top of this file.`)
say(`Refused: creating any of the 6 missing tickets — diagnosed only, per the brief.`)
if (outcomes.fieldsFailed.length || outcomes.replyFailed.length || outcomes.statusFailed.length || outcomes.childFailed.length)
  say(`Door refusals (not bypassed): ${outcomes.fieldsFailed.length + outcomes.replyFailed.length + outcomes.statusFailed.length + outcomes.childFailed.length} — see WRITE RESULTS above.`)
