// WHAT EACH UPLOAD DOOR ALLOWS, AS ONE TABLE — so a signed upload cannot be
// looser than the door it stands in for.
//
// ── WHY A TABLE AND NOT A PARAMETER ─────────────────────────────────────────
//
// A presigned PUT takes the worker out of the byte path, which means the four
// decisions a streaming door makes while the bytes go past — who may upload,
// where the object lands, how big it may be, and what label it is stored under —
// all have to be made BEFORE the bytes exist, and made from the same values.
// Read out of the doors themselves they were already four separate spellings of
// one shape:
//
//   staff, brand assets   INLINE_SAFE_UPLOAD only, stored under the declared
//                         type — safe because the declared type is on the list
//   deliverables          any well-formed type, stored through storedContentType
//   knowledge             any well-formed type, always stored neutralised
//
// That is not four rules; it is one rule (a stored label is safe because the
// type was inline-safe OR because it was neutralised) with three settings. So
// the settings are DATA. A presign that read a caller's `module` and then went
// looking for the right ceiling in the right file is a presign that will one day
// find the wrong one.
//
// ── THE PART THAT IS A SECURITY BOUNDARY, NOT A CONVENIENCE ─────────────────
//
// `module` is what makes the key OURS — handed to `teamMediaKey` with the
// caller's own team id and a fresh ULID, so the caller never contributes a byte
// of the object's name. A caller who chose their own key could presign a PUT
// over another team's object, which is the integrity hole `unreferencedKeys`
// closes, reopened one layer down where the database check cannot see it. The
// module segment is the same one the streaming doors mint and the same one
// `ownedMediaKey` proves against, so an object uploaded directly is reclaimable
// exactly as one uploaded through the worker — and it is the same proof the
// CONFIRM door runs over the key a browser quotes back (`presignedKey`).
// `upload-targets.test.ts` holds each entry to the door it mirrors.

import {
  ANY_FILE_TYPE,
  INLINE_SAFE_UPLOAD,
  NEUTRALISED_CONTENT_TYPE,
  ownedMediaKey,
  storedContentType,
} from "@shared/workers/image"
import type { MemberGuard } from "@shared/workers/gating"
import { STREAM_UPLOAD_MAX_BYTES } from "@shared/workers/limits"
import type { Right } from "@shared/workers/gating"

export type UploadTarget = {
  /** The permission the door this mirrors opens with — same module, same verb. */
  right: [string, Right]
  /** The key's module segment (`<team>/<module>/<ulid>`, teamMediaKey). Never
   * caller input. */
  module: string
  /** The R2 binding the door writes to, by name — resolved on the env so this
   * table stays free of a worker's `Env` type. */
  binding: "INTERNAL_MEDIA" | "MEDIA"
  /** The bucket that binding points at, for the presign's canonical path. A
   * binding cannot be asked its own bucket name at runtime, which is the same
   * reason `TEAM_DB_<n>_ID` exists beside its D1 binding. */
  bucketVar: "INTERNAL_MEDIA_BUCKET" | "MEDIA_BUCKET"
  /** The declared types this door accepts at all. */
  accepts: RegExp
  /** What the bytes are LABELLED at rest, given what was declared. This is the
   * value that gets SIGNED, so R2 refuses a PUT that carries any other — the
   * neutralising rule survives the move out of the worker by becoming a term of
   * the grant rather than a call somebody has to remember. */
  stored: (declared: string) => string
  /** The ceiling, signed as `Content-Length` so R2 enforces it rather than us. */
  maxBytes: number
}

export const UPLOAD_TARGETS: Record<string, UploadTarget> = {
  knowledge: {
    right: ["knowledge", "create"],
    module: "knowledge",
    binding: "INTERNAL_MEDIA",
    bucketVar: "INTERNAL_MEDIA_BUCKET",
    accepts: ANY_FILE_TYPE,
    // ALWAYS neutralised, even for an inline-safe type — stricter than
    // `storedContentType`, and deliberately so: this is the one door where "any
    // type of file that is sitting on my desktop" is the requirement, and the
    // door's own comment argues the boundary is HOW they are stored rather than
    // which types. Mirrored here rather than softened to the shared helper.
    stored: () => NEUTRALISED_CONTENT_TYPE,
    maxBytes: STREAM_UPLOAD_MAX_BYTES,
  },
  deliverables: {
    right: ["deliverables", "create"],
    module: "deliverables",
    binding: "INTERNAL_MEDIA",
    bucketVar: "INTERNAL_MEDIA_BUCKET",
    accepts: ANY_FILE_TYPE,
    stored: storedContentType,
    maxBytes: STREAM_UPLOAD_MAX_BYTES,
  },
  staff: {
    right: ["staff_profiles", "edit"],
    module: "staff",
    binding: "INTERNAL_MEDIA",
    bucketVar: "INTERNAL_MEDIA_BUCKET",
    // Only the inline-safe list, which is why storing the DECLARED type is safe
    // here: everything that passes is already something the browser may render.
    accepts: INLINE_SAFE_UPLOAD,
    stored: (declared) => declared,
    maxBytes: STREAM_UPLOAD_MAX_BYTES,
  },
  brand: {
    right: ["brand_assets", "create"],
    module: "brand",
    binding: "INTERNAL_MEDIA",
    bucketVar: "INTERNAL_MEDIA_BUCKET",
    accepts: INLINE_SAFE_UPLOAD,
    stored: (declared) => declared,
    maxBytes: STREAM_UPLOAD_MAX_BYTES,
  },
}

/** The target a caller named, or null.
 *
 * POSITIONAL, in R20's sense: the caller's string is used as a KEY into a table
 * this file owns and never as a value that reaches a bucket name, a key segment
 * or a permission. An unknown module falls out here as null, so there is no path
 * where an unrecognised string becomes a presigned URL for anything. */
export function uploadTarget(module: string | null | undefined): UploadTarget | null {
  if (!module) return null
  return Object.prototype.hasOwnProperty.call(UPLOAD_TARGETS, module)
    ? UPLOAD_TARGETS[module]
    : null
}

/** WHERE A TARGET'S OBJECTS ARE SERVED FROM, by the bucket it writes to. The
 * agency-only shelf is `/media/internal/` on the agency gateway alone; the
 * shared bucket is `/media/` on both. Derived from the binding rather than
 * written per entry, so an entry cannot name a shelf its bucket is not on —
 * which is the drift `media-keys.test.ts` checks the reclaims for. */
export function servedAt(target: UploadTarget): "/media/internal/" | "/media/" {
  return target.binding === "INTERNAL_MEDIA" ? "/media/internal/" : "/media/"
}

/** THE KEY A BROWSER QUOTES BACK, OR NOTHING.
 *
 * After a direct PUT the client hands the confirm door the key it was given.
 * That string is caller input now, whatever it was when we minted it, and it
 * reaches `bucket.head` — so it is re-proved from the caller's OWN guard through
 * the same seam a reclaim uses: under this team, under this module, one ULID
 * tail, nothing deeper. A key from another team, another module, or a made-up
 * path answers null, and the door says "not one we gave you" rather than
 * looking anything up. */
export function presignedKey(guard: MemberGuard, target: UploadTarget, quoted: string): string | null {
  const base = servedAt(target)
  return ownedMediaKey(`${base}${quoted}`, base, guard.teamId, target.module)
}
