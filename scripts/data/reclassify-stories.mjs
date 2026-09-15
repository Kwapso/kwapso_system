// THE 15 SEP 2026 CLIENT RULING, APPLIED TO EVERY EXISTING STORY — this is the
// APPLY half of a two-part pass: `2026-09-15-story-reclass.json` beside this
// file is the read (340 stories exported read-only from the Kwapso team's
// staging database, classified by hand against the client's verbatim TYPES /
// CATEGORY rules and tie-breakers, 5 left in an `uncertain` note rather than
// guessed); this script is the write. It is a ONE-OFF DATA BACKFILL over a
// column another lane is adding (`stories.category`, TEXT) — not a schema
// migration — so it lives here rather than in team-schema.ts, the same
// division scripts/reset-all.mjs and scripts/backfill-refs-2026-09-01.mjs
// draw. It does not touch `stories.story_type`'s SHAPE (still a free TEXT
// column) and does not touch the vocabulary lane's own migration.
//
//   node scripts/data/reclassify-stories.mjs --dry-run
//   node scripts/data/reclassify-stories.mjs --apply --env staging --db <team-db-id-or-name>
//   node scripts/data/reclassify-stories.mjs --apply --env production --db <team-db-id-or-name>
//
// DRY RUN NEEDS NO CREDENTIALS AND TOUCHES NOTHING LIVE — it reads the JSON
// off disk and prints the UPDATE statements it would run, one per story, so
// "does the plan look right" never has to wait on a Cloudflare round trip.
// `--apply` is the only path that opens a connection, and even then it
// REFUSES before writing a single row if the target database's `stories`
// table has no `category` column yet (`PRAGMA table_info`) — that column is
// the schema lane's migration, applied separately, and this script's whole
// premise is that it has already landed. Writing `story_type` alone onto a
// table with no `category` column would silently half-finish the ruling.
//
// IDEMPOTENT BY CONSTRUCTION: every statement is `UPDATE stories SET
// story_type = ?, category = ? WHERE id = ?` against a fixed id — running the
// same file twice sets the same two columns to the same two values the
// second time, never a second effect. Nothing here INSERTs, so there is no
// duplicate to create and no counter to double-advance (contrast
// backfill-refs-2026-09-01.mjs's team_ref_counters, which is why THAT script
// needed a sharper idempotence argument than this one does).
//
// BATCHED, never one call per row — 335 rows as 335 separate `wrangler d1
// execute` round trips would be slow and, on the REST door, the kind of thing
// that starts timing out partway through. Statements are grouped into files
// of at most BATCH_SIZE and each file is one `--file` exec, the same shape
// backfill-refs-2026-09-01.mjs and backfill-ticket-raisers.mjs use for a
// single batch, extended here to multiple because 335 is worth chunking.

import { readFileSync, writeFileSync, unlinkSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const PLAN_FILE = join(HERE, "2026-09-15-story-reclass.json")

const VALID_TYPES = new Set(["Data", "Tech", "Bug", "Feature", "Change"])
const VALID_CATEGORIES = new Set(["Client-requested", "Internal"])

// Comfortably under D1's per-exec statement ceiling (docs put the batch API
// at up to 1,000 statements; this is a plain multi-statement `--file`, not
// the batch API, so a smaller, safer chunk keeps one bad network blip from
// losing a large fraction of the run).
const BATCH_SIZE = 100

function usageAndExit(msg) {
  if (msg) console.error(msg + "\n")
  console.error(
    "Usage:\n" +
      "  node scripts/data/reclassify-stories.mjs --dry-run\n" +
      "  node scripts/data/reclassify-stories.mjs --apply --env staging|production --db <team-db>\n"
  )
  process.exit(1)
}

function sqlStr(v) {
  if (v === null || v === undefined) return "NULL"
  return `'${String(v).replaceAll("'", "''")}'`
}

/** One read through `wrangler d1 execute`. Relies on `CLOUDFLARE_ACCOUNT_ID`
 * + `CLOUDFLARE_API_TOKEN` already being exported in this shell (the caller's
 * job, same as backfill-refs-2026-09-01.mjs — this sandbox has no `cf-exec`,
 * and wrangler resolves credentials from the environment on its own). */
function d1(db, env, sql) {
  const args = ["wrangler", "d1", "execute", db, "--remote", "--env", env, "--json", "--command", sql]
  const out = execFileSync("npx", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  const json = JSON.parse(out.slice(out.indexOf("[")))
  if (!json[0]?.success) throw new Error(`query failed: ${sql.slice(0, 160)}…`)
  return json[0].results ?? []
}

/** One write through `wrangler d1 execute --file`, batched statements. */
function d1ApplyFile(db, env, statements, tag) {
  const path = join(HERE, `.apply-${tag}-${process.pid}.sql`)
  writeFileSync(path, statements.join("\n"))
  try {
    execFileSync(
      "npx",
      ["wrangler", "d1", "execute", db, "--remote", "--env", env, "--yes", "--file", path],
      { stdio: "inherit" }
    )
  } finally {
    unlinkSync(path)
  }
}

function loadPlan() {
  const rows = JSON.parse(readFileSync(PLAN_FILE, "utf8"))
  const problems = []
  for (const r of rows) {
    if (!r.id) problems.push(`row with no id: ${JSON.stringify(r)}`)
    if (!VALID_TYPES.has(r.type)) problems.push(`${r.id}: bad type ${JSON.stringify(r.type)}`)
    if (!VALID_CATEGORIES.has(r.category)) problems.push(`${r.id}: bad category ${JSON.stringify(r.category)}`)
    if ("priority" in r || "urgency" in r) problems.push(`${r.id}: carries a priority/urgency field — the ruling forbids assigning one`)
  }
  if (problems.length) {
    console.error(`${PLAN_FILE} failed validation:\n` + problems.map((p) => "  " + p).join("\n"))
    process.exit(1)
  }
  return rows
}

function chunks(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function main() {
  const APPLY = process.argv.includes("--apply")
  const DRY_RUN = process.argv.includes("--dry-run") || !APPLY
  const envIdx = process.argv.indexOf("--env")
  const ENV = envIdx !== -1 ? process.argv[envIdx + 1] : null
  const dbIdx = process.argv.indexOf("--db")
  const DB = dbIdx !== -1 ? process.argv[dbIdx + 1] : null

  const plan = loadPlan()
  const statements = plan.map(
    (r) => `UPDATE stories SET story_type = ${sqlStr(r.type)}, category = ${sqlStr(r.category)} WHERE id = ${sqlStr(r.id)};`
  )

  if (DRY_RUN) {
    console.log(`${PLAN_FILE.split("/").slice(-1)} — ${plan.length} stories, ${statements.length} UPDATE statement(s):\n`)
    for (const s of statements) console.log(s)
    console.log(`\nDRY RUN — ${statements.length} statements printed for ${plan.length} stories. Nothing written.`)
    if (statements.length !== plan.length) {
      console.error(`MISMATCH: ${statements.length} statements but ${plan.length} stories — investigate before applying.`)
      process.exit(1)
    }
    return
  }

  // ── everything below only runs for --apply ────────────────────────────────
  if (!ENV || !["staging", "production"].includes(ENV)) {
    usageAndExit("--apply requires --env staging or --env production.")
  }
  if (!DB) usageAndExit("--apply requires --db <team-database-name-or-id>.")
  if (ENV === "production" && !process.argv.includes("--yes-production")) {
    usageAndExit(
      "Refusing production without --yes-production. This pass is scoped to staging by the task that\n" +
        "wrote it; re-run with both flags once staging has been reviewed and production is the intent."
    )
  }

  console.log(`reclassify-stories — APPLYING to ${ENV} (${DB})\n`)

  // Refuse before writing a single row if the schema lane's migration
  // (`stories.category`) has not landed on this database yet.
  const columns = d1(DB, ENV, "PRAGMA table_info(stories)")
  const hasCategory = columns.some((c) => c.name === "category")
  if (!hasCategory) {
    console.error(
      "Refusing to run: `stories.category` does not exist on this database yet. This pass depends on\n" +
        "the schema lane's migration (a new `stories.category` column) being deployed first — apply that\n" +
        "migration, confirm with `PRAGMA table_info(stories)`, then re-run this script."
    )
    process.exit(1)
  }

  const before = d1(
    DB,
    ENV,
    "SELECT story_type, category, COUNT(*) AS n FROM stories GROUP BY story_type, category ORDER BY 1, 2"
  )
  console.log("BEFORE (story_type × category):")
  for (const r of before) console.log(`  ${r.story_type ?? "(null)"} × ${r.category ?? "(null)"} = ${r.n}`)

  const batches = chunks(statements, BATCH_SIZE)
  console.log(`\nwriting ${statements.length} statements in ${batches.length} batch(es) of up to ${BATCH_SIZE}…`)
  batches.forEach((batch, i) => {
    console.log(`  batch ${i + 1}/${batches.length} (${batch.length} statements)…`)
    d1ApplyFile(DB, ENV, batch, `story-reclass-${i + 1}`)
  })

  const after = d1(
    DB,
    ENV,
    "SELECT story_type, category, COUNT(*) AS n FROM stories GROUP BY story_type, category ORDER BY 1, 2"
  )
  console.log("\nAFTER (story_type × category):")
  for (const r of after) console.log(`  ${r.story_type ?? "(null)"} × ${r.category ?? "(null)"} = ${r.n}`)

  console.log(`\nAPPLIED — ${statements.length} rows written for ${plan.length} stories.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
