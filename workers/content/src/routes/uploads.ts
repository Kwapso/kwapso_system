// PERMISSION TO PUT ONE FILE, WITHOUT THE FILE PASSING THROUGH US.
//
// The door a browser asks before uploading directly to R2. It decides everything
// a streaming door decides — may you, where, how big, under what label — and
// then hands back a signature instead of accepting the bytes.
//
// ── THE THREE-STEP UPLOAD, AND WHERE THE BYTES GO ───────────────────────────
//
//   1. the browser asks THIS door (`/uploads/presign`) — may I, where, how big,
//      under what label — and is handed a signed URL, a key and the headers the
//      signature covers;
//   2. the browser PUTs the file to R2 itself. No worker is on that path: the
//      request goes to `<account>.r2.cloudflarestorage.com`, and the worker's
//      request-body ceiling (100 MB on this plan, STREAM_UPLOAD_MAX_BYTES sits
//      under it) stops being the file's ceiling;
//   3. the browser tells the CONFIRM door below the key it was given, and the
//      door proves the key is ours, proves the object arrived (`head`), and
//      answers with the reference the record will keep — exactly what the
//      streaming door used to answer after shovelling the bytes itself.
//
// Wired on the client side in `web/lib/api/content.ts` (`putDirect`), for the
// four targets in `UPLOAD_TARGETS`, on 7 Sep 2026.
//
// ── AND IT STILL CHANGES NOTHING WHERE IT IS NOT TURNED ON ──────────────────
//
// With no `R2_ACCESS_KEY_ID` secret this answers `{ direct: false }` and the
// client uses the streaming door, bytes through the worker, byte for byte
// unchanged. A direct PUT that R2 or the browser refuses (a bucket with no CORS
// rule, an expired grant) falls back to the same door — a failed accelerator is
// never a failed upload. Same shape as the rate-limit binding, which "FAILS
// OPEN if this block is missing, which is what makes it safe to deploy the
// worker before adding the binding".
//
// ── WHAT THE CALLER GETS TO DECIDE, WHICH IS ALMOST NOTHING ─────────────────
//
// They name a MODULE, a file name and a declared type and size. That is all.
//
//   · the KEY is minted here, from the table's owners plus a ULID. A
//     caller-chosen key would let somebody presign a PUT over another team's
//     object — the integrity hole `unreferencedKeys` closes, reopened one layer
//     down where the database check cannot see it.
//   · the MODULE is a key into a table this worker owns (`uploadTarget`), never
//     a value that reaches a bucket name, a key segment or a permission. An
//     unknown string is a 400 here and can become nothing.
//   · the TYPE is checked against that module's own rule and then the STORED
//     label is computed by us and SIGNED — so R2 refuses a PUT carrying any
//     other. `storedContentType`'s neutralising survives the move out of the
//     worker by becoming a term of the grant rather than a call to remember.
//   · the SIZE is signed too, so the ceiling is enforced by R2 rather than by
//     us counting bytes we no longer see.
//
// ── AND IT IS NOT A MUTATION ────────────────────────────────────────────────
//
// Nothing is written: no row, no object, no counter. It is classified
// `housekeeping` in the ROUTES table for that reason — a POST because it carries
// a body and must not be cached or logged in a URL, not because it changes
// state. The row is written later by the module's own door, which is where the
// publish and the activity line belong.

import { fail, json } from "@shared/workers/http"
import { gated } from "@shared/workers/route"
import { refusePortalCaller } from "@shared/workers/account-scope"
import { teamMediaKey } from "@shared/workers/image"
import { presignConfigured, presignPut, PRESIGN_TTL_SECONDS } from "@shared/workers/presign"
import { requireText, TEXT_LIMITS } from "@shared/workers/validate"
import { presignedKey, servedAt, uploadTarget, UPLOAD_TARGETS, type UploadTarget } from "../lib/upload-targets"
import type { Env } from "../env"

/** POST /api/content/uploads/presign — a URL the browser may PUT one file to.
 *
 * Gated on the SAME right as the door this stands in for, resolved from the
 * table rather than written here, so the two can never diverge into a presign
 * that is easier to obtain than the upload it replaces.
 *
 * Refuses a portal caller: every module in the table is agency material
 * (knowledge, deliverables, staff files, brand assets), and the client-facing
 * upload — a to-do's attachment — is deliberately not among them. It goes to
 * the shared `MEDIA` bucket through its own fenced door and is the one upload a
 * client makes; widening this door to it is a separate decision with a fence in
 * it, not a line in a table. */
export async function postPresignUpload(request: Request, env: Env): Promise<Response> {
  // THE BODY IS READ ONCE AND EVERY FIELD GOES THROUGH THE SEAM (R20). Read
  // BEFORE the gate resolves the right, because the right itself comes out of
  // the body's `module` — so the shape has to be known first. A malformed body
  // is a 400 here and never reaches a permission check.
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return fail(400, "invalid_input", "That request had no body we could read.")

  const target = uploadTarget(requireText(body.module, "Module", TEXT_LIMITS.short))
  if (!target) return noSuchTarget()

  const { cfg, guard } = await gated(request, env, target.right[0], target.right[1])
  await refusePortalCaller(cfg, guard)

  const contentType = requireText(body.contentType, "File type", TEXT_LIMITS.short)
  if (!target.accepts.test(contentType))
    return fail(400, "invalid_input", "That kind of file can't go here. Nothing was saved.")

  // THE SIZE IS A NUMBER OR IT IS NOTHING — `Number` and `Number.isInteger` are
  // the check, positionally (R20), because a truthiness guard would let a string
  // through into a signed header and a cast would not check at all.
  const sizeBytes = Number(body.sizeBytes)
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0)
    return fail(400, "invalid_input", "That upload did not say how big the file is. Nothing was saved.")
  if (sizeBytes > target.maxBytes)
    return fail(
      413,
      "too_large",
      `That upload is too big, the most we can take in one file is ${Math.round(target.maxBytes / 1_000_000)} MB. Nothing was saved.`
    )

  // NO CREDENTIAL, NO DIRECT UPLOAD — and the caller is TOLD so rather than
  // refused, because the answer is "use the door you already have" and not
  // "your upload failed".
  if (!presignConfigured(env)) return json({ direct: false })

  // THE KEY IS OURS. The module comes out of the table and the ULID comes out
  // of this isolate; nothing the caller sent contributes a byte of it.
  const key = teamMediaKey(guard.teamId, target.module)
  const bucket = env[target.bucketVar]
  if (!bucket)
    // A credential without the bucket name it signs against is a half-configured
    // environment, and guessing the name would sign a path R2 does not have.
    return json({ direct: false })

  const stored = target.stored(contentType)
  const uploadUrl = await presignPut(env, bucket, key, {
    contentType: stored,
    contentLength: sizeBytes,
  })
  if (!uploadUrl) return json({ direct: false })

  return json({
    direct: true,
    uploadUrl,
    // The key the module's own door will be handed once the bytes are up. It is
    // returned so the client can quote it back, and it is re-proved there —
    // `ownedMediaKey` is what makes quoting somebody else's key useless.
    key,
    // EXACTLY the headers the signature covers. A browser that sends anything
    // else is refused by R2, so these are not advice.
    headers: { "Content-Type": stored, "Content-Length": String(sizeBytes) },
    expiresInSeconds: PRESIGN_TTL_SECONDS,
  })
}

const noSuchTarget = (): Response =>
  fail(
    400,
    "invalid_input",
    `There is no upload target called that. Expected one of: ${Object.keys(UPLOAD_TARGETS).join(", ")}.`
  )

/** THE OBJECT BEHIND A KEY, once it has been proved ours — or null.
 *
 * Structural rather than `R2Bucket`, for the reason image.ts gives on its own
 * bucket types: the one method this needs, and nothing that ties the file to
 * the runtime's type package. */
type HeadBucket = {
  head(key: string): Promise<{ size: number; httpMetadata?: { contentType?: string } } | null>
}

/** POST /api/content/uploads/confirm — "the bytes are up; give me the reference".
 *
 * The third step of the direct upload, and the one that keeps R40 true: a
 * record only ever points at an object this door has SEEN. It answers exactly
 * what the streaming door answered — `{ url, contentType }` — so the form field
 * that used to hold the streaming door's reply holds this one and no screen
 * changed.
 *
 * Gated on the SAME right as the presign and the streaming door, from the same
 * table. Refuses a portal caller for the same reason the presign does.
 *
 * NOT A MUTATION: it writes no row, no object and no counter — it looks. The
 * row is written by the module's own door when the form is saved, which is
 * where the publish and the activity line belong (the same argument the
 * streaming doors make for being housekeeping). */
export async function postConfirmUpload(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return fail(400, "invalid_input", "That request had no body we could read.")

  const target = uploadTarget(requireText(body.module, "Module", TEXT_LIMITS.short))
  if (!target) return noSuchTarget()

  const { cfg, guard } = await gated(request, env, target.right[0], target.right[1])
  await refusePortalCaller(cfg, guard)

  // THE KEY IS CALLER INPUT NOW, and it is re-proved before it reaches the
  // bucket: this team, this module, one ULID tail (`presignedKey`). Anything
  // else is "not one we gave you", never a lookup.
  const key = presignedKey(guard, target, requireText(body.key, "File", TEXT_LIMITS.short))
  if (!key) return fail(400, "invalid_input", "That file isn't one we gave you a place for. Nothing was saved.")

  const found = await confirmStored(env[target.binding] as unknown as HeadBucket, target, key)
  if (!found) return fail(404, "not_found", "That file never arrived. Nothing was saved.")

  // ?v= busts caches; the file itself is served immutable by the gateway — the
  // streaming door's own answer, shape for shape.
  return json({ url: `${servedAt(target)}${key}?v=${Date.now()}`, contentType: found.contentType })
}

/** IS THE OBJECT REALLY THERE, AND IS IT WHAT THE GRANT ALLOWED?
 *
 * `head`, never `get`: the door is confirming, not reading, and a 90 MB object
 * must not be pulled into the isolate to be counted. The signature already
 * pinned the label and the length, so R2 refused anything else at the PUT —
 * the size check here is the belt to that brace, and the label it answers is
 * the one R2 is holding, never the one the caller declared. Exported for the
 * knowledge door, which confirms the same way and then reads. */
export async function confirmStored(
  bucket: HeadBucket,
  target: UploadTarget,
  key: string
): Promise<{ size: number; contentType: string } | null> {
  const head = await bucket.head(key)
  if (!head || head.size <= 0 || head.size > target.maxBytes) return null
  return { size: head.size, contentType: head.httpMetadata?.contentType ?? target.stored("application/octet-stream") }
}
