// WHAT AN APP SHOWS FOR ITSELF (T3850) — the files and links that go with "here
// is important material about this system": something the client sent, a
// screenshot from a meeting, a document of a different logic than the four
// prose fields already cover.
//
// THE OWNER'S ASK: "I don't see any tab where I can store important files
// related to an app, sent by the client, a screenshot from a meeting, or a
// document of different logics, inside the app details screen." The client's
// own decision: a Files tab on every app, holding files AND links, and the
// client can see it in their portal.
//
// IT IS `story-attachments.ts` ONE TABLE ALONG, and deliberately so rather than
// something cleverer: one table for files AND links, because "here is the
// thing I mean" is one act; `kind` decides only how `url` is READ; the shared
// `MEDIA` bucket, because that is the one both gateways serve; deactivate,
// never delete, so a removed file leaves an audit block behind rather than a
// hole.
//
// THE READ IS FENCED, NOT REFUSED — the one real difference from the story's
// twin, and it is the client's own decision: an app is the client's own
// system, so `listAppAttachments` takes the caller's AccountScope and ANDs the
// SAME two clauses `appsWhere` (this file, above) already applies to the apps
// list itself — the account fence, and the app restriction beside it — over a
// subquery on `apps`, the same shape `attachmentFence` gives a ticket's files
// one worker along. WRITING is agency-only: every write door here refuses a
// portal caller (R21), the same "never" the owner gave a client editing
// somebody else's ticket file, read here as "a client does not author the
// agency's own inventory of what we built them."

import { logActivity, type Actor } from "@shared/workers/activity"
import { accountScopeClause, appScopeClause, type AccountScope } from "@shared/workers/account-scope"
import { d1ExecScript, d1Query, sqlString, sqlValue, type D1Rest } from "@shared/workers/d1-rest"
import { ulid } from "@shared/workers/id"
import { GuardError, type MemberGuard } from "@shared/workers/gating"
import { APP_ATTACHMENT_CAP } from "@shared/workers/limits"
import { requireText, TEXT_LIMITS } from "@shared/workers/validate"
import type { AppAttachment } from "@shared/types"

type AttachmentRow = {
  id: string
  app_id: string
  kind: string
  label: string
  url: string
  content_type: string | null
  size_bytes: number | null
  created_at: string
  creator_name: string | null
}

function toAttachment(r: AttachmentRow): AppAttachment {
  return {
    id: r.id,
    appId: r.app_id,
    // A kind the code does not know reads as a LINK, which is the safe
    // direction: a link renders as text a person clicks, while a file renders
    // as a capability URL into the bucket, and guessing "file" about a row
    // that is not one points the browser at an object that is not there.
    kind: r.kind === "file" ? "file" : "link",
    label: r.label,
    url: r.url,
    contentType: r.content_type,
    sizeBytes: r.size_bytes,
    createdAt: r.created_at,
    addedByName: r.creator_name,
  }
}

const COLS = `id, app_id, kind, label, url, content_type, size_bytes, created_at, creator_name`

/** THE APP FENCE, over `app_attachments.app_id` — the SAME two clauses
 * `appsWhere` applies to the apps list itself (the account fence, and the app
 * restriction beside it, never one instead of the other), expressed as a
 * subquery so it rides the same WHERE as the rows and the count. Staff → empty
 * clause, the same "everybody sees every app" record-level answer `appsWhere`
 * gives, because a file is part of the app's material and staffing withholds
 * an app's material at the SCREEN, never at this door (see `appsWhere`'s own
 * header on that ruling — attachments follow the app record's own fence,
 * nothing narrower). */
function appAttachmentFence(scope: AccountScope): { sql: string; params: string[] } {
  const account = accountScopeClause(scope, "a.account_id")
  const apps = appScopeClause(scope, "a.id")
  const clauses = [account.sql, apps.sql].filter(Boolean)
  if (clauses.length === 0) return { sql: "", params: [] }
  return {
    sql: ` AND EXISTS (SELECT 1 FROM apps a WHERE a.id = app_id AND ${clauses.join(" AND ")})`,
    params: [...account.params, ...apps.params],
  }
}

/** Everything attached to an app, oldest first — the order somebody added
 * them. R14: hard-capped at APP_ATTACHMENT_CAP, which is also what
 * `addAppAttachment` refuses past, so the list can always be read to its end.
 *
 * FENCED, NOT REFUSED (see this file's own header) — a client login reads
 * their own apps' files through the identical function the agency's Files
 * tab calls, over the portal's own AccountScope. */
export async function listAppAttachments(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  appId: string
): Promise<AppAttachment[]> {
  const fence = appAttachmentFence(scope)
  const rows = await d1Query<AttachmentRow>(
    cfg,
    guard.databaseId,
    `SELECT ${COLS} FROM app_attachments
      WHERE app_id = ? AND deactivated_at IS NULL${fence.sql}
      ORDER BY created_at ASC, id ASC LIMIT ${APP_ATTACHMENT_CAP}`, // R14 hard cap
    [appId, ...fence.params]
  )
  return rows.map(toAttachment)
}

/** R16: the exact server COUNT(*), over the same "still attached, and still
 * inside the fence" question the list asks — also what the Files tab's own
 * badge reads (workers/tenancy/src/routes/record-counts.ts). */
export async function countAppAttachments(
  cfg: D1Rest,
  guard: MemberGuard,
  scope: AccountScope,
  appId: string
): Promise<number> {
  const fence = appAttachmentFence(scope)
  const rows = await d1Query<{ n: number }>(
    cfg,
    guard.databaseId,
    `SELECT COUNT(*) AS n FROM app_attachments WHERE app_id = ? AND deactivated_at IS NULL${fence.sql}`,
    [appId, ...fence.params]
  )
  return rows[0]?.n ?? 0
}

/** Attach a file (already in the bucket) or a link. The caller has resolved
 * the app and, for a file, put the bytes in the bucket — this writes the row.
 * AGENCY-ONLY: the door this is called from refuses a portal caller first.
 *
 * CAPPED AT THE WRITE, not only at the read: a list bounded at twenty over a
 * table holding two hundred is a list with an invisible end. */
export async function addAppAttachment(
  cfg: D1Rest,
  guard: MemberGuard,
  actor: Actor,
  appId: string,
  input: { kind: "file" | "link"; label: string; url: string; contentType?: string | null; sizeBytes?: number | null }
): Promise<AppAttachment[]> {
  const existing = await countAppAttachments(cfg, guard, { kind: "staff" }, appId)
  if (existing >= APP_ATTACHMENT_CAP)
    throw new GuardError(
      400,
      "too_many",
      `An app holds up to ${APP_ATTACHMENT_CAP} files and links. Take one off first.`
    )
  const label = requireText(input.label, "Name", TEXT_LIMITS.short)
  await insertAttachment(cfg, guard, actor, appId, { ...input, label })
  await logActivity(cfg, guard.databaseId, actor, {
    type: input.kind === "file" ? "App file added" : "App link added",
    description: `${actor.name} attached ${label}`,
    relatedTable: "apps",
    relatedRowId: appId,
  })
  return listAppAttachments(cfg, guard, { kind: "staff" }, appId)
}

/** Take one off. R17: `deactivated_at IS NULL` rides the UPDATE, so a second
 * press moves zero rows and writes no second line of history. AGENCY-ONLY. */
export async function removeAppAttachment(
  cfg: D1Rest,
  guard: MemberGuard,
  actor: Actor,
  appId: string,
  attachmentId: string
): Promise<{ moved: boolean; attachments: AppAttachment[] }> {
  const now = new Date().toISOString()
  const changed = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    `UPDATE app_attachments SET deactivated_at = ?, deactivator_id = ?, deactivator_email = ?, deactivator_name = ?
      WHERE id = ? AND app_id = ? AND deactivated_at IS NULL RETURNING id`,
    [now, actor.id, actor.email, actor.name, attachmentId, appId]
  )
  const attachments = await listAppAttachments(cfg, guard, { kind: "staff" }, appId)
  if (!changed[0]) return { moved: false, attachments }
  await logActivity(cfg, guard.databaseId, actor, {
    type: "App attachment removed",
    description: `${actor.name} took a file or link off the app`,
    relatedTable: "apps",
    relatedRowId: appId,
  })
  return { moved: true, attachments }
}

/** ONE attachment on an app, or null — the row a rename or a replace is
 * ABOUT. See `story-attachments.ts`'s twin for why a write needs it rather
 * than a bare UPDATE. AGENCY-ONLY. */
export async function getAppAttachment(
  cfg: D1Rest,
  guard: MemberGuard,
  appId: string,
  attachmentId: string
): Promise<AppAttachment | null> {
  const rows = await d1Query<AttachmentRow>(
    cfg,
    guard.databaseId,
    `SELECT ${COLS} FROM app_attachments
      WHERE id = ? AND app_id = ? AND deactivated_at IS NULL LIMIT 1`,
    [attachmentId, appId]
  )
  return rows[0] ? toAttachment(rows[0]) : null
}

/** THE ROW, written once, for the two doors that write one. */
async function insertAttachment(
  cfg: D1Rest,
  guard: MemberGuard,
  actor: Actor,
  appId: string,
  input: { kind: "file" | "link"; label: string; url: string; contentType?: string | null; sizeBytes?: number | null }
): Promise<void> {
  const now = new Date().toISOString()
  await d1ExecScript(
    cfg,
    guard.databaseId,
    `INSERT INTO app_attachments (id, app_id, kind, label, url, content_type, size_bytes, created_at, creator_id, creator_email, creator_name)
VALUES (${sqlString(ulid())}, ${sqlString(appId)}, ${sqlString(input.kind)}, ${sqlString(input.label)}, ${sqlString(input.url)}, ${sqlString(input.contentType ?? null)}, ${sqlValue(input.sizeBytes ?? null)}, ${sqlString(now)}, ${sqlString(actor.id)}, ${sqlString(actor.email)}, ${sqlString(actor.name)});`
  )
}

/** RENAME — the only edit that happens IN PLACE, for the same reason
 * `story-attachments.ts`'s twin gives: what we CALL the thing changes, not
 * the thing itself. R17: the current label rides the UPDATE. AGENCY-ONLY. */
export async function renameAppAttachment(
  cfg: D1Rest,
  guard: MemberGuard,
  actor: Actor,
  appId: string,
  attachmentId: string,
  label: string
): Promise<{ moved: boolean; attachments: AppAttachment[] }> {
  const clean = requireText(label, "Name", TEXT_LIMITS.short)
  const changed = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    `UPDATE app_attachments SET label = ?
      WHERE id = ? AND app_id = ? AND deactivated_at IS NULL AND label <> ? RETURNING id`,
    [clean, attachmentId, appId, clean]
  )
  const attachments = await listAppAttachments(cfg, guard, { kind: "staff" }, appId)
  if (!changed[0]) return { moved: false, attachments }
  await logActivity(cfg, guard.databaseId, actor, {
    type: "App attachment renamed",
    description: `${actor.name} renamed an attachment to ${clean}`,
    relatedTable: "apps",
    relatedRowId: appId,
  })
  return { moved: true, attachments }
}

/** REPLACE — a NEW ROW plus a deactivation of the old one, never an in-place
 * UPDATE of `url`. See `story-attachments.ts`'s twin for the full reasoning
 * (deactivate-never-delete is about references, not the DELETE keyword). NO
 * CAP CHECK, on purpose: one row out, one row in. AGENCY-ONLY. */
export async function replaceAppAttachment(
  cfg: D1Rest,
  guard: MemberGuard,
  actor: Actor,
  appId: string,
  current: AppAttachment,
  next: { label?: string; url: string; contentType?: string | null; sizeBytes?: number | null }
): Promise<{ moved: boolean; attachments: AppAttachment[] }> {
  const now = new Date().toISOString()
  const changed = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    `UPDATE app_attachments SET deactivated_at = ?, deactivator_id = ?, deactivator_email = ?, deactivator_name = ?
      WHERE id = ? AND app_id = ? AND deactivated_at IS NULL RETURNING id`,
    [now, actor.id, actor.email, actor.name, current.id, appId]
  )
  if (!changed[0]) return { moved: false, attachments: await listAppAttachments(cfg, guard, { kind: "staff" }, appId) }
  // The old row's label unless a new one came with the new bytes — swapping a
  // file for the right one does not also mean renaming it.
  const label = requireText(next.label ?? current.label, "Name", TEXT_LIMITS.short)
  await insertAttachment(cfg, guard, actor, appId, {
    kind: current.kind,
    label,
    url: next.url,
    contentType: next.contentType ?? null,
    sizeBytes: next.sizeBytes ?? null,
  })
  await logActivity(cfg, guard.databaseId, actor, {
    type: current.kind === "file" ? "App file replaced" : "App link replaced",
    description: `${actor.name} replaced ${current.label} with ${label}`,
    relatedTable: "apps",
    relatedRowId: appId,
  })
  return { moved: true, attachments: await listAppAttachments(cfg, guard, { kind: "staff" }, appId) }
}
