// refile-chat-sources — bring the CHAT back-catalogue in line with what
// `resolveChatSpaceAccounts` decides today (fix/kb-chat-backfill, 12 Sep 2026).
//
//   cf-exec node --experimental-transform-types scripts/refile-chat-sources.mjs staging
//   cf-exec node --experimental-transform-types scripts/refile-chat-sources.mjs staging --yes
//
// WHY THIS IS A SCRIPT AND NOT A DOOR, exactly wipe-knowledge.mjs's own
// argument: this repairs data that PREDATES a fix already shipped
// (feat/kb-chat-space-to-client) — it is not an ongoing job the app needs to
// run on its own. The live sweep already re-decides a space's filing on
// every tick it actually reads (`resolveChatSpaceAccounts`, called from the
// chat IngestKind's own `read`); what this closes is the gap a WINDOWED kind
// leaves behind — a thread the sweep has not re-read carries whatever it was
// filed under the day it was first read, however long ago that was. A
// permanent HTTP door onto "rewrite whatever the matcher currently says"
// is machinery this fix does not need once the back-catalogue is caught up,
// and R10's own argument (CLAUDE.md) is that every door is reachable by
// somebody — a repair with no ongoing reason to exist should not become one.
//
// ONE RESOLUTION, NOT A SECOND ONE. This calls `refileChatSources`
// (workers/content/src/lib/knowledge-google.ts) — imported from the working
// tree, the same property kb-bench.mjs's own header argues for: the code
// under test is the file that will actually ship, not a copy of it. That
// function calls `resolveChatSpaceAccounts`, the EXACT function the live
// sweep calls — declared filings always win, the rarity gate, kb_CD's DENY
// and the multi-company refusal are all inherited unchanged. Nothing here
// decides an account; it only asks the one function that does, and moves
// what it says to move.
//
// DEFAULT IS A DRY RUN. `refileChatSources`'s own `dryRun` option computes
// and reports every row that WOULD move without writing anything — pass
// `--yes` to actually apply it. Idempotent by construction (the function's
// own doc comment has the argument): every row's current value is read
// before anything is written, and only a row that genuinely differs from
// today's fresh resolution is touched — a second run finds nothing left.
//
// EVERY CONNECTED PERSON, because a named chat space belongs to whoever
// shared it (`google_sources.user_id`), and the resolution logic is
// team-wide (it reads `knowledge_names`, not anything scoped to one
// person) — so this loops over every distinct person who has EVER named a
// chat space, not just one.
import "./lib/shared-alias.mjs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { importTs } from "./lib/import-ts.mjs"
import { expectedAccount } from "./check-cloudflare-account.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, "..")

const KWAPSO_ACCOUNT_ID = expectedAccount()
if (process.env.CLOUDFLARE_ACCOUNT_ID !== KWAPSO_ACCOUNT_ID) {
  console.error(
    `Refusing to run: CLOUDFLARE_ACCOUNT_ID is ${process.env.CLOUDFLARE_ACCOUNT_ID ?? "unset"},\n` +
      `and this script only ever touches ${KWAPSO_ACCOUNT_ID}. Run it through cf-exec.`
  )
  process.exit(2)
}

const env = process.argv[2]
const GO = process.argv.includes("--yes")
if (env !== "staging" && env !== "production") {
  console.error("usage: cf-exec node --experimental-transform-types scripts/refile-chat-sources.mjs <staging|production> [--yes]")
  process.exit(2)
}
if (env === "production" && !process.argv.includes("--i-mean-production")) {
  console.error("Refusing production without --i-mean-production.")
  process.exit(2)
}

const CORE = env === "staging" ? "1df02340-fc91-4cac-8ccb-d19528dcd9f7" : null
if (!CORE) {
  console.error("No production core database id recorded here yet — run this on staging first.")
  process.exit(2)
}

const API = "https://api.cloudflare.com/client/v4"
const TOKEN = process.env.CLOUDFLARE_API_TOKEN
if (!TOKEN) {
  console.error("Refusing to run: no CLOUDFLARE_API_TOKEN. Run it through cf-exec.")
  process.exit(2)
}

async function cf(path, body) {
  const r = await fetch(`${API}/accounts/${KWAPSO_ACCOUNT_ID}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  const j = await r.json()
  if (!j.success) throw new Error(`${path}: ${JSON.stringify(j.errors ?? j)}`)
  return j.result
}
const d1 = async (dbId, sql, params = []) => (await cf(`/d1/database/${dbId}/query`, { sql, params }))[0]?.results ?? []

const { refileChatSources } = await importTs(join(REPO, "workers", "content", "src", "lib", "knowledge-google.ts"))

const teams = await d1(CORE, "SELECT id, name, database_id FROM teams WHERE database_id IS NOT NULL")
if (teams.length === 0) {
  console.log("No team databases. Nothing to do.")
  process.exit(0)
}

console.log(`\nrefile-chat-sources · ${env}${GO ? " · APPLYING" : " · DRY RUN (pass --yes to apply)"}\n${"-".repeat(28)}`)

let totalMoved = 0
let totalToAgency = 0
const byAccountAll = {}

for (const team of teams) {
  const db = team.database_id
  const people = await d1(db, "SELECT DISTINCT user_id FROM google_sources WHERE service = 'chat'")
  if (!people.length) continue

  const cfg = { accountId: KWAPSO_ACCOUNT_ID, apiToken: TOKEN }
  let teamMoved = 0
  const teamByAccount = {}
  let teamToAgency = 0

  for (const { user_id: userId } of people) {
    const guard = { userId, teamId: team.id, roleId: "", databaseId: db }
    const result = await refileChatSources(cfg, guard, { dryRun: !GO })
    teamMoved += result.moved
    teamToAgency += result.toAgency
    for (const [accountId, n] of Object.entries(result.byAccount)) {
      teamByAccount[accountId] = (teamByAccount[accountId] ?? 0) + n
      byAccountAll[accountId] = (byAccountAll[accountId] ?? 0) + n
    }
  }

  if (!teamMoved) continue
  totalMoved += teamMoved
  totalToAgency += teamToAgency
  console.log(`\n  ${team.name} (${people.length} connected ${people.length === 1 ? "person" : "people"} with a named chat space)`)
  console.log(`    ${GO ? "moved" : "would move"} ${teamMoved} source${teamMoved === 1 ? "" : "s"}`)
  if (teamToAgency) console.log(`      -> agency (no client, or ambiguous): ${teamToAgency}`)
  for (const [accountId, n] of Object.entries(teamByAccount)) {
    const [acc] = await d1(db, "SELECT name FROM accounts WHERE id = ?", [accountId])
    console.log(`      -> ${acc?.name ?? accountId}: ${n}`)
  }
}

console.log(`\n  TOTAL: ${GO ? "moved" : "would move"} ${totalMoved} source${totalMoved === 1 ? "" : "s"} across all teams.`)
if (totalMoved) {
  console.log(`  by account:`)
  for (const [accountId, n] of Object.entries(byAccountAll)) console.log(`    ${accountId}: ${n}`)
  if (totalToAgency) console.log(`    -> agency: ${totalToAgency}`)
}
if (!GO && totalMoved) console.log(`\n  Re-run with --yes to apply. A second dry run after --apply should report 0.`)
if (!totalMoved) console.log(`\n  Nothing to move — the back-catalogue already matches today's resolution.`)
