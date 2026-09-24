#!/usr/bin/env node
// Bring the TICKET HISTORY into line with Glide. STAGING only.
//
//   node scripts/glide-tickets-sync.mjs            # dry run, writes nothing
//   node scripts/glide-tickets-sync.mjs --confirm  # the real thing
//
// Reads glide/data/agency.tickets.json (2,167 rows) plus agency.apps.json,
// agency.modules.json and agency.customers.json to resolve Glide's row ids.
// Pattern and comment discipline copied from scripts/glide-apps-sync.mjs: the
// sign-in, the D1 REST helper, the backup, the dry-run/--confirm split, and
// the read-back proof are the same shape.
//
// Attachments (DQtbC/wBFxa) are NOT this script's job — a separate lane
// uploads the images. Nothing here reads or writes an attachment.
//
// ── THE JOIN ─────────────────────────────────────────────────────────────
//
// A Glide ticket's number (fGKgz) matches our `help.ref`, formatted T%04d
// (T0271 = 271). MATCH AND UPDATE IN PLACE — never create, never renumber. A
// numbered Glide ticket with no match here is REPORTED, not created, unless
// it is a thread child (below). An unnumbered, non-child Glide row has
// nothing to join on and is left alone entirely.
//
// ── THE STATUS MAPPING (read off shared/types.ts HELP_STATUSES and off the
//    live data before this was written — the report below says so too) ────
//
// `help.status` is one of six words in code: new, triaged, scheduled,
// in_progress, ready, resolved. Live data (24 Sep 2026, before this ran):
// new 432, triaged 13, in_progress 3, ready 2, resolved 1640 — "scheduled"
// exists in the vocabulary but nothing is ever seeded into it by hand, it is
// flipped automatically once work is in a sprint (lib/ready-flip).
//
// Glide's five booleans do NOT map five-to-one onto that list:
//   · Viepi (archived) is not a status at all — it is `help.archived_at`, a
//     separate flag, moved through POST /api/content/help/archive.
//   · 4D1DR (confirmed) is not a status either. It is the retired
//     "awaiting_validation" stage's other half — "the client said yes" — and
//     it survives only as a DATE, `help.validated_at` (63c4G), never as a
//     word `status` can hold (that stage was retired 7 Sep 2026).
//   · That leaves three real status words reachable from Glide, in priority
//     order (closed beats ready beats in progress, because a ticket that is
//     both closed and "ready" in Glide's looser bookkeeping is closed):
//       9v8Yu (closed)      → "resolved"
//       otTFj (ready)       → "ready"
//       MuEDI (in progress) → "in_progress"
//       none of the above   → left at "new" (our own default), because
//         "triaged" and "scheduled" are OUR workflow's own concepts —
//         somebody on duty read it, or work is in a sprint — that Glide
//         never tracked and this script has no business inventing.
//
// Moved through the ORDINARY door, POST /api/content/help/status, exactly as
// asked — NOT SQL. That door refuses "resolved" outright
// (`refuseDirectResolve`): a ticket is resolved by SENDING THE ANSWER, and
// the only door that can do that, POST /api/content/help/resolve, itself
// refuses to send without an attached screenshot image. Attachments are out
// of scope for this lane, so for the (small, bounded) set of tickets that
// need to MOVE to resolved and are not there already, this script attempts
// the ordinary door as instructed, is refused, and REPORTS the refusal
// rather than reaching for SQL or a fabricated attachment. `resolved_at` /
// `resolver_name` are still written from Glide's own record (see DATES
// below) — the historical fact survives even where the live status could
// not be moved without a picture nobody was asked to supply.
//
// The reverse case — a ticket already resolved here (from an earlier, and
// evidently unreliable, seed) that Glide's own record says was never closed
// — has no such obstacle: the door has no rule against moving a ticket OFF
// resolved, so those are reopened to match Glide, the way "bring the history
// into line with Glide" says they should be.
//
// ── ACCOUNT (CLIENT) REASSIGNMENT ────────────────────────────────────────
//
// `updateTicket` (workers/content/src/lib/help.ts) refuses outright to move
// a ticket that already carries a client to a DIFFERENT one (409
// `account_fixed`) — deliberately: "that would retroactively take a
// conversation away from the people reading it and hand it, replies and
// all, to strangers... a deliberate feature with a confirm panel, not a
// quiet field on an edit form." A meaningful slice of the matched tickets
// here already carry an account that disagrees with Glide's own customer
// (see the report), which looks like leftover noise from an earlier bulk
// seed rather than a real assignment — but the door's protection does not
// know that, and this script does not override it with SQL. Where the
// existing account disagrees with Glide, `accountId` is simply left out of
// the update (every OTHER field still updates normally) and the conflict is
// reported by ref.
//
// ── EMAIL DURING A HISTORICAL IMPORT ─────────────────────────────────────
//
// POST /api/content/help/reply always tries to notify the raiser
// (`notifyReplyAndMentions`, workers/content/src/lib/notify.ts) — exactly
// right for a live reply, and exactly wrong for re-adding a conversation
// from 2024. The team's own automation switch exists for precisely this
// (`shared/automations.ts`, "tickets.reply-email"); this script reads its
// current state, switches it OFF for the span of the reply-writing phase
// only if it was on, and restores it in a `finally` no matter how the run
// ends.
//
// ── WHAT DOES NOT GO THROUGH THE FRONT DOOR ──────────────────────────────
//
// created_at / creator_name, updated_at / editor_name, resolved_at /
// resolver_name, validated_at, archived_at / archiver_name — no door accepts
// any of these, same exception as glide-apps-sync/glide-accounts-sync, for
// the same reason, written straight to D1 as the LAST touch on each row
// (AFTER every door write on it — a door write stamps `updated_at`, exactly
// the trap glide-accounts-sync's own header explains). Every `*_id`/`*_email`
// column beside a NAME this script writes from Glide is NULLed in the same
// statement (glide-accounts-sync's argument, verbatim: those people are not
// users of this system, and an id belonging to somebody else beside a
// stranger's name is a lie the UI can act on).
//
// ── THE TWO CONTACTS ─────────────────────────────────────────────────────
//
// The owner's instruction, verbatim: "create those contacts, associate to
// account, and archive them" — jp@looom.at and anna.stingl@pkfhospitality.com.
// Neither resolves against our accounts by email (17 raiser emails across
// non-Kwapso tickets don't; these two are 8 of those 17). Created as ordinary
// individual accounts (POST /api/tenancy/accounts), linked to the client
// their Glide contact/ticket record names (POST /api/tenancy/accounts/links),
// then ARCHIVED — the owner's own word, and there is a door for exactly that
// word since 22 Sep 2026 (POST /api/tenancy/accounts/archived), distinct from
// "Inactive" (POST /api/tenancy/accounts/active). The other two unresolved
// addresses, aurora@kwapso.com and mm@kwapso.com, are internal — left empty,
// reported by count, per the owner's instruction.
//
// ── THE THREAD CHILDREN ───────────────────────────────────────────────────
//
// 89 Glide tickets carry HpU8W, a pointer at another ticket: they are
// replies, not tickets. Added as a reply on the PARENT (found via the
// child's HpU8W → the parent Glide row → the parent's own number → our
// ref), body from LLlko (falling back to 4mMrT), dated from the child's own
// 72pZY. Ten of them (T2875, T2876, T3018, T3343, T3345, T3346, T3348,
// T3349, T3351, T3528) were wrongly imported as their OWN ticket; once their
// reply exists on the real parent, those ten are ARCHIVED (never deleted)
// through the ordinary archive door and are excluded from the main ticket
// sync above (there is nothing to bring "into line" on a row about to become
// a message).
//
// ── KWAPSO, BOTH DIRECTIONS ───────────────────────────────────────────────
//
// No Glide row belonging to Glide's own "Kwapso System" / "Kwapso Portal"
// apps is ever read for a write, and no ticket whose OUR-SIDE account_id is
// our Kwapso account is ever written, even if it happens to match a
// non-Kwapso Glide app (data does not always agree with itself). Proved in
// the read-back by comparing every Kwapso-account help row before and after.

import { readFileSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { makeApi, timedFetch } from "./lib/api.mjs"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const CONFIRM = process.argv.includes("--confirm")
const BASE = "https://agency-staging.kwapso.app"
const OWNER = process.env.SEED_OWNER_EMAIL || "aurora@kwapso.com"
const CONCURRENCY = 8

const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8").split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/#.*$/, "").trim()])
)
const TEST_KEY = process.env.TEST_LOGIN_KEY || env.TEST_LOGIN_KEY
for (const [k, v] of [["TEST_LOGIN_KEY", TEST_KEY], ["CLOUDFLARE_ACCOUNT_ID", env.CLOUDFLARE_ACCOUNT_ID], ["CLOUDFLARE_API_TOKEN", env.CLOUDFLARE_API_TOKEN]])
  if (!v) { console.error(`Stopped: ${k} is not available.`); process.exit(2) }

const say = (...a) => console.log(...a)
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")
const trimmed = (v) => { const s = String(v ?? "").trim(); return s.length ? s : "" }
const toIso = (raw) => {
  if (!raw) return null
  const ms = Date.parse(String(raw))
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null
}
// R87 (title-length): the door refuses a title over TITLE_MAX_CHARS (50)
// outright rather than truncating it. 213 German / 162 English Glide titles
// among the matched tickets are longer than that, so this script truncates
// before sending — the way every one-line title renderer in the app already
// displays a longer, pre-existing title — and reports how many it touched.
const TITLE_MAX_CHARS = 50
const clampTitle = (s) => (s.length > TITLE_MAX_CHARS ? s.slice(0, TITLE_MAX_CHARS - 1) + "…" : s)

/** Bounded concurrency: run `worker(item)` for every item in `items`, at most
 * `n` in flight, in order of completion (not of input). 2,167 tickets is a
 * lot of round trips — this is the whole of what keeps them from either
 * serialising for ten minutes or opening two thousand sockets at once. */
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

// ── Glide column maps (the owner supplied these today; authoritative) ──────
const T = {
  titleDe: "qQIlW", body: "LLlko", titleEn: "hw0p3", bodyEn: "4mMrT",
  number: "fGKgz", type: "iUxUL", resolution: "vDNz5",
  inProgress: "MuEDI", ready: "otTFj", closed: "9v8Yu", confirmed: "4D1DR", archived: "Viepi",
  author: "Gehuq", threadOf: "HpU8W", appId: "yfSX5", customerId: "1IIIp", moduleId: "URmJs",
  createdOn: "72pZY", createdBy: "8UuXw", lastEdited: "Pg2f1", lastEditedBy: "f4XNi",
  closedOn: "FGyEf", closedBy: "UBIqM", confirmedOn: "63c4G", confirmedBy: "WYFvG",
  archivedOn: "kbvaW", archivedBy: "JSNl4",
}
const APP_NAME = "0Q1H5"
const MODULE_NAME = "Name", MODULE_APP = "1Ps1B"
const CUSTOMER_NAME = "LoM8i"
const norm2 = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim() // word-preserving, for the Kwapso name check below
const SKIP_APPS = new Set(["kwapso system", "kwapso portal"].map(norm2))
// NO RENAME TABLE HERE, unlike glide-apps-sync: Glide's own apps.json already
// spells the app "Platinum" (checked directly), not "ERP Kennogroup" — that
// rename was apps-sync's own concern for OUR app's name, not Glide's.

// Glide's word → ours. "Request" folded into "Extra" 15 Sep 2026 (shared/
// types.ts); "Requirements" was deleted outright the same day — a ticket
// carrying it is left with whatever type it already has, never given a
// fifth word the app's own lock (shared/ticket-types.ts) refuses.
const TICKET_TYPE = { issue: "Issue", question: "Question", extra: "Extra", request: "Extra" }

// The ten thread children that were wrongly imported as their own ticket —
// added as a reply on their real parent, then archived here, never deleted.
const ARCHIVE_AS_MESSAGE = new Set(["T2875", "T2876", "T3018", "T3343", "T3345", "T3346", "T3348", "T3349", "T3351", "T3528"])

// The two contacts the owner named, verbatim. Neither has its own row in
// agency.contacts.json under this email (Anna's contact row there uses a
// different domain, @196plus.com — this is the address she actually raised
// tickets from); jp@looom.at has no contacts.json row at all, so the name is
// inferred from the local part of the address — reported as such.
const NEW_CONTACTS = [
  { email: "jp@looom.at", name: "JP", company: "Looom", nameInferred: true },
  { email: "anna.stingl@pkfhospitality.com", name: "Anna Stingl", company: "196+", nameInferred: false },
]

const load = (n) => { const a = JSON.parse(readFileSync(resolve(ROOT, `glide/data/agency.${n}.json`), "utf8")); return Array.isArray(a) ? a : (a.rows ?? a.data ?? []) }
const gTickets = load("tickets")
const gApps = load("apps"), gModules = load("modules"), gCustomers = load("customers")
const gAppName = new Map(gApps.map((r) => [r.$rowID, trimmed(r[APP_NAME])]))
const gModule = new Map(gModules.map((r) => [r.$rowID, { name: trimmed(r[MODULE_NAME]), app: r[MODULE_APP] }]))
const gCustName = new Map(gCustomers.map((r) => [r.$rowID, trimmed(r[CUSTOMER_NAME])]))
const gTicketById = new Map(gTickets.map((r) => [r.$rowID, r]))
const isKwapsoGlideApp = (appRowId) => SKIP_APPS.has(norm2(gAppName.get(appRowId) ?? ""))
say(`Glide: ${gTickets.length} tickets, ${gApps.length} apps, ${gModules.length} modules, ${gCustomers.length} customers`)

// ── sign in ──────────────────────────────────────────────────────────────
const api = makeApi(BASE)
/** A door POST, retried on 429 only — "that's a lot of requests at once…
 * nothing was lost", the exact case `timedFetch`'s own retry does not cover
 * (it retries when NO answer came back; a 429 is an answer). Nine bounded-
 * concurrency lanes over ~1,900 tickets hit this for real on the first live
 * run; three tries with a short, doubling pause is enough to clear it. */
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
await api("/api/tenancy/switch-team", { method: "POST", body: JSON.stringify({ teamId: team.id }) }, cookie)
say(`Signed in as ${OWNER}, team "${team.name}"`)

// ── the team database ───────────────────────────────────────────────────
const dbs = await (await timedFetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database?per_page=100`,
  { headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` } })).json()
const found = (dbs.result ?? []).find((d) => d.name === `team-${team.id.toLowerCase()}`)
if (!found) { console.error("Stopped: team database not found."); process.exit(1) }
const d1 = async (sql, params) => {
  const r = await timedFetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${found.uuid}/query`,
    { method: "POST", headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(params ? { sql, params } : { sql }) })
  const b = await r.json()
  if (!b.success) { console.error("D1 refused:", JSON.stringify(b.errors), "\nSQL:", sql.slice(0, 300)); process.exit(1) }
  return b.result?.[0]?.results ?? []
}
const q = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`)
say(`Team database: team-${team.id.toLowerCase()}`)

// ── who is Kwapso, and what is here now ─────────────────────────────────
const kwapsoAccountId = (await d1("SELECT id FROM accounts WHERE name = 'Kwapso' AND account_type = 'entity'"))[0]?.id ?? ""
const ourApps = await d1("SELECT id, name FROM apps")
const ourAppByNorm = new Map(ourApps.map((a) => [norm(a.name), a.id]))
const ourMods = await d1("SELECT id, app_id, name FROM app_modules")
const ourModKey = new Map(ourMods.map((m) => [`${m.app_id}|${norm(m.name)}`, m.id]))
const ourAccountsEntity = await d1("SELECT id, name FROM accounts WHERE account_type = 'entity'")
const ourAccByNorm = new Map(ourAccountsEntity.map((a) => [norm(a.name), a.id]))
let ourContactsByEmail = new Map(
  (await d1("SELECT id, email FROM accounts WHERE account_type = 'individual' AND email IS NOT NULL"))
    .map((c) => [c.email.toLowerCase().trim(), c.id])
)
const accountLinkPairs = new Set(
  (await d1("SELECT person_account_id, account_id FROM account_links WHERE deactivated_at IS NULL"))
    .map((l) => `${l.person_account_id}|${l.account_id}`)
)
const ourHelp = await d1("SELECT * FROM help")
const byRef = new Map(ourHelp.map((r) => [r.ref, r]))
const threadBodies = new Map() // help_id -> Set(trimmed message_body)
for (const r of await d1("SELECT help_id, message_body FROM help_threads WHERE deactivated_at IS NULL")) {
  if (!threadBodies.has(r.help_id)) threadBodies.set(r.help_id, new Set())
  threadBodies.get(r.help_id).add(trimmed(r.message_body))
}
say(`Ours: ${ourHelp.length} help rows, ${ourApps.length} apps, ${ourMods.length} modules, ${ourAccountsEntity.length} entity accounts, ${ourContactsByEmail.size} individual accounts with an email, Kwapso = ${kwapsoAccountId || "(not found)"}`)

// ── the backup, before anything (dry run included) ──────────────────────
const stamp = new Date().toISOString().replace(/[:.]/g, "-")
const backup = { takenAt: new Date().toISOString(), help: ourHelp, help_threads: await d1("SELECT * FROM help_threads") }
const backupPath = resolve(ROOT, `glide/backup-tickets-${stamp}.json`)
writeFileSync(backupPath, JSON.stringify(backup, null, 1))
say(`Backup: ${backupPath.replace(ROOT + "/", "")}  (${backup.help.length} help rows, ${backup.help_threads.length} thread rows)`)
const kwapsoBefore = ourHelp.filter((r) => r.account_id === kwapsoAccountId)

// ═════════════════════════════════════════════════════════════════════════
// PHASE 1 — THE TWO CONTACTS
// ═════════════════════════════════════════════════════════════════════════
const contactPlan = NEW_CONTACTS.map((c) => {
  const already = ourContactsByEmail.get(c.email)
  const accountId = ourAccByNorm.get(norm(c.company))
  return { ...c, already, accountId }
})
say(`\nPLAN — the two contacts`)
for (const c of contactPlan) {
  if (c.already) say(`  · ${c.email} already exists here (${c.already}) — left alone`)
  else if (!c.accountId) say(`  · REFUSED ${c.email} — its company "${c.company}" isn't one of our accounts`)
  else say(`  · CREATE ${c.name}${c.nameInferred ? " (name inferred — no contacts.json row)" : ""} <${c.email}>, link to ${c.company}, archive`)
}

async function must(res, what) {
  if (!res.ok) { console.error(`  FAILED ${what} — ${res.status} ${JSON.stringify(res.body)?.slice(0, 200)}`); return null }
  return res
}

const contactsCreated = []
if (CONFIRM) {
  for (const c of contactPlan) {
    if (c.already || !c.accountId) continue
    const create = await must(await doorPost("/api/tenancy/accounts", { accountType: "individual", name: c.name, email: c.email }), `create contact ${c.email}`)
    if (!create) continue
    const id = create.body.id
    const link = await must(await doorPost("/api/tenancy/accounts/links", { accountId: c.accountId, personAccountId: id }), `link ${c.email} to ${c.company}`)
    const arch = await must(await doorPost("/api/tenancy/accounts/archived", { id, archived: true }), `archive ${c.email}`)
    if (link && arch) {
      contactsCreated.push({ ...c, id })
      ourContactsByEmail.set(c.email, id)
      // The Phase-2 raisedByContactId check reads this same set (`accountLinkPairs`,
      // loaded once from D1 above, BEFORE this loop runs) to decide whether a
      // contact is provably a contact of the ticket's account — a link this
      // script just created is exactly as real as one that predates the run,
      // and the first live pass proved it: seven of Anna's own tickets were
      // refused by the door ("That person isn't a contact at this client")
      // because this set did not yet know about the link created two lines up.
      accountLinkPairs.add(`${id}|${c.accountId}`)
      say(`  created ${c.email} → ${id}, linked to ${c.company}, archived`)
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════
// PHASE 2 — BUILD THE TICKET PLAN
// ═════════════════════════════════════════════════════════════════════════
let kwapsoGlideSkipped = 0, unnumbered = 0, unmatched = [], kwapsoOursSkipped = 0
let deferredToThread = 0
const matched = []

// GLIDE'S OWN NUMBERS ARE NOT UNIQUE. Fourteen numbers carry two or three
// rows apiece (checked directly against agency.tickets.json, not assumed):
// some are plain duplicate export rows of the SAME ticket (identical app and
// title — T2499/2500/2506/2807/2832/2834/2835/2836), the rest are GENUINELY
// DIFFERENT tickets, from different apps, that happen to share a number in
// Glide's own bookkeeping (T0777 is a CONFIA "Vertrag filtern" AND a 196+
// "Profitability visibility"; T1140/1142/1143 collide Looom against 196+;
// T2857 collides three ways; T3619 collides two different requests on the
// same app). Iterating `gTickets` directly the first time round let two rows
// for one ref race each other through the SAME ticket concurrently — the
// live proof caught it as ten refs that "would not land" no matter how many
// times the run repeated, because each repeat picked a different winner.
// DUPLICATE (same app + same title): merged, silently — same ticket,
// multiple export rows — keeping the RICHEST one (most resolution text, tie-
// broken by which one carries a creation date at all). GENUINE COLLISION
// (different app or title): neither row is written. Nothing here is enough
// to say which one is really T-that-number; it is reported by ref with every
// candidate title so the owner can settle it, the same discipline this
// script applies to an account it cannot safely reassign.
const byNumber = new Map()
for (const g of gTickets) {
  if (isKwapsoGlideApp(g[T.appId])) { kwapsoGlideSkipped++; continue }
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
  // TITLE ONLY, DELIBERATELY NOT appId TOO — checked directly against the
  // data: T2499/2500/2506/2807/2832/2834/2835/2836 all carry byte-identical
  // titles AND descriptions on both rows, yet each pair's `yfSX5` names a
  // DIFFERENT Glide app row. Both resolve to a display name of "Fuhrpark",
  // and one of the two ($rowID 98JHUi13QiehisjbQzw7Kw) is a near-empty stub
  // (no `about`, no context, a different customer id) beside the real one
  // (LFZdkcN6Sgm1S5W7SmOCjg, HOGO's actual Fuhrpark) — a second, dead app row
  // in Glide's own table, not a second ticket. Gating on appId as well made
  // every one of those eight read as a "collision" and dropped real content
  // this script was asked to bring across. Title is the signal that
  // distinguishes them correctly against every one of the fourteen: the six
  // genuine collisions (T0777, T1140, T1142, T1143, T2857, T3619) all carry
  // DIFFERENT titles on their colliding rows.
  const sameTicket = rows.every((r) => trimmed(r[T.titleDe]) === trimmed(rows[0][T.titleDe]))
  if (sameTicket) {
    const richest = [...rows].sort((a, b) => (trimmed(b[T.resolution]).length - trimmed(a[T.resolution]).length) || (Boolean(b[T.createdOn]) - Boolean(a[T.createdOn])))[0]
    gByRef.set(ref, richest)
  } else {
    numberCollisions.push({ ref, candidates: rows.map((r) => `${gAppName.get(r[T.appId]) ?? "?"} · "${trimmed(r[T.titleDe]) || trimmed(r[T.titleEn])}"`) })
    // gByRef intentionally left without this ref — neither row is written.
  }
}

for (const [ref, g] of gByRef) {
  const here = byRef.get(ref)
  if (!here) { unmatched.push(ref); continue }
  if (here.account_id === kwapsoAccountId) { kwapsoOursSkipped++; continue }
  if (ARCHIVE_AS_MESSAGE.has(ref)) { deferredToThread++; continue } // handled as a thread child only

  // ── author (section 1) ──
  const authorEmail = trimmed(g[T.author]).toLowerCase()
  const authorId = authorEmail ? ourContactsByEmail.get(authorEmail) : undefined

  // ── fields (section 2) — only a field Glide actually has a value for ──
  const fields = {}
  // COMPARED AFTER CLAMPING, NOT BEFORE — the bug the second live run's own
  // "field updates to send" count would not converge on: a title over
  // TITLE_MAX_CHARS is sent truncated (R87), so `here.title_de` reads back
  // the CLAMPED form for ever after. Diffing the raw Glide text against that
  // stored value never once agreed, even the run immediately after the
  // truncated title had already landed — the plan re-sent the same thirteen
  // titles on every single run, correctly, pointlessly, for ever.
  const titleDeRaw = trimmed(g[T.titleDe]), titleEnRaw = trimmed(g[T.titleEn])
  let titleTruncated = false
  if (titleDeRaw) {
    const c = clampTitle(titleDeRaw)
    if (c !== titleDeRaw) titleTruncated = true
    if (c !== here.title_de) fields.titleDe = c
  }
  if (titleEnRaw) {
    const c = clampTitle(titleEnRaw)
    if (c !== titleEnRaw) titleTruncated = true
    if (c !== here.title_en) fields.titleEn = c
  }
  const descRaw = trimmed(g[T.body]) || trimmed(g[T.bodyEn])
  if (descRaw && descRaw !== here.description) fields.description = descRaw

  const appNm = gAppName.get(g[T.appId]) ?? ""
  const resolvedAppId = appNm ? (ourAppByNorm.get(norm(appNm)) ?? null) : null
  let appMissing = Boolean(appNm) && !resolvedAppId
  if (resolvedAppId && resolvedAppId !== here.app_id) fields.appId = resolvedAppId

  let moduleMissing = false
  const modRef = g[T.moduleId] ? gModule.get(g[T.moduleId]) : null
  if (modRef && modRef.name) {
    const effAppId = resolvedAppId || here.app_id
    if (effAppId) {
      const modId = ourModKey.get(`${effAppId}|${norm(modRef.name)}`)
      if (modId) { if (modId !== here.module_id) fields.moduleId = modId }
      else moduleMissing = true
    }
  }

  const custNm = gCustName.get(g[T.customerId]) ?? ""
  const resolvedAccountId = custNm ? (ourAccByNorm.get(norm(custNm)) ?? null) : null
  let accountConflict = false
  if (resolvedAccountId) {
    if (!here.account_id) fields.accountId = resolvedAccountId
    else if (resolvedAccountId !== here.account_id) accountConflict = true
    // else: already the same account, nothing to send
  }
  const effectiveAccountId = fields.accountId ?? here.account_id ?? null

  const typeRaw = norm(trimmed(g[T.type]))
  const mappedType = typeRaw ? TICKET_TYPE[typeRaw] : undefined
  let typeUnmapped = Boolean(typeRaw) && !mappedType
  if (mappedType && mappedType !== here.help_type) fields.helpType = mappedType

  // raised_by_contact_id can only ride the SAME /update call as accountId —
  // the door checks the contact against the account the ticket WILL have,
  // so it is only sent when the pair is provably linked (or is the account
  // itself, the door's other branch).
  if (authorId && effectiveAccountId && authorId !== here.raised_by_contact_id) {
    if (authorId === effectiveAccountId || accountLinkPairs.has(`${authorId}|${effectiveAccountId}`)) {
      fields.raisedByContactId = authorId
    }
  }

  // ── status (section 3) ──
  let targetStatus = "new"
  if (g[T.closed]) targetStatus = "resolved"
  else if (g[T.ready]) targetStatus = "ready"
  else if (g[T.inProgress]) targetStatus = "in_progress"
  const statusMove = targetStatus !== here.status ? targetStatus : null

  // ── archive flag (Viepi), a door of its own, not a status ──
  const archiveMove = Boolean(g[T.archived]) && !here.archived_at

  // ── dates, straight to D1 (section 4) ──
  const dates = {}
  const createdOn = toIso(g[T.createdOn]); if (createdOn) { dates.created_at = createdOn; dates.creator_name = trimmed(g[T.createdBy]) || null }
  const lastEdited = toIso(g[T.lastEdited]); if (lastEdited) { dates.updated_at = lastEdited; dates.editor_name = trimmed(g[T.lastEditedBy]) || null }
  const closedOn = toIso(g[T.closedOn]); if (closedOn) { dates.resolved_at = closedOn; dates.resolver_name = trimmed(g[T.closedBy]) || null }
  const confirmedOn = toIso(g[T.confirmedOn]); if (confirmedOn) dates.validated_at = confirmedOn
  const archivedOn = toIso(g[T.archivedOn]); if (archivedOn && g[T.archived]) { dates.archived_at = archivedOn; dates.archiver_name = trimmed(g[T.archivedBy]) || null }

  // ── the resolution message (section 5) ──
  const resolutionBody = trimmed(g[T.resolution])
  let resolutionPlan = null
  if (resolutionBody) {
    const already = threadBodies.get(here.id)?.has(resolutionBody)
    resolutionPlan = { body: resolutionBody, date: closedOn, already: Boolean(already) }
  }

  matched.push({
    ref, id: here.id, before: here, fields, statusMove, archiveMove, dates,
    resolutionPlan, accountConflict, moduleMissing, appMissing, typeUnmapped, titleTruncated,
    authorEmail, authorResolved: Boolean(authorId),
  })
}

// ── PHASE 3 — thread children ──
const childRows = gTickets
  .filter((g) => g[T.threadOf] && !isKwapsoGlideApp(g[T.appId]))
  .sort((a, b) => new Date(a[T.createdOn] || 0) - new Date(b[T.createdOn] || 0))
const childPlan = []
let childParentMissing = 0, childKwapsoSkipped = 0
for (const c of childRows) {
  const parent = gTicketById.get(c[T.threadOf])
  const parentNum = parent?.[T.number]
  if (!parent || parentNum === null || parentNum === undefined || parentNum === "") { childParentMissing++; continue }
  if (isKwapsoGlideApp(parent[T.appId])) { childKwapsoSkipped++; continue }
  const parentRef = "T" + String(parentNum).padStart(4, "0")
  const parentHere = byRef.get(parentRef)
  if (!parentHere) { childParentMissing++; continue }
  if (parentHere.account_id === kwapsoAccountId) { childKwapsoSkipped++; continue }
  const body = trimmed(c[T.body]) || trimmed(c[T.bodyEn])
  if (!body) continue
  const num = c[T.number]
  const ownRef = num !== null && num !== undefined && num !== "" ? "T" + String(num).padStart(4, "0") : null
  const already = threadBodies.get(parentHere.id)?.has(body)
  childPlan.push({
    parentRef, parentId: parentHere.id, body, date: toIso(c[T.createdOn]),
    already: Boolean(already), ownRef, archiveOwnRef: ownRef && ARCHIVE_AS_MESSAGE.has(ownRef) ? ownRef : null,
  })
}

// ═════════════════════════════════════════════════════════════════════════
// PRINT THE PLAN
// ═════════════════════════════════════════════════════════════════════════
const statusCounts = {}
for (const m of matched) if (m.statusMove) statusCounts[m.statusMove] = (statusCounts[m.statusMove] || 0) + 1
const resolvedBlocked = matched.filter((m) => m.statusMove === "resolved")
const accountConflicts = matched.filter((m) => m.accountConflict)
const moduleMissing = matched.filter((m) => m.moduleMissing)
const authorsSet = matched.filter((m) => m.fields.raisedByContactId).length
const authorsUnresolved = matched.filter((m) => !m.authorResolved && m.authorEmail).length
const fieldsCalls = matched.filter((m) => Object.keys(m.fields).length > 0).length
const dateWrites = matched.filter((m) => Object.keys(m.dates).length > 0).length
const resolutionToAdd = matched.filter((m) => m.resolutionPlan && !m.resolutionPlan.already).length
const resolutionSkipped = matched.filter((m) => m.resolutionPlan && m.resolutionPlan.already).length
const archiveMoves = matched.filter((m) => m.archiveMove).length
const titleTruncations = matched.filter((m) => m.titleTruncated).length
const typeUnmappedCount = matched.filter((m) => m.typeUnmapped).length
const childrenToAdd = childPlan.filter((c) => !c.already).length
const childrenSkipped = childPlan.filter((c) => c.already).length
const childrenToArchive = childPlan.filter((c) => c.archiveOwnRef).length

say(`\nPLAN — tickets`)
say(`  matched (non-Kwapso)        ${matched.length}`)
say(`  Kwapso, Glide side skipped  ${kwapsoGlideSkipped}`)
say(`  Kwapso, our side skipped    ${kwapsoOursSkipped}`)
say(`  unnumbered (not a join key) ${unnumbered}`)
say(`  unmatched refs (reported)   ${unmatched.length}${unmatched.length ? "  e.g. " + unmatched.slice(0, 8).join(", ") : ""}`)
say(`  Glide number collisions — two different tickets share one number, NEITHER written (reported) ${numberCollisions.length}`)
for (const c of numberCollisions) say(`    · ${c.ref}: ${c.candidates.join("  vs.  ")}`)
say(`  deferred to thread-child pass (the 10) ${deferredToThread}`)
say(`  field updates to send       ${fieldsCalls}`)
say(`    · titles truncated to ${TITLE_MAX_CHARS} chars (R87)  ${titleTruncations}`)
say(`    · ticket type not carried (Requirements/blank) ${typeUnmappedCount}`)
say(`    · module named in Glide, no match here ${moduleMissing.length}`)
say(`    · account conflict — REFUSED to move (door protects an assigned ticket) ${accountConflicts.length}${accountConflicts.length ? "  e.g. " + accountConflicts.slice(0, 6).map((m) => m.ref).join(", ") : ""}`)
say(`  authors set (raised_by_contact_id)  ${authorsSet}`)
say(`  authors left empty (internal/unmatched email) ${authorsUnresolved}`)
say(`  status moves via the ordinary door: ${JSON.stringify(statusCounts)}`)
say(`    · of which "resolved" — WILL BE REFUSED (screenshot required, out of scope) ${resolvedBlocked.length}`)
say(`  archive moves (Viepi)       ${archiveMoves}`)
say(`  rows getting a direct-D1 date write ${dateWrites}`)
say(`  resolution replies to add   ${resolutionToAdd}  (already present, skipped: ${resolutionSkipped})`)
say(`\nPLAN — thread children (89 rows carry HpU8W)`)
say(`  replies to add on parent    ${childrenToAdd}  (already present, skipped: ${childrenSkipped})`)
say(`  parent not found/Kwapso     ${childParentMissing + childKwapsoSkipped}`)
say(`  of which archived afterward (the ten wrongly-imported ones) ${childrenToArchive}`)

if (!CONFIRM) {
  say(`\nDry run. Nothing written. Add --confirm.`)
  process.exit(0)
}

// ═════════════════════════════════════════════════════════════════════════
// WRITE
// ═════════════════════════════════════════════════════════════════════════
say(`\nWRITING`)

// The team's own switch for "somebody answered, email them" — off for the
// span of this run's reply-writing only, restored in `finally` regardless of
// how the run ends. A historical import is not a live reply.
const autoBefore = (await api("/api/tenancy/config/automations", {}, cookie)).body?.automations ?? {}
let replyEmailWasOn = true
try {
  const ticketsSettings = JSON.parse(autoBefore.tickets || "{}")
  replyEmailWasOn = ticketsSettings["tickets.reply-email"] !== "off"
} catch { /* unreadable blob reads as "on", the safe default */ }
if (replyEmailWasOn) {
  await must(await api("/api/tenancy/config/automations", { method: "POST", body: JSON.stringify({ key: "tickets.reply-email", on: false }) }, cookie), "switch off tickets.reply-email")
  say(`  switched OFF tickets.reply-email for this run`)
} else {
  say(`  tickets.reply-email was already off`)
}

const outcomes = { fieldsOk: 0, fieldsFailed: [], statusOk: 0, statusRefusedResolved: [], statusFailed: [],
  archiveOk: 0, archiveFailed: [], datesOk: 0, resolutionAdded: 0, resolutionFailed: [], crashed: [] }

try {
  await pool(matched, CONCURRENCY, async (m) => { try {
    // 1) fields
    if (Object.keys(m.fields).length > 0) {
      const body = { id: m.id, description: m.fields.description ?? m.before.description, ...m.fields }
      const res = await doorPost("/api/content/help/update", body)
      if (res.ok) outcomes.fieldsOk++
      else outcomes.fieldsFailed.push({ ref: m.ref, status: res.status, message: res.body?.message })
    }
    // 2) status
    if (m.statusMove) {
      const res = await doorPost("/api/content/help/status", { id: m.id, status: m.statusMove })
      if (res.ok) outcomes.statusOk++
      else if (m.statusMove === "resolved") outcomes.statusRefusedResolved.push(m.ref)
      else outcomes.statusFailed.push({ ref: m.ref, status: res.status, message: res.body?.message })
    }
    // 3) archive (Viepi)
    if (m.archiveMove) {
      const res = await doorPost("/api/content/help/archive", { id: m.id, archived: true })
      if (res.ok) outcomes.archiveOk++
      else outcomes.archiveFailed.push({ ref: m.ref, status: res.status, message: res.body?.message })
    }
    // 4) the resolution reply, then its real date
    if (m.resolutionPlan && !m.resolutionPlan.already) {
      const replyRes = await doorPost("/api/content/help/reply", { helpId: m.id, body: m.resolutionPlan.body })
      if (replyRes.ok) {
        outcomes.resolutionAdded++
        const replies = replyRes.body?.replies ?? []
        const added = [...replies].reverse().find((r) => trimmed(r.body) === m.resolutionPlan.body)
        if (!threadBodies.has(m.id)) threadBodies.set(m.id, new Set())
        threadBodies.get(m.id).add(m.resolutionPlan.body)
        if (added && m.resolutionPlan.date) {
          await doorPost("/api/content/help/reply/update", { id: added.id, createdAt: m.resolutionPlan.date })
        }
      } else {
        outcomes.resolutionFailed.push({ ref: m.ref, status: replyRes.status, message: replyRes.body?.message })
      }
    }
  } catch (e) { outcomes.crashed.push({ ref: m.ref, message: String(e?.message ?? e) }) }
  }, (done, total) => say(`  tickets: ${done}/${total}`))

  // ── thread children ──
  //
  // ORDER IS LOAD-BEARING, and it is the reason the direct-D1 date write below
  // is a SEPARATE, LAST pass rather than the final step inside the loop above
  // — it used to be, and the first live run's own read-back proof caught it:
  // POST /api/content/help/reply bumps `help.updated_at` as a side effect (the
  // door's own re-sort-to-top, `workers/content/src/lib/help.ts`'s `addReply`,
  // `UPDATE help SET updated_at = ? WHERE id = ...`). A parent ticket that had
  // its historical date written in THIS pass, and then received a thread-
  // child's reply in the pass below, had that date overwritten with "now" —
  // exactly the trap glide-accounts-sync's own header already named for a
  // different door. So every reply — the resolution message above AND every
  // thread child below — is added FIRST, and the date write is now the very
  // last thing this script does to any `help` row, over the whole set.
  const childOutcomes = { added: 0, failed: [], archived: 0, archiveFailed: [], crashed: [] }
  await pool(childPlan.filter((c) => !c.already), CONCURRENCY, async (c) => { try {
    const replyRes = await doorPost("/api/content/help/reply", { helpId: c.parentId, body: c.body })
    if (!replyRes.ok) { childOutcomes.failed.push({ parentRef: c.parentRef, status: replyRes.status, message: replyRes.body?.message }); return }
    childOutcomes.added++
    const replies = replyRes.body?.replies ?? []
    const added = [...replies].reverse().find((r) => trimmed(r.body) === c.body)
    if (added && c.date) {
      await doorPost("/api/content/help/reply/update", { id: added.id, createdAt: c.date })
    }
  } catch (e) { childOutcomes.crashed.push({ parentRef: c.parentRef, message: String(e?.message ?? e) }) }
  }, (done, total) => say(`  thread children: ${done}/${total}`))

  // THE TEN, ARCHIVED — its OWN pass, deliberately NOT folded into the reply
  // loop above. It used to be: `if (c.archiveOwnRef)` sat inside the same
  // worker as adding the reply, which only ever RAN for a child whose reply
  // was still missing (`childPlan.filter((c) => !c.already)`) — so the very
  // first live run, which added the ten replies, also archived their own
  // rows in the same breath, and every run since found the replies already
  // present, skipped the worker entirely, and never re-asked the archive
  // question. The read-back proof caught it: 84 replies already there, ten
  // archives still owed. Archiving is idempotent (R17) regardless of when
  // the reply landed, so it is asked once per run, for every one of the ten,
  // off the `help` row's own `archived_at` — never off whether THIS run
  // happened to be the one that added the reply.
  for (const ref of ARCHIVE_AS_MESSAGE) {
    const own = byRef.get(ref)
    if (!own || own.archived_at) continue
    const archRes = await doorPost("/api/content/help/archive", { id: own.id, archived: true })
    if (archRes.ok) childOutcomes.archived++
    else childOutcomes.archiveFailed.push({ ref, status: archRes.status, message: archRes.body?.message })
  }

  // ── dates, straight to D1 — the LAST touch on every `help` row, over the
  // whole set, after every door write above (including the thread children) ──
  await pool(matched.filter((m) => Object.keys(m.dates).length > 0), CONCURRENCY, async (m) => { try {
    const sets = []
    if (m.dates.created_at) sets.push(`created_at = ${q(m.dates.created_at)}`, `creator_name = ${q(m.dates.creator_name)}`, `creator_email = NULL`, `creator_id = NULL`)
    if (m.dates.updated_at) sets.push(`updated_at = ${q(m.dates.updated_at)}`, `editor_name = ${q(m.dates.editor_name)}`, `editor_email = NULL`, `editor_id = NULL`)
    if (m.dates.resolved_at) sets.push(`resolved_at = ${q(m.dates.resolved_at)}`, `resolver_name = ${q(m.dates.resolver_name)}`, `resolver_email = NULL`, `resolver_id = NULL`)
    if (m.dates.validated_at) sets.push(`validated_at = ${q(m.dates.validated_at)}`)
    if (m.dates.archived_at) sets.push(`archived_at = ${q(m.dates.archived_at)}`, `archiver_name = ${q(m.dates.archiver_name)}`, `archiver_email = NULL`, `archiver_id = NULL`)
    if (sets.length) { await d1(`UPDATE help SET ${sets.join(", ")} WHERE id = ${q(m.id)}`); outcomes.datesOk++ }
  } catch (e) { outcomes.crashed.push({ ref: m.ref, message: `dates: ${String(e?.message ?? e)}` }) }
  }, (done, total) => say(`  dates: ${done}/${total}`))

  say(`\nWRITE RESULTS`)
  say(`  fields updated: ${outcomes.fieldsOk} (failed: ${outcomes.fieldsFailed.length}, crashed: ${outcomes.crashed.length})`)
  say(`  status moved: ${outcomes.statusOk} (refused resolved — screenshot required: ${outcomes.statusRefusedResolved.length}; other failures: ${outcomes.statusFailed.length})`)
  say(`  archived: ${outcomes.archiveOk} (failed: ${outcomes.archiveFailed.length})`)
  say(`  dates written direct to D1: ${outcomes.datesOk}`)
  say(`  resolution replies added: ${outcomes.resolutionAdded} (failed: ${outcomes.resolutionFailed.length})`)
  say(`  thread-child replies added: ${childOutcomes.added} (failed: ${childOutcomes.failed.length})`)
  // ACTUAL CURRENT STATE, not just this run's own delta — R17 makes archiving
  // idempotent, so a ref archived in an EARLIER run correctly does nothing
  // here (`archived_at` already set, skipped) and `childOutcomes.archived`
  // alone would under-report a job already done. Read straight off the row.
  const tenArchivedNow = [...ARCHIVE_AS_MESSAGE].filter((ref) => byRef.get(ref)?.archived_at).length
  say(`  the ten archived after their reply landed: ${tenArchivedNow} of 10 now archived (${childOutcomes.archived} newly archived this run, failed: ${childOutcomes.archiveFailed.length})`)
  if (outcomes.fieldsFailed.length) say(`  field failures: ${JSON.stringify(outcomes.fieldsFailed.slice(0, 10))}`)
  if (outcomes.statusFailed.length) say(`  status failures (non-resolved): ${JSON.stringify(outcomes.statusFailed.slice(0, 10))}`)
  if (outcomes.archiveFailed.length) say(`  archive failures: ${JSON.stringify(outcomes.archiveFailed.slice(0, 10))}`)
  if (outcomes.resolutionFailed.length) say(`  resolution-reply failures: ${JSON.stringify(outcomes.resolutionFailed.slice(0, 10))}`)
  if (childOutcomes.failed.length) say(`  thread-child failures: ${JSON.stringify(childOutcomes.failed.slice(0, 10))}`)
  if (childOutcomes.archiveFailed.length) say(`  thread-child archive failures: ${JSON.stringify(childOutcomes.archiveFailed.slice(0, 10))}`)
  if (outcomes.crashed.length) say(`  ticket-processing exceptions (network/other, not a door refusal): ${JSON.stringify(outcomes.crashed.slice(0, 10))}`)
  if (childOutcomes.crashed.length) say(`  thread-child exceptions: ${JSON.stringify(childOutcomes.crashed.slice(0, 10))}`)

  globalThis.__glideTicketsChildOutcomes = childOutcomes
} finally {
  if (replyEmailWasOn) {
    await api("/api/tenancy/config/automations", { method: "POST", body: JSON.stringify({ key: "tickets.reply-email", on: true }) }, cookie)
    say(`  restored tickets.reply-email to ON`)
  }
}
const childOutcomes = globalThis.__glideTicketsChildOutcomes

// ═════════════════════════════════════════════════════════════════════════
// PROOF — read every touched row back out of D1, never trust a 200
// ═════════════════════════════════════════════════════════════════════════
say(`\nPROOF (read back out of the database)`)
let bad = 0
let afterHelp = new Map((await d1("SELECT * FROM help")).map((r) => [r.id, r]))

/** Every mismatch this row still shows against what was sent. Named rather
 * than counted inline, because the first live run needed a SECOND look: a
 * handful of rows read back stale immediately after ~1,900 tickets' worth of
 * concurrent writes (D1 REST read-after-write lag under load, not a failed
 * write — every one of them matched on a plain re-read moments later), and
 * "a 200 is not proof" cuts both ways: neither is a read taken in the same
 * breath as the write. */
function mismatches(m, row) {
  const out = []
  if (!row) return ["MISSING"]
  for (const [k, col] of [["titleDe", "title_de"], ["titleEn", "title_en"], ["description", "description"], ["appId", "app_id"], ["moduleId", "module_id"], ["raisedByContactId", "raised_by_contact_id"], ["helpType", "help_type"]])
    if (m.fields[k] !== undefined && String(row[col] ?? "") !== String(m.fields[k])) out.push(col)
  if (m.dates.created_at && row.created_at !== m.dates.created_at) out.push("created_at")
  if (m.dates.updated_at && row.updated_at !== m.dates.updated_at) out.push("updated_at")
  if (m.dates.resolved_at && row.resolved_at !== m.dates.resolved_at) out.push("resolved_at")
  if (m.dates.validated_at && row.validated_at !== m.dates.validated_at) out.push("validated_at")
  if (m.dates.archived_at && row.archived_at !== m.dates.archived_at) out.push("archived_at")
  if (m.statusMove && m.statusMove !== "resolved" && row.status !== m.statusMove) out.push(`status(${row.status}≠${m.statusMove})`)
  return out
}

let firstPass = matched.map((m) => ({ m, miss: mismatches(m, afterHelp.get(m.id)) })).filter((r) => r.miss.length)
if (firstPass.length) {
  say(`  ${firstPass.length} rows read back different on the first pass — pausing 5s and reading those again (D1 read-after-write lag, not assumed a real miss)`)
  await new Promise((r) => setTimeout(r, 5000))
  const refetched = await d1(`SELECT * FROM help WHERE id IN (${firstPass.map((r) => q(r.m.id)).join(",")})`)
  for (const row of refetched) afterHelp.set(row.id, row)
  firstPass = firstPass.map((r) => ({ m: r.m, miss: mismatches(r.m, afterHelp.get(r.m.id)) })).filter((r) => r.miss.length)
}
for (const { m, miss } of firstPass) { console.error(`  ${m.ref}: ${miss.join(", ")} did not land`); bad += miss.length }
for (const ref of childOutcomes ? [...ARCHIVE_AS_MESSAGE] : []) {
  const row = byRef.get(ref)
  if (!row) continue
  const after = afterHelp.get(row.id)
  if (childOutcomes.archived > 0 && after && after.archived_at === null && !childOutcomes.archiveFailed.some((f) => f.ref === ref)) {
    console.error(`  ${ref} was meant to be archived (thread-child fold-in) but is not`); bad++
  }
}

// Kwapso: every one of its rows must be byte-identical, before and after.
const afterAll = [...afterHelp.values()]
const kwapsoAfter = afterAll.filter((r) => r.account_id === kwapsoAccountId)
const kwChanged = kwapsoBefore.filter((b) => JSON.stringify(b) !== JSON.stringify(kwapsoAfter.find((a) => a.id === b.id)))
say(`  Kwapso's own tickets unchanged: ${kwChanged.length === 0 ? `yes (${kwapsoBefore.length})` : `NO — ${kwChanged.length} changed`}`)
if (kwChanged.length) bad += kwChanged.length
say(`  Kwapso rows before/after count: ${kwapsoBefore.length} / ${kwapsoAfter.length}`)

const afterContacts = await d1("SELECT id, email, archived_at FROM accounts WHERE account_type = 'individual'")
for (const c of contactsCreated) {
  const row = afterContacts.find((r) => r.id === c.id)
  if (!row) { console.error(`  MISSING contact ${c.email}`); bad++; continue }
  if (row.archived_at === null) { console.error(`  contact ${c.email} was not archived`); bad++ }
}

say(`  ${afterHelp.size} help rows read back; ${matched.length} matched tickets checked`)
if (bad) { console.error(`\n${bad} problems. The backup above puts everything back.`); process.exit(1) }
say(`\nDone.`)

// ═════════════════════════════════════════════════════════════════════════
// FINAL ANSWER
// ═════════════════════════════════════════════════════════════════════════
say(`\n── STATUS MAPPING USED ──`)
say(`  closed (9v8Yu) → resolved; else ready (otTFj) → ready; else in progress (MuEDI) → in_progress; else left at "new".`)
say(`  confirmed (4D1DR) is not a status — written only as help.validated_at.`)
say(`  archived (Viepi) is not a status — moved through the archive door, help.archived_at.`)
say(`  "resolved" can only be reached through POST /api/content/help/resolve, which refuses without a screenshot; this script never bypasses that with SQL.`)

say(`\n── COUNTS ──`)
say(`  updated (field door):            ${outcomes.fieldsOk}`)
say(`  authors set:                     ${authorsSet}`)
say(`  authors left empty:              ${authorsUnresolved}`)
say(`  dates written direct to D1:      ${outcomes.datesOk}`)
say(`  resolution replies added:        ${outcomes.resolutionAdded}`)
say(`  thread replies added:            ${childOutcomes.added}`)
say(`  ten wrongly-imported archived:   ${childOutcomes.archived} of 10`)
say(`  status moved:                    ${outcomes.statusOk}`)
say(`  status refused (resolved, needs screenshot): ${outcomes.statusRefusedResolved.length}`)
say(`  account reassignment refused (door protects an assigned ticket): ${accountConflicts.length}`)
say(`  Glide number collisions (two different tickets, one number) — neither written: ${numberCollisions.length}`)
say(`  contacts created:                ${contactsCreated.map((c) => c.email).join(", ") || "(none)"}`)
