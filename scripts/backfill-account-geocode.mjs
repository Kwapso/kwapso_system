// GEOCODE THE ACCOUNTS THAT PREDATE THE COLUMN, the one-time backfill
// `web/components/accounts/account-map.ts`'s own header promises the day
// migration 0118 lands: `lat`/`lng` (`workers/tenancy/src/team-schema/
// migrations.ts`, `0118_an_account_gets_a_position`) are set best-effort at
// WRITE time from here on (`workers/tenancy/src/lib/accounts.ts`'s
// `createAccount`/`updateAccount`), but every account created before that
// migration carries no position at all, this team measured fourteen active
// accounts on 23 Sep 2026, which is why a maintenance script, not a cron, is
// the right size for the job (R4, the same size call
// `scripts/backfill-ticket-raisers.mjs` already made for its own one-time
// job over the accounts table's own sibling column, `raised_by_contact_id`).
//
//   node --experimental-transform-types scripts/backfill-account-geocode.mjs                  # dry run, every team, nothing written
//   node --experimental-transform-types scripts/backfill-account-geocode.mjs --apply           # writes, ungeocoded rows only
//   node --experimental-transform-types scripts/backfill-account-geocode.mjs --apply --force   # ALSO re-geocodes rows that already have a position
//   node --experimental-transform-types scripts/backfill-account-geocode.mjs --production ...  # production, instead of staging
//   node --experimental-transform-types scripts/backfill-account-geocode.mjs --team <id> ...   # one team only
//
// ── ONE FORMULA, REUSED, NOT REINVENTED ─────────────────────────────────────
//
// `geocodeAddress` (`workers/tenancy/src/lib/geocode.ts`) is imported
// straight off its `.ts` source with `--experimental-transform-types`, the
// same seam `backfill-source-events.mjs` already uses for
// `calendarEventIdInText`, so this script asks Google the EXACT question
// `createAccount`/`updateAccount` ask at write time, under the SAME env var,
// `GOOGLE_MAPS_GEOCODE_KEY`. There is no second geocoding formula here to
// drift from the first, and it is exactly as best-effort here as it is
// there: an address Google cannot resolve, a network error, a timeout, all
// three come back `null` (its own header has the full account) rather than
// throwing, and this script counts them as "not placed" rather than failing
// the run.
//
// ── IT SAYS WHAT IT WILL DO BEFORE IT DOES IT ───────────────────────────────
//
// Dry run by default: every candidate is counted, per team, before a single
// byte is written, and a sample of what WOULD be written prints so a person
// can sanity-check it. `--apply` is the one deliberate step past that.
//
// ── SAFE TO RUN TWICE ────────────────────────────────────────────────────
//
// The default candidate read is `lat IS NULL AND lng IS NULL`, exactly the
// rows nothing has ever geocoded, and every write rides the identical
// predicate (R17's own idiom: the current-status predicate rides the
// UPDATE), so a rerun (interrupted, or simply run again next month) finds
// nothing left to do and changes nothing. `--force` is the one deliberate
// way past that default, spelled out as its own flag because it is the one
// mode that touches a row which ALREADY has a position, her brief's own
// words: "must not touch a row that already has a position unless told to."
// `--force` exists for the OTHER thing the brief asks this file to say: a
// stored position can drift when a client moves, and nothing re-asks Google
// on a schedule (see account-map.ts's own header), re-running this script
// with `--force` is the deliberate, manual way to refresh every position at
// once, on top of the ordinary path (editing the record re-geocodes the one
// account whose address just changed).
//
// ── WHAT IT NEVER TOUCHES ────────────────────────────────────────────────
//
// Archived accounts (`archived_at IS NOT NULL`), invisible everywhere,
// including the map, so geocoding one spends money on a position nothing
// will ever draw, and person rows (`account_type = 'individual'`), which
// the accounts map does not show. Inactive (deactivated) companies ARE
// geocoded: they still carry a real address and the map may show them again
// the day they are reactivated.
//
// STAGING BY DEFAULT; production needs `--production` said out loud.

import "./lib/shared-alias.mjs"

import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { cloudflareCredentials } from "./lib/cf-credentials.mjs"
import { expectedAccount } from "./check-cloudflare-account.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, "..")

const argv = process.argv.slice(2)
const APPLY = argv.includes("--apply")
const FORCE = argv.includes("--force")
const PRODUCTION = argv.includes("--production")
const teamArgAt = argv.indexOf("--team")
const ONLY_TEAM = teamArgAt >= 0 ? argv[teamArgAt + 1] : null

// THE ACCOUNT GUARD, the same guard `reset-all.mjs` and
// `check-team-migrations.mjs` both carry, and for the identical reason: no
// worker pins `account_id`, so wrangler/the Cloudflare API act on whichever
// account this shell happens to be signed into, and this machine hosts more
// than one company's data. `cloudflareCredentials` resolves the token; this
// is the belt-and-braces check that what it resolved is actually Kwapso's.
const KWAPSO_ACCOUNT_ID = expectedAccount()

// Staging's / production's own core database, the same pair
// `check-team-migrations.mjs`'s `ENVIRONMENTS` and every tenancy
// `wrangler.jsonc`'s own `CORE_DATABASE_ID` carry (db-ownership.test.ts
// keeps that file and the code agreeing). Addressed by UUID, not name, the
// Cloudflare D1 REST door takes the id directly, so there is no
// name-to-uuid lookup to keep in sync with a second source.
const CORE_DATABASE_ID = PRODUCTION
  ? "e55a2c0f-346a-4056-b01c-7869a8b253dc"
  : "1df02340-fc91-4cac-8ccb-d19528dcd9f7"

if (!process.env.GOOGLE_MAPS_GEOCODE_KEY) {
  console.error(
    "GOOGLE_MAPS_GEOCODE_KEY is not set in this shell.\n\n" +
      "This script's one job is to call Google's Geocoding API, so, unlike the\n" +
      "write-time path in workers/tenancy/src/lib/accounts.ts, where an absent key\n" +
      "is an ordinary, honest 'not offered', a run with no key here would only\n" +
      "ever write nulls. Export the same key the tenancy worker holds as a\n" +
      "secret (`wrangler secret put GOOGLE_MAPS_GEOCODE_KEY --env staging` to see\n" +
      "or rotate it) and re-run."
  )
  process.exit(2)
}

const { account: ACCOUNT, token: TOKEN } = cloudflareCredentials(REPO)
if (ACCOUNT !== KWAPSO_ACCOUNT_ID) {
  console.error(
    `Refusing to run: this shell resolves to Cloudflare account ${ACCOUNT},\n` +
      `and this script only ever touches ${KWAPSO_ACCOUNT_ID}.\n\n` +
      `Export CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN for Kwapso's own\n` +
      `account first (see CLAUDE.md, "Deploy credentials").`
  )
  process.exit(2)
}

const CF = "https://api.cloudflare.com/client/v4"

async function cf(path, body) {
  const res = await fetch(`${CF}/accounts/${ACCOUNT}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60_000),
  })
  const json = await res.json()
  if (!json.success && json.errors) throw new Error(`${path}: ${JSON.stringify(json.errors).slice(0, 300)}`)
  return json.result
}
const sql = async (db, statement, params = []) => (await cf(`/d1/database/${db}/query`, { sql: statement, params }))[0].results

/** THE APP'S OWN FORMULA, imported, never reimplemented. `geocodeAddress`
 * takes `{ GOOGLE_MAPS_GEOCODE_KEY }` (the same `Pick<Env, …>` shape
 * `createAccount`/`updateAccount` pass it) and the four address fields; it
 * never throws (its own header has the full account of why). */
const { geocodeAddress } = await import(join(REPO, "workers", "tenancy", "src", "lib", "geocode.ts"))
const GEOCODE_ENV = { GOOGLE_MAPS_GEOCODE_KEY: process.env.GOOGLE_MAPS_GEOCODE_KEY }

/** PROVE IT IS A TEAM DATABASE before touching it, the same fingerprint
 * `backfill-source-events.mjs` uses, over columns this migration's own
 * table (`accounts`) rather than the knowledge base's, so a database from
 * some other project on this account is refused rather than guessed at. */
const FINGERPRINT = ["accounts", "account_links", "portal_users"]
async function proveTeamDatabase(db, name) {
  const found = (
    await sql(
      db,
      `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${FINGERPRINT.map(() => "?").join(",")})`,
      FINGERPRINT
    )
  ).map((r) => r.name)
  if (found.length !== FINGERPRINT.length) throw new Error(`REFUSING to touch ${name} (${db}): not a kwapso team schema.`)
}

/** Has 0118 landed here? A dry run works either way, the count below reads
 * `0 AS lat, 0 AS lng` and reports every candidate as "not yet migrated"
 * rather than dying on "no such column", which is a worse sentence than
 * this one for an operator running the script the same day the migration
 * shipped, before the robot has reached every team. */
async function hasPositionColumns(db) {
  const cols = await sql(db, `SELECT name FROM pragma_table_info('accounts')`)
  const names = new Set(cols.map((c) => c.name))
  return names.has("lat") && names.has("lng")
}

console.log(
  `backfill-account-geocode, ${PRODUCTION ? "PRODUCTION" : "staging"}${APPLY ? "" : "  (DRY RUN, nothing will be written)"}` +
    `${FORCE ? "  [--force: re-geocoding rows that already have a position too]" : ""}\n`
)

const teams = await sql(
  CORE_DATABASE_ID,
  `SELECT id, name, database_id FROM teams
    WHERE db_status = 'ready' AND deactivated_at IS NULL AND database_id IS NOT NULL
    ${ONLY_TEAM ? "AND id = ?" : ""}
    ORDER BY name`,
  ONLY_TEAM ? [ONLY_TEAM] : []
)
if (!teams.length) {
  console.log(ONLY_TEAM ? `No ready team matches --team ${ONLY_TEAM}.` : "No ready teams found.")
  process.exit(0)
}

let totalPlaced = 0
let totalUnresolved = 0

for (const team of teams) {
  console.log(`${team.name} (${team.id})`)
  await proveTeamDatabase(team.database_id, team.name)

  if (!(await hasPositionColumns(team.database_id))) {
    console.log("  migration 0118 has not reached this team yet, skipped\n")
    continue
  }

  // COMPANIES WITH AN ADDRESS, NOT ALREADY ARCHIVED, see the header for why
  // person rows and archived rows are excluded outright. `--force` widens
  // past "no position yet" to every candidate with an address on file;
  // without it, only the rows nothing has ever geocoded are read at all.
  const rows = await sql(
    team.database_id,
    `SELECT id, name, street, postal_code, city, country FROM accounts
      WHERE account_type = 'entity'
        AND archived_at IS NULL
        AND (street IS NOT NULL OR postal_code IS NOT NULL OR city IS NOT NULL OR country IS NOT NULL)
        ${FORCE ? "" : "AND lat IS NULL AND lng IS NULL"}
      ORDER BY id`
  )
  console.log(`  candidates: ${rows.length}${FORCE ? " (with an address, position or not)" : " (no position yet)"}`)

  if (!rows.length) {
    console.log("")
    continue
  }

  const placed = []
  const unresolved = []
  for (const r of rows) {
    const position = await geocodeAddress(GEOCODE_ENV, {
      street: r.street,
      postalCode: r.postal_code,
      city: r.city,
      country: r.country,
    })
    if (position) placed.push({ id: r.id, name: r.name, ...position })
    else unresolved.push({ id: r.id, name: r.name })
  }
  console.log(`  resolved  : ${placed.length}`)
  console.log(`  unresolved: ${unresolved.length}  (address on file, Google could not place it, left NULL)`)
  for (const p of placed.slice(0, 5)) console.log(`    ${p.name} → ${p.lat}, ${p.lng}`)
  totalPlaced += placed.length
  totalUnresolved += unresolved.length

  if (!placed.length || !APPLY) {
    console.log("")
    continue
  }

  let written = 0
  for (const p of placed) {
    // R17's own idiom: the "no position yet" predicate rides the UPDATE too
    // (unless --force, which is exactly the deliberate override its own
    // header describes), so this script stays safe to run twice even if
    // something else geocoded the same row between the SELECT above and
    // this write.
    const done = await sql(
      team.database_id,
      `UPDATE accounts SET lat = ?, lng = ? WHERE id = ? ${FORCE ? "" : "AND lat IS NULL AND lng IS NULL"} RETURNING id`,
      [p.lat, p.lng, p.id]
    )
    written += done.length
  }
  console.log(`  written   : ${written}\n`)
}

console.log(
  `\nTOTAL, resolved ${totalPlaced}, unresolved ${totalUnresolved}` +
    (APPLY ? "" : "\n\nDRY RUN, re-run with --apply to write.")
)
