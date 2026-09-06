// WHO AM I, AND MY OWN SETTINGS — every door here is about the caller and
// nobody else, so every one of them is IDENTITY-gated: it resolves the session
// first and writes only the row that session names.
//
// This is the class R10 already has a name for ("a reviewed identity-gated
// write … that gates on whoAmI"), arriving on the worker that owns identity
// itself. `getSessionUser` IS auth's whoAmI — the other workers ask auth over a
// binding; auth reads its own cookie.
//
// Lifted out of index.ts on 6 Sep 2026 with nothing changed but the file and the
// `export` keyword.

import { fail, json } from "@shared/workers/http"
import { imageFieldLimit, optionalText, requireText, TEXT_LIMITS } from "@shared/workers/validate"
import { isLanguage } from "@shared/i18n"
import { isScale } from "@shared/scale"
import { isSpine } from "@shared/spine"

import type { Env } from "../env"
import { destroySession, getSessionUser } from "../lib/sessions"
import { listAccountActivity } from "../lib/account-activity"
import { setLanguage, setScale, setSpine, updateProfile, type ProfileInput } from "../lib/profile"
import { toSessionUser } from "../lib/users"

/** Who is the cookie attached to this request? */
export async function me(request: Request, env: Env): Promise<Response> {
  const user = await getSessionUser(env, request)
  if (!user) return fail(401, "signed_out", "Not signed in.")
  return json({ user: toSessionUser(user) })
}

/** The signed-in person's own account history (name / photo / email changes). */
export async function activity(request: Request, env: Env): Promise<Response> {
  const user = await getSessionUser(env, request)
  if (!user) return fail(401, "signed_out", "Not signed in.")
  return json({ activity: await listAccountActivity(env, user.id) })
}

/** Onboarding / profile edit: names + optional photo (stored in R2). */
export async function profile(request: Request, env: Env): Promise<Response> {
  const user = await getSessionUser(env, request)
  if (!user) return fail(401, "signed_out", "Not signed in.")

  // R20 AT THE DOOR, not one frame down. This handler used to read the body with
  // a bare cast and hand the WHOLE object to updateProfile, which did
  // `(input.firstName ?? "").trim()` — and `??` does not catch a number, so
  // {"firstName": 1} was a TypeError, a 500, and an error_logs row in the GLOBAL
  // core database, from any signed-in caller, at BOTH front doors (this route is
  // on the portal's allow-list too).
  //
  // It is also the reason the law's own scanner never saw it: `validated-bodies`
  // follows `<binding>.<field>` reads in the file that bound the body, and this
  // file read no fields at all — the door contributed ZERO fields to the census
  // and reported clean. Validating here fixes the crash AND puts the three fields
  // back in the scanner's field of view, which is the half that stays fixed.
  const body = (await request.json().catch(() => ({}))) as {
    firstName?: unknown
    lastName?: unknown
    imageDataUrl?: unknown
  }
  const input: ProfileInput = {
    firstName: optionalText(body.firstName, "First name", TEXT_LIMITS.short),
    lastName: optionalText(body.lastName, "Last name", TEXT_LIMITS.short),
    // Through the SAME seam, not a `typeof` — auth's own boundary rule
    // (test/boundary.test.ts) is stricter than R20's and admits only the three
    // validators, because a cast walked past its first version. And through the
    // SAME cap as every other picture field: `imageFieldLimit` is DERIVED from
    // MAX_IMAGE_BYTES, so the two move together. The number here used to be
    // 4,000,000, written out, generous, and correct — which is exactly what
    // 20,000 was when it was written. A hand-picked constant beside a byte limit
    // it does not reference is the shape of the bug this seam was made to end;
    // raise MAX_IMAGE_BYTES to 3 MB and this door starts refusing every photo.
    imageDataUrl: optionalText(body.imageDataUrl, "Photo", imageFieldLimit(body.imageDataUrl)),
  }
  const result = await updateProfile(env, user, input)
  if ("error" in result) return fail(400, result.error, result.message)
  return json(result)
}

/** The language this person reads kwapso in. Reached from BOTH front doors —
 * this route is on the portal gateway's allow-list, because a client choosing
 * German in their own portal is the whole point of the feature.
 *
 * R20, positionally: `body.language` sits as `isLanguage`'s only argument, and
 * `isLanguage` is a real type check against the LANGUAGES list rather than a
 * truthiness guard. An unknown code is a clean 400 here, never a value that
 * reaches the database and turns somebody's screen into fallback English
 * forever. The body is read field by field and never destructured. */
export async function language(request: Request, env: Env): Promise<Response> {
  const user = await getSessionUser(env, request)
  if (!user) return fail(401, "signed_out", "Not signed in.")

  // TWO CHECKS, AND THE FIRST ONE IS NOT REDUNDANT. `requireText` is auth's own
  // boundary rule (test/boundary.test.ts), which is stricter than R20's and
  // admits only the three shared validators — because a cast walked past its
  // first version, and the fix for that must not be loosened by the next door
  // that finds it inconvenient. So the field passes through the seam every other
  // auth door uses, which also buys the NUL strip and the clean 400 mapping.
  // `isLanguage` then decides the only question that matters: is this string one
  // of the four we actually speak. An unrecognised code stops here rather than
  // living on a user row for ever, matching no catalogue entry, leaving somebody
  // reading fallback English with no way to explain why.
  const body = (await request.json().catch(() => ({}))) as { language?: unknown }
  const chosen = requireText(body.language, "Language", 8)
  if (!isLanguage(chosen))
    return fail(400, "bad_language", "That is not a language kwapso speaks.")

  return json(await setLanguage(env, user, chosen))
}

/** HOW BIG THIS PERSON WANTS THE APP. The same door as `language`, one field
 * along, and deliberately its twin rather than a second preferences endpoint
 * with a shape of its own: both are one word about one reader, both are read off
 * `SessionUser` by both front doors, and both must survive a device change.
 *
 * R20, positionally: `body.scale` sits as `requireText`'s first argument and
 * then as `isScale`'s only argument, and `isScale` is a real check against
 * SCALE_STEPS rather than a truthiness guard. An unknown step is a clean 400
 * here, never a value that lands on a user row and leaves somebody reading the
 * fallback size for ever with no way to explain why. The body is read field by
 * field and never destructured. */
export async function scale(request: Request, env: Env): Promise<Response> {
  const user = await getSessionUser(env, request)
  if (!user) return fail(401, "signed_out", "Not signed in.")

  const body = (await request.json().catch(() => ({}))) as { scale?: unknown }
  const chosen = requireText(body.scale, "Size", 16)
  if (!isScale(chosen)) return fail(400, "bad_scale", "That is not a size kwapso offers.")

  return json(await setScale(env, user, chosen))
}

/** WHICH SPINE THIS PERSON WANTS THE APP PAINTED IN — the rail, the ground
 * around the floating content card, everything behind the app, not the rail
 * alone (the field reads "Background" now, renamed from "Sidebar"). `scale`'s
 * twin, one field along: both are one word about one reader, both are read
 * off `SessionUser` by `web/components/app-shell.tsx`, and both must survive
 * a device change.
 *
 * R20, positionally: `body.spine` sits as `requireText`'s first argument and
 * then as `isSpine`'s only argument, and `isSpine` is a real check against
 * SPINE_VALUES rather than a truthiness guard. An unknown value is a clean 400
 * here, never a value that lands on a user row. The body is read field by
 * field and never destructured. */
export async function spine(request: Request, env: Env): Promise<Response> {
  const user = await getSessionUser(env, request)
  if (!user) return fail(401, "signed_out", "Not signed in.")

  const body = (await request.json().catch(() => ({}))) as { spine?: unknown }
  const chosen = requireText(body.spine, "Background", 16)
  if (!isSpine(chosen)) return fail(400, "bad_spine", "That is not a background kwapso offers.")

  return json(await setSpine(env, user, chosen))
}

export async function logout(request: Request, env: Env): Promise<Response> {
  const { setCookie } = await destroySession(env, request)
  return json({ ok: true }, 200, { "Set-Cookie": setCookie })
}
