#!/usr/bin/env node
// Bring the accounts on STAGING back into line with the Glide customers table.
//
//   node scripts/glide-accounts-sync.mjs            # dry run, writes nothing
//   node scripts/glide-accounts-sync.mjs --confirm  # the real thing
//
// Reads glide/data/agency.customers.json (pull it first with glide-pull.mjs).
//
// ── WHAT THIS DOES, AND ON WHOSE AUTHORITY ──────────────────────────────────
//
// The owner's rulings, 22 Sep 2026, in her words:
//
//   • "keep the ids already existing in the new system"  → every account is
//     matched by NAME and updated in place. Nothing is created, nothing is
//     re-keyed. If a Glide customer had no match here the script REFUSES the
//     run rather than inventing a row.
//   • "if an account does not exist in glide, delete it"  → there is no delete
//     in this app and there is not going to be one; she agreed to ARCHIVE.
//     Archiving is the same switch the accounts screen labels "Inactive".
//   • "overwrite only where Glide has a value"  → a blank Glide cell leaves
//     what is here alone. That falls out of the door's own semantics for free
//     (optionalText returns undefined for a blank, and undefined means KEEP),
//     so the rule is enforced by the platform rather than by this file being
//     careful.
//   • "do not import kwapso nor demo (thats us, not an account)"  → Kwapso is
//     touched by NOTHING here. DEMO is archived only (she deleted it in Glide,
//     which is her own not-in-Glide rule).
//   • "do not touch people"  → entity accounts only, everywhere, including the
//     backup. Contacts get their own pass.
//
// ── THE TWO THINGS THIS SCRIPT DOES NOT SEND THROUGH THE FRONT DOOR ─────────
//
// 1. THE DATES. `created_at`, `creator_name`, `updated_at`, `editor_name` are
//    stamped server-side at the write, from the session — that is what makes
//    the audit trail worth reading, and no door accepts them. The owner asked
//    for Glide's real dates anyway ("overwrite"), so those four columns are
//    written STRAIGHT TO D1 over the Cloudflare REST API. This is a deliberate
//    exception to "seed through the front door", it is named here rather than
//    buried, and it is the reason for the backup below.
//
//    `creator_email`/`creator_id`/`editor_email`/`editor_id` are NULLED beside
//    the name they belong to. Glide records "Aurora" and "Alex" — bare first
//    names of people who are not users of this system. Leaving the seeding
//    account's id next to somebody else's name is worse than an empty cell: it
//    is a lie the UI can act on. A null says "we do not know", which is true.
//
// 2. THE PICTURES. `logoUrl`/`coverUrl` are NOT sent. Glide's values point at
//    storage.googleapis.com and die with the Glide subscription; the records
//    here already carry re-hosted /media/... paths that glide-visuals.mjs put
//    there in August. Sending Glide's URL would undo that migration.
//
// ── BEFORE IT WRITES ANYTHING ───────────────────────────────────────────────
//
// It dumps every entity account's FULL row out of D1 to
// glide/backup-accounts-<stamp>.json, plus a .sql file of UPDATE statements
// that puts every one of them back exactly as it was. Both are written on a
// dry run too, so the restore exists before the first write does.

import { readFileSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const CONFIRM = process.argv.includes("--confirm")
const BASE = "https://agency-staging.kwapso.app"
const OWNER = process.env.SEED_OWNER_EMAIL || "alaap@kwapso.com"

// Never imported, never archived, never read for a diff. Kwapso is the agency
// itself; DEMO is a test row she removed from Glide (so it is archived, below).
const NOT_AN_ACCOUNT = new Set(["kwapso", "demo"])
const ARCHIVE_ANYWAY = new Set(["demo"])

// ── the column map (Glide ids are five opaque characters) ───────────────────
const C = {
  name: "LoM8i",
  about: "FBJAw",
  email: "aW2YY",
  phone: "B48wf",
  industry: "f29Du",
  website: "Jl0Rk",
  street: "Fi04u",
  city: "lTZIw",
  postalCode: "5Oyda",
  country: "HTt36",
  locale: "Zc406",
  status: "ngHBG", // → choices; the two row ids below
  createdAt: "VnwNS",
  createdBy: "Iii5e",
  updatedAt: "x0Sgb",
  updatedBy: "h8KNN",
}
const STATUS_ACTIVE = "2M0RciwcSzGxt3jCcE3vTA"
const STATUS_ARCHIVED = "lKkAEDEWRFyMxkpJVDYZjQ"

// The fields that go through the ordinary update door. Pictures are absent on
// purpose — see the header.
const DOOR_FIELDS = [
  "about", "email", "phone", "industry", "website",
  "street", "city", "postalCode", "country", "locale",
]

const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8").split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/#.*$/, "").trim()])
)
for (const k of ["TEST_LOGIN_KEY", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"]) {
  if (!env[k]) { console.error(`Stopped: ${k} is not in .env.`); process.exit(2) }
}

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")
const cell = (row, key) => {
  const v = row[C[key]]
  if (v === undefined || v === null) return ""
  return String(v).trim()
}
const say = (...a) => console.log(...a)

// ── 1 · Glide ───────────────────────────────────────────────────────────────

const src = resolve(ROOT, "glide/data/agency.customers.json")
let raw
try { raw = JSON.parse(readFileSync(src, "utf8")) } catch {
  console.error(`Stopped: ${src} is not there. Run: GLIDE_API_KEY=… node scripts/glide-pull.mjs customers`)
  process.exit(2)
}
const glide = Array.isArray(raw) ? raw : (raw.rows ?? raw.data ?? [])
say(`Glide: ${glide.length} customers`)

// WHY BOTH STATUS IDS ARE NAMED when only ARCHIVED is branched on below: the
// only question this script asks a status is "is it the archived one", so every
// other value — a third status somebody adds in Glide next month, a blank cell,
// a typo — would quietly mean "live" and an account would stay on the screen
// because a string did not match. That is a silent wrong answer, and the fix is
// to refuse a value this script has never been told the meaning of. A BLANK is
// allowed and means live: Glide leaves the cell empty on a row nobody has set,
// which is what a new customer looks like.
const known = new Set([STATUS_ACTIVE, STATUS_ARCHIVED, ""])
const strange = glide
  .map((r) => ({ name: cell(r, "name"), status: cell(r, "status") }))
  .filter((r) => !known.has(r.status))
if (strange.length) {
  console.error(`\nStopped: ${strange.length} customers carry a status this script does not know:`)
  strange.forEach((r) => console.error(`  ${r.name} → ${r.status}`))
  console.error(`Known: ${STATUS_ACTIVE} (Active), ${STATUS_ARCHIVED} (Archived), or blank.`)
  console.error(`Resolve the new value against glide/data/agency.choices.json and add it above.`)
  process.exit(1)
}

// ── 2 · sign in, and the team ───────────────────────────────────────────────

const api = async (path, init = {}, cookie = "") => {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}), ...init.headers },
  })
  let body = null
  try { body = await r.json() } catch { /* empty body is fine */ }
  return { ok: r.ok, status: r.status, body, headers: r.headers }
}

const login = await api("/api/auth/admin/test-login", {
  method: "POST", headers: { "x-admin-key": env.TEST_LOGIN_KEY },
  body: JSON.stringify({ email: OWNER }),
})
if (!login.ok) { console.error(`Stopped: couldn't mint a login for ${OWNER} — ${login.status}`); process.exit(1) }
const verified = await fetch(`${BASE}/api/auth/email/verify`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: OWNER, code: login.body.code }),
})
const cookie = (verified.headers.get("set-cookie") ?? "").split(";")[0]
if (!verified.ok || !cookie) { console.error(`Stopped: ${OWNER} couldn't sign in (${verified.status}).`); process.exit(1) }

const teams = (await api("/api/tenancy/teams", {}, cookie)).body?.teams ?? []
if (!teams.length) { console.error(`Stopped: ${OWNER} is in no team.`); process.exit(1) }
const team = teams[0]
await api("/api/tenancy/switch-team", { method: "POST", body: JSON.stringify({ teamId: team.id }) }, cookie)
say(`Signed in as ${OWNER}, in "${team.name}" (${team.id})`)

// ── 3 · the team's own database, for the dates and the backup ───────────────

const d1 = async (sql) => {
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${DB_UUID}/query`,
    { method: "POST", headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql }) }
  )
  const b = await r.json()
  if (!b.success) { console.error("D1 refused:", JSON.stringify(b.errors)); process.exit(1) }
  return b.result?.[0]?.results ?? []
}
const dbName = `team-${team.id.toLowerCase()}`
const dbs = await (await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database?per_page=100`,
  { headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` } })).json()
const found = (dbs.result ?? []).find((d) => d.name === dbName)
if (!found) { console.error(`Stopped: no D1 database called ${dbName}.`); process.exit(1) }
const DB_UUID = found.uuid
say(`Team database: ${dbName}`)

const q = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`)

// ── 4 · the backup, before anything ─────────────────────────────────────────

const before = await d1("SELECT * FROM accounts WHERE account_type = 'entity' ORDER BY name")
const stamp = new Date().toISOString().replace(/[:.]/g, "-")
const backupJson = resolve(ROOT, `glide/backup-accounts-${stamp}.json`)
const backupSql = resolve(ROOT, `glide/backup-accounts-${stamp}.sql`)
writeFileSync(backupJson, JSON.stringify(before, null, 1))
const cols = Object.keys(before[0] ?? {}).filter((c) => c !== "id")
writeFileSync(
  backupSql,
  `-- Every entity account exactly as it was at ${new Date().toISOString()}.\n` +
  `-- Restore: paste into the D1 console for ${dbName}, or POST it to the D1 query API.\n\n` +
  before.map((r) => `UPDATE accounts SET ${cols.map((c) => `${c} = ${q(r[c])}`).join(", ")} WHERE id = ${q(r.id)};`).join("\n") + "\n"
)
say(`Backup: ${before.length} rows → ${backupJson.replace(ROOT + "/", "")}`)
say(`        restore  → ${backupSql.replace(ROOT + "/", "")}`)

// ── 5 · the plan ────────────────────────────────────────────────────────────

const byName = new Map(before.map((r) => [norm(r.name), r]))
const seen = new Set()
const updates = [], deactivations = [], skipped = [], problems = []

for (const row of glide) {
  const name = cell(row, "name")
  const key = norm(name)
  seen.add(key)
  const here = byName.get(key)
  if (!here) { problems.push(`Glide has "${name}" and this app does not — nothing to update in place.`); continue }
  if (NOT_AN_ACCOUNT.has(key)) {
    skipped.push({ name: here.name, id: here.id, why: "not an account (your ruling)" })
    if (ARCHIVE_ANYWAY.has(key) && here.deactivated_at === null) {
      deactivations.push({ name: here.name, id: here.id, why: "a test row, removed from Glide" })
    }
    continue
  }
  const fields = {}
  for (const f of DOOR_FIELDS) { const v = cell(row, f); if (v) fields[f] = v }
  const dates = {}
  if (cell(row, "createdAt")) { dates.created_at = cell(row, "createdAt"); dates.creator_name = cell(row, "createdBy") || null }
  if (cell(row, "updatedAt")) { dates.updated_at = cell(row, "updatedAt"); dates.editor_name = cell(row, "updatedBy") || null }
  updates.push({ name: here.name, id: here.id, fields, dates })
  if (cell(row, "status") === STATUS_ARCHIVED && here.deactivated_at === null) {
    deactivations.push({ name: here.name, id: here.id, why: "Archived in Glide" })
  }
}
for (const r of before) {
  if (seen.has(norm(r.name))) continue
  if (r.deactivated_at === null) deactivations.push({ name: r.name, id: r.id, why: "not in Glide at all" })
}

if (problems.length) {
  console.error("\nStopped before writing anything:")
  problems.forEach((p) => console.error("  " + p))
  console.error("Every Glide customer must already exist here — this script never creates.")
  process.exit(1)
}

say(`\nPLAN`)
say(`  ${updates.length} accounts updated in place (id kept)`)
say(`  ${deactivations.length} set inactive`)
say(`  ${skipped.length} left alone: ${skipped.map((s) => s.name).join(", ")}`)
for (const u of updates) {
  const f = Object.keys(u.fields).join(", ") || "(no field values in Glide)"
  say(`   · ${u.name.padEnd(18)} ${f}`)
  if (Object.keys(u.dates).length) say(`     ${" ".repeat(18)} dates → ${u.dates.created_at ?? "—"} / ${u.dates.updated_at ?? "—"}`)
}
for (const d of deactivations) say(`   · inactive: ${d.name.padEnd(18)} ${d.why}`)

if (!CONFIRM) {
  say(`\nDry run. Nothing was written. Add --confirm to do it.`)
  process.exit(0)
}

// ── 6 · write: the fields, through the ordinary door ────────────────────────

say(`\nWRITING`)
let done = 0
for (const u of updates) {
  const r = await api("/api/tenancy/accounts/update",
    { method: "POST", body: JSON.stringify({ id: u.id, name: u.name, ...u.fields }) }, cookie)
  if (!r.ok) { console.error(`  FAILED ${u.name} — ${r.status} ${r.body?.message ?? ""}`); process.exit(1) }
  done++
}
say(`  ${done} accounts updated through /api/tenancy/accounts/update`)

// ── 7 · write: inactive, through the ordinary door ──────────────────────────

for (const d of deactivations) {
  const r = await api("/api/tenancy/accounts/active",
    { method: "POST", body: JSON.stringify({ id: d.id, active: false }) }, cookie)
  if (!r.ok) { console.error(`  FAILED ${d.name} — ${r.status} ${r.body?.message ?? ""}`); process.exit(1) }
}
say(`  ${deactivations.length} set inactive`)

// ── 8 · write: the dates, straight to D1 — AFTER every door write ──────────
//
// ORDER IS LOad-BEARING, and the proof below is what found it. Every door write
// stamps `updated_at` from the session, including the deactivate in 7 above. So
// the dates have to be the LAST thing written: on the first real run they went
// in at step 7 and the five deactivations that followed overwrote `updated_at`
// on exactly those five rows. The read-back caught all five by name.

let dated = 0
for (const u of updates) {
  const sets = []
  if (u.dates.created_at) sets.push(`created_at = ${q(u.dates.created_at)}`, `creator_name = ${q(u.dates.creator_name)}`, `creator_email = NULL`, `creator_id = NULL`)
  if (u.dates.updated_at) sets.push(`updated_at = ${q(u.dates.updated_at)}`, `editor_name = ${q(u.dates.editor_name)}`, `editor_email = NULL`, `editor_id = NULL`)
  if (!sets.length) continue
  await d1(`UPDATE accounts SET ${sets.join(", ")} WHERE id = ${q(u.id)}`)
  dated++
}
say(`  ${dated} accounts carry Glide's own dates and authors`)

// ── 9 · read every row back, and prove it ───────────────────────────────────

say(`\nPROOF (read back out of the database, not trusted from a 200)`)
const after = new Map((await d1("SELECT * FROM accounts WHERE account_type = 'entity'")).map((r) => [r.id, r]))
let bad = 0
for (const u of updates) {
  const row = after.get(u.id)
  if (!row) { console.error(`  MISSING ${u.name}`); bad++; continue }
  const wrong = []
  const dbName2 = { about: "about", email: "email", phone: "phone", industry: "industry", website: "website",
                    street: "street", city: "city", postalCode: "postal_code", country: "country", locale: "locale" }
  for (const [f, v] of Object.entries(u.fields)) if (String(row[dbName2[f]] ?? "") !== String(v)) wrong.push(f)
  if (u.dates.created_at && row.created_at !== u.dates.created_at) wrong.push("created_at")
  if (u.dates.updated_at && row.updated_at !== u.dates.updated_at) wrong.push("updated_at")
  if (wrong.length) { console.error(`  ${u.name}: ${wrong.join(", ")} did not land`); bad++ }
}
for (const d of deactivations) {
  const row = after.get(d.id)
  if (row && row.deactivated_at === null) { console.error(`  ${d.name} is still active`); bad++ }
}
if (bad) { console.error(`\n${bad} rows are not what was asked for. The backup above puts everything back.`); process.exit(1) }
say(`  every field, date and switch verified on ${updates.length + deactivations.length} rows`)
say(`\nDone. ${updates.length} updated, ${deactivations.length} inactive, ${skipped.length} untouched.`)
