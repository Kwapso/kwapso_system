// THE EXAM, RUN FOR REAL — prepared now, per the hub's assignment, and
// NOT RUN as part of preparing it. Every REST call below is written and
// syntax-checked (`node --check scripts/kb-exam-run.mjs`), never executed,
// because this task's own hard rule is zero model spend: no `ask`, no
// `agent_chat`, no embedding, until the hub says the rebuild has landed.
//
// ── THE ONE COMMAND, THE MOMENT THE REBUILD IS DONE ─────────────────────
//
//   node --experimental-transform-types scripts/kb-exam-run.mjs
//
// Retrieval-only, by default and unless `--full-loop` is passed — no
// `read`, no `compose`, nothing drawn from the team's AI allowance beyond
// the embedding + Vectorize query every retrieval already needs (BUILD-5
// §9: "grade retrieval-only for every iteration... spend kimi ONLY on the
// final validation runs"). It scores every row `scripts/kb-exam.mjs`'s
// `grade()` can score TODAY: every `refusal` row (needs no key at all —
// `found === false` is the whole claim) plus whatever `keyed`/`gap` rows
// already have an entry in `scripts/kb-exam-keys.json`. Most will not,
// until the keying pass runs — this script reports those as "not yet
// keyed", never silently drops them, so a first run right after the
// rebuild is honest about how much of the 100 it can actually judge.
//
// `--full-loop` adds the reader (Kimi K2.6) and the writer (llama-4-scout)
// on top of the same retrieval — the pass that costs real money (see the
// arithmetic in this lane's report to the hub). It is NEVER the default;
// it needs its own flag every time, on purpose.
//
// ── HOW IT MEASURES A BRANCH WITHOUT DEPLOYING, same as scripts/kb-bench.mjs ──
//
// `retrieve` is imported straight from the working tree
// (workers/content/src/lib/knowledge.ts) — the code under test, not a
// deployment of it. Vectorize and D1 are reached over their REST doors
// with the Keychain's own Cloudflare token, same index, same namespace,
// same model the deployed worker uses. No binding, no deploy, no stand-in
// for the fence: R26's re-read-from-D1 happens for real.
//
//   node --experimental-transform-types scripts/kb-exam-run.mjs
//   node --experimental-transform-types scripts/kb-exam-run.mjs --verbose
//   node --experimental-transform-types scripts/kb-exam-run.mjs --full-loop
//
// KB_INDEX / KB_CORE / KB_TEAM point it at another environment, same as
// kb-bench.mjs. `cf-exec` on every Cloudflare call this file makes — reads
// only (D1 SELECTs, a Vectorize query); nothing here deploys or writes.

import "./lib/shared-alias.mjs"

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { cloudflareCredentials } from "./lib/cf-credentials.mjs"
import { importTs } from "./lib/import-ts.mjs"
import { enforceRefusalCeiling, loadExam, loadKeys, scoreExam, shortlistFromAnswer, validateExam, validateKeys } from "./kb-exam.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, "..")
const VERBOSE = process.argv.includes("--verbose")
const FULL_LOOP = process.argv.includes("--full-loop")

const { account: ACCOUNT, token: TOKEN } = cloudflareCredentials()
const CORE = process.env.KB_CORE || "1df02340-fc91-4cac-8ccb-d19528dcd9f7" // kwapso-core-staging
const INDEX = process.env.KB_INDEX || "kwapso-knowledge-staging"
const TEAM_NAME = process.env.KB_TEAM || "Kwapso"

const { retrieve } = await importTs(join(REPO, "workers", "content", "src", "lib", "knowledge.ts"))
const { writeAnswer } = FULL_LOOP ? await importTs(join(REPO, "workers", "content", "src", "lib", "knowledge-compose.ts")) : { writeAnswer: undefined }

/* ------------------------------ the REST doors, same as kb-bench.mjs ----------------------------- */

const CF = "https://api.cloudflare.com/client/v4"
async function cf(path, body) {
  const res = await fetch(`${CF}/accounts/${ACCOUNT}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60_000), // R11's spirit: a run that hangs is a run nobody trusts.
  })
  const json = await res.json()
  if (!json.success && json.errors) throw new Error(`${path}: ${JSON.stringify(json.errors).slice(0, 300)}`)
  return json.result
}
const sql = async (db, statement, params = []) => (await cf(`/d1/database/${db}/query`, { sql: statement, params }))[0].results

function vectorizeStandIn() {
  return {
    async query(vector, opts) {
      const res = await fetch(`${CF}/accounts/${ACCOUNT}/vectorize/v2/indexes/${INDEX}/query`, {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ vector, topK: opts.topK, namespace: opts.namespace, filter: opts.filter, returnValues: false, returnMetadata: "none" }),
        signal: AbortSignal.timeout(60_000),
      })
      const json = await res.json()
      if (!json.success) throw new Error(`vectorize: ${JSON.stringify(json.errors).slice(0, 300)}`)
      return { matches: json.result?.matches ?? [] }
    },
  }
}

/** Read straight off the config, never assumed — see kb-bench.mjs's own
 * comment on why: the bench and the deployed worker only ever agreed on
 * this by coincidence, and a bench that cannot say what it is measuring
 * should not produce a number. Only called under `--full-loop`. */
function productionComposeModel() {
  const raw = readFileSync(join(REPO, "workers", "content", "wrangler.jsonc"), "utf8")
  const found = /"WORKERS_AI_MODEL"\s*:\s*"([^"]+)"/.exec(raw)
  if (!found) throw new Error("workers/content/wrangler.jsonc no longer names WORKERS_AI_MODEL — this run cannot know which model production composes with")
  return found[1]
}

const AI = { async run(model, input) {
  const res = await fetch(`${CF}/accounts/${ACCOUNT}/ai/run/${model}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(60_000),
  })
  const json = await res.json()
  if (!json.success) throw new Error(`ai: ${JSON.stringify(json.errors).slice(0, 300)}`)
  return json.result
} }

/* ------------------------------ who is asking, same as kb-bench.mjs ------------------------------ */

const [team] = await sql(CORE, "SELECT id, database_id FROM teams WHERE name = ? LIMIT 1", [TEAM_NAME])
if (!team?.database_id) throw new Error(`no team called "${TEAM_NAME}" with a database`)
const TEAM_DB = team.database_id

const members = await sql(CORE, `SELECT user_id, role_id FROM team_members WHERE team_id = ? AND deactivated_at IS NULL ORDER BY created_at`, [team.id])
const readers = await sql(TEAM_DB, `SELECT role_id FROM role_permissions WHERE module = 'knowledge' AND can_read = 1`)
const canRead = new Set(readers.map((r) => r.role_id))
const member = members.find((m) => canRead.has(m.role_id))
if (!member) throw new Error("no member of this team may read the knowledge base")

const guard = { userId: member.user_id, teamId: team.id, roleId: member.role_id, databaseId: TEAM_DB }

/** X8-notowner's own words are the persona: "Aurora asking: refuse (private-shelf event)."
 * The `member` above is whichever reader `created_at` picks first — on 2026-09-11 that
 * resolved to the owner, and a row built to test "anyone but the owner" cannot be graded
 * honestly under the owner's own guard (see the hub report, 2026-09-11). Ask as her by name,
 * the same name the row already carries, rather than "the first non-owner reader" — a
 * generic pick would silently stop meaning "Aurora" the moment team membership changes. */
const PERSONA_OVERRIDES = { "X8-notowner": "aurora@kwapso.com" }
async function guardFor(email) {
  const [user] = await sql(CORE, "SELECT id FROM users WHERE email = ?", [email])
  if (!user) throw new Error(`kb-exam-run: persona override wants ${email}, no such user in core`)
  const [asMember] = await sql(CORE, "SELECT role_id FROM team_members WHERE team_id = ? AND user_id = ? AND deactivated_at IS NULL", [team.id, user.id])
  if (!asMember) throw new Error(`kb-exam-run: ${email} is not an active member of ${TEAM_NAME}`)
  if (!canRead.has(asMember.role_id)) throw new Error(`kb-exam-run: ${email}'s role cannot read the knowledge base`)
  return { userId: user.id, teamId: team.id, roleId: asMember.role_id, databaseId: TEAM_DB }
}
const personaGuards = {}
for (const [rowId, email] of Object.entries(PERSONA_OVERRIDES)) personaGuards[rowId] = await guardFor(email)

const env = {
  AI,
  WORKERS_AI_MODEL: FULL_LOOP ? productionComposeModel() : undefined,
  KNOWLEDGE_INDEX: vectorizeStandIn(),
  DB: { prepare: () => ({ bind: () => ({ run: async () => {}, all: async () => ({ results: [] }) }) }) },
}

/* --------------------------------- the run -------------------------------- */

const { rows } = loadExam()
const keys = loadKeys()
const structural = [...validateExam({ rows }), ...validateKeys(rows, keys)]
if (structural.length) {
  console.error(`kb-exam-run: exam is not structurally clean — run scripts/kb-exam.mjs first.`)
  for (const p of structural) console.error(`  ${p}`)
  process.exit(1)
}

console.log(`kb-exam-run — ${rows.length} rows against ${INDEX} (team ${team.id})${FULL_LOOP ? ", FULL-LOOP (reader + writer)" : ", retrieval-only"}`)
for (const [rowId, email] of Object.entries(PERSONA_OVERRIDES)) console.log(`  persona override: ${rowId} asks as ${email}, not the default reader`)
console.log()

const resultsByRowId = {}
let notYetKeyed = 0
for (const row of rows) {
  if ((row.disposition === "keyed" || row.disposition === "gap") && (!row.sourceIds || row.sourceIds.length === 0)) {
    notYetKeyed++
    console.log(`${row.id.padEnd(14)} SKIP  not yet keyed`)
    continue
  }
  let answer
  try {
    answer = await retrieve(env, { accountId: ACCOUNT, apiToken: TOKEN }, personaGuards[row.id] ?? guard, {
      question: row.question,
      compose: FULL_LOOP ? (material, sources) => writeAnswer(env, row.question, material, sources) : undefined,
    })
  } catch (e) {
    console.log(`${row.id.padEnd(14)} FAIL  threw: ${String(e).slice(0, 120)}`)
    continue
  }
  resultsByRowId[row.id] = { found: answer.found, shortlistIds: shortlistFromAnswer(answer) }
  const notScored = row.disposition === "struck" || row.disposition === "tool"
  console.log(`${row.id.padEnd(14)} ${answer.found ? `${answer.passages.length}p/${answer.citations.length}c` : "refused"}${notScored ? "  (tool/struck — not scored here)" : ""}`)
  if (VERBOSE && answer.citations.length) for (const c of answer.citations) console.log(`      · ${c.title} (${c.sourceId})`)
}

const score = scoreExam(rows, resultsByRowId)
console.log(`\n${notYetKeyed} row(s) skipped — not yet keyed. ${score.scored}/${rows.length} scored.`)
console.log(`OVERALL   ${score.passed}/${score.scored}`)
console.log(`\nBY TAG`)
for (const [tag, s] of Object.entries(score.byTag).sort()) console.log(`  ${tag.padEnd(10)} ${s.pass}/${s.total}  ${Math.round((100 * s.pass) / s.total)}%`)

console.log(`\nREFUSAL CEILING (tracker item e-refusals, must be 100%): ${score.refusalGraded ? `${score.refusalGraded - score.refusalFailures.length}/${score.refusalGraded}` : "0/0 (none graded yet)"}`)
try {
  enforceRefusalCeiling(score)
  console.log("  PASS")
} catch (e) {
  console.log(`  FAIL — ${e.message}`)
  process.exitCode = 1
}

process.exit(process.exitCode ?? 0)
