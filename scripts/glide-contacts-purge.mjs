#!/usr/bin/env node
// Delete the six TEST contacts for good, on the owner's explicit instruction
// (23 Sep 2026: "delete those 5 for good - also max mustermann"). They are the
// people who exist in this app and in no Glide contact row.
//
//   node scripts/glide-contacts-purge.mjs            # dry run
//   node scripts/glide-contacts-purge.mjs --confirm  # the real thing
//
// THIS IS A REAL DELETE. The app has no delete door for an account and is not
// getting one; this is a one-off migration step against the team's own database,
// named as such rather than dressed up as an ordinary write.
//
// WHAT IT REFUSES TO TAKE WITH THEM. 29 tickets carry one of the six as
// `raised_by_contact_id`, and they are not test noise — they are real bug
// reports the owner filed through a test contact (T3652 "Stories created from a
// ticket's Related...", T3659 "KB has two overlapping search entry points").
// Deleting a parent whose children are real is how a migration quietly destroys
// work, so the tickets STAY and only the pointer is blanked. Her instruction was
// about contacts; a ticket is not a contact.
//
// Order: children before parents, because this schema has 90 foreign key columns
// and not one ON DELETE CASCADE, so nothing happens automatically.

import { readFileSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const CONFIRM = process.argv.includes("--confirm")
const env = Object.fromEntries(readFileSync(resolve(ROOT, ".env"), "utf8").split("\n")
  .filter((l) => /^[A-Z_]+=/.test(l))
  .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/#.*$/, "").trim()]))
const DB = "727537f7-653d-4114-af23-332d1aae0f90"

const q = async (sql) => {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${DB}/query`,
    { method: "POST", headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql }) })
  const b = await r.json()
  if (!b.success) { console.error("D1 refused:", JSON.stringify(b.errors)); process.exit(1) }
  return b.result?.[0]?.results ?? []
}

// The six, BY EMAIL rather than by name — a display name is not an identifier in
// this table, which is exactly how a delete of one "Max Mustermann" was reported
// as a delete of the other one yesterday.
const EMAILS = [
  "alaap+client@kwapso.com", "alaap+client2@kwapso.com", "alex+1@kwapso.com",
  "alaap@kwapso.com", "marta@bergman.example", "alaap+mm@kwapso.com",
]
const list = EMAILS.map((e) => `'${e}'`).join(",")
const people = await q(`SELECT id, name, email FROM accounts WHERE account_type='individual' AND email IN (${list})`)
if (people.length !== 6) {
  console.error(`Stopped: expected 6 contacts, found ${people.length}. Nothing written.`)
  people.forEach((p) => console.error(`  found ${p.name} <${p.email}>`))
  process.exit(1)
}
const ids = people.map((p) => `'${p.id}'`).join(",")
console.log("THE SIX")
people.forEach((p) => console.log(`  ${p.id}  ${String(p.name).padEnd(34)} ${p.email}`))

// Everything that points at them, counted before anything moves.
const counts = {}
for (const [t, c] of [["account_links", "person_account_id"], ["help", "raised_by_contact_id"],
                      ["app_stakeholders", "contact_id"], ["client_role_people", "person_account_id"],
                      ["todos", "assigned_contact_id"], ["accounts", "parent_account_id"]]) {
  counts[`${t}.${c}`] = (await q(`SELECT COUNT(*) n FROM ${t} WHERE ${c} IN (${ids})`))[0].n
}
counts["portal_users"] = (await q(`SELECT COUNT(*) n FROM portal_users WHERE account_id IN (${ids}) OR current_account_id IN (${ids})`))[0].n
console.log("\nWHAT POINTS AT THEM")
Object.entries(counts).forEach(([k, v]) => console.log(`  ${k.padEnd(36)} ${v}`))

console.log("\nPLAN")
console.log(`  KEEP   ${counts["help.raised_by_contact_id"]} tickets, blanking only their 'raised by' pointer`)
console.log(`  DELETE ${counts["account_links.person_account_id"]} company links, ${counts["app_stakeholders.contact_id"]} stakeholder rows, ${counts["portal_users"]} portal logins`)
console.log(`  DELETE the 6 contacts themselves`)

// The backup, before anything.
const stamp = new Date().toISOString().replace(/[:.]/g, "-")
const backup = {
  takenAt: new Date().toISOString(),
  contacts: people,
  account_links: await q(`SELECT * FROM account_links WHERE person_account_id IN (${ids})`),
  app_stakeholders: await q(`SELECT * FROM app_stakeholders WHERE contact_id IN (${ids})`),
  portal_users: await q(`SELECT * FROM portal_users WHERE account_id IN (${ids}) OR current_account_id IN (${ids})`),
  help_pointers: await q(`SELECT id, ref, raised_by_contact_id FROM help WHERE raised_by_contact_id IN (${ids})`),
}
const path = resolve(ROOT, `glide/backup-contacts-purge-${stamp}.json`)
writeFileSync(path, JSON.stringify(backup, null, 1))
console.log(`\nBackup: ${path.replace(ROOT + "/", "")}`)

if (!CONFIRM) { console.log("\nDry run. Nothing written. Add --confirm."); process.exit(0) }

console.log("\nWRITING")
await q(`UPDATE help SET raised_by_contact_id = NULL WHERE raised_by_contact_id IN (${ids})`)
console.log(`  ${counts["help.raised_by_contact_id"]} tickets kept, 'raised by' blanked`)
await q(`DELETE FROM account_links WHERE person_account_id IN (${ids})`)
await q(`DELETE FROM app_stakeholders WHERE contact_id IN (${ids})`)
await q(`DELETE FROM client_role_people WHERE person_account_id IN (${ids})`)
await q(`DELETE FROM portal_users WHERE account_id IN (${ids}) OR current_account_id IN (${ids})`)
// THE KNOWLEDGE MIRRORS. The first real run died here on a foreign key I had not
// checked: knowledge_sources.account_id held 10 rows for the six. Every one is a
// MIRROR the sweep writes for a record (kind "account", one per contact) or for a
// portal login (kind "portal_login"), never anything a person authored - checked
// by KIND before deleting, because destroying somebody's written note to satisfy a
// constraint is the one thing this script must not do. Chunks go before sources.
const ksRows = await q(`SELECT id, kind FROM knowledge_sources WHERE account_id IN (${ids})`)
if (ksRows.length) {
  const authored = ksRows.filter((r) => r.kind !== "account" && r.kind !== "portal_login")
  if (authored.length) {
    console.error(`  STOPPED: ${authored.length} knowledge rows are not record mirrors (${authored.map((r) => r.kind).join(", ")}). Nothing further deleted.`)
    process.exit(1)
  }
  const ksIds = ksRows.map((r) => `'${r.id}'`).join(",")
  await q(`DELETE FROM knowledge_chunks WHERE source_id IN (${ksIds})`)
  await q(`DELETE FROM knowledge_sources WHERE id IN (${ksIds})`)
  console.log(`  ${ksRows.length} knowledge mirrors and their chunks deleted`)
}
console.log("  children deleted")
await q(`DELETE FROM accounts WHERE id IN (${ids})`)
console.log("  the 6 contacts deleted")

// PROVE IT: gone, tickets intact, and no column anywhere still points at them.
console.log("\nPROOF")
const left = await q(`SELECT COUNT(*) n FROM accounts WHERE id IN (${ids})`)
console.log(`  contacts remaining of the 6: ${left[0].n}`)
const tickets = await q(`SELECT COUNT(*) n FROM help WHERE ref IS NOT NULL`)
console.log(`  tickets in the system now:   ${tickets[0].n}`)
let dangling = 0
const fks = await q(`SELECT m.name AS tbl, p."table" AS parent, p."from" AS col FROM sqlite_master m
  JOIN pragma_foreign_key_list(m.name) p WHERE m.type='table' AND p."table"='accounts'`)
for (const fk of fks) {
  const n = (await q(`SELECT COUNT(*) n FROM "${fk.tbl}" WHERE "${fk.col}" IS NOT NULL AND "${fk.col}" NOT IN (SELECT id FROM accounts)`))[0].n
  if (n) { console.error(`  DANGLING ${fk.tbl}.${fk.col}: ${n}`); dangling += n }
}
console.log(`  every foreign key column into accounts swept (${fks.length} of them): ${dangling === 0 ? "clean" : dangling + " DANGLING"}`)
if (dangling) process.exit(1)
console.log("\nDone.")
