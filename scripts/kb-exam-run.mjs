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
// Retrieval-only, by default and unless `--reader` or `--full-loop` is
// passed — no `read`, no `compose`, nothing drawn from the team's AI
// allowance beyond the embedding + Vectorize query every retrieval already
// needs (BUILD-5 §9: "grade retrieval-only for every iteration... spend
// kimi ONLY on the final validation runs"). It scores every row
// `scripts/kb-exam.mjs`'s `grade()` can score TODAY: every `refusal` row
// (needs no key at all — `found === false` is the whole claim) plus
// whatever `keyed`/`gap` rows already have an entry in
// `scripts/kb-exam-keys.json`. Most will not, until the keying pass runs —
// this script reports those as "not yet keyed", never silently drops them,
// so a first run right after the rebuild is honest about how much of the
// 100 it can actually judge.
//
// `--reader` passes a REAL `read` callback into `retrieve()` — the exact
// shape `GET /api/content/knowledge/ask` builds when a caller sends
// `read=1` (`payToRead`, `workers/content/src/routes/knowledge.ts`), not a
// stand-in: gated on `agent:create`, metered against the team's real AI
// allowance, logged. This is BUILD-5's headline fix — the reader re-reads
// candidates a similarity floor alone would refuse — so a run without it
// measures the system with that fix switched off. `payToRead` needs a real
// `env.DB` (native D1 binding in production; `d1RestBinding` below is the
// REST-backed stand-in, same trick as `vectorizeStandIn`) because the
// metering ledger (`agent_usage`, `agent_usage_log`) lives there, not
// behind `cfg`'s REST door. Only applied to rows this harness actually
// scores (not `tool`/`struck`) — spending the allowance re-reading a row
// nothing here grades buys nothing.
//
// `--full-loop` adds the writer (llama-4-scout) on top of `--reader` — the
// pass that costs the most real money (see the arithmetic in this lane's
// report to the hub). Neither is ever the default; each needs its own flag
// every time, on purpose.
//
// ── WHICH DOOR EACH COLUMN MODELS — read this before quoting a number ──────
//
// The plain default (no flag) and `--reader` are USEFUL FOR ATTRIBUTION —
// each isolates one half of the mechanism, plain retrieval vs. the reader
// unconditionally applied — but NEITHER is what a person asking a real
// question gets, and for an hour on 2026-09-11/12 both were reported as if
// they were. The shipped door (`GET /api/content/knowledge/ask`,
// `routes/knowledge.ts`) is a TWO-PASS shape: `secondLook(ask({quiet:true}),
// () => ask({read: reader}))` — search the cheap way first, and only pay
// for a re-read if that pass found nothing. A row the plain pass already
// answers is never handed to the reader at all, and never should be:
// `--reader` runs the reader on every scored row unconditionally, which
// pays for a re-read that row never needed and can let the reader's own
// judgement overrule a result the strict floor had already accepted —
// measured 2026-09-12: B-M16 and A-H7 looked like reader regressions this
// way and were not; `secondLook` never invoked the reader on either one.
//
// `--real` is the column that answers "what does a person actually get" —
// `secondLook` imported straight from `workers/content/src/lib/knowledge.ts`,
// not reimplemented here, so this can never quietly drift from the door the
// next time somebody changes it. THIS is the column `gate-exam` should be
// judged on; `--reader` and the plain default stay useful only for saying
// WHICH mechanism produced a given row's result.
//
// WHAT `--real` CANNOT SEE, and a reader should know this before trusting a
// number from it as much as knowing which door it models. It never calls
// `compose` (no `--full-loop` shape here), so every failure this column can
// report is, by construction, a RETRIEVAL failure — the wrong passages came
// back, or none did. It has no way to represent "retrieval was right and the
// written answer was still wrong", because nothing here ever writes an
// answer. Measured 12 Sep 2026, diagnosing `synth`/`latest`: every failing
// row that tag-diagnosis classified sorted cleanly into "material missing
// from the shortlist" or "reached the shortlist and lost to something else"
// — the fourth classification a full diagnosis needs (a composition
// problem) was not merely rare in that sample, it was STRUCTURALLY ABSENT
// from what this instrument can report at all. Reach for `--full-loop` (and
// its real cost) the day a row's failure needs to be told apart from that.
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
//   node --experimental-transform-types scripts/kb-exam-run.mjs --reader
//   node --experimental-transform-types scripts/kb-exam-run.mjs --real
//   node --experimental-transform-types scripts/kb-exam-run.mjs --full-loop
//   node --experimental-transform-types scripts/kb-exam-run.mjs --real --capture-baseline
//   node --experimental-transform-types scripts/kb-exam-run.mjs --real --diff-baseline
//
// The last two read/write `kb-exam-baseline.json` (checked in) — every scored
// row's citation ids, not counts, so a citation quietly swapped for a
// different-but-equal-count one is visible. `--capture-baseline` overwrites
// it; `--diff-baseline` reports which rows' citation SETS moved since it was
// captured. Neither flag changes what a plain run prints or scores.
//
// KB_INDEX / KB_CORE / KB_TEAM point it at another environment, same as
// kb-bench.mjs. `cf-exec` on every Cloudflare call this file makes — reads
// only (D1 SELECTs, a Vectorize query); nothing here deploys or writes.

import "./lib/shared-alias.mjs"

import { execSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { cloudflareCredentials } from "./lib/cf-credentials.mjs"
import { importTs } from "./lib/import-ts.mjs"
import { enforceRefusalCeiling, loadExam, loadKeys, scoreExam, shortlistFromAnswer, validateExam, validateKeys } from "./kb-exam.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, "..")
const VERBOSE = process.argv.includes("--verbose")
const FULL_LOOP = process.argv.includes("--full-loop")
const REAL = process.argv.includes("--real")
const READER = FULL_LOOP || REAL || process.argv.includes("--reader")

/** THE INSTRUMENT'S OWN BLIND SPOT, closed. A plain run only ever compared
 * ROW COUNTS across two points in time ("6p/4c" vs "6p/4c") — a citation
 * swapped for a different, equally-numbered one would pass unnoticed. Found
 * 12 Sep 2026 comparing a corpus mid-refile against three same-digit
 * baseline runs: proven at full identity for only 3 of 47 rows, because the
 * baseline runs had never captured citation IDS, only counts.
 *
 * `--capture-baseline` writes every row's citation ids to
 * `kb-exam-citation-baseline.json` (checked in, read back by
 * `--diff-baseline`). NOT `kb-exam-baseline.json` — `kb-exam.mjs` already
 * owns that name for a different baseline (the exam's own STRUCTURE: row
 * counts by tag/level/disposition, `--update-baseline`), and this file very
 * nearly overwrote it. `--diff-baseline` loads the citation file and reports
 * which rows' citation SETS actually changed since it was captured — not
 * which counts did. */
const CAPTURE_BASELINE = process.argv.includes("--capture-baseline")
const DIFF_BASELINE = process.argv.includes("--diff-baseline")
const BASELINE_PATH = join(HERE, "kb-exam-citation-baseline.json")
const citationCapture = {}

const { account: ACCOUNT, token: TOKEN } = cloudflareCredentials()
const CORE = process.env.KB_CORE || "1df02340-fc91-4cac-8ccb-d19528dcd9f7" // kwapso-core-staging
const INDEX = process.env.KB_INDEX || "kwapso-knowledge-staging"
const TEAM_NAME = process.env.KB_TEAM || "Kwapso"

const { retrieve, secondLook } = await importTs(join(REPO, "workers", "content", "src", "lib", "knowledge.ts"))
const { writeAnswer } = FULL_LOOP ? await importTs(join(REPO, "workers", "content", "src", "lib", "knowledge-compose.ts")) : { writeAnswer: undefined }
const { payToRead } = READER ? await importTs(join(REPO, "workers", "content", "src", "routes", "knowledge.ts")) : { payToRead: undefined }

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

/** Staging's real daily AI allowance, read off the config the same way —
 * NEVER the credits.ts fallback (`FREE_DAILY`, 25), which is what a caller
 * that never sets this var gets, and which reads as "quota exhausted"
 * after exactly 25 real calls when it is a stand-in clamp, not a ceiling
 * (measured live, 2026-09-11: staging's own value is 2000). The wrangler
 * file has TWO `AGENT_FREE_DAILY` lines (a production default, then the
 * staging env override) — the staging block's, last in the file, is what a
 * `cf-exec` run against staging actually sees. */
function agentFreeDaily() {
  const raw = readFileSync(join(REPO, "workers", "content", "wrangler.jsonc"), "utf8")
  const found = [...raw.matchAll(/"AGENT_FREE_DAILY"\s*:\s*"(\d+)"/g)]
  if (!found.length) throw new Error("workers/content/wrangler.jsonc no longer names AGENT_FREE_DAILY — this run cannot know staging's real allowance")
  return found[found.length - 1][1]
}

/** A REST-backed stand-in for the native `D1Database` binding `payToRead`'s
 * gate/meter chain needs (`consumeAiUnit`/`getQuota`/`logUsage` all call
 * `env.DB.prepare(...).bind(...).run()`/`.first()` against the CORE
 * database) — same trick as `vectorizeStandIn`, a real door, no binding.
 * Only `.run()` and `.first()` are used anywhere on this path; `.all()` is
 * included for completeness, not because anything here calls it. */
function d1RestBinding(databaseId) {
  return {
    prepare(sqlText) {
      let params = []
      const exec = async () => (await cf(`/d1/database/${databaseId}/query`, { sql: sqlText, params }))[0]
      return {
        bind(...args) {
          params = args
          return this
        },
        async run() {
          const r = await exec()
          return { meta: r.meta, results: r.results }
        },
        async first() {
          const r = await exec()
          return r.results[0] ?? null
        },
        async all() {
          const r = await exec()
          return { results: r.results, meta: r.meta }
        },
      }
    },
  }
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

/** `payToRead`/`payToWrite` want an `Actor` (`{id, email, name}`) to log the
 * spend against — only fetched under `--reader`/`--full-loop`, since a
 * plain retrieval-only run never reaches either. */
async function actorFor(userId) {
  const [user] = await sql(CORE, "SELECT id, email, first_name, last_name FROM users WHERE id = ?", [userId])
  if (!user) throw new Error(`kb-exam-run: no core user row for ${userId}`)
  return { id: user.id, email: user.email, name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email }
}
const actor = READER ? await actorFor(member.user_id) : null

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
  DB: READER ? d1RestBinding(CORE) : { prepare: () => ({ bind: () => ({ run: async () => {}, all: async () => ({ results: [] }) }) }) },
  // Read straight off the config, never assumed — same discipline as
  // `productionComposeModel()`. Without this, `numberVar` falls back to
  // `shared/workers/credits.ts`'s hardcoded FREE_DAILY (25) instead of
  // staging's real allowance, and a run that happens to spend exactly 25
  // reads as "quota exhausted" when it is a stand-in clamp, not the real
  // ceiling (measured live, 2026-09-11 — see this lane's report).
  AGENT_FREE_DAILY: READER ? agentFreeDaily() : undefined,
}
const CFG = { accountId: ACCOUNT, apiToken: TOKEN }

/* --------------------------------- the run -------------------------------- */

const { rows } = loadExam()
const keys = loadKeys()
const structural = [...validateExam({ rows }), ...validateKeys(rows, keys)]
if (structural.length) {
  console.error(`kb-exam-run: exam is not structurally clean — run scripts/kb-exam.mjs first.`)
  for (const p of structural) console.error(`  ${p}`)
  process.exit(1)
}

console.log(
  `kb-exam-run — ${rows.length} rows against ${INDEX} (team ${team.id})${
    FULL_LOOP
      ? ", FULL-LOOP (reader + writer)"
      : REAL
        ? ", REAL DOOR (secondLook — the shipped GET /api/content/knowledge/ask shape, no writer)"
        : READER
          ? ", READER ON (retrieve() called with `read` unconditionally — NOT the shipped door's shape, see header)"
          : ", retrieval-only (retrieve() called with no `read` at all — NOT the shipped door's shape either, see header)"
  }`
)
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
  const rowGuard = personaGuards[row.id] ?? guard
  const notScored = row.disposition === "struck" || row.disposition === "tool"
  // Reader spend only where it can change a score — a struck/tool row is
  // never graded, so reading its shortlist would spend the allowance and
  // teach us nothing this harness can act on.
  const useReader = READER && !notScored
  // A READER THAT NEVER THROWS — the route's own `reader` closure
  // (`routes/knowledge.ts`), copied rather than approximated: a role with
  // no `agent:create` right would otherwise turn a refusal into a crash.
  const readerFn = (q, shortlist) =>
    payToRead(env, CFG, rowGuard, actor, q, shortlist).catch(() => null)
  let answer
  try {
    if (REAL && !notScored) {
      // THE SHIPPED DOOR, EXACTLY — `secondLook` imported from the same
      // lib the route calls, not reimplemented here, so this can never
      // drift from the door the next time somebody changes it. Pass one
      // is quiet (no refusal-log row for a provisional refusal, same as
      // the route); the retry only runs if pass one found nothing, and a
      // row pass one already answers pays for no reader at all.
      const ask = (opts) => retrieve(env, CFG, rowGuard, { question: row.question, ...opts })
      answer = await secondLook(await ask({ quiet: true }), () => ask({ read: readerFn }))
    } else {
      answer = await retrieve(env, CFG, rowGuard, {
        question: row.question,
        compose: FULL_LOOP ? (material, sources) => writeAnswer(env, row.question, material, sources) : undefined,
        read: useReader ? readerFn : undefined,
      })
    }
  } catch (e) {
    console.log(`${row.id.padEnd(14)} FAIL  threw: ${String(e).slice(0, 120)}`)
    continue
  }
  resultsByRowId[row.id] = { found: answer.found, shortlistIds: shortlistFromAnswer(answer) }
  console.log(`${row.id.padEnd(14)} ${answer.found ? `${answer.passages.length}p/${answer.citations.length}c` : "refused"}${notScored ? "  (tool/struck — not scored here)" : ""}`)
  if (VERBOSE && answer.citations.length) for (const c of answer.citations) console.log(`      · ${c.title} (${c.sourceId})`)
  if (CAPTURE_BASELINE || DIFF_BASELINE)
    citationCapture[row.id] = { found: answer.found, citations: (answer.citations ?? []).map((c) => c.sourceId).sort() }
}

if (CAPTURE_BASELINE) {
  const commit = execSync("git rev-parse HEAD", { cwd: REPO }).toString().trim()
  writeFileSync(
    BASELINE_PATH,
    JSON.stringify({ capturedFrom: commit, capturedAt: new Date().toISOString(), rows: citationCapture }, null, 2) + "\n"
  )
  console.log(`\nBaseline captured -> ${BASELINE_PATH} (${commit})`)
}

if (DIFF_BASELINE) {
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"))
  console.log(`\nCITATION DIFF AGAINST BASELINE (captured ${baseline.capturedAt} from ${baseline.capturedFrom})`)
  const changedRows = []
  for (const [id, now] of Object.entries(citationCapture)) {
    const before = baseline.rows[id]
    if (!before) continue // row didn't exist, or wasn't scored, when the baseline was captured
    if (before.found === now.found && before.citations.join(",") === now.citations.join(",")) continue
    changedRows.push(id)
    console.log(`  ${id}: found ${before.found} -> ${now.found}`)
    console.log(`    before: ${before.citations.join(", ") || "(none)"}`)
    console.log(`    after:  ${now.citations.join(", ") || "(none)"}`)
  }
  console.log(changedRows.length ? `${changedRows.length} row(s) changed citations since the baseline.` : "No row's citations changed since the baseline.")
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
