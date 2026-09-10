#!/usr/bin/env node
// IS ANYTHING RED, ANYWHERE, IN THE DATA?
//
// ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
//
// `npm run check` answers "is the CODE sound". The deploy smoke answers "do the
// DOORS answer". Neither of them answers the question the owner actually asks,
// which is "is anything broken right now" — and on 9 Sep 2026 the answer was yes
// for four days while both of those were green. A Gmail refusal had been stored
// on a knowledge lane's own row since Tuesday. Nothing failed, nothing alerted,
// and a red sentence sat under a button on his screen every time he opened it.
//
// The state that can be red lives in the TEAM DATABASES, one per team, and it is
// red in four different places that nobody was reading together:
//
//   knowledge_ingest.last_error     a lane that failed and has not had a clean
//                                   run since (R12 — it survives on purpose)
//   google_connections.last_error   a grant somebody removed in their Google
//                                   account, which is silent by nature
//   knowledge_sources.index_error   one document that could not be indexed
//   embed_attempts >= the cap       a source given up on: still searchable by
//                                   its words, never by meaning
//
// ── WHAT IT REFUSES TO DO ───────────────────────────────────────────────────
//
// It never writes and never repairs. A repair belongs to the code that owns the
// row; a probe that quietly fixed things would make "is anything red" answer
// "no" by having changed the answer.
//
// And it PROVES each database is ours before reading it. This Cloudflare account
// is shared with other companies — eleven of sixteen D1 databases on it are not
// ours — so a team id is not proof of whose schema it is. Four tables together
// are: `help_threads` alone is shared with another app on this account.
//
//   node scripts/nothing-is-red.mjs               # staging
//   node scripts/nothing-is-red.mjs --production
//
// Exits 0 when nothing is red, 1 when something is — so it can be a gate, and
// so "nothing is red" is a fact somebody ran rather than a sentence somebody
// wrote.

import { cloudflareCredentials } from "./lib/cf-credentials.mjs"

const PRODUCTION = process.argv.includes("--production")
const { account: ACCOUNT, token: TOKEN } = cloudflareCredentials()
const CORE = process.env.KB_CORE || (PRODUCTION ? "" : "1df02340-fc91-4cac-8ccb-d19528dcd9f7")
if (!CORE) {
  console.error("Set KB_CORE to the core database id for this environment.")
  process.exit(2)
}

/** HOW RECENTLY A LANE MUST HAVE WORKED to count as recovering rather than
 * stuck. Two hours, chosen from the sweep's own cadence: the cron runs every
 * fifteen minutes and rotates oldest-swept-first across the kinds, so a healthy
 * lane comes round several times an hour and two hours is comfortably more than
 * one missed turn. A lane that has not had a clean run in two hours is not
 * having a bad moment. */
const RECOVERY_WINDOW_MS = 2 * 60 * 60 * 1000

const CF = "https://api.cloudflare.com/client/v4"
async function sql(db, statement, params = []) {
  const res = await fetch(`${CF}/accounts/${ACCOUNT}/d1/database/${db}/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql: statement, params }),
    signal: AbortSignal.timeout(60_000),
  })
  const json = await res.json()
  if (!json.success) throw new Error(`${statement.slice(0, 60)}: ${JSON.stringify(json.errors).slice(0, 200)}`)
  return json.result[0].results
}

/** Four tables together prove a kwapso team schema. See the header. */
const FINGERPRINT = ["knowledge_sources", "knowledge_chunks", "internal_rates", "google_sources"]

const teams = await sql(CORE, `SELECT id, name, database_id FROM teams WHERE database_id IS NOT NULL`)
let red = 0
let checked = 0

for (const team of teams) {
  let found = []
  try {
    found = (
      await sql(
        team.database_id,
        `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${FINGERPRINT.map(() => "?").join(",")})`,
        FINGERPRINT
      )
    ).map((r) => r.name)
  } catch {
    // Unreachable is not the same as red, and saying so is the point: a database
    // this cannot open is a fact about the run, not about the team.
    console.log(`  ??  ${team.name}: could not be opened`)
    continue
  }
  if (found.length !== FINGERPRINT.length) continue
  checked++

  // A LANE THAT FAILED ONCE IS NOT A LANE THAT IS BROKEN, and the difference is
  // read from BEHAVIOUR rather than from the error's wording.
  //
  // Gmail answers a quota problem with a refusal, routinely, several times a day,
  // and the lane records it (R12) and clears it on its next clean run. If that
  // counted as red this gate would be red most of the time — and a gate that
  // fires on a routine transient is a gate people route around, which is the same
  // reasoning the migration gate carries for letting an ahead estate through.
  //
  // So the question is not what the message SAYS, it is whether the lane is still
  // working: `last_ok_at` inside the recovery window means it failed and recovered
  // and will again; older than that, or never, means it has been failing since
  // Tuesday and nobody noticed — which is the exact state this whole script
  // exists for. Behavioural, so a message nobody has thought of yet is graded
  // correctly the first time.
  const lanes = await sql(
    team.database_id,
    `SELECT kind, last_error, last_ok_at FROM knowledge_ingest WHERE last_error IS NOT NULL`
  )
  const floor = Date.now() - RECOVERY_WINDOW_MS
  const stuck = lanes.filter((l) => !(Date.parse(l.last_ok_at ?? "") > floor))
  const recovering = lanes.filter((l) => Date.parse(l.last_ok_at ?? "") > floor)
  const conns = await sql(
    team.database_id,
    `SELECT service, google_email, last_error FROM google_connections WHERE last_error IS NOT NULL`
  )
  const [sources] = await sql(
    team.database_id,
    `SELECT COUNT(*) n FROM knowledge_sources WHERE index_error IS NOT NULL AND deactivated_at IS NULL`
  )
  const [givenUp] = await sql(
    team.database_id,
    `SELECT COUNT(*) n FROM knowledge_sources WHERE embed_attempts >= 3 AND deactivated_at IS NULL`
  )

  const here = stuck.length + conns.length + sources.n
  red += here
  if (!here && !givenUp.n && !recovering.length) {
    console.log(`  OK  ${team.name}`)
    continue
  }
  console.log(`  ${here ? "NO " : "OK "} ${team.name}`)
  for (const l of stuck)
    console.log(`        lane ${l.kind}: ${l.last_error}`)
  for (const l of stuck)
    console.log(`          last clean run: ${l.last_ok_at ?? "never"} — this lane is NOT recovering`)
  for (const l of recovering)
    console.log(`        (lane ${l.kind} failed and recovered since — reported, not counted: ${l.last_error})`)
  for (const c of conns) console.log(`        connection ${c.service} (${c.google_email}): ${c.last_error}`)
  if (sources.n) console.log(`        ${sources.n} source(s) carry an index error`)
  // Given up is reported and NOT counted: it is a bounded, deliberate state the
  // ingest chose after repeated failures, and it clears itself the moment the
  // text changes. Counting it would make this red for ever over a decision.
  if (givenUp.n) console.log(`        (${givenUp.n} source(s) given up on for embedding — reported, not counted)`)
}

console.log()
if (red) {
  console.log(`FAIL ${red} red thing${red === 1 ? "" : "s"} across ${checked} team database${checked === 1 ? "" : "s"}.`)
  process.exit(1)
}
console.log(`PASS nothing is red across ${checked} team database${checked === 1 ? "" : "s"}.`)
