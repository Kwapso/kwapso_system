// Owner-only import-catalog maintenance (x-admin-key, like tenancy's maintenance
// endpoints). The import catalog (importable_databases) is global + owner-maintained;
// seeded to the code-supported targets in DEFAULT_CATALOG (Object.values(TARGETS)):
// today selectable_data (Dropdown values) + member_roles + the record modules.
// Re-running the seed is idempotent (upsert by table_key), so it's safe at deploy.

import { json } from "@shared/workers/http"
import { optionalText, queryText, requireText, TEXT_LIMITS } from "@shared/workers/validate"
import { adminGuard } from "@shared/workers/gating"
import { foldSignature, signatureOf } from "@shared/workers/error-signature"
import { idBatches, RESOLVE_SCAN_CAP } from "@shared/workers/limits"
import { DEFAULT_CATALOG } from "../lib/targets"
import { seedDefaultCatalog } from "../lib/import"
import type { Env } from "../env"

/** POST /api/data-ops/admin/seed-targets — upsert the default import catalog. */
export async function postSeedTargets(request: Request, env: Env): Promise<Response> {
  const blocked = adminGuard(request, env)
  if (blocked) return blocked
  const actor = { id: "owner", email: "owner", name: "Owner" }
  const count = await seedDefaultCatalog(env, actor, DEFAULT_CATALOG)
  return json({ seeded: count, targets: DEFAULT_CATALOG.map((d) => d.tableKey) })
}

/** GET /api/data-ops/admin/errors?status=open|resolved|all&limit=N — the central
 * error log, newest first (ERROR-HANDLING.md). Owner-only: reading stack traces
 * is a maintainer activity, so it sits behind the maintenance key, not a role. */
export async function getErrors(request: Request, env: Env): Promise<Response> {
  const blocked = adminGuard(request, env)
  if (blocked) return blocked
  const url = new URL(request.url)
  const status = queryText(url.searchParams.get("status"), "Status") ?? "open"
  // R14 — the cap has to survive a hostile number, not just an absent one.
  // `Math.min(Number(x) || 100, 200)` looks bounded and isn't: ?limit=-1 is a
  // finite negative, so it beats the min, and SQLite reads a NEGATIVE LIMIT as
  // NO LIMIT — the ceiling on the one table designed to grow turned off by a
  // minus sign. Clamped from BOTH ends, and truncated, so the value interpolated
  // below is always an integer in [1, 200].
  const limit = Math.min(Math.max(1, Math.trunc(Number(url.searchParams.get("limit")) || 100)), 200)
  const where = status === "all" ? "" : "WHERE status = ?"
  const stmt = env.DB.prepare(
    // `request_id` is what turns eight separate rows back into one failing
    // click (shared/workers/trace.ts). Reading the store without it means the
    // id is written and never seen, which is the same as not having it.
    `SELECT id, at, source, place, message, stack, team_id, user_id, url, request_id, status, resolved_at, resolution_note
     FROM error_logs ${where} ORDER BY at DESC LIMIT ${limit}`
  )
  const rows = await (status === "all" ? stmt : stmt.bind(status)).all()
  return json({ errors: rows.results ?? [] })
}

/** POST /api/data-ops/admin/errors/resolve { id, note } — close an error with the
 * what-went-wrong / how-it-was-fixed note. Idempotent (re-resolving overwrites
 * the note); an unknown id is a clean 404 via updated:0. */
export async function postResolveError(request: Request, env: Env): Promise<Response> {
  const blocked = adminGuard(request, env)
  if (blocked) return blocked
  const b = (await request.json().catch(() => ({}))) as { id?: unknown; note?: unknown }
  const id = requireText(b.id, "Error", TEXT_LIMITS.short)
  // `(b.note ?? "").slice(...)` was a live 500: a NUMBER has no .slice, and an
  // admin key is not a promise the body is well-formed.
  const note = optionalText(b.note, "Note", 2000)
  const res = await env.DB.prepare(
    `UPDATE error_logs SET status = 'resolved', resolved_at = ?, resolution_note = ? WHERE id = ?`
  )
    .bind(new Date().toISOString(), note ?? null, id.slice(0, 40))
    .run()
  return json({ updated: res.meta.changes ?? 0 })
}

/** POST /api/data-ops/admin/errors/resolve-signature { signature, note } — close
 * every open row that IS the same failure, in one act.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 *
 * The nightly digest already groups by folded signature, so four transient D1
 * hiccups arrive as one line in one mail. Resolving them did not follow: the
 * only door took a single `id`, so the person who read "1 new error signature"
 * had to close four rows by hand, and four more the next morning. The store
 * therefore filled with rows nobody could ever clear, which is how a store stops
 * being read — the same failure `shared/web/log.ts` names about noise.
 *
 * ── THE SHAPE, AND WHY IT IS TWO HALVES ─────────────────────────────────────
 *
 * SQL narrows, JavaScript folds — the same split the digest uses, and it is not
 * a preference: SQLite has no REGEXP, so the volatile reference inside a message
 * ("internal error; reference = vf4c1") cannot be normalised in a WHERE clause.
 * So this reads a BOUNDED page of open rows (R14), folds each one through the
 * ONE seam both surfaces share, and closes the ids that match.
 *
 * BOUNDED, AND HONEST ABOUT IT. A signature with more than RESOLVE_SCAN_CAP open
 * rows behind it is resolved as far as the cap and says how many it looked at,
 * rather than quietly closing some and reporting success — the caller runs it
 * again. Newest-first, so a re-run always makes progress.
 *
 * IDEMPOTENT AND R17-SHAPED: `status = 'open'` rides the UPDATE, so a second
 * call moves zero rows and reports zero rather than re-stamping a resolution
 * date over one somebody already wrote. */
export async function postResolveErrorSignature(request: Request, env: Env): Promise<Response> {
  const blocked = adminGuard(request, env)
  if (blocked) return blocked
  const b = (await request.json().catch(() => ({}))) as { signature?: unknown; note?: unknown }
  const signature = requireText(b.signature, "Signature", TEXT_LIMITS.long)
  const note = optionalText(b.note, "Note", 2000)

  // R14: a hard cap, said out loud. The scan is over OPEN rows only, newest
  // first, so a signature with a long tail is cleared over repeated calls rather
  // than in one statement nobody bounded.
  const open = await env.DB.prepare(
    `SELECT id, source, message FROM error_logs WHERE status = 'open' ORDER BY at DESC LIMIT ${RESOLVE_SCAN_CAP}`
  ).all<{ id: string; source: string; message: string }>()
  const rows = open.results ?? []
  // The caller's signature is folded too. The digest mails a FOLDED signature, so
  // that is what gets pasted back in — but a person reading a raw row would paste
  // the unfolded one, and both must find the same rows. Folding an already-folded
  // string is a no-op, which is what makes accepting either safe.
  const want = foldSignature(signature)
  const ids = rows.filter((r) => signatureOf(r) === want).map((r) => r.id)
  if (!ids.length) return json({ updated: 0, scanned: rows.length, matched: 0, capped: false })

  const now = new Date().toISOString()
  // BATCHED UNDER D1's PARAMETER CEILING, not just under our own row cap. This
  // statement binds one parameter per id plus two, and D1 takes 100 in a
  // statement (D1_MAX_BOUND_PARAMS) — so a single `IN (…)` over a 500-row scan
  // is a perfectly bounded read that D1 refuses outright. limits.ts names this
  // exact failure and ships `idBatches` for it, including the reason it keeps
  // being missed: local SQLite allows 999, so the harness is ten times more
  // permissive than production and the statement passes every test.
  let updated = 0
  for (const batch of idBatches(ids, 2)) {
    const res = await env.DB.prepare(
      `UPDATE error_logs SET status = 'resolved', resolved_at = ?, resolution_note = ?
        WHERE status = 'open' AND id IN (${batch.map(() => "?").join(", ")})`
    )
      .bind(now, note ?? null, ...batch)
      .run()
    updated += res.meta.changes ?? 0
  }
  return json({
    updated,
    scanned: rows.length,
    matched: ids.length,
    // TRUE means there may be MORE behind this signature than one call could
    // reach. Said rather than hidden: "resolved 200" over a signature with 900
    // rows reads as finished, and it is not.
    capped: rows.length >= RESOLVE_SCAN_CAP,
  })
}
