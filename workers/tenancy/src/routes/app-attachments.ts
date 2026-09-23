// DOORS ONTO AN APP'S OWN FILES AND LINKS (T3850) — the same four-door shape
// `workers/content/src/routes/stories.ts` gives a story's twin, moved a worker
// along because the apps table lives here.
//
// THE READ IS FENCED, THE WRITES REFUSE A PORTAL CALLER — see
// `workers/tenancy/src/lib/app-attachments.ts`'s own header for why: the client's
// own decision was "the client can see it," never "the client can add to it."

import { fail, json } from "@shared/workers/http"
import { ANY_FILE_TYPE, dataUrlBytes, parseUploadDataUrl, storedContentType, teamMediaKey } from "@shared/workers/image"
import { TICKET_FILE_MAX_BYTES } from "@shared/workers/limits"
import { optionalText, queryText, requireText, safeExternalLink, TEXT_LIMITS } from "@shared/workers/validate"
import {
  addAppAttachment,
  getAppAttachment,
  listAppAttachments,
  removeAppAttachment,
  renameAppAttachment,
  replaceAppAttachment,
} from "../lib/app-attachments"
import { appOrThrow } from "../lib/processes"
import { publishChange } from "@shared/workers/realtime"
import { accountScope, refusePortalCaller } from "@shared/workers/account-scope"
import { gated, gatedBody } from "@shared/workers/route"
import type { Env } from "../env"

/** GET /api/tenancy/apps/attachments?id= — the files and links on one app.
 * `processes:read`. FENCED, NOT REFUSED (R21): a client login reads their own
 * apps' files here too — the door the portal's Impact accordion calls — over
 * the SAME AccountScope every other client-visible tenancy read resolves. */
export async function getAppAttachments(request: Request, env: Env): Promise<Response> {
  const { cfg, guard } = await gated(request, env, "processes", "read")
  const scope = await accountScope(cfg, guard)
  const id = queryText(new URL(request.url).searchParams.get("id"), "App")
  if (!id) return fail(400, "invalid_input", "id is required.")
  const attachments = await listAppAttachments(cfg, guard, scope, id)
  return json({ attachments, total: attachments.length })
}

/** POST /api/tenancy/apps/attachments — attach a file or a link to an app.
 * `processes:update`. AGENCY ONLY. */
export async function postAppAttachment(request: Request, env: Env): Promise<Response> {
  const { actor, cfg, guard, body } = await gatedBody<{
    id?: unknown; kind?: unknown; label?: unknown; url?: unknown; fileDataUrl?: unknown
  }>(request, env, "processes", "update")
  const scope = await refusePortalCaller(cfg, guard)
  const id = requireText(body.id, "App", TEXT_LIMITS.short)
  if (body.kind !== "file" && body.kind !== "link") return fail(400, "invalid_input", "kind must be file or link.")
  const label = requireText(body.label, "Name", TEXT_LIMITS.short)
  const app = await appOrThrow(cfg, guard, scope, id) // must exist BEFORE any write

  let url: string
  let contentType: string | null = null
  let sizeBytes: number | null = null
  if (body.kind === "link") {
    const raw = requireText(body.url, "Link", TEXT_LIMITS.link)
    const safe = safeExternalLink(raw)
    if (!safe || !/^https?:\/\//i.test(safe))
      return fail(400, "invalid_input", "A link has to start with http:// or https://.")
    url = safe
  } else {
    const parsed = parseUploadDataUrl(body.fileDataUrl, TICKET_FILE_MAX_BYTES, ANY_FILE_TYPE)
    if (!parsed)
      return fail(400, "invalid_input",
        typeof body.fileDataUrl === "string" && dataUrlBytes(body.fileDataUrl) > TICKET_FILE_MAX_BYTES
          ? "That file is over 10MB. Try a smaller one."
          : "That file didn't come through. Try attaching it again.")
    const key = teamMediaKey(guard.teamId, "app")
    await env.MEDIA.put(key, parsed.bytes, { httpMetadata: { contentType: storedContentType(parsed.contentType) } })
    url = `/media/${key}`
    contentType = parsed.contentType
    sizeBytes = parsed.bytes.byteLength
  }

  const attachments = await addAppAttachment(cfg, guard, actor, id, { kind: body.kind, label, url, contentType, sizeBytes })
  await publishChange(env, guard.teamId, "app_attachments", id, "add", app.accountId ?? undefined)
  return json({ attachments, total: attachments.length })
}

/** POST /api/tenancy/apps/attachments/update — rename OR replace bytes/link.
 * ONE DOOR, THREE ACTS decided positionally by which body field is
 * `typeof "string"` — the same shape `postStoryAttachmentUpdate` uses.
 * `processes:update`. AGENCY ONLY. */
export async function postAppAttachmentUpdate(request: Request, env: Env): Promise<Response> {
  const { actor, cfg, guard, body } = await gatedBody<{
    id?: unknown; attachmentId?: unknown; label?: unknown; url?: unknown; fileDataUrl?: unknown
  }>(request, env, "processes", "update")
  const scope = await refusePortalCaller(cfg, guard)
  const id = requireText(body.id, "App", TEXT_LIMITS.short)
  const attachmentId = requireText(body.attachmentId, "Attachment", TEXT_LIMITS.short)
  const label = optionalText(body.label, "Name", TEXT_LIMITS.short)
  const newBytes = typeof body.fileDataUrl === "string"
  const newLink = typeof body.url === "string"
  if (newBytes && newLink) return fail(400, "invalid_input", "Send a new file or a new link, not both.")

  const app = await appOrThrow(cfg, guard, scope, id)
  const current = await getAppAttachment(cfg, guard, id, attachmentId)
  if (!current) return fail(404, "not_found", "That isn't attached to this app.")

  if (newBytes) {
    if (current.kind !== "file") return fail(400, "invalid_input", "That one is a link. Give it a new address instead.")
    const parsed = parseUploadDataUrl(body.fileDataUrl, TICKET_FILE_MAX_BYTES, ANY_FILE_TYPE)
    if (!parsed)
      return fail(400, "invalid_input",
        typeof body.fileDataUrl === "string" && dataUrlBytes(body.fileDataUrl) > TICKET_FILE_MAX_BYTES
          ? "That file is over 10MB. Try a smaller one."
          : "That file didn't come through. Try attaching it again.")
    const key = teamMediaKey(guard.teamId, "app")
    await env.MEDIA.put(key, parsed.bytes, { httpMetadata: { contentType: storedContentType(parsed.contentType) } })
    const { moved, attachments } = await replaceAppAttachment(cfg, guard, actor, id, current, {
      label, url: `/media/${key}`, contentType: parsed.contentType, sizeBytes: parsed.bytes.byteLength,
    })
    if (moved) await publishChange(env, guard.teamId, "app_attachments", id, "edit", app.accountId ?? undefined)
    return json({ attachments, total: attachments.length })
  }

  if (newLink) {
    if (current.kind !== "link") return fail(400, "invalid_input", "That one is a file. Send a new file instead.")
    const raw = requireText(body.url, "Link", TEXT_LIMITS.link)
    const safe = safeExternalLink(raw)
    if (!safe || !/^https?:\/\//i.test(safe)) return fail(400, "invalid_input", "A link has to start with http:// or https://.")
    const { moved, attachments } = await replaceAppAttachment(cfg, guard, actor, id, current, { label, url: safe })
    if (moved) await publishChange(env, guard.teamId, "app_attachments", id, "edit", app.accountId ?? undefined)
    return json({ attachments, total: attachments.length })
  }

  if (!label) return fail(400, "invalid_input", "Give it a name, a new file or a new link.")
  const { moved, attachments } = await renameAppAttachment(cfg, guard, actor, id, attachmentId, label)
  if (moved) await publishChange(env, guard.teamId, "app_attachments", id, "edit", app.accountId ?? undefined)
  return json({ attachments, total: attachments.length })
}

/** POST /api/tenancy/apps/attachments/remove — deactivate, never delete.
 * `processes:update`. AGENCY ONLY. */
export async function postAppAttachmentRemove(request: Request, env: Env): Promise<Response> {
  const { actor, cfg, guard, body } = await gatedBody<{ id?: unknown; attachmentId?: unknown }>(request, env, "processes", "update")
  const scope = await refusePortalCaller(cfg, guard)
  const id = requireText(body.id, "App", TEXT_LIMITS.short)
  const attachmentId = requireText(body.attachmentId, "Attachment", TEXT_LIMITS.short)
  const app = await appOrThrow(cfg, guard, scope, id)
  const { moved, attachments } = await removeAppAttachment(cfg, guard, actor, id, attachmentId)
  if (moved) await publishChange(env, guard.teamId, "app_attachments", id, "edit", app.accountId ?? undefined)
  return json({ attachments, total: attachments.length })
}
