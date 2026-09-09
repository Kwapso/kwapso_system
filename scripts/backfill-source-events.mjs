// WHICH CALL AN EXISTING SOURCE CAME FROM — the one route the migration cannot run.
//
// ── WHY A SCRIPT AND NOT MORE SQL ───────────────────────────────────────────
//
// `0070_a_source_says_which_call_it_is_from` places two of the three routes in
// SQL, because both are substring work on a column: a calendar source's own
// `origin_row_id` IS Google's event id, and a meeting has carried
// `google_event_id` since 0012. The third cannot be done there at all. Google
// writes the event into a calendar notice as
// `…/calendar/event?action=VIEW&eid=<base64url of "<eventId> <calendarId>">`,
// and SQLite has no base64. So this reads the same statement in JavaScript,
// through the app's own `calendarEventIdInText` — not a second implementation of
// what an event reference is, for the reason rechunk-stale-passages.mjs already
// gives about chunking: the day two definitions drift, the base holds parents
// nothing else can reproduce.
//
// ── WHAT IT WILL AND WILL NOT PLACE ─────────────────────────────────────────
//
// Measured on staging, 8 Sep 2026, over every mail the base holds:
//
//     240 messages carry an `eid`   — 240 of 240 decode cleanly
//     225 of those name an event this base already holds (93.8%)
//      15 name a real event outside any window we ever read
//     121 "Notes:" messages carry NO event reference of any kind
//
// The 121 are the ones that hurt: they hold the minutes. Google states nothing
// on them — no eid, no Meet link, only the event's title in quotes — so they
// keep a NULL. That is a CORRECT answer. Matching them on their title is the one
// thing this must never do: `eventNamedBy` already groups by title elsewhere in
// this app, and a wrong parent is worse than none because the base then answers
// confidently from the wrong artefact.
//
// ── IT NEVER OVERWRITES A BETTER ROUTE ──────────────────────────────────────
//
// Every write rides `event_id IS NULL`, so a rerun moves zero rows and an id the
// calendar or meetings route already placed is left exactly where it is (R17 —
// the current-status predicate rides the UPDATE).
//
//   node --experimental-transform-types scripts/backfill-source-events.mjs
//   node --experimental-transform-types scripts/backfill-source-events.mjs --apply
//
// STAGING ONLY.

import "./lib/shared-alias.mjs"

import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { cloudflareCredentials } from "./lib/cf-credentials.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, "..")
const APPLY = process.argv.includes("--apply")

if (process.argv.includes("--production")) {
  console.error("This script is staging-only. Production holds no team data.")
  process.exit(1)
}

const { account: ACCOUNT, token: TOKEN } = cloudflareCredentials(REPO)
const CORE = process.env.KB_CORE || "1df02340-fc91-4cac-8ccb-d19528dcd9f7"
const CF = "https://api.cloudflare.com/client/v4"

async function cf(path, body) {
  const res = await fetch(`${CF}/accounts/${ACCOUNT}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60_000),
  })
  const json = await res.json()
  if (!json.success && json.errors)
    throw new Error(`${path}: ${JSON.stringify(json.errors).slice(0, 300)}`)
  return json.result
}
const sql = async (db, statement, params = []) =>
  (await cf(`/d1/database/${db}/query`, { sql: statement, params }))[0].results

/** THE APP'S OWN DEFINITION of what an event reference is. */
const { calendarEventIdInText } = await import(
  join(REPO, "workers", "content", "src", "lib", "google-api.ts")
)

/** PROVE IT IS A TEAM DATABASE before touching it. This account hosts other
 * companies' databases; a schema conjunction is the cheapest proof that this one
 * is ours, and it refuses rather than guesses. */
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
    throw new Error(`REFUSING to touch ${name} (${db}): not a kwapso team schema.`)
}

/** Has 0070 landed here? The dry run works either way — it needs only the bodies
 * — but a write cannot, and "no such column" is a worse sentence than this one. */
async function hasEventColumn(db) {
  const cols = await sql(db, `SELECT name FROM pragma_table_info('knowledge_sources')`)
  return cols.some((c) => c.name === "event_id")
}

/** A PAGE, NOT A READ. The mail lane is the biggest kind in the base and a
 * one-page read of a paged door is how a census answers a confident zero. Keyed
 * on `id`, so a row written while this runs cannot be skipped or seen twice. */
const PAGE = 500

console.log(`backfill-source-events — staging${APPLY ? "" : "  (DRY RUN, nothing will be written)"}\n`)

const teams = await sql(CORE, "SELECT id, name, database_id FROM teams WHERE database_id IS NOT NULL")

for (const team of teams) {
  await proveTeamDatabase(team.database_id, team.name)
  const ready = await hasEventColumn(team.database_id)
  console.log(`${team.name} (${team.database_id})${ready ? "" : "  — migration 0070 NOT applied here"}`)

  let after = ""
  let read = 0
  let stated = 0
  const placeable = []
  for (;;) {
    // R14 hard cap: PAGE rows a page, keyed forward on the primary key. Only
    // rows that could still gain a parent are read — one that already has one is
    // finished, and re-reading it would be work with no possible outcome.
    const rows = await sql(
      team.database_id,
      `SELECT id, title, body FROM knowledge_sources
        WHERE origin_table = 'google_gmail' ${ready ? "AND event_id IS NULL" : ""} AND id > ?
        ORDER BY id LIMIT ${PAGE}`,
      [after]
    )
    if (!rows.length) break
    read += rows.length
    for (const r of rows) {
      const eventId = calendarEventIdInText(r.body || "")
      if (!eventId) continue
      stated++
      placeable.push({ id: r.id, eventId, title: r.title })
    }
    after = rows[rows.length - 1].id
    if (rows.length < PAGE) break
  }

  // WHAT COULD NOT BE PLACED IS A FINDING, NOT A FAILURE, so it is counted and
  // named rather than left as the difference between two other numbers.
  const silent = read - stated
  console.log(`  mail rows without a parent: ${read}`)
  console.log(`  Google states the event on: ${stated}`)
  console.log(`  Google states nothing on:   ${silent}  (a NULL is the correct answer for these)`)

  if (!placeable.length || !APPLY) {
    if (!APPLY && placeable.length)
      for (const p of placeable.slice(0, 5))
        console.log(`    would place ${String(p.title).slice(0, 58)} → ${p.eventId}`)
    console.log("")
    continue
  }

  let written = 0
  for (const p of placeable) {
    // R17: the predicate rides the UPDATE, so a rerun — or a route that got here
    // first — moves zero rows rather than re-deciding a parent.
    const done = await sql(
      team.database_id,
      `UPDATE knowledge_sources SET event_id = ?, event_id_from = 'mail', updated_at = ?
        WHERE id = ? AND event_id IS NULL RETURNING id`,
      [p.eventId, new Date().toISOString(), p.id]
    )
    written += done.length
  }
  console.log(`  placed: ${written}\n`)
}
