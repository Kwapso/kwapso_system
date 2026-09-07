// Shared identity display helpers — ONE source for turning a person or team into
// a display name, two-letter initials, or a single-letter avatar fallback, so
// every screen renders the same person the same way (no per-component drift).

import { staffName, type StaffIdentity } from "@shared/staff-name"

/** A STAFF person's display name — their FIRST NAME, falling back to their email,
 * else "". R54, and the decision is not this file's: `shared/staff-name.ts` owns
 * it and carries the client's ruling, the two populations and every awkward input.
 *
 * This is the structured path, so it is the EXACT one — a two-word given name
 * survives here and cannot survive the snapshot path beside it. It stayed named
 * `personName` because fifteen call sites read better with that word in them and
 * every one of them is a member, a colleague or the signed-in person; the seam it
 * delegates to is where the rule is stated, and R54 checks that this stays a
 * delegation rather than growing a second answer. */
export function personName(p: StaffIdentity): string {
  return staffName(p)
}

/** Two-letter initials for a person-avatar fallback (e.g. "AK"); "?" if unknown. */
export function personInitials(firstName?: string | null, lastName?: string | null): string {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?"
}

/** Same two-letter contract as `personInitials`, for a caller that only has a
 * joined display name to work with — an activity row's `actorName` is a name
 * SNAPSHOT (the door never carries first/last separately for it, on purpose:
 * the sentence should still read correctly for someone who has since renamed
 * or left), so the first and last name pieces have to be split back out of
 * one string rather than read off two fields. */
export function nameInitials(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean)
  return personInitials(parts[0], parts.length > 1 ? parts[parts.length - 1] : undefined)
}

/** Single-letter mark for a team / single-name avatar fallback; "?" if blank. */
export function letterMark(name?: string | null): string {
  return name?.[0]?.toUpperCase() ?? "?"
}
