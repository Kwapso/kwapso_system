// REBUILD THE VECTORIZE INDEX FROM D1 — the certain fix for dead-vector
// debris a sampling sweep cannot exhaustively find ("a dead vector's only
// finder is a live twin", so a wiped/retired source with no live twin is
// invisible to any query-based sweep, however broad), and the documented
// recovery path (OPERATIONS.md § "The knowledge base's vector index", and
// BOOTSTRAP.md §3b's own "if you got the order wrong") for a metadata index
// created too late to cover the vectors already in the index — Vectorize
// does not index metadata retrospectively.
//
// Uses a FRESH bge-m3 embed for every vector that still has real text (a
// chunk's own `text` column, `${title}\n\n${summary}` for a source's record
// vector — the exact shapes `embeddableText()`/the record-vector call
// already use in knowledge.ts), so the rebuilt index holds full-precision
// output. Falls back to the STORED embedding
// (`knowledge_chunks.embedding`/`knowledge_sources.summary_embedding`, the
// same quantised-int8-base64 format `encodeEmbedding` writes) only when the
// real text is gone — counted explicitly in the log, never silent.
//
//   node --experimental-transform-types scripts/rebuild-vector-index.mjs staging --dry-run   (default)
//   node --experimental-transform-types scripts/rebuild-vector-index.mjs staging --go
//
// `--experimental-transform-types` because this imports `labelsFor` and
// `METADATA_INDEXES` straight from the worker's own TS source (the
// run-shipped-worker-code-in-node pattern `scripts/kb-bench.mjs` also uses)
// rather than hand-copying either — a hand copy is exactly how this index
// went live nine metadata indexes short of the documented ten (`shared` was
// missing) the first time this script ran, caught only by reading
// BOOTSTRAP.md afterwards. Importing the real values makes that drift
// impossible instead of merely unlikely.
//
// Dry run counts what WOULD be upserted per team and compares it against
// SUM(indexed_chunks) + count(summary_embedding IS NOT NULL) from D1 — they
// must match exactly, or something is wrong before a single vector moves.
// It also lists which of the ten metadata indexes are missing, so a dry run
// is a real preflight for --go, not just a row count.
//
// TEAM ENUMERATION, the safe way (see the prove-a-team-db-by-schema-
// conjunction memory): teams come from THIS account's own core DB
// (`teams` table) — never `wrangler d1 list`, which would also list
// rest-o's live production teams sharing this account. Each candidate team
// is then proven by schema CONJUNCTION (knowledge_sources AND
// knowledge_chunks both present), never a single shared table.
//
// The index itself (delete/recreate) is a SEPARATE, explicit step this
// script does not take — see OPERATIONS.md for the full sequence. This
// script only ever verifies/creates metadata indexes and upserts vectors.

import "./lib/shared-alias.mjs"

import { appendFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { execFileSync } from "node:child_process"
import { cloudflareCredentials } from "./lib/cf-credentials.mjs"
import { importTs } from "./lib/import-ts.mjs"

const REPO = dirname(fileURLToPath(import.meta.url))
const { account: ACCOUNT, token: TOKEN } = cloudflareCredentials()
const CF = "https://api.cloudflare.com/client/v4"
const INDEX = "kwapso-knowledge-staging"
const CORE = "1df02340-fc91-4cac-8ccb-d19528dcd9f7" // kwapso-core-staging

const GO = process.argv.includes("--go")
const LOG_PATH = ".session-notes/kb-hygiene-logs/rebuild-vector-index.log"

function log(line) {
  const stamped = `[${new Date().toISOString()}] ${line}`
  console.log(stamped)
  appendFileSync(LOG_PATH, stamped + "\n")
}

const { labelsFor } = await importTs(join(REPO, "..", "workers", "content", "src", "lib", "knowledge.ts"))
const { METADATA_INDEXES } = await importTs(join(REPO, "..", "workers", "content", "src", "lib", "knowledge-vectors.ts"))

async function sql(db, statement, params = []) {
  const res = await fetch(`${CF}/accounts/${ACCOUNT}/d1/database/${db}/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql: statement, params }),
  })
  const json = await res.json()
  if (!json.success) throw new Error(JSON.stringify(json.errors))
  return json.result[0].results
}

function decodeEmbedding(encoded) {
  if (!encoded) return null
  try {
    const binary = atob(encoded)
    const out = Array.from({ length: binary.length })
    for (let i = 0; i < binary.length; i++) {
      const b = binary.charCodeAt(i)
      out[i] = b > 127 ? b - 256 : b
    }
    return out.length ? out : null
  } catch {
    return null
  }
}

async function withBackoff(fn, label, maxAttempts = 8) {
  let attempt = 0
  let delay = 1000
  for (;;) {
    attempt++
    try {
      return await fn()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const rateLimited = msg.includes("40041") || /too many requests/i.test(msg)
      if (attempt >= maxAttempts) {
        log(`FATAL — ${label} failed after ${attempt} attempts, giving up loudly: ${msg}`)
        throw e
      }
      log(`${label}: ${rateLimited ? "rate limited (429)" : "error"}, retry ${attempt}/${maxAttempts} in ${delay}ms: ${msg}`)
      await new Promise((r) => setTimeout(r, delay))
      delay = Math.min(delay * 2, 30_000)
    }
  }
}

/** CREATE-OR-VERIFY, not blind create: `wrangler vectorize create-metadata-
 * index` on a property that already exists answers an error, and this must
 * be safe to run twice (a dry run's own preflight, and a --go re-run after
 * a partial failure). Reads current indexes once, creates only what's
 * missing, from METADATA_INDEXES — never a list this file maintains itself. */
function ensureMetadataIndexes() {
  const env = {
    ...process.env,
    CLOUDFLARE_ACCOUNT_ID: ACCOUNT,
    CLOUDFLARE_API_TOKEN: TOKEN,
  }
  const listed = JSON.parse(
    execFileSync("npx", ["wrangler", "vectorize", "list-metadata-index", INDEX, "--json"], { env, encoding: "utf8" })
  )
  const existing = new Set((listed.metadataIndexes ?? listed ?? []).map((m) => m.propertyName ?? m.property))
  const missing = METADATA_INDEXES.filter((m) => !existing.has(m.property))
  log(`metadata indexes: ${METADATA_INDEXES.length} required (from METADATA_INDEXES), ${existing.size} present, ${missing.length} missing`)
  if (!GO) {
    if (missing.length) log(`  DRY RUN would create: ${missing.map((m) => m.property).join(", ")}`)
    return
  }
  for (const m of missing) {
    execFileSync(
      "npx",
      ["wrangler", "vectorize", "create-metadata-index", INDEX, `--propertyName=${m.property}`, `--type=${m.type}`],
      { env, encoding: "utf8" }
    )
    log(`  created metadata index: ${m.property} (${m.type})`)
  }
  if (!missing.length) log(`  all ${METADATA_INDEXES.length} metadata indexes already present, nothing to create`)
}

const EMBED_BATCH = 100

async function embedBatch(texts) {
  return withBackoff(async () => {
    const res = await fetch(`${CF}/accounts/${ACCOUNT}/ai/run/@cf/baai/bge-m3`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: texts }),
      signal: AbortSignal.timeout(60_000),
    })
    const json = await res.json()
    if (!json.success) throw new Error(`embed: ${JSON.stringify(json.errors)}`)
    return json.result.data
  }, "bge-m3 embed")
}

async function upsertBatch(vectors, namespace) {
  return withBackoff(async () => {
    const body = vectors
      .map((v) => JSON.stringify({ id: v.id, values: v.values, namespace, metadata: v.labels }))
      .join("\n")
    const res = await fetch(`${CF}/accounts/${ACCOUNT}/vectorize/v2/indexes/${INDEX}/upsert`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/x-ndjson" },
      body,
      signal: AbortSignal.timeout(60_000),
    })
    const json = await res.json()
    if (!json.success) throw new Error(`upsert: ${JSON.stringify(json.errors)}`)
    return json.result
  }, "vectorize upsert")
}

log(`=== rebuild-vector-index ${GO ? "REAL RUN" : "DRY RUN"} starting ===`)

ensureMetadataIndexes()

// 1. Team enumeration — from THIS account's own core, never wrangler d1 list.
const teams = await sql(CORE, "SELECT id, name, database_id FROM teams WHERE database_id IS NOT NULL")
log(`candidate teams from core: ${teams.map((t) => t.name).join(", ")}`)

const qualifying = []
for (const team of teams) {
  const tables = await sql(
    team.database_id,
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('knowledge_sources','knowledge_chunks')"
  )
  const names = new Set(tables.map((t) => t.name))
  const proven = names.has("knowledge_sources") && names.has("knowledge_chunks")
  log(`  ${team.name} (${team.database_id}): schema conjunction ${proven ? "PROVEN" : "FAILED — skipped"}`)
  if (proven) qualifying.push(team)
}
log(`qualifying teams: ${qualifying.map((t) => t.name).join(", ")}`)

let grandTotalChunks = 0
let grandTotalRecords = 0
let grandTotalMismatch = 0

for (const team of qualifying) {
  const db = team.database_id
  log(`\n--- ${team.name} (namespace ${team.id}) ---`)

  const chunkRows = await sql(
    db,
    `SELECT kc.id, kc.text, kc.embedding, kc.compartment, kc.owner_user_id, ks.kind, ks.account_id, ks.app_id,
            ks.ticket_id, ks.sprint_id, ks.record_date, ks.created_at, ks.shared_with
       FROM knowledge_chunks kc JOIN knowledge_sources ks ON kc.source_id = ks.id
      WHERE ks.deactivated_at IS NULL AND kc.embedding IS NOT NULL`
  )
  const sourceRows = await sql(
    db,
    `SELECT id, title, summary, summary_embedding, compartment, owner_user_id, kind, account_id, app_id,
            ticket_id, sprint_id, record_date, created_at, shared_with
       FROM knowledge_sources
      WHERE deactivated_at IS NULL AND summary_embedding IS NOT NULL`
  )

  const [expected] = await sql(
    db,
    `SELECT SUM(indexed_chunks) as chunks,
            (SELECT COUNT(*) FROM knowledge_sources WHERE deactivated_at IS NULL AND summary_embedding IS NOT NULL) as summaries
       FROM knowledge_sources WHERE deactivated_at IS NULL`
  )

  log(`  chunk rows with embedding: ${chunkRows.length} (SUM(indexed_chunks) expects ${expected.chunks})`)
  log(`  source rows with summary_embedding: ${sourceRows.length} (expects ${expected.summaries})`)

  const chunkMismatch = Number(chunkRows.length) !== Number(expected.chunks || 0)
  const summaryMismatch = Number(sourceRows.length) !== Number(expected.summaries || 0)
  if (chunkMismatch || summaryMismatch) {
    log(`  MISMATCH — chunkMismatch=${chunkMismatch} summaryMismatch=${summaryMismatch}. This team needs a look before --go.`)
    grandTotalMismatch++
  }

  grandTotalChunks += chunkRows.length
  grandTotalRecords += sourceRows.length

  if (!GO) continue

  const embedJobs = [
    ...chunkRows.map((r) => ({ id: r.id, text: r.text, level: "chunk", row: r })),
    ...sourceRows.map((r) => ({
      id: `${r.id}:summary`,
      text: r.summary ? `${r.title ?? ""}\n\n${r.summary}` : null,
      level: "record",
      row: r,
    })),
  ]

  let embedCalls = 0
  let freshCount = 0
  let fallbackCount = 0
  const vectors = []

  for (let i = 0; i < embedJobs.length; i += EMBED_BATCH) {
    const slice = embedJobs.slice(i, i + EMBED_BATCH)
    const withText = slice.filter((j) => j.text)
    const withoutText = slice.filter((j) => !j.text)

    if (withText.length) {
      const results = await embedBatch(withText.map((j) => j.text))
      embedCalls++
      for (let k = 0; k < withText.length; k++) {
        const job = withText[k]
        const fresh = results[k]
        const values = Array.isArray(fresh) ? fresh : null
        if (values) {
          freshCount++
          vectors.push({ id: job.id, values, labels: { ...labelsFor(job.row), level: job.level } })
        } else {
          const stored = decodeEmbedding(job.level === "chunk" ? job.row.embedding : job.row.summary_embedding)
          if (stored) {
            fallbackCount++
            vectors.push({ id: job.id, values: stored, labels: { ...labelsFor(job.row), level: job.level } })
          }
        }
      }
    }
    for (const job of withoutText) {
      const stored = decodeEmbedding(job.level === "chunk" ? job.row.embedding : job.row.summary_embedding)
      if (stored) {
        fallbackCount++
        vectors.push({ id: job.id, values: stored, labels: { ...labelsFor(job.row), level: job.level } })
      }
    }
    if ((i / EMBED_BATCH) % 5 === 0) log(`  embedding progress: ${Math.min(i + EMBED_BATCH, embedJobs.length)}/${embedJobs.length}`)
  }

  log(`  ${team.name}: ${freshCount} fresh embeds, ${fallbackCount} fell back to stored, ${embedCalls} embed API calls`)

  let done = 0
  const BATCH = 200
  for (let i = 0; i < vectors.length; i += BATCH) {
    await upsertBatch(vectors.slice(i, i + BATCH), team.id)
    done += Math.min(BATCH, vectors.length - i)
    if (done % 1000 < BATCH) log(`  upserted ${done}/${vectors.length}`)
  }
  log(`  ${team.name}: upserted ${done}/${vectors.length} vectors`)
}

log(`\n=== TOTALS: ${grandTotalChunks} chunk vectors + ${grandTotalRecords} record vectors = ${grandTotalChunks + grandTotalRecords} ===`)
log(`teams with a count mismatch: ${grandTotalMismatch}`)
log(GO ? "=== REAL RUN COMPLETE ===" : "=== DRY RUN COMPLETE — no vectors written. Re-run with --go after review. ===")
