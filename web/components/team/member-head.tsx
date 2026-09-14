"use client"

// THE MEMBER DETAIL'S FIRST PANEL — the picture, and the facts that used to be
// three lines (role, joined, email) and are now the whole first thing a reader
// sees on a colleague's own page.
//
// ── THE CLIENT'S RULING, VERBATIM ───────────────────────────────────────────
//
//   "I want them to have an image, like the profile picture. I want to be able
//    to see it. … More fields that I want on the first component inside where
//    we currently have role, joined, and email: Full name · Birthday ·
//    Position · A button to send email · A button to call · The field for the
//    phone number. Just put all of this in there."
//
// ── THE PICTURE, AND WHY IT IS HERE AND NOT IN THE TITLE ───────────────────
//
// A record's title carries no picture anywhere in this app — the client's own
// 2026-09-01 ruling, "under no case - images on title. remove it everywhere",
// which `record-chrome.tsx` and the recipe engine both still hold shut. This
// screen does not fight that law: the picture sits here, in the first panel,
// at the same `size="band"` RecordMark already draws it at on Settings ›
// Team's gallery cards (`members-gallery.tsx`) — the doc on `RecordMark`
// itself names `band` as the size for exactly this seat, "the square in a
// record's header band" — and through the SAME seam (`picture={member.image
// Url}`, `shape="round"`, R60's `object-cover`), so a picture that exists on
// the gallery card is the same picture, drawn the same way, here.
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
import { RecordMark } from "@shared/web/record-mark"
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
          { label: t("Birthday"), value: profile?.birthday ? formatDate(profile.birthday, lang) : undefined },
          { label: t("Position"), value: profile?.position ?? undefined },
          { label: t("Phone number"), value: profile?.phone ?? undefined },
        ]
      : []),
    { label: t("Email"), value: member.email },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start gap-4 sm:flex-row">
        {/* THE FACE — visible here, R60 `object-cover`, the gallery's own
            `size="band"` seat (shared/web/record-mark.tsx: "the square in a
            record's header band"). */}
        <RecordMark picture={member.imageUrl} name={name} shape="round" size="band" />
        <div className="min-w-0 flex-1">
          <OverviewList items={items} />
        </div>
      </div>
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
