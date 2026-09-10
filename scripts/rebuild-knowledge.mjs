#!/usr/bin/env node
// rebuild-knowledge — empty one environment's knowledge base and re-ingest it
// from scratch, in one command.
//
//   cf-exec node scripts/rebuild-knowledge.mjs staging
//   cf-exec node scripts/rebuild-knowledge.mjs production --i-mean-production
//
// BUILD-5-knowledge-rebuild.md's own gate needs this run once per merge that
// touches ingest or the index: 0073 changed what a row in `knowledge_sources`
// and `knowledge_chunks` carries, so material indexed under the old shape (no
// `identity_key`, no `context_line`, no BM25 postings) has to be re-read
// rather than patched in place. That is exactly wipe-knowledge.mjs's own
// argument for being a script and not a button — a one-off repair does not
// earn a permanent door — so this reuses it rather than re-implementing it.
//
// TWO EXISTING SCRIPTS, RUN IN ORDER, NOTHING ELSE. wipe-knowledge.mjs already
// empties both stores (D1 rows and their Vectorize embeddings) for every team
// in the environment; knowledge-backfill.mjs already re-ingests through the
// SAME gated door (`POST /api/content/knowledge/sync`) the 15-minute cron
// uses, so there is still exactly one ingestion path. Composing them is the
// smallest shape: no new SQL, no new HTTP calls, no second way to do either
// half. `spawnSync` + `stdio: "inherit"`, stopping at the first failure — the
// same shape as final-gate.mjs, for the same reason: a later step assuming an
// earlier one worked must never run once that assumption is false.
//
// knowledge-backfill.mjs re-ingests for ONE team — whichever team
// `BACKFILL_EMAIL` (default `delivered@resend.dev`) belongs to — because that
// is what the door it drives does; it is not a per-environment loop and this
// script does not make it one. On staging that is the one real team the
// rebuild's own exam runs against. Rebuilding several teams in one
// environment means running the backfill step by hand again with a different
// `BACKFILL_EMAIL`, once wipe-knowledge.mjs has already emptied all of them.

import { spawnSync } from "node:child_process"

const ENV = process.argv[2]
if (!["staging", "production"].includes(ENV)) {
  console.error("Usage: cf-exec node scripts/rebuild-knowledge.mjs <staging|production> [--i-mean-production]")
  process.exit(2)
}
const PROD_FLAG = process.argv.includes("--i-mean-production")
if (ENV === "production" && !PROD_FLAG) {
  console.error("Refusing production without --i-mean-production.")
  process.exit(2)
}

const wipeArgs = ["scripts/wipe-knowledge.mjs", ENV, "--yes"]
if (PROD_FLAG) wipeArgs.push("--i-mean-production")

const STEPS = [
  ["empty the knowledge base", "node", wipeArgs],
  ["re-ingest from sources", "node", ["scripts/knowledge-backfill.mjs", ENV]],
]

console.log(`rebuild-knowledge · ${ENV}\n${"-".repeat(28)}`)
let failed = 0
for (const [label, cmd, args] of STEPS) {
  process.stdout.write(`\n── ${label} ${"─".repeat(Math.max(0, 50 - label.length))}\n`)
  const r = spawnSync(cmd, args, { stdio: "inherit", env: process.env })
  if (r.status !== 0) {
    console.log(`\nFAIL  ${label} exited ${r.status}. Stopping — the next step assumes this one worked.`)
    failed = 1
    break
  }
  console.log(`PASS  ${label}`)
}

console.log(failed ? "\nREBUILD FAILED" : "\nREBUILD DONE — the base is empty and re-ingested from scratch")
process.exit(failed)
