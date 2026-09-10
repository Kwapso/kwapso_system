"use client"

// ONE MEMBER'S PROFILE, ON A FULL SCREEN OF ITS OWN.
//
// ── THE CLIENT'S RULING, 2026-09-10 ─────────────────────────────────────────
//
//   "when clickingon card in team, open full screen the profile (we wil ad more
//    to this)"
//
// IT SUPERSEDES WHAT SHIPPED THE DAY BEFORE. A card on Settings › Team opened
// `member-panel.tsx`, a `Sheet` carrying the person's four facts and their two
// acts; that file is deleted with this change. Her sentence is the same one she
// gave for module settings a day earlier — *"It cannot be a slide-in because
// things can get quite complex here… I would rather it be full screen"* — and
// "we will add more to this" says the rest out loud: this is a PLACE that grows,
// not a panel that gets wider. A drawer is the wrong container for something
// that will hold more next week, because the only way a drawer grows is sideways.
//
// AND IT DOES NOT CONTRADICT "not taken anywhere else" (2026-09-09), which is
// the ruling the gallery was built on. What she took away then was a ROW that
// redirected you off the tab in place of showing you anything. What she has
// asked for now is a screen, by name, for the one record on that tab that has
// outgrown four lines in a drawer.
//
// ── WHY THE ADDRESS IS `/t/<teamId>/members/<userId>` ───────────────────────
//
// The same reasoning `web/components/screens/module-settings-screen.tsx` wrote
// down for `/settings/tickets`, applied to a record instead of a page: the app's
// URL grammar is pairs of (module, id) — `parseScreenPath` in
// `shared/web/screen-engine/recipe.ts` — and `/accounts/BERG` has meant "the
// accounts screen, showing BERG" since the day it shipped. `members` is already
// a module in that grammar (`TEAM_SECTIONS`, `web/lib/pages.ts`) and a member's
// id is already its second segment. So this address is not new: it is the one
// this record has always answered to, and the change is that something in the
// app finally LINKS to it.
//
// The two alternatives were both worse and both worth writing down.
// `/settings/team/<userId>` reads well and collides: the second segment of
// `/settings/…` is a module SETTINGS segment (`/settings/tickets`), so the day
// somebody's settings segment is called `team` the address means two things —
// exactly the collision `/tickets/settings` was rejected for. And a query
// (`?tab=team&member=…`) would have cost no routing work at all, which is
// precisely what is wrong with it: a full screen she asked for by name would
// have had no address of its own, no workspace tab of its own, and no way back
// to it from a link. It costs nothing here because `/t/<teamId>/…` is already
// forwarded to this shell at every depth (`workers/gateway`'s route table), so
// unlike `/settings/tickets` this needed no new line anywhere.
//
// ── WHAT IT DRAWS, AND WHY THROUGH THE ENGINE ──────────────────────────────
//
// The head, the overview block and the record footer are the RECIPE's
// (`members.detail`, `web/lib/screens.ts`) rendered by `ScreenRenderer`, exactly
// as this screen has drawn them since the base shipped. Nothing was rebuilt to
// make it "full screen" — it always was one; what it lacked was a door. Below it
// is `StaffPanel`, the person behind the member row, gated on `staff_profiles`.
// That is already two blocks with different owners, which is the shape "we will
// add more to this" asks for: a host that arranges, and blocks that own their
// own reads.
//
// ── THE TWO ACTS ARE THIS FILE'S, AND THAT IS R64 ──────────────────────────
//
// `onAction` here is NOT the host's generic dispatcher. R64
// (`sections-have-a-door`) requires that the file named in
// `SECTION_HOSTED_ELSEWHERE` for a subtracted team-area section actually MAKE
// the door call each of that section's acts dispatches — deriving what is owed
// from the recipe's own `action:` ids and what proves it from
// `web/lib/use-screen-actions.ts`'s own source. Naming a host that merely
// forwards to that dispatcher would make the check a parser agreeing with
// itself, which is the failure mode the law's own header rules out. So the two
// acts are taken here, against the same two doors, with the same cache-first
// handling the dispatcher uses (CACHING.md: prime with what the write returned,
// invalidate the sibling whose count moved).
//
// NOTHING IS SWALLOWED, and this is the half that matters most on this screen.
// Both doors refuse for real reasons a person needs to read — "A team must keep
// at least one admin." and "You can't remove yourself." — so a refusal is
// surfaced as the DOOR'S OWN SENTENCE in a toast rather than a generic one.
// `RolePickerDialog` toasts its own; the confirm below toasts what it caught.
//
// THE LAST-ADMIN FLOOR IS DELIBERATELY NOT SECOND-GUESSED HERE. It is enforced
// inside the UPDATE itself (`workers/tenancy/src/lib/members.ts`), so it holds
// against two simultaneous demotions; a count read on the client could be stale
// by the time the button is pressed, and a control hidden on a stale count is a
// capability that silently disappears. NEITHER ACT IS DRAWN ON YOURSELF, and
// that one IS the door's own rule rather than a nicety — both handlers open with
// a 409 `self` guard, so the recipe's actions are stripped on your own row by
// the host (`module-content.tsx`, `member.isYou`) exactly as before.
//
// ── R59, AND WHICH HALF OF IT EACH SURFACE IS ──────────────────────────────
//
// This screen is a SCREEN, so R59 has nothing to say about it — the law sorts
// SURFACES OVER a screen, and the client's line is that a form or a picker
// slides in and only a yes/no warning is a centred overlay. Change role COLLECTS
// a choice: `RolePickerDialog`, itself a `Sheet`. Remove asks a yes/no question
// about somebody who already exists: `ConfirmAction`, a centred `AlertDialog`.
// Both are the app's existing components, unforked.

import * as React from "react"

import { toast } from "@shared/ui/components/sonner/sonner"
import { ScreenRenderer } from "@shared/web/screen-engine/screen-renderer"
import type {
  ScreenActionContext,
  ScreenData as EngineScreenData,
  ScreenIntent,
} from "@shared/web/screen-engine/screen-renderer"
import type { ScreenRecipe, ScreenRights } from "@shared/web/screen-engine/recipe"
import { invalidate, primeCache } from "@shared/web/store"
import { staffFullName } from "@shared/staff-name"
import { useT } from "@shared/web/language"
import type { TeamMember, TeamRole } from "@shared/types"

import { ConfirmAction } from "@/components/deep-link/confirm-action"
import { RolePickerDialog } from "@/components/team/role-picker-dialog"
import { StaffPanel } from "@/components/team/staff-panel"
import { ApiFailure, tenancy } from "@/lib/api"
import { reportError } from "@shared/web/log"

export function MemberScreen({
  teamId,
  member,
  roles,
  recipe,
  data,
  rights,
  onIntent,
  activityAction,
  onRemoved,
}: {
  teamId: string
  /** The row the host already has in hand from the members read (R56 — this
   * screen opens no door of its own to show a person). */
  member: TeamMember
  /** The team's roles, for the picker. The host reads them across the whole
   * team area anyway, so this costs nothing. */
  roles: TeamRole[]
  /** `members.detail`, resolved and translated by the host — including the two
   * acts, already stripped on your own row. */
  recipe: ScreenRecipe
  data: EngineScreenData
  rights: ScreenRights
  onIntent: (intent: ScreenIntent) => void
  /** The record footer's Latest activity eyebrow, which opens the rail. */
  activityAction?: React.ReactNode
  /** The person is gone — the host takes the reader off a record that no longer
   * exists, exactly as the deep-link confirm has always done. */
  onRemoved: () => void
}) {
  const t = useT()
  const [pickRole, setPickRole] = React.useState(false)
  const [confirmRemove, setConfirmRemove] = React.useState(false)
  const name = staffFullName(member)

  // ── THE TWO DOORS ───────────────────────────────────────────────────────
  // Cache-first (CACHING.md): each door answers with the WHOLE list, so the
  // members cache is primed with what the write returned rather than dropped
  // and re-read. `member_roles` is invalidated beside it because a role's member
  // count moved, and the person's own activity feed gained a row.
  async function changeRole(roleId: string) {
    const { members: next } = await tenancy.setMemberRole(member.userId, roleId)
    primeCache(`members:${teamId}`, next)
    invalidate(`member_roles:${teamId}`)
    invalidate(`activity:user:${member.userId}`)
    toast.success(t("Role updated."))
  }

  async function removeMember() {
    const { members: next } = await tenancy.removeMember(member.userId)
    primeCache(`members:${teamId}`, next)
    invalidate(`member_roles:${teamId}`)
    invalidate(`activity:user:${member.userId}`)
    toast.success(t("Member removed."))
  }

  /** The recipe's named acts, taken here. Anything the recipe grows later that
   * this switch does not know about is reported rather than silently ignored —
   * a button that does nothing is the shape of bug this whole screen exists
   * because of (ERROR-HANDLING.md: never swallow). */
  function onAction(actionId: string, _ctx: ScreenActionContext) {
    if (actionId === "members.changeRole") setPickRole(true)
    else if (actionId === "members.remove") setConfirmRemove(true)
    else reportError("member-screen:unknown-action", new Error(actionId))
  }

  return (
    <div className="flex flex-col gap-4">
      <ScreenRenderer
        recipe={recipe}
        data={data}
        rights={rights}
        onAction={onAction}
        onIntent={onIntent}
        activityAction={activityAction}
      />

      {/* THE PERSON BEHIND THE MEMBER ROW — the owner's ruling, literally: a
          profile and the certificates somebody holds go on their own page.
          Gated on `staff_profiles`, so a role without that read right sees
          nothing here and the profile is unchanged. This is also the block that
          makes "we will add more to this" concrete: a second owner on the same
          host, arranged and nothing else. */}
      <StaffPanel teamId={teamId} userId={member.userId} memberName={name} />

      {/* CHANGE ROLE — the app's existing picker, unchanged and unforked. It is
          a `Sheet` (R59: a picker collects, so it slides in), it hides the role
          the person already holds, and it toasts the door's own refusal, which
          is how "A team must keep at least one admin." reaches the person who
          tried to demote the last one. */}
      <RolePickerDialog
        open={pickRole}
        onOpenChange={setPickRole}
        roles={roles.filter((r) => r.active)}
        currentRoleId={member.roleId}
        subjectName={name}
        onPick={changeRole}
      />

      {/* REMOVE — the app's existing warning (R59: a yes/no question about
          somebody who already exists is a centred `AlertDialog`), taking the ACT
          as a prop rather than reading it off the URL. */}
      <ConfirmAction
        kind={confirmRemove ? "members.remove" : undefined}
        canRun={rights.team_members?.delete === true}
        memberName={member}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={async () => {
          try {
            await removeMember()
            setConfirmRemove(false)
            onRemoved()
          } catch (err) {
            // THE DOOR'S OWN SENTENCE, NEVER A GENERIC ONE, and the warning
            // stays OPEN so the person it is about is still in front of them.
            if (!(err instanceof ApiFailure)) reportError("member-screen:remove", err)
            toast.error(
              err instanceof ApiFailure ? err.message : t("Something went wrong. Try again.")
            )
          }
        }}
      />
    </div>
  )
}
