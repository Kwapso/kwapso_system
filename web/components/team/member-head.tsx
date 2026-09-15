"use client"

// THE MEMBER DETAIL'S FIRST PANEL — the facts that used to be three lines
// (role, joined, email) and are now the whole first thing a reader sees on a
// colleague's own page. The picture that used to open this panel is drawn in
// the title instead now — see the note below.
//
// ── THE CLIENT'S RULING, VERBATIM ───────────────────────────────────────────
//
//   "I want them to have an image, like the profile picture. I want to be able
//    to see it. … More fields that I want on the first component inside where
//    we currently have role, joined, and email: Full name · Birthday ·
//    Position · A button to send email · A button to call · The field for the
//    phone number. Just put all of this in there."
//
// ── THE PICTURE MOVED TO THE TITLE, B1 (2026-09-15) ─────────────────────────
//
// It used to sit here, in this first panel, because the client's 2026-09-01
// ruling — "under no case - images on title. remove it everywhere" — meant
// this screen could not put it beside the name. That ruling is narrowly
// reversed now: "For cover and logo, I choose B1. Apply this on apps,
// accounts, and team members." (2026-09-15). B1 draws the avatar INLINE LEFT
// of the title, on the title's own line — `member-screen.tsx`'s own `mark`
// prop on `RecordScreen`, using the exact seam this file used to
// (`picture={member.imageUrl}`, `shape="round"`, R60's `object-cover`), so
// it's the same picture, drawn the same way, one level up. Drawing it AGAIN
// here would be the same face twice on one screen, so the tile that used to
// open this panel is gone — the fields below are unchanged.
//
// ── WHERE BIRTHDAY / POSITION / PHONE COME FROM ─────────────────────────────
//
// Full name and email are already on the membership row (`TeamMember`, joined
// from the core `users` table by `workers/tenancy/src/lib/members.ts`) — no
// new storage. Birthday, position and phone are not anywhere before team
// migration `0089_a_members_first_panel_gets_a_birthday_a_position_and_a_
// phone`: three nullable columns on `staff_profiles`, the one table a
// member's OWN facts already live in (headline, personality, strengths…),
// gated on that module's own `staff_profiles:read` rather than
// `team_members:read` — a role that can see the team roster does not
// automatically get to read what a colleague is like, and that fence
// (`StaffPanel`'s own) extends to these three the same way.
//
// SAME CACHE KEY AS `StaffPanel`, so this is not a second read of the door
// (R56): both components ask `staffProfilesKey(teamId)` and the shared store
// answers the second one from cache.
//
// ── THE TWO ACTS ─────────────────────────────────────────────────────────
//
// `mailto:`/`tel:` are real anchors, not soft-navigation — R37 names both as
// the exception ("NOT in-app and are fine as plain anchors"). Styled with the
// kit's own `buttonVariants` rather than the `Button` component, because a
// `Button` is a `<button>` and nesting an anchor inside one is invalid HTML;
// the anchor itself carries the click, the copy-address and the screen-reader
// affordances a real link gives for free. Call is offered only when a phone
// number exists — the field it dials.

import * as React from "react"

import { buttonVariants } from "@shared/ui/components/button/button"
import { EnvelopeSimple, Phone } from "@shared/ui/foundations/icons"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"

import { OverviewList } from "@/components/records/overview-list"
import { content } from "@/lib/api"
import { staffProfilesKey, totalKey } from "@/lib/live-resources"
import { usePermissions } from "@/lib/perms"
import { formatDate } from "@shared/web/format"
import { primeCache, useCached } from "@shared/web/store"
import type { StaffProfile, TeamMember } from "@shared/types"
import { staffFullName } from "@shared/staff-name"
import { useLanguage } from "@shared/web/language"

export function MemberHead({ teamId, member }: { teamId: string; member: TeamMember }) {
  const { t, lang } = useLanguage()
  const { can } = usePermissions(teamId)
  const mayReadProfile = can("staff_profiles", "read")
  const name = staffFullName(member)

  // Same door, same key, as `StaffPanel` — R56: the store dedupes the repeat.
  const profilesQ = useCached<StaffProfile[]>(mayReadProfile ? staffProfilesKey(teamId) : null, () =>
    content.staffProfiles().then((r) => {
      primeCache(totalKey("staff_profiles", teamId), r.total)
      return r.profiles
    })
  )

  if (mayReadProfile && profilesQ.data === undefined && !profilesQ.error)
    return <Skeleton variant="list" lines={2} />

  const forMember = (profilesQ.data ?? []).filter((p) => p.userId === member.userId)
  const profile = forMember.find((p) => p.active) ?? forMember[forMember.length - 1] ?? null
  const phone = profile?.phone ?? null

  const items = [
    { label: t("Full name"), value: name },
    { label: t("Role"), value: member.roleTitle },
    { label: t("Joined"), value: formatDate(member.joinedAt, lang) },
    ...(mayReadProfile
      ? [
          // W2: empty fields hidden. Only add Birthday row if birthday exists
          ...(profile?.birthday ? [{ label: t("Birthday"), value: formatDate(profile.birthday, lang) }] : []),
          // W2: empty fields hidden. Only add Position row if position exists
          ...(profile?.position ? [{ label: t("Position"), value: profile.position }] : []),
          // W2: empty fields hidden. Only add Phone row if phone exists
          ...(phone ? [{ label: t("Phone number"), value: phone }] : []),
        ]
      : []),
    { label: t("Email"), value: member.email },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* THE FACE — no longer drawn here (see this file's header note): the
          title itself carries it now, B1. */}
      <OverviewList items={items} />
      <div className="flex flex-wrap gap-2">
        <a href={`mailto:${member.email}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
          <EnvelopeSimple className="size-3.5" />
          {t("Send email")}
        </a>
        {phone && (
          <a href={`tel:${phone}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <Phone className="size-3.5" />
            {t("Call")}
          </a>
        )}
      </div>
    </div>
  )
}
