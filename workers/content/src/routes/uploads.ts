// PERMISSION TO PUT ONE FILE, WITHOUT THE FILE PASSING THROUGH US.
//
// The door a browser asks before uploading directly to R2. It decides everything
// a streaming door decides — may you, where, how big, under what label — and
// then hands back a signature instead of accepting the bytes.
//
// ── IT CHANGES NOTHING UNTIL SOMEBODY TURNS IT ON ───────────────────────────
//
// With no `R2_ACCESS_KEY_ID` secret this answers `{ direct: false }` and the
// client uses the door it uses today, bytes through the worker, byte for byte
// unchanged. That is the whole reason the code can land while the infrastructure
// (a write-only credential scoped to two buckets, and bucket CORS on an account
// shared with two other companies) is still an open decision — nobody is asked
// to approve infrastructure in order to unblock a merge. Same shape as the
// rate-limit binding, which "FAILS OPEN if this block is missing, which is what
// makes it safe to deploy the worker before adding the binding".
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
import { mediaKey } from "@shared/workers/image"
import { presignConfigured, presignPut, PRESIGN_TTL_SECONDS } from "@shared/workers/presign"
import { requireText, TEXT_LIMITS } from "@shared/workers/validate"
import { uploadTarget, UPLOAD_TARGETS } from "../lib/upload-targets"
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

  const moduleName = requireText(body.module, "Module", TEXT_LIMITS.short)
  const target = uploadTarget(moduleName)
  if (!target)
    return fail(
      400,
      "invalid_input",
      `There is no upload target called "${moduleName}". Expected one of: ${Object.keys(UPLOAD_TARGETS).join(", ")}.`
    )

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

  // THE KEY IS OURS. `owners` comes out of the table and the ULID comes out of
  // this isolate; nothing the caller sent contributes a byte of it.
  const key = mediaKey(guard.teamId, ...target.owners)
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
