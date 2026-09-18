"use client"

// THE PERSON BEHIND THE MEMBER ROW — rendered under the member's own detail,
// which is where the owner asked for it: "they go on each member's own page,
// visible to the team, never to a client."
//
// It sits BELOW the first panel (`member-head.tsx`: the picture, the role
// chip's own facts, the two acts) rather than inside a tab, and that is a
// decision rather than a shortcut. The first panel is the team's record of the
// membership; this is the record of the person. Both are now `children` of the
// SAME `<RecordScreen>` (member-screen.tsx) — a single body, no tab strip
// (client ruling, "remove the tabs") — so this panel draws no `Card` of its own
// any more (see the block below): the outer Card is already there.
//
// A second collection, the certificates a member held, sat here beside the
// profile until the certificate module was killed whole on 14 Sep 2026 ("kill
// the whole certificate module everywhere") and removed in the same change as
// team migration `0090_the_certificate_module_is_killed_everywhere`.
//
// Gated on `staff_profiles`, so a role without that read right sees nothing
// here at all, and the member page it hangs off is unchanged. There is no
// client-facing counterpart anywhere: the module has no portal door.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { toast } from "@shared/ui/components/sonner/sonner"
import { Power } from "@shared/ui/foundations/icons"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import { EditPenButton } from "@shared/web/edit-pen-button"

import { StaffProfileDialog, type StaffProfileValues } from "@/components/team/staff-profile-dialog"
import { OverviewList } from "@/components/records/overview-list"
import { content } from "@/lib/api"
import { staffProfilesKey, totalKey } from "@/lib/live-resources"
import { usePermissions } from "@/lib/perms"
import { RecordMark } from "@shared/web/record-mark"
import { primeCache, useCached } from "@shared/web/store"
import type { StaffProfile } from "@shared/types"
import { useLanguage } from "@shared/web/language"
import { useConfirm } from "@shared/web/use-confirm"

export function StaffPanel({
  teamId,
  userId,
  memberName,
  editOpen,
  onEditOpenChange,
}: {
  teamId: string
  userId: string
  memberName: string
  /** THE ONE `StaffProfileDialog`, CONTROLLED FROM ABOVE — client ruling,
   * 2026-09-15: the member head grew its own visible edit pencil
   * (member-screen.tsx), which opens this same dialog rather than a second
   * one. This panel's own pencil, below, still opens it too — one dialog,
   * two doors, never two competing edit surfaces on one page. */
  editOpen: boolean
  onEditOpenChange: (open: boolean) => void
}) {
  const { t } = useLanguage()
  const { can } = usePermissions(teamId)
  const mayRead = can("staff_profiles", "read")
  const mayWrite = can("staff_profiles", "update")
  const mayArchive = can("staff_profiles", "delete")

  // Read WHOLE and picked from here: one profile per member, so the team's
  // entire set is smaller than one page of tickets — and a panel that fetched
  // per-member would re-fetch on every colleague you clicked through to.
  const profilesQ = useCached<StaffProfile[]>(mayRead ? staffProfilesKey(teamId) : null, () =>
    content.staffProfiles().then((r) => {
      primeCache(totalKey("staff_profiles", teamId), r.total)
      return r.profiles
    })
  )

  // The one confirm dialog this panel's red action asks through
  // (shared/web/use-confirm.tsx) — deactivating a profile. The confirm-free
  // restore beside it doesn't go through it.
  const { busy: archiveBusy, ask, run, dialog: archiveDialog } = useConfirm()

  if (!mayRead) return null

  // A FAILED READ SAYS SO. The read was never checked here, so a failed fetch
  // used to spin the skeleton below for ever — no retry, no explanation, no way
  // out (work-logs-panel.tsx carries the same guard on its own list).
  if (profilesQ.error)
    return (
      <ShapeStateBody
        shape="recordChrome"
        state="error"
        copy={{ errorTitle: t("That didn't load. Refresh the page, and tell us if it keeps happening.") }}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              profilesQ.refresh()
            }}
          >
            {t("Try again")}
          </Button>
        }
      />
    )
  if (profilesQ.data === undefined) return <Skeleton variant="list" lines={3} />

  // The LIVE profile if there is one; otherwise the last one that was taken
  // down. Switching one off used to make it vanish from the only screen that
  // shows it, which would have made "deactivate" mean "lose" — and nothing here
  // is ever lost. (A member can hold both: saving after one has been switched
  // off writes a fresh row rather than reviving the old one, so the newest is
  // the one to show.)
  const forMember = profilesQ.data.filter((p) => p.userId === userId)
  const profile = forMember.find((p) => p.active) ?? forMember[forMember.length - 1] ?? null

  async function saveProfile(values: StaffProfileValues) {
    const { profiles } = await content.saveStaffProfile({ userId, ...values })
    primeCache(staffProfilesKey(teamId), profiles)
    toast.success(t("Profile saved."))
  }

  /** SWITCH THE PROFILE OFF, or bring it back. A colleague who leaves keeps a
   * live profile until somebody says otherwise — the door has answered this
   * since the module shipped and no screen called it, so the only way to switch
   * one off was to ask the assistant. Nothing is deleted: what was written stays
   * written, and the panel reads it back the moment it comes on again.
   * Deactivating is the red half, so it asks first (shared/web/use-confirm.tsx);
   * activating is the confirm-free restore. */
  function deactivateProfile(profile: StaffProfile) {
    ask({
      title: t("Deactivate this profile?"),
      body: t("It stops showing as a live colleague. What was written stays written, and the panel reads it back the moment it comes on again."),
      action: t("Deactivate"),
      run: () =>
        run(
          () => content.setStaffProfileActive(profile.id, false).then(({ profiles }) => primeCache(staffProfilesKey(teamId), profiles)),
          t("Profile deactivated."),
          t("Couldn't update the profile.")
        ),
    })
  }

  async function activateProfile(profile: StaffProfile) {
    await run(
      () => content.setStaffProfileActive(profile.id, true).then(({ profiles }) => primeCache(staffProfilesKey(teamId), profiles)),
      t("Profile activated."),
      t("Couldn't update the profile.")
    )
  }

  // Only the fields that were actually filled in. A profile half written is the
  // normal state of one, and a wall of em-dashes reads as "we know nothing about
  // this person" rather than "nobody has written this bit yet".
  const profileItems = profile
    ? [
        { label: t("In one line"), value: profile.headline },
        { label: t("Personality type"), value: profile.personalityType },
        { label: t("Best at"), value: profile.strengths },
        { label: t("Finds hard"), value: profile.weaknesses },
        { label: t("Looks up to"), value: profile.roleModels },
        { label: t("More"), value: profile.about },
      ].filter((i): i is { label: string; value: string } => !!i.value)
    : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-medium">
          {t("Profile")}
          {profile && !profile.active && (
            <Badge variant="secondary" className="text-muted-foreground text-badge">
              {t("Inactive")}
            </Badge>
          )}
        </h2>
        {/* ml-auto on the GROUP so a narrow phone reflows instead of clipping. */}
        <div className="ml-auto flex flex-wrap gap-2">
          {/* ICON-ONLY (client ruling, 2026-08-31: "edit, only the pencil
              icon") — the label survives as the accessible name, whichever of
              the two verbs applies. */}
          {mayWrite && (
            <EditPenButton
              onClick={() => onEditOpenChange(true)}
              label={profile?.active ? t("Edit profile") : t("Write a profile")}
            />
          )}
          {/* WHEN SOMEBODY LEAVES. Red because it takes the profile out of the
              everyday picture, and reversible — which the confirm-free restore
              beside it says out loud. What was written stays written. */}
          {mayArchive &&
            profile &&
            (profile.active ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={archiveBusy}
                onClick={() => deactivateProfile(profile)}
                className="text-destructive hover:text-destructive gap-1"
              >
                <Power className="size-3.5" />
                {t("Deactivate profile")}
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void activateProfile(profile)}
                className="gap-1"
              >
                <Power className="size-3.5" />
                {t("Activate profile")}
              </Button>
            ))}
        </div>
      </div>
      {/* NO CARD HERE — this panel is now `children` of the member's own
          `<RecordScreen>` (member-screen.tsx), which already wraps the whole
          panel in ONE Card (the kit's `RecordDetail`). A second `Card` here
          would be the exact "container inside a container" the client
          rejected on this same shape (`overview-list.tsx`'s own header). */}
      <div className="flex items-start gap-4">
        {/* THE FACE. `photoUrl` is stored, edited and round-tripped through the
            form, and was rendered by nothing at all — on the one screen in the
            app whose whole subject is a person. A circle, because a person is
            (shared/web/record-mark.tsx), and it stands whether or not there is
            a photo, so the row does not reflow the day somebody adds one. */}
        <RecordMark picture={profile?.photoUrl} name={memberName} shape="round" />
        <div className="min-w-0 flex-1">
          {profileItems.length > 0 ? (
            <OverviewList items={profileItems} />
          ) : (
            <p className="text-muted-foreground text-sm">
              {t("Nothing written about")} {memberName} {t("yet. The team can read what goes here; no client ever can.")}
            </p>
          )}
        </div>
      </div>

      <StaffProfileDialog
        open={editOpen}
        onOpenChange={onEditOpenChange}
        draftKey={`staff-profile:${userId}`}
        subjectName={memberName}
        initial={
          // A SWITCHED-OFF profile does not prefill the form: writing after one
          // has been deactivated starts a fresh record (the door writes a new row
          // rather than reviving the old one), and Activate beside it is the way
          // to get the old words back. Two buttons, two meanings.
          profile?.active
            ? {
                headline: profile.headline ?? "",
                personalityType: profile.personalityType ?? "",
                strengths: profile.strengths ?? "",
                weaknesses: profile.weaknesses ?? "",
                roleModels: profile.roleModels ?? "",
                about: profile.about ?? "",
                photoUrl: profile.photoUrl ?? "",
                birthday: profile.birthday ?? "",
                position: profile.position ?? "",
                phone: profile.phone ?? "",
              }
            : undefined
        }
        onSubmit={saveProfile}
      />

      {archiveDialog}
    </div>
  )
}
