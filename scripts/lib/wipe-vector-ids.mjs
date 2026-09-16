// EVERY VECTOR ID A KNOWLEDGE WIPE MUST DELETE — both levels, not just the
// chunks'. A pure function, in its own leaf file (no Cloudflare imports, no
// side effects), so it can be unit-tested directly without ever triggering
// wipe-knowledge.mjs's own real-account guard and network calls on import.
//
// A chunk's own id IS its vector's id (`chunkVectorId`, knowledge-vectors.ts).
// A SOURCE also gets one vector, its summary's — id `${sourceId}:summary`,
// the exact format `recordVectorId()` in
// `workers/content/src/lib/knowledge-vectors.ts` writes it under. Mirrored
// here rather than imported because this script talks to Cloudflare over
// plain REST and carries no build step to resolve a worker's TS import.
//
// MEASURED LIVE, 17 Sep 2026: a wipe that deleted only chunk ids left 179 of
// 260 record vectors returned by 30 real queries dead (69%) — the
// account-wide Vectorize index carried roughly 8,700 vectors no source would
// ever resolve again, silently costing every future question real topK
// slots.
export function vectorIdsToDelete(chunkRows, sourceRows) {
  return [...chunkRows.map((r) => r.id), ...sourceRows.map((r) => `${r.id}:summary`)]
}
