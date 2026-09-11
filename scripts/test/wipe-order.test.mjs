// wipe-knowledge's crash-recovery order, pinned by reading the source off
// disk — the same positional shape as the app's own rule tests (R20, R29…),
// used here because the script talks to real Cloudflare APIs on import and
// may not be run against anything real by a test. What matters is provable
// without ever calling out: WHERE the bookkeeping-null sits relative to the
// vector delete and the D1 deletes, not what either one returns.
//
// THE INCIDENT THIS GUARDS: 2026-09-11, a wipe died between deleting all
// Vectorize entries and deleting the D1 rows. Every source row survived with
// its `content_hash` and `indexed_chunks` intact, and BOTH re-embed gates
// (the sweep's skip in knowledge-ingest.ts, `indexSource`'s restart check in
// knowledge.ts) read that as "already fully indexed" — permanently, since
// neither can see Vectorize. The fix nulls that bookkeeping BEFORE the vector
// delete, so a crash anywhere after it self-heals on the next sweep. Moving
// the UPDATE back down next to the other D1 writes reintroduces the exact
// failure window, which is what this test exists to catch.

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const SOURCE = readFileSync(join(HERE, "..", "wipe-knowledge.mjs"), "utf8")

const NULL_HASH_UPDATE = 'UPDATE knowledge_sources SET content_hash = NULL, indexed_chunks = 0, indexed_at = NULL'
const VECTOR_DELETE = "/vectorize/v2/indexes/${INDEX}/delete_by_ids"
const FTS_DELETE_ALL = "INSERT INTO knowledge_chunks_fts(knowledge_chunks_fts) VALUES('delete-all')"
const SOURCES_DELETE = '"knowledge_sources"'

test("wipe-knowledge nulls content_hash before it touches Vectorize", () => {
  const nullAt = SOURCE.indexOf(NULL_HASH_UPDATE)
  const vectorAt = SOURCE.indexOf(VECTOR_DELETE)
  assert.notEqual(nullAt, -1, "the bookkeeping-null UPDATE must exist verbatim")
  assert.notEqual(vectorAt, -1, "the vectorize delete_by_ids call must exist verbatim")
  assert.ok(
    nullAt < vectorAt,
    `content_hash must be nulled BEFORE the vector delete (null at ${nullAt}, vector delete at ${vectorAt}) — ` +
      "a crash between them must leave a row that re-embeds, not one that looks done"
  )
})

test("wipe-knowledge nulls content_hash before the FTS clear and the D1 deletes", () => {
  const nullAt = SOURCE.indexOf(NULL_HASH_UPDATE)
  const ftsAt = SOURCE.indexOf(FTS_DELETE_ALL)
  const sourcesDeleteAt = SOURCE.lastIndexOf(SOURCES_DELETE)
  assert.ok(nullAt < ftsAt, "content_hash must be nulled before the FTS delete-all")
  assert.ok(nullAt < sourcesDeleteAt, "content_hash must be nulled before knowledge_sources is deleted")
})

test("the null-update sits inside the destructive (--yes) loop, not the dry-run path", () => {
  const dryRunAt = SOURCE.indexOf('"  Dry run. Add --yes to actually do it.\\n"')
  const nullAt = SOURCE.indexOf(NULL_HASH_UPDATE)
  assert.ok(dryRunAt !== -1 && nullAt > dryRunAt, "the null-update must run only on a real (--yes) wipe")
})
