// EVERY WIPE MUST DELETE BOTH LEVELS OF VECTOR, not just the chunks'.
//
// MEASURED LIVE, 17 Sep 2026: a wipe that only deleted chunk ids left 179 of
// 260 record (summary) vectors returned by 30 real queries dead — 69%, and
// the account-wide index carried roughly 8,700 vectors no source would ever
// resolve again. `vectorIdsToDelete` is the fix: a pure function, so this is
// a real behavioural test rather than the positional source-grep
// `wipe-order.test.mjs` needs (that file's own header explains why — this
// script talks to real Cloudflare APIs on import — but id arithmetic has no
// such excuse).

import assert from "node:assert/strict"
import { test } from "node:test"

import { vectorIdsToDelete } from "../lib/wipe-vector-ids.mjs"

test("collects both a chunk's own id and every source's summary vector id", () => {
  const chunkRows = [{ id: "src1:00000" }, { id: "src1:00001" }, { id: "src2:00000" }]
  const sourceRows = [{ id: "src1" }, { id: "src2" }, { id: "src3" }]
  const ids = vectorIdsToDelete(chunkRows, sourceRows)
  assert.deepEqual(
    ids,
    ["src1:00000", "src1:00001", "src2:00000", "src1:summary", "src2:summary", "src3:summary"]
  )
})

test("a source with zero chunks still gets its summary vector deleted", () => {
  // MUTATION PROOF: this is exactly the shape the bug had — a source with no
  // knowledge_chunks rows (a card, or one never fully indexed) contributed
  // NOTHING to the old id list, so its summary vector — if it ever had one —
  // was never touched.
  const ids = vectorIdsToDelete([], [{ id: "src1" }])
  assert.deepEqual(ids, ["src1:summary"])
})

test("a team with nothing indexed yet returns an empty list, not a crash", () => {
  assert.deepEqual(vectorIdsToDelete([], []), [])
})

test("the summary suffix matches recordVectorId's own format exactly", () => {
  // knowledge-vectors.ts: `recordVectorId = (sourceId) => \`${sourceId}:summary\``.
  // Mirrored here (this script has no build step to import a worker's TS),
  // so a drift between the two would leave a source's real record vector
  // un-deletable by this script forever without ever failing loudly.
  const ids = vectorIdsToDelete([], [{ id: "01ABCDEF" }])
  assert.equal(ids[0], "01ABCDEF:summary")
})
