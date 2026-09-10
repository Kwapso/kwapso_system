// WHAT ONE IDENTITY PER THING ACTUALLY BUYS — measured, not assumed.
//
// A Google source's key is the reader's own id, a colon, and the thing's id, so
// two colleagues who can both see one item get a row each. The rebuild plan
// calls that a duplicate and proposes ONE source with a sighting per person
// (workers/content/src/lib/knowledge-identity.ts). This counts the duplicates
// rather than believing in them, and it is the before/after instrument for that
// change: run it before the fold and again after, and the "rows saved" column
// should have become zero.
//
// READ-ONLY. It writes nothing, anywhere, and takes no --apply.
//
// WHAT IT SAID ON STAGING, 10 Sep 2026 (753 live Google sources, one team):
//
//   google_calendar   66 rows,  33 things  ->  33 rows saved   3 readers
//   google_chat      173 rows, 173 things  ->   0 rows saved   1 reader
//   google_drive      78 rows,  78 things  ->   0 rows saved   1 reader
//   google_gmail     436 rows, 436 things  ->   0 rows saved   3 readers
//
// THREE THINGS THAT CHANGES ABOUT THE PLAN.
//
// 1. The duplication is REAL and it is entirely the CALENDAR. All 27 events held
//    more than once are held by different people (never one person twice), and
//    every one of those 66 rows is on the private shelf — so folding them keeps
//    each person's readability exactly as it is. That is the whole prize today:
//    33 rows and 33 chunks.
//
// 2. Drive and Chat show no duplication AT ALL, because only one person has
//    either connected. The fix there is insurance rather than a saving, and it
//    is worth having for exactly that reason: the day a second person names the
//    same folder is the day it would otherwise double.
//
// 3. GMAIL CANNOT MERGE UNDER THE ID IT CARRIES, and the numbers say so out
//    loud: three readers, 436 rows, zero collisions. Gmail's message id is
//    scoped to ONE MAILBOX. The cross-mailbox identity is the RFC-822 message
//    header, which this app does not read. The last block below sizes what
//    reading it would buy, by subject and minute — a PROXY and an upper bound,
//    not a proof, since two different mails can share both.

import { cloudflareCredentials } from "./lib/cf-credentials.mjs"

const { account: ACCOUNT, token: TOKEN } = cloudflareCredentials()
const CORE = process.env.KB_CORE || "1df02340-fc91-4cac-8ccb-d19528dcd9f7"
const CF = "https://api.cloudflare.com/client/v4"

async function sql(db, statement, params = []) {
  const res = await fetch(`${CF}/accounts/${ACCOUNT}/d1/database/${db}/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql: statement, params }),
    signal: AbortSignal.timeout(60_000),
  })
  const json = await res.json()
  if (!json.success) throw new Error(`${statement.slice(0, 70)}: ${JSON.stringify(json.errors).slice(0, 300)}`)
  return json.result[0].results
}

// THIS CLOUDFLARE ACCOUNT IS SHARED WITH OTHER COMPANIES, and most of the
// databases on it are not ours. A name is not proof; four tables together are.
const FINGERPRINT = ["knowledge_sources", "knowledge_chunks", "internal_rates", "google_sources"]
async function proveTeamDatabase(db, name) {
  const found = (
    await sql(
      db,
      `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${FINGERPRINT.map(() => "?").join(",")})`,
      FINGERPRINT
    )
  ).map((r) => r.name)
  if (found.length !== FINGERPRINT.length)
    throw new Error(
      `REFUSING to read ${name} (${db}): not a kwapso team schema. Has: ${found.join(", ") || "(none)"}.`
    )
}

/** The thing, with the reader's own id taken off the front. A user id holds no
 * colon, so the FIRST one is the boundary whatever the thing's id looks like —
 * the same rule `sightedExternalId` keeps in the worker. */
const thingOf = (id) => {
  const s = String(id)
  const at = s.indexOf(":")
  return at === -1 ? s : s.slice(at + 1)
}
const personOf = (id) => {
  const s = String(id)
  const at = s.indexOf(":")
  return at === -1 ? null : s.slice(0, at)
}

const pad = (n, w) => String(n).padStart(w)

const teams = await sql(CORE, "SELECT id, name, database_id FROM teams WHERE database_id IS NOT NULL")
console.log(`measure-source-identity — read-only, ${teams.length} team database(s)\n`)

for (const team of teams) {
  await proveTeamDatabase(team.database_id, team.name)
  // R14: bounded, and stated here. One team's whole corpus is far below this.
  const rows = await sql(
    team.database_id,
    `SELECT origin_table, origin_row_id, owner_user_id, title, record_date, chunk_count
       FROM knowledge_sources
      WHERE deactivated_at IS NULL AND origin_row_id IS NOT NULL AND origin_table LIKE 'google_%'
      ORDER BY id LIMIT 20000`
  )
  if (!rows.length) {
    console.log(`${team.name}: no live Google sources\n`)
    continue
  }
  console.log(`${team.name} (${team.database_id})`)

  const byService = new Map()
  for (const r of rows) {
    if (!byService.has(r.origin_table)) byService.set(r.origin_table, new Map())
    const things = byService.get(r.origin_table)
    const key = thingOf(r.origin_row_id)
    if (!things.has(key)) things.set(key, [])
    things.get(key).push(r)
  }

  let totalRows = 0
  let totalThings = 0
  let chunksTwice = 0
  let acrossPeople = 0
  let samePersonTwice = 0
  for (const [service, things] of [...byService].sort()) {
    let rowsHere = 0
    const readers = new Set()
    for (const group of things.values()) {
      rowsHere += group.length
      for (const g of group) {
        const p = personOf(g.origin_row_id)
        if (p) readers.add(p)
      }
      if (group.length < 2) continue
      // WHOSE COPIES ARE THEY? Two people seeing one thing is what the identity
      // change folds. ONE person holding two rows for one thing would be a
      // different fault entirely, and folding it would hide rather than fix it —
      // so the two are counted apart and never added together.
      const people = new Set(group.map((g) => personOf(g.origin_row_id)))
      if (people.size === group.length) acrossPeople++
      else samePersonTwice++
      for (const g of group.slice(1)) chunksTwice += g.chunk_count || 0
    }
    totalRows += rowsHere
    totalThings += things.size
    console.log(
      `  ${service.padEnd(17)} rows ${pad(rowsHere, 5)}  things ${pad(things.size, 5)}` +
        `  rows saved ${pad(rowsHere - things.size, 5)}  readers ${readers.size}`
    )
  }
  const saved = totalRows - totalThings
  console.log(
    `  ${"TOTAL".padEnd(17)} rows ${pad(totalRows, 5)}  things ${pad(totalThings, 5)}` +
      `  rows saved ${pad(saved, 5)}  (${((100 * saved) / totalRows).toFixed(1)}%)` +
      `  chunks embedded twice ${chunksTwice}`
  )
  console.log(
    `    of the things held more than once: ${acrossPeople} are one thing seen by several people` +
      ` (what the fold is for), ${samePersonTwice} are one person holding two rows (a different fault)`
  )

  // THE MAIL, SIZED BY PROXY. Subject plus the minute it is dated is as close as
  // a stored row can get to "the same message in two mailboxes" without the
  // RFC-822 header. An UPPER BOUND: two different mails can share both.
  const mail = rows.filter((r) => r.origin_table === "google_gmail")
  if (mail.length) {
    const byMessage = new Map()
    for (const r of mail) {
      const key = `${String(r.title).trim()}|${String(r.record_date ?? "").slice(0, 16)}`
      if (!byMessage.has(key)) byMessage.set(key, new Set())
      byMessage.get(key).add(personOf(r.origin_row_id))
    }
    const shared = [...byMessage.values()].filter((people) => people.size > 1)
    console.log(
      `    mail: ${mail.length} rows, and at most ${shared.reduce((n, p) => n + p.size - 1, 0)} of them` +
        ` would fold if the cross-mailbox message header were read (${shared.length} messages, by subject and minute)`
    )
  }
  console.log("")
}
