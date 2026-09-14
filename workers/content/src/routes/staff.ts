// Staff-profile routes — a member's profile. One internal module now: the
// certificate register that used to sit beside it was killed whole ("kill the
// whole certificate module everywhere") and removed in the same change as team
// migration `0090_the_certificate_module_is_killed_everywhere`.
//
// THE PROFILE IS ONE DOOR, not a create and an edit. A person either has a
// profile or they don't, and the screen filling in the form has no way of
// knowing which — two doors would push that question onto the caller, and
// the answer they would both use is a read-then-decide, which is a race
// between two open tabs. So it is an upsert, gated once on `edit`: writing
// down what a colleague is like is the same act whether or not a row already
// existed, and a permission that depends on invisible state is one nobody
// can reason about.
//
// THERE IS NO PROFILE EXPORT. A profile is about a person; a one-click
// spreadsheet of what the team is bad at is a capability nobody asked for.
//
// R21 on every door, both halves. This is the sharpest case of agency-only
// material in the app: a client login reading a colleague's weaknesses.

import { refusePortalCaller } from "@shared/workers/account-scope"
import { fail, json } from "@shared/workers/http"
import { STREAM_UPLOAD_MAX_BYTES } from "@shared/workers/limits"
import { queryText, requireText, TEXT_LIMITS } from "@shared/workers/validate"
import { publishChange } from "@shared/workers/realtime"
import { INLINE_SAFE_UPLOAD, ownedMediaKey, parseUploadDataUrl, reclaimMedia, teamMediaKey } from "@shared/workers/image"
import { unreferencedKeys } from "@shared/workers/media-reclaim"
import { gated, gatedBody } from "@shared/workers/route"
import {
  countStaffProfiles,
  listStaffProfiles,
  saveStaffProfile,
  setStaffProfileActive,
  type StaffProfileInput,
} from "../lib/staff"
import type { Env } from "../env"

/* -------------------------------- profiles -------------------------------- */

export async function getStaffProfiles(request: Request, env: Env): Promise<Response> {
  const { cfg, guard } = await gated(request, env, "staff_profiles", "read")
  await refusePortalCaller(cfg, guard)
  const profiles = await listStaffProfiles(cfg, guard)
  // ?userId= → one person's, which is how a member's own page reads it.
  const userId = queryText(new URL(request.url).searchParams.get("userId"), "Member")
  // R16: the exact server total rides every list response.
  return json({
    profiles: userId ? profiles.filter((p) => p.userId === userId) : profiles,
    total: await countStaffProfiles(cfg, guard),
  })
}

/** Write a person's profile — one door for "there wasn't one" and "there was".
 * Gated `staff_profiles:update`: writing down what a colleague is like is the same
 * act either way, and a permission that depends on invisible state is one nobody
 * can reason about. */
export async function postSaveStaffProfile(request: Request, env: Env): Promise<Response> {
  const { actor, cfg, guard, body } = await gatedBody<StaffProfileInput>(request, env, "staff_profiles", "update")
  await refusePortalCaller(cfg, guard)
  requireText(body.userId, "Member", TEXT_LIMITS.short)
  const { id, created, supersededUrls } = await saveStaffProfile(cfg, guard, actor, body)
  await publishChange(env, guard.teamId, "staff_profiles", id, created ? "add" : "edit")
  // The photo this write stopped pointing at. AFTER the row moved, fail-soft,
  // and proved against the owners list the upload door in this file mints with —
  // `(guard.teamId, "staff")`, which is what makes "this team's staff material"
  // provable rather than merely "this team's". Used to also carry
  // `staff_certificates` here, because one generic upload door answered for both
  // a profile's photo and a certificate's file and never learned which — that
  // second destination went with the certificate module (0090).
  await reclaimMedia(
    env.INTERNAL_MEDIA,
    await unreferencedKeys(
      cfg,
      guard.databaseId,
      "/media/internal/",
      supersededUrls.map((u) => ownedMediaKey(u, "/media/internal/", guard.teamId, "staff")),
      [{ table: "staff_profiles", columns: ["photo_url"] }]
    ),
    { db: env.DB, source: "content", place: "POST /api/content/staff/profile, photo reclaim" }
  )
  return json({ profiles: await listStaffProfiles(cfg, guard), total: await countStaffProfiles(cfg, guard) })
}

/** Take a profile down, or put it back — never deleted. Gated
 * staff_profiles:delete. */
export async function postSetStaffProfileActive(request: Request, env: Env): Promise<Response> {
  const { actor, cfg, guard, body } = await gatedBody<{ id?: unknown; active?: unknown }>(
    request, env, "staff_profiles", "delete"
  )
  await refusePortalCaller(cfg, guard)
  const id = requireText(body.id, "Profile", TEXT_LIMITS.short)
  if (typeof body.active !== "boolean") return fail(400, "invalid_input", "id and active are required.")
  // R17: a no-op repeat moves zero rows → no ping, no duplicate history.
  const changed = await setStaffProfileActive(cfg, guard, actor, id, body.active)
  if (changed) await publishChange(env, guard.teamId, "staff_profiles", id)
  return json({ profiles: await listStaffProfiles(cfg, guard), total: await countStaffProfiles(cfg, guard) })
}

/** Upload a profile photo as a base64 data URL. Gated staff_profiles:update —
 * the same right that writes the row the URL lands on. HOUSEKEEPING: it writes
 * a file, not a record, so there is nothing to broadcast. */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
export async function postUploadStaffFile(request: Request, env: Env): Promise<Response> {
  const { cfg, guard, body } = await gatedBody<{ dataUrl?: unknown }>(request, env, "staff_profiles", "update")
  await refusePortalCaller(cfg, guard)
  const parsed = parseUploadDataUrl(body.dataUrl, MAX_UPLOAD_BYTES)
  if (!parsed) return fail(400, "invalid_input", "That file isn't a supported upload (max 25 MB).")
  // The key IS the credential (the gateway serves /media/* with no session), so
  // it carries a random ULID segment under the team's own prefix.
  // THE MODULE IS PART OF THE KEY, and that is what makes a reclaim provable.
  // A key of the team id alone was minted by FOUR modules into the same
  // bucket — knowledge, brand assets, staff and deliverables — so
  // `ownedMediaKey(url, base, teamId)` could prove "this team" and never "this
  // module": a brand asset's URL pasted into a staff photo's file field would
  // pass the ownership test and be destroyed by the staff door's own reclaim.
  // One more segment makes that impossible by construction rather than by
  // everybody remembering. Objects written under the old bare-team shape stay
  // exactly where they are: a key cannot be renamed, they simply match no
  // module's prefix and are never reclaimed, which is the behaviour they already
  // had.
  const key = teamMediaKey(guard.teamId, "staff")
  await env.INTERNAL_MEDIA.put(key, parsed.bytes, { httpMetadata: { contentType: parsed.contentType } })
  return json({ url: `/media/internal/${key}?v=${Date.now()}`, contentType: parsed.contentType })
}

/** A profile photo — STREAMED. The same capability as the door above, with the
 * file arriving AS the request body instead of inside it.
 *
 * WHY A SECOND DOOR RATHER THAN A CHANGED ONE, and why all four upload doors now
 * come in pairs: the upload CONTRACT differs, and a browser holds its own copy of
 * this app for as long as the tab is open. A build shipped before the deploy keeps
 * posting a base64 data URL to the door above, so that one stays exactly as it was
 * until nothing in the wild uses it. An upload contract is the one change where the
 * server has to be ready before the client and outlast it afterwards.
 *
 * WHAT IT FIXES. 25 MB was never a judgement about files — it was the largest
 * number that fits in a 128 MB isolate three times over: `request.json()`
 * materialises the whole body, a base64 data URL is ~4/3 of the file it carries,
 * and the decode makes another copy. Here the body goes to R2 as it arrives, so
 * the isolate holds a window rather than a file (limits.ts:
 * STREAM_UPLOAD_MAX_BYTES, and what stops it THERE is the platform's own
 * request-body limit rather than anything in this code).
 *
 * AND THE ALLOW-LIST STILL DECIDES, which is the one way this door differs from
 * the knowledge base's streamed twin. That one stores every byte as
 * `application/octet-stream`, so it can afford to take any file at all. This one
 * serves the object BACK under the type the caller declared — that is what makes
 * an image render — so a script-capable type (`text/html`, `image/svg+xml`) would
 * be stored XSS on the app's own origin. `INLINE_SAFE_UPLOAD` is the boundary that
 * stops it, imported from `shared/workers/image.ts` rather than restated, because a
 * second copy of that list is one nobody remembers to narrow.
 *
 * There is NO metadata on this door and so no query string to validate: the file
 * is the whole request, the type is a header, and the key is minted here. R21 at
 * the door, on the write half, as the buffered door already does.
 *
 * HOUSEKEEPING: it writes a file, not a record — nothing to broadcast. */
export async function postStreamStaffFile(request: Request, env: Env): Promise<Response> {
  // The envelope BEFORE the gate and before a byte is read, because a cap is only
  // a cap if it is checked before the expensive step.
  const declared = Number(request.headers.get("content-length") ?? 0)
  if (!Number.isFinite(declared) || declared <= 0)
    return fail(411, "length_required", "That upload did not say how big it is, so we did not start it.")
  if (declared > STREAM_UPLOAD_MAX_BYTES)
    return fail(
      413,
      "too_large",
      `That upload is too big, the most we can take in one file is ${Math.round(STREAM_UPLOAD_MAX_BYTES / 1_000_000)} MB. Nothing was saved.`
    )

  const { cfg, guard } = await gated(request, env, "staff_profiles", "update")
  await refusePortalCaller(cfg, guard)

  // The DECLARED type, held to the same allow-list the buffered door applies —
  // this object is served back under it, so this is the stored-XSS boundary.
  const contentType = (request.headers.get("content-type") ?? "").split(";")[0].trim()
  if (!INLINE_SAFE_UPLOAD.test(contentType))
    return fail(400, "invalid_input", "That file isn't a supported upload.")
  if (!request.body) return fail(400, "invalid_input", "That upload had no file in it.")

  // The key IS the credential — the gateway serves /media/* with no session — so it
  // is the team's prefix plus a random ULID and carries NOTHING the caller sent.
  // No path to contain and no escape to filter, which is the strongest form of the
  // rule rather than a filter over a weaker one.
  // THE MODULE IS PART OF THE KEY, and that is what makes a reclaim provable.
  // A key of the team id alone was minted by FOUR modules into the same
  // bucket — knowledge, brand assets, staff and deliverables — so
  // `ownedMediaKey(url, base, teamId)` could prove "this team" and never "this
  // module": a brand asset's URL pasted into a staff photo's file field would
  // pass the ownership test and be destroyed by the staff door's own reclaim.
  // One more segment makes that impossible by construction rather than by
  // everybody remembering. Objects written under the old bare-team shape stay
  // exactly where they are: a key cannot be renamed, they simply match no
  // module's prefix and are never reclaimed, which is the behaviour they already
  // had.
  const key = teamMediaKey(guard.teamId, "staff")
  await env.INTERNAL_MEDIA.put(key, request.body, { httpMetadata: { contentType } })
  // ?v= busts caches; the file itself is served immutable by the gateway.
  return json({ url: `/media/internal/${key}?v=${Date.now()}`, contentType })
}
