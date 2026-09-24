#!/usr/bin/env node
// Bring apps, modules and sprints into line with Glide. STAGING.
//
//   node scripts/glide-apps-sync.mjs            # dry run, writes nothing
//   node scripts/glide-apps-sync.mjs --confirm  # the real thing
//
// The owner's rulings, 23-24 Sep 2026, in her words:
//
//  • "keep the new ids" — everything is matched and updated IN PLACE. The refs
//    (A0001, P0001) are already the format she asked for; nothing is renumbered.
//  • "platinum is called in the new system ERP Kennogroup. rename to platinum",
//    and then: "fo rplatinum import narrative as well - what you shoudl not
//    otuch in new system are modules, phases, backlog, tickets". So Platinum
//    takes the full APP-level import and NONE of its children: its 11 Glide
//    sprints are not created, its modules are not touched.
//  • "yes, create players" — the one app in Glide with no counterpart here.
//  • "do not import old sprint types - map them to the renames" — Glide's
//    vocabulary is not written through; each value resolves to one of the
//    seven in `shared/sprint-types.ts` or the sprint's own type is LEFT ALONE.
//  • "eahc app has a main stakeholder, and others. those are related to the db
//    contacts" — both go through the ordinary app door, which takes
//    `mainStakeholderContactId` and `stakeholderContactIds`.
//  • "do not import thos 8 that have no home" — the analysis/specs/drive/digest
//    fields are not carried, and neither are team lead and teammates, module
//    handover, module flowcharts or German descriptions.
//  • Stage is NOT imported. She asked whether it was automatic; it is not
//    (UI-RULEBOOK: "ruled, not yet built"), so it is a real field holding real
//    values here, Glide covers only 23 of 29, and it becomes derived later.
//  • Kwapso System and Kwapso Portal are skipped in BOTH directions.
//
// WHAT DOES NOT GO THROUGH THE FRONT DOOR: created_at / updated_at, because no
// door accepts a date — same exception, and the same reason, as the accounts
// sync. Written straight to D1 and named here rather than buried.

import { readFileSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const CONFIRM = process.argv.includes("--confirm")
const BASE = "https://agency-staging.kwapso.app"
const OWNER = process.env.SEED_OWNER_EMAIL || "aurora@kwapso.com"

const env = Object.fromEntries(readFileSync(resolve(ROOT, ".env"), "utf8").split("\n")
  .filter((l) => /^[A-Z_]+=/.test(l))
  .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/#.*$/, "").trim()]))
const TEST_KEY = process.env.TEST_LOGIN_KEY || env.TEST_LOGIN_KEY
for (const [k, v] of [["TEST_LOGIN_KEY", TEST_KEY], ["CLOUDFLARE_ACCOUNT_ID", env.CLOUDFLARE_ACCOUNT_ID], ["CLOUDFLARE_API_TOKEN", env.CLOUDFLARE_API_TOKEN]])
  if (!v) { console.error(`Stopped: ${k} is not available.`); process.exit(2) }

// ── Glide column maps ────────────────────────────────────────────────────────
const APP = { name: "0Q1H5", customer: "KH2hM", url: "umEGb", logo: "SgGGr",
  about: "ypkae", context: "spLTj", solution: "EL6IA", keyActors: "IVktv",
  mainContact: "gzknf", otherContacts: "uNue7", stakeholders: "YgOIs",
  createdAt: "gE94D", updatedAt: "l3V8c" }
const MODULE = { name: "Name", app: "1Ps1B", descEn: "gP5pw", icon: "xFqCF",
  archived: "edwDg", createdAt: "Ijw1M", updatedAt: "fKbG6" }
const SPRINT = { app: "qw1XE", type: "df1gP", startsOn: "ZozVJ", endsOn: "dwXf6" }

// GLIDE'S WORD -> OURS. Anything absent is NOT written: the sprint keeps the
// type it already has rather than gaining a word the app's own vocabulary
// (shared/sprint-types.ts) does not contain. "Training" and one row pointing at
// a deleted choice are the two that land here today; they are REPORTED, never
// guessed at, because inventing a type is how a vocabulary rots.
const SPRINT_TYPE = {
  enhancement: "Enhancement", build: "Build", refinement: "Refinements",
  refinements: "Refinements", validation: "Validation", audit: "Audit", plan: "Plan",
}

const SKIP_APPS = new Set(["kwapso system", "kwapso portal"])
const RENAME = { "erp kennogroup": "Platinum" }
const CHILDREN_UNTOUCHED = new Set(["platinum"]) // her ruling: app fields yes, children no

const norm = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim()
const cell = (row, map, key) => { const v = row[map[key]]; return v === undefined || v === null ? "" : String(v).trim() }
const idList = (v) => String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean)
const say = (...a) => console.log(...a)

const load = (n) => { const a = JSON.parse(readFileSync(resolve(ROOT, `glide/data/agency.${n}.json`), "utf8")); return Array.isArray(a) ? a : (a.rows ?? a.data ?? []) }
const gApps = load("apps"), gMods = load("modules"), gSprints = load("sprints"), gContacts = load("contacts"), gChoices = load("choices")
const choiceLabel = new Map(gChoices.map((c) => [c.$rowID, String(c.B0cSY ?? "").trim()]))
const gAppName = new Map(gApps.map((r) => [r.$rowID, cell(r, APP, "name")]))

// ── sign in ──────────────────────────────────────────────────────────────────
const api = async (path, init = {}, cookie = "") => {
  const r = await fetch(`${BASE}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}), ...init.headers } })
  let body = null; try { body = await r.json() } catch { /* empty is fine */ }
  return { ok: r.ok, status: r.status, body, headers: r.headers }
}
const start = await api("/api/auth/admin/test-login", { method: "POST", headers: { "x-admin-key": TEST_KEY }, body: JSON.stringify({ email: OWNER }) })
if (!start.ok) { console.error(`Stopped: no login code for ${OWNER} — ${start.status}`); process.exit(1) }
const verified = await fetch(`${BASE}/api/auth/email/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: OWNER, code: start.body.code }) })
const cookie = (verified.headers.get("set-cookie") ?? "").split(";")[0]
if (!verified.ok || !cookie) { console.error(`Stopped: ${OWNER} could not sign in (${verified.status}).`); process.exit(1) }
const teams = (await api("/api/tenancy/teams", {}, cookie)).body?.teams ?? []
const team = teams[0]
if (!team) { console.error("Stopped: no team."); process.exit(1) }
await api("/api/tenancy/switch-team", { method: "POST", body: JSON.stringify({ teamId: team.id }) }, cookie)
say(`Signed in as ${OWNER}, team "${team.name}"`)

// ── the team database, for the dates and the backup ──────────────────────────
const dbs = await (await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database?per_page=100`,
  { headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` } })).json()
const found = (dbs.result ?? []).find((d) => d.name === `team-${team.id.toLowerCase()}`)
if (!found) { console.error("Stopped: team database not found."); process.exit(1) }
const d1 = async (sql) => {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${found.uuid}/query`,
    { method: "POST", headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ sql }) })
  const b = await r.json()
  if (!b.success) { console.error("D1 refused:", JSON.stringify(b.errors)); process.exit(1) }
  return b.result?.[0]?.results ?? []
}
const q = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`)

// ── who is Kwapso, and what is here now ──────────────────────────────────────
const kwapsoId = (await d1("SELECT id FROM accounts WHERE name = 'Kwapso'"))[0]?.id ?? ""
const ourApps = await d1("SELECT id, ref, name, account_id FROM apps")
const ourMods = await d1("SELECT id, app_id, name FROM app_modules")
const ourSprints = await d1("SELECT id, ref, app_id, starts_on, sprint_type FROM sprints")
const ourContacts = await d1("SELECT id, name, email FROM accounts WHERE account_type = 'individual'")
const ourAccounts = await d1("SELECT id, name FROM accounts WHERE account_type = 'entity'")

// contact rowId -> our contact id, by email then by name
const byEmail = new Map(ourContacts.filter((c) => c.email).map((c) => [norm(c.email), c.id]))
const byName = new Map(ourContacts.map((c) => [norm(c.name), c.id]))
const contactId = new Map()
for (const c of gContacts) {
  const e = norm(c.Email), n = norm(c.Name)
  const hit = (e && e !== "-" && byEmail.get(e)) || byName.get(n)
  if (hit) contactId.set(c.$rowID, hit)
}
const accountByName = new Map(ourAccounts.map((a) => [norm(a.name), a.id]))
const gCustomers = load("customers")
const gCustName = new Map(gCustomers.map((r) => [r.$rowID, String(r.LoM8i ?? "").trim()]))

// our app: name (after rename) -> row
const ourAppByName = new Map(ourApps.map((a) => [norm(RENAME[norm(a.name)] ?? a.name), a]))

// ── the backup, before anything ──────────────────────────────────────────────
const stamp = new Date().toISOString().replace(/[:.]/g, "-")
const backup = { takenAt: new Date().toISOString(), apps: await d1("SELECT * FROM apps"), app_modules: ourMods, sprints: await d1("SELECT * FROM sprints"), app_stakeholders: await d1("SELECT * FROM app_stakeholders") }
const backupPath = resolve(ROOT, `glide/backup-apps-${stamp}.json`)
writeFileSync(backupPath, JSON.stringify(backup, null, 1))
say(`Backup: ${backupPath.replace(ROOT + "/", "")}  (${backup.apps.length} apps, ${backup.app_modules.length} modules, ${backup.sprints.length} sprints, ${backup.app_stakeholders.length} stakeholder rows)`)

// ── the plan ─────────────────────────────────────────────────────────────────
const appUpdates = [], appCreates = [], modUpdates = [], sprintUpdates = [], sprintCreates = [], notes = []

for (const g of gApps) {
  const gname = cell(g, APP, "name")
  if (SKIP_APPS.has(norm(gname))) { notes.push(`skipped Glide app "${gname}" (Kwapso's own)`); continue }
  const here = ourAppByName.get(norm(gname))
  const mains = idList(cell(g, APP, "mainContact")).map((i) => contactId.get(i)).filter(Boolean)
  const others = [...new Set([...idList(cell(g, APP, "otherContacts")), ...idList(cell(g, APP, "stakeholders"))])]
    .map((i) => contactId.get(i)).filter(Boolean).filter((i) => i !== mains[0])
  const fields = {}
  for (const [k, key] of [["url", "url"], ["logoUrl", "logo"], ["about", "about"], ["clientContext", "context"], ["solution", "solution"], ["keyActors", "keyActors"]]) {
    const v = cell(g, APP, key); if (v) fields[k] = v
  }
  const dates = {}
  if (cell(g, APP, "createdAt")) dates.created_at = cell(g, APP, "createdAt")
  if (cell(g, APP, "updatedAt")) dates.updated_at = cell(g, APP, "updatedAt")
  if (here) {
    const rename = RENAME[norm(here.name)]
    appUpdates.push({ id: here.id, ref: here.ref, was: here.name, name: rename ?? here.name, renamed: Boolean(rename), fields, main: mains[0] ?? null, others, dates })
  } else {
    const acct = accountByName.get(norm(gCustName.get(cell(g, APP, "customer")) ?? ""))
    if (!acct) { notes.push(`REFUSED to create "${gname}" — its client is not here`); continue }
    appCreates.push({ name: gname, accountId: acct, fields, main: mains[0] ?? null, others, dates })
  }
}

// modules — skip Kwapso's and Platinum's children
const ourModKey = new Map()
for (const m of ourMods) {
  const app = ourApps.find((a) => a.id === m.app_id)
  if (app) ourModKey.set(norm(RENAME[norm(app.name)] ?? app.name) + "|" + norm(m.name), m)
}
for (const g of gMods) {
  const appNm = gAppName.get(cell(g, MODULE, "app")) ?? ""
  if (SKIP_APPS.has(norm(appNm))) continue
  if (CHILDREN_UNTOUCHED.has(norm(appNm))) { notes.push(`left module "${cell(g, MODULE, "name")}" alone (${appNm}'s children are untouched)`); continue }
  const here = ourModKey.get(norm(appNm) + "|" + norm(cell(g, MODULE, "name")))
  if (!here) { notes.push(`no module here for "${cell(g, MODULE, "name")}" on ${appNm}`); continue }
  const fields = {}
  if (cell(g, MODULE, "descEn")) fields.description = cell(g, MODULE, "descEn")
  // THE ICON IS NOT CARRIED, and this is a decision rather than an omission.
  // Glide holds 77 distinct values in HEROICON's vocabulary ("archive-box",
  // "cog-6-tooth", "user-circle") plus a dozen that are not icon names at all
  // ("wichtig-icon", "-claim", "accident-people"). This app draws PHOSPHOR under
  // Phosphor's own names and CLAUDE.md forbids an alias layer between the two,
  // so translating them would be exactly the thing the rule exists to stop, and
  // the door agrees: it refuses a name that is not on offer ("Icon isn't one of
  // the ones on offer"). The module keeps whatever icon it already has.
  const dates = {}
  if (cell(g, MODULE, "createdAt")) dates.created_at = cell(g, MODULE, "createdAt")
  if (cell(g, MODULE, "updatedAt")) dates.updated_at = cell(g, MODULE, "updatedAt")
  modUpdates.push({ id: here.id, name: here.name, app: appNm, fields, archived: cell(g, MODULE, "archived") === "true", dates })
}

// sprints — app + start date, tolerating one day (dates are local midnight in UTC)
const sprintKey = new Map()
for (const s of ourSprints) {
  const app = ourApps.find((a) => a.id === s.app_id); if (!app) continue
  const base = new Date(s.starts_on)
  for (const shift of [-1, 0, 1]) sprintKey.set(norm(RENAME[norm(app.name)] ?? app.name) + "|" + new Date(base.getTime() + shift * 86400000).toISOString().slice(0, 10), s)
}
let typeUnmapped = 0
for (const g of gSprints) {
  const appNm = gAppName.get(cell(g, SPRINT, "app")) ?? ""
  if (SKIP_APPS.has(norm(appNm))) continue
  if (CHILDREN_UNTOUCHED.has(norm(appNm))) continue
  const starts = cell(g, SPRINT, "startsOn"), ends = cell(g, SPRINT, "endsOn")
  const label = choiceLabel.get(cell(g, SPRINT, "type")) ?? ""
  const mapped = SPRINT_TYPE[norm(label)]
  if (!mapped) { typeUnmapped++; notes.push(`sprint type "${label || "(deleted choice)"}" on ${appNm} has no home in shared/sprint-types.ts — type left as it is`) }
  const here = sprintKey.get(norm(appNm) + "|" + starts.slice(0, 10))
  if (here) sprintUpdates.push({ id: here.id, ref: here.ref, app: appNm, type: mapped ?? null, starts, ends })
  else {
    const app = ourAppByName.get(norm(appNm))
    if (!app) { notes.push(`cannot create a sprint for "${appNm}" — no such app here`); continue }
    sprintCreates.push({ appId: app.id, accountId: app.account_id, app: appNm, type: mapped ?? null, starts, ends })
  }
}

say(`\nPLAN`)
say(`  apps      ${String(appUpdates.length).padStart(4)} updated   ${appCreates.length} created   (${appUpdates.filter((a) => a.renamed).map((a) => `${a.was} -> ${a.name}`).join(", ") || "no renames"})`)
say(`  modules   ${String(modUpdates.length).padStart(4)} updated`)
say(`  sprints   ${String(sprintUpdates.length).padStart(4)} updated   ${sprintCreates.length} created`)
say(`  stakeholders: ${appUpdates.filter((a) => a.main).length} main, ${appUpdates.reduce((n, a) => n + a.others.length, 0)} others`)
say(`  sprint types with no mapping: ${typeUnmapped} (left as they are)`)
if (notes.length) { say(`\nNOTES (${notes.length})`); [...new Set(notes)].slice(0, 14).forEach((n) => say(`  · ${n}`)) }

if (!CONFIRM) { say(`\nDry run. Nothing written. Add --confirm.`); process.exit(0) }

// ── write ────────────────────────────────────────────────────────────────────
say(`\nWRITING`)
const must = async (res, what) => { if (!res.ok) { console.error(`  FAILED ${what} — ${res.status} ${res.body?.message ?? ""}`); process.exit(1) } return res }

for (const a of appUpdates) {
  const body = { id: a.id, name: a.name, ...a.fields }
  // THE MAIN IS ONE OF THE PEOPLE, not a thirteenth thing beside them: the door
  // refuses a main stakeholder who is not in the set ("The main stakeholder has
  // to be one of the people on this app"), which is the right rule and the one
  // my first pass broke by subtracting the main out of `others`.
  if (a.main) body.mainStakeholderContactId = a.main
  const set = a.main ? [a.main, ...a.others] : a.others
  if (set.length) body.stakeholderContactIds = set
  await must(await api("/api/tenancy/apps/update", { method: "POST", body: JSON.stringify(body) }, cookie), `app ${a.ref} ${a.name}`)
}
say(`  ${appUpdates.length} apps updated`)
for (const a of appCreates) {
  const body = { name: a.name, accountId: a.accountId, ...a.fields }
  if (a.main) body.mainStakeholderContactId = a.main
  const set2 = a.main ? [a.main, ...a.others] : a.others
  if (set2.length) body.stakeholderContactIds = set2
  await must(await api("/api/tenancy/apps", { method: "POST", body: JSON.stringify(body) }, cookie), `creating app ${a.name}`)
}
say(`  ${appCreates.length} apps created`)

for (const m of modUpdates) {
  await must(await api("/api/tenancy/app-modules/update", { method: "POST", body: JSON.stringify({ id: m.id, name: m.name, ...m.fields }) }, cookie), `module ${m.name}`)
  if (m.archived) await api("/api/tenancy/app-modules/active", { method: "POST", body: JSON.stringify({ id: m.id, active: false }) }, cookie)
}
say(`  ${modUpdates.length} modules updated`)

for (const s of sprintUpdates) {
  const body = { id: s.id, name: (ourSprints.find((x) => x.id === s.id)?.name) ?? s.app, startsOn: s.starts, endsOn: s.ends }
  if (s.type) body.sprintType = s.type
  await must(await api("/api/content/sprints/update", { method: "POST", body: JSON.stringify(body) }, cookie), `sprint ${s.ref}`)
}
say(`  ${sprintUpdates.length} sprints updated`)
for (const s of sprintCreates) {
  const body = { appId: s.appId, accountId: s.accountId, name: `${s.type ?? "Sprint"} · ${s.starts.slice(0, 7)}`, startsOn: s.starts, endsOn: s.ends }
  if (s.type) body.sprintType = s.type
  await must(await api("/api/content/sprints", { method: "POST", body: JSON.stringify(body) }, cookie), `creating sprint for ${s.app}`)
}
say(`  ${sprintCreates.length} sprints created`)

// ── the dates, straight to D1, AFTER every door write (they stamp updated_at) ─
let dated = 0
for (const a of appUpdates) {
  const sets = []
  if (a.dates.created_at) sets.push(`created_at = ${q(a.dates.created_at)}`)
  if (a.dates.updated_at) sets.push(`updated_at = ${q(a.dates.updated_at)}`)
  if (sets.length) { await d1(`UPDATE apps SET ${sets.join(", ")} WHERE id = ${q(a.id)}`); dated++ }
}
for (const m of modUpdates) {
  const sets = []
  if (m.dates.created_at) sets.push(`created_at = ${q(m.dates.created_at)}`)
  if (m.dates.updated_at) sets.push(`updated_at = ${q(m.dates.updated_at)}`)
  if (sets.length) { await d1(`UPDATE app_modules SET ${sets.join(", ")} WHERE id = ${q(m.id)}`); dated++ }
}
say(`  ${dated} rows carry Glide's own dates`)

// ── prove it ─────────────────────────────────────────────────────────────────
say(`\nPROOF (read back out of the database)`)
let bad = 0
const afterApps = new Map((await d1("SELECT * FROM apps")).map((r) => [r.id, r]))
for (const a of appUpdates) {
  const row = afterApps.get(a.id)
  if (!row) { console.error(`  MISSING app ${a.ref}`); bad++; continue }
  if (row.name !== a.name) { console.error(`  ${a.ref} name is "${row.name}", expected "${a.name}"`); bad++ }
  for (const [k, col] of [["url", "url"], ["about", "about"], ["clientContext", "client_context"], ["solution", "solution"], ["keyActors", "key_actors"]])
    if (a.fields[k] && String(row[col] ?? "") !== String(a.fields[k])) { console.error(`  ${a.ref} ${col} did not land`); bad++ }
  if (a.dates.created_at && row.created_at !== a.dates.created_at) { console.error(`  ${a.ref} created_at did not land`); bad++ }
}
const afterSprints = await d1("SELECT COUNT(*) n FROM sprints")
const afterMods = await d1("SELECT COUNT(*) n FROM app_modules")
const afterStake = await d1("SELECT COUNT(*) n FROM app_stakeholders WHERE deactivated_at IS NULL")
say(`  apps ${afterApps.size}   modules ${afterMods[0].n}   sprints ${afterSprints[0].n}   live stakeholder rows ${afterStake[0].n}`)
// Kwapso must be exactly as it was.
const kwBefore = backup.apps.filter((a) => a.account_id === kwapsoId)
const kwAfter = [...afterApps.values()].filter((a) => a.account_id === kwapsoId)
const kwChanged = kwBefore.filter((b) => JSON.stringify(b) !== JSON.stringify(kwAfter.find((a) => a.id === b.id)))
say(`  Kwapso's own apps unchanged: ${kwChanged.length === 0 ? `yes (${kwBefore.length})` : `NO — ${kwChanged.length} changed`}`)
if (kwChanged.length) bad += kwChanged.length
if (bad) { console.error(`\n${bad} problems. The backup above puts everything back.`); process.exit(1) }
say(`\nDone.`)
