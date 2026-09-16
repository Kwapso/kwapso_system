// STAFF PROFILES — the person behind the member row. One table, one module,
// one audience: the team.
//
// THE CERTIFICATE TABLE THAT USED TO SIT BESIDE THIS ONE IS GONE. The client's
// ruling: "kill the whole certificate module everywhere." Team migration
// `0090_the_certificate_module_is_killed_everywhere` drops `staff_certificates`;
// this file, its routes and every registry line that named it were removed the
// same change. `staff_profiles` never depended on it for anything but a shared
// upload door and a shared media-reclaim owners list, both trimmed back to the
// one table below.
//
// WHY IT IS A MODULE AND NOT A PAGE. Six staff rows in the legacy app carry a
// personality profile — strengths, weaknesses, the people they look up to — and
// the reconciliation's recommendation was to leave them behind as "a team page,
// not a system record". The owner overruled it and asked for real storage, and
// the overrule is right for a reason worth writing down: a profile edited by a
// colleague, with no history and no permission behind it, is a page anybody can
// quietly change about somebody else. Here it is a record — audited, gated,
// retired rather than deleted, with its own line in the activity feed.
//
// WHY IT IS ITS OWN PERMISSION and not four more rights on `team_members`: an
// agency can want everyone to see who their colleagues are without everyone
// being able to change who is on the team. Those are different questions and
// they get different switches.
//
// NEVER A CLIENT'S. There is no portal door on this module, and every handler on
// it refuses a portal caller (R21). A client login reading "what this person is
// bad at" is the clearest possible case of the agency's own material.

import { describeChanges, logActivity, type Actor } from "@shared/workers/activity"
import { supersededMedia } from "@shared/workers/image"
import { d1ExecScript, d1Query, sqlString, type D1Rest } from "@shared/workers/d1-rest"
import { ulid } from "@shared/workers/id"
import { GuardError, type MemberGuard } from "@shared/workers/gating"
import { optionalText, requireText, TEXT_LIMITS } from "@shared/workers/validate"
import { LIST_HARD_CAP } from "@shared/workers/limits"
import type { StaffProfile } from "@shared/types"
import { optionalDate, safeExternalLink } from "./internal-fields"

/* -------------------------------- profiles -------------------------------- */

type ProfileRow = {
  id: string
  user_id: string
  headline: string | null
  personality_type: string | null
  strengths: string | null
  weaknesses: string | null
  role_models: string | null
  about: string | null
  photo_url: string | null
  /** THE COVER BAND'S OWN PICTURE — C1, client ruling 16 Sep 2026. Team
   * migration adds the column; mirrors `photo_url` field for field. */
  cover_url: string | null
  /** Team migration 0089 — the member detail head's own fields. */
  birthday: string | null
  position: string | null
  phone: string | null
  deactivated_at: string | null
  created_at: string
  creator_name: string | null
  updated_at: string | null
  editor_name: string | null
}

const PROFILE_COLUMNS = `id, user_id, headline, personality_type, strengths, weaknesses, role_models,
                         about, photo_url, cover_url, birthday, position, phone,
                         deactivated_at, created_at, creator_name, updated_at, editor_name`

function toProfile(r: ProfileRow): StaffProfile {
  return {
    id: r.id,
    userId: r.user_id,
    headline: r.headline,
    personalityType: r.personality_type,
    strengths: r.strengths,
    weaknesses: r.weaknesses,
    roleModels: r.role_models,
    about: r.about,
    photoUrl: r.photo_url,
    coverUrl: r.cover_url,
    birthday: r.birthday,
    position: r.position,
    phone: r.phone,
    active: r.deactivated_at === null,
    createdAt: r.created_at,
    creatorName: r.creator_name,
    updatedAt: r.updated_at,
    editorName: r.editor_name,
  }
}

/** Every live profile on the team. Bounded by the members themselves (one row
 * each, enforced by a partial unique index), so a cap is the honest shape. */
export async function listStaffProfiles(cfg: D1Rest, guard: MemberGuard): Promise<StaffProfile[]> {
  const rows = await d1Query<ProfileRow>(
    cfg,
    guard.databaseId,
    // R14 hard cap: one row per member, so this is bounded by the team's size.
    `SELECT ${PROFILE_COLUMNS} FROM staff_profiles ORDER BY created_at ASC LIMIT ${LIST_HARD_CAP}`
  )
  return rows.map(toProfile)
}

/** R16: the exact server COUNT(*) the badge shows — never rows.length. */
export async function countStaffProfiles(cfg: D1Rest, guard: MemberGuard): Promise<number> {
  const rows = await d1Query<{ n: number }>(cfg, guard.databaseId, "SELECT COUNT(*) AS n FROM staff_profiles")
  return rows[0]?.n ?? 0
}

export type StaffProfileInput = {
  userId?: string
  headline?: string
  personalityType?: string
  strengths?: string
  weaknesses?: string
  roleModels?: string
  about?: string
  photoUrl?: string
  /** THE COVER BAND'S OWN PICTURE — C1, client ruling 16 Sep 2026. */
  coverUrl?: string
  /** Team migration 0089 — the member detail head's own fields. */
  birthday?: string
  position?: string
  phone?: string
}

/**
 * WRITE A PERSON'S PROFILE — one door for both "there wasn't one" and "there was".
 *
 * A profile is not created and then edited: it either exists for this person or
 * it does not, and the caller filling in a form has no way of knowing which. Two
 * doors would push that question onto the screen and onto the assistant, and the
 * answer they'd both use is a read-then-decide, which is a race between two tabs.
 *
 * So this is an upsert, and the partial unique index on `user_id` is what makes
 * it safe: `ON CONFLICT(user_id)` cannot fire twice, so two simultaneous saves
 * settle into one row rather than into two profiles for one person.
 *
 * Returns whether the row was NEW, so the route knows which live ping to send
 * and the activity row says the true thing.
 */
export async function saveStaffProfile(
  cfg: D1Rest,
  guard: MemberGuard,
  actor: Actor,
  input: StaffProfileInput
): Promise<{ id: string; created: boolean; supersededUrls: (string | null)[] }> {
  const userId = requireText(input.userId, "Member", TEXT_LIMITS.short)
  const v = {
    headline: optionalText(input.headline, "Headline", TEXT_LIMITS.short) ?? null,
    personalityType: optionalText(input.personalityType, "Personality type", TEXT_LIMITS.short) ?? null,
    strengths: optionalText(input.strengths, "Strengths", TEXT_LIMITS.long) ?? null,
    weaknesses: optionalText(input.weaknesses, "Weaknesses", TEXT_LIMITS.long) ?? null,
    roleModels: optionalText(input.roleModels, "Role models", TEXT_LIMITS.long) ?? null,
    about: optionalText(input.about, "About", TEXT_LIMITS.long) ?? null,
    photoUrl: safeExternalLink(optionalText(input.photoUrl, "Photo", TEXT_LIMITS.link)),
    // THE COVER BAND'S OWN PICTURE — C1, client ruling 16 Sep 2026. Same
    // validation as `photoUrl` immediately above: a stored path, mirrored
    // field for field, through the SAME upload door (never a new one).
    coverUrl: safeExternalLink(optionalText(input.coverUrl, "Cover image", TEXT_LIMITS.link)),
    // A CALENDAR DAY, not a timestamp — the same door `staff_certificates`
    // used for `issued_on`/`expires_on` before that module was retired.
    birthday: optionalDate(input.birthday, "Birthday"),
    position: optionalText(input.position, "Position", TEXT_LIMITS.short) ?? null,
    phone: optionalText(input.phone, "Phone number", TEXT_LIMITS.short) ?? null,
  }

  const existing = await d1Query<ProfileRow>(
    cfg,
    guard.databaseId,
    `SELECT ${PROFILE_COLUMNS} FROM staff_profiles WHERE user_id = ? AND deactivated_at IS NULL`,
    [userId]
  )
  const before = existing[0] ?? null
  const id = before?.id ?? ulid()
  const now = new Date().toISOString()

  await d1ExecScript(
    cfg,
    guard.databaseId,
    `INSERT INTO staff_profiles (id, user_id, headline, personality_type, strengths, weaknesses, role_models, about, photo_url, cover_url, birthday, position, phone, created_at, creator_id, creator_email, creator_name)
VALUES (${sqlString(id)}, ${sqlString(userId)}, ${sqlString(v.headline)}, ${sqlString(v.personalityType)}, ${sqlString(v.strengths)}, ${sqlString(v.weaknesses)}, ${sqlString(v.roleModels)}, ${sqlString(v.about)}, ${sqlString(v.photoUrl)}, ${sqlString(v.coverUrl)}, ${sqlString(v.birthday)}, ${sqlString(v.position)}, ${sqlString(v.phone)}, ${sqlString(now)}, ${sqlString(actor.id)}, ${sqlString(actor.email)}, ${sqlString(actor.name)})
ON CONFLICT(user_id) WHERE deactivated_at IS NULL DO UPDATE SET
  headline = excluded.headline, personality_type = excluded.personality_type,
  strengths = excluded.strengths, weaknesses = excluded.weaknesses,
  role_models = excluded.role_models, about = excluded.about, photo_url = excluded.photo_url,
  cover_url = excluded.cover_url,
  birthday = excluded.birthday, position = excluded.position, phone = excluded.phone,
  updated_at = ${sqlString(now)}, editor_id = ${sqlString(actor.id)}, editor_email = ${sqlString(actor.email)}, editor_name = ${sqlString(actor.name)};`
  )

  const changes = before
    ? describeChanges([
        { label: "Headline", from: before.headline, to: v.headline },
        { label: "Personality type", from: before.personality_type, to: v.personalityType },
        { label: "Strengths", from: before.strengths, to: v.strengths, hideValues: true },
        { label: "Weaknesses", from: before.weaknesses, to: v.weaknesses, hideValues: true },
        { label: "Role models", from: before.role_models, to: v.roleModels },
        { label: "About", from: before.about, to: v.about, hideValues: true },
        { label: "Photo", from: before.photo_url, to: v.photoUrl },
        { label: "Cover image", from: before.cover_url, to: v.coverUrl },
        { label: "Birthday", from: before.birthday, to: v.birthday },
        { label: "Position", from: before.position, to: v.position },
        { label: "Phone", from: before.phone, to: v.phone },
      ])
    : ""
  await logActivity(cfg, guard.databaseId, actor, {
    type: before ? "Staff profile edited" : "Staff profile created",
    // The SUBJECT is named by id rather than by name on purpose: the members
    // themselves live in the core database, and reading a name out of it to
    // decorate a history line would be a cross-database read on every write.
    // The screen that renders the feed already has the member list in hand.
    description: before
      ? `${actor.name} edited a staff profile${changes ? `, ${changes}` : ""}`
      : `${actor.name} wrote a staff profile`,
    relatedTable: "staff_profiles",
    relatedRowId: id,
  })
  // The photo an upsert has just overwritten IN PLACE — the shape `updateProfile`
  // and `updateTeam` already reclaim, arriving late on a third column. `before` is
  // null on a create, and `supersededMedia` answers null for that too. THE COVER
  // is a FOURTH column now (C1, 16 Sep 2026), reclaimed the same way beside it.
  return {
    id,
    created: !before,
    supersededUrls: [
      supersededMedia(before?.photo_url, v.photoUrl),
      supersededMedia(before?.cover_url, v.coverUrl),
    ],
  }
}

/** Deactivate or activate a profile. R17: the predicate rides the UPDATE.
 *
 * Retiring is how a profile is taken down without losing what it said — a person
 * leaving, or asking for it to come off the board. Restoring is refused by the
 * partial unique index if somebody has written a fresh profile for that person
 * in the meantime, which is the correct answer: two live profiles for one person
 * is the one state this table must never hold. */
export async function setStaffProfileActive(
  cfg: D1Rest,
  guard: MemberGuard,
  actor: Actor,
  id: string,
  active: boolean
): Promise<boolean> {
  const rows = await d1Query<ProfileRow>(
    cfg,
    guard.databaseId,
    `SELECT ${PROFILE_COLUMNS} FROM staff_profiles WHERE id = ?`,
    [id]
  )
  if (!rows[0]) throw new GuardError(404, "staff_profile_not_found", "That profile doesn't exist.")
  const now = new Date().toISOString()
  const changed = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    active
      ? `UPDATE staff_profiles SET deactivated_at = NULL, deactivator_id = NULL, deactivator_email = NULL, deactivator_name = NULL, updated_at = ? WHERE id = ? AND deactivated_at IS NOT NULL RETURNING id`
      : `UPDATE staff_profiles SET deactivated_at = ?, deactivator_id = ${sqlString(actor.id)}, deactivator_email = ${sqlString(actor.email)}, deactivator_name = ${sqlString(actor.name)}, updated_at = ? WHERE id = ? AND deactivated_at IS NULL RETURNING id`,
    active ? [now, id] : [now, now, id]
  )
  if (!changed[0]) return false
  await logActivity(cfg, guard.databaseId, actor, {
    type: active ? "Staff profile restored" : "Staff profile taken down",
    description: `${actor.name} ${active ? "restored" : "took down"} a staff profile`,
    relatedTable: "staff_profiles",
    relatedRowId: id,
  })
  return true
}

